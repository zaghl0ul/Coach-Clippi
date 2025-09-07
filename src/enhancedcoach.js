import { createRequire } from 'module';
import os from 'os';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config(); // Ensure this is called early to load .env variables
import { selectLLMProvider } from './utils/providerSelector.js';
/**
 * Displays a stylized ASCII art banner for Slippi Coach
 */
function displaySlippiCoachBanner() {
  const banner = `--------------------------------------------------------------------------------------=------------------------------------------------------------------------------------
-#########################################################################################################################*###*#########*#################################-
-##*#*##*##*#*#*#*#*#*##*#*#*##*#*#*##*#*#*#*#*#*#*#*#*#*#*###*##*#**##*####*******##%@@@@@%##*#*##*#*#*#*#*##*#*#*#*#*#####*###*#*#*#*###*#*#*#*#*#*#*#*#*###*#*#*#*#####-
-#######*#############*######*######*######################*#*###*####%@@@@@@@@@@@@@@%.....:%#####*##########*##########*#*##*#########*###################*#*#######*#*#*-
-##***##*#**##*#*#*#*###*****###*#*##*#*#*#*#*#*#*#*#*##**####**##%@@@#:...............+*+*#@@@@@@%###*#**#*##*#*#*#*#*########*#*#*#*##*#*##*#*#*#*#*#*#*####*#*#*####*##-
-######*#######*###*#*#*#*##***##*#*###*####*####*####*####*####%@%........::::---::::...........:%@@@%#####*####*##*##*#**#*#*#######*###*#####*#*###*####*#*###*#*#*###*=
-##*#*#*#*##*###*##############*####*####*####*####*###*#*##*#%@:....:-:.....:--:....:--------:.......@@%#*##*#*##*##*#######*##*#*#*##*####*#*#####*##*#*####*#######*###-
-############*####*#*#*#####*####*###*#*##*#*##*#*###*####*##@#..........=#*...:......:........----:....@%######*#####*#*#*###*######*###*#####*#*#########*###*#*#*####*#-
-#*#*#*#*#*#*##**#######****##**##*######*###*####**###*#*##@+...@@@@=.@@@@@@@...@@@@...+@@@@=......::...#@#*###*#*#*######*#*#*#**####*##*#*#*###*#*#*#*###*#######*#*###-
-####*##*##*#*####*#*##*########*##*#*#*##*###*#*####*#####%#..:@@.#@==@@..*@#..@@-%%..=@@..@@%.@@@.......*%#**######*#*#*##########*#*#*######*#####*###*###*#*#*#####*##-
-#*###*#########*##*##*#***#*####*#########*#####*#*##*##*#%...%@=....#@%..@@:.#@#.+@-.#%@...#.:%@..@@@::..@###*#*#*####*#*#*#*#*#*######*#*#*##*#*#*#*#*#*#####*#*#*###*#-
-##*####*#**#*######*##*#*####**###*##*#*#*#*#*#*##*###*##%%...%@..##:%%...@%.:@@@@@@+.%%%.....+%%=.%@-.::.#%*##*###*#*############*#*#*####*#*############*#*#*#####*####-
-###*#**######*#*#*##*####***#####*#*############*##*##*##%:..-@@.@@%.@@@@@@+:@@:..#@@:@@#.#@@.%%%@@%%..--.-%#*#*#*####*#*#*#*#*#*####*#*#*#####*#*#*#*#*#*#####*#*#*#*#*#-
-#*#####*#*#*######*###*####**#*#####*#*#*#*#*#*##*##*####@....%@@#.................:-..%@@@@=.@@...%%..-:.:@####*##*######*##*####*#*#####*#*#*#*###*#####*#*#*###*######-
-##*#*#######*#*#*##*###*#*#####*#*#*###*###*###*##*###*#%#...................................-%@..@@%.:--.:@*#*##*##*#*#*##*##*#*####*#*#*#######*#*#*#*#*#####*###*#*#*#-
-#####*#*#*#*#####*##*#####*#*#####*#*###*###*###*###*##%@#-%@@@@@@@@@@@@@@@@@@@@@@@@@%+...........+%+.---.-%##*######*###*##*####*#*######*#*#*#*#########*#*#*#*#####*##-
-#*#*########*#*#*#*##*#*#*###*#*#*###*###*###*####%@@@@%##*-........................-#%@@@@@#.............+%####**#*#*##*#*##*#*####*#*#*####*###*#*##*#*########*#*#*#*#-
-####*#*#*#*########*#######*#######*##*###*###%@@@#.....................:---------:........-%@@@@......@@@@@@@@@@%%###*####*####*#*####*#*#*##*#####*####*#*#*#*#*#######-
-##*########*#*#*#*##*#*#*###*#*##*###*#*###%@@*.....-%@@@@@@@@@@@@@@%*:......:-----------:......+@@@%@@*.........-@@%###*###*#*####*#*######*##*#*#*#*#*######*####*#*#*#-
-##*##***#*########*######*####*#*##*####*#%%...-@@@@@@+...........#@@@@@@@@*......:----------:....-@@...............@%#*#*####*#*######*#*###*###########*#*#*#*#*####*##-
-#**####*##**#*#*###*#*#*#****###***#*#*###+..@@%##%%.....-@@@@@:....%%%@@@@@@@@@-..............%@@@#....:@@@@@@*.....#%###*#*####*#*#*####*#*##*#*#*#*#*###*######*#*##*#-
-####*#**##*####*#*#########*##*#*######*##%%%%####%:...#@@@@@@@@@+...@%:.......%@@@@@@@@@@@@@@@@:@@....@@%@@@@%@@+....%#*####*#*###*##*#*##*##*#####*###*#*#*#*#*####*###-
-##*####*####*#####*#*####*##*#####*#*############%#...*@##+...##%@=......::-:.........=**=............@%#%....###@-...#%#*#*###*#*##*####*##*##*#*#*#*###########*#*##*##-
-*###*####*###*#*######**##*###*#*####*#*#*#*#*#*#%*.-.%%##=...###@%.-------------:::........::------.-@##%....###@%.-.+%#*##*########*#*###*#*##*#####*#*#*#*#*#*###*##*#-
=*#*##*#*##*#####*#*#*######*#####*#*####*########%%.:.+@%#%@@@%#%@:.--------------------------------:.@@#%@@@@%#%@....#%#####*#*#**######*####*##*#*#####*#######*###*###-
-###*###*###*#*#*###*#*#*#*###*#*#####*###*#***###%@*...-@@%%#%%@@..:--------------------------------:..@@@%##%%@@..:.#@%##*#*######**#*##*#*#*######*#*#*#*#*#*#*#*###*##-
-#*##*####*######*#########*#*###*#*###*########%@@=.:-:...%@@@%...:-----------------------------------...+@@@@#...:-..=@@@###*#*#*#####*######*#*#*####*#####*#####*###*#-
-#####*#*##*#*#*##*#*#*#*#*###*#*###*#*#*#*#*#%@*....----:.......:--------------------------------------:........:----....-@%######*#*#*#*#*#*####*#*#*##*#*###*#*#*#*####-
-#*#*####*###*##*####*##*##*######*##########%%...-----------------------------------------------------------------------...%%#*#*##########*##*#*#####*####*#########*#*#-
-####*#*##*###*###*#*#*###*#*#*#**#*#*#*#*#*#@..:-------------------::.........................:--------------------------:..@#*##*#*#*#*#*##*#####*#*##*#*##*#*#*#*######-
-#*#####*##*#*##*######*########*#########*##@..-----------:..............:--=++****++==-:................:----------------..@###########*#*##*#*#####*####*####*##*#*#*##-
-##*#*#*#*####*##*#*#*###*#*#*###*#*#*#*#*###@..----:.........-*%@@@@@@@@@@@@%%%%%%%%%%@@@@@@@@@@@@%%*=.............::-----..@#*#**#*#*#*########**#*##*#*##*#*##*###*##*#-
-###########*##*######*####*##*#######*###*##@..-:.....=#%@@@@@@@@@@@@@@@@@@@@@@@%%%%###*##*#*#*###%%%@@@@@@@%#+-........:-..@#*#########*#*#**######*####*####*##*####*##-
-#*#*#*##***#*##*#*#*##*#**####*#*#*###*#####@..::-@@@@@%%###%@@#..............:-+#%%@@@@%##*####*#####*#*###%%%@@@@@@@@=-:.:%###*#*#*#*####**##*#####*#*###*#*#*###*#*###-
-###*##**#####*######*######*#######*###*#*#*%%..:..%@%####%@%......:----:...............-####**##**#*###########*##@@*.....@##*########*#*######*#**####*###*###*#####*#*-
-#*##*#####*#*#*#*#*###*#*##*#*#*#*##*########%@.......#%@@+...#%+:........-------:...:@@%##*###*#*####*#*#*#*###%@@-......@%###*#*#*#*#####*#*#*#####*###*###*#*#*#*#*###-
-#####**#*##*#######*#*###**#######*##*#*#*#*##%@%...%@@@....%@@%%@@@@@@@@.-----....%@@%####*#######*#*########%@@.......%@%##*####*###*#*#*######*####*###*#*#########*##-
-#*#*#####*###*##*#*###*##*##*##*########*##*####%@@@@#...:@@@@@@%%##%@%...--:...-@@%########*#**#*##*#*##*##@@#.......%@%##*###*###*#######*#*#*##*#*##*#####*#*#*#*#*#*#-
-###########*##**####*#########*###*#*####*####*##%@+...:-.......+%@@+.........%@@%###**#%-########*######%@@=.......@@%##*###*##*#*##*#*#*######*#######*#*#*############-
-##***#**##**##******##****##****#**##***###***##%@...-------::............@@@@%##*#*##%@.:##*#***#*####%@@.......:@@%#*##*#*##*#####*##*#*#*#*#*#*#*#**######*#*#*#*#***#-
-####################*#####*######*####**#*#####%@..:---------------:...@@@%#####*####%@..%##*########%@@.......%@@##########*##*#*#*####################*#*#*#######*####-
-#*#*###*##*#*#*#*#*###**####**#*###*#######*#*#@..:---------------:..%@%%@@@@@@%#*#%@-.=%##*####*#%@@+.......@@%##*##*#*#*###*######*#*##*#*#*#*#*#*#*#######*#*#*#####**-
-####*#*############*#####***####*##*##*#*#####%#.:---------------:..@%#%@......%%###..%@##*#*#*#%@@-.......@@%###*###*####*####*#*#*##**######*###*###*#*#*#*#####*#*#*##-
-#*#####*##*#*#*#*#*#*##*##*##*###*##*####**#*#@..----------------..%%#%%...--:..@##%..%%*##*##%@@.......+@@%##**#*#*##*#*##*#*######*####*#*#*#*#*#*#####*###*#*#######*#-
-##*#*#*#*#*####*######*#######*#*##*#*#*#####*@..-:...:---------:.+@#%%..------.=%#%..%####%@@%.......%@%####*######*####**####*#*#*##**############*#*#*#*###*#*#*#*#*##-
-############*##*#*#*###*#*#*#*###*######*##*##%..........-------..@##@..:------.*%#%..@@@@@%-.......@@%###*###***#*##*#*#####*######*###*#*#*#*#*#*########*#*##########*-
-#*#*#*#*#*#*########*#*#######*###*#*#*##*##*#%@#@@@@@@*..------..@##@..------..@#%%.-@..........+@@%######*#####*#######*#*##*#*#*##*#####*###*###*#*#*#*#####*#*#*#*#*#-
-#########*##*#*#*#*####*#*#*#*#*#####*#*####%@@+.@-...+@*.:-----..@*#@..:---:..#%#%:.%@........%@%##*#*#*###*#*###*#*#*#*###*######*##**#*##*####*####*#*#*#*#*###*#*####-
-#*#*#*#*###*#######*#*###*##*###*#*#####*##%%....@..%@#@@..:----..@##%*.......#%%%#.-@.....#@@@%#########*#*###*#####*###*#*#*#*#*##*#####*##*#*##*#*##########*#*####*#*-
-#########*##*#*#*#*###*###*###*####*#*#*###%..+@@@-.:#..@@..:---..%%##%%....#@%%@%..@%@@@@@%%##*#*###*#*#####*###*#*##*#########*#*##*##*##*####*#####*#*#*#*#*####*#####-
=#*#*#*#*##*####*####*##*###*###*#*##*####*%#..@%##%@@@#..@%.....:..@%##%@@@@%%%@...@%##**####*####*#*###*#*#*##*#*##*##*#*#*#*###*#*###*#*##*#*##*#*#*#########*#*##*#**#-
-########*##*#*###*#*#*##*###*#####*##*#*####..@%#*#*#%@..@%@@#......%@@%%#%@@@-..%@%##*#*#*####*#*###*#*#####*####*##*#########*####*#####*####*######*#*#*#*#*###*#####*-
-#*#*#*#*#*##*##*######*##*#*#*#*#*#*#####*#%...@@%##%@#..@###%@@@@+....-%%+....%@%##*######*#**###*######*#*##*#*##*##*#*#*#**###*#*#*#*#*##*#*#*#*#*####*#####*#*##*#*##-
-#############*##*#*#*###############*#**####@:...@@@#...@%########%@@@%....:%@@%##*###*#*#*####*#*#*#*#*####*####*#######*#####*##########*##*#######*#*###*#*####*####*#-
-#*#***#*#*#*##*####*#*#*#*#*#*#*#***#####*###%@#......@@%##*#***#*#*##%%@@@%##***#*#*#*##*##*############*##**#*##*#*#*##*#*#*##**#*##*#*##*##*#*#**##*#*#*###*#*##*#*###-
-#######*##*#*##*#*########*###*######*#*##*####%@@@@@@%#################*####################**#*#*#*#*#*#*##########*##*#####*#####*####*##*#######*######*#####*#####*#-
-##*#*##*###########*#*#*#*#*#*#*#*#*#######*#*#########*#*#*#*#**#*#*#*###*#*#*#*#*#*#*#*#*##########*#####*#*#**#*##*###*#*###*#*###*#*###*##*#*#*##*#*#*##*#*#*##*#*###-
-########*#*#*#*#*#*###*#############*#*#*#####*#*#*#*#####*############*######*########*###*#*##*#*#*##*#*#########*###*####*#####*#####*#*#*####*#*######*######*##*##*#-
-#*#*#*#*#######*####*##*#*#*#*#*#*#*#####*#*#*###*###*#*###*#*##*#*#*#*#*#*#*###*#*#*#*#*#*###*####*######*#*#*#*#*#*#*#*#*###*#*##*#*#*#####*#*#####*#*#*#*#*#*##*##*###-
-####*####*#*#*##*#*##*####*###*#####*#*#####*#*#*#*######*######*########*#*##*####*#######*####*####*#*#*###*####*######*##*####*######*#*#*###*#*#*###*#######*##*###*#-
-*************************************************************************************************************************************************************************-
-=======-===============-===========-===-===-==========-==============-=========-=====-===-===-====-=====-===============-==========-=================-====-===-==========-`;

  // Apply ansi color for enhanced visual presentation
  const coloredBanner = banner.replace(/-/g, '\x1b[34m-\x1b[0m')
                              .replace(/#/g, '\x1b[36m#\x1b[0m')
                              .replace(/@/g, '\x1b[33m@\x1b[0m')
                              .replace(/%/g, '\x1b[35m%\x1b[0m')
                              .replace(/=/g, '\x1b[32m=\x1b[0m')
                              .replace(/\*/g, '\x1b[31m*\x1b[0m')
                              .replace(/\+/g, '\x1b[37m+\x1b[0m')
                              .replace(/\./g, '\x1b[90m.\x1b[0m');
  
  console.log(coloredBanner);
  console.log('\x1b[1m\x1b[36m  SLIPPI COACH v1.0.0 \x1b[0m');
  console.log('\x1b[90m  Real-time Melee analysis and coaching\x1b[0m');
  console.log('');
}
// --- Start: Improved Configuration Validation ---
const apiKey = process.env.API_KEY;
const endpoint = process.env.LM_STUDIO_ENDPOINT;

if (apiKey === 'local') {
    if (!endpoint) {
         console.error("❌ ERROR: API_KEY is 'local' but LM_STUDIO_ENDPOINT is not set in .env file.");
         console.error("Please add LM_STUDIO_ENDPOINT=http://localhost:1234/v1 (or your LM Studio server address) to your .env file.");
         process.exit(1);
    }
    console.log(`✅ Configured for Local LLM via LM Studio at: ${endpoint}`);
} else if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE' || apiKey.length < 10) { // Added length check for basic validity
    console.error('❌ ERROR: Please set a valid API_KEY in the .env file.');
    console.error("Set API_KEY=local to use LM Studio, or provide your valid OpenAI API key.");
    process.exit(1);
} else {
     console.log(`✅ Configured for API Key (assumed OpenAI).`);
     // Optional: Check if endpoint is set when API key isn't 'local', maybe warn?
     if (endpoint) {
         console.warn("⚠️ Warning: LM_STUDIO_ENDPOINT is set in .env, but API_KEY is not 'local'. The endpoint setting will be ignored unless using 'local'.");
     }
}
// --- End: Improved Configuration Validation ---


