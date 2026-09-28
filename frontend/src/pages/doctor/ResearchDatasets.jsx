import React, { useEffect, useState } from 'react';
import { Database, FileText, Flask, ChatText, PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getResearchInquiries } from '../researcher/ResearcherDashboard';

const ResearchDatasets = () => {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inquiries, setInquiries] = useState(getResearchInquiries());
    const [doctorReply, setDoctorReply] = useState({});
    const [replyNotice, setReplyNotice] = useState('');

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const response = await api.get('doctor/research-datasets/');
                setDatasets(response.data);
            } catch (err) {
                console.error('Failed to fetch research datasets:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDatasets();

        const handleUpdate = () => setInquiries(getResearchInquiries());
        window.addEventListener('research_inquiries_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('research_inquiries_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const doctorInquiries = inquiries.filter(inq => {
        const t = inq.target || 'both';
        return t === 'both' || t === 'doctor';
    });

    const handleDoctorSubmitReply = (inquiryId) => {
        const text = doctorReply[inquiryId];
        if (!text || !text.trim()) return;

        const existing = getResearchInquiries();
        const updated = existing.map(inq => {
            if (inq.id === inquiryId) {
                const newRes = {
                    author: 'BMDC Registered Specialist Doctor',
                    role: 'Doctor',
                    text: text.trim(),
                    time: 'Just Now'
                };
                return {
                    ...inq,
                    status: 'Doctor Input Provided',
                    responses: [...(inq.responses || []), newRes]
                };
            }
            return inq;
        });

        localStorage.setItem('medguard_research_inquiries', JSON.stringify(updated));
        setInquiries(updated);
        window.dispatchEvent(new Event('research_inquiries_updated'));

        setDoctorReply({ ...doctorReply, [inquiryId]: '' });
        setReplyNotice('Clinical response successfully transmitted to Researcher Portal!');
        setTimeout(() => setReplyNotice(''), 4000);
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            {/* Inter-Agency Research Inquiries Card for Doctors */}
            <Card style={{ border: '1px solid var(--primary)', background: 'rgba(37, 99, 235, 0.02)' }}>
                <CardHeader
                    title="🌐 Researcher Portal Safety Inquiries & Clinical Directives"
                    subtitle="Inter-agency research inquiries submitted by pharmacovigilance researchers requesting doctor clinical inputs."
                />
                <CardContent>
                    {replyNotice && (
                        <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle size={18} weight="bold" /> {replyNotice}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {doctorInquiries.map((item) => {
                            const badgeVariant = item.priority === 'critical' ? 'danger' : item.priority === 'high' ? 'warning' : 'info';
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderLeft: `4px solid var(--${badgeVariant})`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Flask size={18} color="var(--primary)" weight="fill" />
                                            <span style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--text-main)' }}>{item.title}</span>
                                        </div>
                                        <Badge variant={badgeVariant} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{item.priority}</Badge>
                                    </div>

                                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        {item.description}
                                    </p>

                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        From: <strong>{item.researcher || 'Pharmacovigilance Researcher'}</strong> &bull; {item.timestamp}
                                    </div>

                                    {/* Existing Responses */}
                                    {item.responses && item.responses.length > 0 && (
                                        <div style={{ background: 'var(--bg-page)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', marginBottom: '0.6rem' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.3rem' }}>
                                                💬 Responses & Notes ({item.responses.length}):
                                            </div>
                                            {item.responses.map((resp, idx) => (
                                                <div key={idx} style={{ fontSize: '0.775rem', borderBottom: idx < item.responses.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                                                    <strong>{resp.author} ({resp.role}):</strong> {resp.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Doctor Reply Input */}
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <Input
                                            value={doctorReply[item.id] || ''}
                                            onChange={(e) => setDoctorReply({ ...doctorReply, [item.id]: e.target.value })}
                                            placeholder="Provide clinical feedback or patient observation notes for researchers..."
                                            style={{ fontSize: '0.825rem' }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => handleDoctorSubmitReply(item.id)}
                                            style={{ whiteSpace: 'nowrap', gap: '0.3rem' }}
                                        >
                                            <PaperPlaneTilt size={14} /> Send Input
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Existing Shared Research Datasets */}
            <Card>
                <CardHeader title="Published Clinical Research Datasets" subtitle="Metadata for datasets shared with research. Full data access is reserved for the Researcher Portal." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : datasets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Database size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No research datasets published yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {datasets.map((dataset) => (
                                <div key={dataset.id} style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileText size={18} color="var(--primary)" /> {dataset.dataset_name}
                                        </div>
                                        {dataset.has_data_file && <Badge variant="success">Data File Available</Badge>}
                                    </div>
                                    <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{dataset.description || 'No description provided.'}</p>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Published by {dataset.created_by_username} &bull; {new Date(dataset.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResearchDatasets;
