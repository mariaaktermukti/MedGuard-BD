import React, { useState, useEffect } from 'react';
import { QrCode, Pill, Clipboard, MapPin, Intersect, Alarm, CalendarBlank, Warning, ChatCircle, Pill as PillIcon, XCircle, CheckCircle, Storefront, Lightbulb } from '@phosphor-icons/react';
import api from '../services/api';
import Card, { CardContent, CardHeader, CardFooter } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const StatCard = ({ icon, label, value, color }) => (
    <Card padding="md" style={{ transition: 'all 0.3s ease', cursor: 'pointer' }} className="hover-lift">
        <CardContent style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `var(--${color}-light, #f1f5f9)`, color: `var(--${color}, var(--primary))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, marginBottom: '0.25rem' }}>{value}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            </div>
        </CardContent>
    </Card>
);

const ActionCard = ({ icon, label }) => (
    <Card padding="md" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }} className="hover-lift">
        <div style={{ color: 'var(--primary)' }}>{icon}</div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{label}</div>
    </Card>
);

const Dashboard = () => {
    const today = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
    const [data, setData] = useState({
        stats: { total_scans: 0, active_medicines: 0, reports_submitted: 0, pharmacy_visits: 0 },
        recent_activity: [],
        upcoming_dose: null,
        recalls: []
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await api.get('core/citizen/dashboard/');
                setData(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            }
        };
        fetchDashboardData();
    }, []);

    const { stats, recent_activity, upcoming_dose, recalls } = data;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Welcome, Rakib Hasan 👋</h1>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CalendarBlank size={16} /> {today}
                    </div>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard icon={<QrCode size={24} weight="fill" />} label="Total Scans" value={stats.total_scans} color="primary" />
                <StatCard icon={<Pill size={24} weight="fill" />} label="Active Medicines" value={stats.active_medicines} color="success" />
                <StatCard icon={<Clipboard size={24} weight="fill" />} label="Reports Submitted" value={stats.reports_submitted} color="warning" />
                <StatCard icon={<Storefront size={24} weight="fill" />} label="Pharmacy Visits" value={stats.pharmacy_visits} color="info" />
            </div>

            {/* Two-Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                
                {/* Left Column */}
                <div style={{ gridColumn: 'span 2' }}>
                    
                    {/* Quick Actions Grid */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                        <ActionCard icon={<QrCode size={32} weight="duotone" />} label="QR Scan" />
                        <ActionCard icon={<PillIcon size={32} weight="duotone" />} label="My Medicines" />
                        <ActionCard icon={<Clipboard size={32} weight="duotone" />} label="ADR Report" />
                        <ActionCard icon={<MapPin size={32} weight="duotone" />} label="Find Pharmacy" />
                        <ActionCard icon={<Intersect size={32} weight="duotone" />} label="Interactions" />
                        <ActionCard icon={<Alarm size={32} weight="duotone" />} label="Dose Alarm" />
                    </div>

                    {/* Recent Activity */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.25rem' }}>Recent Activity</h3>
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

                    {/* Upcoming Dose */}
                    {upcoming_dose && (
                        <Card padding="md">
                            <CardHeader title="Upcoming Dose" />
                            <CardContent>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
                                        <Pill size={32} weight="duotone" />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>{upcoming_dose.medicine_name}</div>
                                        <div style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}><Alarm size={16} /> {upcoming_dose.time}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <Button variant="outline" fullWidth>Snooze</Button>
                                    <Button variant="primary" fullWidth>Take Dose</Button>
                                </div>
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

                    {/* AI Tip */}
                    <Card padding="md" style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))', color: 'white', border: 'none' }}>
                        <CardContent>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <Lightbulb size={24} color="#F59E0B" weight="fill" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Health Tip</h3>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.9 }}>
                                Always take paracetamol after meals. Do not take it on an empty stomach to avoid acidity.
                            </p>
                        </CardContent>
                    </Card>

                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
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
