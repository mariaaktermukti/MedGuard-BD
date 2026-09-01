import React, { useState, useEffect, useRef } from 'react';
import { Pill, Alarm, Trash, Clock, Plus, BookBookmark, XCircle, CheckCircle, Bell, Pencil, Timer } from '@phosphor-icons/react';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions, Type as ListType } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import Swal from 'sweetalert2';
import api from '../../services/api';
import Button from '../../components/ui/Button';

import { MedicineListSkeleton } from '../../components/ui/Skeleton';

const MyMedicines = () => {
    const [activeTab, setActiveTab] = useState('present');
    const [medicines, setMedicines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMed, setEditingMed] = useState(null); // null = create mode, object = edit mode
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live 1-second ticker for remaining time countdowns
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Form State
    const [formData, setFormData] = useState({
        medicine_name: '',
        dosage: '1 Tablet',
        frequency: '1+0+1 (Day & Night)',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        reminder_time: '08:00 PM',
        notes: ''
    });

    const commonMedicines = [
        'Napa Extra (Paracetamol + Caffeine)',
        'Seclo 20mg (Omeprazole)',
        'Ace 500mg (Paracetamol)',
        'Sergel 20mg (Esomeprazole)',
        'Fexo 120mg (Fexofenadine)',
        'Ciprocin 500mg (Ciprofloxacin)',
        'Azithrocin 500mg (Azithromycin)'
    ];

    const fetchMedicines = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('core/medicines/personal/');
            const mappedMeds = response.data.map(med => ({
                id: med.id,
                name: med.medicine_details?.name || med.medicine_name || 'Personal Medicine',
                type: med.medicine_details?.dosage_form || 'Tablet',
                dosage: med.dosage || '1 Dose',
                frequency: med.frequency || 'Daily',
                nextDose: med.reminder_times?.length > 0 ? med.reminder_times[0] : '08:00 PM',
                startDate: med.start_date,
                notes: med.notes || '',
                status: med.is_active ? 'present' : 'past'
            }));
            setMedicines(mappedMeds);
        } catch (error) {
            console.error("Failed to fetch medicines:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicines();
    }, []);

    // Calculate Live Remaining Time Countdown string until nextDose time
    const calculateCountdown = (doseTimeStr) => {
        if (!doseTimeStr) return null;

        try {
            const now = currentTime;
            let target = new Date(now);

            const str = doseTimeStr.trim().toUpperCase();
            let hours = 0;
            let minutes = 0;

            if (str.includes('AM') || str.includes('PM')) {
                const parts = str.replace(/AM|PM/, '').trim().split(':');
                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
                if (str.includes('PM') && hours < 12) hours += 12;
                if (str.includes('AM') && hours === 12) hours = 0;
            } else {
                const parts = str.split(':');
                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
            }

            target.setHours(hours, minutes, 0, 0);

            // If time today has already passed, target is next day's dose
            if (target < now) {
                target.setDate(target.getDate() + 1);
            }

            const diffMs = target - now;
            const diffSec = Math.floor((diffMs / 1000) % 60);
            const diffMin = Math.floor((diffMs / (1000 * 60)) % 60);
            const diffHr = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffMs <= 1000) {
                return { text: "⏰ DUE NOW!", isDue: true };
            }

            let countdownText = "";
            if (diffHr > 0) countdownText += `${diffHr}h `;
            countdownText += `${diffMin.toString().padStart(2, '0')}m ${diffSec.toString().padStart(2, '0')}s`;

            return { text: `⏳ In ${countdownText}`, isDue: false };
        } catch (e) {
            return null;
        }
    };

    // Open Modal for Create or Edit
    const handleOpenModal = (medToEdit = null) => {
        if (medToEdit) {
            setEditingMed(medToEdit);
            setFormData({
                medicine_name: medToEdit.name,
                dosage: medToEdit.dosage,
                frequency: medToEdit.frequency,
                start_date: medToEdit.startDate || new Date().toISOString().split('T')[0],
                end_date: '',
                reminder_time: medToEdit.nextDose,
                notes: medToEdit.notes || ''
            });
        } else {
            setEditingMed(null);
            setFormData({
                medicine_name: '',
                dosage: '1 Tablet',
                frequency: '1+0+1 (Day & Night)',
                start_date: new Date().toISOString().split('T')[0],
                end_date: '',
                reminder_time: '08:00 PM',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    // Delete with SweetAlert2 Confirmation Dialog
    const handleDelete = (id, name) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you really want to delete "${name || 'this medicine'}" from your record?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            reverseButtons: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`core/medicines/personal/${id}/`);
                    setMedicines(prev => prev.filter(m => m.id !== id));
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Medicine record has been deleted.',
                        icon: 'success',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } catch (error) {
                    console.error("Failed to delete medicine:", error);
                    Swal.fire('Error', 'Failed to delete medicine record.', 'error');
                }
            }
        });
    };

    // Toggle Active / Past Status
    const handleToggleStatus = async (id, currentStatus, name) => {
        const isTargetActive = currentStatus === 'past';
        try {
            await api.patch(`core/medicines/personal/${id}/`, {
                is_active: isTargetActive
            });

            setMedicines(prev => prev.map(med => {
                if (med.id === id) {
                    return { ...med, status: isTargetActive ? 'present' : 'past' };
                }
                return med;
            }));

            Swal.fire({
                title: isTargetActive ? 'Re-activated! 🟢' : 'Moved to Past! 📦',
                text: `"${name}" has been moved to ${isTargetActive ? 'Active Medicines' : 'Past History'}.`,
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2200
            });
        } catch (error) {
            console.error("Failed to update status:", error);
            Swal.fire('Error', 'Failed to update medicine status.', 'error');
        }
    };

    // Form Submit (Handles both CREATE and EDIT/UPDATE)
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.medicine_name.trim()) {
            Swal.fire('Required Field', 'Please enter or select a medicine name.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                medicine_name: formData.medicine_name,
                dosage: formData.dosage,
                frequency: formData.frequency,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                reminder_times: [formData.reminder_time],
                is_active: true,
                notes: formData.notes
            };

            if (editingMed) {
                // EDIT MODE -> PATCH
                await api.patch(`core/medicines/personal/${editingMed.id}/`, payload);
                Swal.fire({
                    title: 'Record Updated! ✏️',
                    text: 'Your personal medicine record has been updated successfully.',
                    icon: 'success',
                    confirmButtonColor: '#059669',
                    timer: 2000,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            } else {
                // CREATE MODE -> POST
                await api.post('core/medicines/personal/', payload);
                Swal.fire({
                    title: 'Medicine Saved! 🎉',
                    text: 'Your personal medicine record has been saved with active dose alarm.',
                    icon: 'success',
                    confirmButtonColor: '#059669',
                    timer: 2200,
                    timerProgressBar: true,
                    showConfirmButton: false
                });
            }

            setIsSubmitting(false);
            setIsModalOpen(false);
            setEditingMed(null);
            fetchMedicines();
        } catch (error) {
            console.error("Failed to save medicine record:", error.response?.data || error);
            setIsSubmitting(false);
            const serverMsg = typeof error.response?.data === 'object' 
                ? Object.entries(error.response.data).map(([k, v]) => `${k}: ${v}`).join('\n') 
                : (error.response?.data || 'Failed to save medicine record. Please try again.');
            Swal.fire('Error', serverMsg, 'error');
        }
    };

    const filteredMeds = medicines.filter(m => m.status === activeTab);

    if (isLoading) {
        return <MedicineListSkeleton />;
    }

    const trailingActions = (id, name) => (
        <TrailingActions>
            <SwipeAction
                destructive={true}
                onClick={() => handleDelete(id, name)}
            >
                <div style={{ background: 'var(--danger)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 1.5rem', borderRadius: '0 1rem 1rem 0', cursor: 'pointer' }}>
                    <Trash size={22} weight="bold" />
                </div>
            </SwipeAction>
        </TrailingActions>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)', fontWeight: 800 }}>
                            Personal Medicine Record
                        </h1>
                        <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                            🔔 Real-time Alarm, Countdown Ticker & Record Management
                        </div>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Total: {medicines.length} Saved
                    </span>
                </div>
                
                {/* Segmented Control */}
                <div style={{ display: 'flex', background: 'var(--primary-light)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <button 
                        onClick={() => setActiveTab('present')}
                        style={{ 
                            flex: 1, 
                            padding: '0.75rem', 
                            border: 'none', 
                            background: activeTab === 'present' ? 'var(--bg-card)' : 'transparent', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: activeTab === 'present' ? 'var(--primary)' : 'var(--text-muted)', 
                            boxShadow: activeTab === 'present' ? 'var(--shadow-sm)' : 'none', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease' 
                        }}
                    >
                        Active Medicines ({medicines.filter(m => m.status === 'present').length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('past')}
                        style={{ 
                            flex: 1, 
                            padding: '0.75rem', 
                            border: 'none', 
                            background: activeTab === 'past' ? 'var(--bg-card)' : 'transparent', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            color: activeTab === 'past' ? 'var(--primary)' : 'var(--text-muted)', 
                            boxShadow: activeTab === 'past' ? 'var(--shadow-sm)' : 'none', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease' 
                        }}
                    >
                        Past History ({medicines.filter(m => m.status === 'past').length})
                    </button>
                </div>
            </div>

            {filteredMeds.length === 0 ? (
                <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '4rem 2rem',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px dashed var(--border)',
                    textAlign: 'center'
                }}>
                    <BookBookmark size={60} weight="duotone" color="var(--primary)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontWeight: 700 }}>
                        {activeTab === 'present' ? 'কোনো সক্রিয় ওষুধ নেই' : 'কোনো অতীত ওষুধ নেই'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.925rem' }}>
                        {activeTab === 'present' 
                            ? 'Click the "+ Add Medicine Record" button below to store your active doses.' 
                            : 'Medicines moved to past history will appear here.'}
                    </p>
                </div>
            ) : (
                <div style={{ flex: 1 }}>
                    <SwipeableList type={ListType.IOS} fullSwipe={true}>
                        {filteredMeds.map(med => {
                            const countdown = med.status === 'present' ? calculateCountdown(med.nextDose) : null;

                            return (
                                <SwipeableListItem
                                    key={med.id}
                                    trailingActions={trailingActions(med.id, med.name)}
                                >
                                    <div style={{ 
                                        width: '100%', 
                                        padding: '1.25rem', 
                                        marginBottom: '0.85rem', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '14px',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: '1 1 280px' }}>
                                            <div style={{ 
                                                background: med.status === 'present' ? 'var(--primary-light)' : '#f1f5f9', 
                                                color: med.status === 'present' ? 'var(--primary)' : '#64748b', 
                                                padding: '0.75rem', 
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Pill size={26} weight="duotone" />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                                    {med.name}
                                                </h3>
                                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Clock size={15} color="var(--primary)" /> Dosage: {med.dosage} ({med.frequency})
                                                    </span>

                                                    {/* Live Remaining Time Countdown Badge */}
                                                    {countdown && (
                                                        <span style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '0.3rem', 
                                                            background: countdown.isDue ? '#fef2f2' : '#f0fdf4',
                                                            color: countdown.isDue ? '#ef4444' : '#047857',
                                                            padding: '0.2rem 0.6rem',
                                                            borderRadius: '12px',
                                                            fontWeight: 800,
                                                            fontSize: '0.775rem',
                                                            border: `1px solid ${countdown.isDue ? '#fecaca' : '#bbf7d0'}`
                                                        }}>
                                                            <Timer size={14} weight="fill" /> {countdown.text}
                                                        </span>
                                                    )}

                                                    {med.notes && (
                                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                            Note: {med.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                            {/* Scheduled Dose Time Tag */}
                                            {med.status === 'present' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                                    <Alarm size={16} weight="fill" /> {med.nextDose}
                                                </div>
                                            )}

                                            {/* Edit Action Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(med)}
                                                title="Edit Record"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '0.45rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: '#f8fafc',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <Pencil size={17} weight="bold" />
                                            </button>

                                            {/* Push to Past / Re-activate Action Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(med.id, med.status, med.name)}
                                                title={med.status === 'present' ? 'Push to Past History (অতীত করুন)' : 'Restore to Active Medicines'}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    padding: '0.4rem 0.65rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)',
                                                    background: med.status === 'present' ? '#f0fdf4' : '#f8fafc',
                                                    color: med.status === 'present' ? '#047857' : '#475569',
                                                    fontWeight: 700,
                                                    fontSize: '0.775rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {med.status === 'present' ? (
                                                    <>
                                                        <CheckCircle size={16} weight="bold" />
                                                        <span>Move to Past</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={16} weight="bold" />
                                                        <span>Restore</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Delete Button with Confirmation Modal */}
                                            <button 
                                                type="button" 
                                                onClick={() => handleDelete(med.id, med.name)}
                                                title="Delete Record"
                                                style={{ 
                                                    background: '#fef2f2', 
                                                    border: '1px solid #fecaca', 
                                                    color: 'var(--danger)', 
                                                    cursor: 'pointer',
                                                    padding: '0.4rem 0.6rem',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Trash size={17} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </SwipeableListItem>
                            );
                        })}
                    </SwipeableList>
                </div>
            )}

            {/* Bottom Add Medicine Trigger Bar */}
            <div style={{ 
                position: 'fixed', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                background: 'var(--bg-card)', 
                padding: '1rem', 
                borderTop: '1px solid var(--border)', 
                zIndex: 40, 
                display: 'flex', 
                justifyContent: 'center',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <Button 
                    variant="primary" 
                    onClick={() => handleOpenModal(null)}
                    style={{ maxWidth: '400px', width: '100%', fontWeight: 700, padding: '0.85rem' }}
                >
                    <Plus size={20} weight="bold" />
                    <span>Add Medicine Record</span>
                </Button>
            </div>

            <div style={{ height: '80px' }} />

            {/* CREATE / EDIT MEDICINE MODAL DIALOG */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        width: '100%',
                        maxWidth: '520px',
                        borderRadius: '16px',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {/* Modal Header */}
                        <div style={{ 
                            padding: '1.25rem 1.5rem', 
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'var(--primary-light)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                {editingMed ? <Pencil size={24} color="var(--primary)" weight="fill" /> : <Pill size={24} color="var(--primary)" weight="fill" />}
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                    {editingMed ? 'Edit Personal Medicine Record' : 'Add Personal Medicine Record'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                <XCircle size={24} weight="fill" />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleFormSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            
                            {/* Medicine Name Select/Input */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    Medicine Name <span style={{ color: 'var(--danger)' }}>*</span>
                                </label>
                                <input 
                                    type="text"
                                    list="medicine-suggestions"
                                    value={formData.medicine_name}
                                    onChange={e => setFormData({ ...formData, medicine_name: e.target.value })}
                                    placeholder="Type or select medicine (e.g. Napa Extra, Seclo 20mg)..."
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.925rem',
                                        outline: 'none'
                                    }}
                                />
                                <datalist id="medicine-suggestions">
                                    {commonMedicines.map((med, idx) => (
                                        <option key={idx} value={med} />
                                    ))}
                                </datalist>
                            </div>

                            {/* Dosage & Frequency Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        Dosage <span style={{ color: 'var(--danger)' }}>*</span>
                                    </label>
                                    <input 
                                        type="text"
                                        value={formData.dosage}
                                        onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                                        placeholder="e.g. 1 Tablet, 500mg, 10ml"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.925rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        Frequency
                                    </label>
                                    <select 
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.925rem',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value="1+0+1 (Day & Night)">1+0+1 (Dine 2 Bar / Day & Night)</option>
                                        <option value="1+1+1 (3 Times Daily)">1+1+1 (Dine 3 Bar)</option>
                                        <option value="0+0+1 (At Night)">0+0+1 (Rate 1 Bar)</option>
                                        <option value="1+0+0 (In Morning)">1+0+0 (Shokale 1 Bar)</option>
                                        <option value="As Needed (Proyojone)">As Needed (প্রয়োজনে)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Start Date & Reminder Time Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        Start Date
                                    </label>
                                    <input 
                                        type="date"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.925rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        Dose Alarm Time
                                    </label>
                                    <input 
                                        type="text"
                                        value={formData.reminder_time}
                                        onChange={e => setFormData({ ...formData, reminder_time: e.target.value })}
                                        placeholder="e.g. 08:00 PM"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 0.9rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'var(--bg-input)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.925rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    Special Notes / Instructions
                                </label>
                                <input 
                                    type="text"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="e.g. Always take after food to avoid acidity..."
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 0.9rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        backgroundColor: 'var(--bg-input)',
                                        color: 'var(--text-main)',
                                        fontSize: '0.925rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Form Footer Buttons */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ flex: 1, padding: '0.8rem' }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="primary" 
                                    disabled={isSubmitting}
                                    style={{ flex: 2, padding: '0.8rem', fontWeight: 700 }}
                                >
                                    {isSubmitting ? 'Saving to Database...' : editingMed ? 'Update Record' : 'Save Medicine Record'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyMedicines;
