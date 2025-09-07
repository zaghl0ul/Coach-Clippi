// src/utils/constants.js
/**
 * Centralized constants module for Slippi Coach
 * Provides consistent enumeration values across all modules
 */

/**
 * Commentary styles for different tone and focus
 */
export const COMMENTARY_STYLES = {
  TECHNICAL: 'technical',  // Frame data and technical execution focused
  HYPE: 'hype',            // Excitement and energy focused
  CASUAL: 'casual',        // Accessible for non-technical viewers
  ANALYTICAL: 'analytical' // Strategic and decision-making focused
};

/**
 * Commentary modes for determining template vs LLM usage
 */
export const COMMENTARY_MODES = {
  TEMPLATE_ONLY: 'template-only',  // Use only templates, no LLM
  LLM_ONLY: 'llm-only',            // Use only LLM
  HYBRID: 'hybrid',                // Use templates for common events, LLM for complex
  ADAPTIVE: 'adaptive'             // Automatically choose based on context
};

/**
 * Coaching profiles for different focus areas
 */
export const COACHING_PROFILES = {
  TECHNICAL_EXECUTION: 'technical-execution',  // Focus on frame-perfect inputs
  NEUTRAL_GAME: 'neutral-game',                // Focus on spacing, stage control
  PUNISH_OPTIMIZATION: 'punish-optimization',  // Focus on combo extensions
  MATCHUP_SPECIFIC: 'matchup-specific',        // Focus on character matchup
  DEFENSIVE_OPTIONS: 'defensive-options',       // Focus on defense and recovery
  COMPREHENSIVE: 'comprehensive'               // Balanced approach
};

/**
 * Cache expiry times for different types of data
 */
export const CACHE_EXPIRY = {
  COMMENTARY: 30000,  // 30 seconds for commentary
  COACHING: 3600000   // 1 hour for coaching
};

/**
 * Event complexity classification for adaptive mode
 */
export const EVENT_COMPLEXITY = {
  'stockLost': 'simple',
  'combo': complexity => complexity.moves > 3 ? 'complex' : 'simple',
  'gameStart': 'simple',
  'gameEnd': 'simple',
  'actionState': 'simple',
  'frameUpdate': 'simple',
  'technical': 'complex'
};

/**
 * Melee stage IDs and names
 */
export const STAGE_NAMES = {
  2: "Fountain of Dreams",
  3: "Pokémon Stadium",
  8: "Yoshi's Story",
  28: "Dream Land",
  31: "Battlefield",
  32: "Final Destination"
};

/**
 * Melee character IDs and names
 */
export const CHARACTER_NAMES = {
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

/**
 * Character short names for commentary
 */
export const CHARACTER_SHORT_NAMES = {
  0: "Falcon",
  1: "DK",
  2: "Fox", 
  3: "G&W",
  4: "Kirby",
  5: "Bowser",
  6: "Link",
  7: "Luigi",
  8: "Mario",
  9: "Marth",
  10: "Mewtwo",
  11: "Ness", 
  12: "Peach",
  13: "Pika",
  14: "Ice Climbers",
  15: "Puff",
  16: "Samus",
  17: "Yoshi",
  18: "Zelda",
  19: "Sheik", 
  20: "Falco",
  21: "Y. Link",
  22: "Doc",
  23: "Roy",
  24: "Pichu",
  25: "Ganon"
};

/**
 * Melee action states of interest for advanced detection
 */
export const ACTION_STATES = {
  // Movement states
  STANDING: 0,
  DASH_START: 20,
  DASH: 21,
  RUN: 22,
  RUN_DIRECT: 23,
  JUMP_SQUAT: 24,
  JUMP_F: 25,
  JUMP_B: 26,
  LANDING: 11,
  LANDING_SPECIAL: 12,
  
  // Tech options
  TECH_START: 0xC7,
  TECH_ROLL_LEFT: 0xC9,
  TECH_ROLL_RIGHT: 0xCA,
  TECH_IN_PLACE: 0xC8,
  TECH_MISS: 0xC8,
  
  // Recovery options
  FIRE_FOX_GROUND: 0x159,
  FIRE_FOX_AIR: 0x15A,
  UP_B_GROUND: 0x15B,
  UP_B_AIR: 0x15C,
  
  // Shield/grab states
  GRAB: 0xD4,
  SHIELD: 0xB3,
  SHIELD_BREAK: 0xB6,
  
  // Aerial attacks
  NAIR: 0x41,
  FAIR: 0x42,
  BAIR: 0x43,
  UAIR: 0x44,
  DAIR: 0x45,
  
  // Other
  FALL: 0x1D,
  AIR_DODGE: 0x13
};

export default {
  COMMENTARY_STYLES,
  COMMENTARY_MODES,
  COACHING_PROFILES,
  CACHE_EXPIRY,
  EVENT_COMPLEXITY,
  STAGE_NAMES,
  CHARACTER_NAMES,
  CHARACTER_SHORT_NAMES,
  ACTION_STATES
};