// Import lodash for functional utilities
const require = createRequire(import.meta.url);
const _ = require('lodash');
const chokidar = require('chokidar');
const { SlippiGame } = require('@slippi/slippi-js');

// Import our coaching modules
import { provideLiveCommentary } from './liveCommentary.js';
import { COMMENTARY_STYLES } from './hybridCommentary.js';
import { generateCoachingAdvice } from './aicoaching.js';
import { getConfig } from './utils/configManager.js'; // Keep for potential future use, though direct process.env is used now
import { characterNames } from './utils/slippiUtils.js';
import './utils/logger.js'; // Initializes logger



// Hierarchical event classification with differential throttling
const EVENT_PRIORITIES = {
  STOCK_LOSS: { threshold: 1000, lastTriggered: 0 },
  SIGNIFICANT_COMBO: { threshold: 1500, lastTriggered: 0 }, // 4+ hits
  MINOR_COMBO: { threshold: 2500, lastTriggered: 0 }, // 2-3 hits
  NEUTRAL_EXCHANGE: { threshold: 5000, lastTriggered: 0 },
  FRAME_UPDATE: { threshold: 10000, lastTriggered: 0 },
  ACTION_STATE: { threshold: 4000, lastTriggered: 0 } // Added for action states
};

// Melee action states of interest for advanced detection
const ACTION_STATES = {
  TECH_START: 0xC7, TECH_ROLL_LEFT: 0xC9, TECH_ROLL_RIGHT: 0xCA, TECH_MISS: 0xC8,
  FIRE_FOX_GROUND: 0x159, FIRE_FOX_AIR: 0x15A, UP_B_GROUND: 0x15B, UP_B_AIR: 0x15C,
  GRAB: 0xD4, DASH: 0x14, DASH_ATTACK: 0x15, SHIELD: 0xB3, SHIELD_BREAK: 0xB6,
  NAIR: 0x41, FAIR: 0x42, BAIR: 0x43, UAIR: 0x44, DAIR: 0x45,
  FALL: 0x1D, LANDING_SPECIAL: 0xC, JUMP_SQUAT: 0xF, AIR_DODGE: 0x13
};

