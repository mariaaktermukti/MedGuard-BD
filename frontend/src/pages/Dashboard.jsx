import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Activity, Users, FileText } from 'lucide-react';

const StatCard = ({ icon, label, value }) => (
    <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem'
    }}>
        <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            padding: '1rem',
            borderRadius: '50%',
            color: 'var(--primary-color)'
        }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-light)' }}>{value}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{label}</div>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Dashboard</h1>
                <p style={{ color: 'var(--text-muted)' }}>Welcome back to your {user?.role} portal.</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '3rem'
            }}>
                <StatCard icon={<Shield size={24} />} label="System Trust Score" value="99.9%" />
                <StatCard icon={<Activity size={24} />} label="Active Alerts" value="0" />
                <StatCard icon={<Users size={24} />} label="Network Connections" value="1,240" />
                <StatCard icon={<FileText size={24} />} label="Pending Actions" value="3" />
            </div>

            <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '1rem',
                padding: '2rem',
                textAlign: 'center'
            }}>
                <h3 style={{ color: '#10b981', margin: '0 0 1rem 0' }}>All Systems Operational</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
                    MedGuard BD 4.0 is actively monitoring pharmaceutical supply chains. Your role as a {user?.role} gives you access to specialized tools in the sidebar.
                </p>
            </div>
        </div>
    );
};

export default Dashboard;
