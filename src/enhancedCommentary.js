// src/enhancedCommentary.js - Updated with OpenAI integration
import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

/**
 * Configuration constants
 */
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Enhanced commentary generator using OpenAI
 * Provides technically detailed commentary with frame data analysis
 * 
 * @param {string} apiKey - OpenAI API Key
 * @param {Array} events - Gameplay events to analyze
 * @param {Object} options - Configuration options for the API
 * @returns {Promise<string>} - The generated commentary
 */
export async function generateEnhancedCommentary(apiKey, events, options = {}) {
  if (!events || events.length === 0) return '';
  
  const {
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    gameContext = null,
    playerData = null,
    frameData = null,
    detailLevel = 'advanced'  // basic, intermediate, advanced, professional
  } = options;
  
  // Structured system prompt for advanced commentary
  const systemPrompt = `You are an expert Super Smash Bros. Melee commentator and analyst with deep technical knowledge of frame data, matchups, and competitive strategy. 
Your commentary should be insightful, engaging, and technically precise.

Detail level: ${detailLevel}
${gameContext ? `Game context: ${JSON.stringify(gameContext)}` : ''}
${playerData ? `Player data: ${JSON.stringify(playerData)}` : ''}
${frameData ? `Frame data highlights: ${JSON.stringify(frameData)}` : ''}

Provide commentary that:
1. Analyzes the technical execution of moves (L-cancels, wavedashing, shield pressure)
2. Discusses neutral game positioning and stage control
3. Identifies optimal and suboptimal decision-making
4. References matchup-specific knowledge and character frame data
5. Uses professional Melee terminology appropriately
`;

  // Format event data for analysis
  const eventPrompt = events.map(event => {
    let parsedEvent;
    try {
      parsedEvent = typeof event === 'string' ? JSON.parse(event) : event;
    } catch (e) {
      parsedEvent = { rawEvent: event };
    }
    
    return JSON.stringify(parsedEvent, null, 2);
  }).join('\n\n');
  
  // Construct the complete prompt with system instructions and event data
  const fullPrompt = `${systemPrompt}

Recent events to analyze:
${eventPrompt}

Provide insightful, technical commentary on these events, highlighting noteworthy execution, strategic choices, and potential optimizations. Be concise but technically detailed.`;

  try {
    // Use OpenAI for enhanced commentary
    return executeOpenAIRequest(apiKey, fullPrompt, {
      model: 'gpt-3.5-turbo', // Can upgrade to gpt-4 for more technical depth
      maxTokens,
      temperature,
      logRequest: true
    });
  } catch (error) {
    console.error('Error generating enhanced commentary:', error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw new Error(`Enhanced commentary generation failed: ${error.message}`);
  }
}

/**
 * Generates technically detailed coaching advice based on match statistics
 * 
 * @param {string} apiKey - OpenAI API Key
 * @param {Object} matchData - Match statistics and player data
 * @param {Object} options - Configuration options for the analysis
 * @returns {Promise<string>} - The generated coaching advice
 */
export async function generateTechnicalCoachingAdvice(apiKey, matchData, options = {}) {
  const {
    maxTokens = 1500,
    temperature = 0.6,
    playerHistory = null,
    focusAreas = []
  } = options;
  
  // Construct a detailed coaching prompt with technical focus
  const coachingPrompt = `
You are an elite-level Super Smash Bros. Melee coach analyzing a completed match.
Provide detailed, technical coaching advice that would be valuable to competitive players.

Match data:
${JSON.stringify(matchData, null, 2)}

${playerHistory ? `Player history:\n${JSON.stringify(playerHistory, null, 2)}` : ''}

${focusAreas.length > 0 ? `Requested focus areas: ${focusAreas.join(', ')}` : ''}

Your analysis should cover:
1. Character-specific technical execution (wavedashing, L-canceling, shield pressure, edge guarding)
2. Neutral game positioning and stage control
3. Punish game optimization and combo extensions
4. Matchup-specific strategies and counterpicks
5. Mental game and adaptation

For each insight, provide specific, actionable advice with frame data where relevant.
`;

  try {
    // Use OpenAI for technical coaching
    return executeOpenAIRequest(apiKey, coachingPrompt, {
      model: 'gpt-3.5-turbo',
      maxTokens,
      temperature,
      logRequest: true
    });
  } catch (error) {
    console.error('Error generating technical coaching advice:', error.message);
    if (error.response) {
      console.error('API error details:', error.response.data);
    }
    throw new Error(`Technical coaching advice generation failed: ${error.message}`);
  }
}