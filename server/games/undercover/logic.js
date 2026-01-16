const logger = require('../../utils/logger');
const { WORD_PAIRS } = require('./words');

class UndercoverGame {
    constructor() {
        this.id = 'UNDERCOVER';
        this.players = [];
        this.gameStatus = 'WAITING'; // WAITING, PLAYING, ENDED
        this.round = 1;
        this.maxRounds = 3;
        this.phase = 'CLUE'; // CLUE, VOTE
        this.turnIndex = 0;
        this.clues = {}; // userId -> clue
        this.votes = {}; // voterUserId -> votedUserId
        this.eliminatedUsers = new Set();
        this.winner = null;

        this.currentWordPair = null;
        this.civilianWord = '';
        this.undercoverWord = '';

        this.clueDuration = 22000; // 22 seconds (2s buffer for UI)
        this.voteDuration = 42000; // 42 seconds (2s buffer for UI)
        this.timer = null;
        this.timerStartTime = null;
        this.messages = [];

        this.onStateChange = null;
        this.seed = null;
        this.random = null;
    }

    // Mulberry32 PRNG
    createPRNG(seedStr) {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < seedStr.length; i++) {
            h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
        }

        let a = h >>> 0;
        return function () {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    updateSeed() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];
        this.seed = `${dateStr}-${timeStr}-${this.id}-${this.roomId}`;
        this.random = this.createPRNG(this.seed);
        logger.info(`Game seed updated: ${this.seed}`);
    }

    init(players, roomId) {
        this.roomId = roomId;
        this.updateSeed();

        this.players = players.map(p => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            role: 'CIVILIAN', // Default
            word: '',
            connected: true,
            isEliminated: false,
            wantsRematch: false
        }));

        this.assignRolesAndWords();
        this.gameStatus = 'PLAYING';
        this.startCluePhase();
    }

    assignRolesAndWords() {
        // Choose word pair using seeded random
        const wordPair = WORD_PAIRS[Math.floor(this.random() * WORD_PAIRS.length)];

        this.civilianWord = wordPair.civilian;
        this.undercoverWord = wordPair.undercover;

        // Assign Undercover
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const undercoverCount = alivePlayers.length >= 6 ? 2 : 1;

        // Reset roles for alive players
        alivePlayers.forEach(p => p.role = 'CIVILIAN');

        // Pick random undercover(s) using seeded shuffle
        const shuffled = [...alivePlayers].sort(() => 0.5 - this.random());
        for (let i = 0; i < undercoverCount; i++) {
            if (shuffled[i]) { // Ensure player exists
                shuffled[i].role = 'UNDERCOVER';
            }
        }

        // Assign words
        this.players.forEach(p => {
            if (!p.isEliminated) {
                p.word = p.role === 'CIVILIAN' ? this.civilianWord : this.undercoverWord;
            } else {
                p.word = '';
            }
        });

        this.clues = {};
        this.votes = {};
    }

    startCluePhase() {
        this.phase = 'CLUE';
        this.turnIndex = this.players.findIndex(p => !p.isEliminated);
        this.startTimer(this.clueDuration, () => this.handleClueTimeout());
    }

    handleClueTimeout() {
        const currentPlayer = this.players[this.turnIndex];
        if (currentPlayer && !this.clues[currentPlayer.userId]) {
            this.clues[currentPlayer.userId] = '...'; // Default clue
        }
        this.advanceClueTurn();
    }

    advanceClueTurn() {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        let nextIndex = this.turnIndex + 1;
        while (nextIndex < this.players.length && this.players[nextIndex].isEliminated) {
            nextIndex++;
        }

        if (nextIndex < this.players.length) {
            this.turnIndex = nextIndex;
            this.startTimer(this.clueDuration, () => this.handleClueTimeout());
        } else {
            // All clues submitted, transition to READ_CLUES phase
            this.phase = 'READ_CLUES';
            this.timerStartTime = Date.now();
            this.startTimer(5000, () => this.startVotePhase()); // 5 seconds to read clues
        }
        this.emitStateChange();
    }

    startVotePhase() {
        this.phase = 'VOTE';
        this.startTimer(this.voteDuration, () => this.handleVoteTimeout());
        this.emitStateChange();
    }

    handleVoteTimeout() {
        this.processVotes();
    }

    processVotes() {
        const voteCounts = {};
        Object.values(this.votes).forEach(votedId => {
            voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
        });

        let mostVotedId = null;
        let maxVotes = 0;
        // Find the player with the most votes
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > maxVotes) {
                maxVotes = count;
                mostVotedId = id;
            }
        }

        // Handle ties: if multiple players have maxVotes, no one is eliminated
        const tiedPlayers = Object.entries(voteCounts).filter(([, count]) => count === maxVotes);
        if (tiedPlayers.length > 1) {
            logger.info("Vote resulted in a tie, no one eliminated.");
            mostVotedId = null; // No elimination on tie
        }


        if (mostVotedId) {
            const eliminatedPlayer = this.players.find(p => p.userId === mostVotedId);
            if (eliminatedPlayer) {
                eliminatedPlayer.isEliminated = true;
                this.eliminatedUsers.add(mostVotedId);
                logger.info(`Player ${eliminatedPlayer.name} eliminated.`);
            }
        }

        this.checkWinCondition();
    }

    checkWinCondition() {
        const alivePlayers = this.players.filter(p => !p.isEliminated);
        const undercoverAlive = alivePlayers.filter(p => p.role === 'UNDERCOVER');

        if (undercoverAlive.length === 0) {
            this.endGame('CIVILIANS');
        } else if (alivePlayers.length <= 2 || (this.round >= this.maxRounds && this.phase === 'VOTE')) {
            // If only 2 players left or 3 rounds finished
            this.endGame('UNDERCOVER');
        } else {
            this.nextRound();
        }
    }

    nextRound() {
        this.round++;
        if (this.round > this.maxRounds) {
            this.endGame('UNDERCOVER');
            return;
        }
        this.assignRolesAndWords();
        this.startCluePhase();
        this.emitStateChange();
    }

    endGame(winnerTeam) {
        this.gameStatus = 'ENDED';
        let winnerName = '';
        if (winnerTeam === 'CIVILIANS') {
            winnerName = 'CIVILIANS';
        } else {
            const undercovers = this.players.filter(p => p.role === 'UNDERCOVER');
            winnerName = undercovers.map(p => p.name).join(', ');
        }
        this.winner = {
            team: winnerTeam,
            name: winnerName,
            title: winnerTeam === 'CIVILIANS' ? 'CIVILIANS WON!' : 'UNDERCOVERS WON!'
        };
        this.clearTimer();
        this.emitStateChange();
    }

    handleAction(action, player) {
        // Special case for rematch actions when game is ENDED
        if (this.gameStatus !== 'PLAYING' && action.type !== 'VOTE_PLAY_AGAIN' && action.type !== 'RESTART_GAME') return false;

        const p = this.players.find(p => p.userId === player.userId);
        if (!p) return false;

        // In-game actions are blocked for eliminated players, but rematch votes are always allowed
        if (this.gameStatus === 'PLAYING' && p.isEliminated && action.type !== 'VOTE_PLAY_AGAIN') return false;

        switch (action.type) {
            case 'SUBMIT_CLUE':
                if (this.phase !== 'CLUE' || this.players[this.turnIndex].userId !== player.userId) return false;
                if (this.clues[player.userId]) return false;

                // Disallow word itself (case-insensitive)
                const clue = action.clue.trim();
                const mainWord = p.word.toLowerCase();
                if (clue.toLowerCase().includes(mainWord)) {
                    return false; // Or notify client
                }

                this.clues[player.userId] = clue;
                this.advanceClueTurn();
                return true;

            case 'CAST_VOTE':
                if (this.phase !== 'VOTE') return false;
                if (this.votes[player.userId]) return false;

                const target = this.players.find(p => p.userId === action.targetUserId);
                if (!target || target.isEliminated || target.userId === player.userId) return false;

                this.votes[player.userId] = action.targetUserId;

                // If everyone voted, advance immediately
                const aliveCount = this.players.filter(p => !p.isEliminated).length;
                if (Object.keys(this.votes).length === aliveCount) {
                    this.clearTimer();
                    this.processVotes();
                }

                return true;

            case 'VOTE_PLAY_AGAIN':
                p.wantsRematch = true;
                // Check if all CONNECTED players want rematch
                const activePlayers = this.players.filter(p => p.connected);
                if (activePlayers.length > 0 && activePlayers.every(p => p.wantsRematch)) {
                    this.restartGame();
                }
                this.emitStateChange();
                return true;

            case 'RESTART_GAME':
                // Optional: Force restart if host, but VOTE_PLAY_AGAIN is preferred
                const playerIndex = this.players.findIndex(pl => pl.userId === player.userId);
                return this.restartGame(playerIndex);
            case 'SEND_MESSAGE':
                if (this.phase !== 'VOTE') return false;
                this.messages.push({
                    userId: player.userId,
                    name: p.name,
                    text: action.text.substring(0, 50), // Keep it short
                    timestamp: Date.now()
                });
                this.emitStateChange();
                return true;

            default:
                return false;
        }
    }

    startTimer(duration, callback) {
        this.clearTimer();
        this.timerStartTime = Date.now();
        this.timer = setTimeout(() => {
            callback();
        }, duration);
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.timerStartTime = null;
    }

    getState() {
        return {
            gameStatus: this.gameStatus,
            round: this.round,
            maxRounds: this.maxRounds,
            phase: this.phase,
            turnIndex: this.turnIndex,
            clues: this.clues,
            votes: this.votes,
            messages: this.messages,
            winner: this.winner,
            timerStartTime: this.timerStartTime,
            timerDuration: this.phase === 'READ_CLUES' ? 5000 : (this.phase === 'CLUE' ? this.clueDuration : this.voteDuration),
            players: this.players.map(p => ({
                id: p.id,
                userId: p.userId,
                name: p.name,
                isEliminated: p.isEliminated,
                connected: p.connected,
                word: p.word,
                role: p.role,
                wantsRematch: p.wantsRematch,
                isTurn: this.phase === 'CLUE' && this.players[this.turnIndex]?.userId === p.userId
            }))
        };
    }

    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        const player = this.players[playerIndex];
        player.isEliminated = true; // Treat left players as eliminated

        if (this.phase === 'CLUE' && this.turnIndex === playerIndex) {
            this.advanceClueTurn();
        }

        this.checkWinCondition();
        return this.gameStatus === 'ENDED';
    }

    restartGame() {
        this.updateSeed();
        this.clearTimer();
        this.round = 1;
        this.phase = 'CLUE';
        this.turnIndex = 0;
        this.clues = {};
        this.votes = {};
        this.messages = [];
        this.eliminatedUsers = new Set();
        this.winner = null;

        // Reset player states but keep connection status
        this.players.forEach(p => {
            p.isEliminated = false;
            p.wantsRematch = false;
            p.role = 'CIVILIAN';
            p.word = '';
        });

        this.assignRolesAndWords();
        this.gameStatus = 'PLAYING';
        this.startCluePhase();
        this.emitStateChange();
        return true;
    }

    updatePlayerStatus(userId, status) {
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            player.connected = status.connected;
            if (status.id) player.id = status.id;
        }
    }

    stop() {
        this.clearTimer();
    }

    emitStateChange() {
        if (this.onStateChange) this.onStateChange();
    }
}

module.exports = UndercoverGame;
