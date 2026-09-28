import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Warning, Info, ShieldWarning, Robot, CheckCircle, ArrowRight, ArrowLeft } from '@phosphor-icons/react';
import api from '../../services/api';

const StatusPill = ({ children, tone = 'amber' }) => {
    const color = tone === 'red' ? '#ef4444' : (tone === 'orange' ? '#f97316' : '#f59e0b');
    const bg = tone === 'red' ? 'rgba(239, 68, 68, 0.12)' : (tone === 'orange' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(245, 158, 11, 0.12)');
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const RouteRisk = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [resolvedIndex, setResolvedIndex] = useState(null);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get('core/distributor/route-risk/');
                setAlerts(response.data.alerts || []);
                setNote(response.data.note || '');
            } catch (error) {
                console.error('Failed to fetch route risk alerts:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    const handleResolve = (index) => {
        setResolvedIndex(index);
        setTimeout(() => {
            setAlerts((prev) => prev.filter((_, i) => i !== index));
            setResolvedIndex(null);
        }, 1200);
    };

    return (
        <div style={{ maxWidth: '950px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <button
                type="button"
                onClick={() => navigate('/dashboard/distributor')}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: 'fit-content',
                    padding: 0
                }}
            >
                <ArrowLeft size={16} weight="bold" /> Back to Distributor Dashboard
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Robot size={28} weight="duotone" color="var(--primary)" /> AI Route Risk Detection
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Real-time machine scanning for cold-chain deviations, transit delays & route hazards.</p>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldWarning size={18} weight="fill" /> AI Scanner Active
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                <Info size={20} color="var(--warning)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{note}</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Scanning route logistics for risk anomalies...</p>
                ) : alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                        <CheckCircle size={52} color="#10b981" weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <h3 style={{ margin: '0 0 0.4rem', color: 'var(--text-main)' }}>All Logistics Routes Clear</h3>
                        <p style={{ margin: 0 }}>No critical transit risk flags or cold-chain deviations detected.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {alerts.map((alert, index) => {
                            const isDanger = alert.type === 'danger' || alert.risk_level === 'CRITICAL';
                            const tone = isDanger ? 'red' : (alert.risk_level === 'HIGH' ? 'orange' : 'amber');
                            return (
                                <div key={index} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.3)' : 'var(--border)'}`, background: 'var(--bg-card)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.6rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <StatusPill tone={tone}><Warning size={14} />{alert.risk_level || (isDanger ? 'CRITICAL' : 'MODERATE')}</StatusPill>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{alert.title}</div>
                                        </div>
                                        <button
                                            type="button"
                                            className="ui-btn"
                                            style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.8rem', background: 'var(--bg-input)', border: '1px solid var(--border)' }}
                                            onClick={() => handleResolve(index)}
                                        >
                                            {resolvedIndex === index ? 'Rerouting...' : 'Acknowledge & Reroute'}
                                        </button>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '0.75rem' }}>{alert.message}</div>
                                    
                                    {alert.recommendation && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, padding: '0.5rem 0.75rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '0.5rem' }}>
                                            <ArrowRight size={14} /> <strong>AI Recommendation:</strong> {alert.recommendation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteRisk;
