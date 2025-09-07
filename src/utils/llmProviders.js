// src/utils/llmProviders.js - LLM Provider Abstraction Layer
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import dotenv from 'dotenv';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../../.env');

// Load environment variables
dotenv.config({ path: ENV_PATH });

/**
 * Base LLM Provider interface
 * Defines the contract for all LLM providers
 */
class LLMProvider {
  constructor(config) {
    this.name = 'BaseProvider';
    this.config = config || {};
  }
  
  /**
   * Generate completion from prompt
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options) {
    throw new Error('Method must be implemented by subclass');
  }
  
  /**
   * Test connection to provider
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    throw new Error('Method must be implemented by subclass');
  }
}

/**
 * Local LM Studio Provider implementation
 * Interfaces with locally hosted language models via LM Studio
 */
class LMStudioProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'LM Studio';
    this.endpoint = config.endpoint || 'http://localhost:1234/v1';
  }
  
  /**
   * Generate completion using local LM Studio endpoint
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Sending request to: ${this.endpoint}`);
      
      const response = await axios.post(`${this.endpoint}/chat/completions`, {
        model: 'local-model',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      });
      
      // Extract content based on OpenAI compatible format
      if (response.data?.choices && response.data.choices.length > 0 && response.data.choices[0].message?.content) {
        return response.data.choices[0].message.content.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from LM Studio');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to LM Studio
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        endpoint: this.endpoint
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * OpenAI Provider implementation
 * Interfaces with OpenAI API for model inference
 */
class OpenAIProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'OpenAI';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }
  
  /**
   * Generate completion using OpenAI API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.choices && response.data.choices.length > 0 && 
          response.data.choices[0].message?.content) {
        return response.data.choices[0].message.content.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from OpenAI');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to OpenAI
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * Google Gemini Provider implementation
 * Interfaces with Google's Generative AI API
 */
class GeminiProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'Google Gemini';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-pro';
    this.apiVersion = 'v1beta';
    this.endpoint = `https://generativelanguage.googleapis.com/${this.apiVersion}/models/${this.model}:generateContent`;
    
    if (!this.apiKey) {
      throw new Error('Google API key is required for Gemini');
    }
  }
  
  /**
   * Generate completion using Google Gemini API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      // Combine system prompt and user prompt for Gemini
      const combinedPrompt = `${systemPrompt}\n\n${prompt}`;
      
      // Prepare request structure according to v1beta API specs
      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: combinedPrompt }]
          }
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
          topK: 40
        }
      };
      
      const response = await axios.post(
        `${this.endpoint}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Extract content from Gemini v1beta API response structure
      if (response.data?.candidates && 
          response.data.candidates.length > 0 && 
          response.data.candidates[0].content?.parts && 
          response.data.candidates[0].content.parts.length > 0) {
        const textContent = response.data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('')
          .trim();
          
        return textContent || "No text content found in response";
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Gemini API');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to Google Gemini API
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      // Use a simple prompt for testing connection
      const result = await this.generateCompletion('Say "Connected successfully" if you can read this', { 
        maxTokens: 20,
        temperature: 0.1,
        systemPrompt: 'You are a helpful assistant.'
      });
      
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model,
        apiVersion: this.apiVersion
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name,
        model: this.model
      };
    }
  }
}

/**
 * OpenRouter Provider implementation
 * Interfaces with OpenRouter API for access to multiple models
 */
class OpenRouterProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'OpenRouter';
    this.apiKey = config.apiKey;
    this.model = config.model || 'openai/gpt-3.5-turbo';
    this.endpoint = 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is required');
    }
  }
  
  /**
   * Fetch all available models from OpenRouter
   * @returns {Promise<Array>} - Array of available models
   */
  async fetchAvailableModels() {
    try {
      console.log(`[${this.name}] Fetching available models...`);
      
      const response = await axios.get(`${this.endpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        const models = response.data.data.map(model => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          context_length: model.context_length || 0,
          pricing: model.pricing || {},
          top_provider: model.top_provider || {}
        }));
        
        console.log(`[${this.name}] Found ${models.length} available models`);
        return models;
      }
      
      throw new Error('Invalid models response from OpenRouter');
    } catch (error) {
      console.error(`[${this.name}] Failed to fetch models:`, error.message);
      
      // Return fallback models if API fails
      return [
        { id: 'anthropic/claude-3.5-sonnet:beta', name: 'Claude 3.5 Sonnet' },
        { id: 'openai/gpt-4-turbo-preview', name: 'GPT-4 Turbo' },
        { id: 'anthropic/claude-3-opus:beta', name: 'Claude 3 Opus' },
        { id: 'google/gemini-pro', name: 'Gemini Pro' },
        { id: 'anthropic/claude-3-haiku:beta', name: 'Claude 3 Haiku' },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ];
    }
  }
  
  /**
   * Generate completion using OpenRouter API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      const response = await axios.post(`${this.endpoint}/chat/completions`, {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://slippi-coach.local',
          'X-Title': 'Slippi Coach'
        }
      });
      
      if (response.data?.choices && response.data.choices.length > 0 && 
          response.data.choices[0].message?.content) {
        return response.data.choices[0].message.content.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from OpenRouter');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to OpenRouter
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * AWS Bedrock Provider implementation
 * Interfaces with AWS Bedrock API for various AI models
 */
class BedrockProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'AWS Bedrock';
    this.accessKeyId = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.region = config.region || 'us-east-1';
    this.model = config.model || 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required for Bedrock');
    }
  }
  
  /**
   * Create AWS signature for request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {string} body - Request body
   * @param {Object} headers - Request headers
   * @returns {Object} - Signed headers
   */
  async createAwsSignature(method, url, body, headers) {
    // This is a simplified implementation - in production you'd want to use AWS SDK
    const crypto = await import('crypto');
    
    const urlParts = new URL(url);
    const host = urlParts.hostname;
    const canonicalUri = urlParts.pathname;
    const canonicalQuery = urlParts.search.slice(1);
    
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    // Create canonical headers
    const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-date';
    
    // Create payload hash
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    
    // Create canonical request
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    
    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/bedrock/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    
    // Calculate signature
    const getSignatureKey = (key, dateStamp, regionName, serviceName) => {
      const kDate = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
      const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
      const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
      const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
      return kSigning;
    };
    
    const signingKey = getSignatureKey(this.secretAccessKey, dateStamp, this.region, 'bedrock');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    
    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    return {
      ...headers,
      'Authorization': authorizationHeader,
      'X-Amz-Date': amzDate,
      'Host': host
    };
  }
  
  /**
   * Generate completion using AWS Bedrock API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      // Prepare request body based on model type
      let requestBody;
      if (this.model.includes('anthropic.claude')) {
        requestBody = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: maxTokens,
          temperature,
          messages: [
            {
              role: "user",
              content: `${systemPrompt}\n\n${prompt}`
            }
          ]
        };
      } else if (this.model.includes('amazon.titan')) {
        requestBody = {
          inputText: `${systemPrompt}\n\n${prompt}`,
          textGenerationConfig: {
            maxTokenCount: maxTokens,
            temperature,
            topP: 0.9
          }
        };
      } else {
        // Default format
        requestBody = {
          prompt: `${systemPrompt}\n\n${prompt}`,
          max_tokens: maxTokens,
          temperature
        };
      }
      
      const body = JSON.stringify(requestBody);
      const url = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${this.model}/invoke`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const signedHeaders = await this.createAwsSignature('POST', url, body, headers);
      
      const response = await axios.post(url, body, { headers: signedHeaders });
      
      // Extract content based on model type
      if (this.model.includes('anthropic.claude')) {
        if (response.data?.content && response.data.content.length > 0) {
          return response.data.content[0].text.trim();
        }
      } else if (this.model.includes('amazon.titan')) {
        if (response.data?.results && response.data.results.length > 0) {
          return response.data.results[0].outputText.trim();
        }
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from AWS Bedrock');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to AWS Bedrock
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model,
        region: this.region
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * Anthropic Claude Provider implementation
 * Interfaces with Anthropic API for Claude models
 */
class AnthropicProvider extends LLMProvider {
  constructor(config) {
    super(config);
    this.name = 'Anthropic Claude';
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-2';
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }
  
  /**
   * Generate completion using Anthropic API
   * @param {string} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(prompt, options = {}) {
    const { 
      maxTokens = 100, 
      temperature = 0.7,
      systemPrompt = 'You are a helpful assistant.'
    } = options;
    
    try {
      console.log(`[${this.name}] Generating using model: ${this.model}`);
      
      // Format prompt for Claude (including system instructions)
      const formattedPrompt = `${systemPrompt}\n\nHuman: ${prompt}\n\nAssistant:`;
      
      const response = await axios.post('https://api.anthropic.com/v1/complete', {
        model: this.model,
        prompt: formattedPrompt,
        max_tokens_to_sample: maxTokens,
        temperature
      }, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        }
      });
      
      if (response.data?.completion) {
        return response.data.completion.trim();
      }
      
      console.error(`[${this.name}] Unexpected response structure:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Anthropic');
    } catch (error) {
      console.error(`[${this.name}] API Error:`, error.message);
      if (error.response?.data) {
        console.error(`[${this.name}] Response details:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
  
  /**
   * Test connection to Anthropic
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    try {
      const result = await this.generateCompletion('Test connection', { 
        maxTokens: 10,
        systemPrompt: 'Respond with "Connected" if you can read this.'
      });
      return { 
        success: true, 
        response: result,
        provider: this.name,
        model: this.model
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        provider: this.name
      };
    }
  }
}

/**
 * Provider Factory
 * Creates appropriate provider instance based on type
 * 
 * @param {string} type - Provider type
 * @param {Object} config - Provider configuration
 * @returns {LLMProvider} - Provider instance
 */
export function createLLMProvider(type, config) {
  switch (type.toLowerCase()) {
    case 'lmstudio':
    case 'local':
      return new LMStudioProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'gemini':
    case 'google':
      return new GeminiProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'bedrock':
    case 'aws':
    case 'aws-bedrock':
      return new BedrockProvider(config);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

/**
 * Template-based provider that requires no API connection
 * Fallback for when no LLM is available
 */
export class TemplateProvider extends LLMProvider {
  constructor() {
    super();
    this.name = 'Template System';
  }
  
  /**
   * Generate completion using templates
   * This is just a stub that will be replaced by actual template system
   */
  async generateCompletion(prompt, options = {}) {
    // The actual implementation will be in the respective modules
    return `Template system activated: ${prompt.substring(0, 20)}...`;
  }
  
  /**
   * Test connection (always succeeds since it's local)
   */
  async testConnection() {
    return { 
      success: true, 
      response: "Template system ready",
      provider: this.name
    };
  }
}

/**
 * Interactive provider selection utility
 * Prompts user to choose and configure an LLM provider
 * 
 * @returns {Promise<LLMProvider>} - Selected and configured provider
 */
export async function selectLLMProvider() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  try {
    console.log("\n========================================");
    console.log("🤖 SLIPPI COACH LLM PROVIDER SELECTION 🤖");
    console.log("========================================");
    console.log("1. Local LM Studio");
    console.log("2. OpenAI (GPT models)");
    console.log("3. Anthropic (Claude models)");
    console.log("4. Google (Gemini models)");
    console.log("5. OpenRouter (Multi-model API)");
    console.log("6. AWS Bedrock (Amazon AI models)");
    console.log("7. Template System (no LLM)");
    
    const selection = await question("\nSelect a provider (1-7): ");
    let provider;
    
    switch (selection.trim()) {
      case '1':
        const endpoint = await question("Enter LM Studio endpoint (default: http://localhost:1234/v1): ");
        provider = createLLMProvider('lmstudio', { 
          endpoint: endpoint.trim() || 'http://localhost:1234/v1' 
        });
        break;
        
      case '2':
        const openaiKey = await question("Enter OpenAI API key: ");
        if (!openaiKey.trim()) {
          console.log("❌ OpenAI API key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const openaiModel = await question("Enter model name (default: gpt-3.5-turbo): ");
        provider = createLLMProvider('openai', { 
          apiKey: openaiKey.trim(),
          model: openaiModel.trim() || 'gpt-3.5-turbo'
        });
        
        // Update .env with API key
        updateEnvFile('OPENAI_API_KEY', openaiKey.trim());
        break;
        
      case '3':
        const anthropicKey = await question("Enter Anthropic API key: ");
        if (!anthropicKey.trim()) {
          console.log("❌ Anthropic API key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const anthropicModel = await question("Enter model name (default: claude-2): ");
        provider = createLLMProvider('anthropic', { 
          apiKey: anthropicKey.trim(),
          model: anthropicModel.trim() || 'claude-2'
        });
        
        // Update .env with API key
        updateEnvFile('ANTHROPIC_API_KEY', anthropicKey.trim());
        break;
      
      case '4':
        const geminiKey = await question("Enter Google API key: ");
        if (!geminiKey.trim()) {
          console.log("❌ Google API key is required for Gemini.");
          provider = new TemplateProvider();
          break;
        }
        
        const geminiModel = await question("Enter model name (default: gemini-pro): ");
        provider = createLLMProvider('gemini', { 
          apiKey: geminiKey.trim(),
          model: geminiModel.trim() || 'gemini-pro'
        });
        
        // Update .env with API key
        updateEnvFile('GEMINI_API_KEY', geminiKey.trim());
        break;
        
      case '5':
        const openrouterKey = await question("Enter OpenRouter API key: ");
        if (!openrouterKey.trim()) {
          console.log("❌ OpenRouter API key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const openrouterModel = await question("Enter model name (default: openai/gpt-3.5-turbo): ");
        provider = createLLMProvider('openrouter', { 
          apiKey: openrouterKey.trim(),
          model: openrouterModel.trim() || 'openai/gpt-3.5-turbo'
        });
        
        // Update .env with API key
        updateEnvFile('OPENROUTER_API_KEY', openrouterKey.trim());
        break;
        
      case '6':
        const awsAccessKey = await question("Enter AWS Access Key ID: ");
        if (!awsAccessKey.trim()) {
          console.log("❌ AWS Access Key ID is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const awsSecretKey = await question("Enter AWS Secret Access Key: ");
        if (!awsSecretKey.trim()) {
          console.log("❌ AWS Secret Access Key is required.");
          provider = new TemplateProvider();
          break;
        }
        
        const awsRegion = await question("Enter AWS Region (default: us-east-1): ");
        const bedrockModel = await question("Enter Bedrock model (default: anthropic.claude-3-sonnet-20240229-v1:0): ");
        
        provider = createLLMProvider('bedrock', { 
          accessKeyId: awsAccessKey.trim(),
          secretAccessKey: awsSecretKey.trim(),
          region: awsRegion.trim() || 'us-east-1',
          model: bedrockModel.trim() || 'anthropic.claude-3-sonnet-20240229-v1:0'
        });
        
        // Update .env with AWS credentials
        updateEnvFile('AWS_ACCESS_KEY_ID', awsAccessKey.trim());
        updateEnvFile('AWS_SECRET_ACCESS_KEY', awsSecretKey.trim());
        updateEnvFile('AWS_REGION', awsRegion.trim() || 'us-east-1');
        break;

      case '7':
        provider = new TemplateProvider();
        break;
        
      default:
        console.log("Invalid selection. Defaulting to Template System.");
        provider = new TemplateProvider();
    }
    
    // Test connection
    console.log(`\nTesting connection to ${provider.name}...`);
    const testResult = await provider.testConnection();
    
    if (testResult.success) {
      console.log(`✅ Successfully connected to ${provider.name}`);
      if (testResult.response) {
        console.log(`Response: "${testResult.response}"`);
      }
    } else {
      console.log(`❌ Failed to connect to ${provider.name}: ${testResult.error}`);
      console.log("Defaulting to template-based system without LLM.");
      provider = new TemplateProvider();
    }
    
    rl.close();
    return provider;
  } catch (error) {
    console.error("Error during provider selection:", error.message);
    rl.close();
    return new TemplateProvider(); // Fallback to template system
  }
}

/**
 * Updates .env file with new key-value pair
 * 
 * @param {string} key - Environment variable key
 * @param {string} value - Environment variable value
 */
function updateEnvFile(key, value) {
  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    const keyExists = envContent.includes(`${key}=`);
    
    if (keyExists) {
      // Update existing key
      const regex = new RegExp(`${key}=.*`, 'g');
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim());
    console.log(`Updated ${key} in .env file`);
  } catch (error) {
    console.error(`Failed to update .env file: ${error.message}`);
  }
}

// Default exports
export default {
  createLLMProvider,
  selectLLMProvider,
  TemplateProvider
};
