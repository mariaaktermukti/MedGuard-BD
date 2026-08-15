import React, { useEffect, useState } from 'react';
import { Database, FileText } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const ResearchDatasets = () => {
    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const response = await api.get('doctor/research-datasets/');
                setDatasets(response.data);
            } catch (err) {
                console.error('Failed to fetch research datasets:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDatasets();
    }, []);

    return (
        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '700px' }}>
            <Card>
                <CardHeader title="Research Datasets" subtitle="Metadata for datasets shared with research. Full data access is reserved for the Researcher Portal." />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : datasets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Database size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No research datasets published yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {datasets.map((dataset) => (
                                <div key={dataset.id} style={{ padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FileText size={18} color="var(--primary)" /> {dataset.dataset_name}
                                        </div>
                                        {dataset.has_data_file && <Badge variant="success">Data File Available</Badge>}
                                    </div>
                                    <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{dataset.description || 'No description provided.'}</p>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Published by {dataset.created_by_username} &bull; {new Date(dataset.created_at).toLocaleDateString()}
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

export default ResearchDatasets;
