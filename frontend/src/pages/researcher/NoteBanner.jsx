import React from 'react';
import { Info } from '@phosphor-icons/react';

/**
 * Honest-disclosure banner.
 *
 * Used across the Researcher Portal to state plainly what a feature really
 * computes and what it does not. Mirrors how the Distributor Portal surfaces
 * the `note` field returned by its own analytical endpoints.
 */
const NoteBanner = ({ note, tone = 'warning' }) => {
    if (!note) return null;

    return (
        <div
            className="glass-panel"
            style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                borderLeft: `4px solid var(--${tone})`,
            }}
        >
            <Info size={20} color={`var(--${tone})`} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.55 }}>{note}</p>
        </div>
    );
};

export default NoteBanner;
