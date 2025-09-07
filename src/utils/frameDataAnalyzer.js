// src/utils/frameDataAnalyzer.js
import { characterNames } from './slippiUtils.js';

/**
 * Constants for Melee-specific action states and technical execution
 */
const ACTION_STATES = {
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
    
    // Aerial states
    NAIR: 43,
    FAIR: 44,
    BAIR: 45,
    UAIR: 46,
    DAIR: 47,
    
    // Special movement
    AIR_DODGE: 41,
    SHIELD_START: 178,
    SHIELD: 179,
    SHIELD_RELEASE: 180,
    GRAB: 212,
    
    // Defensive options
    SPOT_DODGE: 229,
    ROLL_F: 233,
    ROLL_B: 234,
    AIR_DODGE_F: 235,
    AIR_DODGE_B: 236,
    
    // Tech options
    TECH_MISS: 183,
    TECH_DOWN: 185,
    TECH_IN_PLACE: 184,
    TECH_F: 186,
    TECH_B: 187,
    
    // Character-specific shine states
    FOX_SHINE: 191,
    FALCO_SHINE: 191,
    
    // General categories (not actual state values)
    AERIAL_ATTACK_START: 40,
    AERIAL_ATTACK_END: 47,
    GROUND_ATTACK_START: 50,
    GROUND_ATTACK_END: 70,
    HITSTUN_START: 75,
    HITSTUN_END: 95
};

/**
 * Frame-perfect timing windows for advanced techniques
 */
const TECH_TIMINGS = {
    L_CANCEL: 7,               // 7 frames before landing
    TECH: 20,                  // 20 frame tech window
    SHIELD_DROP: 4,            // 4 frame precise shield drop window
    PIVOT: 1,                  // 1 frame pivot window
    WAVEDASH_OPTIMAL: 3,       // 3 frames after jump squat optimal airdodge
    FAST_FALL: 1,              // 1 frame at apex for perfect fast fall
    DASH_DANCE_MAX: 19         // Maximum frames for effective dash dance
};

/**
 * Analyzes Slippi replay frame data to extract technical execution metrics
 * Identifies frame-perfect inputs, advanced techniques, and optimization opportunities
 * 
 * @param {Object} frameData - Raw or processed Slippi frame data
 * @param {Object} options - Analysis configuration options
 * @returns {Object} - Comprehensive technical metrics
 */
