import React, { useState, useEffect, useMemo, useRef } from 'react';
import { socket } from '../../socket';
import { soundManager } from '../../utils/soundManager';
import GameWrapper from '../../screens/GameWrapper';
import Button from '../../design-system/Button';
import PopNotification from '../../design-system/PopNotification';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';
import './housie.css';

const AwardStats = React.memo(({ claims, score }) => (
    <div className="player-stats-container" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div className="award-stats" style={{ display: 'flex', gap: '3px', fontSize: '0.6rem' }}>
            {Object.entries(claims).map(([key, value]) => (
                <span key={key} style={{ opacity: value ? 1 : 0.2, background: value ? '#4ade80' : 'rgba(255,255,255,0.1)', padding: '1px 3px', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {key[0]}
                </span>
            ))}
        </div>
        <div className="player-score" style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#FFD700' }}>
            {score || 0} pts
        </div>
    </div>
));

const PlayerItem = React.memo(({ p, meUserId, roomId }) => {
    const stats = useMemo(() => [{ icon: '', value: <AwardStats claims={p.claims || {}} score={p.score} /> }], [p.claims, p.score]);
    const tags = useMemo(() => p.status === 'WAITING' ? ['OFFLINE'] : [], [p.status]);

    return (
        <PlayerBubble player={p} isMe={p.userId === meUserId} roomId={roomId} isTurn={false} variant="housie" stats={stats} tags={tags} />
    );
});

const GameHeaderTimer = React.memo(({ lastNum }) => {
    return (
        <div className="game-timer-container" style={{ position: 'relative' }}>
            <div className="current-number-display" style={{ margin: 0 }}>
                {lastNum || '--'}
            </div>
        </div>
    );
});

const TimerDot = React.memo(({ status, turnStartTime, turnDuration }) => {
    const [timeRemaining, setTimeRemaining] = useState(turnDuration);

    useEffect(() => {
        if (status !== 'PLAYING') return;
        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = Math.max(0, turnStartTime + turnDuration - now);
            setTimeRemaining(remaining);
        }, 100);
        return () => clearInterval(interval);
    }, [status, turnStartTime, turnDuration]);

    const isWarning = timeRemaining <= 2000;
    return (
        <div className="timer-dot-container" style={{ margin: '10px 0' }}>
            <div
                className={`timer-dot ${isWarning ? 'warning' : ''}`}
                style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isWarning ? '#ff4d4d' : '#4ade80',
                    boxShadow: isWarning ? '0 0 10px #ff4d4d' : '0 0 10px #4ade80',
                    transition: 'background 0.3s ease, box-shadow 0.3s ease'
                }}
            />
        </div>
    );
});

