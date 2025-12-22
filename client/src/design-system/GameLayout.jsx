import React from 'react';

/**
 * Standardized layout for all games.
 * Contains a Game Bar (top), and a Game Container (bottom)
 * which can optionally be split into a Play Screen and a Player Hand.
 */
export default function GameLayout({
    title,
    leftAction, // Usually "LEAVE" button
    rightAction, // Usually "INFO" or Rules button
    playScreen, // The main game table/area
    playerHand, // The player's cards/actions area
    overlay // Any full-screen overlays like Game Over
}) {
    return (
        <div className="game-layout" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            overflow: 'hidden',
            background: 'var(--bg-color, #0f172a)'
        }}>
            {/* Game Bar - Fixed at top */}
            <div className="game-bar" style={{
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                background: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                zIndex: 1000
            }}>
                <div className="bar-left">{leftAction}</div>
                <h2 className="bar-title" style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: 'var(--secondary-color, #06b6d4)',
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
                }}>{title}</h2>
                <div className="bar-right">{rightAction}</div>
            </div>

            {/* Game Container - Fills remaining space */}
            <div className="game-container" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                margin: '5px' // Final 5px offset requested
            }}>
                {/* Play Screen - The main game area */}
                <div className="play-screen" style={{
                    flex: 1,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {playScreen}
                </div>

                {/* Player Hand - Optional area at the bottom */}
                {playerHand && (
                    <div className="player-hand-container" style={{
                        height: 'auto',
                        minHeight: '180px',
                        background: '#3b5a91',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        zIndex: 10
                    }}>
                        {playerHand}
                    </div>
                )}
            </div>

            {/* Global Overlay Layer */}
            {overlay && (
                <div className="layout-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    pointerEvents: 'none'
                }}>
                    {overlay}
                </div>
            )}
        </div>
    );
}
