import React, { useState } from 'react';
import { socket } from '../socket';
import { GAME_METADATA } from '../games/registry';

export default function GameWrapper({ room, me, children }) {
    const [showRules, setShowRules] = useState(false);
    const isHost = room.players.find(p => p.id === me.id)?.isHost;
    const gameMeta = GAME_METADATA[room.game.id];

    const handleExit = () => {
        if (isHost) {
            // Direct exit for now to avoid confirm issues
            socket.emit('stop_game', { roomId: room.id });
        } else {
            if (confirm('Leave the room?')) {
                window.location.reload(); // Simple way to leave for now
            }
        }
    };

    return (
        <div className="game-wrapper">
            <div className="game-toolbar">
                <button className="btn-icon exit-btn" onClick={handleExit}>
                    {isHost ? 'END GAME' : 'LEAVE'}
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
        </div>
    );
}
