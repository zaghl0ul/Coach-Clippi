// src/integratedCommentary.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import the hybrid commentary system
import { provideHybridCommentary, COMMENTARY_MODES } from './hybridCommentary.js';

// Import the enhanced coaching system
import { generateEnhancedCoaching, COACHING_PROFILES } from './enhancedTechnicalCoaching.js';

// Import configuration utilities
import { getConfig, setConfig } from './utils/configManager.js';

// Get the directory name properly in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

/**
 * Configuration manager for AI integration
 * Controls LLM endpoints, API keys, and caching behavior
 */
export class AIConfigManager {
  constructor() {
    this.settings = {
      useLocalLLM: getConfig('API_KEY') === 'local',
      localEndpoint: getConfig('LM_STUDIO_ENDPOINT') || 'http://localhost:1234/v1',
      apiKey: getConfig('API_KEY'),
      commentaryMode: COMMENTARY_MODES.HYBRID,
      coachingProfile: COACHING_PROFILES.COMPREHENSIVE,
      cacheEnabled: true,
      maxCacheEntries: 100
    };
    
    // Cache for commentary and coaching
    this.commentaryCache = new Map();
    this.coachingCache = new Map();
  }
  
  /**
   * Sets AI configuration value by key
   * 
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   * @returns {boolean} - Success status
   */
  setConfig(key, value) {
    if (this.settings.hasOwnProperty(key)) {
      this.settings[key] = value;
      
      // Update .env file for persistent configs
      if (key === 'useLocalLLM') {
        setConfig('API_KEY', value ? 'local' : (getConfig('OPENAI_API_KEY_BACKUP') || ''));
      } else if (key === 'localEndpoint') {
        setConfig('LM_STUDIO_ENDPOINT', value);
      } else if (key === 'apiKey' && !this.settings.useLocalLLM) {
        setConfig('API_KEY', value);
        setConfig('OPENAI_API_KEY_BACKUP', value);
      }
      
      return true;
    }
    return false;
  }
  
  /**
   * Gets AI configuration value by key
   * 
   * @param {string} key - Configuration key
   * @returns {any} - Configuration value
   */
  getConfig(key) {
    return this.settings[key];
  }
  
  /**
   * Clears all cache entries
   */
  clearCache() {
    this.commentaryCache.clear();
    this.coachingCache.clear();
    console.log('AI cache cleared');
  }
  
  /**
   * Checks and manages cache size
   * Removes oldest entries when exceeding maximum size
   * 
   * @param {Map} cache - Cache map to manage
   */
  _manageCacheSize(cache) {
    if (cache.size > this.settings.maxCacheEntries) {
      // Get oldest entries based on timestamp
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries to get back to 75% capacity
      const removeCount = Math.ceil(cache.size * 0.25);
      entries.slice(0, removeCount).forEach(([key]) => {
        cache.delete(key);
      });
    }
  }
}

/**
 * Main integration class for AI-powered Slippi commentary and coaching
 * Provides unified interface for both local and API-based LLM capabilities
 */
export class SlippiAIIntegration {
  constructor() {
    this.configManager = new AIConfigManager();
    console.log(`Initializing Slippi AI Integration: ${this.configManager.settings.useLocalLLM ? 'Local LLM' : 'API-based LLM'}`);
  }
  
  /**
   * Generates commentary for gameplay events
   * Optimized for low-latency real-time commentary during matches
   * 
   * @param {Array} events - Gameplay events to comment on
   * @param {Object} options - Configuration options
   * @returns {Promise<string>} - Generated commentary
   */
  async generateCommentary(events, options = {}) {
    if (!events || events.length === 0) {
      return null;
    }
    
    const apiKey = this.configManager.settings.useLocalLLM ? 'local' : this.configManager.settings.apiKey;
    const commentaryMode = options.commentaryMode || this.configManager.settings.commentaryMode;
    
    const localOptions = {
      ...options,
      commentaryMode,
      cacheEnabled: this.configManager.settings.cacheEnabled,
      localEndpoint: this.configManager.settings.localEndpoint
    };
    
    try {
      // Generate commentary using the hybrid system
      const commentary = await provideHybridCommentary(apiKey, events, localOptions);
      return commentary;
    } catch (error) {
      console.error('Error generating commentary:', error.message);
      // Always fall back to template mode on error
      return provideHybridCommentary(null, events, { 
        ...localOptions, 
        commentaryMode: COMMENTARY_MODES.TEMPLATE_ONLY 
      });
    }
  }
  
