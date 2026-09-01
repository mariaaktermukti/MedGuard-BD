import React, { useState, useEffect } from 'react';
import { Bell, Warning, ShieldCheck, CheckCircle, Alarm, Pill, Trash, Check } from '@phosphor-icons/react';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions, Type as ListType } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { NotificationListSkeleton } from '../../components/ui/Skeleton';
import { useNotifications } from '../../context/NotificationContext';

const Notifications = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const { notifications, markAsRead, unreadCount, fetchNotifications } = useNotifications() || { notifications: [], markAsRead: () => {}, unreadCount: 0, fetchNotifications: () => {} };

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            if (fetchNotifications) {
                await fetchNotifications();
            }
            setIsLoading(false);
        };
        load();
    }, []);

    const mappedNotifs = notifications.map(notif => {
        let type = 'info';
        const lowerTitle = (notif.title || '').toLowerCase();
        if (lowerTitle.includes('recall')) type = 'recall';
        else if (lowerTitle.includes('warning') || lowerTitle.includes('expire')) type = 'warning';
        else if (lowerTitle.includes('alarm') || lowerTitle.includes('dose') || lowerTitle.includes('reminder') || lowerTitle.includes('medicine') || notif.title.includes('⏰')) type = 'alarm';

        return {
            id: notif.id,
            type,
            title: notif.title,
            message: notif.message,
            instruction: type === 'recall' ? 'ফার্মেসিতে ফেরত দিন' : type === 'alarm' ? 'সময়মতো ওষুধ সেবন করুন' : '',
            date: notif.created_at ? new Date(notif.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Today',
            isRead: notif.is_read
        };
    });

    const filtered = activeTab === 'all' 
        ? mappedNotifs 
        : activeTab === 'unread'
        ? mappedNotifs.filter(n => !n.isRead)
        : mappedNotifs.filter(n => n.type === activeTab);

    if (isLoading) {
        return <NotificationListSkeleton />;
    }

    const trailingActions = (id) => (
        <TrailingActions>
            <SwipeAction
                destructive={true}
                onClick={() => markAsRead(id)}
            >
                <div style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', borderRadius: '0 1rem 1rem 0', cursor: 'pointer', height: 'calc(100% - 1rem)' }}>
                    <CheckCircle size={22} weight="bold" />
                </div>
            </SwipeAction>
        </TrailingActions>
    );

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                        <Bell size={32} weight="duotone" /> Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <span style={{ background: 'var(--danger)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800 }}>
                            {unreadCount} Unread Alerts
                        </span>
                    )}
                </div>
                
                {/* Category Tabs */}
                <div style={{ display: 'flex', background: 'var(--primary-light)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.25rem' }}>
                    <button 
                        onClick={() => setActiveTab('all')}
                        style={{ flex: 1, minWidth: '80px', padding: '0.65rem 0.5rem', border: 'none', background: activeTab === 'all' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'all' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        সব (All) ({mappedNotifs.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('alarm')}
                        style={{ flex: 1, minWidth: '90px', padding: '0.65rem 0.5rem', border: 'none', background: activeTab === 'alarm' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', color: activeTab === 'alarm' ? '#059669' : 'var(--text-muted)', boxShadow: activeTab === 'alarm' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        ⏰ Alarms ({mappedNotifs.filter(n => n.type === 'alarm').length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('unread')}
                        style={{ flex: 1, minWidth: '80px', padding: '0.65rem 0.5rem', border: 'none', background: activeTab === 'unread' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', color: activeTab === 'unread' ? 'var(--danger)' : 'var(--text-muted)', boxShadow: activeTab === 'unread' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        Unread ({unreadCount})
                    </button>
                    <button 
                        onClick={() => setActiveTab('warning')}
                        style={{ flex: 1, minWidth: '80px', padding: '0.65rem 0.5rem', border: 'none', background: activeTab === 'warning' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', color: activeTab === 'warning' ? '#d97706' : 'var(--text-muted)', boxShadow: activeTab === 'warning' ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        Warnings ({mappedNotifs.filter(n => n.type === 'warning').length})
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
                {filtered.length === 0 ? (
                    <div style={{ 
                        padding: '4rem 2rem', 
                        textAlign: 'center', 
                        background: 'var(--bg-card)', 
                        borderRadius: '16px', 
                        border: '1px dashed var(--border)' 
                    }}>
                        <Bell size={54} weight="duotone" color="var(--primary)" style={{ opacity: 0.4, marginBottom: '1rem' }} />
                        <h3 style={{ color: 'var(--text-main)', margin: '0 0 0.5rem 0', fontWeight: 700 }}>
                            No Notifications Found
                        </h3>
                        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                            {activeTab === 'alarm' 
                                ? 'Dose reminders will appear here when scheduled times arrive.' 
                                : 'All notifications are up to date.'}
                        </p>
                    </div>
                ) : (
                    <SwipeableList type={ListType.IOS} fullSwipe={true}>
                        {filtered.map(notif => (
                            <SwipeableListItem key={notif.id} trailingActions={trailingActions(notif.id)}>
                                <div style={{ 
                                    width: '100%', 
                                    padding: '1.25rem', 
                                    marginBottom: '0.85rem',
                                    borderLeft: `4px solid ${
                                        notif.type === 'recall' ? 'var(--danger)' : 
                                        notif.type === 'alarm' ? '#059669' : 
                                        notif.type === 'warning' ? '#d97706' : 
                                        'var(--primary)'
                                    }`,
                                    background: notif.isRead ? 'var(--bg-card)' : 'var(--primary-light)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '14px',
                                    boxShadow: 'var(--shadow-sm)',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ 
                                            background: notif.type === 'recall' ? '#fef2f2' : 
                                                        notif.type === 'alarm' ? '#ecfdf5' : 
                                                        notif.type === 'warning' ? '#fffbeb' : 
                                                        'var(--primary-light)',
                                            color: notif.type === 'recall' ? 'var(--danger)' : 
                                                   notif.type === 'alarm' ? '#059669' : 
                                                   notif.type === 'warning' ? '#d97706' : 
                                                   'var(--primary)',
                                            padding: '0.65rem', 
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {notif.type === 'alarm' && <Alarm size={24} weight="fill" />}
                                            {notif.type === 'recall' && <Warning size={24} weight="fill" />}
                                            {notif.type === 'warning' && <Warning size={24} weight="fill" />}
                                            {notif.type === 'info' && <ShieldCheck size={24} weight="fill" />}
                                        </div>
                                        
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem', gap: '1rem' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                                    {notif.title}
                                                </h3>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {notif.date}
                                                </span>
                                            </div>
                                            
                                            <p style={{ margin: '0 0 0.6rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, fontWeight: 500 }}>
                                                {notif.message}
                                            </p>
                                            
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {notif.instruction ? (
                                                    <div style={{ 
                                                        background: notif.type === 'alarm' ? '#ecfdf5' : '#fef2f2', 
                                                        color: notif.type === 'alarm' ? '#047857' : 'var(--danger)', 
                                                        padding: '0.35rem 0.75rem', 
                                                        borderRadius: '8px', 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.4rem', 
                                                        fontSize: '0.8rem', 
                                                        fontWeight: 700 
                                                    }}>
                                                        {notif.type === 'alarm' ? <Pill size={16} weight="fill" /> : <Warning size={16} weight="bold" />}
                                                        <span>{notif.instruction}</span>
                                                    </div>
                                                ) : <div />}

                                                {!notif.isRead && (
                                                    <button
                                                        type="button"
                                                        onClick={() => markAsRead(notif.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--primary)',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.3rem'
                                                        }}
                                                    >
                                                        <Check size={16} weight="bold" /> Mark as Read
                                                    </button>
                                                )}
                                            </div>
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
