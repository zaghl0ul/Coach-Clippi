// src/utils/api/extractGeminiContent.js - Optimized for empty content detection
/**
 * Enhanced content extraction utility for Gemini API responses
 * Implements robust parsing logic to handle MAX_TOKENS edge cases and empty responses
 * 
 * @param {Object} response - Axios response object from Gemini API
 * @returns {string|null} - Extracted content or null for retry logic
 */
export function extractGeminiContent(response) {
  // Handle null/undefined response
  if (!response || !response.data) {
    return null;
  }
  
  // Primary traversal path with nullish coalescing
  const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Check for empty string responses (the MAX_TOKENS edge case)
  if (content === '') {
    // Extract finish reason for diagnostic logging
    const finishReason = response.data?.candidates?.[0]?.finishReason;
    console.warn(`Empty content received with finishReason: ${finishReason}`);
    
    // Check token metadata for diagnostics
    const tokenMetadata = response.data?.usageMetadata;
    if (tokenMetadata) {
      console.info(`Token usage: prompt=${tokenMetadata.promptTokenCount}, total=${tokenMetadata.totalTokenCount}`);
    }
    
    return null; // Signal empty content for retry handling
  }
  
  return content || null;
}