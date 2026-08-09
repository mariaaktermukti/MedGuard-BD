import React, { useContext, useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const DashboardLayout = () => {
    const { user, loading } = useContext(AuthContext);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1280);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const sidebarWidth = isMobile ? '0px' : isTablet ? '72px' : '256px';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column' }}>
            <Navbar isMobile={isMobile} />
            <div style={{ display: 'flex', flex: 1, marginTop: '72px' }}>
                {!isMobile && (
                    <div style={{ 
                        width: sidebarWidth, 
                        position: 'fixed', 
                        top: '72px', 
                        bottom: 0, 
                        left: 0, 
                        background: 'var(--primary-color)',
                        zIndex: 40,
                        transition: 'width 0.3s ease',
                        overflowY: 'auto'
                    }}>
                        <Sidebar isTablet={isTablet} />
                    </div>
                )}
                <div style={{ 
                    flex: 1, 
                    marginLeft: sidebarWidth, 
                    padding: isMobile ? '16px' : '32px',
                    transition: 'margin-left 0.3s ease',
                    minHeight: 'calc(100vh - 72px)'
                }}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
