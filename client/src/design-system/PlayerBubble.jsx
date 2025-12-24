import React, { useState, useEffect, useCallback } from 'react';
import PlayerAvatar from './PlayerAvatar';
import { socket } from '../socket';

const EMOTES = ['😂', '❤️', '😏', '😑', '😭'];

export default function PlayerBubble({
    player,
    isMe = false,
    roomId = null,
    isTurn = false,
    stats = [], // Array of objects { icon, value }
    tags = [], // Array of strings (e.g. "UNO!", "CHICKEN")
    className = '',
    style = {}
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [activeEmote, setActiveEmote] = useState(null);

    useEffect(() => {
        let timer;
        const handlePlayerEmote = ({ playerId, emote }) => {
            if (playerId === player.id) {
                setActiveEmote(emote);
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => setActiveEmote(null), 2500);
            }
        };

        socket.on('player_emote', handlePlayerEmote);
        return () => {
            socket.off('player_emote', handlePlayerEmote);
            if (timer) clearTimeout(timer);
        };
    }, [player.id]);

    const handleSendEmote = (emote) => {
        if (!isMe || !roomId) return;
        socket.emit('send_emote', { roomId, emote });
    };

    return (
        <div
            className={`player-bubble ${isTurn ? 'active' : ''} ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                textAlign: 'center',
                position: 'relative',
                background: isHovered && isMe ? 'rgba(255, 255, 255, 0.25)' :
                    (isTurn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)'),
                padding: '8px 12px',
                borderRadius: '12px',
                minWidth: '80px',
                backdropFilter: 'blur(8px)',
                border: isTurn ? '2px solid var(--primary-color, #6366f1)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isTurn ? '0 0 15px rgba(99, 102, 241, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isMe ? 'pointer' : 'default',
                pointerEvents: 'auto',
                zIndex: isHovered ? 300 : 'auto',
                ...style
            }}
        >
            {/* Emote Display Animation */}
            {activeEmote && (
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    fontSize: '1.8rem',
                    animation: 'emotePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, emoteFloat 2s ease-out 0.5s infinite',
                    zIndex: 400,
                    pointerEvents: 'none'
                }}>
                    {activeEmote}
                </div>
            )}

            {/* Emote Selector (Me only) */}
            {isMe && isHovered && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% - 5px)', // Tighter overlap
                    left: '50%',
                    transform: 'translateX(-50%)',
                    paddingBottom: '15px', // The 'bridge' to keep it open
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    zIndex: 410,
                    animation: 'popIn 0.15s ease-out',
                }}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        padding: '6px 10px',
                        borderRadius: '20px',
                        display: 'flex',
                        gap: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        {EMOTES.map(emote => (
                            <button
                                key={emote}
                                onClick={() => handleSendEmote(emote)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    padding: '2px',
                                    transform: 'scale(1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.4)';
                                    e.target.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.4))';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)';
                                    e.target.style.filter = 'none';
                                }}
                            >
                                {emote}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <PlayerAvatar
                name={player.name}
                isTurn={isTurn}
                isEliminated={player.isEliminated || player.status === 'ELIMINATED'}
            />

            <div className="player-info" style={{ pointerEvents: 'none', marginTop: '4px' }}>
                <div className="player-name" style={{
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100px'
                }}>
                    {player.name}
                </div>

                <div className="player-stats" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.75rem',
                    opacity: 0.9,
                    marginTop: '2px'
                }}>
                    {stats.map((stat, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span style={{ fontSize: '0.85rem' }}>{stat.icon}</span>
                            <span style={{ fontWeight: 'bold' }}>{stat.value}</span>
                        </span>
                    ))}
                </div>
            </div>

            {tags.length > 0 && (
                <div className="player-tags" style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    {tags.map((tag, i) => (
                        <div key={i} className="tag-badge" style={{
                            background: '#ffaa00',
                            color: '#000',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            animation: 'bounce 2s infinite'
                        }}>
                            {tag}
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes emotePop {
                    0% { transform: scale(0) translateY(20px); opacity: 0; }
                    80% { transform: scale(1.2) translateY(-5px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes emoteFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: translateX(-50%) scale(0.8); }
                    to { opacity: 1; transform: translateX(-50%) scale(1); }
                }
            `}</style>
        </div>
    );
}
