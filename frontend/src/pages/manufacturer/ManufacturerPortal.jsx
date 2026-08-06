import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    BellRing,
    Building2,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardPlus,
    Factory,
    Gauge,
    Menu,
    Moon,
    Package,
    Plus,
    QrCode,
    RefreshCw,
    ScanLine,
    ShieldCheck,
    Sun,
    Truck,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ThemeContext } from '../../context/ThemeContext';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'register', label: 'Register New Medicine', icon: <Plus size={18} /> },
    { id: 'batch', label: 'Create New Batch', icon: <Factory size={18} /> },
    { id: 'verify', label: 'Scan QR / Verify Batch', icon: <ScanLine size={18} /> },
    { id: 'recall', label: 'Start a Recall', icon: <BellRing size={18} /> },
    { id: 'shipment', label: 'Create Shipment', icon: <Truck size={18} /> },
];

const metrics = [
    { label: 'Total Registered Medicines', value: '2', icon: <Package size={18} /> },
    { label: 'Active Batches', value: '0', icon: <Factory size={18} /> },
    { label: 'QC Pass Rate', value: '0%', icon: <ShieldCheck size={18} /> },
    { label: 'Recalled Batches', value: '0', icon: <AlertTriangle size={18} /> },
    { label: 'Compliance Score', value: 'A+ (100/100)', icon: <ClipboardPlus size={18} /> },
    { label: 'Pending Reviews', value: '3', icon: <CalendarDays size={18} /> },
];

const sampleBatches = [
    { id: 'B-24001', medicine: 'Paracetamol 500mg', status: 'Active', expiry: '2027-03-12' },
    { id: 'B-24002', medicine: 'Omeprazole 20mg', status: 'Pending', expiry: '2027-07-18' },
    { id: 'B-24003', medicine: 'Cefixime 200mg', status: 'Active', expiry: '2026-12-04' },
];

const shellStyle = {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '290px minmax(0, 1fr)',
    background: 'var(--bg-dark)',
    color: 'var(--text-light)',
};

const sidebarStyle = {
    position: 'sticky',
    top: 0,
    height: '100vh',
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
    borderRight: '1px solid var(--border-color)',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.93))',
    backdropFilter: 'blur(16px)',
};

const panelStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '1.2rem',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

const buttonBase = {
    border: 'none',
    borderRadius: '0.95rem',
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'transform 0.2s ease, opacity 0.2s ease, background 0.2s ease',
};

const inputStyle = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '0.8rem',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-input)',
    color: 'var(--text-light)',
    fontSize: '0.95rem',
};

const SectionTitle = ({ title, subtitle }) => (
    <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{title}</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
);

