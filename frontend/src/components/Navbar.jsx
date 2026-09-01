import React, { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { Shield, Bell, QrCode, CaretDown, User, SignOut, Gear, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ isMobile }) => {
    const { user, logout } = useContext(AuthContext);
    const { language, setLanguage, t } = useContext(LanguageContext);
    const navigate = useNavigate();
    
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '72px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '0 1rem' : '0 2rem',
            zIndex: 50,
            boxShadow: 'var(--shadow-sm)'
        }}>
            {/* Left: Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: isMobile ? 'auto' : '256px' }}>
                <Shield weight="fill" size={32} color="var(--primary)" />
                {!isMobile && (
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 700 }}>
                        MedGuard <span style={{ color: 'var(--primary)' }}>BD</span>
                    </h2>
                )}
            </div>
            
            {/* Center: Search Bar */}
            {!isMobile && (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '520px' }}>
                        <input 
                            type="text" 
                            placeholder={t('search_medicine')}
                            style={{ 
                                width: '100%', 
                                padding: '0.75rem 3rem 0.75rem 1.25rem', 
                                borderRadius: 'var(--radius-xl)', 
                                border: '1px solid var(--border)', 
                                background: 'var(--bg-page)', 
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--primary)';
                                e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = 'var(--border)';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                        <button style={{
                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                            background: 'var(--primary)', border: 'none', color: 'white',
                            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                        >
                            <QrCode size={18} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: isMobile ? 'auto' : '256px', justifyContent: 'flex-end' }}>
                
                {/* Language Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                    <span 
                        onClick={() => setLanguage('EN')} 
                        style={{ color: language === 'EN' ? 'var(--primary)' : 'inherit', transition: 'color 0.2s' }}
                    >EN</span> 
                    | 
                    <span 
                        onClick={() => setLanguage('BN')}
                        style={{ color: language === 'BN' ? 'var(--primary)' : 'inherit', transition: 'color 0.2s' }}
                    >BN</span>
                </div>

                {/* Notification Bell */}
                <div ref={notifRef} style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', position: 'relative', display: 'flex' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        <Bell size={24} weight="duotone" />
                        <span style={{
                            position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', color: 'white',
                            fontSize: '0.65rem', fontWeight: 800, width: '18px', height: '18px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)'
                        }}>
                            3
                        </span>
                    </button>

                    {showNotifications && (
                        <div className="animate-fade-in" style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '1rem',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                            width: '320px', zIndex: 100, overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{t('notifications')}</div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', cursor: 'pointer' }} className="hover-lift">
                                    <WarningCircle size={24} color="var(--danger)" weight="fill" />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Counterfeit Alert</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Duplicate QR code detected for Batch B-24001.</div>
                                    </div>
                                </div>
                                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', cursor: 'pointer' }} className="hover-lift">
                                    <CheckCircle size={24} color="var(--success)" weight="fill" />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Shipment Arrived</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your inventory has been updated.</div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, background: 'var(--bg-page)' }}>
                                View All
                            </div>
                        </div>
                    )}
                </div>

                {/* Avatar Dropdown */}
                <div ref={profileRef} style={{ position: 'relative' }}>
                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}
                    >
                        <div style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', 
                            background: 'var(--primary-light)', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' 
                        }}>
                            <User size={20} weight="fill" />
                        </div>
                        <CaretDown size={14} color="var(--text-muted)" weight="bold" />
                    </div>

                    {showProfileMenu && (
                        <div className="animate-fade-in" style={{
                            position: 'absolute', top: '100%', right: 0, marginTop: '1rem',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                            minWidth: '200px', zIndex: 100, overflow: 'hidden'
                        }}>
                            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 600 }}>{user?.full_name || user?.username || 'User'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role || 'Guest'} Account</div>
                            </div>
                            
                            <div style={{ padding: '0.5rem' }}>
                                <button 
                                    onClick={() => navigate('/dashboard/settings')}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-main)' }}
                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-main)'; }}
                                >
                                    <Gear size={18} /> {t('settings')}
                                </button>
                                
                                <button 
                                    onClick={handleLogout}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)', marginTop: '0.25rem' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--danger-light)'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <SignOut size={18} /> {t('logout')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .hover-lift:hover {
                    background: var(--bg-page);
                }
            `}} />
        </nav>
    );
};

export default Navbar;
