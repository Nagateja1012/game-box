import React from 'react';

export default function Card({ card, onClick, playable, size = 'normal' }) {
    if (!card) return <div className={`uno-card back ${size}`}><span>UNO</span></div>;

    const { color, value, type } = card;

    const displayValue = () => {
        if (type === 'NUMBER') return value;
        if (value === 'SKIP') return '⊘';
        if (value === 'REVERSE') return '⇄';
        if (value === 'DRAW_TWO') return '+2';
        if (value === 'WILD') return '🌈';
        if (value === 'WILD_DRAW_FOUR') return '+4';
        return value;
    };

    return (
        <div
            className={`uno-card ${color.toLowerCase()} ${playable ? 'playable' : ''} ${size}`}
            onClick={onClick}
        >
            <div className="card-inner">
                <span className="card-value top">{displayValue()}</span>
                <div className="card-center">{displayValue()}</div>
                <span className="card-value bottom">{displayValue()}</span>
            </div>
        </div>
    );
}
