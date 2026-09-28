import React, { useState, useEffect, useCallback } from 'react';
import {
    Warehouse, Truck, Package, QrCode, CheckCircle, Warning, Clock,
    ArrowClockwise, PaperPlaneTilt, MagnifyingGlass, ShieldCheck,
    ArrowRight, XCircle
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const StatCard = ({ icon, label, value, color, onClick }) => (
    <Card
        padding="md"
        onClick={onClick}
        style={{
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: onClick ? 'pointer' : 'default',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden'
        }}
        className="hover-lift"
    >
        <CardContent style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: `var(--${color}-light, rgba(59, 130, 246, 0.1))`,
                    color: `var(--${color}, var(--primary))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1 }}>
                        {value}
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>
                        {label}
                    </div>
                </div>
            </div>
            {onClick && (
                <div style={{ color: `var(--${color}, var(--primary))`, opacity: 0.6 }}>
                    <ArrowRight size={18} weight="bold" />
                </div>
            )}
        </CardContent>
    </Card>
);

const StatusBadge = ({ status }) => {
    let tone = 'amber';
    let label = status ? status.replace('_', ' ') : 'pending';

    if (status === 'delivered') tone = 'green';
    else if (status === 'in_transit') tone = 'blue';
    else if (status === 'cancelled' || status === 'recalled') tone = 'red';

    const color = tone === 'green' ? 'var(--success)' : tone === 'red' ? 'var(--danger)' : tone === 'amber' ? 'var(--warning)' : 'var(--primary)';
    const bg = tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'red' ? 'rgba(239, 68, 68, 0.1)' : tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.75rem',
            borderRadius: '999px',
            background: bg,
            color,
            fontSize: '0.775rem',
            fontWeight: 700,
            textTransform: 'capitalize'
        }}>
            {label}
        </span>
    );
};

const DistributorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState(null);

    // QR Verification State
    const [qrQuery, setQrQuery] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);

    // POD Modal State
    const [podModalShipment, setPodModalShipment] = useState(null);
    const [receiverName, setReceiverName] = useState('');
    const [signatureNote, setSignatureNote] = useState('');
    const [podSubmitting, setPodSubmitting] = useState(false);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('core/distributor/dashboard/');
            setData(response.data);
        } catch (err) {
            console.error('Failed to fetch distributor dashboard:', err);
            setNotice({ tone: 'error', text: 'Could not load distributor operations data.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleVerifyBatch = async (e) => {
        e.preventDefault();
        const code = qrQuery.trim();
        if (!code) {
            // Returning silently made this button look broken: a click, and
            // nothing at all on screen to say why.
            setVerifyResult({ verified: false, verdict: 'unknown', detail: 'Enter a QR code, DDP ID or batch number first.' });
            return;
        }

        setVerifying(true);
        setVerifyResult(null);
        try {
            const res = await api.get(`core/distributor/verify/${encodeURIComponent(code)}/`);
            setVerifyResult(res.data);
        } catch (err) {
            setVerifyResult({
                verified: false,
                verdict: 'unknown',
                detail: err.response?.data?.detail || 'QR Code or Batch not found in database.'
            });
        } finally {
            setVerifying(false);
        }
    };

    const handleReceiveIncoming = async (shipmentId) => {
        try {
            const res = await api.post(`core/distributor/shipments/incoming/${shipmentId}/receive/`);
            // A recalled or QC-failed batch is delivered but kept out of
            // sellable stock, so the old fixed "stock has been updated" line
            // would have been untrue for exactly the batches that matter.
            setNotice(res.data?.warning
                ? { tone: 'error', text: res.data.warning }
                : { tone: 'success', text: 'Shipment received successfully! Warehouse stock has been updated.' });
            fetchDashboard();
        } catch (err) {
            setNotice({ tone: 'error', text: err.response?.data?.detail || 'Failed to receive shipment.' });
        }
    };

    const handleConfirmPOD = async (e) => {
        e.preventDefault();
        if (!podModalShipment) return;

        setPodSubmitting(true);
        try {
            await api.post(`core/distributor/shipments/${podModalShipment.id}/confirm-delivery/`, {
                receiver_name: receiverName,
                signature_note: signatureNote
            });
            setNotice({ tone: 'success', text: `Proof of Delivery confirmed for Batch ${podModalShipment.batch_number}! Status updated to Delivered.` });
            setPodModalShipment(null);
            setReceiverName('');
            setSignatureNote('');
            fetchDashboard();
        } catch (err) {
            setNotice({ tone: 'error', text: err.response?.data?.detail || 'Failed to confirm delivery POD.' });
        } finally {
            setPodSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ArrowClockwise size={36} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '1rem' }}>Loading Distributor Dashboard...</p>
            </div>
        );
    }

    const summary = data?.summary || {};
    const recentIncoming = data?.recent_incoming || [];
    const recentOutgoing = data?.recent_outgoing || [];

    return (
        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.75rem', paddingBottom: '2.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Truck size={32} weight="duotone" color="var(--primary)" /> Distributor Portal
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.925rem' }}>
                        Real-time supply chain tracking, warehouse inventory, shipments, batch verification, and delivery management.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchDashboard}>
                    <ArrowClockwise size={16} /> Refresh Live Data
                </Button>
            </div>

            {/* Notice Banner */}
            {notice && (
                <div style={{
                    padding: '0.875rem 1.25rem',
                    borderRadius: '10px',
                    borderLeft: `4px solid ${notice.tone === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                    background: notice.tone === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                }}>
                    {notice.text}
                </div>
            )}

            {/* 7 Operational Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.15rem' }}>
                <StatCard
                    icon={<Warehouse size={24} weight="duotone" />}
                    label="Warehouse Stock"
                    value={`${Number(summary.total_stock || 0).toLocaleString()} units`}
                    color="primary"
                    onClick={() => navigate('/dashboard/distributor/warehouses', { state: { view: 'stock' } })}
                />
                <StatCard
                    icon={<Truck size={24} weight="duotone" />}
                    label="Incoming Shipments"
                    value={summary.incoming_shipments || 0}
                    color="info"
                    onClick={() => navigate('/dashboard/distributor/shipments', { state: { tab: 'incoming' } })}
                />
                <StatCard
                    icon={<PaperPlaneTilt size={24} weight="duotone" />}
                    label="Outgoing Shipments"
                    value={summary.outgoing_shipments || 0}
                    color="success"
                    onClick={() => navigate('/dashboard/distributor/shipments', { state: { tab: 'outgoing' } })}
                />
                <StatCard
                    icon={<Clock size={24} weight="duotone" />}
                    label="Pending Deliveries"
                    value={summary.pending_deliveries || 0}
                    color="warning"
                    onClick={() => navigate('/dashboard/distributor/shipments', { state: { tab: 'outgoing', filterStatus: 'in_transit' } })}
                />
                <StatCard
                    icon={<CheckCircle size={24} weight="duotone" />}
                    label="Completed Deliveries"
                    value={summary.completed_deliveries || 0}
                    color="success"
                    onClick={() => navigate('/dashboard/distributor/shipments', { state: { tab: 'outgoing', filterStatus: 'delivered' } })}
                />
                <StatCard
                    icon={<Warning size={24} weight="duotone" />}
                    label="Low-Stock Alerts"
                    value={summary.low_stock_alerts || 0}
                    color="warning"
                    onClick={() => navigate('/dashboard/distributor/warehouses', { state: { view: 'low_stock' } })}
                />
                <StatCard
                    icon={<Clock size={24} weight="duotone" />}
                    label="Expiring Batches"
                    value={summary.expiring_alerts || 0}
                    color="danger"
                    onClick={() => navigate('/dashboard/distributor/analytics', { state: { view: 'expiring' } })}
                />
            </div>

            {/* Quick Actions & QR Batch Verification Section */}
            <div style={{ marginBottom: '0.5rem' }}>
                {/* Batch / QR Code Verification Tool */}
                <Card padding="lg" style={{ border: '1px solid var(--border)' }}>
                    <CardHeader
                        title="Quick Batch & QR Code Verification"
                        subtitle="Scan or input batch number / QR code to check authenticity against national registry."
                    />
                    <CardContent style={{ marginTop: '1rem' }}>
                        <form onSubmit={handleVerifyBatch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <input
                                value={qrQuery}
                                onChange={(e) => setQrQuery(e.target.value)}
                                placeholder="Scan QR code or enter Batch # (e.g. PCM-2026-001)"
                                style={{
                                    flex: 1,
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.925rem'
                                }}
                            />
                            <Button type="submit" disabled={verifying}>
                                <MagnifyingGlass size={16} /> {verifying ? 'Verifying...' : 'Verify'}
                            </Button>
                        </form>

                        {verifyResult && (
                            <div style={{
                                padding: '1rem 1.15rem',
                                borderRadius: '10px',
                                background: verifyResult.verified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                border: `1px solid ${verifyResult.verified ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: verifyResult.verified ? 'var(--success)' : 'var(--danger)' }}>
                                    {verifyResult.verified ? <ShieldCheck size={22} /> : <XCircle size={22} />}
                                    <span>Verdict: {verifyResult.verdict?.toUpperCase()}</span>
                                </div>
                                {verifyResult.batch ? (
                                    <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        <div><strong>Medicine:</strong> {verifyResult.batch.medicine_name} {verifyResult.batch.strength}</div>
                                        <div><strong>Batch #:</strong> {verifyResult.batch.batch_number}</div>
                                        <div><strong>Manufacturer:</strong> {verifyResult.batch.manufacturer}</div>
                                        <div><strong>Expiry Date:</strong> {verifyResult.batch.expiry_date}</div>
                                        <div><strong>QC Status:</strong> {verifyResult.batch.qc_status}</div>
                                        <div><strong>Quantity Produced:</strong> {Number(verifyResult.batch.quantity_produced).toLocaleString()}</div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {verifyResult.detail}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Incoming & Outgoing Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {/* Incoming Shipments from Manufacturers */}
                <Card padding="lg">
                    <CardHeader
                        title="Incoming Manufacturer Shipments"
                        subtitle="Receive verified shipments into warehouse stock."
                        action={
                            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/distributor/shipments')}>
                                View All
                            </Button>
                        }
                    />
                    <CardContent style={{ marginTop: '1rem' }}>
                        {recentIncoming.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No incoming shipments on record.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {recentIncoming.map((item) => (
                                    <div key={item.id} style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                                {item.medicine_name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(Batch {item.batch_number})</span>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                                                From: @{item.from_user} &bull; {Number(item.quantity).toLocaleString()} units &bull; {item.shipment_date}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <StatusBadge status={item.status} />
                                            {item.status !== 'delivered' && (
                                                <Button size="sm" onClick={() => handleReceiveIncoming(item.id)}>
                                                    Receive
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Outgoing Shipments to Pharmacies */}
                <Card padding="lg">
                    <CardHeader
                        title="Outgoing Pharmacy Deliveries"
                        subtitle="Monitor delivery progress and confirm Proof of Delivery (POD)."
                        action={
                            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/distributor/shipments')}>
                                View All
                            </Button>
                        }
                    />
                    <CardContent style={{ marginTop: '1rem' }}>
                        {recentOutgoing.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No outgoing shipments on record.</p>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.85rem' }}>
                                {recentOutgoing.map((item) => (
                                    <div key={item.id} style={{
                                        padding: '0.85rem 1rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                                {item.medicine_name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(Batch {item.batch_number})</span>
                                            </div>
                                            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                                                To: @{item.to_user} &bull; {Number(item.quantity).toLocaleString()} units &bull; {item.shipment_date}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <StatusBadge status={item.status} />
                                            {item.status !== 'delivered' && (
                                                <Button variant="outline" size="sm" onClick={() => setPodModalShipment(item)}>
                                                    Confirm POD
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Proof of Delivery (POD) Confirmation Modal */}
            {podModalShipment && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <Card padding="lg" style={{ maxWidth: '460px', width: '100%', background: 'var(--bg-card)' }}>
                        <CardHeader
                            title="Confirm Proof of Delivery (POD)"
                            subtitle={`Record delivery receipt for Batch ${podModalShipment.batch_number}`}
                        />
                        <form onSubmit={handleConfirmPOD} style={{ marginTop: '1.25rem', display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                                    Pharmacy Receiver Name / Signature
                                </label>
                                <input
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder="e.g. Lazz Pharma Manager - Abul Kalam"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                                    Delivery Notes / Remarks (optional)
                                </label>
                                <input
                                    value={signatureNote}
                                    onChange={(e) => setSignatureNote(e.target.value)}
                                    placeholder="e.g. Delivered 2,000 units in good condition"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-main)'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button type="button" variant="outline" onClick={() => setPodModalShipment(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={podSubmitting}>
                                    {podSubmitting ? 'Confirming...' : 'Confirm Delivery (POD)'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DistributorDashboard;