export function analyzeFrameData(frameData, options = {}) {
    const {
        startFrame = 0,
        endFrame = Number.MAX_SAFE_INTEGER,
        playerIndices = null,
        filterTechniques = null
    } = options;
    
    if (!frameData || typeof frameData !== 'object') {
        return { error: 'Invalid frame data provided' };
    }
    
    try {
        // Initialize analysis result structure
        const analysis = {
            technicalEvents: [], // Chronological list of detected techniques
            playerMetrics: {},   // Player-specific aggregated metrics
            neutralStats: {},    // Neutral game statistics
            punishStats: {},     // Punish game effectiveness
            movementEfficiency: {}, // Movement optimization metrics
            advancedTechniques: {} // Character-specific advanced techniques
        };
        
        // Sort frame numbers chronologically
        const frameNumbers = Object.keys(frameData)
            .map(Number)
            .filter(frame => frame >= startFrame && frame <= endFrame)
            .sort((a, b) => a - b);
            
        if (frameNumbers.length === 0) {
            return { error: 'No valid frames found in the provided range' };
        }
        
        // Track player state across frames for transition detection
        const playerStates = {};
        const actionStateHistory = {};
        
        // Process each frame in sequence
        frameNumbers.forEach(frameNum => {
            const frame = frameData[frameNum];
            if (!frame || !frame.players) return;
            
            // Process each player's data in the frame
            Object.entries(frame.players).forEach(([playerIndexStr, playerFrame]) => {
                const playerIndex = Number(playerIndexStr);
                
                // Skip if filtering to specific players and this player not included
                if (playerIndices && !playerIndices.includes(playerIndex)) return;
                
                // Skip if post-frame data missing (critical for analysis)
                if (!playerFrame.post) return;
                
                // Initialize player tracking if needed
                if (!playerStates[playerIndex]) {
                    playerStates[playerIndex] = {
                        lastActionState: null,
                        lastPosition: null,
                        lastFrame: null,
                        inAerial: false,
                        aerialStartFrame: null,
                        inDash: false,
                        dashStartFrame: null,
                        inJumpSquat: false,
                        jumpSquatStartFrame: null,
                        inShield: false,
                        shieldStartFrame: null,
                        actionStateTransitions: []
                    };
                    
                    actionStateHistory[playerIndex] = [];
                    
                    // Initialize metrics for this player
                    analysis.playerMetrics[playerIndex] = {
                        lCancelCount: 0,
                        lCancelSuccess: 0,
                        wavedashCount: 0,
                        dashDanceCount: 0,
                        shieldDropCount: 0,
                        fastFallCount: 0,
                        perfectFastFallCount: 0,
                        edgeguardAttempts: 0,
                        edgeguardSuccess: 0,
                        techchaseAttempts: 0,
                        techchaseSuccess: 0,
                        neutralWins: 0,
                        missedTechs: 0,
                        successfulTechs: 0
                    };
                    
                    analysis.movementEfficiency[playerIndex] = {
                        groundMovementRatio: 0,
                        efficientMovementFrames: 0,
                        totalActionableFrames: 0,
                        overextensionCount: 0
                    };
                    
                    analysis.advancedTechniques[playerIndex] = {
                        characterSpecific: {}
                    };
                }
                
                const playerState = playerStates[playerIndex];
                const post = playerFrame.post;
                const currentActionState = post.actionStateId;
                
                // Record action state transition if changed
                if (currentActionState !== playerState.lastActionState) {
                    playerState.actionStateTransitions.push({
                        frame: frameNum,
                        from: playerState.lastActionState,
                        to: currentActionState
                    });
                    
                    // Keep a rolling history of recent action states (last 10)
                    actionStateHistory[playerIndex].push({
                        frame: frameNum,
                        state: currentActionState
                    });
                    
                    if (actionStateHistory[playerIndex].length > 10) {
                        actionStateHistory[playerIndex].shift();
                    }
                    
                    // Detect specific technique based on action state transitions
                    detectTechniquesFromTransition(
                        playerState.lastActionState,
                        currentActionState,
                        playerIndex,
                        frameNum,
                        playerState,
                        analysis
                    );
                }
                
                // Flag state tracking for aerial attacks
                if (isAerialAttack(currentActionState) && !playerState.inAerial) {
                    playerState.inAerial = true;
                    playerState.aerialStartFrame = frameNum;
                } else if (!isAerialAttack(currentActionState) && playerState.inAerial) {
                    // Exiting aerial state
                    playerState.inAerial = false;
                    
                    // If landed within L-cancel window, check for successful L-cancel
                    if (isLandingState(currentActionState) && 
                        frameNum - playerState.aerialStartFrame < 30) {
                        
                        analysis.playerMetrics[playerIndex].lCancelCount++;
                        
                        // L-cancel detection based on landing lag duration
                        const expectedLag = getExpectedLandingLag(playerState.lastActionState);
                        const actualLag = getLandingLagFromHistory(
                            actionStateHistory[playerIndex],
                            frameNum
                        );
                        
                        if (actualLag <= expectedLag / 2 + 1) { // Account for frame imprecision
                            analysis.playerMetrics[playerIndex].lCancelSuccess++;
                            
                            // Log successful L-cancel as technical event
                            analysis.technicalEvents.push({
                                frame: frameNum,
                                playerIndex,
                                technique: 'l-cancel',
                                quality: 'success',
                                data: {
                                    aerial: getMoveName(playerState.lastActionState),
                                    expectedLag,
                                    actualLag
                                }
                            });
                        } else {
                            // Log missed L-cancel opportunity
                            analysis.technicalEvents.push({
                                frame: frameNum,
                                playerIndex,
                                technique: 'l-cancel',
                                quality: 'missed',
                                data: {
                                    aerial: getMoveName(playerState.lastActionState),
                                    expectedLag,
                                    actualLag
                                }
                            });
                        }
                    }
                }
                
                // Dash dance detection
                if (currentActionState === ACTION_STATES.DASH_START) {
                    if (!playerState.inDash) {
                        playerState.inDash = true;
                        playerState.dashStartFrame = frameNum;
                    } else {
                        // Already in dash and starting a new one = potential dash dance
                        const dashDuration = frameNum - playerState.dashStartFrame;
                        if (dashDuration <= TECH_TIMINGS.DASH_DANCE_MAX) {
                            analysis.playerMetrics[playerIndex].dashDanceCount++;
                            
                            // Log dash dance as technical event
                            analysis.technicalEvents.push({
                                frame: frameNum,
                                playerIndex,
                                technique: 'dash-dance',
                                quality: dashDuration <= 10 ? 'optimal' : 'standard',
                                data: {
                                    duration: dashDuration
                                }
                            });
                        }
                        
                        // Reset dash tracking
                        playerState.dashStartFrame = frameNum;
                    }
                } else if (playerState.inDash && 
                          currentActionState !== ACTION_STATES.DASH && 
                          currentActionState !== ACTION_STATES.DASH_START) {
                    // Exiting dash state
                    playerState.inDash = false;
                }
                
                // Wavedash detection (jump squat → air dodge → landing in short sequence)
                if (currentActionState === ACTION_STATES.JUMP_SQUAT) {
                    playerState.inJumpSquat = true;
                    playerState.jumpSquatStartFrame = frameNum;
                } else if (currentActionState === ACTION_STATES.AIR_DODGE && playerState.inJumpSquat) {
                    // Potential wavedash in progress (airdodge after jump squat)
                    playerState.inJumpSquat = false;
                    
                    // Check frame precision
                    const jumpSquatToAirdodgeDuration = frameNum - playerState.jumpSquatStartFrame;
                    const characterJumpSquat = getCharacterJumpSquatFrames(
                        getCharacterFromActionState(playerFrame)
                    );
                    
                    const isOptimalTiming = Math.abs(
                        jumpSquatToAirdodgeDuration - characterJumpSquat
                    ) <= 1;
                    
                    // Store potential wavedash data for confirmation when landing
                    playerState.potentialWavedash = {
                        jumpSquatFrame: playerState.jumpSquatStartFrame,
                        airdodgeFrame: frameNum,
                        position: { x: post.positionX, y: post.positionY },
                        isOptimalTiming
                    };
                } else if (isLandingState(currentActionState) && playerState.potentialWavedash) {
                    // Confirm wavedash (landing soon after airdodge from jump squat)
                    const airdodgeToLandDuration = frameNum - playerState.potentialWavedash.airdodgeFrame;
                    
                    if (airdodgeToLandDuration <= 5) { // Maximum 5 frames to land for valid wavedash
                        analysis.playerMetrics[playerIndex].wavedashCount++;
                        
                        // Calculate wavedash distance/quality
                        const horizontalDistance = Math.abs(
                            post.positionX - playerState.potentialWavedash.position.x
                        );
                        
                        const wavedashQuality = classifyWavedashQuality(
                            horizontalDistance,
                            getCharacterFromActionState(playerFrame)
                        );
                        
                        // Log wavedash as technical event
                        analysis.technicalEvents.push({
                            frame: frameNum,
                            playerIndex,
                            technique: 'wavedash',
                            quality: playerState.potentialWavedash.isOptimalTiming ? 
                                'frame-perfect' : 'standard',
                            data: {
                                distance: horizontalDistance.toFixed(2),
                                quality: wavedashQuality,
                                duration: airdodgeToLandDuration
                            }
                        });
                    }
                    
                    // Reset wavedash tracking
                    playerState.potentialWavedash = null;
                } else if (playerState.inJumpSquat && 
                          currentActionState !== ACTION_STATES.JUMP_SQUAT && 
                          currentActionState !== ACTION_STATES.AIR_DODGE) {
                    // Exit jump squat without airdodge - not a wavedash
                    playerState.inJumpSquat = false;
                    playerState.potentialWavedash = null;
                }
                
                // Shield drop detection
                if (currentActionState === ACTION_STATES.SHIELD) {
                    if (!playerState.inShield) {
                        playerState.inShield = true;
                        playerState.shieldStartFrame = frameNum;
                    }
                } else if (playerState.inShield && 
                         (isAerialAttack(currentActionState) || 
                          currentActionState === ACTION_STATES.LANDING)) {
                    // Shield → aerial or shield → drop through platform
                    const shieldDuration = frameNum - playerState.shieldStartFrame;
                    
                    if (shieldDuration <= 4) { // Fast shield drop
                        analysis.playerMetrics[playerIndex].shieldDropCount++;
                        
                        // Log shield drop as technical event
                        analysis.technicalEvents.push({
                            frame: frameNum,
                            playerIndex,
                            technique: 'shield-drop',
                            quality: shieldDuration <= 2 ? 'frame-perfect' : 'standard',
                            data: {
                                duration: shieldDuration,
                                followUp: isAerialAttack(currentActionState) ? 
                                    'aerial' : 'movement'
                            }
                        });
                    }
                    
                    // Reset shield tracking
                    playerState.inShield = false;
                } else if (playerState.inShield && 
                         currentActionState !== ACTION_STATES.SHIELD && 
                         currentActionState !== ACTION_STATES.SHIELD_RELEASE) {
                    // Exit shield state without technical follow-up
                    playerState.inShield = false;
                }
                
                // Tech detection
                if (currentActionState === ACTION_STATES.TECH_MISS) {
                    analysis.playerMetrics[playerIndex].missedTechs++;
                    
                    // Log missed tech as technical event
                    analysis.technicalEvents.push({
                        frame: frameNum,
                        playerIndex,
                        technique: 'tech',
                        quality: 'missed',
                        data: {}
                    });
                } else if (currentActionState === ACTION_STATES.TECH_IN_PLACE ||
                         currentActionState === ACTION_STATES.TECH_F ||
                         currentActionState === ACTION_STATES.TECH_B) {
                    analysis.playerMetrics[playerIndex].successfulTechs++;
                    
                    const techType = currentActionState === ACTION_STATES.TECH_IN_PLACE ?
                        'in-place' : (currentActionState === ACTION_STATES.TECH_F ? 
                            'forward' : 'backward');
                    
                    // Log successful tech as technical event
                    analysis.technicalEvents.push({
                        frame: frameNum,
                        playerIndex,
                        technique: 'tech',
                        quality: 'success',
                        data: {
                            type: techType
                        }
                    });
                }
                
                // Character-specific technique detection
                detectCharacterSpecificTechniques(
                    playerIndex,
                    currentActionState,
                    post,
                    actionStateHistory[playerIndex],
                    frameNum,
                    analysis
                );
                
                // Update tracking state for next frame
                playerState.lastActionState = currentActionState;
                playerState.lastPosition = { x: post.positionX, y: post.positionY };
                playerState.lastFrame = frameNum;
            });
        });
        
        // Calculate derived metrics
        calculateDerivedMetrics(analysis);
        
        return analysis;
    } catch (error) {
        console.error('Error in frame data analysis:', error);
        return {
            error: `Frame data analysis failed: ${error.message}`,
            stack: error.stack
        };
    }
}

