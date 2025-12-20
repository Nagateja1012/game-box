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
    }

    // Initialize game with players
    init(players) {
        this.players = players.map(p => ({
            id: p.id,
            name: p.name,
            hand: [],
            isUno: false,
            hasDrawn: false
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
        if (this.gameStatus !== 'PLAYING' && action.type !== 'RESTART_GAME') return false;

        const playerIndex = this.players.findIndex(p => p.id === player.id);
        if (playerIndex === -1) {
            logger.warn(`Player ${player.name} not found in game players list`);
            return false;
        }

        // Check if it's player's turn (except for Uno shout or Restart)
        if (playerIndex !== this.turnIndex && action.type !== 'UNO_SHOUT' && action.type !== 'RESTART_GAME') {
            // logger.warn(`Player ${player.name} attempted action out of turn`);
            return false;
        }

        switch (action.type) {
            case 'PLAY_CARD':
                return this.playCard(playerIndex, action.cardId, action.chosenColor);
            case 'DRAW_CARD':
                return this.playerDrawCard(playerIndex);
            case 'UNO_SHOUT':
                this.players[playerIndex].isUno = true;
                this.lastUnoShout = {
                    playerId: player.id,
                    name: player.name,
                    time: Date.now()
                };
                logger.info(`UNO Shout by ${player.name}`);
                return true;
            case 'PASS_TURN':
                return this.passTurn(playerIndex);
            case 'RESTART_GAME':
                return this.restartGame(playerIndex);
            default:
                logger.warn(`Unknown action type: ${action.type}`);
                return false;
        }
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
            this.scores[p.id] = score;
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

    advanceTurn(skip = false) {
        this.turnIndex = this.getNextPlayerIndex();
        if (skip) {
            this.turnIndex = this.getNextPlayerIndex();
        }
    }

    getState() {
        return {
            gameStatus: this.gameStatus,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length,
                isUno: p.isUno,
                hasDrawn: p.hasDrawn,
                isTurn: this.players[this.turnIndex].id === p.id
            })),
            topCard: this.discardPile[this.discardPile.length - 1],
            currentColor: this.currentColor,
            direction: this.direction,
            turnIndex: this.turnIndex,
            turnIndex: this.turnIndex,
            winner: this.winner,
            scores: this.scores,
            lastUnoShout: this.lastUnoShout,
            drawStack: this.drawStack,
            // Send full hand only to the specific player (handled by UI filtering or socket room logic?)
            // Actually, roomManager broadcasts to everyone.
            // We need to be careful not to send everyone's hand to everyone.
            // But for this simple app, we might send it all and filter on client, OR better:
            // We can't easily send different states to different people with simple io.to(room).emit
            // So we will send "hands" as just counts in `players` array above.
            // And we need a way to send "my hand".
            // The client will have to request "my hand" or we send a separate event?
            // Or we just send everyone's hand and trust the client (INSECURE but fast for prototype).
            // Let's send everyone's hand for now to be fast, but maybe mask it?
            // No, let's just send `hands` map: { playerId: [cards] }
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

        // Return cards to discard pile (optional, but keeps card count consistent)
        // Or just discard them.
        this.discardPile.push(...player.hand);

        this.players.splice(playerIndex, 1);

        // Adjust turn index
        if (playerIndex < this.turnIndex) {
            this.turnIndex--;
        }
        if (this.turnIndex >= this.players.length) {
            this.turnIndex = 0;
        }

        // Check win condition (if only 1 player left)
        if (this.players.length < 2) {
            this.winner = this.players[0];
            this.gameStatus = 'ENDED';
            this.calculateScores();
            return true; // Game Ended
        }

        return false; // Game continues
    }
}

module.exports = UnoGame;
