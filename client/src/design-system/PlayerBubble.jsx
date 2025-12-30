import React, { useState, useEffect, useCallback, useRef } from 'react';
import PlayerAvatar from './PlayerAvatar';
import { socket } from '../socket';

const EMOTES = ['😂', '❤️', '😏', '😑', '😭'];

const PlayerBubble = React.memo(({
    player,
    isMe = false,
    roomId = null,
    isTurn = false,
    stats = [], // Array of objects { icon, value }
    tags = [], // Array of strings (e.g. "UNO!", "CHICKEN")
    className = '',
    style = {},
    variant = 'cards' // 'cards' (Uno), 'bingo' (Bingo badge)
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [selectorSide, setSelectorSide] = useState('top');
    const [activeEmote, setActiveEmote] = useState(null);
    const hoverTimeoutRef = useRef(null);
    const containerRef = useRef(null);

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
        // Hide selector after sending
        setIsHovered(false);
    };

    const onMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

        // Dynamic position detection
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // If there's less than 120px above the bubble, show at bottom
            setSelectorSide(rect.top < 120 ? 'bottom' : 'top');
        }

        setIsHovered(true);
    };

    const onMouseLeave = () => {
        // Add a larger buffer (300ms) before hiding to handle jitter/refresh
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 300);
    };

    return (
        <div
            ref={containerRef}
            className={`player-bubble ${isTurn ? 'active' : ''} ${variant} ${className}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                display: 'flex',
                flexDirection: variant === 'bingo' ? 'row' : 'column',
                alignItems: 'center',
                gap: variant === 'bingo' ? '12px' : '2px',
                textAlign: variant === 'bingo' ? 'left' : 'center',
                position: 'relative',
                background: isHovered && isMe ? 'rgba(255, 255, 255, 0.25)' :
                    (isTurn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)'),
                padding: variant === 'bingo' ? '4px 12px' : '8px 12px',
                borderRadius: variant === 'bingo' ? '30px' : '12px',
                minWidth: variant === 'bingo' ? '160px' : '80px',
                height: variant === 'bingo' ? '42px' : 'auto',
                backdropFilter: 'blur(8px)',
                border: isTurn ? '2px solid var(--primary-color, #6366f1)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isTurn ? '0 0 15px rgba(99, 102, 241, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isMe ? 'pointer' : 'default',
                pointerEvents: 'auto',
                zIndex: isHovered ? 450 : 200, // Elevated while hovered
                ...style
            }}
        >
            {/* Emote Display Animation */}
            {activeEmote && (
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    fontSize: '2.5rem',
                    animation: 'emotePop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, emoteFloat 2s ease-out 0.5s infinite',
                    zIndex: 500,
                    pointerEvents: 'none'
                }}>
                    {activeEmote}
                </div>
            )}

            <PlayerAvatar
                name={player.name}
                isTurn={isTurn}
                isEliminated={player.isEliminated || player.status === 'ELIMINATED'}
                size={variant === 'bingo' ? 'sm' : 'md'}
            />

            <div className="player-info" style={{
                pointerEvents: 'none',
                marginTop: variant === 'bingo' ? '0' : '4px',
                display: variant === 'bingo' ? 'flex' : 'block',
                alignItems: variant === 'bingo' ? 'center' : 'stretch',
                gap: variant === 'bingo' ? '12px' : '0',
                flex: variant === 'bingo' ? 1 : 'none'
            }}>
                <div className="player-name" style={{
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: variant === 'bingo' ? '80px' : '100px'
                }}>
                    {player.name}
                </div>

                <div className="player-stats" style={{
                    display: 'flex',
                    justifyContent: variant === 'bingo' ? 'flex-end' : 'center',
                    gap: '8px',
                    fontSize: '0.75rem',
                    opacity: 0.9,
                    marginTop: variant === 'bingo' ? '0' : '2px',
                    marginLeft: variant === 'bingo' ? 'auto' : '0'
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

            {/* Emote Selector (Me only) - Moved to end for DOM order stacking */}
            {isMe && isHovered && (
                <div
                    onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
                    style={{
                        position: 'absolute',
                        [selectorSide === 'top' ? 'bottom' : 'top']: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        [selectorSide === 'top' ? 'paddingBottom' : 'paddingTop']: '25px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        zIndex: 1000, // Very high to stay above everything
                        animation: selectorSide === 'top' ? 'popIn 0.15s ease-out' : 'popInBottom 0.15s ease-out',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.98)',
                        padding: '6px 10px',
                        borderRadius: '20px',
                        display: 'flex',
                        gap: '8px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(12px)'
                    }}>
                        {EMOTES.map(emote => (
                            <button
                                key={emote}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendEmote(emote);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                    padding: '4px',
                                    transform: 'scale(1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 1001
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.5)';
                                    e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(255,255,255,0.6))';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.filter = 'none';
                                }}
                            >
                                {emote}
                            </button>
                        ))}
                    </div>
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
                    from { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
                }
                @keyframes popInBottom {
                    from { opacity: 0; transform: translateX(-50%) scale(0.8) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}, (prev, next) => {
    // Custom comparison to stop irrelevant server-side property updates from breaking the hover state
    return prev.player.id === next.player.id &&
        prev.player.status === next.player.status &&
        prev.isTurn === next.isTurn &&
        prev.isMe === next.isMe &&
        prev.stats === next.stats && // Note: stats must be useMemoized in parent
        prev.tags === next.tags;     // Note: tags must be useMemoized in parent
});

export default PlayerBubble;
