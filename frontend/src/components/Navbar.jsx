import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Shield, Bell, QrCode, CaretDown, User } from '@phosphor-icons/react';

const Navbar = ({ isMobile }) => {
    const { user, logout } = useContext(AuthContext);

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '72px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '0 1rem' : '0 2rem',
            zIndex: 50,
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
        }}>
            {/* Left: Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? 'auto' : '256px' }}>
                <Shield weight="fill" size={32} color="var(--primary-color)" />
                {!isMobile && (
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-light)', fontWeight: 700 }}>
                        MedGuard <span style={{ color: 'var(--primary-color)' }}>BD</span>
                    </h2>
                )}
            </div>
            
            {/* Center: Search Bar */}
            {!isMobile && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
                        <input 
                            type="text" 
                            placeholder="ওষুধ সার্চ করুন..." 
                            style={{ 
                                width: '100%', 
                                padding: '0.875rem 3rem 0.875rem 1.25rem', 
                                borderRadius: '2rem', 
                                border: '1px solid var(--border-color)', 
                                background: 'var(--bg-dark)', 
                                color: 'var(--text-light)',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s ease',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                        <button style={{
                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'var(--primary-color)', border: 'none', color: 'white',
                            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}>
                            <QrCode size={18} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: isMobile ? 'auto' : '256px', justifyContent: 'flex-end' }}>
                
                {/* Language Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    <span style={{ color: 'var(--primary-color)' }}>BN</span> | <span>EN</span>
                </div>

                {/* Notification Bell */}
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative' }}>
                    <Bell size={24} weight="duotone" />
                    <span style={{
                        position: 'absolute', top: '-2px', right: '-2px', background: 'var(--danger)', color: 'white',
                        fontSize: '0.65rem', fontWeight: 800, width: '16px', height: '16px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)'
                    }}>
                        3
                    </span>
                </button>

                {/* Avatar Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                    <div style={{ 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: 'rgba(27, 79, 114, 0.1)', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' 
                    }}>
                        <User size={20} weight="fill" />
                    </div>
                    {!isMobile && <CaretDown size={16} color="var(--text-muted)" weight="bold" />}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
