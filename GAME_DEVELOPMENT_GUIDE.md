# Game Development Guide

This document outlines the architecture, rules, and modular components for implementing new games in the **Game Box** project. Follow these guidelines to ensure consistency, stability, and a premium user experience.

## 1. Architecture Overview
The project uses a **Room-based Architecture** where `RoomManager` (Server) manages client connections and routes actions to specific `Game` instances.
-   **Communication**: Socket.IO events (`game_action`, `room_updated`, `game_notification`).
-   **State**: The Server is the single source of truth. Clients render based on `room.gameState`.

## 2. Server-Side Implementation

### A. Game Class Interface
Every game must implement a class (e.g., `TicTacToeGame`) with the following methods:

```javascript
class MyGame {
    constructor() {
        this.id = 'MY_GAME'; // Unique Identifier
        this.players = [];
        this.gameStatus = 'WAITING'; // WAITING, PLAYING, ENDED
        this.onStateChange = null; // Callback injected by RoomManager
    }

    // Called when game starts. Initialize state, deck, etc.
    init(players) {
        this.players = players.map(p => ({
            id: p.id,
            userId: p.userId, // Critical for reconnects
            name: p.name,
            score: 0
            // ...game specific props
        }));
        this.gameStatus = 'PLAYING';
    }

    // Main logic handler. Return true if state changed, false otherwise.
    handleAction(action, player) {
        if (this.gameStatus !== 'PLAYING') return false;
        
        // Validate Turn
        // Execute Logic
        
        return true; // Triggers RoomManager to emit 'room_updated'
    }

    // Return a JSON-serializable object of the current state for clients.
    // WARNING: Avoid circular references (e.g. timers, circular objects).
    getState() {
        return {
            gameStatus: this.gameStatus,
            players: this.players,
            // ... serializable game data
        };
    }

    // Called when a player disconnects or leaves.
    // RULE: NEVER advance the turn specifically because a non-active player left.
    // Only advance turn if the *active* player left to prevent stalling.
    removePlayer(playerId) {
        // Remove logic...
        // Return true if game ended due to lack of players
        return false; 
    }

    // Cleanup timers etc.
    stop() {
        // clearTimers();
    }
}
```

### B. Critical Rules
1.  **Idempotency**: The `RoomManager` handles idempotency using `action.nonce`. Game logic does not need to check nonces, but should expect that `handleAction` is only called once per unique action.
2.  **Concurrency Locking**: `RoomManager` locks the room during `handleAction`. Do not introduce `await` or async delays inside `handleAction` if possible, as it holds the lock.
3.  **Turn Timer**: If your game has turns, implement a server-side timer using `setTimeout`.
    *   Store the timer ID to clear it on stops/restarts.
    *   On timeout, perform a default action (pass/random move) and advance turn.

### C. Registration
Add your game class to `server/games/registry.js` (or `GAME_REGISTRY` in `RoomManager.js`).

## 3. Client-Side Implementation

### A. Folder Structure
Create a folder in `client/src/games/[game-name]/` containing:
-   `index.jsx` (Main Game Component)
-   `[game-name].css`
-   Supporting components (`Board.jsx`, `Card.jsx`, etc.)

### B. Standard Game Wrapper
Wrap your main component in `GameWrapper` to get the standard header, rules modal, and exit handling.

```jsx
import GameWrapper from '../../screens/GameWrapper';

export default function MyGame({ room, me }) {
    return (
        <GameWrapper
            room={room}
            me={me}
            title="MY GAME"
            playScreen={
                <div className="my-game-board">
                    {/* Game UI */}
                </div>
            }
            // Optional: Player Hand UI for card games
            playerHand={<MyHand ... />} 
            // Optional: Overlay for Game Over screens
            overlay={gameOverNode}
        >
        </GameWrapper>
    );
}
```

### C. Standard Modules (Use These!)
Reuse existing design system components to maintain the premium feel.

| Component | Path | Usage |
| :--- | :--- | :--- |
| **`PlayerBubble`** | `design-system/PlayerBubble` | Displays player avatar, name, stats, and emotes. Handles hover interactions automatically. |
| **`TurnTimer`** | `design-system/TurnTimer` | Wraps `PlayerBubble` to show a circular countdown progress bar. |
| **`GameOverOverlay`** | `design-system/GameOverOverlay` | Standard end-game screen with "Play Again" and "Leave" options. |
| **`Button`** | `design-system/Button` | Standard styled buttons (primary/secondary). |
| **`PopNotification`** | `design-system/PopNotification` | Large central popup (e.g., "UNO!", "WINNER"). |
| **`soundManager`** | `utils/soundManager` | Use standard sounds: `playClick()`, `playWin()`, `playLose()`, `playInvalid()`. |

### D. Action Emission Pattern
**ALWAYS** use a helper to inject a `nonce` for idempotency.

```javascript
import { socket } from '../../socket';

// Internal helper inside component
const sendGameAction = (action) => {
    const nonce = Math.random().toString(36).substring(2, 15);
    socket.emit('game_action', {
        roomId: room.id,
        action: { ...action, nonce }
    });
};

// Usage
sendGameAction({ type: 'PLACE_MARKER', x: 1, y: 1 });
```

## 4. Checklist for New Games
-   [ ] **Server**: Game class implements all interface methods.
-   [ ] **Server**: `removePlayer` logic handles disconnects without breaking turn order.
-   [ ] **Client**: Uses `GameWrapper` and `PlayerBubble`.
-   [ ] **Client**: Implements `sendGameAction` with nonce.
-   [ ] **Assets**: Uses `soundManager` for interactions.
-   [ ] **Testing**: Verify disconnect/reconnect behavior does not stall the game.
