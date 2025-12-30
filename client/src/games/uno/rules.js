export const UNO_RULES = `
# UNO – Game Rules (GameBox)

Each player is dealt cards and plays in turns.

On your turn, you must play a card that matches the **color** or **number**, or play a **Wild** card.

If you cannot play a card, you must **draw one card** from the deck.

## 🔁 Action Cards

- **Skip**: Skips the next player’s turn.
- **Reverse**: Reverses the direction of play.
- **+2**: Next player draws 2 cards.
- **Stacking +2**: +2 can be stacked only with another +2.
- **+4 (Wild Draw Four)**: Choose a color and the next player draws 4 cards.
- **Stacking +4**: +4 can be stacked only with another +4.
- **Note**: +2 and +4 cannot be stacked together.

## 🎨 Wild Cards

When a **Wild** or **+4** card is played, the player must select a color before the game continues.

## 🔔 UNO Rule

- When you have **2 cards left** and are about to play, you must click the **UNO button**.
- Clicking UNO shows a notification to all players.
- If you click UNO and then draw a card, there is no penalty.

## 📝 Penalties

- If you do not click UNO and play a card, 2 cards are added to your hand.
- If you dont play a card within time limit, you chance is skipped and 1 card is added to your hand.
- If you dont play a card within time limit when (+2 or greater) is played, you chance is skipped and (+2 or greater) + 1 cards are added to your hand.

## 🏁 Winning the Game

A player wins by playing their last card, which **cannot** be a Wild or +4.
`;
