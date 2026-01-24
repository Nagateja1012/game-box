const logger = require('../../utils/logger');

class EightsAndFoursGame {
    constructor() {
        this.id = 'EIGHTS_AND_FOURS';
        this.players = [];
        this.gameStatus = 'WAITING'; // WAITING, PLAYING, ENDED
        this.boardSize = 5;
        this.tokensPerPlayer = 4;
        this.onStateChange = null;

        // Path definitions for 5x5 board
        // Each entry is [x, y]
        // Outer ring: 16 squares
        // Inner ring: 8 squares
        // Center: 1 square (Goal)
        this.OUTER_PATH = [
            [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0], [3, 0],
            [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4]
        ];
        this.INNER_PATH = [
            [1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3]
        ];
        this.GOAL = [2, 2];

        // Safe squares (Middle of each edge, corners of inner ring, and goal center)
        this.SAFE_SQUARES = [
            '2,4', '4,2', '2,0', '0,2', '2,2', // Mid-edges and center
            '1,3', '1,1', '3,1', '3,3'          // Inner ring corners (diagonal to mid-edges)
        ];
    }

    init(players, roomId) {
        this.roomId = roomId;
        // In Asta Chamma, players start at mid-edges.
        // P1: Bottom-mid, P2: Top-mid, P3: Left-mid, P4: Right-mid
        // But for "perspective" and consistency, we can assign them specific paths.

        const playerPositions = [
            { startIdx: 0, orientation: 0 }, // Bottom
            { startIdx: 8, orientation: 180 }, // Top
            { startIdx: 12, orientation: 270 }, // Left
            { startIdx: 4, orientation: 90 }   // Right
        ];

        this.players = players.map((p, idx) => {
            const pos = playerPositions[idx % 4];
            return {
                id: p.id,
                userId: p.userId,
                name: p.name,
                color: this.getPlayerColor(idx),
                tokens: Array.from({ length: this.tokensPerPlayer }, (_, i) => ({
                    id: i,
                    position: -1, // -1 means at home
                    isFinished: false
                })),
                hasKilled: false,
                startIdx: pos.startIdx,
                orientation: pos.orientation,
                score: 0
            };
        });

        this.turnIndex = 0;
        this.gameStatus = 'PLAYING';
        this.diceRoll = null;
        this.bonusTurn = false;
        this.winners = [];
        this.lastAction = null;

        this.turnStartTime = 0;
        this.turnDuration = 25000;
        this.turnTimer = null;

        this.startTurn();
    }

    getPlayerColor(index) {
        const colors = ['#00f2ff', '#ff00ff', '#fcd34d', '#10b981']; // Neon Cyan, Neon Magenta, Amber, Emerald
        return colors[index % colors.length];
    }

    startTurn() {
        if (this.turnTimer) clearTimeout(this.turnTimer);
        this.turnStartTime = Date.now();
        this.emitStateChange();

        this.turnTimer = setTimeout(() => {
            this.handleTurnTimeout();
        }, this.turnDuration);
    }

    handleTurnTimeout() {
        if (this.gameStatus !== 'PLAYING') return;
        this.diceRoll = null;
        this.nextTurn();
    }

    emitStateChange() {
        if (this.onStateChange) this.onStateChange();
    }

    nextTurn() {
        this.bonusTurn = false;
        this.turnIndex = (this.turnIndex + 1) % this.players.length;

        if (this.players[this.turnIndex].tokens.every(t => t.isFinished)) {
            this.nextTurn();
            return;
        }

        this.startTurn();
    }

    // Generate path for a specific player starting from their starting point
    getPlayerPath(playerIndex) {
        const player = this.players[playerIndex];
        const start = player.startIdx;

        let path = [];
        // Outer ring loop
        for (let i = 0; i < 16; i++) {
            const idx = (start + i) % 16;
            path.push(this.OUTER_PATH[idx]);
        }

        // Inner ring loop (starts after the full outer loop)
        // In 5x5, you enter inner ring from the square before your start? 
        // No, typically you enter from your start square into the inner square.
        // Let's adjust INNER_PATH based on entry point.
        // Default INNER_PATH starts at [1, 3] which is "above" P1's start [2, 4].
        // We'll rotate INNER_PATH based on player orientation.

        const rotatedInner = this.getRotatedInnerPath(player.orientation);
        path = path.concat(rotatedInner);
        path.push(this.GOAL);

        return path;
    }

