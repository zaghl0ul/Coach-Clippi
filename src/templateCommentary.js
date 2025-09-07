// src/templateCommentary.js
import { characterNames } from './utils/slippiUtils.js';

// Commentary template collections for different event types
const TEMPLATES = {
  stockLost: [
    "Player {player} ({character}) loses a stock! {remainingStocks} stocks remaining.",
    "{character} goes down! Player {player} now at {remainingStocks} stocks.",
    "That's a stock gone for {character}! Player {player} has {remainingStocks} left."
  ],
  
  combo: [
    "Impressive {moveCount}-hit combo from Player {player}'s {character} dealing {damage}% damage!",
    "Player {player} executes a clean {moveCount}-hit string with {character} for {damage}%!",
    "Nice conversion from {character}! Player {player}'s {moveCount}-hit combo dealt {damage}%."
  ],
  
  gameStart: [
    "Match starting: {player1} ({char1}) vs {player2} ({char2}) on {stage}!",
    "Here we go! {char1} facing off against {char2} on {stage}.",
    "Battle begins between {char1} and {char2} on {stage}. Let's see some tech skill!"
  ],
  
  gameEnd: [
    "Game! {winner} takes the victory over {loser}.",
    "That's it! {winner} clutches out the win against {loser}.",
    "Match complete! {winner} bests {loser} in a {matchDescription} set."
  ],
  
  technical: {
    wavedash: [
      "Perfect wavedash from {character}!",
      "Clean wavedash to reposition by {character}.",
      "Frame-perfect wavedash to gain stage control."
    ],
    lCancel: [
      "Flawless L-cancel into follow-up!",
      "Perfect L-cancel to reduce landing lag.",
      "Quick L-cancel to maintain pressure."
    ],
    dashDance: [
      "Excellent dash dance to bait out a response.",
      "Great spacing with that dash dance.",
      "Perfect dash dance to control neutral."
    ],
    shine: [
      "Multi-shine pressure from {character}!",
      "Shine out of shield to punish!",
      "Perfect shine to start the combo."
    ]
  }
};

// Stage names for commentary
const STAGE_NAMES = {
  2: "Fountain of Dreams",
  3: "Pokémon Stadium",
  8: "Yoshi's Story",
  28: "Dream Land",
  31: "Battlefield",
  32: "Final Destination"
};

/**
 * Generates template-based commentary without requiring an LLM
 * 
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} gameContext - Additional game state information
 * @returns {string} - Generated commentary
 */
export function generateTemplateCommentary(events, gameContext = null) {
  if (!events || events.length === 0) {
    return null;
  }
  
  // Parse the first event (we typically process one event at a time)
  let event;
  try {
    event = typeof events[0] === 'string' ? JSON.parse(events[0]) : events[0];
  } catch (e) {
    console.error('Error parsing event:', e);
    return 'Something interesting just happened in the match!';
  }
  
  // Get the appropriate template collection based on event type
  let templateCollection;
  let replacements = {};
  
  switch (event.type) {
    case 'stockLost':
      templateCollection = TEMPLATES.stockLost;
      replacements = {
        player: event.playerIndex + 1,
        character: event.playerCharacter || 'Player',
        remainingStocks: event.remainingStocks
      };
      break;
      
    case 'combo':
      templateCollection = TEMPLATES.combo;
      replacements = {
        player: event.playerIndex + 1,
        character: event.playerCharacter || 'Player',
        moveCount: event.moves || '?',
        damage: typeof event.damage === 'number' ? event.damage.toFixed(1) : event.damage || '?'
      };
      break;
      
    case 'gameStart':
      templateCollection = TEMPLATES.gameStart;
      
      // Extract player characters from context
      const characters = event.matchup || [];
      const stageName = STAGE_NAMES[event.stage] || 'this stage';
      
      replacements = {
        player1: 'Player 1',
        player2: 'Player 2',
        char1: characters[0] || 'Player 1',
        char2: characters[1] || 'Player 2',
        stage: stageName
      };
      break;
      
    case 'gameEnd':
      templateCollection = TEMPLATES.gameEnd;
      replacements = {
        winner: event.winner || 'The winner',
        loser: event.loser || 'the opponent',
        matchDescription: getMatchDescription(gameContext)
      };
      break;
      
    case 'actionState':
      // Handle technical actions like wavedashes, l-cancels, etc.
      if (event.subType && TEMPLATES.technical[event.subType]) {
        templateCollection = TEMPLATES.technical[event.subType];
        replacements = {
          character: event.playerCharacter || `Player ${event.playerIndex + 1}`,
          quality: event.quality || 'nice',
          details: event.details || {}
        };
      } else {
        // Generic technical commentary fallback
        return `Technical execution from Player ${event.playerIndex + 1}!`;
      }
      break;
      
    default:
      // Generic commentary fallback
      return `Exciting moment in the match!`;
  }
  
  // Select a random template from the collection
  const template = getRandomTemplate(templateCollection);
  
  // Fill in the template with event data
  return fillTemplate(template, replacements);
}

