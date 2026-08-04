import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Search, Star, Phone, Map } from 'lucide-react';

const PharmacyFinder = () => {
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPharmacies = async () => {
            try {
                const res = await axios.get('http://localhost:8000/api/core/pharmacies/', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('access')}` }
                });
                setPharmacies(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPharmacies();
    }, []);

    const filteredPharmacies = pharmacies.filter(p => 
        p.pharmacy_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin className="text-primary" size={32} />
                Find Trusted Pharmacies
            </h1>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name or area..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ paddingLeft: '3rem', width: '100%' }}
                    />
                </div>
                <button className="btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)' }}>
                    <Map size={18} /> Show on Map
                </button>
            </div>

            {loading ? (
                <p>Loading pharmacies...</p>
            ) : filteredPharmacies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No pharmacies found matching your search.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredPharmacies.map(pharmacy => (
                        <div key={pharmacy.user} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pharmacy.pharmacy_name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                                    <Star size={14} fill="currentColor" />
                                    {pharmacy.trust_score}
                                </div>
                            </div>
                            
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem', flex: 1 }}>
                                <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <MapPin size={16} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                                    {pharmacy.address || 'Address not provided'}
                                </p>
                                <p style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <Phone size={16} />
                                    {pharmacy.contact_phone || 'Phone not provided'}
                                </p>
                            </div>
                            
                            <button className="btn btn-primary" style={{ width: '100%' }}>
                                Get Directions
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PharmacyFinder;
