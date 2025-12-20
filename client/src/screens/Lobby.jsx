import React from 'react';
import { socket } from '../socket';
import { GAME_METADATA } from '../games/registry';

export default function Lobby({ room, me }) {
    const isHost = room.players.find(p => p.id === me.id)?.isHost;

    const [copied, setCopied] = React.useState(false);

    const copyCode = () => {
        const link = `${window.location.origin}/?room=${room.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeave = () => {
        socket.emit('leave_room', { roomId: room.id });
    };

    return (
        <div className="screen-container lobby-screen">
            <div className="lobby-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2>ROOM: <span className="code" onClick={copyCode} title="Click to copy join link">
                        {room.id}
                        {copied && <span style={{ fontSize: '0.5em', marginLeft: 10, color: '#00ff00' }}>COPIED!</span>}
                    </span></h2>
                    <div className="player-count">{room.players.length} Players</div>
                </div>
                <button className="btn btn-secondary" onClick={handleLeave} style={{ marginLeft: '10%', padding: '5px 5px 5px 5px', fontSize: '0.8rem', minWidth: 'auto' }}>
                    LEAVE
                </button>
            </div>

            <div className="lobby-content">
                <div className="players-list">
                    <h3>PLAYERS</h3>
                    <ul>
                        {room.players.map(p => (
                            <li key={p.id} className={p.id === me.id ? 'me' : ''}>
                                <span className="avatar">{p.name[0].toUpperCase()}</span>
                                <div className="player-info">
                                    <span className="name">{p.name} {p.isHost && '👑'}</span>
                                    <span className="status" style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '5px' }}>
                                        ({p.status || 'WAITING'})
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="game-selection">
                    <h3>CHOOSE A GAME</h3>
                    <div className="games-grid">
                        {Object.entries(GAME_METADATA)
                            .sort(([, a], [, b]) => {
                                const aDev = a.tags?.includes('dev');
                                const bDev = b.tags?.includes('dev');
                                if (aDev === bDev) return a.name.localeCompare(b.name);
                                return aDev ? 1 : -1;
                            })
                            .map(([id, meta]) => {
                                const isDev = meta.tags?.includes('dev');
                                const isProd = import.meta.env.PROD;
                                const isComingSoon = isProd && isDev;

                                return (
                                    <div
                                        key={id}
                                        className={`game-card ${isComingSoon ? 'coming-soon' : ''}`}
                                        onClick={() => !isComingSoon && isHost && socket.emit('start_game', { roomId: room.id, gameId: id })}
                                        style={isComingSoon ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                    >
                                        <div className="game-image" style={{ backgroundImage: `url(${meta.image})` }}>
                                            {isComingSoon && (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontWeight: 'bold'
                                                }}>
                                                    COMING SOON
                                                </div>
                                            )}
                                        </div>
                                        <div className="game-info">
                                            <h4>{meta.name}</h4>
                                            <p>{isComingSoon ? 'Under Development' : meta.description}</p>
                                        </div>
                                        {!isComingSoon && isHost && <span className="play-tag">PLAY NOW</span>}
                                    </div>
                                );
                            })}


                    </div>
                </div>
            </div>
        </div>
    );
}
