import React from 'react';
import Card from './Card';

export default function Hand({ cards, onPlayCard, isMyTurn }) {
    const [selectedCardId, setSelectedCardId] = React.useState(null);

    const handleCardClick = (card) => {
        if (!isMyTurn) return;

        if (selectedCardId === card.id) {
            // Play it
            onPlayCard(card.id);
            setSelectedCardId(null);
        } else {
            setSelectedCardId(card.id);
        }
    };

    return (
        <div className="ek-hand-container">
            <div className="ek-hand">
                {cards.map((card, index) => (
                    <div key={card.id} style={{ transform: `rotate(${(index - cards.length / 2) * 5}deg)` }}>
                        <Card
                            card={card}
                            isSelected={selectedCardId === card.id}
                            onClick={() => handleCardClick(card)}
                        />
                    </div>
                ))}
            </div>
            {isMyTurn && <div style={{ position: 'absolute', bottom: 10, color: '#fff' }}>
                {selectedCardId ? 'Click again to play' : 'Select a card'}
            </div>}
        </div>
    );
}
