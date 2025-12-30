const { sanitize, VALIDATION_TYPES } = require('../../utils/sanitizer');

class BingoGame {
    constructor() {
        this.id = 'BINGO';
        this.players = [];
        this.gameState = {
            status: 'SETUP', // SETUP, PLAYING, ENDED
            turnIndex: 0,
            turnStartTime: 0,
            turnDuration: 0,
            turnPhase: null, // 'CALLING' (8s) or 'MARKING' (8s)

            calledNumbers: [],
            lastCalledNumber: null,
            winner: null,
            gridSize: 5,
            winningPatterns: []
        };
        this.onStateChange = null;
        this.onNotification = null;
        this.setupTimer = null;
        this.turnTimer = null;
        this.SETUP_DURATION = 10000;
    }

    init(players) {
        this.players = players.map(p => ({
            ...p,
            grid: [],
            draftGrid: [],
            markedCells: [],
            claimedLetters: [],
            lastClaimTime: 0,
            isReady: false,
            score: 0
        }));

        this.gameState.gridSize = this.calculateGridSize(this.players.length);
        this.gameState.turnIndex = Math.floor(Math.random() * this.players.length);

        // Start Setup Timer
        this.gameState.setupEndTime = Date.now() + this.SETUP_DURATION;
        this.setupTimer = setTimeout(() => this.startPlayingPhase(), this.SETUP_DURATION);

        console.log(`BINGO: Game initialized with ${this.players.length} players.`);
    }

    calculateGridSize(playerCount) {
        if (playerCount <= 5) return 5;
        if (playerCount <= 9) return 6;
        return 7;
    }

    startPlayingPhase() {
        if (this.gameState.status !== 'SETUP') return;

        const size = this.gameState.gridSize;
        const totalCells = size * size;

        this.players.forEach(player => {
            let finalGrid = player.draftGrid || Array(totalCells).fill(null);
            // Auto-fill if empty/incomplete
            if (!this.isValidCompleteGrid(finalGrid)) {
                finalGrid = this.fillGridHoles(finalGrid, size);
            }
            player.grid = finalGrid;
            player.isReady = true;
        });

        this.gameState.status = 'PLAYING';
        this.gameState.turnIndex = 0;
        this.gameState.turnPhase = 'CALLING'; // Start with calling
        this.startTurn();
        this.emitStateChange();
    }

    startTurn() {
        if (this.turnTimer) clearTimeout(this.turnTimer);

        // Define Phase Durations (Updated to 8s/8s per request)
        const DURATIONS = {
            'CALLING': 8000,
            'MARKING': 8000
        };

        const duration = DURATIONS[this.gameState.turnPhase] || 8000;

        this.gameState.turnDuration = duration;
        this.gameState.turnStartTime = Date.now();

        this.emitStateChange(); // Sync Timer to Clients

        this.turnTimer = setTimeout(() => {
            this.handleTurnTimeout();
        }, duration);
    }

    handleTurnTimeout() {
        if (this.gameState.status !== 'PLAYING') return;

        if (this.gameState.turnPhase === 'CALLING') {
            // Player missed their chance to call -> SKIP
            const skippedPlayer = this.players[this.gameState.turnIndex];

            if (this.onNotification) {
                this.onNotification({
                    type: 'TURN_SKIPPED',
                    message: `Skipped ${skippedPlayer.name}'s turn!`,
                    playerId: skippedPlayer.id
                });
            }

            // Move to Next Player, Same Phase
            this.gameState.turnIndex = (this.gameState.turnIndex + 1) % this.players.length;
            this.gameState.turnPhase = 'CALLING';
            this.startTurn();

        } else if (this.gameState.turnPhase === 'MARKING') {
            // Marking time over -> Next Player Calls
            this.gameState.turnIndex = (this.gameState.turnIndex + 1) % this.players.length;
            this.gameState.turnPhase = 'CALLING';
            this.startTurn();
        }
    }

