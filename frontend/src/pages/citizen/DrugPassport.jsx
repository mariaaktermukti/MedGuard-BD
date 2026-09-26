import React, { useState } from 'react';
import { QrCode, WarningCircle, CheckCircle, ShieldCheck, Factory, Pill, Thermometer, MapPinLine, ArrowLeft, Warning, Plus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import QRScanner from '../../components/QRScanner';

// A distribution event carries a full timestamp, so let Date parse it and
// show the day in the reader's own timezone.
const eventDay = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? null
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const titleCase = (value) => (value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const DrugPassport = () => {
    const [scanned, setScanned] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [batchData, setBatchData] = useState(null);
    const [scanError, setScanError] = useState('');
    const [manualCode, setManualCode] = useState('');

    const handleSimulateScan = async (qrCode) => {
        setIsScanning(true);
        setScanError('');
        try {
            const response = await api.get(`core/passport/${encodeURIComponent(qrCode.trim())}/`);
            setBatchData(response.data);
            setTimeout(() => {
                setScanned(true);
                setIsScanning(false);
            }, 1000);
        } catch (error) {
            // Never fall back to mock data: an unregistered code must not render as authentic
            setIsScanning(false);
            // A 404 keeps its own wording: an unregistered code is a counterfeit
            // warning, not a lookup failure, and that must not be softened into
            // whatever the server happened to say. Anything else defers to the
            // server, which can explain more than a status code can.
            setScanError(error.response?.status === 404
                ? 'This QR code is not registered with MedGuard. Do not use this medicine; it may be counterfeit.'
                : (error.response?.data?.detail || 'Could not verify this QR code right now. Please try again.'));
        }
    };

    const ScannerView = () => (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ 
                height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', 
                background: '#000', borderRadius: '1.5rem', overflow: 'hidden', position: 'relative'
            }}
        >
            {/* Camera viewfinder */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {!isScanning && (
                    <div style={{ width: '100%', maxWidth: '420px', padding: '0 1.5rem' }}>
                        <QRScanner onScan={handleSimulateScan} />
                    </div>
                )}
                
                {/* Viewfinder brackets */}
                {isScanning && <div style={{ width: '250px', height: '250px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '4px solid var(--success)', borderLeft: '4px solid var(--success)', borderTopLeftRadius: '1rem' }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '4px solid var(--success)', borderRight: '4px solid var(--success)', borderTopRightRadius: '1rem' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--success)', borderLeft: '4px solid var(--success)', borderBottomLeftRadius: '1rem' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '4px solid var(--success)', borderRight: '4px solid var(--success)', borderBottomRightRadius: '1rem' }} />
                    
                    {/* Scanning animation line */}
                    {isScanning && (
                        <motion.div 
                            initial={{ top: 0 }} animate={{ top: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            style={{ position: 'absolute', left: '10%', width: '80%', height: '2px', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}
                        />
                    )}
                </div>}
            </div>

            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', textAlign: 'center', color: 'white' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Scan Medicine QR</h3>
                <p style={{ margin: '0 0 1.25rem 0', opacity: 0.8, fontSize: '0.9rem' }}>Align the QR code on the packaging within the frame</p>

                {/* Without this there is no way to verify a medicine when the camera is
                    blocked or broken, or when the code is only printed as text. */}
                <form
                    onSubmit={(event) => { event.preventDefault(); if (manualCode.trim()) handleSimulateScan(manualCode); }}
                    style={{ display: 'flex', gap: '0.6rem', maxWidth: '460px', margin: '0 auto 1rem', flexWrap: 'wrap' }}
                >
                    <label htmlFor="manual-qr" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                        Batch QR code
                    </label>
                    <input
                        id="manual-qr"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Or type the code printed on the pack"
                        style={{
                            flex: '1 1 220px', minWidth: 0, padding: '0.7rem 0.9rem', borderRadius: '0.6rem',
                            border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.35)',
                            color: 'white', fontSize: '0.95rem', outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!manualCode.trim() || isScanning}
                        style={{
                            padding: '0.7rem 1.4rem', borderRadius: '0.6rem', border: 'none', fontWeight: 700,
                            background: manualCode.trim() ? 'var(--success)' : 'rgba(255,255,255,0.2)',
                            color: 'white', cursor: manualCode.trim() ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {isScanning ? 'Checking…' : 'Verify'}
                    </button>
                </form>

                {scanError && <p role="alert" style={{ margin: 0, color: '#fecaca', fontWeight: 600 }}>{scanError}</p>}
            </div>
        </motion.div>
    );

    const PassportView = () => (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ paddingBottom: '5rem' }}
        >
            <button onClick={() => setScanned(false)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontWeight: 600 }}>
                <ArrowLeft size={20} weight="bold" /> Scan Another
            </button>

            {/* Header */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem', background: 'var(--primary)', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.5rem', color: 'white' }}>{batchData?.medicine?.name}</h2>
                        <p style={{ margin: 0, opacity: 0.9 }}>{batchData?.medicine?.formulation}</p>
                        <p style={{ margin: '0.25rem 0 0 0', fontWeight: 600, fontSize: '0.85rem' }}>Beximco Pharmaceuticals Ltd.</p>
                    </div>
                    <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
                        <QrCode size={40} color="var(--primary)" />
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            {batchData?.status === 'active' ? (
                <div style={{ background: 'rgba(39, 174, 96, 0.1)', border: '1px solid var(--success)', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--success)', marginBottom: '1.5rem' }}>
                    <CheckCircle size={32} weight="fill" />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Verified Authentic</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Safe to consume</p>
                    </div>
                </div>
            ) : (
                <div style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid var(--danger)', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--danger)', marginBottom: '1.5rem' }}>
                    <WarningCircle size={32} weight="fill" />
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recalled / Alert</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Do not consume this medicine</p>
                    </div>
                </div>
            )}

            {/* Info Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* General Info */}
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
                        <Pill size={24} weight="duotone" /> General Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Batch No:</span><br/><strong>{batchData?.batch_number}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Mfg Date:</span><br/><strong>{batchData?.manufacturing_date}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Exp Date:</span><br/><strong>{batchData?.expiry_date}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Price:</span><br/><strong>৳ 25.00</strong></div>
                    </div>
                </div>

                {/* Quality */}
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
                        <Thermometer size={24} weight="duotone" /> Quality & Storage
                    </h3>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Storage Condition: Keep in a cool, dry place below 30°C.</p>
                    <a href="#" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <ShieldCheck size={18} /> View QC Certificate
                    </a>
                </div>

                {/* Verification History */}
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>
                        <MapPinLine size={24} weight="duotone" /> Traceability
                    </h3>
                    <div style={{ borderLeft: '2px solid var(--border)', marginLeft: '0.5rem', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }} />
                            <strong>Scanned by you</strong><br/><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Just now • Dhaka</span>
                        </div>
                        {/* These were three fixed rows - "Lazz Pharma, 2 days ago" and
                            "Beximco Pharma, Oct 15, 2023" - shown for every medicine
                            scanned, whoever actually handled it. The Oct 2023 line
                            appeared above a batch manufactured in 2026. The passport
                            already carries this batch's real movements. */}
                        {[...(batchData.distribution_events || [])]
                            .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
                            .map((event) => (
                                <div key={event.id} style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)' }} />
                                    <strong>{titleCase(event.stage_from)} → {titleCase(event.stage_to)}</strong><br/>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {eventDay(event.event_date) || 'Date not recorded'}
                                        {event.geo_location ? ` • ${event.geo_location}` : ''}
                                    </span>
                                </div>
                            ))}
                        {(batchData.distribution_events || []).length === 0 && (
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)' }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No earlier movements recorded for this batch.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100 }}>
                <button title="Report Issue" style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '1rem', borderRadius: '50%', boxShadow: '0 4px 12px rgba(231,76,60,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Warning size={28} weight="fill" />
                </button>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <button className="ui-btn ui-btn-primary" style={{ maxWidth: '400px' }}>
                    <Plus size={20} weight="bold" /> Add to My Medicines
                </button>
            </div>
        </motion.div>
    );

    return (
        <div style={{ position: 'relative' }}>
            <AnimatePresence mode="wait">
                {!scanned ? <ScannerView key="scanner" /> : <PassportView key="passport" />}
            </AnimatePresence>
        </div>
    );
};

export default DrugPassport;
