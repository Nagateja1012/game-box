const DECK_CONFIG = {
    'EXPLODING_KITTEN': { count: 0, type: 'BOMB', name: 'Exploding Kitten', desc: 'Eliminates you unless you have a Defuse.' },
    'DEFUSE': { count: 6, type: 'DEFUSE', name: 'Defuse', desc: 'Save yourself from an Exploding Kitten.' },
    'ATTACK': { count: 4, type: 'ACTION', name: 'Attack (2x)', desc: 'End your turn. Next player takes 2 turns.' },
    'SKIP': { count: 4, type: 'ACTION', name: 'Skip', desc: 'End your turn without drawing.' },
    'FAVOR': { count: 4, type: 'ACTION', name: 'Favor', desc: 'Force another player to give you a card.' },
    'SHUFFLE': { count: 4, type: 'ACTION', name: 'Shuffle', desc: 'Shuffle the draw pile.' },
    'SEE_FUTURE': { count: 5, type: 'ACTION', name: 'See The Future (3x)', desc: 'Peek at the top 3 cards.' },
    'ALTER_FUTURE': { count: 4, type: 'ACTION', name: 'Alter The Future (3x)', desc: 'View and rearrange the top 3 cards.' },
    'NOPE': { count: 5, type: 'ACTION', name: 'Nope', desc: 'Stop any action except an Exploding Kitten or Defuse.' },
    'TACOCAT': { count: 4, type: 'CAT', name: 'Tacocat', desc: 'Pair to steal a random card.' },
    'CATTERMELON': { count: 4, type: 'CAT', name: 'Cattermelon', desc: 'Pair to steal a random card.' },
    'HAIRY_POTATO_CAT': { count: 4, type: 'CAT', name: 'Hairy Potato Cat', desc: 'Pair to steal a random card.' },
    'BEARD_CAT': { count: 4, type: 'CAT', name: 'Beard Cat', desc: 'Pair to steal a random card.' },
    'RAINBOW_RALPHING_CAT': { count: 4, type: 'CAT', name: 'Rainbow Ralphing Cat', desc: 'Pair to steal a random card.' }
};

class ExplodingKittens {
    constructor() {
        this.id = 'EXPLODING_KITTENS';
        this.deck = [];
        this.discardPile = [];
        this.players = []; // { id, name, hand: [], isEliminated: false }
        this.turnIndex = 0;
        this.turnsToTake = 1; // For Attack cards
        this.gameStarted = false;
        this.winner = null;
        this.lastAction = null; // For Nope logic (simplified)
        this.futureCards = []; // For See/Alter Future
        this.showingFutureTo = null; // Player ID seeing future
        this.attackStack = 0; // Stacked turns from attacks
        this.targetPlayerId = null; // For Favor
    }

    init(players) {
        this.players = players.map(p => ({
            ...p,
            hand: [],
            isEliminated: false
        }));

        this.setupDeck();
        this.dealInitialCards();
        this.insertExplodingKittens();
        this.gameStarted = true;
        this.turnIndex = Math.floor(Math.random() * this.players.length);
    }

    setupDeck() {
        this.deck = [];
        // Add all cards except Exploding Kittens and Defuses initially
        for (const [key, config] of Object.entries(DECK_CONFIG)) {
            if (key !== 'EXPLODING_KITTEN' && key !== 'DEFUSE') {
                for (let i = 0; i < config.count; i++) {
                    this.deck.push({ id: `${key}_${i}`, key, ...config });
                }
            }
        }
        this.shuffle(this.deck);
    }

