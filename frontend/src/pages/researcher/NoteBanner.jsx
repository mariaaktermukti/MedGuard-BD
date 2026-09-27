import React, { useState } from 'react';
import { Info, CaretDown, CaretUp } from '@phosphor-icons/react';

const NoteBanner = ({ note }) => {
    const [expanded, setExpanded] = useState(false);
    if (!note) return null;

    return (
        <div style={{ marginBottom: '0.5rem' }}>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
            >
                <Info size={16} color="var(--primary)" />
                <span>{expanded ? 'Hide methodology & privacy note' : 'View methodology & privacy note'}</span>
                {expanded ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </button>

            {expanded && (
                <div
                    className="animate-fade-in"
                    style={{
                        marginTop: '0.5rem',
                        padding: '0.85rem 1.1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        fontSize: '0.85rem',
                        lineHeight: 1.55,
                        boxShadow: 'var(--shadow-sm)'
                    }}
                >
                    {note}
                </div>
            )}
        </div>
    );
};

export default NoteBanner;

