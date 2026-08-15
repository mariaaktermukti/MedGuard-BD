import React, { useEffect, useState } from 'react';
import { Warning } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const severityOptions = ['mild', 'moderate', 'severe'];

const DoctorADRReport = () => {
    const [patients, setPatients] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(true);

    const [citizen, setCitizen] = useState('');
    const [medicine, setMedicine] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('mild');
    const [reactionDate, setReactionDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const loadReports = async () => {
        setLoadingReports(true);
        try {
            const response = await api.get('doctor/adr-reports/');
            setReports(response.data);
        } catch (err) {
            console.error('Failed to fetch ADR reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [patientsRes, medicinesRes] = await Promise.all([
                    api.get('doctor/patients/'),
                    api.get('doctor/medicines/'),
                ]);
                setPatients(patientsRes.data);
                setMedicines(medicinesRes.data);
            } catch (err) {
                console.error('Failed to load patients/medicines:', err);
            }
        };
        fetchInitial();
        loadReports();
    }, []);

    const resetForm = () => {
        setCitizen('');
        setMedicine('');
        setDescription('');
        setSeverity('mild');
        setReactionDate('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!citizen || !medicine || !description.trim()) {
            setFormError('Select a patient, a medicine, and describe the reaction.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('doctor/adr-reports/', {
                citizen: Number(citizen),
                medicine: Number(medicine),
                description,
                severity,
                reaction_date: reactionDate || null,
            });
            setFormSuccess('ADR report submitted.');
            resetForm();
            loadReports();
        } catch (err) {
            setFormError(err.response?.data?.detail || 'Could not submit this report.');
        } finally {
            setSubmitting(false);
        }
    };

    const severityVariant = (s) => (s === 'severe' ? 'danger' : s === 'moderate' ? 'warning' : 'neutral');

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="Report a Side Effect" subtitle="File an adverse drug reaction report on behalf of a patient." />
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Patient</label>
                            <select
                                value={citizen}
                                onChange={(e) => setCitizen(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            >
                                <option value="">Select a patient...</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>{patient.full_name || patient.username}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Suspected Medicine</label>
                            <select
                                value={medicine}
                                onChange={(e) => setMedicine(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            >
                                <option value="">Select a medicine...</option>
                                {medicines.map((med) => (
                                    <option key={med.id} value={med.id}>{med.name}{med.strength ? ` (${med.strength})` : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Severity</label>
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                >
                                    {severityOptions.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Reaction Date</label>
                                <input
                                    type="date"
                                    value={reactionDate}
                                    onChange={(e) => setReactionDate(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Describe the observed reaction..."
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', resize: 'vertical' }}
                            />
                        </div>

                        {formError && <p style={{ color: 'var(--danger)', margin: 0 }}>{formError}</p>}
                        {formSuccess && <p style={{ color: 'var(--success)', margin: 0 }}>{formSuccess}</p>}

                        <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader title="Reports I've Filed" />
                <CardContent>
                    {loadingReports ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : reports.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Warning size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No ADR reports filed yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {reports.map((report) => (
                                <div key={report.id} style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {report.citizen_full_name || report.citizen_username} &bull; {report.medicine_name}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                            <Badge variant={severityVariant(report.severity)}>{report.severity}</Badge>
                                            <Badge variant="neutral">{report.status}</Badge>
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{report.description}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorADRReport;
