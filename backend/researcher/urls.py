from django.urls import path

from .views import (
    ResearcherADRSignalView,
    ResearcherDashboardCatalogView,
    ResearcherDashboardView,
    ResearcherADRExportView,
    ResearcherDatasetDownloadView,
    ResearcherDatasetListView,
    ResearcherExportSummaryView,
    ResearcherDerivedGraphView,
    ResearcherKnowledgeGraphExploreView,
    ResearcherKnowledgeGraphSeedsView,
    ResearcherEthicsPolicyView,
    ResearcherGovernedADRDataView,
    ResearcherHypothesisView,
    ResearcherLiteratureMiningView,
    ResearcherMedicineListView,
    ResearcherWorkspaceView,
)

urlpatterns = [
    path('ethics/policy/', ResearcherEthicsPolicyView.as_view(), name='researcher-ethics-policy'),
    path('ethics/adr-data/', ResearcherGovernedADRDataView.as_view(), name='researcher-governed-adr-data'),
    path('signals/', ResearcherADRSignalView.as_view(), name='researcher-adr-signals'),
    path('dashboard/catalog/', ResearcherDashboardCatalogView.as_view(), name='researcher-dashboard-catalog'),
    path('dashboard/', ResearcherDashboardView.as_view(), name='researcher-dashboard'),
    path('datasets/', ResearcherDatasetListView.as_view(), name='researcher-datasets'),
    path('datasets/<int:pk>/download/', ResearcherDatasetDownloadView.as_view(), name='researcher-dataset-download'),
    path('export/summary/', ResearcherExportSummaryView.as_view(), name='researcher-export-summary'),
    path('export/adr/', ResearcherADRExportView.as_view(), name='researcher-export-adr'),
    path('knowledge-graph/seeds/', ResearcherKnowledgeGraphSeedsView.as_view(), name='researcher-kg-seeds'),
    path('knowledge-graph/explore/', ResearcherKnowledgeGraphExploreView.as_view(), name='researcher-kg-explore'),
    path('knowledge-graph/derived/', ResearcherDerivedGraphView.as_view(), name='researcher-kg-derived'),
    path('literature/mine/', ResearcherLiteratureMiningView.as_view(), name='researcher-literature-mining'),
    path('hypotheses/', ResearcherHypothesisView.as_view(), name='researcher-hypotheses'),
    path('workspace/', ResearcherWorkspaceView.as_view(), name='researcher-workspace'),
    path('medicines/', ResearcherMedicineListView.as_view(), name='researcher-medicines'),
]
