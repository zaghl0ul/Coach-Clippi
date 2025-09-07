// This file contains functions to read and interpret Slippi files. 
// It processes the game data, extracts relevant information, and prepares it for analysis and commentary.

import fs from 'fs';
// Use createRequire for CommonJS modules compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Direct require of the CommonJS distribution
const { SlpFile } = require('@slippi/slippi-js');

// Function to process a Slippi file and extract relevant data
async function processSlippiFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
    }

    let slp;
    try {
        slp = new SlpFile(filePath);
    } catch (err) {
        throw new Error(`Failed to open Slippi file: ${err.message}`);
    }

    const metadata = slp.getMetadata();
    const settings = slp.getSettings();
    const frames = slp.getFrames();

    return {
        metadata,
        settings,
        frames,
    };
}

// Function to extract player statistics from the Slippi data
function extractPlayerStats(settings, frames) {
    const playerStats = settings.players.map(player => ({
        characterId: player.characterId,
        stocks: 4, // Assuming 4 stocks at the start
        damageDealt: 0,
    }));

    frames.forEach(frame => {
        frame.players.forEach((playerFrame, index) => {
            if (playerFrame.post) {
                playerStats[index].stocks = playerFrame.post.stocks;
                playerStats[index].damageDealt += playerFrame.post.damage;
            }
        });
    });

    return playerStats;
}

// Function to get the match duration
function getMatchDuration(metadata) {
    return metadata.lastFrame || metadata.duration || 0;
}

export { processSlippiFile, extractPlayerStats, getMatchDuration };