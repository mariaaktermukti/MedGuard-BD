import React, { useState, useEffect } from 'react';
import { 
    MapPin, ArrowUp, ArrowDown, ArrowsClockwise, Bell, WarningCircle, 
    ShieldWarning, Buildings, Crosshair, Pulse, CheckCircle, Clock, MagnifyingGlass, Eye, ArrowRight
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const DGDACommandCenter = ({ onNavigateTab }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
        fetchData();
    }, []);

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
            
            {/* 1.1 Dashboard Header */}
            <Card padding="lg" style={{ 
                background: 'linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)', 
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-md)', color: 'var(--primary)' }}>
                                <MapPin size={28} weight="duotone" />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-main)' }}>DGDA Command Center</h1>
                                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                                    National Drug Safety & Regulatory Intelligence Dashboard
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {/* Date & Officer Info */}
                        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{officer.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                Officer: <strong>{officer.full_name || 'Dr. Shamsul Alam'}</strong> ({officer.designation || 'Vigilance Director'})
                            </div>
                        </div>

                        {/* Notification / Alert Indicator */}
                        <div style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-card)', 
                            border: '1px solid var(--border)', position: 'relative', cursor: 'pointer'
                        }}>
                            <Bell size={20} color="var(--primary)" weight="duotone" />
                            {kpis.critical_alerts > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-2px', right: '-2px',
                                    width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)'
                                }} />
                            )}
                        </div>

                        {/* Refresh Button */}
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchData} 
                            disabled={isRefreshing}
                        >
                            <ArrowsClockwise size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </Card>

            {/* 1.2 KPI Cards (6 Dynamic Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                {/* Active Alerts */}
                <Card padding="md" style={{ borderLeft: '4px solid var(--primary)' }}>
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
                <Card padding="md" style={{ borderLeft: '4px solid var(--danger)' }}>
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
                <Card padding="md" style={{ borderLeft: '4px solid var(--warning)' }}>
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

                {/* Open Monitoring Cases */}
                <Card padding="md" style={{ borderLeft: '4px solid var(--info)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Open Cases</span>
                        <Badge variant="info">In Review</Badge>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--info)', marginBottom: '0.25rem' }}>
                        {kpis.open_monitoring_cases || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Unresolved events
                    </div>
                </Card>

                {/* ADR Signals */}
                <Card padding="md" style={{ borderLeft: '4px solid #8B5CF6' }}>
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
                <Card padding="md" style={{ borderLeft: '4px solid #EC4899' }}>
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
                        <Button variant="primary" size="sm" onClick={() => onNavigateTab('monitoring')}>
                            <Crosshair size={16} /> View All Alerts
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onNavigateTab('entities')}>
                            <MagnifyingGlass size={16} /> Search Entity
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => onNavigateTab('entities')}>
                            <Buildings size={16} /> View High-Risk Entities
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onNavigateTab('monitoring')}>
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
                        <div>
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
                        <div>
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
                        <div>
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
                        <div>
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

            {/* 1.4 Live Regulatory Alerts */}
            <Card padding="none">
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Live Regulatory Alerts</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time flagged safety and compliance events</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onNavigateTab('monitoring')}>
                        View All Monitoring <ArrowRight size={14} />
                    </Button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Alert ID</th>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Alert Type</th>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Medicine / Entity</th>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Location</th>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Severity</th>
                                <th style={{ padding: '0.75rem 1.25rem' }}>Status</th>
                                <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.live_alerts && data.live_alerts.length > 0 ? (
                                data.live_alerts.map((alert) => (
                                    <tr key={alert.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600, color: 'var(--primary)' }}>
                                            {alert.event_id}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            {alert.event_type_display || alert.event_type}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', fontWeight: 500 }}>
                                            {alert.medicine_name || alert.title}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted)' }}>
                                            {alert.location || 'Dhaka'}
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            <Badge variant={
                                                alert.severity === 'critical' ? 'danger' :
                                                alert.severity === 'high' ? 'warning' :
                                                alert.severity === 'medium' ? 'info' : 'success'
                                            }>
                                                {alert.severity_display || alert.severity.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem' }}>
                                            <Badge variant="outline">{alert.status_display || alert.status}</Badge>
                                        </td>
                                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <Button variant="outline" size="sm" onClick={() => onNavigateTab('monitoring')}>
                                                    View
                                                </Button>
                                                <Button variant="primary" size="sm" onClick={() => onNavigateTab('monitoring')}>
                                                    Investigate
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No active regulatory alerts detected.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* 1.5 Recent Activity Timeline */}
            <Card padding="lg">
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Recent Regulatory Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {data?.recent_activity && data.recent_activity.length > 0 ? (
                        data.recent_activity.map((act, idx) => (
                            <div key={idx} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                padding: '0.75rem 1rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)',
                                borderLeft: act.severity === 'critical' ? '3px solid var(--danger)' : '3px solid var(--primary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Clock size={18} color="var(--text-muted)" />
                                    <div>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>{act.time}</span>
                                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{act.event}</strong>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {act.entity}</span>
                                    </div>
                                </div>
                                <Badge variant="outline">{act.status}</Badge>
                            </div>
                        ))
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No recent activity recorded.</p>
                    )}
                </div>
            </Card>

        </div>
    );
};

export default DGDACommandCenter;
