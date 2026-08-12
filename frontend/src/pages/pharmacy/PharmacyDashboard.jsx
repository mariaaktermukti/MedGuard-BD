import React, { useEffect, useState } from 'react';
import { Package, Warning, CalendarBlank, ShieldCheck, ChatCenteredText, Receipt } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import api from '../../services/api';

const MetricCard = ({ icon, label, value }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '132px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', flex: '0 0 auto' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{label}</div>
        </div>
    </div>
);

const PharmacyDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('core/pharmacy/dashboard/');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch pharmacy dashboard:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>;
    }

    const summary = data?.summary || {};
    const topSelling = data?.charts?.top_selling_medicines || [];

    return (
        <div style={{ maxWidth: '1120px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Pharmacy Trust Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Operational overview across stock, sales, recalls, and complaints.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.5rem' }}>
                <MetricCard icon={<Package size={18} />} label="Stock Items" value={summary.total_stock_items ?? 0} />
                <MetricCard icon={<Warning size={18} />} label="Low Stock" value={summary.low_stock_items ?? 0} />
                <MetricCard icon={<CalendarBlank size={18} />} label="Expiring (90d)" value={summary.expiring_items ?? 0} />
                <MetricCard icon={<Warning size={18} />} label="Active Recalls" value={summary.active_recalls ?? 0} />
                <MetricCard icon={<ChatCenteredText size={18} />} label="Pending Complaints" value={summary.pending_complaints ?? 0} />
                <MetricCard icon={<Receipt size={18} />} label="Sales (30d)" value={summary.sales_30d ?? 0} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Top-Selling Medicines (90 days)</h2>
                    {topSelling.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No sales recorded yet.</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {topSelling.map((row) => (
                                <div key={row.medicine} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span>{row.medicine}</span>
                                    <span style={{ fontWeight: 700 }}>{row.units} units</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={20} color="var(--primary-color)" /> Trust Score
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: `conic-gradient(var(--primary-color) 0% ${summary.trust_score ?? 0}%, rgba(148, 163, 184, 0.16) ${summary.trust_score ?? 0}% 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'var(--bg-card)', boxShadow: 'inset 0 0 0 1px var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{summary.trust_score ?? 0}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{summary.trust_grade ?? '-'}</div>
                            </div>
                        </div>
                    </div>
                    <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Revenue (30d): {summary.revenue_30d ?? '0'}
                    </p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link to="/dashboard/pharmacy/inventory" className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.1rem', textDecoration: 'none' }}>Manage Inventory</Link>
                <Link to="/dashboard/pharmacy/sales" className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.1rem', textDecoration: 'none' }}>Log a Sale</Link>
                <Link to="/dashboard/pharmacy/alerts" className="btn-primary" style={{ width: 'auto', padding: '0.65rem 1.1rem', textDecoration: 'none' }}>View Alerts</Link>
            </div>
        </div>
    );
};

export default PharmacyDashboard;
