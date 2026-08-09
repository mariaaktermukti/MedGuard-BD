import React, { useEffect, useMemo, useState } from 'react';
import {
    Warning,
    CalendarBlank,
    CheckCircle,
    ClipboardText,
    Factory,
    Package,
    QrCode,
    PaperPlaneRight,
    ShieldCheck,
    Upload,
} from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';

const metrics = [
    { label: 'Total Registered Medicines', value: '2', icon: <Package size={18} /> },
    { label: 'Active Batches', value: '0', icon: <Factory size={18} /> },
    { label: 'QC Pass Rate', value: '0%', icon: <ShieldCheck size={18} /> },
    { label: 'Recalled Batches', value: '0', icon: <Warning size={18} /> },
    { label: 'Compliance Score', value: 'A+ (100/100)', icon: <ClipboardText size={18} /> },
    { label: 'Pending Reviews', value: '3', icon: <CalendarBlank size={18} /> },
];

const sampleBatches = [
    { id: 'B-24001', medicine: 'Paracetamol 500mg', status: 'Active', expiry: '2027-03-12' },
    { id: 'B-24002', medicine: 'Omeprazole 20mg', status: 'Pending', expiry: '2027-07-18' },
    { id: 'B-24003', medicine: 'Cefixime 200mg', status: 'Active', expiry: '2026-12-04' },
];

const viewMeta = {
    dashboard: {
        title: 'Manufacturer Dashboard',
        subtitle: 'Operational overview for medicine registration, batches, quality checks, recalls, and shipments.',
        icon: <Factory size={30} />,
    },
    register: {
        title: 'Register New Medicine',
        subtitle: 'Create a verified medicine record with the required identity, dosage, and date information.',
        icon: <ClipboardText size={30} />,
    },
    batch: {
        title: 'Create New Batch',
        subtitle: 'Add production batch details and record the quality-control status.',
        icon: <Package size={30} />,
    },
    verify: {
        title: 'Scan QR / Verify Batch',
        subtitle: 'Upload a QR image to simulate product verification and review batch details.',
        icon: <QrCode size={30} />,
    },
    recall: {
        title: 'Start a Recall',
        subtitle: 'Select an affected batch, provide a reason, and confirm the recall action.',
        icon: <Warning size={30} />,
    },
    shipment: {
        title: 'Create Shipment',
        subtitle: 'Record shipment destination, quantity, batch assignment, date, and delivery status.',
        icon: <Factory size={30} />,
    },
};

const panelStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '1rem',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
};

const buttonBase = {
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'transform 0.2s ease, opacity 0.2s ease, background 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
};

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

const SectionTitle = ({ title, subtitle }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
);

const PageHeader = ({ icon, title, subtitle }) => (
    <div className="manufacturer-page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            {icon}
        </div>
        <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{title}</h1>
            <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', lineHeight: 1.6 }}>{subtitle}</p>
        </div>
    </div>
);

const Field = ({ label, children }) => (
    <div className="input-group" style={{ marginBottom: 0 }}>
        <label>{label}</label>
        {children}
    </div>
);

const StatusPill = ({ children, tone = 'blue' }) => {
    const color = tone === 'green' ? '#10b981' : tone === 'red' ? '#ef4444' : tone === 'amber' ? '#f59e0b' : 'var(--primary-color)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: `${tone === 'blue' ? 'rgba(59, 130, 246, 0.1)' : tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const DashboardChart = () => (
    <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px dashed var(--border-color)', background: 'rgba(59, 130, 246, 0.04)' }}>
        <div style={{ height: '160px', borderRadius: '0.95rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            Production vs Sales chart placeholder
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
            <button type="button" style={{ ...buttonBase, width: 'auto', padding: '0.7rem 1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)' }}>
                Open
            </button>
        </div>
    </div>
);

const MiniBars = () => {
    const bars = [42, 64, 50, 76, 58, 84];
    return (
        <div style={{ display: 'flex', alignItems: 'end', gap: '0.55rem', height: '100px', marginTop: '1rem' }}>
            {bars.map((value, index) => (
                <div key={index} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: '34px', height: `${value}%`, minHeight: '26px', borderRadius: '0.7rem 0.7rem 0.35rem 0.35rem', background: index % 2 === 0 ? 'var(--primary-color)' : '#10b981' }} />
                </div>
            ))}
        </div>
    );
};

