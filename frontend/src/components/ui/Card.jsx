import React from 'react';

const Card = ({ children, className = '', padding = 'lg', ...props }) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return '0';
      case 'sm': return 'var(--spacing-sm)';
      case 'md': return 'var(--spacing-md)';
      case 'lg': return 'var(--spacing-lg)';
      default: return 'var(--spacing-lg)';
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: getPadding(),
        display: 'flex',
        flexDirection: 'column',
      }}
      className={`ui-card ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, title, subtitle, action, className = '' }) => (
  <div style={{ marginBottom: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} className={className}>
    <div>
      {title && <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h3>}
      {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
      {children}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardContent = ({ children, className = '' }) => (
  <div style={{ flex: 1 }} className={className}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center' }} className={className}>
    {children}
  </div>
);

export default Card;
