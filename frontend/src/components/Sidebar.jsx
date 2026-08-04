import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, FileText, Activity, AlertTriangle, Package, Users, Settings, QrCode, Pill, MessageSquare, MapPin } from 'lucide-react';

const Sidebar = () => {
    const { user } = useContext(AuthContext);

    // Dynamic menu items based on role
    const getMenuItems = () => {
        const baseMenu = [
            { path: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        ];

        switch (user?.role) {
            case 'citizen':
                return [...baseMenu, 
                    { path: '/dashboard/drug-passport', icon: <QrCode size={20} />, label: 'Drug Passport' },
                    { path: '/dashboard/my-medicines', icon: <Pill size={20} />, label: 'My Medicines' },
                    { path: '/dashboard/report-adr', icon: <AlertTriangle size={20} />, label: 'Report ADR' },
                    { path: '/dashboard/ai-assistant', icon: <MessageSquare size={20} />, label: 'AI Assistant' },
                    { path: '/dashboard/find-pharmacy', icon: <MapPin size={20} />, label: 'Find Pharmacy' }
                ];
            case 'manufacturer':
                return [...baseMenu, 
                    { path: '/medicines', icon: <Package size={20} />, label: 'Medicines' },
                    { path: '/batches', icon: <Activity size={20} />, label: 'Production Batches' }
                ];
            case 'pharmacy':
                return [...baseMenu, 
                    { path: '/sales', icon: <Activity size={20} />, label: 'Sales' },
                    { path: '/inventory', icon: <Package size={20} />, label: 'Inventory' }
                ];
            case 'dgda':
                return [...baseMenu, 
                    { path: '/inspections', icon: <Users size={20} />, label: 'Inspections' },
                    { path: '/recalls', icon: <AlertTriangle size={20} />, label: 'Drug Recalls' }
                ];
            default:
                return baseMenu;
        }
    };

    return (
        <div className="glass-panel" style={{
            width: '260px',
            margin: '1rem 0 1rem 1rem',
            padding: '2rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        }}>
            <div style={{ padding: '0 1rem 2rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                Main Menu
            </div>
            
            {getMenuItems().map((item, index) => (
                <NavLink 
                    key={index} 
                    to={item.path}
                    style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                        color: isActive ? 'var(--text-light)' : 'var(--text-muted)',
                        background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        fontWeight: isActive ? 600 : 500,
                        borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                        transition: 'all 0.2s ease'
                    })}
                >
                    <span style={{ color: 'inherit' }}>{item.icon}</span>
                    {item.label}
                </NavLink>
            ))}

            <div style={{ marginTop: 'auto' }}>
                <NavLink 
                    to="/settings"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem',
                        textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 500
                    }}
                >
                    <Settings size={20} />
                    Settings
                </NavLink>
            </div>
        </div>
    );
};

export default Sidebar;
