import React from 'react';

const CARD_ICONS = {
    'EXPLODING_KITTEN': '💣',
    'DEFUSE': '🔧',
    'ATTACK': '⚔️',
    'SKIP': '⏭️',
    'FAVOR': '🤲',
    'SHUFFLE': '🔀',
    'SEE_FUTURE': '👁️',
    'ALTER_FUTURE': '🔮',
    'NOPE': '⛔',
    'TACOCAT': '🌮',
    'CATTERMELON': '🍉',
    'HAIRY_POTATO_CAT': '🥔',
    'BEARD_CAT': '🧔',
    'RAINBOW_RALPHING_CAT': '🌈'
};

export default function Card({ card, onClick, isSelected, style }) {
    const typeClass = `card-${card.type}`;

    return (
        <div
            className={`ek-card ${typeClass} ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
            style={style}
        >
            <div className="ek-card-inner">
                <div className="ek-card-title">{card.name}</div>
                <div className="ek-card-image">{CARD_ICONS[card.key] || '❓'}</div>
                <div className="ek-card-desc">{card.desc}</div>
            </div>
        </div>
    );
}
