import React, { useState, useEffect } from 'react';
import Card from './Card';

export default function FutureModal({ cards, isAlter, onClose, onReorder }) {
    const [orderedCards, setOrderedCards] = useState([...cards]);

    useEffect(() => {
        setOrderedCards([...cards]);
    }, [cards]);

    const moveCard = (fromIndex, toIndex) => {
        if (!isAlter) return;
        const newCards = [...orderedCards];
        const [moved] = newCards.splice(fromIndex, 1);
        newCards.splice(toIndex, 0, moved);
        setOrderedCards(newCards);
    };

    const handleConfirm = () => {
        if (isAlter) {
            onReorder(orderedCards);
        } else {
            onClose();
        }
    };

    return (
        <div className="ek-modal-overlay">
            <div className="ek-modal">
                <h2>{isAlter ? 'Alter the Future' : 'See the Future'}</h2>
                <p>{isAlter ? 'Drag to reorder (Click L/R)' : 'These are the top 3 cards'}</p>

                <div className="ek-future-cards">
                    {orderedCards.map((card, index) => (
                        <div key={card.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Card card={card} />
                            {isAlter && (
                                <div style={{ marginTop: 5 }}>
                                    {index > 0 && <button onClick={() => moveCard(index, index - 1)}>⬅️</button>}
                                    {index < orderedCards.length - 1 && <button onClick={() => moveCard(index, index + 1)}>➡️</button>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button className="ek-btn" onClick={handleConfirm}>
                    {isAlter ? 'Confirm Order' : 'Done'}
                </button>
            </div>
        </div>
    );
}
