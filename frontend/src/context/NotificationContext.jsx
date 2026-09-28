import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

const DEFAULT_DGDA_BROADCASTS = [
    {
        id: 101,
        title: 'URGENT RECALL: Contaminated Batch - Paracetamol 500mg (Batch #8839)',
        message: 'All healthcare facilities, pharmacies, and distributors must immediately quarantine Batch #8839. Do not dispense to patients under any circumstances.',
        targets: ['all'],
        priority: 'critical',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        timestamp: 'Today, 10:45 AM',
        sender: 'DGDA Central Vigilance Operations'
    },
    {
        id: 102,
        title: 'National Shortage Notice: Human Insulin (Regular 100IU)',
        message: 'Emergency allocation active for Chittagong & Sylhet divisions. Priority dispatch authorized for registered hospital pharmacies.',
        targets: ['doctor', 'pharmacy', 'distributor', 'manufacturer'],
        priority: 'high',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        timestamp: 'Yesterday, 04:15 PM',
        sender: 'DGDA Emergency Supply Desk'
    }
];

export const getDGDABroadcastAlerts = () => {
    try {
        const stored = localStorage.getItem('dgda_broadcast_alerts');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error("LocalStorage read error for DGDA alerts", e);
    }
    localStorage.setItem('dgda_broadcast_alerts', JSON.stringify(DEFAULT_DGDA_BROADCASTS));
    return DEFAULT_DGDA_BROADCASTS;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [broadcastAlerts, setBroadcastAlerts] = useState(getDGDABroadcastAlerts());
    const triggeredAlarmsRef = useRef(new Set());

    const refreshDGDABroadcasts = () => {
        const alerts = getDGDABroadcastAlerts();
        setBroadcastAlerts(alerts);
    };

    // 1. Fetch User Notifications & Active Dose Schedules & DGDA Broadcast Alerts
    const fetchNotifications = async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            triggeredAlarmsRef.current.clear();
            return;
        }
        try {
            const isCitizen = !user.role || user.role === 'citizen';
            const userRole = user.role || 'citizen';

            const [notifRes, medRes] = await Promise.all([
                api.get('core/notifications/').catch(() => ({ data: [] })),
                isCitizen
                    ? api.get('core/medicines/personal/').catch(() => ({ data: [] }))
                    : Promise.resolve({ data: [] }),
            ]);

            const dbNotifs = notifRes.data || [];
            const activeMeds = (medRes.data || []).filter(m => m.is_active);

            // Synthesize scheduled dose reminder items for top navbar dropdown
            const scheduledNotifs = [];
            activeMeds.forEach(med => {
                const reminderTimes = med.reminder_times || [];
                const medName = med.medicine_details?.name || med.medicine_name || 'Personal Medicine';
                reminderTimes.forEach(rTime => {
                    scheduledNotifs.push({
                        id: `sched-${med.id}-${rTime}`,
                        title: `⏰ Scheduled Dose: ${medName}`,
                        message: `Next dose scheduled for ${rTime} (${med.dosage || '1 Dose'}). ${med.notes ? 'Note: ' + med.notes : ''}`,
                        notification_type: 'dose_reminder',
                        is_read: false,
                        created_at: med.created_at || new Date().toISOString()
                    });
                });
            });

            // Synthesize DGDA Emergency Broadcast Notifications targeting current user role
            const allDGDA = getDGDABroadcastAlerts();
            const relevantDGDA = allDGDA.filter(alert => {
                const targets = alert.targets || ['all'];
                if (targets.includes('all')) return true;
                return targets.includes(userRole) || userRole === 'dgda';
            }).map(alert => ({
                id: `dgda-${alert.id}`,
                title: `🚨 DGDA ALERT: ${alert.title}`,
                message: alert.message,
                notification_type: 'dgda_emergency',
                priority: alert.priority || 'critical',
                is_read: false,
                created_at: alert.created_at || (alert.timestamp && !isNaN(new Date(alert.timestamp).getTime()) ? new Date(alert.timestamp).toISOString() : new Date().toISOString())
            }));

            // Combine DGDA Alerts + Dose Reminders + DB Notifications
            const combined = [...relevantDGDA, ...scheduledNotifs, ...dbNotifs];
            setNotifications(combined);
            setUnreadCount(combined.filter(n => !n.is_read).length);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        triggeredAlarmsRef.current.clear();
        fetchNotifications();

        const handleAlertUpdate = () => {
            refreshDGDABroadcasts();
            fetchNotifications();
        };

        window.addEventListener('dgda_alerts_updated', handleAlertUpdate);
        window.addEventListener('storage', handleAlertUpdate);

        return () => {
            window.removeEventListener('dgda_alerts_updated', handleAlertUpdate);
            window.removeEventListener('storage', handleAlertUpdate);
        };
    }, [user?.id, user?.role]);

    // 2. Web Audio Sound Synthesizer for Dose Alarm
    const playAlarmSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const now = ctx.currentTime;
            [440, 554.37, 659.25, 880].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.15);
                gain.gain.setValueAtTime(0.3, now + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.4);
            });
        } catch (e) {
            console.error("Audio synth error:", e);
        }
    };

    // 3. Request Web Push Notification Permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }, []);

    // 4. Per-User Real-Time Dose Reminder Loop
    useEffect(() => {
        if (!user) return;

        const isCitizen = !user.role || user.role === 'citizen';
        if (!isCitizen) return;

        const checkDoseReminders = async () => {
            try {
                const res = await api.get('core/medicines/personal/');
                const activeMeds = res.data.filter(m => m.is_active);

                const now = new Date();
                const currentHour = now.getHours();
                const currentMin = now.getMinutes();
                const formattedCurrentTime12 = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
                const formattedCurrentTime24 = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;

                activeMeds.forEach(med => {
                    const reminderTimes = med.reminder_times || [];
                    const medName = med.medicine_details?.name || med.medicine_name || 'Personal Medicine';

                    reminderTimes.forEach(rTime => {
                        const doseStr = String(rTime).trim().toUpperCase();
                        const alarmKey = `user-${user.id}-med-${med.id}-${doseStr}-${now.toDateString()}-${currentHour}:${currentMin}`;

                        if (triggeredAlarmsRef.current.has(alarmKey)) return;

                        const matches12h = doseStr === formattedCurrentTime12;
                        const matches24h = doseStr === formattedCurrentTime24;

                        if (matches12h || matches24h) {
                            triggeredAlarmsRef.current.add(alarmKey);
                            triggerGlobalDoseAlarm({
                                id: med.id,
                                name: medName,
                                dosage: med.dosage,
                                frequency: med.frequency,
                                time: doseStr,
                                notes: med.notes
                            });
                        }
                    });
                });
            } catch (err) {
                console.error("Dose reminder check error:", err);
            }
        };

        const interval = setInterval(checkDoseReminders, 15000);
        return () => clearInterval(interval);
    }, [user?.id, user?.role]);

    // 5. Global Alarm Trigger (Desktop Push, Audio Chime, Global SweetAlert2 Popup, Database Entry)
    const triggerGlobalDoseAlarm = async (med) => {
        playAlarmSound();

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ Medicine Alarm: ${med.name}`, {
                body: `It's ${med.time}! Time to take ${med.dosage} (${med.frequency}). ${med.notes ? 'Note: ' + med.notes : ''}`,
                icon: '/favicon.ico'
            });
        }

        try {
            await api.post('core/notifications/', {
                title: `⏰ Medicine Dose Reminder: ${med.name}`,
                message: `Time to take ${med.dosage} of ${med.name} (${med.frequency}). ${med.notes ? 'Note: ' + med.notes : ''}`,
                notification_type: 'dose_reminder'
            });
            fetchNotifications();
        } catch (e) {
            console.error("Failed to log notification to database:", e);
        }

        Swal.fire({
            title: `⏰ DOSE ALARM TIME!`,
            html: `
                <div style="text-align: left; padding: 0.5rem 0;">
                    <div style="font-size: 1.2rem; font-weight: 800; color: #059669; margin-bottom: 0.5rem;">
                        💊 ${med.name}
                    </div>
                    <div style="font-size: 0.95rem; color: #334155; margin-bottom: 0.35rem;">
                        <strong>Dosage:</strong> ${med.dosage} (${med.frequency})
                    </div>
                    <div style="font-size: 0.95rem; color: #334155; margin-bottom: 0.35rem;">
                        <strong>Scheduled Time:</strong> ${med.time}
                    </div>
                    ${med.notes ? `<div style="font-size: 0.9rem; color: #059669; background: #ecfdf5; padding: 0.6rem; borderRadius: 8px; font-style: italic; margin-top: 0.5rem;">
                        💡 Note: ${med.notes}
                    </div>` : ''}
                </div>
            `,
            icon: 'info',
            confirmButtonText: '✅ Take Medicine (ওষুধ খেয়েছি)',
            confirmButtonColor: '#059669',
            showCancelButton: true,
            cancelButtonText: 'Dismiss',
            cancelButtonColor: '#64748b',
            backdrop: `rgba(5, 150, 105, 0.25)`
        }).then((res) => {
            if (res.isConfirmed) {
                Swal.fire({
                    title: 'Dose Recorded! 🌟',
                    text: `Great job taking your ${med.name}!`,
                    icon: 'success',
                    timer: 1800,
                    showConfirmButton: false
                });
            }
        });
    };

    const sendDGDABroadcast = (newAlert) => {
        const isoNow = new Date().toISOString();
        const fullAlert = {
            ...newAlert,
            created_at: newAlert.created_at || isoNow,
            timestamp: newAlert.timestamp || 'Just Now'
        };
        const existing = getDGDABroadcastAlerts();
        const updated = [fullAlert, ...existing];
        localStorage.setItem('dgda_broadcast_alerts', JSON.stringify(updated));
        setBroadcastAlerts(updated);

        window.dispatchEvent(new Event('dgda_alerts_updated'));
        
        // Instantly refresh notifications list in context memory
        fetchNotifications();

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🚨 DGDA EMERGENCY ALERT`, {
                body: `${fullAlert.title}\n${fullAlert.message}`,
                icon: '/favicon.ico'
            });
        }
    };

    const markAsRead = async (id) => {
        try {
            if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('sched-') && !id.startsWith('dgda-'))) {
                await api.post(`core/notifications/${id}/read/`);
            }
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error("Failed to mark notification as read:", e);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            broadcastAlerts,
            sendDGDABroadcast,
            fetchNotifications,
            markAsRead,
            playAlarmSound
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
