import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  fullWidth = false,
  disabled = false,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] focus:ring-[var(--primary)] border border-transparent",
    secondary: "bg-[var(--secondary)] text-white hover:bg-[var(--secondary-hover)] focus:ring-[var(--secondary)] border border-transparent",
    outline: "bg-transparent text-[var(--text-main)] border border-[var(--border)] hover:border-[var(--primary)] hover:text-[var(--primary)] focus:ring-[var(--primary)]",
    danger: "bg-[var(--danger)] text-white hover:bg-red-600 focus:ring-red-500 border border-transparent",
    ghost: "bg-transparent text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] focus:ring-[var(--primary)]"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  };

  // Polyfill styles via inline since we're replacing the legacy CSS classes
  const getStyle = () => {
    let style = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '500',
      borderRadius: 'var(--radius-md)',
      transition: 'all 0.2s',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : 'auto',
      border: '1px solid transparent'
    };

    if (size === 'sm') {
      style.padding = '0.5rem 0.75rem';
      style.fontSize = '0.875rem';
    } else if (size === 'lg') {
      style.padding = '1rem 1.5rem';
      style.fontSize = '1.125rem';
    } else {
      style.padding = '0.75rem 1.25rem';
      style.fontSize = '1rem';
    }

    if (variant === 'primary') {
      style.backgroundColor = 'var(--primary)';
      style.color = '#fff';
    } else if (variant === 'secondary') {
      style.backgroundColor = 'var(--secondary)';
      style.color = '#fff';
    } else if (variant === 'danger') {
      style.backgroundColor = 'var(--danger)';
      style.color = '#fff';
    } else if (variant === 'outline') {
      style.backgroundColor = 'transparent';
      style.color = 'var(--text-main)';
      style.borderColor = 'var(--border)';
    }

    return style;
  };

  return (
    <button
      className={`ui-btn ui-btn-${variant} ${className}`}
      style={getStyle()}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
