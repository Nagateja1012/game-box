import React from 'react';
import Card from './Card';

export default function Table({
    players,
    me,
    topCard,
    direction,
    turnIndex,
    onDraw,
    currentColor
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
        <div className="uno-table">
            <div className="opponents-ring">
                {orderedOpponents.map((player, index) => {
                    const total = orderedOpponents.length;
                    // Angle: Start from -90 (top) and go around
                    // If 1 opponent, top. If 2, top-left, top-right?
                    // Let's distribute evenly from angle 180 (left) to 0 (right) via top (-90)
                    // Or just full circle 0 to 360, but skip bottom area
                    // Let's try: Start at 200deg, end at 340deg? No.
                    // Let's place them on a circle.
                    // "Me" is at 90deg (bottom).
                    // So we distribute others from approx 120deg to 60deg (counter clockwise)

                    const angleStep = 240 / (total + 1); // Spread over 240 degrees (leaving 120 for bottom)
                    const startAngle = 150; // Start a bit up from left bottom
                    const angle = startAngle + (index + 1) * angleStep; // Clockwise

                    // Convert to radians
                    const rad = (angle * Math.PI) / 180;
                    const radius = 200; // Reduced from 250px to ensure visibility
                    const x = Math.cos(rad) * radius;
                    const y = Math.sin(rad) * radius;

                    // Adjust for center
                    const style = {
                        transform: `translate(${x}px, ${y}px)`
                    };

                    const isTurn = players[turnIndex].id === player.id;

                    return (
                        <div
                            key={player.id}
                            className={`opponent ${isTurn ? 'active' : ''}`}
                            style={{
                                left: '50%',
                                top: '40%', // Center of ring
                                ...style
                            }}
                        >
                            <div className="opponent-avatar">
                                {player.name[0].toUpperCase()}
                            </div>
                            <div className="opponent-name">{player.name}</div>
                            <div className="opponent-cards">
                                🎴 {player.cardCount}
                            </div>
                            {player.isUno && <div className="uno-tag">UNO!</div>}
                        </div>
                    );
                })}
            </div>

            <div className="center-area" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {showTurnIndicator && (
                    <div className="turn-indicator" style={{
                        background: players[turnIndex].id === me.id ? 'var(--accent-turn)' : 'rgba(0, 0, 0, 0.7)', // Use theme accent color
                        padding: '10px 30px',
                        borderRadius: '50px',
                        whiteSpace: 'nowrap',
                        width: 'max-content',
                        textAlign: 'center',
                        zIndex: 10,
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        border: players[turnIndex].id === me.id ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.3s ease-out',
                        marginBottom: '20px', // Spacing above the deck
                    }}>
                        {players[turnIndex].id === me.id ? 'Your Turn' : `${players[turnIndex].name}'s Turn`}
                    </div>
                )}

                <div className="piles-container" style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                    <div className="deck-pile" onClick={onDraw}>
                        <Card size="normal" /> {/* Back of card */}
                    </div>
                    <div className="discard-pile" style={{ position: 'relative' }}>
                        {topCard && <Card key={topCard.id} card={topCard} size="normal" />}
                        {/* Show current color indicator if Wild */}
                        {topCard?.color === 'BLACK' && currentColor && (
                            <div
                                className="color-indicator"
                                style={{
                                    position: 'absolute',
                                    bottom: -20,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: currentColor.toLowerCase() === 'red' ? '#ff5555' :
                                        currentColor.toLowerCase() === 'blue' ? '#5555ff' :
                                            currentColor.toLowerCase() === 'green' ? '#55ff55' :
                                                '#ffaa00',
                                    border: '2px solid white'
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
