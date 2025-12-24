import React from 'react';
import { GAME_REGISTRY } from '../games/registry';
import GameWrapper from './GameWrapper';

export default function GameContainer({ room, me }) {
    const GameComponent = GAME_REGISTRY[room?.game?.id];

    if (!GameComponent) {
        return <div>Error: Game not found</div>;
    }

    return (
        <GameComponent room={room} me={me} />
    );
}
