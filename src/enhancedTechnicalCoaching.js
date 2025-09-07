// src/enhancedTechnicalCoaching.js
import { characterNames } from './utils/slippiUtils.js';
import { executeOpenAIRequest } from './utils/api/openaiHandler.js';

/**
 * Enhanced coaching profile types for targeted feedback
 */
const COACHING_PROFILES = {
  TECHNICAL_EXECUTION: 'technical-execution',  // Focus on frame-perfect inputs
  NEUTRAL_GAME: 'neutral-game',                // Focus on spacing, stage control
  PUNISH_OPTIMIZATION: 'punish-optimization',  // Focus on combo extensions
  MATCHUP_SPECIFIC: 'matchup-specific',        // Focus on character matchup
  DEFENSIVE_OPTIONS: 'defensive-options',       // Focus on defense and recovery
  COMPREHENSIVE: 'comprehensive'               // Balanced approach
};

/**
 * Cache for coaching advice to reduce LLM calls for similar data
 */
const coachingCache = new Map();
const CACHE_EXPIRY = 3600000; // 1 hour for coaching (longer than commentary)

/**
 * Generates enhanced technical coaching based on match data and frame analysis
 * 
 * @param {string} apiKey - OpenAI API key or 'local' for local LLM
 * @param {Object} matchData - Structured match statistics and player data
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Technical coaching advice
 */
export async function generateEnhancedCoaching(apiKey, matchData, options = {}) {
  // Default parameters optimized for coaching
  const {
    coachingProfile = COACHING_PROFILES.COMPREHENSIVE,
    maxTokens = 1500, // Coaching needs more detail than commentary
    temperature = 0.5, // Lower temperature for more consistent coaching
    cacheEnabled = true,
    localEndpoint = process.env.LM_STUDIO_ENDPOINT || 'http://localhost:1234/v1',
    frameData = null, // Optional detailed frame data for deeper analysis
    playerHistory = null, // Optional historical performance data
    focusAreas = [], // Specific areas to focus feedback on
    targetPlayerIndex = null // Which player to focus coaching on
  } = options;
  
  // Generate a cache key if caching is enabled
  const cacheKey = cacheEnabled ? 
    `coaching-${coachingProfile}-${JSON.stringify(matchData).slice(0, 100)}-${targetPlayerIndex}` : null;
  
  // Check cache first
  if (cacheKey && coachingCache.has(cacheKey)) {
    const cached = coachingCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.coaching;
    }
    // Remove expired cache entry
    coachingCache.delete(cacheKey);
  }
  
  try {
    // Process frame data if provided for deeper technical insights
    let technicalInsights = null;
    if (frameData) {
      try {
        // If your project has a frameDataAnalyzer, use it here
        // technicalInsights = analyzeFrameData(frameData, { ... });
        console.log("Frame data analysis not implemented for this example");
      } catch (frameError) {
        console.error('Error analyzing frame data:', frameError.message);
        // Continue without frame data analysis
      }
    }
    
    // Build coaching prompt based on profile and data
    const prompt = createEnhancedCoachingPrompt(
      matchData,
      coachingProfile,
      technicalInsights,
      playerHistory,
      focusAreas,
      targetPlayerIndex
    );
    
    // Determine if we should use local model based on apiKey
    const isLocal = apiKey === 'local';
    
    // Set up request options
    const llmOptions = {
      model: isLocal ? 'local-model' : 'gpt-4',
      maxTokens,
      temperature,
      logRequest: true,
      useLocalModel: isLocal,
      localEndpoint: isLocal ? localEndpoint : undefined
    };
    
    // Execute LLM request
    const coachingAdvice = await executeOpenAIRequest(apiKey, prompt, llmOptions);
    
    // Cache the result if enabled
    if (cacheKey && coachingAdvice) {
      coachingCache.set(cacheKey, {
        coaching: coachingAdvice,
        timestamp: Date.now()
      });
    }
    
    return coachingAdvice;
  } catch (error) {
    console.error('Error generating coaching advice:', error.message);
    if (error.response) {
      console.error('API error details:', JSON.stringify(error.response.data, null, 2));
    }
    return `Failed to generate coaching advice: ${error.message}`;
  }
}

