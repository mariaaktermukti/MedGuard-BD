import React, { useEffect, useState } from 'react';
import { DownloadSimple, Database, FileCsv, FileCode } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

/** Saves a blob to disk. Needed because the API requires a JWT header, so a
 *  plain <a href> link cannot be used for downloads. */
const saveBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

const DatasetExport = () => {
    const [summary, setSummary] = useState(null);
    const [datasets, setDatasets] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [filters, setFilters] = useState({ medicine: '', severity: '' });
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [summaryRes, datasetRes, medicineRes] = await Promise.all([
                    api.get('researcher/export/summary/'),
                    api.get('researcher/datasets/'),
                    api.get('researcher/medicines/'),
                ]);
                setSummary(summaryRes.data);
                setDatasets(datasetRes.data);
                setMedicines(medicineRes.data);
            } catch (error) {
                console.error('Failed to load export summary:', error);
            }
        };
        load();
    }, []);

    const exportAdr = async (fmt) => {
        setBusy(fmt);
        setMessage(null);
        try {
            const params = { fmt };
            if (filters.medicine) params.medicine = filters.medicine;
            if (filters.severity) params.severity = filters.severity;
            const response = await api.get('researcher/export/adr/', { params, responseType: 'blob' });
            saveBlob(response.data, `medguard-governed-adr.${fmt}`);
            setMessage({ tone: 'success', text: `Export downloaded as ${fmt.toUpperCase()}.` });
        } catch (error) {
            console.error('Export failed:', error);
            setMessage({ tone: 'danger', text: 'Export failed — check that you are still signed in.' });
        } finally {
            setBusy('');
        }
    };

    const downloadDataset = async (dataset) => {
        setBusy(`dataset-${dataset.id}`);
        setMessage(null);
        try {
            const response = await api.get(`researcher/datasets/${dataset.id}/download/`, { responseType: 'blob' });
            saveBlob(response.data, dataset.file_name || `${dataset.dataset_name}.dat`);
            setMessage({ tone: 'success', text: `Downloaded ${dataset.file_name}.` });
        } catch (error) {
            console.error('Dataset download failed:', error);
            setMessage({ tone: 'danger', text: 'This dataset record has no uploaded file — only its metadata exists.' });
        } finally {
            setBusy('');
        }
    };

    const buttonStyle = (disabled) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.6rem 1rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: disabled ? 'var(--border)' : 'var(--primary)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.88rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
    });

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={summary?.note} />

            {message && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: `1px solid var(--${message.tone})`, color: `var(--${message.tone})`, fontSize: '0.9rem', fontWeight: 600 }}>
                    {message.text}
                </div>
            )}

            <Card>
                <CardHeader
                    title="Export the governed ADR dataset"
                    subtitle={summary ? `${summary.adr_records_available} records available, generated live and anonymised on the way out.` : 'Loading...'}
                />
                <CardContent style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <select
                            value={filters.medicine}
                            onChange={(e) => setFilters({ ...filters, medicine: e.target.value })}
                            style={{ padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                            <option value="">All medicines</option>
                            {medicines.map((medicine) => (
                                <option key={medicine.id} value={medicine.id}>{medicine.name} ({medicine.report_count})</option>
                            ))}
                        </select>
                        <select
                            value={filters.severity}
                            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                            style={{ padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        >
                            <option value="">All severities</option>
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                        </select>
                        <button type="button" onClick={() => exportAdr('csv')} disabled={!!busy} style={buttonStyle(!!busy)}>
                            <FileCsv size={18} /> {busy === 'csv' ? 'Preparing...' : 'Download CSV'}
                        </button>
                        <button type="button" onClick={() => exportAdr('json')} disabled={!!busy} style={buttonStyle(!!busy)}>
                            <FileCode size={18} /> {busy === 'json' ? 'Preparing...' : 'Download JSON'}
                        </button>
                    </div>

                    {summary && (
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Columns included</div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {summary.export_columns.map((column) => (
                                    <code key={column} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', background: 'var(--border)', color: 'var(--text-muted)' }}>{column}</code>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader
                    title="Registered research datasets"
                    subtitle={summary ? `${summary.registered_datasets} registered, ${summary.datasets_with_uploaded_file} with an uploaded file.` : ''}
                />
                <CardContent>
                    {datasets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <Database size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No ResearchDataset rows exist. No portal in this project writes them, so they only appear if added through the Django admin.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.6rem' }}>
                            {datasets.map((dataset) => (
                                <div key={dataset.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{dataset.dataset_name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{dataset.description || 'No description recorded.'}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                                            Registered by {dataset.created_by_name || dataset.created_by_username} · {new Date(dataset.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    {dataset.has_data_file ? (
                                        <button type="button" onClick={() => downloadDataset(dataset)} disabled={!!busy} style={buttonStyle(!!busy)}>
                                            <DownloadSimple size={18} /> Download
                                        </button>
                                    ) : (
                                        <Badge variant="neutral">metadata only — no file</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default DatasetExport;
