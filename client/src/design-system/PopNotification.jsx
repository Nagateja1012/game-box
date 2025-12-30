import React from 'react';
import './theme.css';

/**
 * A reusable pop-up notification component that appears in the center of the screen
 * with a 'popIn' animation.
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the notification
 * @param {string} props.text - The message to display
 * @param {string} props.color - Background color (default: error-color)
 * @param {string} props.className - Additional CSS classes
 */
const PopNotification = ({ show, text, color = 'var(--error-color)', className = '', ...props }) => {
    if (!show) return null;

    const style = {
        background: color,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '10px 20px',
        borderRadius: '30px',
        whiteSpace: 'nowrap',
        fontWeight: '600',
        fontSize: '1.1rem',
        color: 'white',
        border: '2px solid white',
        boxShadow: `0 0 50px ${color.includes('--') ? color : 'rgba(0, 0, 0, 0.5)'}`,
        zIndex: 1000,
        animation: 'unoPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none',
        ...props.style
    };

    return (
        <div className={`ds-pop-notification ${className}`} style={style} {...props}>
            {text}
        </div>
    );
};

export default PopNotification;
