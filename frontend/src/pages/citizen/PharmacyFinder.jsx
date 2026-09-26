import React, { useState, useEffect } from 'react';
import { MapTrifold, MapPin, Pill, Star, ShieldCheck, WarningCircle, MagnifyingGlass, Funnel, Phone, NavigationArrow, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import MapComponent from '../../components/MapComponent';
import { DISTRICT_COORDINATES, findDistrict } from '../../constants/districts';

// The trust_score column is a 0-1 ratio. Anything above 1 is a leftover from when
// a 0-100 figure was written into it and saturated at the column maximum, so it is
// reported as unknown rather than dressed up as a percentage.
const toTrustPercent = (raw) => {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 1) return null;
    return Math.round(value * 100);
};

const STOCKED_COLOUR = '#16a34a'; // has medicine on the shelf
const EMPTY_COLOUR = '#f59e0b';   // registered, but nothing in stock

const PharmacyFinder = () => {
    const [selectedPharmacy, setSelectedPharmacy] = useState(null);
    const [pharmacies, setPharmacies] = useState([]);
    const [query, setQuery] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(false);

    useEffect(() => {
        const fetchPharmacies = async () => {
            try {
                const response = await api.get('core/pharmacies/');
                const mappedPharmacies = response.data.map(pharm => ({
                    // The endpoint serialises these as user_id / pharmacy_name / contact_phone.
                    // Reading id / name / contact_number left every row without an identifier,
                    // a name or a phone number.
                    id: pharm.user_id,
                    name: pharm.pharmacy_name,
                    // trust_score is stored as a 0-1 ratio. A few legacy rows hold a
                    // saturated value from when a 0-100 figure was written straight in
                    // (the column caps at 9.99); those are not a real rating, so they
                    // show as unrated instead of an invented 999%.
                    trustScore: toTrustPercent(pharm.trust_score),
                    // Opening hours and distance-from-you were shown as a fixed "Open now"
                    // and "1.2 km" for every pharmacy. Neither has a data source - there are
                    // no opening hours on record and the browser's location is never asked
                    // for - so they are left out rather than invented.
                    address: pharm.address,
                    phone: pharm.contact_phone,
                    medicinesAvailable: pharm.medicines_available ?? 0,
                    verified: toTrustPercent(pharm.trust_score) >= 80
                }));
                setPharmacies(mappedPharmacies);
            } catch (error) {
                console.error("Failed to fetch pharmacies:", error);
            }
        };
        fetchPharmacies();
    }, []);

    // score arrives as a 0-100 percentage, or null when the stored value is unusable
    const getTrustColor = (score) => {
        if (score === null) return 'var(--text-muted)';
        if (score >= 90) return 'var(--success)';
        if (score >= 70) return '#F39C12';
        return 'var(--danger)';
    };

    const showTrust = (score) => (score === null ? '—' : `${score}%`);

    // The search box and the filter chip used to be decoration - an input with no
    // handler and two static pills. They filter the list and the map for real now.
    // No opening hours are recorded anywhere, so no "open now" filter is offered.
    const visiblePharmacies = pharmacies.filter((pharm) => {
        if (verifiedOnly && !pharm.verified) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return `${pharm.name || ''} ${pharm.address || ''}`.toLowerCase().includes(q);
    });

    // Only pharmacies whose address names a district can be drawn. The rest are counted
    // and reported under the map rather than dropped onto an invented coordinate.
    const mapPoints = visiblePharmacies.reduce((points, pharm) => {
        const district = findDistrict(pharm.address);
        if (!district) return points;
        const [lat, lng] = DISTRICT_COORDINATES[district];
        const inStock = pharm.medicinesAvailable > 0;
        points.push({
            id: pharm.id,
            district: pharm.address || district,
            lat,
            lng,
            // Green where the shelves actually hold something, amber where the pharmacy is
            // registered but empty - every pin looking alike sent people to empty shops.
            color: inStock ? STOCKED_COLOUR : EMPTY_COLOUR,
            details: [
                ['Pharmacy', pharm.name],
                ['Medicines in stock', inStock ? pharm.medicinesAvailable : 'None right now'],
                ['Trust score', pharm.trustScore === null ? 'Unrated' : `${pharm.trustScore}%`],
            ],
        });
        return points;
    }, []);
    const unplaceableCount = visiblePharmacies.length - mapPoints.length;

    return (
        <div style={{ position: 'relative', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', overflow: 'hidden' }}>
            
            {/* Search & filter bar. This used to float over the map on z-index 10, which
                worked while the map was a flat image; Leaflet's own panes sit on 200-800
                and buried the controls, so the bar takes its own row above the map. */}
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-page)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <MagnifyingGlass size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by pharmacy name or area..."
                            style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.5rem', borderRadius: '2rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--bg-card)', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {/* An "Open Now" chip sat here too, but no opening hours are recorded
                        for any pharmacy, so there was nothing for it to filter on. */}
                    <button
                        type="button"
                        onClick={() => setVerifiedOnly((on) => !on)}
                        style={{ background: verifiedOnly ? 'var(--primary)' : 'var(--bg-card)', border: verifiedOnly ? 'none' : '1px solid var(--border)', color: verifiedOnly ? 'white' : 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                        <Funnel size={14} weight="fill" /> DGDA verified only
                    </button>
                    {/* Map key. It sits in the control row rather than over the map, where it
                        would land on top of the search box. */}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.9rem', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '0.5rem 0.9rem', borderRadius: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: STOCKED_COLOUR }} /> Has medicine
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: EMPTY_COLOUR }} /> Out of stock
                        </span>
                    </span>
                </div>
            </div>

            {/* Map. This was a stock photograph of a map with pins laid out by list
                position, so a pharmacy's pin said nothing about where it actually is.
                It now draws the pharmacies whose address names a district. */}
            <div style={{ position: 'relative', height: '400px', flexShrink: 0 }}>
                <MapComponent points={mapPoints} />
                {unplaceableCount > 0 && (
                    <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', zIndex: 900, background: 'var(--bg-card)', borderRadius: '0.75rem', padding: '0.6rem 0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {unplaceableCount} of {visiblePharmacies.length} pharmacies are not shown — no district in their address.
                    </div>
                )}
            </div>

            {/* Bottom Sheet List */}
            {/* The list takes whatever is left below the map and scrolls on its own. It used
                to be capped at half the height while the map grew into it, and Leaflet's panes
                then drew over the first few cards. */}
            <div style={{ background: 'var(--bg-card)', borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', padding: '1.5rem', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 1.5rem auto' }} />
                
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Nearby Pharmacies
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{visiblePharmacies.length} found</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visiblePharmacies.map(pharm => (
                        <div key={pharm.id} onClick={() => setSelectedPharmacy(pharm)} style={{ display: 'flex', gap: '1rem', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', cursor: 'pointer' }}>
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
                                        <Star size={14} weight="fill" /> {showTrust(pharm.trustScore)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <MapPin size={14} /> {pharm.address || 'No address on record'}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: pharm.medicinesAvailable > 0 ? STOCKED_COLOUR : EMPTY_COLOUR, fontWeight: 600 }}>
                                        <Pill size={14} weight="fill" />
                                        {pharm.medicinesAvailable > 0
                                            ? `${pharm.medicinesAvailable} medicine${pharm.medicinesAvailable === 1 ? '' : 's'} in stock`
                                            : 'Out of stock'}
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
                        // Above Leaflet, whose own panes run to 800 - on 30 the map drew over
                        // the middle of this panel and left only its header and buttons showing.
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-page)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ position: 'relative', height: '200px', background: 'var(--primary)' }}>
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

                            {/* An "Authentic Medicines 98% / Fair Pricing 95%" breakdown sat here,
                                written into the markup - every pharmacy showed the same two
                                figures. Nothing records either measure, so what is on record
                                is shown instead: the trust score and what is on the shelves. */}
                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--primary)' }}>Trust &amp; Availability</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '3rem', fontWeight: 800, color: getTrustColor(selectedPharmacy.trustScore), lineHeight: 1 }}>
                                            {showTrust(selectedPharmacy.trustScore)}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>DGDA trust score</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: selectedPharmacy.medicinesAvailable > 0 ? STOCKED_COLOUR : EMPTY_COLOUR }}>
                                            {selectedPharmacy.medicinesAvailable}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                            {selectedPharmacy.medicinesAvailable === 1 ? 'medicine in stock' : 'medicines in stock'}
                                        </div>
                                    </div>
                                </div>
                                {!selectedPharmacy.verified && (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#F39C12', fontSize: '0.85rem', background: 'rgba(243, 156, 18, 0.1)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                                        <WarningCircle size={20} weight="fill" /> This pharmacy is not officially DGDA verified yet.
                                    </div>
                                )}
                            </div>

                            {/* Both of these were buttons with no handler. They do what they say
                                now, and are disabled outright when the pharmacy has no phone or
                                no address on record rather than looking clickable and doing nothing. */}
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn-primary"
                                    disabled={!selectedPharmacy.phone}
                                    onClick={() => { window.location.href = `tel:${selectedPharmacy.phone}`; }}
                                    style={{ flex: 1, background: 'var(--bg-card)', color: 'var(--primary)', border: '1px solid var(--border)', cursor: selectedPharmacy.phone ? 'pointer' : 'not-allowed', opacity: selectedPharmacy.phone ? 1 : 0.5 }}
                                >
                                    <Phone size={20} weight="fill" /> {selectedPharmacy.phone ? `Call ${selectedPharmacy.phone}` : 'No phone on record'}
                                </button>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn-primary"
                                    disabled={!selectedPharmacy.address}
                                    onClick={() => window.open(`https://www.openstreetmap.org/search?query=${encodeURIComponent(selectedPharmacy.address)}`, '_blank', 'noopener,noreferrer')}
                                    style={{ flex: 1, cursor: selectedPharmacy.address ? 'pointer' : 'not-allowed', opacity: selectedPharmacy.address ? 1 : 0.5 }}
                                >
                                    <NavigationArrow size={20} weight="fill" /> {selectedPharmacy.address ? 'Directions' : 'No address on record'}
                                </button>
                            </div>
                            {selectedPharmacy.address && (
                                <p style={{ margin: '0 0 2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    Directions open OpenStreetMap and search for this address. Only the address is
                                    on record, not an exact map location, so it points to the area rather than the door.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PharmacyFinder;
