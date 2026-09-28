import React, { useState, useEffect, useRef } from 'react';
import {
    Stethoscope, ChatCircleDots, PaperPlaneTilt, Clock, CheckCircle,
    XCircle, ArrowClockwise, UserCheck, Phone, VideoCamera, User, Warning,
    MagnifyingGlass, ImageSquare, Camera, Trash
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const DoctorConsultation = () => {
    const [activeTab, setActiveTab] = useState('requests'); // 'doctors' | 'requests'
    const [doctors, setDoctors] = useState([]);
    const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Request Modal State
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [consultationType, setConsultationType] = useState('chat');
    const [queryText, setQueryText] = useState('');
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [requestNotice, setRequestNotice] = useState(null);

    // Active Live Chat Modal State
    const [activeChatConsultation, setActiveChatConsultation] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessageText, setNewMessageText] = useState('');
    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [sendingMessage, setSendingMessage] = useState(false);

    const messagesEndRef = useRef(null);
    const galleryInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [docRes, consRes] = await Promise.all([
                api.get('core/doctors/'),
                api.get('core/citizen/consultations/')
            ]);
            setDoctors(docRes.data || []);
            setConsultations(consRes.data || []);
        } catch (err) {
            console.error('Failed to load consultation data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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

    // Auto scroll chat to bottom when messages change
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

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!selectedDoctor || !queryText.trim()) return;

        setSubmittingRequest(true);
        setRequestNotice(null);
        try {
            await api.post('core/citizen/consultations/', {
                doctor_id: selectedDoctor.id,
                consultation_type: consultationType,
                notes: queryText.trim()
            });
            setRequestNotice({ tone: 'success', text: `Consultation request sent to Dr. ${selectedDoctor.full_name}!` });
            setQueryText('');
            setSelectedDoctor(null);
            loadData();
            setActiveTab('requests');
        } catch (err) {
            setRequestNotice({ tone: 'error', text: err.response?.data?.detail || 'Failed to submit consultation request.' });
        } finally {
            setSubmittingRequest(false);
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
            loadData();
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSendingMessage(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'requested':
                return <Badge variant="warning"><Clock size={12} /> Pending Doctor Acceptance</Badge>;
            case 'accepted':
            case 'ongoing':
                return <Badge variant="success"><CheckCircle size={12} /> Accepted &bull; Live Chat</Badge>;
            case 'completed':
                return <Badge variant="neutral"><CheckCircle size={12} /> Completed</Badge>;
            case 'cancelled':
                return <Badge variant="danger"><XCircle size={12} /> Declined / Cancelled</Badge>;
            default:
                return <Badge variant="neutral">{status}</Badge>;
        }
    };

    return (
        <div className="animate-fade-in" style={{ display: 'grid', gap: '1.5rem', paddingBottom: '2.5rem' }}>
            {/* Hidden File Inputs */}
            <input type="file" accept="image/*" ref={galleryInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Stethoscope size={32} weight="duotone" color="var(--primary)" /> Doctor Consultations & Telehealth
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.925rem' }}>
                        Send medical queries to licensed doctors, get consultation approval, and chat with report photo attachments.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="outline" size="sm" onClick={loadData}>
                        <ArrowClockwise size={16} /> Refresh
                    </Button>
                </div>
            </div>

            {/* Notice Alert */}
            {requestNotice && (
                <div style={{
                    padding: '0.85rem 1.15rem',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${requestNotice.tone === 'error' ? 'var(--danger)' : 'var(--success)'}`,
                    background: requestNotice.tone === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontWeight: 600
                }}>
                    {requestNotice.text}
                </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('requests')}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'requests' ? 'var(--primary)' : 'var(--bg-card)',
                        color: activeTab === 'requests' ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'requests' ? '0 2px 8px rgba(59, 130, 246, 0.25)' : 'none'
                    }}
                >
                    <ChatCircleDots size={18} weight="duotone" /> My Consultations ({consultations.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('doctors')}
                    style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: activeTab === 'doctors' ? 'var(--primary)' : 'var(--bg-card)',
                        color: activeTab === 'doctors' ? '#ffffff' : 'var(--text-main)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: activeTab === 'doctors' ? '0 2px 8px rgba(59, 130, 246, 0.25)' : 'none'
                    }}
                >
                    <UserCheck size={18} weight="duotone" /> Find Doctors & Request
                </button>
            </div>

            {/* Tab Content 1: My Consultations */}
            {activeTab === 'requests' && (
                <Card padding="lg">
                    <CardHeader title="Active & Previous Consultation Requests" subtitle="Track approval status and jump straight into live chat with your doctor." />
                    <CardContent style={{ marginTop: '1.25rem' }}>
                        {loading ? (
                            <p style={{ color: 'var(--text-muted)' }}>Loading consultation history...</p>
                        ) : consultations.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                <Stethoscope size={48} weight="duotone" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
                                <h3>No Consultation Requests Yet</h3>
                                <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0.5rem auto 1.25rem' }}>
                                    Find a registered doctor from our directory to submit your health queries or prescription requests.
                                </p>
                                <Button onClick={() => setActiveTab('doctors')}>
                                    <UserCheck size={16} /> Browse Doctors Directory
                                </Button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {consultations.map((item) => (
                                    <div key={item.id} style={{
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
                                        <div style={{ flex: 1, minWidth: '260px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                                                    Dr. {item.doctor_full_name}
                                                </div>
                                                <span style={{ fontSize: '0.78rem', padding: '0.15rem 0.5rem', background: 'var(--bg-input)', borderRadius: '4px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    {item.doctor_license}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                Requested on: {new Date(item.consultation_date).toLocaleString()} &bull; Type: <strong style={{ textTransform: 'capitalize' }}>{item.consultation_type}</strong>
                                            </div>
                                            {item.notes && (
                                                <div style={{ fontSize: '0.88rem', background: 'var(--bg-input)', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-main)' }}>
                                                    <strong>Initial Query:</strong> "{item.notes}"
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.65rem' }}>
                                            {getStatusBadge(item.status)}
                                            {(item.status === 'accepted' || item.status === 'ongoing' || item.status === 'completed') ? (
                                                <Button size="sm" onClick={() => setActiveChatConsultation(item)}>
                                                    <ChatCircleDots size={16} weight="bold" />
                                                    {item.status === 'completed' ? 'View Chat Memory' : 'Open Live Chat'}
                                                </Button>
                                            ) : item.status === 'requested' ? (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                                                    Awaiting Doctor to Accept
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab Content 2: Find Doctors Directory */}
            {activeTab === 'doctors' && (
                <Card padding="lg">
                    <CardHeader title="Verified Registered Doctors Directory" subtitle="Search for your preferred doctor by name, username, license number or hospital." />
                    <CardContent style={{ marginTop: '1.25rem' }}>
                        {/* Search Input Box */}
                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <MagnifyingGlass size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                value={doctorSearchQuery}
                                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                                placeholder="Search doctor by name (e.g. Dr. Anisur), username, BMDC license, or hospital..."
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem 0.8rem 2.75rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {loading ? (
                            <p style={{ color: 'var(--text-muted)' }}>Loading registered doctors...</p>
                        ) : doctors.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No registered doctors currently available.</p>
                        ) : (() => {
                            const filteredDoctors = doctors.filter((doc) => {
                                const q = doctorSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (
                                    (doc.full_name && doc.full_name.toLowerCase().includes(q)) ||
                                    (doc.username && doc.username.toLowerCase().includes(q)) ||
                                    (doc.license_number && doc.license_number.toLowerCase().includes(q)) ||
                                    (doc.hospital && doc.hospital.toLowerCase().includes(q)) ||
                                    (doc.email && doc.email.toLowerCase().includes(q))
                                );
                            });

                            if (filteredDoctors.length === 0) {
                                return (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                        <MagnifyingGlass size={40} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                                        <p style={{ margin: 0 }}>No doctor matches "{doctorSearchQuery}". Try a different name or license number.</p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.15rem' }}>
                                    {filteredDoctors.map((doc) => (
                                        <div key={doc.id} style={{
                                            padding: '1.25rem',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-card)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: '1rem'
                                        }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                                        <User size={24} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                                                            Dr. {doc.full_name}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                            @{doc.username} &bull; {doc.license_number}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gap: '0.35rem' }}>
                                                    <div><strong>Hospital:</strong> {doc.hospital}</div>
                                                    <div><strong>Email:</strong> {doc.email || 'N/A'}</div>
                                                </div>
                                            </div>

                                            <Button fullWidth onClick={() => setSelectedDoctor(doc)}>
                                                <Stethoscope size={16} /> Request Consultation
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* Modal: Request Consultation Form */}
            {selectedDoctor && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 100,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <Card padding="lg" style={{ maxWidth: '520px', width: '100%', background: 'var(--bg-card)' }}>
                        <CardHeader
                            title={`Request Consultation with Dr. ${selectedDoctor.full_name}`}
                            subtitle={`License: ${selectedDoctor.license_number} | ${selectedDoctor.hospital}`}
                        />
                        <form onSubmit={handleSendRequest} style={{ marginTop: '1.25rem', display: 'grid', gap: '1.15rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                    Consultation Format
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        { value: 'chat', label: 'Chat Consultation', icon: <ChatCircleDots size={16} /> },
                                        { value: 'audio', label: 'Audio Call', icon: <Phone size={16} /> },
                                        { value: 'video', label: 'Video Call', icon: <VideoCamera size={16} /> }
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setConsultationType(opt.value)}
                                            style={{
                                                padding: '0.5rem 0.85rem',
                                                borderRadius: '8px',
                                                border: consultationType === opt.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                background: consultationType === opt.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-input)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                                    Describe your Health Query / Symptoms / Prescription Request
                                </label>
                                <textarea
                                    value={queryText}
                                    onChange={(e) => setQueryText(e.target.value)}
                                    placeholder="Describe your current symptoms, medical questions, or recent medicine history for the doctor..."
                                    rows={4}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.9rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <Button type="button" variant="outline" onClick={() => setSelectedDoctor(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submittingRequest}>
                                    {submittingRequest ? 'Submitting...' : 'Send Request'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Modal: Live 2-Way Chat Room with Photo/Camera Attachments */}
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
                                        Dr. {activeChatConsultation.doctor_full_name}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        Status: <span style={{ color: 'var(--success)', fontWeight: 700, textTransform: 'capitalize' }}>{activeChatConsultation.status}</span> &bull; 2-Way Encrypted Chat Memory
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
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>No messages yet. Start the conversation with your doctor!</p>
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

export default DoctorConsultation;
