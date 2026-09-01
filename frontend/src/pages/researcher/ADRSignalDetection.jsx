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

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={data?.note} />

            <Card>
                <CardHeader
                    title="Disproportionality analysis"
                    subtitle={
                        criteria
                            ? `A medicine is flagged when it has at least ${criteria.min_case_count} cases, PRR ≥ ${criteria.min_prr} and chi-square ≥ ${criteria.min_chi_square}. ${criteria.reference}`
                            : 'Computing signal statistics...'
                    }
                    action={
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            style={{ padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                            <option value="severe">Event = severe</option>
                            <option value="moderate">Event = moderate</option>
                            <option value="mild">Event = mild</option>
                        </select>
                    }
                />
                <CardContent style={{ display: 'grid', gap: '1.25rem' }}>
                    {data && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                            <Stat label="Reports analysed" value={data.total_reports_analysed} />
                            <Stat label={`Reports at "${data.event_severity}"`} value={data.total_event_reports} />
                            <Stat label="Medicines compared" value={data.signals.length} />
                            <Stat label="Signals flagged" value={data.signals_flagged} accent={data.signals_flagged > 0 ? 'var(--danger)' : undefined} />
                        </div>
                    )}

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Computing signal statistics...</p>
                    ) : !data || data.signals.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <Pulse size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No ADR reports are recorded yet, so no signal can be computed.</p>
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
                                        <th style={{ ...headCell, textAlign: 'right' }}>Chi-square</th>
                                        <th style={{ ...headCell, textAlign: 'left' }}>Verdict</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.signals.map((signal) => (
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
                                                        <Badge variant="danger">signal</Badge>
                                                    </span>
                                                ) : (
                                                    <Badge variant="neutral">no signal</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.85rem 0 0' }}>
                                a = cases for this medicine at the selected severity; b = its reports at any other severity.
                                c and d are the same counts across all other medicines and are used in the PRR/ROR denominators.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ADRSignalDetection;
