import React, { useEffect, useState } from 'react';
import { ChatCenteredText, CheckCircle } from '@phosphor-icons/react';
import api from '../../services/api';

const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-input)',
    color: 'var(--text-light)',
    fontSize: '1rem',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
    resize: 'vertical',
};

const StatusPill = ({ children, tone = 'amber' }) => {
    const color = tone === 'green' ? 'var(--success)' : 'var(--warning)';
    const bg = tone === 'green' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '999px', background: bg, color, fontSize: '0.8rem', fontWeight: 700 }}>
            {children}
        </span>
    );
};

const Complaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [drafts, setDrafts] = useState({});
    const [resolvingId, setResolvingId] = useState(null);

    const fetchComplaints = async () => {
        try {
            const response = await api.get('core/pharmacy/complaints/');
            setComplaints(response.data);
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const handleResolve = async (id) => {
        const resolutionText = (drafts[id] || '').trim();
        if (!resolutionText) return;
        setResolvingId(id);
        try {
            await api.post(`core/pharmacy/complaints/${id}/resolve/`, { resolution_text: resolutionText });
            fetchComplaints();
        } catch (error) {
            console.error('Failed to resolve complaint:', error);
        } finally {
            setResolvingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Customer Complaint Management</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Review and resolve complaints filed by citizens against your pharmacy.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading complaints...</p>
                ) : complaints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <ChatCenteredText size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No complaints filed yet.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {complaints.map((complaint) => (
                            <div key={complaint.id} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{complaint.citizen_username}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(complaint.date_submitted).toLocaleString()}</div>
                                    </div>
                                    <StatusPill tone={complaint.status === 'resolved' ? 'green' : 'amber'}>{complaint.status}</StatusPill>
                                </div>
                                <p style={{ margin: '0 0 0.75rem' }}>{complaint.complaint_text}</p>

                                {complaint.status === 'resolved' ? (
                                    <div style={{ padding: '0.75rem 1rem', borderRadius: '0.6rem', background: 'rgba(16, 185, 129, 0.06)', color: 'var(--text-muted)' }}>
                                        <strong style={{ color: 'var(--text-light)' }}>Resolution:</strong> {complaint.resolution_text}
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                                        <textarea
                                            rows={2}
                                            placeholder="Write a resolution note..."
                                            value={drafts[complaint.id] || ''}
                                            onChange={(e) => setDrafts((current) => ({ ...current, [complaint.id]: e.target.value }))}
                                            style={inputStyle}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                type="button"
                                                className="btn-primary"
                                                style={{ width: 'auto', padding: '0.6rem 1.1rem' }}
                                                disabled={resolvingId === complaint.id || !(drafts[complaint.id] || '').trim()}
                                                onClick={() => handleResolve(complaint.id)}
                                            >
                                                <CheckCircle size={18} /> Mark Resolved
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Complaints;