    getRotatedInnerPath(orientation) {
        // [1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3]
        // Orientation 0 (Bottom): [1,3] is the entry
        // Orientation 180 (Top): Entry would be [3,1]
        // Orientation 270 (Left): Entry would is [1,1]
        // Orientation 90 (Right): Entry would be [3,3]

        let shift = 0;
        if (orientation === 180) shift = 4;
        if (orientation === 270) shift = 2;
        if (orientation === 90) shift = 6;

        const path = [...this.INNER_PATH];
        for (let i = 0; i < shift; i++) {
            path.push(path.shift());
        }
        return path;
    }

    handleAction(action, player) {
        if (this.gameStatus !== 'PLAYING') return false;
        if (this.players[this.turnIndex].userId !== player.userId) return false;

        switch (action.type) {
            case 'ROLL_DICE':
                return this.rollDice();
            case 'MOVE_TOKEN':
                return this.moveToken(action.tokenId);
            default:
                return false;
        }
    }

    rollDice() {
        if (this.diceRoll !== null) return false;

        // Asta Chamma dice (4 cowries):
        // 0 up = 8 (bonus)
        // 1 up = 1
        // 2 up = 2
        // 3 up = 3
        // 4 up = 4 (bonus)
        const rolls = Array.from({ length: 4 }, () => Math.random() < 0.5 ? 1 : 0);
        const upCount = rolls.reduce((a, b) => a + b, 0);

        let value = upCount === 0 ? 8 : upCount;

        this.diceRoll = value;
        this.cowrieStates = rolls;
        this.bonusTurn = (value === 8 || value === 4);

        if (this.bonusTurn) {
            this.startTurn();
        }

        // Check if any move is possible
        if (!this.canMoveAnyToken()) {
            this.lastAction = { type: 'ROLL', value, playerIndex: this.turnIndex, possible: false };
            setTimeout(() => {
                this.diceRoll = null;
                this.nextTurn();
                if (this.onStateChange) this.onStateChange();
            }, 1000);
            return true;
        }

        this.lastAction = { type: 'ROLL', value, playerIndex: this.turnIndex, possible: true };
        return true;
    }

    canMoveAnyToken() {
        const player = this.players[this.turnIndex];
        return player.tokens.some(t => this.isValidMove(t));
    }

    isValidMove(token) {
        if (token.isFinished) return false;

        const player = this.players[this.turnIndex];
        const playerPath = this.getPlayerPath(this.turnIndex);

        let nextPos;
        if (token.position === -1) {
            // Home entry: Only on 1, 4, or 8
            if (this.diceRoll !== 1 && this.diceRoll !== 4 && this.diceRoll !== 8) return false;
            nextPos = 0;
        } else {
            nextPos = token.position + this.diceRoll;
            // Path looping logic: if no kill, wrap around the outer ring (indices 0-15)
            if (!player.hasKilled && nextPos >= 16) {
                nextPos = nextPos % 16;
            }
        }

        // Check if finished (index 24 is Goal)
        if (nextPos >= playerPath.length) return false;

        // Stacking restriction: Only one token in non-safe cells
        const targetCoords = playerPath[nextPos];
        const targetCoordStr = `${targetCoords[0]},${targetCoords[1]}`;

        if (!this.SAFE_SQUARES.includes(targetCoordStr)) {
            // Check if any friendly token is already there
            const isFriendlyOccupied = player.tokens.some(t => {
                if (t.id === token.id || t.position === -1 || t.isFinished) return false;
                const p = playerPath[t.position];
                return p[0] === targetCoords[0] && p[1] === targetCoords[1];
            });
            if (isFriendlyOccupied) return false;
        }

        return true;
    }

