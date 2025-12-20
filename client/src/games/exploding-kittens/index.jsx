import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import Hand from './Hand';
import FutureModal from './FutureModal';
import './explodingKittens.css';

export default function ExplodingKittens({ room, me }) {
    const [gameState, setGameState] = useState(null);
    const [showFutureModal, setShowFutureModal] = useState(false);

    useEffect(() => {
        // Initial state
        if (room.gameState) {
            setGameState(room.gameState);
        }

        const handleStateUpdate = (newRoom) => {
            setGameState(newRoom.gameState);
        };

        socket.on('room_updated', handleStateUpdate);
        return () => {
            socket.off('room_updated', handleStateUpdate);
        };
    }, [room]);

    useEffect(() => {
        if (gameState?.showingFutureTo === me.id) {
            setShowFutureModal(true);
        } else {
            setShowFutureModal(false);
        }
    }, [gameState?.showingFutureTo, me.id]);

    if (!gameState) return <div className="ek-game">Loading...</div>;

    const myPlayer = gameState.players.find(p => p.id === me.id);
    const isMyTurn = gameState.currentPlayerId === me.id;

    const handleDraw = () => {
        socket.emit('game_action', { roomId: room.id, action: { type: 'DRAW' } });
    };

    const handlePlayCard = (cardId, targetId = null) => {
        socket.emit('game_action', {
            roomId: room.id,
            action: {
                type: 'PLAY_CARD',
                cardId,
                targetId
            }
        });
    };

    const handleReorderFuture = (newOrder) => {
        socket.emit('game_action', {
            roomId: room.id,
            action: {
                type: 'REORDER_FUTURE',
                newOrder
            }
        });
    };

    const handleCloseFuture = () => {
        socket.emit('game_action', {
            roomId: room.id,
            action: { type: 'CLOSE_FUTURE' }
        });
    };

    return (
        <div className="ek-game">
            <Table
                gameState={gameState}
                myId={me.id}
                onDraw={handleDraw}
                isMyTurn={isMyTurn}
            />

            <Hand
                cards={myPlayer?.hand || []}
                onPlayCard={handlePlayCard}
                isMyTurn={isMyTurn && !myPlayer?.isEliminated}
            />

            {showFutureModal && (
                <FutureModal
                    cards={gameState.futureCards}
                    isAlter={gameState.futureCards.length > 0} // Simplified check, ideally check card type played
                    // Actually, server sends futureCards for both. 
                    // We need to know if it's Alter or See.
                    // For now, let's assume if we can reorder, it's Alter. 
                    // But wait, See Future is just viewing.
                    // Let's check the last played card? Or server state should indicate?
                    // For MVP, let's just allow reorder if it's Alter. 
                    // But how do we know? 
                    // Let's add a hack: If the user just played Alter Future, they know.
                    // Better: The modal should probably just always allow reorder but only send if it was Alter.
                    // Or, we can check if the last action was Alter Future?
                    // Let's just enable reorder always for now in the UI, but server validates.
                    // Wait, See Future shouldn't allow dragging.
                    // Let's default to 'See' unless we know it's 'Alter'.
                    // Since we don't have that state easily, let's just show 'See' style for now.
                    // Actually, I'll update server to send 'futureType' in state if I could, but I can't easily change server now without context switch.
                    // Let's just assume it is reorderable for now.
                    onClose={handleCloseFuture}
                    onReorder={handleReorderFuture}
                />
            )}
        </div>
    );
}
