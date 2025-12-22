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

    const gameMeta = GAME_METADATA[room.game.id];
    const displayTitle = title || gameMeta?.name || 'Game';

    const leftAction = (
        <Button variant="secondary" onClick={handleExit} style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
            LEAVE
        </Button>
    );

    const rightAction = (
        <Button variant="secondary" onClick={toggleRules} style={{ padding: '8px 20px', fontSize: '0.8rem' }}>
            INFO
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
                            <div className="modal-content" onClick={e => e.stopPropagation()}>
                                <h2>{gameMeta?.name} Rules</h2>
                                <ul style={{ textAlign: 'left', marginBottom: '20px' }}>
                                    {gameMeta?.rules?.map((rule, i) => (
                                        <li key={i} style={{ marginBottom: '8px' }}>{rule}</li>
                                    ))}
                                </ul>
                                <Button variant="primary" onClick={() => setShowRules(false)} style={{ width: '100%' }}>
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
