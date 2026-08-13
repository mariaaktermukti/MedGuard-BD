import React, { useContext, useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-page)' }}>
                <div style={{ color: 'var(--primary)', fontSize: '1.25rem', fontWeight: 600 }}>Loading MedGuard...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Always show sidebar on desktop/tablet to maintain consistency across all portals
    const showSidebar = !isMobile;
    const sidebarWidth = showSidebar ? (isTablet ? '80px' : '256px') : '0px';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
            <Navbar isMobile={isMobile} />
            <div style={{ display: 'flex', flex: 1, marginTop: '72px' }}>
                {showSidebar && (
                    <div style={{ 
                        width: sidebarWidth, 
                        position: 'fixed', 
                        top: '72px', 
                        bottom: 0, 
                        left: 0, 
                        zIndex: 40,
                        transition: 'width 0.3s ease',
                        overflowY: 'auto',
                        background: 'var(--bg-card)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <Sidebar isTablet={isTablet} />
                    </div>
                )}
                <div style={{ 
                    flex: 1, 
                    marginLeft: sidebarWidth, 
                    transition: 'margin-left 0.3s ease',
                    minHeight: 'calc(100vh - 72px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <main className="page-wrapper">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
