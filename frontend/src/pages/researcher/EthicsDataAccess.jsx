import React, { useEffect, useState } from 'react';
import { ShieldCheck, EyeSlash, Prohibit, FileText } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const severityVariant = (severity) => {
    if (severity === 'severe') return 'danger';
    if (severity === 'moderate') return 'warning';
    return 'neutral';
};

const Stat = ({ label, value }) => (
    <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.3rem' }}>{label}</div>
    </div>
);

const EthicsDataAccess = () => {
    const [policy, setPolicy] = useState(null);
    const [feed, setFeed] = useState({ records: [], count: 0, total_matched: 0, truncated: false });
    const [medicines, setMedicines] = useState([]);
    const [filters, setFilters] = useState({ medicine: '', severity: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [policyRes, medicineRes] = await Promise.all([
                    api.get('researcher/ethics/policy/'),
                    api.get('researcher/medicines/'),
                ]);
                setPolicy(policyRes.data);
                setMedicines(medicineRes.data);
            } catch (error) {
                console.error('Failed to load ethics policy:', error);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const loadFeed = async () => {
            setLoading(true);
            try {
                const params = {};
                if (filters.medicine) params.medicine = filters.medicine;
                if (filters.severity) params.severity = filters.severity;
                const response = await api.get('researcher/ethics/adr-data/', { params });
                setFeed(response.data);
            } catch (error) {
                console.error('Failed to load governed ADR data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadFeed();
    }, [filters]);

    const scope = policy?.accessible_scope;

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={policy?.note} />

            <Card>
                <CardHeader
                    title="Governance rules enforced on every read"
                    subtitle="These are applied in the API layer, not just described here."
                />
                <CardContent style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {(policy?.principles || []).map((principle) => (
                            <div key={principle} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.9rem' }}>
                                <ShieldCheck size={18} color="var(--success)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                <span>{principle}</span>
                            </div>
                        ))}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, marginBottom: '0.6rem' }}>
                            <Prohibit size={18} color="var(--danger)" /> Fields never sent to a researcher
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(policy?.redacted_fields || []).map((item) => (
                                <div key={item.field} style={{ padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <code style={{ fontWeight: 700, color: 'var(--danger)' }}>{item.field}</code>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{item.reason}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {scope && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                            <Stat label="ADR reports in scope" value={scope.adr_reports_in_scope} />
                            <Stat label="Sanitised narratives" value={scope.records_with_sanitized_narrative} />
                            <Stat label="Raw-narrative fallback" value={scope.records_falling_back_to_raw_narrative} />
                            <Stat label="Research datasets" value={scope.research_datasets} />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader
                    title="Governed ADR record feed"
                    subtitle={`Showing ${feed.count} of ${feed.total_matched} matching records.${feed.truncated ? ' Result truncated by the server cap.' : ''}`}
                    action={
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <select
                                value={filters.medicine}
                                onChange={(e) => setFilters({ ...filters, medicine: e.target.value })}
                                style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value="">All medicines</option>
                                {medicines.map((medicine) => (
                                    <option key={medicine.id} value={medicine.id}>
                                        {medicine.name} ({medicine.report_count})
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filters.severity}
                                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                                style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value="">All severities</option>
                                <option value="mild">Mild</option>
                                <option value="moderate">Moderate</option>
                                <option value="severe">Severe</option>
                            </select>
                        </div>
                    }
                />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading governed records...</p>
                    ) : feed.records.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <FileText size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No ADR records match the current filters.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {feed.records.map((record) => (
                                <div key={record.record_id} style={{ padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {record.medicine_name}
                                            {record.generic_name ? <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}> · {record.generic_name}</span> : null}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Badge variant={severityVariant(record.severity)}>{record.severity}</Badge>
                                            <Badge variant="neutral">{record.status}</Badge>
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <EyeSlash size={14} /> {record.subject_ref}
                                        </span>
                                        <span>Reaction: {record.reaction_month || 'not recorded'}</span>
                                        <span>Reported: {record.reported_month}</span>
                                    </div>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{record.narrative}</p>
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <Badge variant={record.narrative_source === 'sanitized_research_record' ? 'success' : 'warning'}>
                                            {record.narrative_source === 'sanitized_research_record' ? 'sanitised narrative' : 'raw narrative — not sanitised'}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EthicsDataAccess;
