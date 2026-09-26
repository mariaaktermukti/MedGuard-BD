import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Flask } from '@phosphor-icons/react';
import EthicsDataAccess from './EthicsDataAccess';
import ADRSignalDetection from './ADRSignalDetection';
import CustomDashboards from './CustomDashboards';
import DatasetExport from './DatasetExport';
import KnowledgeGraphExplorer from './KnowledgeGraphExplorer';
import LiteratureMining from './LiteratureMining';
import HypothesisGeneration from './HypothesisGeneration';
import CollaborationWorkspace from './CollaborationWorkspace';

// These eight destinations now live in the sidebar (components/Sidebar.jsx,
// researcherNavItems), where its links are already absolute - which matters here,
// because this portal is mounted on a splat route (`researcher/*`) and a relative
// link would append rather than replace (/researcher/signals + "dashboards"
// -> /researcher/signals/dashboards). Keep the two lists in step.
const ResearcherPortal = () => {
    return (
        // Same cap and centring the doctor portal and the per-page containers elsewhere
        // use, so the heading and whichever page is showing line up on a wide screen.
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Flask size={30} weight="duotone" /> Researcher Portal</h1>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                    Governed access to anonymised pharmacovigilance data, signal detection and research tooling.
                </p>
            </div>

            {/* The sidebar already lists these eight, as it does for every other portal. */}
            <Routes>
                <Route index element={<EthicsDataAccess />} />
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
