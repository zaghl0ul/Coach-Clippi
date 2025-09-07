// Defensive Slippi replay parser with comprehensive error handling
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Use SlippiGame instead of SlpFile for proper API access
const { SlippiGame } = require('@slippi/slippi-js');
import { extractPlayerStatistics } from './utils/slippiUtils.js';

// Watches a directory for new .slp files and processes them
export async function watchSlippiReplays(directoryPath, onGameProcessed) {
    console.log(`Monitoring directory for Slippi replays: ${directoryPath}`);
    
    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
        console.error(`Directory not found: ${directoryPath}`);
        throw new Error(`Slippi replay directory not found: ${directoryPath}`);
    }
    
    // Track processed files to avoid re-processing
    const processedFiles = new Set();
    
    // Process function for individual replay files
    async function processFile(filePath) {
        if (processedFiles.has(filePath)) return;
        
        try {
            console.log(`Processing replay file: ${filePath}`);
            // Use SlippiGame instead of SlpFile for proper API access
            const game = new SlippiGame(filePath);
            
            // Load basic metadata using the correct API - with defensive null checks
            let metadata = null;
            let settings = null;
            let stats = null;
            let frames = null;
            
            try {
                metadata = game.getMetadata() || {};
                console.log("Metadata parsed successfully");
            } catch (metadataErr) {
                console.error(`Failed to parse metadata: ${metadataErr.message}`);
                metadata = {};
            }
            
            try {
                settings = game.getSettings() || {};
                console.log(`Settings parsed successfully${settings.gameMode ? ': ' + settings.gameMode : ''}`);
            } catch (settingsErr) {
                console.error(`Failed to parse settings: ${settingsErr.message}`);
                settings = {};
            }
            
            try {
                stats = game.getStats() || {};
                console.log("Stats parsed successfully");
            } catch (statsErr) {
                console.error(`Failed to parse stats: ${statsErr.message}`);
                stats = {};
            }
            
            try {
                frames = game.getFrames() || {};
                console.log(`Parsed ${Object.keys(frames).length} frames`);
            } catch (framesErr) {
                console.error(`Failed to parse frames: ${framesErr.message}`);
                frames = {};
            }
            
            // Extract player data with defensive coding
            const playerStats = {
                damageDealt: [],
                stockLosses: []
            };
            
            // Safely extract player stats if available
            if (stats && stats.overall && Array.isArray(stats.overall)) {
                stats.overall.forEach((player, index) => {
                    if (player) {
                        playerStats.damageDealt[index] = player.totalDamage || 0;
                        playerStats.stockLosses[index] = player.stocksLost || 0;
                    }
                });
                console.log(`Extracted stats for ${stats.overall.length} players`);
            } else {
                console.log("No player stats available in this replay");
            }
            
            // Extract players from settings if available
            const players = [];
            if (settings && settings.players && Array.isArray(settings.players)) {
                settings.players.forEach((player, index) => {
                    if (player) {
                        players.push({
                            index,
                            characterId: player.characterId,
                            type: player.type, // 0 = human, 1 = CPU, 2 = demo
                            playerIndex: player.playerIndex,
                            port: player.port || index + 1
                        });
                    }
                });
                console.log(`Extracted data for ${players.length} players`);
            }
            
            // Mark as processed
            processedFiles.add(filePath);
            
            // Check if we have enough valid data to process
            if (!metadata.startAt && !settings.players && !stats.overall) {
                console.warn("This replay file appears to be corrupted or empty");
                return;
            }
            
            // Call the callback with the processed game data
            onGameProcessed({
                filePath,
                metadata,
                settings,
                stats,
                playerStats,
                players
            });
            
        } catch (err) {
            console.error(`Error processing ${filePath}: ${err.message}`);
            console.error(err.stack);
        }
    }
    
    // Initial scan of existing files
    const files = fs.readdirSync(directoryPath)
        .filter(file => file.endsWith('.slp'))
        .map(file => path.join(directoryPath, file));
    
    // Sort by creation time, newest first
    files.sort((a, b) => {
        return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
    });
    
    // Process most recent file if it exists (limit to just the most recent one)
    if (files.length > 0) {
        console.log(`Found ${files.length} replay files. Processing most recent: ${path.basename(files[0])}`);
        await processFile(files[0]);
    } else {
        console.log("No existing replay files found. Waiting for new files...");
    }
    
    // Watch for new files
    const watcher = fs.watch(directoryPath, async (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.slp')) {
            const filePath = path.join(directoryPath, filename);
            
            // Wait a moment to ensure the file is completely written
            // Some applications lock files during writing
            setTimeout(async () => {
                if (fs.existsSync(filePath)) {
                    console.log(`New replay file detected: ${filename}`);
                    await processFile(filePath);
                }
            }, 1000); // 1 second delay
        }
    });
    
    console.log("Watching for new Slippi replay files...");
    
    // Return the watcher so it can be closed if needed
    return watcher;
}