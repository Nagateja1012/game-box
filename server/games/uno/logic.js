const logger = require('../../utils/logger');

class UnoGame {
    constructor() {
        this.id = 'UNO';
        this.deck = [];
        this.discardPile = [];
        this.players = []; // { id, name, hand: [] }
        this.turnIndex = 0;
        this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
        this.currentColor = null; // For wild cards
        this.winner = null;
        this.gameStatus = 'WAITING'; // WAITING, PLAYING, ENDED
        this.drawStack = 0;
        this.stackType = null; // 'DRAW_TWO' or 'WILD_DRAW_FOUR'
        this.scores = {};
        this.lastUnoShout = null; // { playerId, name, time }
        this.rematchCancelled = false;

        // Turn timer configuration
        this.turnDuration = 22000; // 30 seconds per turn
        this.turnStartTime = null;
        this.turnTimer = null;
        this.onTurnTimeout = null; // Callback for when turn times out
        this.onStateChange = null; // Callback for when game state changes internally
        this.lastSkip = null; // { playerId, reason, timestamp }
    }

    // Initialize game with players
    init(players) {
        this.players = players.map(p => ({
            id: p.id, // Current socket ID
            userId: p.userId,
            name: p.name,
            hand: [],
            isUno: false,
            hasDrawn: false,
            wantsRematch: false,
            declinedRematch: false,
            connected: true
        }));

        this.createDeck();
        this.shuffleDeck();
        this.dealCards();
        this.turnIndex = Math.floor(Math.random() * this.players.length);
        this.gameStatus = 'PLAYING';

        // Flip first card
        let firstCard = this.drawCard();
        while (firstCard.type === 'WILD_DRAW_FOUR') { // Cannot start with Wild Draw 4
            this.deck.push(firstCard);
            this.shuffleDeck();
            firstCard = this.drawCard();
        }
        this.discardPile.push(firstCard);
        this.currentColor = firstCard.color;

        // Handle first card effects
        this.handleSpecialCard(firstCard, true);
        logger.info(`UNO Game Initialized with ${this.players.length} players. Top card: ${firstCard.color} ${firstCard.value}`);

        // Start turn timer
        this.startTurnTimer();
    }

    createDeck() {
        const colors = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
        const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'SKIP', 'REVERSE', 'DRAW_TWO'];

        colors.forEach(color => {
            values.forEach(value => {
                if (value === '0') {
                    this.deck.push({ id: Math.random().toString(36), color, value, type: 'NUMBER' });
                } else {
                    // Two of each for 1-9 and special cards
                    this.deck.push({ id: Math.random().toString(36), color, value, type: ['SKIP', 'REVERSE', 'DRAW_TWO'].includes(value) ? 'ACTION' : 'NUMBER' });
                    this.deck.push({ id: Math.random().toString(36), color, value, type: ['SKIP', 'REVERSE', 'DRAW_TWO'].includes(value) ? 'ACTION' : 'NUMBER' });
                }
            });
        });

        // Wild cards
        for (let i = 0; i < 4; i++) {
            this.deck.push({ id: Math.random().toString(36), color: 'BLACK', value: 'WILD', type: 'WILD' });
            this.deck.push({ id: Math.random().toString(36), color: 'BLACK', value: 'WILD_DRAW_FOUR', type: 'WILD_DRAW_FOUR' });
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        // Deal 7 cards to each player
        for (let i = 0; i < 7; i++) {
            this.players.forEach(player => {
                player.hand.push(this.drawCard());
            });
        }
    }

    drawCard() {
        if (this.deck.length === 0) {
            if (this.discardPile.length > 1) {
                // Reshuffle discard pile into deck
                const topCard = this.discardPile.pop();
                this.deck = this.discardPile;
                this.discardPile = [topCard];
                this.shuffleDeck();
                logger.info('Deck reshuffled from discard pile');
            } else {
                logger.warn('No cards left in deck or discard pile!');
                return null; // No cards left
            }
        }
        return this.deck.pop();
    }

