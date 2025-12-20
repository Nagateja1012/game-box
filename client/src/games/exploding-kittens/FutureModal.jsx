import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from '../../design-system/Button';

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
                                    {index > 0 && <Button variant="secondary" style={{ padding: '2px 5px', fontSize: '0.8rem' }} onClick={() => moveCard(index, index - 1)}>⬅️</Button>}
                                    {index < orderedCards.length - 1 && <Button variant="secondary" style={{ padding: '2px 5px', fontSize: '0.8rem', marginLeft: 5 }} onClick={() => moveCard(index, index + 1)}>➡️</Button>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <Button variant="primary" className="ek-btn" onClick={handleConfirm}>
                    {isAlter ? 'Confirm Order' : 'Done'}
                </Button>
            </div>
        </div>
    );
}
