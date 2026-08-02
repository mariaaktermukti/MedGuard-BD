import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
                <div style={{ color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 600 }}>Loading MedGuard...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="layout-container">
            <Sidebar />
            <div className="main-content">
                <Navbar />
                <div className="page-wrapper glass-panel" style={{ margin: '1rem 2rem 2rem 2rem' }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
