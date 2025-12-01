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

    return (
        <div className="screen-container lobby-screen">
            <div className="lobby-header">
                <h2>ROOM: <span className="code" onClick={copyCode} title="Click to copy join link">
                    {room.id}
                    {copied && <span style={{ fontSize: '0.5em', marginLeft: 10, color: '#00ff00' }}>COPIED!</span>}
                </span></h2>
                <div className="player-count">{room.players.length} Players</div>
            </div>

            <div className="lobby-content">
                <div className="players-list">
                    <h3>PLAYERS</h3>
                    <ul>
                        {room.players.map(p => (
                            <li key={p.id} className={p.id === me.id ? 'me' : ''}>
                                <span className="avatar">{p.name[0].toUpperCase()}</span>
                                <span className="name">{p.name} {p.isHost && '👑'}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="game-selection">
                    <h3>CHOOSE A GAME</h3>
                    <div className="games-grid">
                        {Object.entries(GAME_METADATA)
                            .filter(([_, meta]) => !import.meta.env.PROD || !meta.tags?.includes('dev'))
                            .map(([id, meta]) => (
                                <div
                                    key={id}
                                    className="game-card"
                                    onClick={() => isHost && socket.emit('start_game', { roomId: room.id, gameId: id })}
                                >
                                    <div className="game-image" style={{ backgroundImage: `url(${meta.image})` }}></div>
                                    <div className="game-info">
                                        <h4>{meta.name}</h4>
                                        <p>{meta.description}</p>
                                    </div>
                                    {isHost && <span className="play-tag">PLAY NOW</span>}
                                </div>
                            ))}


                    </div>
                </div>
            </div>
        </div>
    );
}
