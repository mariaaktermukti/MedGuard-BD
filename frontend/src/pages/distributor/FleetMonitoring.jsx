import React, { useEffect, useState } from 'react';
import { Truck, Info, MapPin } from '@phosphor-icons/react';
import api from '../../services/api';

const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.9rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--border)',
    background: 'var(--bg-input)',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
};

const timeAgo = (isoTimestamp) => {
    if (!isoTimestamp) return 'never';
    const diffMs = Date.now() - new Date(isoTimestamp).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const FleetMonitoring = () => {
    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [drafts, setDrafts] = useState({});
    const [updatingId, setUpdatingId] = useState(null);

    const fetchShipments = async () => {
        try {
            const response = await api.get('core/distributor/fleet-monitoring/');
            setShipments(response.data);
        } catch (error) {
            console.error('Failed to fetch fleet monitoring data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    const handleUpdateLocation = async (shipment) => {
        const location = (drafts[shipment.id] || '').trim();
        if (!location) return;

        setUpdatingId(shipment.id);
        try {
            await api.post(`core/distributor/fleet-monitoring/${shipment.id}/update-location/`, { geo_location: location });
            setMessage(`Location updated for batch ${shipment.batch_details.batch_number}.`);
            setDrafts((current) => ({ ...current, [shipment.id]: '' }));
            fetchShipments();
        } catch (error) {
            setMessage(error.response?.data?.detail || 'Could not update location.');
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
            <div>
                <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--primary)' }}>Fleet Monitoring</h1>
                <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0' }}>Last known location for shipments currently in transit.</p>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--warning)' }}>
                <Info size={20} color="var(--warning)" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Manual location check-in, not real GPS/live vehicle tracking - there's no fleet/vehicle data source in this system.
                </p>
            </div>

            {message && <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--primary)' }}>{message}</div>}

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {loading ? (
                    <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                ) : shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                        <Truck size={48} weight="duotone" style={{ marginBottom: '0.75rem' }} />
                        <p>No shipments in transit right now.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {shipments.map((shipment) => (
                            <div key={shipment.id} style={{ padding: '1.25rem', borderRadius: '0.85rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{shipment.batch_details.medicine} &bull; Batch {shipment.batch_details.batch_number}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>To {shipment.to_details.username}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                                        <MapPin size={16} /> {shipment.geo_location || 'No location reported yet'}
                                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>&bull; {timeAgo(shipment.geo_timestamp)}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                    <input
                                        value={drafts[shipment.id] || ''}
                                        onChange={(e) => setDrafts((current) => ({ ...current, [shipment.id]: e.target.value }))}
                                        placeholder="e.g. Passed Tejgaon checkpoint"
                                        style={inputStyle}
                                    />
                                    <button
                                        type="button"
                                        className="ui-btn ui-btn-primary"
                                        style={{ width: 'auto', padding: '0.6rem 1.1rem' }}
                                        disabled={updatingId === shipment.id || !(drafts[shipment.id] || '').trim()}
                                        onClick={() => handleUpdateLocation(shipment)}
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FleetMonitoring;
