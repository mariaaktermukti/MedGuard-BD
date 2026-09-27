import React from 'react';
import { CheckCircle, Warning, ShieldWarning, Info, X } from '@phosphor-icons/react';
import Button from './Button';

const toneConfig = {
    success: {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
        glow: 'rgba(16, 185, 129, 0.3)',
        Icon: CheckCircle,
        defaultTitle: 'Action Confirmed',
    },
    warning: {
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
        glow: 'rgba(245, 158, 11, 0.3)',
        Icon: Warning,
        defaultTitle: 'Notice / Warning',
    },
    danger: {
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
        glow: 'rgba(239, 68, 68, 0.3)',
        Icon: ShieldWarning,
        defaultTitle: 'Attention Required',
    },
    info: {
        color: 'var(--primary)',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: 'rgba(59, 130, 246, 0.25)',
        glow: 'rgba(59, 130, 246, 0.3)',
        Icon: Info,
        defaultTitle: 'System Notification',
    },
};

const ConfirmationModal = ({
    isOpen,
    onClose,
    title,
    message,
    tone = 'success',
    details = null,
    confirmText = 'OK',
    onConfirm,
    cancelText = null,
    onCancel,
    autoCloseMs = null,
}) => {
    React.useEffect(() => {
        if (isOpen && autoCloseMs) {
            const timer = setTimeout(() => {
                if (onClose) onClose();
            }, autoCloseMs);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoCloseMs, onClose]);

    if (!isOpen) return null;

    const currentTone = toneConfig[tone] || toneConfig.success;
    const { Icon, color, bg, border, glow, defaultTitle } = currentTone;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        if (onClose) onClose();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        if (onClose) onClose();
    };

    // Format details object or array
    let detailsEntries = [];
    if (details) {
        if (Array.isArray(details)) {
            detailsEntries = details;
        } else if (typeof details === 'object') {
            detailsEntries = Object.entries(details).map(([k, v]) => ({ label: k, value: v }));
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.25rem',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '480px',
                    borderRadius: '1.25rem',
                    background: 'var(--bg-card, #ffffff)',
                    border: `1px solid ${border}`,
                    boxShadow: `0 20px 40px -15px ${glow}, 0 10px 25px rgba(0, 0, 0, 0.2)`,
                    overflow: 'hidden',
                    animation: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    display: 'grid',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Glowing Border */}
                <div style={{ height: '4px', background: color, width: '100%' }} />

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.35rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Content */}
                <div style={{ padding: '1.75rem 1.75rem 1.5rem', textAlign: 'center' }}>
                    {/* Icon Badge */}
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: bg,
                            color: color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                            boxShadow: `0 0 20px ${glow}`,
                        }}
                    >
                        <Icon size={36} weight="duotone" />
                    </div>

                    {/* Title & Message */}
                    <h3
                        style={{
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            margin: '0 0 0.5rem',
                            color: 'var(--text-main)',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title || defaultTitle}
                    </h3>
                    {message && (
                        <p
                            style={{
                                margin: '0 0 1.25rem',
                                color: 'var(--text-muted)',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                            }}
                        >
                            {message}
                        </p>
                    )}

                    {/* Key-Value Details Box */}
                    {detailsEntries.length > 0 && (
                        <div
                            style={{
                                background: 'var(--bg-input, rgba(0,0,0,0.03))',
                                border: '1px solid var(--border)',
                                borderRadius: '0.75rem',
                                padding: '0.85rem 1rem',
                                margin: '0 0 1.5rem',
                                textAlign: 'left',
                                display: 'grid',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                            }}
                        >
                            {detailsEntries.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                                        {item.label}:
                                    </span>
                                    <span style={{ color: 'var(--text-main)', fontWeight: 700, textAlign: 'right' }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            justifyContent: 'center',
                            marginTop: '0.5rem',
                        }}
                    >
                        {cancelText && (
                            <Button
                                type="button"
                                variant="outline"
                                style={{ flex: 1 }}
                                onClick={handleCancel}
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant={tone === 'danger' ? 'danger' : 'primary'}
                            style={{ flex: 1 }}
                            onClick={handleConfirm}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
