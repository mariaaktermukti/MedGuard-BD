import React, { useEffect, useState } from 'react';
import { BookOpen, Prohibit, TextAa } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const LiteratureMining = () => {
    const [medicines, setMedicines] = useState([]);
    const [selected, setSelected] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMedicines = async () => {
            try {
                const response = await api.get('researcher/medicines/');
                setMedicines(response.data);
                if (response.data.length) setSelected(String(response.data[0].id));
            } catch (error) {
                console.error('Failed to load medicines:', error);
            }
        };
        loadMedicines();
    }, []);

    useEffect(() => {
        if (!selected) return;
        const mine = async () => {
            setLoading(true);
            try {
                const response = await api.get('researcher/literature/mine/', { params: { medicine: selected, limit: 20 } });
                setResult(response.data);
            } catch (error) {
                console.error('Literature mining failed:', error);
            } finally {
                setLoading(false);
            }
        };
        mine();
    }, [selected]);

    const maxLift = Math.max(1, ...(result?.terms || []).map((term) => term.lift || 0));

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div
                className="glass-panel"
                style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', borderLeft: '4px solid var(--danger)' }}
            >
                <Prohibit size={22} color="var(--danger)" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <div>
                    <div style={{ fontWeight: 800, color: 'var(--danger)', marginBottom: '0.2rem' }}>
                        This does not search any literature database
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                        MedGuard has no PubMed / Europe PMC / Semantic Scholar integration and no API key for one.
                        Nothing here reads a published paper, and no citation is generated. What you see below is
                        term-frequency mining over MedGuard&apos;s own ADR report narratives.
                    </p>
                </div>
            </div>

            <NoteBanner note={result?.note} />

            <Card>
                <CardHeader
                    title="Distinctive terms in this medicine's reports"
                    subtitle={
                        result
                            ? `${result.focus_documents} narratives for this medicine, compared against ${result.background_documents} for all others. Method: ${result.method}.`
                            : 'Select a medicine to mine its narratives.'
                    }
                    action={
                        <select
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                            style={{ padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                            {medicines.length === 0 && <option value="">No medicines with reports</option>}
                            {medicines.map((medicine) => (
                                <option key={medicine.id} value={medicine.id}>{medicine.name} ({medicine.report_count})</option>
                            ))}
                        </select>
                    }
                />
                <CardContent>
                    {result && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <Badge variant="neutral">external literature DB: no</Badge>
                            <Badge variant="neutral">language model: no</Badge>
                            <Badge variant="neutral">{result.corpus.adr_narratives} ADR narratives</Badge>
                            <Badge variant="neutral">{result.corpus.sanitized_narratives} sanitised</Badge>
                            <Badge variant="neutral">{result.corpus.medicine_descriptions} medicine descriptions</Badge>
                        </div>
                    )}

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Mining narratives...</p>
                    ) : !result || result.terms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <BookOpen size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No narrative text is recorded for this medicine, so there is nothing to mine.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {result.terms.map((term) => (
                                <div key={term.term} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1.4fr) 1fr auto', gap: '0.75rem', alignItems: 'center', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                        {term.is_phrase && <TextAa size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />}
                                        <span style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{term.term}</span>
                                    </div>
                                    <div style={{ background: 'var(--border)', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
                                        <div style={{ width: `${((term.lift || 0) / maxLift) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '9999px' }} />
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        lift <strong style={{ color: 'var(--text-main)' }}>{term.lift ?? '—'}</strong> · {term.documents_in_focus} here / {term.documents_in_background} elsewhere
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

export default LiteratureMining;
