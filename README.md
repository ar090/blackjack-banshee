# Blackjack Banshee 🎴

A modern, feature-rich blackjack card counting trainer with a spooky twist! Practice your card counting skills, learn basic strategy, and improve your game with this sleek web application.

![Blackjack Banshee Mascot](mascot.png)

## Features

- **Card Counting Practice**: Real-time running count and true count display using the Hi-Lo system
- **Basic Strategy Guide**: Interactive strategy recommendations with explanations
- **Split Functionality**: Full support for splitting pairs
- **Customizable Gameplay**: Adjust deck count and dealing speed
- **Visual Card Distinction**: Special styling for Aces (green glow) and face cards (gold borders)
- **Count History Tracking**: Keep track of your counting progress throughout the shoe
- **Remaining Cards Display**: See exactly which cards are left in the shoe
- **Smooth Animations**: Realistic card dealing with customizable speed
- **Dark Theme**: Easy on the eyes with a modern, futuristic design

## How to Play

1. **Open the Game**: Simply open `index.html` in your web browser
2. **Deal Cards**: Press Space or click "Deal" to start a new hand
3. **Make Decisions**: Choose to Hit, Stand, Double Down, or Split (when available)
4. **Track the Count**: Watch the running count update as cards are dealt
5. **Learn Strategy**: Follow the basic strategy recommendations to improve your play

## Hotkeys

### Game Controls
- **Space** - Deal new hand
- **H** - Hit
- **S** - Stand  
- **Z** - Double down
- **X** - Split (when you have a pair)
- **R** - Reset shoe

### Display Toggles
- **C** - Show/Hide running count
- **Shift+C** - Show/Hide remaining cards display
- **B** - Show/Hide basic strategy guide

### Navigation
- **Escape** - Hide count display

## Card Counting System (Hi-Lo)

The game uses the Hi-Lo counting system:
- **+1**: Cards 2-6 (low cards)
- **0**: Cards 7-9 (neutral cards)
- **-1**: Cards 10, J, Q, K, A (high cards)

### Count Display
- **HC**: Hand Count - Count of visible cards in the current hand only
- **RC**: Running Count - The raw count of all cards seen
- **TC**: True Count - Running count divided by remaining decks
- **Decks**: Number of decks remaining in the shoe

## Basic Strategy

The trainer includes a comprehensive basic strategy guide that shows:
- Recommended action for your current hand
- Detailed explanation of why that action is optimal
- Real-time feedback on your decisions
- Accuracy tracking to monitor your improvement

## Settings

Click the gear icon (⚙️) in the top right to access settings:

### Deck Count
Choose from 1, 2, 4, 6, or 8 decks

### Deal Speed
Adjust the speed of card dealing from 100ms (fast) to 2000ms (slow)
- Default: 1000ms (realistic dealer speed)

## Special Features

### Split Mode
When you split a pair:
- Cards separate into two hands displayed side by side
- Active hand is highlighted in green
- Play each hand completely before moving to the next
- See individual results for each hand

### Visual Card Design
- **Aces**: Green border with animated sparkle effect
- **Face Cards (J/Q/K)**: Gold borders with crown symbols
- **Regular Cards**: Clean, classic design

### Count History
The right sidebar tracks your counting history, showing:
- Timestamp of each action
- Running count at that moment
- Description of what happened

## Tips for Card Counting Practice

1. **Start with Single Deck**: Begin with 1 deck to practice basic counting
2. **Hide the Count**: Use the 'C' key to hide/show the count and test yourself
3. **Check Remaining Cards**: Use Shift+C to verify your count against actual remaining cards
4. **Watch the True Count**: This is more important than running count for betting decisions
5. **Practice Basic Strategy**: Try to make the correct play before checking the recommendation

## Technical Details

- **Pure Frontend**: No server required - runs entirely in your browser
- **Responsive Design**: Works on desktop and tablet devices
- **Modern JavaScript**: Built with ES6+ features
- **CSS Animations**: Smooth, GPU-accelerated animations
- **Local Storage**: Settings are saved between sessions

## Browser Compatibility

Works best in modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Version Management

This project uses automatic version management that updates the version displayed in the settings with the current git commit hash.

### How it works

1. **VERSION constant**: The `script.js` file contains a `VERSION` constant at the top that stores the current git hash.
2. **Automatic updates**: The version is updated automatically when deploying via `make deploy`
3. **Manual update**: You can manually update the version by running:
   ```bash
   ./update-version.sh
   ```

### Deployment

To deploy the latest version:
```bash
make deploy
```

This will:
- Update the VERSION constant with the current git hash
- Commit all changes
- Push to the origin repository

### Notes

- The version will show "dev" when not in a git repository
- The version uses the short hash (first 7 characters) for brevity
- The version is displayed in the Settings modal footer

## Credits

Created with 🎰 by the Blackjack Banshee

---

*Remember: This is for educational and entertainment purposes only. Always gamble responsibly!*