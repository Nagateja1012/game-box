import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import Table from './Table';
import Hand from './Hand';
import FutureModal from './FutureModal';
import './explodingKittens.css';
import Button from '../../design-system/Button';
import GameOverOverlay from '../../design-system/GameOverOverlay';
import GameWrapper from '../../screens/GameWrapper';

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

    if (!gameState) return <div className="loading-container">Loading...</div>;

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

    const isHost = room.players.find(p => p.id === me.id)?.isHost;

    // Game Over Overlay
    let gameOverNode = null;
    if (gameState.winner) {
        const actions = (
            <>
                {isHost && (
                    <Button
                        variant="primary"
                        style={{
                            width: '200px',
                            border: '2px solid #ff5555',
                            background: 'rgba(255, 85, 85, 0.2)'
                        }}
                        onClick={() => socket.emit('stop_game', { roomId: room.id })}
                    >
                        CLOSE GAME
                    </Button>
                )}

                <Button
                    variant="secondary"
                    style={{ width: '200px' }}
                    onClick={() => socket.emit('leave_game', { roomId: room.id })}
                >
                    BACK TO LOBBY
                </Button>
            </>
        );

        gameOverNode = (
            <GameOverOverlay
                winner={gameState.winner}
                players={gameState.players}
                actions={actions}
                scores={{}}
            />
        );
    }

    return (
        <GameWrapper
            room={room}
            me={me}
            title="EXPLODING KITTENS"
            playScreen={
                <div className="ek-game" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                    <Table
                        gameState={gameState}
                        myId={me.id}
                        onDraw={handleDraw}
                        isMyTurn={isMyTurn}
                    />

                    {showFutureModal && (
                        <FutureModal
                            cards={gameState.futureCards}
                            onClose={handleCloseFuture}
                            onReorder={handleReorderFuture}
                        />
                    )}
                </div>
            }
            playerHand={
                <Hand
                    cards={myPlayer?.hand || []}
                    onPlayCard={handlePlayCard}
                    isMyTurn={isMyTurn && !myPlayer?.isEliminated}
                />
            }
            overlay={gameOverNode}
        />
    );
}
