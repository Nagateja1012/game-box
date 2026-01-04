import React, { useMemo } from 'react';
import Card from './Card';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';
import TurnIndicator from '../../design-system/TurnIndicator';

const OpponentItem = React.memo(({ player, index, total, turnIndex, players, turnStartTime, roomId }) => {
    // Arc calculation logic
    const centerAngle = 270;
    const maxArc = 280;
    const arcWidth = Math.min(maxArc, (total - 1) * 45 + 60);
    const startAngle = centerAngle - arcWidth / 2;
    const angleStep = total > 1 ? arcWidth / (total - 1) : 0;
    const angle = startAngle + index * angleStep;
    const rad = (angle * Math.PI) / 180;
    const xRadius = Math.min(window.innerWidth * 0.38, 480);
    const yRadius = Math.min(window.innerHeight * 0.26, 220);
    const x = Math.cos(rad) * xRadius;
    const y = Math.sin(rad) * yRadius;

    const style = {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0)`,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        pointerEvents: 'auto'
    };

    const isTurn = players[turnIndex]?.id === player.id;
    const stats = useMemo(() => [{ icon: '🎴', value: player.cardCount }], [player.cardCount]);
    const tags = useMemo(() => player.isUno ? ['UNO!'] : [], [player.isUno]);

    return (
        <TurnTimer isActive={isTurn} turnStartTime={turnStartTime} variant="cards" style={style}>
            <PlayerBubble player={player} isMe={false} roomId={roomId} isTurn={isTurn} variant="cards" stats={stats} tags={tags} />
        </TurnTimer>
    );
});

const MeBubble = React.memo(({ me, players, turnIndex, turnStartTime, roomId }) => {
    const myPlayer = players.find(p => p.id === me.id);
    if (!myPlayer) return null;
    const isMyTurn = players[turnIndex]?.id === me.id;
    const stats = useMemo(() => [{ icon: '🎴', value: myPlayer.cardCount }], [myPlayer.cardCount]);
    const tags = useMemo(() => myPlayer.isUno ? ['UNO!'] : [], [myPlayer.isUno]);

    return (
        <TurnTimer isActive={isMyTurn} turnStartTime={turnStartTime} variant="cards">
            <PlayerBubble player={myPlayer} isMe={true} roomId={roomId} isTurn={isMyTurn} variant="cards" stats={stats} tags={tags} />
        </TurnTimer>
    );
});

export default function Table({
    players,
    me,
    topCard,
    direction,
    turnIndex,
    onDraw,
    currentColor,
    turnStartTime,
    roomId,
    turnDuration = 20000, // Default 30 seconds
    drawStack = 0
}) {
    // Filter out me from players to show opponents
    const opponents = players.filter(p => p.id !== me.id);

    // Calculate positions for opponents in a circle
    // We want "me" at bottom (not shown in ring), others distributed
    // But to keep it simple, we can just distribute them in a semi-circle or full circle
    // Let's do a full circle distribution relative to "me"

    // We need to order opponents starting from the player after "me"
    const myIndex = players.findIndex(p => p.id === me.id);
    const orderedOpponents = [];
    for (let i = 1; i < players.length; i++) {
        const idx = (myIndex + i) % players.length;
        orderedOpponents.push(players[idx]);
    }


    const [showTurnIndicator, setShowTurnIndicator] = React.useState(true);
    const prevTurnIndex = React.useRef(turnIndex);

    React.useEffect(() => {
        // Hide after 5 seconds on mount
        const timer = setTimeout(() => setShowTurnIndicator(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    React.useEffect(() => {
        if (turnIndex !== prevTurnIndex.current) {
            setShowTurnIndicator(true);
            prevTurnIndex.current = turnIndex;
            const timer = setTimeout(() => setShowTurnIndicator(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [turnIndex]);

    return (
        <div className="uno-table" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div className="opponents-ring" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                {orderedOpponents.map((player, index) => (
                    <OpponentItem
                        key={player.id}
                        player={player}
                        index={index}
                        total={orderedOpponents.length}
                        turnIndex={turnIndex}
                        players={players}
                        turnStartTime={turnStartTime}
                        roomId={roomId}
                    />
                ))}

                {/* Always show "me" at the bottom center */}
                {me && (
                    <div className="me-bubble-container" style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 150,
                        pointerEvents: 'auto'
                    }}>
                        <MeBubble
                            me={me}
                            players={players}
                            turnIndex={turnIndex}
                            turnStartTime={turnStartTime}
                            roomId={roomId}
                        />
                    </div>
                )}
            </div>

            <div className="center-area" style={{
                position: 'absolute',
                top: '54%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 500,
                pointerEvents: 'none'
            }}>
                {showTurnIndicator && (
                    <div style={{
                        position: 'absolute',
                        top: '-50px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}>
                        <TurnIndicator
                            isMyTurn={players[turnIndex]?.id === me.id}
                            playerName={players[turnIndex]?.name}
                            variant="cards"
                        />
                    </div>
                )}

                <div className="piles-container" style={{ display: 'flex', gap: '30px', alignItems: 'center', pointerEvents: 'auto' }}>
                    <div className="deck-pile" onClick={onDraw} style={{ cursor: 'pointer', position: 'relative' }}>
                        <div style={{ pointerEvents: 'none' }}>
                            <Card size="normal" />
                        </div>
                    </div>

                    {drawStack > 0 && (
                        <div style={{
                            writingMode: 'vertical-rl',
                            textOrientation: 'upright',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ff4d4d',
                            fontSize: '1.5rem',
                            fontWeight: '900',
                            letterSpacing: '1px',
                            textShadow: '0 0 10px rgba(255, 77, 77, 0.4)',
                            animation: 'pulse 1.5s infinite ease-in-out',
                            whiteSpace: 'nowrap',
                            userSelect: 'none'
                        }}>
                            +{drawStack}
                        </div>
                    )}

                    <div className="discard-pile" style={{ position: 'relative' }}>
                        {topCard && <Card key={topCard.id} card={topCard} size="normal" />}
                        {topCard?.color === 'BLACK' && currentColor && (
                            <div
                                className="color-indicator"
                                style={{
                                    position: 'absolute',
                                    bottom: -25,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: currentColor.toLowerCase() === 'red' ? '#ff4d4d' :
                                        currentColor.toLowerCase() === 'blue' ? '#4d4dff' :
                                            currentColor.toLowerCase() === 'green' ? '#4dff4d' :
                                                '#ffcc00',
                                    border: '3px solid white',
                                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