    handleAction(action, player) {
        const gamePlayer = this.players.find(p => p.id === player.id);
        if (!gamePlayer) return false;

        switch (action.type) {
            case 'UPDATE_DRAFT':
                if (this.gameState.status !== 'SETUP') return false;
                if (this.validateDraftExistance(action.grid)) {
                    gamePlayer.draftGrid = action.grid;
                    this.emitStateChange();
                    return true;
                }
                return false;

            case 'CALL_NUMBER':
                if (this.gameState.status !== 'PLAYING') return false;
                // Only Active Player can call
                if (this.players[this.gameState.turnIndex].id !== player.id) return false;
                // Only in CALLING phase
                if (this.gameState.turnPhase !== 'CALLING') return false;

                return this.callNumber(action.number, player.id);

            case 'MARK_NUMBER':
                if (this.gameState.status !== 'PLAYING') return false;
                // Only in MARKING phase
                if (this.gameState.turnPhase !== 'MARKING') return false;

                // Validate matches last called
                if (this.gameState.lastCalledNumber && action.number === this.gameState.lastCalledNumber) {
                    if (!gamePlayer.markedCells.includes(action.number)) {
                        gamePlayer.markedCells.push(action.number);
                        this.emitStateChange(); // Broadcast mark
                        return true;
                    }
                }
                return false;

            case 'CLAIM_LETTER':
                if (this.gameState.status !== 'PLAYING') return false;
                return this.claimLetter(gamePlayer, action.letter);
        }
        return false;
    }

    callNumber(number, callerId) {
        // ALLOW re-calling per requirements ("same number can be called again by someone else")
        // So we do NOT check gameState.calledNumbers.includes(number) rejection.

        // Basic range check
        const max = this.gameState.gridSize * this.gameState.gridSize;
        if (number < 1 || number > max) return false;

        const caller = this.players.find(p => p.id === callerId);
        // Ensure caller has it? Theoretically yes.
        if (!caller || !caller.grid.includes(number)) return false;

        this.gameState.calledNumbers.push(number);
        this.gameState.lastCalledNumber = number;

        // Auto-mark for CALLER
        if (!caller.markedCells.includes(number)) {
            caller.markedCells.push(number);
        }

        // Switch Phase to MARKING
        // Turn Index STAYS SAME because "timer for other player starts" (everyone marks)
        // We only advance index AFTER marking timeout.
        this.gameState.turnPhase = 'MARKING';
        this.startTurn(); // Starts 8s timer

        return true;
    }

    claimLetter(player, letter) {
        const targetIndex = player.claimedLetters.length;
        const SEQUENCE = ['B', 'I', 'N', 'G', 'O'];
        const targetLetter = SEQUENCE[targetIndex];

        if (letter !== targetLetter) return false;

        // Verify they actually have the lines
        // For simplicity, we assume client sends valid claims, but we should eventually validate.
        // Assuming we rely on calculateCompletedLines Logic:
        const completedLines = this.calculateCompletedLines(player);
        if (completedLines > player.claimedLetters.length) {
            player.claimedLetters.push(letter);
            player.lastClaimTime = Date.now();

            if (player.claimedLetters.length === 5) {
                this.gameState.winner = player;
                this.gameState.status = 'ENDED';
                if (this.turnTimer) clearTimeout(this.turnTimer);
            }
            this.emitStateChange();
            return true;
        }

        return false;
    }

    // ... Helpers (isValidCompleteGrid, fillGridHoles, validateDraftExistance) ...
    isValidCompleteGrid(grid) {
        if (!Array.isArray(grid)) return false;
        const size = this.gameState.gridSize;
        if (grid.length !== size * size) return false;
        if (grid.some(n => n === null || n === undefined)) return false;
        const unique = new Set(grid);
        return unique.size === grid.length;
    }

