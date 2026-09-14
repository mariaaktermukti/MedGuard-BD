import React, { useState, useEffect } from 'react';
import { 
    Crosshair, Funnel, MagnifyingGlass, XCircle, Eye, 
    ShieldWarning
} from '@phosphor-icons/react';
import api from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DGDAMonitoring = () => {
    const [summary, setSummary] = useState(null);
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('all');
    const [severity, setSeverity] = useState('all');
    const [status, setStatus] = useState('all');

    // Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState(null);

    const fetchSummary = async () => {
        try {
            const res = await api.get('core/dgda/monitoring/summary/');
            setSummary(res.data);
        } catch (err) {
            console.error("Error fetching summary:", err);
        }
    };

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (eventType !== 'all') params.event_type = eventType;
            if (severity !== 'all') params.severity = severity;
            if (status !== 'all') params.status = status;

            const res = await api.get('core/dgda/monitoring/', { params });
            setEvents(res.data.results || res.data || []);
        } catch (err) {
            console.error("Error fetching monitoring events:", err);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchSummary();
        fetchEvents();
    }, [eventType, severity, status]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchEvents();
    };

    const handleClearFilters = () => {
        setSearch('');
        setEventType('all');
        setSeverity('all');
        setStatus('all');
        fetchEvents();
    };

    const openEventDetail = async (eventId) => {
        setSelectedEvent(null);
        try {
            const res = await api.get(`core/dgda/monitoring/${eventId}/`);
            setSelectedEvent(res.data);
        } catch (err) {
            console.error("Error fetching event detail:", err);
        }
    };

    const handleMarkReviewed = async (eventId) => {
        try {
            await api.patch(`core/dgda/monitoring/${eventId}/`, { action: 'mark_reviewed' });
            fetchEvents();
            fetchSummary();
            if (selectedEvent && selectedEvent.id === eventId) {
                openEventDetail(eventId);
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const handleChangeStatus = async (eventId, newStatus) => {
        try {
            await api.patch(`core/dgda/monitoring/${eventId}/`, { status: newStatus });
            fetchEvents();
            fetchSummary();
            if (selectedEvent && selectedEvent.id === eventId) {
                openEventDetail(eventId);
            }
        } catch (err) {
            console.error("Error updating status:", err);
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
                    <Crosshair size={24} color="var(--primary)" weight="duotone" /> DGDA Signal Monitoring Module
                </h1>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Detect, filter, inspect, and manage potential drug safety & regulatory signals nationwide
                </p>
            </div>

            {/* 2.1 Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', width: '100%' }}>
                <Card padding="sm" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Signals</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>{summary?.total_signals || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center', borderTop: '3px solid var(--danger)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Critical Signals</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>{summary?.critical_signals || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center', borderTop: '3px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>New Today</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>{summary?.new_today || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center', borderTop: '3px solid var(--info)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Under Review</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--info)' }}>{summary?.under_review || 0}</div>
                </Card>
                <Card padding="sm" style={{ textAlign: 'center', borderTop: '3px solid var(--success)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>{summary?.resolved || 0}</div>
                </Card>
            </div>

            {/* 2.7 Filter Bar */}
            <Card padding="sm" style={{ background: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    
                    {/* Search Input */}
                    <div style={{ flex: '2 1 180px', minWidth: '160px' }}>
                        <Input 
                            placeholder="Search Event ID, Title, Medicine..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={<MagnifyingGlass size={16} />}
                        />
                    </div>

                    {/* Event Type Filter */}
                    <div style={{ flex: '1 1 130px', minWidth: '120px' }}>
                        <select 
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.825rem' }}
                        >
                            <option value="all">All Event Types</option>
                            <option value="adr">ADR (Adverse Reaction)</option>
                            <option value="counterfeit">Suspected Counterfeit</option>
                            <option value="expired">Expired Medicine</option>
                            <option value="complaint">Complaint</option>
                            <option value="price_anomaly">Price Anomaly</option>
                            <option value="supply_chain_anomaly">Supply Chain Anomaly</option>
                            <option value="quality_issue">Quality Issue</option>
                        </select>
                    </div>

                    {/* Severity Filter */}
                    <div style={{ flex: '1 1 110px', minWidth: '100px' }}>
                        <select 
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.825rem' }}
                        >
                            <option value="all">All Severities</option>
                            <option value="critical">Critical</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ flex: '1 1 110px', minWidth: '100px' }}>
                        <select 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: '0.825rem' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="new">New</option>
                            <option value="under_review">Under Review</option>
                            <option value="escalated">Escalated</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <Button type="submit" variant="primary" size="sm" style={{ padding: '0.45rem 0.75rem', fontSize: '0.825rem' }}>
                            <Funnel size={14} /> Filter
                        </Button>
                        <Button type="button" variant="outline" size="sm" style={{ padding: '0.45rem 0.65rem', fontSize: '0.825rem' }} onClick={handleClearFilters}>
                            <XCircle size={14} /> Clear
                        </Button>
                    </div>

                </form>
            </Card>

            {/* 2.6 Monitoring Data Table - STRICT 100% FIXED WIDTH (Zero Horizontal Scrollbar) */}
            <Card padding="none" style={{ width: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-page)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ ...cellStyle, width: '13%', fontWeight: 600 }}>Event ID</th>
                            <th style={{ ...cellStyle, width: '14%', fontWeight: 600 }}>Type</th>
                            <th style={{ ...cellStyle, width: '14%', fontWeight: 600 }}>Medicine</th>
                            <th style={{ ...cellStyle, width: '18%', fontWeight: 600 }}>Entity</th>
                            <th style={{ ...cellStyle, width: '9%', fontWeight: 600 }}>Location</th>
                            <th style={{ ...cellStyle, width: '8%', fontWeight: 600 }}>Severity</th>
                            <th style={{ ...cellStyle, width: '8%', fontWeight: 600 }}>Risk</th>
                            <th style={{ ...cellStyle, width: '9%', fontWeight: 600 }}>Status</th>
                            <th style={{ ...cellStyle, width: '7%', textAlign: 'right', fontWeight: 600 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    Loading signals...
                                </td>
                            </tr>
                        ) : events && events.length > 0 ? (
                            events.map((ev) => {
                                const entityName = ev.manufacturer_name || ev.pharmacy_name || 'N/A';
                                const medName = ev.medicine_name || ev.title;
                                return (
                                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        {/* Event ID */}
                                        <td style={{ ...cellStyle, fontWeight: 600, color: 'var(--primary)' }} title={ev.event_id}>
                                            {ev.event_id}
                                        </td>

                                        {/* Type */}
                                        <td style={cellStyle} title={ev.event_type_display || ev.event_type}>
                                            <Badge variant="outline" style={{ fontSize: '0.725rem', padding: '0.15rem 0.35rem' }}>
                                                {ev.event_type_display || ev.event_type}
                                            </Badge>
                                        </td>

                                        {/* Medicine */}
                                        <td style={{ ...cellStyle, fontWeight: 500 }} title={medName}>
                                            {medName}
                                        </td>

                                        {/* Entity */}
                                        <td style={{ ...cellStyle, color: 'var(--text-muted)' }} title={entityName}>
                                            {entityName}
                                        </td>

                                        {/* Location */}
                                        <td style={{ ...cellStyle, color: 'var(--text-muted)' }} title={ev.location || 'Dhaka'}>
                                            {ev.location || 'Dhaka'}
                                        </td>

                                        {/* Severity */}
                                        <td style={cellStyle}>
                                            <Badge variant={
                                                ev.severity === 'critical' ? 'danger' :
                                                ev.severity === 'high' ? 'warning' :
                                                ev.severity === 'medium' ? 'info' : 'success'
                                            } style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem' }}>
                                                {ev.severity_display || ev.severity.toUpperCase()}
                                            </Badge>
                                        </td>

                                        {/* Risk Score */}
                                        <td style={{ ...cellStyle, fontWeight: 700 }}>
                                            <span style={{ 
                                                color: ev.risk_score >= 75 ? 'var(--danger)' : ev.risk_score >= 50 ? 'var(--warning)' : 'var(--primary)'
                                            }}>
                                                {ev.risk_score}/100
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td style={cellStyle}>
                                            <Badge variant={ev.status === 'resolved' ? 'success' : ev.status === 'under_review' ? 'info' : 'outline'} style={{ fontSize: '0.7rem', padding: '0.15rem 0.35rem' }}>
                                                {ev.status_display || ev.status}
                                            </Badge>
                                        </td>

                                        {/* Action */}
                                        <td style={{ ...cellStyle, textAlign: 'right' }}>
                                            <Button 
                                                variant="primary" 
                                                size="sm" 
                                                style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', borderRadius: '6px' }} 
                                                onClick={() => openEventDetail(ev.id)}
                                                title="View Event Details"
                                            >
                                                <Eye size={12} /> View
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    No monitoring events matched your search filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* 2.8 Monitoring Details Modal */}
            {selectedEvent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '700px',
                        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)',
                        padding: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>{selectedEvent.event_id}</h2>
                                    <Badge variant={selectedEvent.severity === 'critical' ? 'danger' : 'warning'}>
                                        {selectedEvent.severity_display || selectedEvent.severity.toUpperCase()}
                                    </Badge>
                                </div>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{selectedEvent.title}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                                <XCircle size={22} />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-page)', padding: '0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medicine</div>
                                    <div style={{ fontWeight: 600 }}>{selectedEvent.medicine_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Batch</div>
                                    <div style={{ fontWeight: 600 }}>{selectedEvent.batch_number || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manufacturer</div>
                                    <div style={{ fontWeight: 600 }}>{selectedEvent.manufacturer_name || 'N/A'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pharmacy / Location</div>
                                    <div style={{ fontWeight: 600 }}>{selectedEvent.pharmacy_name || selectedEvent.location || 'Dhaka'}</div>
                                </div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Event Description</h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                                    {selectedEvent.description || 'No detailed description provided.'}
                                </p>
                            </div>

                            <Card padding="md" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Engine Analysis</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedEvent.calculated_risk_score >= 75 ? 'var(--danger)' : 'var(--warning)' }}>
                                            {selectedEvent.calculated_risk_score || selectedEvent.risk_score} / 100
                                            <span style={{ fontSize: '0.85rem', marginLeft: '0.5rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                                Level: {selectedEvent.risk_level || 'HIGH'}
                                            </span>
                                        </div>
                                    </div>
                                    <ShieldWarning size={32} color={selectedEvent.calculated_risk_score >= 75 ? 'var(--danger)' : 'var(--warning)'} weight="duotone" />
                                </div>

                                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-main)' }}>
                                    Contributing Risk Factors:
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                    {selectedEvent.contributing_factors && selectedEvent.contributing_factors.length > 0 ? (
                                        selectedEvent.contributing_factors.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.3rem 0.5rem', background: 'var(--bg-page)', borderRadius: 'var(--radius-sm)' }}>
                                                <span>{f.factor}</span>
                                                <strong style={{ color: 'var(--danger)' }}>+{f.points} pts</strong>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No additional risk factors recorded.</div>
                                    )}
                                </div>
                            </Card>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Reviewed by: {selectedEvent.reviewed_by_name || 'Unassigned'}
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    <Button variant="outline" size="sm" onClick={() => handleChangeStatus(selectedEvent.id, 'escalated')}>
                                        Escalate
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={() => handleChangeStatus(selectedEvent.id, 'resolved')}>
                                        Mark Resolved
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => handleChangeStatus(selectedEvent.id, 'dismissed')}>
                                        Dismiss
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DGDAMonitoring;