    handleAction(action, player) {
        if (this.gameStatus !== 'PLAYING' && action.type !== 'RESTART_GAME' && action.type !== 'VOTE_PLAY_AGAIN') return false;

        const playerIndex = this.players.findIndex(p => p.userId === player.userId);
        if (playerIndex === -1) {
            logger.warn(`Player ${player.name} (ID: ${player.userId}) not found in game players list`);
            return false;
        }

        const gamePlayer = this.players[playerIndex];

        // Check if it's player's turn (except for Uno shout, Restart, or Voting)
        if (playerIndex !== this.turnIndex &&
            action.type !== 'UNO_SHOUT' &&
            action.type !== 'RESTART_GAME' &&
            action.type !== 'VOTE_PLAY_AGAIN') {
            // logger.warn(`Player ${player.name} attempted action out of turn`);
            return false;
        }

        switch (action.type) {
            case 'PLAY_CARD':
                return this.playCard(playerIndex, action.cardId, action.chosenColor);
            case 'DRAW_CARD':
                return this.playerDrawCard(playerIndex);
            case 'UNO_SHOUT':
                gamePlayer.isUno = true;
                this.lastUnoShout = {
                    playerId: gamePlayer.userId,
                    name: gamePlayer.name,
                    time: Date.now()
                };
                logger.info(`UNO Shout by ${player.name}`);
                return true;
            case 'PASS_TURN':
                return this.passTurn(playerIndex);
            case 'RESTART_GAME':
                return this.restartGame(playerIndex);
            case 'VOTE_PLAY_AGAIN':
                gamePlayer.wantsRematch = true;
                logger.info(`Player ${gamePlayer.name} voted to play again`);
                this.checkRematchDecided();
                return true;
            case 'DECLINE_PLAY_AGAIN':
                gamePlayer.declinedRematch = true;
                this.checkRematchDecided();
                return true;
            default:
                logger.warn(`Unknown action type: ${action.type}`);
                return false;
        }
    }

    startTurnTimer() {
        // Clear any existing timer
        this.clearTurnTimer();

        if (this.gameStatus !== 'PLAYING') return;

        this.turnStartTime = Date.now();

        this.turnTimer = setTimeout(() => {
            const currentPlayer = this.players[this.turnIndex];
            logger.info(`Turn timeout for player ${currentPlayer.name}`);

            // Auto-pass or auto-draw then pass
            if (this.drawStack > 0) {
                // If facing a stack, draw the whole stack plus one penalty card, then advance turn
                const totalToDraw = this.drawStack + 1;
                for (let i = 0; i < totalToDraw; i++) {
                    const card = this.drawCard();
                    if (card) currentPlayer.hand.push(card);
                }
                logger.info(`Turn timeout for ${currentPlayer.name}: drew ${totalToDraw} cards (${this.drawStack} from stack + 1 penalty)`);
                this.drawStack = 0;
                this.stackType = null;
                currentPlayer.hasDrawn = false;
                this.lastSkip = { playerId: currentPlayer.id, reason: 'TIMEOUT', timestamp: Date.now() };
                this.advanceTurn();
                this.startTurnTimer();
            } else if (currentPlayer.hasDrawn) {
                // If already drawn, just pass
                this.passTurn(this.turnIndex);
            } else {
                // Normal timeout: Draw a card first, then pass
                this.lastSkip = { playerId: currentPlayer.id, reason: 'TIMEOUT', timestamp: Date.now() };
                this.playerDrawCard(this.turnIndex);
                this.passTurn(this.turnIndex);
            }

            // Notify via callback if set
            if (this.onTurnTimeout) {
                this.onTurnTimeout();
            }
            if (this.onStateChange) {
                this.onStateChange();
            }
        }, this.turnDuration);
    }

    clearTurnTimer() {
        if (this.turnTimer) {
            clearTimeout(this.turnTimer);
            this.turnTimer = null;
        }
        this.turnStartTime = null;
    }

    playCard(playerIndex, cardId, chosenColor) {
        const player = this.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) {
            logger.warn(`Player ${player.name} tried to play card they don't have: ${cardId}`);
            return false;
        }

        const card = player.hand[cardIndex];
        const topCard = this.discardPile[this.discardPile.length - 1];

        // Validate move
        if (!this.isValidMove(card, topCard)) {
            logger.warn(`Invalid move by ${player.name}: ${card.color} ${card.value} on ${topCard.color} ${topCard.value}`);
            return false;
        }

        // Validate House Rule: Cannot win with a Wild or Wild Draw Four card
        if (player.hand.length === 1 && (card.type === 'WILD' || card.type === 'WILD_DRAW_FOUR')) {
            logger.warn(`House Rule Violation: ${player.name} tried to end with a ${card.type} card`);
            return false;
        }

        // Play card
        player.hand.splice(cardIndex, 1);
        this.discardPile.push(card);

        // Handle Wild Color Choice
        if (card.color === 'BLACK') {
            if (!chosenColor) {
                logger.warn(`Player ${player.name} played Wild but didn't choose color`);
                return false; // Must choose color
            }
            this.currentColor = chosenColor;
        } else {
            this.currentColor = card.color;
        }

        logger.info(`Player ${player.name} played ${card.color} ${card.value}`);

        // Handle Effects
        const skipTurn = this.handleSpecialCard(card);

