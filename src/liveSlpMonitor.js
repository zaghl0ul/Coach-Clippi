// Live .slp file monitoring for real-time Slippi gameplay analysis
import fs from 'fs';
import path from 'path';
import os from 'os';
import chokidar from 'chokidar';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SlippiGame } = require('@slippi/slippi-js');

/**
 * Enhanced live Slippi file monitor that watches for .slp files being created
 * and processes them in real-time as the match progresses
 */
export class LiveSlpMonitor {
    constructor() {
        this.watcher = null;
        this.currentGameFile = null;
        this.lastProcessedFrame = -1;
        this.eventCallbacks = new Map();
        this.isMonitoring = false;
        this.slippiPath = this.findSlippiPath();
        this.processingInterval = null;
        this.gameStartTime = null;
        this.previousFrame = null;
        this.consecutiveHits = 0;
        this.lastHitTime = 0;
        this.comboStartFrame = 0;
        this.comboStartPercent = 0;
        this.gameSettings = null;
        this.playerCharacters = {};
    }

    /**
     * Find the Slippi replay directory on the user's system
     */
    findSlippiPath() {
        const platform = os.platform();
        let defaultPaths = [];

        switch (platform) {
            case 'win32':
                defaultPaths = [
                    path.join(os.homedir(), 'AppData', 'Roaming', 'Slippi Launcher', 'playback'),
                    path.join(os.homedir(), 'AppData', 'Roaming', 'Slippi Launcher', 'replays'),
                    path.join(os.homedir(), 'AppData', 'Roaming', 'Slippi', 'replays'),
                    path.join(os.homedir(), 'Documents', 'Slippi'),
                ];
                break;
            case 'darwin': // macOS
                defaultPaths = [
                    path.join(os.homedir(), 'Library', 'Application Support', 'Slippi Launcher', 'playback'),
                    path.join(os.homedir(), 'Library', 'Application Support', 'Slippi Launcher', 'replays'),
                    path.join(os.homedir(), 'Documents', 'Slippi'),
                ];
                break;
            case 'linux':
                defaultPaths = [
                    path.join(os.homedir(), '.config', 'slippi-launcher', 'playback'),
                    path.join(os.homedir(), '.config', 'slippi-launcher', 'replays'),
                    path.join(os.homedir(), 'Documents', 'Slippi'),
                ];
                break;
        }

        // Find the first existing directory
        for (const p of defaultPaths) {
            if (fs.existsSync(p)) {
                console.log(`📁 Found base Slippi directory: ${p}`);
                
                // Check for date-based subdirectories (like 2025-08)
                if (p.endsWith('Slippi')) {
                    try {
                        console.log(`🔍 Scanning for date subdirectories in: ${p}`);
                        
                        const subdirs = fs.readdirSync(p, { withFileTypes: true })
                            .filter(dirent => {
                                console.log(`📂 Found item: ${dirent.name} (isDirectory: ${dirent.isDirectory()})`);
                                return dirent.isDirectory();
                            })
                            .map(dirent => dirent.name)
                            .filter(name => {
                                const isDateFormat = /^\d{4}-\d{2}$/.test(name);
                                console.log(`📅 Directory ${name} matches date format: ${isDateFormat}`);
                                return isDateFormat;
                            })
                            .sort()
                            .reverse(); // Most recent first
                        
                        console.log(`📁 Found ${subdirs.length} date subdirectories:`, subdirs);
                        
                        if (subdirs.length > 0) {
                            const mostRecentSubdir = path.join(p, subdirs[0]);
                            console.log(`📁 Using most recent subdirectory: ${mostRecentSubdir}`);
                            
                            // Verify the subdirectory actually exists and is accessible
                            if (fs.existsSync(mostRecentSubdir)) {
                                return mostRecentSubdir;
                            } else {
                                console.warn(`⚠️ Subdirectory exists but not accessible: ${mostRecentSubdir}`);
                            }
                        }
                    } catch (error) {
                        console.error(`❌ Error scanning subdirectories: ${error.message}`);
                        // Fall back to main directory if subdirectory scan fails
                    }
                }
                
                console.log(`📁 Using base directory: ${p}`);
                return p;
            }
        }

        console.warn('⚠️  Could not find Slippi directory automatically');
        console.warn('💡 You may need to set a custom path in the web interface');
        return null;
    }

