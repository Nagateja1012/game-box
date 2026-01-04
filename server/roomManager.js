const EventEmitter = require('events');
const UnoGame = require('./games/uno/logic');
const BingoGame = require('./games/bingo/logic');
const UndercoverGame = require('./games/undercover/logic');

const logger = require('./utils/logger');
const { sanitize, VALIDATION_TYPES } = require('./utils/sanitizer');

const GAME_REGISTRY = {
    'UNO': UnoGame,
    'BINGO': BingoGame,
    'UNDERCOVER': UndercoverGame
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

class RoomManager extends EventEmitter {
    constructor() {
        super();
        this.rooms = new Map(); // roomId -> { players: [], gameState: {}, ... }
        this.disconnectionTimers = new Map(); // userId -> timeoutId
        this.DISCONNECT_TIMEOUT = 30000; // 30 seconds
        this.MAX_PLAYERS = 12;
        this.MAX_PLAYERS = 12;
        this.PLAYER_HEARTBEAT_TIMEOUT = 45000; // 45 seconds
        this.MAX_ROOM_DURATION = 120 * 60 * 1000; // 120 minutes

        // Start background cleanup
        this.cleanupInterval = setInterval(() => this.checkRoomTimeouts(), 10000); // Every 10 seconds
    }

    _sanitizeRoomId(roomId) {
        return sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
    }

    updateActivity(roomId) {
        // Kept for compatibility, but room closure is now purely based on player presence/heartbeats
        // We could use this to track "game" activity if needed later.
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
        if (room) {
            room.lastActivity = Date.now();
        }
    }

    updateHeartbeat(socketId, userId) {
        // Find player in any room
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find(p => p.id === socketId || (userId && p.userId === userId));
            if (player) {
                player.lastHeartbeat = Date.now();
                if (!player.connected) {
                    player.connected = true;
                    // Clear disconnection timer if it exists (implicit reconnect)
                    if (player.userId && this.disconnectionTimers.has(player.userId)) {
                        clearTimeout(this.disconnectionTimers.get(player.userId));
                        this.disconnectionTimers.delete(player.userId);
                        logger.info(`Disconnection timer cleared for ${player.name} (${player.userId}) via heartbeat`);
                    }
                }
                return;
            }
        }
    }

    createRoom(hostId, hostName, userId) {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const cleanHostName = sanitize(hostName, { maxLength: 20 });

        this.rooms.set(roomId, {
            id: roomId,
            players: [{
                id: hostId,
                name: cleanHostName,
                isHost: true,
                userId,
                connected: true,
                status: 'WAITING',
                lastHeartbeat: Date.now()
            }],
            gameState: null,
            game: null, // The active game instance
            status: 'LOBBY', // LOBBY, PLAYING
            createdAt: Date.now(),
            status: 'LOBBY', // LOBBY, PLAYING
            createdAt: Date.now(),
            lastActivity: Date.now(),
            processedNonces: new Map(), // nonce -> timestamp
            isProcessingAction: false
        });
        logger.info(`Room created: ${roomId} by ${hostName} (${hostId})`);
        return roomId;
    }

    joinRoom(roomId, playerId, playerName, userId) {
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
        if (!room) return { error: 'Room not found' };

        // Check if player already in room (reconnect?)
        const existingPlayer = room.players.find(p => p.userId === userId);

        if (existingPlayer) {
            // Reconnection
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = playerId; // Update socket ID
            existingPlayer.connected = true;
            logger.info(`Player ${playerName} (${userId}) reconnected to room ${roomId} with new socket ${playerId}`);

            // Sync to game logic
            if (room.game && room.game.updatePlayerStatus) {
                room.game.updatePlayerStatus(userId, { connected: true, id: playerId });
            }

            // Clear disconnection timer if it exists
            if (this.disconnectionTimers.has(userId)) {
                clearTimeout(this.disconnectionTimers.get(userId));
                this.disconnectionTimers.delete(userId);
                logger.info(`Disconnection timer cleared for ${playerName} (${userId})`);
            }

            // Update active game if exists
            if (room.game && room.game.players) {
                const gamePlayer = room.game.players.find(p => p.id === oldSocketId);
                if (gamePlayer) {
                    gamePlayer.id = playerId;
                    // CRITICAL: Update gameState so the client gets the new ID in 'hands' map
                    room.gameState = room.game.getState();

                    // Restore callback
                    room.game.onStateChange = () => {
                        room.gameState = room.game.getState();
                        this.emit('room_updated', roomId, this.getSerializableRoom(room));
                    };
                }
            }
        } else {
            // New Join
            if (room.players.length >= this.MAX_PLAYERS) {
                return { error: `Room is full (max ${this.MAX_PLAYERS} players)` };
            }
            // Check if name is taken? (Optional, but good practice)
            const cleanPlayerName = sanitize(playerName, { maxLength: 10 });
            room.players.push({
                id: playerId,
                name: cleanPlayerName,
                isHost: false,
                userId,
                connected: true,
                status: 'WAITING',
                lastHeartbeat: Date.now()
            });
            logger.info(`Player ${cleanPlayerName} (${playerId}) joined room ${roomId}`);
        }

        this.updateActivity(roomId);
        return { room: this.getSerializableRoom(room) };
    }

    getRoom(roomId) {
        return this.rooms.get(this._sanitizeRoomId(roomId));
    }


    getSerializableRoom(room) {
        if (!room) return null;
        return {
            id: room.id,
            players: room.players,
            gameState: room.gameState,
            status: room.status,
            game: room.game ? { id: room.game.id } : null
        };
    }

    startGame(roomId, gameId) {
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
        if (!room) return { error: 'Room not found' };

        const GameClass = GAME_REGISTRY[gameId];
        if (!GameClass) return { error: `${gameId} not found` };

        try {
            // Shuffle players for universal random turn order and display
            shuffleArray(room.players);

            room.game = new GameClass();
            if (room.game.init) {
                room.game.init(room.players, roomId);
            }
            room.players.forEach(p => p.status = 'PLAYING');
            room.gameState = room.game.getState();
            room.status = 'PLAYING';

            // Set state change callback
            room.game.onStateChange = () => {
                room.gameState = room.game.getState();
                this.emit('room_updated', roomId, this.getSerializableRoom(room));
            };

            logger.info(`Game ${gameId} started in room ${roomId}`);
        } catch (error) {
            logger.error(`Error initializing game ${gameId} in room ${roomId}`, error);
            return { error: 'Failed to start game' };
        }

        this.updateActivity(roomId);
        return { room: this.getSerializableRoom(room) };
    }

    stopGame(roomId, hostId) {
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
        if (!room) return { error: 'Room not found' };

        const player = room.players.find(p => p.id === hostId);
        if (!player || !player.isHost) return { error: 'Only host can stop game' };

        room.game = null;
        room.gameState = null;
        room.status = 'LOBBY';
        room.players.forEach(p => p.status = 'WAITING');
        logger.info(`Game stopped in room ${roomId} by host`);

        this.updateActivity(roomId);
        return { room: this.getSerializableRoom(room) };
    }

    leaveGame(roomId, playerId, userId) {
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
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

        this.updateActivity(roomId);
        return { room: this.getSerializableRoom(room) };
    }

    handleGameAction(roomId, playerId, action) {
        const cleanRoomId = this._sanitizeRoomId(roomId);
        const room = this.rooms.get(cleanRoomId);
        if (!room || !room.game) return { error: 'Game not active' };

        const player = room.players.find(p => p.id === playerId);
        if (!player) return { error: 'Player not found' };

        if (room.isProcessingAction) {
            return { error: 'Game is busy', noChange: true };
        }

        try {
            room.isProcessingAction = true;

            // Idempotency Check
            if (action.nonce) {
                if (room.processedNonces.has(action.nonce)) {
                    logger.info(`Duplicate action detected (nonce: ${action.nonce}) from ${playerId}. Ignoring.`);
                    return { noChange: true };
                }
                // Store nonce with timestamp
                room.processedNonces.set(action.nonce, Date.now());
            }

            const changed = room.game.handleAction(action, player);
            if (changed) {
                room.gameState = room.game.getState();
                this.updateActivity(roomId);
                return { room: this.getSerializableRoom(room) };
            }
        } catch (error) {
            logger.error(`Error handling game action in room ${roomId}`, error);
            return { error: 'Game action failed' };
        } finally {
            room.isProcessingAction = false;
        }
        return { noChange: true };
    }

    handleDisconnect(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            const player = room.players.find(p => p.id === socketId);
            if (player) {
                player.connected = false;
                logger.info(`Player ${player.name} (${socketId}) disconnected from room ${roomId} (marked offline)`);

                // Sync to game logic
                if (room.game && room.game.updatePlayerStatus) {
                    room.game.updatePlayerStatus(player.userId, { connected: false });
                }

                const userId = player.userId;
                if (userId) {
                    // Start disconnection timer
                    if (this.disconnectionTimers.has(userId)) {
                        clearTimeout(this.disconnectionTimers.get(userId));
                    }

                    const timeoutId = setTimeout(() => {
                        logger.info(`Player ${player.name} (${userId}) timed out after ${this.DISCONNECT_TIMEOUT}ms`);
                        this.disconnectionTimers.delete(userId);
                        const result = this.removePlayer(null, userId);
                        if (result) {
                            this.emit('room_updated', result.roomId, this.getSerializableRoom(result.room));
                        }
                    }, this.DISCONNECT_TIMEOUT);

                    this.disconnectionTimers.set(userId, timeoutId);
                    logger.info(`Disconnection timer started for ${player.name} (${userId}) - ${this.DISCONNECT_TIMEOUT}ms`);
                }

                return { roomId, room: this.getSerializableRoom(room) };
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

                // Sync to game logic if removing
                if (room.game && room.game.updatePlayerStatus) {
                    room.game.updatePlayerStatus(userId, { connected: false });
                }

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
                this.updateActivity(roomId);
                return { roomId, room: this.getSerializableRoom(room) };
            }
        }
        return null;
    }

    checkRoomTimeouts() {
        const now = Date.now();

        // 1. Check for player timeouts
        for (const [roomId, room] of this.rooms.entries()) {
            // Iterate backwards so we can safely remove if needed (though we use handleDisconnect which doesn't remove immediately)
            // Actually handleDisconnect just marks connected=false and starts timer.
            // We want to detect if heartbeat is OLD.

            [...room.players].forEach(player => {
                if (player.connected && (now - player.lastHeartbeat > this.PLAYER_HEARTBEAT_TIMEOUT)) {
                    logger.info(`Player ${player.name} missed heartbeats (last: ${now - player.lastHeartbeat}ms ago). Marking offline.`);
                    this.handleDisconnect(player.id);
                }

            });

            // Cleanup old nonces (keep for 5 minutes)
            if (room.processedNonces) {
                for (const [nonce, timestamp] of room.processedNonces.entries()) {
                    if (now - timestamp > 5 * 60 * 1000) {
                        room.processedNonces.delete(nonce);
                    }
                }
            }
        }

        // 2. Check for empty/expired rooms
        for (const [roomId, room] of this.rooms.entries()) {
            // Room is empty if 0 players matching
            // We can also consider "all players undefined/disconnected" but removePlayer removes them from array.
            // So empty array = empty room.

            const isEmpty = room.players.length === 0;
            const isExpired = now - room.createdAt > this.MAX_ROOM_DURATION;

            if (isEmpty || isExpired) {
                const reason = isEmpty ? 'EMPTY' : 'EXPIRED';
                if (isExpired) {
                    logger.info(`Closing room ${roomId} due to ${reason}`);
                    // Emit event for socketHandlers to broadcast
                    this.emit('room_closed', roomId, { reason });
                } else {
                    // Silent cleanup for empty rooms
                    // logger.info(`Cleaning up empty room ${roomId}`);
                }

                // Explicitly stop any active game (clears timers)
                if (room.game && room.game.stop) {
                    room.game.stop();
                }

                // Cleanup
                this.rooms.delete(roomId);

                // Clear any pending disconnect timers for players in this room
                room.players.forEach(p => {
                    if (p.userId && this.disconnectionTimers.has(p.userId)) {
                        clearTimeout(this.disconnectionTimers.get(p.userId));
                        this.disconnectionTimers.delete(p.userId);
                    }
                });
            }
        }
    }
}

module.exports = new RoomManager();
