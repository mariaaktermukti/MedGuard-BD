import React, { useEffect, useState } from 'react';
import { Pulse, Warning } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const cell = { padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.875rem', whiteSpace: 'nowrap' };
const headCell = { ...cell, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.03em' };

const Stat = ({ label, value, accent }) => (
    <div style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: accent || 'var(--text-main)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.3rem' }}>{label}</div>
    </div>
);

const ADRSignalDetection = () => {
    const [severity, setSeverity] = useState('severe');
    const [searchQuery, setSearchQuery] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const response = await api.get('researcher/signals/', { params: { severity } });
                setData(response.data);
            } catch (error) {
                console.error('Failed to load ADR signals:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [severity]);

    const criteria = data?.criteria;
    const filteredSignals = (data?.signals || []).filter((s) =>
        s.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.generic_name && s.generic_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={data?.note} />

            <Card>
                <CardHeader
                    title="ADR Disproportionality Signal Detection"
                    subtitle={
                        criteria
                            ? `Flagged when cases ≥ ${criteria.min_case_count}, PRR ≥ ${criteria.min_prr} & chi² ≥ ${criteria.min_chi_square}.`
                            : 'Computing signal statistics...'
                    }
                    action={
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                placeholder="Search medicine..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.88rem', minWidth: '150px' }}
                            />
                            <select
                                value={severity}
                                onChange={(e) => setSeverity(e.target.value)}
                                style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <option value="severe">Severity = Severe</option>
                                <option value="moderate">Severity = Moderate</option>
                                <option value="mild">Severity = Mild</option>
                            </select>
                        </div>
                    }
                />
                <CardContent style={{ display: 'grid', gap: '1.25rem' }}>
                    {data && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                            <Stat label="Total Reports Analysed" value={data.total_reports_analysed} />
                            <Stat label={`Reports at "${data.event_severity}"`} value={data.total_event_reports} />
                            <Stat label="Medicines Monitored" value={data.signals.length} />
                            <Stat label="Signals Flagged" value={data.signals_flagged} accent={data.signals_flagged > 0 ? 'var(--danger)' : undefined} />
                        </div>
                    )}

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Computing signal statistics...</p>
                    ) : filteredSignals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <Pulse size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No matching ADR signals found for your search.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ ...headCell, textAlign: 'left' }}>Medicine</th>
                                        <th style={{ ...headCell, textAlign: 'right' }}>Cases (a)</th>
                                        <th style={{ ...headCell, textAlign: 'right' }}>Other (b)</th>
                                        <th style={{ ...headCell, textAlign: 'right' }}>PRR</th>
                                        <th style={{ ...headCell, textAlign: 'right' }}>ROR</th>
                                        <th style={{ ...headCell, textAlign: 'right' }}>Chi-Square</th>
                                        <th style={{ ...headCell, textAlign: 'left' }}>Signal Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSignals.map((signal) => (
                                        <tr key={signal.medicine_id} style={{ background: signal.is_signal ? 'var(--primary-light)' : 'transparent' }}>
                                            <td style={{ ...cell, textAlign: 'left' }}>
                                                <div style={{ fontWeight: 700 }}>{signal.medicine_name}</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{signal.generic_name || '—'}</div>
                                            </td>
                                            <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{signal.event_reports}</td>
                                            <td style={{ ...cell, textAlign: 'right' }}>{signal.non_event_reports}</td>
                                            <td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{signal.prr ?? '—'}</td>
                                            <td style={{ ...cell, textAlign: 'right' }}>{signal.ror ?? '—'}</td>
                                            <td style={{ ...cell, textAlign: 'right' }}>{signal.chi_square}</td>
                                            <td style={{ ...cell, textAlign: 'left' }}>
                                                {signal.is_signal ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <Warning size={16} color="var(--danger)" weight="fill" />
                                                        <Badge variant="danger">High Risk Signal</Badge>
                                                    </span>
                                                ) : (
                                                    <Badge variant="neutral">Normal Pattern</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ADRSignalDetection;
