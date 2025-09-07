// src/templateCommentarySystem.js
import { STAGE_NAMES } from './utils/constants.js';

/**
 * Generates template-based commentary without requiring an LLM
 * @param {Object|string} event - Event to generate commentary for
 * @param {Object} gameState - Optional game state context
 * @returns {string} - Generated commentary
 */
export function generateTemplateCommentary(event, gameState = null) {
  // Parse the event if it's a string
  if (typeof event === 'string') {
    try {
      event = JSON.parse(event);
    } catch (e) {
      console.warn('Failed to parse event for template commentary:', e.message);
      return 'Something interesting just happened!';
    }
  }
  
  console.log(`🎭 Generating template commentary for ${event.type || 'unknown'} event:`, event);
  
  // Get event type and select appropriate template
  switch(event.type) {
    case 'hit':
      return generateHitTemplate(event);
    case 'combo':
      return generateComboTemplate(event);
    case 'stockChange':
    case 'stockLost':
      return generateStockLostTemplate(event);
    case 'actionState':
      return generateActionStateTemplate(event);
    case 'gameStart':
      return generateGameStartTemplate(event, gameState);
    case 'gameEnd':
      return generateGameEndTemplate(event, gameState);
    case 'frameUpdate':
      return generateFrameUpdateTemplate(event, gameState);
    default:
      console.log(`🎭 No specific template for event type: ${event.type}`);
      return 'Great gameplay action!';
  }
}

/**
 * Generate commentary for hits
 * @param {Object} event - Hit event data
 * @returns {string} - Generated commentary
 */
