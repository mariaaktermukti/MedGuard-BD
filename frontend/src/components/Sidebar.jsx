import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { House, QrCode, Pill, WarningCircle, MapPin, ChatText, Bell, Gear, UserCircle, Package, Truck, Receipt, ChartLineUp, ChatCenteredText, Warehouse, ChartBar, Crosshair, ShieldWarning, ClipboardText, Buildings, MapTrifold, Brain } from '@phosphor-icons/react';

const Sidebar = ({ isTablet }) => {
    const { user } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);

    const citizenNavItems = [
        { path: '/dashboard', icon: <House size={20} weight="duotone" />, label: t('home') },
        { path: '/dashboard/drug-passport', icon: <QrCode size={20} weight="duotone" />, label: t('qr_scan') },
        { path: '/dashboard/my-medicines', icon: <Pill size={20} weight="duotone" />, label: t('my_medicines') },
        { path: '/dashboard/report-adr', icon: <WarningCircle size={20} weight="duotone" />, label: t('adr_report') },
        { path: '/dashboard/find-pharmacy', icon: <MapPin size={20} weight="duotone" />, label: t('pharmacy') },
        { path: '/dashboard/ai-assistant', icon: <ChatText size={20} weight="duotone" />, label: t('ai_assistant') },
    ];

    const pharmacyNavItems = [
        { path: '/dashboard/pharmacy', icon: <House size={20} weight="duotone" />, label: t('home') },
        { path: '/dashboard/pharmacy/inventory', icon: <Package size={20} weight="duotone" />, label: 'Inventory' },
        { path: '/dashboard/pharmacy/verify', icon: <QrCode size={20} weight="duotone" />, label: 'Verify Batch' },
        { path: '/dashboard/pharmacy/sales', icon: <Receipt size={20} weight="duotone" />, label: 'Log Sale' },
        { path: '/dashboard/pharmacy/alerts', icon: <WarningCircle size={20} weight="duotone" />, label: 'Alerts' },
        { path: '/dashboard/pharmacy/forecast', icon: <ChartLineUp size={20} weight="duotone" />, label: 'Forecast' },
        { path: '/dashboard/pharmacy/complaints', icon: <ChatCenteredText size={20} weight="duotone" />, label: 'Complaints' },
        { path: '/dashboard/pharmacy/suppliers', icon: <Truck size={20} weight="duotone" />, label: 'Suppliers' },
    ];

    const distributorNavItems = [
        { path: '/dashboard', icon: <House size={20} weight="duotone" />, label: t('home') },
        { path: '/dashboard/distributor/warehouses', icon: <Warehouse size={20} weight="duotone" />, label: 'Warehouses' },
        { path: '/dashboard/distributor/shipments', icon: <Truck size={20} weight="duotone" />, label: 'Shipments' },
        { path: '/dashboard/distributor/analytics', icon: <ChartBar size={20} weight="duotone" />, label: 'Analytics' },
        { path: '/dashboard/distributor/route-optimization', icon: <MapPin size={20} weight="duotone" />, label: 'Route Optimization' },
        { path: '/dashboard/distributor/fleet-monitoring', icon: <Truck size={20} weight="duotone" />, label: 'Fleet Monitoring' },
        { path: '/dashboard/distributor/route-risk', icon: <WarningCircle size={20} weight="duotone" />, label: 'Route Risk' },
    ];

    const dgdaNavItems = [
        { path: '/dashboard/dgda/command-center', icon: <MapPin size={20} weight="duotone" />, label: 'Command Center' },
        { path: '/dashboard/dgda/monitoring', icon: <Crosshair size={20} weight="duotone" />, label: 'Monitoring' },
        { path: '/dashboard/dgda/entities', icon: <Buildings size={20} weight="duotone" />, label: 'Entities' },
        { path: '/dashboard/dgda/investigations', icon: <ShieldWarning size={20} weight="duotone" />, label: 'Investigations' },
        { path: '/dashboard/dgda/recalls', icon: <WarningCircle size={20} weight="duotone" />, label: 'Recalls' },
        { path: '/dashboard/dgda/inspections', icon: <ClipboardText size={20} weight="duotone" />, label: 'Inspections' },
        { path: '/dashboard/dgda/heatmaps', icon: <MapTrifold size={20} weight="duotone" />, label: 'Heatmaps' },
        { path: '/dashboard/dgda/risk', icon: <Brain size={20} weight="duotone" />, label: 'Risk Intel' },
    ];

    const navItems = user?.role === 'pharmacy' ? pharmacyNavItems : user?.role === 'distributor' ? distributorNavItems : user?.role === 'dgda' ? dgdaNavItems : citizenNavItems;

    const bottomNavItems = [
        { path: '/dashboard/notifications', icon: <Bell size={20} weight="duotone" />, label: t('notifications') },
        ...(user?.role !== 'dgda' ? [{ path: '/dashboard/settings', icon: <Gear size={20} weight="duotone" />, label: t('settings') }] : [])
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-card)',
            borderRight: '1px solid var(--border)',
            padding: '1.5rem 0',
            color: 'var(--text-main)',
        }}>
            
            {/* Main Navigation */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
                <div style={{ padding: '0 1.5rem', marginBottom: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Menu
                </div>
                {navItems.map((item, index) => (
                    <NavLink 
                        key={index} 
                        to={item.path}
                        end={item.path === '/dashboard' || item.path === '/dashboard/pharmacy' || item.path === '/dashboard/dgda'}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1.5rem',
                            textDecoration: 'none',
                            color: isActive ? 'var(--primary)' : 'var(--text-main)',
                            background: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? 600 : 500,
                            borderRight: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                            transition: 'all 0.2s ease',
                            fontSize: '0.95rem'
                        })}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                        {!isTablet && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </div>

            {/* Bottom Navigation */}
            <div style={{ paddingBottom: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                {bottomNavItems.map((item, index) => (
                    <NavLink 
                        key={index} 
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.75rem 1.5rem',
                            textDecoration: 'none',
                            color: isActive ? 'var(--primary)' : 'var(--text-main)',
                            background: isActive ? 'var(--primary-light)' : 'transparent',
                            fontWeight: isActive ? 600 : 500,
                            borderRight: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                            transition: 'all 0.2s ease',
                            fontSize: '0.95rem'
                        })}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                        {!isTablet && <span>{item.label}</span>}
                    </NavLink>
                ))}
                
                {/* Logout Button */}
                <button 
                    onClick={() => { /* Logout Logic Here handled globally if needed */ }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1.5rem',
                        textDecoration: 'none',
                        color: 'var(--danger)',
                        background: 'transparent',
                        fontWeight: 500,
                        border: 'none',
                        borderRight: '3px solid transparent',
                        transition: 'all 0.2s ease',
                        fontSize: '0.95rem',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserCircle size={20} weight="duotone" /></span>
                    {!isTablet && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
