import React, { useState, useEffect } from 'react';
import { 
    Buildings, MagnifyingGlass, Funnel, XCircle, Eye, ShieldWarning, 
    ArrowRight
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DGDAEntities = () => {
    const [summary, setSummary] = useState(null);
    const [entities, setEntities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [entityType, setEntityType] = useState('all');

    // Detail Modal State
    const [selectedEntity, setSelectedEntity] = useState(null);

    const fetchEntities = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (entityType !== 'all') params.type = entityType;

            const res = await api.get('core/dgda/entities/', { params });
            setSummary(res.data.summary || {});
            setEntities(res.data.entities || []);
        } catch (err) {
            console.error("Error fetching entities:", err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchEntities();
    }, [entityType]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchEntities();
    };

    const handleClearFilters = () => {
        setSearch('');
        setEntityType('all');
        fetchEntities();
    };

    const openEntityDetail = async (type, id) => {
        setSelectedEntity(null);
        try {
            const res = await api.get(`core/dgda/entities/detail/?type=${type}&id=${id}`);
            setSelectedEntity(res.data);
        } catch (err) {
            console.error("Error fetching entity detail:", err);
        }
    };

    const cellStyle = {
        padding: '0.65rem 0.5rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.825rem'
    };

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
            
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Buildings size={24} color="var(--primary)" weight="duotone" /> DGDA Entity Intelligence Module
                </h1>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Search, inspect, and monitor pharmaceutical entities, manufacturers, pharmacies, distributors & batches
                </p>
            </div>

            {/* 3.2 Entity Dashboard Summary across all 7 Entities */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))', gap: '0.6rem', width: '100%' }}>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Manufacturers</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.total_manufacturers || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Pharmacies</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--info)' }}>{summary?.total_pharmacies || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Distributors</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8B5CF6' }}>{summary?.total_distributors || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Doctors</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0EA5E9' }}>{summary?.total_doctors || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Citizens</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>{summary?.total_citizens || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Researchers</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B' }}>{summary?.total_researchers || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>Medicines</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{summary?.total_medicines || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center', borderTop: '3px solid var(--danger)' }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>High-Risk</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--danger)' }}>{summary?.high_risk_entities || 0}</div>
                </Card>
            </div>

            {/* 3.3 Global Entity Search */}
            <Card padding="sm" style={{ background: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div style={{ flex: '2 1 200px', minWidth: '160px' }}>
                        <Input 
                            placeholder="Global Search Name, Reg #, License #, Medicine..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={<MagnifyingGlass size={16} />}
                        />
                    </div>

                    <div style={{ flex: '1 1 140px', minWidth: '120px' }}>
                        <select 
                            value={entityType}
                            onChange={(e) => setEntityType(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.825rem' }}
                        >
                            <option value="all">All Entity Types</option>
                            <option value="manufacturer">Manufacturers</option>
                            <option value="pharmacy">Pharmacies</option>
                            <option value="distributor">Distributors</option>
                            <option value="doctor">Doctors</option>
                            <option value="citizen">Citizens / Patients</option>
                            <option value="researcher">Researchers</option>
                            <option value="medicine">Medicines</option>
                            <option value="batch">Batches</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Button type="submit" variant="primary" size="sm" style={{ padding: '0.45rem 0.75rem', fontSize: '0.825rem' }}>
                            <MagnifyingGlass size={14} /> Search
                        </Button>
                        <Button type="button" variant="outline" size="sm" style={{ padding: '0.45rem 0.65rem', fontSize: '0.825rem' }} onClick={handleClearFilters}>
                            <XCircle size={14} /> Clear
                        </Button>
                    </div>
                </form>
            </Card>

            {/* 3.4 Entity List Table - FIXED 100% Percentage Width */}
            <Card padding="none" style={{ width: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ ...cellStyle, width: '22%', fontWeight: 600 }}>Entity Name</th>
                            <th style={{ ...cellStyle, width: '14%', fontWeight: 600 }}>Type</th>
                            <th style={{ ...cellStyle, width: '18%', fontWeight: 600 }}>Reg / License #</th>
                            <th style={{ ...cellStyle, width: '16%', fontWeight: 600 }}>Location</th>
                            <th style={{ ...cellStyle, width: '12%', fontWeight: 600 }}>Risk Score</th>
                            <th style={{ ...cellStyle, width: '10%', fontWeight: 600 }}>Status</th>
                            <th style={{ ...cellStyle, width: '8%', textAlign: 'right', fontWeight: 600 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Loading entity index...
                                </td>
                            </tr>
                        ) : entities && entities.length > 0 ? (
                            entities.map((item, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--text-main)' }} title={item.name}>
                                        {item.name}
                                    </td>
                                    <td style={cellStyle} title={item.type_display || item.type}>
                                        <Badge variant="outline" style={{ fontSize: '0.725rem', padding: '0.15rem 0.35rem' }}>
                                            {item.type_display || item.type}
                                        </Badge>
                                    </td>
                                    <td style={{ ...cellStyle, color: 'var(--text-muted)', fontFamily: 'monospace' }} title={item.registration_number}>
                                        {item.registration_number}
                                    </td>
                                    <td style={{ ...cellStyle, color: 'var(--text-muted)' }} title={item.location}>
                                        {item.location}
                                    </td>
                                    <td style={{ ...cellStyle, fontWeight: 700 }}>
                                        <span style={{ 
                                            color: item.risk_score >= 60 ? 'var(--danger)' : item.risk_score >= 40 ? 'var(--warning)' : 'var(--success)'
                                        }}>
                                            {item.risk_score} ({item.risk_level})
                                        </span>
                                    </td>
                                    <td style={cellStyle}>
                                        <Badge variant={item.status === 'Active' || item.status === 'Licensed' || item.status === 'Registered' ? 'success' : 'warning'} style={{ fontSize: '0.725rem', padding: '0.15rem 0.35rem' }}>
                                            {item.status}
                                        </Badge>
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>
                                        <Button 
                                            variant="primary" 
                                            size="sm" 
                                            style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '6px' }} 
                                            onClick={() => openEntityDetail(item.type, item.id)}
                                            title="View Entity Details"
                                        >
                                            <Eye size={12} /> View
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No entities found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* 3.5 & 3.6 & 3.7 Entity Profile Details Modal */}
            {selectedEntity && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '720px',
                        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>
                                        {selectedEntity.basic_info?.name}
                                    </h2>
                                    <Badge variant="primary">{selectedEntity.basic_info?.type}</Badge>
                                </div>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                                    Reg: {selectedEntity.basic_info?.registration_number} • Status: {selectedEntity.basic_info?.license_status}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEntity(null)}>
                                <XCircle size={22} />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            
                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>Basic Information</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-page)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                                    <div><strong>Address:</strong> {selectedEntity.basic_info?.address}</div>
                                    <div><strong>Contact Person:</strong> {selectedEntity.basic_info?.contact_person}</div>
                                    <div><strong>Phone:</strong> {selectedEntity.basic_info?.phone}</div>
                                    <div><strong>Registration Date:</strong> {selectedEntity.basic_info?.registration_date}</div>
                                </div>
                            </div>

                            <Card padding="md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Intelligence Profile</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedEntity.risk_profile?.score >= 60 ? 'var(--danger)' : 'var(--warning)' }}>
                                            {selectedEntity.risk_profile?.score} / 100 
                                            <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                Level: {selectedEntity.risk_profile?.level}
                                            </span>
                                        </div>
                                    </div>
                                    <ShieldWarning size={32} color={selectedEntity.risk_profile?.score >= 60 ? 'var(--danger)' : 'var(--warning)'} weight="duotone" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                                    {selectedEntity.risk_profile?.categories?.map((cat, i) => (
                                        <div key={i} style={{ padding: '0.5rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{cat.category}</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: cat.score >= 60 ? 'var(--danger)' : cat.score >= 40 ? 'var(--warning)' : 'var(--success)' }}>
                                                {cat.score} / 100
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>Regulatory & Inspection History</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                    <div style={{ padding: '0.6rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Previous Violations</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>{selectedEntity.regulatory_info?.previous_violations}</div>
                                    </div>
                                    <div style={{ padding: '0.6rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Alerts</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--warning)' }}>{selectedEntity.regulatory_info?.active_alerts_count}</div>
                                    </div>
                                    <div style={{ padding: '0.6rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ADR Signals</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--info)' }}>{selectedEntity.regulatory_info?.adr_signals_count}</div>
                                    </div>
                                    <div style={{ padding: '0.6rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inspections Held</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedEntity.regulatory_info?.inspections_count}</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--text-main)' }}>Supply Chain & Distribution Relationship Preview</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {selectedEntity.relationship_preview && selectedEntity.relationship_preview.length > 0 ? (
                                        selectedEntity.relationship_preview.map((rel, i) => (
                                            <div key={i} style={{ 
                                                display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem', 
                                                background: 'var(--bg-page)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', flexWrap: 'wrap' 
                                            }}>
                                                <strong style={{ color: 'var(--primary)' }}>{rel.manufacturer}</strong>
                                                <ArrowRight size={12} />
                                                <span>{rel.medicine}</span>
                                                <ArrowRight size={12} />
                                                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rel.batch}</span>
                                                <ArrowRight size={12} />
                                                <span>{rel.distributed_to}</span>
                                                <Badge variant="outline" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{rel.status}</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No direct distribution relationships found.</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DGDAEntities;