// Track pending events for batched processing
const PENDING_EVENTS_LIMIT = 5; // Increased slightly
const BATCH_PROCESSING_INTERVAL = 1000; // ms - reduced from 1500ms for faster response

/**
 * Enhanced Slippi Coach with robust file detection
 */
class EnhancedSlippiCoach {
  constructor(llmProvider, slippiDirectory = null) {
    this.slippiDirectory = slippiDirectory || this._getDefaultSlippiDirectory();
    this.llmProvider = llmProvider; // Store the provider instance
    
    // Configuration for analysis
    this.includeCpuEvents = false; // Set to true to include CPU-performed events in commentary
    
    // Advanced directory watching configuration
    this.watchMode = 'directory'; // Using chokidar directory watching
    this.directoryPollInterval = 100; // ms
    
    // File processing debounce
    this.processingDebounce = 100; // Reduced from 200ms for faster response

    this.gameByPath = {};
    this.watcher = null;
    this.isMonitoring = false;
    this.activeGames = new Set();
    this.completedGames = new Set();
    this.pendingEvents = {};
    this.eventProcessorInterval = null;
    this.previousFrames = {}; // Store previous frames for state transition detection
    
    // Last processed file tracking to avoid redundant processing
    this.lastProcessedFile = null;
    this.lastProcessedTime = 0;
  }

  _getDefaultSlippiDirectory() {
    const platform = process.platform;
    const homeDir = os.homedir();

    switch (platform) {
      case 'win32': return path.join(homeDir, 'Documents', 'Slippi');
      case 'darwin': return path.join(homeDir, 'Library', 'Application Support', 'Slippi');
      case 'linux': return path.join(homeDir, '.config', 'Slippi');
      default: return path.join(homeDir, 'Slippi'); // Fallback
    }
  }

