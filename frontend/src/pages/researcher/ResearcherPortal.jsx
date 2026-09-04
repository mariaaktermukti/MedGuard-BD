import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { ShieldCheck, Pulse, SquaresFour, DownloadSimple, Graph, BookOpen, Lightbulb, UsersThree } from '@phosphor-icons/react';
import EthicsDataAccess from './EthicsDataAccess';
import ADRSignalDetection from './ADRSignalDetection';
import CustomDashboards from './CustomDashboards';
import DatasetExport from './DatasetExport';
import KnowledgeGraphExplorer from './KnowledgeGraphExplorer';
import LiteratureMining from './LiteratureMining';
import HypothesisGeneration from './HypothesisGeneration';
import CollaborationWorkspace from './CollaborationWorkspace';

// Absolute base for tab links. These MUST be absolute: this portal is mounted
// on a splat route (`researcher/*`), so a relative `to` resolves against the
// current URL and appends instead of replacing
// (e.g. /dashboard/researcher/signals + "dashboards" -> .../signals/dashboards).
const BASE_PATH = '/dashboard/researcher';

const tabs = [
    { path: 'ethics-access', label: 'Ethics-Governed Access', icon: <ShieldCheck size={18} /> },
    { path: 'signals', label: 'ADR Signal Detection', icon: <Pulse size={18} /> },
    { path: 'dashboards', label: 'Custom Dashboards', icon: <SquaresFour size={18} /> },
    { path: 'export', label: 'Dataset Export', icon: <DownloadSimple size={18} /> },
    { path: 'knowledge-graph', label: 'Knowledge Graph', icon: <Graph size={18} /> },
    { path: 'literature', label: 'Literature Mining', icon: <BookOpen size={18} /> },
    { path: 'hypotheses', label: 'Hypothesis Generation', icon: <Lightbulb size={18} /> },
    { path: 'workspace', label: 'Collaboration Workspace', icon: <UsersThree size={18} /> },
];

const ResearcherPortal = () => {
    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--primary)' }}>Researcher Portal</h1>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)' }}>
                    Governed access to anonymised pharmacovigilance data, signal detection and research tooling.
                </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={`${BASE_PATH}/${tab.path}`}
                        style={({ isActive }) => ({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1rem',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: isActive ? '#fff' : 'var(--text-main)',
                            background: isActive ? 'var(--primary)' : 'transparent',
                        })}
                    >
                        {tab.icon} {tab.label}
                    </NavLink>
                ))}
            </div>

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
