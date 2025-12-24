const UnoGame = require('./games/uno/logic');

const logger = require('./utils/logger');

const GAME_REGISTRY = {
    'UNO': UnoGame
};

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> { players: [], gameState: {}, ... }
    }

    createRoom(hostId, hostName, userId) {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.rooms.set(roomId, {
            id: roomId,
            players: [{ id: hostId, name: hostName, isHost: true, userId, connected: true, status: 'WAITING' }],
            gameState: null,
            game: null, // The active game instance
            status: 'LOBBY' // LOBBY, PLAYING
        });
        logger.info(`Room created: ${roomId} by ${hostName} (${hostId})`);
        return roomId;
    }

    joinRoom(roomId, playerId, playerName, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        // Check if player already in room (reconnect?)
        const existingPlayer = room.players.find(p => p.userId === userId);

        if (existingPlayer) {
            // Reconnection
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = playerId; // Update socket ID
            existingPlayer.connected = true;
            logger.info(`Player ${playerName} (${userId}) reconnected to room ${roomId} with new socket ${playerId}`);

            // Update active game if exists
            if (room.game && room.game.players) {
                const gamePlayer = room.game.players.find(p => p.id === oldSocketId);
                if (gamePlayer) {
                    gamePlayer.id = playerId;
                    // CRITICAL: Update gameState so the client gets the new ID in 'hands' map
                    room.gameState = room.game.getState();
                }
            }
        } else {
            // New Join
            // Check if name is taken? (Optional, but good practice)
            room.players.push({ id: playerId, name: playerName, isHost: false, userId, connected: true, status: 'WAITING' });
            logger.info(`Player ${playerName} (${playerId}) joined room ${roomId}`);
        }

        return { room };
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    startGame(roomId, gameId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        const GameClass = GAME_REGISTRY[gameId];
        if (!GameClass) return { error: `${gameId} not found` };

        try {
            room.game = new GameClass();
            if (room.game.init) {
                room.game.init(room.players);
            }
            room.players.forEach(p => p.status = 'PLAYING');
            room.gameState = room.game.getState();
            room.status = 'PLAYING';
            logger.info(`Game ${gameId} started in room ${roomId}`);
        } catch (error) {
            logger.error(`Error initializing game ${gameId} in room ${roomId}`, error);
            return { error: 'Failed to start game' };
        }

        return { room };
    }

    stopGame(roomId, hostId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        const player = room.players.find(p => p.id === hostId);
        if (!player || !player.isHost) return { error: 'Only host can stop game' };

        room.game = null;
        room.gameState = null;
        room.status = 'LOBBY';
        room.players.forEach(p => p.status = 'WAITING');
        logger.info(`Game stopped in room ${roomId} by host`);

        return { room };
    }

    leaveGame(roomId, playerId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        const player = room.players.find(p => p.id === playerId || (userId && p.userId === userId));
        if (!player) return { error: 'Player not found' };

        player.status = 'WAITING';
        logger.info(`Player ${player.name} left game in room ${roomId} (now WAITING)`);

        if (room.game && room.status === 'PLAYING') {
            // Remove from active game logic
            if (room.game.removePlayer) {
                const gameEnded = room.game.removePlayer(player.id);
                if (gameEnded) {
                    // Game is naturally over (e.g. 1 player remains)
                    // We keep room.status as 'PLAYING' so others can see the winner overlay.
                    // Eventually host will call stop_game to go back to lobby.
                    logger.info(`Game in room ${roomId} reached end state via player removal`);
                }
                room.gameState = room.game.getState();
            }
        }

        return { room };
    }

    handleGameAction(roomId, playerId, action) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'Game not active' };

        const player = room.players.find(p => p.id === playerId);
        if (!player) return { error: 'Player not found' };

        try {
            const changed = room.game.handleAction(action, player);
            if (changed) {
                room.gameState = room.game.getState();
                return { room };
            }
        } catch (error) {
            logger.error(`Error handling game action in room ${roomId}`, error);
            return { error: 'Game action failed' };
        }
        return { noChange: true };
    }

    handleDisconnect(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find(p => p.id === socketId);
            if (player) {
                player.connected = false;
                logger.info(`Player ${player.name} (${socketId}) disconnected from room ${roomId} (marked offline)`);
                return { roomId, room };
            }
        }
        return null;
    }

    removePlayer(socketId, userId) {
        // Find room with this player
        for (const [roomId, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socketId || (userId && p.userId === userId));
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                const wasHost = player.isHost;
                const actualSocketId = player.id;

                room.players.splice(playerIndex, 1);
                logger.info(`Player ${player.name} (${actualSocketId}) removed from room ${roomId}`);

                // If in game, remove them from game logic too
                if (room.game && room.status === 'PLAYING') {
                    room.game.removePlayer(actualSocketId);
                    room.gameState = room.game.getState();
                }

                if (room.players.length === 0) {
                    this.rooms.delete(roomId);
                    logger.info(`Room ${roomId} deleted (empty)`);
                } else if (wasHost) {
                    // Migrate host to next player
                    room.players[0].isHost = true;
                    logger.info(`Host migrated to ${room.players[0].name} in room ${roomId}`);
                }
                return { roomId, room };
            }
        }
        return null;
    }
}

module.exports = new RoomManager();
