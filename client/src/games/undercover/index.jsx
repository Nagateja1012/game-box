import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import { soundManager } from '../../utils/soundManager';
import './undercover.css';
import Button from '../../design-system/Button';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import GameWrapper from '../../screens/GameWrapper';
import PopNotification from '../../design-system/PopNotification';
import TurnIndicator from '../../design-system/TurnIndicator';
import PlayerAvatar from '../../design-system/PlayerAvatar';

export default function Undercover({ room, me }) {
    const { gameState } = room;
    const [clueInput, setClueInput] = useState('');
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [votedUserId, setVotedUserId] = useState(null);
    const [showInvalidClue, setShowInvalidClue] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [isVoteDelay, setIsVoteDelay] = useState(false);

    const prevPhase = useRef(gameState.phase);
    const prevGameStatus = useRef(gameState.gameStatus);

    useEffect(() => {
        // Sound Effects
        if (prevGameStatus.current === 'WAITING' && gameState.gameStatus === 'PLAYING') {
            soundManager.playGameStart();
        }

        if (prevPhase.current === 'CLUE' && gameState.phase === 'READ_CLUES') {
            setIsVoteDelay(true);
        }

        if (prevPhase.current === 'READ_CLUES' && gameState.phase === 'VOTE') {
            setIsVoteDelay(false);
            setShowVoteModal(true);
            setVotedUserId(null); // Reset vote for new round
        }

        if (gameState.gameStatus === 'ENDED') {
            setShowVoteModal(false);
            if (gameState.winner?.team === 'CIVILIANS') {
                const mePlayer = gameState.players.find(p => p.userId === me.userId);
                if (mePlayer?.role === 'CIVILIAN') soundManager.playWin();
                else soundManager.playLose();
            } else {
                const mePlayer = gameState.players.find(p => p.userId === me.userId);
                if (mePlayer?.role === 'UNDERCOVER') soundManager.playWin();
                else soundManager.playLose();
            }
        }

        prevPhase.current = gameState.phase;
        prevGameStatus.current = gameState.gameStatus;
    }, [gameState.phase, gameState.gameStatus]);

    if (!gameState || !gameState.players) {
        return <div className="loading-container">Loading game state...</div>;
    }

    const mePlayer = gameState.players.find(p => p.userId === me.userId);
    const handleVoteReplay = () => {
        sendGameAction({ type: 'VOTE_PLAY_AGAIN' });
    };

    const isMyTurn = gameState.players[gameState.turnIndex]?.userId === me.userId;
    const canVote = gameState.phase === 'VOTE' && !mePlayer?.isEliminated && !votedUserId;

    const sendGameAction = (action) => {
        const nonce = Math.random().toString(36).substring(2, 15);
        socket.emit('game_action', {
            roomId: room.id,
            action: { ...action, nonce }
        });
    };

    const handleSubmitClue = () => {
        if (!clueInput.trim()) return;

        // Check if word is mentioned
        if (clueInput.toLowerCase().includes(mePlayer.word.toLowerCase())) {
            setShowInvalidClue(true);
            setTimeout(() => setShowInvalidClue(false), 2000);
            return;
        }

        sendGameAction({ type: 'SUBMIT_CLUE', clue: clueInput });
        setClueInput('');
        soundManager.playClick();
    };

    const handleVote = (targetUserId) => {
        if (!canVote) return;
        setVotedUserId(targetUserId);
        sendGameAction({ type: 'CAST_VOTE', targetUserId });
        soundManager.playClick();
    };

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;
        sendGameAction({ type: 'SEND_MESSAGE', text: messageInput });
        setMessageInput('');
        soundManager.playClick();
    };

    const isHost = room.players.find(p => p.id === me.id)?.isHost;
    const activePlayer = gameState.players[gameState.turnIndex];

    let gameOverNode = null;
    if (gameState.gameStatus === 'ENDED') {
        gameOverNode = (
            <GameOverOverlay
                winner={gameState.winner}
                players={gameState.players}
                meUserId={me.userId}
                isHost={room.players.find(p => p.id === me.id)?.isHost}
                onVote={handleVoteReplay}
                onClose={() => socket.emit('stop_game', { roomId: room.id })}
                onLeave={() => socket.emit('leave_game', { roomId: room.id, userId: me.userId })}
                title={gameState.winner?.title || "GAME OVER"}
                scoreLabel="NONE"
            />
        );
    }

    return (
        <GameWrapper
            room={room}
            me={me}
            title="UNDERCOVER"
            playScreen={
                <div className="undercover-game">
                    <Table
                        players={gameState.players}
                        me={me}
                        clues={gameState.clues}
                        votes={gameState.votes}
                        phase={gameState.phase}
                        turnIndex={gameState.turnIndex}
                        timerStartTime={gameState.timerStartTime}
                        timerDuration={gameState.timerDuration}
                        onVote={handleVote}
                        votedUserId={votedUserId}
                        round={gameState.round}
                        clueInput={
                            gameState.phase === 'READ_CLUES' || isVoteDelay ? (
                                <div className="center-reading-delay">
                                    <div className="phase-title">Clues Recorded</div>
                                    <div className="phase-description">Reading time before voting...</div>
                                </div>
                            ) : (
                                gameState.phase === 'VOTE' ? (
                                    <div className="center-voting-placeholder">
                                        <div className="phase-title">DISCUSSION PHASE</div>
                                        <div className="phase-description">Open the voting modal to discuss and cast your vote!</div>
                                        <Button onClick={() => setShowVoteModal(true)} variant="primary">
                                            OPEN VOTING PANEL
                                        </Button>
                                    </div>
                                ) : (
                                    isMyTurn && !mePlayer?.isEliminated ? (
                                        <div className="center-clue-input">
                                            <div className="center-word-display">
                                                <div className="round-info">Round {gameState.round} / 3 • <span className={mePlayer?.role === 'UNDERCOVER' ? 'undercover-danger' : ''}>{mePlayer?.role === 'CIVILIAN' ? 'CIVILIAN' : 'UNDERCOVER'}</span></div>
                                                WORD: <span className="word-highlight">{mePlayer.word}</span>
                                            </div>
                                            <div className="clue-input-wrapper">
                                                <input
                                                    type="text"
                                                    className="clue-input"
                                                    placeholder="Submit Clue..."
                                                    value={clueInput}
                                                    onChange={(e) => setClueInput(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitClue()}
                                                    autoFocus
                                                />
                                                <Button onClick={handleSubmitClue} disabled={!clueInput.trim()}>
                                                    SUBMIT
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (!mePlayer?.isEliminated && (
                                        <div className="center-word-display stationary">
                                            <div className="round-info">Round {gameState.round} / 3 • <span className={mePlayer?.role === 'UNDERCOVER' ? 'undercover-danger' : ''}>{mePlayer?.role === 'CIVILIAN' ? 'CIVILIAN' : 'UNDERCOVER'}</span></div>
                                            YOUR WORD: <span className="word-highlight">{mePlayer.word}</span>
                                        </div>
                                    ))
                                )
                            )
                        }
                    />

                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100
                    }}>
                        <TurnIndicator
                            isMyTurn={isMyTurn}
                            playerName={activePlayer?.name}
                            variant="cards"
                        />
                    </div>

                    <PopNotification
                        show={showInvalidClue}
                        text="CANT SAY MAIN WORD!"
                        color="#f43f5e"
                    />

                    {gameState.phase === 'VOTE' && !mePlayer?.isEliminated && showVoteModal && (
                        <div className="vote-overlay" onClick={() => setShowVoteModal(false)}>
                            <div className="among-us-modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <div className="phase-title">WHO IS THE SPY?</div>
                                    <button className="close-modal" onClick={() => setShowVoteModal(false)}>×</button>
                                </div>

                                <div className="modal-body">
                                    <div className="voting-section">
                                        <div className="vote-list">
                                            {gameState.players.filter(p => !p.isEliminated).map(p => {
                                                const votersForP = Object.entries(gameState.votes)
                                                    .filter(([voterId, targetId]) => targetId === p.userId)
                                                    .map(([voterId]) => gameState.players.find(pl => pl.userId === voterId))
                                                    .filter(Boolean);

                                                return (
                                                    <div
                                                        key={p.userId}
                                                        className={`vote-row ${p.userId === me.userId ? 'me' : ''} ${votedUserId === p.userId ? 'selected' : ''}`}
                                                        onClick={() => p.userId !== me.userId && handleVote(p.userId)}
                                                    >
                                                        <div className="vote-player-info">
                                                            <PlayerAvatar name={p.name} size="md" image={p.image} />
                                                            <div className="vote-name">{p.name} {p.userId === me.userId ? '(YOU)' : ''}</div>
                                                        </div>

                                                        <div className="voter-avatars-row">
                                                            {votersForP.map(voter => (
                                                                <div key={voter.userId} className="voter-mini-avatar-wrap" title={voter.name}>
                                                                    <PlayerAvatar name={voter.name} size="xs" image={voter.image} />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {gameState.votes[p.userId] && (
                                                            <div className="voted-status-badge">VOTED</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="chat-section">
                                        <div className="discussion-chat-container">
                                            <div className="messages-list">
                                                {gameState.messages?.map((msg, i) => (
                                                    <div key={i} className={`chat-msg ${msg.userId === me.userId ? 'me' : ''}`}>
                                                        <span className="msg-name">{msg.name}:</span> {msg.text}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="chat-input-row">
                                                <input
                                                    type="text"
                                                    placeholder="Discuss..."
                                                    value={messageInput}
                                                    onChange={e => setMessageInput(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                                                />
                                                <Button variant="secondary" onClick={handleSendMessage} style={{ padding: '8px 15px' }}>SEND</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
            overlay={gameOverNode}
        />
    );
}
