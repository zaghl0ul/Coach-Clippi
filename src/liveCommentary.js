// src/liveCommentary.js
import { generateTemplateCommentary } from './templateCommentarySystem.js';
import { COMMENTARY_STYLES, CACHE_EXPIRY } from './utils/constants.js';

// Cache for commentaries to reduce duplicate API calls
const commentaryCache = new Map();

/**
 * Provides dual-mode live commentary with both fast reactions and analytical insights
 * 
 * @param {Object} fastProvider - Fast response LLM provider for immediate reactions
 * @param {Object} analyticalProvider - Analytical LLM provider for deeper insights  
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Generated commentary object with fast and analytical responses
 */
export async function provideDualCommentary(fastProvider, analyticalProvider, events, options = {}) {
  if (!events || events.length === 0) return { fast: '', analytical: '' };
  
  const {
    eventType,
    commentaryStyle = COMMENTARY_STYLES.TECHNICAL,
    gameState = null,
    fastMaxTokens = 75,
    analyticalMaxTokens = 200,
    temperature = 0.7
  } = options;
  
  let event;
  try {
    event = typeof events[0] === 'string' ? JSON.parse(events[0]) : events[0];
    if (eventType && !event.type) {
      event.type = eventType;
    }
  } catch (e) {
    console.warn('Error parsing event for dual commentary:', e.message);
    return { fast: 'Great play!', analytical: 'Interesting strategic choice there.' };
  }
  
  console.log(`🎙️ Generating dual commentary for ${eventType}:`, event);
  
  // Generate both types of commentary in parallel
  const [fastCommentary, analyticalCommentary] = await Promise.allSettled([
    generateFastCommentary(fastProvider, event, { maxTokens: fastMaxTokens, temperature }),
    generateAnalyticalCommentary(analyticalProvider, event, gameState, { maxTokens: analyticalMaxTokens, temperature })
  ]);
  
  const result = {
    fast: fastCommentary.status === 'fulfilled' ? fastCommentary.value : 'Nice execution!',
    analytical: analyticalCommentary.status === 'fulfilled' ? analyticalCommentary.value : 'Solid strategic choice.'
  };
  
  console.log(`🎙️ DUAL COMMENTARY - Fast: "${result.fast}" | Analytical: "${result.analytical}"`);
  return result;
}

/**
 * Generate fast, immediate reaction commentary
 * @param {Object} provider - LLM provider
 * @param {Object} event - Event data  
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Fast commentary
 */
async function generateFastCommentary(provider, event, options = {}) {
  const prompt = `React to this Melee moment like a tournament commentator:
${JSON.stringify(event, null, 2)}

Give an excited play-by-play reaction. Focus on:
- Move names (up-smash, down-air, knee, etc.)
- Advanced techniques (multishine, Ken combo, tech chase, wavedash)
- Player actions and reads
- Match momentum

Do NOT mention damage percentages or frame data.
1 short sentence only - like you're calling it live at EVO!`;
  
  const systemPrompt = `You are a hype tournament commentator like D1, TK, or EE at a major Melee tournament. Give immediate excited reactions to plays. Focus on move names, techniques, and hype moments. Never mention damage percentages or technical frame data. Keep it short and energetic!`;
  
  try {
    if (!provider || provider.name === 'Template System') {
      return generateTemplateCommentary(event);
    }
    
    const commentary = await provider.generateCompletion(prompt, {
      maxTokens: options.maxTokens || 75,
      temperature: options.temperature || 0.8,
      systemPrompt
    });
    
    return commentary || generateTemplateCommentary(event);
  } catch (error) {
    console.error('Fast commentary error:', error.message);
    return generateTemplateCommentary(event);
  }
}

/**
 * Generate analytical, strategic commentary
 * @param {Object} provider - LLM provider
 * @param {Object} event - Event data
 * @param {Object} gameState - Game state context
 * @param {Object} options - Generation options
 * @returns {Promise<string>} - Analytical commentary
 */
