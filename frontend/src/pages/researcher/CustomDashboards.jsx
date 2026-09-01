import React, { useCallback, useEffect, useState } from 'react';
import { SquaresFour, ArrowCounterClockwise } from '@phosphor-icons/react';
import api from '../../services/api';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import NoteBanner from './NoteBanner';

const STORAGE_KEY = 'medguard.researcher.dashboard';

const readSavedLayout = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch {
        return null;
    }
};

const saveLayout = (widgets) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch {
        // Storage can be unavailable (private mode); the dashboard still works.
    }
};

const StatWidget = ({ widget }) => (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '96px' }}>
        <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{widget.value}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>{widget.description}</div>
    </div>
);

const BarWidget = ({ widget }) => {
    const rows = widget.value || [];
    const max = Math.max(1, ...rows.map((row) => row.value));
    return (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
            {rows.length === 0 && <p style={{ color: 'var(--text-muted)', margin: 0 }}>No data yet.</p>}
            {rows.map((row) => (
                <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
                    <div style={{ background: 'var(--border)', borderRadius: '9999px', height: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${(row.value / max) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: '9999px' }} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
                </div>
            ))}
        </div>
    );
};

const LineWidget = ({ widget }) => {
    const rows = widget.value || [];
    if (rows.length === 0) return <p style={{ color: 'var(--text-muted)', margin: 0 }}>No data yet.</p>;

    const width = 520;
    const height = 140;
    const max = Math.max(1, ...rows.map((row) => row.value));
    const step = rows.length > 1 ? width / (rows.length - 1) : 0;
    const points = rows.map((row, index) => `${index * step},${height - (row.value / max) * (height - 20)}`).join(' ');

    return (
        <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${width} ${height + 22}`} style={{ width: '100%', minWidth: '320px', height: 'auto' }} role="img" aria-label={widget.label}>
                <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                {rows.map((row, index) => (
                    <circle key={row.label} cx={index * step} cy={height - (row.value / max) * (height - 20)} r="3.5" fill="var(--primary)" />
                ))}
                {rows.map((row, index) => (
                    <text key={`${row.label}-label`} x={index * step} y={height + 16} fontSize="9" fill="var(--text-muted)" textAnchor="middle">
                        {row.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

const renderWidget = (widget) => {
    if (widget.kind === 'stat') return <StatWidget widget={widget} />;
    if (widget.kind === 'line') return <LineWidget widget={widget} />;
    return <BarWidget widget={widget} />;
};

const CustomDashboards = () => {
    const [catalog, setCatalog] = useState([]);
    const [defaultLayout, setDefaultLayout] = useState([]);
    const [selected, setSelected] = useState(readSavedLayout() || []);
    const [widgets, setWidgets] = useState([]);
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const response = await api.get('researcher/dashboard/catalog/');
                setCatalog(response.data.metrics);
                setDefaultLayout(response.data.default_dashboard);
                setSelected((current) => (current.length ? current : response.data.default_dashboard));
            } catch (error) {
                console.error('Failed to load dashboard catalog:', error);
            }
        };
        loadCatalog();
    }, []);

    const loadWidgets = useCallback(async (ids) => {
        if (!ids.length) {
            setWidgets([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get('researcher/dashboard/', { params: { widgets: ids.join(',') } });
            setWidgets(response.data.widgets);
            setNote(response.data.note);
        } catch (error) {
            console.error('Failed to load dashboard widgets:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWidgets(selected);
    }, [selected, loadWidgets]);

    const toggle = (metricId) => {
        const next = selected.includes(metricId)
            ? selected.filter((item) => item !== metricId)
            : [...selected, metricId];
        setSelected(next);
        saveLayout(next);
    };

    const resetLayout = () => {
        setSelected(defaultLayout);
        saveLayout(defaultLayout);
    };

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            <NoteBanner note={note} />

            <Card>
                <CardHeader
                    title="Choose your widgets"
                    subtitle="Your selection is remembered in this browser."
                    action={
                        <button
                            type="button"
                            onClick={resetLayout}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                            <ArrowCounterClockwise size={16} /> Reset
                        </button>
                    }
                />
                <CardContent>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
                        {catalog.map((metric) => (
                            <label
                                key={metric.id}
                                style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', cursor: 'pointer' }}
                            >
                                <input type="checkbox" checked={selected.includes(metric.id)} onChange={() => toggle(metric.id)} style={{ marginTop: '0.2rem' }} />
                                <span>
                                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{metric.label}</span>
                                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>{metric.description}</span>
                                </span>
                            </label>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Computing metrics...</p>
            ) : widgets.length === 0 ? (
                <Card>
                    <CardContent>
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                            <SquaresFour size={44} weight="duotone" style={{ marginBottom: '0.6rem' }} />
                            <p>No widgets selected — tick one above to build your dashboard.</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                    {widgets.map((widget) => (
                        <Card key={widget.id}>
                            <CardHeader title={widget.label} />
                            <CardContent>{renderWidget(widget)}</CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomDashboards;