const DashboardChart = () => (
    <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px dashed var(--border-color)', background: 'rgba(59, 130, 246, 0.04)' }}>
        <div style={{ height: '160px', borderRadius: '0.95rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            Production vs Sales chart placeholder
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
            <button type="button" style={{ ...buttonBase, width: 'auto', padding: '0.7rem 1rem', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-color)' }}>
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
    <div style={{ ...panelStyle, padding: '1rem 1.05rem', minHeight: '112px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-color)' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</div>
        </div>
    </div>
);

const ManufacturerPortal = () => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [activeView, setActiveView] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
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

    const viewToPath = (view) => {
        switch (view) {
            case 'register': return '/dashboard/manufacturer/register';
            case 'batch': return '/dashboard/manufacturer/batch';
            case 'verify': return '/dashboard/manufacturer/verify';
            case 'recall': return '/dashboard/manufacturer/recall';
            case 'shipment': return '/dashboard/manufacturer/shipment';
            default: return '/dashboard/manufacturer';
        }
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

    const viewLabel = navItems.find((item) => item.id === activeView)?.label || 'Dashboard';

    const openView = (view) => {
        navigate(viewToPath(view));
    };

    const renderDashboard = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="medguard-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
                {metrics.map((item) => <MetricCard key={item.label} icon={item.icon} label={item.label} value={item.value} />)}
            </div>

            <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1rem', alignItems: 'start' }}>
                <div style={{ ...panelStyle, padding: '1.2rem' }}>
                    <SectionTitle title="Production vs Sales" subtitle="Simple progress view for the last 6 months." />
                    <DashboardChart />
                </div>

                <div style={{ ...panelStyle, padding: '1.2rem' }}>
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
        <div style={{ ...panelStyle, padding: '1.2rem' }}>
            <SectionTitle title="Register New Medicine" subtitle="Create a new medicine record and show a success message on submit." />
            <form onSubmit={(event) => submitMessage(event, 'Medicine registered successfully.', resetRegisterForm)} style={{ display: 'grid', gap: '0.9rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
                    <input value={registerForm.medicineName} onChange={(e) => setRegisterForm((current) => ({ ...current, medicineName: e.target.value }))} placeholder="Medicine Name" style={inputStyle} required />
                    <input value={registerForm.genericName} onChange={(e) => setRegisterForm((current) => ({ ...current, genericName: e.target.value }))} placeholder="Generic Name" style={inputStyle} />
                    <input value={registerForm.category} onChange={(e) => setRegisterForm((current) => ({ ...current, category: e.target.value }))} placeholder="Category" style={inputStyle} />
                    <input value={registerForm.dosageForm} onChange={(e) => setRegisterForm((current) => ({ ...current, dosageForm: e.target.value }))} placeholder="Dosage Form" style={inputStyle} />
                    <input value={registerForm.strength} onChange={(e) => setRegisterForm((current) => ({ ...current, strength: e.target.value }))} placeholder="Strength" style={inputStyle} />
                    <input type="date" value={registerForm.manufacturerDate} onChange={(e) => setRegisterForm((current) => ({ ...current, manufacturerDate: e.target.value }))} style={inputStyle} />
                    <input type="date" value={registerForm.expiryDate} onChange={(e) => setRegisterForm((current) => ({ ...current, expiryDate: e.target.value }))} style={inputStyle} />
                </div>
                <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.95rem 1.2rem', background: 'var(--primary-color)', color: '#fff' }}>Register</button>
            </form>
        </div>
    );

    const renderBatch = () => (
        <div style={{ ...panelStyle, padding: '1.2rem' }}>
            <SectionTitle title="Create New Batch" subtitle="Add batch details and QC status." />
            <form onSubmit={(event) => submitMessage(event, 'Batch created successfully.', resetBatchForm)} style={{ display: 'grid', gap: '0.9rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
                    <input value={batchForm.batchId} onChange={(e) => setBatchForm((current) => ({ ...current, batchId: e.target.value }))} placeholder="Batch ID" style={inputStyle} required />
                    <select value={batchForm.medicine} onChange={(e) => setBatchForm((current) => ({ ...current, medicine: e.target.value }))} style={inputStyle} required>
                        <option value="">Medicine</option>
                        <option value="Paracetamol 500mg">Paracetamol 500mg</option>
                        <option value="Omeprazole 20mg">Omeprazole 20mg</option>
                        <option value="Cefixime 200mg">Cefixime 200mg</option>
                    </select>
                    <input type="date" value={batchForm.manufacturingDate} onChange={(e) => setBatchForm((current) => ({ ...current, manufacturingDate: e.target.value }))} style={inputStyle} required />
                    <input type="date" value={batchForm.expiryDate} onChange={(e) => setBatchForm((current) => ({ ...current, expiryDate: e.target.value }))} style={inputStyle} required />
                    <input type="number" value={batchForm.quantity} onChange={(e) => setBatchForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="Quantity" style={inputStyle} required />
                    <select value={batchForm.qcStatus} onChange={(e) => setBatchForm((current) => ({ ...current, qcStatus: e.target.value }))} style={inputStyle}>
                        <option value="Passed">QC Status: Passed</option>
                        <option value="Pending">QC Status: Pending</option>
                        <option value="Failed">QC Status: Failed</option>
                    </select>
                </div>
                <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.95rem 1.2rem', background: 'var(--primary-color)', color: '#fff' }}>Create Batch</button>
            </form>
        </div>
    );

    const renderVerify = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ ...panelStyle, padding: '1.2rem' }}>
                <SectionTitle title="Scan QR / Verify Batch" subtitle="Upload a QR image and verify a product quickly." />
                <div style={{ minHeight: '180px', borderRadius: '1rem', border: '1px dashed var(--border-color)', background: 'rgba(59, 130, 246, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                    <QrCode size={46} color="var(--primary-color)" />
                    <div>
                        <div style={{ fontWeight: 700 }}>QR code scanner placeholder</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Upload a QR image to simulate batch verification</div>
                    </div>
                    <button type="button" onClick={() => setMessage('QR image uploaded successfully.')} style={{ ...buttonBase, width: 'auto', padding: '0.85rem 1.1rem', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-color)' }}>
                        Upload QR image
                    </button>
                </div>
            </div>

            <div style={{ ...panelStyle, padding: '1.2rem' }}>
                <SectionTitle title="Verified Batch Details" subtitle="Sample data for the selected batch." />
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Batch ID</div><div style={{ fontWeight: 700 }}>B-24001</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Medicine</div><div style={{ fontWeight: 700 }}>Paracetamol 500mg</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Status</div><div style={{ fontWeight: 700, color: '#10b981' }}>Verified</div></div>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Expiry</div><div style={{ fontWeight: 700 }}>2027-03-12</div></div>
                </div>
            </div>
        </div>
    );

    const renderRecall = () => (
        <div style={{ ...panelStyle, padding: '1.2rem' }}>
            <SectionTitle title="Start a Recall" subtitle="List active batches and confirm a recall with a reason." />
            <div style={{ display: 'grid', gap: '0.85rem' }}>
                {activeBatches.map((batch) => (
                    <div key={batch.id} style={{ padding: '0.95rem 1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>{batch.id}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{batch.medicine}</div>
                        </div>
                        <button type="button" style={{ ...buttonBase, width: 'auto', padding: '0.8rem 1rem', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }} onClick={() => setMessage(`Recall initiated for ${batch.id}.`)}>
                            Recall
                        </button>
                    </div>
                ))}

                <div style={{ marginTop: '0.25rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>Recall confirmation</div>
                    <textarea value={recallReason} onChange={(e) => setRecallReason(e.target.value)} placeholder="Reason for recall" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                        <button type="button" style={{ ...buttonBase, width: 'auto', padding: '0.9rem 1.2rem', background: '#ef4444', color: '#fff' }} onClick={() => setMessage(recallReason ? `Recall confirmed: ${recallReason}` : 'Please enter a recall reason.') }>
                            Confirm Recall
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderShipment = () => (
        <div style={{ ...panelStyle, padding: '1.2rem' }}>
            <SectionTitle title="Create Shipment" subtitle="Fill shipment ID, destination, batch, quantity, date, and status." />
            <form onSubmit={(event) => submitMessage(event, 'Shipment created successfully.', resetShipmentForm)} style={{ display: 'grid', gap: '0.9rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
                    <input value={shipmentForm.shipmentId} onChange={(e) => setShipmentForm((current) => ({ ...current, shipmentId: e.target.value }))} placeholder="Shipment ID" style={inputStyle} required />
                    <input value={shipmentForm.destination} onChange={(e) => setShipmentForm((current) => ({ ...current, destination: e.target.value }))} placeholder="Destination" style={inputStyle} required />
                    <select value={shipmentForm.batchId} onChange={(e) => setShipmentForm((current) => ({ ...current, batchId: e.target.value }))} style={inputStyle} required>
                        <option value="">Batch ID</option>
                        {activeBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id}</option>)}
                    </select>
                    <input type="number" value={shipmentForm.quantity} onChange={(e) => setShipmentForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="Quantity" style={inputStyle} required />
                    <input type="date" value={shipmentForm.shipmentDate} onChange={(e) => setShipmentForm((current) => ({ ...current, shipmentDate: e.target.value }))} style={inputStyle} required />
                    <select value={shipmentForm.status} onChange={(e) => setShipmentForm((current) => ({ ...current, status: e.target.value }))} style={inputStyle}>
                        <option value="Preparing">Status: Preparing</option>
                        <option value="In Transit">Status: In Transit</option>
                        <option value="Delivered">Status: Delivered</option>
                    </select>
                </div>
                <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.95rem 1.2rem', background: 'var(--primary-color)', color: '#fff' }}>Create Shipment</button>
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
        <div className="medguard-shell" style={shellStyle}>
            <aside
                className="medguard-sidebar"
                style={{
                    ...sidebarStyle,
                    display: sidebarOpen ? 'flex' : 'none',
                }}
            >
                <div style={{ ...panelStyle, padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', color: '#fff', borderColor: 'rgba(148, 163, 184, 0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.18)', color: '#93c5fd' }}>
                            <Building2 size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>MedGuard 4.0</div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.72)' }}>Pharmaceutical Traceability</div>
                        </div>
                    </div>
                </div>

                <nav style={{ display: 'grid', gap: '0.55rem' }}>
                    {navItems.map((item) => {
                        const active = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => openView(item.id)}
                                style={{
                                    ...buttonBase,
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.85rem',
                                    padding: '0.95rem 1rem',
                                    textAlign: 'left',
                                    background: active ? 'rgba(59, 130, 246, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                                    color: active ? '#fff' : 'rgba(226, 232, 240, 0.84)',
                                    border: active ? '1px solid rgba(147, 197, 253, 0.4)' : '1px solid rgba(148, 163, 184, 0.12)',
                                }}
                            >
                                <span style={{ width: '22px', display: 'flex', justifyContent: 'center' }}>{item.icon}</span>
                                <span style={{ flex: 1 }}>{item.label}</span>
                                {active ? <ChevronRight size={16} /> : <ChevronLeft size={16} style={{ opacity: 0.4 }} />}
                            </button>
                        );
                    })}
                </nav>

                <div style={{ marginTop: 'auto', display: 'grid', gap: '0.85rem' }}>
                    <button type="button" onClick={toggleTheme} style={{ ...buttonBase, width: '100%', padding: '0.95rem 1rem', background: 'rgba(255, 255, 255, 0.04)', color: '#fff', border: '1px solid rgba(148, 163, 184, 0.14)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        {isDarkMode ? 'Day mode' : 'Night mode'}
                    </button>
                    <div style={{ ...panelStyle, padding: '0.95rem 1rem', background: 'rgba(255, 255, 255, 0.03)', color: '#fff', borderColor: 'rgba(148, 163, 184, 0.16)' }}>
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(226, 232, 240, 0.62)' }}>Status</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.55rem', fontWeight: 700 }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                            All core tools ready
                        </div>
                    </div>
                </div>
            </aside>

            <main className="medguard-main" style={{ minWidth: 0, padding: '1rem 1rem 1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <header className="medguard-topbar" style={{ ...panelStyle, padding: '1rem 1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <button type="button" onClick={() => setSidebarOpen((current) => !current)} aria-hidden="true" style={{ ...buttonBase, width: '42px', height: '42px', background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary-color)', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                            <Menu size={18} />
                        </button>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manufacturer Hub</div>
                            <h1 style={{ margin: '0.15rem 0 0', fontSize: '1.45rem' }}>{viewLabel}</h1>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button type="button" onClick={toggleTheme} style={{ ...buttonBase, width: 'auto', padding: '0.8rem 1rem', background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                            {isDarkMode ? 'Day mode' : 'Night mode'}
                        </button>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Factory size={18} />
                        </div>
                    </div>
                </header>

                {message && <div style={{ ...panelStyle, padding: '0.95rem 1.1rem', borderLeft: '4px solid var(--primary-color)' }}>{message}</div>}

                {renderView()}
            </main>

            <style>{`
                @media (max-width: 1100px) {
                    .medguard-shell {
                        grid-template-columns: 1fr !important;
                    }

                    .medguard-sidebar {
                        position: relative !important;
                        height: auto !important;
                        border-right: none !important;
                        border-bottom: 1px solid var(--border-color) !important;
                    }

                    .medguard-main {
                        padding: 1rem !important;
                    }

                    .medguard-topbar button[aria-hidden="true"],
                    .medguard-topbar button:first-child {
                        display: inline-flex !important;
                    }
                }

                @media (max-width: 900px) {
                    .medguard-metric-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }

                    .medguard-two-col {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 640px) {
                    .medguard-metric-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .medguard-sidebar {
                        padding: 0.85rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default ManufacturerPortal;
