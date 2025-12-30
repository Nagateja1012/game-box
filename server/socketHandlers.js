const roomManager = require('./roomManager');
const logger = require('./utils/logger');
const { sanitize, VALIDATION_TYPES } = require('./utils/sanitizer');

function init(io) {
    // Listen for async room updates from roomManager (e.g., timeout events)
    roomManager.on('room_updated', (roomId, room) => {
        // This is called for both manual turns and automatic timeouts
        logger.info(`Broadcasting state update to room ${roomId}`);
        io.to(roomId).emit('room_updated', room);
    });

    roomManager.on('room_closed', (roomId, { reason }) => {
        logger.info(`Room ${roomId} closed: ${reason}`);
        io.to(roomId).emit('room_closed', { reason });
    });
}

function setupSocketHandlers(io, socket) {
    // Join Room
    socket.on('join_room', ({ roomId, playerName, userId }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            logger.info(`Player ${playerName} (${socket.id}) joining room ${cleanRoomId}`);
            const result = roomManager.joinRoom(cleanRoomId, socket.id, playerName, userId);
            if (result.error) {
                logger.warn(`Join room failed: ${result.error}`, { roomId, playerName });
                socket.emit('error', result.error);
            } else {
                socket.join(roomId);
                io.to(roomId).emit('room_updated', result.room);
                logger.info(`Player joined room successfully`, { roomId });
            }
        } catch (error) {
            logger.error(`Error in join_room`, error);
            socket.emit('error', 'Internal server error during join');
        }
    });

    // Create Room
    socket.on('create_room', ({ playerName, userId }) => {
        try {
            logger.info(`Player ${playerName} (${socket.id}) creating room`);
            const roomId = roomManager.createRoom(socket.id, playerName, userId);
            socket.join(roomId);
            socket.emit('room_created', roomId);

            const room = roomManager.getRoom(roomId);
            socket.emit('room_updated', roomManager.getSerializableRoom(room));
            logger.info(`Room created successfully`, { roomId });
        } catch (error) {
            logger.error(`Error in create_room`, error);
            socket.emit('error', 'Internal server error during create');
        }
    });

    // Start Game
    socket.on('start_game', ({ roomId, gameId }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            logger.info(`Starting game ${gameId} in room ${cleanRoomId}`);
            const result = roomManager.startGame(cleanRoomId, gameId);
            if (result.error) {
                logger.warn(`Start game failed: ${result.error}`, { roomId, gameId });
                socket.emit('error', result.error);
            } else {
                io.to(roomId).emit('room_updated', result.room);
                logger.info(`Game started successfully`, { roomId });
            }
        } catch (error) {
            logger.error(`Error in start_game`, error);
            socket.emit('error', 'Internal server error during game start');
        }
    });

    // Game Action
    socket.on('game_action', ({ roomId, action }) => {
        try {
            // logger.info(`Game action in room ${roomId}`, { actionType: action.type, playerId: socket.id }); 
            // Commented out detailed action log to avoid spam, but can enable for debugging

            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            const result = roomManager.handleGameAction(cleanRoomId, socket.id, action);
            if (result.error) {
                // logger.warn(`Game action failed: ${result.error}`, { roomId, action });
                // Optional: emit error to user? usually game actions just fail silently if invalid
            } else if (result.room) {
                io.to(cleanRoomId).emit('room_updated', result.room);
            }
        } catch (error) {
            logger.error(`Error in game_action`, error);
            // socket.emit('error', 'Internal server error during game action');
        }
    });

    // Send Emote
    socket.on('send_emote', ({ roomId, emote }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            const cleanEmote = sanitize(emote, { maxLength: 10 });
            io.to(cleanRoomId).emit('player_emote', { playerId: socket.id, emote: cleanEmote });

            // Emotes count as manual activity to keep room alive
            roomManager.updateActivity(cleanRoomId);
        } catch (error) {
            logger.error(`Error in send_emote`, error);
        }
    });

    // Stop Game
    socket.on('stop_game', ({ roomId }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            logger.info(`Stopping game in room ${cleanRoomId}`);
            const result = roomManager.stopGame(cleanRoomId, socket.id);
            if (result.error) {
                logger.warn(`Stop game failed: ${result.error}`, { roomId: cleanRoomId });
                socket.emit('error', result.error);
            } else {
                io.to(cleanRoomId).emit('room_updated', result.room);
                logger.info(`Game stopped successfully`, { roomId: cleanRoomId });
            }
        } catch (error) {
            logger.error(`Error in stop_game`, error);
            socket.emit('error', 'Internal server error during stop game');
        }
    });

    // Leave Game (Return to Lobby)
    socket.on('leave_game', ({ roomId, userId }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            logger.info(`Player ${socket.id} (user: ${userId}) leaving game in room ${cleanRoomId}`);
            const result = roomManager.leaveGame(cleanRoomId, socket.id, userId);

            if (result.error) {
                socket.emit('error', result.error);
            } else {
                io.to(cleanRoomId).emit('room_updated', result.room);
                logger.info(`Player left game successfully`, { roomId: cleanRoomId });
            }
        } catch (error) {
            logger.error(`Error in leave_game`, error);
            socket.emit('error', 'Internal server error during leave game');
        }
    });

    // Leave Room
    socket.on('leave_room', ({ roomId, userId }) => {
        try {
            const cleanRoomId = sanitize(roomId, { maxLength: 6, allowedType: VALIDATION_TYPES.ALPHANUMERIC }).toUpperCase();
            logger.info(`Player ${socket.id} (user: ${userId}) leaving room ${cleanRoomId}`);
            const result = roomManager.removePlayer(socket.id, userId);

            socket.leave(cleanRoomId);
            socket.emit('left_room'); // Ack to sender

            if (result && result.room) {
                io.to(cleanRoomId).emit('room_updated', result.room);
                logger.info(`Player left room successfully`, { roomId: cleanRoomId });
            }
        } catch (error) {
            logger.error(`Error in leave_room`, error);
            socket.emit('error', 'Internal server error during leave');
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        try {
            // Use handleDisconnect instead of removePlayer to allow reconnection
            const result = roomManager.handleDisconnect(socket.id);
            if (result) {
                logger.info(`Player removed from room ${result.roomId} on disconnect`);
                io.to(result.roomId).emit('room_updated', result.room);
            }
        } catch (error) {
            logger.error(`Error in disconnect handler`, error);
        }
    });
}

module.exports = { init, setupSocketHandlers };