async function generateAnalyticalCommentary(provider, event, gameState, options = {}) {
  const prompt = `Provide color commentary for this Melee moment:
${JSON.stringify(event, null, 2)}

${gameState ? `Game Context: ${JSON.stringify(gameState, null, 2)}` : ''}

Give brief color commentary about:
- Player momentum and match flow
- Notable patterns or downloads
- Player tendencies (aggressive, defensive, patient)
- Match narrative and storylines

Do NOT mention specific damage percentages or frame data.
1-2 sentences only - like Scar/Toph style commentary!`;

  const systemPrompt = `You are a Melee color commentator like Scar, Toph, or Vish at a major tournament. Provide brief observations about match flow, player tendencies, and storylines. Focus on the narrative and momentum, not technical details. Never mention damage percentages or frame data.`;
  
  try {
    if (!provider || provider.name === 'Template System') {
      return `Strategic analysis: This ${event.type || 'action'} shows good game sense and positioning.`;
    }
    
    const commentary = await provider.generateCompletion(prompt, {
      maxTokens: options.maxTokens || 200,
      temperature: options.temperature || 0.6,
      systemPrompt
    });
    
    return commentary || `Good strategic choice in that ${event.type || 'situation'}.`;
  } catch (error) {
    console.error('Analytical commentary error:', error.message);
    return `Solid decision-making in that ${event.type || 'exchange'}.`;
  }
}

/**
 * Provides live commentary based on gameplay events (legacy single-model function)
 * 
 * @param {Object} llmProvider - LLM provider instance
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Generated commentary
 */
