import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Shield, Bell, User, LogOut, Moon, Sun } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);

    return (
        <nav className="glass-panel" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 2rem', margin: '1rem 2rem 0 2rem', borderBottom: 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield className="text-gradient" size={28} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>MedGuard <span className="text-gradient">4.0</span></h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Bell size={20} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-light)' }}>
                            {user?.username || 'Guest'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', textTransform: 'capitalize' }}>
                            {user?.role || ''}
                        </div>
                    </div>
                    <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: 'rgba(59, 130, 246, 0.2)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: '#3b82f6' 
                    }}>
                        <User size={18} />
                    </div>
                    <button onClick={logout} className="btn-danger" style={{ marginLeft: '1rem', padding: '0.4rem 0.75rem' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
