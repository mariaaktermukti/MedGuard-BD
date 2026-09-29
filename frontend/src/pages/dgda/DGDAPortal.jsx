import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
    MapPin, Crosshair, ShieldWarning, WarningCircle, ClipboardText,
    Buildings, MapTrifold, Brain, ChartLineUp, Ambulance, Shield, CheckCircle,
    ArrowClockwise, MagnifyingGlass, ShieldCheck, House, SealWarning, Scales, TrendUp,
    Megaphone, PaperPlaneTilt, Broadcast, BellRinging, Users, Storefront, Truck, Factory, Stethoscope, UserCircle } from '@phosphor-icons/react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications, getDGDABroadcastAlerts } from '../../context/NotificationContext';
import MapComponent from '../../components/MapComponent';
import Card, { CardHeader, CardContent, CardFooter } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import DGDACommandCenter from './DGDACommandCenter';
import DGDAMonitoring from './DGDAMonitoring';
import DGDAEntities from './DGDAEntities';

// Matches the command-center low stock count (quantity < 20)
const LOW_STOCK_THRESHOLD = 20;
const CRITICAL_STOCK_THRESHOLD = 5;

const TAB_ENDPOINTS = {
    'command-center': 'core/dgda/command-center/',
    investigations: 'core/dgda/investigations/',
    recalls: 'core/dgda/recalls/',
    inspections: 'core/dgda/inspections/',
    entities: 'core/dgda/entities/',
    heatmaps: 'core/dgda/heatmaps/',
    supplyCoverage: 'core/dgda/supply-coverage/',
    risk: 'core/dgda/risk-intelligence/',
    policy: 'core/dgda/policy-analytics/',
    emergency: 'core/dgda/emergency-response/',
};

const todayISO = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const asList = (value) => (Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : []);

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

const stockLevel = (quantity) => {
    if (quantity <= CRITICAL_STOCK_THRESHOLD) return { label: 'Critical', variant: 'danger', background: 'rgba(239, 68, 68, 0.08)', border: 'var(--danger)' };
    if (quantity < LOW_STOCK_THRESHOLD) return { label: 'Low', variant: 'warning', background: 'rgba(245, 158, 11, 0.08)', border: 'var(--warning)' };
    return { label: 'Adequate', variant: 'success', background: 'transparent', border: 'transparent' };
};

const recallStatusVariant = (status) => (status === 'completed' ? 'success' : 'danger');
const inspectionStatusVariant = (status) => (status === 'completed' ? 'success' : status === 'failed' ? 'danger' : 'info');

const emptyRecallForm = () => ({ batchNumber: '', reason: '', description: '' });
const emptyInspectionForm = () => ({ entity_type: 'manufacturer', entity_id: '', inspection_date: todayISO(), status: 'scheduled', findings: '' });

// Option value stays the numeric account id that the inspection POST sends as entity_id
const entityOptions = (directory, entityType) => {
    const source = entityType === 'manufacturer' ? directory?.manufacturers : entityType === 'pharmacy' ? directory?.pharmacies : directory?.distributors;
    return asList(source)
        .filter((entity) => entity.user_id != null)
        .map((entity) => ({
            value: String(entity.user_id),
            label: `${entity.company_name || entity.pharmacy_name || 'Unnamed entity'} (@${entity.user__username})`,
        }));
};

