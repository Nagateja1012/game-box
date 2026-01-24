import React, { useState, useEffect, useMemo } from 'react';
import GameWrapper from '../../screens/GameWrapper';
import { socket } from '../../socket';
import Board from './Board';
import './eights-and-fours.css';
import { soundManager } from '../../utils/soundManager';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';

export default function EightsAndFours({ room, me }) {
    const { gameState } = room;
    const [isRolling, setIsRolling] = useState(false);

    const sendGameAction = (action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    };

    const handleRoll = () => {
        if (isRolling) return;
        setIsRolling(true);
        soundManager.playClick();

        // Rolling animation duration
        setTimeout(() => {
            sendGameAction({ type: 'ROLL_DICE' });
            setIsRolling(false);
        }, 800);
    };

    const handleTokenClick = (tokenId) => {
        sendGameAction({ type: 'MOVE_TOKEN', tokenId });
        soundManager.playClick();
    };

    const myIndex = gameState?.players.findIndex(p => p.userId === me.userId);
    const isMyTurn = gameState?.turnIndex === myIndex;
    const canRoll = isMyTurn && gameState?.diceRoll === null && !isRolling;

    // Split players into sides: 8 on left, rest on right
    const players = gameState?.players || [];
    const leftSide = players.slice(0, 8);
    const rightSide = players.slice(8);

    const turnDuration = gameState?.turnDuration || 25000;

    return (
        <GameWrapper
            room={room}
            me={me}
            title="EIGHT'S & FOURS"
            playScreen={
                <div className="eights-fours-layout">
                    {/* Left Panel: Players 0-7 */}
                    <div className="side-panel left">
                        <div className="player-list">
                            {leftSide.map((p) => {
                                const pIdx = players.indexOf(p);
                                const isTurn = gameState.turnIndex === pIdx;
                                const stats = [{ icon: <div className="player-coin-dot" style={{ background: p.color }} />, value: '' }];
                                return (
                                    <div key={p.userId} className="player-timer-wrapper">
                                        <TurnTimer
                                            isActive={isTurn}
                                            variant="bingo"
                                            totalDuration={turnDuration}
                                            turnStartTime={isTurn ? gameState?.turnStartTime : undefined}
                                        >
                                            <PlayerBubble
                                                player={p}
                                                isMe={p.userId === me.userId}
                                                isTurn={isTurn}
                                                variant="bingo"
                                                stats={stats}
                                            />
                                        </TurnTimer>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Center: Board & Dice */}
                    <div className="board-container">
                        <div className="center-header"></div>

                        <Board
                            room={room}
                            me={me}
                            onTokenClick={handleTokenClick}
                        >
                            <div className={`board-dice-overlay ${!isMyTurn ? 'disabled' : ''}`}>
                                <div className="dice-section-inline">
                                    <div className="cowrie-dice-main">
                                        {[0, 1, 2, 3].map((i) => {
                                            const isUp = gameState?.cowrieStates?.[i] === 1;
                                            const isEight = gameState?.diceRoll === 8;
                                            return (
                                                <div
                                                    key={i}
                                                    className={`cowrie-main ${isRolling ? 'rolling' : ''} ${!isRolling && gameState?.cowrieStates ? (isUp ? 'up' : 'down') : ''} ${isEight && !isRolling ? 'red' : ''}`}
                                                >
                                                    <div className="cowrie-front">◌</div>
                                                    <div className="cowrie-back">◍</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {gameState?.diceRoll !== null && !isRolling && (gameState.diceRoll === 8 || gameState.diceRoll === 4) && (
                                        <div className="dice-indicator-tag">BONUS!</div>
                                    )}

                                    <button
                                        className="roll-btn-main"
                                        onClick={handleRoll}
                                        disabled={!canRoll}
                                    >
                                        {isRolling ? '...' : 'ROLL'}
                                    </button>
                                </div>
                            </div>
                        </Board>
                    </div>

                    {/* Right Panel: Players 8+ */}
                    {rightSide.length > 0 && (
                        <div className="side-panel right">
                            <div className="player-list">
                                {rightSide.map((p) => {
                                    const pIdx = players.indexOf(p);
                                    const isTurn = gameState.turnIndex === pIdx;
                                    const stats = [{ icon: <div className="player-coin-dot" style={{ background: p.color }} />, value: '' }];
                                    return (
                                        <div key={p.userId} className="player-timer-wrapper">
                                            <TurnTimer
                                                isActive={isTurn}
                                                variant="bingo"
                                                totalDuration={turnDuration}
                                                turnStartTime={isTurn ? gameState?.turnStartTime : undefined}
                                            >
                                                <PlayerBubble
                                                    player={p}
                                                    isMe={p.userId === me.userId}
                                                    isTurn={isTurn}
                                                    variant="bingo"
                                                    stats={stats}
                                                />
                                            </TurnTimer>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            }
        >
        </GameWrapper>
    );
}
