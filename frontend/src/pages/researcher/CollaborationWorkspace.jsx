import React, { useEffect, useState } from 'react';
import { UsersThree, Lock, Database, User } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const CollaborationWorkspace = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await api.get('researcher/workspace/');
                setData(response.data);
            } catch (error) {
                console.error('Failed to load workspace:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading workspace...</p>;

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={data?.note} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <Card>
                    <CardHeader
                        title="Researchers sharing this corpus"
                        subtitle={`${data?.collaborator_count || 0} researcher account${data?.collaborator_count === 1 ? '' : 's'} registered.`}
                    />
                    <CardContent>
                        {(data?.collaborators || []).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                                <UsersThree size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                                <p>No researcher accounts registered yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '0.6rem' }}>
                                {data.collaborators.map((person) => (
                                    <div key={person.id} style={{ padding: '0.8rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User size={17} color="var(--primary)" weight="duotone" />
                                                <span style={{ fontWeight: 700 }}>{person.full_name || person.username}</span>
                                                {person.is_you && <Badge variant="primary">you</Badge>}
                                            </div>
                                            <Badge variant="neutral">{person.datasets_contributed} dataset(s)</Badge>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                                            {person.affiliation || 'No affiliation recorded'}
                                        </div>
                                        {person.research_interests && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                                Interests: {person.research_interests}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Access controls actually enforced" subtitle="Verifiable in the API layer, not aspirational." />
                    <CardContent>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {(data?.security_controls || []).map((control) => (
                                <div key={control} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.88rem' }}>
                                    <Lock size={17} color="var(--success)" weight="duotone" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                    <span>{control}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader
                    title="Shared contributions"
                    subtitle={`${data?.shared_corpus?.governed_adr_records || 0} governed ADR records and ${data?.shared_corpus?.registered_datasets || 0} registered datasets are visible to every researcher.`}
                />
                <CardContent>
                    {(data?.shared_contributions || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)' }}>
                            <Database size={40} weight="duotone" style={{ marginBottom: '0.5rem' }} />
                            <p>No datasets have been contributed yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {data.shared_contributions.map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.7rem 0.95rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 700 }}>{item.dataset_name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>
                                            Contributed by {item.contributed_by} · {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <Badge variant={item.has_data_file ? 'success' : 'neutral'}>
                                        {item.has_data_file ? 'file attached' : 'metadata only'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default CollaborationWorkspace;