  /**
   * Generates detailed coaching advice based on match data
   * Optimized for comprehensive post-match analysis
   * 
   * @param {Object} matchData - Structured match statistics and player data
   * @param {Object} options - Configuration options
   * @returns {Promise<string>} - Technical coaching advice
   */
  async generateCoaching(matchData, options = {}) {
    if (!matchData) {
      return 'Insufficient match data for coaching analysis';
    }
    
    const apiKey = this.configManager.settings.useLocalLLM ? 'local' : this.configManager.settings.apiKey;
    const coachingProfile = options.coachingProfile || this.configManager.settings.coachingProfile;
    
    const localOptions = {
      ...options,
      coachingProfile,
      cacheEnabled: this.configManager.settings.cacheEnabled,
      localEndpoint: this.configManager.settings.localEndpoint
    };
    
    try {
      // Generate detailed coaching using the enhanced coaching system
      const coaching = await generateEnhancedCoaching(apiKey, matchData, localOptions);
      return coaching;
    } catch (error) {
      console.error('Error generating coaching advice:', error.message);
      
      // Fall back to simplified template-based coaching on error
      return generateFallbackCoaching(matchData);
    }
  }
  
  /**
   * Tests LLM connectivity with a simple request
   * Verifies API key validity or local LLM availability
   * 
   * @returns {Promise<Object>} - Test results
   */
  async testLLMConnectivity() {
    const apiKey = this.configManager.settings.useLocalLLM ? 'local' : this.configManager.settings.apiKey;
    const isLocal = this.configManager.settings.useLocalLLM;
    const endpoint = isLocal ? this.configManager.settings.localEndpoint : 'OpenAI API';
    
    console.log(`Testing connectivity to ${endpoint}...`);
    
    try {
      // Import dynamically to avoid circular dependencies
      const { executeOpenAIRequest } = await import('./utils/api/openaiHandler.js');
      
      // Use a simple test prompt
      const testPrompt = "Generate a one-sentence test response about Super Smash Bros Melee.";
      
      // Execute request with appropriate options
      const result = await executeOpenAIRequest(apiKey, testPrompt, {
        maxTokens: 50,
        temperature: 0.7,
        useLocalModel: isLocal,
        localEndpoint: isLocal ? this.configManager.settings.localEndpoint : undefined,
        logRequest: true
      });
      
      return {
        success: true,
        message: `Successfully connected to ${endpoint}`,
        response: result,
        endpoint
      };
    } catch (error) {
      console.error(`Failed to connect to ${endpoint}:`, error.message);
      
      return {
        success: false,
        message: `Failed to connect to ${endpoint}: ${error.message}`,
        error: error.message,
        endpoint
      };
    }
  }
  
  /**
   * Sets up the integration to use local LLM via LM Studio
   * 
   * @param {string} endpoint - LM Studio endpoint URL
   * @returns {Promise<boolean>} - Success status
   */
  async setupLocalLLM(endpoint = 'http://localhost:1234/v1') {
    try {
      this.configManager.setConfig('useLocalLLM', true);
      this.configManager.setConfig('localEndpoint', endpoint);
      
      // Test connectivity
      const testResult = await this.testLLMConnectivity();
      
      if (testResult.success) {
        console.log('Successfully configured local LLM integration');
        return true;
      } else {
        console.error('Failed to connect to local LLM:', testResult.message);
        
        // Revert to API mode if local fails
        this.configManager.setConfig('useLocalLLM', false);
        return false;
      }
    } catch (error) {
      console.error('Error setting up local LLM:', error.message);
      return false;
    }
  }
  
  /**
   * Sets up the integration to use OpenAI API
   * 
   * @param {string} apiKey - OpenAI API key
   * @returns {Promise<boolean>} - Success status
   */
  async setupOpenAIAPI(apiKey) {
    try {
      if (!apiKey) {
        throw new Error('Invalid API key');
      }
      
      this.configManager.setConfig('useLocalLLM', false);
      this.configManager.setConfig('apiKey', apiKey);
      
      // Test connectivity
      const testResult = await this.testLLMConnectivity();
      
      if (testResult.success) {
        console.log('Successfully configured OpenAI API integration');
        return true;
      } else {
        console.error('Failed to connect to OpenAI API:', testResult.message);
        return false;
      }
    } catch (error) {
      console.error('Error setting up OpenAI API:', error.message);
      return false;
    }
  }
}

/**
 * Generates fallback coaching advice using templates when LLM is unavailable
 * Ensures robustness even when AI services are down
 * 
 * @param {Object} matchData - Match statistics and player data
 * @returns {string} - Basic coaching advice
 */
