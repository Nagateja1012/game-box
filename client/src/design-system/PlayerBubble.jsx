import React from 'react';
import PlayerAvatar from './PlayerAvatar';

export default function PlayerBubble({
    player,
    isTurn = false,
    stats = [], // Array of objects { icon, value }
    tags = [], // Array of strings (e.g. "UNO!", "CHICKEN")
    className = '',
    style = {}
}) {
    return (
        <div
            className={`player-bubble ${isTurn ? 'active' : ''} ${className}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                textAlign: 'center',
                position: 'relative',
                background: isTurn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.4)',
                padding: '8px 12px',
                borderRadius: '12px',
                minWidth: '80px',
                backdropFilter: 'blur(8px)',
                border: isTurn ? '2px solid var(--primary-color, #6366f1)' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isTurn ? '0 0 15px rgba(99, 102, 241, 0.4)' : '0 4px 6px rgba(0,0,0,0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                ...style
            }}
        >
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
        </div>
    );
}
