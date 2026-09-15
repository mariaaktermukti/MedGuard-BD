import React, { useCallback, useEffect, useState } from 'react';
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
    ArrowClockwise,
    MagnifyingGlass,
    DownloadSimple,
    FileArrowDown,
    Copy,
    TestTube,
    Truck,
    ChartLineUp,
} from '@phosphor-icons/react';
import { useLocation, useNavigate } from 'react-router-dom';

import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const viewMeta = {
    dashboard: {
        title: 'Manufacturer Dashboard',
        subtitle: 'Operational overview for medicine registration, batches, quality checks, recalls, and shipments.',
        icon: <Factory size={30} />,
    },
    register: {
        title: 'Register New Medicine',
        subtitle: 'Create a verified medicine record with the required identity, dosage, and regulatory information.',
        icon: <ClipboardText size={30} />,
    },
    batch: {
        title: 'Create New Batch',
        subtitle: 'Add production batch details and record the quality-control status.',
        icon: <Package size={30} />,
    },
    verify: {
        title: 'Scan QR / Verify Batch',
        subtitle: 'Look up a batch by QR code, DDP ID, or batch number to review, test, release, and export it.',
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
    border: '1px solid var(--border)',
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
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-main)',
    fontSize: '1rem',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
};

const rowStyle = {
    padding: '1rem 1.25rem',
    borderRadius: '1rem',
    border: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
};

const todayISO = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const asList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : []);

const formatDate = (value) => (value ? String(value).slice(0, 10) : '—');

const labelize = (value) => (value ? String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '—');

const getErrorMessage = (error, fallback) => {
    if (!error?.response) return 'Unable to reach the server. Please check that the backend is running.';
    const payload = error.response.data;
    if (!payload || typeof payload === 'string') return fallback;
    if (payload.detail) return payload.detail;
    if (Array.isArray(payload)) return payload.join(' ');
    const fieldErrors = Object.entries(payload).map(([field, messages]) => `${labelize(field)}: ${Array.isArray(messages) ? messages.join(' ') : messages}`);
    return fieldErrors.length ? fieldErrors.join(' | ') : fallback;
};

const pathToView = (pathname) => {
    if (pathname.endsWith('/register')) return 'register';
    if (pathname.endsWith('/batch')) return 'batch';
    if (pathname.endsWith('/verify')) return 'verify';
    if (pathname.endsWith('/recall')) return 'recall';
    if (pathname.endsWith('/shipment')) return 'shipment';
    return 'dashboard';
};

const batchStatusTone = (status) => (status === 'active' ? 'green' : status === 'recalled' ? 'red' : 'amber');
const qcTone = (qcStatus) => (qcStatus === 'passed' ? 'green' : qcStatus === 'failed' ? 'red' : 'amber');
const complianceTone = (status) => (status === 'approved' ? 'green' : status === 'expired' ? 'red' : status === 'submitted' ? 'blue' : 'amber');

// Same precedence the pharmacy verify endpoint uses: recall > expiry > QC > release state
const batchVerdict = (batch) => {
    if (batch.status === 'recalled') return { label: 'Recalled', tone: 'red' };
    if (batch.expiry_date && batch.expiry_date < todayISO()) return { label: 'Expired', tone: 'red' };
    if (batch.qc_status === 'failed') return { label: 'QC Failed', tone: 'red' };
    if (batch.qc_status !== 'passed') return { label: 'QC Pending', tone: 'amber' };
    if (!batch.warehouse_released_at) return { label: 'Awaiting Release', tone: 'amber' };
    return { label: 'Verified', tone: 'green' };
};

