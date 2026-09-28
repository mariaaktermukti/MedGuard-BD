import React, { useEffect, useState, useRef } from 'react';
import { VideoCamera, Phone, ChatCircleDots, User as UserIcon, PaperPlaneTilt, CheckCircle, XCircle, Clock, Stethoscope, Pill, Receipt, Eye, ImageSquare, Camera, Trash } from '@phosphor-icons/react';
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
    status === 'completed' ? 'success' : status === 'cancelled' ? 'danger' : status === 'ongoing' || status === 'accepted' ? 'warning' : 'neutral'
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

    // Active Chat State
    const [activeChatConsultation, setActiveChatConsultation] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const messagesEndRef = useRef(null);
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    // Patient History Inspection Modal State
    const [inspectingConsultation, setInspectingConsultation] = useState(null);
    const [patientHistoryData, setPatientHistoryData] = useState(null);
    const [loadingPatientHistory, setLoadingPatientHistory] = useState(false);

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

    // Polling for live chat messages when chat modal is open
    useEffect(() => {
        let interval;
        if (activeChatConsultation) {
            fetchChatMessages(activeChatConsultation.id);
            interval = setInterval(() => {
                fetchChatMessages(activeChatConsultation.id, true);
            }, 3000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeChatConsultation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const fetchChatMessages = async (consultationId, isSilent = false) => {
        try {
            const res = await api.get(`core/consultations/${consultationId}/messages/`);
            setChatMessages(res.data.messages || []);
            if (!isSilent) {
                setActiveChatConsultation((prev) => ({
                    ...prev,
                    status: res.data.consultation.status
                }));
            }
        } catch (err) {
            console.error('Failed to fetch chat messages:', err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const removeSelectedImage = () => {
        setSelectedImageFile(null);
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
            setImagePreviewUrl(null);
        }
        if (galleryInputRef.current) galleryInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const handleOpenPatientHistory = async (consultation) => {
        setInspectingConsultation(consultation);
        setLoadingPatientHistory(true);
        setPatientHistoryData(null);
        try {
            const res = await api.get(`doctor/patients/${consultation.citizen_id}/medicine-history/`);
            setPatientHistoryData(res.data);
        } catch (err) {
            console.error('Failed to fetch patient history:', err);
        } finally {
            setLoadingPatientHistory(false);
        }
    };

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
            if (inspectingConsultation && inspectingConsultation.id === id) {
                setInspectingConsultation((prev) => ({ ...prev, status }));
            }
            loadConsultations();
        } catch (err) {
            console.error('Failed to update consultation status:', err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = newMessageText.trim();
        if ((!text && !selectedImageFile) || !activeChatConsultation) return;

        setSendingMessage(true);
        try {
            const formData = new FormData();
            if (text) formData.append('message', text);
            if (selectedImageFile) formData.append('image', selectedImageFile);

            const res = await api.post(`core/consultations/${activeChatConsultation.id}/messages/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setChatMessages((prev) => [...prev, res.data]);
            setNewMessageText('');
            removeSelectedImage();
            loadConsultations();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSendingMessage(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem', paddingBottom: '2rem' }}>
            {/* Hidden File Inputs */}
            <input type="file" accept="image/*" ref={galleryInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            <Card>
                <CardHeader title="Schedule a Consultation" subtitle="Initiate a consultation with a patient by username." />
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
                <CardHeader title="Patient Consultations & Telehealth Requests" subtitle="Accept incoming patient requests, check current medicines, and reply live." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading consultations...</p>
                    ) : consultations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <ChatCircleDots size={44} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No patient consultations scheduled or requested yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {consultations.map((consultation) => (
                                <div key={consultation.id} style={{
                                    padding: '1.15rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '1rem'
                                }}>
                                    <div style={{ flex: 1, minWidth: '240px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                                {consultation.citizen_full_name || consultation.citizen_username}
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                (@{consultation.citizen_username})
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            Requested on: {new Date(consultation.consultation_date).toLocaleString()} &bull; Format: <strong style={{ textTransform: 'capitalize' }}>{consultation.consultation_type}</strong>
                                        </div>
                                        {consultation.notes && (
                                            <div style={{ fontSize: '0.88rem', background: 'var(--bg-input)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                                <strong>Patient Query:</strong> "{consultation.notes}"
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.65rem' }}>
                                        <Badge variant={statusVariant(consultation.status)}>{consultation.status}</Badge>

                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {/* Button to check current patient medicine history */}
                                            <Button size="sm" variant="outline" onClick={() => handleOpenPatientHistory(consultation)}>
                                                <Eye size={16} /> Check Current Medicines
                                            </Button>

                                            {consultation.status === 'requested' && (
                                                <>
                                                    <Button size="sm" onClick={() => updateStatus(consultation.id, 'accepted')}>
                                                        <CheckCircle size={16} /> Accept Request
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => updateStatus(consultation.id, 'cancelled')} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                                                        <XCircle size={16} /> Decline
                                                    </Button>
                                                </>
                                            )}

                                            {(consultation.status === 'accepted' || consultation.status === 'ongoing' || consultation.status === 'completed') && (
                                                <>
                                                    <Button size="sm" onClick={() => setActiveChatConsultation(consultation)}>
                                                        <ChatCircleDots size={16} weight="bold" /> {consultation.status === 'completed' ? 'View Chat Memory' : 'Open Live Chat / Reply'}
                                                    </Button>
                                                    {consultation.status !== 'completed' && (
                                                        <Button size="sm" variant="outline" onClick={() => updateStatus(consultation.id, 'completed')}>
                                                            Mark Completed
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Patient Current Medicine History Inspection */}
            {inspectingConsultation && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <Card padding="none" style={{ maxWidth: '720px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                    Current Medicines & History: {inspectingConsultation.citizen_full_name || inspectingConsultation.citizen_username}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Patient Username: @{inspectingConsultation.citizen_username} &bull; Consultation Status: <strong style={{ textTransform: 'capitalize' }}>{inspectingConsultation.status}</strong>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setInspectingConsultation(null)}>
                                Close
                            </Button>
                        </div>

                        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'grid', gap: '1.25rem' }}>
                            {loadingPatientHistory ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Fetching patient active medicines & records...</p>
                            ) : !patientHistoryData ? (
                                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Could not load history for this patient.</p>
                            ) : (
                                <>
                                    {/* Section 1: Active Dosage Schedules & Current Medicines */}
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Pill size={18} /> Active Dosage Schedules & Current Medicines
                                        </h3>
                                        {patientHistoryData.dosage_schedules.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>No active dosage schedules recorded for this citizen.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                {patientHistoryData.dosage_schedules.map((sched) => (
                                                    <div key={sched.id} style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{sched.medicine_name}</div>
                                                            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                                                                Dosage: {sched.dosage} &bull; Frequency: {sched.frequency}
                                                            </div>
                                                            {sched.start_date && (
                                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                    Started: {sched.start_date} {sched.end_date ? `to ${sched.end_date}` : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Badge variant={sched.is_active ? 'success' : 'neutral'}>{sched.is_active ? 'Active' : 'Inactive'}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 2: Prescription History */}
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Stethoscope size={18} /> Medical Prescription History
                                        </h3>
                                        {patientHistoryData.prescriptions.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>No prescription history on file.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                                                {patientHistoryData.prescriptions.map((rx) => (
                                                    <div key={rx.id} style={{ padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                                                            <strong style={{ fontSize: '0.9rem' }}>Dr. {rx.doctor_username}</strong>
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(rx.prescription_date).toLocaleDateString()}</span>
                                                        </div>
                                                        {rx.items.map((item) => (
                                                            <div key={item.id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                                &bull; {item.medicine_name} — {item.dosage}, {item.duration}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 3: Pharmacy Purchase History */}
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Receipt size={18} /> Pharmacy Verified Purchases
                                        </h3>
                                        {patientHistoryData.sales.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>No recorded pharmacy purchases.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                {patientHistoryData.sales.map((sale) => (
                                                    <div key={sale.id} style={{ padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                        <div>
                                                            <strong>{sale.medicine_name}</strong> (Batch: {sale.batch_number})
                                                        </div>
                                                        <div>{sale.quantity} units</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            {inspectingConsultation.status === 'requested' && (
                                <Button size="sm" onClick={() => updateStatus(inspectingConsultation.id, 'accepted')}>
                                    <CheckCircle size={16} /> Accept Request First
                                </Button>
                            )}
                            <Button size="sm" onClick={() => {
                                const cons = inspectingConsultation;
                                setInspectingConsultation(null);
                                setActiveChatConsultation(cons);
                            }}>
                                <ChatCircleDots size={16} weight="bold" /> Open Live Chat & Reply
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Modal: Live 2-Way Chat Room */}
            {activeChatConsultation && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    background: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <Card padding="none" style={{ maxWidth: '680px', width: '100%', height: '84vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden', borderRadius: '16px' }}>
                        {/* Chat Header */}
                        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-input)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                    <Stethoscope size={22} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                                        Patient: {activeChatConsultation.citizen_full_name || activeChatConsultation.citizen_username}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Status: <span style={{ color: 'var(--success)', fontWeight: 700, textTransform: 'capitalize' }}>{activeChatConsultation.status}</span> &bull; 2-Way Encrypted Doctor Chat
                                    </div>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setActiveChatConsultation(null)}>
                                Close Chat
                            </Button>
                        </div>

                        {/* Message History Feed */}
                        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: 'var(--bg-card)' }}>
                            {chatMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                                    <ChatCircleDots size={40} weight="duotone" style={{ opacity: 0.4 }} />
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>No messages yet. Send a response to the patient!</p>
                                </div>
                            ) : (
                                chatMessages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            alignSelf: msg.is_me ? 'flex-end' : 'flex-start',
                                            maxWidth: '78%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: msg.is_me ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', padding: '0 0.25rem' }}>
                                            {msg.sender_full_name} ({msg.sender_role}) &bull; {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            borderRadius: msg.is_me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            background: msg.is_me ? 'var(--primary)' : 'var(--bg-input)',
                                            color: msg.is_me ? '#ffffff' : 'var(--text-main)',
                                            border: msg.is_me ? 'none' : '1px solid var(--border)',
                                            fontSize: '0.925rem',
                                            lineHeight: 1.45,
                                            whiteSpace: 'pre-wrap',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                        }}>
                                            {msg.image && (
                                                <div style={{ marginBottom: msg.message ? '0.5rem' : 0 }}>
                                                    <img
                                                        src={msg.image}
                                                        alt="Report Attachment"
                                                        style={{
                                                            maxWidth: '100%',
                                                            maxHeight: '220px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            border: '1px solid rgba(255,255,255,0.2)'
                                                        }}
                                                        onClick={() => window.open(msg.image, '_blank')}
                                                    />
                                                </div>
                                            )}
                                            {msg.message}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Box & Photo Attachments */}
                        {activeChatConsultation.status === 'cancelled' ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.08)', fontSize: '0.9rem', fontWeight: 600 }}>
                                This consultation has been cancelled. Further messages cannot be sent.
                            </div>
                        ) : (
                            <form onSubmit={handleSendMessage} style={{ padding: '0.9rem 1.15rem', background: 'var(--bg-input)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Image Attachment Preview Pill */}
                                {selectedImageFile && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.75rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', width: 'fit-content' }}>
                                        {imagePreviewUrl && (
                                            <img src={imagePreviewUrl} alt="Preview" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
                                        )}
                                        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                            📷 Report Attached: {selectedImageFile.name}
                                        </span>
                                        <button type="button" onClick={removeSelectedImage} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {/* Gallery Button */}
                                    <button
                                        type="button"
                                        title="Attach Report Photo from Gallery"
                                        onClick={() => galleryInputRef.current?.click()}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '50%',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <ImageSquare size={20} color="var(--primary)" />
                                    </button>

                                    {/* Camera Snap Button */}
                                    <button
                                        type="button"
                                        title="Take Photo with Camera"
                                        onClick={() => cameraInputRef.current?.click()}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '50%',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Camera size={20} color="var(--primary)" />
                                    </button>

                                    <input
                                        value={newMessageText}
                                        onChange={(e) => setNewMessageText(e.target.value)}
                                        placeholder="Type message or attach a report photo..."
                                        style={{
                                            flex: 1,
                                            padding: '0.75rem 1rem',
                                            borderRadius: '24px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.925rem'
                                        }}
                                    />
                                    <Button type="submit" disabled={sendingMessage || (!newMessageText.trim() && !selectedImageFile)} style={{ borderRadius: '24px', padding: '0 1.25rem' }}>
                                        <PaperPlaneTilt size={18} weight="bold" /> Send
                                    </Button>
                                </div>
                            </form>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultations;
