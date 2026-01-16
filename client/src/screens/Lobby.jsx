import React from 'react';
import { socket } from '../socket';
import { GAME_METADATA } from '../games/registry';
import SanitizedInput, { VALIDATION_TYPES } from '../design-system/SanitizedInput';
import PlayerAvatar from '../design-system/PlayerAvatar';
import RulesOverlay from '../design-system/RulesOverlay';
import { soundManager } from '../utils/soundManager';

export default function Lobby({ room, me }) {
    const isHost = room.players.find(p => p.id === me.id)?.isHost;

    const [searchQuery, setSearchQuery] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all'); // all, team, single
    const [copied, setCopied] = React.useState(false);
    const [rulesGameId, setRulesGameId] = React.useState(null);
    const [startError, setStartError] = React.useState('');

    const copyCode = () => {
        const link = `${window.location.origin}/?room=${room.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLeave = () => {
        socket.emit('leave_room', { roomId: room.id, userId: me.userId });
    };

    const [hoveredGameId, setHoveredGameId] = React.useState(null);

    const checkStartEligibility = (gameId) => {
        const meta = GAME_METADATA[gameId];
        if (!meta) return true;

        const min = meta.minPlayers || 1;
        if (room.players.length < min) {
            setStartError(`This game requires at least ${min} players.`);
            soundManager.playInvalid();
            setTimeout(() => setStartError(''), 3000);
            return false;
        }
        return true;
    };

    const handleStartGame = (gameId) => {
        if (!isHost) return;
        if (checkStartEligibility(gameId)) {
            socket.emit('start_game', { roomId: room.id, gameId });
        }
    };

    const handleRandomGame = () => {
        if (!isHost) return;
        const playableGames = Object.entries(GAME_METADATA).filter(([id, meta]) => {
            const isDev = meta.tags?.includes('dev');
            const isProd = import.meta.env.PROD;
            return !(isProd && isDev);
        });
        const randomId = playableGames[Math.floor(Math.random() * playableGames.length)][0];
        handleStartGame(randomId);
    };

    const filteredGames = Object.entries(GAME_METADATA)
        .filter(([id, meta]) => {
            const matchesSearch = meta.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                meta.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || meta.category === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort(([, a], [, b]) => {
            const aDev = a.tags?.includes('dev');
            const bDev = b.tags?.includes('dev');
            if (aDev === bDev) return a.name.localeCompare(b.name);
            return aDev ? 1 : -1;
        });

    return (
        <div className="screen-container lobby-screen">
            <div className="lobby-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h2>ROOM <span className="code" onClick={copyCode} title="Click to copy join link">
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
                            <li key={p.id} className={p.id === me.id ? 'me' : ''} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px' }}>
                                <PlayerAvatar name={p.name} size="md" />
                                <div className="player-info">
                                    <span className="name" style={{ fontWeight: 'bold' }}>{p.name} {p.isHost && '👑'}</span>
                                    <span className="status" style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block' }}>
                                        {p.status || 'WAITING'}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="game-selection">
                    <div className="game-selection-header" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '20px',
                        marginBottom: '25px',
                        padding: '0 10px'
                    }}>
                        {/* Left: Filters */}
                        <div className="category-filters" style={{
                            display: 'flex',
                            gap: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            flex: 1
                        }}>
                            {['ALL', 'SOLO', 'TEAM'].map(cat => (
                                <span
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat.toLowerCase())}
                                    style={{
                                        cursor: 'pointer',
                                        opacity: categoryFilter === cat.toLowerCase() ? 1 : 0.4,
                                        color: categoryFilter === cat.toLowerCase() ? '#06b6d4' : '#fff',
                                        transition: 'all 0.2s',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: categoryFilter === cat.toLowerCase() ? 'rgba(6,182,212,0.1)' : 'transparent',
                                        border: categoryFilter === cat.toLowerCase() ? '1px solid rgba(6,182,212,0.2)' : '1px solid transparent'
                                    }}
                                >
                                    {cat}
                                </span>
                            ))}
                        </div>

                        {/* Center: Title */}
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            letterSpacing: '1px',
                            background: 'linear-gradient(to bottom, #fff, #bbb)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            flex: 1,
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                        }}>CHOOSE A GAME</h3>

                        {/* Right: Dice + Search */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '12px',
                            flex: 1
                        }}>
                            {isHost && (
                                <button
                                    onClick={handleRandomGame}
                                    title="Pick Random Game"
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        fontSize: '1.3rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)';
                                        e.currentTarget.style.borderColor = '#06b6d4';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(6,182,212,0.3)';
                                        e.currentTarget.style.background = 'rgba(6,182,212,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1) rotate(0)';
                                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    }}
                                >
                                    <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>🎲</span>
                                </button>
                            )}
                            <SanitizedInput
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(val) => setSearchQuery(val)}
                                allowedType={VALIDATION_TYPES.ALPHANUMERIC}
                                maxLength={30}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '18px',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    background: 'rgba(0,0,0,0.4)',
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    width: '140px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
                                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                            />
                        </div>
                    </div>

                    <div className="games-grid">
                        {filteredGames.length > 0 ? (
                            filteredGames.map(([id, meta]) => {
                                const isDev = meta.tags?.includes('dev');
                                const isProd = import.meta.env.PROD;
                                const isComingSoon = isProd && isDev;
                                const isHovered = hoveredGameId === id;

                                return (
                                    <div
                                        key={id}
                                        className={`game-card ${isComingSoon ? 'coming-soon' : ''}`}
                                        onClick={() => !isComingSoon && handleStartGame(id)}
                                        onMouseEnter={() => !isComingSoon && setHoveredGameId(id)}
                                        onMouseLeave={() => setHoveredGameId(null)}
                                        title={!isComingSoon && !isHost ? "Host will select the game" : ""}
                                        style={{
                                            cursor: isComingSoon ? 'not-allowed' : 'pointer',
                                            opacity: isComingSoon ? 0.7 : 1,
                                            border: isHovered ? '2px solid #06b6d4' : '1px solid rgba(255,255,255,0.08)',
                                            transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
                                            boxShadow: isHovered ? '0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(6,182,212,0.2)' : 'none',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            borderRadius: '12px',
                                            background: isHovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                        }}
                                    >
                                        <div className="game-image" style={{ backgroundImage: `url(${meta.image})` }}>
                                            {isComingSoon && (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: 'rgba(0,0,0,0.7)', color: '#fff', fontWeight: 'bold',
                                                    fontSize: '0.75rem', letterSpacing: '1px'
                                                }}>
                                                    COMING SOON
                                                </div>
                                            )}
                                        </div>
                                        <div className="game-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, color: isHovered ? '#06b6d4' : '#fff', transition: 'color 0.2s' }}>{meta.name}</h4>
                                                {meta.category === 'team' && (
                                                    <div
                                                        title="Team Game"
                                                        style={{
                                                            width: '10px',
                                                            height: '10px',
                                                            background: '#ffaa00',
                                                            borderRadius: '50%',
                                                            boxShadow: '0 0 8px rgba(255,170,0,0.8)',
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>{isComingSoon ? 'Under Development' : meta.description}</p>
                                        </div>
                                        {!isComingSoon && (
                                            <span
                                                className="how-to-play-tag"
                                                style={{
                                                    opacity: isHovered ? 1 : 0,
                                                    transition: 'opacity 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    soundManager.playClick();
                                                    setRulesGameId(id);
                                                }}
                                            >
                                                HOW TO PLAY
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{
                                gridColumn: '1 / -1',
                                textAlign: 'center',
                                padding: '80px 20px',
                                background: 'rgba(255,255,255,0.02)',
                                borderRadius: '15px',
                                border: '1px dashed rgba(255,255,255,0.1)'
                            }}>
                                <div style={{ fontSize: '1.2rem', color: '#06b6d4', marginBottom: '8px' }}>
                                    Game "{searchQuery}" not found
                                </div>
                                <div style={{ fontSize: '0.85rem', opacity: 0.5 }}>
                                    Try searching for another game or clear your filters.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {startError && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
                    animation: 'slideUpFade 0.3s ease-out',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span>⚠️</span> {startError}
                </div>
            )}

            <RulesOverlay
                isOpen={!!rulesGameId}
                onClose={() => setRulesGameId(null)}
                gameName={rulesGameId ? GAME_METADATA[rulesGameId]?.name : ''}
                rules={rulesGameId ? GAME_METADATA[rulesGameId]?.rules : ''}
            />
        </div>
    );
}
