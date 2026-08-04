import React, { useState } from 'react';
import axios from 'axios';
import { Search, QrCode, ShieldCheck, Truck, Activity, ArrowRight } from 'lucide-react';

const DrugPassport = () => {
    const [qrCode, setQrCode] = useState('');
    const [passport, setPassport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!qrCode) return;
        
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`http://localhost:8000/api/core/passport/${qrCode}/`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('access')}`
                }
            });
            setPassport(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Passport not found for this QR code/ID');
            setPassport(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode className="text-primary" size={32} />
                Digital Drug Passport
            </h1>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Enter Medicine QR Code or Unique ID..."
                            value={qrCode}
                            onChange={(e) => setQrCode(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem 1rem 1rem 3rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-light)',
                                fontSize: '1rem'
                            }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '0 2rem' }}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
                {error && <p style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</p>}
            </div>

            {passport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                                    {passport.medicine.name}
                                </h2>
                                <p style={{ color: 'var(--text-muted)' }}>{passport.medicine.generic_name} • {passport.medicine.strength}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600 }}>
                                <ShieldCheck size={20} />
                                Verified Authentic
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Batch Number</p>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{passport.batch_number}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Manufacturing Date</p>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem' }}>{passport.manufacturing_date}</p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Expiry Date</p>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem', color: new Date(passport.expiry_date) < new Date() ? '#ef4444' : 'inherit' }}>
                                    {passport.expiry_date}
                                </p>
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Current Status</p>
                                <p style={{ fontWeight: 500, fontSize: '1.1rem', textTransform: 'capitalize' }}>{passport.status}</p>
                            </div>
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1rem' }}>Quality Assurance</h3>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        {passport.quality_tests && passport.quality_tests.length > 0 ? (
                            passport.quality_tests.map((test, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: idx < passport.quality_tests.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <Activity className="text-primary" />
                                        <span>{test.test_name}</span>
                                    </div>
                                    <span style={{ color: test.test_result === 'Passed' ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                                        {test.test_result}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>No quality test records available.</p>
                        )}
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1rem' }}>Distribution Trail</h3>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        {passport.shipments && passport.shipments.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {passport.shipments.map((shipment, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                                            <Truck className="text-primary" size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 500 }}>Shipped on {shipment.shipment_date}</p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Status: {shipment.status}</p>
                                        </div>
                                        {idx < passport.shipments.length - 1 && (
                                            <div style={{ height: '40px', width: '2px', background: 'var(--border-color)', margin: '0.5rem 0 0 1.25rem' }}></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>No distribution records available.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DrugPassport;
