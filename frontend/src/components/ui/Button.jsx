import React from 'react';

const Button = React.forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  fullWidth = false,
  disabled = false,
  style = {},
  ...props 
}, ref) => {
  
  const getStyle = () => {
    let base = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      fontFamily: 'inherit',
      borderRadius: '10px',
      transition: 'all 0.15s ease-in-out',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : 'auto',
      outline: 'none',
      gap: '0.5rem',
      userSelect: 'none',
      border: '1px solid transparent',
      textDecoration: 'none',
      boxSizing: 'border-box'
    };

    // Sizes (Shadcn Standards)
    if (size === 'xs') {
      base.padding = '0.35rem 0.65rem';
      base.fontSize = '0.775rem';
      base.borderRadius = '6px';
    } else if (size === 'sm') {
      base.padding = '0.5rem 0.85rem';
      base.fontSize = '0.85rem';
      base.borderRadius = '8px';
    } else if (size === 'lg') {
      base.padding = '0.85rem 1.6rem';
      base.fontSize = '1rem';
      base.borderRadius = '12px';
    } else if (size === 'icon') {
      base.padding = '0.5rem';
      base.width = '38px';
      base.height = '38px';
      base.borderRadius = '8px';
    } else {
      base.padding = '0.65rem 1.25rem';
      base.fontSize = '0.925rem';
      base.borderRadius = '10px';
    }

    // Variants (Shadcn Palette)
    if (variant === 'primary' || variant === 'default') {
      base.backgroundColor = 'var(--primary)';
      base.color = '#FFFFFF';
      base.boxShadow = disabled ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.2)';
    } else if (variant === 'secondary') {
      base.backgroundColor = 'var(--primary-light)';
      base.color = 'var(--primary)';
      base.borderColor = 'rgba(5, 150, 105, 0.15)';
    } else if (variant === 'outline') {
      base.backgroundColor = 'var(--bg-card)';
      base.color = 'var(--text-main)';
      base.borderColor = 'var(--border)';
      base.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
    } else if (variant === 'danger' || variant === 'destructive') {
      base.backgroundColor = 'var(--danger)';
      base.color = '#FFFFFF';
      base.boxShadow = disabled ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.2)';
    } else if (variant === 'ghost') {
      base.backgroundColor = 'transparent';
      base.color = 'var(--text-main)';
      base.borderColor = 'transparent';
    } else if (variant === 'link') {
      base.backgroundColor = 'transparent';
      base.color = 'var(--primary)';
      base.borderColor = 'transparent';
      base.padding = '0';
    }

    return { ...base, ...style };
  };

  return (
    <button
      ref={ref}
      className={`ui-btn ui-btn-${variant} ${className}`}
      style={getStyle()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
