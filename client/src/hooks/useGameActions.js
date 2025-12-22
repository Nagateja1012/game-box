import { useState } from 'react';
import { socket } from '../socket';

export function useGameActions(room, me) {
    const [showRules, setShowRules] = useState(false);
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const handleExit = () => setShowExitConfirmation(true);
    const cancelExit = () => setShowExitConfirmation(false);
    const confirmExit = () => {
        socket.emit('leave_game', { roomId: room.id });
        setShowExitConfirmation(false);
    };

    const toggleRules = () => setShowRules(!showRules);

    return {
        showRules,
        setShowRules,
        showExitConfirmation,
        handleExit,
        cancelExit,
        confirmExit,
        toggleRules
    };
}
