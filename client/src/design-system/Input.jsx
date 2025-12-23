import React from 'react';
import './theme.css';

const Input = ({ value, onChange, placeholder, type = 'text', className = '', ...props }) => {
    const style = {
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--surface-light)',
        backgroundColor: 'var(--surface-dark)',
        color: 'var(--text-primary)',
        fontSize: 'var(--font-size-base)',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        ...props.style
    };

    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`ds-input ${className}`}
            style={style}
            {...props}
        />
    );
};

export default Input;