const MetricCard = ({ icon, label, value }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '132px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', flex: '0 0 auto' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</div>
        </div>
    </div>
);

const ManufacturerPortal = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('dashboard');
    const [message, setMessage] = useState('');
    const [registerForm, setRegisterForm] = useState({
        medicineName: '',
        genericName: '',
        category: '',
        dosageForm: '',
        strength: '',
        manufacturerDate: '',
        expiryDate: '',
    });
    const [batchForm, setBatchForm] = useState({
        batchId: '',
        medicine: '',
        manufacturingDate: '',
        expiryDate: '',
        quantity: '',
        qcStatus: 'Passed',
    });
    const [shipmentForm, setShipmentForm] = useState({
        shipmentId: '',
        destination: '',
        batchId: '',
        quantity: '',
        shipmentDate: '',
        status: 'Preparing',
    });
    const [recallReason, setRecallReason] = useState('');
    const [selectedRecallBatch, setSelectedRecallBatch] = useState('');
    const [recallConfirmation, setRecallConfirmation] = useState(null);
    const [scannerUploaded, setScannerUploaded] = useState(false);

    const activeBatches = useMemo(() => sampleBatches, []);

    const pathToView = (pathname) => {
        if (pathname.endsWith('/register')) return 'register';
        if (pathname.endsWith('/batch')) return 'batch';
        if (pathname.endsWith('/verify')) return 'verify';
        if (pathname.endsWith('/recall')) return 'recall';
        if (pathname.endsWith('/shipment')) return 'shipment';
        return 'dashboard';
    };

    useEffect(() => {
        setActiveView(pathToView(location.pathname));
    }, [location.pathname]);

    const resetRegisterForm = () => setRegisterForm({ medicineName: '', genericName: '', category: '', dosageForm: '', strength: '', manufacturerDate: '', expiryDate: '' });
    const resetBatchForm = () => setBatchForm({ batchId: '', medicine: '', manufacturingDate: '', expiryDate: '', quantity: '', qcStatus: 'Passed' });
    const resetShipmentForm = () => setShipmentForm({ shipmentId: '', destination: '', batchId: '', quantity: '', shipmentDate: '', status: 'Preparing' });

    const submitMessage = (event, text, resetter) => {
        event.preventDefault();
        setMessage(text);
        if (resetter) {
            resetter();
        }
    };

    const startRecall = (batchId) => {
        setSelectedRecallBatch(batchId);
        setMessage(`Recall initiated for ${batchId}. Add a reason, then confirm.`);
    };

    const confirmRecall = () => {
        const reason = recallReason.trim();

        if (!selectedRecallBatch) {
            setMessage('Please choose a batch to recall first.');
            return;
        }

        if (!reason) {
            setMessage('Please enter a recall reason.');
            return;
        }

        setMessage('');
        setRecallConfirmation({ batchId: selectedRecallBatch, reason });
        setRecallReason('');
        setSelectedRecallBatch('');
    };

    const closeRecallConfirmation = () => {
        setRecallConfirmation(null);
        navigate(-1);
    };

    const renderDashboard = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="medguard-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.5rem' }}>
                {metrics.map((item) => <MetricCard key={item.label} icon={item.icon} label={item.label} value={item.value} />)}
            </div>

            <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <SectionTitle title="Production vs Sales" subtitle="Simple progress view for the last 6 months." />
                    <DashboardChart />
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <SectionTitle title="AI Demand Prediction" subtitle="Next-month confidence: 78%" />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: 'conic-gradient(var(--primary-color) 0% 78%, rgba(148, 163, 184, 0.16) 78% 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>78%</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence</div>
                            </div>
                        </div>
                    </div>
                    <MiniBars />
                </div>
            </div>
        </div>
    );

    const renderRegister = () => (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <SectionTitle title="Medicine Identity" subtitle="Use complete and traceable product information for regulatory review." />
            <form onSubmit={(event) => submitMessage(event, 'Medicine registered successfully.', resetRegisterForm)} style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                    <Field label="Medicine Name">
                        <input value={registerForm.medicineName} onChange={(e) => setRegisterForm((current) => ({ ...current, medicineName: e.target.value }))} placeholder="e.g. Paracetamol" style={inputStyle} required />
                    </Field>
                    <Field label="Generic Name">
                        <input value={registerForm.genericName} onChange={(e) => setRegisterForm((current) => ({ ...current, genericName: e.target.value }))} placeholder="e.g. Acetaminophen" style={inputStyle} />
                    </Field>
                    <Field label="Category">
                        <input value={registerForm.category} onChange={(e) => setRegisterForm((current) => ({ ...current, category: e.target.value }))} placeholder="e.g. Analgesic" style={inputStyle} />
                    </Field>
                    <Field label="Dosage Form">
                        <input value={registerForm.dosageForm} onChange={(e) => setRegisterForm((current) => ({ ...current, dosageForm: e.target.value }))} placeholder="e.g. Tablet" style={inputStyle} />
                    </Field>
                    <Field label="Strength">
                        <input value={registerForm.strength} onChange={(e) => setRegisterForm((current) => ({ ...current, strength: e.target.value }))} placeholder="e.g. 500mg" style={inputStyle} />
                    </Field>
                    <Field label="Manufacturing Date">
                        <input type="date" value={registerForm.manufacturerDate} onChange={(e) => setRegisterForm((current) => ({ ...current, manufacturerDate: e.target.value }))} style={inputStyle} />
                    </Field>
                    <Field label="Expiry Date">
                        <input type="date" value={registerForm.expiryDate} onChange={(e) => setRegisterForm((current) => ({ ...current, expiryDate: e.target.value }))} style={inputStyle} />
                    </Field>
                </div>
                <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: '#fff' }}><PaperPlaneRight size={18} />Register Medicine</button>
                </div>
            </form>
        </div>
    );

    const renderBatch = () => (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <SectionTitle title="Batch Production Record" subtitle="Keep batch identity, dates, quantity, and QC status in one standard format." />
            <form onSubmit={(event) => submitMessage(event, 'Batch created successfully.', resetBatchForm)} style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                    <Field label="Batch ID">
                        <input value={batchForm.batchId} onChange={(e) => setBatchForm((current) => ({ ...current, batchId: e.target.value }))} placeholder="e.g. B-24004" style={inputStyle} required />
                    </Field>
                    <Field label="Medicine">
                        <select value={batchForm.medicine} onChange={(e) => setBatchForm((current) => ({ ...current, medicine: e.target.value }))} style={inputStyle} required>
                            <option value="">Select medicine</option>
                            <option value="Paracetamol 500mg">Paracetamol 500mg</option>
                            <option value="Omeprazole 20mg">Omeprazole 20mg</option>
                            <option value="Cefixime 200mg">Cefixime 200mg</option>
                        </select>
                    </Field>
                    <Field label="Manufacturing Date">
                        <input type="date" value={batchForm.manufacturingDate} onChange={(e) => setBatchForm((current) => ({ ...current, manufacturingDate: e.target.value }))} style={inputStyle} required />
                    </Field>
                    <Field label="Expiry Date">
                        <input type="date" value={batchForm.expiryDate} onChange={(e) => setBatchForm((current) => ({ ...current, expiryDate: e.target.value }))} style={inputStyle} required />
                    </Field>
                    <Field label="Quantity">
                        <input type="number" value={batchForm.quantity} onChange={(e) => setBatchForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="e.g. 12000" style={inputStyle} required />
                    </Field>
                    <Field label="QC Status">
                        <select value={batchForm.qcStatus} onChange={(e) => setBatchForm((current) => ({ ...current, qcStatus: e.target.value }))} style={inputStyle}>
                            <option value="Passed">Passed</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </Field>
                </div>
                <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: '#fff' }}><PaperPlaneRight size={18} />Create Batch</button>
                </div>
            </form>
        </div>
    );

    const renderVerify = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="QR Verification" subtitle="Upload a QR image to simulate a batch verification request." />
                <div style={{ minHeight: '220px', borderRadius: '1rem', border: '1px dashed var(--border-color)', background: 'rgba(59, 130, 246, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '1.5rem' }}>
                    <QrCode size={46} color="var(--primary-color)" />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Batch QR scanner</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                            {scannerUploaded ? 'QR image uploaded. Review the verified batch details below.' : 'Upload a QR image to simulate batch verification.'}
                        </div>
                    </div>
                    <button type="button" onClick={() => { setScannerUploaded(true); setMessage('QR image uploaded successfully.'); }} style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: '#fff' }}>
                        <Upload size={18} />Upload QR image
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Verified Batch Details" subtitle="Sample data for the selected batch." />
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Batch ID</div><div style={{ fontWeight: 700 }}>B-24001</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Medicine</div><div style={{ fontWeight: 700 }}>Paracetamol 500mg</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Status</div><StatusPill tone="green"><CheckCircle size={14} />Verified</StatusPill></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Expiry</div><div style={{ fontWeight: 700 }}>2027-03-12</div></div>
                </div>
            </div>
        </div>
    );

    const renderRecall = () => (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <SectionTitle title="Recall Workflow" subtitle="Select one affected batch, document the reason, then confirm the recall." />
            <div style={{ display: 'grid', gap: '1rem' }}>
                {activeBatches.map((batch) => (
                    <div
                        key={batch.id}
                        className="medguard-recall-row"
                        style={{
                            padding: '1rem 1.25rem',
                            borderRadius: '1rem',
                            border: selectedRecallBatch === batch.id ? '1px solid rgba(239, 68, 68, 0.55)' : '1px solid var(--border-color)',
                            background: selectedRecallBatch === batch.id ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                        }}
                    >
                        <div style={{ display: 'grid', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ fontWeight: 700 }}>{batch.id}</div>
                                <StatusPill tone={batch.status === 'Active' ? 'green' : 'amber'}>{batch.status}</StatusPill>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{batch.medicine} | Expiry {batch.expiry}</div>
                        </div>
                        <button
                            type="button"
                            className="medguard-recall-button"
                            style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1rem', background: selectedRecallBatch === batch.id ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: selectedRecallBatch === batch.id ? '#fff' : '#ef4444' }}
                            onClick={() => startRecall(batch.id)}
                        >
                            {selectedRecallBatch === batch.id ? 'Selected' : 'Recall'}
                        </button>
                    </div>
                ))}

                <div style={{ marginTop: '0.5rem', padding: '1.5rem', borderRadius: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>
                        Recall confirmation{selectedRecallBatch ? `: ${selectedRecallBatch}` : ''}
                    </div>
                    <textarea value={recallReason} onChange={(e) => setRecallReason(e.target.value)} placeholder="Reason for recall" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                    <div className="medguard-recall-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                        <button type="button" className="medguard-confirm-recall-button" style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: '#ef4444', color: '#fff' }} onClick={confirmRecall}>
                            Confirm Recall
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderShipment = () => (
        <div className="glass-panel" style={{ padding: '2rem' }}>
            <SectionTitle title="Shipment Record" subtitle="Create a traceable outbound shipment linked to a production batch." />
            <form onSubmit={(event) => submitMessage(event, 'Shipment created successfully.', resetShipmentForm)} style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                    <Field label="Shipment ID">
                        <input value={shipmentForm.shipmentId} onChange={(e) => setShipmentForm((current) => ({ ...current, shipmentId: e.target.value }))} placeholder="e.g. SH-24009" style={inputStyle} required />
                    </Field>
                    <Field label="Destination">
                        <input value={shipmentForm.destination} onChange={(e) => setShipmentForm((current) => ({ ...current, destination: e.target.value }))} placeholder="e.g. Dhaka Central Depot" style={inputStyle} required />
                    </Field>
                    <Field label="Batch ID">
                        <select value={shipmentForm.batchId} onChange={(e) => setShipmentForm((current) => ({ ...current, batchId: e.target.value }))} style={inputStyle} required>
                            <option value="">Select batch</option>
                            {activeBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id}</option>)}
                        </select>
                    </Field>
                    <Field label="Quantity">
                        <input type="number" value={shipmentForm.quantity} onChange={(e) => setShipmentForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="e.g. 5000" style={inputStyle} required />
                    </Field>
                    <Field label="Shipment Date">
                        <input type="date" value={shipmentForm.shipmentDate} onChange={(e) => setShipmentForm((current) => ({ ...current, shipmentDate: e.target.value }))} style={inputStyle} required />
                    </Field>
                    <Field label="Status">
                        <select value={shipmentForm.status} onChange={(e) => setShipmentForm((current) => ({ ...current, status: e.target.value }))} style={inputStyle}>
                            <option value="Preparing">Preparing</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Delivered">Delivered</option>
                        </select>
                    </Field>
                </div>
                <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                    <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary-color)', color: '#fff' }}><PaperPlaneRight size={18} />Create Shipment</button>
                </div>
            </form>
        </div>
    );

    const renderView = () => {
        switch (activeView) {
            case 'register':
                return renderRegister();
            case 'batch':
                return renderBatch();
            case 'verify':
                return renderVerify();
            case 'recall':
                return renderRecall();
            case 'shipment':
                return renderShipment();
            default:
                return renderDashboard();
        }
    };

    return (
        <div className="manufacturer-page" style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '1rem' }}>
            <PageHeader {...viewMeta[activeView]} />

            {message && <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary-color)', color: 'var(--text-light)' }}>{message}</div>}

            {renderView()}

            {recallConfirmation && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="recall-confirmation-title"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        background: 'rgba(15, 23, 42, 0.62)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    <div
                        className="medguard-confirmation-card"
                        style={{
                            ...panelStyle,
                            width: 'min(440px, 100%)',
                            padding: '1.35rem',
                            textAlign: 'center',
                            boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
                        }}
                    >
                        <div
                            style={{
                                width: '54px',
                                height: '54px',
                                margin: '0 auto 0.9rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(16, 185, 129, 0.14)',
                                color: '#10b981',
                            }}
                        >
                            <CheckCircle size={28} />
                        </div>
                        <h2 id="recall-confirmation-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                            Recall Confirmed
                        </h2>
                        <p style={{ margin: '0.55rem 0 0', color: 'var(--text-muted)' }}>
                            Batch {recallConfirmation.batchId} has been marked for recall.
                        </p>
                        <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--text-light)', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reason</div>
                            <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{recallConfirmation.reason}</div>
                        </div>
                        <button
                            type="button"
                            className="medguard-confirmation-ok"
                            onClick={closeRecallConfirmation}
                            style={{ ...buttonBase, width: '100%', marginTop: '1.1rem', padding: '0.95rem 1rem', background: 'var(--primary-color)', color: '#fff' }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @media (max-width: 900px) {
                    .manufacturer-page {
                        max-width: 100% !important;
                    }

                    .medguard-metric-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }

                    .medguard-two-col {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 640px) {
                    .manufacturer-page-header {
                        flex-direction: column !important;
                        margin-bottom: 1.5rem !important;
                    }

                    .manufacturer-page-header h1 {
                        font-size: 1.55rem !important;
                    }

                    .medguard-metric-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .medguard-recall-row {
                        align-items: stretch !important;
                        flex-direction: column !important;
                    }

                    .medguard-recall-button,
                    .medguard-confirm-recall-button {
                        width: 100% !important;
                    }

                    .medguard-recall-actions {
                        justify-content: stretch !important;
                    }

                    .manufacturer-action-row {
                        justify-content: stretch !important;
                    }

                    .manufacturer-action-row button {
                        width: 100% !important;
                    }

                    .medguard-confirmation-card {
                        padding: 1.1rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ManufacturerPortal;
