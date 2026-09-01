import React, { useState, useEffect, useContext } from 'react';
import { QrCode, Pill, Clipboard, MapPin, Intersect, Alarm, CalendarBlank, Warning, ChatCircle, Pill as PillIcon, XCircle, CheckCircle, Storefront, Lightbulb, Timer, ArrowRight } from '@phosphor-icons/react';
import api from '../services/api';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../components/ui/Skeleton';

const StatCard = ({ icon, label, value, color, onClick }) => (
    <Card 
        padding="md" 
        onClick={onClick} 
        style={{ 
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
            cursor: 'pointer',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none'
        }} 
        className="hover-lift stat-card-interactive"
    >
        <CardContent style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    borderRadius: '14px', 
                    background: `var(--${color}-light, #f1f5f9)`, 
                    color: `var(--${color}, var(--primary))`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.1, letterSpacing: '-0.5px' }}>{value}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.15rem' }}>{label}</div>
                </div>
            </div>

            <div style={{ 
                opacity: 0.5, 
                transition: 'all 0.2s ease', 
                color: `var(--${color}, var(--primary))`,
                display: 'flex',
                alignItems: 'center'
            }} className="arrow-icon">
                <ArrowRight size={18} weight="bold" />
            </div>
        </CardContent>
    </Card>
);

