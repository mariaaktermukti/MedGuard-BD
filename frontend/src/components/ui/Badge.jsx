import React from 'react';

const Badge = ({ children, variant = 'info', className = '', ...props }) => {
  const getStyle = () => {
    let base = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
    };

    switch (variant) {
      case 'success':
        return { ...base, backgroundColor: 'var(--success)', color: '#fff' };
      case 'warning':
        return { ...base, backgroundColor: 'var(--warning)', color: '#fff' };
      case 'danger':
        return { ...base, backgroundColor: 'var(--danger)', color: '#fff' };
      case 'info':
      case 'primary':
        return { ...base, backgroundColor: 'var(--primary-light)', color: 'var(--secondary)' };
      case 'neutral':
      default:
        return { ...base, backgroundColor: 'var(--border)', color: 'var(--text-muted)' };
    }
  };

  return (
    <span style={getStyle()} className={`ui-badge ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
