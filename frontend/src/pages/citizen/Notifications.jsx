import React, { useState, useEffect } from 'react';
import { Bell, Warning, ShieldCheck, CheckCircle } from '@phosphor-icons/react';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions, Type as ListType } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import api from '../../services/api';

const Notifications = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await api.get('core/notifications/');
                const mappedNotifs = response.data.map(notif => {
                    let type = 'info';
                    const lowerTitle = notif.title.toLowerCase();
                    if (lowerTitle.includes('recall')) type = 'recall';
                    else if (lowerTitle.includes('warning') || lowerTitle.includes('expire')) type = 'warning';
                    
                    return {
                        id: notif.id,
                        type,
                        title: notif.title,
                        message: notif.message,
                        instruction: type === 'recall' ? 'ফার্মেসিতে ফেরত দিন' : '',
                        date: new Date(notif.created_at).toLocaleDateString(),
                        isRead: notif.is_read
                    };
                }).filter(n => !n.isRead);
                setNotifications(mappedNotifs);
            } catch (error) {
                console.error("Failed to fetch notifications:", error);
            }
        };
        fetchNotifications();
    }, []);

    const filtered = activeTab === 'all' ? notifications : notifications.filter(n => n.type === activeTab);

    const handleDismiss = async (id) => {
        try {
            await api.post(`core/notifications/${id}/read/`);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const trailingActions = (id) => (
        <TrailingActions>
            <SwipeAction
                destructive={true}
                onClick={() => handleDismiss(id)}
            >
                <div style={{ background: 'var(--success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', borderRadius: '0 1rem 1rem 0', cursor: 'pointer', height: 'calc(100% - 1rem)' }}>
                    <CheckCircle size={24} weight="bold" />
                </div>
            </SwipeAction>
        </TrailingActions>
    );

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: '0 0 1.5rem 0', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={32} weight="duotone" /> Notifications
                </h1>
                
                {/* Tabs */}
                <div style={{ display: 'flex', background: 'rgba(27, 79, 114, 0.1)', padding: '0.25rem', borderRadius: '1rem' }}>
                    <button 
                        onClick={() => setActiveTab('all')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'all' ? 'var(--bg-card)' : 'transparent', borderRadius: '0.75rem', fontWeight: 600, color: activeTab === 'all' ? 'var(--primary-color)' : 'var(--text-muted)', boxShadow: activeTab === 'all' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        সব (All)
                    </button>
                    <button 
                        onClick={() => setActiveTab('recall')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'recall' ? 'var(--bg-card)' : 'transparent', borderRadius: '0.75rem', fontWeight: 600, color: activeTab === 'recall' ? 'var(--danger)' : 'var(--text-muted)', boxShadow: activeTab === 'recall' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        রিকল (Recall)
                    </button>
                    <button 
                        onClick={() => setActiveTab('warning')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'warning' ? 'var(--bg-card)' : 'transparent', borderRadius: '0.75rem', fontWeight: 600, color: activeTab === 'warning' ? '#F39C12' : 'var(--text-muted)', boxShadow: activeTab === 'warning' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        সতর্কতা (Warning)
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '4rem' }}>
                        <Bell size={64} weight="duotone" style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <h3>কোনো নতুন নোটিফিকেশন নেই</h3>
                    </div>
                ) : (
                    <SwipeableList type={ListType.IOS} fullSwipe={true}>
                        {filtered.map(notif => (
                            <SwipeableListItem key={notif.id} trailingActions={trailingActions(notif.id)}>
                                <div className="glass-panel" style={{ 
                                    width: '100%', 
                                    padding: '1.25rem', 
                                    marginBottom: '1rem',
                                    borderLeft: `4px solid ${notif.type === 'recall' ? 'var(--danger)' : notif.type === 'warning' ? '#F39C12' : 'var(--success)'}`,
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            background: notif.type === 'recall' ? 'rgba(231,76,60,0.1)' : notif.type === 'warning' ? 'rgba(243,156,18,0.1)' : 'rgba(39,174,96,0.1)',
                                            color: notif.type === 'recall' ? 'var(--danger)' : notif.type === 'warning' ? '#F39C12' : 'var(--success)',
                                            padding: '0.5rem', borderRadius: '50%'
                                        }}>
                                            {notif.type === 'recall' && <Warning size={24} weight="fill" />}
                                            {notif.type === 'warning' && <Warning size={24} weight="fill" />}
                                            {notif.type === 'info' && <ShieldCheck size={24} weight="fill" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-light)' }}>{notif.title}</h3>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{notif.date}</span>
                                            </div>
                                            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.4 }}>{notif.message}</p>
                                            
                                            {notif.instruction && (
                                                <div style={{ background: 'var(--danger)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                                    <Warning size={16} weight="bold" /> {notif.instruction}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SwipeableListItem>
                        ))}
                    </SwipeableList>
                )}
            </div>
        </div>
    );
};

export default Notifications;
