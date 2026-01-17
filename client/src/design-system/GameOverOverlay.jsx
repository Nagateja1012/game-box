import React, { useEffect } from 'react';
import PlayerAvatar from './PlayerAvatar';
import Button from './Button';
import { soundManager } from '../utils/soundManager';
import { socket } from '../socket';

export default function GameOverOverlay({
    winner,
    players = [],
    scores = {}, // { playerId: value }
    onRestart,
    onVote,
    onClose,
    onLeave,
    isHost = false,
    meUserId,
    title = "WINNER!",
    scoreLabel = "SCORE",
    sortOrder = 'asc' // 'asc' for Uno, 'desc' for Bingo
}) {
    // Sort players by score
    const sortedPlayers = [...players]
        .map(p => {
            const score = scores[p.userId];
            // Handle complex score objects (e.g. Bingo) or simple numbers
            const rawScore = (score && typeof score === 'object') ? score.primary : (score || 0);
            const displayScore = (score && typeof score === 'object') ? score.display : (score || 0);
            return { ...p, rawScore, displayScore };
        })
        .sort((a, b) => {
            if (sortOrder === 'asc') {
                return a.rawScore - b.rawScore;
            } else {
                return b.rawScore - a.rawScore;
            }
        });

    // Play hover sound helper
    const handleHover = () => {
        soundManager.playHover();
    };

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
                    <div className="winner-section" style={{
                        marginBottom: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px'
                    }}>
                        {players.some(p => p.name === winner.name) && <PlayerAvatar name={winner.name} size="lg" />}
                        <h2 style={{ fontSize: '2rem', margin: 0 }}>{winner.name}</h2>
                    </div>
                )}

                <div className="scores-board" style={{
                    margin: '20px 0',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '20px',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    maxHeight: '35vh',
                    overflowY: 'auto'
                }}>
                    {scoreLabel && scoreLabel !== 'NONE' && (
                        <h3 style={{ marginBottom: '15px', opacity: 0.7 }}>{scoreLabel}</h3>
                    )}
                    {sortedPlayers.map((p, i) => (
                        <div key={p.userId || p.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 0',
                            borderBottom: i === sortedPlayers.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            fontWeight: (Object.keys(scores).length > 0 && i === 0) ? 'bold' : 'normal',
                            color: (Object.keys(scores).length > 0 && i === 0) ? '#f1c40f' : '#fff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {Object.keys(scores).length > 0 && (
                                    <span style={{ opacity: 0.5, fontSize: '0.9rem', minWidth: '25px' }}>#{i + 1}</span>
                                )}
                                <PlayerAvatar name={p.name} size="sm" />
                                <span style={{ fontSize: '1.1rem' }}>{p.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                {Object.keys(scores).length > 0 && (
                                    <span style={{ fontSize: '1.1rem' }}>{p.displayScore}</span>
                                )}
                                {p.wantsRematch && (
                                    <div style={{
                                        color: '#4ade80',
                                        background: 'rgba(74, 222, 128, 0.1)',
                                        padding: '4px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(74, 222, 128, 0.3)'
                                    }} title="Voted to Play Again">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                )}
                                {p.declinedRematch && (
                                    <div style={{
                                        color: '#f43f5e',
                                        background: 'rgba(244, 63, 94, 0.1)',
                                        padding: '4px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(244, 63, 94, 0.3)'
                                    }} title="Declined Play Again">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="actions" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '30px',
                    alignItems: 'center'
                }}>
                    {onVote && (
                        <Button
                            variant="primary"
                            disabled={players.find(p => p.userId === meUserId)?.wantsRematch}
                            style={{
                                width: '240px',
                                padding: '12px',
                                fontSize: '1.1rem',
                                background: players.find(p => p.userId === meUserId)?.wantsRematch ? '#4ade80' : 'var(--primary-color)'
                            }}
                            onClick={() => {
                                soundManager.playClick();
                                onVote();
                            }}
                            onMouseEnter={handleHover}
                        >
                            {players.find(p => p.userId === meUserId)?.wantsRematch ? 'WAITING FOR OTHERS...' : 'PLAY AGAIN'}
                        </Button>
                    )}

                    {isHost && onClose && (
                        <Button
                            variant="primary"
                            style={{
                                width: '240px',
                                border: '2px solid #ff5555',
                                background: 'rgba(255, 85, 85, 0.15)',
                                color: '#ff5555'
                            }}
                            onClick={() => {
                                soundManager.playClick();
                                onClose();
                            }}
                            onMouseEnter={handleHover}
                        >
                            CLOSE GAME
                        </Button>
                    )}

                    {onLeave && (
                        <Button
                            variant="secondary"
                            style={{ width: '240px' }}
                            onClick={() => {
                                soundManager.playClick();
                                onLeave();
                            }}
                            onMouseEnter={handleHover}
                        >
                            BACK TO LOBBY
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
