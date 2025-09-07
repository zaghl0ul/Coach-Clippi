import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import os from 'os';
import { provideLiveCommentary } from './liveCommentary.js';
import { generateCoachingAdvice } from './aicoaching.js';
import { characterNames } from './utils/slippiUtils.js';

// Use dynamic require for CommonJS modules
const require = createRequire(import.meta.url);
const { SlippiGame } = require('@slippi/slippi-js');

// File monitoring constants
const POLLING_INTERVAL = 500; // milliseconds
const EVENT_THRESHOLD = 3000; // milliseconds between events

export class CurrentGameMonitor {
    constructor(apiKey, slippiDirectory = null) {
        // Set directory path based on OS if not provided
        this.slippiDirectory = slippiDirectory || this._getDefaultSlippiDirectory();
        this.currentGamePath = path.join(this.slippiDirectory, 'CurrentGame.slp');
        this.apiKey = apiKey;
        
        // Monitoring state
        this.isMonitoring = false;
        this.lastEventTime = 0;
        this.lastFrame = -999;
        this.lastStockCounts = [4, 4, 4, 4];
        this.gameInProgress = false;
        this.comboFrames = [];
        this.playerData = null;
        this.intervalId = null;
        this.game = null;
        
        // Stats tracking
        this.stockLostEvents = [];
        this.comboEvents = [];
    }
    
    _getDefaultSlippiDirectory() {
        const platform = process.platform;
        const homeDir = os.homedir();
        
        switch (platform) {
            case 'win32':
                return path.join(homeDir, 'Documents', 'Slippi');
            case 'darwin':
                return path.join(homeDir, 'Library', 'Application Support', 'Slippi');
            case 'linux':
                return path.join(homeDir, '.config', 'Slippi');
            default:
                return path.join(homeDir, 'Slippi');
        }
    }
    
    async start() {
        if (this.isMonitoring) {
            return;
        }
        
        console.log(`Starting real-time monitoring of: ${this.currentGamePath}`);
        
        // Verify Slippi directory exists
        if (!fs.existsSync(this.slippiDirectory)) {
            throw new Error(`Slippi directory not found: ${this.slippiDirectory}`);
        }
        
        this.isMonitoring = true;
        
        // Use polling approach instead of fs.watch for better cross-platform reliability
        this.intervalId = setInterval(() => this._checkGameFile(), POLLING_INTERVAL);
        
        console.log("Real-time Slippi game monitoring active");
        console.log("Waiting for gameplay...");
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isMonitoring = false;
        console.log("Real-time monitoring stopped");
    }
    
    async _checkGameFile() {
        try {
            // Check if CurrentGame.slp exists
            if (!fs.existsSync(this.currentGamePath)) {
                if (this.gameInProgress) {
                    console.log("Game ended or file removed");
                    this.gameInProgress = false;
                    
                    if (this.stockLostEvents.length > 0) {
                        await this._generateEndGameAnalysis();
                    }
                    
                    // Reset state
                    this.lastFrame = -999;
                    this.lastStockCounts = [4, 4, 4, 4];
                    this.stockLostEvents = [];
                    this.comboEvents = [];
                    this.playerData = null;
                    this.game = null;
                }
                return;
            }
            
            // Handle potential file locks when Dolphin is writing
            try {
                // Initialize game object if needed - with processOnTheFly for performance
                if (!this.game) {
                    this.game = new SlippiGame(this.currentGamePath, { processOnTheFly: true });
                    console.log("Created new SlippiGame parser with processOnTheFly enabled");
                }
                
                // Extract current game state
                const metadata = this.game.getMetadata() || {};
                const settings = this.game.getSettings() || {};
                const stats = this.game.getStats() || {};
                const latestFrame = this.game.getLatestFrame() || {};
                
                // Detect game start
                if (!this.gameInProgress && settings.players && settings.players.length > 0) {
                    this.gameInProgress = true;
                    this._handleGameStart(settings);
                }
                
                // Skip processing if no game in progress
                if (!this.gameInProgress) return;
                
                // Process the current frame
                if (latestFrame && latestFrame.frame > this.lastFrame) {
                    // Detect significant frame advancement
                    if (latestFrame.frame - this.lastFrame > 60) {
                        console.log(`Frame update: ${latestFrame.frame}`);
                    }
                    
                    // Track stock changes
                    this._checkStockChanges(latestFrame);
                    
                    // Check for combos
                    if (stats.combos && stats.combos.length > 0) {
                        this._processNewCombos(stats.combos);
                    }
                    
                    this.lastFrame = latestFrame.frame;
                }
                
            } catch (readError) {
                // Likely a file lock issue - we'll try again next interval
                if (readError.message && !readError.message.includes('already been finalized')) {
                    console.error(`File read error: ${readError.message}`);
                }
            }
            
        } catch (err) {
            console.error(`Error during game monitoring: ${err.message}`);
        }
    }
    
