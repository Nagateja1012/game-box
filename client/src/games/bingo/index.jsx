import React, { useState, useEffect, useMemo, useRef } from 'react';
import { socket } from '../../socket';
import { soundManager } from '../../utils/soundManager';
import GameWrapper from '../../screens/GameWrapper';
import Button from '../../design-system/Button';
import PopNotification from '../../design-system/PopNotification';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';
import TurnIndicator from '../../design-system/TurnIndicator';

const BingoStat = React.memo(({ claimedLetters }) => (
    <div className="bingo-letters-stat">
        {['B', 'I', 'N', 'G', 'O'].map(l => (
            <span key={l} className={`bingo-stat-letter ${claimedLetters.includes(l) ? 'acquired' : ''}`}>
                {claimedLetters.includes(l) ? l : '•'}
            </span>
        ))}
    </div>
));

const PlayerItem = React.memo(({ p, meUserId, roomId, turnIndex, players, turnStartTime, turnDuration }) => {
    const isTurn = players[turnIndex]?.userId === p.userId;
    const stats = useMemo(() => [{ icon: '', value: <BingoStat claimedLetters={p.claimedLetters || []} /> }], [p.claimedLetters]);
    const tags = useMemo(() => p.status === 'WAITING' ? ['OFFLINE'] : [], [p.status]);

    return (
        <TurnTimer isActive={isTurn} turnStartTime={turnStartTime} duration={turnDuration} variant="bingo" style={{ position: 'relative', width: 'auto', height: 'auto', overflow: 'visible' }}>
            <PlayerBubble player={p} isMe={p.userId === meUserId} roomId={roomId} isTurn={isTurn} variant="bingo" stats={stats} tags={tags} />
        </TurnTimer>
    );
});