/**
 * Calculate derived technical metrics from raw analysis data
 * 
 * @param {Object} analysis - Raw analysis data to augment
 */
function calculateDerivedMetrics(analysis) {
    // Calculate L-cancel percentage for each player
    Object.keys(analysis.playerMetrics).forEach(playerIndex => {
        const metrics = analysis.playerMetrics[playerIndex];
        
        // L-cancel rate
        metrics.lCancelRate = metrics.lCancelCount > 0 ?
            (metrics.lCancelSuccess / metrics.lCancelCount).toFixed(2) : 'N/A';
            
        // Tech efficiency
        metrics.techRate = (metrics.missedTechs + metrics.successfulTechs) > 0 ?
            (metrics.successfulTechs / (metrics.missedTechs + metrics.successfulTechs)).toFixed(2) : 'N/A';
            
        // Technical execution score (composite metric)
        const lCancelScore = metrics.lCancelCount > 0 ?
            (metrics.lCancelSuccess / metrics.lCancelCount) * 10 : 0;
            
        const wavedashScore = metrics.wavedashCount * 0.5;
        const dashDanceScore = metrics.dashDanceCount * 0.3;
        const shieldDropScore = metrics.shieldDropCount * 1.0;
        const techScore = ((metrics.missedTechs + metrics.successfulTechs) > 0) ?
            (metrics.successfulTechs / (metrics.missedTechs + metrics.successfulTechs)) * 5 : 0;
            
        // Weighted combined score normalized to 0-10 scale
        metrics.technicalExecutionScore = Math.min(10, (
            lCancelScore + wavedashScore + dashDanceScore + shieldDropScore + techScore
        ) / 3).toFixed(1);
    });
}

