import React from 'react';

export default function PlayerAvatar({ name, size = 'md', isTurn = false, isEliminated = false, style = {} }) {
    const sizeMap = {
        sm: '20px',
        md: '30px',
        lg: '50px'
    };

    const actualSize = sizeMap[size] || size;

    return (
        <div
            className={`player-avatar ${isTurn ? 'is-turn' : ''} ${isEliminated ? 'is-eliminated' : ''}`}
            style={{
                width: actualSize,
                height: actualSize,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary-color, #6366f1), var(--secondary-color, #06b6d4))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: size === 'lg' ? '1.25rem' : '0.7rem',
                fontWeight: '800',
                color: '#fff',
                border: isTurn ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                boxShadow: isTurn ? '0 0 10px var(--primary-color, rgba(99, 102, 241, 0.6))' : 'none',
                transition: 'all 0.3s ease',
                opacity: isEliminated ? 0.4 : 1,
                ...style
            }}
        >
            {name?.[0]?.toUpperCase() || '?'}
        </div>
    );
}
