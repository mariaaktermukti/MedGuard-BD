import React, { useEffect, useState } from 'react';
import { VideoCamera, Phone, ChatCircleDots, User as UserIcon } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const typeOptions = [
    { value: 'chat', label: 'Chat', icon: <ChatCircleDots size={16} /> },
    { value: 'audio', label: 'Audio', icon: <Phone size={16} /> },
    { value: 'video', label: 'Video', icon: <VideoCamera size={16} /> },
    { value: 'in_person', label: 'In Person', icon: <UserIcon size={16} /> },
];

const statusVariant = (status) => (
    status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : status === 'ongoing' ? 'warning' : 'neutral'
);

const DoctorConsultations = () => {
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);

    const [citizenUsername, setCitizenUsername] = useState('');
    const [consultationType, setConsultationType] = useState('chat');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const loadConsultations = async () => {
        setLoading(true);
        try {
            const response = await api.get('doctor/consultations/');
            setConsultations(response.data);
        } catch (err) {
            console.error('Failed to fetch consultations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConsultations();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!citizenUsername.trim()) {
            setFormError('Enter the patient\'s exact username.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('doctor/consultations/', {
                citizen_username: citizenUsername.trim(),
                consultation_type: consultationType,
                notes,
            });
            setFormSuccess('Consultation scheduled.');
            setCitizenUsername('');
            setNotes('');
            loadConsultations();
        } catch (err) {
            setFormError(err.response?.data?.citizen_username?.[0] || err.response?.data?.detail || 'Could not schedule this consultation.');
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            await api.patch(`doctor/consultations/${id}/`, { status });
            loadConsultations();
        } catch (err) {
            console.error('Failed to update consultation status:', err);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="Schedule a Consultation" subtitle="Enter the patient's exact username — no open patient search is available." />
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Patient Username</label>
                            <input
                                type="text"
                                value={citizenUsername}
                                onChange={(e) => setCitizenUsername(e.target.value)}
                                placeholder="Exact username..."
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Type</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {typeOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setConsultationType(option.value)}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)',
                                            border: consultationType === option.value ? '1px solid var(--primary)' : '1px solid var(--border)',
                                            background: consultationType === option.value ? 'var(--primary-light)' : 'transparent',
                                            color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                        }}
                                    >
                                        {option.icon} {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', resize: 'vertical' }}
                            />
                        </div>

                        {formError && <p style={{ color: 'var(--danger)', margin: 0 }}>{formError}</p>}
                        {formSuccess && <p style={{ color: 'var(--success)', margin: 0 }}>{formSuccess}</p>}

                        <Button type="submit" disabled={submitting}>{submitting ? 'Scheduling...' : 'Schedule Consultation'}</Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader title="My Consultations" />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : consultations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <ChatCircleDots size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No consultations scheduled yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {consultations.map((consultation) => (
                                <div key={consultation.id} style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {consultation.citizen_full_name || consultation.citizen_username} &bull; {consultation.consultation_type}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <Badge variant={statusVariant(consultation.status)}>{consultation.status}</Badge>
                                            {consultation.status === 'scheduled' && (
                                                <>
                                                    <button type="button" onClick={() => updateStatus(consultation.id, 'ongoing')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Start</button>
                                                    <button type="button" onClick={() => updateStatus(consultation.id, 'cancelled')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}>Cancel</button>
                                                </>
                                            )}
                                            {consultation.status === 'ongoing' && (
                                                <>
                                                    <button type="button" onClick={() => updateStatus(consultation.id, 'completed')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Complete</button>
                                                    <button type="button" onClick={() => updateStatus(consultation.id, 'cancelled')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}>Cancel</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(consultation.consultation_date).toLocaleString()}</div>
                                    {consultation.notes && <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>{consultation.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DoctorConsultations;
