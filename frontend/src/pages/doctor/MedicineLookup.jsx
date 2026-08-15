import React, { useEffect, useState } from 'react';
import { MagnifyingGlass, Pill } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const MedicineLookup = () => {
    const [query, setQuery] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);

    const search = async (q) => {
        setLoading(true);
        try {
            const response = await api.get('doctor/medicines/', { params: q ? { q } : {} });
            setMedicines(response.data);
        } catch (err) {
            console.error('Medicine lookup failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        search('');
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => search(query), 350);
        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
            <Card>
                <CardHeader title="Medicine Lookup" subtitle="Search by medicine name or generic name." />
                <CardContent>
                    <div style={{ position: 'relative' }}>
                        <MagnifyingGlass size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g. Napa, Paracetamol..."
                            style={{ width: '100%', padding: '0.7rem 0.9rem 0.7rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Searching...</p>
                    ) : medicines.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Pill size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No medicines found.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {medicines.map((medicine) => (
                                <div key={medicine.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{medicine.name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {medicine.generic_name || 'No generic name on file'}
                                            {medicine.strength ? ` • ${medicine.strength}` : ''}
                                            {medicine.dosage_form ? ` • ${medicine.dosage_form}` : ''}
                                        </div>
                                    </div>
                                    {medicine.category && <Badge variant="neutral">{medicine.category}</Badge>}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default MedicineLookup;
