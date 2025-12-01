const roomManager = require('./roomManager');

module.exports = (io, socket) => {
    // Join Room
    socket.on('join_room', ({ roomId, playerName }) => {
        const result = roomManager.joinRoom(roomId, socket.id, playerName);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(roomId);
            io.to(roomId).emit('room_updated', result.room);
        }
    });

    // Create Room
    socket.on('create_room', ({ playerName }) => {
        const roomId = roomManager.createRoom(socket.id, playerName);
        socket.join(roomId);
        socket.emit('room_created', roomId);
        // Also emit update to show the lobby
        const room = roomManager.getRoom(roomId);
        socket.emit('room_updated', room);
    });

    // Start Game
    socket.on('start_game', ({ roomId, gameId }) => {
        const result = roomManager.startGame(roomId, gameId);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            io.to(roomId).emit('room_updated', result.room);
        }
    });

    // Game Action
    socket.on('game_action', ({ roomId, action }) => {
        const result = roomManager.handleGameAction(roomId, socket.id, action);
        if (result.room) {
            io.to(roomId).emit('room_updated', result.room);
        }
    });

    // Stop Game
    socket.on('stop_game', ({ roomId }) => {
        const result = roomManager.stopGame(roomId, socket.id);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            io.to(roomId).emit('room_updated', result.room);
        }
    });

    // Disconnect
    socket.on('disconnect', () => {
        const result = roomManager.removePlayer(socket.id);
        if (result) {
            io.to(result.roomId).emit('room_updated', result.room);
        }
    });
};
