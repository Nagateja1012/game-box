import React from 'react';
import './theme.css';

const Card = ({ children, className = '', title, ...props }) => {
    const style = {
        backgroundColor: 'var(--surface-dark)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-md)',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        ...props.style
    };

    return (
        <div className={`ds-card ${className}`} style={style} {...props}>
            {title && <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>{title}</h3>}
            {children}
        </div>
    );
};

export default Card;
