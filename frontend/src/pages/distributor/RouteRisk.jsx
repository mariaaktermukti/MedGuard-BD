import React, { useEffect, useState } from 'react';
import { Warning, Info, ShieldWarning } from '@phosphor-icons/react';
import api from '../../services/api';

const StatusPill = ({ children, tone = 'amber' }) => {
    const color = tone === 'red' ? 'var(--danger)' : 'var(--warning)';
    const bg = tone === 'red' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const RouteRisk = () => {
    const [alerts, setAlerts] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get('core/distributor/route-risk/');
                setAlerts(response.data.alerts);
                setNote(response.data.note);
            } catch (error) {
                console.error('Failed to fetch route risk alerts:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>AI Route Risk Detection</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Delay and hazard-keyword flags for pending/in-transit shipments.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                <Info size={20} color="var(--warning)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{note}</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <ShieldWarning size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No risk flags right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {alerts.map((alert, index) => (
                            <div key={index} style={{ padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                    <StatusPill tone={alert.type === 'danger' ? 'red' : 'amber'}><Warning size={14} />{alert.type}</StatusPill>
                                    <div style={{ fontWeight: 700 }}>{alert.title}</div>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{alert.message}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteRisk;
