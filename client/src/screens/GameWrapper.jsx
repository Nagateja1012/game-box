import React, { useState } from 'react';
import { socket } from '../socket';
import { GAME_METADATA } from '../games/registry';

export default function GameWrapper({ room, me, children }) {
    const [showRules, setShowRules] = useState(false);
    const isHost = room.players.find(p => p.id === me.id)?.isHost;
    const gameMeta = GAME_METADATA[room.game.id];

    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const handleExit = () => {
        setShowExitConfirmation(true);
    };

    const confirmExit = () => {
        socket.emit('leave_game', { roomId: room.id });
        setShowExitConfirmation(false);
    };

    return (
        <div className="game-wrapper">
            <div className="game-toolbar">
                <button className="btn-icon exit-btn" onClick={handleExit}>
                    LEAVE
                </button>
                <h3 className="game-title">{gameMeta?.name}</h3>
                <button className="btn-icon info-btn" onClick={() => setShowRules(true)}>
                    INFO
                </button>
            </div>

            <div className="game-area">
                {children}
            </div>

            {showRules && (
                <div className="modal-overlay" onClick={() => setShowRules(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{gameMeta?.name} Rules</h2>
                        <ul>
                            {gameMeta?.rules?.map((rule, i) => (
                                <li key={i}>{rule}</li>
                            ))}
                        </ul>
                        <button className="btn btn-primary" onClick={() => setShowRules(false)}>
                            GOT IT
                        </button>
                    </div>
                </div>
            )}

            {showExitConfirmation && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 2000
                }}>
                    <div className="modal-content" style={{
                        background: '#2a2a2a',
                        padding: '30px',
                        borderRadius: '15px',
                        maxWidth: '400px',
                        textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Leave Game?</h3>
                        <p>Are you sure you want to leave the room?</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowExitConfirmation(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={confirmExit} style={{ background: '#ff5555' }}>
                                Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
