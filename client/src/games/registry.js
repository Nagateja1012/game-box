import Uno from './uno';
import Bingo from './bingo';
import { UNO_RULES } from './uno/rules';
import { BINGO_RULES } from './bingo/rules';


export const GAME_REGISTRY = {
    'UNO': Uno,
    'BINGO': Bingo
};

export const GAME_METADATA = {
    'EXPLODING_KITTENS': {
        name: 'Exploding Kittens',
        description: 'A kitty-powered version of Russian Roulette.',
        image: 'https://placehold.co/600x400/2c3e50/ffffff?text=EXPLODING+KITTENS',
        rules: '',
        minPlayers: 2,
        maxPlayers: 5,
        category: 'solo',
        tags: ['dev']
    },
    'UNO': {
        name: 'UNO',
        description: 'The classic card game!',
        image: 'https://placehold.co/600x400/ffaa00/ffffff?text=UNO',
        rules: UNO_RULES,
        minPlayers: 2,
        maxPlayers: 12,
        category: 'solo'
    },

    'SEQUENCE': {
        name: 'Sequence',
        description: 'Strategy card game.',
        image: 'https://placehold.co/600x400/34495e/ffffff?text=Sequence',
        rules: '',
        minPlayers: 2,
        maxPlayers: 12,
        category: 'team',
        tags: ['dev']
    },
    'WHATS_THE_EMOJI': {
        name: 'What’s the Emoji?',
        description: 'Guess the phrase from emojis.',
        image: 'https://placehold.co/600x400/e67e22/ffffff?text=Emoji',
        rules: '',
        minPlayers: 2,
        maxPlayers: 12,
        category: 'solo',
        tags: ['dev']
    },
    'MAGNETS': {
        name: 'Magnets',
        description: 'Magnetic strategy game.',
        image: 'https://placehold.co/600x400/95a5a6/ffffff?text=Magnets',
        rules: '',
        minPlayers: 2,
        maxPlayers: 4,
        category: 'solo',
        tags: ['dev']
    },
    'CONNECT_DOTS': {
        name: 'Connect Dots',
        description: 'Classic paper and pencil game.',
        image: 'https://placehold.co/600x400/16a085/ffffff?text=Dots',
        rules: '',
        minPlayers: 2,
        maxPlayers: 4,
        category: 'solo',
        tags: ['dev']
    },
    'BINGO': {
        name: 'BINGO',
        description: 'Classic game of chance.',
        image: 'https://placehold.co/600x400/2980b9/ffffff?text=BINGO',
        rules: BINGO_RULES,
        minPlayers: 2,
        maxPlayers: 20,
        category: 'solo'
    },
    'HOUSIE': {
        name: 'Housie',
        description: 'Similar to Bingo.',
        image: 'https://placehold.co/600x400/8e44ad/ffffff?text=Housie',
        rules: '',
        minPlayers: 2,
        maxPlayers: 20,
        category: 'solo',
        tags: ['dev']
    },
    'UNDERCOVER': {
        name: 'Undercover',
        description: 'Find the spy among you.',
        image: 'https://placehold.co/600x400/2c3e50/ffffff?text=Undercover',
        rules: '',
        minPlayers: 3,
        maxPlayers: 12,
        category: 'team',
        tags: ['dev']
    },
    'WHO_AM_I': {
        name: 'Who am I',
        description: 'Guess the character.',
        image: 'https://placehold.co/600x400/f1c40f/ffffff?text=Who+Am+I',
        rules: '',
        minPlayers: 2,
        maxPlayers: 12,
        category: 'solo',
        tags: ['dev']
    },
    'WEREWOLF': {
        name: 'Werewolf',
        description: 'Social deduction game.',
        image: 'https://placehold.co/600x400/c0392b/ffffff?text=Werewolf',
        rules: '',
        minPlayers: 5,
        maxPlayers: 15,
        category: 'team',
        tags: ['dev']
    },
    'SQUID_GAME': {
        name: 'SquidGame',
        description: 'Survival games.',
        image: 'https://placehold.co/600x400/d35400/ffffff?text=SquidGame',
        rules: '',
        minPlayers: 2,
        maxPlayers: 20,
        category: 'solo',
        tags: ['dev']
    },
    'FUNGI': {
        name: 'Fungi',
        description: 'Mushroom foraging game.',
        image: 'https://placehold.co/600x400/27ae60/ffffff?text=Fungi',
        rules: '',
        minPlayers: 2,
        maxPlayers: 2,
        category: 'solo',
        tags: ['dev']
    },
    'CHAIN_REACTION': {
        name: 'Chain reaction',
        description: 'Strategic explosion game.',
        image: 'https://placehold.co/600x400/e74c3c/ffffff?text=Chain+Reaction',
        rules: '',
        minPlayers: 2,
        maxPlayers: 8,
        category: 'solo',
        tags: ['dev']
    },
    'LEAST_COUNT': {
        name: 'Least Count',
        description: 'Card game to minimize score.',
        image: 'https://placehold.co/600x400/7f8c8d/ffffff?text=Least+Count',
        rules: '',
        minPlayers: 2,
        maxPlayers: 6,
        category: 'solo',
        tags: ['dev']
    },
    'BLUFF': {
        name: 'Bluff',
        description: 'Card game of deception.',
        image: 'https://placehold.co/600x400/34495e/ffffff?text=Bluff',
        rules: '',
        minPlayers: 3,
        maxPlayers: 10,
        category: 'solo',
        tags: ['dev']
    }
};