        // Check Win
        if (player.hand.length === 0) {
            this.winner = player;
            this.gameStatus = 'ENDED';
            this.clearTurnTimer();
            this.calculateScores();
            logger.info(`Game Won by ${player.name}!`);
            return true;
        }

        // Check UNO failure
        if (player.hand.length === 1 && !player.isUno) {
            player.hand.push(this.drawCard());
            player.hand.push(this.drawCard());
            logger.info(`Player ${player.name} forgot UNO and drew 2 cards`);
        }

        // Reset flags
        if (player.hand.length > 1) player.isUno = false;
        player.hasDrawn = false;

        // Next turn
        this.advanceTurn(skipTurn);
        this.startTurnTimer(); // Restart timer for next player
        return true;
    }

    isValidMove(card, topCard) {
        // Stacking Logic
        if (this.drawStack > 0) {
            if (this.stackType === 'DRAW_TWO' && card.value === 'DRAW_TWO') return true;
            if (this.stackType === 'WILD_DRAW_FOUR' && card.value === 'WILD_DRAW_FOUR') return true;
            return false;
        }

        if (card.color === 'BLACK') return true; // Wilds always playable
        if (card.color === this.currentColor) return true; // Match color
        if (card.value === topCard.value) return true; // Match value
        return false;
    }

    handleSpecialCard(card) {
        let skipNext = false;
        switch (card.value) {
            case 'SKIP':
                if (this.drawStack === 0) skipNext = true;
                break;
            case 'REVERSE':
                if (this.drawStack === 0) {
                    if (this.players.length === 2) {
                        skipNext = true;
                    } else {
                        this.direction *= -1;
                    }
                }
                break;
            case 'DRAW_TWO':
                this.drawStack += 2;
                this.stackType = 'DRAW_TWO';
                // Do NOT skip next here, we wait to see if they stack
                break;
            case 'WILD_DRAW_FOUR':
                this.drawStack += 4;
                this.stackType = 'WILD_DRAW_FOUR';
                break;
        }
        return skipNext;
    }

    playerDrawCard(playerIndex) {
        if (playerIndex !== this.turnIndex) return false;
        const player = this.players[playerIndex];

        // If facing a stack
        if (this.drawStack > 0) {
            for (let i = 0; i < this.drawStack; i++) {
                player.hand.push(this.drawCard());
            }
            logger.info(`Player ${player.name} drew ${this.drawStack} cards from stack`);
            this.drawStack = 0;
            this.stackType = null;
            player.hasDrawn = false;
            this.advanceTurn();
            this.startTurnTimer(); // Restart timer for next player
            return true;
        }

        // Normal draw
        if (player.hasDrawn) return false; // Already drawn once

        const card = this.drawCard();
        if (card) {
            player.hand.push(card);
            player.hasDrawn = true;
            player.isUno = false; // Reset Uno status on draw
            logger.info(`Player ${player.name} drew a card`);
            // Do NOT advance turn automatically
        }
        return true;
    }

    passTurn(playerIndex) {
        if (playerIndex !== this.turnIndex) return false;
        const player = this.players[playerIndex];

        if (!player.hasDrawn && this.drawStack === 0) return false; // Must draw before passing (unless stacking logic handled elsewhere)

        player.hasDrawn = false;
        this.advanceTurn();
        this.startTurnTimer(); // Restart timer for next player
        logger.info(`Player ${player.name} passed turn`);
        return true;
    }

    calculateScores() {
        this.scores = {};
        this.players.forEach(p => {
            let score = 0;
            p.hand.forEach(c => {
                if (c.type === 'NUMBER') score += parseInt(c.value);
                else if (['SKIP', 'REVERSE', 'DRAW_TWO'].includes(c.value)) score += 20;
                else if (['WILD', 'WILD_DRAW_FOUR'].includes(c.value)) score += 50;
            });
            this.scores[p.userId] = score;
        });
    }

    restartGame(playerIndex) {
        // Only host or winner? Let's say anyone for now
        this.deck = [];
        this.discardPile = [];
        this.turnIndex = 0;
        this.direction = 1;
        this.currentColor = null;
        this.winner = null;
        this.drawStack = 0;
        this.stackType = null;
        this.rematchCancelled = false;
        this.clearTurnTimer();
        this.init(this.players);
        logger.info('Game Restarted');
        return true;
    }

    getNextPlayerIndex() {
        let nextIndex = this.turnIndex + this.direction;
        if (nextIndex >= this.players.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = this.players.length - 1;
        return nextIndex;
    }

    updatePlayerStatus(userId, status) {
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            player.connected = status.connected;
            if (status.id) player.id = status.id; // Update socket ID on reconnect
            logger.info(`Sync: Player ${player.name} connected=${player.connected}`);

            if (this.gameStatus === 'ENDED') {
                this.checkRematchDecided();
            }
        }
    }

    advanceTurn(skip = false) {
        if (skip) {
            const skippedPlayer = this.players[this.getNextPlayerIndex()];
            this.lastSkip = { playerId: skippedPlayer.id, reason: 'CARD', timestamp: Date.now() };
            this.turnIndex = this.getNextPlayerIndex();
            this.turnIndex = this.getNextPlayerIndex();
        } else {
            this.turnIndex = this.getNextPlayerIndex();
        }

        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    getState() {
        // Explicitly return only serializable data - do NOT include turnTimer (it has circular refs)
        return {
            gameStatus: this.gameStatus,
            players: this.players.map(p => ({
                id: p.id,
                userId: p.userId,
                name: p.name,
                cardCount: p.hand.length,
                isUno: p.isUno,
                hasDrawn: p.hasDrawn,
                wantsRematch: p.wantsRematch,
                declinedRematch: p.declinedRematch,
                connected: p.connected,
                isTurn: this.players[this.turnIndex] ? this.players[this.turnIndex].userId === p.userId : false
            })),
            topCard: this.discardPile[this.discardPile.length - 1],
            currentColor: this.currentColor,
            direction: this.direction,
            turnIndex: this.turnIndex,
            winner: this.winner ? {
                id: this.winner.id,
                userId: this.winner.userId,
                name: this.winner.name
            } : null,
            scores: this.scores,
            lastUnoShout: this.lastUnoShout,
            drawStack: this.drawStack,
            stackType: this.stackType,
            lastSkip: this.lastSkip,
            rematchCancelled: this.rematchCancelled,
            // Turn timer info for client synchronization (primitives only, no timer object)
            turnStartTime: this.turnStartTime,
            turnDuration: this.turnDuration,
            // Send hands map: { playerId: [cards] }
            hands: this.players.reduce((acc, p) => {
                acc[p.id] = p.hand;
                return acc;
            }, {})
        };
    }
    removePlayer(playerId) {
        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return false;

        const player = this.players[playerIndex];
        logger.info(`Removing player ${player.name} from UNO game`);

        if (this.gameStatus === 'ENDED') {
            this.checkRematchDecided();
        }

        // Discard their hand
        if (player.hand && player.hand.length > 0) {
            this.discardPile.push(...player.hand);
        }

        const isLeavingPlayerTurn = (this.turnIndex === playerIndex);

        this.players.splice(playerIndex, 1);

        // Adjust turn index
        if (this.turnIndex > playerIndex) {
            this.turnIndex--;
        } else if (this.turnIndex === playerIndex) {
            // It was their turn. 
            // If direction is -1 (counter-clockwise), the "next" player in that order 
            // is actually at index this.turnIndex - 1.
            if (this.direction === -1) {
                this.turnIndex--;
            }
            // else direction is 1 (clockwise), index already points to "next" player due to splice.

            // Ensure index stays in bounds
            if (this.turnIndex >= this.players.length) {
                this.turnIndex = 0;
            } else if (this.turnIndex < 0) {
                this.turnIndex = this.players.length - 1;
            }
        }

        // Check win condition (if only 1 player or 0 left)
        if (this.players.length < 2) {
            this.winner = this.players[0] || null;
            this.gameStatus = 'ENDED';
            this.clearTurnTimer();
            if (this.winner) this.calculateScores();
            logger.info(`Game ended due to player exit. Winner: ${this.winner ? this.winner.name : 'None'}`);
            this.emitStateChange();
            return true; // Game Ended
        }

        // Restart turn timer ONLY if the leaving player was the one whose turn it was
        if (isLeavingPlayerTurn) {
            this.startTurnTimer();
        }

        return false; // Game continues
    }

    checkRematchDecided() {
        if (this.gameStatus !== 'ENDED') return;

        const activePlayers = this.players.filter(p => p.connected);
        if (activePlayers.length === 0) return;

        const allDecided = activePlayers.every(p => p.wantsRematch || p.declinedRematch);
        if (allDecided) {
            const anyDeclined = activePlayers.some(p => p.declinedRematch);
            if (anyDeclined) {
                this.rematchCancelled = true;
                this.emitStateChange();
            } else {
                this.restartGame(0);
            }
        } else {
            this.emitStateChange();
        }
    }

    emitStateChange() {
        if (this.onStateChange) this.onStateChange();
    }

    stop() {
        this.clearTurnTimer();
        this.gameStatus = 'ENDED';
    }
}

module.exports = UnoGame;