/**
 * Detect techniques based on action state transitions
 * 
 * @param {number} fromState - Previous action state
 * @param {number} toState - Current action state
 * @param {number} playerIndex - Player index
 * @param {number} frameNum - Current frame number
 * @param {Object} playerState - Player state tracking object
 * @param {Object} analysis - Analysis results to update
 */
function detectTechniquesFromTransition(fromState, toState, playerIndex, frameNum, playerState, analysis) {
    // Skip if either state is null (initialization)
    if (fromState === null || toState === null) return;
    
    // Fast-fall detection (sharp vertical velocity transition)
    if (isAirborne(fromState) && isAirborne(toState) && 
        playerState.lastPosition && 
        playerState.lastPosition.y > 0) {
        
        analysis.playerMetrics[playerIndex].fastFallCount++;
        
        // Log fast fall as technical event
        analysis.technicalEvents.push({
            frame: frameNum,
            playerIndex,
            technique: 'fast-fall',
            quality: 'standard',
            data: {}
        });
    }
}

/**
 * Detect character-specific advanced techniques
 * 
 * @param {number} playerIndex - Player index
 * @param {number} actionState - Current action state
 * @param {Object} postFrame - Post-frame data
 * @param {Array} stateHistory - Recent action state history
 * @param {number} frameNum - Current frame number
 * @param {Object} analysis - Analysis results to update
 */
