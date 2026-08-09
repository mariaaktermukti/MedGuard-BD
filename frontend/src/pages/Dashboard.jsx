import React, { useState, useEffect } from 'react';
import { QrCode, Pill, Clipboard, MapPin, Intersect, Alarm, CalendarBlank, Warning, ChatCircle, Pill as PillIcon, XCircle, CheckCircle, Storefront, Lightbulb } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import api from '../services/api';

const StatCard = ({ icon, label, value, color }) => (
    <motion.div 
        whileHover={{ y: -2, boxShadow: '0px 8px 24px rgba(0,0,0,0.1)' }}
        className="glass-panel" 
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', transition: 'all 0.3s ease' }}
    >
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-light)', lineHeight: 1, marginBottom: '0.5rem' }}>{value}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        </div>
    </motion.div>
);

const ActionCard = ({ icon, label }) => (
    <motion.div 
        whileHover={{ y: -2, boxShadow: '0px 8px 24px rgba(0,0,0,0.1)' }}
        className="glass-panel"
        style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'all 0.3s ease', textAlign: 'center' }}
    >
        <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-light)' }}>{label}</div>
    </motion.div>
);

const Dashboard = () => {
    const today = new Intl.DateTimeFormat('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
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
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', color: 'var(--text-light)' }}>স্বাগতম, রাকিব হাসান 👋</h1>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(27, 79, 114, 0.1)', color: 'var(--primary-color)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CalendarBlank size={16} /> {today}
                    </div>
                </div>
            </div>

            {/* 4 Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard icon={<QrCode size={24} weight="fill" />} label="মোট স্ক্যান" value={stats.total_scans} color="#3b82f6" />
                <StatCard icon={<Pill size={24} weight="fill" />} label="সক্রিয় ওষুধ" value={stats.active_medicines} color="var(--success)" />
                <StatCard icon={<Clipboard size={24} weight="fill" />} label="রিপোর্ট জমা" value={stats.reports_submitted} color="var(--warning)" />
                <StatCard icon={<Storefront size={24} weight="fill" />} label="ফার্মেসি ভিজিট" value={stats.pharmacy_visits} color="#8b5cf6" />
            </div>

            {/* Two-Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Left Column (Approx 65% on large screens, handled by grid layout in standard CSS but we will force it with flex if needed. Let's use grid) */}
                <div style={{ gridColumn: 'span 2' }}>
                    
                    {/* Quick Actions Grid (3x2) */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '1.25rem' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
                        <ActionCard icon={<QrCode size={32} weight="duotone" />} label="QR স্ক্যান" />
                        <ActionCard icon={<PillIcon size={32} weight="duotone" />} label="আমার ওষুধ" />
                        <ActionCard icon={<Clipboard size={32} weight="duotone" />} label="ADR রিপোর্ট" />
                        <ActionCard icon={<MapPin size={32} weight="duotone" />} label="ফার্মেসি" />
                        <ActionCard icon={<Intersect size={32} weight="duotone" />} label="ইন্টারঅ্যাকশন" />
                        <ActionCard icon={<Alarm size={32} weight="duotone" />} label="ডোজ অ্যালার্ম" />
                    </div>

                    {/* Recent Activity (Timeline) */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-light)', fontSize: '1.25rem' }}>Recent Activity</h3>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        {recent_activity.map((act, idx) => (
                            <div key={act.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: idx !== recent_activity.length - 1 ? '1.5rem' : '0' }}>
                                {idx !== recent_activity.length - 1 && (
                                    <div style={{ position: 'absolute', left: '19px', top: '38px', bottom: 0, width: '2px', background: 'var(--border-color)' }} />
                                )}
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-dark)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', zIndex: 1 }}>
                                    {act.type === 'scan' ? <QrCode size={20} /> : act.type === 'pharmacy' ? <Storefront size={20} /> : act.type === 'adr' ? <Warning size={20} /> : act.type === 'alarm' ? <Alarm size={20} /> : <ChatCircle size={20} />}
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-light)', marginBottom: '0.25rem' }}>{act.desc}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{act.time}</div>
                                    </div>
                                    <div>
                                        {act.status === 'verified' && <CheckCircle size={20} color="var(--success)" weight="fill" />}
                                        {act.status === 'pending' && <Warning size={20} color="var(--warning)" weight="fill" />}
                                        {act.status === 'completed' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-muted)' }} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column (Approx 35%) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Recall Alert (Conditional) */}
                    {recalls.map((recall, index) => (
                        <div key={index} className="glass-panel" style={{ borderLeft: '4px solid var(--danger)', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                            <Warning size={28} color="var(--danger)" weight="fill" />
                            <div>
                                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--danger)', fontSize: '1rem' }}>Recall Alert — Batch {recall.batch_number}</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{recall.reason} - সেবন বন্ধ করুন</p>
                            </div>
                        </div>
                    ))}

                    {/* Upcoming Dose */}
                    {upcoming_dose && (
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-light)' }}>Upcoming Dose</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ background: 'rgba(27, 79, 114, 0.1)', color: 'var(--primary-color)', padding: '1rem', borderRadius: '1rem' }}>
                                    <Pill size={32} weight="duotone" />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-light)', marginBottom: '0.25rem' }}>{upcoming_dose.medicine_name}</div>
                                    <div style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Alarm size={18} /> {upcoming_dose.time}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>স্নুজ</button>
                                <button style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: 'none', background: 'var(--success)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>গ্রহণ</button>
                            </div>
                        </div>
                    )}

                    {/* Nearby Pharmacy */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-light)', display: 'flex', justifyContent: 'space-between' }}>
                            Nearby Pharmacy <a href="/dashboard/find-pharmacy" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none' }}>View All</a>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>MedPlus</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>1.2 km away</div>
                                </div>
                                <div style={{ background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                    Trust 87
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>Lazz Pharma</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2.5 km away</div>
                                </div>
                                <div style={{ background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                    Trust 92
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* AI Tip */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--primary-color), #2C3E50)', color: 'white', border: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <Lightbulb size={24} color="#F59E0B" weight="fill" />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>AI Tip</h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, opacity: 0.9 }}>
                            "প্যারাসিটামল খালি পেটে খাবেন না। সব সময় ভরা পেটে সেবন করার চেষ্টা করুন।"
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
