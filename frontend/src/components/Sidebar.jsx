import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { House, QrCode, Pill, WarningCircle, MapPin, ChatText, Bell, Gear, UserCircle, Phone, Warehouse } from '@phosphor-icons/react';

const Sidebar = ({ isTablet }) => {
    const { user } = useContext(AuthContext);

    const citizenNavItems = [
        { path: '/dashboard', icon: <House size={24} weight="duotone" />, label: 'Home' },
        { path: '/dashboard/drug-passport', icon: <QrCode size={24} weight="duotone" />, label: 'QR Scan' },
        { path: '/dashboard/my-medicines', icon: <Pill size={24} weight="duotone" />, label: 'My Medicines' },
        { path: '/dashboard/report-adr', icon: <WarningCircle size={24} weight="duotone" />, label: 'ADR Report' },
        { path: '/dashboard/find-pharmacy', icon: <MapPin size={24} weight="duotone" />, label: 'Pharmacy' },
        { path: '/dashboard/ai-assistant', icon: <ChatText size={24} weight="duotone" />, label: 'AI Assistant' },
        { path: '/dashboard/notifications', icon: <Bell size={24} weight="duotone" />, label: 'Notifications' },
        { path: '/dashboard/settings', icon: <Gear size={24} weight="duotone" />, label: 'Settings' }
    ];

    const distributorNavItems = [
        { path: '/dashboard', icon: <House size={24} weight="duotone" />, label: 'Home' },
        { path: '/dashboard/distributor/warehouses', icon: <Warehouse size={24} weight="duotone" />, label: 'Warehouses' },
        { path: '/dashboard/notifications', icon: <Bell size={24} weight="duotone" />, label: 'Notifications' },
        { path: '/dashboard/settings', icon: <Gear size={24} weight="duotone" />, label: 'Settings' }
    ];

    const navItems = user?.role === 'distributor' ? distributorNavItems : citizenNavItems;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            color: 'white',
            padding: '1.5rem 0'
        }}>
            {/* User Card */}
            <div style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', 
                padding: '0 1.5rem 1.5rem 1.5rem', 
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                marginBottom: '1rem'
            }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCircle size={36} weight="fill" color="white" />
                </div>
                {!isTablet && (
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{user?.username || 'Rakib Hasan'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>+880 1711-000000</div>
                    </div>
                )}
            </div>
            
            {/* Nav Items */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {navItems.map((item, index) => (
                    <NavLink 
                        key={index} 
                        to={item.path}
                        end={item.path === '/dashboard'}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '1rem 1.5rem',
                            textDecoration: 'none',
                            color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                            background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                            fontWeight: isActive ? 600 : 500,
                            borderLeft: isActive ? '4px solid var(--success)' : '4px solid transparent',
                            transition: 'all 0.2s ease'
                        })}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
                        {!isTablet && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </div>

            {/* Footer Helpline */}
            <div style={{ padding: '1.5rem', marginTop: 'auto' }}>
                <div style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '1rem', 
                    padding: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: isTablet ? 'center' : 'flex-start',
                    gap: '1rem' 
                }}>
                    <Phone size={24} weight="fill" color="var(--success)" />
                    {!isTablet && (
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Helpline</div>
                            <div style={{ fontWeight: 700, fontSize: '1.25rem' }}>১৬২৬৩</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
