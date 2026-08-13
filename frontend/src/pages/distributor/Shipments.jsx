import React, { useEffect, useState } from 'react';
import { Truck, PaperPlaneTilt, ArrowDown, ArrowUp } from '@phosphor-icons/react';
import api from '../../services/api';

const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-input)',
    color: 'var(--text-light)',
    fontSize: '1rem',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
};

const Field = ({ label, children }) => (
    <div className="input-group" style={{ marginBottom: 0 }}>
        <label>{label}</label>
        {children}
    </div>
);

const StatusPill = ({ children, tone = 'blue' }) => {
    const color = tone === 'green' ? 'var(--success)' : tone === 'red' ? 'var(--danger)' : tone === 'amber' ? 'var(--warning)' : 'var(--primary-color)';
    const bg = tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'red' ? 'rgba(239, 68, 68, 0.1)' : tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const statusTone = (status) => {
    if (status === 'in_transit') return 'blue';
    if (status === 'delivered') return 'green';
    if (status === 'cancelled') return 'red';
    return 'amber';
};

const Shipments = () => {
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [qrCode, setQrCode] = useState('');
    const [toUser, setToUser] = useState('');
    const [quantity, setQuantity] = useState('');
    const [shipmentDate, setShipmentDate] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [updatingId, setUpdatingId] = useState(null);

    const fetchAll = async () => {
        try {
            const [incomingRes, outgoingRes, pharmaciesRes] = await Promise.all([
                api.get('core/distributor/shipments/incoming/'),
                api.get('core/distributor/shipments/outgoing/'),
                api.get('core/pharmacies/'),
            ]);
            setIncoming(incomingRes.data);
            setOutgoing(outgoingRes.data);
            setPharmacies(pharmaciesRes.data);
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();
        setMessage('');

        if (!qrCode.trim() || !toUser || !quantity || !shipmentDate) {
            setMessage('Batch QR code, destination pharmacy, quantity, and shipment date are required.');
            return;
        }

        setSubmitting(true);
        try {
            const passport = await api.get(`core/passport/${qrCode.trim()}/`);
            await api.post('core/distributor/shipments/outgoing/', {
                batch: passport.data.id,
                to_user: Number(toUser),
                quantity: Number(quantity),
                shipment_date: shipmentDate,
                tracking_number: trackingNumber.trim() || null,
            });
            setMessage(`Shipment created for batch ${passport.data.batch_number}.`);
            setQrCode('');
            setToUser('');
            setQuantity('');
            setShipmentDate('');
            setTrackingNumber('');
            fetchAll();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not create this shipment. Check the batch QR code.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (shipment, newStatus) => {
        setUpdatingId(shipment.id);
        try {
            await api.patch(`core/distributor/shipments/outgoing/${shipment.id}/`, { status: newStatus });
            fetchAll();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not update shipment status.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Shipment Management</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Track shipments coming in from manufacturers and manage shipments going out to pharmacies.</p>
            </div>

            {message && <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary-color)' }}>{message}</div>}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PaperPlaneTilt size={20} color="var(--primary-color)" /> Create Outgoing Shipment
                </h2>
                <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                        <Field label="Batch QR Code">
                            <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Scan or paste batch QR code" style={inputStyle} />
                        </Field>
                        <Field label="Ship To (Pharmacy)">
                            <select value={toUser} onChange={(e) => setToUser(e.target.value)} style={inputStyle}>
                                <option value="">Select pharmacy</option>
                                {pharmacies.map((pharmacy) => (
                                    <option key={pharmacy.user} value={pharmacy.user}>{pharmacy.pharmacy_name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Quantity">
                            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 500" style={inputStyle} />
                        </Field>
                        <Field label="Shipment Date">
                            <input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} style={inputStyle} />
                        </Field>
                        <Field label="Tracking Number (optional)">
                            <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. TRK-00123" style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                            <PaperPlaneTilt size={18} /> Create Shipment
                        </button>
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowUp size={20} color="var(--primary-color)" /> Outgoing Shipments (to Pharmacies)
                </h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : outgoing.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No outgoing shipments yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {outgoing.map((shipment) => (
                            <div key={shipment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{shipment.batch_details.medicine} &bull; Batch {shipment.batch_details.batch_number}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        To {shipment.to_details.username} &bull; {shipment.quantity} units &bull; Tracking {shipment.tracking_number || 'N/A'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <StatusPill tone={statusTone(shipment.status)}>{shipment.status.replace('_', ' ')}</StatusPill>
                                    {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
                                        <select
                                            value={shipment.status}
                                            disabled={updatingId === shipment.id}
                                            onChange={(e) => handleStatusChange(shipment, e.target.value)}
                                            style={{ ...inputStyle, width: 'auto', padding: '0.5rem 0.75rem' }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="in_transit">In Transit</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowDown size={20} color="var(--primary-color)" /> Incoming Shipments (from Manufacturers)
                </h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : incoming.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <Truck size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No incoming shipments yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {incoming.map((shipment) => (
                            <div key={shipment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{shipment.batch_details.medicine} &bull; Batch {shipment.batch_details.batch_number}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        From {shipment.from_details.username} &bull; {shipment.quantity} units &bull; Tracking {shipment.tracking_number || 'N/A'}
                                    </div>
                                </div>
                                <StatusPill tone={statusTone(shipment.status)}>{shipment.status.replace('_', ' ')}</StatusPill>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Shipments;