  /**
   * Check if a specific event type can be triggered based on its throttling threshold
   * @param {string} eventType The type of event to check
   * @param {string} filePath The path to the game file (for game-specific throttling)
   * @returns {boolean} Whether the event can be triggered
   */
  _canTriggerEventType(eventType, filePath) {
    const now = Date.now();
    const eventConfig = EVENT_PRIORITIES[eventType];

    if (!eventConfig) {
      console.warn(`Unknown event type for throttling: ${eventType}`);
      return true; // Allow unknown types by default? Or return false? Let's allow.
    }

    // Get the game-specific last triggered time
    const gameEventKey = `${filePath}_${eventType}`;
    const lastTriggered = this.gameByPath[filePath]?.state?.lastEventTimes?.[eventType] || 0;

    if (now - lastTriggered < eventConfig.threshold) {
      return false; // Throttled
    }

    // Update last triggered time for this event type if state exists
    if (this.gameByPath[filePath]?.state) {
      if (!this.gameByPath[filePath].state.lastEventTimes) {
        this.gameByPath[filePath].state.lastEventTimes = {};
      }
      this.gameByPath[filePath].state.lastEventTimes[eventType] = now;
    }

    return true;
  }


  /**
   * Add an event to the pending events queue for this game
   * @param {string} filePath Path to the game file
   * @param {object} event Event data to add
   */
  _addPendingEvent(filePath, event) {
    if (!this.gameByPath[filePath]) return; // Don't add events for non-existent games

    if (!this.pendingEvents[filePath]) {
      this.pendingEvents[filePath] = [];
    }

    this.pendingEvents[filePath].push(event);

    // Start event processor interval if not already running
    if (!this.eventProcessorInterval) {
        // Use unref() so the interval doesn't keep the Node.js process alive if it's the only thing left
      this.eventProcessorInterval = setInterval(() => this._processPendingEvents(), BATCH_PROCESSING_INTERVAL).unref();
    }
  }

  /**
   * Process pending events from all active games
   */
  async _processPendingEvents() {
    let processedAny = false;
    for (const filePath of Object.keys(this.pendingEvents)) {
      const events = this.pendingEvents[filePath] || [];
      if (events.length === 0) continue;

      const gameInfo = this.gameByPath[filePath];
      // Check if game still exists and has state
      if (!gameInfo || !gameInfo.state) {
          delete this.pendingEvents[filePath]; // Clean up if game is gone
          continue;
      }
      const gameState = gameInfo.state;

      // Take up to N events for processing
      const eventsToProcess = events.splice(0, PENDING_EVENTS_LIMIT);
      if (eventsToProcess.length > 0) {
          processedAny = true;
          try {
              // Build a comprehensive game context to pass with events
              const contextData = {
                  players: gameState.players || [],
                  stocks: gameState.lastStockCounts || [],
                  percent: [], // Will populate from latest frame data
                  frame: gameState.latestFrameProcessed || 0,
                  gameTime: Math.floor((gameState.latestFrameProcessed || 0) / 60),
                  stageId: gameState.settings?.stageId
                  // stage: gameState.settings?.stageId // Pass stage id if available (duplicate?)
              };

              // Extract latest percent data
              if (this.previousFrames[filePath]?.players) {
                  contextData.percent = this.previousFrames[filePath].players.map(player =>
                      player?.post?.percent?.toFixed(1) || '0.0' // Format percent
                  );
              } else if (gameState.latestFrameProcessed > 0 && gameInfo.game) {
                  // Try getting the frame directly if previousFrames cache is empty
                  try {
                      const latestFrameData = gameInfo.game.getFrames()[gameState.latestFrameProcessed];
                      if (latestFrameData?.players) {
                           contextData.percent = latestFrameData.players.map(player =>
                               player?.post?.percent?.toFixed(1) || '0.0'
                           );
                      }
                  } catch (frameErr) {
                      console.warn(`Could not get frame ${gameState.latestFrameProcessed} data for context.`);
                  }
              }


              // Call provideLiveCommentary with correct parameters
              await provideLiveCommentary(
                this.llmProvider, // Pass the provider instance
                eventsToProcess,
                {
                  gameState: contextData,
                  commentaryStyle: COMMENTARY_STYLES.TECHNICAL,
                  maxLength: 100
                }
              );
          } catch (err) {
              // Error handling within provideLiveCommentary should log details
              console.error(`Error processing commentary batch for ${path.basename(filePath)}.`);
          }
      }
    }

    // If no more pending events in any game, clear the interval
    const hasPendingEvents = Object.values(this.pendingEvents).some(events => events.length > 0);
    if (!hasPendingEvents && this.eventProcessorInterval) {
      clearInterval(this.eventProcessorInterval);
      this.eventProcessorInterval = null;
    }
  }

  async start() {
    if (this.isMonitoring) {
      console.log("Monitoring is already active.");
      return;
    }

    console.log(`Starting Slippi Coach with directory monitoring: ${this.slippiDirectory}`);

    // Verify Slippi directory exists
    if (!fs.existsSync(this.slippiDirectory)) {
      console.error(`Slippi directory not found: ${this.slippiDirectory}`);
      throw new Error(`Slippi directory not found: ${this.slippiDirectory}`);
    }

    // Set up chokidar to watch for file changes
    this.watcher = chokidar.watch(this.slippiDirectory, {
      depth: 0, // Watch only the top-level directory
      persistent: true,
      usePolling: true, // Always use polling for more reliable detection
      interval: this.directoryPollInterval, // Polling interval (ms)
      binaryInterval: 300,
      ignoreInitial: false, // Process existing files on startup
      awaitWriteFinish: { // Wait for writes to finish before triggering events
        stabilityThreshold: 200, // Reduced from 500ms for faster updates
        pollInterval: 50 // Reduced from 100ms for faster updates
      },
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles 
        '**/CurrentGame.slp' // Explicitly ignore CurrentGame.slp
      ]
    });

    console.log("Watcher initialized. Setting up event handlers...");

    // Handle new and changed files
    this.watcher.on('add', (filePath) => this._handleFileChange(filePath, 'add'));
    this.watcher.on('change', (filePath) => this._handleFileChange(filePath, 'change'));

    // Handle file removal (renamed or deleted)
    this.watcher.on('unlink', (filePath) => this._handleFileRemoval(filePath));

    // Handle errors
    this.watcher.on('error', (error) => {
      console.error(`Watcher error: ${error}`);
    });

    // Indicate watcher is ready
    this.watcher.on('ready', () => {
        console.log('Initial file scan complete. Ready for changes.');
        this.isMonitoring = true;
        console.log("Enhanced Slippi Coach is now running!");
        console.log("Monitoring for Slippi games...");
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close().then(() => console.log("Watcher stopped."));
      this.watcher = null;
    }

    if (this.eventProcessorInterval) {
      clearInterval(this.eventProcessorInterval);
      this.eventProcessorInterval = null;
    }

    this.isMonitoring = false;
    this.gameByPath = {}; // Clear game state on stop
    this.pendingEvents = {};
    this.previousFrames = {};
    this.activeGames.clear();
    this.completedGames.clear();
    console.log("Enhanced Slippi Coach stopped and cleaned up.");
  }