function detectCharacterSpecificTechniques(playerIndex, actionState, postFrame, stateHistory, frameNum, analysis) {
    // Get character ID from post frame data
    const characterId = postFrame.characterId;
    
    // Initialize character-specific tracking if needed
    if (!analysis.advancedTechniques[playerIndex].characterSpecific[characterId]) {
        analysis.advancedTechniques[playerIndex].characterSpecific[characterId] = {
            multishine: 0,
            shinegrab: 0,
            pillaring: 0,
            waveshining: 0,
            ledgedash: 0,
            doubleJumpCancel: 0,
            moonwalk: 0
        };
    }
    
    const charTech = analysis.advancedTechniques[playerIndex].characterSpecific[characterId];
    
    // Fox/Falco shine techniques
    if ((characterId === 2 || characterId === 20) && // Fox or Falco
        actionState === ACTION_STATES.FOX_SHINE) {
        
        // Check for multishine (shine → jump → shine in quick succession)
        const recentShines = stateHistory.filter(
            h => h.state === ACTION_STATES.FOX_SHINE && 
                 h.frame >= frameNum - 20
        );
        
        if (recentShines.length >= 2) {
            const shineInterval = frameNum - recentShines[recentShines.length - 2].frame;
            
            if (shineInterval <= 15) { // Maximum 15 frames for multishine
                charTech.multishine++;
                
                // Log multishine as technical event
                analysis.technicalEvents.push({
                    frame: frameNum,
                    playerIndex,
                    technique: 'multishine',
                    quality: shineInterval <= 10 ? 'optimal' : 'standard',
                    data: {
                        interval: shineInterval,
                        character: characterId === 2 ? 'Fox' : 'Falco'
                    }
                });
            }
        }
        
        // Check for waveshining (shine → wavedash sequence)
        const recentJumpSquat = stateHistory.find(
            h => h.state === ACTION_STATES.JUMP_SQUAT &&
                 h.frame >= frameNum - 10 && 
                 h.frame < frameNum
        );
        
        if (recentJumpSquat) {
            charTech.waveshining++;
            
            // Log waveshining as technical event
            analysis.technicalEvents.push({
                frame: frameNum,
                playerIndex,
                technique: 'waveshine',
                quality: 'standard',
                data: {
                    character: characterId === 2 ? 'Fox' : 'Falco'
                }
            });
        }
    }
    
    // Falco pillar combo detection (shine → dair sequence)
    if (characterId === 20 && // Falco
        actionState === ACTION_STATES.DAIR && 
        stateHistory.some(h => 
            h.state === ACTION_STATES.FOX_SHINE && 
            h.frame >= frameNum - 30
        )) {
        
        charTech.pillaring++;
        
        // Log pillaring as technical event
        analysis.technicalEvents.push({
            frame: frameNum,
            playerIndex,
            technique: 'pillar-combo',
            quality: 'standard',
            data: {}
        });
    }
}

