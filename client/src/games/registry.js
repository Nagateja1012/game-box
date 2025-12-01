import Uno from './Uno';
import ExplodingKittens from './ExplodingKittens';

export const GAME_REGISTRY = {
    'UNO': Uno,
    'EXPLODING_KITTENS': ExplodingKittens
};

export const GAME_METADATA = {
    'EXPLODING_KITTENS': {
        name: 'Exploding Kittens',
        description: 'A kitty-powered version of Russian Roulette.',
        image: 'https://placehold.co/600x400/2c3e50/ffffff?text=EXPLODING+KITTENS',
        rules: [
            'Draw cards until someone draws an Exploding Kitten.',
            'Play cards to skip, attack, or peek at the deck.',
            'Use Defuse cards to survive explosions.',
            'Last player remaining wins!'
        ],
        minPlayers: 2,
        maxPlayers: 5,
        tags: ['dev']
    },
    'UNO': {
        name: 'UNO',
        description: 'The classic card game!',
        image: 'https://placehold.co/600x400/ffaa00/ffffff?text=UNO',
        rules: [
            'Match cards by color or number.',
            'Use action cards to skip, reverse, or make others draw.',
            'Shout UNO when you have one card left!',
            'First to empty their hand wins.'
        ],
        minPlayers: 2,
        maxPlayers: 12
    }
};