const GameHeaderTimer = React.memo(({ status, setupEndTime, turnStartTime, turnDuration, turnPhase }) => {
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        let interval;
        if (status === 'SETUP' && setupEndTime) {
            interval = setInterval(() => {
                const left = Math.max(0, Math.ceil((setupEndTime - Date.now()) / 1000));
                setTimer(left);
            }, 1000);
        } else if (status === 'PLAYING') {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = now - turnStartTime;
                const remaining = Math.max(0, Math.ceil((turnDuration - elapsed) / 1000));
                setTimer(remaining);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [status, setupEndTime, turnStartTime, turnDuration]);

    return (
        <div className="game-timer" style={{ fontSize: '2rem', fontWeight: '900', color: turnPhase === 'MARKING' ? '#ff5555' : '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
            {timer}s
        </div>
    );
});
import './bingo.css';

// Helper to generate empty grid
const createEmptyGrid = (size) => Array(size * size).fill(null);

export default function Bingo({ room, me }) {
    const { gameState } = room;
    const [myGrid, setMyGrid] = useState([]);
    const [setupMode, setSetupMode] = useState('CHOICE');
    const [isRandomMode, setIsRandomMode] = useState(false);
    const [notification, setNotification] = useState(null);
    const [pathVersion, setPathVersion] = useState(0);

    // Custom Fill state
    const [availableNumbers, setAvailableNumbers] = useState([]);

    // Visual state for dragging 
    const [dragActive, setDragActive] = useState(false);

    // Refs for stable event handling
    const dragStateRef = useRef({
        isDragging: false,
        path: [],
        startCellIndex: -1
    });

    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    const contextRef = useRef({
        me,
        myGrid,
        mePlayer: gameState.players.find(p => p.userId === me.userId),
        myMarkedCells: new Set(gameState.players.find(p => p.userId === me.userId)?.markedCells || []),
        setupMode,
        availableNumbers,
        isRandomMode
    });
    contextRef.current = {
        me,
        myGrid,
        mePlayer: gameState.players.find(p => p.userId === me.userId),
        myMarkedCells: new Set(gameState.players.find(p => p.userId === me.userId)?.markedCells || []),
        setupMode,
        availableNumbers,
        isRandomMode
    };

    // Derived state
    const gridSize = gameState.gridSize || 5;
    const mePlayer = gameState.players.find(p => p.userId === me.userId);
    const myMarkedCells = new Set(mePlayer?.markedCells || []);
    const alreadySetUp = mePlayer?.isReady;
    const isMyTurn = gameState.players[gameState.turnIndex]?.userId === me.userId;

    useEffect(() => {
        if (alreadySetUp && setupMode !== 'READY') {
            setSetupMode('READY');
            if (mePlayer.grid) setMyGrid(mePlayer.grid);
        }
    }, [alreadySetUp, mePlayer]);

    // Initialize and Sync Grid Size
    useEffect(() => {
        if (setupMode === 'CUSTOM') {
            const expectedSize = gridSize * gridSize;
            // If grid is empty or has wrong size, initialize/reset it
            if (myGrid.length !== expectedSize) {
                console.log(`BINGO: Resizing grid from ${myGrid.length} to ${expectedSize}`);
                setAvailableNumbers(Array.from({ length: expectedSize }, (_, i) => i + 1));
                setMyGrid(createEmptyGrid(gridSize));
                setIsRandomMode(false); // Reset random mode if size changes
            }
        }
    }, [setupMode, gridSize, myGrid.length]);

    // Notification Helper
    const notificationTimeoutRef = useRef(null);
    const showNotification = (msg) => {
        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
        setNotification(msg);
        notificationTimeoutRef.current = setTimeout(() => {
            setNotification(null);
            notificationTimeoutRef.current = null;
        }, 2000);
    };

    // Game Notification Handler
    useEffect(() => {
        const handleNotification = (data) => {
            // Server notifications usually stick for a bit, using same helper
            showNotification(data.message || data.type);
            if (['TURN_SKIPPED', 'INVALID'].some(k => (data.message || '').toUpperCase().includes(k))) {
                if ((data.message || '').includes('Skipped') && data.playerId === me.id) {
                    soundManager.playSkipped();
                } else {
                    soundManager.playInvalid();
                }
            }
        };
        socket.on('game_notification', handleNotification);
        return () => socket.off('game_notification', handleNotification);
    }, []);

    // Voice Announcement Logic
    useEffect(() => {
        if (gameState.status === 'PLAYING' && gameState.lastCalledNumber && !soundManager.muted) {
            // Include lastCallTime in dependency to re-trigger same number calls
            soundManager.playSpeech(gameState.lastCalledNumber.toString(), 0.85);
        }
    }, [gameState.lastCalledNumber, gameState.lastCallTime, gameState.status]);

    // Claim sound for all players
    const prevClaimedCounts = useRef({});
    useEffect(() => {
        if (gameState.status === 'PLAYING') {
            gameState.players.forEach(p => {
                const prev = prevClaimedCounts.current[p.userId] || 0;
                const curr = p.claimedLetters?.length || 0;
                if (curr > prev) {
                    if (p.userId !== me.userId) {
                        soundManager.playPop(); // Someone else claimed
                    }
                }
                prevClaimedCounts.current[p.userId] = curr;
            });
        }
    }, [gameState.players, gameState.status]);

    // Game End Sound
    const prevStatus = React.useRef(gameState.status);
    useEffect(() => {
        if (prevStatus.current !== 'ENDED' && gameState.status === 'ENDED') {
            if (gameState.winner?.id === me.id) {
                soundManager.playWin();
            } else {
                soundManager.playLose();
            }
        }
        prevStatus.current = gameState.status;
    }, [gameState.status, me.id, gameState.winner]);



    // Timer Logic moved to GameHeaderTimer for performance



    // Handlers
    const sendGameAction = (action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    };

    const handleRandomFill = (e) => {
        if (e) e.stopPropagation();
        const size = gridSize * gridSize;
        const numbers = Array.from({ length: size }, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        setMyGrid(numbers);
        setAvailableNumbers([]);
        updateDraft(numbers);
        setSetupMode('CUSTOM');
        setIsRandomMode(true);
        soundManager.playPop();
    };

    const updateDraft = (grid) => {
        sendGameAction({ type: 'UPDATE_DRAFT', grid });
    };

    const handleCustomFillInteraction = (index) => {
        const ctx = contextRef.current;
        if (ctx.isRandomMode) return;

        if (ctx.myGrid[index]) {
            const number = ctx.myGrid[index];
            const newGrid = [...ctx.myGrid];
            newGrid[index] = null;
            setMyGrid(newGrid);
            setAvailableNumbers(prev => [number, ...prev]);
            updateDraft(newGrid);
            soundManager.playClick();
        } else {
            if (ctx.availableNumbers.length === 0) return;
            const number = ctx.availableNumbers[0];
            const newGrid = [...ctx.myGrid];
            newGrid[index] = number;
            setMyGrid(newGrid);
            setAvailableNumbers(prev => prev.slice(1));
            updateDraft(newGrid);
            soundManager.playClick();
        }
    };

    // --- GLOBAL POINTER TRACKING ---

    const handleCellPointerDown = (e, index, num) => {
        const gs = gameStateRef.current;
        const ctx = contextRef.current;

        dragStateRef.current = {
            isDragging: false,
            path: [],
            startCellIndex: -1
        };
        setDragActive(false);

        if (gs.status === 'SETUP') {
            if (ctx.setupMode === 'CUSTOM') {
                dragStateRef.current.isDragging = true;
                setDragActive(true);
                handleCustomFillInteraction(index);
            }
        } else if (gs.status === 'PLAYING') {
            if (ctx.myMarkedCells.has(num)) {
                // START DRAG
                dragStateRef.current = {
                    isDragging: true,
                    path: [index],
                    startCellIndex: index
                };
                setDragActive(true);
            } else {
                // CLICK to Mark
                handleSingleClickGame(num);
            }
        }
    };

    useEffect(() => {
        const onPointerMove = (e) => {
            const state = dragStateRef.current;
            if (!state.isDragging) return;

            if (e.pointerType === 'mouse' && e.buttons === 0) {
                onPointerUp();
                return;
            }

            const gs = gameStateRef.current;
            const ctx = contextRef.current;

            const target = document.elementFromPoint(e.clientX, e.clientY);
            if (!target) return;

            const cellElement = target.closest('.bingo-cell');
            if (!cellElement) return;

            const indexStr = cellElement.getAttribute('data-index');
            if (indexStr === null) return;

            const index = parseInt(indexStr, 10);

            if (gs.status === 'SETUP' && ctx.setupMode === 'CUSTOM' && !ctx.isRandomMode) {
                if (!ctx.myGrid[index] && ctx.availableNumbers.length > 0) {
                    handleCustomFillInteraction(index);
                }
            } else if (gs.status === 'PLAYING') {
                const currentPath = state.path;
                if (!currentPath.includes(index)) {
                    state.path.push(index);
                    setPathVersion(v => v + 1);
                }
            }
        };

        const onPointerUp = () => {
            const state = dragStateRef.current;
            const gs = gameStateRef.current;

            try {
                if (gs.status === 'PLAYING' && state.isDragging) {
                    if (state.path.length > 1) {
                        validateAndClaimLine(state.path);
                    } else if (state.path.length === 1) {
                        showNotification("Already Marked");
                    }
                }
            } finally {
                // ALWAYS Clean up
                state.isDragging = false;
                state.path = [];
                state.startCellIndex = -1;
                setDragActive(false);
                setPathVersion(0);
            }
        };

        const validateAndClaimLine = (path) => {
            const ctx = contextRef.current;
            const size = gameStateRef.current.gridSize || 5;

            // Geometry Check
            let isValid = false;
            if (path.length === size) {
                const indices = [...path].sort((a, b) => a - b);

                // Row
                const row0 = Math.floor(indices[0] / size);
                if (indices.every(idx => Math.floor(idx / size) === row0)) isValid = true;
                // Col
                else {
                    const col0 = indices[0] % size;
                    if (indices.every(idx => idx % size === col0)) isValid = true;
                    else {
                        // Diag 1
                        if (indices[0] === 0 && indices.every((val, i, arr) => i === 0 || val - arr[i - 1] === size + 1)) isValid = true;
                        // Diag 2
                        else if (indices[0] === size - 1 && indices.every((val, i, arr) => i === 0 || val - arr[i - 1] === size - 1)) isValid = true;
                    }
                }
            }

            if (isValid) {
                const allMarked = path.every(idx => ctx.myMarkedCells.has(ctx.myGrid[idx]));
                if (allMarked) {
                    const myClaimed = ctx.mePlayer?.claimedLetters || [];
                    const SEQUENCE = ['B', 'I', 'N', 'G', 'O'];
                    if (myClaimed.length < 5) {
                        const nextLetter = SEQUENCE[myClaimed.length];
                        sendGameAction({ type: 'CLAIM_LETTER', letter: nextLetter });
                        soundManager.playSmallWin();
                    }
                } else {
                    showNotification("Complete the line first!");
                    soundManager.playInvalid();
                }
            } else {
                showNotification("Invalid Line!");
                soundManager.playInvalid();
            }
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointerleave', onPointerUp);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            window.removeEventListener('pointerleave', onPointerUp);
        };
    }, []);

    const handleSingleClickGame = (num) => {
        const gs = gameStateRef.current;
        const ctx = contextRef.current;
        const isTurn = gs.players[gs.turnIndex]?.id === ctx.me.id;
        const phase = gs.turnPhase;

        if (phase === 'CALLING') {
            if (isTurn) {
                sendGameAction({ type: 'CALL_NUMBER', number: num });
                soundManager.playClick();
                soundManager.playSpeech(num.toString(), 0.9);
            }
        } else if (phase === 'MARKING') {
            if (num === gs.lastCalledNumber) {
                sendGameAction({ type: 'MARK_NUMBER', number: num });
                soundManager.playClick();
            } else {
                showNotification("Invalid Selection!");
                soundManager.playInvalid();
            }
        }
    };

    // Render Helpers
    const renderGrid = () => {
        const displayGrid = myGrid.length > 0 ? myGrid : createEmptyGrid(gridSize);
        const currentPath = dragStateRef.current.path;

        return (
            <div
                className={`bingo-grid ${setupMode === 'CUSTOM' ? 'setup-mode' : ''}`}
                style={{
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`
                }}
            >
                {Array(gridSize * gridSize).fill(null).map((_, i) => {
                    const num = setupMode === 'CUSTOM' ? myGrid[i] : displayGrid[i];
                    const isMarked = myMarkedCells.has(num);
                    const isInteractive = setupMode === 'CUSTOM' && !isRandomMode && gameState.status === 'SETUP';

                    const isDragSelected = dragActive && currentPath.includes(i);

                    return (
                        <div
                            key={i}
                            data-index={i}
                            className={`bingo-cell ${isMarked ? 'marked' : ''} ${setupMode === 'CUSTOM' && !num ? 'empty-setup' : ''} ${isInteractive ? 'interactive' : ''} ${isDragSelected ? 'drag-selected' : ''}`}
                            onPointerDown={(e) => handleCellPointerDown(e, i, num)}
                        >
                            {num}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderPlayers = () => {
        const MAX_SIDE_PLAYERS = 9;
        const players = gameState.players || [];
        const sidePlayers = players.slice(0, MAX_SIDE_PLAYERS);
        const bottomPlayers = players.slice(MAX_SIDE_PLAYERS);
        return { sidePlayers, bottomPlayers };
    };

    const { sidePlayers, bottomPlayers } = renderPlayers();



    const setupModalNode = (gameState.status === 'SETUP' && !alreadySetUp && setupMode === 'CHOICE') ? (
        <div className="setup-modal-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="setup-modal-content" style={{ background: 'rgba(20, 30, 70, 0.95)', padding: '40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', boxShadow: '0 0 50px rgba(0,0,0,0.5)', pointerEvents: 'auto' }} onClick={e => e.stopPropagation()}>
                <h2>Start Your Game</h2>
                <p>Choose how to fill your {gridSize}x{gridSize} grid</p>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                    <Button variant="primary" onClick={handleRandomFill}>RANDOMIZE</Button>
                    <Button variant="secondary" onClick={() => setSetupMode('CUSTOM')}>CUSTOM FILL</Button>
                </div>
            </div>
        </div>
    ) : null;

    const handleDeclineReplay = () => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { type: 'DECLINE_PLAY_AGAIN', nonce }
        });
    };

    const handleLeaveGame = () => {
        socket.emit('leave_game', { roomId: room.id, userId: me.userId });
    };

    let gameOverNode = null;
    if (gameState.status === 'ENDED') {
        const bingoScores = (gameState.players || []).reduce((acc, p) => {
            acc[p.userId] = {
                primary: p.claimedLetters?.length || 0,
                secondary: p.lastClaimTime || 0,
                display: p.claimedLetters?.length || 0
            };
            return acc;
        }, {});

        const isHost = mePlayer?.isHost;
        gameOverNode = <GameOverOverlay
            winner={gameState.winner}
            players={gameState.players}
            scores={bingoScores}
            isHost={isHost}
            onRestart={() => handleGameAction({ type: 'RESTART_GAME' })}
            onVote={() => handleGameAction({ type: 'VOTE_PLAY_AGAIN' })}
            onClose={() => socket.emit('stop_game', { roomId: room.id })}
            onLeave={() => {
                if (gameState.players.length > 1) {
                    handleDeclineReplay();
                }
                soundManager.playClick();
                handleLeaveGame();
            }}
            meUserId={me.userId}
            title="BINGO WINNER!"
            scoreLabel="LETTERS CLAIMED"
            sortOrder="desc"
        />;
    }

    const getPhaseMessage = () => {
        if (gameState.status !== 'PLAYING') return '';
        if (gameState.turnPhase === 'CALLING') return 'WAITING FOR CALL...';
        if (gameState.turnPhase === 'MARKING') return `MARK ${gameState.lastCalledNumber} NOW!`;
        return '';
    };

    return (
        <GameWrapper room={room} me={me} title="BINGO" playScreen={
            <div className="bingo-game">
                <div className="bingo-layout">
                    <PopNotification show={!!notification} text={notification} color="#ff5555" />
                    <div className="left-panel">
                        {sidePlayers.map(p => (
                            <PlayerItem
                                key={p.id}
                                p={p}
                                meUserId={me.userId}
                                roomId={room.id}
                                turnIndex={gameState.turnIndex}
                                players={gameState.players}
                                turnStartTime={gameState.turnStartTime}
                                turnDuration={gameState.turnDuration}
                            />
                        ))}
                    </div>
                    <div className="center-panel">
                        {setupModalNode}
                        <div className="game-header" style={{ height: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative' }}>
                            {gameState.status === 'PLAYING' && (
                                <TurnIndicator
                                    isMyTurn={isMyTurn}
                                    playerName={gameState.players[gameState.turnIndex]?.name}
                                    variant="bingo"
                                />
                            )}
                            <div className="phase-label" style={{ fontSize: '0.8rem', opacity: 0.8, letterSpacing: '1px' }}>{getPhaseMessage()}</div>
                            {(gameState.status === 'SETUP' || gameState.turnPhase === 'MARKING' || (gameState.turnPhase === 'CALLING' && isMyTurn)) ? (
                                <GameHeaderTimer
                                    status={gameState.status}
                                    setupEndTime={gameState.setupEndTime}
                                    turnStartTime={gameState.turnStartTime}
                                    turnDuration={gameState.turnDuration}
                                    turnPhase={gameState.turnPhase}
                                />
                            ) : (
                                <div style={{ height: '2.5rem' }} />
                            )}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', position: 'relative', paddingTop: '10px' }}>
                            {gameState.status === 'SETUP' && setupMode === 'CUSTOM' && (
                                <div className="setup-instructions" style={{ textAlign: 'center', color: 'white', fontSize: '0.9rem', marginBottom: '10px' }}>
                                    {isRandomMode ? 'Grid Randomized!' : (availableNumbers.length > 0 ? `Drag/Click to fill` : 'Grid Full! Wait for timer.')}
                                </div>
                            )}
                            {renderGrid()}
                        </div>
                        <div className="game-footer" style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 'auto' }}>
                            <div className="claim-buttons" style={{ display: 'flex', gap: '5px' }}>
                                {['B', 'I', 'N', 'G', 'O'].map(l => {
                                    const myClaimed = mePlayer?.claimedLetters || [];
                                    const isClaimed = myClaimed.includes(l);
                                    return <div key={l} className={`claim-indicator ${isClaimed ? 'claimed' : ''}`} style={{ opacity: isClaimed ? 1 : 0.3, background: isClaimed ? '#4ade80' : 'rgba(255,255,255,0.1)', color: 'white', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: '900', border: isClaimed ? '2px solid white' : '1px solid rgba(255,255,255,0.2)' }}>{l}</div>;
                                })}
                            </div>
                        </div>
                        {bottomPlayers.length > 0 && (
                            <div className="bottom-players">
                                {bottomPlayers.map(p => (
                                    <PlayerItem
                                        key={p.userId}
                                        p={p}
                                        meUserId={me.userId}
                                        roomId={room.id}
                                        turnIndex={gameState.turnIndex}
                                        players={gameState.players}
                                        turnStartTime={gameState.turnStartTime}
                                        turnDuration={gameState.turnDuration}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="right-panel">
                        <div className="current-number-display" style={{ color: gameState.turnPhase === 'MARKING' ? '#FFD700' : 'white', borderColor: gameState.turnPhase === 'MARKING' ? '#FFD700' : 'white' }}>
                            {gameState.lastCalledNumber || '-'}
                        </div>
                        <div className="last-five-label" style={{ textAlign: 'center', opacity: 0.7, marginTop: '10px', fontSize: '0.8rem' }}>LAST CALLS</div>
                        <div className="last-five" style={{ flexDirection: 'column', alignItems: 'center' }}>
                            {gameState.calledNumbers.slice(-6, -1).reverse().map((n, i) => <div key={i} className="last-number" style={{ fontSize: 1.2 - i * 0.1 + 'rem' }}>{n}</div>)}
                        </div>
                    </div>
                </div>
            </div>
        }
            overlay={gameOverNode}
        />
    );
}