  /**
   * Handles file change events
   * @param {string} filePath Path to the changed file
   * @param {string} eventType 'add' or 'change'
   */
   async _handleFileChange(filePath, eventType = 'change') {
    // Skip non-slp files and temporary files
    if (!filePath.endsWith('.slp') || path.basename(filePath).startsWith('temp_')) {
      return;
    }
    
    // Skip explicitly if it's CurrentGame.slp
    if (path.basename(filePath) === 'CurrentGame.slp') {
      return;
    }

    // Debounce rapid changes (e.g., during saving) - simple time-based debounce
    const now = Date.now();
    const lastProcessedTime = this.gameByPath[filePath]?.lastProcessedTime || 0;
    if (now - lastProcessedTime < this.processingDebounce) {
        return;
    }

    const start = Date.now();

    try {
      // Get or create the game instance
      let gameState = _.get(this.gameByPath, [filePath, 'state']);
      let game = _.get(this.gameByPath, [filePath, 'game']);

      if (!game) {
        console.log(`[${eventType}] Processing new Slippi file: ${path.basename(filePath)}`);

        // Create new game instance with real-time processing
        game = new SlippiGame(filePath, { processOnTheFly: true });

        // Create fresh game state
        gameState = {
          settings: null,
          latestFrameProcessed: -124, // Start before frame -123
          players: [],
          stockEvents: [],
          comboEvents: [],
          lastStockCounts: {}, // Use object for playerIndex mapping
          lastEventTimes: {},    // Track throttling by event type
          // pendingCommentary: [] // This is handled by the global pendingEvents now
        };

        // Store in our tracking map
        this.gameByPath[filePath] = {
          game,
          state: gameState,
          lastProcessedTime: now // Track processing time
        };

        // Initialize pending events for this game
        this.pendingEvents[filePath] = [];
        this.previousFrames[filePath] = null; // Reset previous frame cache
      } else {
          // Update last processed time for existing game
          this.gameByPath[filePath].lastProcessedTime = now;
      }

      // Get current game data
      const settings = game.getSettings(); // Can throw if file is invalid
      const latestFrame = game.getLatestFrame();
      const gameEnd = game.getGameEnd();

      // Process game start if not yet processed
      if (!gameState.settings && settings && settings.players && settings.players.length > 0) {
          this._handleGameStart(filePath, settings); // This updates gameState.settings and gameState.players
      }

      // Process frame data if game has started and frame is new
      if (gameState.settings && latestFrame && latestFrame.frame > gameState.latestFrameProcessed) {
        // Detect state transitions between frames if previous frame exists
        if (this.previousFrames[filePath]) {
          this._detectStateTransitions(filePath, this.previousFrames[filePath], latestFrame);
        }

        // Store current frame for next comparison
        this.previousFrames[filePath] = latestFrame;

        // Process the latest frame data
        this._processFrameData(filePath, latestFrame);
        gameState.latestFrameProcessed = latestFrame.frame;
      }

      // Process game end if detected and not already completed
      if (gameEnd && !this.completedGames.has(filePath)) {
          console.log(`Game end detected for ${path.basename(filePath)}`);
          this._handleGameEnd(filePath, gameEnd); // This adds to completedGames
      } else if (gameEnd && this.completedGames.has(filePath)) {
          // If game end was already detected, maybe just update state?
          // console.log(`Game end already processed for ${path.basename(filePath)}`);
      }

    } catch (err) {
      // Handle file read errors (likely file locks or corrupt files)
      if (err.message && !err.message.includes("already been finalized")) {
          // Avoid logging finalized errors which are expected during writes
          console.error(`Error processing ${path.basename(filePath)}: ${err.message}`);
      } else if (err.message && err.message.includes("Invalid SLP file")) {
          console.warn(`Skipping invalid SLP file: ${path.basename(filePath)}`);
          // Mark as completed to avoid reprocessing invalid file
          this.completedGames.add(filePath);
          // Clean up associated state
          delete this.gameByPath[filePath];
          delete this.pendingEvents[filePath];
          delete this.previousFrames[filePath];
      }
    }
  }


  /**
   * Detect state transitions between frames for deeper commentary
   * @param {string} filePath Path to the game file
   * @param {object} previousFrame Previous frame data
   * @param {object} currentFrame Current frame data
   */
  _detectStateTransitions(filePath, previousFrame, currentFrame) {
      if (!previousFrame?.players || !currentFrame?.players) return; // Need both frames

      currentFrame.players.forEach((player, playerIndex) => {
          const prevPlayerFrame = previousFrame.players[playerIndex];
          // Ensure both player frames and post-frame data exist
          if (!prevPlayerFrame?.post || !player?.post) return;

          const prevState = prevPlayerFrame.post.actionStateId;
          const currentState = player.post.actionStateId;
          const gameInfo = this.gameByPath[filePath];
          const playerData = gameInfo?.state?.players?.find(p => p.index === playerIndex);
          
          // Skip CPU actions if not specifically enabled
          if (playerData && playerData.playerType === 1 && !this.includeCpuEvents) {
              return;
          }
          
          const charName = playerData?.character || 'Unknown';

          // Only process if state changed meaningfully
          if (prevState !== currentState) {
              let eventData = null;

              // Tech detection
              if ([ACTION_STATES.TECH_IN_PLACE, ACTION_STATES.TECH_ROLL_LEFT, ACTION_STATES.TECH_ROLL_RIGHT].includes(currentState)) {
                  const techType = currentState === ACTION_STATES.TECH_IN_PLACE ? 'in-place' :
                                   currentState === ACTION_STATES.TECH_ROLL_LEFT ? 'roll left' : 'roll right';
                  eventData = { subType: "tech", details: { techType } };
              }
              // Missed Tech
              else if (currentState === ACTION_STATES.TECH_MISS) {
                   eventData = { subType: "tech-miss", details: {} };
              }
              // Shield/grab detection
              else if (currentState === ACTION_STATES.SHIELD) { eventData = { subType: "shield" }; }
              else if (currentState === ACTION_STATES.GRAB) { eventData = { subType: "grab" }; }
              // Recovery detection (simplified)
              else if ([ACTION_STATES.FIRE_FOX_AIR, ACTION_STATES.UP_B_AIR].includes(currentState)) { eventData = { subType: "recovery" }; }
              // Wavedash landing (landing shortly after airdodge)
              else if ([ACTION_STATES.LANDING_SPECIAL, ACTION_STATES.LANDING].includes(currentState) && prevState === ACTION_STATES.AIR_DODGE) {
                  const frameDiff = currentFrame.frame - previousFrame.frame;
                  if (frameDiff <= 5) { // Check if landing happened quickly after airdodge
                       eventData = { subType: "wavedash-land", details: { frameDiff } };
                  }
              }
              // L-Cancel (landing after aerial) - Note: Actual success requires lag analysis not done here
              else if ([ACTION_STATES.LANDING, ACTION_STATES.LANDING_SPECIAL].includes(currentState) &&
                       (prevState >= ACTION_STATES.NAIR && prevState <= ACTION_STATES.DAIR)) {
                   const aerialMap = { [ACTION_STATES.NAIR]: 'nair', [ACTION_STATES.FAIR]: 'fair', [ACTION_STATES.BAIR]: 'bair', [ACTION_STATES.UAIR]: 'uair', [ACTION_STATES.DAIR]: 'dair' };
                   eventData = { subType: "l-cancel-attempt", details: { aerial: aerialMap[prevState] || 'aerial' } };
              }

              // If a relevant event was detected and not throttled
              if (eventData && this._canTriggerEventType('ACTION_STATE', filePath)) {
                  this._addPendingEvent(filePath, {
                      type: "actionState",
                      playerIndex,
                      frame: currentFrame.frame,
                      playerCharacter: charName,
                      isHuman: playerData?.playerType === 0,
                      ...eventData // Spread subtype and details
                  });
              }
          }
      });
  }


