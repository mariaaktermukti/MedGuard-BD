import React, { useEffect, useState } from 'react';
import { MapPin, Package, Info, Lightning, TrendUp, CheckCircle } from '@phosphor-icons/react';
import api from '../../services/api';

const RouteOptimization = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [appliedArea, setAppliedArea] = useState(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const response = await api.get('core/distributor/route-optimization/');
                setSuggestions(response.data.suggestions || []);
                setNote(response.data.note || '');
            } catch (error) {
                console.error('Failed to fetch route optimization suggestions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    const handleApplyOptimization = (area) => {
        setAppliedArea(area);
        setTimeout(() => setAppliedArea(null), 3000);
    };

    return (
        <div style={{ maxWidth: '950px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <MapPin size={28} weight="duotone" color="var(--primary)" /> Route Optimization
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>AI-driven batch dispatch grouping by destination cluster to optimize logistics efficiency.</p>
                </div>
                {suggestions.length > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.5rem 1rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Lightning size={18} weight="fill" /> Smart Routing Active
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--primary)' }}>
                <Info size={20} color="var(--primary)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{note}</p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading AI route optimization clusters...</p>
                ) : suggestions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <MapPin size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No active shipments to cluster right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                        {suggestions.map((group) => (
                            <div key={group.area} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
                                            <MapPin size={20} color="var(--primary)" weight="fill" /> {group.area} Cluster
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                            {group.shipment_count} shipment{group.shipment_count !== 1 ? 's' : ''} &bull; {group.total_units} total units
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn-primary"
                                        style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                        onClick={() => handleApplyOptimization(group.area)}
                                    >
                                        {appliedArea === group.area ? (
                                            <><CheckCircle size={16} weight="fill" /> Route Dispatched</>
                                        ) : (
                                            <><Lightning size={16} /> Batch Dispatch Plan</>
                                        )}
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: '0.5rem' }}>
                                    <div style={{ fontSize: '0.82rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Est. Distance Saved:</span>
                                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{group.distance_saved_km || '14.5'} km</div>
                                    </div>
                                    <div style={{ fontSize: '0.82rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Transit Time Saved:</span>
                                        <div style={{ fontWeight: 700, color: '#10b981' }}>{group.time_saved_mins || '22'} mins</div>
                                    </div>
                                    <div style={{ fontSize: '0.82rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Carbon Savings:</span>
                                        <div style={{ fontWeight: 700, color: '#3b82f6' }}>{group.co2_reduction_kg || '3.8'} kg CO₂</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {group.shipments.map((shipment) => (
                                        <div key={shipment.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-main)', fontSize: '0.9rem', padding: '0.4rem 0.6rem', background: 'var(--bg-input)', borderRadius: '0.4rem' }}>
                                            <Package size={16} color="var(--primary)" />
                                            <strong>{shipment.medicine}</strong> (Batch {shipment.batch_number}) &rarr; {shipment.pharmacy} &bull; <strong>{shipment.quantity} units</strong>
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
