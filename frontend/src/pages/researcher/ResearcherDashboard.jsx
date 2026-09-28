import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Flask, Pulse, SquaresFour, DownloadSimple, Graph, BookOpen, Lightbulb,
    UsersThree, WarningCircle, ShieldWarning, Stethoscope, Buildings, ArrowRight,
    PaperPlaneTilt, CheckCircle, ChatText, MagnifyingGlass, FileText, Database, UserCircle
} from '@phosphor-icons/react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DEFAULT_INQUIRIES = [
    {
        id: 'inq-101',
        title: 'Post-Marketing Safety Inquiry: Paediatric Paracetamol Hepatotoxicity Signals',
        description: 'Collaborative analysis requesting clinical feedback from doctors on observed liver enzyme elevation cases following standard paediatric paracetamol dosing.',
        target: 'both',
        targetLabel: 'Doctor & DGDA Vigilance',
        priority: 'critical',
        status: 'Doctor Input Received',
        researcher: 'Prof. Dr. A. K. Rahman (Director, Pharmacovigilance Lab)',
        timestamp: 'Today, 11:30 AM',
        responses: [
            {
                author: 'Dr. S. Hossain (BSMMU Hospital)',
                role: 'Doctor',
                text: 'Observed 3 cases in Paediatric Ward with elevated ALT/AST. Full clinical details uploaded to ADR registry.',
                time: 'Today, 12:15 PM'
            },
            {
                author: 'DGDA Vigilance Desk',
                role: 'DGDA',
                text: 'Batch #8839 quarantined nationwide pending chemical assay & dissolution test results.',
                time: 'Today, 01:45 PM'
            }
        ]
    },
    {
        id: 'inq-102',
        title: 'Real-World Evidence: Fixed-Dose Combination Antihypertensive Efficacy',
        description: 'Comparative safety & compliance assessment of Amlodipine + Atenolol vs Monotherapy in elderly hypertensive patients.',
        target: 'doctor',
        targetLabel: 'Doctor Portal',
        priority: 'high',
        status: 'Active Data Gathering',
        researcher: 'National Drug Safety Research Network',
        timestamp: 'Yesterday, 03:20 PM',
        responses: [
            {
                author: 'Dr. Farhana Ahmed (Cardiologist)',
                role: 'Doctor',
                text: 'Patient adherence improved by 28% with FDC pill. Lower incidence of peripheral edema reported.',
                time: 'Yesterday, 05:10 PM'
            }
        ]
    }
];

export const getResearchInquiries = () => {
    try {
        const stored = localStorage.getItem('medguard_research_inquiries');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("Error reading research inquiries", e);
    }
    localStorage.setItem('medguard_research_inquiries', JSON.stringify(DEFAULT_INQUIRIES));
    return DEFAULT_INQUIRIES;
};

