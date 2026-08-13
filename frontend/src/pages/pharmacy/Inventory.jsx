import React, { useEffect, useState } from 'react';
import { Package, Plus, Warning } from '@phosphor-icons/react';
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

const StatusPill = ({ children, tone = 'blue' }) => {
    const color = tone === 'green' ? 'var(--success)' : tone === 'red' ? 'var(--danger)' : 'var(--primary-color)';
    const bg = tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'red' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const Inventory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [qrCode, setQrCode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchInventory = async () => {
        try {
            const response = await api.get('core/pharmacy/inventory/');
            setItems(response.data);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleAddStock = async (event) => {
        event.preventDefault();
        setMessage('');
        if (!qrCode.trim() || !quantity) {
            setMessage('Enter the batch QR code and a quantity.');
            return;
        }

        setSubmitting(true);
        try {
            const passport = await api.get(`core/passport/${qrCode.trim()}/`);
            await api.post('core/pharmacy/inventory/', {
                batch: passport.data.id,
                quantity: Number(quantity),
            });
            setMessage(`Stock added for batch ${passport.data.batch_number}.`);
            setQrCode('');
            setQuantity('');
            fetchInventory();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not find that batch QR code.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Inventory Management</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Track stock levels and receive batches by scanning their QR code.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Add / Update Stock</h2>
                <form onSubmit={handleAddStock} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Batch QR Code</label>
                        <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Scan or paste batch QR code" style={inputStyle} />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Quantity</label>
                        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 100" style={inputStyle} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 1.25rem' }}>
                        <Plus size={18} weight="bold" /> Add
                    </button>
                </form>
                {message && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{message}</p>}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Current Stock</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading inventory...</p>
                ) : items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <Package size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No stock recorded yet. Add a batch above to get started.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {items.map((item) => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{item.batch_details.medicine}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        Batch {item.batch_details.batch_number} &bull; Expiry {item.batch_details.expiry_date}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    {item.is_low_stock && (
                                        <StatusPill tone="red"><Warning size={14} />Low stock</StatusPill>
                                    )}
                                    {item.batch_details.status === 'recalled' && (
                                        <StatusPill tone="red"><Warning size={14} />Recalled</StatusPill>
                                    )}
                                    <StatusPill tone="green">{item.quantity} units</StatusPill>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inventory;
