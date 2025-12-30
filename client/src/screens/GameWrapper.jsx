import React, { useState } from 'react';
import { socket } from '../socket';
import { GAME_METADATA } from '../games/registry';
import GameLayout from '../design-system/GameLayout';
import Button from '../design-system/Button';
import { useGameActions } from '../hooks/useGameActions';

export default function GameWrapper({ room, me, children, playScreen, playerHand, title, overlay }) {
    const {
        showRules,
        setShowRules,
        showExitConfirmation,
        handleExit,
        cancelExit,
        confirmExit,
        toggleRules
    } = useGameActions(room, me);

    const formatRules = (text) => {
        if (!text) return null;

        return text.split('\n').map((line, i) => {
            const trimmedLine = line.trim();
            if (trimmedLine === '') return <br key={i} />;

            // Headings
            if (trimmedLine.startsWith('# ')) {
                return <h2 key={i} style={{ marginTop: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>{trimmedLine.slice(2)}</h2>;
            }
            if (trimmedLine.startsWith('## ')) {
                return <h3 key={i} style={{ marginTop: '15px' }}>{trimmedLine.slice(3)}</h3>;
            }

            const isBullet = trimmedLine.startsWith('- ');
            const lineToProcess = isBullet ? trimmedLine.slice(2) : trimmedLine;

            // Bold text (**text**)
            const parts = lineToProcess.split(/(\*\*.*?\*\*)/g);
            const content = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            // Bullet points
            if (isBullet) {
                return (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', paddingLeft: '10px' }}>
                        <span style={{ color: '#06b6d4' }}>•</span>
                        <span>{content}</span>
                    </div>
                );
            }

            // Regular paragraphs
            return <p key={i} style={{ marginBottom: '10px' }}>{content}</p>;
        });
    };

    const gameMeta = GAME_METADATA[room.game.id];
    const displayTitle = title || gameMeta?.name || 'Game';

    const leftAction = (
        <Button variant="secondary" onClick={handleExit} style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
            LEAVE
        </Button>
    );

    const rightAction = (
        <Button variant="secondary" onClick={toggleRules} style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
            RULES
        </Button>
    );

    // If game ended, we usually show an overlay, handled by GameLayout's overlay prop
    // Actually, games might handle their own GameOver. 

    return (
        <GameLayout
            title={displayTitle}
            leftAction={leftAction}
            rightAction={rightAction}
            playScreen={playScreen || children}
            playerHand={playerHand}
            overlay={
                <>
                    {overlay}
                    {showRules && (
                        <div className="modal-overlay" onClick={() => setShowRules(false)} style={{ zIndex: 3000 }}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0 }}>{gameMeta?.name} Rules</h2>
                                    <button onClick={() => setShowRules(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                                </div>
                                <div className="rules-scroll-container" style={{ textAlign: 'left', overflowY: 'auto', paddingRight: '15px', flex: 1 }}>
                                    {formatRules(gameMeta?.rules) || 'No rules available for this game.'}
                                </div>
                                <Button variant="primary" onClick={() => setShowRules(false)} style={{ width: '100%', marginTop: '20px' }}>
                                    GOT IT
                                </Button>
                            </div>
                        </div>
                    )}

                    {showExitConfirmation && (
                        <div className="modal-overlay" style={{ zIndex: 3000 }}>
                            <div className="modal-content" style={{ textAlign: 'center' }}>
                                <h3>Leave Game?</h3>
                                <p style={{ margin: '15px 0', opacity: 0.8 }}>Are you sure you want to leave the room?</p>
                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                                    <Button variant="secondary" onClick={cancelExit}>
                                        Cancel
                                    </Button>
                                    <Button variant="primary" onClick={confirmExit} style={{ background: '#ff5555', border: 'none' }}>
                                        Leave
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            }
        />
    );
}