    /**
     * Start monitoring for live .slp files
     */
    async start(customPath = null) {
        const watchPath = customPath || this.slippiPath;
        
        if (!watchPath || !fs.existsSync(watchPath)) {
            throw new Error(`Slippi directory not found: ${watchPath || 'automatic detection failed'}`);
        }

        console.log(`🎮 Starting live .slp monitoring: ${watchPath}`);
        
        this.isMonitoring = true;
        
        // Reset tracking variables
        this.previousFrame = null;
        this.consecutiveHits = 0;
        this.lastHitTime = 0;
        this.comboStartFrame = 0;
        this.comboStartPercent = 0;
        
        // Use chokidar for better file watching
        this.watcher = chokidar.watch(watchPath, {
            ignored: (filePath) => {
                const shouldIgnore = !filePath.endsWith('.slp');
                if (shouldIgnore) {
                    console.log(`🚫 Ignoring non-slp file: ${path.basename(filePath)}`);
                }
                return shouldIgnore;
            },
            persistent: true,
            usePolling: true, // Better for detecting file changes during writing
            interval: 500, // Check every 500ms for better performance
            binaryInterval: 1000, // Check binary files every 1000ms
            awaitWriteFinish: {
                stabilityThreshold: 2000, // Wait for file to be stable for 2 seconds
                pollInterval: 100
            }
        });

        this.watcher
            .on('ready', () => {
                console.log('🎯 File watcher is ready and monitoring for new .slp files');
            })
            .on('add', (filePath) => {
                console.log(`📁 File watcher detected new file: ${filePath}`);
                this.handleNewFile(filePath);
            })
            .on('change', (filePath) => {
                console.log(`📁 File watcher detected file change: ${filePath}`);
                this.handleFileChange(filePath);
            })
            .on('unlink', (filePath) => {
                console.log(`📁 File removed: ${filePath}`);
            })
            .on('error', (error) => console.error('📁 File watcher error:', error));

        // Also manually check for the most recent file periodically
        this.fileCheckInterval = setInterval(() => {
            this.checkForNewFiles(watchPath);
        }, 2000); // Check every 2 seconds for new files

        // Start processing interval for live analysis
        this.processingInterval = setInterval(() => {
            if (this.currentGameFile) {
                console.log(`🔄 Processing interval tick - current file: ${path.basename(this.currentGameFile)}`);
                this.processLiveGame();
            } else {
                console.log('⏰ Processing interval tick - no current game file');
            }
        }, 500); // Process every 500ms for more responsive commentary

        console.log('✅ Live .slp monitoring started');
        return true;
    }

