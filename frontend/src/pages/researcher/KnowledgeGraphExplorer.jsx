import React, { useCallback, useEffect, useState } from 'react';
import { Graph, WarningCircle } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import NoteBanner from './NoteBanner';

const WIDTH = 640;
const HEIGHT = 420;

/** Lays nodes out on a circle, with the seed node pinned to the centre.
 *  Deterministic, dependency-free, and adequate for the small graphs here. */
const layoutNodes = (nodes, seedKey) => {
    const positioned = {};
    const ring = nodes.filter((node) => node.key !== seedKey);
    const seed = nodes.find((node) => node.key === seedKey);

    if (seed) positioned[seed.key] = { x: WIDTH / 2, y: HEIGHT / 2 };

    const radius = Math.min(WIDTH, HEIGHT) / 2 - 70;
    ring.forEach((node, index) => {
        const angle = (2 * Math.PI * index) / Math.max(ring.length, 1) - Math.PI / 2;
        positioned[node.key] = {
            x: WIDTH / 2 + radius * Math.cos(angle),
            y: HEIGHT / 2 + radius * Math.sin(angle),
        };
    });
    return positioned;
};

const GraphCanvas = ({ nodes, edges, seedKey }) => {
    if (nodes.length === 0) return null;
    const positions = layoutNodes(nodes, seedKey);
    const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight));

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', minWidth: '340px', height: 'auto' }} role="img" aria-label="Knowledge graph">
                {edges.map((edge) => {
                    const from = positions[edge.source];
                    const to = positions[edge.target];
                    if (!from || !to) return null;
                    return (
                        <g key={edge.id}>
                            <line
                                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                                stroke="var(--border)"
                                strokeWidth={1 + (edge.weight / maxWeight) * 3}
                            />
                            <text
                                x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}
                                fontSize="9" fill="var(--text-muted)" textAnchor="middle"
                            >
                                {edge.relation} ({edge.weight})
                            </text>
                        </g>
                    );
                })}
                {nodes.map((node) => {
                    const position = positions[node.key];
                    if (!position) return null;
                    const isSeed = node.key === seedKey;
                    return (
                        <g key={node.key}>
                            <circle
                                cx={position.x} cy={position.y} r={isSeed ? 13 : 9}
                                fill={node.resolvable ? 'var(--primary)' : 'var(--warning)'}
                                stroke="var(--bg-card)" strokeWidth="2"
                            />
                            <text
                                x={position.x} y={position.y - (isSeed ? 20 : 16)}
                                fontSize="11" fontWeight="600" fill="var(--text-main)" textAnchor="middle"
                            >
                                {node.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const KnowledgeGraphExplorer = () => {
    const [mode, setMode] = useState('stored');
    const [seeds, setSeeds] = useState([]);
    const [storedEdgeCount, setStoredEdgeCount] = useState(0);
    const [selectedSeed, setSelectedSeed] = useState('');
    const [depth, setDepth] = useState(2);
    const [minShared, setMinShared] = useState(1);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSeeds = async () => {
            try {
                const response = await api.get('researcher/knowledge-graph/seeds/');
                setSeeds(response.data.seeds);
                setStoredEdgeCount(response.data.stored_edge_count);
                if (response.data.seeds.length) setSelectedSeed(response.data.seeds[0].key);
            } catch (error) {
                console.error('Failed to load graph seeds:', error);
            }
        };
        loadSeeds();
    }, []);

    const loadGraph = useCallback(async () => {
        setLoading(true);
        try {
            if (mode === 'derived') {
                const response = await api.get('researcher/knowledge-graph/derived/', { params: { min_shared: minShared } });
                setGraph({ nodes: response.data.nodes, edges: response.data.edges });
                setNote(response.data.note);
            } else {
                if (!selectedSeed) {
                    setGraph({ nodes: [], edges: [] });
                    setLoading(false);
                    return;
                }
                const [nodeType, nodeId] = selectedSeed.split(':');
                const response = await api.get('researcher/knowledge-graph/explore/', {
                    params: { node_type: nodeType, node_id: nodeId, depth },
                });
                setGraph({ nodes: response.data.nodes, edges: response.data.edges });
                setNote(response.data.note);
            }
        } catch (error) {
            console.error('Failed to load knowledge graph:', error);
        } finally {
            setLoading(false);
        }
    }, [mode, selectedSeed, depth, minShared]);

    useEffect(() => { loadGraph(); }, [loadGraph]);

    const unresolvable = graph.nodes.filter((node) => !node.resolvable);
    const controlStyle = { padding: '0.55rem 0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={note} />

            <Card>
                <CardHeader
                    title={mode === 'stored' ? 'Stored KnowledgeEdge graph' : 'Derived co-occurrence graph'}
                    subtitle={
                        mode === 'stored'
                            ? `${storedEdgeCount} edge${storedEdgeCount === 1 ? '' : 's'} stored in the KnowledgeEdge table.`
                            : 'Computed live from ADR reports — two medicines are linked when the same subject has reports for both.'
                    }
                    action={
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <select value={mode} onChange={(e) => setMode(e.target.value)} style={controlStyle}>
                                <option value="stored">Stored edges</option>
                                <option value="derived">Derived from ADR data</option>
                            </select>
                            {mode === 'stored' ? (
                                <>
                                    <select value={selectedSeed} onChange={(e) => setSelectedSeed(e.target.value)} style={controlStyle}>
                                        {seeds.length === 0 && <option value="">No stored nodes</option>}
                                        {seeds.map((seed) => (
                                            <option key={seed.key} value={seed.key}>{seed.label}</option>
                                        ))}
                                    </select>
                                    <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} style={controlStyle}>
                                        <option value={1}>Depth 1</option>
                                        <option value={2}>Depth 2</option>
                                        <option value={3}>Depth 3</option>
                                    </select>
                                </>
                            ) : (
                                <select value={minShared} onChange={(e) => setMinShared(Number(e.target.value))} style={controlStyle}>
                                    <option value={1}>Min 1 shared subject</option>
                                    <option value={2}>Min 2 shared subjects</option>
                                    <option value={3}>Min 3 shared subjects</option>
                                </select>
                            )}
                        </div>
                    }
                />
                <CardContent>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Building graph...</p>
                    ) : graph.nodes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <Graph size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>
                                {mode === 'stored'
                                    ? 'The KnowledgeEdge table is empty. Nothing in this project writes to it, so edges must be added through the Django admin.'
                                    : 'No medicine co-occurrence found — no subject has ADR reports for more than one medicine.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <GraphCanvas nodes={graph.nodes} edges={graph.edges} seedKey={mode === 'stored' ? selectedSeed : null} />
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                <span>{graph.nodes.length} nodes</span>
                                <span>{graph.edges.length} edges</span>
                                {unresolvable.length > 0 && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning)' }}>
                                        <WarningCircle size={15} /> {unresolvable.length} node(s) have no backing table and cannot be named
                                    </span>
                                )}
                            </div>
                            {unresolvable.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                    {unresolvable.map((node) => (
                                        <Badge key={node.key} variant="warning">{node.label} — unresolvable</Badge>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default KnowledgeGraphExplorer;
