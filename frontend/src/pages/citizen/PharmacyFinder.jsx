import React, { useState, useEffect } from 'react';
import { MapTrifold, MapPin, Star, ShieldCheck, WarningCircle, Clock, MagnifyingGlass, Funnel, Phone, NavigationArrow, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const PharmacyFinder = () => {
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [pharmacies, setPharmacies] = useState([]);

    useEffect(() => {
        const fetchPharmacies = async () => {
            try {
                const response = await api.get('core/pharmacies/');
                const mappedPharmacies = response.data.map(pharm => ({
                    id: pharm.id,
                    name: pharm.name,
                    trustScore: pharm.trust_score,
                    status: 'open', // Mock status
                    distance: '1.2 km', // Mock distance
                    address: pharm.address,
                    phone: pharm.contact_number,
                    verified: pharm.trust_score > 4.0
                }));
                setPharmacies(mappedPharmacies);
            } catch (error) {
                console.error("Failed to fetch pharmacies:", error);
            }
        };
        fetchPharmacies();
    }, []);

    const getTrustColor = (score) => {
        if (score >= 4.5) return 'var(--success)';
        if (score >= 3.5) return '#F39C12';
        return 'var(--danger)';
    };

    return (
        <div style={{ position: 'relative', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', overflow: 'hidden' }}>
            
            {/* Top Search & Filter Bar */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '1rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(to bottom, rgba(248,249,250,1) 50%, rgba(248,249,250,0))' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <MagnifyingGlass size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search specific medicine..." style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.5rem', borderRadius: '2rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--bg-card)', fontSize: '0.9rem' }} />
                    </div>
                    <button style={{ background: 'var(--bg-card)', border: 'none', padding: '0.875rem', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--trust-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Funnel size={20} weight="fill" />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    <span style={{ background: 'var(--trust-blue)', color: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Trust Score ৪+</span>
                    <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-light)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Open Now</span>
                </div>
            </div>

            {/* Map Area Mock */}
            <div style={{ flex: 1, background: '#e5e3df', position: 'relative' }}>
                <img src="https://assets.digitalocean.com/articles/alligator/css/responsive-google-maps/map.png" alt="Map" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                
                {/* Map Pins */}
                {pharmacies.map((pharm, i) => (
                    <div key={i} onClick={() => setSelectedPharmacy(pharm)} style={{ position: 'absolute', top: `${30 + i * 15}%`, left: `${40 + i * 20}%`, transform: 'translate(-50%, -50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ background: 'white', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {pharm.trustScore} <Star weight="fill" color={getTrustColor(pharm.trustScore)} style={{ display: 'inline' }} />
                        </div>
                        <MapPin size={32} weight="fill" color={getTrustColor(pharm.trustScore)} style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,0.3))' }} />
                    </div>
                ))}
            </div>

            {/* Bottom Sheet List */}
            <div style={{ background: 'var(--bg-card)', borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 20, maxHeight: '50%', overflowY: 'auto' }}>
                <div style={{ width: '40px', height: '4px', background: 'var(--border-color)', borderRadius: '2px', margin: '0 auto 1.5rem auto' }} />
                
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Nearby Pharmacies
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{pharmacies.length} found</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pharmacies.map(pharm => (
                        <div key={pharm.id} onClick={() => setSelectedPharmacy(pharm)} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                            <div style={{ background: 'rgba(27, 79, 114, 0.05)', padding: '0.75rem', borderRadius: '0.75rem', color: getTrustColor(pharm.trustScore), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={28} weight="fill" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {pharm.name}
                                        {pharm.verified && <ShieldCheck size={16} color="var(--success)" weight="fill" />}
                                    </h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(243, 156, 18, 0.1)', color: '#F39C12', padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>
                                        <Star size={14} weight="fill" /> {pharm.trustScore}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><NavigationArrow size={14} /> {pharm.distance}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: pharm.status === 'open' ? 'var(--success)' : 'var(--danger)' }}>
                                        <Clock size={14} /> {pharm.status === 'open' ? 'Open Now' : 'Closed'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pharmacy Detail Overlay */}
            <AnimatePresence>
                {selectedPharmacy && (
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-dark)', zIndex: 30, display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ position: 'relative', height: '200px', background: 'var(--trust-blue)' }}>
                            <button onClick={() => setSelectedPharmacy(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}>
                                <X size={24} weight="bold" />
                            </button>
                            <div style={{ position: 'absolute', bottom: '-40px', left: '1.5rem', background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <MapPin size={48} weight="fill" color={getTrustColor(selectedPharmacy.trustScore)} />
                            </div>
                        </div>

                        <div style={{ padding: '3.5rem 1.5rem 1.5rem 1.5rem', flex: 1, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {selectedPharmacy.name}
                                        {selectedPharmacy.verified && <ShieldCheck size={24} color="var(--success)" weight="fill" />}
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{selectedPharmacy.address}</p>
                                </div>
                            </div>

                            {/* Trust Score Breakdown */}
                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--trust-blue)' }}>Trust Score Breakdown</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 800, color: getTrustColor(selectedPharmacy.trustScore), lineHeight: 1 }}>
                                        {selectedPharmacy.trustScore}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}><span>Authentic Medicines</span><span>98%</span></div>
                                        <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px' }}><div style={{ width: '98%', height: '100%', background: 'var(--success)', borderRadius: '3px' }} /></div>
                                        
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem', marginTop: '0.75rem' }}><span>Fair Pricing</span><span>95%</span></div>
                                        <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '3px' }}><div style={{ width: '95%', height: '100%', background: 'var(--success)', borderRadius: '3px' }} /></div>
                                    </div>
                                </div>
                                {!selectedPharmacy.verified && (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#F39C12', fontSize: '0.85rem', background: 'rgba(243, 156, 18, 0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                                        <WarningCircle size={20} weight="fill" /> This pharmacy is not officially DGDA verified yet.
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                                <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--trust-blue)', border: '1px solid var(--border-color)' }}>
                                    <Phone size={20} weight="fill" /> Call
                                </button>
                                <button className="btn-primary" style={{ flex: 1 }}>
                                    <NavigationArrow size={20} weight="fill" /> Directions
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PharmacyFinder;
