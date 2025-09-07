// src/hybridCommentary.js
import { characterNames } from './utils/slippiUtils.js';
import { getConfig } from './utils/configManager.js';

// Import templates from templateCommentary
import { generateTemplateCommentary } from './templateCommentary.js';

// Import the OpenAI handler
import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

// Import constants
import { COMMENTARY_STYLES } from './utils/constants.js';

// Cache for LLM-generated commentary to reduce API calls
const commentaryCache = new Map();
const CACHE_EXPIRY = 30000; // 30 seconds

/**
 * Commentary modes for hybrid approach
 */
const COMMENTARY_MODES = {
  TEMPLATE_ONLY: 'template-only',  // Use only templates, no LLM
  LLM_ONLY: 'llm-only',            // Use only LLM
  HYBRID: 'hybrid',                // Use templates for common events, LLM for complex
  ADAPTIVE: 'adaptive'             // Automatically choose based on context
};

/**
 * Event complexity classification for adaptive mode
 */
const EVENT_COMPLEXITY = {
  'stockLost': 'simple',
  'combo': complexity => complexity.moves > 3 ? 'complex' : 'simple',
  'gameStart': 'simple',
  'gameEnd': 'simple',
  'actionState': 'simple',
  'frameUpdate': 'simple',
  'technical': 'complex'
};

/**
 * Main hybrid commentary function that intelligently combines templates and LLM
 * 
 * @param {string} apiKey - OpenAI API key or 'local' for local LLM
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Generated commentary
 */
export async function provideHybridCommentary(apiKey, events, options = {}) {
  if (!events || events.length === 0) return null;
  
  const {
    commentaryMode = COMMENTARY_MODES.ADAPTIVE,
    maxTokens = 100,
    temperature = 0.7,
    gameState = null,
    cacheEnabled = true,
    localEndpoint = process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1'
  } = options;
  
  // Parse event for decision making
  let event;
  try {
    event = typeof events[0] === 'string' ? JSON.parse(events[0]) : events[0];
  } catch (e) {
    console.error('Error parsing event:', e);
    // Fall back to template mode on parse error
    return generateTemplateCommentary(events, gameState);
  }
  
  // Generate a cache key if caching is enabled
  const cacheKey = cacheEnabled ? 
    `${event.type}-${event.playerIndex}-${JSON.stringify(event).slice(0, 50)}` : null;
  
  // Check cache first
  if (cacheKey && commentaryCache.has(cacheKey)) {
    const cached = commentaryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.commentary;
    }
    // Remove expired cache entry
    commentaryCache.delete(cacheKey);
  }
  
  // Determine which mode to use based on settings and event
  let useTemplates = true; // Default to templates
  
  if (commentaryMode === COMMENTARY_MODES.LLM_ONLY) {
    // Always use LLM
    useTemplates = false;
  } else if (commentaryMode === COMMENTARY_MODES.TEMPLATE_ONLY) {
    // Always use templates
    useTemplates = true;
  } else if (commentaryMode === COMMENTARY_MODES.ADAPTIVE) {
    // Determine complexity and choose accordingly
    const complexity = getEventComplexity(event);
    useTemplates = complexity === 'simple';
  }
  
  // Use template system if determined or if no API key available
  if (useTemplates || !apiKey) {
    const commentary = generateTemplateCommentary(events, gameState);
    
    // Add to cache if enabled
    if (cacheKey) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ TEMPLATE COMMENTARY: ${commentary}`);
    return commentary;
  }
  
  // Otherwise, use the LLM-based implementation
  try {
    // Prepare the prompt with enhanced context
    const systemContext = getSystemContext(event, gameState);
    const prompt = buildCommentaryPrompt(event, systemContext);
    
    // Get LLM options based on API key
    const llmOptions = {
      maxTokens,
      temperature,
      logRequest: false
    };
    
    // Add local endpoint if using local LLM
    if (apiKey === 'local') {
      llmOptions.localEndpoint = localEndpoint;
      llmOptions.useLocalModel = true;
    }
    
    // Execute the request
    const result = await executeOpenAIRequest(apiKey, prompt, llmOptions);
    
    // Add to cache if enabled
    if (cacheKey && result) {
      commentaryCache.set(cacheKey, {
        commentary: result,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ ${apiKey === 'local' ? 'LOCAL LLM' : 'API'} COMMENTARY: ${result}`);
    return result;
  } catch (error) {
    console.error('Error generating LLM commentary:', error.message);
    
    // Fallback to templates if LLM fails
    const fallbackCommentary = generateTemplateCommentary(events, gameState);
    console.log(`🎙️ FALLBACK TEMPLATE: ${fallbackCommentary}`);
    return fallbackCommentary;
  }
}

