import React, { useState, useEffect } from 'react';
import { Pill, Alarm, Trash, Clock, Plus, BookBookmark } from '@phosphor-icons/react';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions, Type as ListType } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import api from '../../services/api';

const MyMedicines = () => {
    const [activeTab, setActiveTab] = useState('present');
    const [medicines, setMedicines] = useState([]);

    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const response = await api.get('core/medicines/personal/');
                // Map API data to component state structure
                const mappedMeds = response.data.map(med => ({
                    id: med.id,
                    name: med.medicine_details?.name || 'Unknown',
                    type: med.medicine_details?.dosage_form || 'Medicine',
                    dosage: med.dosage,
                    nextDose: med.reminder_times?.length > 0 ? med.reminder_times[0] : 'N/A',
                    status: med.is_active ? 'present' : 'past'
                }));
                setMedicines(mappedMeds);
            } catch (error) {
                console.error("Failed to fetch medicines:", error);
            }
        };
        fetchMedicines();
    }, []);

    const filteredMeds = medicines.filter(m => m.status === activeTab);

    const handleDelete = async (id) => {
        try {
            await api.delete(`core/medicines/personal/${id}/`);
            setMedicines(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            console.error("Failed to delete medicine:", error);
        }
    };

    const trailingActions = (id) => (
        <TrailingActions>
            <SwipeAction
                destructive={true}
                onClick={() => handleDelete(id)}
            >
                <div style={{ background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', borderRadius: '0 1rem 1rem 0', cursor: 'pointer' }}>
                    <Trash size={24} weight="bold" />
                </div>
            </SwipeAction>
        </TrailingActions>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: '0 0 1.5rem 0', color: 'var(--primary)' }}>Personal Medicine Record</h1>
                
                {/* Segmented Control */}
                <div style={{ display: 'flex', background: 'rgba(27, 79, 114, 0.1)', padding: '0.25rem', borderRadius: '1rem' }}>
                    <button 
                        onClick={() => setActiveTab('present')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'present' ? 'var(--bg-card)' : 'transparent', borderRadius: '0.75rem', fontWeight: 600, color: activeTab === 'present' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'present' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        Present (বর্তমান)
                    </button>
                    <button 
                        onClick={() => setActiveTab('past')}
                        style={{ flex: 1, padding: '0.75rem', border: 'none', background: activeTab === 'past' ? 'var(--bg-card)' : 'transparent', borderRadius: '0.75rem', fontWeight: 600, color: activeTab === 'past' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: activeTab === 'past' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        Past (অতীত)
                    </button>
                </div>
            </div>

            {filteredMeds.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
                    <BookBookmark size={64} weight="duotone" color="var(--primary)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>এখনো কোনো ওষুধ সংরক্ষণ করেননি</h3>
                    <p style={{ color: 'var(--text-muted)' }}>(You haven't saved any medicines yet)</p>
                </div>
            ) : (
                <div style={{ flex: 1 }}>
                    <SwipeableList type={ListType.IOS} fullSwipe={true}>
                        {filteredMeds.map(med => (
                            <SwipeableListItem
                                key={med.id}
                                trailingActions={trailingActions(med.id)}
                            >
                                <div className="glass-panel" style={{ width: '100%', padding: '1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ background: 'rgba(27, 79, 114, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                            <Pill size={28} weight="duotone" />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>{med.name}</h3>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={16} /> Dosage: {med.dosage}</span>
                                                {med.status === 'present' && <span style={{ color: 'var(--success)' }}>Next: {med.nextDose}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {med.status === 'present' && (
                                        <button title="Set Alarm" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(27, 79, 114, 0.1)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                            <Alarm size={24} weight="fill" />
                                        </button>
                                    )}
                                </div>
                            </SwipeableListItem>
                        ))}
                    </SwipeableList>
                </div>
            )}

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-card)', padding: '1rem', borderTop: '1px solid var(--border)', zIndex: 50, display: 'flex', justifyContent: 'center' }}>
                <button className="ui-btn ui-btn-primary" style={{ maxWidth: '400px' }}>
                    <Plus size={20} weight="bold" /> Add Medicine Record
                </button>
            </div>
            {/* Pad the bottom so the fixed button doesn't cover content */}
            <div style={{ height: '80px' }} />
        </div>
    );
};

export default MyMedicines;
