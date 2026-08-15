import React, { useState } from 'react';
import { QrCode, CheckCircle, WarningCircle, Pill, Truck } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const DrugPassportViewer = () => {
    const [qrCode, setQrCode] = useState('');
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!qrCode.trim()) return;
        setLoading(true);
        setError('');
        setBatch(null);
        try {
            const response = await api.get(`core/passport/${qrCode.trim()}/`);
            setBatch(response.data);
        } catch (err) {
            setError(err.response?.status === 404 ? 'No batch found for this QR code.' : 'Could not look up this passport right now.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
            <Card>
                <CardHeader title="Digital Drug Passport" subtitle="Look up a medicine batch's full manufacturing and distribution history by QR code." />
                <CardContent>
                    <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.6rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <QrCode size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={qrCode}
                                onChange={(e) => setQrCode(e.target.value)}
                                placeholder="Enter batch QR code..."
                                style={{ width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? 'Looking up...' : 'Look Up'}</Button>
                    </form>
                    {error && <p style={{ color: 'var(--danger)', marginTop: '0.75rem', marginBottom: 0 }}>{error}</p>}
                </CardContent>
            </Card>

            {batch && (
                <>
                    <Card>
                        <CardContent>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary)' }}>{batch.medicine?.name}</h2>
                                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{batch.medicine?.formulation}</p>
                                </div>
                                <Badge variant={batch.status === 'active' && !batch.release_blocked ? 'success' : 'danger'}>
                                    {batch.release_blocked ? 'Release Blocked' : batch.status}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', border: `1px solid ${batch.release_blocked ? 'var(--danger)' : 'var(--success)'}`, color: batch.release_blocked ? 'var(--danger)' : 'var(--success)' }}>
                        {batch.release_blocked ? <WarningCircle size={28} weight="fill" /> : <CheckCircle size={28} weight="fill" />}
                        <div>
                            <div style={{ fontWeight: 700 }}>{batch.release_blocked ? 'Release Blocked' : 'Verified Authentic'}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>QC Status: {batch.qc_status}</div>
                        </div>
                    </div>

                    <Card>
                        <CardHeader title="General Information" />
                        <CardContent>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                                <div><span style={{ color: 'var(--text-muted)' }}>Batch No:</span><br /><strong>{batch.batch_number}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>DDP ID:</span><br /><strong>{batch.ddp_id}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Mfg Date:</span><br /><strong>{batch.manufacturing_date}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)' }}>Exp Date:</span><br /><strong>{batch.expiry_date}</strong></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader title="Quality Tests" />
                        <CardContent>
                            {(!batch.quality_tests || batch.quality_tests.length === 0) ? (
                                <p style={{ color: 'var(--text-muted)' }}>No quality tests recorded.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {batch.quality_tests.map((test) => (
                                        <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{test.test_name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{test.conducted_date}</div>
                                            </div>
                                            <Badge variant={test.is_out_of_spec ? 'danger' : 'success'}>{test.test_result}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader title="Traceability" />
                        <CardContent>
                            {(!batch.distribution_events || batch.distribution_events.length === 0) ? (
                                <p style={{ color: 'var(--text-muted)' }}>No distribution events recorded.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {batch.distribution_events.map((event) => (
                                        <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                            <Truck size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{event.stage_from} → {event.stage_to}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{event.geo_location || 'Location not recorded'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {!batch && !loading && !error && (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                    <Pill size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                    <p>Enter a QR code above to view its Digital Drug Passport.</p>
                </div>
            )}
        </div>
    );
};

export default DrugPassportViewer;
