import { watchSlippiReplays } from './filebasedindex.js';
import { generateCoachingAdvice } from './aicoaching.js';
import { getConfig } from './utils/configManager.js';
import { characterNames } from './utils/slippiUtils.js';
import './utils/logger.js';
import os from 'os';
import path from 'path';

// Default Slippi replay locations by platform
const DEFAULT_REPLAY_PATHS = {
    win32: path.join(os.homedir(), 'Documents', 'Slippi'),
    darwin: path.join(os.homedir(), 'Library', 'Application Support', 'Slippi'),
    linux: path.join(os.homedir(), '.config', 'Slippi')
};

async function main() {
    console.log("Initializing Slippi Coach (File-Based Mode)...");
    
    // Validate API key
    const apiKey = getConfig('API_KEY');
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error('ERROR: Please set a valid API key in the .env file');
        console.error('Instructions: Update the .env file in the root directory with API_KEY=your_actual_api_key');
        process.exit(1);
    }
    
    // Determine replay directory
    const platform = process.platform;
    const defaultPath = DEFAULT_REPLAY_PATHS[platform] || DEFAULT_REPLAY_PATHS.win32;
    const replayDir = process.env.SLIPPI_REPLAY_DIR || defaultPath;
    
    console.log(`Using Slippi replay directory: ${replayDir}`);
    
    try {
        await watchSlippiReplays(replayDir, async (gameData) => {
            console.log("Game data received from parser");
            
            // Check if we have valid metadata
            if (gameData.metadata && gameData.metadata.startAt) {
                console.log(`Game started at: ${new Date(gameData.metadata.startAt).toLocaleString()}`);
            } else {
                console.log("Game metadata not available or start time missing");
            }
            
            // Extract player information safely with null checks
            const players = [];
            
            // Try to get player data from settings first
            if (gameData.settings && gameData.settings.players && Array.isArray(gameData.settings.players)) {
                gameData.settings.players.forEach((player, index) => {
                    if (player) {
                        const characterId = player.characterId;
                        const characterName = characterNames[characterId] || 'Unknown';
                        
                        players.push({
                            index,
                            character: characterName,
                            characterId: characterId,
                            type: player.type, // 0 = human, 1 = CPU, 2 = demo
                            playerIndex: player.playerIndex,
                            port: player.port || index + 1,
                            damage: gameData.playerStats?.damageDealt?.[index] || 0,
                            stocksLost: gameData.playerStats?.stockLosses?.[index] || 0
                        });
                    }
                });
            } 
            // Fallback to players array if available from parser
            else if (gameData.players && Array.isArray(gameData.players)) {
                players.push(...gameData.players.map(p => ({
                    ...p,
                    character: characterNames[p.characterId] || 'Unknown',
                    damage: gameData.playerStats?.damageDealt?.[p.index] || 0,
                    stocksLost: gameData.playerStats?.stockLosses?.[p.index] || 0
                })));
            }
            
            if (players.length > 0) {
                console.log("Matchup:");
                players.forEach(player => {
                    console.log(`Player ${player.port}: ${player.character} (Damage: ${player.damage.toFixed(1)}, Stocks Lost: ${player.stocksLost})`);
                });
                
                // Prepare data for AI coaching
                const matchData = {
                    damageDealt: players.map(p => p.damage),
                    stockLosses: players.map(p => p.stockLosses),
                    characters: players.map(p => p.character)
                };
                
                // Generate coaching advice
                try {
                    console.log("Generating coaching advice...");
                    const advice = await generateCoachingAdvice(apiKey, matchData);
                    console.log("\n===== COACHING ADVICE =====");
                    console.log(advice);
                    console.log("===========================\n");
                } catch (err) {
                    console.error(`Failed to generate coaching advice: ${err.message}`);
                }
            } else {
                console.log("No valid player data available in this replay file");
            }
        });
        
        console.log("Slippi Coach is now running in file monitoring mode!");
        console.log("Waiting for new replay files...");
        console.log("Press Ctrl+C to exit.");
    } catch (err) {
        console.error(`Failed to start file monitoring: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`Unexpected error: ${err.message}`);
    console.error("Stack trace:", err.stack);
    process.exit(1);
});