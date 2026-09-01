import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const triggeredAlarmsRef = useRef(new Set());

    // 1. Reset user state & fetch User Notifications from Backend Database
    const fetchNotifications = async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            triggeredAlarmsRef.current.clear();
            return;
        }
        try {
            const response = await api.get('core/notifications/');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        triggeredAlarmsRef.current.clear(); // Reset alarm triggers on user login/switch
        fetchNotifications();
    }, [user?.id]);

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

    // 4. Per-User Real-Time Dose Reminder Loop (Scoped exclusively to logged-in user)
    useEffect(() => {
        if (!user) return;

        // Dose alarms only apply to citizens or default users
        const isCitizen = !user.role || user.role === 'citizen';
        if (!isCitizen) return;

        const checkDoseReminders = async () => {
            try {
                // Returns ONLY personal medicines belonging to the authenticated JWT user
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
                        // Key includes user.id to guarantee 100% per-user isolation
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
        // A. Audio Alarm Sound
        playAlarmSound();

        // B. Desktop/Browser Push Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ Medicine Alarm: ${med.name}`, {
                body: `It's ${med.time}! Time to take ${med.dosage} (${med.frequency}). ${med.notes ? 'Note: ' + med.notes : ''}`,
                icon: '/favicon.ico'
            });
        }

        // C. Save Notification in Database for current user
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

        // D. Global Universal Modal Popup for logged-in user
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

    const markAsRead = async (id) => {
        try {
            await api.post(`core/notifications/${id}/read/`);
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
            fetchNotifications,
            markAsRead,
            playAlarmSound
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);