    dealInitialCards() {
        // Give each player 1 Defuse and 7 random cards
        this.players.forEach(player => {
            player.hand.push({ id: `DEFUSE_INIT_${player.id}`, key: 'DEFUSE', ...DECK_CONFIG['DEFUSE'] });
            for (let i = 0; i < 7; i++) {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        });

        // Add remaining Defuses back to deck
        const remainingDefuses = Math.max(0, DECK_CONFIG['DEFUSE'].count - this.players.length); // Usually 6 total, so if < 6 players, put rest in deck
        // Actually rules say: 2-3 players: put 2 defuses in deck. 4-7 players: put remaining defuses in deck.
        // Simplified: Put remaining configured defuses in deck.
        for (let i = 0; i < remainingDefuses; i++) {
            this.deck.push({ id: `DEFUSE_DECK_${i}`, key: 'DEFUSE', ...DECK_CONFIG['DEFUSE'] });
        }
    }

    insertExplodingKittens() {
        const kittenCount = this.players.length - 1;
        for (let i = 0; i < kittenCount; i++) {
            this.deck.push({ id: `BOMB_${i}`, key: 'EXPLODING_KITTEN', ...DECK_CONFIG['EXPLODING_KITTEN'] });
        }
        this.shuffle(this.deck);
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getState() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                cardCount: p.hand.length,
                hand: p.hand,
                isEliminated: p.isEliminated,
                isTurn: !this.winner && p.id === this.players[this.turnIndex].id
            })),
            deckCount: this.deck.length,
            discardPile: this.discardPile.slice(-5), // Send last 5 for visuals
            currentPlayerId: this.winner ? null : this.players[this.turnIndex].id,
            turnsToTake: this.turnsToTake,
            winner: this.winner,
            futureCards: this.futureCards,
            showingFutureTo: this.showingFutureTo,
            targetPlayerId: this.targetPlayerId
        };
    }

    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    handleAction(action, player) {
        if (this.winner) return false;
        if (player.id !== this.players[this.turnIndex].id && action.type !== 'NOPE') return false; // Only current player unless Nope

        // Reset transient states if action is not related to them
        if (action.type !== 'CLOSE_FUTURE') {
            // this.showingFutureTo = null; // Keep it until explicitly closed
        }

        switch (action.type) {
            case 'DRAW':
                return this.handleDraw(player);
            case 'PLAY_CARD':
                return this.handlePlayCard(player, action.cardId, action.targetId, action.options);
            case 'CLOSE_FUTURE':
                this.showingFutureTo = null;
                this.futureCards = [];
                return true;
            case 'REORDER_FUTURE':
                if (this.showingFutureTo === player.id && action.newOrder) {
                    // Verify newOrder contains same cards
                    this.deck.splice(this.deck.length - 3, 3, ...action.newOrder);
                    this.showingFutureTo = null;
                    this.futureCards = [];
                    return true;
                }
                return false;
            case 'GIVE_FAVOR':
                return this.handleGiveFavor(player, action.cardId);
            default:
                return false;
        }
    }

    handleDraw(player) {
        if (this.turnsToTake <= 0) return false; // Should not happen

        const card = this.deck.pop();
        if (!card) return false; // Empty deck? Should not happen in EK

        if (card.key === 'EXPLODING_KITTEN') {
            // Check for Defuse
            const defuseIndex = player.hand.findIndex(c => c.key === 'DEFUSE');
            if (defuseIndex !== -1) {
                // Auto-play Defuse
                const defuseCard = player.hand.splice(defuseIndex, 1)[0];
                this.discardPile.push(defuseCard);
                this.discardPile.push(card); // Kitten goes to discard temporarily or deck?
                // Actually Kitten goes back into deck. Defuse goes to discard.
                // We need to ask player where to put Kitten. For simplicity, random for now or top?
                // Rules: Player puts it back anywhere.
                // Let's implement random placement for MVP to avoid complex UI for now, or top.
                // Let's do random to be fair.
                const insertIndex = Math.floor(Math.random() * (this.deck.length + 1));
                this.deck.splice(insertIndex, 0, card);

                // Decrement turns to take
                this.turnsToTake--;
                if (this.turnsToTake === 0) {
                    this.nextTurn();
                }
            } else {
                // BOOM
                player.isEliminated = true;
                this.discardPile.push(card); // Kitten discarded
                // Discard hand
                this.discardPile.push(...player.hand);
                player.hand = [];

                this.checkWinCondition();
                if (!this.winner) {
                    this.turnsToTake = 0; // Turn ends immediately
                    this.nextTurn();
                }
            }
        } else {
            player.hand.push(card);
            this.turnsToTake--;
            if (this.turnsToTake === 0) {
                this.nextTurn();
            }
        }
        return true;
    }

    handlePlayCard(player, cardId, targetId, options) {
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return false;

        const card = player.hand[cardIndex];

        // Logic for specific cards
        let cardPlayed = true;

        switch (card.key) {
            case 'ATTACK':
                this.turnsToTake = 0; // End current turn immediately without drawing
                // Next player has to take 2 turns + whatever was remaining (if stacked)
                // Standard rules: Do not draw. Next player takes 2 turns.
                // If attacked player attacks, they add 2 turns to next player.
                // Simplified: Set next player turns to (current_stack + 2). 
                // Wait, if I have 2 turns left and I attack, I don't draw. Next player has 2 turns.
                // If I was attacked (2 turns) and I attack, next player has 4 turns.
                const nextTurns = (this.turnsToTake > 1 ? this.turnsToTake : 0) + 2;
                // Actually, if I play attack, my turn ends.
                this.nextTurn();
                this.turnsToTake = this.turnsToTake === 1 ? 2 : this.turnsToTake + 2; // If fresh turn 2, if stacked add 2.
                break;
            case 'SKIP':
                this.turnsToTake--;
                if (this.turnsToTake === 0) {
                    this.nextTurn();
                }
                break;
            case 'SHUFFLE':
                this.shuffle(this.deck);
                break;
            case 'SEE_FUTURE':
                this.futureCards = this.deck.slice(-3).reverse(); // Top 3
                this.showingFutureTo = player.id;
                break;
            case 'ALTER_FUTURE':
                this.futureCards = this.deck.slice(-3).reverse();
                this.showingFutureTo = player.id;
                // Client will send REORDER_FUTURE
                break;
            case 'FAVOR':
                if (!targetId) return false;
                const target = this.players.find(p => p.id === targetId);
                if (!target || target.isEliminated || target.hand.length === 0) return false;
                // Target must give a card.
                // For MVP, random card from target? Or prompt target?
                // Prompting target is complex state. Let's steal random for MVP or prompt.
                // Let's steal random to keep flow fast.
                const stolenIndex = Math.floor(Math.random() * target.hand.length);
                const stolenCard = target.hand.splice(stolenIndex, 1)[0];
                player.hand.push(stolenCard);
                break;
            case 'NOPE':
                // Complex. Skip for MVP or implement simple cancel of last action?
                // Let's treat as just a card for now, maybe placeholder.
                cardPlayed = false; // Not implemented fully
                break;
            default:
                // Cats - need pairs
                // Check if another same cat is selected or played?
                // Simplified: Single cards don't do anything unless Action.
                // If we want to support pairs, we need 'multi-select' in UI.
                // For now, treat non-action cards as unplayable singly.
                cardPlayed = false;
                break;
        }

        if (cardPlayed) {
            player.hand.splice(cardIndex, 1);
            this.discardPile.push(card);
        }

        return true;
    }

    nextTurn() {
        let activePlayers = this.players.filter(p => !p.isEliminated);
        if (activePlayers.length < 2) return; // Should be win condition

        let currentIdx = this.players.findIndex(p => p.id === this.players[this.turnIndex].id);
        let nextIdx = (currentIdx + 1) % this.players.length;

        while (this.players[nextIdx].isEliminated) {
            nextIdx = (nextIdx + 1) % this.players.length;
        }

        this.turnIndex = nextIdx;
        this.turnsToTake = (this.turnsToTake > 1 && this.players[this.turnIndex].key !== 'ATTACK') ? this.turnsToTake : 1;
        // Reset turns to take if it was a normal turn end? 
        // No, if Attack passed turns, we set them in handlePlayCard.
        // If normal end (turnsToTake reached 0), reset to 1.
        if (this.turnsToTake === 0) this.turnsToTake = 1;
    }

    checkWinCondition() {
        const activePlayers = this.players.filter(p => !p.isEliminated);
        if (activePlayers.length === 1) {
            this.winner = activePlayers[0];
        }
    }
}

module.exports = ExplodingKittens;
