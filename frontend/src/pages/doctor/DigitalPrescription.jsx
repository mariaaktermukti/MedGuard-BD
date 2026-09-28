import React, { useEffect, useState, useRef } from 'react';
import { Plus, Trash, ClipboardText, Sparkle, Pill, Info, Lightning, CaretDown, CaretUp, PaperPlaneTilt } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const emptyItem = { medicine: '', dosage: '', duration: '', instructions: '' };

// Suggestions arrays for dropdown popovers
const POPULAR_MEDICINES = [
    'Napa 500mg',
    'Napa Extra',
    'Ace 500mg',
    'Seclo 20mg',
    'Sergel 20mg',
    'Cef3 200mg',
    'Histacin 4mg',
    'Pantonix 20mg',
    'Montene 10mg',
    'Alacot 0.025%',
    'Flexi 50mg',
    'Tylex 500mg',
    'E-Cap 400IU',
    'Amodis 400mg',
    'Monas 10mg',
    'Maxpro 20mg'
];

const QUICK_DOSAGES = [
    '1 + 0 + 1',
    '1 + 1 + 1',
    '0 + 0 + 1',
    '1 + 0 + 0',
    '1 + 1 + 0',
    '1 tsp 3 times daily',
    '2 puff twice daily',
    'SOS (As needed)'
];

const QUICK_DURATIONS = [
    '3 Days',
    '5 Days',
    '7 Days',
    '10 Days',
    '14 Days',
    '1 Month',
    'Continue (চলবে)'
];

const QUICK_INSTRUCTIONS = [
    'After meal (খাবারের পর)',
    'Before meal (খাবারের আগে)',
    'At bedtime (ঘুমানোর আগে)',
    'With water (পানি সহ)',
    'Empty stomach (খালি পেটে)'
];

