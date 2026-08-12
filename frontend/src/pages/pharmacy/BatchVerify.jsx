import React, { useState } from 'react';
import { QrCode, CheckCircle, Warning, XCircle } from '@phosphor-icons/react';
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

const verdictMeta = {
    authentic: { tone: 'green', icon: <CheckCircle size={22} />, label: 'Authentic & Sellable' },
    recalled: { tone: 'red', icon: <Warning size={22} />, label: 'Recalled — Do Not Sell' },
    expired: { tone: 'red', icon: <Warning size={22} />, label: 'Expired — Do Not Sell' },
    blocked: { tone: 'amber', icon: <Warning size={22} />, label: 'Release Blocked — Do Not Sell' },
    unknown: { tone: 'red', icon: <XCircle size={22} />, label: 'Not Recognized' },
};

const BatchVerify = () => {
    const [qrCode, setQrCode] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (event) => {
        event.preventDefault();
        if (!qrCode.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await api.get(`core/pharmacy/verify/${qrCode.trim()}/`);
            setResult(response.data);
        } catch (err) {
            if (err.response?.data) {
                setResult(err.response.data);
            } else {
                setError('Could not verify this QR code right now.');
            }
        } finally {
            setLoading(false);
        }
    };

    const meta = result ? verdictMeta[result.verdict] || verdictMeta.unknown : null;
    const toneColor = meta?.tone === 'green' ? 'var(--success)' : meta?.tone === 'amber' ? 'var(--warning)' : 'var(--danger)';
    const toneBg = meta?.tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : meta?.tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';

    return (
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Batch Verification</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Scan or enter a batch QR code to confirm authenticity before selling.</p>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <form onSubmit={handleVerify} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem' }}>
                    <input value={qrCode} onChange={(e) => setQrCode(e.target.value)} placeholder="Scan or paste batch QR code" style={inputStyle} />
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                        <QrCode size={18} /> Verify
                    </button>
                </form>
                {error && <p style={{ marginTop: '1rem', color: 'var(--danger)' }}>{error}</p>}
            </div>

            {result && (
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderRadius: '0.85rem', background: toneBg, color: toneColor, fontWeight: 700, marginBottom: '1.25rem' }}>
                        {meta.icon} {meta.label}
                    </div>

                    {result.recall_reason && (
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Recall reason: {result.recall_reason}</p>
                    )}

                    {result.batch && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Medicine</div><div style={{ fontWeight: 700 }}>{result.batch.medicine?.name}</div></div>
                            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Batch Number</div><div style={{ fontWeight: 700 }}>{result.batch.batch_number}</div></div>
                            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Expiry Date</div><div style={{ fontWeight: 700 }}>{result.batch.expiry_date}</div></div>
                            <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>QC Status</div><div style={{ fontWeight: 700 }}>{result.batch.qc_status}</div></div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BatchVerify;