    fillGridHoles(currentGrid, size) {
        const total = size * size;
        const filledNumbers = new Set(currentGrid.filter(n => n !== null));
        const availableNumbers = [];
        for (let i = 1; i <= total; i++) {
            if (!filledNumbers.has(i)) availableNumbers.push(i);
        }
        for (let i = availableNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
        }
        const newGrid = [...currentGrid];
        while (newGrid.length < total) newGrid.push(null);
        let availIndex = 0;
        for (let i = 0; i < total; i++) {
            if (newGrid[i] === null) newGrid[i] = availableNumbers[availIndex++];
        }
        return newGrid;
    }

    validateDraftExistance(grid) {
        if (!Array.isArray(grid)) return false;
        const total = this.gameState.gridSize * this.gameState.gridSize;
        if (grid.length > total) return false;
        return true;
    }

    calculateCompletedLines(player) {
        let lines = 0;
        const size = this.gameState.gridSize;
        const grid = player.grid;
        const marked = new Set(player.markedCells);

        // Rows
        for (let r = 0; r < size; r++) {
            let complete = true;
            for (let c = 0; c < size; c++) {
                if (!marked.has(grid[r * size + c])) { complete = false; break; }
            }
            if (complete) lines++;
        }
        // Cols
        for (let c = 0; c < size; c++) {
            let complete = true;
            for (let r = 0; r < size; r++) {
                if (!marked.has(grid[r * size + c])) { complete = false; break; }
            }
            if (complete) lines++;
        }
        // Diag 1
        let d1 = true;
        for (let i = 0; i < size; i++) {
            if (!marked.has(grid[i * size + i])) { d1 = false; break; }
        }
        if (d1) lines++;
        // Diag 2
        let d2 = true;
        for (let i = 0; i < size; i++) {
            if (!marked.has(grid[i * size + (size - 1 - i)])) { d2 = false; break; }
        }
        if (d2) lines++;

        return lines;
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            if (this.gameState.status === 'PLAYING' && index === this.gameState.turnIndex) {
                // If active player leaves, skip them
                // Just restart turn logic with new index
                this.gameState.turnIndex = (this.gameState.turnIndex) % (this.players.length - 1);
                this.startTurn();
            }
            this.players.splice(index, 1);
            if (this.players.length === 0) {
                this.stop();
                return true;
            }
        }
        return false;
    }

    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        const isLeavingPlayerTurn = (this.gameState.turnIndex === playerIndex);

        this.players.splice(playerIndex, 1);
        console.log(`BINGO: Removing player ${playerId}. ${this.players.length} left.`);

        // Adjust turn index
        if (this.gameState.turnIndex > playerIndex) {
            this.gameState.turnIndex--;
        } else if (this.gameState.turnIndex === playerIndex) {
            // It was their turn (to call, or they were the current caller during marking)
            this.gameState.turnPhase = 'CALLING';
            if (this.gameState.turnIndex >= this.players.length) {
                this.gameState.turnIndex = 0;
            }

            // Start next person's calling turn immediately
            if (this.players.length >= 2 && this.gameState.status === 'PLAYING') {
                this.startTurn();
            }
        }

        // Final bounds check
        if (this.gameState.turnIndex >= this.players.length && this.players.length > 0) {
            this.gameState.turnIndex = 0;
        }

        // Win condition: 1 player remains
        if (this.players.length < 2 && this.gameState.status === 'PLAYING') {
            this.gameState.winner = this.players[0]; // Could be undefined if 0 players
            this.gameState.status = 'ENDED';
            this.stop();
            this.emitStateChange();
            return true;
        }

        this.emitStateChange();
        return false;
    }

    getState() {
        return {
            ...this.gameState,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost,
                claimedLetters: p.claimedLetters,
                lastClaimTime: p.lastClaimTime,
                isReady: p.isReady,
                grid: p.grid,
                markedCells: p.markedCells
            }))
        };
    }

    emitStateChange() {
        if (this.onStateChange) this.onStateChange();
    }

    on(event, callback) {
        if (event === 'notification') this.onNotification = callback;
    }

    stop() {
        if (this.setupTimer) clearTimeout(this.setupTimer);
        if (this.turnTimer) clearTimeout(this.turnTimer);
    }
}

module.exports = BingoGame;
