import React from 'react';
import './theme.css';

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '', style, ...props }) => {
  const baseStyle = {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 'var(--font-size-base)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
    backgroundColor: variant === 'primary' ? 'var(--primary-color)' :
      variant === 'secondary' ? 'var(--secondary-color)' : 'var(--surface-light)',
    color: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    ...style
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ds-button ${className}`}
      style={baseStyle}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
