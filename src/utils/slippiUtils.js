// This file includes utility functions specifically for handling Slippi data, such as parsing frame data and extracting player statistics.

// Character names lookup table
export const characterNames = {
    0: "Captain Falcon",
    1: "Donkey Kong",
    2: "Fox",
    3: "Mr. Game & Watch",
    4: "Kirby",
    5: "Bowser",
    6: "Link",
    7: "Luigi",
    8: "Mario",
    9: "Marth",
    10: "Mewtwo",
    11: "Ness",
    12: "Peach",
    13: "Pikachu",
    14: "Ice Climbers",
    15: "Jigglypuff",
    16: "Samus",
    17: "Yoshi",
    18: "Zelda",
    19: "Sheik",
    20: "Falco",
    21: "Young Link",
    22: "Dr. Mario",
    23: "Roy",
    24: "Pichu",
    25: "Ganondorf"
};

function parseFrameData(frameData) {
    // Extract relevant information from frame data
    const players = frameData.players.map(player => ({
        stocks: player.post.stocks,
        percent: player.post.percent,
        characterId: player.characterId,
        actionStateId: player.post.actionStateId,
    }));
    return players;
}

function extractPlayerStatistics(frames) {
    const stats = frames.reduce((acc, frame) => {
        frame.players.forEach((player, index) => {
            if (!acc[index]) {
                acc[index] = { damageDealt: 0, stockLosses: 0, stocks: 4 };
            }
            
            // Track damage dealt
            if (player.post && player.post.damage) {
                acc[index].damageDealt += player.post.damage;
            }
            
            // Track stock losses
            if (player.post && player.post.stocks !== undefined) {
                if (player.post.stocks < acc[index].stocks) {
                    acc[index].stockLosses++;
                }
                acc[index].stocks = player.post.stocks;
            }
        });
        return acc;
    }, []);
    return stats;
}

function getMatchDuration(metadata) {
    return metadata.lastFrame || metadata.duration || 0;
}

export { parseFrameData, extractPlayerStatistics, getMatchDuration };