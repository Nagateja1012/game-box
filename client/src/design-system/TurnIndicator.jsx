import React from 'react';
import './theme.css';

const TurnIndicator = ({ isMyTurn, playerName, className = '', ...props }) => {
    const style = {
        padding: '10px 30px',
        borderRadius: '50px',
        backgroundColor: isMyTurn ? 'var(--success-color)' : 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        border: isMyTurn ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
        boxShadow: isMyTurn ? '0 0 15px var(--success-color)' : '0 4px 20px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        display: 'inline-block',
        ...props.style
    };

    return (
        <div className={`ds-turn-indicator ${className}`} style={style} {...props}>
            {isMyTurn ? 'Your Turn' : `${playerName}'s Turn`}
        </div>
    );
};

export default TurnIndicator;
