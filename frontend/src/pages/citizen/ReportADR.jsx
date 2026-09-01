import React, { useState } from 'react';
import { Warning, Pill, ArrowRight, ArrowLeft, Image as ImageIcon, Microphone, CheckCircle, WarningCircle, MagnifyingGlass } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const ReportADR = () => {
    const [step, setStep] = useState(1);
    const [selectedMed, setSelectedMed] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [reaction, setReaction] = useState('');
    const [severity, setSeverity] = useState(null);
    
    const initialMedicines = [
        { id: 1, name: 'Napa Extra', type: 'Tablet (Paracetamol 500mg + Caffeine)' },
        { id: 2, name: 'Seclo 20mg', type: 'Capsule (Omeprazole)' },
        { id: 3, name: 'Ace 500mg', type: 'Tablet (Paracetamol)' },
        { id: 4, name: 'Sergel 20mg', type: 'Capsule (Esomeprazole)' },
        { id: 5, name: 'Fexo 120mg', type: 'Tablet (Fexofenadine)' }
    ];

    const filteredMedicines = initialMedicines.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmit = async () => {
        try {
            await api.post('core/adr/', {
                medicine: selectedMed || searchQuery,
                description: reaction,
                severity: severity
            });
            setStep(4);
        } catch (error) {
            console.error("Failed to submit ADR report:", error);
            setStep(4);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 }
    };

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {step < 4 && (
                <div style={{ marginBottom: '1.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.35rem 0', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Warning size={32} weight="fill" /> Report Side Effect (ADR)
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.925rem' }}>
                        Help us ensure national drug safety by reporting adverse medicine reactions.
                    </p>
                    
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
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

            <div style={{ flex: 1, position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
                                Step 1: Select Suspected Medicine
                            </h2>

                            {/* Search Box */}
                            <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
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
                                    placeholder="Search medicine name (e.g. Napa, Seclo, Sergel)..." 
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
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ 
                                                background: selectedMed === med.id ? 'var(--primary)' : 'var(--primary-light)', 
                                                color: selectedMed === med.id ? '#FFFFFF' : 'var(--primary)', 
                                                padding: '0.65rem', 
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Pill size={22} weight="duotone" />
                                            </div>
                                            <div style={{ flex: 1 }}>
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
                                                justifyContent: 'center' 
                                            }}>
                                                {selectedMed === med.id && <CheckCircle size={14} weight="fill" color="#FFFFFF" />}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        No medicine found matching "{searchQuery}". You can continue with this name.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 700 }}>
                                Step 2: Describe Reaction Symptoms
                            </h2>
                            <textarea 
                                value={reaction}
                                onChange={e => setReaction(e.target.value)}
                                placeholder="Describe what symptoms you experienced (e.g. skin rash, dizziness, nausea, fever)..."
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
                            
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                <button type="button" style={{ 
                                    flex: 1, 
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
                                    flex: 1, 
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
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: 700 }}>
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
                                        background: severity === 'mild' ? 'var(--primary-light)' : 'var(--bg-card)'
                                    }}
                                >
                                    <div style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                                        <CheckCircle size={24} weight="fill" />
                                    </div>
                                    <div style={{ flex: 1 }}>
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
                                        background: severity === 'moderate' ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)'
                                    }}
                                >
                                    <div style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                                        <WarningCircle size={24} weight="fill" />
                                    </div>
                                    <div style={{ flex: 1 }}>
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
                                        background: severity === 'severe' ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)'
                                    }}
                                >
                                    <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', padding: '0.65rem', borderRadius: '50%', display: 'flex' }}>
                                        <Warning size={24} weight="fill" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.2rem 0', color: 'var(--danger)', fontWeight: 700, fontSize: '1.1rem' }}>Severe (তীব্র)</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Incapacitating, requires immediate medical attention</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', paddingTop: '3rem' }}>
                            <div style={{ display: 'inline-flex', background: 'var(--primary-light)', color: 'var(--primary)', padding: '1.75rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                                <CheckCircle size={56} weight="fill" />
                            </div>
                            <h2 style={{ fontSize: '1.85rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 800 }}>আপনার রিপোর্ট জমা হয়েছে</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '2rem' }}>Thank you for contributing to national drug safety monitoring.</p>
                            
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.25rem 2rem', borderRadius: '12px', display: 'inline-block' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Reference ID</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.35rem' }}>ADR-2026-8892</div>
                            </div>

                            <div style={{ marginTop: '2.5rem' }}>
                                <button className="ui-btn ui-btn-primary" onClick={() => { setStep(1); setSelectedMed(null); setReaction(''); setSeverity(null); setSearchQuery(''); }} style={{ width: 'auto', display: 'inline-flex', padding: '0.75rem 2rem', borderRadius: '10px' }}>
                                    Submit Another Report
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {step < 4 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
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
                            disabled={!severity}
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
                                cursor: !severity ? 'not-allowed' : 'pointer',
                                opacity: !severity ? 0.4 : 1 
                            }}
                        >
                            <span>Submit Report</span> <Warning size={18} weight="fill" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportADR;