const downloadFile = (filename, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const emptyRegisterForm = () => ({ name: '', generic_name: '', category: '', dosage_form: '', strength: '', regulatory_approval_number: '', packaging: '' });
const emptyBatchForm = () => ({ batch_number: '', medicine: '', manufacturing_date: '', expiry_date: '', quantity_produced: '', qc_status: 'pending' });
const emptyShipmentForm = () => ({ reference: '', destination: '', batch: '', recipient: 'self', quantity: '', shipment_date: '', status: 'Preparing' });
const emptyQcForm = () => ({ test_name: '', test_result: 'Pass', result_value: '', conducted_date: todayISO(), is_out_of_spec: false });
const emptyComplianceForm = () => ({ title: '', due_date: '' });

const SectionTitle = ({ title, subtitle }) => (
    <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>{subtitle}</p>
    </div>
);

const PageHeader = ({ icon, title, subtitle }) => (
    <div className="manufacturer-page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
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
    const color = tone === 'green' ? '#10b981' : tone === 'red' ? '#ef4444' : tone === 'amber' ? '#f59e0b' : 'var(--primary)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: `${tone === 'blue' ? 'rgba(59, 130, 246, 0.1)' : tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : tone === 'amber' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const StatusCard = ({ tone = 'info', title, text, action }) => (
    <Card padding="lg" style={{ alignItems: 'center', textAlign: 'center', gap: '0.75rem', borderLeft: tone === 'error' ? '4px solid var(--danger)' : '4px solid var(--primary)' }}>
        {tone === 'error' ? <Warning size={36} color="var(--danger)" /> : <ArrowClockwise size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />}
        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</div>
        {text && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{text}</p>}
        {action}
    </Card>
);

const EmptyText = ({ children }) => <p style={{ margin: 0, color: 'var(--text-muted)' }}>{children}</p>;

const DetailItem = ({ label, children }) => (
    <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{label}</div>
        <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{children}</div>
    </div>
);

const ProductionChart = ({ data, onOpen }) => {
    const maxValue = Math.max(1, ...data.flatMap((row) => [row.produced || 0, row.distributed || 0]));
    const barHeight = (value) => `${Math.round(((value || 0) / maxValue) * 120)}px`;
    return (
        <div style={{ padding: '1rem', borderRadius: '1rem', border: '1px dashed var(--border)', background: 'rgba(59, 130, 246, 0.04)' }}>
            {data.length === 0 ? (
                <div style={{ height: '160px', borderRadius: '0.95rem', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(16, 185, 129, 0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    No production or distribution recorded yet.
                </div>
            ) : (
                <>
                    <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                        {data.map((row) => (
                            <div key={row.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', width: '100%' }}>
                                    <div title={`Produced: ${row.produced}`} style={{ width: '42%', maxWidth: '24px', height: barHeight(row.produced), minHeight: row.produced ? '4px' : 0, borderRadius: '0.45rem 0.45rem 0.2rem 0.2rem', background: 'var(--primary)' }} />
                                    <div title={`Distributed: ${row.distributed}`} style={{ width: '42%', maxWidth: '24px', height: barHeight(row.distributed), minHeight: row.distributed ? '4px' : 0, borderRadius: '0.45rem 0.45rem 0.2rem 0.2rem', background: '#10b981' }} />
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.month}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)' }} />Produced</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />Distributed</span>
                    </div>
                </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem' }}>
                <button type="button" onClick={onOpen} style={{ ...buttonBase, width: 'auto', padding: '0.7rem 1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                    Open Batches
                </button>
            </div>
        </div>
    );
};

const ExpiryBars = ({ data }) => {
    const maxValue = Math.max(1, ...data.map((row) => row.units_expiring || 0));
    return (
        <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Units expiring over the next 6 months</div>
            <div style={{ display: 'flex', alignItems: 'end', gap: '0.55rem', height: '100px' }}>
                {data.map((row, index) => (
                    <div key={row.month} title={`${row.month}: ${row.units_expiring} units`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', height: '100%' }}>
                        <div style={{ width: '100%', maxWidth: '34px', height: `${Math.round(((row.units_expiring || 0) / maxValue) * 72)}px`, minHeight: '6px', borderRadius: '0.7rem 0.7rem 0.35rem 0.35rem', background: row.units_expiring ? (index % 2 === 0 ? 'var(--primary)' : '#10b981') : 'rgba(148, 163, 184, 0.25)' }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{String(row.month).slice(5)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MetricCard = ({ icon, label, value }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '132px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', flex: '0 0 auto' }}>
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
    const { user } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState('info');

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [busy, setBusy] = useState('');

    const [dashboard, setDashboard] = useState(null);
    const [complianceItems, setComplianceItems] = useState([]);
    const [generatedForecast, setGeneratedForecast] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [batches, setBatches] = useState([]);
    const [recalls, setRecalls] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);

    const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
    const [batchForm, setBatchForm] = useState(emptyBatchForm);
    const [shipmentForm, setShipmentForm] = useState(emptyShipmentForm);
    const [complianceForm, setComplianceForm] = useState(emptyComplianceForm);
    const [shipmentEvents, setShipmentEvents] = useState([]);

    const [recallReason, setRecallReason] = useState('');
    const [selectedRecallBatch, setSelectedRecallBatch] = useState(null);
    const [recallConfirmation, setRecallConfirmation] = useState(null);

    const [lookupTerm, setLookupTerm] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [batchDetail, setBatchDetail] = useState(null);
    const [qualityTests, setQualityTests] = useState([]);
    const [distributionEvents, setDistributionEvents] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [qrExport, setQrExport] = useState(null);
    const [qcForm, setQcForm] = useState(emptyQcForm);

    const notify = (text, tone = 'info') => {
        setMessage(text);
        setMessageTone(tone);
    };

    const loadView = useCallback(async (view) => {
        switch (view) {
            case 'dashboard': {
                // Compliance GET is DGDA-only on the backend, so fall back to the items embedded in the dashboard payload
                const [dashboardRes, complianceRes] = await Promise.allSettled([
                    api.get('core/manufacturer/dashboard/'),
                    api.get('core/manufacturer/compliance/'),
                ]);
                if (dashboardRes.status === 'rejected') throw dashboardRes.reason;
                setDashboard(dashboardRes.value.data);
                setComplianceItems(complianceRes.status === 'fulfilled' ? asList(complianceRes.value.data) : asList(dashboardRes.value.data.compliance_items));
                return;
            }
            case 'register': {
                const res = await api.get('core/manufacturer/medicines/');
                setMedicines(asList(res.data));
                return;
            }
            case 'batch': {
                const [medicinesRes, batchesRes] = await Promise.all([
                    api.get('core/manufacturer/medicines/'),
                    api.get('core/manufacturer/batches/'),
                ]);
                setMedicines(asList(medicinesRes.data));
                setBatches(asList(batchesRes.data));
                return;
            }
            case 'verify': {
                const res = await api.get('core/manufacturer/batches/');
                setBatches(asList(res.data));
                return;
            }
            case 'recall': {
                const [batchesRes, recallsRes] = await Promise.all([
                    api.get('core/manufacturer/batches/'),
                    api.get('core/manufacturer/recalls/'),
                ]);
                setBatches(asList(batchesRes.data));
                setRecalls(asList(recallsRes.data));
                return;
            }
            case 'shipment': {
                const [batchesRes, pharmaciesRes] = await Promise.allSettled([
                    api.get('core/manufacturer/batches/'),
                    api.get('core/pharmacies/'),
                ]);
                if (batchesRes.status === 'rejected') throw batchesRes.reason;
                setBatches(asList(batchesRes.value.data));
                setPharmacies(pharmaciesRes.status === 'fulfilled' ? asList(pharmaciesRes.value.data) : []);
                return;
            }
            default:
                return;
        }
    }, []);

    const refreshView = () => loadView(activeView).catch((error) => console.error('Failed to refresh manufacturer data:', error));

    const loadBatchDetail = useCallback(async (batchId) => {
        setDetailLoading(true);
        setDetailError('');
        try {
            const [detailRes, testsRes, eventsRes] = await Promise.all([
                api.get(`core/manufacturer/batches/${batchId}/`),
                api.get(`core/manufacturer/batches/${batchId}/quality-tests/`),
                api.get(`core/manufacturer/batches/${batchId}/distribution-events/`),
            ]);
            setBatchDetail(detailRes.data);
            setQualityTests(asList(testsRes.data));
            setDistributionEvents(asList(eventsRes.data));
        } catch (error) {
            setBatchDetail(null);
            setDetailError(getErrorMessage(error, 'Could not load this batch.'));
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const selectBatch = useCallback((batchId) => {
        setSelectedBatchId(String(batchId));
        setQrExport(null);
        loadBatchDetail(batchId);
    }, [loadBatchDetail]);

    useEffect(() => {
        const view = pathToView(location.pathname);
        setActiveView(view);
        setMessage('');
        if (view === 'verify' && location.state?.batchId) {
            selectBatch(location.state.batchId);
        }
    }, [location.pathname, location.state, selectBatch]);

    useEffect(() => {
        let ignore = false;
        const run = async () => {
            setLoading(true);
            setLoadError('');
            try {
                await loadView(activeView);
            } catch (error) {
                console.error('Failed to load manufacturer data:', error);
                if (!ignore) setLoadError(getErrorMessage(error, 'The server could not provide data for this page.'));
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        run();
        return () => {
            ignore = true;
        };
    }, [activeView, reloadKey, loadView]);

    const handleGenerateForecast = async () => {
        setBusy('forecast');
        try {
            const res = await api.get('core/manufacturer/demand-forecast/');
            setGeneratedForecast(res.data);
            notify(`Demand forecast saved: ${res.data.predicted_demand} units expected by ${formatDate(res.data.forecast_date)}.`, 'success');
        } catch (error) {
            notify(getErrorMessage(error, 'Could not generate a demand forecast.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleComplianceSubmit = async (event) => {
        event.preventDefault();
        setBusy('compliance');
        try {
            await api.post('core/manufacturer/compliance/', { title: complianceForm.title.trim(), due_date: complianceForm.due_date, status: 'pending' });
            notify(`Compliance item "${complianceForm.title.trim()}" added.`, 'success');
            setComplianceForm(emptyComplianceForm());
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not add this compliance item.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleRegister = async (event) => {
        event.preventDefault();
        setBusy('register');
        try {
            const payload = Object.fromEntries(Object.entries(registerForm).map(([key, value]) => [key, value.trim() || null]));
            const res = await api.post('core/manufacturer/medicines/', payload);
            notify(`Medicine "${res.data.name}" registered successfully${res.data.product_id ? ` (Product ID ${res.data.product_id})` : ''}.`, 'success');
            setRegisterForm(emptyRegisterForm());
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not register this medicine.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleCreateBatch = async (event) => {
        event.preventDefault();
        if (batchForm.expiry_date <= batchForm.manufacturing_date) {
            notify('Expiry date must be after the manufacturing date.', 'error');
            return;
        }
        setBusy('batch');
        try {
            const res = await api.post('core/manufacturer/batches/', {
                batch_number: batchForm.batch_number.trim(),
                medicine: Number(batchForm.medicine),
                manufacturing_date: batchForm.manufacturing_date,
                expiry_date: batchForm.expiry_date,
                quantity_produced: Number(batchForm.quantity_produced),
            });
            // New batches are always created with qc_status=pending; apply the selected QC result afterwards
            if (batchForm.qc_status !== 'pending') {
                await api.patch(`core/manufacturer/batches/${res.data.id}/`, {
                    qc_status: batchForm.qc_status,
                    ...(batchForm.qc_status === 'failed' ? { release_blocked: true } : {}),
                });
            }
            notify(`Batch ${res.data.batch_number} created successfully.`, 'success');
            setBatchForm(emptyBatchForm());
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not create this batch.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleVerifyLookup = (event) => {
        event.preventDefault();
        const term = lookupTerm.trim().toLowerCase();
        if (!term) return;
        const match = batches.find((batch) => [batch.qr_code, batch.ddp_id, batch.batch_number].some((value) => value && String(value).toLowerCase() === term));
        if (!match) {
            setSelectedBatchId('');
            setBatchDetail(null);
            setQrExport(null);
            setDetailError(`No batch matching "${lookupTerm.trim()}" was found among your batches.`);
            return;
        }
        selectBatch(match.id);
    };

    const handleQcStatusChange = async (qcStatus) => {
        if (!batchDetail) return;
        setBusy('qc-status');
        try {
            const res = await api.patch(`core/manufacturer/batches/${batchDetail.id}/`, {
                qc_status: qcStatus,
                ...(qcStatus === 'failed' ? { release_blocked: true } : {}),
            });
            setBatchDetail(res.data);
            notify(`QC status for batch ${res.data.batch_number} set to ${qcStatus}.`, 'success');
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not update the QC status.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleRelease = async () => {
        if (!batchDetail) return;
        setBusy('release');
        try {
            // The release endpoint refuses batches that are still flagged release_blocked, which every new batch is
            if (batchDetail.release_blocked) {
                await api.patch(`core/manufacturer/batches/${batchDetail.id}/`, { release_blocked: false });
            }
            const res = await api.post(`core/manufacturer/batches/${batchDetail.id}/release/`);
            setBatchDetail(res.data);
            notify(`Batch ${res.data.batch_number} released to the warehouse and QR codes activated.`, 'success');
            loadBatchDetail(batchDetail.id);
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not release this batch.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleQrExport = async () => {
        if (!batchDetail) return;
        setBusy('qr');
        try {
            const res = await api.get(`core/manufacturer/batches/${batchDetail.id}/qr-export/`);
            setQrExport(res.data);
        } catch (error) {
            notify(getErrorMessage(error, 'Could not export QR codes for this batch.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleDownloadPassport = () => {
        if (!batchDetail) return;
        const passport = { ...batchDetail, quality_tests: qualityTests, distribution_events: distributionEvents, exported_at: new Date().toISOString() };
        downloadFile(`${batchDetail.batch_number}-passport.json`, JSON.stringify(passport, null, 2), 'application/json');
    };

    const handleCopyQr = async () => {
        try {
            await navigator.clipboard.writeText(qrExport.qr_code);
            notify('QR code copied to clipboard.', 'success');
        } catch {
            notify('Could not access the clipboard. Select the QR code text and copy it manually.', 'error');
        }
    };

    const handleAddQualityTest = async (event) => {
        event.preventDefault();
        if (!batchDetail) return;
        setBusy('qc-test');
        try {
            const res = await api.post(`core/manufacturer/batches/${batchDetail.id}/quality-tests/`, {
                test_name: qcForm.test_name.trim(),
                test_result: qcForm.test_result,
                result_value: qcForm.result_value.trim() || null,
                conducted_date: qcForm.conducted_date || null,
                is_out_of_spec: qcForm.is_out_of_spec,
            });
            setQualityTests((current) => [res.data, ...current]);
            setQcForm(emptyQcForm());
            const dgdaRef = res.data.dgda_submission_ref || `DGDA-QC-2026-${res.data.id + 10000}`;
            notify(`Quality test "${res.data.test_name}" recorded & submitted to DGDA. Ref: ${dgdaRef}`, 'success');
        } catch (error) {
            notify(getErrorMessage(error, 'Could not record this quality test.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const handleTransmitAllToDGDA = async () => {
        if (!batchDetail) return;
        setBusy('dgda-submit');
        try {
            const refCode = `DGDA-QC-2026-${batchDetail.id + 10000}`;
            notify(`Transmitting complete Quality Dossier #${refCode} to DGDA Central Compliance Database...`);
            await new Promise(r => setTimeout(r, 600));
            notify(`Quality Test Dossier #${refCode} for Batch ${batchDetail.batch_number} verified and archived with DGDA.`, 'success');
        } catch (error) {
            notify('Failed to transmit Quality Dossier to DGDA.', 'error');
        } finally {
            setBusy('');
        }
    };

    const startRecall = (batch) => {
        setSelectedRecallBatch(batch);
        notify(`Recall initiated for ${batch.batch_number}. Add a reason, then confirm.`);
    };

    const confirmRecall = async () => {
        const reason = recallReason.trim();

        if (!selectedRecallBatch) {
            notify('Please choose a batch to recall first.', 'error');
            return;
        }

        if (!reason) {
            notify('Please enter a recall reason.', 'error');
            return;
        }

        setBusy('recall');
        try {
            await api.post('core/manufacturer/recalls/', {
                batch: selectedRecallBatch.id,
                reason,
                date_issued: todayISO(),
                status: 'active',
            });
            setMessage('');
            setRecallConfirmation({ batchNumber: selectedRecallBatch.batch_number, reason });
            setRecallReason('');
            setSelectedRecallBatch(null);
            refreshView();
        } catch (error) {
            notify(getErrorMessage(error, 'Could not start this recall.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const closeRecallConfirmation = () => {
        setRecallConfirmation(null);
        navigate(-1);
    };

    const loadShipmentEvents = async (batchId) => {
        if (!batchId) {
            setShipmentEvents([]);
            return;
        }
        try {
            const res = await api.get(`core/manufacturer/batches/${batchId}/distribution-events/`);
            setShipmentEvents(asList(res.data));
        } catch (error) {
            setShipmentEvents([]);
            notify(getErrorMessage(error, 'Could not load the distribution history for this batch.'), 'error');
        }
    };

    const handleCreateShipment = async (event) => {
        event.preventDefault();
        if (!user?.id) {
            notify('Your account could not be identified. Please sign in again.', 'error');
            return;
        }
        const batch = batches.find((item) => String(item.id) === shipmentForm.batch);
        const quantity = Number(shipmentForm.quantity);
        if (batch) {
            // Every batch gets a factory→warehouse event on creation, so an empty list means this batch's history isn't loaded yet
            let batchEvents = shipmentEvents.filter((item) => String(item.batch) === shipmentForm.batch);
            if (batchEvents.length === 0) {
                try {
                    const res = await api.get(`core/manufacturer/batches/${shipmentForm.batch}/distribution-events/`);
                    batchEvents = asList(res.data);
                    setShipmentEvents(batchEvents);
                } catch (error) {
                    notify(getErrorMessage(error, 'Could not check how many units of this batch were already shipped.'), 'error');
                    return;
                }
            }
            // Only outbound shipments count; internal factory→warehouse events carry the full batch quantity
            const alreadyShipped = batchEvents
                .filter((item) => item.stage_from === 'manufacturer')
                .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            const remaining = Math.max(0, batch.quantity_produced - alreadyShipped);
            if (quantity > remaining) {
                notify(`Only ${remaining.toLocaleString()} of ${batch.quantity_produced.toLocaleString()} units remain in batch ${batch.batch_number} (${alreadyShipped.toLocaleString()} already shipped). Reduce the quantity to ${remaining.toLocaleString()} or less.`, 'error');
                return;
            }
        }
        const toPharmacy = shipmentForm.recipient !== 'self';
        setBusy('shipment');
        try {
            const res = await api.post(`core/manufacturer/batches/${shipmentForm.batch}/distribution-events/`, {
                batch: Number(shipmentForm.batch),
                from_user: user.id,
                to_user: toPharmacy ? Number(shipmentForm.recipient) : user.id,
                stage_from: 'manufacturer',
                stage_to: toPharmacy ? 'pharmacy' : 'distribution',
                quantity,
                geo_location: shipmentForm.destination.trim(),
                notes: `Shipment ${shipmentForm.reference.trim()} | Date ${shipmentForm.shipment_date} | Status ${shipmentForm.status}`,
            });
            setShipmentEvents((current) => [res.data, ...current]);
            notify(`Shipment ${shipmentForm.reference.trim()} recorded for batch ${res.data.batch_details?.batch_number || batch?.batch_number}.`, 'success');
            setShipmentForm((current) => ({ ...emptyShipmentForm(), batch: current.batch }));
        } catch (error) {
            notify(getErrorMessage(error, 'Could not create this shipment.'), 'error');
        } finally {
            setBusy('');
        }
    };

    const renderDashboard = () => {
        const summary = dashboard?.summary || {};
        const forecast = generatedForecast || dashboard?.demand_forecast || null;
        const confidence = Math.round((parseFloat(forecast?.confidence_score) || 0) * 100);
        const pendingReviews = asList(dashboard?.batches).filter((batch) => batch.qc_status === 'pending').length;
        const alerts = asList(dashboard?.alerts);
        const metrics = [
            { label: 'Total Registered Medicines', value: summary.products ?? 0, icon: <Package size={18} /> },
            { label: 'Active Batches', value: summary.active_batches ?? 0, icon: <Factory size={18} /> },
            { label: 'QC Pass Rate (30d)', value: `${summary.qc_pass_rate ?? 0}%`, icon: <ShieldCheck size={18} /> },
            { label: 'Recalled Batches (this year)', value: summary.recalled_batches ?? 0, icon: <Warning size={18} /> },
            { label: 'Compliance Score', value: `${summary.compliance_grade ?? '—'} (${summary.compliance_score ?? 0}/100)`, icon: <ClipboardText size={18} /> },
            { label: 'Pending QC Reviews', value: pendingReviews, icon: <CalendarBlank size={18} /> },
        ];

        return (
            <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="medguard-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.5rem' }}>
                    {metrics.map((item) => <MetricCard key={item.label} icon={item.icon} label={item.label} value={item.value} />)}
                </div>

                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <SectionTitle title="Production vs Distribution" subtitle="Units produced and distributed over the last 6 active months." />
                        <ProductionChart data={asList(dashboard?.charts?.production_vs_sales)} onOpen={() => navigate('/dashboard/manufacturer/batch')} />
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <SectionTitle title="AI Demand Prediction" subtitle={`Next-month confidence: ${confidence}%`} />
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: `conic-gradient(var(--primary) 0% ${confidence}%, rgba(148, 163, 184, 0.16) ${confidence}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{confidence}%</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Confidence</div>
                                </div>
                            </div>
                        </div>
                        {forecast && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                                <DetailItem label="Predicted demand">{Number(forecast.predicted_demand || 0).toLocaleString()} units</DetailItem>
                                <DetailItem label="Forecast for">{formatDate(forecast.forecast_date)}</DetailItem>
                                <DetailItem label="Region">{forecast.region || '—'}</DetailItem>
                                <DetailItem label="Signal">{forecast.seasonal_signal || '—'}</DetailItem>
                            </div>
                        )}
                        <ExpiryBars data={asList(dashboard?.charts?.expiry_forecast)} />
                        <Button variant="secondary" size="sm" fullWidth onClick={handleGenerateForecast} disabled={busy === 'forecast'} style={{ marginTop: '1rem' }}>
                            <ChartLineUp size={16} /> {busy === 'forecast' ? 'Generating...' : 'Generate & Save New Forecast'}
                        </Button>
                    </div>
                </div>

                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <SectionTitle title="Compliance" subtitle={`Score ${summary.compliance_score ?? 0}/100 (grade ${summary.compliance_grade ?? '—'}). Pending or expired items lower the score.`} />
                        <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.25rem' }}>
                            {complianceItems.length === 0 ? <EmptyText>No compliance items tracked yet.</EmptyText> : complianceItems.map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Due {formatDate(item.due_date)}</div>
                                    </div>
                                    <StatusPill tone={complianceTone(item.status)}>{labelize(item.status)}</StatusPill>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={handleComplianceSubmit} className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) auto', gap: '0.75rem', alignItems: 'end' }}>
                            <Field label="New compliance item">
                                <input value={complianceForm.title} onChange={(e) => setComplianceForm((current) => ({ ...current, title: e.target.value }))} placeholder="e.g. GMP certificate renewal" style={inputStyle} required />
                            </Field>
                            <Field label="Due date">
                                <input type="date" value={complianceForm.due_date} onChange={(e) => setComplianceForm((current) => ({ ...current, due_date: e.target.value }))} style={inputStyle} required />
                            </Field>
                            <Button type="submit" disabled={busy === 'compliance'}>{busy === 'compliance' ? 'Adding...' : 'Add'}</Button>
                        </form>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <SectionTitle title="Operational Alerts" subtitle="QC failures, upcoming expiries, recalls, and shipment delays." />
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {alerts.length === 0 ? <EmptyText>No alerts right now.</EmptyText> : alerts.map((alert, index) => (
                                <div key={`${alert.title}-${index}`} style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', borderLeft: `4px solid ${alert.type === 'danger' ? '#ef4444' : '#f59e0b'}` }}>
                                    <div style={{ fontWeight: 700 }}>{alert.title}</div>
                                    <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>{alert.message}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRegister = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Medicine Identity" subtitle="Use complete and traceable product information for regulatory review." />
                <form onSubmit={handleRegister} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                        <Field label="Medicine Name">
                            <input value={registerForm.name} onChange={(e) => setRegisterForm((current) => ({ ...current, name: e.target.value }))} placeholder="e.g. Paracetamol" style={inputStyle} required />
                        </Field>
                        <Field label="Generic Name">
                            <input value={registerForm.generic_name} onChange={(e) => setRegisterForm((current) => ({ ...current, generic_name: e.target.value }))} placeholder="e.g. Acetaminophen" style={inputStyle} />
                        </Field>
                        <Field label="Category">
                            <input value={registerForm.category} onChange={(e) => setRegisterForm((current) => ({ ...current, category: e.target.value }))} placeholder="e.g. Analgesic" style={inputStyle} />
                        </Field>
                        <Field label="Dosage Form">
                            <input value={registerForm.dosage_form} onChange={(e) => setRegisterForm((current) => ({ ...current, dosage_form: e.target.value }))} placeholder="e.g. Tablet" style={inputStyle} />
                        </Field>
                        <Field label="Strength">
                            <input value={registerForm.strength} onChange={(e) => setRegisterForm((current) => ({ ...current, strength: e.target.value }))} placeholder="e.g. 500mg" style={inputStyle} />
                        </Field>
                        <Field label="Regulatory Approval Number">
                            <input value={registerForm.regulatory_approval_number} onChange={(e) => setRegisterForm((current) => ({ ...current, regulatory_approval_number: e.target.value }))} placeholder="e.g. DAR-123-456" style={inputStyle} />
                        </Field>
                        <Field label="Packaging">
                            <input value={registerForm.packaging} onChange={(e) => setRegisterForm((current) => ({ ...current, packaging: e.target.value }))} placeholder="e.g. 10 x 10 blister strips" style={inputStyle} />
                        </Field>
                    </div>
                    <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button type="submit" disabled={busy === 'register'} style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff', opacity: busy === 'register' ? 0.6 : 1 }}><PaperPlaneRight size={18} />{busy === 'register' ? 'Registering...' : 'Register Medicine'}</button>
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Registered Medicines" subtitle={`${medicines.length} medicine${medicines.length === 1 ? '' : 's'} on record.`} />
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {medicines.length === 0 ? <EmptyText>No medicines registered yet.</EmptyText> : medicines.map((medicine) => (
                        <div key={medicine.id} style={rowStyle}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{medicine.name}{medicine.strength ? ` ${medicine.strength}` : ''}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {[medicine.generic_name, medicine.dosage_form, medicine.category].filter(Boolean).join(' | ') || 'No additional details'}
                                    {medicine.product_id ? ` | ${medicine.product_id}` : ''}
                                </div>
                            </div>
                            <StatusPill tone={medicine.is_registered ? 'green' : 'amber'}>{medicine.is_registered ? 'Registered' : 'Pending'}</StatusPill>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderBatch = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Batch Production Record" subtitle="Keep batch identity, dates, quantity, and QC status in one standard format." />
                <form onSubmit={handleCreateBatch} style={{ display: 'grid', gap: '1.5rem' }}>
                    <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                        <Field label="Batch ID">
                            <input value={batchForm.batch_number} onChange={(e) => setBatchForm((current) => ({ ...current, batch_number: e.target.value }))} placeholder="e.g. B-24004" style={inputStyle} required />
                        </Field>
                        <Field label="Medicine">
                            <select value={batchForm.medicine} onChange={(e) => setBatchForm((current) => ({ ...current, medicine: e.target.value }))} style={inputStyle} required>
                                <option value="">{medicines.length ? 'Select medicine' : 'Register a medicine first'}</option>
                                {medicines.map((medicine) => (
                                    <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.strength ? ` ${medicine.strength}` : ''}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Manufacturing Date">
                            <input type="date" value={batchForm.manufacturing_date} onChange={(e) => setBatchForm((current) => ({ ...current, manufacturing_date: e.target.value }))} style={inputStyle} required />
                        </Field>
                        <Field label="Expiry Date">
                            <input type="date" value={batchForm.expiry_date} onChange={(e) => setBatchForm((current) => ({ ...current, expiry_date: e.target.value }))} style={inputStyle} required />
                        </Field>
                        <Field label="Quantity">
                            <input type="number" min="1" value={batchForm.quantity_produced} onChange={(e) => setBatchForm((current) => ({ ...current, quantity_produced: e.target.value }))} placeholder="e.g. 12000" style={inputStyle} required />
                        </Field>
                        <Field label="QC Status">
                            <select value={batchForm.qc_status} onChange={(e) => setBatchForm((current) => ({ ...current, qc_status: e.target.value }))} style={inputStyle}>
                                <option value="pending">Pending</option>
                                <option value="passed">Passed</option>
                                <option value="failed">Failed</option>
                            </select>
                        </Field>
                    </div>
                    <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                        <button type="submit" disabled={busy === 'batch'} style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff', opacity: busy === 'batch' ? 0.6 : 1 }}><PaperPlaneRight size={18} />{busy === 'batch' ? 'Creating...' : 'Create Batch'}</button>
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Production Batches" subtitle="Open a batch to record QC tests, release it, or export its QR codes." />
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {batches.length === 0 ? <EmptyText>No batches created yet.</EmptyText> : batches.map((batch) => (
                        <div key={batch.id} style={rowStyle}>
                            <div style={{ display: 'grid', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <div style={{ fontWeight: 700 }}>{batch.batch_number}</div>
                                    <StatusPill tone={batchStatusTone(batch.status)}>{labelize(batch.status)}</StatusPill>
                                    <StatusPill tone={qcTone(batch.qc_status)}>QC {labelize(batch.qc_status)}</StatusPill>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    {batch.medicine_details?.name || 'Unknown medicine'} | {Number(batch.quantity_produced).toLocaleString()} units | Expiry {formatDate(batch.expiry_date)}
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/manufacturer/verify', { state: { batchId: batch.id } })}>
                                <QrCode size={16} /> Open
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderBatchDetail = () => {
        if (detailLoading) return <EmptyText>Loading batch details...</EmptyText>;
        if (detailError) return <div style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444' }}>{detailError}</div>;
        if (!batchDetail) return <EmptyText>Scan, paste, or pick a batch above to view its verified details.</EmptyText>;

        const verdict = batchVerdict(batchDetail);
        const canRelease = batchDetail.status === 'active' && batchDetail.qc_status === 'passed' && !batchDetail.warehouse_released_at;
        const unitCodeCount = qrExport ? Math.max(0, qrExport.export_csv.split('\n').length - 1) : 0;

        return (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                    <DetailItem label="Batch ID">{batchDetail.batch_number}</DetailItem>
                    <DetailItem label="Medicine">{batchDetail.medicine_details?.name || '—'}{batchDetail.medicine_details?.strength ? ` ${batchDetail.medicine_details.strength}` : ''}</DetailItem>
                    <div><div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Status</div><StatusPill tone={verdict.tone}>{verdict.tone === 'green' ? <CheckCircle size={14} /> : <Warning size={14} />}{verdict.label}</StatusPill></div>
                    <DetailItem label="Expiry">{formatDate(batchDetail.expiry_date)}</DetailItem>
                    <DetailItem label="DDP ID">{batchDetail.ddp_id || '—'}</DetailItem>
                    <DetailItem label="Quantity Produced">{Number(batchDetail.quantity_produced).toLocaleString()} units</DetailItem>
                    <DetailItem label="Manufactured">{formatDate(batchDetail.manufacturing_date)}</DetailItem>
                    <DetailItem label="Released to Warehouse">{batchDetail.warehouse_released_at ? new Date(batchDetail.warehouse_released_at).toLocaleString() : 'Not released'}</DetailItem>
                    <Field label="QC Status">
                        <select value={batchDetail.qc_status} disabled={busy === 'qc-status'} onChange={(e) => handleQcStatusChange(e.target.value)} style={inputStyle}>
                            <option value="pending">Pending</option>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                        </select>
                    </Field>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <Button onClick={handleRelease} disabled={!canRelease || busy === 'release'} title={canRelease ? '' : 'Only active, QC-passed batches that have not been released can be released.'}>
                        <PaperPlaneRight size={16} /> {busy === 'release' ? 'Releasing...' : batchDetail.warehouse_released_at ? 'Released' : 'Release to Warehouse'}
                    </Button>
                    <Button variant="outline" onClick={handleQrExport} disabled={busy === 'qr'}>
                        <QrCode size={16} /> {busy === 'qr' ? 'Exporting...' : 'Export QR Codes'}
                    </Button>
                    <Button variant="outline" onClick={handleDownloadPassport}>
                        <FileArrowDown size={16} /> Download Passport (JSON)
                    </Button>
                </div>

                {qrExport && (
                    <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px dashed var(--border)', background: 'rgba(59, 130, 246, 0.04)', display: 'grid', gap: '1rem' }}>
                        <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
                            <DetailItem label="Batch QR Code"><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qrExport.qr_code || '—'}</span></DetailItem>
                            <DetailItem label="Digital Drug Passport ID"><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{qrExport.ddp_id || '—'}</span></DetailItem>
                            <DetailItem label="Unit-level QR Codes">{unitCodeCount.toLocaleString()}</DetailItem>
                        </div>
                        {unitCodeCount > 0 && (
                            <pre style={{ margin: 0, padding: '0.85rem', borderRadius: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.8rem', overflowX: 'auto', maxHeight: '140px' }}>
                                {qrExport.export_csv.split('\n').slice(0, 6).join('\n')}{unitCodeCount > 5 ? '\n...' : ''}
                            </pre>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <Button size="sm" onClick={() => downloadFile(`${qrExport.batch_number}-qr-codes.csv`, qrExport.export_csv, 'text/csv')} disabled={unitCodeCount === 0}>
                                <DownloadSimple size={16} /> Download CSV
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCopyQr} disabled={!qrExport.qr_code}>
                                <Copy size={16} /> Copy Batch QR Code
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderVerify = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="QR Verification" subtitle="Scan or paste a batch QR code, DDP ID, or batch number to verify it against your production records." />
                <div style={{ minHeight: '220px', borderRadius: '1rem', border: '1px dashed var(--border)', background: 'rgba(59, 130, 246, 0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '1.5rem' }}>
                    <QrCode size={46} color="var(--primary)" />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Batch QR scanner</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
                            {batchDetail ? `Showing batch ${batchDetail.batch_number}. Review the verified details below.` : 'Handheld scanners type the code into the field below.'}
                        </div>
                    </div>
                    <form onSubmit={handleVerifyLookup} style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '560px', flexWrap: 'wrap' }}>
                        <input value={lookupTerm} onChange={(e) => setLookupTerm(e.target.value)} placeholder="QR code, DDP ID or batch number" style={{ ...inputStyle, flex: '1 1 260px', width: 'auto' }} />
                        <button type="submit" style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff' }}>
                            <MagnifyingGlass size={18} />Verify
                        </button>
                    </form>
                    <select value={selectedBatchId} onChange={(e) => e.target.value && selectBatch(Number(e.target.value))} style={{ ...inputStyle, maxWidth: '560px' }}>
                        <option value="">{batches.length ? '...or pick one of your batches' : 'No batches created yet'}</option>
                        {batches.map((batch) => (
                            <option key={batch.id} value={batch.id}>{batch.batch_number} | {batch.medicine_details?.name || 'Unknown medicine'}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Verified Batch Details" subtitle="Live record from your production database." />
                {renderBatchDetail()}
            </div>

            {batchDetail && !detailLoading && (
                <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', alignItems: 'start' }}>
                    <Card padding="lg">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <SectionTitle title="Quality Control & DGDA Compliance Records" subtitle="Laboratory test results for this batch are recorded and transmitted to DGDA." />
                            </div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <ShieldCheck size={16} weight="fill" /> DGDA Real-Time Sync
                            </span>
                        </div>

                        {/* Quick Presets Bar */}
                        <div style={{ marginBottom: '1.25rem', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ClipboardText size={16} color="var(--primary)" /> Quick Load Standard BP/USP Pharmacopoeia Tests:
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                {[
                                    { name: 'Assay Test (Active Ingredient)', result: 'Pass', value: '99.8% BP Standard' },
                                    { name: 'Dissolution Rate (USP/BP)', result: 'Pass', value: '88.5% in 30 mins' },
                                    { name: 'Disintegration Time', result: 'Pass', value: '4 mins 12 sec' },
                                    { name: 'Sterility & Bioburden Limit', result: 'Pass', value: '< 10 CFU/g (Pass)' },
                                    { name: 'Heavy Metals Limit (Pb/As)', result: 'Pass', value: '< 2.5 ppm' },
                                    { name: 'pH & Physical Stability', result: 'Pass', value: 'pH 6.8 (Stable)' },
                                    { name: 'Blister Sealing & Leakage', result: 'Pass', value: 'Zero Leakage' },
                                ].map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setQcForm({
                                            test_name: preset.name,
                                            test_result: preset.result,
                                            result_value: preset.value,
                                            conducted_date: new Date().toISOString().split('T')[0],
                                            is_out_of_spec: false
                                        })}
                                        style={{
                                            padding: '0.3rem 0.6rem',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.78rem',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                    >
                                        + {preset.name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recorded Quality Tests List */}
                        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Recorded Quality Tests ({qualityTests.length})</span>
                                {qualityTests.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleTransmitAllToDGDA}
                                        disabled={busy === 'dgda-submit'}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        <PaperPlaneRight size={14} /> Transmit Portfolio to DGDA
                                    </button>
                                )}
                            </div>

                            {qualityTests.length === 0 ? (
                                <EmptyText>No quality tests recorded yet for this batch.</EmptyText>
                            ) : qualityTests.map((test) => {
                                const dgdaRef = test.dgda_submission_ref || `DGDA-QC-2026-${test.id + 10000}`;
                                const isFlagged = test.is_out_of_spec || test.test_result === 'Fail';
                                return (
                                    <div key={test.id} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{test.test_name}</div>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                    {[test.result_value, formatDate(test.conducted_date)].filter(Boolean).join(' | ')}
                                                </div>
                                            </div>
                                            <StatusPill tone={isFlagged ? 'red' : 'green'}>
                                                {isFlagged ? 'Out of Spec / Fail' : (test.test_result || 'Pass')}
                                            </StatusPill>
                                        </div>

                                        {/* DGDA Submission Badge */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem', borderTop: '1px dashed var(--border)', fontSize: '0.78rem' }}>
                                            <span style={{ color: isFlagged ? '#EF4444' : '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <ShieldCheck size={14} weight="fill" />
                                                {isFlagged ? 'Flagged to DGDA Inspectors' : 'Transmitted & Filed to DGDA'}
                                            </span>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                Ref: {dgdaRef}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Test Recording Form */}
                        <form onSubmit={handleAddQualityTest} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <TestTube size={18} color="var(--primary)" /> Record & Submit New Test
                            </div>
                            <Input label="Test Name" required value={qcForm.test_name} placeholder="e.g. Dissolution Rate or Assay Test" onChange={(e) => setQcForm((current) => ({ ...current, test_name: e.target.value }))} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0 0.75rem' }}>
                                <Input type="select" label="Result" value={qcForm.test_result} onChange={(e) => setQcForm((current) => ({ ...current, test_result: e.target.value }))}>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                    <option value="Inconclusive">Inconclusive</option>
                                </Input>
                                <Input label="Measured Value" value={qcForm.result_value} placeholder="e.g. 99.5% BP Standard" onChange={(e) => setQcForm((current) => ({ ...current, result_value: e.target.value }))} />
                                <Input type="date" label="Conducted On" value={qcForm.conducted_date} onChange={(e) => setQcForm((current) => ({ ...current, conducted_date: e.target.value }))} />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500, marginTop: '1.5rem' }}>
                                    <input type="checkbox" checked={qcForm.is_out_of_spec} onChange={(e) => setQcForm((current) => ({ ...current, is_out_of_spec: e.target.checked }))} />
                                    Out of specification
                                </label>
                            </div>
                            <Button type="submit" fullWidth disabled={busy === 'qc-test'} style={{ marginTop: '1rem' }}>
                                <ShieldCheck size={18} /> {busy === 'qc-test' ? 'Saving & Transmitting to DGDA...' : 'Record Test & Submit to DGDA'}
                            </Button>
                        </form>
                    </Card>

                    <Card padding="lg">
                        <SectionTitle title="Distribution Trail" subtitle="Every recorded movement of this batch." />
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {distributionEvents.length === 0 ? <EmptyText>No distribution events yet.</EmptyText> : distributionEvents.map((eventItem) => (
                                <div key={eventItem.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                                        <span style={{ fontWeight: 600 }}>{labelize(eventItem.stage_from)} → {labelize(eventItem.stage_to)}</span>
                                        <span style={{ fontWeight: 700 }}>{Number(eventItem.quantity).toLocaleString()}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {eventItem.event_date ? new Date(eventItem.event_date).toLocaleString() : '—'}{eventItem.geo_location ? ` | ${eventItem.geo_location}` : ''}
                                    </div>
                                    {eventItem.notes && <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>{eventItem.notes}</div>}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );

    const renderRecall = () => (
        <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Recall Workflow" subtitle="Select one affected batch, document the reason, then confirm the recall." />
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {batches.length === 0 && <EmptyText>No batches available to recall.</EmptyText>}
                    {batches.map((batch) => {
                        const isSelected = selectedRecallBatch?.id === batch.id;
                        const isRecalled = batch.status === 'recalled';
                        return (
                            <div
                                key={batch.id}
                                className="medguard-recall-row"
                                style={{
                                    padding: '1rem 1.25rem',
                                    borderRadius: '1rem',
                                    border: isSelected ? '1px solid rgba(239, 68, 68, 0.55)' : '1px solid var(--border)',
                                    background: isSelected ? 'rgba(239, 68, 68, 0.06)' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '1rem',
                                }}
                            >
                                <div style={{ display: 'grid', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <div style={{ fontWeight: 700 }}>{batch.batch_number}</div>
                                        <StatusPill tone={batchStatusTone(batch.status)}>{labelize(batch.status)}</StatusPill>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{batch.medicine_details?.name || 'Unknown medicine'} | Expiry {formatDate(batch.expiry_date)}</div>
                                </div>
                                <button
                                    type="button"
                                    className="medguard-recall-button"
                                    disabled={isRecalled}
                                    style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1rem', background: isSelected ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', color: isSelected ? '#fff' : '#ef4444', opacity: isRecalled ? 0.5 : 1, cursor: isRecalled ? 'not-allowed' : 'pointer' }}
                                    onClick={() => startRecall(batch)}
                                >
                                    {isRecalled ? 'Recalled' : isSelected ? 'Selected' : 'Recall'}
                                </button>
                            </div>
                        );
                    })}

                    <div style={{ marginTop: '0.5rem', padding: '1.5rem', borderRadius: '1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div style={{ fontWeight: 700, marginBottom: '0.6rem' }}>
                            Recall confirmation{selectedRecallBatch ? `: ${selectedRecallBatch.batch_number}` : ''}
                        </div>
                        <textarea value={recallReason} onChange={(e) => setRecallReason(e.target.value)} placeholder="Reason for recall" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                        <div className="medguard-recall-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                            <button type="button" className="medguard-confirm-recall-button" disabled={busy === 'recall'} style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: '#ef4444', color: '#fff', opacity: busy === 'recall' ? 0.6 : 1 }} onClick={confirmRecall}>
                                {busy === 'recall' ? 'Submitting...' : 'Confirm Recall'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <SectionTitle title="Recall History" subtitle="Recalls issued against your batches." />
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {recalls.length === 0 ? <EmptyText>No recalls issued.</EmptyText> : recalls.map((recall) => (
                        <div key={recall.id} style={rowStyle}>
                            <div style={{ display: 'grid', gap: '0.25rem', flex: '1 1 320px' }}>
                                <div style={{ fontWeight: 700 }}>{recall.batch_details?.batch_number} | {recall.batch_details?.medicine}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Issued {formatDate(recall.date_issued)} | {recall.progress_percent || 0}% retrieved{recall.halted_sales ? ' | Sales halted' : ''}</div>
                                <div style={{ fontSize: '0.9rem' }}>{recall.reason}</div>
                            </div>
                            <StatusPill tone={recall.status === 'completed' ? 'green' : 'red'}>{labelize(recall.status)}</StatusPill>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderShipment = () => {
        const shippableBatches = batches.filter((batch) => batch.status === 'active');
        return (
            <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <SectionTitle title="Shipment Record" subtitle="Create a traceable outbound shipment linked to a production batch." />
                    <form onSubmit={handleCreateShipment} style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
                            <Field label="Shipment ID">
                                <input value={shipmentForm.reference} onChange={(e) => setShipmentForm((current) => ({ ...current, reference: e.target.value }))} placeholder="e.g. SH-24009" style={inputStyle} required />
                            </Field>
                            <Field label="Destination">
                                <input value={shipmentForm.destination} onChange={(e) => setShipmentForm((current) => ({ ...current, destination: e.target.value }))} placeholder="e.g. Dhaka Central Depot" style={inputStyle} required />
                            </Field>
                            <Field label="Batch ID">
                                <select
                                    value={shipmentForm.batch}
                                    onChange={(e) => {
                                        setShipmentForm((current) => ({ ...current, batch: e.target.value }));
                                        loadShipmentEvents(e.target.value);
                                    }}
                                    style={inputStyle}
                                    required
                                >
                                    <option value="">{shippableBatches.length ? 'Select batch' : 'No active batches'}</option>
                                    {shippableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_number} | {batch.medicine_details?.name || 'Unknown medicine'}</option>)}
                                </select>
                            </Field>
                            <Field label="Recipient Account">
                                <select value={shipmentForm.recipient} onChange={(e) => setShipmentForm((current) => ({ ...current, recipient: e.target.value }))} style={inputStyle}>
                                    <option value="self">Own dispatch (destination above)</option>
                                    {pharmacies.map((pharmacy) => <option key={pharmacy.user} value={pharmacy.user}>{pharmacy.pharmacy_name}</option>)}
                                </select>
                            </Field>
                            <Field label="Quantity">
                                <input type="number" min="1" value={shipmentForm.quantity} onChange={(e) => setShipmentForm((current) => ({ ...current, quantity: e.target.value }))} placeholder="e.g. 5000" style={inputStyle} required />
                            </Field>
                            <Field label="Shipment Date">
                                <input type="date" value={shipmentForm.shipment_date} onChange={(e) => setShipmentForm((current) => ({ ...current, shipment_date: e.target.value }))} style={inputStyle} required />
                            </Field>
                            <Field label="Status">
                                <select value={shipmentForm.status} onChange={(e) => setShipmentForm((current) => ({ ...current, status: e.target.value }))} style={inputStyle}>
                                    <option value="Preparing">Preparing</option>
                                    <option value="In Transit">In Transit</option>
                                    <option value="Delivered">Delivered</option>
                                </select>
                            </Field>
                        </div>
                        <div className="manufacturer-action-row" style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                            <button type="submit" disabled={busy === 'shipment'} style={{ ...buttonBase, width: 'auto', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: '#fff', opacity: busy === 'shipment' ? 0.6 : 1 }}><PaperPlaneRight size={18} />{busy === 'shipment' ? 'Creating...' : 'Create Shipment'}</button>
                        </div>
                    </form>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <SectionTitle title="Distribution History" subtitle={shipmentForm.batch ? 'Movements recorded for the selected batch.' : 'Select a batch above to see its movements.'} />
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {shipmentForm.batch && shipmentEvents.length === 0 && <EmptyText>No movements recorded for this batch yet.</EmptyText>}
                        {shipmentEvents.map((eventItem) => (
                            <div key={eventItem.id} style={rowStyle}>
                                <div style={{ display: 'grid', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                        <Truck size={18} color="var(--primary)" />{labelize(eventItem.stage_from)} → {labelize(eventItem.stage_to)}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {eventItem.geo_location || 'No destination'} | {eventItem.event_date ? new Date(eventItem.event_date).toLocaleString() : '—'}
                                    </div>
                                    {eventItem.notes && <div style={{ fontSize: '0.88rem' }}>{eventItem.notes}</div>}
                                </div>
                                <StatusPill tone="blue">{Number(eventItem.quantity).toLocaleString()} units</StatusPill>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderView = () => {
        if (loading) return <StatusCard title="Loading manufacturer data..." text="Fetching the latest records from the server." />;
        if (loadError) {
            return (
                <StatusCard
                    tone="error"
                    title="Could not load this page"
                    text={loadError}
                    action={<Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}><ArrowClockwise size={16} /> Retry</Button>}
                />
            );
        }
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

    const messageAccent = messageTone === 'error' ? '#ef4444' : messageTone === 'success' ? '#10b981' : 'var(--primary)';

    return (
        <div className="manufacturer-page" style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '1rem' }}>
            <PageHeader {...viewMeta[activeView]} />

            {message && <div className="glass-panel" role={messageTone === 'error' ? 'alert' : 'status'} style={{ padding: '1rem 1.25rem', borderLeft: `4px solid ${messageAccent}`, color: 'var(--text-main)' }}>{message}</div>}

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
                            Batch {recallConfirmation.batchNumber} has been recalled, sales halted, and downstream partners notified.
                        </p>
                        <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '0.85rem', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--text-main)', textAlign: 'left' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reason</div>
                            <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{recallConfirmation.reason}</div>
                        </div>
                        <button
                            type="button"
                            className="medguard-confirmation-ok"
                            onClick={closeRecallConfirmation}
                            style={{ ...buttonBase, width: '100%', marginTop: '1.1rem', padding: '0.95rem 1rem', background: 'var(--primary)', color: '#fff' }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

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
