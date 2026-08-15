import React, { useEffect, useState } from 'react';
import { Plus, Trash, ClipboardText } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const emptyItem = { medicine: '', dosage: '', duration: '', instructions: '' };

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
                setPatients(patientsRes.data);
                setMedicines(medicinesRes.data);
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

    const addItem = () => {
        setWarnings(null);
        setItems((prev) => [...prev, { ...emptyItem }]);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');

        if (!citizen) {
            setFormError('Select a patient.');
            return;
        }
        if (items.some((item) => !item.medicine)) {
            setFormError('Select a medicine for every item.');
            return;
        }

        setSubmitting(true);
        try {
            if (warnings === null) {
                const checkResponse = await api.post('doctor/prescriptions/check/', {
                    citizen: Number(citizen),
                    items: items.map((item) => ({ medicine: Number(item.medicine) })),
                });
                if (checkResponse.data.warnings.length > 0) {
                    setWarnings(checkResponse.data.warnings);
                    setSubmitting(false);
                    return;
                }
                setWarnings([]);
            }

            await api.post('doctor/prescriptions/', {
                citizen: Number(citizen),
                notes,
                items: items.map((item) => ({ ...item, medicine: Number(item.medicine) })),
            });
            setFormSuccess('Prescription created.');
            resetForm();
            loadPrescriptions();
        } catch (err) {
            setFormError(err.response?.data?.detail || 'Could not create this prescription.');
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

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <Card>
                <CardHeader title="New Prescription" subtitle="Only for patients you already have a consultation or prescription history with." />
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Patient</label>
                            <select
                                value={citizen}
                                onChange={(e) => handleCitizenChange(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            >
                                <option value="">Select a patient...</option>
                                {patients.map((patient) => (
                                    <option key={patient.id} value={patient.id}>{patient.full_name || patient.username}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Items</label>
                            {items.map((item, index) => (
                                <div key={index} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) 1fr 1fr minmax(0, 1.5fr) auto', gap: '0.5rem', alignItems: 'start' }}>
                                    <select
                                        value={item.medicine}
                                        onChange={(e) => updateItem(index, 'medicine', e.target.value)}
                                        style={{ padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">Medicine...</option>
                                        {medicines.map((medicine) => (
                                            <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.strength ? ` (${medicine.strength})` : ''}</option>
                                        ))}
                                    </select>
                                    <input
                                        placeholder="Dosage"
                                        value={item.dosage}
                                        onChange={(e) => updateItem(index, 'dosage', e.target.value)}
                                        style={{ padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    />
                                    <input
                                        placeholder="Duration"
                                        value={item.duration}
                                        onChange={(e) => updateItem(index, 'duration', e.target.value)}
                                        style={{ padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    />
                                    <input
                                        placeholder="Instructions"
                                        value={item.instructions}
                                        onChange={(e) => updateItem(index, 'instructions', e.target.value)}
                                        style={{ padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={items.length === 1}
                                        style={{ padding: '0.55rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: items.length === 1 ? 'not-allowed' : 'pointer', color: 'var(--danger)' }}
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addItem}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'start', padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                            >
                                <Plus size={16} /> Add item
                            </button>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.9rem' }}>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', resize: 'vertical' }}
                            />
                        </div>

                        {warnings && warnings.length > 0 && (
                            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)', background: 'var(--primary-light)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: '0.35rem' }}>Review before creating:</div>
                                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                                </ul>
                            </div>
                        )}

                        {formError && <p style={{ color: 'var(--danger)', margin: 0 }}>{formError}</p>}
                        {formSuccess && <p style={{ color: 'var(--success)', margin: 0 }}>{formSuccess}</p>}

                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Working...' : warnings && warnings.length > 0 ? 'Create Anyway' : 'Create Prescription'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader title="My Prescriptions" />
                <CardContent>
                    {loadingPrescriptions ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : prescriptions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <ClipboardText size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No prescriptions written yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {prescriptions.map((prescription) => (
                                <div key={prescription.id} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {prescription.citizen_full_name || prescription.citizen_username} &bull; {new Date(prescription.prescription_date).toLocaleDateString()}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <Badge variant={prescription.status === 'active' ? 'success' : 'neutral'}>{prescription.status}</Badge>
                                            {prescription.status === 'active' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(prescription.id, 'completed')}
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
                                                    >
                                                        Mark Completed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateStatus(prescription.id, 'cancelled')}
                                                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {prescription.items.map((item) => (
                                        <div key={item.id} style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {item.medicine_name} — {item.dosage}, {item.duration}
                                        </div>
                                    ))}
                                    {prescription.notes && (
                                        <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>{prescription.notes}</div>
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