/**
 * Creates a sophisticated coaching prompt with enhanced technical focus
 * 
 * @param {Object} matchData - Match statistics and player data
 * @param {string} coachingProfile - Type of coaching to emphasize
 * @param {Object} technicalInsights - Frame data analysis results
 * @param {Object} playerHistory - Historical performance data
 * @param {Array} focusAreas - Specific areas to focus on
 * @param {number} targetPlayerIndex - Which player to focus coaching on
 * @returns {string} - The formatted prompt for the LLM
 */
function createEnhancedCoachingPrompt(
  matchData, 
  coachingProfile,
  technicalInsights,
  playerHistory,
  focusAreas,
  targetPlayerIndex
) {
  // Extract character names for more meaningful analysis
  const characterInfo = matchData.characters 
    ? matchData.characters.map((charId, idx) => {
        const charName = typeof charId === 'string' 
            ? charId 
            : (characterNames[charId] || 'Unknown');
        
        return {
            playerNumber: idx + 1,
            character: charName,
            characterId: typeof charId === 'number' ? charId : null,
            damageDealt: matchData.damageDealt?.[idx] || 0,
            stocksLost: matchData.stockLosses?.[idx] || 0
        };
      })
    : [];
  
  // Calculate derived statistics for deeper analysis with technical metrics
  const derivedStats = characterInfo.map(player => {
    const performanceRating = calculatePerformanceRating(
        player.damageDealt, 
        player.stocksLost
    );
    
    return {
        ...player,
        damageEfficiency: player.stocksLost > 0 
            ? (player.damageDealt / player.stocksLost).toFixed(1) 
            : 'Perfect',
        performanceRating,
        estimatedConversions: Math.floor(player.damageDealt / 45), // Approximate neutral openings
        conversionRate: performanceRating.technicalDetails?.estimatedPunishEfficiency || 'N/A'
    };
  });
  
  // Determine which player to focus coaching on
  const targetPlayer = targetPlayerIndex !== null && characterInfo[targetPlayerIndex]
    ? characterInfo[targetPlayerIndex]
    : null;
  
  // Character-specific data for targeted coaching
  const getCharacterSpecificData = (characterName, characterId) => {
    // Frame data reference points for common characters
    const characterData = {
      'Fox': {
        jumpSquatFrames: 3,
        bestOosOption: 'shine (frame 1)',
        keyMoves: 'nair, bair, shine, upsmash',
        techSkillFocus: 'shine OoS, double shine, shine grab, perfect ledgedash'
      },
      'Falco': {
        jumpSquatFrames: 5,
        bestOosOption: 'shine (frame 1)',
        keyMoves: 'dair, bair, shine, fsmash',
        techSkillFocus: 'pillar combos, shine dair, double shine pressure, short hop lasers'
      },
      'Marth': {
        jumpSquatFrames: 4,
        bestOosOption: 'up-B (frame 5)',
        keyMoves: 'fair, dtilt, grab, fsmash',
        techSkillFocus: 'dash dance grab, pivot tipper, chaingrab spacies'
      },
      'Captain Falcon': {
        jumpSquatFrames: 5,
        bestOosOption: 'nair (frame 7)',
        keyMoves: 'nair, knee, stomping dair, upair',
        techSkillFocus: 'instant aerial drift, stomp knee, pivot grabs, platform tech chase'
      },
      'Jigglypuff': {
        jumpSquatFrames: 5,
        bestOosOption: 'rest OoS (frame 1)',
        keyMoves: 'bair, rest, upthrow, pound',
        techSkillFocus: 'perfect spaced bairs, rest setups, ledge planking'
      },
      'Sheik': {
        jumpSquatFrames: 3,
        bestOosOption: 'nair (frame 4)',
        keyMoves: 'fair, ftilt, dash attack, needle',
        techSkillFocus: 'reaction tech chase, needle cancels, platform movement'
      }
    };
    
    // Return character-specific data or generic template
    return characterData[characterName] || {
      jumpSquatFrames: 4, // Common default
      bestOosOption: 'character-specific',
      keyMoves: 'character-specific',
      techSkillFocus: 'character-specific advanced techniques'
    };
  };
  
  // Start building the prompt with system instructions and technical precision
  let prompt = `You are an elite-level Super Smash Bros. Melee coach with comprehensive knowledge of frame data, character matchups, advanced techniques, and competitive meta-game strategy.

You're providing ${coachingProfile === COACHING_PROFILES.COMPREHENSIVE ? 'comprehensive' : coachingProfile} coaching advice ${targetPlayer ? `focused on Player ${targetPlayer.playerNumber} (${targetPlayer.character})` : 'for all players'}.

## Match Statistics:
${characterInfo.map(p => {
  const charData = getCharacterSpecificData(p.character, p.characterId);
  return `Player ${p.playerNumber} (${p.character}):
- Damage Dealt: ${p.damageDealt.toFixed(1)}
- Stocks Lost: ${p.stocksLost}
- Damage Efficiency: ${derivedStats.find(d => d.playerNumber === p.playerNumber).damageEfficiency} damage per stock
- Estimated Conversions: ${derivedStats.find(d => d.playerNumber === p.playerNumber).estimatedConversions}
- Key Frame Data: 
  * Jump Squat: ${charData.jumpSquatFrames} frames
  * Best OoS option: ${charData.bestOosOption}
  * Key moves: ${charData.keyMoves}`;
}).join('\n\n')}

## Matchup Analysis:
${characterInfo.length >= 2 
? `${characterInfo[0].character} vs ${characterInfo[1].character}` 
: 'Insufficient data for matchup analysis'}
${characterInfo.length >= 2 ? `
Key matchup considerations:
- Frames advantages in neutral interactions
- Stage positioning and control points
- Punish optimization routes
- Recovery and edgeguard patterns` : ''}

## Derived Performance Metrics:
${derivedStats.map(p => {
  const perfRating = p.performanceRating;
  return `Player ${p.playerNumber} (${p.character}):
- Performance Rating: ${perfRating.score}/10
- Key Insight: ${perfRating.insight}
${perfRating.technicalDetails ? `- Technical Details:
  * Damage per Stock: ${perfRating.technicalDetails.damagePerStock}
  * Stock Efficiency: ${perfRating.technicalDetails.stockEfficiency}
  * Est. Neutral Wins: ${perfRating.technicalDetails.estimatedNeutralWins}
  * Punish Efficiency: ${perfRating.technicalDetails.estimatedPunishEfficiency}` : ''}`;
}).join('\n\n')}
`;
  
  // Add player history if provided
  if (playerHistory) {
    prompt += `\n\n## Player History Analysis:`;
    
    // If history is an object with keys corresponding to players
    if (typeof playerHistory === 'object' && !Array.isArray(playerHistory)) {
      Object.entries(playerHistory).forEach(([playerKey, history]) => {
        // Try to match player key to our player numbers
        const playerMatch = characterInfo.find(p => 
          p.playerNumber.toString() === playerKey || 
          `player${p.playerNumber}` === playerKey ||
          `p${p.playerNumber}` === playerKey
        );
        
        const playerIdentifier = playerMatch 
          ? `Player ${playerMatch.playerNumber} (${playerMatch.character})` 
          : `Player ${playerKey}`;
          
        prompt += `\n\n### ${playerIdentifier} Historical Performance:`;
        
        // If history is a string, use it directly
        if (typeof history === 'string') {
          prompt += `\n${history}`;
        } 
        // If history is an object with metrics
        else if (typeof history === 'object') {
          Object.entries(history).forEach(([metric, value]) => {
            prompt += `\n- ${formatMetricName(metric)}: ${value}`;
          });
        }
      });
    } 
    // If history is a string, use it directly
    else if (typeof playerHistory === 'string') {
      prompt += `\n${playerHistory}`;
    }
    // If history is an array, treat each item as a separate entry
    else if (Array.isArray(playerHistory)) {
      playerHistory.forEach((entry, index) => {
        prompt += `\n\n### Historical Data Point ${index + 1}:`;
        if (typeof entry === 'string') {
          prompt += `\n${entry}`;
        } else if (typeof entry === 'object') {
          Object.entries(entry).forEach(([key, value]) => {
            prompt += `\n- ${formatMetricName(key)}: ${value}`;
          });
        }
      });
    }
  }
  
  // Add specific focus areas if provided
  if (focusAreas && focusAreas.length > 0) {
    prompt += `\n\n## Requested Focus Areas:`;
    focusAreas.forEach(area => {
      prompt += `\n- ${area}`;
    });
  }
  
  // Add profile-specific instructions
  prompt += `\n\n${getCoachingProfileInstructions(coachingProfile)}`;
  
  // Add general formatting instructions with enhanced technical precision
  prompt += `
Your advice should be:
1. Technically precise, including specific frame data, hitbox interactions, and advanced techniques with frame-perfect execution requirements
2. Directly actionable with concrete practice methods (e.g., "20XX Training Pack setup for specific scenarios")
3. Prioritized by impact (focus on the highest-value improvements first)
4. Character-specific with attention to character weight, fall speed, and frame data particularities
5. Backed by top player examples where possible (e.g., "Mango's utilization of platform wavelands")
6. Include references to training resources when applicable (e.g., UnclePunch Training Mod drills)

Format your response with:
- Clear section headings for different improvement areas
- Bullet points for specific technical advice
- Frame data in parentheses where relevant (e.g., "wavedash out of shield (frame 4)")
- Concrete practice routines with measurable goals
- Progressive skill development paths from fundamental to advanced
`;

  return prompt;
}

