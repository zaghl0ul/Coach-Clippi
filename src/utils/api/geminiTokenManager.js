// src/utils/api/geminiTokenManager.js
/**
 * Token allocation manager for Gemini API integration with Slippi analysis contexts
 * Implements optimized token distribution based on analysis complexity requirements
 */
export const SlippiAnalysisTokenStrategy = {
  // Frame-data specific token allocations
  COMBO_SEQUENCE: 256,        // L-cancel/DI/aerial drift sequence analysis
  NEUTRAL_EXCHANGE: 384,      // Dash dance/spacing/stage control patterns
  TECHNICAL_EXECUTION: 512,   // APM/L-cancel success rate/wavedash optimization
  
  // Character-matchup specific allocations
  MATCHUP_ANALYSIS: 1024,     // Character-specific frame advantage/counterplay
  PUNISH_OPTIMIZATION: 768,   // Combo extension/edgeguard sequencing
  
  // Full-game analysis token requirements
  COMPETITIVE_COACHING: 1536, // Tournament-level optimization feedback
  FRAME_PERFECT_BREAKDOWN: 2048, // Frame-by-frame technical optimization
};

/**
 * Determines optimal token allocation based on Slippi analysis context
 * @param {string} analysisType - Type of technical analysis being performed
 * @param {Object} replayData - Parsed Slippi replay metadata
 * @returns {number} - Optimal token allocation
 */
export function determineTokenAllocation(analysisType, replayData = null) {
  // Base token allocation for all request types
  const BASE_TOKENS = 512;
  
  // Apply contextual multipliers based on analysis type
  switch(analysisType) {
    case 'combo-analysis':
      // Scale based on combo length and complexity
      const comboLength = replayData?.combo?.moves?.length || 5;
      return Math.min(SlippiAnalysisTokenStrategy.COMBO_SEQUENCE * (comboLength / 5), 1024);
      
    case 'matchup-coaching':
      // Character-specific matchup analysis requires deeper token allocation
      return SlippiAnalysisTokenStrategy.MATCHUP_ANALYSIS;
      
    case 'technical-execution':
      // APM/L-cancel/wavedash optimization feedback
      return SlippiAnalysisTokenStrategy.TECHNICAL_EXECUTION;
      
    case 'tournament-preparation':
      // Comprehensive competitive analysis
      return SlippiAnalysisTokenStrategy.COMPETITIVE_COACHING;
      
    case 'frame-perfect-breakdown':
      // Maximum allocation for frame-by-frame technical optimization
      return SlippiAnalysisTokenStrategy.FRAME_PERFECT_BREAKDOWN;
      
    default:
      // Default allocation for unspecified analysis types
      return BASE_TOKENS;
  }
}