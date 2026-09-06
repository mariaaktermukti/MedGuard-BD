import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    ShieldWarning, WarningCircle, CheckCircle
} from '@phosphor-icons/react';
import api from '../../services/api';
import MapComponent from '../../components/MapComponent';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

import DGDACommandCenter from './DGDACommandCenter';
import DGDAMonitoring from './DGDAMonitoring';
import DGDAEntities from './DGDAEntities';

const DGDAPortal = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;

    const [activeTab, setActiveTab] = useState('command-center');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const tabs = [
        { id: 'command-center', path: '/dashboard/dgda/command-center' },
        { id: 'monitoring', path: '/dashboard/dgda/monitoring' },
        { id: 'entities', path: '/dashboard/dgda/entities' },
        { id: 'investigations', path: '/dashboard/dgda/investigations' },
        { id: 'recalls', path: '/dashboard/dgda/recalls' },
        { id: 'inspections', path: '/dashboard/dgda/inspections' },
        { id: 'heatmaps', path: '/dashboard/dgda/heatmaps' },
        { id: 'risk', path: '/dashboard/dgda/risk' }
    ];

    useEffect(() => {
        let currentTab = tabs.find(t => pathname.includes(t.path));
        if (!currentTab && pathname.includes('/dashboard/dgda/live-monitoring')) {
            currentTab = { id: 'monitoring', path: '/dashboard/dgda/monitoring' };
        }
        const activeId = currentTab ? currentTab.id : 'command-center';
        setActiveTab(activeId);
        if (['investigations', 'recalls', 'inspections', 'heatmaps', 'risk'].includes(activeId)) {
            fetchTabData(activeId);
        }
    }, [pathname]);

    const handleNavigateTab = (tabId) => {
        const target = tabs.find(t => t.id === tabId) || tabs[0];
        setActiveTab(target.id);
        navigate(target.path);
    };

    const fetchTabData = async (tab) => {
        setIsLoading(true);
        try {
            let endpoint = '';
            switch(tab) {
                case 'investigations': endpoint = 'core/dgda/investigations/'; break;
                case 'recalls': endpoint = 'core/dgda/recalls/'; break;
                case 'inspections': endpoint = 'core/dgda/inspections/'; break;
                case 'heatmaps': endpoint = 'core/dgda/heatmaps/'; break;
                case 'risk': endpoint = 'core/dgda/risk-intelligence/'; break;
                default: endpoint = null;
            }
            if (endpoint) {
                const res = await api.get(endpoint);
                setData(res.data);
            } else {
                setData(null);
            }
        } catch (err) {
            console.error("Error fetching data for tab", tab, err);
        }
        setIsLoading(false);
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'command-center':
                return <DGDACommandCenter onNavigateTab={handleNavigateTab} />;

            case 'monitoring':
            case 'live-monitoring':
                return <DGDAMonitoring />;

            case 'entities':
                return <DGDAEntities />;

            case 'investigations':
                return (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Active Investigations</h2>
                        {isLoading ? <p>Loading investigations...</p> : data && data.map((inv, idx) => (
                            <Card key={idx} padding="md" style={{ marginBottom: '1rem', borderLeft: inv.threat_level === 'High' ? '4px solid var(--danger)' : '4px solid var(--warning)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{inv.issue}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            Batch: <strong>{inv.batch_number}</strong> • Threat Level: <Badge variant={inv.threat_level === 'High' ? 'danger' : 'warning'}>{inv.threat_level}</Badge>
                                        </p>
                                    </div>
                                    <Button variant="danger" size="sm">Freeze Batch</Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                );

            case 'heatmaps':
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Interactive visualization of ADRs, shortages, and counterfeiting risks across Bangladesh.</p>
                        </div>
                        <Card padding="none" style={{ height: '500px', overflow: 'hidden' }}>
                            {data && <MapComponent points={data} />}
                        </Card>
                    </div>
                );

            case 'risk':
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Card padding="lg" style={{ textAlign: 'center', minWidth: '240px', background: 'var(--bg-page)', border: 'none' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Health Score</h3>
                                {data ? (
                                    <div style={{
                                        fontSize: '4rem', fontWeight: '800', lineHeight: 1,
                                        color: data.system_health_score > 80 ? 'var(--success)' : data.system_health_score > 50 ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                        {data.system_health_score}
                                        <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/100</span>
                                    </div>
                                ) : <p>Loading...</p>}
                            </Card>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Risk Engine</h2>
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
                                    The Risk Engine continuously analyzes nationwide distribution, inventory levels, quality test reports, and adverse reactions to predict threats before they escalate.
                                </p>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Threats</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data && data.threats && data.threats.length > 0 ? data.threats.map((threat, idx) => (
                                <Card key={idx} padding="md" style={{ 
                                    borderLeft: threat.severity === 'critical' ? '4px solid var(--danger)' : '4px solid var(--warning)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                {threat.severity === 'critical' ? <ShieldWarning size={20} color="var(--danger)" /> : <WarningCircle size={20} color="var(--warning)" />}
                                                <Badge variant={threat.severity === 'critical' ? 'danger' : 'warning'}>{threat.severity}</Badge>
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{threat.message}</h4>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {threat.type === 'adr' && <Button variant="primary" size="sm">Investigate Batch</Button>}
                                            {threat.type === 'qc' && <Button variant="danger" size="sm">Initiate Recall</Button>}
                                            {threat.type === 'shortage' && <Button variant="outline" size="sm">Alert Suppliers</Button>}
                                        </div>
                                    </div>
                                </Card>
                            )) : (
                                <Card padding="lg" style={{ textAlign: 'center', color: 'var(--success)' }}>
                                    <CheckCircle size={48} weight="duotone" style={{ margin: '0 auto 1rem auto' }} />
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Threats Detected</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>The national supply chain is currently stable and running smoothly.</p>
                                </Card>
                            )}
                        </div>
                    </div>
                );

            default:
                return <DGDACommandCenter onNavigateTab={handleNavigateTab} />;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Main Content Area - Navigated exclusively via Sidebar */}
            <div style={{ flex: 1 }}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default DGDAPortal;
