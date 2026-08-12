import React, { useEffect, useState } from 'react';
import { Truck, CheckCircle } from '@phosphor-icons/react';
import api from '../../services/api';

const StatusPill = ({ children, tone = 'blue' }) => {
    const color = tone === 'green' ? 'var(--success)' : tone === 'amber' ? 'var(--warning)' : 'var(--primary-color)';
    const bg = tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const Suppliers = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [receivingId, setReceivingId] = useState(null);

    const fetchShipments = async () => {
        try {
            const response = await api.get('core/pharmacy/shipments/');
            setShipments(response.data);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    const handleReceive = async (id) => {
        setReceivingId(id);
        setMessage('');
        try {
            await api.post(`core/pharmacy/shipments/${id}/receive/`);
            setMessage('Shipment received and added to inventory.');
            fetchShipments();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not receive this shipment.');
        } finally {
            setReceivingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Supplier Management</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Track incoming shipments from distributors and manufacturers.</p>
            </div>

            {message && <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary-color)' }}>{message}</div>}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading shipments...</p>
                ) : shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <Truck size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No incoming shipments yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {shipments.map((shipment) => (
                            <div key={shipment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{shipment.batch_details.medicine} &bull; Batch {shipment.batch_details.batch_number}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        From {shipment.from_details.username} &bull; {shipment.quantity} units &bull; Tracking {shipment.tracking_number || 'N/A'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <StatusPill tone={shipment.status === 'delivered' ? 'green' : 'amber'}>{shipment.status.replace('_', ' ')}</StatusPill>
                                    {shipment.status !== 'delivered' && (
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ width: 'auto', padding: '0.6rem 1rem' }}
                                            disabled={receivingId === shipment.id}
                                            onClick={() => handleReceive(shipment.id)}
                                        >
                                            <CheckCircle size={18} /> Mark Received
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Suppliers;
