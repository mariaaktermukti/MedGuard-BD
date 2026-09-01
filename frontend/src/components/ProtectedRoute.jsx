import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page)' }}>
                <div style={{ fontSize: '1.25rem', color: 'var(--primary)', fontWeight: 600 }}>Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Find out where they should go based on role
        const rolePaths = {
            citizen: '/dashboard',
            doctor: '/dashboard/doctor',
            pharmacy: '/dashboard/pharmacy',
            manufacturer: '/dashboard/manufacturer',
            distributor: '/dashboard/distributor',
            dgda: '/dashboard/dgda',
            researcher: '/dashboard/researcher' // not listed in App.jsx but good practice
        };
        const redirectPath = rolePaths[user.role] || '/login';
        return <Navigate to={redirectPath} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