  /**
   * Handle file removal (game completed and renamed by Slippi)
   * @param {string} filePath Path to the removed file
   */
  _handleFileRemoval(filePath) {
    // Skip non-slp files
    if (!filePath.endsWith('.slp')) {
      return;
    }

    const gameInfo = this.gameByPath[filePath];

    // Check if we were tracking this game
    if (gameInfo) {
      console.log(`File removed or renamed: ${path.basename(filePath)}`);

      // If this was an active game, generate final analysis
      if (this.activeGames.has(filePath) && !this.completedGames.has(filePath)) {
          console.log(`Generating final analysis as file was removed while active.`);
          // Ensure pending events are processed before final analysis
          this._processPendingEvents().then(() => {
              this._generateGameAnalysis(filePath);
              this.completedGames.add(filePath); // Mark completed *after* analysis
          }).catch(err => {
              console.error(`Error processing pending events before final analysis for ${path.basename(filePath)}: ${err.message}`);
              // Still mark completed to avoid retries? Or leave active? Marking completed.
              this.completedGames.add(filePath);
          });
      } else if (!this.completedGames.has(filePath)) {
          // File removed but wasn't marked active or already completed - maybe an interrupted game?
          console.log(`File ${path.basename(filePath)} removed unexpectedly. Attempting analysis.`);
           this._processPendingEvents().then(() => {
               this._generateGameAnalysis(filePath); // Try analysis anyway
               this.completedGames.add(filePath);
           }).catch(err => {
               console.error(`Error processing pending events for unexpectedly removed file ${path.basename(filePath)}: ${err.message}`);
               this.completedGames.add(filePath); // Mark completed even on error
           });
      }

      // Clean up state associated with the removed file path
      this.activeGames.delete(filePath);
      delete this.pendingEvents[filePath];
      delete this.previousFrames[filePath];
      // Remove from gameByPath *after* ensuring analysis runs if needed
      // Delay removal slightly to allow async analysis function to access it
      setTimeout(() => {
           delete this.gameByPath[filePath];
           console.log(`Cleaned up state for ${path.basename(filePath)}`);
      }, 5000); // 5 second delay for cleanup

    } else {
        // File removed that we weren't tracking (e.g., old file deleted manually)
        // console.log(`Untracked file removed: ${path.basename(filePath)}`);
    }
  }


  /**
   * Handle game start event
   * @param {string} filePath Path to the game file
   * @param {object} settings Game settings
   */
   _handleGameStart(filePath, settings) {
    // Ensure gameState exists before modifying it
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state) {
        console.error(`Cannot handle game start for ${path.basename(filePath)}: Game state not initialized.`);
        return;
    }
    const gameState = this.gameByPath[filePath].state;

    // Check if already started
    if (gameState.settings) {
        // console.log(`Game start already processed for ${path.basename(filePath)}`);
        return;
    }

    console.log(`\n[Game Start] New game detected: ${path.basename(filePath)}`);

    // Mark as active game
    this.activeGames.add(filePath);
    this.completedGames.delete(filePath); // Ensure it's not marked completed

    // Store settings
    gameState.settings = settings;

    // Extract player information
    if (settings.players && Array.isArray(settings.players)) {
      gameState.players = settings.players.map((player, index) => {
          const characterId = player.characterId;
          // Use defensive check for characterNames
          const character = (typeof characterId === 'number' && characterNames[characterId])
              ? characterNames[characterId]
              : 'Unknown';

          return {
              index, // 0-based index from the players array
              port: player.port || (index + 1), // Use port if available, otherwise guess
              characterId,
              character,
              playerType: player.type, // 0=human, 1=CPU, 2=Demo?
              isHuman: player.type === 0,
              isCPU: player.type === 1,
              cpuLevel: player.type === 1 ? player.characterId : null
          };
      });

      console.log("Matchup:");
      gameState.players.forEach(p => {
          console.log(`  Player (Port ${p.port}, Index ${p.index}): ${p.character}${p.playerType === 1 ? ' (CPU)' : ''}`);
      });

      // Generate a game start commentary event
      const matchupEvent = {
        type: "gameStart",
        matchup: gameState.players.map(p => p.character),
        playerTypes: gameState.players.map(p => p.playerType),
        stage: settings.stageId,
        frame: settings.startFrame || -123 // Use start frame if available
      };
      this._addPendingEvent(filePath, matchupEvent);

      // Initialize stock counts based on player data
      gameState.lastStockCounts = {};
      gameState.players.forEach(p => {
          gameState.lastStockCounts[p.index] = settings.playerSettings?.[p.index]?.startStocks ?? 4; // Use startStocks if available, default 4
      });

    } else {
        console.warn(`Game start detected for ${path.basename(filePath)}, but player data is missing or invalid.`);
        gameState.players = []; // Ensure players array is initialized
        gameState.lastStockCounts = {};
    }

    // Reset tracking data for this game
    gameState.stockEvents = [];
    gameState.comboEvents = [];
    gameState.lastEventTimes = {};
    gameState.latestFrameProcessed = settings.startFrame ? settings.startFrame -1 : -124; // Reset frame processing start

