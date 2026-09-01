import React, { useEffect, useState } from 'react';
import { Lightbulb, Sparkle, Table, CaretDown, CaretRight } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const EvidenceBundle = ({ evidence }) => {
    const [open, setOpen] = useState(false);
    const stats = evidence.disproportionality;

    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', textAlign: 'left' }}
            >
                {open ? <CaretDown size={16} /> : <CaretRight size={16} />}
                <Table size={16} color="var(--primary)" />
                Evidence the model was given ({evidence.medicine.name})
            </button>
            {open && (
                <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <Badge variant="neutral">PRR {stats.prr ?? '—'}</Badge>
                        <Badge variant="neutral">ROR {stats.ror ?? '—'}</Badge>
                        <Badge variant="neutral">chi² {stats.chi_square}</Badge>
                        <Badge variant={stats.meets_signal_criteria ? 'danger' : 'neutral'}>
                            {stats.meets_signal_criteria ? 'meets signal criteria' : 'below signal threshold'}
                        </Badge>
                        <Badge variant="neutral">{stats.severe_reports} severe / {stats.other_reports} other</Badge>
                    </div>

                    {evidence.distinctive_terms.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>Distinctive narrative terms</div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {evidence.distinctive_terms.map((term) => (
                                    <code key={term.term} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'var(--border)', color: 'var(--text-muted)' }}>
                                        {term.term} · lift {term.lift}
                                    </code>
                                ))}
                            </div>
                        </div>
                    )}

                    {evidence.co_reported_medicines.length > 0 && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>Co-reported medicines</div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {evidence.co_reported_medicines.map((item) => (
                                    <code key={item.medicine} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'var(--border)', color: 'var(--text-muted)' }}>
                                        {item.medicine} · {item.shared_subjects} shared
                                    </code>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Computed from {evidence.corpus_size} ADR reports. Contingency table:
                        a={stats.contingency_table.a}, b={stats.contingency_table.b},
                        c={stats.contingency_table.c}, d={stats.contingency_table.d}.
                    </div>
                </div>
            )}
        </div>
    );
};

const HypothesisGeneration = () => {
    const [medicines, setMedicines] = useState([]);
    const [selected, setSelected] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadMedicines = async () => {
            try {
                const response = await api.get('researcher/medicines/');
                setMedicines(response.data);
                if (response.data.length) setSelected(String(response.data[0].id));
            } catch (err) {
                console.error('Failed to load medicines:', err);
            }
        };
        loadMedicines();
    }, []);

    const generate = async () => {
        if (!selected) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await api.post('researcher/hypotheses/', { medicine: Number(selected) });
            setResult(response.data);
        } catch (err) {
            console.error('Hypothesis generation failed:', err);
            setError(err.response?.data?.error || err.response?.data?.detail || 'Could not generate hypotheses right now.');
            if (err.response?.data?.evidence) setResult({ evidence: err.response.data.evidence });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={result?.note} />

            <Card>
                <CardHeader
                    title="Generate research hypotheses"
                    subtitle="A real language model call, grounded strictly in statistics computed from this database."
                    action={
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                            <button
                                type="button"
                                onClick={generate}
                                disabled={loading || !selected}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', background: loading || !selected ? 'var(--border)' : 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: '0.88rem', cursor: loading || !selected ? 'not-allowed' : 'pointer' }}
                            >
                                <Sparkle size={18} weight="fill" /> {loading ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    }
                />
                <CardContent style={{ display: 'grid', gap: '1rem' }}>
                    {error && (
                        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: '0.9rem', fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    {result?.evidence && <EvidenceBundle evidence={result.evidence} />}

                    {result?.hypotheses ? (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                <Lightbulb size={18} color="var(--warning)" weight="fill" />
                                <span style={{ fontWeight: 700 }}>Generated hypotheses</span>
                                <Badge variant="neutral">{result.model}</Badge>
                            </div>
                            <p style={{ color: 'var(--text-main)', lineHeight: 1.65, whiteSpace: 'pre-wrap', margin: 0 }}>{result.hypotheses}</p>
                        </div>
                    ) : (
                        !loading && !error && (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                                <Lightbulb size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                                <p>Pick a medicine and generate hypotheses from its real signal statistics.</p>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default HypothesisGeneration;
