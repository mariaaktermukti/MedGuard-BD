import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    ClipboardText,
    VideoCamera,
    WarningCircle,
    ShieldWarning,
    MagnifyingGlass,
    ArrowRight,
    Plus,
    Stethoscope,
    QrCode,
    CalendarBlank,
    CheckCircle,
    Clock,
    UserCircle,
    FileText,
    Megaphone,
    Broadcast,
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useNotifications, getDGDABroadcastAlerts } from '../../context/NotificationContext';

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
                position: 'relative',
                overflow: 'hidden',
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
            <div className="metric-arrow" style={{ color: color, opacity: 0.5, flex: '0 0 auto', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' }}>
                <ArrowRight size={16} weight="bold" />
            </div>
        </div>
    );
};

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const { broadcastAlerts: contextBroadcasts } = useNotifications() || {};
    const [data, setData] = useState({
        summary: {
            total_patients: 0,
            active_prescriptions: 0,
            total_prescriptions: 0,
            total_consultations: 0,
            pending_consultations: 0,
            ongoing_consultations: 0,
            adr_reports_submitted: 0,
            recall_alerts_flagged: 0,
        },
        recent_prescriptions: [],
        recent_consultations: [],
    });

    const dgdaAlerts = (contextBroadcasts || getDGDABroadcastAlerts()).filter(alert => {
        const targets = alert.targets || ['all'];
        return targets.includes('all') || targets.includes('doctor');
    });

    useEffect(() => {
        let isMounted = true;
        const fetchDashboard = async () => {
            try {
                const res = await api.get('doctor/dashboard/');
                if (isMounted) {
                    setData(res.data);
                }
            } catch (err) {
                console.error('Failed to load doctor dashboard:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchDashboard();
        return () => { isMounted = false; };
    }, []);

    const summary = data.summary || {};

    const metrics = [
        { label: 'Total Registered Patients', value: summary.total_patients ?? 0, icon: <Users size={20} weight="duotone" />, path: '/dashboard/doctor/patient-history', color: '#2563eb' },
        { label: 'Active Digital Prescriptions', value: summary.active_prescriptions ?? 0, icon: <ClipboardText size={20} weight="duotone" />, path: '/dashboard/doctor/prescriptions', color: '#10b981' },
        { label: 'Pending Telehealth Requests', value: summary.pending_consultations ?? 0, icon: <VideoCamera size={20} weight="duotone" />, path: '/dashboard/doctor/consultations', color: '#f59e0b' },
        { label: 'Active Recall Safety Flags', value: summary.recall_alerts_flagged ?? 0, icon: <WarningCircle size={20} weight="duotone" />, path: '/dashboard/doctor/recall-alerts', color: '#ef4444' },
        { label: 'Reported ADR Signals', value: summary.adr_reports_submitted ?? 0, icon: <ShieldWarning size={20} weight="duotone" />, path: '/dashboard/doctor/adr-report', color: '#8b5cf6' },
        { label: 'Total Prescriptions Issued', value: summary.total_prescriptions ?? 0, icon: <FileText size={20} weight="duotone" />, path: '/dashboard/doctor/prescriptions', color: '#06b6d4' },
        { label: 'Telehealth Sessions', value: summary.total_consultations ?? 0, icon: <Stethoscope size={20} weight="duotone" />, path: '/dashboard/doctor/consultations', color: '#ec4899' },
        { label: 'AI Drug Interaction Checker', value: 'AI Ready', icon: <MagnifyingGlass size={20} weight="duotone" />, path: '/dashboard/doctor/interaction-checker', color: '#6366f1' },
    ];

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* 8 Dynamic Metric Action Cards */}
            <div className="medguard-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
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

            {/* DGDA Emergency Push Broadcast Directives */}
            {dgdaAlerts.length > 0 && (
                <div style={{ padding: '1.25rem', borderRadius: '1rem', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.04)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--danger)', fontWeight: 800, fontSize: '1.05rem' }}>
                            <Megaphone size={22} weight="fill" /> 🚨 DGDA Emergency Directives & Safety Alerts ({dgdaAlerts.length})
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/doctor/recall-alerts')} style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: '0.8rem' }}>
                            View All Safety Directives <ArrowRight size={14} />
                        </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.85rem' }}>
                        {dgdaAlerts.slice(0, 2).map((alert) => (
                            <div key={alert.id} style={{ padding: '0.85rem 1rem', background: 'var(--bg-card)', borderRadius: '0.75rem', border: '1px solid var(--border)', borderLeft: '4px solid var(--danger)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{alert.title}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(239, 68, 68, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                        {alert.priority || 'CRITICAL'}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{alert.message}</p>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.35rem' }}>
                                    <span>From: {alert.sender || 'DGDA Central Operations'}</span>
                                    <span>{alert.timestamp || 'Just Now'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Patient Consultation & Prescription Overview */}
            <div className="medguard-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                {/* Recent Telehealth Consultations */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Recent Telehealth Consultations</h2>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Latest appointment & chat requests from patients</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/doctor/consultations')}>
                            View All <ArrowRight size={14} />
                        </Button>
                    </div>

                    {data.recent_consultations.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No telehealth consultations recorded yet.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {data.recent_consultations.map((consult) => (
                                <div
                                    key={consult.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        gap: '1rem',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                            <UserCircle size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                                {consult.citizen_details?.full_name || consult.citizen_details?.username || `Patient #${consult.citizen}`}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {consult.consultation_type ? String(consult.consultation_type).toUpperCase() : 'TELEHEALTH'} | {new Date(consult.consultation_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        style={{
                                            padding: '0.25rem 0.65rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: consult.status === 'accepted' ? 'rgba(16, 185, 129, 0.1)' : consult.status === 'requested' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                            color: consult.status === 'accepted' ? '#10b981' : consult.status === 'requested' ? '#f59e0b' : 'var(--text-muted)',
                                        }}
                                    >
                                        {consult.status ? String(consult.status).toUpperCase() : 'PENDING'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Prescriptions Issued */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Recent Digital Prescriptions</h2>
                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verified electronic prescriptions issued to patients</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/doctor/prescriptions')}>
                            View All <ArrowRight size={14} />
                        </Button>
                    </div>

                    {data.recent_prescriptions.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            No prescriptions issued yet. Click "Write New Prescription" above to issue one.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {data.recent_prescriptions.map((rx) => (
                                <div
                                    key={rx.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-input)',
                                        gap: '1rem',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                            Rx #{rx.id} — {rx.citizen_details?.full_name || rx.citizen_details?.username || `Patient #${rx.citizen}`}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {rx.items?.length || 0} medicine{(rx.items?.length || 0) === 1 ? '' : 's'} | Issued {new Date(rx.prescription_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <span
                                        style={{
                                            padding: '0.25rem 0.65rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            background: rx.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                            color: rx.status === 'active' ? '#10b981' : 'var(--text-muted)',
                                        }}
                                    >
                                        {rx.status ? String(rx.status).toUpperCase() : 'ACTIVE'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .doctor-metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.12) !important;
                    border-color: var(--primary) !important;
                }
                .doctor-metric-card:hover .metric-arrow {
                    transform: translateX(3px);
                    opacity: 1 !important;
                }

                @media (max-width: 1024px) {
                    .medguard-metric-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                    }
                }
                @media (max-width: 640px) {
                    .medguard-metric-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .medguard-two-col {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default DoctorDashboard;