    // Initialize frame buffer
    this.previousFrames[filePath] = null;
  }


  /**
   * Process new frame data
   * @param {string} filePath Path to the game file
   * @param {object} latestFrame Latest frame data
   */
  _processFrameData(filePath, latestFrame) {
    // Ensure gameState exists
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state) return;
    const gameState = this.gameByPath[filePath].state;

    // Skip if no players in frame or frame is before game start
    if (!latestFrame?.players || latestFrame.frame < (gameState.settings?.startFrame || -123)) return;

    // Generate frame update commentary events (less frequently)
    if (latestFrame.frame > 0 && latestFrame.frame % 600 === 0 && this._canTriggerEventType('FRAME_UPDATE', filePath)) { // Every 10 seconds
      const frameUpdateEvent = {
        type: "frameUpdate",
        frame: latestFrame.frame,
        players: {}
      };

      // Display current percentages and stocks
      let logString = `[Frame ${latestFrame.frame}]`;
      gameState.players.forEach((player) => {
        const frameData = _.get(latestFrame, ["players", player.index, "post"]); // Get post-frame data
        if (!frameData) return;

        const percent = (frameData.percent || 0).toFixed(1);
        const stocks = frameData.stocksRemaining ?? gameState.lastStockCounts[player.index] ?? '?'; // Use stocksRemaining if available

        logString += ` | P${player.port}(${player.character.substring(0,3)}): ${percent}% (${stocks}s)`;

        frameUpdateEvent.players[player.index] = {
          percent: parseFloat(percent),
          stocks: stocks
        };
      });
      // console.log(logString); // Optional: uncomment for verbose frame updates
      this._addPendingEvent(filePath, frameUpdateEvent);
    }

    // Check for stock changes
    this._checkStockChanges(filePath, latestFrame);

    // Check for combos using SlippiGame's built-in combo detection
    try {
      const game = this.gameByPath[filePath]?.game;
      if (game) {
          const stats = game.getStats(); // This computes stats up to the latest processed frame
          if (stats?.combos) {
            this._processNewCombos(filePath, stats.combos);
          }
      }
    } catch (err) {
       // Ignore stats processing errors, they can happen if game is incomplete
       if (!err.message.includes("Cannot read properties of undefined (reading 'frame')")) { // Filter common incomplete game error
            console.warn(`Stats processing error for ${path.basename(filePath)}: ${err.message}`);
       }
    }
  }


  /**
   * Check for stock changes in the latest frame
   * @param {string} filePath Path to the game file
   * @param {object} latestFrame Latest frame data
   */
  _checkStockChanges(filePath, latestFrame) {
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state) return;
    const gameState = this.gameByPath[filePath].state;

    // Ensure players array and lastStockCounts are initialized
    if (!gameState.players || !gameState.lastStockCounts) return;

    // Check each player's stock count based on game state's player array
    gameState.players.forEach(playerInfo => {
        const playerIndex = playerInfo.index;
        const frameData = _.get(latestFrame, ["players", playerIndex, "post"]); // Get post-frame data

        if (!frameData || frameData.stocksRemaining === undefined) return; // Skip if data missing

        const currentStocks = frameData.stocksRemaining;
        const previousStocks = gameState.lastStockCounts[playerIndex]; // Use playerIndex as key

        // Detect stock lost (check if previousStocks was defined and higher)
        if (previousStocks !== undefined && currentStocks < previousStocks) {
            const stocksLost = previousStocks - currentStocks;
            // console.log(`Stock change detected for P${playerInfo.port} (Index ${playerIndex}): ${previousStocks} -> ${currentStocks}`); // Debug log
            this._handleStockLost(filePath, playerIndex, stocksLost, latestFrame);
        } else if (previousStocks === undefined) {
            // Initialize stock count if it wasn't set before
            // console.log(`Initializing stock count for P${playerInfo.port} (Index ${playerIndex}) to ${currentStocks}`); // Debug log
        }

        // Update the tracked stock count using playerIndex
        gameState.lastStockCounts[playerIndex] = currentStocks;
    });
  }


  /**
   * Handle stock loss event
   * @param {string} filePath Path to the game file
   * @param {number} playerIndex Player who lost stock (0-based index)
   * @param {number} stocksLost Number of stocks lost
   * @param {object} frame Frame data where loss occurred
   */
  _handleStockLost(filePath, playerIndex, stocksLost, frame) {
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state) return;
    const gameState = this.gameByPath[filePath].state;

    // Stock loss is high priority - use STOCK_LOSS throttling
    if (!this._canTriggerEventType('STOCK_LOSS', filePath)) {
      return; // Throttled
    }

    // Get player info using the index
    const playerData = gameState.players.find(p => p.index === playerIndex);
    if (!playerData) {
        console.warn(`Stock lost for unknown player index: ${playerIndex}`);
        return;
    }
    
    // Skip CPU stock losses if not specifically enabled
    if (playerData.playerType === 1 && !this.includeCpuEvents) {
        return;
    }

    const remainingStocks = frame.players[playerIndex]?.post?.stocksRemaining ?? '?';

    // Record the stock lost event
    const event = {
      time: Date.now(),
      frame: frame.frame,
      playerIndex, // Keep 0-based index internally
      stocksLost,
      remainingStocks: remainingStocks
    };
    gameState.stockEvents.push(event);

    const playerName = `Player (Port ${playerData.port}, ${playerData.character}${playerData.playerType === 1 ? ' CPU' : ''})`;
    console.log(`💀 ${playerName} lost ${stocksLost} stock! Remaining: ${remainingStocks}`);

    // Generate live commentary for stock loss event
    this._addPendingEvent(filePath, {
      type: "stockLost",
      playerIndex,
      stocksLost,
      remainingStocks: remainingStocks,
      playerCharacter: playerData.character, // Pass character name
      isHuman: playerData.playerType === 0,
      isCPU: playerData.playerType === 1,
      frame: frame.frame
    });
  }


  /**
   * Process new combos from stats
   * @param {string} filePath Path to the game file
   * @param {Array} combos Combo array from stats
   */
  _processNewCombos(filePath, combos) {
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state || !combos) return;
    const gameState = this.gameByPath[filePath].state;

    // Find combos we haven't processed yet
    const newCombos = combos.filter(combo =>
      combo.moves &&
      combo.moves.length >= 2 && // Lowered threshold to 2+ hits
      // Ensure combo end frame is recent enough to be relevant
      (combo.endFrame >= gameState.latestFrameProcessed - 120) && // Within last 2 seconds
      !gameState.comboEvents.some(existingCombo =>
        existingCombo.playerIndex === combo.playerIndex &&
        existingCombo.startFrame === combo.startFrame
      )
    );

    if (newCombos.length === 0) return;

    // Process each new combo
    newCombos.forEach(combo => {
      // Calculate percent if undefined (handle potential nulls)
      let damage = combo.percent;
      if (damage === undefined || damage === null) {
         damage = (combo.endPercent || 0) - (combo.startPercent || 0);
      }

      // Record the combo event internally
      const recordedCombo = {
        playerIndex: combo.playerIndex,
        startFrame: combo.startFrame,
        endFrame: combo.endFrame,
        moves: combo.moves.length,
        damage: damage
      };
      gameState.comboEvents.push(recordedCombo);

      // Get player info
      const playerData = gameState.players.find(p => p.index === combo.playerIndex);
      
      // Skip CPU combos if not specifically enabled
      if (playerData && playerData.playerType === 1 && !this.includeCpuEvents) {
          return;
      }
      
      const isHuman = playerData ? playerData.playerType === 0 : true; // Default to human if player data missing
      const attackerName = playerData ?
        `Player (Port ${playerData.port}, ${playerData.character}${playerData.playerType === 1 ? ' CPU' : ''})` :
        `Player ${combo.playerIndex + 1}`; // Fallback

      // Categorize combo by size for appropriate throttling
      const comboType = combo.moves.length >= 4 ? 'SIGNIFICANT_COMBO' : 'MINOR_COMBO';

      // Skip if throttled for this combo type
      if (!this._canTriggerEventType(comboType, filePath)) {
        return;
      }

      console.log(`💥 ${attackerName} performed a ${combo.moves.length}-hit combo for ${damage.toFixed(1)}% damage!`);

      // Generate structured combo data for commentary
      const comboData = {
        type: "combo",
        playerIndex: combo.playerIndex,
        moves: combo.moves.length,
        damage: parseFloat(damage.toFixed(1)), // Ensure number format
        playerCharacter: playerData?.character || "Unknown",
        isHuman: isHuman,
        isCPU: playerData?.playerType === 1,
        startFrame: combo.startFrame,
        endFrame: combo.endFrame,
        // Optional: add move IDs if needed by commentary prompt
        // moveTypes: combo.moves.map(m => m.moveId).join(',')
      };

      // Add to pending events queue for batched processing
      this._addPendingEvent(filePath, comboData);
    });
  }


  /**
   * Handle game end event
   * @param {string} filePath Path to the game file
   * @param {object} gameEnd Game end data from getGameEnd()
   */
   _handleGameEnd(filePath, gameEnd) {
    // Ensure game state exists and not already completed
    if (!this.gameByPath[filePath] || !this.gameByPath[filePath].state || this.completedGames.has(filePath)) {
        // console.log(`Game end already processed or game state missing for ${path.basename(filePath)}`);
        return;
    }
    const gameState = this.gameByPath[filePath].state;

    console.log(`\n[Game End] Game completed: ${path.basename(filePath)}`);

    // Display end type
    const endTypes = { 1: "TIME!", 2: "GAME!", 7: "No Contest" };
    const endMessage = _.get(endTypes, gameEnd?.gameEndMethod, "Unknown");
    const lrasText = gameEnd?.gameEndMethod === 7 ? ` | LRAS Index: ${gameEnd.lrasInitiatorIndex ?? 'N/A'}` : "";
    console.log(`End Type: ${endMessage}${lrasText}`);

    // Add game end event to queue (ensure players data exists)
    if (gameState.players && gameState.players.length > 0) {
         // Determine winner/loser if possible (simple stock check)
         let winnerIndex = -1, loserIndex = -1;
         if (gameEnd?.gameEndMethod === 2 && gameState.players.length === 2) { // Only for GAME! in 1v1
             const p0Stocks = gameState.lastStockCounts[gameState.players[0].index] ?? -1;
             const p1Stocks = gameState.lastStockCounts[gameState.players[1].index] ?? -1;
             if (p0Stocks > p1Stocks) winnerIndex = gameState.players[0].index;
             if (p1Stocks > p0Stocks) winnerIndex = gameState.players[1].index;
         }

         this._addPendingEvent(filePath, {
             type: "gameEnd",
             endType: endMessage,
             lrasQuitter: gameEnd?.gameEndMethod === 7 ? gameEnd.lrasInitiatorIndex : undefined,
             winnerIndex: winnerIndex, // Add winner info if determined
             frame: gameState.latestFrameProcessed // Frame where end was detected
         });
    }

    // Generate game analysis after processing pending events
    this._processPendingEvents().then(() => {
        this._generateGameAnalysis(filePath);
        this.completedGames.add(filePath); // Mark completed *after* analysis
        this.activeGames.delete(filePath);
    }).catch(err => {
        console.error(`Error processing pending events before final analysis for ${path.basename(filePath)}: ${err.message}`);
        // Still mark completed? Yes, to avoid reprocessing loop on error.
        this.completedGames.add(filePath);
        this.activeGames.delete(filePath);
    });
  }


  /**
   * Generate comprehensive game analysis
   * @param {string} filePath Path to the game file
   */
   async _generateGameAnalysis(filePath) {
    // First access game data correctly
    const gameData = this.gameByPath[filePath];
    if (!gameData || !gameData.state) {
      console.warn(`Cannot generate analysis for ${path.basename(filePath)}: Game data not available`);
      return;
    }
    const gameState = gameData.state;

    if (!gameState.players || gameState.players.length === 0) {
      console.warn(`Skipping analysis for ${path.basename(filePath)}: No player data found.`);
      return;
    }

    console.log(`\n📊 Generating end-game analysis for ${path.basename(filePath)}...`);

    // Calculate final game statistics using recorded events
    const stocksLostByPlayer = {};
    gameState.players.forEach(p => { stocksLostByPlayer[p.index] = 0; }); // Initialize
    gameState.stockEvents.forEach(event => {
        stocksLostByPlayer[event.playerIndex] = (stocksLostByPlayer[event.playerIndex] || 0) + event.stocksLost;
    });

    const combosByPlayer = {};
    let totalDamage = {};
    gameState.players.forEach(p => {
        combosByPlayer[p.index] = [];
        totalDamage[p.index] = 0;
    }); // Initialize
    gameState.comboEvents.forEach(combo => {
      combosByPlayer[combo.playerIndex].push(combo);
      totalDamage[combo.playerIndex] += combo.damage;
    });

    // Prepare data for AI coaching, mapping stats back to player order
    const matchData = {
      damageDealt: gameState.players.map(p => totalDamage[p.index] || 0),
      stockLosses: gameState.players.map(p => stocksLostByPlayer[p.index] || 0),
      characters: gameState.players.map(p => p.character || 'Unknown'), // Use stored character names
      playerTypes: gameState.players.map(p => p.playerType)
    };

    // Display match summary
    console.log("\n===== MATCH SUMMARY =====");
    gameState.players.forEach((player) => { // Iterate through the structured player data
      const pIndex = player.index;
      console.log(`Player (Port ${player.port}, ${player.character}${player.playerType === 1 ? ' CPU' : ''}):`);
      console.log(`  Stocks Lost: ${stocksLostByPlayer[pIndex] || 0}`);
      console.log(`  Total Damage Dealt: ${(totalDamage[pIndex] || 0).toFixed(1)}`);
      console.log(`  Combos Recorded: ${combosByPlayer[pIndex]?.length || 0}`);
    });
    console.log("=======================");


    // Generate AI coaching advice
    try {
      console.log("\n🧠 Generating coaching advice...");
      // Pass the correct provider instance, not just the API key
      const advice = await generateCoachingAdvice(
        this.llmProvider, // Pass the actual provider instance
        matchData
      );
      console.log("\n===== COACHING ADVICE =====");
      console.log(advice || "No coaching advice generated."); // Handle potentially empty advice
      console.log("===========================\n");
    } catch (err) {
      // Error is logged within generateCoachingAdvice
      console.error("❌ Failed to generate coaching advice: ", err.message);
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  console.log("Initializing Enhanced Slippi Coach...");
  
  // Prompt for LLM provider selection
  const llmProvider = await selectLLMProvider();
  
  if (llmProvider) {
    console.log(`Selected LLM provider: ${llmProvider.name}`);
  } else {
    console.log("Running in template-only mode (no LLM).");
  }
  
  try {
    // Create coach instance with the selected provider
    const coach = new EnhancedSlippiCoach(llmProvider);

    // Handle application shutdown gracefully
    const shutdown = () => {
        console.log("\n🔌 Shutting down Enhanced Slippi Coach...");
        coach.stop();
        // Optional: Add a small delay to allow async operations to finish
        setTimeout(() => process.exit(0), 500);
    };
    process.on('SIGINT', shutdown); // Ctrl+C
    process.on('SIGTERM', shutdown); // Termination signal

    // Start monitoring
    await coach.start(); // start() now waits for watcher 'ready' event

    console.log("Press Ctrl+C to exit.");

  } catch (err) {
    console.error(`💀 Failed to initialize coach: ${err.message}`);
    process.exit(1);
  }
}


// Execute main function
main().catch(err => {
  console.error(`💀 Unexpected error in main execution: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});