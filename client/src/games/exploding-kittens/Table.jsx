import React from 'react';
import Card from './Card';
import PlayerAvatar from '../../design-system/PlayerAvatar';

export default function Table({
    gameState,
    myId,
    onDraw,
    isMyTurn
}) {
    const { players, deckCount, discardPile, turnsToTake, currentPlayerId, winner } = gameState;

    const opponents = players.filter(p => p.id !== myId);
    const topDiscard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

    return (
        <div className="ek-table">
            <div className="ek-opponents">
                {opponents.map(p => (
                    <div key={p.id} className={`ek-opponent ${p.id === currentPlayerId ? 'active' : ''} ${p.isEliminated ? 'eliminated' : ''}`}>
                        <PlayerAvatar
                            name={p.name}
                            isTurn={p.id === currentPlayerId}
                            isEliminated={p.isEliminated}
                            size="sm"
                        />
                        <div className="name">{p.name}</div>
                        <div className="card-count">🎴 {p.cardCount}</div>
                    </div>
                ))}
            </div>

            <div className="ek-center-area">
                <div className="ek-deck" onClick={isMyTurn ? onDraw : undefined}>
                    <div style={{ textAlign: 'center', color: '#fff', fontWeight: 'bold' }}>
                        DRAW<br />PILE<br />
                        <span style={{ fontSize: '1.5em' }}>{deckCount}</span>
                    </div>
                </div>

                <div className="ek-discard">
                    {topDiscard ? (
                        <Card card={topDiscard} />
                    ) : (
                        <div style={{ color: 'rgba(255,255,255,0.5)' }}>DISCARD</div>
                    )}
                </div>
            </div>

            <div className="ek-status-bar">
                {winner ? (
                    <div style={{ color: '#2ecc71', fontSize: '1.5em' }}>
                        🏆 {winner.name} WINS!
                    </div>
                ) : (
                    <>
                        <div>Current Turn: {players.find(p => p.id === currentPlayerId)?.name}</div>
                        {isMyTurn && <div>Turns to take: {turnsToTake}</div>}
                    </>
                )}
            </div>
        </div>
    );
}
