import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Flask } from '@phosphor-icons/react';
import ResearcherDashboard from './ResearcherDashboard';
import EthicsDataAccess from './EthicsDataAccess';
import ADRSignalDetection from './ADRSignalDetection';
import CustomDashboards from './CustomDashboards';
import DatasetExport from './DatasetExport';
import KnowledgeGraphExplorer from './KnowledgeGraphExplorer';
import LiteratureMining from './LiteratureMining';
import HypothesisGeneration from './HypothesisGeneration';
import CollaborationWorkspace from './CollaborationWorkspace';

const ResearcherPortal = () => {
    return (
        <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '1150px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Flask size={32} weight="duotone" /> Researcher Portal
                    </h1>
                    <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        Pharmacovigilance analytics, real-time ADR signal detection & AI-driven insights.
                    </p>
                </div>
            </div>

            {/* Main Sub-route Content */}
            <Routes>
                <Route index element={<ResearcherDashboard />} />
                <Route path="dashboard" element={<ResearcherDashboard />} />
                <Route path="ethics-access" element={<EthicsDataAccess />} />
                <Route path="signals" element={<ADRSignalDetection />} />
                <Route path="dashboards" element={<CustomDashboards />} />
                <Route path="export" element={<DatasetExport />} />
                <Route path="knowledge-graph" element={<KnowledgeGraphExplorer />} />
                <Route path="literature" element={<LiteratureMining />} />
                <Route path="hypotheses" element={<HypothesisGeneration />} />
                <Route path="workspace" element={<CollaborationWorkspace />} />
            </Routes>
        </div>
    );
};

export default ResearcherPortal;

