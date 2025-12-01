import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import PlayerHand from './PlayerHand';
import { soundManager } from '../../utils/soundManager';
import './uno.css';

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

    // If game ended
    if (gameState.gameStatus === 'ENDED') {
        return (
            <div className="uno-game">
                <div className="winner-overlay">
                    <h1>WINNER!</h1>
                    <div className="winner-avatar" style={{ width: 100, height: 100, fontSize: '3em' }}>
                        {gameState.winner.name[0]}
                    </div>
                    <h2>{gameState.winner.name}</h2>

                    <div className="scores-board" style={{ margin: '20px 0', background: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 10 }}>
                        <h3>SCORES</h3>
                        {gameState.players
                            .map(p => ({ ...p, score: gameState.scores[p.id] || 0 }))
                            .sort((a, b) => a.score - b.score)
                            .map((p, i) => (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', width: 200, margin: '5px auto', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                                    <span>#{i + 1} {p.name}</span>
                                    <span>{p.score}</span>
                                </div>
                            ))}
                    </div>

                    {room.players.find(p => p.id === me.id)?.isHost && (
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: 20, padding: '10px 30px' }}
                            onClick={() => socket.emit('game_action', { roomId: room.id, action: { type: 'RESTART_GAME' } })}
                        >
                            PLAY AGAIN
                        </button>
                    )}

                    {room.players.find(p => p.id === me.id)?.isHost && (
                        <button
                            className="btn btn-secondary"
                            style={{ marginTop: 10, padding: '10px 30px' }}
                            onClick={() => socket.emit('stop_game', { roomId: room.id })}
                        >
                            BACK TO LOBBY
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const myHand = gameState.hands[me.id] || [];
    const mePlayer = gameState.players.find(p => p.id === me.id);
    const isMyTurn = gameState.players[gameState.turnIndex].id === me.id;

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
        // Sound handled by effect
    };

    const showUnoButton = isMyTurn && myHand.length <= 2 && !gameState.players.find(p => p.id === me.id)?.isUno;

    return (
        <div className="uno-game">
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

            <PlayerHand
                hand={myHand}
                onPlay={handlePlayCard}
                isTurn={isMyTurn}
            />

            {isMyTurn && mePlayer?.hasDrawn && (
                <button
                    className="btn btn-secondary"
                    style={{ position: 'absolute', bottom: 180, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
                    onClick={handlePass}
                >
                    PASS TURN
                </button>
            )}

            {gameState.drawStack > 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'red', fontSize: '2em', fontWeight: 'bold', textShadow: '0 0 10px black', pointerEvents: 'none' }}>
                    STACK: +{gameState.drawStack}
                </div>
            )}

            {showUnoButton && (
                <button className="uno-button" onClick={handleUnoShout}>
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
    );
}
