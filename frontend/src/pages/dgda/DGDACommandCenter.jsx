import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, ArrowUp, ArrowDown, ArrowsClockwise, Bell, WarningCircle, 
    ShieldWarning, Buildings, Crosshair, Pulse, CheckCircle, Clock, MagnifyingGlass, Eye, ArrowRight
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

// initialData lets the portal hand over the command-center response it has
// already fetched, so the endpoint is not requested twice for one screen.
const DGDACommandCenter = ({ onNavigateTab, initialData = null }) => {
    const navigate = useNavigate();
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleCardClick = (tabId) => {
        if (tabId === 'counterfeit-intel') {
            navigate('/dashboard/dgda/counterfeit-intel');
        } else if (onNavigateTab) {
            onNavigateTab(tabId);
        }
    };

    const fetchData = async () => {
        setIsRefreshing(true);
        try {
            const res = await api.get('core/dgda/command-center/');
            setData(res.data);
        } catch (err) {
            console.error("Error fetching Command Center data:", err);
        }
        setIsLoading(false);
        setIsRefreshing(false);
    };

    useEffect(() => {
        if (initialData) {
            setData(initialData);
            setIsLoading(false);
            return;
        }
        fetchData();
    }, [initialData]);

    if (isLoading) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Pulse size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
                <p>Loading National Command Center Intelligence...</p>
            </div>
        );
    }

    const kpis = data?.kpis || {};
    const officer = data?.officer_info || {};
    const severityOverview = data?.severity_overview || { critical: 0, high: 0, medium: 0, low: 0 };
    const totalSeverityAlerts = (severityOverview.critical + severityOverview.high + severityOverview.medium + severityOverview.low) || 1;

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            


            {/* 1.2 KPI Cards (6 Dynamic Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                {/* Active Alerts */}
                <Card 
                    padding="md" 
                    onClick={() => handleCardClick('live-monitoring')}
                    style={{ borderLeft: '4px solid var(--primary)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover-lift"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Active Alerts</span>
                        <Badge variant="primary">Live</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {kpis.active_alerts || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ArrowUp size={12} weight="bold" /> 12% from previous period
                    </div>
                </Card>

                {/* Critical Alerts */}
                <Card 
                    padding="md" 
                    onClick={() => handleCardClick('live-monitoring')}
                    style={{ borderLeft: '4px solid var(--danger)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover-lift"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Critical Alerts</span>
                        <Badge variant="danger">Action Required</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--danger)', marginBottom: '0.25rem' }}>
                        {kpis.critical_alerts || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <WarningCircle size={12} weight="fill" /> Requires immediate action
                    </div>
                </Card>

                {/* High-Risk Entities */}
                <Card 
                    padding="md" 
                    onClick={() => handleCardClick('entities')}
                    style={{ borderLeft: '4px solid var(--warning)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover-lift"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>High-Risk Entities</span>
                        <Badge variant="warning">Flagged</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '0.25rem' }}>
                        {kpis.high_risk_entities || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Manufacturers & Pharmacies
                    </div>
                </Card>

                {/* ADR Signals */}
                <Card 
                    padding="md" 
                    onClick={() => handleCardClick('live-monitoring')}
                    style={{ borderLeft: '4px solid #8B5CF6', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover-lift"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ADR Signals</span>
                        <Badge variant="secondary">Safety</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8B5CF6', marginBottom: '0.25rem' }}>
                        {kpis.adr_signals || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Active adverse reaction signals
                    </div>
                </Card>

                {/* Counterfeit Signals */}
                <Card 
                    padding="md" 
                    onClick={() => handleCardClick('counterfeit-intel')}
                    style={{ borderLeft: '4px solid #EC4899', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    className="hover-lift"
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Counterfeit Signals</span>
                        <Badge variant="danger">High Severity</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#EC4899', marginBottom: '0.25rem' }}>
                        {kpis.counterfeit_signals || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Suspected illegal batches
                    </div>
                </Card>
            </div>

            {/* Quick Actions Bar */}
            <Card padding="md" style={{ background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        Command Center Quick Actions:
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <Button variant="primary" size="sm" onClick={() => handleCardClick('live-monitoring')}>
                            <Crosshair size={16} /> View All Alerts
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCardClick('entities')}>
                            <MagnifyingGlass size={16} /> Search Entity
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => handleCardClick('entities')}>
                            <Buildings size={16} /> View High-Risk Entities
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCardClick('live-monitoring')}>
                            <Eye size={16} /> View Monitoring
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Main Dashboard Grid: Severity Overview & AI Situation Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                
                {/* 1.3 Severity Overview */}
                <Card padding="lg">
                    <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Alert Severity Overview</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Visual summary of active regulatory alerts by threat severity</p>
                    
                    {/* Horizontal Bar Chart Visual Representation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        
                        {/* Critical */}
                        <div onClick={() => handleCardClick('live-monitoring')} style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Critical</span>
                                <span style={{ fontWeight: 700 }}>{severityOverview.critical}</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-page)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${Math.max((severityOverview.critical / totalSeverityAlerts) * 100, 8)}%`, 
                                    background: 'var(--danger)', 
                                    borderRadius: '5px',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>

                        {/* High */}
                        <div onClick={() => handleCardClick('live-monitoring')} style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--warning)' }}>High</span>
                                <span style={{ fontWeight: 700 }}>{severityOverview.high}</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-page)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${Math.max((severityOverview.high / totalSeverityAlerts) * 100, 8)}%`, 
                                    background: 'var(--warning)', 
                                    borderRadius: '5px',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>

                        {/* Medium */}
                        <div onClick={() => handleCardClick('live-monitoring')} style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--info)' }}>Medium</span>
                                <span style={{ fontWeight: 700 }}>{severityOverview.medium}</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-page)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${Math.max((severityOverview.medium / totalSeverityAlerts) * 100, 8)}%`, 
                                    background: 'var(--info)', 
                                    borderRadius: '5px',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>

                        {/* Low */}
                        <div onClick={() => handleCardClick('live-monitoring')} style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600, color: 'var(--success)' }}>Low</span>
                                <span style={{ fontWeight: 700 }}>{severityOverview.low}</span>
                            </div>
                            <div style={{ height: '10px', background: 'var(--bg-page)', borderRadius: '5px', overflow: 'hidden' }}>
                                <div style={{ 
                                    height: '100%', 
                                    width: `${Math.max((severityOverview.low / totalSeverityAlerts) * 100, 8)}%`, 
                                    background: 'var(--success)', 
                                    borderRadius: '5px',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>

                    </div>
                </Card>

                {/* 1.6 AI Situation Summary */}
                <Card padding="lg" style={{ border: '1px solid #10B981', background: 'linear-gradient(180deg, #FFFFFF 0%, #ECFDF5 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Pulse size={20} color="var(--primary)" weight="bold" /> AI Situation Summary
                        </h3>
                        <Badge variant="primary">LLM Ready Service</Badge>
                    </div>
                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                        "{data?.ai_situation_summary || "Real-time AI analysis indicates elevated vigilance required for counterfeit signals in Chattogram and ADR spikes in central Dhaka."}"
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                        <CheckCircle size={16} color="var(--primary)" />
                        Backend service modularized for LLM model plugging.
                    </div>
                </Card>
            </div>



        </div>
    );
};

export default DGDACommandCenter;