/**
 * Gets coaching profile-specific instructions
 */
function getCoachingProfileInstructions(profile) {
  switch (profile) {
    case COACHING_PROFILES.TECHNICAL_EXECUTION:
      return `Focus on technical execution improvements including:
- Frame-perfect input optimization
- L-canceling consistency and timing (target 90%+ success rate)
- Wavedashing angle and distance optimization (per-character optimal parameters)
- SHFFL aerial timing (frame advantage calculations)
- Shield drop precision (both axe and notch methods)
- Dash dance spacing and timing (IASA frame utilization)
- Platform movement optimization (NIL timings and platform cancel techniques)
- Character-specific advanced techniques (multishines, Samus super wavedash, etc.)`;
      
    case COACHING_PROFILES.NEUTRAL_GAME:
      return `Focus on neutral game improvements including:
- Stage positioning and control (stage-specific key positions)
- Spacing optimization for character's threat ranges (both hitbox and movement ranges)
- Whiff punishment opportunities (frame advantage calculation on specific moves)
- Approach mixups and conditioning (option coverage optimization)
- Defensive positioning (shield angling, crouch cancel thresholds)
- Stage control and platform usage (platform state assessments)
- Neutral opening frequency and effectiveness (measured by damage per opening)
- Bait and punishment tactics (empty hop mixups, movement feints)`;
      
    case COACHING_PROFILES.PUNISH_OPTIMIZATION:
      return `Focus on punish game optimization including:
- Character-specific combo extensions (weight-specific follow-ups)
- DI mixup coverage (accounting for optimal opponent DI)
- Frame-tight execution in combo sequences
- Techchase optimization (reaction vs. read-based approaches)
- Edge-guarding efficiency (on-stage vs. off-stage decision trees)
- Kill confirm setups and execution (percent thresholds by character)
- Damage output optimization (maximizing punish per neutral win)
- Platform tech/no-tech coverage options
- Recovery mixup punishments (timing windows by character)`;
      
    case COACHING_PROFILES.MATCHUP_SPECIFIC:
      return `Focus on matchup-specific strategies including:
- Character-specific interaction frame data (moves that win/lose in specific exchanges)
- Advantageous positioning (matchup-specific stage control points)
- Punish game adaptations (character weight-specific combos)
- Recovery exploitation (edge-guarding flowcharts by character)
- Neutral approach adaptations (effective approach options against specific characters)
- Counter-play to opponent's optimal strategies
- Stage counterpick recommendations with detailed reasoning
- Percent-specific mixup effectiveness (what works at what damage ranges)`;
      
    case COACHING_PROFILES.DEFENSIVE_OPTIONS:
      return `Focus on defensive improvements including:
- OOS (out of shield) optimization (frame-perfect options by situation)
- DI optimization (survival, combo-breaking, and mixup DI patterns)
- SDI optimization for multi-hit moves
- ASDI down techniques and percent thresholds
- Tech timing and execution (tech in place vs tech roll optimization)
- Recovery route selection and execution
- Ledge option optimization (ledgedash, ledgehop, getup timing mixups)
- Platform defensive techniques (shield drops, platform cancels, NIL)
- Crouch cancel thresholds and follow-ups`;
      
    case COACHING_PROFILES.COMPREHENSIVE:
    default:
      return `Provide comprehensive coaching covering:
1. Technical execution (L-canceling, wavedashing, advanced techniques)
2. Neutral game assessment and improvement opportunities
3. Punish game optimization (combo extensions, edge-guarding)
4. Matchup-specific adaptations and counterplay
5. Defensive improvements (DI, tech, recovery options)
6. Mental game and adaptation strategies

For each area, provide specific, actionable techniques to practice with frame data where relevant.`;
  }
}