export default function Housie({ room, me }) {
    const { gameState } = room;
    const [notification, setNotification] = useState(null);
    const [lastClaimedId, setLastClaimedId] = useState(null);
    const mePlayer = gameState.players.find(p => p.userId === me.userId);
    const myMarkedCells = new Set(mePlayer?.markedCells || []);

    const notificationTimeoutRef = useRef(null);
    const showNotification = (msg) => {
        if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
        setNotification(msg);
        notificationTimeoutRef.current = setTimeout(() => {
            setNotification(null);
            notificationTimeoutRef.current = null;
        }, 2000);
    };

    // Track total claims to trigger sound/animation
    const totalClaims = useMemo(() => {
        return Object.values(gameState.claims).filter(Boolean).length;
    }, [gameState.claims]);

    const lastClaim = useMemo(() => {
        const sorted = Object.values(gameState.claims)
            .filter(Boolean)
            .sort((a, b) => b.time - a.time);
        return sorted[0];
    }, [gameState.claims]);

    useEffect(() => {
        if (lastClaim && (!lastClaimedId || lastClaim.time > lastClaimedId)) {
            setLastClaimedId(lastClaim.time);
            soundManager.playSmallWin();
            // Optional: trigger pulse animation on center panel
        }
    }, [totalClaims, lastClaim, lastClaimedId]);

    useEffect(() => {
        const handleNotification = (data) => {
            showNotification(data.message || data.type);
        };
        socket.on('game_notification', handleNotification);
        return () => socket.off('game_notification', handleNotification);
    }, []);

    useEffect(() => {
        if (gameState.status === 'PLAYING' && gameState.lastCalledNumber) {
            // Delay speech slightly to allow win sounds to be heard if they trigger simultaneously
            const timer = setTimeout(() => {
                soundManager.playSpeech(gameState.lastCalledNumber.toString(), 0.85);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [gameState.lastCalledNumber, gameState.status]);

    const sendGameAction = (action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    };

    const handleMark = (num) => {
        if (!num) return;
        if (gameState.status !== 'PLAYING') return;
        if (!gameState.calledNumbers.includes(num)) {
            showNotification("Not called yet!");
            soundManager.playInvalid();
            return;
        }
        if (myMarkedCells.has(num)) return;

        sendGameAction({ type: 'MARK_NUMBER', number: num });
        soundManager.playClick();
    };

    const handleClaim = (award) => {
        if (gameState.claims[award]) return;
        sendGameAction({ type: 'CLAIM_AWARD', award });
    };

    const renderTicket = () => {
        if (!mePlayer?.ticket) return null;
        return (
            <div className={`housie-ticket ${lastClaim ? 'award-pulse' : ''}`}>
                {mePlayer.ticket.map((row, rIdx) => (
                    <div key={rIdx} className="housie-row">
                        {row.map((num, cIdx) => (
                            <div
                                key={cIdx}
                                className={`housie-cell ${num ? 'has-number' : 'empty'} ${myMarkedCells.has(num) ? 'marked' : ''}`}
                                onClick={() => handleMark(num)}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    const awards = [
        { id: 'EARLY_FIVE', label: 'Early Five', pts: 10 },
        { id: 'FOUR_CORNERS', label: 'Corners', pts: 20 },
        { id: 'TOP_LINE', label: 'Top Line', pts: 15 },
        { id: 'MIDDLE_LINE', label: 'Middle Line', pts: 15 },
        { id: 'BOTTOM_LINE', label: 'Bottom Line', pts: 15 },
        { id: 'FULL_HOUSE', label: 'Full House', pts: 30 }
    ];

    let gameOverNode = null;
    if (gameState.status === 'ENDED') {
        const scores = (gameState.players || []).reduce((acc, p) => {
            acc[p.userId] = {
                primary: p.score || 0,
                display: p.score || 0
            };
            return acc;
        }, {});

        gameOverNode = <GameOverOverlay
            winner={gameState.winner}
            players={gameState.players}
            scores={scores}
            isHost={mePlayer?.isHost}
            onRestart={() => sendGameAction({ type: 'RESTART_GAME' })}
            onVote={() => sendGameAction({ type: 'VOTE_PLAY_AGAIN' })}
            onClose={() => socket.emit('stop_game', { roomId: room.id })}
            onLeave={() => sendGameAction({ type: 'DECLINE_PLAY_AGAIN' })}
            meUserId={me.userId}
            title="HOUSIE COMPLETED!"
            scoreLabel="TOTAL POINTS"
            sortOrder="desc"
        />;
    }

    return (
        <GameWrapper room={room} me={me} title="HOUSIE" playScreen={
            <div className="housie-game">
                <style>
                    {`
                    @keyframes claim-pulse {
                        0% { transform: scale(1); box-shadow: 0 0 0px #4ade80; }
                        50% { transform: scale(1.02); box-shadow: 0 0 20px #4ade80; }
                        100% { transform: scale(1); box-shadow: 0 0 0px #4ade80; }
                    }
                    .award-pulse {
                        animation: claim-pulse 1s ease-in-out;
                    }
                    `}
                </style>
                <div className="housie-layout">
                    <PopNotification show={!!notification} text={notification} color="#4ade80" />
                    <div className="left-panel">
                        {gameState.players.slice(0, 5).map(p => (
                            <PlayerItem key={p.userId} p={p} meUserId={me.userId} roomId={room.id} />
                        ))}
                    </div>
                    <div className="center-panel">
                        <div className="game-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <TimerDot status={gameState.status} turnStartTime={gameState.turnStartTime} turnDuration={gameState.turnDuration} />
                            <h2 style={{ fontSize: '1rem', opacity: 0.8, margin: 0 }}>HOUSIE TICKET</h2>
                        </div>
                        {renderTicket()}
                        <div className="awards-container">
                            {awards.map(a => {
                                const claim = gameState.claims[a.id];
                                return (
                                    <button
                                        key={a.id}
                                        className={`award-button ${claim ? 'claimed' : ''}`}
                                        disabled={!!claim}
                                        onClick={() => handleClaim(a.id)}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>{a.label}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.9 }}>{a.pts} Points</span>
                                        {claim && <span className="award-winner" style={{ fontSize: '0.6rem', color: '#064e3b' }}>by {claim.name}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="right-panel">
                        <GameHeaderTimer
                            lastNum={gameState.lastCalledNumber}
                        />
                        <div className="last-calls-label" style={{ opacity: 0.7, fontSize: '0.8rem', marginTop: '10px' }}>RECENTLY CALLED</div>
                        <div className="last-calls">
                            {gameState.calledNumbers.slice(-6, -1).reverse().map((n, i) => (
                                <div key={i} className="last-number" style={{ opacity: 1 - i * 0.15 }}>{n}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        }
            overlay={gameOverNode}
        />
    );
}