    /**
     * Handle new .slp file creation (game start)
     */
    async handleNewFile(filePath) {
        const fileName = path.basename(filePath);
        console.log(`🆕 New .slp file detected: ${fileName} at ${filePath}`);
        
        // Check if this is the most recent file
        const fileStats = fs.statSync(filePath);
        const fileAge = Date.now() - fileStats.mtime.getTime();
        
        console.log(`📊 File age: ${fileAge}ms (created at ${fileStats.mtime.toISOString()})`);
        
        // Only process files created within the last 30 seconds (likely live games)
        if (fileAge < 30000) {
            console.log(`🎯 This appears to be a live game file - setting as current game`);
            
            // Wait a moment for file to be created and start writing
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    // Stop monitoring previous game if any
                    if (this.currentGameFile) {
                        console.log(`🔄 Switching from previous game to new game: ${fileName}`);
                    }
                    
                    this.currentGameFile = filePath;
                    this.lastProcessedFrame = -1;
                    this.gameStartTime = Date.now();
                    this.previousFrame = null;
                    this.consecutiveHits = 0;
                    
                    this.emitEvent('gameStart', {
                        filePath,
                        fileName,
                        startTime: this.gameStartTime
                    });
                    
                    console.log(`🎮 Started monitoring live game: ${fileName}`);
                } else {
                    console.log(`❌ File disappeared before we could start monitoring: ${fileName}`);
                }
            }, 2000); // Wait longer for file to be properly initialized
        } else {
            console.log(`⏰ File is too old (${Math.round(fileAge/1000)}s) - ignoring as likely not live gameplay`);
        }
    }

    /**
     * Manually check for new files (backup to chokidar)
     */
    checkForNewFiles(watchPath) {
        try {
            const files = fs.readdirSync(watchPath);
            const slpFiles = files.filter(f => f.endsWith('.slp'));
            
            if (slpFiles.length === 0) return;
            
            // Find the most recently modified .slp file
            const fileStats = slpFiles.map(file => {
                const filePath = path.join(watchPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    mtime: stats.mtime,
                    age: Date.now() - stats.mtime.getTime()
                };
            });
            
            fileStats.sort((a, b) => b.mtime - a.mtime); // Most recent first
            const newestFile = fileStats[0];
            
            // If the newest file is very recent and we're not already monitoring it
            if (newestFile.age < 10000 && this.currentGameFile !== newestFile.path) {
                console.log(`🔍 Manual check found recent file: ${newestFile.name} (${Math.round(newestFile.age/1000)}s old)`);
                
                // Check if file is still being written to (size changing)
                setTimeout(() => {
                    const currentSize = fs.statSync(newestFile.path).size;
                    setTimeout(() => {
                        const newSize = fs.statSync(newestFile.path).size;
                        if (newSize > currentSize) {
                            console.log(`📈 File is growing (${currentSize} → ${newSize} bytes) - likely live game!`);
                            this.handleNewFile(newestFile.path);
                        }
                    }, 1000);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error in manual file check:', error.message);
        }
    }

    /**
     * Handle .slp file changes (new frames being written)
     */
    async handleFileChange(filePath) {
        if (this.currentGameFile === filePath) {
            // File is being updated, process new frames
            this.processLiveGame();
        }
    }

    /**
     * Get character name from ID
     */
    getCharacterName(characterId) {
        const { CHARACTER_SHORT_NAMES } = require('./utils/constants.js');
        return CHARACTER_SHORT_NAMES[characterId] || `P${characterId}`;
    }

    /**
     * Extract character information from game settings
     */
    extractPlayerCharacters(game) {
        if (!this.gameSettings) {
            try {
                this.gameSettings = game.getSettings();
                console.log('🎪 Game settings loaded');
            } catch (error) {
                return; // Settings not ready yet
            }
        }
        
        if (this.gameSettings && this.gameSettings.players) {
            this.playerCharacters = {};
            this.gameSettings.players.forEach((player, index) => {
                if (player && player.characterId !== undefined) {
                    this.playerCharacters[index] = {
                        characterId: player.characterId,
                        characterName: this.getCharacterName(player.characterId),
                        port: player.port || index + 1,
                        type: player.type // 0 = human, 1 = CPU, 2 = demo
                    };
                }
            });
            
            const matchup = Object.values(this.playerCharacters).map(p => p.characterName).join(' vs ');
            console.log(`🎪 Character matchup: ${matchup}`);
        }
    }

    /**
     * Process the current live game file for new frames
     */
    async processLiveGame() {
        if (!this.currentGameFile || !fs.existsSync(this.currentGameFile)) {
            return;
        }

        try {
            const game = new SlippiGame(this.currentGameFile);
            
            // Extract character info if we haven't yet
            if (!this.gameSettings) {
                this.extractPlayerCharacters(game);
            }
            
            const frames = game.getFrames();
            const frameNumbers = Object.keys(frames).map(f => parseInt(f)).sort((a, b) => a - b);
            
            if (frameNumbers.length === 0) return;
            
            const latestFrame = Math.max(...frameNumbers);

            if (latestFrame > this.lastProcessedFrame) {
                // Process new frames
                const newFrames = frameNumbers.filter(f => f > this.lastProcessedFrame);
                
                console.log(`🎮 Processing ${newFrames.length} new frames (${this.lastProcessedFrame + 1}-${latestFrame})`);
                
                for (const frameNumber of newFrames) {
                    if (frames[frameNumber]) {
                        this.processFrame(frames[frameNumber], frameNumber, game);
                    }
                }
                
                this.lastProcessedFrame = latestFrame;
                
                // Emit live update event
                this.emitEvent('liveUpdate', {
                    latestFrame: latestFrame,
                    frameCount: frameNumbers.length,
                    gameTime: Math.floor((latestFrame - (-123)) / 60 * 1000) // Convert to game time
                });
            }

            // Check if game has ended (no new frames for a while)
            const timeSinceLastUpdate = Date.now() - this.gameStartTime;
            if (timeSinceLastUpdate > 15000 && latestFrame === this.lastProcessedFrame && this.lastProcessedFrame > 0) {
                this.handleGameEnd();
            }

        } catch (error) {
            if (!error.message.includes('Failed to get frame') && !error.message.includes('Game file does not exist')) {
                console.error('Error processing live game:', error.message);
            }
        }
    }

    /**
     * Process individual frame for live events
     */
    processFrame(frame, frameNumber, game) {
        if (!frame || !frame.players) return;

        try {
            // Store previous frame data for comparison
            if (!this.previousFrame) {
                this.previousFrame = JSON.parse(JSON.stringify(frame));
                return;
            }

            // Detect events by comparing current frame to previous frame
            for (let i = 0; i < frame.players.length; i++) {
                const player = frame.players[i];
                const prevPlayer = this.previousFrame.players[i];
                
                if (!player || !prevPlayer || !player.post || !prevPlayer.post) continue;

                // Detect hits (damage increase)
                if (player.post.percent > prevPlayer.post.percent) {
                    const damageDealt = player.post.percent - prevPlayer.post.percent;
                    const characterName = this.playerCharacters[i]?.characterName || `Player ${i + 1}`;
                    
                    this.emitEvent('hit', {
                        frameNumber,
                        playerIndex: i,
                        damage: player.post.percent,
                        damageDealt: damageDealt,
                        position: { x: player.post.positionX, y: player.post.positionY },
                        actionState: player.pre?.actionState || 0,
                        characterName: characterName
                    });
                    
                    console.log(`💥 Hit detected: Player ${i} took ${damageDealt}% damage (now at ${player.post.percent}%)`);
                    
                    // Track combos
                    const timeSinceLastHit = this.lastHitTime ? frameNumber - this.lastHitTime : Infinity;
                    
                    if (timeSinceLastHit < 60) { // Within 1 second (60 frames)
                        this.consecutiveHits++;
                        
                        if (this.consecutiveHits >= 2) { // 2+ hits = combo
                            const characterName = this.playerCharacters[i]?.characterName || `Player ${i + 1}`;
                            
                            this.emitEvent('combo', {
                                frameNumber,
                                playerIndex: i,
                                hitCount: this.consecutiveHits,
                                totalDamage: player.post.percent - this.comboStartPercent,
                                duration: frameNumber - this.comboStartFrame,
                                characterName: characterName
                            });
                            
                            console.log(`🔥 Combo detected: ${this.consecutiveHits} hits for ${player.post.percent - this.comboStartPercent}% damage`);
                        }
                    } else {
                        // Start new combo tracking
                        this.consecutiveHits = 1;
                        this.comboStartFrame = frameNumber;
                        this.comboStartPercent = prevPlayer.post.percent;
                    }
                    
                    this.lastHitTime = frameNumber;
                }

                // Detect stock losses
                if (player.post.stocksRemaining < prevPlayer.post.stocksRemaining) {
                    const stocksLost = prevPlayer.post.stocksRemaining - player.post.stocksRemaining;
                    
                    const characterName = this.playerCharacters[i]?.characterName || `Player ${i + 1}`;
                    
                    this.emitEvent('stockChange', {
                        frameNumber,
                        playerIndex: i,
                        stocksRemaining: player.post.stocksRemaining,
                        stocksLost: stocksLost,
                        finalPercent: prevPlayer.post.percent,
                        characterName: characterName
                    });
                    
                    console.log(`💀 Stock lost: Player ${i} now has ${player.post.stocksRemaining} stocks`);
                }
            }

            // Store current frame for next comparison
            this.previousFrame = JSON.parse(JSON.stringify(frame));

        } catch (error) {
            console.error(`Error processing frame ${frameNumber}:`, error.message);
        }
    }

    /**
     * Handle game end
     */
    handleGameEnd() {
        if (!this.currentGameFile) return;

        console.log('🏁 Game ended, processing final results');
        
        try {
            const game = new SlippiGame(this.currentGameFile);
            const settings = game.getSettings();
            const stats = game.getStats();
            
            this.emitEvent('gameEnd', {
                filePath: this.currentGameFile,
                duration: Date.now() - this.gameStartTime,
                settings,
                stats,
                finalFrame: this.lastProcessedFrame
            });

        } catch (error) {
            console.error('Error processing game end:', error.message);
        }

        // Reset for next game
        this.currentGameFile = null;
        this.lastProcessedFrame = -1;
        this.gameStartTime = null;
        this.previousFrame = null;
        this.consecutiveHits = 0;
    }

    /**
     * Add event callback
     */
    addEventCallback(name, callback) {
        this.eventCallbacks.set(name, callback);
    }

    /**
     * Remove event callback
     */
    removeEventCallback(name) {
        this.eventCallbacks.delete(name);
    }

    /**
     * Emit event to all callbacks
     */
    emitEvent(eventType, eventData) {
        console.log(`📡 Emitting event: ${eventType}`, eventData);
        this.eventCallbacks.forEach((callback, name) => {
            try {
                callback(eventType, eventData);
            } catch (error) {
                console.error(`Error in event callback '${name}':`, error.message);
            }
        });
    }

    /**
     * Stop monitoring
     */
    stop() {
        console.log('🛑 Stopping live .slp monitoring');
        
        this.isMonitoring = false;
        
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        if (this.fileCheckInterval) {
            clearInterval(this.fileCheckInterval);
            this.fileCheckInterval = null;
        }
        
        this.currentGameFile = null;
        this.lastProcessedFrame = -1;
        this.eventCallbacks.clear();
        this.previousFrame = null;
        
        console.log('✅ Live .slp monitoring stopped');
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            currentGame: this.currentGameFile ? path.basename(this.currentGameFile) : null,
            slippiPath: this.slippiPath,
            lastFrame: this.lastProcessedFrame,
            gameActive: !!this.currentGameFile
        };
    }

    /**
     * Set custom Slippi directory
     */
    setSlippiPath(customPath) {
        if (fs.existsSync(customPath)) {
            this.slippiPath = customPath;
            console.log(`📁 Slippi path updated: ${customPath}`);
            
            // Show what files are in the directory for debugging
            try {
                const files = fs.readdirSync(customPath);
                const slpFiles = files.filter(f => f.endsWith('.slp'));
                console.log(`📄 Found ${slpFiles.length} .slp files in directory:`, slpFiles.slice(0, 5));
            } catch (error) {
                console.error('Error reading directory contents:', error.message);
            }
            
            return true;
        } else {
            console.error(`❌ Invalid Slippi path: ${customPath}`);
            return false;
        }
    }

    /**
     * Debug method to test directory detection
     */
    debugDirectoryDetection() {
        console.log('\n🔍 === DIRECTORY DETECTION DEBUG ===');
        const homedir = os.homedir();
        console.log(`🏠 Home directory: ${homedir}`);
        
        const testPaths = [
            path.join(homedir, 'Documents', 'Slippi'),
            path.join(homedir, 'Documents', 'Slippi', '2025-08'),
            path.join(homedir, 'AppData', 'Roaming', 'Slippi Launcher', 'playback')
        ];
        
        testPaths.forEach(testPath => {
            const exists = fs.existsSync(testPath);
            console.log(`📁 ${testPath} - ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
            
            if (exists) {
                try {
                    const files = fs.readdirSync(testPath);
                    const slpFiles = files.filter(f => f.endsWith('.slp'));
                    const dirs = files.filter(f => {
                        try {
                            return fs.statSync(path.join(testPath, f)).isDirectory();
                        } catch (e) {
                            return false;
                        }
                    });
                    
                    console.log(`   📄 .slp files: ${slpFiles.length}`);
                    console.log(`   📂 Subdirectories: ${dirs.length} [${dirs.join(', ')}]`);
                    
                    if (slpFiles.length > 0) {
                        console.log(`   📝 Recent .slp files:`, slpFiles.slice(0, 3));
                    }
                } catch (error) {
                    console.log(`   ❌ Error reading contents: ${error.message}`);
                }
            }
        });
        
        console.log(`🎯 Auto-detected path: ${this.slippiPath}`);
        console.log('=== END DEBUG ===\n');
    }
}

// Create singleton instance
let liveMonitorInstance = null;

export function getLiveSlpMonitor() {
    if (!liveMonitorInstance) {
        liveMonitorInstance = new LiveSlpMonitor();
    }
    return liveMonitorInstance;
}

export default { LiveSlpMonitor, getLiveSlpMonitor };
