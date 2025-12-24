const roomManager = require('./roomManager');
const logger = require('./utils/logger');

module.exports = (io, socket) => {
    // Join Room
    socket.on('join_room', ({ roomId, playerName, userId }) => {
        try {
            logger.info(`Player ${playerName} (${socket.id}) joining room ${roomId}`);
            const result = roomManager.joinRoom(roomId, socket.id, playerName, userId);
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
            socket.emit('room_updated', room);
            logger.info(`Room created successfully`, { roomId });
        } catch (error) {
            logger.error(`Error in create_room`, error);
            socket.emit('error', 'Internal server error during create');
        }
    });

    // Start Game
    socket.on('start_game', ({ roomId, gameId }) => {
        try {
            logger.info(`Starting game ${gameId} in room ${roomId}`);
            const result = roomManager.startGame(roomId, gameId);
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

            const result = roomManager.handleGameAction(roomId, socket.id, action);
            if (result.error) {
                // logger.warn(`Game action failed: ${result.error}`, { roomId, action });
                // Optional: emit error to user? usually game actions just fail silently if invalid
            } else if (result.room) {
                io.to(roomId).emit('room_updated', result.room);
            }
        } catch (error) {
            logger.error(`Error in game_action`, error);
            // socket.emit('error', 'Internal server error during game action');
        }
    });

    // Stop Game
    socket.on('stop_game', ({ roomId }) => {
        try {
            logger.info(`Stopping game in room ${roomId}`);
            const result = roomManager.stopGame(roomId, socket.id);
            if (result.error) {
                logger.warn(`Stop game failed: ${result.error}`, { roomId });
                socket.emit('error', result.error);
            } else {
                io.to(roomId).emit('room_updated', result.room);
                logger.info(`Game stopped successfully`, { roomId });
            }
        } catch (error) {
            logger.error(`Error in stop_game`, error);
            socket.emit('error', 'Internal server error during stop game');
        }
    });

    // Leave Game (Return to Lobby)
    socket.on('leave_game', ({ roomId, userId }) => {
        try {
            logger.info(`Player ${socket.id} (user: ${userId}) leaving game in room ${roomId}`);
            const result = roomManager.leaveGame(roomId, socket.id, userId);

            if (result.error) {
                socket.emit('error', result.error);
            } else {
                io.to(roomId).emit('room_updated', result.room);
                logger.info(`Player left game successfully`, { roomId });
            }
        } catch (error) {
            logger.error(`Error in leave_game`, error);
            socket.emit('error', 'Internal server error during leave game');
        }
    });

    // Leave Room
    socket.on('leave_room', ({ roomId, userId }) => {
        try {
            logger.info(`Player ${socket.id} (user: ${userId}) leaving room ${roomId}`);
            const result = roomManager.removePlayer(socket.id, userId);

            socket.leave(roomId);
            socket.emit('left_room'); // Ack to sender

            if (result && result.room) {
                io.to(roomId).emit('room_updated', result.room);
                logger.info(`Player left room successfully`, { roomId });
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
};
