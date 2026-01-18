const { sanitize, VALIDATION_TYPES } = require('../../utils/sanitizer');
const crypto = require('crypto');

class HousieGame {
    constructor() {
        this.id = 'HOUSIE';
        this.players = [];
        this.gameState = {
            status: 'SETUP', // SETUP, PLAYING, ENDED
            calledNumbers: [],
            lastCalledNumber: null,
            lastCallTime: 0,
            winner: null,
            claims: {
                EARLY_FIVE: null,
                FOUR_CORNERS: null,
                TOP_LINE: null,
                MIDDLE_LINE: null,
                BOTTOM_LINE: null,
                FULL_HOUSE: null
            },
            turnStartTime: 0,
            turnDuration: 6000, // 6 seconds per number
            setupEndTime: 0,
            rematchCancelled: false
        };
        this.onStateChange = null;
        this.onNotification = null;
        this.setupTimer = null;
        this.autoCallTimer = null;
        this.SETUP_DURATION = 10000;
        this.CALL_INTERVAL = 6000;
    }

    init(players) {
        this.players = players.map(p => ({
            ...p,
            ticket: this.generateTicket(),
            markedCells: [],
            isReady: false,
            score: 0,
            wantsRematch: false,
            declinedRematch: false,
            connected: true
        }));

        this.gameState.setupEndTime = Date.now() + this.SETUP_DURATION;
        this.setupTimer = setTimeout(() => this.startPlayingPhase(), this.SETUP_DURATION);

        console.log(`HOUSIE: Game initialized with ${this.players.length} players.`);
    }

    generateTicket() {
        // Housie Ticket: 3 rows, 9 columns. 5 numbers per row.
        // Col 1: 1-9, Col 2: 10-19, ..., Col 9: 80-90.

        const ticket = Array(3).fill(null).map(() => Array(9).fill(null));
        const colRanges = [
            { min: 1, max: 9 },
            { min: 10, max: 19 },
            { min: 20, max: 29 },
            { min: 30, max: 39 },
            { min: 40, max: 49 },
            { min: 50, max: 59 },
            { min: 60, max: 69 },
            { min: 70, max: 79 },
            { min: 80, max: 90 }
        ];

        // 1. Pick 15 positions (5 per row)
        // Ensure each column has at least one number
        // This is a simplified version of valid ticket generation

        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            attempts++;
            // Reset ticket
            for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) ticket[r][c] = null;

            // Fill 5 random spots in each row
            for (let r = 0; r < 3; r++) {
                let count = 0;
                while (count < 5) {
                    let c = crypto.randomInt(0, 9);
                    if (ticket[r][c] === null) {
                        ticket[r][c] = true; // Placeholder
                        count++;
                    }
                }
            }

