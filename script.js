// Version info - updated during build/commit
const VERSION = '5136ee3'; // Will be replaced with git hash

// Card counting trainer
class BlackjackGame {
    constructor() {
        this.suits = ['♠', '♣', '♥', '♦'];
        this.ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        this.deckCount = 1;
        this.shoe = [];
        this.dealerHand = [];
        this.playerHand = [];
        this.playerHands = []; // For split hands
        this.currentHandIndex = 0; // Track which hand is being played
        this.splitMode = false;
        this.runningCount = 0;
        this.handCount = 0; // Count for current hand only
        this.cardsDealt = 0;
        this.countHistory = [];
        this.gameActive = false;
        this.dealerHoleCardRevealed = false;
        this.dealSpeed = 1200; // Default deal speed in ms (Normal speed)
        this.shoeStartTime = null;
        this.shoeTimerInterval = null;
        this.useDeviations = true; // Default to using count deviations
        this.insuranceEnabled = true; // Default to allowing insurance
        this.insuranceOffered = false; // Track if insurance was offered this hand
        this.insuranceTaken = false; // Track if player took insurance
        
        // Strategy tracking
        this.correctMoves = 0;
        this.totalMoves = 0;
        this.lastAction = null;
        this.wrongMoves = []; // Track wrong moves for review
        
        this.initializeEventListeners();
        this.resetShoe();
        this.initializeBasicStrategy();
        this.updateWrongMovesDisplay();
        this.initializeMobileLayout();
        this.initializeStrategyModals();
        
        // Set initial game-idle state
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.classList.add('game-idle');
        }
    }

    initializeEventListeners() {
        document.getElementById('deal').addEventListener('click', () => this.deal());
        document.getElementById('hit').addEventListener('click', () => this.hit());
        document.getElementById('stand').addEventListener('click', () => this.stand());
        document.getElementById('double').addEventListener('click', () => this.double());
        document.getElementById('split').addEventListener('click', () => this.split());
        document.getElementById('reset-shoe').addEventListener('click', () => this.resetShoe());
        document.getElementById('toggle-count').addEventListener('click', () => this.toggleCount());
        document.getElementById('take-insurance').addEventListener('click', () => this.takeInsurance());
        document.getElementById('decline-insurance').addEventListener('click', () => this.declineInsurance());
        document.getElementById('toggle-remaining').addEventListener('click', () => this.toggleRemainingCards());
        document.getElementById('toggle-strategy').addEventListener('click', () => this.toggleStrategy());
        document.getElementById('clear-history').addEventListener('click', () => this.clearHistory());
        document.getElementById('reset-stats').addEventListener('click', () => this.resetStrategyStats());
        document.getElementById('deck-count').addEventListener('change', (e) => {
            this.deckCount = parseInt(e.target.value);
            this.resetShoe();
        });
        
        // Deck selector buttons
        const deckButtons = document.querySelectorAll('.deck-btn');
        const deckSelect = document.getElementById('deck-count');
        
        deckButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                deckButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                // Update the hidden select value
                const deckValue = btn.dataset.decks;
                deckSelect.value = deckValue;
                // Trigger change event
                deckSelect.dispatchEvent(new Event('change'));
            });
        });
        
        // Deal speed slider
        const speedSlider = document.getElementById('deal-speed');
        const speedValue = document.getElementById('speed-value');
        
        // Map slider value (1-10) to milliseconds (reversed: 10 = fast, 1 = slow)
        const speedToMs = (sliderValue) => {
            const speeds = {
                1: 2000,  // Slowest
                2: 1800,
                3: 1600,
                4: 1400,
                5: 1200,  // Normal
                6: 1000,
                7: 800,
                8: 600,
                9: 400,
                10: 200   // Fastest
            };
            return speeds[sliderValue] || 1000;
        };
        
        // Map slider value to display text
        const speedToText = (sliderValue) => {
            if (sliderValue <= 2) return 'Very Slow';
            if (sliderValue <= 4) return 'Slow';
            if (sliderValue <= 6) return 'Normal';
            if (sliderValue <= 8) return 'Fast';
            return 'Very Fast';
        };
        
        // Set initial speed
        this.dealSpeed = speedToMs(5); // Default to normal speed
        
        speedSlider.addEventListener('input', (e) => {
            const sliderValue = parseInt(e.target.value);
            this.dealSpeed = speedToMs(sliderValue);
            speedValue.textContent = speedToText(sliderValue);
        });
        
        // Insurance toggle
        const insuranceToggle = document.getElementById('insurance-toggle');
        insuranceToggle.addEventListener('change', (e) => {
            this.insuranceEnabled = e.target.checked;
        });
        
        // Deviations toggle
        const deviationsToggle = document.getElementById('deviations-toggle');
        deviationsToggle.addEventListener('change', (e) => {
            this.useDeviations = e.target.checked;
            // Update strategy recommendation if game is active
            if (this.gameActive) {
                this.updateStrategyRecommendation();
            }
        });
        
        // Settings modal
        const settingsToggle = document.getElementById('settings-toggle');
        const settingsModal = document.getElementById('settings-modal');
        const settingsClose = document.getElementById('settings-close');
        
        settingsToggle.addEventListener('click', () => {
            settingsModal.classList.add('active');
            this.updateVersionInfo();
        });
        
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
        
        // Close modal when clicking outside
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Prevent keyboard shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            // Check for Shift+C
            if (e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                this.toggleRemainingCards();
                return;
            }
            
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault(); // Prevent space from scrolling
                    if (!this.gameActive) this.deal();
                    break;
                case 'h':
                    if (this.gameActive) this.hit();
                    break;
                case 's':
                    if (this.gameActive) this.stand();
                    break;
                case 'z':
                    if (this.gameActive && this.playerHand.length === 2) this.double();
                    break;
                case 'x':
                    if (this.gameActive && this.playerHand.length === 2 && this.canSplit()) this.split();
                    break;
                case 'y':
                    if (this.insuranceOffered && !this.insuranceTaken) this.takeInsurance();
                    break;
                case 'n':
                    if (this.insuranceOffered && !this.insuranceTaken) this.declineInsurance();
                    break;
                case 'r':
                    this.resetShoe();
                    break;
                case 'c':
                    if (!e.shiftKey) { // Only toggle count if shift is not pressed
                        e.preventDefault();
                        this.toggleCount();
                    }
                    break;
                case 'escape':
                    // Hide count with escape
                    const countDisplay = document.querySelector('.count-display');
                    if (!countDisplay.classList.contains('hidden')) {
                        this.toggleCount();
                    }
                    break;
                case 'b':
                    this.toggleStrategy();
                    break;
            }
        });
    }

    resetShoe() {
        // End any active game
        if (this.gameActive) {
            this.gameActive = false;
            this.showMessage('Shoe reset - hand cancelled');
        }
        
        // Clear hands
        this.dealerHand = [];
        this.playerHand = [];
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.splitMode = false;
        this.dealerHoleCardRevealed = false;
        this.handCount = 0; // Reset hand count
        
        // Clear card displays
        document.getElementById('player-cards').innerHTML = '';
        document.getElementById('dealer-cards').innerHTML = '';
        
        // Reset shoe
        this.shoe = [];
        for (let i = 0; i < this.deckCount; i++) {
            for (let suit of this.suits) {
                for (let rank of this.ranks) {
                    this.shoe.push({ rank, suit });
                }
            }
        }
        this.shuffle();
        this.runningCount = 0;
        this.cardsDealt = 0;
        
        // Update displays
        this.updateCountDisplay();
        this.updateRemainingCardsDisplay();
        this.updateScores();
        this.updateButtons();
        
        // Add to history
        this.addToHistory('Shoe reset', 0, 0);
        
        // Reset shoe timer
        this.startShoeTimer();
    }
    
    startShoeTimer() {
        // Clear existing timer if any
        if (this.shoeTimerInterval) {
            clearInterval(this.shoeTimerInterval);
        }
        
        this.shoeStartTime = Date.now();
        this.updateShoeTimer();
        
        // Update timer every second
        this.shoeTimerInterval = setInterval(() => {
            this.updateShoeTimer();
        }, 1000);
    }
    
    updateShoeTimer() {
        if (!this.shoeStartTime) return;
        
        const elapsed = Date.now() - this.shoeStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        
        document.getElementById('shoe-timer').textContent = 
            `${minutes}:${displaySeconds.toString().padStart(2, '0')}`;
    }

    shuffle() {
        for (let i = this.shoe.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shoe[i], this.shoe[j]] = [this.shoe[j], this.shoe[i]];
        }
    }

    getCardValue(card) {
        if (card.rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(card.rank)) return 10;
        return parseInt(card.rank);
    }

    getCountValue(card) {
        // Hi-Lo counting system
        if (['2', '3', '4', '5', '6'].includes(card.rank)) return 1;
        if (['10', 'J', 'Q', 'K', 'A'].includes(card.rank)) return -1;
        return 0;
    }

    drawCard(updateCount = true) {
        if (this.shoe.length === 0) {
            this.showMessage('Shoe is empty! Please reset.');
            return null;
        }
        
        const card = this.shoe.pop();
        this.cardsDealt++;
        
        if (updateCount) {
            this.runningCount += this.getCountValue(card);
            this.updateCountDisplay();
        }
        
        this.updateRemainingCardsDisplay();
        return card;
    }

    updateCountDisplay() {
        const decksRemaining = (this.shoe.length / 52);
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        
        // Update desktop
        document.getElementById('running-count').textContent = this.runningCount;
        document.getElementById('true-count').textContent = trueCount.toFixed(2);
        document.getElementById('decks-remaining').textContent = decksRemaining.toFixed(2);
        
        // Also update mobile directly
        const mobileSection = document.querySelector('.mobile-section[data-section="count"]');
        if (mobileSection) {
            const mobileRunning = mobileSection.querySelector('#running-count');
            const mobileTrue = mobileSection.querySelector('#true-count');
            const mobileDecks = mobileSection.querySelector('#decks-remaining');
            
            if (mobileRunning) mobileRunning.textContent = this.runningCount;
            if (mobileTrue) mobileTrue.textContent = trueCount.toFixed(2);
            if (mobileDecks) mobileDecks.textContent = decksRemaining.toFixed(2);
        }
        
        // Update hand count
        this.updateHandCount();
    }
    
    calculateHandCount() {
        let count = 0;
        
        // Count all player cards
        if (this.splitMode && this.playerHands.length > 0) {
            // In split mode, count all hands
            this.playerHands.forEach(hand => {
                hand.forEach(card => {
                    count += this.getCountValue(card);
                });
            });
        } else {
            // Normal mode, count single hand
            this.playerHand.forEach(card => {
                count += this.getCountValue(card);
            });
        }
        
        // Count dealer's visible cards (not the hole card unless revealed)
        this.dealerHand.forEach((card, index) => {
            if (index === 0 || (index === 1 && this.dealerHoleCardRevealed)) {
                count += this.getCountValue(card);
            }
        });
        
        return count;
    }
    
    updateHandCount() {
        this.handCount = this.calculateHandCount();
        document.getElementById('hand-count').textContent = this.handCount;
    }

    updateRemainingCardsDisplay() {
        // Count remaining cards by category
        const cardCounts = {};
        let lowCards = 0;
        let neutralCards = 0;
        let highCards = 0;
        
        // Initialize counts
        this.ranks.forEach(rank => {
            cardCounts[rank] = 0;
        });
        
        // Count cards in shoe
        this.shoe.forEach(card => {
            cardCounts[card.rank]++;
            
            if (['2', '3', '4', '5', '6'].includes(card.rank)) {
                lowCards++;
            } else if (['7', '8', '9'].includes(card.rank)) {
                neutralCards++;
            } else {
                highCards++;
            }
        });
        
        // Update main counts
        document.getElementById('low-cards-count').textContent = lowCards;
        document.getElementById('neutral-cards-count').textContent = neutralCards;
        document.getElementById('high-cards-count').textContent = highCards;
        
        // Also update mobile
        const mobileCards = document.querySelector('.mobile-section[data-section="cards"]');
        if (mobileCards) {
            const mobileLow = mobileCards.querySelector('#low-cards-count');
            const mobileNeutral = mobileCards.querySelector('#neutral-cards-count');
            const mobileHigh = mobileCards.querySelector('#high-cards-count');
            
            if (mobileLow) mobileLow.textContent = lowCards;
            if (mobileNeutral) mobileNeutral.textContent = neutralCards;
            if (mobileHigh) mobileHigh.textContent = highCards;
        }
        
        // Update details
        const lowCardsDetails = document.getElementById('low-cards-details');
        const neutralCardsDetails = document.getElementById('neutral-cards-details');
        const highCardsDetails = document.getElementById('high-cards-details');
        
        // Low cards details
        lowCardsDetails.innerHTML = '';
        ['2', '3', '4', '5', '6'].forEach(rank => {
            if (cardCounts[rank] > 0) {
                lowCardsDetails.innerHTML += `
                    <div class="card-detail">
                        <span class="card-detail-rank">${rank}:</span>
                        <span class="card-detail-count">${cardCounts[rank]}</span>
                    </div>
                `;
            }
        });
        
        // Neutral cards details
        neutralCardsDetails.innerHTML = '';
        ['7', '8', '9'].forEach(rank => {
            if (cardCounts[rank] > 0) {
                neutralCardsDetails.innerHTML += `
                    <div class="card-detail">
                        <span class="card-detail-rank">${rank}:</span>
                        <span class="card-detail-count">${cardCounts[rank]}</span>
                    </div>
                `;
            }
        });
        
        // High cards details
        highCardsDetails.innerHTML = '';
        ['10', 'J', 'Q', 'K', 'A'].forEach(rank => {
            if (cardCounts[rank] > 0) {
                highCardsDetails.innerHTML += `
                    <div class="card-detail">
                        <span class="card-detail-rank">${rank}:</span>
                        <span class="card-detail-count">${cardCounts[rank]}</span>
                    </div>
                `;
            }
        });
        
        // Sync details to mobile
        if (mobileCards) {
            const mobileLowDetails = mobileCards.querySelector('#low-cards-details');
            const mobileNeutralDetails = mobileCards.querySelector('#neutral-cards-details');
            const mobileHighDetails = mobileCards.querySelector('#high-cards-details');
            
            if (mobileLowDetails) mobileLowDetails.innerHTML = lowCardsDetails.innerHTML;
            if (mobileNeutralDetails) mobileNeutralDetails.innerHTML = neutralCardsDetails.innerHTML;
            if (mobileHighDetails) mobileHighDetails.innerHTML = highCardsDetails.innerHTML;
        }
    }

    toggleCount() {
        const countDisplay = document.querySelector('.count-display');
        const countHistory = document.querySelector('.count-history');
        const toggleBtn = document.getElementById('toggle-count');
        
        if (countDisplay.classList.contains('hidden')) {
            countDisplay.classList.remove('hidden');
            countHistory.classList.remove('hidden');
            toggleBtn.innerHTML = 'Hide Count <span class="hotkey">[C/Space]</span>';
        } else {
            countDisplay.classList.add('hidden');
            countHistory.classList.add('hidden');
            toggleBtn.innerHTML = 'Show Count <span class="hotkey">[C/Space]</span>';
        }
    }
    
    toggleRemainingCards() {
        const remainingCards = document.querySelector('.remaining-cards');
        const toggleBtn = document.getElementById('toggle-remaining');
        
        if (remainingCards.classList.contains('hidden')) {
            remainingCards.classList.remove('hidden');
            toggleBtn.innerHTML = 'Hide Cards <span class="hotkey">[Shift+Space]</span>';
        } else {
            remainingCards.classList.add('hidden');
            toggleBtn.innerHTML = 'Show Cards <span class="hotkey">[Shift+Space]</span>';
        }
    }
    
    updateVersionInfo() {
        const versionElement = document.getElementById('version-hash');
        if (!versionElement) return;
        
        // Display the version constant
        versionElement.textContent = VERSION;
    }

    addToHistory(action, runningCount, trueCount) {
        const historyItem = {
            action,
            runningCount,
            trueCount: trueCount.toFixed(2),
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.countHistory.push(historyItem);
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        this.countHistory.slice(-10).reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <span>${item.timestamp}</span>
                <span>${item.action}</span>
                <span>RC: ${item.runningCount} | TC: ${item.trueCount}</span>
            `;
            historyList.appendChild(div);
        });
        
        // Also update mobile history
        const mobileHistory = document.querySelector('.mobile-section[data-section="count"] #history-list');
        if (mobileHistory) {
            mobileHistory.innerHTML = historyList.innerHTML;
        }
    }

    clearHistory() {
        this.countHistory = [];
        this.updateHistoryDisplay();
    }

    createCardElement(card, faceDown = false) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        
        if (faceDown) {
            cardDiv.classList.add('face-down');
        } else {
            const isRed = card.suit === '♥' || card.suit === '♦';
            cardDiv.classList.add(isRed ? 'red' : 'black');
            
            // Add face card class for J, Q, K
            if (['J', 'Q', 'K'].includes(card.rank)) {
                cardDiv.classList.add('face-card');
                cardDiv.classList.add(`face-${card.rank.toLowerCase()}`);
            }
            
            // Add ace card class
            if (card.rank === 'A') {
                cardDiv.classList.add('ace-card');
            }
            
            // Add data attributes for CSS pseudo elements
            cardDiv.setAttribute('data-rank', card.rank);
            cardDiv.setAttribute('data-suit', card.suit);
            
            cardDiv.innerHTML = `
                <span class="rank">${card.rank}</span>
                <span class="suit">${card.suit}</span>
                <span class="bottom-suit">${card.suit}</span>
            `;
        }
        
        return cardDiv;
    }

    renderHand(hand, elementId, showHoleCard = true) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        
        hand.forEach((card, index) => {
            const shouldHideCard = elementId === 'dealer-cards' && index === 1 && !showHoleCard && !this.dealerHoleCardRevealed;
            const cardElement = this.createCardElement(card, shouldHideCard);
            // Add stagger to animation based on card index
            cardElement.style.animationDelay = `${index * 100}ms`;
            container.appendChild(cardElement);
        });
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        
        for (let card of hand) {
            score += this.getCardValue(card);
            if (card.rank === 'A') aces++;
        }
        
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        
        return score;
    }

    updateScores() {
        const playerScore = this.calculateScore(this.playerHand);
        const dealerScore = this.calculateScore(this.dealerHand);
        
        document.getElementById('player-score').textContent = `Score: ${playerScore}`;
        
        if (this.dealerHoleCardRevealed) {
            document.getElementById('dealer-score').textContent = `Score: ${dealerScore}`;
        } else if (this.dealerHand.length > 0) {
            const visibleScore = this.getCardValue(this.dealerHand[0]);
            document.getElementById('dealer-score').textContent = `Score: ${visibleScore}`;
        }
        
        // Update hand count whenever scores are updated
        this.updateHandCount();
    }

    async deal() {
        if (this.shoe.length < 4) {
            this.showMessage('Not enough cards! Please reset shoe.');
            return;
        }
        
        // Reset hands
        this.dealerHand = [];
        this.playerHand = [];
        this.dealerHoleCardRevealed = false;
        this.gameActive = true;
        
        // Clear previous cards display
        const playerContainer = document.getElementById('player-cards');
        playerContainer.innerHTML = '';
        playerContainer.style.display = '';
        playerContainer.style.gap = '';
        playerContainer.style.justifyContent = '';
        document.getElementById('dealer-cards').innerHTML = '';
        
        // Clear message
        this.showMessage('');
        
        // Disable deal button during dealing
        document.getElementById('deal').disabled = true;
        
        // Deal cards sequentially with delay
        await this.dealCardWithDelay('player', true);
        await this.dealCardWithDelay('dealer', true);
        await this.dealCardWithDelay('player', true);
        await this.dealCardWithDelay('dealer', false); // Dealer hole card doesn't count yet
        
        // Enable/disable buttons
        this.updateButtons();
        
        // Check for blackjack
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            setTimeout(() => this.stand(), this.dealSpeed);
        }
        
        // Add to history
        const decksRemaining = this.shoe.length / 52;
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        this.addToHistory('New hand dealt', this.runningCount, trueCount);
    }
    
    async dealCardWithDelay(target, updateCount = true) {
        const card = this.drawCard(updateCount);
        if (!card) return;
        
        // Add card to hand but don't render full hand
        if (target === 'player') {
            this.playerHand.push(card);
            const container = document.getElementById('player-cards');
            const cardElement = this.createCardElement(card);
            cardElement.classList.add('new-card');
            container.appendChild(cardElement);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                cardElement.classList.remove('new-card');
            }, 500);
        } else {
            this.dealerHand.push(card);
            const container = document.getElementById('dealer-cards');
            const shouldHide = this.dealerHand.length === 2 && !updateCount;
            const cardElement = this.createCardElement(card, shouldHide);
            cardElement.classList.add('new-card');
            container.appendChild(cardElement);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                cardElement.classList.remove('new-card');
            }, 500);
        }
        
        this.updateScores();
        
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
    }

    hit() {
        if (!this.gameActive) return;
        
        const card = this.drawCard();
        if (!card) return;
        
        this.playerHand.push(card);
        this.renderHand(this.playerHand, 'player-cards');
        this.updateScores();
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.endGame('lose', 'Bust! You lose.');
        } else if (score === 21) {
            this.stand();
        }
        
        this.updateButtons();
    }

    async stand() {
        if (!this.gameActive) return;
        
        // Reveal dealer hole card and update count
        const holeCard = this.dealerHand[1];
        this.runningCount += this.getCountValue(holeCard);
        this.updateCountDisplay();
        this.dealerHoleCardRevealed = true;
        
        // Show hole card
        this.renderHand(this.dealerHand, 'dealer-cards', true);
        await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
        
        // Dealer draws to 17 with delays
        while (this.calculateScore(this.dealerHand) < 17) {
            const card = this.drawCard();
            if (!card) break;
            this.dealerHand.push(card);
            this.renderHand(this.dealerHand, 'dealer-cards', true);
            this.updateScores();
            await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
        }
        
        // Determine winner
        const playerScore = this.calculateScore(this.playerHand);
        const dealerScore = this.calculateScore(this.dealerHand);
        
        if (dealerScore > 21) {
            this.endGame('win', 'Dealer bust! You win!');
        } else if (playerScore > dealerScore) {
            this.endGame('win', 'You win!');
        } else if (playerScore < dealerScore) {
            this.endGame('lose', 'You lose.');
        } else {
            this.endGame('push', 'Push!');
        }
    }

    double() {
        if (!this.gameActive || this.playerHand.length !== 2) return;
        
        const card = this.drawCard();
        if (!card) return;
        
        this.playerHand.push(card);
        this.renderHand(this.playerHand, 'player-cards');
        this.updateScores();
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            this.endGame('lose', 'Bust! You lose.');
        } else {
            this.stand();
        }
    }

    canSplit() {
        // Check if player can split (two cards of same rank)
        if (this.playerHand.length !== 2) return false;
        return this.playerHand[0].rank === this.playerHand[1].rank;
    }
    
    async split() {
        if (!this.gameActive || !this.canSplit()) return;
        
        this.checkPlayerAction('SPLIT');
        
        // Initialize split mode
        this.splitMode = true;
        this.currentHandIndex = 0;
        
        // Split the cards into two hands
        this.playerHands = [
            [this.playerHand[0]],
            [this.playerHand[1]]
        ];
        
        // Clear the main player hand
        this.playerHand = this.playerHands[0];
        
        // Show split indicator briefly
        this.showMessage('Playing first hand...');
        setTimeout(() => this.showMessage(''), 1500);
        
        // Render the split hands
        this.renderSplitHands();
        
        // Deal a card to each split hand
        await this.dealCardToSplitHand(0);
        await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
        await this.dealCardToSplitHand(1);
        
        // Update current hand
        this.playerHand = this.playerHands[0];
        this.updateScores();
        this.updateButtons();
        
        // Check for 21 on first hand
        if (this.calculateScore(this.playerHand) === 21) {
            await this.nextSplitHand();
        }
    }
    
    async dealCardToSplitHand(handIndex) {
        const card = this.drawCard();
        if (!card) return;
        
        this.playerHands[handIndex].push(card);
        this.renderSplitHands();
    }
    
    renderSplitHands() {
        const container = document.getElementById('player-cards');
        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.gap = window.innerWidth <= 768 ? '15px' : '40px';
        container.style.justifyContent = 'center';
        
        this.playerHands.forEach((hand, index) => {
            const handDiv = document.createElement('div');
            handDiv.className = 'split-hand';
            if (index === this.currentHandIndex) {
                handDiv.classList.add('active-hand');
            }
            handDiv.style.position = 'relative';
            
            // Add hand indicator
            const indicator = document.createElement('div');
            indicator.className = 'hand-indicator';
            indicator.textContent = `Hand ${index + 1}`;
            indicator.style.position = 'absolute';
            indicator.style.top = '-25px';
            indicator.style.left = '50%';
            indicator.style.transform = 'translateX(-50%)';
            indicator.style.color = '#CAE4BC';
            indicator.style.fontSize = '0.9em';
            indicator.style.fontWeight = '600';
            
            if (index === this.currentHandIndex) {
                indicator.style.color = '#7ab85f';
                indicator.style.textShadow = '0 0 10px rgba(122, 184, 95, 0.5)';
            }
            
            handDiv.appendChild(indicator);
            
            // Add cards container
            const cardsDiv = document.createElement('div');
            cardsDiv.style.display = 'flex';
            
            hand.forEach((card, cardIndex) => {
                const cardElement = this.createCardElement(card);
                if (cardIndex > 0) {
                    cardElement.style.marginLeft = '-30px';
                }
                cardsDiv.appendChild(cardElement);
            });
            
            handDiv.appendChild(cardsDiv);
            container.appendChild(handDiv);
        });
    }
    
    async nextSplitHand() {
        if (this.currentHandIndex < this.playerHands.length - 1) {
            this.currentHandIndex++;
            this.playerHand = this.playerHands[this.currentHandIndex];
            this.showMessage(`Playing hand ${this.currentHandIndex + 1}...`);
            setTimeout(() => this.showMessage(''), 1500);
            this.renderSplitHands();
            this.updateScores();
            this.updateButtons();
            
            // Check for 21
            if (this.calculateScore(this.playerHand) === 21) {
                await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
                await this.nextSplitHand();
            }
        } else {
            // All hands complete, dealer's turn
            this.splitMode = false;
            await this.dealerTurn();
        }
    }

    endGame(result, message) {
        this.gameActive = false;
        
        // Reveal dealer hole card if player busts
        if (!this.dealerHoleCardRevealed && this.dealerHand.length === 2) {
            const holeCard = this.dealerHand[1];
            this.runningCount += this.getCountValue(holeCard);
            this.updateCountDisplay();
            this.dealerHoleCardRevealed = true;
            
            // Show hole card on desktop
            const dealerCardsContainer = document.getElementById('dealer-cards');
            const holeCardElement = dealerCardsContainer.children[1];
            if (holeCardElement) {
                const newCard = this.createCardElement(holeCard, false);
                holeCardElement.className = newCard.className;
                holeCardElement.setAttribute('data-rank', holeCard.rank);
                holeCardElement.setAttribute('data-suit', holeCard.suit);
                holeCardElement.innerHTML = newCard.innerHTML;
            }
            
            // Also show hole card on mobile
            const mobileDealerCards = document.querySelector('.mobile-section[data-section="game"] #dealer-cards');
            if (mobileDealerCards) {
                const mobileHoleCard = mobileDealerCards.children[1];
                if (mobileHoleCard) {
                    const newCard = this.createCardElement(holeCard, false);
                    mobileHoleCard.className = newCard.className;
                    mobileHoleCard.setAttribute('data-rank', holeCard.rank);
                    mobileHoleCard.setAttribute('data-suit', holeCard.suit);
                    mobileHoleCard.innerHTML = newCard.innerHTML;
                }
            }
            this.updateScores();
            
            // Force sync to mobile
            const mobileDealer = document.querySelector('.mobile-section[data-section="game"] #dealer-cards');
            if (mobileDealer) {
                mobileDealer.innerHTML = dealerCardsContainer.innerHTML;
            }
        }
        
        this.showMessage(message, result);
        this.updateButtons();
        
        // Add final count to history
        const decksRemaining = this.shoe.length / 52;
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        this.addToHistory(`Hand ended: ${message}`, this.runningCount, trueCount);
    }

    showMessage(text, type = '') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = 'message';
        if (type) {
            messageEl.classList.add(type);
        }
        
        // Also update mobile message
        const mobileMessage = document.querySelector('.mobile-section[data-section="game"] #message');
        if (mobileMessage) {
            mobileMessage.textContent = text;
            mobileMessage.className = 'message';
            if (type) {
                mobileMessage.classList.add(type);
            }
        }
    }

    updateButtons() {
        const dealBtn = document.getElementById('deal');
        const hitBtn = document.getElementById('hit');
        const standBtn = document.getElementById('stand');
        const doubleBtn = document.getElementById('double');
        const splitBtn = document.getElementById('split');
        
        dealBtn.disabled = this.gameActive;
        hitBtn.disabled = !this.gameActive;
        standBtn.disabled = !this.gameActive;
        doubleBtn.disabled = !this.gameActive || this.playerHand.length !== 2 || this.splitMode;
        splitBtn.disabled = !this.canSplit();
        
        // Toggle game-idle class on controls
        const controls = document.querySelector('.controls');
        const mobileControls = document.querySelector('.mobile-section[data-section="game"] .controls');
        
        if (controls) {
            if (this.gameActive) {
                controls.classList.remove('game-idle');
            } else {
                controls.classList.add('game-idle');
            }
        }
        
        if (mobileControls) {
            if (this.gameActive) {
                mobileControls.classList.remove('game-idle');
            } else {
                mobileControls.classList.add('game-idle');
            }
        }
    }

    initializeBasicStrategy() {
        // Basic strategy tables based on the provided charts
        this.hardTotals = {
            '17': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'S', '8': 'S', '9': 'S', '10': 'S', 'A': 'S' },
            '16': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '15': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '14': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '13': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '12': { '2': 'H', '3': 'H', '4': 'S', '5': 'S', '6': 'S', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '11': { '2': 'D', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'D', '8': 'D', '9': 'D', '10': 'D', 'A': 'D' },
            '10': { '2': 'D', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'D', '8': 'D', '9': 'D', '10': 'H', 'A': 'H' },
            '9': { '2': 'H', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            '8': { '2': 'H', '3': 'H', '4': 'H', '5': 'H', '6': 'H', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' }
        };
        
        this.softTotals = {
            'A,9': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'S', '7': 'S', '8': 'S', '9': 'S', '10': 'S', 'A': 'S' },
            'A,8': { '2': 'S', '3': 'S', '4': 'S', '5': 'S', '6': 'Ds', '7': 'S', '8': 'S', '9': 'S', '10': 'S', 'A': 'S' },
            'A,7': { '2': 'Ds', '3': 'Ds', '4': 'Ds', '5': 'Ds', '6': 'Ds', '7': 'S', '8': 'S', '9': 'H', '10': 'H', 'A': 'H' },
            'A,6': { '2': 'H', '3': 'D', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            'A,5': { '2': 'H', '3': 'H', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            'A,4': { '2': 'H', '3': 'H', '4': 'D', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            'A,3': { '2': 'H', '3': 'H', '4': 'H', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' },
            'A,2': { '2': 'H', '3': 'H', '4': 'H', '5': 'D', '6': 'D', '7': 'H', '8': 'H', '9': 'H', '10': 'H', 'A': 'H' }
        };
        
        this.pairSplitting = {
            'A,A': { '2': 'Y', '3': 'Y', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'Y', '8': 'Y', '9': 'Y', '10': 'Y', 'A': 'Y' },
            'T,T': { '2': 'N', '3': 'N', '4': 'N', '5': 'N', '6': 'N', '7': 'N', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '9,9': { '2': 'Y', '3': 'Y', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'N', '8': 'Y', '9': 'Y', '10': 'N', 'A': 'N' },
            '8,8': { '2': 'Y', '3': 'Y', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'Y', '8': 'Y', '9': 'Y', '10': 'Y', 'A': 'Y' },
            '7,7': { '2': 'Y', '3': 'Y', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'Y', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '6,6': { '2': 'Y/N', '3': 'Y', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'N', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '5,5': { '2': 'N', '3': 'N', '4': 'N', '5': 'N', '6': 'N', '7': 'N', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '4,4': { '2': 'N', '3': 'N', '4': 'N', '5': 'Y/N', '6': 'Y/N', '7': 'N', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '3,3': { '2': 'Y/N', '3': 'Y/N', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'Y', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' },
            '2,2': { '2': 'Y/N', '3': 'Y/N', '4': 'Y', '5': 'Y', '6': 'Y', '7': 'Y', '8': 'N', '9': 'N', '10': 'N', 'A': 'N' }
        };
    }
    
    getBasicStrategyMove() {
        if (!this.gameActive || this.playerHand.length === 0 || this.dealerHand.length === 0) {
            return { action: '-', explanation: 'Start a hand to see strategy recommendations' };
        }
        
        const playerTotal = this.calculateScore(this.playerHand);
        const dealerUpCard = this.dealerHand[0].rank;
        const dealerValue = dealerUpCard === 'J' || dealerUpCard === 'Q' || dealerUpCard === 'K' ? '10' : dealerUpCard;
        
        // Calculate true count for deviations
        const decksRemaining = this.shoe.length / 52;
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        
        // Check if insurance is being offered
        if (this.insuranceOffered && !this.insuranceTaken) {
            const roundedTC = Math.round(trueCount);
            if (this.useDeviations && roundedTC >= 3) {
                return { action: 'INSURANCE', explanation: `Take insurance (TC: ${roundedTC} ≥ 3)` };
            } else {
                return { action: 'NO INSURANCE', explanation: `Decline insurance (TC: ${roundedTC} < 3)` };
            }
        }
        
        // Apply Illustrious 18 deviations if enabled
        if (this.useDeviations) {
            const deviation = this.checkDeviations(playerTotal, dealerValue, trueCount);
            if (deviation) {
                return deviation;
            }
        }
        
        // Check for pairs first
        if (this.playerHand.length === 2 && this.playerHand[0].rank === this.playerHand[1].rank) {
            const pairRank = this.playerHand[0].rank === 'J' || this.playerHand[0].rank === 'Q' || this.playerHand[0].rank === 'K' ? 'T' : this.playerHand[0].rank;
            const pairKey = `${pairRank},${pairRank}`;
            
            if (this.pairSplitting[pairKey] && this.pairSplitting[pairKey][dealerValue]) {
                const splitDecision = this.pairSplitting[pairKey][dealerValue];
                if (splitDecision === 'Y') {
                    return { action: 'SPLIT', explanation: `Always split ${pairRank}s against dealer ${dealerValue}` };
                } else if (splitDecision === 'Y/N') {
                    return { action: 'SPLIT', explanation: `Split ${pairRank}s against ${dealerValue} if DAS allowed, otherwise hit` };
                }
            }
        }
        
        // Check for soft totals
        const hasAce = this.playerHand.some(card => card.rank === 'A');
        if (hasAce && playerTotal <= 21) {
            const otherCard = this.playerHand.find(card => card.rank !== 'A');
            if (otherCard && this.playerHand.length === 2) {
                const softKey = `A,${otherCard.rank === '10' || otherCard.rank === 'J' || otherCard.rank === 'Q' || otherCard.rank === 'K' ? '9' : otherCard.rank}`;
                
                if (this.softTotals[softKey] && this.softTotals[softKey][dealerValue]) {
                    const decision = this.softTotals[softKey][dealerValue];
                    let action = decision;
                    let explanation = '';
                    
                    if (decision === 'D') {
                        action = this.playerHand.length === 2 ? 'DOUBLE' : 'HIT';
                        explanation = `Double soft ${playerTotal} vs ${dealerValue} (hit if can't double)`;
                    } else if (decision === 'Ds') {
                        action = this.playerHand.length === 2 ? 'DOUBLE' : 'STAND';
                        explanation = `Double soft ${playerTotal} vs ${dealerValue} (stand if can't double)`;
                    } else {
                        action = decision === 'S' ? 'STAND' : 'HIT';
                        explanation = `${action.toLowerCase()} on soft ${playerTotal} vs dealer ${dealerValue}`;
                    }
                    
                    return { action, explanation };
                }
            }
        }
        
        // Hard totals
        if (playerTotal >= 17) {
            return { action: 'STAND', explanation: 'Always stand on hard 17 or higher' };
        }
        
        const hardKey = playerTotal.toString();
        if (this.hardTotals[hardKey] && this.hardTotals[hardKey][dealerValue]) {
            const decision = this.hardTotals[hardKey][dealerValue];
            let action = decision;
            let explanation = '';
            
            if (decision === 'D') {
                // Special rule for 11 vs A - check true count
                if (playerTotal === 11 && dealerValue === 'A') {
                    const decksRemaining = this.shoe.length / 52;
                    const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
                    
                    if (trueCount >= 1) {
                        action = this.playerHand.length === 2 ? 'DOUBLE' : 'HIT';
                        explanation = `Double 11 vs A (true count ${trueCount.toFixed(1)} is positive)`;
                    } else {
                        action = 'HIT';
                        explanation = `Hit 11 vs A (true count ${trueCount.toFixed(1)} is negative/neutral)`;
                    }
                } else {
                    action = this.playerHand.length === 2 ? 'DOUBLE' : 'HIT';
                    explanation = playerTotal === 11 ? 'Always double 11' : 
                                playerTotal === 10 ? `Double 10 vs dealer ${dealerValue}` :
                                `Double ${playerTotal} vs dealer ${dealerValue} (hit if can't double)`;
                }
            } else {
                action = decision === 'S' ? 'STAND' : 'HIT';
                explanation = decision === 'S' ? 
                    `Stand on ${playerTotal} vs dealer ${dealerValue}` :
                    playerTotal === 12 && ['4', '5', '6'].includes(dealerValue) ? 
                        'Stand on 12 vs dealer 4-6' :
                        `Hit ${playerTotal} vs dealer ${dealerValue}`;
            }
            
            return { action, explanation };
        }
        
        // Default for low totals
        if (playerTotal < 8) {
            return { action: 'HIT', explanation: 'Always hit on 7 or less' };
        }
        
        return { action: 'HIT', explanation: 'Hit' };
    }
    
    checkDeviations(playerTotal, dealerValue, trueCount) {
        // Illustrious 18 deviations based on true count
        const isHard = !this.hasAce(this.playerHand) || this.calculateScore(this.playerHand) === this.calculateHardScore(this.playerHand);
        const isPair = this.playerHand.length === 2 && this.playerHand[0].rank === this.playerHand[1].rank;
        
        // Round true count for practical decision making
        const roundedTC = Math.round(trueCount);
        
        // Check for pair deviations first
        if (isPair && (this.playerHand[0].rank === '10' || 
            this.playerHand[0].rank === 'J' || 
            this.playerHand[0].rank === 'Q' || 
            this.playerHand[0].rank === 'K')) {
            // 10,10 vs 5: Split at TC >= 5
            if (dealerValue === '5' && roundedTC >= 5) {
                return { action: 'SPLIT', explanation: `Split 10,10 vs 5 (TC: ${roundedTC} ≥ 5)` };
            }
            // 10,10 vs 6: Split at TC >= 4
            if (dealerValue === '6' && roundedTC >= 4) {
                return { action: 'SPLIT', explanation: `Split 10,10 vs 6 (TC: ${roundedTC} ≥ 4)` };
            }
        }
        
        // Hard hand deviations
        if (isHard) {
            // 16 vs 10: Stand at TC >= 0
            if (playerTotal === 16 && dealerValue === '10' && roundedTC >= 0) {
                return { action: 'STAND', explanation: `Stand 16 vs 10 (TC: ${roundedTC} ≥ 0)` };
            }
            
            // 16 vs 9: Stand at TC >= 5
            if (playerTotal === 16 && dealerValue === '9' && roundedTC >= 5) {
                return { action: 'STAND', explanation: `Stand 16 vs 9 (TC: ${roundedTC} ≥ 5)` };
            }
            
            // 15 vs 10: Stand at TC >= 4
            if (playerTotal === 15 && dealerValue === '10' && roundedTC >= 4) {
                return { action: 'STAND', explanation: `Stand 15 vs 10 (TC: ${roundedTC} ≥ 4)` };
            }
            
            // 13 vs 2: Stand at TC >= -1
            if (playerTotal === 13 && dealerValue === '2' && roundedTC >= -1) {
                return { action: 'STAND', explanation: `Stand 13 vs 2 (TC: ${roundedTC} ≥ -1)` };
            }
            
            // 13 vs 3: Hit at TC <= -2 (deviation from basic strategy stand)
            if (playerTotal === 13 && dealerValue === '3' && roundedTC <= -2) {
                return { action: 'HIT', explanation: `Hit 13 vs 3 (TC: ${roundedTC} ≤ -2)` };
            }
            
            // 12 vs 2: Stand at TC >= 3
            if (playerTotal === 12 && dealerValue === '2' && roundedTC >= 3) {
                return { action: 'STAND', explanation: `Stand 12 vs 2 (TC: ${roundedTC} ≥ 3)` };
            }
            
            // 12 vs 3: Stand at TC >= 2
            if (playerTotal === 12 && dealerValue === '3' && roundedTC >= 2) {
                return { action: 'STAND', explanation: `Stand 12 vs 3 (TC: ${roundedTC} ≥ 2)` };
            }
            
            // 12 vs 4: Hit at TC < 0 (deviation from basic strategy stand)
            if (playerTotal === 12 && dealerValue === '4' && roundedTC < 0) {
                return { action: 'HIT', explanation: `Hit 12 vs 4 (TC: ${roundedTC} < 0)` };
            }
            
            // 12 vs 5: Hit at TC <= -2 (deviation from basic strategy stand)
            if (playerTotal === 12 && dealerValue === '5' && roundedTC <= -2) {
                return { action: 'HIT', explanation: `Hit 12 vs 5 (TC: ${roundedTC} ≤ -2)` };
            }
            
            // 12 vs 6: Hit at TC <= -1 (deviation from basic strategy stand)
            if (playerTotal === 12 && dealerValue === '6' && roundedTC <= -1) {
                return { action: 'HIT', explanation: `Hit 12 vs 6 (TC: ${roundedTC} ≤ -1)` };
            }
            
            // 11 vs A: Double at TC >= 1 (can only double on first 2 cards)
            if (playerTotal === 11 && dealerValue === 'A' && roundedTC >= 1 && this.playerHand.length === 2) {
                return { action: 'DOUBLE', explanation: `Double 11 vs A (TC: ${roundedTC} ≥ 1)` };
            }
            
            // 10 vs 10: Double at TC >= 4
            if (playerTotal === 10 && dealerValue === '10' && roundedTC >= 4 && this.playerHand.length === 2) {
                return { action: 'DOUBLE', explanation: `Double 10 vs 10 (TC: ${roundedTC} ≥ 4)` };
            }
            
            // 10 vs A: Double at TC >= 4
            if (playerTotal === 10 && dealerValue === 'A' && roundedTC >= 4 && this.playerHand.length === 2) {
                return { action: 'DOUBLE', explanation: `Double 10 vs A (TC: ${roundedTC} ≥ 4)` };
            }
            
            // 9 vs 2: Double at TC >= 1
            if (playerTotal === 9 && dealerValue === '2' && roundedTC >= 1 && this.playerHand.length === 2) {
                return { action: 'DOUBLE', explanation: `Double 9 vs 2 (TC: ${roundedTC} ≥ 1)` };
            }
            
            // 9 vs 7: Double at TC >= 3
            if (playerTotal === 9 && dealerValue === '7' && roundedTC >= 3 && this.playerHand.length === 2) {
                return { action: 'DOUBLE', explanation: `Double 9 vs 7 (TC: ${roundedTC} ≥ 3)` };
            }
        }
        
        // No deviation applies, return null to use basic strategy
        return null;
    }
    
    updateStrategyRecommendation() {
        const strategy = this.getBasicStrategyMove();
        
        // Update desktop
        const desktopAction = document.getElementById('recommended-action');
        const desktopExplanation = document.getElementById('move-explanation');
        if (desktopAction) desktopAction.textContent = strategy.action;
        if (desktopExplanation) desktopExplanation.textContent = strategy.explanation;
        
        // Also update mobile directly
        const mobileAction = document.querySelector('.mobile-section[data-section="strategy"] #recommended-action');
        const mobileExplanation = document.querySelector('.mobile-section[data-section="strategy"] #move-explanation');
        if (mobileAction) mobileAction.textContent = strategy.action;
        if (mobileExplanation) mobileExplanation.textContent = strategy.explanation;
    }
    
    checkPlayerAction(action) {
        if (!this.gameActive) return;
        
        const strategy = this.getBasicStrategyMove();
        const correctAction = strategy.action;
        
        // Normalize actions
        const normalizedAction = action.toUpperCase();
        const isCorrect = normalizedAction === correctAction || 
                         (correctAction === 'DOUBLE' && normalizedAction === 'HIT' && this.playerHand.length > 2);
        
        this.totalMoves++;
        if (isCorrect) {
            this.correctMoves++;
            // Don't show feedback for correct moves - just update stats
        } else {
            // Log the wrong move
            const dealerUpCard = this.dealerHand[0];
            const playerTotal = this.calculateScore(this.playerHand);
            const isSoft = this.hasAce(this.playerHand) && this.calculateScore(this.playerHand) !== this.calculateHardScore(this.playerHand);
            const isPair = this.playerHand.length === 2 && this.playerHand[0].rank === this.playerHand[1].rank;
            
            this.wrongMoves.push({
                playerHand: this.getHandString(this.playerHand),
                dealerCard: `${dealerUpCard.rank}${dealerUpCard.suit}`,
                yourMove: action,
                correctMove: correctAction,
                handType: isPair ? 'Pair' : (isSoft ? 'Soft' : 'Hard')
            });
            
            // Update the wrong moves display
            this.updateWrongMovesDisplay();
            
            // Only show strategy guide if it's hidden
            const strategyGuide = document.querySelector('.strategy-guide');
            if (strategyGuide.classList.contains('hidden')) {
                this.toggleStrategy();
            }
            this.showStrategyFeedback(false, `Incorrect. Should ${correctAction.toLowerCase()}: ${strategy.explanation}`);
        }
        
        this.updateStrategyStats();
        this.lastAction = action;
    }
    
    showStrategyFeedback(correct, message) {
        // Update desktop
        const feedbackEl = document.getElementById('strategy-feedback');
        if (feedbackEl) {
            feedbackEl.textContent = message;
            feedbackEl.className = 'strategy-feedback ' + (correct ? 'correct' : 'incorrect');
        }
        
        // Update mobile
        const mobileFeedback = document.querySelector('.mobile-section[data-section="strategy"] #strategy-feedback');
        if (mobileFeedback) {
            mobileFeedback.textContent = message;
            mobileFeedback.className = 'strategy-feedback ' + (correct ? 'correct' : 'incorrect');
        }
        
        setTimeout(() => {
            if (feedbackEl) {
                feedbackEl.textContent = '';
                feedbackEl.className = 'strategy-feedback';
            }
            if (mobileFeedback) {
                mobileFeedback.textContent = '';
                mobileFeedback.className = 'strategy-feedback';
            }
        }, 3000);
    }
    
    updateStrategyStats() {
        document.getElementById('correct-moves').textContent = this.correctMoves;
        document.getElementById('total-moves').textContent = this.totalMoves;
        const accuracy = this.totalMoves > 0 ? Math.round((this.correctMoves / this.totalMoves) * 100) : 0;
        document.getElementById('accuracy').textContent = accuracy + '%';
        
        // Also update mobile
        const mobileStrategy = document.querySelector('.mobile-section[data-section="strategy"]');
        if (mobileStrategy) {
            const mobileCorrect = mobileStrategy.querySelector('#correct-moves');
            const mobileTotal = mobileStrategy.querySelector('#total-moves');
            const mobileAccuracy = mobileStrategy.querySelector('#accuracy');
            
            if (mobileCorrect) mobileCorrect.textContent = this.correctMoves;
            if (mobileTotal) mobileTotal.textContent = this.totalMoves;
            if (mobileAccuracy) mobileAccuracy.textContent = accuracy + '%';
        }
    }
    
    resetStrategyStats() {
        this.correctMoves = 0;
        this.totalMoves = 0;
        this.wrongMoves = [];
        this.updateStrategyStats();
        this.updateWrongMovesDisplay();
        // Clear desktop feedback
        const desktopFeedback = document.getElementById('strategy-feedback');
        if (desktopFeedback) {
            desktopFeedback.textContent = '';
            desktopFeedback.className = 'strategy-feedback';
        }
        
        // Clear mobile feedback
        const mobileFeedback = document.querySelector('.mobile-section[data-section="strategy"] #strategy-feedback');
        if (mobileFeedback) {
            mobileFeedback.textContent = '';
            mobileFeedback.className = 'strategy-feedback';
        }
    }
    
    getHandString(hand) {
        return hand.map(card => card.rank).join(',');
    }
    
    hasAce(hand) {
        return hand.some(card => card.rank === 'A');
    }
    
    calculateHardScore(hand) {
        let score = 0;
        for (let card of hand) {
            score += this.getCardValue(card);
        }
        return score;
    }
    
    updateWrongMovesDisplay() {
        const container = document.getElementById('wrong-moves-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.wrongMoves.length === 0) {
            container.innerHTML = '<div class="no-mistakes">No mistakes yet - keep it up!</div>';
            return;
        }
        
        // Show last 5 mistakes
        const recentMistakes = this.wrongMoves.slice(-5).reverse();
        
        recentMistakes.forEach((move, index) => {
            const moveDiv = document.createElement('div');
            moveDiv.className = 'wrong-move-item';
            moveDiv.innerHTML = `
                <div class="move-number">#${this.wrongMoves.length - index}</div>
                <div class="move-details">
                    <div class="move-situation">
                        <span class="hand-type">${move.handType}</span>
                        ${move.playerHand} vs ${move.dealerCard}
                    </div>
                    <div class="move-actions">
                        You: <span class="your-action">${move.yourMove}</span> → 
                        Should: <span class="correct-action">${move.correctMove}</span>
                    </div>
                </div>
            `;
            container.appendChild(moveDiv);
        });
        
        if (this.wrongMoves.length > 5) {
            const moreDiv = document.createElement('div');
            moreDiv.className = 'more-mistakes';
            moreDiv.textContent = `... and ${this.wrongMoves.length - 5} more mistakes`;
            container.appendChild(moreDiv);
        }
        
        // Also update mobile wrong moves
        const mobileContainer = document.querySelector('.mobile-section[data-section="strategy"] #wrong-moves-list');
        if (mobileContainer) {
            mobileContainer.innerHTML = container.innerHTML;
        }
    }
    
    toggleStrategy() {
        const strategyGuide = document.querySelector('.strategy-guide');
        const toggleBtn = document.getElementById('toggle-strategy');
        
        if (strategyGuide.classList.contains('hidden')) {
            strategyGuide.classList.remove('hidden');
            toggleBtn.innerHTML = 'Hide Strategy <span class="hotkey">[B]</span>';
        } else {
            strategyGuide.classList.add('hidden');
            toggleBtn.innerHTML = 'Show Strategy <span class="hotkey">[B]</span>';
        }
    }
    
    offerInsurance() {
        this.insuranceOffered = true;
        const insuranceSection = document.getElementById('insurance-section');
        insuranceSection.style.display = 'block';
        
        // Hide regular action buttons
        document.querySelectorAll('.action-buttons button').forEach(btn => {
            btn.disabled = true;
        });
        
        // Check if insurance is recommended based on count
        const decksRemaining = this.shoe.length / 52;
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        const roundedTC = Math.round(trueCount);
        
        const recommendation = document.getElementById('insurance-recommendation');
        if (this.useDeviations && roundedTC >= 3) {
            recommendation.textContent = `Take insurance (TC: ${roundedTC} ≥ 3)`;
            recommendation.style.color = '#7ab85f';
        } else {
            recommendation.textContent = `Decline insurance (TC: ${roundedTC} < 3)`;
            recommendation.style.color = '#ff6b6b';
        }
        
        // Also update mobile insurance section if exists
        const mobileInsurance = document.querySelector('.mobile-section[data-section="game"] #insurance-section');
        if (mobileInsurance) {
            mobileInsurance.style.display = 'block';
            const mobileRec = mobileInsurance.querySelector('#insurance-recommendation');
            if (mobileRec) {
                mobileRec.textContent = recommendation.textContent;
                mobileRec.style.color = recommendation.style.color;
            }
        }
    }
    
    async takeInsurance() {
        this.insuranceTaken = true;
        this.insuranceOffered = false; // Insurance decision has been made
        this.hideInsuranceSection();
        
        // Check if dealer has blackjack (check hole card value without revealing)
        const holeCard = this.dealerHand[1];
        const holeCardValue = this.getCardValue(holeCard);
        const dealerHasBlackjack = holeCardValue === 10;
        
        if (dealerHasBlackjack) {
            this.showMessage('Dealer has blackjack! Insurance pays 2:1');
        } else {
            this.showMessage('Dealer does not have blackjack. Insurance lost.');
        }
        
        await this.continueAfterInsurance();
    }
    
    async declineInsurance() {
        this.insuranceTaken = false;
        this.insuranceOffered = false; // Insurance decision has been made
        this.hideInsuranceSection();
        
        await this.continueAfterInsurance();
    }
    
    hideInsuranceSection() {
        const insuranceSection = document.getElementById('insurance-section');
        insuranceSection.style.display = 'none';
        
        // Also hide mobile insurance section
        const mobileInsurance = document.querySelector('.mobile-section[data-section="game"] #insurance-section');
        if (mobileInsurance) {
            mobileInsurance.style.display = 'none';
        }
    }
    
    async continueAfterInsurance() {
        // Check if dealer has blackjack
        const holeCard = this.dealerHand[1];
        const holeCardValue = this.getCardValue(holeCard);
        const dealerHasBlackjack = holeCardValue === 10;
        
        if (dealerHasBlackjack) {
            // Dealer has blackjack, end the hand immediately
            await this.dealerTurn();
            return;
        }
        
        // Update strategy recommendation now that insurance is resolved
        this.updateStrategyRecommendation();
        
        // Enable/disable buttons
        this.updateButtons();
        
        // Check for player blackjack
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            setTimeout(() => this.stand(), this.dealSpeed);
        }
    }

    async hit() {
        if (!this.gameActive) return;
        
        this.checkPlayerAction('HIT');
        
        const card = this.drawCard();
        if (!card) return;
        
        this.playerHand.push(card);
        
        if (this.splitMode) {
            this.playerHands[this.currentHandIndex] = this.playerHand;
            this.renderSplitHands();
        } else {
            // Add only the new card instead of re-rendering all
            const container = document.getElementById('player-cards');
            const newCardElement = this.createCardElement(card);
            newCardElement.classList.add('new-card');
            container.appendChild(newCardElement);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                newCardElement.classList.remove('new-card');
            }, 500);
        }
        
        this.updateScores();
        this.updateStrategyRecommendation();
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            if (this.splitMode) {
                this.showMessage(`Hand ${this.currentHandIndex + 1} busts!`);
                await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
                await this.nextSplitHand();
            } else {
                this.endGame('lose', 'Bust! You lose.');
            }
        } else if (score === 21) {
            if (this.splitMode) {
                await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
                await this.nextSplitHand();
            } else {
                await this.stand();
            }
        }
        
        this.updateButtons();
    }

    async stand() {
        if (!this.gameActive) return;
        
        this.checkPlayerAction('STAND');
        
        if (this.splitMode) {
            await this.nextSplitHand();
        } else {
            await this.dealerTurn();
        }
    }
    
    async dealerTurn() {
        // Reveal dealer hole card and update count
        const holeCard = this.dealerHand[1];
        this.runningCount += this.getCountValue(holeCard);
        this.updateCountDisplay();
        this.dealerHoleCardRevealed = true;
        
        // Show hole card with smooth reveal
        const dealerCardsContainer = document.getElementById('dealer-cards');
        const holeCardElement = dealerCardsContainer.children[1];
        if (holeCardElement) {
            // Create a proper card element with all the attributes
            const newCard = this.createCardElement(holeCard, false);
            
            // Copy all classes except face-down
            holeCardElement.className = newCard.className;
            
            // Copy attributes
            holeCardElement.setAttribute('data-rank', holeCard.rank);
            holeCardElement.setAttribute('data-suit', holeCard.suit);
            
            // Copy innerHTML
            holeCardElement.innerHTML = newCard.innerHTML;
        }
        
        // Also update mobile dealer cards
        const mobileDealerCards = document.querySelector('.mobile-section[data-section="game"] #dealer-cards');
        if (mobileDealerCards) {
            const mobileHoleCard = mobileDealerCards.children[1];
            if (mobileHoleCard) {
                const newCard = this.createCardElement(holeCard, false);
                mobileHoleCard.className = newCard.className;
                mobileHoleCard.setAttribute('data-rank', holeCard.rank);
                mobileHoleCard.setAttribute('data-suit', holeCard.suit);
                mobileHoleCard.innerHTML = newCard.innerHTML;
            }
        }
        this.updateScores();
        await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
        
        // Check if player has blackjack (single hand only)
        const playerHasBlackjack = this.playerHands.length === 0 && 
                                  this.calculateScore(this.playerHand) === 21 && 
                                  this.playerHand.length === 2;
        
        // If player has blackjack, dealer doesn't draw
        if (!playerHasBlackjack) {
            // Dealer draws to 17 with delays
            while (this.calculateScore(this.dealerHand) < 17) {
            const card = this.drawCard();
            if (!card) break;
            this.dealerHand.push(card);
            
            // Add only the new card instead of re-rendering all
            const newCardElement = this.createCardElement(card);
            newCardElement.classList.add('new-card');
            dealerCardsContainer.appendChild(newCardElement);
            
            // Also add to mobile
            if (mobileDealerCards) {
                const mobileNewCard = this.createCardElement(card);
                mobileNewCard.classList.add('new-card');
                mobileDealerCards.appendChild(mobileNewCard);
            }
            
            // Remove animation class after animation completes
            setTimeout(() => {
                newCardElement.classList.remove('new-card');
                const mobileCard = mobileDealerCards?.lastElementChild;
                if (mobileCard) mobileCard.classList.remove('new-card');
            }, 500);
            
            this.updateScores();
            await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
            }
        }
        
        // Determine winner(s)
        const dealerScore = this.calculateScore(this.dealerHand);
        
        if (this.playerHands.length > 0) {
            // Handle split hands
            let results = [];
            this.playerHands.forEach((hand, index) => {
                const playerScore = this.calculateScore(hand);
                let result = '';
                
                if (playerScore > 21) {
                    result = `Hand ${index + 1}: Bust`;
                } else if (dealerScore > 21) {
                    result = `Hand ${index + 1}: Win (Dealer bust)`;
                } else if (playerScore > dealerScore) {
                    result = `Hand ${index + 1}: Win`;
                } else if (playerScore < dealerScore) {
                    result = `Hand ${index + 1}: Lose`;
                } else {
                    result = `Hand ${index + 1}: Push`;
                }
                results.push(result);
            });
            
            this.endGame('split', results.join(', '));
            
            // Reset split state
            this.playerHands = [];
            this.currentHandIndex = 0;
            
            // Reset player cards display
            const container = document.getElementById('player-cards');
            container.style.display = '';
            container.style.gap = '';
            container.style.justifyContent = '';
        } else {
            // Normal single hand
            const playerScore = this.calculateScore(this.playerHand);
            const playerHasBlackjack = playerScore === 21 && this.playerHand.length === 2;
            const dealerHasBlackjack = dealerScore === 21 && this.dealerHand.length === 2;
            
            if (playerHasBlackjack && dealerHasBlackjack) {
                this.endGame('push', 'Push! Both have blackjack.');
            } else if (playerHasBlackjack) {
                this.endGame('win', 'Blackjack! You win!');
            } else if (dealerHasBlackjack) {
                this.endGame('lose', 'Dealer blackjack. You lose.');
            } else if (dealerScore > 21) {
                this.endGame('win', 'Dealer bust! You win!');
            } else if (playerScore > dealerScore) {
                this.endGame('win', 'You win!');
            } else if (playerScore < dealerScore) {
                this.endGame('lose', 'You lose.');
            } else {
                this.endGame('push', 'Push!');
            }
        }
    }

    async double() {
        if (!this.gameActive || this.playerHand.length !== 2) return;
        
        this.checkPlayerAction('DOUBLE');
        
        const card = this.drawCard();
        if (!card) return;
        
        this.playerHand.push(card);
        
        if (this.splitMode) {
            this.playerHands[this.currentHandIndex] = this.playerHand;
            this.renderSplitHands();
        } else {
            // Add only the new card instead of re-rendering all
            const container = document.getElementById('player-cards');
            const newCardElement = this.createCardElement(card);
            newCardElement.classList.add('new-card');
            container.appendChild(newCardElement);
            
            // Remove animation class after animation completes
            setTimeout(() => {
                newCardElement.classList.remove('new-card');
            }, 500);
        }
        
        this.updateScores();
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            if (this.splitMode) {
                this.showMessage(`Hand ${this.currentHandIndex + 1} busts!`);
                await new Promise(resolve => setTimeout(resolve, this.dealSpeed));
                await this.nextSplitHand();
            } else {
                this.endGame('lose', 'Bust! You lose.');
            }
        } else {
            await this.stand();
        }
    }

    async deal() {
        if (this.shoe.length < 4) {
            this.showMessage('Not enough cards! Please reset shoe.');
            return;
        }
        
        // Reset hands
        this.dealerHand = [];
        this.playerHand = [];
        this.playerHands = [];
        this.currentHandIndex = 0;
        this.splitMode = false;
        this.dealerHoleCardRevealed = false;
        this.handCount = 0; // Reset hand count
        this.gameActive = true;
        this.insuranceOffered = false;
        this.insuranceTaken = false;
        
        // Clear previous cards display
        const playerContainer = document.getElementById('player-cards');
        playerContainer.innerHTML = '';
        playerContainer.style.display = '';
        playerContainer.style.gap = '';
        playerContainer.style.justifyContent = '';
        document.getElementById('dealer-cards').innerHTML = '';
        
        // Clear message
        this.showMessage('');
        
        // Disable deal button during dealing
        document.getElementById('deal').disabled = true;
        
        // Deal cards sequentially with delay
        await this.dealCardWithDelay('player', true);
        await this.dealCardWithDelay('dealer', true);
        await this.dealCardWithDelay('player', true);
        await this.dealCardWithDelay('dealer', false); // Dealer hole card doesn't count yet
        
        // Update strategy recommendation
        this.updateStrategyRecommendation();
        
        // Check if dealer has ace and offer insurance
        if (this.insuranceEnabled && this.dealerHand[0].rank === 'A') {
            this.offerInsurance();
            return; // Wait for insurance decision
        }
        
        // Enable/disable buttons
        this.updateButtons();
        
        // Check for blackjack
        const playerScore = this.calculateScore(this.playerHand);
        if (playerScore === 21) {
            setTimeout(() => this.stand(), this.dealSpeed);
        }
        
        // Add to history
        const decksRemaining = this.shoe.length / 52;
        const trueCount = decksRemaining > 0 ? this.runningCount / decksRemaining : 0;
        this.addToHistory('New hand dealt', this.runningCount, trueCount);
    }
    
    initializeMobileLayout() {
        // Check if we're on mobile
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        
        if (isMobile) {
            // Move content to mobile sections
            this.setupMobileSections();
            
            // Initialize mobile navigation
            this.initializeMobileNav();
            
            // Add swipe gesture support
            this.initializeSwipeGestures();
        }
        
        // Handle orientation changes and resize
        window.addEventListener('resize', () => {
            const wasDesktop = !document.querySelector('.mobile-sections').classList.contains('active');
            const isNowMobile = window.matchMedia('(max-width: 768px)').matches;
            
            if (wasDesktop && isNowMobile) {
                this.setupMobileSections();
            } else if (!wasDesktop && !isNowMobile) {
                this.restoreDesktopLayout();
            }
        });
    }
    
    setupMobileSections() {
        // Clone content to mobile sections
        const countSection = document.querySelector('.mobile-section[data-section="count"]');
        const gameSection = document.querySelector('.mobile-section[data-section="game"]');
        const strategySection = document.querySelector('.mobile-section[data-section="strategy"]');
        const cardsSection = document.querySelector('.mobile-section[data-section="cards"]');
        
        // Clear game section first
        if (gameSection) {
            gameSection.innerHTML = '';
        }
        
        // Clone game content WITHOUT remaining cards AND count display
        const leftContent = document.querySelector('.left-content');
        if (leftContent && gameSection) {
            const gameClone = leftContent.cloneNode(true);
            
            // Remove the remaining cards from the clone
            const remainingCardsInClone = gameClone.querySelector('.remaining-cards');
            if (remainingCardsInClone) {
                remainingCardsInClone.remove();
            }
            
            // Remove the count display from game section
            const countDisplayInClone = gameClone.querySelector('.count-display');
            if (countDisplayInClone) {
                countDisplayInClone.remove();
            }
            
            gameSection.appendChild(gameClone);
            
            // Ensure cloned controls have game-idle class
            const clonedControls = gameClone.querySelector('.controls');
            if (clonedControls) {
                clonedControls.classList.add('game-idle');
                
                // Add reset-shoe button to mobile controls
                const resetShoeBtn = document.querySelector('#reset-shoe');
                if (resetShoeBtn && !clonedControls.querySelector('#reset-shoe')) {
                    const resetShoeClone = resetShoeBtn.cloneNode(true);
                    const actionButtons = clonedControls.querySelector('.action-buttons');
                    if (actionButtons) {
                        actionButtons.appendChild(resetShoeClone);
                    }
                }
            }
            
            // Re-attach event listeners for cloned elements
            this.reattachMobileEventListeners();
            
            // Set up observer to sync changes
            this.setupMobileSync();
        }
        
        // Clone strategy guide
        const strategyGuide = document.querySelector('.strategy-guide');
        if (strategyGuide && strategySection && !strategySection.querySelector('.strategy-guide')) {
            const strategyClone = strategyGuide.cloneNode(true);
            strategySection.appendChild(strategyClone);
            
            // Re-attach reset stats button listener
            const resetStatsBtn = strategyClone.querySelector('#reset-stats');
            if (resetStatsBtn) {
                resetStatsBtn.addEventListener('click', () => this.resetStrategyStats());
            }
            
            // Re-attach help icon listeners
            const helpIcons = strategyClone.querySelectorAll('.help-icon');
            helpIcons.forEach(icon => {
                icon.addEventListener('click', () => {
                    const modalId = icon.dataset.modal;
                    const modal = document.getElementById(modalId);
                    if (modal) {
                        modal.classList.add('active');
                        this.populateModalContent(modalId);
                    }
                });
            });
        }
        
        // Clone remaining cards to cards section only
        const remainingCards = document.querySelector('.remaining-cards');
        if (remainingCards && cardsSection && !cardsSection.querySelector('.remaining-cards')) {
            cardsSection.appendChild(remainingCards.cloneNode(true));
        }
        
        // Setup Count section with both count display and history
        if (countSection) {
            countSection.innerHTML = ''; // Clear first
            
            // Create a container for count content
            const countContainer = document.createElement('div');
            countContainer.className = 'mobile-count-container';
            
            // Add a title
            const title = document.createElement('h2');
            title.textContent = 'Count & History';
            title.style.textAlign = 'center';
            title.style.color = '#CAE4BC';
            title.style.marginBottom = '20px';
            title.style.fontFamily = "'Orbitron', sans-serif";
            title.style.letterSpacing = '2px';
            title.style.textTransform = 'uppercase';
            countContainer.appendChild(title);
            
            // Clone count display
            const countDisplay = document.querySelector('.count-display');
            if (countDisplay) {
                const countClone = countDisplay.cloneNode(true);
                countClone.classList.add('visible'); // Always visible in count tab
                countContainer.appendChild(countClone);
            }
            
            // Clone count history
            const countHistory = document.querySelector('.count-history');
            if (countHistory) {
                const historyClone = countHistory.cloneNode(true);
                countContainer.appendChild(historyClone);
                
                // Re-attach clear history button listener
                const clearHistoryBtn = historyClone.querySelector('#clear-history');
                if (clearHistoryBtn) {
                    clearHistoryBtn.addEventListener('click', () => this.clearHistory());
                }
            }
            
            countSection.appendChild(countContainer);
        }
        
        // Mark mobile sections as active
        document.querySelector('.mobile-sections')?.classList.add('active');
    }
    
    restoreDesktopLayout() {
        // This would restore the desktop layout if needed
        document.querySelector('.mobile-sections')?.classList.remove('active');
    }
    
    initializeMobileNav() {
        const navItems = document.querySelectorAll('.mobile-nav-item');
        const sections = document.querySelectorAll('.mobile-section');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetSection = item.dataset.section;
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Update active section
                sections.forEach(section => {
                    section.classList.remove('active');
                });
                
                // Add active to target section
                const targetSectionElement = document.querySelector(`.mobile-section[data-section="${targetSection}"]`);
                if (targetSectionElement) {
                    targetSectionElement.classList.add('active');
                }
            });
        });
    }
    
    initializeSwipeGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        const threshold = 50; // Minimum swipe distance
        
        const handleSwipe = () => {
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > threshold) {
                const navItems = document.querySelectorAll('.mobile-nav-item');
                const activeIndex = Array.from(navItems).findIndex(item => item.classList.contains('active'));
                
                if (diff > 0 && activeIndex < navItems.length - 1) {
                    // Swipe left - next section
                    navItems[activeIndex + 1].click();
                } else if (diff < 0 && activeIndex > 0) {
                    // Swipe right - previous section
                    navItems[activeIndex - 1].click();
                }
            }
        };
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
    
    reattachMobileEventListeners() {
        // Find all buttons in mobile sections and reattach listeners
        const mobileGameSection = document.querySelector('.mobile-section[data-section="game"]');
        if (!mobileGameSection) return;
        
        const dealBtn = mobileGameSection.querySelector('#deal');
        const hitBtn = mobileGameSection.querySelector('#hit');
        const standBtn = mobileGameSection.querySelector('#stand');
        const doubleBtn = mobileGameSection.querySelector('#double');
        const splitBtn = mobileGameSection.querySelector('#split');
        const takeInsuranceBtn = mobileGameSection.querySelector('#take-insurance');
        const declineInsuranceBtn = mobileGameSection.querySelector('#decline-insurance');
        const resetShoeBtn = mobileGameSection.querySelector('#reset-shoe');
        
        if (dealBtn) dealBtn.addEventListener('click', () => this.deal());
        if (hitBtn) hitBtn.addEventListener('click', () => this.hit());
        if (standBtn) standBtn.addEventListener('click', () => this.stand());
        if (doubleBtn) doubleBtn.addEventListener('click', () => this.double());
        if (splitBtn) splitBtn.addEventListener('click', () => this.split());
        if (takeInsuranceBtn) takeInsuranceBtn.addEventListener('click', () => this.takeInsurance());
        if (declineInsuranceBtn) declineInsuranceBtn.addEventListener('click', () => this.declineInsurance());
        if (resetShoeBtn) resetShoeBtn.addEventListener('click', () => this.resetShoe());
    }
    
    setupMobileSync() {
        // Set up comprehensive sync for all mobile sections
        this.setupGameSync();
        this.setupStrategySync();
        this.setupCardsSync();
        this.setupCountSync();
    }
    
    setupGameSync() {
        // Observer to sync desktop game changes to mobile
        const desktopGameArea = document.querySelector('.left-content');
        const mobileGameSection = document.querySelector('.mobile-section[data-section="game"]');
        if (!desktopGameArea || !mobileGameSection) return;
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Sync card displays
                if (mutation.target.id === 'dealer-cards' || mutation.target.id === 'player-cards') {
                    const mobileTarget = mobileGameSection.querySelector(`#${mutation.target.id}`);
                    if (mobileTarget) {
                        mobileTarget.innerHTML = mutation.target.innerHTML;
                    }
                }
                
                // Sync scores
                if (mutation.target.id === 'dealer-score' || mutation.target.id === 'player-score') {
                    const mobileTarget = mobileGameSection.querySelector(`#${mutation.target.id}`);
                    if (mobileTarget) {
                        mobileTarget.textContent = mutation.target.textContent;
                    }
                }
                
                // Sync counts
                const countIds = ['hand-count', 'running-count', 'true-count', 'decks-remaining', 'shoe-timer'];
                if (countIds.includes(mutation.target.id)) {
                    const mobileTarget = mobileGameSection.querySelector(`#${mutation.target.id}`);
                    if (mobileTarget) {
                        mobileTarget.textContent = mutation.target.textContent;
                    }
                }
                
                // Sync button states
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                    const mobileBtn = mobileGameSection.querySelector(`#${mutation.target.id}`);
                    if (mobileBtn) {
                        mobileBtn.disabled = mutation.target.disabled;
                    }
                }
            });
        });
        
        observer.observe(desktopGameArea, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['disabled']
        });
    }
    
    setupStrategySync() {
        // Sync strategy guide updates
        const desktopStrategy = document.querySelector('.strategy-guide');
        const mobileStrategy = document.querySelector('.mobile-section[data-section="strategy"] .strategy-guide');
        if (!desktopStrategy || !mobileStrategy) return;
        
        const observer = new MutationObserver(() => {
            // Sync all strategy elements
            const elementsToSync = [
                'recommended-action', 'move-explanation', 'strategy-feedback',
                'correct-moves', 'total-moves', 'accuracy', 'wrong-moves-list'
            ];
            
            elementsToSync.forEach(id => {
                const desktopEl = desktopStrategy.querySelector(`#${id}`);
                const mobileEl = mobileStrategy.querySelector(`#${id}`);
                if (desktopEl && mobileEl) {
                    if (id === 'wrong-moves-list') {
                        mobileEl.innerHTML = desktopEl.innerHTML;
                    } else {
                        mobileEl.textContent = desktopEl.textContent;
                    }
                }
            });
        });
        
        observer.observe(desktopStrategy, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    setupCardsSync() {
        // Sync remaining cards display
        const desktopCards = document.querySelector('.remaining-cards');
        const mobileCards = document.querySelector('.mobile-section[data-section="cards"] .remaining-cards');
        if (!desktopCards || !mobileCards) return;
        
        const observer = new MutationObserver(() => {
            // Sync card counts and details
            const elementsToSync = [
                'low-cards-count', 'low-cards-details',
                'neutral-cards-count', 'neutral-cards-details',
                'high-cards-count', 'high-cards-details'
            ];
            
            elementsToSync.forEach(id => {
                const desktopEl = desktopCards.querySelector(`#${id}`);
                const mobileEl = mobileCards.querySelector(`#${id}`);
                if (desktopEl && mobileEl) {
                    mobileEl.innerHTML = desktopEl.innerHTML;
                }
            });
        });
        
        observer.observe(desktopCards, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    setupCountSync() {
        // Sync count display and history to count section
        const countSection = document.querySelector('.mobile-section[data-section="count"]');
        if (!countSection) return;
        
        // Sync count display values
        const desktopCountDisplay = document.querySelector('.count-display');
        const mobileCountDisplay = countSection.querySelector('.count-display');
        if (desktopCountDisplay && mobileCountDisplay) {
            const countObserver = new MutationObserver(() => {
                const countIds = ['hand-count', 'running-count', 'true-count', 'decks-remaining', 'shoe-timer'];
                countIds.forEach(id => {
                    const desktopEl = desktopCountDisplay.querySelector(`#${id}`);
                    const mobileEl = mobileCountDisplay.querySelector(`#${id}`);
                    if (desktopEl && mobileEl) {
                        mobileEl.textContent = desktopEl.textContent;
                    }
                });
            });
            
            countObserver.observe(desktopCountDisplay, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
        
        // Sync history
        const desktopHistory = document.querySelector('.count-history #history-list');
        const mobileHistory = countSection.querySelector('#history-list');
        if (desktopHistory && mobileHistory) {
            const historyObserver = new MutationObserver(() => {
                mobileHistory.innerHTML = desktopHistory.innerHTML;
            });
            
            historyObserver.observe(desktopHistory, {
                childList: true,
                subtree: true
            });
        }
    }
    
    initializeStrategyModals() {
        // Modal functionality
        const helpIcons = document.querySelectorAll('.help-icon');
        const modals = document.querySelectorAll('.strategy-modal');
        const closeButtons = document.querySelectorAll('.strategy-modal-close');
        
        // Open modal when help icon is clicked
        helpIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const modalId = icon.dataset.modal;
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('active');
                    this.populateModalContent(modalId);
                }
            });
        });
        
        // Close modal when close button is clicked
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                button.closest('.strategy-modal').classList.remove('active');
            });
        });
        
        // Close modal when clicking outside
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Close modal with ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modals.forEach(modal => modal.classList.remove('active'));
            }
        });
    }
    
    populateModalContent(modalId) {
        const modalBody = document.querySelector(`#${modalId} .strategy-modal-body`);
        
        if (modalId === 'basic-strategy-modal') {
            modalBody.innerHTML = this.getBasicStrategyContent();
        } else if (modalId === 'deviations-modal') {
            modalBody.innerHTML = this.getDeviationsContent();
        }
    }
    
    getBasicStrategyContent() {
        return `
            <div class="strategy-table">
                <h3>Hard Totals</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Hand</th>
                            <th>2</th>
                            <th>3</th>
                            <th>4</th>
                            <th>5</th>
                            <th>6</th>
                            <th>7</th>
                            <th>8</th>
                            <th>9</th>
                            <th>10</th>
                            <th>A</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td class="player-hand">17+</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td></tr>
                        <tr><td class="player-hand">16</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">15</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">14</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">13</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">12</td><td>H</td><td>H</td><td>S</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">11</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>H</td></tr>
                        <tr><td class="player-hand">10</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>D</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">9</td><td>H</td><td>D</td><td>D</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">8</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="strategy-table">
                <h3>Soft Totals</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Hand</th>
                            <th>2</th>
                            <th>3</th>
                            <th>4</th>
                            <th>5</th>
                            <th>6</th>
                            <th>7</th>
                            <th>8</th>
                            <th>9</th>
                            <th>10</th>
                            <th>A</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td class="player-hand">A,9</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td></tr>
                        <tr><td class="player-hand">A,8</td><td>S</td><td>S</td><td>S</td><td>S</td><td>Ds</td><td>S</td><td>S</td><td>S</td><td>S</td><td>S</td></tr>
                        <tr><td class="player-hand">A,7</td><td>Ds</td><td>Ds</td><td>Ds</td><td>Ds</td><td>Ds</td><td>S</td><td>S</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">A,6</td><td>H</td><td>D</td><td>D</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">A,5</td><td>H</td><td>H</td><td>D</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">A,4</td><td>H</td><td>H</td><td>D</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">A,3</td><td>H</td><td>H</td><td>H</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                        <tr><td class="player-hand">A,2</td><td>H</td><td>H</td><td>H</td><td>D</td><td>D</td><td>H</td><td>H</td><td>H</td><td>H</td><td>H</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="strategy-table">
                <h3>Pairs</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Hand</th>
                            <th>2</th>
                            <th>3</th>
                            <th>4</th>
                            <th>5</th>
                            <th>6</th>
                            <th>7</th>
                            <th>8</th>
                            <th>9</th>
                            <th>10</th>
                            <th>A</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td class="player-hand">A,A</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td></tr>
                        <tr><td class="player-hand">10,10</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">9,9</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>N</td><td>Y</td><td>Y</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">8,8</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td></tr>
                        <tr><td class="player-hand">7,7</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">6,6</td><td>Y/N</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">5,5</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">4,4</td><td>N</td><td>N</td><td>N</td><td>Y/N</td><td>Y/N</td><td>N</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">3,3</td><td>Y/N</td><td>Y/N</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                        <tr><td class="player-hand">2,2</td><td>Y/N</td><td>Y/N</td><td>Y</td><td>Y</td><td>Y</td><td>Y</td><td>N</td><td>N</td><td>N</td><td>N</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(202, 228, 188, 0.1); border-radius: 10px;">
                <p style="margin: 0 0 10px 0;"><strong>Legend:</strong></p>
                <ul style="margin: 0; padding-left: 20px; list-style: none;">
                    <li><strong>S</strong> = Stand</li>
                    <li><strong>H</strong> = Hit</li>
                    <li><strong>D</strong> = Double if allowed, otherwise Hit</li>
                    <li><strong>Ds</strong> = Double if allowed, otherwise Stand</li>
                    <li><strong>Y</strong> = Split</li>
                    <li><strong>N</strong> = Don't split</li>
                    <li><strong>Y/N</strong> = Split if double after split is allowed</li>
                </ul>
            </div>
        `;
    }
    
    getDeviationsContent() {
        return `
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(202, 228, 188, 0.1); border-radius: 10px;">
                <p style="margin: 0;">The Illustrious 18 are the most important count-based strategy deviations. They account for the majority of the gain from counting cards.</p>
            </div>
            
            <div class="deviation-item" data-index="#1">
                <h4>Insurance (Dealer shows A)</h4>
                <p>Take insurance at <span class="tc-value">TC ≥ 3</span> (Basic strategy: Never take insurance)</p>
            </div>
            
            <div class="deviation-item" data-index="#2">
                <h4>16 vs 10</h4>
                <p>Stand at <span class="tc-value">TC ≥ 0</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#3">
                <h4>15 vs 10</h4>
                <p>Stand at <span class="tc-value">TC ≥ 4</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#4">
                <h4>10,10 vs 5</h4>
                <p>Split at <span class="tc-value">TC ≥ 5</span> (Basic strategy: Stand)</p>
            </div>
            
            <div class="deviation-item" data-index="#5">
                <h4>10,10 vs 6</h4>
                <p>Split at <span class="tc-value">TC ≥ 4</span> (Basic strategy: Stand)</p>
            </div>
            
            <div class="deviation-item" data-index="#6">
                <h4>10 vs 10</h4>
                <p>Double at <span class="tc-value">TC ≥ 4</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#7">
                <h4>12 vs 3</h4>
                <p>Stand at <span class="tc-value">TC ≥ 2</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#8">
                <h4>12 vs 2</h4>
                <p>Stand at <span class="tc-value">TC ≥ 3</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#9">
                <h4>11 vs A</h4>
                <p>Double at <span class="tc-value">TC ≥ 1</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#10">
                <h4>9 vs 2</h4>
                <p>Double at <span class="tc-value">TC ≥ 1</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#11">
                <h4>10 vs A</h4>
                <p>Double at <span class="tc-value">TC ≥ 4</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#12">
                <h4>9 vs 7</h4>
                <p>Double at <span class="tc-value">TC ≥ 3</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#13">
                <h4>16 vs 9</h4>
                <p>Stand at <span class="tc-value">TC ≥ 5</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#14">
                <h4>13 vs 2</h4>
                <p>Stand at <span class="tc-value">TC ≥ -1</span> (Basic strategy: Hit)</p>
            </div>
            
            <div class="deviation-item" data-index="#15">
                <h4>12 vs 4</h4>
                <p>Hit at <span class="tc-value">TC < 0</span> (Basic strategy: Stand)</p>
            </div>
            
            <div class="deviation-item" data-index="#16">
                <h4>12 vs 5</h4>
                <p>Hit at <span class="tc-value">TC ≤ -2</span> (Basic strategy: Stand)</p>
            </div>
            
            <div class="deviation-item" data-index="#17">
                <h4>12 vs 6</h4>
                <p>Hit at <span class="tc-value">TC ≤ -1</span> (Basic strategy: Stand)</p>
            </div>
            
            <div class="deviation-item" data-index="#18">
                <h4>13 vs 3</h4>
                <p>Hit at <span class="tc-value">TC ≤ -2</span> (Basic strategy: Stand)</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(202, 228, 188, 0.1); border-radius: 10px;">
                <p style="margin: 0;"><strong>Note:</strong> TC = True Count (Running Count ÷ Decks Remaining)</p>
            </div>
        `;
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BlackjackGame();
});