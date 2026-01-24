import React, { useMemo, useState, useEffect, useRef } from 'react';
import TurnIndicator from '../../design-system/TurnIndicator';

const Board = ({ room, me, onTokenClick, children }) => {
    const { gameState } = room;
    if (!gameState) return null;

    const myPlayer = gameState.players.find(p => p.userId === me.userId);
    const myIndex = gameState.players.findIndex(p => p.userId === me.userId);
    const myOrientation = myPlayer?.orientation || 0;

    // Turn change notification state
    const [showTurnOverlay, setShowTurnOverlay] = useState(false);
    const lastTurnRef = useRef(-1);

    useEffect(() => {
        if (gameState.turnIndex !== lastTurnRef.current) {
            setShowTurnOverlay(true);
            lastTurnRef.current = gameState.turnIndex;
            const timer = setTimeout(() => setShowTurnOverlay(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [gameState.turnIndex]);

    // Board cells
    const cells = [];
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const isSafe = gameState.players.some(p => {
                const coordStr = `${x},${y}`;
                if (coordStr === '2,2') return false;
                return ['2,4', '4,2', '2,0', '0,2', '1,3', '1,1', '3,1', '3,3'].includes(coordStr);
            });

            const isGoal = x === 2 && y === 2;

            const homeOfPlayer = gameState.players.find(p => {
                const path = gameState.boardPaths[gameState.players.indexOf(p)];
                return path[0][0] === x && path[0][1] === y;
            });

            cells.push({
                x, y,
                isSafe,
                isGoal,
                homeColor: homeOfPlayer?.color
            });
        }
    }

    // Token hopping animation state
    const [visualPositions, setVisualPositions] = useState({});

    useEffect(() => {
        const interval = setInterval(() => {
            let changed = false;
            const nextPositions = { ...visualPositions };

            gameState.players.forEach((player, pIdx) => {
                player.tokens.forEach((token, tIdx) => {
                    const key = `${pIdx}-${tIdx}`;
                    const target = token.position;
                    let current = nextPositions[key] ?? -1;

                    if (current < target) {
                        // Regular forward movement
                        if (current === -1) {
                            nextPositions[key] = 0;
                        } else {
                            nextPositions[key] = current + 1;
                        }
                        changed = true;
                    } else if (current > target && target !== -1) {
                        // Looping case or reset
                        // Only loop if we are in the outer ring (indices 0-15)
                        if (current >= 0 && current < 16 && target < 16) {
                            nextPositions[key] = (current + 1) % 16;
                            changed = true;
                        } else {
                            // Kill reset or other jump
                            nextPositions[key] = target;
                            changed = true;
                        }
                    } else if (current > target && target === -1) {
                        // Reset to home
                        nextPositions[key] = -1;
                        changed = true;
                    }
                });
            });

            if (changed) {
                setVisualPositions(nextPositions);
            }
        }, 120);

        return () => clearInterval(interval);
    }, [gameState.players, visualPositions]);

    const tokenOffsets = useMemo(() => {
        const counts = {};
        const offsets = {};

        gameState.players.forEach((player, pIdx) => {
            player.tokens.forEach((token, tIdx) => {
                if (token.isFinished) return;

                const key = `${pIdx}-${tIdx}`;
                const pos = visualPositions[key] ?? -1;

                let coordKey;
                if (pos === -1) {
                    coordKey = `home-${pIdx}`;
                } else {
                    const path = gameState.boardPaths[pIdx];
                    const [x, y] = path[pos];
                    coordKey = `${x},${y}`;
                }

                counts[coordKey] = (counts[coordKey] || 0) + 1;
                offsets[key] = counts[coordKey] - 1;
            });
        });

        return { offsets, counts };
    }, [gameState.players, visualPositions, gameState.boardPaths]);

    const getBoardRotation = (orientation) => {
        return `rotate(${orientation}deg)`;
    };

    const activePlayerName = gameState.players[gameState.turnIndex]?.name;
    const isMyTurn = gameState.turnIndex === myIndex;

    return (
        <div className="eights-fours-board-content">
            <div className="eights-fours-board-wrapper" style={{ transform: getBoardRotation(myOrientation) }}>
                <div className="eights-fours-board">
                    {cells.map((cell, i) => {
                        const isGoal = cell.isGoal;
                        let arrowRot = 0;
                        const entryOfPlayer = gameState.players.find((p, pIdx) => {
                            const path = gameState.boardPaths[pIdx];
                            const entryCell = path[15];
                            const targetCell = path[16];

                            if (entryCell[0] === cell.x && entryCell[1] === cell.y) {
                                const dx = targetCell[0] - entryCell[0];
                                const dy = targetCell[1] - entryCell[1];
                                if (dx === 1) arrowRot = 90;
                                else if (dx === -1) arrowRot = 270;
                                else if (dy === 1) arrowRot = 180;
                                else if (dy === -1) arrowRot = 0;
                                return true;
                            }
                            return false;
                        });

                        const isUnlocked = entryOfPlayer?.hasKilled;

                        return (
                            <div
                                key={i}
                                className={`board-cell ${cell.isSafe ? 'safe' : ''} ${isGoal ? 'goal' : ''}`}
                                style={{
                                    borderBottom: cell.homeColor ? `4px solid ${cell.homeColor}` : undefined
                                }}
                            >
                                {entryOfPlayer && (
                                    <div
                                        className="path-arrow"
                                        style={{
                                            color: entryOfPlayer.color,
                                            transform: `rotate(${arrowRot}deg)`,
                                            opacity: 1
                                        }}
                                    >
                                        <div className="arrow-and-lock">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '18px' }}>
                                                <path d="M12 19V5M12 5l-7 7m7-7l7 7" />
                                            </svg>
                                            {!isUnlocked && (
                                                <span className="lock-icon" style={{ transform: `rotate(${-myOrientation - arrowRot}deg)` }}>
                                                    🔒
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isGoal && (
                                    <div className="goal-symbol-centered" style={{ transform: `rotate(${-myOrientation}deg)` }}>
                                        <svg viewBox="0 0 24 24" fill="#3b82f6" style={{ width: '80%', height: '80%' }}>
                                            <path d="M12 2l2.4 7.4h7.6l-6.2 4.4 2.4 7.4-6.2-4.4-6.2 4.4 2.4-7.4-6.2-4.4h7.6z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Tokens */}
                    {gameState.players.map((player, pIdx) => (
                        player.tokens.map((token, tIdx) => {
                            if (token.isFinished) return null;

                            const key = `${pIdx}-${tIdx}`;
                            const currentPos = visualPositions[key] ?? -1;
                            const path = gameState.boardPaths[pIdx];

                            let cx, cy;
                            let groupOffset = { x: 0, y: 0 };

                            if (currentPos === -1) {
                                const [sx, sy] = path[0];
                                if (sx === 2 && sy === 4) { cx = 2; cy = 4.5; }
                                else if (sx === 2 && sy === 0) { cx = 2; cy = -0.6; }
                                else if (sx === 0 && sy === 2) { cx = -0.6; cy = 2; }
                                else if (sx === 4 && sy === 2) { cx = 4.6; cy = 2; }
                                else { cx = sx; cy = sy; }

                                const homeIdx = tokenOffsets.offsets[key];
                                groupOffset = { x: (homeIdx - 1.5) * 5, y: (homeIdx - 1.5) * 5 };
                            } else {
                                const coords = path[currentPos];
                                cx = coords[0];
                                cy = coords[1];

                                const coordKey = `${cx},${cy}`;
                                const numInCell = tokenOffsets.counts[coordKey] || 1;
                                if (numInCell > 1) {
                                    const offsetIdx = tokenOffsets.offsets[key];
                                    const angle = (offsetIdx / numInCell) * Math.PI * 2;
                                    const radius = 8;
                                    groupOffset = {
                                        x: Math.cos(angle) * radius,
                                        y: Math.sin(angle) * radius
                                    };
                                }
                            }

                            const left = (cx * 20) + 10;
                            const top = (cy * 20) + 10;

                            const isMovable = isMyTurn && player.userId === me.userId && gameState.diceRoll !== null;

                            return (
                                <div
                                    key={key}
                                    className={`token ${isMovable ? 'movable' : ''}`}
                                    style={{
                                        left: `${left}%`,
                                        top: `${top}%`,
                                        background: player.color,
                                        boxShadow: `0 0 15px ${player.color}`,
                                        borderColor: '#fff',
                                        transform: `translate(-50%, -50%) translate(${groupOffset.x}px, ${groupOffset.y}px) rotate(${-myOrientation}deg)`
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isMovable) onTokenClick(token.id);
                                    }}
                                />
                            );
                        })
                    ))}
                </div>
            </div>

            {/* Centered Turn Indicator Overlay - OUTSIDE rotated wrapper */}
            {showTurnOverlay && (
                <div className="centered-turn-indicator-overlay">
                    <TurnIndicator
                        isMyTurn={isMyTurn}
                        playerName={activePlayerName}
                        variant="bingo"
                    />
                </div>
            )}

            {children}
        </div>
    );
};

export default Board;
