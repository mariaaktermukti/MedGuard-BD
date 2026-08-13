import React, { useEffect, useState } from 'react';
import { MapPin, Package, Info } from '@phosphor-icons/react';
import api from '../../services/api';

const RouteOptimization = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const response = await api.get('core/distributor/route-optimization/');
                setSuggestions(response.data.suggestions);
                setNote(response.data.note);
            } catch (error) {
                console.error('Failed to fetch route optimization suggestions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>Route Optimization</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Suggested batching for pending/in-transit shipments by destination area.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                <Info size={20} color="var(--warning)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{note}</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading suggestions...</p>
                ) : suggestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <MapPin size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No pending or in-transit shipments to batch right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {suggestions.map((group) => (
                            <div key={group.area} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                                        <MapPin size={18} color="var(--primary)" /> {group.area}
                                    </div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {group.shipment_count} shipment{group.shipment_count !== 1 ? 's' : ''} &bull; {group.total_units} units
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {group.shipments.map((shipment) => (
                                        <div key={shipment.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Package size={16} />
                                            {shipment.medicine} (Batch {shipment.batch_number}) &rarr; {shipment.pharmacy} &bull; {shipment.quantity} units
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteOptimization;