/**
 * Helper function to check if action state is an aerial attack
 * 
 * @param {number} actionState - Action state ID
 * @returns {boolean} - True if aerial attack
 */
function isAerialAttack(actionState) {
    return actionState >= ACTION_STATES.AERIAL_ATTACK_START && 
           actionState <= ACTION_STATES.AERIAL_ATTACK_END;
}

/**
 * Helper function to check if action state is a landing state
 * 
 * @param {number} actionState - Action state ID
 * @returns {boolean} - True if landing state
 */
function isLandingState(actionState) {
    return actionState === ACTION_STATES.LANDING || 
           actionState === ACTION_STATES.LANDING_SPECIAL;
}

/**
 * Helper function to check if action state is airborne
 * 
 * @param {number} actionState - Action state ID
 * @returns {boolean} - True if airborne
 */
function isAirborne(actionState) {
    return (actionState >= 25 && actionState <= 34) || // Jump states
           (actionState >= 43 && actionState <= 47) || // Aerial attacks
           actionState === 41; // Air dodge
}

/**
 * Get expected landing lag frames for aerial attack
 * 
 * @param {number} aerialState - Aerial attack state ID
 * @returns {number} - Expected landing lag frames
 */
function getExpectedLandingLag(aerialState) {
    // Default landing lag frames by aerial (without L-cancel)
    const landingLag = {
        [ACTION_STATES.NAIR]: 10,
        [ACTION_STATES.FAIR]: 16,
        [ACTION_STATES.BAIR]: 15,
        [ACTION_STATES.UAIR]: 15,
        [ACTION_STATES.DAIR]: 18
    };
    
    return landingLag[aerialState] || 10; // Default to 10 if unknown
}

/**
 * Calculate actual landing lag from action state history
 * 
 * @param {Array} history - Action state history
 * @param {number} landFrame - Landing frame number
 * @returns {number} - Actual landing lag frames
 */
function getLandingLagFromHistory(history, landFrame) {
    // Find next actionable state after landing
    const landingState = history.find(h => h.frame === landFrame);
    if (!landingState) return 10; // Default if history incomplete
    
    // Find next non-landing state
    const nextActionableState = history.find(h => 
        h.frame > landFrame && 
        !isLandingState(h.state)
    );
    
    if (!nextActionableState) return 10; // Default if no follow-up in history
    
    // Calculate actual lag
    return nextActionableState.frame - landFrame;
}

