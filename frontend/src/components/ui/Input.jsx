import React from 'react';

const Input = React.forwardRef(({ label, error, type = 'text', className = '', fullWidth = true, ...props }, ref) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)', width: fullWidth ? '100%' : 'auto' }} className={className}>
      {label && (
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>
          {label} {props.required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      
      {type === 'textarea' ? (
        <textarea
          ref={ref}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            fontSize: '1rem',
            minHeight: '100px',
            resize: 'vertical',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)'
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'var(--shadow-sm)';
            }
          }}
          {...props}
        />
      ) : type === 'select' ? (
        <select
          ref={ref}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            fontSize: '1rem',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            backgroundSize: '1.25rem'
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'var(--shadow-sm)';
            }
          }}
          {...props}
        >
          {props.children}
        </select>
      ) : (
        <input
          type={type}
          ref={ref}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-main)',
            fontFamily: 'inherit',
            fontSize: '1rem',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)'
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--primary)';
              e.target.style.boxShadow = '0 0 0 3px var(--primary-light)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'var(--shadow-sm)';
            }
          }}
          {...props}
        />
      )}
      
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