    _handleGameStart(settings) {
        console.log("New game detected!");
        
        // Extract player information
        if (settings.players && Array.isArray(settings.players)) {
            this.playerData = settings.players.map((player, index) => {
                const characterId = player.characterId || 0;
                const character = characterNames[characterId] || 'Unknown';
                
                return {
                    index,
                    port: player.port || index + 1,
                    characterId,
                    character,
                    playerType: player.type // 0=human, 1=CPU
                };
            });
            
            // Log the matchup
            console.log("Matchup:");
            this.playerData.forEach(player => {
                console.log(`Player ${player.port}: ${player.character}`);
            });
        }
        
        // Reset tracking data
        this.lastStockCounts = [4, 4, 4, 4];
        this.stockLostEvents = [];
        this.comboEvents = [];
    }
    
    _checkStockChanges(latestFrame) {
        if (!latestFrame.players) return;
        
        // Check each player's stock count
        latestFrame.players.forEach((player, playerIndex) => {
            if (!player || !player.post || player.post.stocksRemaining === undefined) return;
            
            const currentStocks = player.post.stocksRemaining;
            const previousStocks = this.lastStockCounts[playerIndex];
            
            // Detect stock lost
            if (currentStocks < previousStocks) {
                const stocksLost = previousStocks - currentStocks;
                this._handleStockLost(playerIndex, stocksLost, latestFrame);
            }
            
            // Update the tracked stock count
            this.lastStockCounts[playerIndex] = currentStocks;
        });
    }
    
    async _handleStockLost(playerIndex, stocksLost, frame) {
        const now = Date.now();
        
        // Throttle events to avoid excessive processing
        if (now - this.lastEventTime < EVENT_THRESHOLD) {
            return;
        }
        
        this.lastEventTime = now;
        
        // Record the stock lost event
        const event = {
            time: now,
            frame: frame.frame,
            playerIndex,
            stocksLost,
            remainingStocks: this.lastStockCounts[playerIndex]
        };
        
        this.stockLostEvents.push(event);
        
        const playerName = this.playerData ? 
            `Player ${this.playerData[playerIndex]?.port} (${this.playerData[playerIndex]?.character})` : 
            `Player ${playerIndex + 1}`;
        
        console.log(`${playerName} lost a stock! Remaining stocks: ${this.lastStockCounts[playerIndex]}`);
        
        // Generate live commentary for significant events
        try {
            const eventData = JSON.stringify({
                type: "stockLost",
                playerIndex,
                stocksLost,
                remainingStocks: this.lastStockCounts[playerIndex],
                playerCharacter: this.playerData?.[playerIndex]?.character || "Unknown"
            });
            
            await provideLiveCommentary(this.apiKey, [eventData]);
        } catch (err) {
            console.error("Failed to generate commentary:", err.message);
        }
    }
    
