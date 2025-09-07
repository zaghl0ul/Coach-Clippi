// src/aiCoaching.js modification
import { generateFallbackCoaching } from './templateCoachingSystem.js';
import { characterNames } from './utils/slippiUtils.js';

/**
 * Creates an advanced coaching prompt tailored to match data
 * @param {Object} matchData - Match statistics and player data
 * @returns {string} - Formatted coaching prompt
 */
function createAdvancedCoachingPrompt(matchData) {
  // Format character info with readable names
  const players = matchData.characters.map((char, idx) => {
    // Handle both string character names and numeric character IDs
    const characterName = typeof char === 'string' ? char : characterNames[char] || `Character ${char}`;
    return {
      index: idx,
      character: characterName,
      damage: matchData.damageDealt[idx] || 0,
      stocks: matchData.stockLosses[idx] || 0,
      isHuman: matchData.playerTypes ? matchData.playerTypes[idx] !== 1 : true // Default to human if not specified
    };
  });
  
  // Construct a detailed coaching prompt
  let prompt = `You are an elite-level Super Smash Bros. Melee coach analyzing a completed match.

Match details:
`;
  
  // Add player information
  players.forEach(player => {
    prompt += `- Player ${player.index + 1}: ${player.character}${player.isHuman ? '' : ' (CPU)'}
`;
    prompt += `  * Damage dealt: ${player.damage.toFixed(1)}
`;
    prompt += `  * Stocks lost: ${player.stocks}
`;
  });
  
  // Add matchup-specific context for 1v1 matches
  if (players.length === 2) {
    prompt += `\nThis is a ${players[0].character} vs ${players[1].character} matchup.\n`;
  }
  
  // Add coaching instructions
  prompt += `\nProvide technical coaching advice that focuses on:
1. Character-specific technical execution
2. Neutral game improvements
3. Punish game optimization
4. Recovery and defensive options
5. Matchup-specific strategies\n`;
  
  // Tailor advice based on player's performance
  const targetIdx = players.findIndex(p => p.isHuman); // Focus on first human player if available
  if (targetIdx >= 0) {
    prompt += `\nFocus your coaching advice on Player ${targetIdx + 1} (${players[targetIdx].character}).`;
  }
  
  return prompt;
}

/**
 * Generates coaching advice using AI or templates
 * @param {Object} llmProvider - LLM provider instance
 * @param {Object} matchData - Match statistics and player data
 * @returns {Promise<string>} - Coaching advice
 */
export async function generateCoachingAdvice(llmProvider, matchData) {
  if (!matchData || !matchData.characters || !matchData.damageDealt || !matchData.stockLosses) {
    console.warn("[AI Coaching] Insufficient match data provided.");
    return "Cannot generate coaching advice: Missing essential match data (characters, damage, stocks).";
  }
  
  // If no LLM provider, use template-based coaching
  if (!llmProvider) {
    console.log("[Template] Generating coaching advice using templates...");
    return generateFallbackCoaching(matchData);
  }
  
  // Construct advanced coaching prompt
  const prompt = createAdvancedCoachingPrompt(matchData);
  
  try {
    console.log(`[${llmProvider.name}] Generating coaching advice...`);
    
    // Use provider abstraction for coaching generation
    const advice = await llmProvider.generateCompletion(prompt, {
      maxTokens: 800, // Reduced for faster responses
      temperature: 0.7,
      systemPrompt: 'You are an elite-level Super Smash Bros. Melee coach with technical expertise.'
    });
    
    console.log(`[${llmProvider.name}] Coaching advice generated successfully.`);
    return advice || "Unable to generate coaching advice.";
  } catch (error) {
    console.error('[AI Coaching] Error:', error.message);
    
    // Fallback to template coaching
    return generateFallbackCoaching(matchData);
  }
}