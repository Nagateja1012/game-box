import React from 'react';
import PlayerAvatar from './PlayerAvatar';

export default function GameOverOverlay({
    winner,
    players = [],
    scores = {}, // { playerId: value }
    actions,
    title = "WINNER!"
}) {
    // Sort players by score (ascending usually for card games where points are bad, or descending for others)
    // For now, let's just use the players array provided or derive from scores
    const sortedPlayers = [...players]
        .map(p => ({ ...p, score: scores[p.id] || 0 }))
        .sort((a, b) => a.score - b.score);

    return (
        <div className="modal-overlay game-over-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
            color: '#fff',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            <div className="overlay-content" style={{
                textAlign: 'center',
                width: '100%',
                maxWidth: '500px',
                padding: '20px'
            }}>
                <h1 style={{
                    fontSize: '4rem',
                    marginBottom: '20px',
                    color: '#f1c40f',
                    textShadow: '0 0 20px rgba(241, 196, 15, 0.5)'
                }}>{title}</h1>

                {winner && (
                    <div className="winner-section" style={{ marginBottom: '40px' }}>
                        <PlayerAvatar name={winner.name} size="lg" style={{ margin: '0 auto 15px' }} />
                        <h2 style={{ fontSize: '2rem' }}>{winner.name}</h2>
                    </div>
                )}

                {Object.keys(scores).length > 0 && (
                    <div className="scores-board" style={{
                        margin: '20px 0',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '20px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ marginBottom: '15px', opacity: 0.7 }}>SCORES</h3>
                        {sortedPlayers.map((p, i) => (
                            <div key={p.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 0',
                                borderBottom: i === sortedPlayers.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                fontWeight: i === 0 ? 'bold' : 'normal',
                                color: i === 0 ? '#f1c40f' : '#fff'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ opacity: 0.5 }}>#{i + 1}</span>
                                    <span>{p.name}</span>
                                </div>
                                <span>{p.score}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="actions" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginTop: '30px',
                    alignItems: 'center'
                }}>
                    {actions}
                </div>
            </div>
        </div>
    );
}