    moveToken(tokenId) {
        if (this.diceRoll === null) return false;

        const player = this.players[this.turnIndex];
        const token = player.tokens.find(t => t.id === tokenId);

        if (!token || !this.isValidMove(token)) return false;

        const oldPos = token.position;
        let nextPos;

        if (token.position === -1) {
            if (this.diceRoll === 8) {
                // Move up to two tokens from home to 0
                const homeTokens = player.tokens.filter(t => t.position === -1);
                homeTokens.slice(0, 2).forEach(t => t.position = 0);
                nextPos = 0; // for subsequent logic
            } else {
                token.position = 0;
                nextPos = 0;
            }
        } else {
            nextPos = token.position + this.diceRoll;
            // Apply path looping if no kill
            if (!player.hasKilled && nextPos >= 16) {
                nextPos = nextPos % 16;
            }
            token.position = nextPos;
        }

        const playerPath = this.getPlayerPath(this.turnIndex);
        const newCoords = playerPath[token.position];
        const isGoal = token.position === playerPath.length - 1;

        if (isGoal) {
            token.isFinished = true;
            player.score += 1;
            // Bonus turn for finishing a token? Usually yes in some variants.
            this.bonusTurn = true;
        } else {
            // Check for kill
            this.checkKill(newCoords);
        }

        this.diceRoll = null;
        this.lastAction = { type: 'MOVE', tokenId, playerIndex: this.turnIndex, from: oldPos, to: token.position };

        if (this.checkWinCondition()) {
            this.gameStatus = 'ENDED';
        } else if (!this.bonusTurn) {
            this.nextTurn();
        }

        return true;
    }

    checkKill(coords) {
        const coordStr = `${coords[0]},${coords[1]}`;

        // Cannot kill on safe squares
        if (this.SAFE_SQUARES.includes(coordStr)) return;

        let killed = false;
        this.players.forEach((otherPlayer, pIdx) => {
            if (pIdx === this.turnIndex) return;

            const otherPath = this.getPlayerPath(pIdx);
            otherPlayer.tokens.forEach(otherToken => {
                if (otherToken.position === -1 || otherToken.isFinished) return;

                const otherCoords = otherPath[otherToken.position];
                if (otherCoords[0] === coords[0] && otherCoords[1] === coords[1]) {
                    // Kill!
                    otherToken.position = -1;
                    killed = true;
                }
            });
        });

        if (killed) {
            this.players[this.turnIndex].hasKilled = true;
            this.bonusTurn = true;
        }
    }

    checkWinCondition() {
        const player = this.players[this.turnIndex];
        const allFinished = player.tokens.every(t => t.isFinished);
        if (allFinished) {
            if (!this.winners.includes(player.userId)) {
                this.winners.push(player.userId);
            }
            return this.winners.length === this.players.length - 1;
        }
        return false;
    }


    getState() {
        return {
            gameStatus: this.gameStatus,
            players: this.players.map(p => ({
                userId: p.userId,
                name: p.name,
                color: p.color,
                tokens: p.tokens,
                hasKilled: p.hasKilled,
                score: p.score,
                startIdx: p.startIdx,
                orientation: p.orientation
            })),
            turnIndex: this.turnIndex,
            diceRoll: this.diceRoll,
            cowrieStates: this.cowrieStates,
            turnStartTime: this.turnStartTime,
            turnDuration: this.turnDuration,
            winners: this.winners,
            lastAction: this.lastAction,
            boardPaths: this.players.map((_, idx) => this.getPlayerPath(idx)) // Helpful for client
        };
    }

    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        // If active player leaves, advance turn
        if (this.turnIndex === playerIndex) {
            this.diceRoll = null;
            this.nextTurn();
        }

        // We don't remove the player object to keep indices stable, just mark as inactive/lost
        // But RoomManager might handle this. 
        // For game logic, we just check if enough players remain.
        const activePlayers = this.players.filter(p => !p.tokens.every(t => t.isFinished)).length;
        if (activePlayers < 2) {
            this.gameStatus = 'ENDED';
            return true;
        }
        return false;
    }

    stop() {
        this.gameStatus = 'ENDED';
    }
}

module.exports = EightsAndFoursGame;
