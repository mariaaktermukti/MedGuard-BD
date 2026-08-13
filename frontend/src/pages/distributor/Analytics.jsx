import React, { useEffect, useState } from 'react';
import { ChartBar, Truck, CheckCircle, Clock, Warning, XCircle } from '@phosphor-icons/react';
import api from '../../services/api';

const MetricCard = ({ icon, label, value }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', minHeight: '110px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', flex: '0 0 auto' }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{label}</div>
        </div>
    </div>
);

const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('core/distributor/analytics/');
                setData(response.data);
            } catch (error) {
                console.error('Failed to fetch distributor analytics:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>;
    }

    const summary = data?.summary || {};
    const monthlyVolume = data?.charts?.monthly_volume || [];
    const topDestinations = data?.charts?.top_destinations || [];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary-color)' }}>Distribution Analytics</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Delivery performance for shipments you've sent to pharmacies.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem' }}>
                <MetricCard icon={<Truck size={18} />} label="Total Shipments" value={summary.total_shipments ?? 0} />
                <MetricCard icon={<CheckCircle size={18} />} label="Delivered" value={summary.delivered ?? 0} />
                <MetricCard icon={<Clock size={18} />} label="In Transit" value={summary.in_transit ?? 0} />
                <MetricCard icon={<Warning size={18} />} label="Pending" value={summary.pending ?? 0} />
                <MetricCard icon={<XCircle size={18} />} label="Cancelled" value={summary.cancelled ?? 0} />
                <MetricCard icon={<ChartBar size={18} />} label="Avg. Transit Days" value={summary.avg_transit_days ?? 'N/A'} />
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Monthly Shipment Volume</h2>
                {monthlyVolume.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No shipment data yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                        {monthlyVolume.map((row) => (
                            <div key={row.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{row.month}</span>
                                <span style={{ fontWeight: 700 }}>{row.units} units</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Top Destination Pharmacies</h2>
                {topDestinations.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No shipment data yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                        {topDestinations.map((row) => (
                            <div key={row.pharmacy} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{row.pharmacy}</span>
                                <span style={{ fontWeight: 700 }}>{row.units} units</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Analytics;
