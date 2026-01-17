import React from 'react';
import Button from './Button';
import { soundManager } from '../utils/soundManager';
import { socket } from '../socket';

export default function RulesOverlay({ isOpen, onClose, gameName, rules, isMandatory, players, me, roomId }) {
    if (!isOpen) return null;

    const handleGotIt = () => {
        if (isMandatory && roomId && me) {
            socket.emit('ready_game', { roomId, userId: me.userId });
        }
        soundManager.playClick();
        onClose();
    };

    // Simple markdown-to-JSX parser for the rules
    const renderMarkdown = (text) => {
        if (!text) return <p style={{ opacity: 0.5 }}>No rules available for this game yet.</p>;

        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Headers
            if (line.startsWith('# ')) return <h1 key={i} style={{ color: '#06b6d4', marginTop: '20px' }}>{line.slice(2)}</h1>;
            if (line.startsWith('## ')) return <h2 key={i} style={{ color: '#06b6d4', marginTop: '15px' }}>{line.slice(3)}</h2>;
            if (line.startsWith('### ')) return <h3 key={i} style={{ color: '#06b6d4', marginTop: '12px' }}>{line.slice(4)}</h3>;

            // Unordered lists
            if (line.trim().startsWith('- ')) return <li key={i} style={{ marginLeft: '20px', marginBottom: '8px', opacity: 0.9 }}>{parseBold(line.trim().slice(2))}</li>;

            // Ordered lists
            if (/^\d+\.\s/.test(line.trim())) return <li key={i} style={{ marginLeft: '20px', marginBottom: '8px', opacity: 0.9 }}>{parseBold(line.trim().replace(/^\d+\.\s/, ''))}</li>;

            // Empty line
            if (line.trim() === '') return <br key={i} />;

            // Normal paragraph
            return <p key={i} style={{ marginBottom: '10px', opacity: 0.8, lineHeight: '1.6' }}>{parseBold(line)}</p>;
        });
    };

    // Helper to parse **bold** text
    const parseBold = (text) => {
        const parts = text.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} style={{ color: '#fff', fontWeight: 'bold' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                animation: 'rulesFadeIn 0.3s ease'
            }}
            onClick={onClose}
        >
            <div
                className="rules-content"
                style={{
                    background: '#1a1a1a',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 20px rgba(6,182,212,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 30px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>
                        How to Play <span style={{ color: '#06b6d4' }}>{gameName}</span>
                    </h2>
                    <button
                        onClick={handleGotIt}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            opacity: 0.5,
                            transition: 'opacity 0.2s',
                            display: isMandatory ? 'none' : 'block'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    padding: '30px',
                    overflowY: 'auto',
                    flex: 1,
                    textAlign: 'left',
                    color: '#ddd'
                }}>
                    {renderMarkdown(rules)}

                    {isMandatory && players && (
                        <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                            <h4 style={{ color: '#06b6d4', marginBottom: '15px', fontSize: '0.9rem' }}>PLAYERS READING RULES</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                {players.map(p => (
                                    <div key={p.userId} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        opacity: p.status === 'READY' ? 0.4 : 1,
                                        border: p.status === 'READY' ? '1px solid rgba(0,255,0,0.1)' : '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: p.status === 'READY' ? '#22c55e' : '#eab308',
                                            boxShadow: `0 0 10px ${p.status === 'READY' ? '#22c55e44' : '#eab30844'}`
                                        }} />
                                        <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{p.name} {p.userId === me?.userId && '(You)'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 30px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <Button
                        variant="primary"
                        onClick={handleGotIt}
                        style={{ width: isMandatory ? '100%' : '120px' }}
                        disabled={isMandatory && players.find(p => p.userId === me?.userId)?.status === 'READY'}
                    >
                        {isMandatory ? (players.find(p => p.userId === me?.userId)?.status === 'READY' ? 'WAITING FOR OTHERS...' : 'START GAME') : 'GOT IT'}
                    </Button>
                </div>

                <style>
                    {`
                        @keyframes rulesFadeIn {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                        .rules-content::-webkit-scrollbar {
                            width: 8px;
                        }
                        .rules-content::-webkit-scrollbar-track {
                            background: rgba(0,0,0,0.2);
                        }
                        .rules-content::-webkit-scrollbar-thumb {
                            background: rgba(255,255,255,0.1);
                            border-radius: 4px;
                        }
                        .rules-content::-webkit-scrollbar-thumb:hover {
                            background: rgba(255,255,255,0.2);
                        }
                    `}
                </style>
            </div>
        </div >
    );
}