/**
 * Determines the complexity of an event to decide template vs LLM
 * 
 * @param {Object} event - Event to analyze
 * @returns {string} - 'simple' or 'complex'
 */
function getEventComplexity(event) {
  const eventType = event.type;
  
  if (!EVENT_COMPLEXITY[eventType]) {
    return 'simple'; // Default to simple for unknown events
  }
  
  // Handle functional complexity determiners
  if (typeof EVENT_COMPLEXITY[eventType] === 'function') {
    return EVENT_COMPLEXITY[eventType](event);
  }
  
  return EVENT_COMPLEXITY[eventType];
}

/**
 * Builds system context for more informed commentary by aggregating match state
 * 
 * @param {Object} event - Current event
 * @param {Object} gameState - Game state information
 * @returns {string} - Formatted system context
 */
function getSystemContext(event, gameState) {
  let context = 'Super Smash Bros. Melee match in progress.\n';
  
  // Add game state if available
  if (gameState) {
    // Add player information
    if (gameState.players && gameState.players.length > 0) {
      context += 'Players:\n';
      gameState.players.forEach((player, index) => {
        context += `- Player ${index + 1}: ${player.character || 'Unknown'} (Port ${player.port || index + 1})\n`;
      });
    }
    
    // Add stock information
    if (gameState.stocks) {
      context += 'Current stocks:\n';
      gameState.stocks.forEach((stocks, index) => {
        context += `- Player ${index + 1}: ${stocks} stocks\n`;
      });
    }
    
    // Add percent information
    if (gameState.percent) {
      context += 'Current damage percentages:\n';
      gameState.percent.forEach((percent, index) => {
        if (typeof percent === 'number') {
          context += `- Player ${index + 1}: ${percent.toFixed(1)}%\n`;
        }
      });
    }
    
    // Add stage information
    if (gameState.stage) {
      const stageName = getStageNameById(gameState.stage);
      context += `Stage: ${stageName}\n`;
    }
    
    // Add game timer information
    if (gameState.gameTime !== undefined) {
      const minutes = Math.floor(gameState.gameTime / 60);
      const seconds = gameState.gameTime % 60;
      context += `Match time: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
    }
    
    // Add frame information for technical precision
    if (gameState.frame !== undefined) {
      context += `Current frame: ${gameState.frame}\n`;
    }
  }
  
  return context;
}

/**
 * Gets stage name from stage ID
 * 
 * @param {number} stageId - Melee stage ID
 * @returns {string} - Stage name
 */
function getStageNameById(stageId) {
  const stages = {
    2: "Fountain of Dreams",
    3: "Pokémon Stadium",
    8: "Yoshi's Story",
    28: "Dream Land",
    31: "Battlefield",
    32: "Final Destination",
    // Add other stages as needed
  };
  
  return stages[stageId] || `Stage ${stageId}`;
}

/**
 * Builds a technically precise prompt for commentary generation
 * 
 * @param {Object} event - Current event to commentate
 * @param {string} systemContext - Contextual information about the match
 * @returns {string} - Formatted prompt for LLM
 */
function buildCommentaryPrompt(event, systemContext) {
  // Base system instruction for technical accuracy
  let promptBase = `You are an expert Super Smash Bros. Melee commentator with deep knowledge of frame data, 
competitive play, and technical execution. Provide brief, technically accurate, and insightful commentary 
for the following event.

${systemContext}

Current event: ${JSON.stringify(event, null, 2)}

`;

  // Add event-specific instructions for technical accuracy
  switch(event.type) {
    case 'combo':
      promptBase += `
For this combo, focus on:
- Frame advantage of the starter move
- Technical execution quality
- DI expectations and opponent counterplay opportunities
- Follow-up potential based on percent and positioning

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    case 'stockLost':
      promptBase += `
For this stock loss, focus on:
- Kill confirm technical execution
- Percent thresholds for the character matchup
- Stage positioning factors
- Potential DI or technical escape options

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    case 'actionState':
      promptBase += `
For this technical execution, focus on:
- Frame-perfect timing requirements
- Positional advantages gained
- Risk/reward assessment
- Follow-up opportunities created

Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
`;
      break;
      
    default:
      promptBase += `
Provide a single, concise line of commentary (30-60 characters) that would be spoken by a professional commentator.
Focus on technical execution, strategic implications, and competitive relevance.
`;
  }
  
  return promptBase;
}

// Export the main functions
export { 
  COMMENTARY_MODES,
  COMMENTARY_STYLES,
  generateTemplateCommentary
};