/**
 * Classify wavedash quality based on distance
 * 
 * @param {number} distance - Horizontal distance
 * @param {number} characterId - Character ID
 * @returns {string} - Quality classification
 */
function classifyWavedashQuality(distance, characterId) {
    // Optimal wavedash distances vary by character
    const optimalDistances = {
        2: 15,  // Fox
        9: 18,  // Marth
        20: 15, // Falco
        15: 10  // Jigglypuff
    };
    
    const optimalDistance = optimalDistances[characterId] || 15;
    
    if (distance >= optimalDistance * 0.9) {
        return 'perfect';
    } else if (distance >= optimalDistance * 0.7) {
        return 'good';
    } else if (distance >= optimalDistance * 0.5) {
        return 'average';
    } else {
        return 'suboptimal';
    }
}

/**
 * Get character jump squat frames
 * 
 * @param {number} characterId - Character ID
 * @returns {number} - Jump squat frames
 */
function getCharacterJumpSquatFrames(characterId) {
    const jumpSquatFrames = {
        0: 5,   // Captain Falcon
        1: 6,   // Donkey Kong
        2: 3,   // Fox
        3: 4,   // Mr. Game & Watch
        4: 5,   // Kirby
        5: 8,   // Bowser
        6: 5,   // Link
        7: 4,   // Luigi
        8: 4,   // Mario
        9: 4,   // Marth
        10: 4,  // Mewtwo
        11: 3,  // Ness
        12: 4,  // Peach
        13: 3,  // Pikachu
        14: 4,  // Ice Climbers
        15: 5,  // Jigglypuff
        16: 3,  // Samus
        17: 4,  // Yoshi
        18: 4,  // Zelda
        19: 3,  // Sheik
        20: 5,  // Falco
        21: 4,  // Young Link
        22: 4,  // Dr. Mario
        23: 4,  // Roy
        24: 3,  // Pichu
        25: 6   // Ganondorf
    };
    
    return jumpSquatFrames[characterId] || 4; // Default to 4 if unknown
}

/**
 * Extract character ID from post frame data
 * 
 * @param {Object} playerFrame - Player frame data
 * @returns {number} - Character ID
 */
function getCharacterFromActionState(playerFrame) {
    return playerFrame.post?.characterId ?? 
           playerFrame.pre?.characterId ?? 0;
}

/**
 * Get move name from action state ID
 * 
 * @param {number} actionState - Action state ID
 * @returns {string} - Move name
 */
function getMoveName(actionState) {
    const moveNames = {
        [ACTION_STATES.NAIR]: 'nair',
        [ACTION_STATES.FAIR]: 'fair',
        [ACTION_STATES.BAIR]: 'bair',
        [ACTION_STATES.UAIR]: 'uair',
        [ACTION_STATES.DAIR]: 'dair',
        [ACTION_STATES.FOX_SHINE]: 'shine'
    };
    
    return moveNames[actionState] || `state-${actionState}`;
}

/**
 * Frame data analysis interface for enhanced commentary generation
 * 
 * @param {Object} frameData - Raw Slippi frame data
 * @param {Object} options - Analysis configuration
 * @returns {Object} - Technical analysis with commentary hooks
 */
