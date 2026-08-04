import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pill, Clock, Plus, AlertTriangle, ShieldAlert } from 'lucide-react';

const MyMedicines = () => {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [interactionResult, setInteractionResult] = useState(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/core/medicines/personal/', {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setSchedules(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckInteractions = async () => {
        if (schedules.length < 2) {
            alert('You need at least 2 medicines to check for interactions.');
            return;
        }
        setChecking(true);
        const medNames = schedules.map(s => s.medicine_details?.name).filter(Boolean);
        try {
            const res = await axios.post('http://localhost:8000/api/core/interaction-checker/', { medicines: medNames }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
            });
            setInteractionResult(res.data.response);
        } catch (err) {
            console.error(err);
            alert('Failed to check interactions.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Pill className="text-primary" size={32} />
                    My Medicines
                </h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleCheckInteractions} disabled={checking || schedules.length < 2} className="btn" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <ShieldAlert size={18} />
                        {checking ? 'Checking...' : 'Check Interactions'}
                    </button>
                    <button className="btn btn-primary">
                        <Plus size={18} /> Add Medicine
                    </button>
                </div>
            </div>

            {interactionResult && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <AlertTriangle size={20} /> AI Interaction Analysis
                    </h3>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{interactionResult}</p>
                </div>
            )}

            {loading ? (
                <p>Loading your medicines...</p>
            ) : schedules.length === 0 ? (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Pill size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                    <h3>No medicines tracked yet.</h3>
                    <p>Add your current prescriptions to keep track of dosages and check for interactions.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{schedule.medicine_details?.name || 'Unknown Medicine'}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{schedule.dosage} • {schedule.frequency}</p>
                                </div>
                                <div style={{ background: schedule.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: schedule.is_active ? '#10b981' : '#ef4444', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {schedule.is_active ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <Clock size={16} />
                                Reminders: {schedule.reminder_times?.length > 0 ? schedule.reminder_times.join(', ') : 'None set'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyMedicines;
