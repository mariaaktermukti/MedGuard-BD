import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
    MapPin, Crosshair, ShieldWarning, WarningCircle, ClipboardText,
    Buildings, MapTrifold, Brain, ChartLineUp, Ambulance, Shield, CheckCircle,
    ArrowClockwise, Factory, Storefront, MagnifyingGlass
} from '@phosphor-icons/react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MapComponent from '../../components/MapComponent';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

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

// trust_score is stored as a 0–9.99 decimal but some code paths write 0–100; normalise to a percentage
const trustScoreMeta = (raw) => {
    const score = parseFloat(raw);
    if (Number.isNaN(score) || score === 0) return { label: 'Unrated', variant: 'neutral' };
    const percent = score <= 10 ? score * 10 : score;
    const variant = percent >= 80 ? 'success' : percent >= 50 ? 'warning' : 'danger';
    return { label: `Trust ${raw}`, variant };
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

    const [activeTab, setActiveTab] = useState('command-center');
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const requestIdRef = useRef(0);
    const activeTabRef = useRef('command-center');

    const [formNotice, setFormNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recallForm, setRecallForm] = useState(emptyRecallForm);
    const [recallBatch, setRecallBatch] = useState(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [inspectionForm, setInspectionForm] = useState(emptyInspectionForm);
    const [stockSearch, setStockSearch] = useState('');
    const [entityDirectory, setEntityDirectory] = useState(null);
    const [entityDirectoryError, setEntityDirectoryError] = useState('');

    // The inspection form's entity picker uses the same entities endpoint as the Entities tab;
    // that tab's data is replaced on tab switch, so load it separately whenever Inspections opens
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
        { id: 'command-center', label: 'Command Center', icon: <MapPin size={18} />, path: '/dashboard/dgda/command-center' },
        { id: 'live-monitoring', label: 'Monitoring', icon: <Crosshair size={18} />, path: '/dashboard/dgda/live-monitoring' },
        { id: 'investigations', label: 'Investigations', icon: <ShieldWarning size={18} />, path: '/dashboard/dgda/investigations' },
        { id: 'recalls', label: 'Recalls', icon: <WarningCircle size={18} />, path: '/dashboard/dgda/recalls' },
        { id: 'inspections', label: 'Inspections', icon: <ClipboardText size={18} />, path: '/dashboard/dgda/inspections' },
        { id: 'entities', label: 'Entities', icon: <Buildings size={18} />, path: '/dashboard/dgda/entities' },
        { id: 'heatmaps', label: 'Heatmaps', icon: <MapTrifold size={18} />, path: '/dashboard/dgda/heatmaps' },
        { id: 'risk', label: 'Risk Intel', icon: <Brain size={18} />, path: '/dashboard/dgda/risk' },
        { id: 'policy', label: 'Policy Analytics', icon: <ChartLineUp size={18} />, path: '/dashboard/dgda/policy' },
        { id: 'emergency', label: 'Emergency Response', icon: <Ambulance size={18} />, path: '/dashboard/dgda/emergency' }
    ];

    useEffect(() => {
        const currentTab = tabs.find(t => pathname.includes(t.path));
        const tabId = currentTab ? currentTab.id : 'command-center';
        setActiveTab(tabId);
        activeTabRef.current = tabId;
        setFormNotice(null);
        fetchTabData(tabId);
    }, [pathname]);

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
        } catch(err) {
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
        if(isLoading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading intelligence data...</div>;

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

        switch(activeTab) {
            case 'command-center':
                return (
                    <div className="animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Active Recalls</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{data?.active_recalls || 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>ADR Reports</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{data?.total_adr || 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Low Stock Alerts</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>{data?.low_stock_alerts || 0}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Live Movements</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{data?.live_movements || 0}</div>
                            </Card>
                        </div>

                        <Card padding="none" style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', overflow: 'hidden' }}>
                            <MapComponent points={[]} />
                        </Card>
                    </div>
                );
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
                                    <Button variant="danger" size="sm">Freeze Batch</Button>
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
            case 'entities': {
                const manufacturers = asList(data?.manufacturers);
                const pharmacies = asList(data?.pharmacies);
                return (
                    <div className="animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Registered Manufacturers</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{manufacturers.length}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Registered Pharmacies</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>{pharmacies.length}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Low-Trust Pharmacies</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{pharmacies.filter(p => trustScoreMeta(p.trust_score).variant === 'danger').length}</div>
                            </Card>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                            <Card padding="lg">
                                <CardHeader title="Manufacturers" subtitle="Licensed production entities under DGDA oversight." action={<Factory size={22} color="var(--primary)" />} />
                                <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
                                    {manufacturers.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No manufacturers registered.</p>}
                                    {manufacturers.map((m) => (
                                        <div key={m.user__username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{m.company_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{m.user__username}</div>
                                            </div>
                                            <Badge variant="info">Reg. {m.registration_number}</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card padding="lg">
                                <CardHeader title="Pharmacies" subtitle="Colour-coded by trust score: green ≥ 80%, amber ≥ 50%, red below." action={<Storefront size={22} color="var(--primary)" />} />
                                <CardContent style={{ display: 'grid', gap: '0.75rem' }}>
                                    {pharmacies.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No pharmacies registered.</p>}
                                    {pharmacies.map((p) => {
                                        const trust = trustScoreMeta(p.trust_score);
                                        return (
                                            <div key={p.user__username} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>{p.pharmacy_name}</div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{p.user__username}</div>
                                                </div>
                                                <Badge variant={trust.variant}>{trust.label}</Badge>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                );
            }
            case 'heatmaps':
                return (
                    <div className="animate-fade-in">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem' }}>Interactive visualization of ADRs, shortages, and counterfeiting risks across the country.</p>
                        </div>
                        <Card padding="none" style={{ height: '500px', overflow: 'hidden' }}>
                            {data && <MapComponent points={data} />}
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
                                            {threat.type === 'adr' && <Button variant="primary" size="sm">Investigate Batch</Button>}
                                            {threat.type === 'qc' && <Button variant="danger" size="sm">Initiate Recall</Button>}
                                            {threat.type === 'shortage' && <Button variant="outline" size="sm">Alert Suppliers</Button>}
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
                const compliance = Number(data?.compliance ?? 0);
                const totalVolume = consumption.reduce((sum, row) => sum + (Number(row.volume) || 0), 0);
                const maxVolume = Math.max(1, ...consumption.map(row => Number(row.volume) || 0));
                const peak = consumption.reduce((best, row) => (!best || Number(row.volume) > Number(best.volume) ? row : best), null);
                const complianceColor = compliance >= 85 ? 'var(--success)' : compliance >= 60 ? 'var(--warning)' : 'var(--danger)';
                return (
                    <div className="animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>National Compliance</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: complianceColor }}>{compliance}%</div>
                                <div style={{ height: '8px', borderRadius: '999px', background: 'var(--border)', overflow: 'hidden', marginTop: '0.5rem' }}>
                                    <div style={{ width: `${Math.min(100, compliance)}%`, height: '100%', background: complianceColor }} />
                                </div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Consumption</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{totalVolume.toLocaleString()}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Months Tracked</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--info)' }}>{consumption.length}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Peak Month</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{peak ? peak.month : '—'}</div>
                            </Card>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                            <Card padding="lg">
                                <CardHeader title="Monthly Consumption Trend" subtitle="National medicine consumption volume by month." />
                                {consumption.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No consumption data available.</p>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', height: '240px', paddingTop: '1rem', overflowX: 'auto' }}>
                                        {consumption.map((row) => (
                                            <div key={row.month} style={{ flex: '1 0 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{Number(row.volume).toLocaleString()}</span>
                                                <div title={`${row.month}: ${row.volume}`} style={{ width: '100%', maxWidth: '56px', height: `${Math.round(((Number(row.volume) || 0) / maxVolume) * 170)}px`, minHeight: '4px', borderRadius: '8px 8px 2px 2px', background: 'var(--primary)' }} />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.month}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            <Card padding="none" style={{ overflow: 'hidden' }}>
                                <div style={{ padding: 'var(--spacing-lg) var(--spacing-lg) 0' }}>
                                    <CardHeader title="Consumption Breakdown" subtitle="Month-over-month change in consumption volume." />
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                <th style={tableCellStyle}>Month</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>Volume</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>Change</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumption.map((row, idx) => {
                                                const previous = idx > 0 ? Number(consumption[idx - 1].volume) : null;
                                                const change = previous ? ((Number(row.volume) - previous) / previous) * 100 : null;
                                                return (
                                                    <tr key={row.month}>
                                                        <td style={tableCellStyle}>{row.month}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700 }}>{Number(row.volume).toLocaleString()}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right', color: change === null ? 'var(--text-muted)' : change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
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
                const term = stockSearch.trim().toLowerCase();
                const rows = stock
                    .filter(row => !term || [row.medicine, row.entity_type, row.entity_id].some(value => String(value ?? '').toLowerCase().includes(term)))
                    .sort((a, b) => a.quantity - b.quantity);
                const criticalCount = stock.filter(row => row.quantity <= CRITICAL_STOCK_THRESHOLD).length;
                const lowCount = stock.filter(row => row.quantity < LOW_STOCK_THRESHOLD).length;
                return (
                    <div className="animate-fade-in">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Stock Records</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stock.length}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Low Stock (&lt; {LOW_STOCK_THRESHOLD})</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--warning)' }}>{lowCount}</div>
                            </Card>
                            <Card padding="md" style={{ textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Critical (≤ {CRITICAL_STOCK_THRESHOLD})</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--danger)' }}>{criticalCount}</div>
                            </Card>
                        </div>

                        <Card padding="none" style={{ overflow: 'hidden' }}>
                            <div style={{ padding: 'var(--spacing-lg) var(--spacing-lg) 0' }}>
                                <CardHeader title="National Stock Availability" subtitle="Current stock across all pharmacies and warehouses, lowest quantities first." />
                                <Input value={stockSearch} placeholder="Search by medicine, entity type, or entity ID..." onChange={(e) => setStockSearch(e.target.value)} />
                            </div>
                            {rows.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', padding: '0 var(--spacing-lg) var(--spacing-lg)', margin: 0 }}>
                                    {stock.length === 0 ? 'No stock records available.' : 'No stock records match your search.'}
                                </p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                <th style={tableCellStyle}>Medicine</th>
                                                <th style={tableCellStyle}>Entity</th>
                                                <th style={tableCellStyle}>Entity ID</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>Quantity</th>
                                                <th style={{ ...tableCellStyle, textAlign: 'right' }}>Level</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, idx) => {
                                                const level = stockLevel(row.quantity);
                                                return (
                                                    <tr key={`${row.entity_type}-${row.entity_id}-${row.medicine}-${idx}`} style={{ background: level.background, boxShadow: `inset 4px 0 0 ${level.border}` }}>
                                                        <td style={{ ...tableCellStyle, fontWeight: 600 }}>{row.medicine}</td>
                                                        <td style={tableCellStyle}>{labelize(row.entity_type)}</td>
                                                        <td style={tableCellStyle}>#{row.entity_id}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: 700, color: level.variant === 'success' ? 'var(--text-main)' : `var(--${level.variant})` }}>{row.quantity}</td>
                                                        <td style={{ ...tableCellStyle, textAlign: 'right' }}><Badge variant={level.variant}>{level.label}</Badge></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                    </div>
                );
            }
            default:
                return <div><h2 style={{ fontSize: '1.5rem' }}>{tabs.find(t => t.id === activeTab)?.label}</h2><p style={{ color: 'var(--text-muted)' }}>Dashboard module is currently under maintenance.</p></div>;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>National Command Center</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>Directorate General of Drug Administration (DGDA)</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1 }}>
                {renderTabContent()}
            </div>
        </div>
    );
};

export default DGDAPortal;