export async function provideLiveCommentary(llmProvider, events, options = {}) {
  if (!events || events.length === 0) return '';
  
  const {
    eventType,
    commentaryStyle = COMMENTARY_STYLES.TECHNICAL,
    maxLength = 100,
    gameState = null,
    temperature = 0.75,
  } = options;
  
  // Parse and prepare the first event for processing
  let event;
  try {
    event = typeof events[0] === 'string' ? JSON.parse(events[0]) : events[0];
    
    // Add the event type to the event object if provided in options
    if (eventType && !event.type) {
      event.type = eventType;
    }
    
    console.log(`🎙️ Processing ${eventType || event.type || 'unknown'} event for commentary:`, event);
  } catch (e) {
    console.warn('Error parsing event:', e.message);
    return 'Exciting match action!';
  }
  
  // Generate cache key for deduplication
  const cacheKey = generateCacheKey(event, commentaryStyle);
  if (commentaryCache.has(cacheKey)) {
    const cached = commentaryCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY.COMMENTARY) {
      return cached.commentary;
    }
    commentaryCache.delete(cacheKey);
  }
  
  // If no LLM provider is available, use template system
  if (!llmProvider) {
    const commentary = generateTemplateCommentary(event, gameState);
    
    // Cache template results too
    if (commentary) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ TEMPLATE COMMENTARY: ${commentary}`);
    return commentary;
  }
  
  // Build LLM prompt with appropriate context and style
  const prompt = buildTechnicalCommentaryPrompt(event, commentaryStyle, null, gameState);
  
  try {
    console.log(`[${llmProvider.name}] Generating commentary...`);
    
    // Use provider abstraction for consistent interface
    const commentary = await llmProvider.generateCompletion(prompt, {
      maxTokens: maxLength,
      temperature,
      systemPrompt: getSystemPromptForStyle(commentaryStyle)
    });
    
    // Cache successful results
    if (commentary) {
      commentaryCache.set(cacheKey, {
        commentary,
        timestamp: Date.now()
      });
    }
    
    console.log(`🎙️ ${llmProvider.name.toUpperCase()} COMMENTARY: ${commentary || 'No response'}`);
    return commentary || 'Exciting gameplay!';
  } catch (err) {
    console.error('Error generating commentary:', err.message);
    
    // Graceful fallback to templates on error
    const fallbackCommentary = generateTemplateCommentary(event, gameState);
    console.log(`🎙️ FALLBACK: ${fallbackCommentary}`);
    return fallbackCommentary;
  }
}

/**
 * Helper function for style-specific system prompts
 * 
 * @param {string} style - Commentary style
 * @returns {string} - System prompt for the style
 */
function getSystemPromptForStyle(style) {
  const basePrompt = `You are a professional Super Smash Bros. Melee tournament commentator like D1, TK, Scar, or Toph. You know:
- Character moves and matchups
- Advanced techniques (wavedashing, multishines, Ken combos, tech chases)
- Tournament history and player storylines
- How to build hype and excitement

Provide authentic tournament commentary like at EVO or Genesis. Keep it to 1-2 short sentences. Never mention damage percentages or frame data numbers.`;

  switch (style) {
    case COMMENTARY_STYLES.TECHNICAL:
      return `${basePrompt}

Focus on move names and advanced techniques. Call out tech skill like "multishine!" or "perfect wavedash!"`;
    case COMMENTARY_STYLES.HYPE:
      return `${basePrompt}

Maximum energy! Get the crowd hyped! "DESTRUCTION!" "LET'S GO!" "WHAT A COMBO!"`;
    case COMMENTARY_STYLES.CASUAL:
      return `${basePrompt}

Keep it simple and accessible. "Great combo!" "Nice edgeguard!" "He got the read!"`;
    case COMMENTARY_STYLES.ANALYTICAL:
      return `${basePrompt}

Focus on match flow and player tendencies. "He's downloading him" "Momentum shift!" "Adapting to the pressure"`;
    default:
      return basePrompt;
  }
}

/**
 * Builds a prompt for commentary generation
 * 
 * @param {Object} event - Event to commentate
 * @param {string} style - Commentary style
 * @param {Object} eventContext - Additional event context
 * @param {Object} gameState - Game state
 * @returns {string} - Formatted prompt
 */
function buildTechnicalCommentaryPrompt(event, style, eventContext = null, gameState = null) {
  // Base system instruction
  let promptBase = `You are a Melee tournament commentator. Your commentary style is "${style}".

React to this event like you're commentating at a major tournament. NO damage percentages or frame data numbers!
`;

  // Add game state context if available
  if (gameState) {
    promptBase += `
Game State:
${JSON.stringify(gameState, null, 2)}
`;
  }

  // Add event data
  promptBase += `
Event: ${JSON.stringify(event, null, 2)}
`;

  // Add event-specific instructions
  switch(event.type) {
    case 'combo':
      promptBase += `
React to this combo! Focus on:
- Move names and techniques used
- Player execution ("clean!" "optimal!")
- Excitement level

One short tournament-style reaction!
`;
      break;
      
    case 'stockLost':
      promptBase += `
React to the stock loss! Focus on:
- How it happened (spike, smash attack, edgeguard)
- Match impact (last stock, early kill)
- Player performance

One short tournament-style reaction!
`;
      break;
      
    case 'actionState':
      promptBase += `
React to this technique! Focus on:
- Technique name (wavedash, multishine, tech)
- Execution quality (perfect, clean, clutch)
- Impact on the match

One short tournament-style reaction!
`;
      break;
      
    default:
      promptBase += `
Give a short tournament commentary reaction!
Focus on moves, techniques, and excitement!
`;
  }
  
  return promptBase;
}

/**
 * Generates a cache key for commentary deduplication
 * 
 * @param {Object} event - Event to generate key for
 * @param {string} style - Commentary style
 * @returns {string} - Cache key
 */
function generateCacheKey(event, style) {
  const eventType = event.type || 'unknown';
  const playerIndex = event.playerIndex !== undefined ? event.playerIndex : 'na';
  const additionalKey = (() => {
    switch (eventType) {
      case 'combo':
        return `${event.moves || '?'}-${event.damage || '?'}`;
      case 'stockLost':
        return `${event.remainingStocks || '?'}`;
      case 'actionState':
        return `${event.subType || 'generic'}`;
      default:
        return 'default';
    }
  })();
  
  return `${eventType}-${playerIndex}-${additionalKey}-${style}`;
}

export default { provideLiveCommentary };
