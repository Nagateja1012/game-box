import React from 'react';
import Card from './Card';

export default function PlayerHand({ hand, onPlay, isTurn, validMoves }) {
    return (
        <div className="player-hand">
            {hand.map((card) => {
                // Check if card is playable
                // We need to know if it's valid. 
                // The parent passes `validMoves` or we check locally?
                // Parent should pass `isPlayable` logic or we do it here?
                // Let's assume parent passes a function or we check against top card?
                // Actually, `validMoves` could be a set of card IDs or boolean.
                // Let's simplify: Parent handles validation on click, but for visual feedback
                // we might want to know.
                // For now, let's just render.

                return (
                    <Card
                        key={card.id}
                        card={card}
                        onClick={() => onPlay(card)}
                        playable={isTurn}
                    />
                );
            })}
        </div>
    );
}
