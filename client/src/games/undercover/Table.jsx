import React, { useMemo } from 'react';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';
import PlayerAvatar from '../../design-system/PlayerAvatar';

const PlayerItem = React.memo(({ player, index, total, turnIndex, players, timerStartTime, timerDuration, clue, votes = {}, onVote, isMe, votedUserId, phase }) => {
    // Positioning logic (adapted from Uno)
    const centerAngle = 270;
    const maxArc = 280;
    const arcWidth = total > 1 ? Math.min(maxArc, (total - 1) * 45 + 60) : 0;
    const startAngle = centerAngle - arcWidth / 2;
    const angleStep = total > 1 ? arcWidth / (total - 1) : 0;
    const angle = isMe ? 90 : startAngle + index * angleStep;
    const rad = (angle * Math.PI) / 180;

    const xRadius = isMe ? 0 : Math.min(window.innerWidth * 0.42, 520);
    const yRadius = isMe ? 250 : Math.min(window.innerHeight * 0.3, 250);

    // For "Me" it's at the bottom
    const x = isMe ? 0 : Math.cos(rad) * xRadius;
    const y = isMe ? yRadius : Math.sin(rad) * yRadius;

    const style = {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        pointerEvents: 'auto'
    };

    const isTurn = players[turnIndex]?.userId === player.userId;
    const hasVoted = !!votes[player.userId];
    const voters = Object.entries(votes)
        .filter(([voterId, targetId]) => targetId === player.userId)
        .map(([voterId]) => players.find(p => p.userId === voterId))
        .filter(Boolean);

    return (
        <div style={style}>
            <TurnTimer isActive={isTurn} turnStartTime={timerStartTime} turnDuration={timerDuration}>
                <PlayerBubble
                    player={player}
                    isMe={isMe}
                    isTurn={isTurn}
                    className={player.isEliminated ? 'eliminated-overlay' : ''}
                />
            </TurnTimer>

            {phase === 'VOTE' && hasVoted && !player.isEliminated && (
                <div className="voted-indicator">
                    <span className="voted-check">✓</span>
                    <span className="voted-text">VOTED</span>
                </div>
            )}

            {clue && (
                <div className={`clue-bubble visible`} style={{
                    position: 'absolute',
                    top: '-60px',
                    left: '50%',
                    transform: 'translateX(-50%)'
                }}>
                    {clue}
                </div>
            )}

            {player.isEliminated && (
                <div className="eliminated-tag">Eliminated</div>
            )}

            {phase === 'VOTE' && voters.length > 0 && (
                <div className="voter-avatars">
                    {voters.map(voter => (
                        <div key={voter.userId} className="voter-mini-avatar" title={voter.name}>
                            <PlayerAvatar
                                name={voter.name}
                                size="sm"
                                image={voter.image}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default function Table({
    players,
    me,
    clues = {},
    votes = {},
    phase,
    turnIndex,
    timerStartTime,
    timerDuration,
    onVote,
    votedUserId,
    round,
    clueInput
}) {
    const myIndex = players.findIndex(p => p.userId === me.userId);
    const opponents = [];
    for (let i = 1; i < players.length; i++) {
        const idx = (myIndex + i) % players.length;
        opponents.push(players[idx]);
    }

    const mePlayer = players[myIndex];

    return (
        <div className="undercover-table" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div className="players-ring" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {opponents.map((player, index) => (
                    <PlayerItem
                        key={player.userId}
                        player={player}
                        index={index}
                        total={opponents.length}
                        turnIndex={turnIndex}
                        players={players}
                        timerStartTime={timerStartTime}
                        timerDuration={timerDuration}
                        clue={clues[player.userId]}
                        votes={votes}
                        onVote={onVote}
                        isMe={false}
                        votedUserId={votedUserId}
                        phase={phase}
                    />
                ))}

                {mePlayer && (
                    <PlayerItem
                        player={mePlayer}
                        index={-1}
                        total={players.length}
                        turnIndex={turnIndex}
                        players={players}
                        timerStartTime={timerStartTime}
                        timerDuration={timerDuration}
                        clue={clues[mePlayer.userId]}
                        votes={votes}
                        onVote={onVote}
                        isMe={true}
                        votedUserId={votedUserId}
                        phase={phase}
                    />
                )}
            </div>

            <div className="center-area" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 10
            }}>
                <div className="center-content-wrapper">
                    {clueInput}
                </div>
            </div>
        </div>
    );
}