const ActionCard = ({ icon, label, onClick }) => (
    <Card padding="md" onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }} className="hover-lift">
        <div style={{ color: 'var(--primary)' }}>{icon}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
    </Card>
);

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const today = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
    
    const [data, setData] = useState({
        stats: { total_scans: 42, active_medicines: 5, reports_submitted: 4, pharmacy_visits: 8 },
        recent_activity: [],
        upcoming_dose: null,
        recalls: []
    });

    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('core/citizen/dashboard/');
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const { stats, recent_activity, upcoming_dose, recalls } = data;
    const userName = user?.full_name || user?.username || 'Citizen User';

    // Live remaining countdown calculation for upcoming dose
    const calculateCountdown = (doseTimeStr) => {
        if (!doseTimeStr) return null;
        try {
            const now = currentTime;
            let target = new Date(now);
            const str = doseTimeStr.trim().toUpperCase();
            let hours = 0, minutes = 0;

            if (str.includes('AM') || str.includes('PM')) {
                const parts = str.replace(/AM|PM/, '').trim().split(':');
                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
                if (str.includes('PM') && hours < 12) hours += 12;
                if (str.includes('AM') && hours === 12) hours = 0;
            } else {
                const parts = str.split(':');
                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
            }

            target.setHours(hours, minutes, 0, 0);
            if (target < now) target.setDate(target.getDate() + 1);

            const diffMs = target - now;
            const diffSec = Math.floor((diffMs / 1000) % 60);
            const diffMin = Math.floor((diffMs / (1000 * 60)) % 60);
            const diffHr = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMs <= 1000) return { text: '⏰ DUE NOW!', isDue: true };

            let text = "";
            if (diffHr > 0) text += `${diffHr}h `;
            text += `${diffMin.toString().padStart(2, '0')}m ${diffSec.toString().padStart(2, '0')}s`;
            return { text: `⏳ In ${text}`, isDue: false };
        } catch (e) {
            return null;
        }
    };

    const countdownInfo = upcoming_dose ? calculateCountdown(upcoming_dose.time) : null;

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontWeight: 800 }}>
                        Welcome, {userName} 👋
                    </h1>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700 }}>
                        <CalendarBlank size={16} /> {today}
                    </div>
                </div>
            </div>

            {/* 4 Interactive Responsive Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.25rem' }}>
                <StatCard 
                    icon={<QrCode size={26} weight="fill" />} 
                    label="Total Scans" 
                    value={stats.total_scans || 42} 
                    color="primary" 
                    onClick={() => navigate('/dashboard/drug-passport')}
                />
                <StatCard 
                    icon={<Pill size={26} weight="fill" />} 
                    label="Active Medicines" 
                    value={stats.active_medicines || 5} 
                    color="success" 
                    onClick={() => navigate('/dashboard/my-medicines')}
                />
                <StatCard 
                    icon={<Clipboard size={26} weight="fill" />} 
                    label="Reports Submitted" 
                    value={stats.reports_submitted || 4} 
                    color="warning" 
                    onClick={() => navigate('/dashboard/report-adr')}
                />
                <StatCard 
                    icon={<Storefront size={26} weight="fill" />} 
                    label="Pharmacy Visits" 
                    value={stats.pharmacy_visits || 8} 
                    color="info" 
                    onClick={() => navigate('/dashboard/find-pharmacy')}
                />
            </div>

            {/* Two-Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                
                {/* Left Column */}
                <div style={{ gridColumn: 'span 2' }}>
                    
                    {/* Quick Actions Grid */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                        <ActionCard icon={<QrCode size={32} weight="duotone" />} label="QR Scan" onClick={() => navigate('/dashboard/drug-passport')} />
                        <ActionCard icon={<PillIcon size={32} weight="duotone" />} label="My Medicines" onClick={() => navigate('/dashboard/my-medicines')} />
                        <ActionCard icon={<Clipboard size={32} weight="duotone" />} label="ADR Report" onClick={() => navigate('/dashboard/report-adr')} />
                        <ActionCard icon={<MapPin size={32} weight="duotone" />} label="Find Pharmacy" onClick={() => navigate('/dashboard/find-pharmacy')} />
                        <ActionCard icon={<Intersect size={32} weight="duotone" />} label="Interactions" onClick={() => navigate('/dashboard/interaction-checker')} />
                        <ActionCard icon={<Alarm size={32} weight="duotone" />} label="Dose Alarm" onClick={() => navigate('/dashboard/my-medicines')} />
                    </div>

                    {/* Recent Activity */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>Recent Activity</h3>
                    <Card padding="lg">
                        <CardContent>
                            {recent_activity.length > 0 ? recent_activity.map((act, idx) => (
                                <div key={act.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: idx !== recent_activity.length - 1 ? '1.5rem' : '0' }}>
                                    {idx !== recent_activity.length - 1 && (
                                        <div style={{ position: 'absolute', left: '19px', top: '38px', bottom: 0, width: '2px', background: 'var(--border)' }} />
                                    )}
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-page)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', zIndex: 1 }}>
                                        {act.type === 'scan' ? <QrCode size={20} /> : act.type === 'pharmacy' ? <Storefront size={20} /> : act.type === 'adr' ? <Warning size={20} /> : act.type === 'alarm' ? <Alarm size={20} /> : <ChatCircle size={20} />}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{act.desc}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{act.time}</div>
                                        </div>
                                        <div>
                                            {act.status === 'verified' && <Badge variant="success">Verified</Badge>}
                                            {act.status === 'pending' && <Badge variant="warning">Pending</Badge>}
                                            {act.status === 'completed' && <Badge variant="neutral">Done</Badge>}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 1' }}>
                    
                    {/* Recall Alert (Conditional) */}
                    {recalls.map((recall, index) => (
                        <Card key={index} padding="md" style={{ borderLeft: '4px solid var(--danger)' }}>
                            <CardContent style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <Warning size={28} color="var(--danger)" weight="fill" />
                                <div>
                                    <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--danger)', fontSize: '1rem' }}>Recall Alert — Batch {recall.batch_number}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{recall.reason} - Stop using immediately.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {/* DYNAMIC UPCOMING DOSE WIDGET */}
                    {upcoming_dose ? (
                        <Card padding="md" style={{ borderLeft: '4px solid #059669', background: 'var(--bg-card)' }}>
                            <CardHeader 
                                title="⏰ Next Upcoming Dose" 
                                action={
                                    countdownInfo && (
                                        <span style={{ 
                                            background: countdownInfo.isDue ? '#fef2f2' : '#ecfdf5', 
                                            color: countdownInfo.isDue ? '#ef4444' : '#047857',
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '12px',
                                            fontWeight: 800,
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            border: `1px solid ${countdownInfo.isDue ? '#fecaca' : '#a7f3d0'}`
                                        }}>
                                            <Timer size={14} weight="fill" /> {countdownInfo.text}
                                        </span>
                                    )
                                }
                            />
                            <CardContent>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ background: '#ecfdf5', color: '#059669', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                                        <Pill size={32} weight="duotone" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                                            {upcoming_dose.medicine_name}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                                            Dosage: {upcoming_dose.dosage} ({upcoming_dose.frequency})
                                        </div>
                                        <div style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem' }}>
                                            <Alarm size={18} weight="fill" /> {upcoming_dose.time}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <Button variant="outline" fullWidth onClick={() => navigate('/dashboard/my-medicines')}>
                                        Manage Doses
                                    </Button>
                                    <Button variant="primary" fullWidth onClick={() => navigate('/dashboard/my-medicines')}>
                                        Take Dose
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card padding="md">
                            <CardHeader title="⏰ Upcoming Dose" />
                            <CardContent style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                                <Alarm size={36} color="var(--primary)" weight="duotone" style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                    No Active Dose Scheduled
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    Add your daily medicine record to activate dose alarms.
                                </div>
                                <Button variant="primary" fullWidth onClick={() => navigate('/dashboard/my-medicines')}>
                                    + Add Medicine Record
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Nearby Pharmacy */}
                    <Card padding="md">
                        <CardHeader 
                            title="Nearby Pharmacies" 
                            action={<a href="/dashboard/find-pharmacy" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>View All</a>}
                        />
                        <CardContent>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>MedPlus</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>1.2 km away</div>
                                    </div>
                                    <Badge variant="success">Trust 87</Badge>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Lazz Pharma</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2.5 km away</div>
                                    </div>
                                    <Badge variant="success">Trust 92</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Health Tip */}
                    <Card padding="md" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '12px' }}>
                        <CardContent>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <Lightbulb size={24} color="var(--primary)" weight="fill" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 700 }}>Health Tip</h3>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.5, color: 'var(--text-main)', fontWeight: 600 }}>
                                Always take paracetamol after meals. Do not take it on an empty stomach to avoid acidity.
                            </p>
                        </CardContent>
                    </Card>

                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .stat-card-interactive {
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease, border-color 0.25s ease !important;
                }
                .stat-card-interactive:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.04);
                    border-color: var(--primary) !important;
                }
                .stat-card-interactive:active {
                    transform: scale(0.97) translateY(-1px);
                }
                .stat-card-interactive:hover .arrow-icon {
                    opacity: 1 !important;
                    transform: translateX(4px);
                }
                .hover-lift {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--shadow-md);
                }
            `}} />
        </div>
    );
};

export default Dashboard;
