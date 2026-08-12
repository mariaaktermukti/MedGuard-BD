import React, { useEffect, useState } from 'react';
import { Warning, CalendarBlank, ShieldWarning } from '@phosphor-icons/react';
import api from '../../services/api';

const StatusPill = ({ children, tone = 'red' }) => {
    const color = tone === 'amber' ? 'var(--warning)' : 'var(--danger)';
    const bg = tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const Alerts = () => {
    const [recalls, setRecalls] = useState([]);
    const [expiring, setExpiring] = useState([]);
    const [riskAlerts, setRiskAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const [recallsRes, expiryRes, riskRes] = await Promise.all([
                    api.get('core/pharmacy/recalls/'),
                    api.get('core/pharmacy/expiry-alerts/'),
                    api.get('core/pharmacy/risk-alerts/'),
                ]);
                setRecalls(recallsRes.data);
                setExpiring(expiryRes.data);
                setRiskAlerts(riskRes.data);
            } catch (error) {
                console.error('Failed to fetch alerts:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Recall, Expiry & Risk Alerts</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Active recalls, near-expiry stock, and suspicious activity heuristics for your inventory.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldWarning size={20} color="var(--danger)" /> Active Recalls
                </h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : recalls.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No active recalls affecting your stock.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {recalls.map((recall) => (
                            <div key={recall.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.04)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{recall.batch_details.medicine} &bull; Batch {recall.batch_details.batch_number}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{recall.reason}</div>
                                </div>
                                <StatusPill tone="red"><Warning size={14} />Sales blocked</StatusPill>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarBlank size={20} color="var(--warning)" /> Expiring Stock (next 90 days)
                </h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : expiring.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No stock expiring soon.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {expiring.map((item) => (
                            <div key={item.inventory_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{item.medicine} &bull; Batch {item.batch_number}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.quantity} units &bull; Expiry {item.expiry_date}</div>
                                </div>
                                <StatusPill tone={item.is_expired ? 'red' : 'amber'}>
                                    <Warning size={14} />{item.is_expired ? 'Expired' : 'Expiring soon'}
                                </StatusPill>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldWarning size={20} color="var(--danger)" /> AI Risk Alerts
                </h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : riskAlerts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No suspicious activity detected right now.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {riskAlerts.map((alert, index) => (
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

export default Alerts;