/**
 * Selects a random template from the collection
 * 
 * @param {Array} templateCollection - Collection of template strings
 * @returns {string} - Selected template
 */
function getRandomTemplate(templateCollection) {
  if (!templateCollection || templateCollection.length === 0) {
    return 'Something happened in the match!';
  }
  
  const index = Math.floor(Math.random() * templateCollection.length);
  return templateCollection[index];
}

/**
 * Fills a template string with replacement values
 * 
 * @param {string} template - Template string with {placeholders}
 * @param {Object} replacements - Key-value pairs for replacements
 * @returns {string} - Filled template
 */
function fillTemplate(template, replacements) {
  let result = template;
  
  // Replace each placeholder with its value
  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(placeholder, value);
  });
  
  return result;
}

/**
 * Generates a match description based on game context
 * 
 * @param {Object} gameContext - Additional game information
 * @returns {string} - Match description
 */
function getMatchDescription(gameContext) {
  if (!gameContext) return 'competitive';
  
  // Example: If we have stock information, describe the closeness
  if (gameContext.stocks) {
    const remainingStocks = gameContext.stocks.filter(s => s > 0);
    if (remainingStocks.length > 0 && remainingStocks[0] === 1) {
      return 'nail-biting';
    }
  }
  
  // Add more descriptors based on other game context data
  return 'hard-fought';
}

/**
 * Main commentary function that can use template system in place of LLM
 * 
 * @param {string} apiKey - API key (ignored in template mode)
 * @param {Array} events - Gameplay events to comment on
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Generated commentary
 */
export async function provideLiveCommentary(apiKey, events, options = {}) {
  // If no API key or specifically set to use templates, use the template system
  if (!apiKey || options.useTemplates) {
    const commentary = generateTemplateCommentary(events, options.gameState);
    console.log(`🎙️ TEMPLATE COMMENTARY: ${commentary}`);
    return commentary;
  }
  
  // Otherwise, use the existing API-based implementation
  // This would be your existing code from liveCommentary.js
  try {
    // Import the OpenAI handler dynamically
    const { executeOpenAIRequest } = await import('./utils/api/openaiHandler.js');
    
    // Build the prompt (simplified version)
    const prompt = `Generate a short, exciting commentary line for this Smash Bros Melee event: ${JSON.stringify(events[0])}`;
    
    // Execute the request
    const result = await executeOpenAIRequest(apiKey, prompt, {
      maxTokens: 100,
      temperature: 0.7
    });
    
    console.log(`🎙️ AI COMMENTARY: ${result}`);
    return result;
  } catch (error) {
    console.error('Error generating AI commentary:', error.message);
    
    // Fallback to templates if AI fails
    const fallbackCommentary = generateTemplateCommentary(events, options.gameState);
    console.log(`🎙️ FALLBACK TEMPLATE: ${fallbackCommentary}`);
    return fallbackCommentary;
  }
}