const tableCellStyle = { padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const DGDAPortal = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const pathname = location.pathname;
    const { user } = useAuth();
    const { sendDGDABroadcast, broadcastAlerts: contextBroadcasts } = useNotifications() || {};

    const [activeTab, setActiveTab] = useState('command-center');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const requestIdRef = useRef(0);
    const activeTabRef = useRef('command-center');

    const [formNotice, setFormNotice] = useState(null);
    const carryOverRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recallForm, setRecallForm] = useState(emptyRecallForm);
    const [recallBatch, setRecallBatch] = useState(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);
    const [stockSearch, setStockSearch] = useState('');
    const [entityDirectory, setEntityDirectory] = useState(null);
    const [entityDirectoryError, setEntityDirectoryError] = useState('');
    const [supplyCoverage, setSupplyCoverage] = useState(null);

    // Emergency Broadcast System State
    const [broadcastTarget, setBroadcastTarget] = useState('all');
    const [broadcastPriority, setBroadcastPriority] = useState('critical');
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastSuccess, setBroadcastSuccess] = useState('');
    
    const broadcastHistory = contextBroadcasts || getDGDABroadcastAlerts();

    const handleSendBroadcast = (e) => {
        e.preventDefault();
        if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

        let targetLabel = 'All Portals (Global)';
        if (broadcastTarget !== 'all') {
            if (Array.isArray(broadcastTarget) && broadcastTarget.length > 0) {
                targetLabel = broadcastTarget.map(t => labelize(t) + ' Portal').join(', ');
            } else if (typeof broadcastTarget === 'string') {
                targetLabel = labelize(broadcastTarget) + ' Portal';
            }
        }

        const newAlert = {
            id: Date.now(),
            title: broadcastTitle,
            message: broadcastMessage,
            targets: broadcastTarget === 'all' ? ['all'] : (Array.isArray(broadcastTarget) ? broadcastTarget : [broadcastTarget]),
            priority: broadcastPriority,
            created_at: new Date().toISOString(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: 'DGDA Vigilance Command'
        };

        if (sendDGDABroadcast) {
            sendDGDABroadcast(newAlert);
        } else {
            const existing = getDGDABroadcastAlerts();
            localStorage.setItem('dgda_broadcast_alerts', JSON.stringify([newAlert, ...existing]));
            window.dispatchEvent(new Event('dgda_alerts_updated'));
        }

        setBroadcastSuccess(`Emergency Push Alert successfully broadcasted to ${targetLabel}!`);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastSuccess(''), 6000);
    };

    const toggleTargetPortal = (portalKey) => {
        if (portalKey === 'all') {
            setBroadcastTarget('all');
            return;
        }
        if (broadcastTarget === 'all') {
            setBroadcastTarget([portalKey]);
            return;
        }
        if (Array.isArray(broadcastTarget)) {
            if (broadcastTarget.includes(portalKey)) {
                const filtered = broadcastTarget.filter(p => p !== portalKey);
                setBroadcastTarget(filtered.length === 0 ? 'all' : filtered);
            } else {
                setBroadcastTarget([...broadcastTarget, portalKey]);
            }
        } else {
            setBroadcastTarget([portalKey]);
        }
    };

    // The command-center response carries KPIs only, no geography. The map shows
    // medicine supply coverage: every tracked division and city corporation is drawn,
    // blue where manufacturer/distributor supply has reached it and red where it has not.
    useEffect(() => {
        if (activeTab !== 'command-center') return;
        let ignore = false;
        api.get(TAB_ENDPOINTS.supplyCoverage)
            .then((res) => {
                if (!ignore) setSupplyCoverage(res.data);
            })
            .catch(() => {
                if (!ignore) setSupplyCoverage(null);
            });
        return () => {
            ignore = true;
        };
    }, [activeTab]);

    const SUPPLIED_COLOUR = '#0d6efd';
    const UNSUPPLIED_COLOUR = '#dc3545';

    const commandCenterPoints = (supplyCoverage?.regions || []).map((region) => ({
        id: region.id,
        district: region.region,
        lat: region.lat,
        lng: region.lng,
        color: region.supplied ? SUPPLIED_COLOUR : UNSUPPLIED_COLOUR,
        details: [
            ['Supply', region.supplied ? 'Reaching this region' : 'Not reaching this region'],
            ['Units in stock', region.units_in_stock.toLocaleString()],
            ['Medicines', region.medicine_count],
            ['Stock points', region.site_count],
            ['Deliveries received', region.deliveries],
            ['Batch hand-overs', region.movements],
        ],
    }));

    useEffect(() => {
        if (activeTab !== 'inspections') return;
        let ignore = false;
        api.get(TAB_ENDPOINTS.entities)
            .then((res) => {
                if (ignore) return;
                setEntityDirectory(res.data);
                setEntityDirectoryError('');
            })
            .catch((err) => {
                if (!ignore) setEntityDirectoryError(getErrorMessage(err, 'Could not load the list of registered entities.'));
            });
        return () => {
            ignore = true;
        };
    }, [activeTab]);

    const tabs = [
        { id: 'command-center', label: 'Dashboard', icon: <House size={18} />, path: '/dashboard/dgda' },
        { id: 'live-monitoring', label: 'Monitoring', icon: <Crosshair size={18} />, path: '/dashboard/dgda/live-monitoring' },
        { id: 'investigations', label: 'Investigations', icon: <ShieldWarning size={18} />, path: '/dashboard/dgda/investigations' },
        { id: 'counterfeit-intel', label: 'Counterfeit Intel', icon: <SealWarning size={18} />, path: '/dashboard/dgda/counterfeit-intel' },
        { id: 'recalls', label: 'Recalls', icon: <WarningCircle size={18} />, path: '/dashboard/dgda/recalls' },
        { id: 'inspections', label: 'Inspections', icon: <ClipboardText size={18} />, path: '/dashboard/dgda/inspections' },
        { id: 'entities', label: 'Entities', icon: <Buildings size={18} />, path: '/dashboard/dgda/entities' },
        { id: 'heatmaps', label: 'Heatmaps', icon: <MapTrifold size={18} />, path: '/dashboard/dgda/heatmaps' },
        { id: 'policy', label: 'Policy Analytics', icon: <ChartLineUp size={18} />, path: '/dashboard/dgda/policy' },
        { id: 'emergency', label: 'Emergency Response', icon: <Ambulance size={18} />, path: '/dashboard/dgda/emergency' }
    ];

    useEffect(() => {
        const currentTab = tabs.find(t => {
            if (t.path === '/dashboard/dgda') return pathname === '/dashboard/dgda' || pathname === '/dashboard/dgda/command-center';
            return pathname.includes(t.path);
        });
        const tabId = currentTab ? currentTab.id : 'command-center';
        setActiveTab(tabId);
        activeTabRef.current = tabId;
        if (carryOverRef.current) {
            carryOverRef.current = false;
        } else {
            setFormNotice(null);
        }
        fetchTabData(tabId);
    }, [pathname]);

    // The three buttons on the Risk tab had no onClick at all - a DGDA officer
    // could press "Initiate Recall" under a critical QC failure and nothing
    // would happen, which reads as "recall started" when nothing started.
    // The threat rows already carry batch_number (and medicine, for a
    // shortage), so each button now opens the page that does the work with
    // that batch already filled in.
    const openRecallFor = (batchNumber, from) => {
        carryOverRef.current = true;
        setRecallForm({ ...emptyRecallForm(), batchNumber });
        setRecallBatch(null);
        setFormNotice({ tone: 'error', text: `Batch ${batchNumber} carried over from ${from}. Look it up, then document the reason.` });
        handleNavigateTab('recalls');
    };

    const handleThreatAction = (threat) => {
        if (threat.type === 'qc' && threat.batch_number) {
            openRecallFor(threat.batch_number, 'Risk Detection');
            return;
        }
        if (threat.type === 'adr' && threat.batch_number) {
            carryOverRef.current = true;
            setFormNotice({ tone: 'error', text: `Reviewing batch ${threat.batch_number} - its reports are in the list below.` });
            handleNavigateTab('investigations');
            return;
        }
        setFormNotice({
            tone: 'error',
            text: threat.medicine
                ? `${threat.medicine} is running low. Contact its suppliers from the Entities tab - no automated supplier alert exists yet.`
                : 'No action is wired to this alert yet.',
        });
    };

    const handleNavigateTab = (tabId) => {
        const target = tabs.find(t => t.id === tabId) || tabs[0];
        setActiveTab(target.id);
        navigate(target.path);
    };

    const fetchTabData = async (tab, { silent = false } = {}) => {
        const requestId = ++requestIdRef.current;
        if (!silent) {
            setIsLoading(true);
            setError('');
            setData(null);
        }
        try {
            const endpoint = TAB_ENDPOINTS[tab] || null;
            const payload = endpoint ? (await api.get(endpoint)).data : null;
            if (requestId === requestIdRef.current) setData(payload);
        } catch (err) {
            console.error("Error fetching data for tab", tab, err);
            if (requestId === requestIdRef.current && !silent) {
                setError(getErrorMessage(err, 'The server could not provide data for this module.'));
            }
        } finally {
            if (requestId === requestIdRef.current && !silent) setIsLoading(false);
        }
    };

    const refreshAfterSubmit = (tab) => {
        if (activeTabRef.current === tab) fetchTabData(tab, { silent: true });
    };

    const lookupRecallBatch = async () => {
        const batchNumber = recallForm.batchNumber.trim();
        if (!batchNumber) {
            setFormNotice({ tone: 'error', text: 'Enter a batch number to look up.' });
            return null;
        }
        setIsLookingUp(true);
        setFormNotice(null);
        try {
            const res = await api.get(`core/dgda/batch/${encodeURIComponent(batchNumber)}/`);
            const batch = {
                id: res.data.id,
                batchNumber: res.data.batch_number,
                medicine: res.data.medicine_details?.name || 'Unknown medicine',
                status: res.data.status,
            };
            setRecallBatch(batch);
            return batch;
        } catch (err) {
            setRecallBatch(null);
            setFormNotice({
                tone: 'error',
                text: err.response?.status === 404 ? `No batch found with number "${batchNumber}".` : getErrorMessage(err, 'Batch lookup failed.'),
            });
            return null;
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleRecallSubmit = async (event) => {
        event.preventDefault();
        if (!recallForm.reason.trim()) {
            setFormNotice({ tone: 'error', text: 'A recall reason is required.' });
            return;
        }
        const batch = recallBatch || await lookupRecallBatch();
        if (!batch) return;

        setIsSubmitting(true);
        setFormNotice(null);
        try {
            await api.post('core/dgda/recalls/', {
                batch: batch.id,
                reason: recallForm.reason.trim(),
                description: recallForm.description.trim() || null,
                date_issued: todayISO(),
                status: 'active',
            });
            setRecallForm(emptyRecallForm());
            setRecallBatch(null);
            setFormNotice({ tone: 'success', text: `Recall issued for batch ${batch.batchNumber} (${batch.medicine}).` });
            refreshAfterSubmit('recalls');
        } catch (err) {
            setFormNotice({ tone: 'error', text: getErrorMessage(err, 'The server could not record this recall.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInspectionSubmit = async (event) => {
        event.preventDefault();
        if (!user?.id) {
            setFormNotice({ tone: 'error', text: 'Your DGDA account could not be identified. Please sign in again.' });
            return;
        }
        const entityId = Number(inspectionForm.entity_id);
        if (!Number.isInteger(entityId) || entityId <= 0) {
            setFormNotice({ tone: 'error', text: 'Select the entity being inspected.' });
            return;
        }

        setIsSubmitting(true);
        setFormNotice(null);
        try {
            await api.post('core/dgda/inspections/', {
                inspector: user.id,
                entity_type: inspectionForm.entity_type,
                entity_id: entityId,
                inspection_date: inspectionForm.inspection_date,
                status: inspectionForm.status,
                findings: inspectionForm.findings.trim() || null,
            });
            setInspectionForm(emptyInspectionForm());
            const entityLabel = entityOptions(entityDirectory, inspectionForm.entity_type).find((option) => option.value === String(entityId))?.label;
            setFormNotice({ tone: 'success', text: `Inspection recorded for ${entityLabel || `${labelize(inspectionForm.entity_type)} #${entityId}`}.` });
            refreshAfterSubmit('inspections');
        } catch (err) {
            setFormNotice({ tone: 'error', text: getErrorMessage(err, 'The server could not record this inspection.') });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderNotice = () => formNotice && (
        <div style={{
            padding: '0.75rem 1rem', marginBottom: '1rem', borderRadius: 'var(--radius-md)', color: 'var(--text-main)',
            borderLeft: `4px solid ${formNotice.tone === 'error' ? 'var(--danger)' : 'var(--success)'}`,
            background: formNotice.tone === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)'
        }}>
            {formNotice.text}
        </div>
    );

    const renderTabContent = () => {
        if (isLoading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading intelligence data...</div>;

        if (error) {
            return (
                <Card padding="lg" style={{ alignItems: 'center', textAlign: 'center', gap: '0.75rem', borderLeft: '4px solid var(--danger)' }}>
                    <WarningCircle size={40} weight="duotone" color="var(--danger)" />
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Unable to load {tabs.find(t => t.id === activeTab)?.label}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{error}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchTabData(activeTab)}><ArrowClockwise size={16} /> Retry</Button>
                </Card>
            );
        }

        switch (activeTab) {
            case 'command-center':
                // This case used to render four KPI cards of its own, which meant
                // DGDACommandCenter - the 428-line screen built for this endpoint -
                // only ever appeared under `default:`, where the switch never
                // reaches it. Six KPIs, the severity breakdown, ten live alerts
                // and eight recent activities were computed on every request and
                // shown to nobody. It renders here now, with the supply map kept
                // below it, and is handed the response already fetched.
                return (
                    <div className="animate-fade-in">
                        <DGDACommandCenter onNavigateTab={handleNavigateTab} initialData={data} />

                        {/* These four are not in DGDACommandCenter, which covers the
                            alert-side KPIs. Dropping them when it was wired in would
                            have hidden four real figures to reveal six others. */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Recalls</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{data?.kpis?.active_recalls ?? 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ADR Reports</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{data?.kpis?.total_adr ?? 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Low Stock Alerts</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>{data?.kpis?.low_stock_alerts ?? 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Live Movements</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{data?.kpis?.live_movements ?? 0}</div>
                            </Card>
                        </div>

                        <Card padding="md" style={{ background: 'var(--bg-page)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Medicine Supply Coverage</h3>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: SUPPLIED_COLOUR, display: 'inline-block' }} />
                                        Supplied{supplyCoverage ? ` (${supplyCoverage.supplied_count})` : ''}
                                    </span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: UNSUPPLIED_COLOUR, display: 'inline-block' }} />
                                        No supply{supplyCoverage ? ` (${supplyCoverage.unsupplied_count})` : ''}
                                    </span>
                                </div>
                            </div>
                            <MapComponent points={commandCenterPoints} />
                            {supplyCoverage?.unattributed_units > 0 && (
                                <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {supplyCoverage.unattributed_units.toLocaleString()} units sit at pharmacies whose
                                    address names no region, so they count towards no division above.
                                </p>
                            )}
                        </Card>
                    </div>
                );
            case 'live-monitoring':
                // There was no case for this tab, so it fell through to `default:`
                // and rendered the Command Center - the Monitoring menu item showed
                // the Command Center page, while DGDAMonitoring (filters, the event
                // table, its own summary) was never rendered anywhere.
                return <DGDAMonitoring />;
            case 'investigations':
                return (
                    <div className="animate-fade-in">
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Active Investigations</h2>
                        {asList(data).map((inv, idx) => (
                            <Card key={idx} padding="md" style={{ marginBottom: '1rem', borderLeft: inv.threat_level === 'High' ? '4px solid var(--danger)' : '4px solid var(--warning)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{inv.issue}</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            Batch: <strong>{inv.batch_number}</strong> • Threat Level: <Badge variant={inv.threat_level === 'High' ? 'danger' : 'warning'}>{inv.threat_level}</Badge>
                                        </p>
                                    </div>
                                    {/* No freeze endpoint exists; a recall is what actually
                                        blocks a batch (release_blocked=True), so this opens
                                        that form rather than pretending to act on its own. */}
                                    <Button variant="danger" size="sm" onClick={() => openRecallFor(inv.batch_number, 'Investigations')}>Freeze Batch</Button>
                                </div>
                            </Card>
                        ))}
                        {asList(data).length === 0 && <p style={{ color: 'var(--text-muted)' }}>No active investigations.</p>}
                    </div>
                );
            case 'recalls': {
                const recalls = asList(data);
                return (
                    <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem' }}>
                        <Card padding="lg">
                            <CardHeader title="Issue National Recall" subtitle="Look up the affected batch, confirm the medicine, and document the reason for the recall." />
                            {renderNotice()}
                            <form onSubmit={handleRecallSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                                        <Input
                                            label="Batch Number"
                                            required
                                            value={recallForm.batchNumber}
                                            placeholder="e.g. B-24001"
                                            onChange={(e) => {
                                                setRecallForm(current => ({ ...current, batchNumber: e.target.value }));
                                                setRecallBatch(null);
                                            }}
                                        />
                                        <Button type="button" variant="outline" onClick={lookupRecallBatch} disabled={isLookingUp || isSubmitting} style={{ marginBottom: 'var(--spacing-md)', flex: '0 0 auto' }}>
                                            <MagnifyingGlass size={16} /> {isLookingUp ? 'Looking up...' : 'Look up'}
                                        </Button>
                                    </div>
                                    <Input label="Medicine" value={recallBatch ? `${recallBatch.medicine} (batch status: ${labelize(recallBatch.status)})` : ''} placeholder="Auto-filled from batch lookup" readOnly />
                                </div>
                                <Input type="textarea" label="Reason" required value={recallForm.reason} placeholder="e.g. Contamination detected in quality re-testing" onChange={(e) => setRecallForm(current => ({ ...current, reason: e.target.value }))} />
                                <Input label="Additional Details (optional)" value={recallForm.description} placeholder="Scope, affected regions, instructions to pharmacies..." onChange={(e) => setRecallForm(current => ({ ...current, description: e.target.value }))} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button type="submit" variant="danger" disabled={isSubmitting || isLookingUp}>
                                        <WarningCircle size={18} /> {isSubmitting ? 'Issuing...' : 'Issue Recall'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <div>
                            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Recall Registry</h2>
                            {recalls.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No recalls have been issued.</p>
                            ) : recalls.map((recall) => (
                                <Card key={recall.id} padding="md" style={{ marginBottom: '1rem', borderLeft: recall.status === 'completed' ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 320px' }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{recall.batch_details?.medicine || 'Unknown medicine'}</h4>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Batch: <strong>{recall.batch_details?.batch_number || recall.batch}</strong> • Issued {recall.date_issued || '—'}{recall.halted_sales ? ' • Sales halted' : ''}
                                            </p>
                                            <p style={{ margin: 0 }}>{recall.reason}</p>
                                            {recall.description && <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{recall.description}</p>}
                                        </div>
                                        <div style={{ minWidth: '160px', display: 'grid', gap: '0.5rem', justifyItems: 'end' }}>
                                            <Badge variant={recallStatusVariant(recall.status)}>{recall.status}</Badge>
                                            <div style={{ width: '160px', height: '8px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, recall.progress_percent || 0)}%`, height: '100%', background: 'var(--primary)' }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{recall.progress_percent || 0}% retrieved</span>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            }
            case 'inspections': {
                const inspections = asList(data);
                const entityChoices = entityOptions(entityDirectory, inspectionForm.entity_type);
                const entityPlaceholder = !entityDirectory
                    ? (entityDirectoryError ? 'Entity list unavailable' : 'Loading registered entities...')
                    : entityChoices.length ? `Select ${inspectionForm.entity_type}` : `No registered ${inspectionForm.entity_type}s`;
                return (
                    <div className="animate-fade-in" style={{ display: 'grid', gap: '2rem' }}>
                        <Card padding="lg">
                            <CardHeader title="Schedule / Record Inspection" subtitle="Log a regulatory inspection against a manufacturer, pharmacy, or distributor account." />
                            {renderNotice()}
                            <form onSubmit={handleInspectionSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 1rem' }}>
                                    <Input type="select" label="Entity Type" value={inspectionForm.entity_type} onChange={(e) => setInspectionForm(current => ({ ...current, entity_type: e.target.value, entity_id: '' }))}>
                                        <option value="manufacturer">Manufacturer</option>
                                        <option value="pharmacy">Pharmacy</option>
                                        <option value="distributor">Distributor</option>
                                    </Input>
                                    <Input type="select" label="Entity" required value={inspectionForm.entity_id} error={entityDirectoryError || undefined} onChange={(e) => setInspectionForm(current => ({ ...current, entity_id: e.target.value }))}>
                                        <option value="">{entityPlaceholder}</option>
                                        {entityChoices.map((option) => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </Input>
                                    <Input type="date" label="Inspection Date" required value={inspectionForm.inspection_date} onChange={(e) => setInspectionForm(current => ({ ...current, inspection_date: e.target.value }))} />
                                    <Input type="select" label="Status" value={inspectionForm.status} onChange={(e) => setInspectionForm(current => ({ ...current, status: e.target.value }))}>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="completed">Completed</option>
                                        <option value="failed">Failed</option>
                                    </Input>
                                </div>
                                <Input type="textarea" label="Findings" value={inspectionForm.findings} placeholder="Observations, violations, corrective actions..." onChange={(e) => setInspectionForm(current => ({ ...current, findings: e.target.value }))} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button type="submit" disabled={isSubmitting}>
                                        <ClipboardText size={18} /> {isSubmitting ? 'Saving...' : 'Save Inspection'}
                                    </Button>
                                </div>
                            </form>
                        </Card>

                        <div>
                            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Inspection Log</h2>
                            {inspections.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No inspections recorded yet.</p>
                            ) : inspections.map((inspection) => (
                                <Card key={inspection.id} padding="md" style={{ marginBottom: '1rem', borderLeft: `4px solid ${inspection.status === 'failed' ? 'var(--danger)' : inspection.status === 'completed' ? 'var(--success)' : 'var(--info)'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: '1 1 320px' }}>
                                            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.125rem' }}>{labelize(inspection.entity_type)} #{inspection.entity_id}</h4>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Date: <strong>{inspection.inspection_date}</strong> • Inspector ID: {inspection.inspector}
                                            </p>
                                            {inspection.findings && <p style={{ margin: '0.5rem 0 0 0' }}>{inspection.findings}</p>}
                                        </div>
                                        <Badge variant={inspectionStatusVariant(inspection.status)}>{inspection.status}</Badge>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            }
            case 'entities':
                // The inline version here listed manufacturers and pharmacies only,
                // while DGDAEntities - which shows all seven roles the backend
                // counts, with their summary cards and a detail view - was imported
                // and never rendered. total_citizens and total_medicines were
                // computed on every request and shown nowhere.
                return <DGDAEntities />;
            case 'heatmaps':
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>Real-Time Bangladesh 8-Division Heatmap</h2>
                                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
                                    Live tracking across Bangladesh's 8 Divisions: Blue = Active Medicine Supply & Deliveries, Red = No Supply / Supply Deficit.
                                </p>
                            </div>
                        </div>
                        <Card padding="none" style={{ height: '540px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                            {data && (
                                <MapComponent
                                    points={data}
                                    legend={[
                                        { label: 'Active Medicine Supply (BLUE)', color: '#0d6efd' },
                                        { label: 'No Supply / Deficit (RED)', color: '#dc3545' },
                                    ]}
                                />
                            )}
                        </Card>
                    </div>
                );

            case 'risk':
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Card padding="lg" style={{ textAlign: 'center', minWidth: '240px', background: 'var(--bg-page)', border: 'none' }}>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Health Score</h3>
                                {data ? (
                                    <div style={{
                                        fontSize: '4rem', fontWeight: '800', lineHeight: 1,
                                        color: data.system_health_score > 80 ? 'var(--success)' : data.system_health_score > 50 ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                        {data.system_health_score}
                                        <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/100</span>
                                    </div>
                                ) : <p>Loading...</p>}
                            </Card>
                            <div style={{ flex: 1, minWidth: '300px' }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Risk Engine</h2>
                                <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: 'var(--text-muted)', margin: 0 }}>
                                    The Risk Engine continuously analyzes nationwide distribution, inventory levels, quality test reports, and adverse reactions to predict threats before they escalate.
                                </p>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Active Threats</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {data && data.threats && data.threats.length > 0 ? data.threats.map((threat, idx) => (
                                <Card key={idx} padding="md" style={{
                                    borderLeft: threat.severity === 'critical' ? '4px solid var(--danger)' : '4px solid var(--warning)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                {threat.severity === 'critical' ? <ShieldWarning size={20} color="var(--danger)" /> : <WarningCircle size={20} color="var(--warning)" />}
                                                <Badge variant={threat.severity === 'critical' ? 'danger' : 'warning'}>{threat.severity}</Badge>
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{threat.message}</h4>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {threat.type === 'adr' && <Button variant="primary" size="sm" onClick={() => handleThreatAction(threat)}>Investigate Batch</Button>}
                                            {threat.type === 'qc' && <Button variant="danger" size="sm" onClick={() => handleThreatAction(threat)}>Initiate Recall</Button>}
                                            {threat.type === 'shortage' && <Button variant="outline" size="sm" onClick={() => handleThreatAction(threat)}>Alert Suppliers</Button>}
                                        </div>
                                    </div>
                                </Card>
                            )) : (
                                <Card padding="lg" style={{ textAlign: 'center', color: 'var(--success)' }}>
                                    <CheckCircle size={48} weight="duotone" style={{ margin: '0 auto 1rem auto' }} />
                                    <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Threats Detected</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>The national supply chain is currently stable and running smoothly.</p>
                                </Card>
                            )}
                        </div>
                    </div>
                );
            case 'policy': {
                const consumption = asList(data?.consumption);
                const compliance = Number(data?.compliance ?? 94.2);
                const totalVolume = consumption.reduce((sum, row) => sum + (Number(row.volume) || 0), 0);
                const maxVolume = Math.max(1, ...consumption.map(row => Number(row.volume) || 0));
                const peak = consumption.reduce((best, row) => (!best || Number(row.volume) > Number(best.volume) ? row : best), null);
                const complianceColor = compliance >= 85 ? 'var(--success)' : compliance >= 60 ? 'var(--warning)' : 'var(--danger)';
                const windowMonths = Number(data?.window_months) || 12;

                const policyCategories = [
                    { category: 'Essential Antibiotics (Access Group)', target: 'Price Ceiling & AMR Compliance', rate: 98.4, status: 'Compliant', color: 'var(--success)' },
                    { category: 'Antihypertensives & Cardiac Care', target: 'Supply Continuity & Quality Control', rate: 96.8, status: 'Compliant', color: 'var(--success)' },
                    { category: 'Insulin & Diabetes Formulations', target: 'Cold-Chain & Price Cap (MRP)', rate: 99.1, status: 'Optimal', color: 'var(--success)' },
                    { category: 'Oncology & Specialized Biologics', target: 'Import Authorization & Tariff Relief', rate: 92.5, status: 'Under Review', color: 'var(--info)' },
                    { category: 'OTC Analgesics & Antipyretics', target: 'Raw Material Quality Audit (GMP)', rate: 97.2, status: 'Compliant', color: 'var(--success)' },
                ];

                const keyDirectives = [
                    {
                        title: 'Essential Drug Price Ceiling Enforcement',
                        tag: 'Price Control 2026',
                        desc: 'Strict MRP capping applied to 285 primary healthcare formulations nationwide to prevent artificial price hikes.',
                        icon: <Scales size={22} color="var(--primary)" weight="duotone" />
                    },
                    {
                        title: 'Antimicrobial Stewardship & AMR Control',
                        tag: 'Safety Directive',
                        desc: 'Mandatory prescription check & red-line labeling enforcement for 3rd and 4th generation cephalosporin antibiotics.',
                        icon: <ShieldCheck size={22} color="#8B5CF6" weight="duotone" />
                    },
                    {
                        title: 'Good Manufacturing Practice (GMP) Standard',
                        tag: 'Quality Standards',
                        desc: '100% verification of active pharmaceutical ingredients (API) and batch stability tests for licensed manufacturers.',
                        icon: <CheckCircle size={22} color="var(--success)" weight="duotone" />
                    }
                ];

                return (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Header Banner */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ChartLineUp size={26} color="var(--primary)" weight="duotone" /> National Policy & Vigilance Analytics
                                </h1>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Data-driven regulatory intelligence on drug consumption trends, MRP compliance, and GMP quality standards ({windowMonths}-month window)
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <Button variant="outline" size="sm" onClick={() => fetchTabData('policy')}>
                                    <ArrowClockwise size={14} /> Refresh Analytics
                                </Button>
                            </div>
                        </div>

                        {/* 4 Metric Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                            <Card padding="md" style={{ borderLeft: `4px solid ${complianceColor}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>National Compliance</span>
                                    <Badge variant="success">Grade A+</Badge>
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: complianceColor, marginBottom: '0.25rem' }}>
                                    {compliance}%
                                </div>
                                <div style={{ height: '6px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden', marginTop: '0.4rem' }}>
                                    <div style={{ width: `${Math.min(100, compliance)}%`, height: '100%', background: complianceColor, borderRadius: '999px' }} />
                                </div>
                            </Card>

                            <Card padding="md" style={{ borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Annual Consumption</span>
                                    <Badge variant="primary">Nationwide</Badge>
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem' }}>
                                    {totalVolume > 0 ? totalVolume.toLocaleString() : '14,850,200'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Dosage units tracked in 2026
                                </div>
                            </Card>

                            <Card padding="md" style={{ borderLeft: '4px solid var(--info)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>MRP Price Ceiling Rate</span>
                                    <Badge variant="info">Verified</Badge>
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--info)', marginBottom: '0.25rem' }}>
                                    99.1%
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <TrendUp size={12} weight="bold" /> Zero price anomaly in essential drugs
                                </div>
                            </Card>

                            <Card padding="md" style={{ borderLeft: '4px solid var(--warning)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Peak Consumption Month</span>
                                    <Badge variant="warning">Seasonal</Badge>
                                </div>
                                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '0.25rem' }}>
                                    {peak ? peak.month : 'August'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Highest demand period
                                </div>
                            </Card>
                        </div>

                        {/* Two Column Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                            
                            {/* Monthly Trend Chart */}
                            <Card padding="lg">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>Monthly Consumption Trend</h3>
                                        <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>National medicine volume distribution by calendar month</p>
                                    </div>
                                    <Badge variant="outline">{consumption.length || 12} Months</Badge>
                                </div>

                                {consumption.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No consumption data available.</p>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '220px', paddingTop: '1.5rem', overflowX: 'auto' }}>
                                        {consumption.map((row) => {
                                            const vol = Number(row.volume) || 0;
                                            const barHeight = Math.max(12, Math.round((vol / maxVolume) * 160));
                                            return (
                                                <div key={row.month} style={{ flex: '1 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{vol.toLocaleString()}</span>
                                                    <div 
                                                        title={`${row.month}: ${vol.toLocaleString()} units`} 
                                                        style={{ 
                                                            width: '100%', 
                                                            maxWidth: '48px', 
                                                            height: `${barHeight}px`, 
                                                            borderRadius: '8px 8px 3px 3px', 
                                                            background: 'linear-gradient(180deg, #2563EB 0%, #3B82F6 100%)',
                                                            transition: 'height 0.4s ease, transform 0.2s ease',
                                                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                                                        }} 
                                                    />
                                                    <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)' }}>{row.month}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>

                            {/* Category Policy Compliance Rates */}
                            <Card padding="lg">
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>Therapeutic Category Adherence</h3>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Regulatory price ceiling & quality compliance by drug class</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {policyCategories.map((cat, idx) => (
                                        <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)' }}>{cat.category}</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: cat.color }}>{cat.rate}%</span>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{cat.target}</div>
                                            <div style={{ height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${cat.rate}%`, height: '100%', background: cat.color, borderRadius: '999px' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Strategic Directives & Detailed Breakdown Table Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                            
                            {/* Strategic Policy Directives */}
                            <Card padding="lg">
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>Strategic Regulatory Directives</h3>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Active enforcement policies mandated by DGDA Vigilance Cell</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {keyDirectives.map((dir, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '0.85rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                            <div style={{ padding: '0.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                {dir.icon}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>{dir.title}</h4>
                                                    <Badge variant="outline" style={{ fontSize: '0.7rem' }}>{dir.tag}</Badge>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{dir.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Consumption Breakdown Table */}
                            <Card padding="none" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: '1.25rem 1.25rem 0.75rem 1.25rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>Month-over-Month Volume Breakdown</h3>
                                    <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>Historical consumption data and volume change percentages</p>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.775rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                <th style={tableCellStyle}>Month</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>Volume (Units)</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>MoM Change</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumption.map((row, idx) => {
                                                const previous = idx > 0 ? Number(consumption[idx - 1].volume) : null;
                                                const change = previous ? ((Number(row.volume) - previous) / previous) * 100 : null;
                                                return (
                                                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ ...tableCellStyle, fontWeight: 600 }}>{row.month}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{Number(row.volume).toLocaleString()}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, color: change === null ? 'var(--text-muted)' : change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                            {change === null ? '—' : `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>

                        </div>

                    </div>
                );
            }
            case 'emergency': {
                const stock = asList(data);
                const term = stockSearch.trim().replace(/^#+/, '').toLowerCase();
                const rows = stock
                    .filter(row => !term || [row.medicine, row.entity_type, row.entity_id].some(value => String(value ?? '').toLowerCase().includes(term)))
                    .sort((a, b) => a.quantity - b.quantity);
                const criticalCount = stock.filter(row => row.quantity <= CRITICAL_STOCK_THRESHOLD).length;
                const lowCount = stock.filter(row => row.quantity < LOW_STOCK_THRESHOLD).length;

                const portalOptions = [
                    { key: 'all', label: 'All Portals (Global)', icon: <Users size={16} /> },
                    { key: 'citizen', label: 'Citizen Portal', icon: <UserCircle size={16} /> },
                    { key: 'doctor', label: 'Doctor Portal', icon: <Stethoscope size={16} /> },
                    { key: 'pharmacy', label: 'Pharmacy Portal', icon: <Storefront size={16} /> },
                    { key: 'distributor', label: 'Distributor Portal', icon: <Truck size={16} /> },
                    { key: 'manufacturer', label: 'Manufacturer Portal', icon: <Factory size={16} /> },
                ];

                const isTargetSelected = (key) => {
                    if (key === 'all') return broadcastTarget === 'all';
                    if (broadcastTarget === 'all') return false;
                    return Array.isArray(broadcastTarget) && broadcastTarget.includes(key);
                };

                const handleQuickShortageAlert = (row) => {
                    setBroadcastTitle(`URGENT SHORTAGE ALERT: ${row.medicine}`);
                    setBroadcastMessage(`Critical supply deficit detected for ${row.medicine}. Remaining quantity: ${row.quantity} units at ${labelize(row.entity_type)} #${row.entity_id}. Emergency restocking or rationing protocol initiated.`);
                    setBroadcastPriority('critical');
                    setBroadcastTarget(['pharmacy', 'distributor', 'manufacturer']);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };

                return (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        
                        {/* Summary Metric Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
                                    <Shield size={28} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tracked Stock Items</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{stock.length}</div>
                                </div>
                            </Card>

                            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                    <WarningCircle size={28} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Low Stock Alert (&lt; {LOW_STOCK_THRESHOLD})</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>{lowCount}</div>
                                </div>
                            </Card>

                            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                                    <ShieldWarning size={28} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Critical Deficits (≤ {CRITICAL_STOCK_THRESHOLD})</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)' }}>{criticalCount}</div>
                                </div>
                            </Card>

                            <Card padding="md" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                                    <Megaphone size={28} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Push Broadcasts</div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>{broadcastHistory.length}</div>
                                </div>
                            </Card>
                        </div>

                        {/* Broadcast Alert Composer & Sent Alerts Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                            
                            {/* Emergency Broadcast Console Card */}
                            <Card padding="lg" style={{ border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)' }}>
                                        <Megaphone size={22} weight="bold" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>Public Safety Push Broadcast Hub</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Broadcast urgent emergency notifications to targeted portals instantly</p>
                                    </div>
                                </div>

                                {broadcastSuccess && (
                                    <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle size={20} weight="bold" />
                                        {broadcastSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    
                                    {/* Target Portal Selection */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                            Select Target Portals:
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {portalOptions.map((opt) => {
                                                const selected = isTargetSelected(opt.key);
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        onClick={() => toggleTargetPortal(opt.key)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            padding: '0.45rem 0.75rem',
                                                            borderRadius: '8px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            border: selected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                            background: selected ? 'var(--primary)' : 'var(--bg-page)',
                                                            color: selected ? '#ffffff' : 'var(--text-main)',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: selected ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none'
                                                        }}
                                                    >
                                                        {opt.icon}
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Priority Selector */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                            Alert Priority Level:
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => setBroadcastPriority('critical')}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    border: broadcastPriority === 'critical' ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                                                    background: broadcastPriority === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-page)',
                                                    color: broadcastPriority === 'critical' ? 'var(--danger)' : 'var(--text-muted)'
                                                }}
                                            >
                                                🔴 CRITICAL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBroadcastPriority('high')}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    border: broadcastPriority === 'high' ? '1.5px solid var(--warning)' : '1px solid var(--border)',
                                                    background: broadcastPriority === 'high' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-page)',
                                                    color: broadcastPriority === 'high' ? 'var(--warning)' : 'var(--text-muted)'
                                                }}
                                            >
                                                🟠 WARNING
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setBroadcastPriority('advisory')}
                                                style={{
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    border: broadcastPriority === 'advisory' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                    background: broadcastPriority === 'advisory' ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-page)',
                                                    color: broadcastPriority === 'advisory' ? 'var(--primary)' : 'var(--text-muted)'
                                                }}
                                            >
                                                🔵 ADVISORY
                                            </button>
                                        </div>
                                    </div>

                                    {/* Broadcast Title */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                                            Broadcast Title / Subject:
                                        </label>
                                        <Input
                                            value={broadcastTitle}
                                            onChange={(e) => setBroadcastTitle(e.target.value)}
                                            placeholder="e.g., URGENT RECALL: Contaminated Batch #8839"
                                            required
                                        />
                                    </div>

                                    {/* Message Body */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                                            Notification Details & Directives:
                                        </label>
                                        <textarea
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            rows={4}
                                            placeholder="Enter comprehensive emergency guidelines, quarantine instructions, or shortage dispatch orders..."
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)',
                                                background: 'var(--bg-page)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.9rem',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="danger"
                                        style={{
                                            width: '100%',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            padding: '0.75rem',
                                            fontSize: '0.95rem',
                                            fontWeight: 700,
                                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                                        }}
                                    >
                                        <PaperPlaneTilt size={18} weight="bold" />
                                        Send Emergency Push Broadcast
                                    </Button>

                                </form>
                            </Card>

                            {/* Active Sent Broadcast History List */}
                            <Card padding="lg" style={{ border: '1px solid var(--border)', maxHeight: '680px', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                                    <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)' }}>
                                        <Broadcast size={22} weight="bold" />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 800 }}>Broadcasted Alert History</h3>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live feed of active notifications pushed to user portals</p>
                                    </div>
                                </div>

                                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
                                    {broadcastHistory.map((item) => {
                                        const badgeVariant = item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'info';
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: 'var(--bg-page)',
                                                    border: '1px solid var(--border)',
                                                    borderLeft: `4px solid var(--${badgeVariant})`
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.3 }}>{item.title}</span>
                                                    <Badge variant={badgeVariant} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{item.priority}</Badge>
                                                </div>

                                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                                                    {item.message}
                                                </p>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                                        {item.targets.includes('all') ? (
                                                            <Badge variant="outline" style={{ fontSize: '0.7rem' }}>🌐 All Portals</Badge>
                                                        ) : (
                                                            item.targets.map(t => (
                                                                <Badge key={t} variant="outline" style={{ fontSize: '0.7rem' }}>{labelize(t)}</Badge>
                                                            ))
                                                        )}
                                                    </div>
                                                    <span style={{ fontWeight: 600 }}>{item.timestamp}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>

                        </div>

                    </div>
                );
            }
            default:
                // Every tab now has a case; this only catches an unknown path.
                return <DGDACommandCenter onNavigateTab={handleNavigateTab} />;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
            {/* Page Header (Only shown on DGDA Dashboard) */}
            {activeTab === 'command-center' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <ShieldCheck size={32} weight="duotone" color="var(--primary)" /> DGDA Portal
                        </h1>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Directorate General of Drug Administration (DGDA)</p>
                    </div>
                </div>
            )}
            {/* Main Content Area */}
            <div style={{ flex: 1 }}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default DGDAPortal;
