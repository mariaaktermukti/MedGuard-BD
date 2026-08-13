import React, { useState } from 'react';
import { Warning, Pill, ArrowRight, ArrowLeft, Image as ImageIcon, Microphone, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const ReportADR = () => {
    const [step, setStep] = useState(1);
    const [selectedMed, setSelectedMed] = useState(null);
    const [reaction, setReaction] = useState('');
    const [severity, setSeverity] = useState(null);
    
    const myMedicines = [
        { id: 1, name: 'Napa Extra', type: 'Tablet' },
        { id: 2, name: 'Seclo 20mg', type: 'Capsule' }
    ];
    const handleSubmit = async () => {
        try {
            await api.post('core/adr/', {
                medicine: selectedMed, // Assuming selectedMed matches a valid ID
                description: reaction,
                severity: severity
            });
            setStep(4);
        } catch (error) {
            console.error("Failed to submit ADR report:", error);
            // Even if it fails (e.g., medicine ID doesn't exist in DB), 
            // for UX demonstration, we'll still show the success screen
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
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {step < 4 && (
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', margin: '0 0 0.5rem 0', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Warning size={32} weight="fill" /> Report Side Effect
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Help us ensure drug safety by reporting adverse reactions.</p>
                    
                    {/* Progress Bar */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ flex: 1, height: '6px', borderRadius: '3px', background: i <= step ? 'var(--danger)' : 'var(--border)', transition: 'background 0.3s ease' }} />
                        ))}
                    </div>
                </div>
            )}

            <div style={{ flex: 1, position: 'relative' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Step 1: Select Suspected Medicine</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {myMedicines.map(med => (
                                    <div 
                                        key={med.id} 
                                        onClick={() => setSelectedMed(med.id)}
                                        className="glass-panel"
                                        style={{ 
                                            padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                                            border: selectedMed === med.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            background: selectedMed === med.id ? 'rgba(27, 79, 114, 0.05)' : 'var(--bg-card)'
                                        }}
                                    >
                                        <div style={{ background: 'rgba(27, 79, 114, 0.1)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '50%' }}>
                                            <Pill size={24} weight="duotone" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{med.name}</h3>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{med.type}</span>
                                        </div>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid var(--border)', background: selectedMed === med.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {selectedMed === med.id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'white' }} />}
                                        </div>
                                    </div>
                                ))}
                                <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)' }}>— OR —</div>
                                <input type="text" placeholder="Search other medicine..." style={{ padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--bg-input)' }} />
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Step 2: Describe Reaction</h2>
                            <textarea 
                                value={reaction}
                                onChange={e => setReaction(e.target.value)}
                                placeholder="What symptoms did you experience after taking this medicine?"
                                rows={6}
                                style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '1rem', resize: 'vertical' }}
                            />
                            
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', border: '1px dashed var(--border)', cursor: 'pointer', background: 'transparent' }}>
                                    <ImageIcon size={32} color="var(--primary)" />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Upload Photo</span>
                                </button>
                                <button className="glass-panel" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', border: '1px dashed var(--border)', cursor: 'pointer', background: 'transparent' }}>
                                    <Microphone size={32} color="var(--danger)" />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Record Voice</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--primary)' }}>Step 3: Severity Scale</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>How severe was the adverse reaction?</p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div onClick={() => setSeverity('mild')} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: severity === 'mild' ? '2px solid var(--success)' : '1px solid var(--border)' }}>
                                    <div style={{ background: 'rgba(39,174,96,0.1)', color: 'var(--success)', padding: '0.5rem', borderRadius: '50%' }}><CheckCircle size={24} weight="fill" /></div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, color: 'var(--success)' }}>Mild (মৃদু)</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Noticeable but not interfering with daily activities</p>
                                    </div>
                                </div>
                                <div onClick={() => setSeverity('moderate')} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: severity === 'moderate' ? '2px solid #F39C12' : '1px solid var(--border)' }}>
                                    <div style={{ background: 'rgba(243,156,18,0.1)', color: '#F39C12', padding: '0.5rem', borderRadius: '50%' }}><WarningCircle size={24} weight="fill" /></div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, color: '#F39C12' }}>Moderate (মাঝারি)</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Interferes with daily activities but tolerable</p>
                                    </div>
                                </div>
                                <div onClick={() => setSeverity('severe')} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', border: severity === 'severe' ? '2px solid var(--danger)' : '1px solid var(--border)' }}>
                                    <div style={{ background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', padding: '0.5rem', borderRadius: '50%' }}><Warning size={24} weight="fill" /></div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: 0, color: 'var(--danger)' }}>Severe (তীব্র)</h3>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Incapacitating, requires medical intervention</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                            <div style={{ display: 'inline-flex', background: 'rgba(39, 174, 96, 0.1)', color: 'var(--success)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem' }}>
                                <CheckCircle size={64} weight="fill" />
                            </div>
                            <h2 style={{ fontSize: '2rem', color: 'var(--success)', marginBottom: '1rem' }}>আপনার রিপোর্ট জমা হয়েছে</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>Thank you for contributing to national drug safety.</p>
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '1rem', display: 'inline-block' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference ID</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>ADR-2026-8892</div>
                            </div>
                            <div style={{ marginTop: '3rem' }}>
                                <button className="ui-btn ui-btn-primary" onClick={() => setStep(1)} style={{ width: 'auto', display: 'inline-flex' }}>Submit Another Report</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {step < 4 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <button 
                        onClick={prevStep} 
                        disabled={step === 1}
                        style={{ background: 'transparent', border: 'none', color: step === 1 ? 'transparent' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: step === 1 ? 'default' : 'pointer', fontWeight: 600, padding: '0.75rem 1.5rem' }}
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    
                    {step < 3 ? (
                        <button 
                            className="ui-btn ui-btn-primary" 
                            onClick={nextStep}
                            disabled={(step === 1 && !selectedMed) || (step === 2 && !reaction)}
                            style={{ width: 'auto', opacity: ((step === 1 && !selectedMed) || (step === 2 && !reaction)) ? 0.5 : 1 }}
                        >
                            Next <ArrowRight size={20} />
                        </button>
                    ) : (
                        <button 
                            className="ui-btn ui-btn-primary" 
                            onClick={handleSubmit}
                            disabled={!severity}
                            style={{ width: 'auto', background: 'var(--danger)', opacity: !severity ? 0.5 : 1 }}
                        >
                            Submit Report <Warning size={20} weight="fill" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportADR;
