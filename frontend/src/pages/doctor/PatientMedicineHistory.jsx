import React, { useEffect, useState, useRef } from 'react';
import {
    User, Pill, Receipt, ChatCircleDots, CheckCircle, PaperPlaneTilt,
    Stethoscope, Lock, XCircle, ImageSquare, Camera, Trash, MagnifyingGlass,
    Phone, Users, ShieldCheck, Clock, Sparkle
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const formatDay = (value) => {
    if (!value) return null;
    const text = String(value);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(text)
        ? new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, Number(text.slice(8, 10)))
        : new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PatientMedicineHistory = () => {
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [history, setHistory] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');

    // Consultation & Live Chat state
    const [allConsultations, setAllConsultations] = useState([]);
    const [patientConsultation, setPatientConsultation] = useState(null);
    const [activeChatConsultation, setActiveChatConsultation] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const messagesEndRef = useRef(null);
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const fetchPatientsAndConsultations = async () => {
        try {
            const [patRes, consRes] = await Promise.all([
                api.get('doctor/patients/'),
                api.get('doctor/consultations/')
            ]);
            setPatients(patRes.data || []);
            setAllConsultations(consRes.data || []);
        } catch (err) {
            console.error('Failed to fetch doctor patients or consultations:', err);
        } finally {
            setLoadingPatients(false);
        }
    };

    useEffect(() => {
        fetchPatientsAndConsultations();
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

    const handleSelectPatient = async (patientId) => {
        setSelectedPatientId(patientId);
        setLoadingHistory(true);
        setError('');
        setHistory(null);
        setPatientConsultation(null);
        try {
            const [histRes, consRes] = await Promise.all([
                api.get(`doctor/patients/${patientId}/medicine-history/`),
                api.get('doctor/consultations/')
            ]);
            setHistory(histRes.data);
            setAllConsultations(consRes.data || []);
            const foundCons = (consRes.data || []).find((c) => c.citizen_id === patientId || c.citizen_username === histRes.data.patient?.username);
            setPatientConsultation(foundCons || null);
        } catch (err) {
            setError(err.response?.data?.detail || "Could not load this patient's history.");
            setHistory(null);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleAcceptConsultation = async (consultationId) => {
        try {
            await api.patch(`doctor/consultations/${consultationId}/`, { status: 'accepted' });
            setPatientConsultation((prev) => (prev ? { ...prev, status: 'accepted' } : null));
            fetchPatientsAndConsultations();
        } catch (err) {
            console.error('Failed to accept consultation:', err);
        }
    };

    const handleDeclineConsultation = async (consultationId) => {
        try {
            await api.patch(`doctor/consultations/${consultationId}/`, { status: 'cancelled' });
            setPatientConsultation((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
            fetchPatientsAndConsultations();
        } catch (err) {
            console.error('Failed to decline consultation:', err);
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
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSendingMessage(false);
        }
    };

    const isRequestPending = patientConsultation && patientConsultation.status === 'requested';

    const filteredPatients = patients.filter((p) => {
        const q = patientSearch.toLowerCase().trim();
        if (!q) return true;
        return (
            (p.full_name && p.full_name.toLowerCase().includes(q)) ||
            (p.username && p.username.toLowerCase().includes(q)) ||
            (p.phone && p.phone.includes(q))
        );
    });

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 310px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start', paddingBottom: '2.5rem' }}>
            {/* Hidden File Inputs */}
            <input type="file" accept="image/*" ref={galleryInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Left Panel: My Patients List */}
            <Card padding="lg" style={{ border: '1px solid var(--border)' }}>
                <CardHeader
                    title="Patient Roster"
                    subtitle="Patients with consultation requests or prescriptions."
                />
                <CardContent style={{ marginTop: '1rem' }}>
                    {/* Patient Search */}
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                        <MagnifyingGlass size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            placeholder="Filter patient by name or phone..."
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-input)',
                                color: 'var(--text-main)',
                                fontSize: '0.85rem'
                            }}
                        />
                    </div>

                    {loadingPatients ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading patients...</p>
                    ) : filteredPatients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <Users size={36} weight="duotone" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                            <p style={{ margin: 0, fontSize: '0.88rem' }}>No matching patients found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.65rem', maxHeight: '680px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                            {filteredPatients.map((patient) => {
                                const isSelected = selectedPatientId === patient.id;
                                const cons = allConsultations.find((c) => c.citizen_id === patient.id || c.citizen_username === patient.username);
                                const isPending = cons && cons.status === 'requested';

                                return (
                                    <button
                                        key={patient.id}
                                        type="button"
                                        onClick={() => handleSelectPatient(patient.id)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '0.85rem 1rem',
                                            borderRadius: '10px',
                                            border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '0.75rem',
                                            boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                background: isSelected ? 'var(--primary)' : 'rgba(59, 130, 246, 0.12)',
                                                color: isSelected ? '#ffffff' : 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800,
                                                fontSize: '0.9rem',
                                                flexShrink: 0
                                            }}>
                                                {(patient.full_name || patient.username).charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: 1.2 }}>
                                                    {patient.full_name || patient.username}
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                                                    {patient.phone || `@${patient.username}`}
                                                </div>
                                            </div>
                                        </div>

                                        {isPending && (
                                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', fontWeight: 700 }}>
                                                Pending
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Panel: Patient History / Selection Workspace */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {!selectedPatientId ? (
                    <Card padding="lg" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                        <CardContent style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                            <div style={{
                                width: '72px',
                                height: '72px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(59, 130, 246, 0.12))',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.25rem'
                            }}>
                                <Stethoscope size={38} weight="duotone" />
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>
                                Patient Medicine Intelligence Workspace
                            </h2>
                            <p style={{ margin: '0 auto 1.75rem', color: 'var(--text-muted)', fontSize: '0.925rem', maxWidth: '480px', lineHeight: 1.5 }}>
                                Select a patient from your roster on the left to view active dosage routines, complete medical prescriptions, verified pharmacy purchases, and open 2-way live chat.
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <span style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Pill size={14} color="var(--primary)" /> Active Routine Tracker
                                </span>
                                <span style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Receipt size={14} color="var(--primary)" /> Verified Pharmacy Sales
                                </span>
                                <span style={{ padding: '0.4rem 0.85rem', borderRadius: '20px', background: 'var(--bg-input)', border: '1px solid var(--border)', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <ChatCircleDots size={14} color="var(--primary)" /> 2-Way Telehealth Chat
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ) : loadingHistory ? (
                    <Card padding="lg">
                        <CardContent style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p>Loading patient medicine history & records...</p>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card padding="lg">
                        <CardContent style={{ padding: '2rem', color: 'var(--danger)' }}>
                            <p>{error}</p>
                        </CardContent>
                    </Card>
                ) : history ? (
                    <>
                        {/* Patient Summary Header & Consultation Action Banner */}
                        <Card padding="lg" style={{ border: '1px solid var(--border)' }}>
                            <CardContent style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.25rem' }}>
                                        {(history.patient.full_name || history.patient.username).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
                                            {history.patient.full_name || history.patient.username}
                                        </h2>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            <span><Phone size={14} style={{ verticalAlign: 'middle' }} /> {history.patient.phone || 'N/A'}</span>
                                            <span>&bull;</span>
                                            <span>Username: @{history.patient.username}</span>
                                        </div>
                                    </div>
                                </div>

                                {patientConsultation ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <Badge variant={patientConsultation.status === 'completed' ? 'success' : patientConsultation.status === 'requested' ? 'warning' : 'info'}>
                                            CONSULTATION STATUS: {patientConsultation.status?.toUpperCase()}
                                        </Badge>
                                        {isRequestPending ? (
                                            <>
                                                <Button size="sm" onClick={() => handleAcceptConsultation(patientConsultation.id)}>
                                                    <CheckCircle size={16} /> Accept Request
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => handleDeclineConsultation(patientConsultation.id)} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                                                    <XCircle size={16} /> Decline
                                                </Button>
                                            </>
                                        ) : patientConsultation.status !== 'cancelled' ? (
                                            <Button size="sm" onClick={() => setActiveChatConsultation(patientConsultation)}>
                                                <ChatCircleDots size={16} weight="bold" /> Open Live Chat & Reply
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        No active consultation request
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Lock Banner if Request is Pending Acceptance */}
                        {isRequestPending ? (
                            <Card padding="lg" style={{ borderLeft: '4px solid var(--warning)', background: 'rgba(245, 158, 11, 0.08)' }}>
                                <CardContent style={{ padding: '1.75rem', textAlign: 'center' }}>
                                    <Lock size={46} color="var(--warning)" style={{ marginBottom: '0.75rem' }} />
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 800 }}>
                                        Consultation Request Pending Approval
                                    </h3>
                                    <p style={{ margin: '0 auto 1.35rem', color: 'var(--text-muted)', fontSize: '0.925rem', maxWidth: '500px', lineHeight: 1.5 }}>
                                        Patient details, active dosage schedules, prescription history, and live chat will unlock after you accept the consultation request.
                                    </p>
                                    <Button onClick={() => handleAcceptConsultation(patientConsultation.id)}>
                                        <CheckCircle size={18} weight="bold" /> Accept Request to Unlock Patient Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Section 1: Active Dosage Schedules & Current Medicines */}
                                <Card padding="lg">
                                    <CardHeader title="Current Medicines & Dosage Schedules" subtitle="Patient's active medicine routines." />
                                    <CardContent style={{ marginTop: '1rem' }}>
                                        {history.dosage_schedules.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No dosage schedules recorded.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {history.dosage_schedules.map((item) => (
                                                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Pill size={20} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.medicine_name}</div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.dosage} &bull; {item.frequency}</div>
                                                                {formatDay(item.start_date) && (
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                                                                        From {formatDay(item.start_date)}{formatDay(item.end_date) ? ` to ${formatDay(item.end_date)}` : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Badge variant={item.is_active ? 'success' : 'neutral'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 2: Prescription History */}
                                <Card padding="lg">
                                    <CardHeader title="Prescription History" subtitle="From all doctors, for continuity of care." />
                                    <CardContent style={{ marginTop: '1rem' }}>
                                        {history.prescriptions.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No prescriptions recorded.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                {history.prescriptions.map((prescription) => (
                                                    <div key={prescription.id} style={{ padding: '1.15rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                                                                Dr. {prescription.doctor_username} &bull; {new Date(prescription.prescription_date).toLocaleDateString()}
                                                            </div>
                                                            <Badge variant={prescription.status === 'active' ? 'success' : 'neutral'}>{prescription.status}</Badge>
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '0.35rem' }}>
                                                            {prescription.items.map((item) => (
                                                                <div key={item.id} style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                                                    &bull; <strong>{item.medicine_name}</strong> — {item.dosage}, {item.duration}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 3: Purchase History */}
                                <Card padding="lg">
                                    <CardHeader title="Purchase History" subtitle="Verified sales from pharmacies." />
                                    <CardContent style={{ marginTop: '1rem' }}>
                                        {history.sales.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No purchases recorded.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                                {history.sales.map((sale) => (
                                                    <div key={sale.id} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-input)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                            <Receipt size={18} color="var(--primary)" />
                                                            <div>
                                                                <div style={{ fontWeight: 700 }}>{sale.medicine_name} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>(Batch {sale.batch_number})</span></div>
                                                                {formatDay(sale.sale_date) && (
                                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{formatDay(sale.sale_date)}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{sale.quantity} units</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </>
                ) : null}
            </div>

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
                                        Status: <span style={{ color: 'var(--success)', fontWeight: 700, textTransform: 'capitalize' }}>{activeChatConsultation.status}</span> &bull; Live Doctor Chat
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

export default PatientMedicineHistory;
