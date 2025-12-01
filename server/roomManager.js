const UnoGame = require('./games/Uno');
const ExplodingKittens = require('./games/ExplodingKittens');

const GAME_REGISTRY = {
    'UNO': UnoGame,
    'EXPLODING_KITTENS': ExplodingKittens
};

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> { players: [], gameState: {}, ... }
    }

    createRoom(hostId, hostName) {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.rooms.set(roomId, {
            id: roomId,
            players: [{ id: hostId, name: hostName, isHost: true }],
            gameState: null,
            game: null, // The active game instance
            status: 'LOBBY' // LOBBY, PLAYING
        });
        return roomId;
    }

    joinRoom(roomId, playerId, playerName) {
        const room = this.rooms.get(roomId);
        if (!room) return { error: 'Room not found' };

        // Check if player already in room (reconnect?) - simplified for now
        const existingPlayer = room.players.find(p => p.id === playerId);
        if (!existingPlayer) {
            room.players.push({ id: playerId, name: playerName, isHost: false });
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
        if (!GameClass) return { error: 'Game not found' };

        room.game = new GameClass();
        if (room.game.init) {
            room.game.init(room.players);
        }
        room.gameState = room.game.getState();
        room.status = 'PLAYING';

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

        return { room };
    }

    handleGameAction(roomId, playerId, action) {
        const room = this.rooms.get(roomId);
        if (!room || !room.game) return { error: 'Game not active' };

        const player = room.players.find(p => p.id === playerId);
        if (!player) return { error: 'Player not found' };

        const changed = room.game.handleAction(action, player);
        if (changed) {
            room.gameState = room.game.getState();
            return { room };
        }
        return { noChange: true };
    }

    removePlayer(socketId) {
        // Find room with this player
        for (const [roomId, room] of this.rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socketId);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    this.rooms.delete(roomId);
                }
                return { roomId, room };
            }
        }
        return null;
    }
}

module.exports = new RoomManager();
