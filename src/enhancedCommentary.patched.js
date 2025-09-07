// src/enhancedCommentary.js - Patched with robust response parsing
import axios from 'axios';
import { extractContentFromResponse, analyzeResponseErrors } from './responseParser.js';

/**
 * Configuration constants for Gemini API
 */
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent';
const DEFAULT_MAX_TOKENS = 256;
const DEFAULT_TEMPERATURE = 0.7;

/**
 * Enhanced commentary generator using Google's Gemini LLM API
 * Provides technically detailed commentary with frame data analysis
 * 
 * @param {string} apiKey - Google API Key
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
        detailLevel = 'advanced',  // basic, intermediate, advanced, professional
        debug = false
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
        if (debug) {
            console.log(`[DEBUG] Sending prompt to Gemini API: ${fullPrompt.substring(0, 200)}...`);
        }
        
        // Prepare the API request
        const response = await axios.post(
            `${GEMINI_API_ENDPOINT}?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [{ text: fullPrompt }]
                    }
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    topP: 0.9,
                    topK: 40
                }
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        // First check for errors
        const errorAnalysis = analyzeResponseErrors(response);
        if (errorAnalysis.hasError) {
            if (debug) {
                console.error(`[DEBUG] API Error detected: ${errorAnalysis.type}`);
                console.error(errorAnalysis);
            }
            return `Error generating commentary: ${errorAnalysis.message || 'Unknown error'}`;
        }
        
        // Extract content using the robust parser
        const commentary = extractContentFromResponse(response, {
            debug,
            fallbackValue: 'Unable to generate commentary. Please try again with different parameters.',
            altPathsEnabled: true
        });
        
        return commentary || 'No commentary generated from API.';
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
 * @param {string} apiKey - Google API Key
 * @param {Object} matchData - Match statistics and player data
 * @param {Object} options - Configuration options for the analysis
 * @returns {Promise<string>} - The generated coaching advice
 */
export async function generateTechnicalCoachingAdvice(apiKey, matchData, options = {}) {
    const {
        maxTokens = 512,
        temperature = 0.6,
        playerHistory = null,
        focusAreas = [],
        debug = false
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
        if (debug) {
            console.log(`[DEBUG] Sending coaching prompt to Gemini API`);
        }
        
        // Make API request
        const response = await axios.post(
            `${GEMINI_API_ENDPOINT}?key=${apiKey}`,
            {
                contents: [
                    {
                        parts: [{ text: coachingPrompt }]
                    }
                ],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    topP: 0.95,
                    topK: 40
                }
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        // First check for errors
        const errorAnalysis = analyzeResponseErrors(response);
        if (errorAnalysis.hasError) {
            if (debug) {
                console.error(`[DEBUG] API Error detected: ${errorAnalysis.type}`);
                console.error(errorAnalysis);
            }
            return `Error generating coaching advice: ${errorAnalysis.message || 'Unknown error'}`;
        }
        
        // Extract content using the robust parser
        const coaching = extractContentFromResponse(response, {
            debug,
            fallbackValue: 'Unable to generate coaching advice. Please try again with different parameters.',
            altPathsEnabled: true
        });
        
        return coaching || 'No coaching advice generated from API.';
    } catch (error) {
        console.error('Error generating technical coaching advice:', error.message);
        if (error.response) {
            console.error('API error details:', error.response.data);
        }
        throw new Error(`Technical coaching advice generation failed: ${error.message}`);
    }
}

/**
 * Frame data analyzer for advanced technical insights
 * Extracts meaningful patterns from raw Slippi frame data
 * 
 * @param {Object} frameData - Raw Slippi frame data
 * @returns {Object} - Extracted technical insights
 */
export function analyzeFrameData(frameData) {
    if (!frameData || Object.keys(frameData).length === 0) {
        return { error: 'No frame data provided for analysis' };
    }
    
    try {
        // Extract frame windows for technical execution analysis
        const technicalInsights = {
            lCancelTimings: [],
            wavedashTimings: [],
            dashDancePatterns: [],
            shieldPressure: [],
            edgeguardSequences: [],
            neutralPositioning: [],
            actionStateTransitions: []
        };
        
        // Process frame sequences for action state transitions
        // This identifies technical execution patterns
        let previousFrames = {};
        const frameKeys = Object.keys(frameData).sort((a, b) => parseInt(a) - parseInt(b));
        
        frameKeys.forEach(frameIndex => {
            const frame = frameData[frameIndex];
            if (!frame || !frame.players) return;
            
            frame.players.forEach((playerFrame, playerIndex) => {
                if (!playerFrame || !playerFrame.post) return;
                
                const prevPlayerFrame = previousFrames[playerIndex];
                
                // L-cancel detection (transition from aerial to landing with reduced lag)
                if (prevPlayerFrame && 
                    isAerialAttack(prevPlayerFrame.post.actionStateId) && 
                    isLandingAction(playerFrame.post.actionStateId)) {
                    
                    const lagFrames = calculateLandingLag(
                        prevPlayerFrame.post.actionStateId, 
                        playerFrame.post.actionStateId, 
                        frameIndex - prevPlayerFrame.frame
                    );
                    
                    if (lagFrames < getExpectedLandingLag(prevPlayerFrame.post.actionStateId)) {
                        technicalInsights.lCancelTimings.push({
                            frame: parseInt(frameIndex),
                            playerIndex,
                            actionState: playerFrame.post.actionStateId,
                            lagFrames
                        });
                    }
                }
                
                // Wavedash detection (airdodge to ground movement)
                if (prevPlayerFrame && 
                    playerFrame.post.actionStateId === 24 && // Wavedash action state
                    prevPlayerFrame.post.actionStateId === 20) { // Airdodge action state
                    
                    technicalInsights.wavedashTimings.push({
                        frame: parseInt(frameIndex),
                        playerIndex,
                        angle: calculateWavedashAngle(
                            prevPlayerFrame.post.positionX,
                            playerFrame.post.positionX
                        )
                    });
                }
                
                // Store current frame for next iteration
                previousFrames[playerIndex] = {
                    frame: parseInt(frameIndex),
                    post: playerFrame.post
                };
            });
        });
        
        return technicalInsights;
    } catch (error) {
        console.error('Error analyzing frame data:', error);
        return { error: `Frame data analysis failed: ${error.message}` };
    }
}

// Helper functions for frame data analysis
function isAerialAttack(actionStateId) {
    // Action state IDs for aerial attacks
    const aerialAttackStates = [13, 14, 15, 16, 17]; // Fair, Bair, Uair, Dair, Nair
    return aerialAttackStates.includes(actionStateId);
}

function isLandingAction(actionStateId) {
    // Action states for landing
    return actionStateId === 11; // Landing action state
}

function calculateLandingLag(prevActionState, currentActionState, frameDifference) {
    // Simplified lag calculation
    return frameDifference;
}

function getExpectedLandingLag(actionStateId) {
    // Standard landing lag frames by move type (simplified)
    const standardLag = {
        13: 12, // Fair
        14: 12, // Bair
        15: 12, // Uair
        16: 12, // Dair
        17: 10  // Nair
    };
    
    return standardLag[actionStateId] || 12;
}

function calculateWavedashAngle(prevX, currentX) {
    // Simplified angle calculation
    const xDifference = currentX - prevX;
    return xDifference > 0 ? 'forward' : 'backward';
}