    _processNewCombos(combos) {
        if (!combos || combos.length === 0) return;
        
        // Find combos we haven't processed yet
        const newCombos = combos.filter(combo => 
            combo.moves && 
            combo.moves.length >= 3 && // Only consider "real" combos with at least 3 moves
            !this.comboEvents.some(existingCombo => 
                existingCombo.playerIndex === combo.playerIndex && 
                existingCombo.startFrame === combo.startFrame
            )
        );
        
        // Process each new combo
        newCombos.forEach(async combo => {
            const now = Date.now();
            
            // Throttle events to avoid excessive processing
            if (now - this.lastEventTime < EVENT_THRESHOLD) {
                return;
            }
            
            this.lastEventTime = now;
            
            // Record the combo event
            this.comboEvents.push({
                playerIndex: combo.playerIndex,
                startFrame: combo.startFrame,
                endFrame: combo.endFrame,
                moves: combo.moves.length,
                damage: combo.percent
            });
            
            const attackerName = this.playerData ? 
                `Player ${this.playerData[combo.playerIndex]?.port} (${this.playerData[combo.playerIndex]?.character})` : 
                `Player ${combo.playerIndex + 1}`;
                
            console.log(`${attackerName} performed a ${combo.moves.length}-hit combo for ${combo.percent.toFixed(1)}% damage!`);
            
            // Generate live commentary for significant combos
            try {
                const eventData = JSON.stringify({
                    type: "combo",
                    playerIndex: combo.playerIndex,
                    moves: combo.moves.length,
                    damage: combo.percent,
                    playerCharacter: this.playerData?.[combo.playerIndex]?.character || "Unknown"
                });
                
                await provideLiveCommentary(this.apiKey, [eventData]);
            } catch (err) {
                console.error("Failed to generate commentary:", err.message);
            }
        });
    }
    
    async _generateEndGameAnalysis() {
        if (!this.playerData || this.stockLostEvents.length === 0) return;
        
        console.log("\nGenerating end-game analysis...");
        
        // Calculate final game statistics
        const stocksLostByPlayer = {};
        
        this.stockLostEvents.forEach(event => {
            if (!stocksLostByPlayer[event.playerIndex]) {
                stocksLostByPlayer[event.playerIndex] = 0;
            }
            stocksLostByPlayer[event.playerIndex] += event.stocksLost;
        });
        
        // Calculate combo statistics
        const combosByPlayer = {};
        let totalDamage = {};
        
        this.comboEvents.forEach(combo => {
            if (!combosByPlayer[combo.playerIndex]) {
                combosByPlayer[combo.playerIndex] = [];
                totalDamage[combo.playerIndex] = 0;
            }
            
            combosByPlayer[combo.playerIndex].push(combo);
            totalDamage[combo.playerIndex] += combo.damage;
        });
        
        // Prepare data for AI coaching
        const matchData = {
            damageDealt: Object.keys(totalDamage).map(index => totalDamage[index] || 0),
            stockLosses: Object.keys(stocksLostByPlayer).map(index => stocksLostByPlayer[index] || 0),
            characters: this.playerData.map(p => p.character)
        };
        
        // Display match summary
        console.log("\n===== MATCH SUMMARY =====");
        this.playerData.forEach((player, index) => {
            console.log(`Player ${player.port} (${player.character}):`);
            console.log(`  Stocks Lost: ${stocksLostByPlayer[index] || 0}`);
            console.log(`  Total Damage Dealt: ${totalDamage[index]?.toFixed(1) || 0}`);
            console.log(`  Significant Combos: ${combosByPlayer[index]?.length || 0}`);
        });
        
        // Generate AI coaching advice
        try {
            console.log("\nGenerating coaching advice...");
            const advice = await generateCoachingAdvice(this.apiKey, matchData);
            console.log("\n===== COACHING ADVICE =====");
            console.log(advice);
            console.log("===========================\n");
        } catch (err) {
            console.error(`Failed to generate coaching advice: ${err.message}`);
        }
    }
}