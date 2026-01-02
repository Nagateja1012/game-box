import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import PlayerHand from './PlayerHand';
import { soundManager } from '../../utils/soundManager';
import './uno.css';
import Button from '../../design-system/Button';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import GameWrapper from '../../screens/GameWrapper';
import PopNotification from '../../design-system/PopNotification';

export default function Uno({ room, me }) {
    const { gameState } = room;
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingCard, setPendingCard] = useState(null);
    const [unoPopUp, setUnoPopUp] = useState(null);
    const [showInvalidMove, setShowInvalidMove] = useState(false);
    const [skipPopUp, setSkipPopUp] = useState(null);

    const lastProcessedShoutTime = React.useRef(gameState.lastUnoShout?.time || 0);
    const lastProcessedSkipTime = React.useRef(gameState.lastSkip?.timestamp || 0);
    const prevTurnIndex = React.useRef(gameState.turnIndex);
    const prevGameStatus = React.useRef(gameState.gameStatus);



    // Sound Effects Listeners
    useEffect(() => {
        // Game Start
        if (prevGameStatus.current === 'WAITING' && gameState.gameStatus === 'PLAYING') {
            soundManager.playGameStart();
        }
        // Game End
        if (prevGameStatus.current !== 'ENDED' && gameState.gameStatus === 'ENDED') {
            if (gameState.winner?.id === me.id) {
                soundManager.playWin();
            } else {
                soundManager.playLose();
            }
        }
        prevGameStatus.current = gameState.gameStatus;

        // Turn Change
        if (gameState.turnIndex !== prevTurnIndex.current) {
            prevTurnIndex.current = gameState.turnIndex;
        }
    }, [gameState.gameStatus, gameState.turnIndex]);

    useEffect(() => {
        const shout = gameState.lastUnoShout;
        if (shout && shout.time > lastProcessedShoutTime.current) {
            // Only show if the shout is very recent (within 5 seconds) to avoid historical popups on join
            const isRecent = Date.now() - shout.time < 5000;

            if (isRecent) {
                setUnoPopUp(shout);
                soundManager.playUnoShout();
                const timer = setTimeout(() => setUnoPopUp(null), 2000);
                lastProcessedShoutTime.current = shout.time;
                return () => clearTimeout(timer);
            } else {
                // If not recent, just update the ref to keep it quiet
                lastProcessedShoutTime.current = shout.time;
            }
        }
    }, [gameState.lastUnoShout?.time]);

    useEffect(() => {
        if (showInvalidMove) {
            const timer = setTimeout(() => setShowInvalidMove(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [showInvalidMove]);

    useEffect(() => {
        const skip = gameState.lastSkip;
        if (skip && skip.timestamp > lastProcessedSkipTime.current) {
            const isRecent = Date.now() - skip.timestamp < 5000;

            if (isRecent && skip.playerId === me.id) {
                setSkipPopUp(skip);
                soundManager.playSkipped();
                const timer = setTimeout(() => setSkipPopUp(null), 1500);
                lastProcessedSkipTime.current = skip.timestamp;
                return () => clearTimeout(timer);
            }
            lastProcessedSkipTime.current = skip.timestamp;
        }
    }, [gameState.lastSkip?.timestamp, me.id]);

    // Safety check
    if (!gameState || !gameState.players) {
        return <div className="loading-container">Loading game state...</div>;
    }

    const myHand = gameState.hands?.[me.id] || [];
    const mePlayer = gameState.players.find(p => p.id === me.id);
    const isMyTurn = gameState.players[gameState.turnIndex]?.id === me.id;

    const isValidMove = (card, topCard, drawStack, stackType, currentColor) => {
        // Stacking Logic
        if (drawStack > 0) {
            if (stackType === 'DRAW_TWO' && card.value === 'DRAW_TWO') return true;
            if (stackType === 'WILD_DRAW_FOUR' && card.value === 'WILD_DRAW_FOUR') return true;
            return false;
        }

        if (card.color === 'BLACK') return true; // Wilds always playable
        if (card.color === currentColor) return true; // Match color
        if (card.value === topCard.value) return true; // Match value
        return false;
    };

    const sendGameAction = (action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    };

    const handlePlayCard = (card) => {
        if (!isMyTurn) return;

        // Client-side validation
        if (!isValidMove(card, gameState.topCard, gameState.drawStack, gameState.stackType, gameState.currentColor)) {
            setShowInvalidMove(true);
            soundManager.playInvalid();
            return;
        }

        if (card.color === 'BLACK') {
            setPendingCard(card);
            setShowColorPicker(true);
        } else {
            sendGameAction({ type: 'PLAY_CARD', cardId: card.id });
            soundManager.playClick();
        }
    };

    const handleColorPick = (color) => {
        if (pendingCard) {
            sendGameAction({ type: 'PLAY_CARD', cardId: pendingCard.id, chosenColor: color });
            soundManager.playClick();
            setShowColorPicker(false);
            setPendingCard(null);
        }
    };

    const handleDraw = () => {
        if (!isMyTurn) return;
        sendGameAction({ type: 'DRAW_CARD' });
        soundManager.playPick();
    };

    const handlePass = () => {
        if (!isMyTurn) return;
        sendGameAction({ type: 'PASS_TURN' });
        soundManager.playClick();
    };

    const handleUnoShout = () => {
        sendGameAction({ type: 'UNO_SHOUT' });
    };

    const isHost = room.players.find(p => p.id === me.id)?.isHost;

    // Game Over Overlay
    let gameOverNode = null;
    if (gameState.gameStatus === 'ENDED') {
        gameOverNode = (
            <GameOverOverlay
                winner={gameState.winner}
                players={gameState.players}
                scores={gameState.scores || {}}
                isHost={isHost}
                onRestart={() => sendGameAction({ type: 'RESTART_GAME' })}
                onVote={() => sendGameAction({ type: 'VOTE_PLAY_AGAIN' })}
                onClose={() => socket.emit('stop_game', { roomId: room.id })}
                onLeave={() => socket.emit('leave_game', { roomId: room.id, userId: me.userId })}
                meUserId={me.userId}
                title="UNO WINNER!"
                scoreLabel="POINTS"
                sortOrder="asc"
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


                    <Table
                        players={gameState.players}
                        me={me}
                        topCard={gameState.topCard}
                        direction={gameState.direction}
                        turnIndex={gameState.turnIndex}
                        onDraw={handleDraw}
                        currentColor={gameState.currentColor}
                        turnStartTime={gameState.turnStartTime}
                        roomId={room.id}
                        turnDuration={gameState.turnDuration}
                        drawStack={gameState.drawStack}
                    />

                    <PopNotification
                        show={showInvalidMove}
                        text="INVALID CARD"
                    />

                    <PopNotification
                        show={!!skipPopUp}
                        text="SKIPPED!"
                        color="var(--accent-turn)"
                    />

                    <PopNotification
                        show={!!unoPopUp}
                        text="UNO!"
                        className="uno-popup-animation"
                        style={{ fontSize: '5rem', padding: '40px 80px' }}
                    >
                        <div className="shouter-name">{unoPopUp?.name}</div>
                    </PopNotification>

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
