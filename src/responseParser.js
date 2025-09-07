// src/responseParser.js - Robust Gemini API response parsing utility
/**
 * Specialized parsing utilities for Gemini API responses 
 * Handles edge cases and schema variations in content extraction
 */

/**
 * Extracts content from Gemini API response with comprehensive fallback pathways
 * Addresses edge cases in response structure, type handling, and null safety
 * 
 * @param {Object} response - Axios response object from Gemini API
 * @param {Object} options - Parser configuration options
 * @returns {string|null} - Extracted content or null if extraction fails
 */
export function extractContentFromResponse(response, options = {}) {
    const {
        debug = false,
        fallbackValue = null,
        altPathsEnabled = true,
        returnRawOnFailure = false
    } = options;
    
    // Debug logging
    if (debug) {
        console.log(`Response status: ${response?.status || 'unknown'}`);
        console.log(`Response data: ${JSON.stringify(response?.data || {}, null, 2)}`);
    }
    
    // Handle invalid response objects
    if (!response || !response.data) {
        if (debug) console.error('Invalid response object (null/undefined)');
        return fallbackValue;
    }
    
    try {
        // Primary extraction path (standard Gemini response structure)
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text !== undefined) {
            const content = response.data.candidates[0].content.parts[0].text;
            
            // Type normalization
            if (typeof content === 'string') {
                return content;
            } else {
                if (debug) console.warn(`Non-string content type: ${typeof content}`);
                return String(content);
            }
        }
        
        // Only proceed with alternative paths if enabled
        if (!altPathsEnabled) {
            if (debug) console.warn('Alternative paths disabled, returning fallback value');
            return fallbackValue;
        }
        
        // Access first candidate with comprehensive null safety
        const candidate = response.data?.candidates?.[0];
        if (!candidate) {
            if (debug) console.error('No candidates in response');
            return returnRawOnFailure ? response.data : fallbackValue;
        }
        
        // Alternative extraction path 1: Direct text property
        if (candidate.text !== undefined) {
            return String(candidate.text);
        }
        
        // Alternative extraction path 2: Direct output property
        if (candidate.output !== undefined) {
            return String(candidate.output);
        }
        
        // Alternative extraction path 3: Parts array direct access
        if (candidate.content?.parts && Array.isArray(candidate.content.parts)) {
            if (candidate.content.parts.length > 0) {
                const firstPart = candidate.content.parts[0];
                
                // Handle different part formats
                if (typeof firstPart === 'string') {
                    return firstPart;
                } else if (firstPart && typeof firstPart === 'object') {
                    // Try known content properties
                    if (firstPart.text !== undefined) return String(firstPart.text);
                    if (firstPart.content !== undefined) return String(firstPart.content);
                    if (firstPart.value !== undefined) return String(firstPart.value);
                    
                    // Last resort - stringify the part
                    return JSON.stringify(firstPart);
                }
            }
        }
        
        // Alternative extraction path 4: message.content pattern (like OpenAI)
        if (candidate.message?.content !== undefined) {
            return String(candidate.message.content);
        }
        
        // Alternative extraction path 5: Direct content property
        if (candidate.content !== undefined && typeof candidate.content !== 'object') {
            return String(candidate.content);
        }
        
        // Handle empty or unexpected response
        if (debug) {
            console.error('Unable to extract content from response structure:', 
                JSON.stringify(response.data, null, 2));
        }
        
        return returnRawOnFailure ? response.data : fallbackValue;
    } catch (error) {
        if (debug) console.error('Error extracting content:', error);
        return fallbackValue;
    }
}

/**
 * Determines if a response indicates a safety filter trigger
 * 
 * @param {Object} response - Axios response object from Gemini API
 * @returns {boolean} - Whether safety filters were triggered
 */
export function isSafetyFiltered(response) {
    // Check for specific safety filter indicators
    if (!response || !response.data) return false;
    
    // Check for explicit safety filter fields
    if (response.data.promptFeedback?.safetyRatings) {
        const ratings = response.data.promptFeedback.safetyRatings;
        return ratings.some(rating => 
            rating.probability === 'HIGH' || 
            rating.probability === 'MEDIUM'
        );
    }
    
    // Check for common safety block indicators
    const errorMessage = response.data.error?.message || '';
    return errorMessage.includes('safety') || 
           errorMessage.includes('blocked') || 
           errorMessage.includes('policy') ||
           errorMessage.includes('content filter');
}

/**
 * Analyzes response for specific error conditions
 * 
 * @param {Object} response - Axios response object from Gemini API
 * @returns {Object} - Error analysis results
 */
export function analyzeResponseErrors(response) {
    if (!response) return { hasError: true, type: 'NO_RESPONSE' };
    
    // Handle HTTP error codes
    if (response.status < 200 || response.status >= 300) {
        return {
            hasError: true,
            type: 'HTTP_ERROR',
            status: response.status,
            message: response.statusText,
            details: response.data
        };
    }
    
    // Check for API-level errors in response body
    if (response.data?.error) {
        return {
            hasError: true,
            type: 'API_ERROR',
            code: response.data.error.code,
            message: response.data.error.message,
            details: response.data.error.details || null
        };
    }
    
    // Check for empty candidates array
    if (response.data?.candidates && response.data.candidates.length === 0) {
        return {
            hasError: true,
            type: 'EMPTY_CANDIDATES',
            message: 'Response contains empty candidates array'
        };
    }
    
    // Check for content filtering
    if (isSafetyFiltered(response)) {
        return {
            hasError: true,
            type: 'SAFETY_FILTERED',
            message: 'Content blocked by safety filters',
            details: response.data.promptFeedback || null
        };
    }
    
    // No detected errors
    return { hasError: false };
}