function generateHitTemplate(event) {
  const { characterName } = event;
  const character = characterName || 'Fighter';
  
  const templates = [
    `${character} gets hit!`,
    `Clean hit on ${character}!`,
    `${character} takes the hit!`,
    `Connected!`,
    `${character} gets tagged!`,
    `Solid hit!`,
    `That connects!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for combos
 * @param {Object} event - Combo event data
 * @returns {string} - Generated commentary
 */
function generateComboTemplate(event) {
  const { hitCount, characterName } = event;
  const character = characterName || 'Fighter';
  
  // Handle data from the live monitoring system
  const safeHitCount = hitCount || 2;
  
  const templates = [
    `Huge combo on ${character}!`,
    `${safeHitCount}-hit combo!`,
    `Beautiful combo!`,
    `${character} getting juggled!`,
    `Combo continues!`,
    `String of hits!`,
    `Clean combo!`,
    `He's not done yet!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for stock losses
 * @param {Object} event - Stock loss event data
 * @returns {string} - Generated commentary
 */
function generateStockLostTemplate(event) {
  const { stocksRemaining, characterName } = event;
  const character = characterName || 'Fighter';
  
  // Handle data from the live monitoring system
  const safeStocks = stocksRemaining !== undefined ? stocksRemaining : 0;
  
  if (safeStocks === 0) {
    const templates = [
      `${character} loses the last stock!`,
      `That's game!`,
      `${character} is eliminated!`,
      `Game over!`,
      `And that's it!`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  const templates = [
    `${character} loses a stock!`,
    `There goes the stock!`,
    `${character} sent to the blast zone!`,
    `Stock down for ${character}!`,
    `${character} gets eliminated!`,
    safeStocks === 1 ? `Last stock situation for ${character}!` : `${safeStocks} stocks left!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for action states (technical executions)
 * @param {Object} event - Action state event data
 * @returns {string} - Generated commentary
 */
function generateActionStateTemplate(event) {
  const { subType, playerCharacter, details } = event;
  
  // Handle undefined values
  const safeCharacter = playerCharacter || 'Fighter';
  
  switch (subType) {
    case 'wavedash-land':
      const templates = [
        `Perfect wavedash from ${safeCharacter}!`,
        `Clean wavedash to reposition by ${safeCharacter}.`,
        `${safeCharacter} executes a frame-perfect wavedash.`
      ];
      return templates[Math.floor(Math.random() * templates.length)];
      
    case 'l-cancel-attempt':
      const aerialType = details?.aerial || 'aerial';
      const lCancelTemplates = [
        `${safeCharacter} L-cancels that ${aerialType}!`,
        `Nice L-cancel on the ${aerialType} from ${safeCharacter}.`,
        `Quick L-cancel to maintain pressure by ${safeCharacter}.`
      ];
      return lCancelTemplates[Math.floor(Math.random() * lCancelTemplates.length)];
      
    case 'tech':
      const techType = details?.techType || 'tech';
      const techTemplates = [
        `${safeCharacter} techs ${techType}!`,
        `Good ${techType} tech by ${safeCharacter}.`,
        `${safeCharacter} saves position with a ${techType} tech.`
      ];
      return techTemplates[Math.floor(Math.random() * techTemplates.length)];
      
    case 'tech-miss':
      const missTemplates = [
        `${safeCharacter} misses the tech!`,
        `No tech from ${safeCharacter}!`,
        `${safeCharacter} fails to tech that hit.`
      ];
      return missTemplates[Math.floor(Math.random() * missTemplates.length)];
      
    case 'shield':
      const shieldTemplates = [
        `${safeCharacter} shields the attack.`,
        `Quick defensive shield from ${safeCharacter}.`,
        `${safeCharacter} puts up the shield.`
      ];
      return shieldTemplates[Math.floor(Math.random() * shieldTemplates.length)];
      
    case 'grab':
      const grabTemplates = [
        `${safeCharacter} gets the grab!`,
        `Grab opportunity for ${safeCharacter}.`,
        `${safeCharacter} secures a grab.`
      ];
      return grabTemplates[Math.floor(Math.random() * grabTemplates.length)];
      
    case 'recovery':
      const recoveryTemplates = [
        `${safeCharacter} recovers with up-B.`,
        `Recovery attempt from ${safeCharacter}.`,
        `${safeCharacter} uses up-B to get back.`
      ];
      return recoveryTemplates[Math.floor(Math.random() * recoveryTemplates.length)];
      
    default:
      return `Technical execution from ${safeCharacter}!`;
  }
}

/**
 * Generate commentary for game start
 * @param {Object} event - Game start event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateGameStartTemplate(event, gameState = null) {
  const fileName = event.fileName || 'Game';
  
  const templates = [
    `New game starting! Let's see some action!`,
    `Match begins! Get ready for some technical gameplay.`,
    `Here we go! Time for some Melee action!`,
    `Game on! Let's watch the neutral game develop.`,
    `Fresh match detected! Time to analyze the gameplay.`,
    `New set starting - let's see who takes control!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for game end
 * @param {Object} event - Game end event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateGameEndTemplate(event, gameState = null) {
  const { endType, lrasQuitter, winnerIndex } = event;
  
  // Handle LRAS (Leave Run And Start) quitter
  if (endType === "No Contest" && lrasQuitter !== undefined) {
    return `Game ended early - Player ${lrasQuitter + 1} has left the match.`;
  }
  
  // Use game state to determine winner and loser if available
  let winner = "The winner";
  let loser = "the opponent";
  
  if (gameState && gameState.players && winnerIndex !== undefined && winnerIndex !== -1) {
    const winnerPlayer = gameState.players.find(p => p.index === winnerIndex);
    if (winnerPlayer) {
      winner = winnerPlayer.character || "Player " + (winnerPlayer.port || (winnerIndex + 1));
    }
    
    // Find the other player as loser
    const loserPlayer = gameState.players.find(p => p.index !== winnerIndex);
    if (loserPlayer) {
      loser = loserPlayer.character || "Player " + (loserPlayer.port || (loserPlayer.index + 1));
    }
  }
  
  const templates = [
    `Game! ${winner} takes the victory over ${loser}.`,
    `That's it! ${winner} clutches out the win against ${loser}.`,
    `Match complete! ${winner} bests ${loser} in a hard-fought set.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Generate commentary for frame updates
 * @param {Object} event - Frame update event data
 * @param {Object} gameState - Game state context
 * @returns {string} - Generated commentary
 */
function generateFrameUpdateTemplate(event, gameState = null) {
  // Frame updates typically just provide status commentary
  const frameNum = event.frame;
  const gameMinute = Math.floor(frameNum / 3600);
  const gameSecond = Math.floor((frameNum % 3600) / 60);
  
  const templates = [
    `${gameMinute}:${gameSecond.toString().padStart(2, '0')} on the clock.`,
    `The match continues!`,
    `Battle rages on!`,
    `Let's see who takes control!`,
    `Match is heating up!`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

// Export both the default function and named exports
export default { generateTemplateCommentary };
