import React, { useState, useEffect } from 'react';
import { Warning, Pill, ArrowRight, ArrowLeft, Image as ImageIcon, Microphone, CheckCircle, WarningCircle, MagnifyingGlass, Clock, ClockCounterClockwise, FileText, CalendarBlank, ShieldCheck, Tag } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Skeleton } from '../../components/ui/Skeleton';

const ReportADR = () => {
    const [viewMode, setViewMode] = useState('new'); // 'new' | 'history'
    const [step, setStep] = useState(1);
    const [selectedMed, setSelectedMed] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [reaction, setReaction] = useState('');
    const [severity, setSeverity] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // History state
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [historySearch, setHistorySearch] = useState('');

    const initialMedicines = [
        { id: 'Napa Extra', name: 'Napa Extra', type: 'Tablet (Paracetamol 500mg + Caffeine)' },
        { id: 'Seclo 20mg', name: 'Seclo 20mg', type: 'Capsule (Omeprazole)' },
        { id: 'Ace 500mg', name: 'Ace 500mg', type: 'Tablet (Paracetamol)' },
        { id: 'Sergel 20mg', name: 'Sergel 20mg', type: 'Capsule (Esomeprazole)' },
        { id: 'Fexo 120mg', name: 'Fexo 120mg', type: 'Tablet (Fexofenadine)' }
    ];

    const filteredMedicines = initialMedicines.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await api.get('core/adr/');
            setHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch ADR history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [viewMode]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            let medPayload = selectedMed;
            if (typeof selectedMed === 'string' && selectedMed.startsWith('custom-')) {
                medPayload = selectedMed.replace('custom-', '');
            } else if (!selectedMed && searchQuery.trim()) {
                medPayload = searchQuery.trim();
            }

            const payload = {
                medicine_name: medPayload ? String(medPayload) : 'Napa Extra',
                description: reaction,
                severity: severity || 'mild'
            };

            await api.post('core/adr/', payload);
            await fetchHistory(); // Immediately refresh history

            setStep(4);
        } catch (error) {
            console.error("Failed to submit ADR report:", error);
            const errData = error.response?.data;
            let errMsg = 'Failed to submit ADR report. Please try again.';
            if (typeof errData === 'string') {
                errMsg = errData;
            } else if (errData && typeof errData === 'object') {
                errMsg = Object.entries(errData)
                    .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
                    .join('\n');
            }
            Swal.fire({
                title: 'Submission Error',
                text: errMsg,
                icon: 'error'
            });
        } finally {
            setIsSubmitting(false);
            setIsLoadingHistory(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    const filteredHistory = history.filter(item => {
        const medName = (item.medicine_name || item.medicine_details?.name || 'Unknown').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const q = historySearch.toLowerCase();
        return medName.includes(q) || desc.includes(q);
    });

    const getSeverityBadge = (sev) => {
        const s = (sev || '').toLowerCase();
        if (s === 'severe' || s === 'high') {
            return <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><Warning size={14} weight="fill" /> Severe (তীব্র)</span>;
        } else if (s === 'moderate' || s === 'medium') {
            return <span style={{ background: '#fffbeb', color: '#d97706', border: '1px solid #fcd34d', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><WarningCircle size={14} weight="fill" /> Moderate (মাঝারি)</span>;
        } else {
            return <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #6ee7b7', padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle size={14} weight="fill" /> Mild (মৃদু)</span>;
        }
    };

    return (
        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%' }}>
            
            {/* Header with Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.65rem', margin: '0 0 0.2rem 0', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                        <Warning size={32} weight="fill" /> Adverse Drug Reaction (ADR)
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>
                        National Drug Safety & Adverse Reaction Reporting System
                    </p>
                </div>

                <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border)', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => setViewMode('new')}
                        style={{
                            padding: '0.55rem 1.1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'new' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'new' ? '#ffffff' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Pill size={18} weight="duotone" />
                        New Report
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setViewMode('history');
                            fetchHistory();
                        }}
                        style={{
                            padding: '0.55rem 1.1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: viewMode === 'history' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'history' ? '#ffffff' : 'var(--text-muted)',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <ClockCounterClockwise size={18} weight="bold" />
                        ADR History ({history.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: NEW REPORT FORM */}
            {viewMode === 'new' && (
                <div style={{ flex: 1, position: 'relative', width: '100%' }}>
                    {step < 4 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            {/* Form Step Progress Bar */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                {[1, 2, 3].map(i => (
                                    <div key={i} style={{ 
                                        flex: 1, 
                                        height: '6px', 
                                        borderRadius: '3px', 
                                        background: i <= step ? 'var(--danger)' : 'var(--border)', 
                                        transition: 'background 0.3s ease' 
                                    }} />
                                ))}
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    Step 1: Select Suspected Medicine
                                </h2>

                                {/* Search Box */}
                                <div style={{ position: 'relative', marginBottom: '1.25rem', width: '100%' }}>
                                    <MagnifyingGlass size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input 
                                        type="text" 
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            if (e.target.value.trim() !== '') {
                                                setSelectedMed(`custom-${e.target.value}`);
                                            }
                                        }}
                                        placeholder="Search medicine name (e.g. Napa Extra, Seclo, Sergel)..." 
                                        style={{ 
                                            width: '100%', 
                                            padding: '0.75rem 1rem 0.75rem 2.6rem', 
                                            borderRadius: '10px', 
                                            border: '1px solid var(--border)', 
                                            background: 'var(--bg-input)',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem',
                                            outline: 'none'
                                        }} 
                                    />
                                </div>

                                {/* Medicine Cards List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '360px', overflowY: 'auto' }}>
                                    {filteredMedicines.length > 0 ? (
                                        filteredMedicines.map(med => (
                                            <div 
                                                key={med.id} 
                                                onClick={() => {
                                                    setSelectedMed(med.id);
                                                    setSearchQuery('');
                                                }}
                                                style={{ 
                                                    padding: '1rem 1.25rem', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '1rem', 
                                                    cursor: 'pointer',
                                                    borderRadius: '12px',
                                                    border: selectedMed === med.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                                    background: selectedMed === med.id ? 'var(--primary-light)' : 'var(--bg-card)',
                                                    transition: 'all 0.15s ease',
                                                    flexWrap: 'wrap'
                                                }}
                                            >
                                                <div style={{ 
                                                    background: selectedMed === med.id ? 'var(--primary)' : 'var(--primary-light)', 
                                                    color: selectedMed === med.id ? '#FFFFFF' : 'var(--primary)', 
                                                    padding: '0.65rem', 
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <Pill size={22} weight="duotone" />
                                                </div>
                                                <div style={{ flex: 1, minWidth: '200px' }}>
                                                    <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', color: 'var(--text-main)', fontWeight: 700 }}>{med.name}</h3>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{med.type}</span>
                                                </div>
                                                <div style={{ 
                                                    width: '22px', 
                                                    height: '22px', 
                                                    borderRadius: '50%', 
                                                    border: `2px solid ${selectedMed === med.id ? 'var(--primary)' : 'var(--border)'}`, 
                                                    background: selectedMed === med.id ? 'var(--primary)' : 'transparent', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {selectedMed === med.id && <CheckCircle size={14} weight="fill" color="#FFFFFF" />}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                            Custom entry selected: "{searchQuery}". You can continue with this medicine.
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    Step 2: Describe Reaction Symptoms
                                </h2>
                                <textarea 
                                    value={reaction}
                                    onChange={e => setReaction(e.target.value)}
                                    placeholder="Describe symptoms experienced (e.g. severe skin rash, vomiting, dizziness, breathlessness)..."
                                    rows={6}
                                    style={{ 
                                        width: '100%', 
                                        padding: '1rem', 
                                        borderRadius: '12px', 
                                        border: '1px solid var(--border)', 
                                        background: 'var(--bg-input)', 
                                        color: 'var(--text-main)', 
                                        fontSize: '0.95rem', 
                                        resize: 'vertical',
                                        outline: 'none',
                                        lineHeight: 1.5
                                    }}
                                />
                                
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                                    <button type="button" style={{ 
                                        flex: '1 1 200px', 
                                        padding: '1.25rem', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        gap: '0.5rem', 
                                        border: '1px dashed var(--border)', 
                                        borderRadius: '12px',
                                        cursor: 'pointer', 
                                        background: 'var(--bg-card)' 
                                    }}>
                                        <ImageIcon size={28} color="var(--primary)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Upload Photo</span>
                                    </button>
                                    <button type="button" style={{ 
                                        flex: '1 1 200px', 
                                        padding: '1.25rem', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        gap: '0.5rem', 
                                        border: '1px dashed var(--border)', 
                                        borderRadius: '12px',
                                        cursor: 'pointer', 
                                        background: 'var(--bg-card)' 
                                    }}>
                                        <Microphone size={28} color="var(--danger)" />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Record Voice</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
                                    Step 3: Reaction Severity
                                </h2>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                    How severe was the adverse reaction?
                                </p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div 
                                        onClick={() => setSeverity('mild')} 
                                        style={{ 
                                            padding: '1.25rem', 
                                            borderRadius: '12px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1rem', 
                                            cursor: 'pointer', 
                                            border: severity === 'mild' ? '2px solid var(--success)' : '1px solid var(--border)',
                                            background: severity === 'mild' ? 'var(--primary-light)' : 'var(--bg-card)',
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '0.65rem', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                                            <CheckCircle size={24} weight="fill" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--success)', fontWeight: 700, fontSize: '1.1rem' }}>Mild (মৃদু)</h3>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Noticeable but does not interfere with daily activities</p>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setSeverity('moderate')} 
                                        style={{ 
                                            padding: '1.25rem', 
                                            borderRadius: '12px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1rem', 
                                            cursor: 'pointer', 
                                            border: severity === 'moderate' ? '2px solid var(--warning)' : '1px solid var(--border)',
                                            background: severity === 'moderate' ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)',
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        <div style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '0.65rem', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                                            <WarningCircle size={24} weight="fill" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--warning)', fontWeight: 700, fontSize: '1.1rem' }}>Moderate (মাঝারি)</h3>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Interferes with daily activities but tolerable</p>
                                        </div>
                                    </div>

                                    <div 
                                        onClick={() => setSeverity('severe')} 
                                        style={{ 
                                            padding: '1.25rem', 
                                            borderRadius: '12px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '1rem', 
                                            cursor: 'pointer', 
                                            border: severity === 'severe' ? '2px solid var(--danger)' : '1px solid var(--border)',
                                            background: severity === 'severe' ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)',
                                            flexWrap: 'wrap'
                                        }}
                                    >
                                        <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '0.65rem', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                                            <Warning size={24} weight="fill" />
                                        </div>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--danger)', fontWeight: 700, fontSize: '1.1rem' }}>Severe (তীব্র)</h3>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Incapacitating, requires immediate medical attention</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', paddingTop: '2.5rem' }}>
                                <div style={{ display: 'inline-flex', background: 'var(--primary-light)', color: 'var(--primary)', padding: '1.75rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                    <CheckCircle size={56} weight="fill" />
                                </div>
                                <h2 style={{ fontSize: '1.85rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 800 }}>আপনার রিপোর্ট জমা হয়েছে</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>Thank you for contributing to national drug safety monitoring.</p>
                                
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <button className="ui-btn ui-btn-primary" onClick={() => { setStep(1); setSelectedMed(null); setReaction(''); setSeverity(null); setSearchQuery(''); }} style={{ width: 'auto', padding: '0.75rem 1.8rem', borderRadius: '10px' }}>
                                        Submit Another Report
                                    </button>
                                    <button className="ui-btn" onClick={() => { setViewMode('history'); fetchHistory(); }} style={{ width: 'auto', padding: '0.75rem 1.8rem', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-main)', fontWeight: 700 }}>
                                        📜 View ADR History
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {step < 4 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
                            <button 
                                type="button"
                                onClick={prevStep} 
                                disabled={step === 1}
                                style={{ 
                                    background: 'var(--bg-card)', 
                                    border: '1px solid var(--border)', 
                                    color: step === 1 ? 'var(--text-muted)' : 'var(--text-main)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem', 
                                    cursor: step === 1 ? 'not-allowed' : 'pointer', 
                                    fontWeight: 600, 
                                    padding: '0.7rem 1.4rem',
                                    borderRadius: '10px',
                                    opacity: step === 1 ? 0.4 : 1,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <ArrowLeft size={18} weight="bold" /> Back
                            </button>
                            
                            {step < 3 ? (
                                <button 
                                    type="button"
                                    className="ui-btn ui-btn-primary" 
                                    onClick={nextStep}
                                    disabled={(step === 1 && !selectedMed && !searchQuery.trim()) || (step === 2 && !reaction.trim())}
                                    style={{ 
                                        width: 'auto', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.5rem',
                                        padding: '0.7rem 1.6rem',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: ((step === 1 && !selectedMed && !searchQuery.trim()) || (step === 2 && !reaction.trim())) ? 'not-allowed' : 'pointer',
                                        opacity: ((step === 1 && !selectedMed && !searchQuery.trim()) || (step === 2 && !reaction.trim())) ? 0.4 : 1
                                    }}
                                >
                                    <span>Next Step</span> <ArrowRight size={18} weight="bold" />
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    className="ui-btn ui-btn-primary" 
                                    onClick={handleSubmit}
                                    disabled={!severity || isSubmitting}
                                    style={{ 
                                        width: 'auto', 
                                        background: 'var(--danger)', 
                                        color: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.75rem 1.6rem',
                                        borderRadius: '10px',
                                        fontWeight: 600,
                                        cursor: (!severity || isSubmitting) ? 'not-allowed' : 'pointer',
                                        opacity: (!severity || isSubmitting) ? 0.4 : 1 
                                    }}
                                >
                                    <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span> <Warning size={18} weight="fill" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ADR REPORT HISTORY */}
            {viewMode === 'history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                    {/* Search & Filter Bar */}
                    <div style={{ position: 'relative', width: '100%' }}>
                        <MagnifyingGlass size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            value={historySearch}
                            onChange={(e) => setHistorySearch(e.target.value)}
                            placeholder="Filter reported medicines or symptoms..." 
                            style={{ 
                                width: '100%', 
                                padding: '0.75rem 1rem 0.75rem 2.6rem', 
                                borderRadius: '10px', 
                                border: '1px solid var(--border)', 
                                background: 'var(--bg-input)',
                                color: 'var(--text-main)',
                                fontSize: '0.925rem',
                                outline: 'none'
                            }} 
                        />
                    </div>

                    {isLoadingHistory ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Skeleton height="110px" width="100%" borderRadius="14px" />
                            <Skeleton height="110px" width="100%" borderRadius="14px" />
                            <Skeleton height="110px" width="100%" borderRadius="14px" />
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div style={{ 
                            padding: '3.5rem 1.5rem', 
                            textAlign: 'center', 
                            background: 'var(--bg-card)', 
                            borderRadius: '16px', 
                            border: '1px dashed var(--border)' 
                        }}>
                            <FileText size={48} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                            <h3 style={{ margin: '0 0 0.35rem 0', color: 'var(--text-main)', fontWeight: 700 }}>No ADR Reports Found</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                                You have not submitted any adverse drug reaction reports yet.
                            </p>
                            <button 
                                className="ui-btn ui-btn-primary" 
                                onClick={() => setViewMode('new')}
                                style={{ width: 'auto', padding: '0.6rem 1.5rem', borderRadius: '8px' }}
                            >
                                Submit First ADR Report
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {filteredHistory.map((item) => {
                                const medName = item.medicine_name || item.medicine_details?.name || 'Personal Medicine';
                                const reportedDate = item.date_reported 
                                    ? new Date(item.date_reported).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Recent';

                                return (
                                    <div 
                                        key={item.id}
                                        style={{ 
                                            padding: '1.25rem 1.5rem', 
                                            background: 'var(--bg-card)', 
                                            borderRadius: '16px', 
                                            border: '1px solid var(--border)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.85rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.4rem', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                                                        <Pill size={18} weight="duotone" />
                                                    </div>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                                        {medName}
                                                    </h3>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Tag size={13} /> Ref ID: ADR-2026-{1000 + item.id}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {getSeverityBadge(item.severity)}
                                                <span style={{ 
                                                    background: item.status === 'resolved' ? '#ecfdf5' : '#eff6ff', 
                                                    color: item.status === 'resolved' ? '#059669' : '#2563eb', 
                                                    border: `1px solid ${item.status === 'resolved' ? '#a7f3d0' : '#bfdbfe'}`,
                                                    padding: '0.25rem 0.65rem', 
                                                    borderRadius: '20px', 
                                                    fontSize: '0.78rem', 
                                                    fontWeight: 700,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {item.status || 'Pending'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Symptom Description Box */}
                                        <div style={{ 
                                            background: 'var(--bg-input)', 
                                            padding: '0.85rem 1rem', 
                                            borderRadius: '10px', 
                                            border: '1px solid var(--border)',
                                            fontSize: '0.875rem',
                                            color: 'var(--text-main)',
                                            lineHeight: 1.55
                                        }}>
                                            <strong style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Reported Symptoms</strong>
                                            {item.description || 'No detailed description provided.'}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <CalendarBlank size={15} /> Reported: {reportedDate}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#059669', fontWeight: 600 }}>
                                                <ShieldCheck size={15} /> DGDA Logged
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportADR;
