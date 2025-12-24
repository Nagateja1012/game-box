import React from 'react';
import Card from './Card';
import PlayerBubble from '../../design-system/PlayerBubble';
import TurnTimer from '../../design-system/TurnTimer';

export default function Table({
    players,
    me,
    topCard,
    direction,
    turnIndex,
    onDraw,
    currentColor,
    turnStartTime,
    turnDuration = 20000 // Default 30 seconds
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
                {orderedOpponents.map((player, index) => {
                    const total = orderedOpponents.length;

                    // Opponents start from the top (270deg) and spread outwards
                    // We avoid the bottom area (near 90deg) where 'me' is located
                    const centerAngle = 270;

                    // Arc width increases with player count, but capped to leave space at the bottom
                    const maxArc = 280;
                    const arcWidth = Math.min(maxArc, (total - 1) * 45 + 60);

                    const startAngle = centerAngle - arcWidth / 2;
                    const angleStep = total > 1 ? arcWidth / (total - 1) : 0;
                    const angle = startAngle + index * angleStep;

                    // Radian conversion
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
                        zIndex: 100
                    };

                    const isTurn = players[turnIndex]?.id === player.id;

                    return (
                        <TurnTimer
                            key={player.id}
                            isActive={isTurn}
                            turnStartTime={turnStartTime}
                            style={style}
                        >
                            <PlayerBubble
                                player={player}
                                isTurn={isTurn}
                                stats={[{ icon: '🎴', value: player.cardCount }]}
                                tags={player.isUno ? ['UNO!'] : []}
                            />
                        </TurnTimer>
                    );
                })}

                {/* Always show "me" at the bottom center */}
                {me && (
                    <div className="me-bubble-container" style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 150
                    }}>
                        {(() => {
                            const myPlayer = players.find(p => p.id === me.id);
                            if (!myPlayer) return null;
                            const isMyTurn = players[turnIndex]?.id === me.id;

                            return (
                                <TurnTimer
                                    isActive={isMyTurn}
                                    turnStartTime={turnStartTime}
                                >
                                    <PlayerBubble
                                        player={myPlayer}
                                        isTurn={isMyTurn}
                                        stats={[{ icon: '🎴', value: myPlayer.cardCount }]}
                                        tags={myPlayer.isUno ? ['UNO!'] : []}
                                    />
                                </TurnTimer>
                            );
                        })()}
                    </div>
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
                zIndex: 5
            }}>
                {showTurnIndicator && (
                    <div className="turn-indicator-modern" style={{
                        background: players[turnIndex]?.id === me.id ? 'var(--accent-turn)' : 'rgba(0, 0, 0, 0.8)',
                        position: 'absolute',
                        top: '-50px',
                        padding: '8px 25px',
                        borderRadius: '50px',
                        whiteSpace: 'nowrap',
                        fontWeight: '800',
                        fontSize: '1rem',
                        border: players[turnIndex]?.id === me.id ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                        animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    }}>
                        {players[turnIndex]?.id === me.id ? 'YOUR TURN' : `${players[turnIndex]?.name.toUpperCase()}'S TURN`}
                    </div>
                )}

                <div className="piles-container" style={{ display: 'flex', gap: '50px', alignItems: 'center' }}>
                    <div className="deck-pile" onClick={onDraw} style={{ cursor: 'pointer' }}>
                        <Card size="normal" />
                    </div>
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
