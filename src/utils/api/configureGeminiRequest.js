// src/utils/api/configureGeminiRequest.js
import axios from 'axios';

/**
 * Optimized Gemini request handler with frame-data aware token allocation
 * @param {string} apiKey - Gemini API authentication token
 * @param {string} prompt - Technical analysis prompt
 * @param {Object} options - Configuration parameters
 * @returns {Promise<string>} - Generated technical analysis
 */
export async function executeGeminiRequest(apiKey, prompt, options = {}) {
  // Slippi-optimized defaults
  const {
    maxOutputTokens = 1024,  // Critical parameter adjustment
    temperature = 0.7,
    topP = 0.9,
    topK = 40,
    streamResponse = false,
    logRequest = false
  } = options;

  // Construct request payload with optimized parameters
  const requestPayload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature,
      maxOutputTokens,  // Properly scaled token allocation
      topP,
      topK
    }
  };

  if (logRequest) {
    console.log(`[GEMINI] Executing request with ${maxOutputTokens} tokens`);
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent?key=${apiKey}`,
      requestPayload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    // Extract content with validation
    const textContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent && textContent !== '') {
      throw new Error('Malformed response structure from Gemini API');
    }
    
    return textContent;
  } catch (error) {
    console.error('[GEMINI] API request failed:', error.message);
    if (error.response?.data) {
      console.error('[GEMINI] Error details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}