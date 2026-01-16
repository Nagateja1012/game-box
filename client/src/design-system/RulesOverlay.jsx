import React from 'react';
import Button from './Button';
import { soundManager } from '../utils/soundManager';

export default function RulesOverlay({ isOpen, onClose, gameName, rules }) {
    if (!isOpen) return null;

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
                        onClick={() => {
                            soundManager.playClick();
                            onClose();
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            opacity: 0.5,
                            transition: 'opacity 0.2s'
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
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 30px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            soundManager.playClick();
                            onClose();
                        }}
                        style={{ width: '120px' }}
                    >
                        GOT IT
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
        </div>
    );
}