/**
 * Helper function to format metric names for readability
 * 
 * @param {string} metricName - Raw metric name
 * @returns {string} - Formatted metric name
 */
function formatMetricName(metricName) {
  // Replace camelCase with spaces
  return metricName
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space between lowercase and uppercase
    .replace(/_/g, ' '); // Replace underscores with spaces
}

/**
 * Calculates a comprehensive performance rating based on granular match statistics
 * Used to generate highly specified technical coaching advice
 * 
 * @param {number} damageDealt - Total damage dealt by player
 * @param {number} stocksLost - Total stocks lost by player
 * @returns {Object} - Detailed performance rating with technical insights
 */
function calculatePerformanceRating(damageDealt, stocksLost) {
  // Default values for error cases with explicit type checking
  if (typeof damageDealt !== 'number' || typeof stocksLost !== 'number' || 
      isNaN(damageDealt) || isNaN(stocksLost)) {
    return {
      score: 5,
      insight: 'Insufficient data for performance analysis',
      technicalDetails: null
    };
  }
  
  // Calculate damage/stock efficiency (key competitive metric)
  const damagePerStock = stocksLost > 0 ? damageDealt / stocksLost : damageDealt;
  
  // Normalized score using non-linear distribution modeling competitive thresholds
  // Competitive baseline: ~125 damage per stock is considered strong (between Fox-Marth)
  const baseScore = Math.min(10, Math.max(1, (damagePerStock / 25) * 2));
  
  // Apply logarithmic scale to better represent skill differences
  // ln(x+1) transformation provides better differentiation at high skill levels
  const normalizedScore = Math.min(10, Math.max(1, Math.floor(
    (Math.log(baseScore + 1) / Math.log(11)) * 10
  )));
  
  // Calculate additional technical metrics
  const technicalDetails = {
    damagePerStock: damagePerStock.toFixed(1),
    stockEfficiency: stocksLost > 0 ? (damageDealt / (stocksLost * 100)).toFixed(2) : "∞", // normalized to 0-1 range
    estimatedNeutralWins: Math.floor(damageDealt / 45), // assuming avg ~45% per neutral win
    estimatedPunishEfficiency: (damageDealt / (Math.max(1, stocksLost) * 115)).toFixed(2), // normalized to matchup baseline
  };
  
  // Generate precision-targeted insights based on performance metrics
  let insight = '';
  if (normalizedScore >= 9) {
    insight = 'Exceptional damage output with minimal stock losses. Focus on consistency and adaptation to opponent counterplay.';
  } else if (normalizedScore >= 7) {
    insight = 'Strong performance. Optimize punish extensions and edgeguards for greater damage efficiency per opening.';
  } else if (normalizedScore >= 5) {
    insight = 'Average performance. Improve neutral positioning, whiff punishments, and defensive option selection.';
  } else if (normalizedScore >= 3) {
    insight = 'Below average efficiency. Work on reducing overcommitment, improving recovery mixups, and executing defensive techniques.';
  } else {
    insight = 'Significant improvement needed. Focus on fundamental mechanics, neutral spacing, and avoiding high-risk low-reward commitments.';
  }
  
  return { 
    score: normalizedScore, 
    insight, 
    technicalDetails 
  };
}

// Export the coaching profiles
export { COACHING_PROFILES };