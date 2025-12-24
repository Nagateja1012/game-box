import React from 'react';
import { GAME_REGISTRY } from '../games/registry';
import { socket } from '../socket';

export default function GameContainer({ room, me }) {
    const GameComponent = GAME_REGISTRY[room?.game?.id];

    if (!GameComponent) {
        return (
            <div className="screen-container" style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="card" style={{ maxWidth: '500px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧩</div>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Game Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                        The game code <strong>"{room?.game?.id || 'UNKNOWN'}"</strong> is either not implemented or missing from the registry.
                    </p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => socket.emit('stop_game', { roomId: room.id })}
                    >
                        Return to Lobby
                    </button>
                    <p style={{ fontSize: '0.8rem', marginTop: '1.5rem', opacity: 0.5 }}>
                        Room status is currently: {room.status}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <React.Suspense fallback={<div className="loader"></div>}>
            <GameComponent room={room} me={me} />
        </React.Suspense>
    );
}
