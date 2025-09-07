// src/utils/api/openaiHandler.js
import axios from 'axios';

/**
 * Executes OpenAI API request with support for local LM Studio models
 * 
 * @param {string} apiKey - OpenAI API key or 'local' for LM Studio
 * @param {string} prompt - Technical analysis prompt
 * @param {Object} options - Configuration parameters
 * @returns {Promise<string>} - Generated text from AI model
 */
export async function executeOpenAIRequest(apiKey, prompt, options = {}) {
  // Default parameters optimized for technical Slippi analysis
  const {
    model = 'gpt-3.5-turbo', // Can be upgraded to gpt-4 for more advanced analysis
    maxTokens = 1024,
    temperature = 0.7,
    topP = 1.0,
    frequencyPenalty = 0,
    presencePenalty = 0,
    logRequest = false,
    localEndpoint = 'http://localhost:1234/v1', // LM Studio default endpoint
    useLocalModel = apiKey === 'local',  // Automatic if apiKey is 'local'
    systemPrompt = 'You are an expert Super Smash Bros. Melee technical analyst and coach with deep knowledge of frame data, competitive play, and technical execution.'
  } = options;

  // Determine if we should use local model or OpenAI
  const isLocal = useLocalModel || apiKey === 'local';
  
  // Set up API endpoint based on local or remote
  // Fixed: Removed newline character and corrected endpoint path
  const apiEndpoint = isLocal 
    ? `${localEndpoint}/chat/completions` 
    : 'https://api.openai.com/v1/chat/completions';

  if (logRequest) {
    console.log(`[${isLocal ? 'LOCAL_LLM' : 'OPENAI'}] Executing request to model ${model} with ${maxTokens} max tokens`);
  }

  try {
    // Create headers based on local or OpenAI
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add OpenAI authentication if not using local model
    if (!isLocal) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Send the request with appropriate configuration
    const response = await axios.post(
      apiEndpoint,
      {
        model: isLocal ? 'local-model' : model, // LM Studio uses any model name
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      },
      { headers }
    );

    // Extract content using standard OpenAI response format
    // This works for both OpenAI and LM Studio's compatible API
    if (response.data?.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    } else {
      console.error(`[${isLocal ? 'LOCAL_LLM' : 'OPENAI'}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      return 'Unable to generate content due to unexpected API response format.';
    }
  } catch (error) {
    console.error(`[${isLocal ? 'LOCAL_LLM' : 'OPENAI'}] API request failed:`, error.message);
    if (error.response?.data) {
      console.error(`[${isLocal ? 'LOCAL_LLM' : 'OPENAI'}] Error details:`, JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`AI request failed: ${error.message}`);
  }
}