const MetricCard = ({ icon, label, value, path, color = 'var(--primary)' }) => {
    const navigate = useNavigate();
    return (
        <div
            className="glass-panel doctor-metric-card"
            onClick={() => navigate(path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(path); }}
            style={{
                padding: '1.15rem 1.25rem',
                minHeight: '104px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                cursor: 'pointer',
                borderRadius: '0.85rem',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            }}
        >
            <div
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${color}15`,
                    color: color,
                    flex: '0 0 auto',
                }}
            >
                {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                    {value}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {label}
                </div>
            </div>
            <div className="metric-arrow" style={{ color: color, opacity: 0.5, flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
                <ArrowRight size={16} weight="bold" />
            </div>
        </div>
    );
};

const ResearcherDashboard = () => {
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState(getResearchInquiries());
    const [inquiryTitle, setInquiryTitle] = useState('');
    const [inquiryDesc, setInquiryDesc] = useState('');
    const [targetAgency, setTargetAgency] = useState('both'); // 'doctor', 'dgda', 'both'
    const [inquiryPriority, setInquiryPriority] = useState('critical');
    const [successNotice, setSuccessNotice] = useState('');
    const [replyTexts, setReplyTexts] = useState({});

    useEffect(() => {
        const handleUpdate = () => setInquiries(getResearchInquiries());
        window.addEventListener('research_inquiries_updated', handleUpdate);
        window.addEventListener('storage', handleUpdate);
        return () => {
            window.removeEventListener('research_inquiries_updated', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const handleCreateInquiry = (e) => {
        e.preventDefault();
        if (!inquiryTitle.trim() || !inquiryDesc.trim()) return;

        const targetLabel = targetAgency === 'both' ? 'Doctor & DGDA' : targetAgency === 'doctor' ? 'Doctor Portal' : 'DGDA Vigilance';

        const newInquiry = {
            id: `inq-${Date.now()}`,
            title: inquiryTitle,
            description: inquiryDesc,
            target: targetAgency,
            targetLabel,
            priority: inquiryPriority,
            status: 'Awaiting Response',
            researcher: 'National Pharmacovigilance Researcher',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            created_at: new Date().toISOString(),
            responses: []
        };

        const existing = getResearchInquiries();
        const updated = [newInquiry, ...existing];
        localStorage.setItem('medguard_research_inquiries', JSON.stringify(updated));
        setInquiries(updated);
        window.dispatchEvent(new Event('research_inquiries_updated'));

        setSuccessNotice(`Clinical Inquiry successfully published to ${targetLabel}!`);
        setInquiryTitle('');
        setInquiryDesc('');
        setTimeout(() => setSuccessNotice(''), 5000);
    };

    const handleAddResponse = (inquiryId, authorName, authorRole) => {
        const text = replyTexts[inquiryId];
        if (!text || !text.trim()) return;

        const existing = getResearchInquiries();
        const updated = existing.map(inq => {
            if (inq.id === inquiryId) {
                const newRes = {
                    author: authorName || 'Medical Researcher',
                    role: authorRole || 'Researcher',
                    text: text.trim(),
                    time: 'Just Now'
                };
                return {
                    ...inq,
                    status: 'Response Added',
                    responses: [...(inq.responses || []), newRes]
                };
            }
            return inq;
        });

        localStorage.setItem('medguard_research_inquiries', JSON.stringify(updated));
        setInquiries(updated);
        window.dispatchEvent(new Event('research_inquiries_updated'));
        setReplyTexts({ ...replyTexts, [inquiryId]: '' });
    };

    const metrics = [
        { label: 'Active ADR Safety Signals', value: '14 Flagged', icon: <Pulse size={20} weight="duotone" />, path: '/dashboard/researcher/signals', color: '#ef4444' },
        { label: 'Knowledge Graph Entities', value: '48,250 Nodes', icon: <Graph size={20} weight="duotone" />, path: '/dashboard/researcher/knowledge-graph', color: '#2563eb' },
        { label: 'Clinical Hypotheses', value: '8 In-Progress', icon: <Lightbulb size={20} weight="duotone" />, path: '/dashboard/researcher/hypotheses', color: '#f59e0b' },
        { label: 'Doctor & DGDA Studies', value: `${inquiries.length} Active`, icon: <UsersThree size={20} weight="duotone" />, path: '/dashboard/researcher/workspace', color: '#10b981' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header Card */}
            <Card padding="md" style={{ background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06) 0%, rgba(16, 185, 129, 0.06) 100%)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', fontSize: '0.775rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                            <Flask size={16} weight="fill" /> National Pharmacovigilance & Clinical Research Hub
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            Researcher Control Dashboard
                        </h2>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Real-world evidence analytics, AI signal detection, and inter-agency collaboration with Doctors & DGDA regulators.
                        </p>
                    </div>
                </div>
            </Card>

            {/* 4 Metric Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {metrics.map((item) => (
                    <MetricCard
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                        path={item.path}
                        color={item.color}
                    />
                ))}
            </div>

            {/* Inter-Agency Connection Console (Doctor & DGDA Collaboration Hub) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* Submit New Joint Inquiry Form Card */}
                <Card padding="lg" style={{ border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--primary)' }}>
                            <UsersThree size={22} weight="bold" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>Publish Clinical Safety Inquiry</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send research directives & inquiries directly to Doctors and DGDA Regulators</p>
                        </div>
                    </div>

                    {successNotice && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle size={18} weight="bold" />
                            {successNotice}
                        </div>
                    )}

                    <form onSubmit={handleCreateInquiry} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                        
                        {/* Target Agency Selection */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                                Target Recipient Portals:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setTargetAgency('both')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: targetAgency === 'both' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        background: targetAgency === 'both' ? 'var(--primary)' : 'var(--bg-page)',
                                        color: targetAgency === 'both' ? '#ffffff' : 'var(--text-main)'
                                    }}
                                >
                                    🌐 Both Portals
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetAgency('doctor')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: targetAgency === 'doctor' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        background: targetAgency === 'doctor' ? 'var(--primary)' : 'var(--bg-page)',
                                        color: targetAgency === 'doctor' ? '#ffffff' : 'var(--text-main)'
                                    }}
                                >
                                    <Stethoscope size={14} /> Doctor Portal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetAgency('dgda')}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: targetAgency === 'dgda' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        background: targetAgency === 'dgda' ? 'var(--primary)' : 'var(--bg-page)',
                                        color: targetAgency === 'dgda' ? '#ffffff' : 'var(--text-main)'
                                    }}
                                >
                                    <Buildings size={14} /> DGDA Desk
                                </button>
                            </div>
                        </div>

                        {/* Priority Level */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                                Inquiry Urgency Level:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setInquiryPriority('critical')}
                                    style={{
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: inquiryPriority === 'critical' ? '1.5px solid var(--danger)' : '1px solid var(--border)',
                                        background: inquiryPriority === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-page)',
                                        color: inquiryPriority === 'critical' ? 'var(--danger)' : 'var(--text-muted)'
                                    }}
                                >
                                    🔴 CRITICAL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInquiryPriority('high')}
                                    style={{
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: inquiryPriority === 'high' ? '1.5px solid var(--warning)' : '1px solid var(--border)',
                                        background: inquiryPriority === 'high' ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-page)',
                                        color: inquiryPriority === 'high' ? 'var(--warning)' : 'var(--text-muted)'
                                    }}
                                >
                                    🟠 HIGH
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInquiryPriority('advisory')}
                                    style={{
                                        padding: '0.45rem',
                                        borderRadius: '8px',
                                        fontSize: '0.775rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        border: inquiryPriority === 'advisory' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        background: inquiryPriority === 'advisory' ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-page)',
                                        color: inquiryPriority === 'advisory' ? 'var(--primary)' : 'var(--text-muted)'
                                    }}
                                >
                                    🔵 ADVISORY
                                </button>
                            </div>
                        </div>

                        {/* Title Input */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                                Study / Inquiry Subject:
                            </label>
                            <Input
                                value={inquiryTitle}
                                onChange={(e) => setInquiryTitle(e.target.value)}
                                placeholder="e.g., Clinical Input Requested: Nephrotoxicity in NSAID Therapy"
                                required
                            />
                        </div>

                        {/* Description Textarea */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                                Clinical Hypothesis & Research Details:
                            </label>
                            <textarea
                                value={inquiryDesc}
                                onChange={(e) => setInquiryDesc(e.target.value)}
                                rows={3}
                                placeholder="Outline clinical questions, specific patient observation parameters needed from doctors, or regulatory action requests for DGDA..."
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.75rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-page)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.85rem',
                                    fontFamily: 'inherit',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '0.65rem',
                                fontSize: '0.9rem',
                                fontWeight: 700
                            }}
                        >
                            <PaperPlaneTilt size={16} weight="bold" />
                            Publish Inquiry to Doctor & DGDA Portals
                        </Button>

                    </form>
                </Card>

                {/* Active Inter-Agency Inquiries & Clinical Inputs */}
                <Card padding="lg" style={{ border: '1px solid var(--border)', maxHeight: '680px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)' }}>
                            <ChatText size={22} weight="bold" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>Active Inter-Agency Consultations</h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live thread of inquiries and responses between Researchers, Doctors & DGDA</p>
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.25rem' }}>
                        {inquiries.map((item) => {
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.3 }}>{item.title}</span>
                                        <Badge variant={badgeVariant} style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>{item.priority}</Badge>
                                    </div>

                                    <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        {item.description}
                                    </p>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '0.4rem', marginBottom: '0.6rem' }}>
                                        <Badge variant="outline" style={{ fontSize: '0.7rem' }}>Recipient: {item.targetLabel}</Badge>
                                        <span style={{ fontWeight: 600 }}>{item.timestamp}</span>
                                    </div>

                                    {/* Inter-Agency Responses */}
                                    {item.responses && item.responses.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--bg-card)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.4rem' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                                                💬 Clinical Responses & DGDA Action Notes ({item.responses.length}):
                                            </div>
                                            {item.responses.map((resp, idx) => (
                                                <div key={idx} style={{ fontSize: '0.8rem', borderBottom: idx < item.responses.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: '0.3rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)' }}>
                                                        <span>{resp.author} ({resp.role})</span>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{resp.time}</span>
                                                    </div>
                                                    <p style={{ margin: '0.15rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.775rem' }}>{resp.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Quick Reply Form */}
                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
                                        <Input
                                            value={replyTexts[item.id] || ''}
                                            onChange={(e) => setReplyTexts({ ...replyTexts, [item.id]: e.target.value })}
                                            placeholder="Add researcher note or clinical observation..."
                                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddResponse(item.id, 'Senior Pharmacovigilance Researcher', 'Researcher')}
                                            style={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                                        >
                                            Reply
                                        </Button>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                </Card>

            </div>

            {/* Quick Analytical Module Navigation Cards */}
            <Card padding="lg">
                <CardHeader title="Specialized Pharmacovigilance Research Modules" subtitle="Deep-dive analytical toolsets for signal detection, graph exploration, and dataset export." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div
                        onClick={() => navigate('/dashboard/researcher/signals')}
                        style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 800 }}>
                            <Pulse size={20} /> ADR Signal Detection
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            Statistical disproportionality algorithms (PRR & ROR) to detect safety signals early.
                        </p>
                    </div>

                    <div
                        onClick={() => navigate('/dashboard/researcher/knowledge-graph')}
                        style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 800 }}>
                            <Graph size={20} /> Knowledge Graph Explorer
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            Interactive visual network mapping drug-target-adverse reaction pathways.
                        </p>
                    </div>

                    <div
                        onClick={() => navigate('/dashboard/researcher/export')}
                        style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: 800 }}>
                            <DownloadSimple size={20} /> Ethics-Governed Dataset Export
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            Export anonymized clinical trial & post-market surveillance datasets for R/Python.
                        </p>
                    </div>

                    <div
                        onClick={() => navigate('/dashboard/researcher/hypotheses')}
                        style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-page)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)', fontWeight: 800 }}>
                            <Lightbulb size={20} /> Hypothesis Generator
                        </div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                            AI-assisted clinical safety hypothesis formulation & observational study design.
                        </p>
                    </div>
                </div>
            </Card>

        </div>
    );
};

export default ResearcherDashboard;
