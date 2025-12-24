import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import PlayerHand from './PlayerHand';
import { soundManager } from '../../utils/soundManager';
import './uno.css';
import Button from '../../design-system/Button';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import GameWrapper from '../../screens/GameWrapper';

export default function Uno({ room, me }) {
    const { gameState } = room;
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingCard, setPendingCard] = useState(null);
    const [unoPopUp, setUnoPopUp] = useState(null);
    const [muted, setMuted] = useState(true);

    const lastProcessedShoutTime = React.useRef(0);
    const prevTurnIndex = React.useRef(gameState.turnIndex);
    const prevGameStatus = React.useRef(gameState.gameStatus);

    useEffect(() => {
        soundManager.setMuted(muted);
    }, [muted]);

    // Sound Effects Listeners
    useEffect(() => {
        // Game Start
        if (prevGameStatus.current === 'WAITING' && gameState.gameStatus === 'PLAYING') {
            soundManager.playGameStart();
        }
        // Game End
        if (prevGameStatus.current !== 'ENDED' && gameState.gameStatus === 'ENDED') {
            soundManager.playGameEnd();
        }
        prevGameStatus.current = gameState.gameStatus;

        // Turn Change
        if (gameState.turnIndex !== prevTurnIndex.current) {
            prevTurnIndex.current = gameState.turnIndex;
        }
    }, [gameState.gameStatus, gameState.turnIndex]);

    useEffect(() => {
        if (gameState.lastUnoShout && gameState.lastUnoShout.time > lastProcessedShoutTime.current) {
            setUnoPopUp(gameState.lastUnoShout);
            lastProcessedShoutTime.current = gameState.lastUnoShout.time;
            soundManager.playUnoShout();
            const timer = setTimeout(() => setUnoPopUp(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [gameState.lastUnoShout?.time]);

    // Safety check
    if (!gameState || !gameState.players) {
        return <div className="loading-container">Loading game state...</div>;
    }

    const myHand = gameState.hands?.[me.id] || [];
    const mePlayer = gameState.players.find(p => p.id === me.id);
    const isMyTurn = gameState.players[gameState.turnIndex]?.id === me.id;

    const handlePlayCard = (card) => {
        if (!isMyTurn) return;

        if (card.color === 'BLACK') {
            setPendingCard(card);
            setShowColorPicker(true);
        } else {
            socket.emit('game_action', {
                roomId: room.id,
                action: { type: 'PLAY_CARD', cardId: card.id }
            });
            soundManager.playClick();
        }
    };

    const handleColorPick = (color) => {
        if (pendingCard) {
            socket.emit('game_action', {
                roomId: room.id,
                action: { type: 'PLAY_CARD', cardId: pendingCard.id, chosenColor: color }
            });
            soundManager.playClick();
            setShowColorPicker(false);
            setPendingCard(null);
        }
    };

    const handleDraw = () => {
        if (!isMyTurn) return;
        socket.emit('game_action', {
            roomId: room.id,
            action: { type: 'DRAW_CARD' }
        });
        soundManager.playPick();
    };

    const handlePass = () => {
        if (!isMyTurn) return;
        socket.emit('game_action', {
            roomId: room.id,
            action: { type: 'PASS_TURN' }
        });
    };

    const handleUnoShout = () => {
        socket.emit('game_action', {
            roomId: room.id,
            action: { type: 'UNO_SHOUT' }
        });
    };

    const isHost = room.players.find(p => p.id === me.id)?.isHost;

    // Game Over Overlay
    let gameOverNode = null;
    if (gameState.gameStatus === 'ENDED') {
        const actions = (
            <>
                {isHost && (
                    <Button
                        variant="primary"
                        style={{ width: '200px' }}
                        onClick={() => socket.emit('game_action', { roomId: room.id, action: { type: 'RESTART_GAME' } })}
                    >
                        PLAY AGAIN
                    </Button>
                )}

                {isHost && (
                    <Button
                        variant="primary"
                        style={{
                            width: '200px',
                            border: '2px solid #ff5555',
                            background: 'rgba(255, 85, 85, 0.95)'
                        }}
                        onClick={() => socket.emit('stop_game', { roomId: room.id })}
                    >
                        CLOSE GAME
                    </Button>
                )}

                <Button
                    variant="secondary"
                    style={{ width: '200px' }}
                    onClick={() => socket.emit('leave_game', { roomId: room.id, userId: me.userId })}
                >
                    BACK TO LOBBY
                </Button>
            </>
        );

        gameOverNode = (
            <GameOverOverlay
                winner={gameState.winner}
                players={gameState.players}
                scores={gameState.scores || {}}
                actions={actions}
            />
        );
    }

    const showUnoButton = isMyTurn && myHand.length <= 2 && !gameState.players.find(p => p.id === me.id)?.isUno;

    return (
        <GameWrapper
            room={room}
            me={me}
            title="UNO"
            playScreen={
                <div className="uno-game" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                    <button
                        className="mute-btn"
                        onClick={() => setMuted(!muted)}
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 100, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        {muted ? '🔇' : '🔊'}
                    </button>

                    <Table
                        players={gameState.players}
                        me={me}
                        topCard={gameState.topCard}
                        direction={gameState.direction}
                        turnIndex={gameState.turnIndex}
                        onDraw={handleDraw}
                        currentColor={gameState.currentColor}
                    />

                    {isMyTurn && mePlayer?.hasDrawn && (
                        <Button
                            variant="secondary"
                            className="pass-btn"
                            style={{
                                position: 'absolute',
                                bottom: 20,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                                padding: '12px 40px',
                                fontSize: '1.1rem',
                                minWidth: '200px',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                            }}
                            onClick={handlePass}
                        >
                            PASS TURN
                        </Button>
                    )}

                    {gameState.drawStack > 0 && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'red', fontSize: '2em', fontWeight: 'bold', textShadow: '0 0 10px black', pointerEvents: 'none', zIndex: 20 }}>
                            STACK: +{gameState.drawStack}
                        </div>
                    )}

                    {showUnoButton && (
                        <button className="uno-button" onClick={handleUnoShout} style={{ bottom: '20px' }}>
                            UNO!
                        </button>
                    )}

                    {showColorPicker && (
                        <div className="color-picker-overlay">
                            <div className="color-options">
                                {['RED', 'BLUE', 'GREEN', 'YELLOW'].map(color => (
                                    <button
                                        key={color}
                                        className={`color-btn ${color.toLowerCase()}`}
                                        onClick={() => handleColorPick(color)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {unoPopUp && (
                        <div className="uno-popup-animation">
                            UNO!
                            <div className="shouter-name">{unoPopUp.name}</div>
                        </div>
                    )}
                </div>
            }
            playerHand={
                <PlayerHand
                    hand={myHand}
                    onPlay={handlePlayCard}
                    isTurn={isMyTurn}
                />
            }
            overlay={gameOverNode}
        />
    );
}