            // Check if each column has at least one number
            let columnsOk = true;
            for (let c = 0; c < 9; c++) {
                if (ticket[0][c] === null && ticket[1][c] === null && ticket[2][c] === null) {
                    columnsOk = false;
                    break;
                }
            }
            if (columnsOk) valid = true;
        }

        // 2. Fill the selected positions with numbers from their respective ranges
        for (let c = 0; c < 9; c++) {
            const range = colRanges[c];
            const countInCol = (ticket[0][c] ? 1 : 0) + (ticket[1][c] ? 1 : 0) + (ticket[2][c] ? 1 : 0);
            if (countInCol > 0) {
                const available = [];
                for (let n = range.min; n <= range.max; n++) available.push(n);
                // Shuffle available
                for (let i = available.length - 1; i > 0; i--) {
                    const j = crypto.randomInt(0, i + 1);
                    [available[i], available[j]] = [available[j], available[i]];
                }

                // Sort numbers to be placed in the column
                const nums = available.slice(0, countInCol).sort((a, b) => a - b);
                let numIdx = 0;
                for (let r = 0; r < 3; r++) {
                    if (ticket[r][c]) {
                        ticket[r][c] = nums[numIdx++];
                    }
                }
            }
        }

        return ticket;
    }

    startPlayingPhase() {
        if (this.gameState.status !== 'SETUP') return;
        this.gameState.status = 'PLAYING';
        this.startAutoCall();
        this.emitStateChange();
    }

    startAutoCall() {
        if (this.autoCallTimer) clearInterval(this.autoCallTimer);

        this.callNextNumber();
        this.autoCallTimer = setInterval(() => {
            this.callNextNumber();
        }, this.CALL_INTERVAL);
    }

    callNextNumber() {
        if (this.gameState.status !== 'PLAYING') return;

        const available = [];
        for (let i = 1; i <= 90; i++) {
            if (!this.gameState.calledNumbers.includes(i)) {
                available.push(i);
            }
        }

        if (available.length === 0) {
            this.endGame();
            return;
        }

        const nextNum = available[crypto.randomInt(0, available.length)];
        this.gameState.calledNumbers.push(nextNum);
        this.gameState.lastCalledNumber = nextNum;
        this.gameState.lastCallTime = Date.now();
        this.gameState.turnStartTime = Date.now();

        this.emitStateChange();
    }

    handleAction(action, player) {
        const gamePlayer = this.players.find(p => p.userId === player.userId);
        if (!gamePlayer) return false;

        switch (action.type) {
            case 'MARK_NUMBER':
                if (this.gameState.status !== 'PLAYING') return false;
                const num = Number(action.number);
                if (this.gameState.calledNumbers.includes(num)) {
                    // Check if number is in player's ticket
                    let found = false;
                    for (let r = 0; r < 3; r++) {
                        if (gamePlayer.ticket[r].includes(num)) {
                            found = true;
                            break;
                        }
                    }
                    if (found && !gamePlayer.markedCells.includes(num)) {
                        gamePlayer.markedCells.push(num);
                        this.emitStateChange();
                        return true;
                    }
                }
                return false;

            case 'CLAIM_AWARD':
                if (this.gameState.status !== 'PLAYING') return false;
                return this.claimAward(gamePlayer, action.award);

            case 'VOTE_PLAY_AGAIN':
                gamePlayer.wantsRematch = true;
                this.checkRematchDecided();
                return true;

            case 'DECLINE_PLAY_AGAIN':
                gamePlayer.declinedRematch = true;
                this.checkRematchDecided();
                return true;
        }
        return false;
    }

    claimAward(player, award) {
        if (this.gameState.claims[award]) return false;

        let isValid = false;
        let points = 0;
        const marked = new Set(player.markedCells);

        switch (award) {
            case 'EARLY_FIVE':
                if (marked.size >= 5) {
                    isValid = true;
                    points = 10;
                }
                break;
            case 'FOUR_CORNERS':
                const corners = [];
                // Find first and last in first and last rows
                const row0 = player.ticket[0].filter(n => n !== null);
                const row2 = player.ticket[2].filter(n => n !== null);
                corners.push(row0[0], row0[row0.length - 1], row2[0], row2[row2.length - 1]);
                if (corners.every(c => marked.has(c))) {
                    isValid = true;
                    points = 20;
                }
                break;
            case 'TOP_LINE':
                if (player.ticket[0].every(n => n === null || marked.has(n))) {
                    isValid = true;
                    points = 15;
                }
                break;
            case 'MIDDLE_LINE':
                if (player.ticket[1].every(n => n === null || marked.has(n))) {
                    isValid = true;
                    points = 15;
                }
                break;
            case 'BOTTOM_LINE':
                if (player.ticket[2].every(n => n === null || marked.has(n))) {
                    isValid = true;
                    points = 15;
                }
                break;
            case 'FULL_HOUSE':
                let allMarked = true;
                for (let r = 0; r < 3; r++) {
                    if (!player.ticket[r].every(n => n === null || marked.has(n))) {
                        allMarked = false;
                        break;
                    }
                }
                if (allMarked) {
                    isValid = true;
                    points = 30;
                }
                break;
        }

        if (isValid) {
            player.score += points;
            this.gameState.claims[award] = {
                userId: player.userId,
                name: player.name,
                time: Date.now(),
                points: points
            };

            if (award === 'FULL_HOUSE') {
                this.gameState.winner = player;
                this.endGame();
            } else {
                if (this.onNotification) {
                    this.onNotification({
                        type: 'AWARD_CLAIMED',
                        message: `${player.name} claimed ${award.replace('_', ' ')}!`,
                        award: award
                    });
                }
            }
            this.emitStateChange();
            return true;
        }

        return false;
    }

    endGame() {
        if (!this.gameState.winner) {
            // Find player with highest score
            let topScore = -1;
            let winners = [];

            this.players.forEach(p => {
                if (p.score > topScore) {
                    topScore = p.score;
                    winners = [p];
                } else if (p.score === topScore && topScore > 0) {
                    winners.push(p);
                }
            });

            if (topScore > 0) {
                if (winners.length === 1) {
                    this.gameState.winner = winners[0];
                } else if (winners.length > 1) {
                    // In case of tie, pick the first one
                    this.gameState.winner = winners[0];
                }
            }
        }

        this.gameState.status = 'ENDED';
        this.stop();
        this.emitStateChange();
    }

    stop() {
        if (this.setupTimer) clearTimeout(this.setupTimer);
        if (this.autoCallTimer) clearInterval(this.autoCallTimer);
    }

    getState() {
        return {
            ...this.gameState,
            winner: this.gameState.winner ? {
                userId: this.gameState.winner.userId,
                name: this.gameState.winner.name
            } : null,
            players: this.players.map(p => ({
                id: p.id,
                userId: p.userId,
                name: p.name,
                isHost: p.isHost,
                ticket: p.ticket,
                markedCells: p.markedCells,
                isReady: p.isReady,
                score: p.score,
                wantsRematch: p.wantsRematch,
                declinedRematch: p.declinedRematch,
                connected: p.connected
            }))
        };
    }

    emitStateChange() {
        if (this.onStateChange) this.onStateChange();
    }

    checkRematchDecided() {
        if (this.gameState.status !== 'ENDED') return;
        const activePlayers = this.players.filter(p => p.connected);
        if (activePlayers.length === 0) return;
        const allDecided = activePlayers.every(p => p.wantsRematch || p.declinedRematch);
        if (allDecided) {
            const anyDeclined = activePlayers.some(p => p.declinedRematch);
            if (anyDeclined) {
                this.gameState.rematchCancelled = true;
                this.emitStateChange();
            } else {
                this.restartGame();
            }
        } else {
            this.emitStateChange();
        }
    }

    restartGame() {
        this.stop();
        this.gameState = {
            status: 'SETUP',
            calledNumbers: [],
            lastCalledNumber: null,
            lastCallTime: 0,
            winner: null,
            claims: {
                EARLY_FIVE: null,
                FOUR_CORNERS: null,
                TOP_LINE: null,
                MIDDLE_LINE: null,
                BOTTOM_LINE: null,
                FULL_HOUSE: null
            },
            turnStartTime: 0,
            turnDuration: 6000,
            setupEndTime: 0,
            rematchCancelled: false
        };
        this.init(this.players);
        this.emitStateChange();
    }

    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;
        this.players.splice(playerIndex, 1);

        console.log(`HOUSIE: Removing player ${playerId}. ${this.players.length} left.`);

        // Win condition: 1 player remains
        // Only trigger this if we are in PLAYING or SETUP (avoid loops if already ended)
        const activeStatus = this.gameState.status === 'PLAYING' || this.gameState.status === 'SETUP';
        if (this.players.length === 1 && activeStatus) {
            this.gameState.winner = this.players[0];
            this.endGame();
            return true;
        }

        if (this.players.length < 1 && activeStatus) {
            this.endGame();
        }
        this.emitStateChange();
        return true;
    }

    updatePlayerStatus(userId, status) {
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            player.connected = status.connected;
            if (status.id) player.id = status.id;
            this.emitStateChange();
        }
    }

    on(event, callback) {
        if (event === 'notification') this.onNotification = callback;
    }
}

module.exports = HousieGame;