export function generateTechnicalAnalysis(frameData, options = {}) {
    // Perform raw frame analysis
    const rawAnalysis = analyzeFrameData(frameData, options);
    
    if (rawAnalysis.error) {
        return { error: rawAnalysis.error };
    }
    
    // Generate narrative technical insights
    const insights = {
        technicalExecutionHighlights: [],
        neutralGameInsights: [],
        punishGameEfficiency: [],
        movementOptimization: [],
        playerSpecificTips: {}
    };
    
    // Process technical events into narrative insights
    Object.entries(rawAnalysis.playerMetrics).forEach(([playerIndex, metrics]) => {
        playerIndex = Number(playerIndex);
        
        // Technical execution highlights
        if (metrics.lCancelCount > 0) {
            insights.technicalExecutionHighlights.push({
                playerIndex,
                technique: 'L-canceling',
                insight: `Player ${playerIndex + 1} had a ${metrics.lCancelRate * 100}% L-cancel success rate (${metrics.lCancelSuccess}/${metrics.lCancelCount}).`,
                importance: metrics.lCancelCount > 10 ? 'high' : 'medium'
            });
        }
        
        if (metrics.wavedashCount > 0) {
            insights.technicalExecutionHighlights.push({
                playerIndex,
                technique: 'Wavedashing',
                insight: `Player ${playerIndex + 1} performed ${metrics.wavedashCount} wavedashes during the match.`,
                importance: metrics.wavedashCount > 8 ? 'high' : 'medium'
            });
        }
        
        if (metrics.dashDanceCount > 0) {
            insights.movementOptimization.push({
                playerIndex,
                technique: 'Dash dancing',
                insight: `Player ${playerIndex + 1} used dash dancing ${metrics.dashDanceCount} times for neutral positioning.`,
                importance: metrics.dashDanceCount > 15 ? 'high' : 'medium'
            });
        }
        
        // Process character-specific techniques
        Object.entries(rawAnalysis.advancedTechniques[playerIndex].characterSpecific).forEach(([charId, charTech]) => {
            charId = Number(charId);
            const charName = characterNames[charId] || `Character ${charId}`;
            
            if (charTech.multishine > 0) {
                insights.technicalExecutionHighlights.push({
                    playerIndex,
                    technique: 'Multishine',
                    insight: `Player ${playerIndex + 1} (${charName}) performed ${charTech.multishine} multishines with precise frame timing.`,
                    importance: 'high'
                });
            }
            
            if (charTech.waveshining > 0) {
                insights.technicalExecutionHighlights.push({
                    playerIndex,
                    technique: 'Waveshining',
                    insight: `Player ${playerIndex + 1} (${charName}) executed ${charTech.waveshining} waveshines for extended pressure and combos.`,
                    importance: 'high'
                });
            }
            
            if (charTech.pillaring > 0 && charId === 20) { // Falco
                insights.punishGameEfficiency.push({
                    playerIndex,
                    technique: 'Pillar combos',
                    insight: `Player ${playerIndex + 1} (Falco) executed ${charTech.pillaring} pillar combos (shine → dair sequences).`,
                    importance: 'high'
                });
            }
        });
        
        // Generate player-specific technical tips
        insights.playerSpecificTips[playerIndex] = [];
        
        if (metrics.lCancelCount > 0 && metrics.lCancelRate < 0.7) {
            insights.playerSpecificTips[playerIndex].push({
                area: 'L-canceling',
                tip: `Focus on improving L-cancel consistency. Current rate: ${metrics.lCancelRate * 100}%.`
            });
        }
        
        if (metrics.missedTechs > metrics.successfulTechs) {
            insights.playerSpecificTips[playerIndex].push({
                area: 'Tech skill',
                tip: `Work on tech reactions. Missed ${metrics.missedTechs} techs vs. ${metrics.successfulTechs} successful techs.`
            });
        }
    });
    
    return {
        rawMetrics: rawAnalysis,
        narrativeInsights: insights,
        technicalScore: calculateOverallTechnicalScore(rawAnalysis)
    };
}

/**
 * Calculate overall technical execution score based on analysis
 * 
 * @param {Object} analysis - Frame data analysis results
 * @returns {Object} - Normalized technical scores
 */
function calculateOverallTechnicalScore(analysis) {
    const scores = {};
    
    Object.entries(analysis.playerMetrics).forEach(([playerIndex, metrics]) => {
        // Convert base score and normalize to 0-10 scale
        scores[playerIndex] = parseFloat(metrics.technicalExecutionScore);
    });
    
    return scores;
}