function generateFallbackCoaching(matchData) {
  try {
    // Extract character info
    const characterInfo = matchData.characters 
      ? matchData.characters.map((charId, idx) => {
          const charNames = {
            0: "Captain Falcon", 1: "Donkey Kong", 2: "Fox", 3: "Mr. Game & Watch",
            4: "Kirby", 5: "Bowser", 6: "Link", 7: "Luigi", 8: "Mario", 9: "Marth",
            10: "Mewtwo", 11: "Ness", 12: "Peach", 13: "Pikachu", 14: "Ice Climbers",
            15: "Jigglypuff", 16: "Samus", 17: "Yoshi", 18: "Zelda", 19: "Sheik",
            20: "Falco", 21: "Young Link", 22: "Dr. Mario", 23: "Roy", 24: "Pichu",
            25: "Ganondorf"
          };
          
          const charName = typeof charId === 'string' 
              ? charId 
              : (charNames[charId] || 'Unknown');
          
          return {
              playerNumber: idx + 1,
              character: charName,
              damageDealt: matchData.damageDealt?.[idx] || 0,
              stocksLost: matchData.stockLosses?.[idx] || 0
          };
        })
      : [];
    
    if (characterInfo.length === 0) {
      return 'Insufficient data for coaching analysis';
    }
    
    // Basic performance assessment
    const performanceAssessments = characterInfo.map(player => {
      const damagePerStock = player.stocksLost > 0 ? player.damageDealt / player.stocksLost : player.damageDealt;
      let performance;
      
      if (damagePerStock > 200) performance = 'excellent';
      else if (damagePerStock > 150) performance = 'very good';
      else if (damagePerStock > 100) performance = 'good';
      else if (damagePerStock > 50) performance = 'fair';
      else performance = 'needs improvement';
      
      return { player, performance, damagePerStock };
    });
    
    // Generate basic coaching advice based on character and performance
    let coaching = `# Coaching Analysis\n\n`;
    
    performanceAssessments.forEach(({ player, performance, damagePerStock }) => {
      coaching += `## Player ${player.playerNumber} (${player.character})\n\n`;
      coaching += `Overall Performance: ${performance.toUpperCase()}\n`;
      coaching += `Damage per Stock: ${damagePerStock.toFixed(1)}\n\n`;
      
      // Character-specific advice
      coaching += `### Character-Specific Advice\n\n`;
      
      switch (player.character) {
        case 'Fox':
          coaching += `- Focus on implementing shine OoS (Out of Shield) for defense\n`;
          coaching += `- Practice short hop double laser for stage control\n`;
          coaching += `- Work on upthrow to upair kill confirms at high percent\n`;
          coaching += `- Practice perfect ledgedashes for invincible edge options\n`;
          break;
        case 'Falco':
          coaching += `- Practice laser height mixups to control opponent approach\n`;
          coaching += `- Implement shine to dair pillar combos on fast fallers\n`;
          coaching += `- Work on platform tech chasing with uptilt and upair\n`;
          coaching += `- Focus on using backair for wall of pain edgeguarding\n`;
          break;
        case 'Marth':
          coaching += `- Practice dash dance grab into pivot tipper at mid percent\n`;
          coaching += `- Work on upthrow chaingrab on spacies on Final Destination\n`;
          coaching += `- Focus on offstage edgeguarding with fair and dair\n`;
          coaching += `- Implement platform movement for safer neutral approaches\n`;
          break;
        case 'Captain Falcon':
          coaching += `- Practice nair into knee kill confirms at high percent\n`;
          coaching += `- Work on tech chasing with regrab for extended punishes\n`;
          coaching += `- Implement platform movement for safer neutral approaches\n`;
          coaching += `- Focus on edgeguarding with nair and knee\n`;
          break;
        default:
          coaching += `- Practice fundamental neutral positioning and spacing\n`;
          coaching += `- Work on character-specific combo extensions\n`;
          coaching += `- Focus on incorporating advanced movement techniques\n`;
          coaching += `- Implement proper defensive options and recovery mixups\n`;
      }
      
      // General advice
      coaching += `\n### General Improvement Areas\n\n`;
      coaching += `- **Technical Execution**: Practice L-cancelling consistently and incorporate wavedashing for movement\n`;
      coaching += `- **Neutral Game**: Focus on controlling stage position and reacting to opponent commitments\n`;
      coaching += `- **Punish Game**: Maximize damage from each opening with practiced combo sequences\n`;
      coaching += `- **Defense**: Implement proper DI and tech options to extend survival\n`;
      coaching += `\n`;
    });
    
    // Matchup advice if there are exactly 2 players
    if (characterInfo.length === 2) {
      coaching += `## Matchup Advice: ${characterInfo[0].character} vs ${characterInfo[1].character}\n\n`;
      coaching += `- Focus on understanding frame advantages in neutral interactions\n`;
      coaching += `- Develop specific punish flowcharts for this matchup\n`;
      coaching += `- Practice edgeguarding routines against this character's recovery\n`;
      coaching += `- Identify key stage positioning advantages for this matchup\n`;
    }
    
    return coaching;
  } catch (error) {
    console.error('Error generating fallback coaching:', error.message);
    return 'Unable to generate coaching advice due to technical issues.';
  }
}

// Export the commentary modes for convenience
export { COMMENTARY_MODES, COACHING_PROFILES };

// Export the main integration class
export default SlippiAIIntegration;