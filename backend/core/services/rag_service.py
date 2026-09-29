import os
import json
import logging
import re
from typing import List, Dict, Any, Tuple
# pyrefly: ignore [missing-import]
from django.conf import settings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

KNOWLEDGE_BASE_PATH = os.path.join(settings.BASE_DIR, 'knowledge_base', 'medical_documents.json')

class RAGService:
    """
    Retrieval-Augmented Generation (RAG) Service for MedGuard-BD.
    Provides semantic vector retrieval over DGDA Guidelines, Medicine Monographs,
    and Drug Interaction Knowledge Base to ground LLM responses with verified facts.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RAGService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.documents: List[Dict[str, Any]] = []
        self.vectorizer: TfidfVectorizer = None
        self.tfidf_matrix = None
        self.load_knowledge_base()
        self._initialized = True

    def load_knowledge_base(self):
        """Loads static JSON documents and dynamically augments with live DB Recalls & Medicines."""
        raw_docs = []
        if os.path.exists(KNOWLEDGE_BASE_PATH):
            try:
                with open(KNOWLEDGE_BASE_PATH, 'r', encoding='utf-8') as f:
                    raw_docs = json.load(f)
                logger.info(f"Loaded {len(raw_docs)} documents from knowledge base JSON.")
            except Exception as e:
                logger.error(f"Failed to load knowledge base JSON: {e}")

        # Augment dynamically with live DB Medicine & Recall data if Django apps are ready
        try:
            from core.models import Recall, Medicine
            active_recalls = Recall.objects.filter(status='active').select_related('medicine', 'manufacturer')
            for r in active_recalls:
                doc = {
                    "id": f"live-recall-{r.id}",
                    "title": f"ACTIVE RECALL BULLETIN: {r.medicine.name} (Batch {r.batch_number})",
                    "category": "Active Batch Recall Alert",
                    "source": "DGDA Live Enforcement Database",
                    "content": f"ALERT: Batch '{r.batch_number}' of '{r.medicine.name}' manufactured by '{r.manufacturer.company_name}' is under ACTIVE DGDA RECALL. Reason: {r.reason}. All sales, distribution, and dispensing of this batch are legally frozen."
                }
                raw_docs.append(doc)
        except Exception as e:
            logger.debug(f"Live DB recall augmentation skipped: {e}")

        self.documents = raw_docs
        self._build_vector_index()

    def _build_vector_index(self):
        """Builds TF-IDF vector index over document titles, categories, and contents."""
        if not self.documents:
            self.vectorizer = None
            self.tfidf_matrix = None
            return

        corpus = []
        for doc in self.documents:
            # Weight title and category heavily in text representation
            text_repr = f"{doc.get('title', '')} {doc.get('category', '')} {doc.get('content', '')}"
            corpus.append(text_repr)

        try:
            self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)
            logger.info("RAG Vector Index successfully built.")
        except Exception as e:
            logger.error(f"Failed to build RAG vector index: {e}")

    def retrieve(self, query: str, top_k: int = 3) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Retrieves top_k relevant document chunks for a given user query.
        Returns:
            Tuple[context_text, sources_list]
        """
        if not self.documents or not self.vectorizer or self.tfidf_matrix is None:
            return "", []

        query_cleaned = query.strip()
        if not query_cleaned:
            return "", []

        try:
            query_vec = self.vectorizer.transform([query_cleaned])
            cosine_scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

            # Hybrid keyword boost for exact medicine or category matches
            scores = list(cosine_scores)
            query_lower = query_cleaned.lower()
            
            for idx, doc in enumerate(self.documents):
                doc_text = f"{doc.get('title', '')} {doc.get('content', '')}".lower()
                # Boost if drug name or keyword appears explicitly
                for word in query_lower.split():
                    if len(word) >= 4 and word in doc_text:
                        scores[idx] += 0.25

            # Get top_k indices sorted by highest score
            top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

            retrieved_docs = []
            context_chunks = []

            for idx in top_indices:
                if scores[idx] > 0.05: # Minimum relevance threshold
                    doc = self.documents[idx]
                    retrieved_docs.append({
                        "id": doc.get("id"),
                        "title": doc.get("title"),
                        "category": doc.get("category"),
                        "source": doc.get("source")
                    })
                    chunk_str = f"--- [DOCUMENT: {doc.get('title')}] (Source: {doc.get('source')}) ---\n{doc.get('content')}"
                    context_chunks.append(chunk_str)

            combined_context = "\n\n".join(context_chunks)
            return combined_context, retrieved_docs

        except Exception as e:
            logger.error(f"Error during RAG retrieval: {e}")
            return "", []

    def build_rag_prompt(self, user_prompt: str, active_medicines: List[str] = None) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Builds an augmented prompt for the LLM combining:
        1. RAG Retrieved Knowledge Base Context
        2. Active Patient Medications Context
        3. Strict Clinical Response Instructions
        """
        context_str, sources = self.retrieve(user_prompt, top_k=3)

        meds_context = ""
        if active_medicines:
            meds_list_str = ", ".join(active_medicines)
            meds_context = f"\nPatient Active Medications: {meds_list_str}"

        prompt_parts = []
        if context_str:
            prompt_parts.append(f"VERIFIED DGDA & CLINICAL KNOWLEDGE BASE (RAG RETRIEVED):\n{context_str}")
        if meds_context:
            prompt_parts.append(meds_context)

        prompt_parts.append(f"User Query: {user_prompt}")

        augmented_user_prompt = "\n\n".join(prompt_parts)
        return augmented_user_prompt, sources

# Global singleton helper
rag_engine = RAGService()