// Reusable Combobox Input Component with ^ / ▼ toggle arrow
const ComboboxInput = ({ placeholder, value, onChange, options, style }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const label = typeof opt === 'string' ? opt : opt.label;
        return label.toLowerCase().includes((value || '').toLowerCase());
    });

    const displayOptions = filteredOptions.length > 0 ? filteredOptions : options;

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    style={{
                        width: '100%',
                        padding: '0.65rem 2.2rem 0.65rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-main)',
                        fontSize: '0.88rem',
                        fontWeight: value ? 600 : 400
                    }}
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    tabIndex={-1}
                    title="Toggle suggestions"
                    style={{
                        position: 'absolute',
                        right: '0.4rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    {open ? <CaretUp size={16} weight="bold" /> : <CaretDown size={16} weight="bold" />}
                </button>
            </div>

            {open && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    maxHeight: '210px',
                    overflowY: 'auto',
                    background: 'var(--card-bg, #ffffff)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                    zIndex: 200
                }}>
                    {displayOptions.map((opt, idx) => {
                        const valStr = typeof opt === 'string' ? opt : opt.value || opt.label;
                        const displayStr = typeof opt === 'string' ? opt : opt.label;
                        return (
                            <div
                                key={idx}
                                onClick={() => {
                                    onChange(valStr);
                                    setOpen(false);
                                }}
                                style={{
                                    padding: '0.55rem 0.8rem',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    color: 'var(--text-main)',
                                    borderBottom: idx === displayOptions.length - 1 ? 'none' : '1px solid var(--border-light, rgba(0,0,0,0.04))',
                                    transition: 'background 0.12s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--primary-light, rgba(16, 185, 129, 0.1))';
                                    e.currentTarget.style.color = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-main)';
                                }}
                            >
                                {displayStr}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DigitalPrescription = () => {
    const [patients, setPatients] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);

    const [citizen, setCitizen] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ ...emptyItem }]);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [warnings, setWarnings] = useState(null);
    const [sendingChatId, setSendingChatId] = useState(null);

    const handleSendToChat = async (prescriptionId) => {
        setSendingChatId(prescriptionId);
        try {
            const res = await api.post(`doctor/prescriptions/${prescriptionId}/send-chat/`);
            alert(res.data?.detail || `Prescription #${prescriptionId} has been successfully sent to the patient's Live Chat!`);
        } catch (err) {
            console.error('Failed to send prescription to chat:', err.response?.data || err);
            const detail = err.response?.data?.detail || 'Could not send prescription to chat. Please try again.';
            alert(detail);
        } finally {
            setSendingChatId(null);
        }
    };

    const loadPrescriptions = async () => {
        setLoadingPrescriptions(true);
        try {
            const response = await api.get('doctor/prescriptions/');
            setPrescriptions(response.data);
        } catch (err) {
            console.error('Failed to fetch prescriptions:', err);
        } finally {
            setLoadingPrescriptions(false);
        }
    };

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [patientsRes, medicinesRes] = await Promise.all([
                    api.get('doctor/patients/'),
                    api.get('doctor/medicines/'),
                ]);
                setPatients(patientsRes.data || []);
                setMedicines(medicinesRes.data || []);
            } catch (err) {
                console.error('Failed to load patients/medicines:', err);
            }
        };
        fetchInitial();
        loadPrescriptions();
    }, []);

    const updateItem = (index, field, value) => {
        setWarnings(null);
        setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    };

    const addItem = (customMed = '') => {
        setWarnings(null);
        setItems((prev) => [...prev, { medicine: customMed, dosage: '', duration: '', instructions: '' }]);
    };

    const removeItem = (index) => {
        setWarnings(null);
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleCitizenChange = (value) => {
        setWarnings(null);
        setCitizen(value);
    };

    const resetForm = () => {
        setCitizen('');
        setNotes('');
        setItems([{ ...emptyItem }]);
        setWarnings(null);
    };

    const formatMedicineVal = (val) => {
        if (!val) return '';
        const num = Number(val);
        return !isNaN(num) && String(num) === String(val).trim() ? num : val.trim();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!citizen) {
            setFormError('Select a patient to prescribe for.');
            return;
        }
        if (items.some((item) => !item.medicine || !item.medicine.trim())) {
            setFormError('Please select or type a medicine for every item.');
            return;
        }

        setSubmitting(true);
        try {
            const formattedItems = items.map((item) => ({
                medicine: formatMedicineVal(item.medicine),
                dosage: item.dosage || '',
                duration: item.duration || '',
                instructions: item.instructions || ''
            }));

            if (warnings === null) {
                const checkResponse = await api.post('doctor/prescriptions/check/', {
                    citizen: Number(citizen),
                    items: formattedItems.map((item) => ({ medicine: item.medicine })),
                });
                if (checkResponse.data.warnings && checkResponse.data.warnings.length > 0) {
                    setWarnings(checkResponse.data.warnings);
                    setSubmitting(false);
                    return;
                }
                setWarnings([]);
            }

            await api.post('doctor/prescriptions/', {
                citizen: Number(citizen),
                notes,
                items: formattedItems,
            });
            setFormSuccess('Prescription created successfully!');
            resetForm();
            loadPrescriptions();
        } catch (err) {
            console.error('Prescription create error:', err.response?.data);
            let errorMsg = 'Could not create this prescription.';
            if (err.response?.data) {
                const d = err.response.data;
                if (typeof d === 'string') errorMsg = d;
                else if (d.detail) errorMsg = d.detail;
                else if (d.error) errorMsg = d.error;
                else if (typeof d === 'object') {
                    errorMsg = Object.entries(d)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                        .join(' | ');
                }
            }
            setFormError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const updateStatus = async (prescriptionId, status) => {
        try {
            await api.patch(`doctor/prescriptions/${prescriptionId}/`, { status });
            loadPrescriptions();
        } catch (err) {
            console.error('Failed to update prescription status:', err);
        }
    };

    // Combine Database Medicines + Popular Medicine Suggestions
    const medicineOptions = [
        ...medicines.map((m) => {
            const medName = `${m.name}${m.strength ? ` (${m.strength})` : ''}`;
            return {
                value: medName,
                label: `${medName}${m.manufacturer_name ? ` — ${m.manufacturer_name}` : ''}`
            };
        }),
        ...POPULAR_MEDICINES.filter(pm => !medicines.some(m => m.name.toLowerCase() === pm.toLowerCase()))
            .map(pm => ({ value: pm, label: pm }))
    ];

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                    }}>
                        <ClipboardText size={28} weight="duotone" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            Digital Prescription Generator
                        </h2>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Generate digital prescriptions for verified patients.
                        </p>
                    </div>
                </div>
            </div>

            {/* Create New Prescription Form */}
            <Card>
                <CardHeader
                    title="Write Prescription"
                    subtitle="Select a patient and add medicine items below."
                />
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
                        {/* Patient Selection */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                Patient <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <select
                                value={citizen}
                                onChange={(e) => handleCitizenChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.8rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.95rem'
                                }}
                            >
                                <option value="">-- Select a patient --</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>
                                        {patient.full_name || patient.username} {patient.phone ? `(${patient.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Prescribed Items Container */}
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                    Items
                                </label>
                            </div>

                            {items.map((item, index) => (
                                <div key={index} style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) auto',
                                    gap: '0.6rem',
                                    alignItems: 'center'
                                }}>
                                    {/* Medicine Name with Dropdown Arrow */}
                                    <ComboboxInput
                                        placeholder="Medicine Name..."
                                        value={item.medicine}
                                        onChange={(val) => updateItem(index, 'medicine', val)}
                                        options={medicineOptions}
                                    />

                                    {/* Dosage with Dropdown Arrow */}
                                    <ComboboxInput
                                        placeholder="Dosage"
                                        value={item.dosage}
                                        onChange={(val) => updateItem(index, 'dosage', val)}
                                        options={QUICK_DOSAGES}
                                    />

                                    {/* Duration with Dropdown Arrow */}
                                    <ComboboxInput
                                        placeholder="Duration"
                                        value={item.duration}
                                        onChange={(val) => updateItem(index, 'duration', val)}
                                        options={QUICK_DURATIONS}
                                    />

                                    {/* Instructions with Dropdown Arrow */}
                                    <ComboboxInput
                                        placeholder="Instructions"
                                        value={item.instructions}
                                        onChange={(val) => updateItem(index, 'instructions', val)}
                                        options={QUICK_INSTRUCTIONS}
                                    />

                                    {/* Remove Item Button */}
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        title="Delete item"
                                        style={{
                                            padding: '0.65rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border)',
                                            background: 'transparent',
                                            cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                                            color: items.length === 1 ? 'var(--text-muted)' : 'var(--danger)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => addItem()}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    alignSelf: 'start',
                                    padding: '0.6rem 1.1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1.5px dashed var(--primary)',
                                    background: 'rgba(16, 185, 129, 0.05)',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: '0.88rem'
                                }}
                            >
                                <Plus size={16} weight="bold" /> Add Item
                            </button>
                        </div>

                        {/* Doctor Notes */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                Doctor Notes & Advice
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                placeholder="Add general advice, follow-up date, or dietary precautions..."
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.8rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    resize: 'vertical',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        {/* Safety / AI Warnings */}
                        {warnings && warnings.length > 0 && (
                            <div style={{
                                padding: '0.85rem 1.1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #f59e0b',
                                background: 'rgba(245, 158, 11, 0.08)'
                            }}>
                                <div style={{ fontWeight: 700, color: '#d97706', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Info size={18} weight="fill" /> Review Prescription Warnings:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                                    {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                                </ul>
                            </div>
                        )}

                        {formError && <p style={{ color: 'var(--danger)', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>⚠️ {formError}</p>}
                        {formSuccess && <p style={{ color: 'var(--success)', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>✅ {formSuccess}</p>}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                            <Button type="submit" disabled={submitting} style={{ padding: '0.7rem 1.5rem', fontWeight: 600 }}>
                                {submitting ? 'Creating Prescription...' : warnings && warnings.length > 0 ? 'Proceed & Create Prescription' : 'Create & Send Prescription'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Existing Prescriptions List */}
            <Card>
                <CardHeader title="My Issued Prescriptions" subtitle="View and manage previous prescriptions written for patients." />
                <CardContent>
                    {loadingPrescriptions ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading prescriptions list...</p>
                    ) : prescriptions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 0', color: 'var(--text-muted)' }}>
                            <ClipboardText size={48} weight="duotone" style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                            <p style={{ margin: 0, fontWeight: 600 }}>No prescriptions issued yet.</p>
                            <span style={{ fontSize: '0.85rem' }}>Use the form above to write your first digital prescription.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {prescriptions.map((prescription) => (
                                <div key={prescription.id} style={{
                                    padding: '1.1rem 1.25rem',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    background: 'var(--card-bg, #ffffff)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                                                {prescription.citizen_full_name || prescription.citizen_username}
                                            </span>
                                            <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>&bull;</span>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {new Date(prescription.prescription_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Badge variant={prescription.status === 'active' ? 'success' : prescription.status === 'completed' ? 'neutral' : 'danger'}>
                                                {prescription.status}
                                            </Badge>
                                            <button
                                                type="button"
                                                onClick={() => handleSendToChat(prescription.id)}
                                                disabled={sendingChatId === prescription.id}
                                                style={{
                                                    padding: '0.35rem 0.75rem',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--primary)',
                                                    background: 'rgba(16, 185, 129, 0.08)',
                                                    color: 'var(--primary)',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem'
                                                }}
                                            >
                                                <PaperPlaneTilt size={14} weight="bold" />
                                                {sendingChatId === prescription.id ? 'Sending...' : 'Send to Patient Chat'}
                                            </button>
                                            {prescription.status === 'active' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(prescription.id, 'completed')}
                                                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-subtle)', cursor: 'pointer', color: 'var(--text-main)' }}
                                                    >
                                                        Mark Completed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(prescription.id, 'cancelled')}
                                                        style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem', fontWeight: 600, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items Table / List */}
                                    <div style={{ display: 'grid', gap: '0.4rem', background: 'var(--bg-subtle, rgba(0,0,0,0.02))', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                                        {prescription.items.map((item) => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                <Pill size={16} weight="duotone" style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                <span style={{ fontWeight: 600 }}>{item.medicine_name || item.medicine}</span>
                                                {item.dosage && <span style={{ color: 'var(--text-muted)' }}>— {item.dosage}</span>}
                                                {item.duration && <span style={{ color: 'var(--text-muted)' }}>({item.duration})</span>}
                                                {item.instructions && <span style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>[{item.instructions}]</span>}
                                            </div>
                                        ))}
                                    </div>

                                    {prescription.notes && (
                                        <div style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                            Note: {prescription.notes}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DigitalPrescription;
