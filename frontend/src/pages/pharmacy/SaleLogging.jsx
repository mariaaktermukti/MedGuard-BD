import React, { useState } from 'react';
import { QrCode, MagnifyingGlass, Receipt, CheckCircle, Warning } from '@phosphor-icons/react';
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

const SaleLogging = () => {
    const [qrCode, setQrCode] = useState('');
    const [batch, setBatch] = useState(null);
    const [batchError, setBatchError] = useState('');
    const [checkingBatch, setCheckingBatch] = useState(false);

    const [phone, setPhone] = useState('');
    const [citizens, setCitizens] = useState([]);
    const [selectedCitizen, setSelectedCitizen] = useState(null);
    const [lookingUp, setLookingUp] = useState(false);
    const [citizenMessage, setCitizenMessage] = useState('');

    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [saleMessage, setSaleMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCheckBatch = async (event) => {
        event.preventDefault();
        if (!qrCode.trim()) return;
        setCheckingBatch(true);
        setBatchError('');
        setBatch(null);
        try {
            const response = await api.get(`core/pharmacy/verify/${qrCode.trim()}/`);
            setBatch(response.data);
        } catch (error) {
            setBatchError(error.response?.data?.detail || 'Could not verify this batch.');
        } finally {
            setCheckingBatch(false);
        }
    };

    const handleLookupCitizen = async (event) => {
        event.preventDefault();
        if (!phone.trim()) return;
        setLookingUp(true);
        setCitizenMessage('');
        setCitizens([]);
        setSelectedCitizen(null);
        try {
            const response = await api.get('core/pharmacy/citizens/lookup/', { params: { phone: phone.trim() } });
            setCitizens(response.data);
            if (response.data.length === 0) {
                setCitizenMessage('No citizen account found with that phone number.');
            }
        } catch (error) {
            setCitizenMessage(error.response?.data?.detail || 'Lookup failed.');
        } finally {
            setLookingUp(false);
        }
    };

    const handleLogSale = async (event) => {
        event.preventDefault();
        setSaleMessage('');

        if (!batch?.batch?.id) {
            setSaleMessage('Verify the batch QR code first.');
            return;
        }
        if (!selectedCitizen) {
            setSaleMessage('Look up and select the citizen buying this medicine.');
            return;
        }
        if (!quantity) {
            setSaleMessage('Enter a quantity.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('core/pharmacy/sales/', {
                batch: batch.batch.id,
                citizen: selectedCitizen.id,
                quantity: Number(quantity),
                price: price || null,
                payment_method: paymentMethod,
            });
            setSaleMessage('Sale logged successfully.');
            setQrCode('');
            setBatch(null);
            setPhone('');
            setCitizens([]);
            setSelectedCitizen(null);
            setQuantity('');
            setPrice('');
        } catch (error) {
            setSaleMessage(error.response?.data?.[0] || error.response?.data?.detail || 'Could not log this sale.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>QR-based Sale Logging</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Verify the batch, find the buyer, then log the sale.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>1. Verify Batch</h2>
                <form onSubmit={handleCheckBatch} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                    <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Scan or paste batch QR code" style={inputStyle} />
                    <button type="submit" className="btn-primary" disabled={checkingBatch} style={{ width: 'auto', padding: '0.75rem 1.25rem' }}>
                        <QrCode size={18} /> Check
                    </button>
                </form>
                {batchError && <p style={{ marginTop: '1rem', color: 'var(--danger)' }}>{batchError}</p>}
                {batch && (
                    <div style={{
                        marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.85rem 1.1rem', borderRadius: '0.75rem',
                        background: batch.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: batch.verified ? 'var(--success)' : 'var(--danger)', fontWeight: 700,
                    }}>
                        {batch.verified ? <CheckCircle size={20} /> : <Warning size={20} />}
                        {batch.batch?.medicine?.name} — Batch {batch.batch?.batch_number} ({batch.verdict})
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>2. Find Buyer</h2>
                <form onSubmit={handleLookupCitizen} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Citizen's registered phone number" style={inputStyle} />
                    <button type="submit" className="btn-primary" disabled={lookingUp} style={{ width: 'auto', padding: '0.75rem 1.25rem' }}>
                        <MagnifyingGlass size={18} /> Lookup
                    </button>
                </form>
                {citizenMessage && <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>{citizenMessage}</p>}
                {citizens.length > 0 && (
                    <div style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
                        {citizens.map((citizen) => (
                            <div
                                key={citizen.id}
                                onClick={() => setSelectedCitizen(citizen)}
                                style={{
                                    padding: '0.75rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
                                    border: selectedCitizen?.id === citizen.id ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    background: selectedCitizen?.id === citizen.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                }}
                            >
                                <div style={{ fontWeight: 700 }}>{citizen.full_name || citizen.username}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{citizen.phone}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>3. Log Sale</h2>
                <form onSubmit={handleLogSale} style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem' }}>
                        <Field label="Quantity">
                            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={inputStyle} />
                        </Field>
                        <Field label="Price (optional)">
                            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
                        </Field>
                        <Field label="Payment Method">
                            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="mobile">Mobile</option>
                            </select>
                        </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                            <Receipt size={18} /> Log Sale
                        </button>
                    </div>
                </form>
                {saleMessage && <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{saleMessage}</p>}
            </div>
        </div>
    );
};

export default SaleLogging;
