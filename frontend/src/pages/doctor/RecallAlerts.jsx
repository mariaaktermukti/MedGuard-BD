import React, { useEffect, useState } from 'react';
import { Warning, CheckCircle, Megaphone, ShieldWarning } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { useNotifications, getDGDABroadcastAlerts } from '../../context/NotificationContext';

const RecallAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { broadcastAlerts: contextBroadcasts } = useNotifications() || {};

    const dgdaAlerts = (contextBroadcasts || getDGDABroadcastAlerts()).filter(alert => {
        const targets = alert.targets || ['all'];
        return targets.includes('all') || targets.includes('doctor');
    });

    useEffect(() => {
        const fetchAlerts = async () => {
            try {
                const response = await api.get('doctor/recall-alerts/');
                setAlerts(response.data.alerts);
            } catch (err) {
                console.error('Failed to fetch recall alerts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlerts();
    }, []);

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            {/* DGDA Emergency Push Broadcast Alerts */}
            {dgdaAlerts.length > 0 && (
                <Card style={{ border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.03)' }}>
                    <CardHeader
                        title="🚨 DGDA National Emergency Directives"
                        subtitle="Urgent safety advisories and recall orders broadcasted directly by DGDA Vigilance Command."
                    />
                    <CardContent>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {dgdaAlerts.map((dgdaItem) => {
                                const badgeVariant = dgdaItem.priority === 'critical' ? 'danger' : dgdaItem.priority === 'high' ? 'warning' : 'info';
                                return (
                                    <div
                                        key={dgdaItem.id}
                                        style={{
                                            padding: '1rem 1.15rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderLeft: `4px solid var(--${badgeVariant})`,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Megaphone size={20} weight="fill" color={`var(--${badgeVariant})`} />
                                                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>{dgdaItem.title}</span>
                                            </div>
                                            <Badge variant={badgeVariant} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                                                {dgdaItem.priority || 'CRITICAL'}
                                            </Badge>
                                        </div>
                                        <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                                            {dgdaItem.message}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.4rem' }}>
                                            <span>Authority: <strong>{dgdaItem.sender || 'DGDA Central Operations'}</strong></span>
                                            <span>Issued: {dgdaItem.timestamp || 'Just Now'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Patient Recall Safety Flags */}
            <Card>
                <CardHeader title="Patient-Specific Medicine Recall Alerts" subtitle="Active recalls affecting medicines your patients are currently taking." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--success)' }}>
                            <CheckCircle size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No active patient-specific recalls flagged right now.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {alerts.map((alert, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)' }}>
                                    <Warning size={24} weight="fill" color="var(--danger)" />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div style={{ fontWeight: 700 }}>{alert.patient_name}</div>
                                            <Badge variant="danger">{alert.medicine_name}</Badge>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.2rem 0' }}>
                                            Batch {alert.batch_number} &bull; Recalled {alert.date_issued}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{alert.reason}</p>
                                        {alert.sources?.length > 0 && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                                                Patient is on this medicine per their {alert.sources.join(' and ')}.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default RecallAlerts;
