// src/utils/api/handleGeminiRequest.js
import axios from 'axios';
import { determineTokenAllocation } from './geminiTokenManager.js';
import { extractGeminiContent } from './extractGeminiContent.js';

/**
 * Enhanced Gemini API request handler with optimized token allocation for Slippi analysis
 * 
 * @param {string} apiKey - Gemini API key
 * @param {string} prompt - Analysis prompt for the model
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - Generated analysis content
 */
export async function handleGeminiRequest(apiKey, prompt, options = {}) {
  const {
    analysisType = 'default',
    replayData = null,
    temperature = 0.7,
    topP = 0.9,
    topK = 40,
    candidateCount = 1,
    stopSequences = [],
    timeout = 15000,
    retryCount = 2
  } = options;
  
  // Determine optimal token allocation based on analysis context
  const maxOutputTokens = options.maxOutputTokens || 
                         determineTokenAllocation(analysisType, replayData) || 
                         1024; // Fallback to 1024 tokens
  
  // Construct request with optimized parameters
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens,
      topP,
      topK,
      candidateCount,
      stopSequences
    }
  };
  
  // Execute request with retry logic for resilience
  let attempts = 0;
  let lastError = null;
  
  while (attempts <= retryCount) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent?key=${apiKey}`,
        requestBody,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout
        }
      );
      
      // Extract content using robust extraction utility
      const content = extractGeminiContent(response);
      
      // Validate meaningful content generation
      if (content && content.trim().length > 0) {
        return content;
      } else {
        // Empty content despite successful request - try with increased tokens
        console.warn(`Empty content response received. Retrying with increased token allocation.`);
        requestBody.generationConfig.maxOutputTokens = Math.min(maxOutputTokens * 2, 4096);
        attempts++;
        continue;
      }
    } catch (error) {
      lastError = error;
      
      // Handle specific error cases
      if (error.response?.status === 429) {
        console.warn(`Rate limit exceeded. Retrying after exponential backoff...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        attempts++;
        continue;
      }
      
      // Log technical details for debugging
      console.error(`Gemini API request failed (attempt ${attempts + 1}/${retryCount + 1}):`, error.message);
      if (error.response?.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      attempts++;
    }
  }
  
  // All retry attempts exhausted
  throw lastError || new Error('Failed to generate content after multiple attempts');
}