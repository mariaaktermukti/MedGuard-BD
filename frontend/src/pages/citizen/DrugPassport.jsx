import React, { useState } from 'react';
import { QrCode, Camera, Lightning, Image as ImageIcon, WarningCircle, CheckCircle, ShieldCheck, Factory, Pill, Thermometer, MapPinLine, ArrowLeft, Warning, Plus } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const DrugPassport = () => {
    const [scanned, setScanned] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [batchData, setBatchData] = useState(null);

    const handleSimulateScan = async () => {
        setIsScanning(true);
        try {
            // Attempt to fetch a real batch if one exists, otherwise mock
            const response = await api.get('core/passport/DEMO-QR/');
            setBatchData(response.data);
        } catch (error) {
            console.log("No real QR found, using mock data for demo");
            setBatchData({
                medicine: { name: 'Napa Extra', formulation: 'Paracetamol 500mg + Caffeine 65mg' },
                status: 'active',
                batch_number: 'BX-2023-99',
                manufacturing_date: '2023-10-15',
                expiry_date: '2025-10-15'
            });
        } finally {
            setTimeout(() => {
                setScanned(true);
                setIsScanning(false);
            }, 1000);
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
            {/* Camera Viewfinder UI Mock */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ position: 'absolute', top: '1.5rem', left: '0', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 1.5rem', zIndex: 10 }}>
                    <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer' }}><Lightning size={24} /></button>
                    <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer' }}><ImageIcon size={24} /></button>
                </div>
                
                {/* Viewfinder brackets */}
                <div style={{ width: '250px', height: '250px', position: 'relative' }}>
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
                </div>
            </div>

            <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', textAlign: 'center', color: 'white' }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Scan Medicine QR</h3>
                <p style={{ margin: '0 0 1.5rem 0', opacity: 0.8, fontSize: '0.9rem' }}>Align the QR code on the packaging within the frame</p>
                <button 
                    onClick={handleSimulateScan}
                    className="ui-btn ui-btn-primary" 
                    style={{ background: 'var(--success)', color: 'white' }}
                >
                    <Camera size={20} weight="fill" /> Simulate Scan
                </button>
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
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)' }} />
                            <strong>Lazz Pharma</strong><br/><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>2 days ago • Pharmacy</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-1.45rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--border)' }} />
                            <strong>Beximco Pharma</strong><br/><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Oct 15, 2023 • Manufacturer</span>
                        </div>
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
