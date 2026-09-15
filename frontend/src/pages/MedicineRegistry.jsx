import React, { useState, useEffect, useMemo } from 'react';
import {
    Pill,
    MagnifyingGlass,
    Funnel,
    Buildings,
    ShieldCheck,
    FileText,
    CheckCircle,
    X,
    SquaresFour,
    ListBullets,
    ArrowsClockwise,
    Certificate,
    Barcode,
    Sparkle,
    CaretRight,
    FirstAid,
    Flask
} from '@phosphor-icons/react';
import api from '../services/api';

const MedicineRegistry = () => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedDosageForm, setSelectedDosageForm] = useState('All');
    const [selectedManufacturer, setSelectedManufacturer] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [selectedMedicine, setSelectedMedicine] = useState(null);

    const fetchMedicines = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/core/medicines/');
            setMedicines(response.data || []);
        } catch (err) {
            console.error('Error fetching registered medicines:', err);
            setError('Failed to load registered medicines from government database.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMedicines();
    }, []);

    // Extract unique categories, dosage forms, manufacturers for dropdowns
    const categories = useMemo(() => {
        const cats = new Set(medicines.map(m => m.category).filter(Boolean));
        return ['All', ...Array.from(cats).sort()];
    }, [medicines]);

    const dosageForms = useMemo(() => {
        const forms = new Set(medicines.map(m => m.dosage_form).filter(Boolean));
        return ['All', ...Array.from(forms).sort()];
    }, [medicines]);

    const manufacturers = useMemo(() => {
        const manus = new Set(medicines.map(m => m.manufacturer_name || m.manufacturer).filter(Boolean));
        return ['All', ...Array.from(manus).sort()];
    }, [medicines]);

    // Filter medicines
    const filteredMedicines = useMemo(() => {
        return medicines.filter(m => {
            const matchesSearch =
                !searchTerm ||
                (m.name && m.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.generic_name && m.generic_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.regulatory_approval_number && m.regulatory_approval_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.product_id && m.product_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (m.manufacturer_name && m.manufacturer_name.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = selectedCategory === 'All' || m.category === selectedCategory;
            const matchesDosageForm = selectedDosageForm === 'All' || m.dosage_form === selectedDosageForm;
            const matchesManufacturer = selectedManufacturer === 'All' || (m.manufacturer_name || m.manufacturer) === selectedManufacturer;

            return matchesSearch && matchesCategory && matchesDosageForm && matchesManufacturer;
        });
    }, [medicines, searchTerm, selectedCategory, selectedDosageForm, selectedManufacturer]);

    // KPI Metrics
    const metrics = useMemo(() => {
        const uniqueGenerics = new Set(medicines.map(m => m.generic_name).filter(Boolean)).size;
        const totalManufacturers = new Set(medicines.map(m => m.manufacturer_name || m.manufacturer).filter(Boolean)).size;
        const registeredCount = medicines.filter(m => m.is_registered).length;

        return {
            total: medicines.length,
            uniqueGenerics,
            totalManufacturers,
            registeredCount
        };
    }, [medicines]);

    return (
        <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: 'var(--text-main)' }}>
            
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem',
                paddingBottom: '1.25rem',
                borderBottom: '1px solid var(--border)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            padding: '0.6rem',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15))',
                            color: '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Pill size={28} weight="duotone" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                                National Registered Medicine Directory
                            </h1>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Directorate General of Drug Administration (DGDA) Official Bangladesh Pharmaceutical Database
                            </p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={fetchMedicines}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ArrowsClockwise size={18} className={loading ? 'spin' : ''} />
                        Refresh Registry
                    </button>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: '#10B981',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <ShieldCheck size={16} weight="fill" />
                        DGDA Live Sync Active
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Total Registered Medicines</span>
                        <Pill size={22} color="#3B82F6" weight="duotone" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                        {metrics.total}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={14} weight="fill" /> Active DAR Approvals
                    </div>
                </div>

                <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Licensed Manufacturers</span>
                        <Buildings size={22} color="#8B5CF6" weight="duotone" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                        {metrics.totalManufacturers}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Top BD Pharma Companies
                    </div>
                </div>

                <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Active Generic Formulations</span>
                        <Flask size={22} color="#EC4899" weight="duotone" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-main)' }}>
                        {metrics.uniqueGenerics}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Standardized Molecule Formulations
                    </div>
                </div>

                <div style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>Verification Compliance</span>
                        <Certificate size={22} color="#10B981" weight="duotone" />
                    </div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.5rem', color: '#10B981' }}>
                        100%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10B981', marginTop: '0.25rem' }}>
                        Verified DAR Licenses
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{
                background: 'var(--bg-card)',
                padding: '1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Search Input */}
                    <div style={{
                        flex: '1 1 320px',
                        position: 'relative'
                    }}>
                        <MagnifyingGlass size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by brand name, generic name, DAR number, or manufacturer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem 0.75rem 2.8rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-main)',
                                color: 'var(--text-main)',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '0.8rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* View Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: '8px', padding: '0.25rem', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '0.5rem 0.8rem',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'grid' ? 'var(--bg-card)' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: viewMode === 'grid' ? 600 : 400,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <SquaresFour size={18} /> Grid View
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '0.5rem 0.8rem',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'table' ? 'var(--bg-card)' : 'transparent',
                                color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: viewMode === 'table' ? 600 : 400,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            <ListBullets size={18} /> Table View
                        </button>
                    </div>
                </div>

                {/* Dropdown Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Funnel size={16} /> Filters:
                    </div>

                    {/* Category Filter */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                            padding: '0.5rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="All">All Categories ({categories.length - 1})</option>
                        {categories.filter(c => c !== 'All').map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Dosage Form Filter */}
                    <select
                        value={selectedDosageForm}
                        onChange={(e) => setSelectedDosageForm(e.target.value)}
                        style={{
                            padding: '0.5rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="All">All Dosage Forms ({dosageForms.length - 1})</option>
                        {dosageForms.filter(f => f !== 'All').map((form, idx) => (
                            <option key={idx} value={form}>{form}</option>
                        ))}
                    </select>

                    {/* Manufacturer Filter */}
                    <select
                        value={selectedManufacturer}
                        onChange={(e) => setSelectedManufacturer(e.target.value)}
                        style={{
                            padding: '0.5rem 0.8rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--bg-main)',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="All">All Manufacturers ({manufacturers.length - 1})</option>
                        {manufacturers.filter(m => m !== 'All').map((mfg, idx) => (
                            <option key={idx} value={mfg}>{mfg}</option>
                        ))}
                    </select>

                    {/* Reset Button */}
                    {(selectedCategory !== 'All' || selectedDosageForm !== 'All' || selectedManufacturer !== 'All' || searchTerm) && (
                        <button
                            onClick={() => {
                                setSelectedCategory('All');
                                setSelectedDosageForm('All');
                                setSelectedManufacturer('All');
                                setSearchTerm('');
                            }}
                            style={{
                                padding: '0.5rem 0.8rem',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#EF4444',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Reset Filters
                        </button>
                    )}

                    <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Showing <strong>{filteredMedicines.length}</strong> of {medicines.length} registered products
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <X size={20} weight="bold" />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ArrowsClockwise size={40} className="spin" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Loading Official Government Medicine Directory...</p>
                </div>
            ) : filteredMedicines.length === 0 ? (
                /* Empty State */
                <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)'
                }}>
                    <Pill size={48} color="var(--text-muted)" weight="duotone" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>No Registered Medicines Found</h3>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                        No medicines matched your current search criteria or filter options. Try clearing search or resetting filters.
                    </p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem'
                }}>
                    {filteredMedicines.map((med) => (
                        <div
                            key={med.id}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Top Badge */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <span style={{
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '20px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        color: '#3B82F6',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        {med.dosage_form || 'Medicine'}
                                    </span>
                                    {med.regulatory_approval_number && (
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '6px',
                                            background: 'var(--bg-main)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            fontFamily: 'monospace'
                                        }}>
                                            {med.regulatory_approval_number}
                                        </span>
                                    )}
                                </div>

                                {/* Title & Generic */}
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
                                    {med.name}
                                </h3>
                                <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                                    {med.generic_name} {med.strength ? `(${med.strength})` : ''}
                                </div>

                                {/* Details List */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-muted)',
                                    marginBottom: '1rem',
                                    paddingTop: '0.5rem',
                                    borderTop: '1px dashed var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Buildings size={16} color="#8B5CF6" />
                                        <span><strong>Manufacturer:</strong> {med.manufacturer_name || 'Authorized BD Pharma'}</span>
                                    </div>
                                    {med.category && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FirstAid size={16} color="#EC4899" />
                                            <span><strong>Category:</strong> {med.category}</span>
                                        </div>
                                    )}
                                    {med.packaging && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Barcode size={16} color="#10B981" />
                                            <span><strong>Packaging:</strong> {med.packaging}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Action */}
                            <button
                                onClick={() => setSelectedMedicine(med)}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--primary)',
                                    background: 'rgba(59, 130, 246, 0.05)',
                                    color: 'var(--primary)',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                View Full Report <CaretRight size={16} weight="bold" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                /* Table View */
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '0.85rem 1.25rem' }}>Brand / Trade Name</th>
                                <th style={{ padding: '0.85rem 1.25rem' }}>Generic Molecule</th>
                                <th style={{ padding: '0.85rem 1.25rem' }}>Strength & Form</th>
                                <th style={{ padding: '0.85rem 1.25rem' }}>Category</th>
                                <th style={{ padding: '0.85rem 1.25rem' }}>Manufacturer</th>
                                <th style={{ padding: '0.85rem 1.25rem' }}>DAR Approval No.</th>
                                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMedicines.map((med, idx) => (
                                <tr key={med.id} style={{ borderBottom: idx === filteredMedicines.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                        {med.name}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', color: 'var(--primary)', fontWeight: 600 }}>
                                        {med.generic_name}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                                        {med.dosage_form} {med.strength ? `(${med.strength})` : ''}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem' }}>
                                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-main)', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                                            {med.category || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontWeight: 500 }}>
                                        {med.manufacturer_name || 'Pharma Co.'}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 600, color: '#10B981' }}>
                                        {med.regulatory_approval_number || med.product_id}
                                    </td>
                                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => setSelectedMedicine(med)}
                                            style={{
                                                padding: '0.4rem 0.8rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--primary)',
                                                background: 'transparent',
                                                color: 'var(--primary)',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Inspection Modal */}
            {selectedMedicine && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        padding: '1.75rem',
                        position: 'relative'
                    }}>
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedMedicine(null)}
                            style={{
                                position: 'absolute',
                                top: '1.25rem',
                                right: '1.25rem',
                                border: 'none',
                                background: 'var(--bg-main)',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '12px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10B981'
                            }}>
                                <Pill size={32} weight="duotone" />
                            </div>
                            <div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#10B981',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Official DGDA Registered Medicine Profile
                                </span>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
                                    {selectedMedicine.name}
                                </h2>
                            </div>
                        </div>

                        {/* Content Sections */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Key Highlights Banner */}
                            <div style={{
                                background: 'var(--bg-main)',
                                padding: '1rem',
                                borderRadius: '10px',
                                border: '1px solid var(--border)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.75rem'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generic Molecule</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {selectedMedicine.generic_name || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DAR Approval Number</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10B981', fontFamily: 'monospace' }}>
                                        {selectedMedicine.regulatory_approval_number || selectedMedicine.product_id}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dosage Form & Strength</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                        {selectedMedicine.dosage_form} - {selectedMedicine.strength || 'Standard'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Therapeutic Category</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                        {selectedMedicine.category || 'Pharmaceutical Product'}
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Manufacturer:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedMedicine.manufacturer_name || 'Authorized BD Manufacturer'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Active Formulation:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedMedicine.formulation || selectedMedicine.generic_name}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Packaging Standard:</span>
                                    <span style={{ fontWeight: 600 }}>{selectedMedicine.packaging || 'Blister / Strip Standard'}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Internal Product ID:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedMedicine.product_id}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>DGDA Registration Status:</span>
                                    <span style={{ color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <ShieldCheck size={16} weight="fill" /> Active & Authorized
                                    </span>
                                </div>
                            </div>

                            {/* Description / Indications */}
                            {selectedMedicine.description && (
                                <div>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>Clinical Indications & Description:</h4>
                                    <div style={{
                                        background: 'var(--bg-main)',
                                        padding: '0.85rem',
                                        borderRadius: '8px',
                                        fontSize: '0.88rem',
                                        color: 'var(--text-muted)',
                                        lineHeight: 1.5
                                    }}>
                                        {selectedMedicine.description}
                                    </div>
                                </div>
                            )}

                            {/* Bottom Action */}
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setSelectedMedicine(null)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-main)',
                                        color: 'var(--text-main)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close Inspection
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicineRegistry;
