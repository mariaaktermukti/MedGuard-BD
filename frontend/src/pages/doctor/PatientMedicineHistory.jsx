import React, { useEffect, useState } from 'react';
import { User, Pill, Receipt } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const PatientMedicineHistory = () => {
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(true);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [history, setHistory] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const response = await api.get('doctor/patients/');
                setPatients(response.data);
            } catch (err) {
                console.error('Failed to fetch patients:', err);
            } finally {
                setLoadingPatients(false);
            }
        };
        fetchPatients();
    }, []);

    const handleSelectPatient = async (patientId) => {
        setSelectedPatientId(patientId);
        setLoadingHistory(true);
        setError('');
        try {
            const response = await api.get(`doctor/patients/${patientId}/medicine-history/`);
            setHistory(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || "Could not load this patient's history.");
            setHistory(null);
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
            <Card>
                <CardHeader title="My Patients" subtitle="Only patients with an existing consultation or prescription." />
                <CardContent>
                    {loadingPatients ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : patients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <User size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No patients yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {patients.map((patient) => (
                                <button
                                    key={patient.id}
                                    type="button"
                                    onClick={() => handleSelectPatient(patient.id)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '0.75rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: selectedPatientId === patient.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                                        background: selectedPatientId === patient.id ? 'var(--primary-light)' : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ fontWeight: 700 }}>{patient.full_name || patient.username}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{patient.phone || 'No phone on file'}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {!selectedPatientId ? (
                    <Card>
                        <CardContent>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Select a patient to view their medicine history.</p>
                        </CardContent>
                    </Card>
                ) : loadingHistory ? (
                    <Card><CardContent><p style={{ color: 'var(--text-muted)' }}>Loading history...</p></CardContent></Card>
                ) : error ? (
                    <Card><CardContent><p style={{ color: 'var(--danger)' }}>{error}</p></CardContent></Card>
                ) : history ? (
                    <>
                        <Card>
                            <CardHeader title={history.patient.full_name || history.patient.username} subtitle={history.patient.phone} />
                        </Card>

                        <Card>
                            <CardHeader title="Dosage Schedules" />
                            <CardContent>
                                {history.dosage_schedules.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No dosage schedules recorded.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.6rem' }}>
                                        {history.dosage_schedules.map((item) => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Pill size={16} color="var(--primary)" />
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>{item.medicine_name}</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.dosage} &bull; {item.frequency}</div>
                                                    </div>
                                                </div>
                                                <Badge variant={item.is_active ? 'success' : 'neutral'}>{item.is_active ? 'Active' : 'Inactive'}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader title="Prescription History" subtitle="From all doctors, for continuity of care." />
                            <CardContent>
                                {history.prescriptions.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No prescriptions recorded.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {history.prescriptions.map((prescription) => (
                                            <div key={prescription.id} style={{ padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    <div style={{ fontWeight: 700 }}>
                                                        Dr. {prescription.doctor_username} &bull; {new Date(prescription.prescription_date).toLocaleDateString()}
                                                    </div>
                                                    <Badge variant={prescription.status === 'active' ? 'success' : 'neutral'}>{prescription.status}</Badge>
                                                </div>
                                                {prescription.items.map((item) => (
                                                    <div key={item.id} style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                        {item.medicine_name} — {item.dosage}, {item.duration}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader title="Purchase History" />
                            <CardContent>
                                {history.sales.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)' }}>No purchases recorded.</p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {history.sales.map((sale) => (
                                            <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Receipt size={16} color="var(--primary)" />
                                                    <span>{sale.medicine_name} (Batch {sale.batch_number})</span>
                                                </div>
                                                <span style={{ fontWeight: 700 }}>{sale.quantity} units</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default PatientMedicineHistory;
