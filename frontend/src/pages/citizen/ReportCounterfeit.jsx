import React, { useEffect, useRef, useState } from 'react';
import { ShieldWarning, PaperPlaneTilt, CheckCircle, WarningCircle, ImageSquare } from '@phosphor-icons/react';
import api from '../../services/api';

// Self-contained on purpose: keep in sync with pages/pharmacy/ReportCounterfeit.jsx by hand, not via an import

const REPORTS_ENDPOINT = 'core/counterfeit-reports/';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const CATEGORY_OPTIONS = [
    { value: 'wrong_packaging', label: 'Wrong packaging' },
    { value: 'suspicious_price', label: 'Suspicious price' },
    { value: 'failed_verification', label: 'Failed verification' },
    { value: 'other', label: 'Other' },
];

const STATUS_STYLES = {
    pending: { color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)' },
    reviewed: { color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' },
    confirmed: { color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)' },
    dismissed: { color: 'var(--text-muted)', background: 'rgba(148, 163, 184, 0.15)' },
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
    resize: 'vertical',
};

const emptyForm = () => ({ qr_code: '', medicine_name: '', location: '', category: '', description: '' });

const Field = ({ label, error, fullWidth = false, children }) => (
    <div className="input-group" style={{ marginBottom: 0, gridColumn: fullWidth ? '1 / -1' : undefined }}>
        <label>{label}</label>
        {children}
        {error && <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--danger)', fontSize: '0.82rem' }}>{error}</span>}
    </div>
);

const validateReport = (form, photo) => {
    const errors = {};
    if (!form.medicine_name.trim()) errors.medicine_name = 'Medicine name is required.';
    if (!form.category) errors.category = 'Choose a reason for the report.';
    if (form.description.trim().length < 10) errors.description = 'Describe the issue in at least 10 characters.';
    if (photo && !ALLOWED_PHOTO_TYPES.includes(photo.type)) errors.photo = 'Photo must be a JPG, PNG or WebP image.';
    else if (photo && photo.size > MAX_PHOTO_BYTES) errors.photo = 'Photo must be 5 MB or smaller.';
    return errors;
};

const flattenErrors = (data) => Object.fromEntries(
    Object.entries(data).map(([field, messages]) => [field, Array.isArray(messages) ? messages.join(' ') : String(messages)])
);

const CounterfeitReportPage = ({ title, subtitle, locationLabel, locationPlaceholder }) => {
    const [form, setForm] = useState(emptyForm);
    const [photo, setPhoto] = useState(null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState(null);
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);
    const [reportsError, setReportsError] = useState('');
    const photoInputRef = useRef(null);

    const fetchReports = async () => {
        try {
            const response = await api.get(REPORTS_ENDPOINT);
            setReports(Array.isArray(response.data) ? response.data : response.data?.results || []);
            setReportsError('');
        } catch (error) {
            console.error('Failed to fetch counterfeit reports:', error);
            setReportsError('Could not load your reports right now.');
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const updateField = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handlePhotoChange = (event) => {
        setPhoto(event.target.files?.[0] || null);
        setErrors((current) => ({ ...current, photo: undefined }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setNotice(null);
        const validationErrors = validateReport(form, photo);
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length) return;

        const payload = new FormData();
        payload.append('medicine_name', form.medicine_name.trim());
        payload.append('category', form.category);
        payload.append('description', form.description.trim());
        if (form.qr_code.trim()) payload.append('qr_code', form.qr_code.trim());
        if (form.location.trim()) payload.append('location', form.location.trim());
        if (photo) payload.append('photo', photo);

        setSubmitting(true);
        try {
            // api.js defaults to JSON, which makes axios serialize FormData to JSON and drop the photo
            await api.post(REPORTS_ENDPOINT, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            setNotice({ tone: 'success', text: 'Report submitted. DGDA will review it. You can track its status under My Reports.' });
            setForm(emptyForm());
            setPhoto(null);
            if (photoInputRef.current) photoInputRef.current.value = '';
            fetchReports();
        } catch (error) {
            const data = error.response?.data;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                const fieldErrors = flattenErrors(data);
                setErrors(fieldErrors);
                setNotice({ tone: 'error', text: fieldErrors.detail || 'Please fix the highlighted fields and try again.' });
            } else {
                setNotice({
                    tone: 'error',
                    text: error.response ? 'Could not submit this report. Please try again.' : 'Could not reach the server. Please check your connection and try again.',
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldWarning size={28} weight="duotone" /> {title}
                </h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>{subtitle}</p>
            </div>

            {notice && (
                <div role={notice.tone === 'error' ? 'alert' : 'status'} className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: `4px solid ${notice.tone === 'error' ? 'var(--danger)' : 'var(--success)'}` }}>
                    {notice.tone === 'error' ? <WarningCircle size={20} color="var(--danger)" /> : <CheckCircle size={20} color="var(--success)" />}
                    {notice.text}
                </div>
            )}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>New Report</h2>
                <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                        <Field label="Medicine Name *" error={errors.medicine_name}>
                            <input value={form.medicine_name} onChange={updateField('medicine_name')} maxLength={150} placeholder="e.g. Napa Extra 500mg" style={inputStyle} />
                        </Field>
                        <Field label="Reason *" error={errors.category}>
                            <select value={form.category} onChange={updateField('category')} style={inputStyle}>
                                <option value="">Select a reason</option>
                                {CATEGORY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="QR Code (if available)" error={errors.qr_code}>
                            <input value={form.qr_code} onChange={updateField('qr_code')} maxLength={255} placeholder="Scanned or typed QR code" style={inputStyle} />
                        </Field>
                        <Field label={locationLabel} error={errors.location}>
                            <input value={form.location} onChange={updateField('location')} maxLength={255} placeholder={locationPlaceholder} style={inputStyle} />
                        </Field>
                        <Field label="Description *" error={errors.description} fullWidth>
                            <textarea rows={4} value={form.description} onChange={updateField('description')} placeholder="What made you suspect this medicine is counterfeit?" style={inputStyle} />
                        </Field>
                        <Field label="Photo (optional: JPG, PNG or WebP, up to 5 MB)" error={errors.photo} fullWidth>
                            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} style={inputStyle} />
                        </Field>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="ui-btn ui-btn-primary" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
                            <PaperPlaneTilt size={18} /> {submitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>My Reports</h2>
                {loadingReports ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading your reports...</p>
                ) : reportsError ? (
                    <p style={{ color: 'var(--danger)' }}>{reportsError}</p>
                ) : reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <ShieldWarning size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>You haven't submitted any counterfeit reports yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {reports.map((report) => (
                            <div key={report.id} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{report.medicine_name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {report.category_display} &bull; {new Date(report.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <span style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, ...(STATUS_STYLES[report.status] || STATUS_STYLES.pending) }}>
                                        {report.status_display}
                                    </span>
                                </div>
                                <p style={{ margin: '0 0 0.5rem' }}>{report.description}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {report.qr_code && <span>QR: {report.qr_code}</span>}
                                    {report.location && <span>Location: {report.location}</span>}
                                    {report.photo && (
                                        <a href={report.photo} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <ImageSquare size={16} /> View photo
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const CitizenReportCounterfeit = () => (
    <CounterfeitReportPage
        title="Report Counterfeit Medicine"
        subtitle="Think a medicine you bought is fake? Tell DGDA. Your report helps protect other patients."
        locationLabel="Pharmacy / Location"
        locationPlaceholder="e.g. ABC Pharmacy, Mirpur 10, Dhaka"
    />
);

export default CitizenReportCounterfeit;
