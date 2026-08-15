import React, { useEffect, useState } from 'react';
import { Warning, CheckCircle } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const RecallAlerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

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
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="Recall Notifications" subtitle="Active recalls affecting medicines your patients are currently on." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : alerts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--success)' }}>
                            <CheckCircle size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p style={{ color: 'var(--text-muted)' }}>No active recalls affecting your patients right now.</p>
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
