import React, { useEffect, useState } from 'react';
import { Star, Pill } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const MedicineLibrary = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMedicines = async () => {
            try {
                const response = await api.get('doctor/frequent-medicines/');
                setMedicines(response.data);
            } catch (err) {
                console.error('Failed to fetch frequent medicines:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMedicines();
    }, []);

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="My Medicine Library" subtitle="Medicines you prescribe most often, based on your own prescription history." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : medicines.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Pill size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No prescriptions written yet — this will fill in as you prescribe.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {medicines.map((medicine, index) => (
                                <div key={medicine.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {index < 3 && <Star size={18} weight="fill" color="var(--warning)" />}
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{medicine.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                {medicine.generic_name || 'No generic name on file'}
                                                {medicine.strength ? ` • ${medicine.strength}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="primary">{medicine.times_prescribed}x prescribed</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MedicineLibrary;
