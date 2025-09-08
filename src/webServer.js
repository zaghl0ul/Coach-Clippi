import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getLiveSlpMonitor } from './liveSlpMonitor.js';
import { provideLiveCommentary, provideDualCommentary } from './liveCommentary.js';
import { getConfig, getAIConfig } from './utils/configManager.js';
import { createLLMProvider, TemplateProvider } from './utils/llmProviders.js';
import { getOverlayIntegration } from './overlay/overlayIntegration.js';
import './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// File upload configuration
const upload = multer({ 
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.slp')) {
      cb(null, true);
    } else {
      cb(new Error('Only .slp files are allowed'));
    }
  }
});

// Store live monitoring state
let liveSlpMonitor = null;
let llmProvider = null;
let fastProvider = null;
let analyticalProvider = null;
let isDualMode = false;
let liveMonitoringActive = false;
let currentGameData = null;
let commentaryHistory = [];
let coachingHistory = [];

// Initialize overlay integration
let overlayIntegration = null;
async function initializeOverlayIntegration() {
  try {
    overlayIntegration = getOverlayIntegration();
    
    // Set up event handlers for overlay
    overlayIntegration.on('initialized', () => {
      console.log('✅ Overlay integration initialized');
      io.emit('overlay:status', {
        initialized: true,
        status: overlayIntegration.getStatus()
      });
    });
    
    overlayIntegration.on('connected', () => {
      console.log('📡 Overlay connected and ready for messages');
      io.emit('overlay:status', {
        connected: true,
        status: overlayIntegration.getStatus()
      });
    });
    
    overlayIntegration.on('messageSent', (message) => {
      io.emit('overlay:messageSent', {
        text: message.text,
        timestamp: message.timestamp,
        category: message.category
      });
    });
    
    overlayIntegration.on('error', (error) => {
      console.error('❌ Overlay error:', error.message);
      io.emit('overlay:error', { error: error.message });
    });
    
    overlayIntegration.on('disconnected', () => {
      console.log('📡 Overlay disconnected');
      io.emit('overlay:status', { connected: false });
    });
    
    overlayIntegration.on('shutdown', () => {
      console.log('🛑 Overlay shutdown');
      io.emit('overlay:status', { connected: false, initialized: false });
    });
    
    // Initialize the overlay system
    await overlayIntegration.initialize();
    
    console.log('✅ Overlay integration system ready');
  } catch (error) {
    console.error('❌ Failed to initialize overlay integration:', error.message);
  }
}

// Initialize LLM Provider(s)
async function initializeLLMProvider() {
  const aiConfig = getAIConfig();
  const apiKey = aiConfig.apiKey;
  isDualMode = aiConfig.dualMode;
  
  try {
    const providerType = aiConfig.provider.toLowerCase();
    
    // Initialize dual mode if enabled and using OpenRouter
    if (isDualMode && providerType === 'openrouter') {
      console.log('🎭 Initializing dual-model commentary system');
      
      // Fast model for immediate reactions
      fastProvider = createLLMProvider('openrouter', {
        apiKey: apiKey,
        model: aiConfig.fastModel
      });
      
      // Analytical model for deeper insights
      analyticalProvider = createLLMProvider('openrouter', {
        apiKey: apiKey,
        model: aiConfig.analyticalModel
      });
      
      console.log(`🏃 Fast Model: ${aiConfig.fastModel}`);
      console.log(`🧠 Analytical Model: ${aiConfig.analyticalModel}`);
      
      llmProvider = fastProvider; // Keep for compatibility
      return;
    }
    
    switch (providerType) {
      case 'lmstudio':
      case 'local':
        llmProvider = createLLMProvider('lmstudio', {
          endpoint: aiConfig.endpoint
        });
        console.log('🤖 Web Server using LM Studio (local) for AI inference');
        break;
        
      case 'openai':
        if (typeof apiKey === 'string' && apiKey !== 'your_openai_api_key_here') {
          llmProvider = createLLMProvider('openai', {
            apiKey: apiKey,
            model: aiConfig.model
          });
          console.log(`🤖 Web Server using OpenAI (${aiConfig.model}) for AI inference`);
        } else {
          throw new Error('Valid OpenAI API key required');
        }
        break;
        
      case 'gemini':
      case 'google':
        if (typeof apiKey === 'string' && apiKey !== 'your_gemini_api_key_here') {
          llmProvider = createLLMProvider('gemini', {
            apiKey: apiKey,
            model: aiConfig.model
          });
          console.log(`🤖 Web Server using Google Gemini (${aiConfig.model}) for AI inference`);
        } else {
          throw new Error('Valid Gemini API key required');
        }
        break;
        
      case 'anthropic':
        if (typeof apiKey === 'string' && apiKey !== 'your_anthropic_api_key_here') {
          llmProvider = createLLMProvider('anthropic', {
            apiKey: apiKey,
            model: aiConfig.model
          });
          console.log(`🤖 Web Server using Anthropic Claude (${aiConfig.model}) for AI inference`);
        } else {
          throw new Error('Valid Anthropic API key required');
        }
        break;
        
      case 'openrouter':
        if (typeof apiKey === 'string' && apiKey !== 'your_openrouter_api_key_here') {
          llmProvider = createLLMProvider('openrouter', {
            apiKey: apiKey,
            model: aiConfig.model
          });
          console.log(`🤖 Web Server using OpenRouter (${aiConfig.model}) for AI inference`);
        } else {
          throw new Error('Valid OpenRouter API key required');
        }
        break;
        
      case 'bedrock':
      case 'aws':
      case 'aws-bedrock':
        if (typeof apiKey === 'object' && apiKey.accessKeyId && apiKey.secretAccessKey) {
          llmProvider = createLLMProvider('bedrock', {
            accessKeyId: apiKey.accessKeyId,
            secretAccessKey: apiKey.secretAccessKey,
            region: apiKey.region,
            model: aiConfig.model
          });
          console.log(`🤖 Web Server using AWS Bedrock (${aiConfig.model}) for AI inference`);
        } else {
          throw new Error('Valid AWS credentials required for Bedrock');
        }
        break;
        
      default:
        throw new Error(`Unknown provider: ${aiConfig.provider}`);
    }
  } catch (error) {
    console.warn(`⚠️  Web Server LLM provider failed: ${error.message}`);
    console.log('📝 Web Server using template-based commentary system');
    llmProvider = new TemplateProvider();
  }
}

// Initialize on startup
await initializeLLMProvider();
await initializeOverlayIntegration();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🌐 Client connected:', socket.id);
  
  // Send current state to new client
  socket.emit('monitor:status', { 
    isConnected: liveMonitoringActive,
    currentGame: currentGameData ? currentGameData.fileName : null,
    slippiPath: liveSlpMonitor?.getStatus()?.slippiPath || null
  });
  
  socket.on('disconnect', () => {
    console.log('🌐 Client disconnected:', socket.id);
  });
  
  // Handle live .slp monitoring requests
  socket.on('monitor:start', async (data) => {
    try {
      if (liveMonitoringActive) {
        socket.emit('error', { message: 'Live monitoring already active' });
        return;
      }
      
      // Get or create live monitor instance
      if (!liveSlpMonitor) {
        liveSlpMonitor = getLiveSlpMonitor();
        
        // Run directory detection debug
        liveSlpMonitor.debugDirectoryDetection();
        
        // Set up event handlers for the monitor
        liveSlpMonitor.addEventCallback('webserver', async (eventType, eventData) => {
          try {
            console.log(`🎮 Live event: ${eventType}`, eventData);
            
            // Generate commentary for key events
            if (['hit', 'combo', 'gameStart', 'gameEnd', 'stockChange', 'lowStock'].includes(eventType)) {
              try {
                const aiConfig = getAIConfig();
                
                if (isDualMode && fastProvider && analyticalProvider) {
                  // Use dual commentary system
                  const dualCommentary = await provideDualCommentary(fastProvider, analyticalProvider, [eventData], {
                    eventType: eventType,
                    fastMaxTokens: aiConfig.fastMaxTokens,
                    analyticalMaxTokens: aiConfig.analyticalMaxTokens,
                    temperature: aiConfig.temperature
                  });
                  
                  if (dualCommentary.fast || dualCommentary.analytical) {
                    const commentaryEntry = {
                      timestamp: new Date().toISOString(),
                      eventType,
                      eventData,
                      fastCommentary: dualCommentary.fast,
                      analyticalCommentary: dualCommentary.analytical
                    };
                    
                    commentaryHistory.push(commentaryEntry);
                    
                    // Send to overlay - fast commentary first (immediate reaction)
                    if (dualCommentary.fast && overlayIntegration) {
                      overlayIntegration.onCommentaryGenerated({
                        text: dualCommentary.fast,
                        type: 'fast',
                        eventType
                      });
                    }
                    
                    // Send analytical commentary with delay for better UX
                    if (dualCommentary.analytical && overlayIntegration) {
                      setTimeout(() => {
                        overlayIntegration.onCommentaryGenerated({
                          text: dualCommentary.analytical,
                          type: 'analytical',
                          eventType
                        });
                      }, 2000); // 2 second delay
                    }
                    
                    // Emit both types of commentary to clients
                    if (dualCommentary.fast) {
                      io.emit('commentary:generated', {
                        commentary: dualCommentary.fast,
                        eventType,
                        commentaryType: 'fast',
                        timestamp: commentaryEntry.timestamp
                      });
                    }
                    
                    if (dualCommentary.analytical) {
                      io.emit('commentary:generated', {
                        commentary: dualCommentary.analytical,
                        eventType,
                        commentaryType: 'analytical',
                        timestamp: commentaryEntry.timestamp
                      });
                    }
                  }
                } else {
                  // Use single commentary system (existing)
                  const commentary = await provideLiveCommentary(llmProvider, [eventData], {
                    eventType: eventType,
                    maxLength: aiConfig.maxTokens,
                    temperature: aiConfig.temperature
                  });
                  
                  if (commentary) {
                    const commentaryEntry = {
                      timestamp: new Date().toISOString(),
                      eventType,
                      eventData,
                      commentary
                    };
                    
                    commentaryHistory.push(commentaryEntry);
                    
                    // Send to overlay
                    if (overlayIntegration) {
                      overlayIntegration.onCommentaryGenerated({
                        text: commentary,
                        type: 'single',
                        eventType
                      });
                    }
                    
                    // Emit commentary to all clients
                    io.emit('commentary:generated', {
                      commentary,
                      eventType,
                      commentaryType: 'single',
                      timestamp: commentaryEntry.timestamp
                    });
                  }
                }
              } catch (commentaryError) {
                console.error('Error generating commentary:', commentaryError.message);
              }
            }
            
            // Send game events to overlay
            if (overlayIntegration) {
              overlayIntegration.onGameEvent(eventType, eventData);
            }
            
            // Emit specific Slippi events to frontend
            switch (eventType) {
              case 'gameStart':
                currentGameData = {
                  fileName: eventData.fileName,
                  startTime: eventData.startTime,
                  lastUpdate: new Date().toISOString()
                };
                io.emit('slippi:gameStart', eventData);
                break;
                
              case 'gameEnd':
                io.emit('slippi:gameEnd', eventData);
                currentGameData = null;
                break;
                
              case 'hit':
                io.emit('slippi:hit', eventData);
                break;
                
              case 'combo':
                io.emit('slippi:combo', eventData);
                break;
                
              case 'lowStock':
              case 'stockChange':
                io.emit('slippi:stockChange', eventData);
                break;
                
              case 'liveUpdate':
                io.emit('slippi:liveUpdate', eventData);
                if (currentGameData) {
                  currentGameData.lastUpdate = new Date().toISOString();
                  currentGameData.frameCount = eventData.frameCount;
                  currentGameData.gameTime = eventData.gameTime;
                }
                break;
            }
            
          } catch (eventError) {
            console.error(`Error processing ${eventType} event:`, eventError.message);
            io.emit('error', { message: `Event processing error: ${eventError.message}` });
          }
        });
      }
      
      const customPath = data?.slippiPath || null;
      liveMonitoringActive = true;
      
      // Start live .slp monitoring
      const started = await liveSlpMonitor.start(customPath);
      if (started) {
        const status = liveSlpMonitor.getStatus();
        io.emit('monitor:status', {
          isConnected: true,
          slippiPath: status.slippiPath,
          currentGame: status.currentGame
        });
        
        socket.emit('monitor:started', {
          success: true,
          slippiPath: status.slippiPath,
          message: 'Live .slp monitoring started successfully'
        });
        
        console.log('🎮 Web Server: Live .slp monitoring started');
      } else {
        throw new Error('Failed to start live .slp monitoring');
      }
      
    } catch (error) {
      liveMonitoringActive = false;
      socket.emit('error', { message: `Failed to start monitoring: ${error.message}` });
      io.emit('monitor:status', { isConnected: false });
    }
  });
  
  socket.on('monitor:stop', () => {
    if (liveSlpMonitor) {
      liveSlpMonitor.stop();
    }
    liveMonitoringActive = false;
    currentGameData = null;
    
    io.emit('monitor:status', { isConnected: false });
    socket.emit('monitor:stopped', { success: true });
    console.log('🛑 Web Server: Live .slp monitoring stopped');
  });
  
  // Handle Slippi path configuration
  socket.on('monitor:setPath', (data) => {
    try {
      const { slippiPath } = data;
      if (liveSlpMonitor && liveSlpMonitor.setSlippiPath(slippiPath)) {
        socket.emit('monitor:pathSet', { 
          success: true, 
          slippiPath,
          message: 'Slippi path updated successfully' 
        });
      } else {
        socket.emit('error', { message: 'Invalid Slippi path' });
      }
    } catch (error) {
      socket.emit('error', { message: `Path update error: ${error.message}` });
    }
  });
  
  // Handle file upload for replay analysis
  socket.on('uploadReplay', async (data) => {
    try {
      const { filePath, fileName } = data;
      // Process the replay file and generate analysis
      // This would integrate with your existing replay processing logic
      socket.emit('replayAnalysis', {
        fileName,
        status: 'processing',
        message: 'Replay analysis started'
      });
    } catch (error) {
      socket.emit('error', { message: `Replay upload error: ${error.message}` });
    }
  });

  // Overlay control endpoints
  socket.on('overlay:start', async () => {
    try {
      if (!overlayIntegration) {
        overlayIntegration = getOverlayIntegration();
      }
      
      const initialized = await overlayIntegration.initialize();
      if (initialized) {
        socket.emit('overlay:started', {
          success: true,
          status: overlayIntegration.getStatus(),
          message: 'Overlay system started successfully'
        });
      } else {
        socket.emit('overlay:error', { message: 'Failed to start overlay system' });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Overlay start error: ${error.message}` });
    }
  });

  socket.on('overlay:stop', () => {
    try {
      if (overlayIntegration) {
        overlayIntegration.shutdown();
        socket.emit('overlay:stopped', { success: true });
      } else {
        socket.emit('overlay:error', { message: 'Overlay not running' });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Overlay stop error: ${error.message}` });
    }
  });

  socket.on('overlay:sendMessage', (data) => {
    try {
      const { message, options } = data;
      if (overlayIntegration && overlayIntegration.isReady()) {
        overlayIntegration.sendMessage(message, options);
        socket.emit('overlay:messageSent', { success: true, message });
      } else {
        socket.emit('overlay:error', { message: 'Overlay not ready' });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Message send error: ${error.message}` });
    }
  });

  socket.on('overlay:configure', (config) => {
    try {
      if (overlayIntegration) {
        overlayIntegration.configure(config);
        socket.emit('overlay:configured', {
          success: true,
          config: overlayIntegration.getStatus().config
        });
      } else {
        socket.emit('overlay:error', { message: 'Overlay not initialized' });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Configuration error: ${error.message}` });
    }
  });

  socket.on('overlay:getStatus', () => {
    try {
      if (overlayIntegration) {
        socket.emit('overlay:status', overlayIntegration.getStatus());
      } else {
        socket.emit('overlay:status', {
          initialized: false,
          connected: false,
          message: 'Overlay not initialized'
        });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Status error: ${error.message}` });
    }
  });

  socket.on('overlay:test', async () => {
    try {
      if (overlayIntegration && overlayIntegration.isReady()) {
        await overlayIntegration.testOverlay();
        socket.emit('overlay:testComplete', { success: true });
      } else {
        socket.emit('overlay:error', { message: 'Overlay not ready for testing' });
      }
    } catch (error) {
      socket.emit('overlay:error', { message: `Test error: ${error.message}` });
    }
  });
});

// API Routes
app.get('/api/status', (req, res) => {
  const overlayStatus = overlayIntegration ? overlayIntegration.getStatus() : {
    initialized: false,
    connected: false,
    message: 'Overlay not initialized'
  };

  res.json({
    status: 'running',
    liveMonitoring: liveMonitoringActive,
    currentGame: currentGameData,
    overlay: overlayStatus,
    timestamp: new Date().toISOString()
  });
});

// Overlay API endpoints
app.get('/api/overlay/status', (req, res) => {
  try {
    if (overlayIntegration) {
      res.json(overlayIntegration.getStatus());
    } else {
      res.json({
        initialized: false,
        connected: false,
        message: 'Overlay integration not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/overlay/start', async (req, res) => {
  try {
    if (!overlayIntegration) {
      overlayIntegration = getOverlayIntegration();
    }
    
    const initialized = await overlayIntegration.initialize();
    if (initialized) {
      res.json({
        success: true,
        status: overlayIntegration.getStatus(),
        message: 'Overlay system started successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to start overlay system'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/overlay/stop', (req, res) => {
  try {
    if (overlayIntegration) {
      overlayIntegration.shutdown();
      res.json({
        success: true,
        message: 'Overlay system stopped'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Overlay not running'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/overlay/message', (req, res) => {
  try {
    const { message, options } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }
    
    if (overlayIntegration && overlayIntegration.isReady()) {
      overlayIntegration.sendMessage(message, options);
      res.json({
        success: true,
        message: 'Message sent to overlay',
        text: message
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Overlay not ready'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/overlay/configure', (req, res) => {
  try {
    const config = req.body;
    
    if (overlayIntegration) {
      overlayIntegration.configure(config);
      res.json({
        success: true,
        config: overlayIntegration.getStatus().config,
        message: 'Overlay configuration updated'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Overlay not initialized'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/overlay/test', async (req, res) => {
  try {
    if (overlayIntegration && overlayIntegration.isReady()) {
      await overlayIntegration.testOverlay();
      res.json({
        success: true,
        message: 'Overlay test sequence completed'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Overlay not ready for testing'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update AI configuration endpoint
app.post('/api/config/ai', async (req, res) => {
  try {
    const { 
      provider, 
      apiKey, 
      model, 
      maxTokens, 
      temperature,
      dualMode,
      fastModel,
      analyticalModel,
      fastMaxTokens,
      analyticalMaxTokens
    } = req.body;
    
    console.log(`🔧 Updating AI configuration: ${provider}${dualMode ? ' (dual mode)' : ''} with model ${model}`);
    
    // Reinitialize LLM provider with new settings
    const newAIConfig = {
      provider: provider,
      apiKey: apiKey,
      model: model,
      maxTokens: maxTokens || 150,
      temperature: temperature || 0.7,
      dualMode: dualMode || false,
      fastModel: fastModel,
      analyticalModel: analyticalModel,
      fastMaxTokens: fastMaxTokens || 75,
      analyticalMaxTokens: analyticalMaxTokens || 200
    };
    
    // Create new provider based on type and dual mode
    let newProvider = null;
    
    switch (provider.toLowerCase()) {
      case 'lmstudio':
      case 'local':
        newProvider = createLLMProvider('lmstudio', {
          endpoint: 'http://localhost:1234/v1'
        });
        isDualMode = false; // Reset dual mode for local
        fastProvider = null;
        analyticalProvider = null;
        console.log('🤖 Switched to LM Studio (local)');
        break;
        
      case 'openrouter':
        if (apiKey && apiKey !== 'your_openrouter_api_key_here') {
          if (dualMode) {
            // Initialize dual mode
            isDualMode = true;
            fastProvider = createLLMProvider('openrouter', {
              apiKey: apiKey,
              model: fastModel
            });
            analyticalProvider = createLLMProvider('openrouter', {
              apiKey: apiKey,
              model: analyticalModel
            });
            newProvider = fastProvider; // Keep for compatibility
            console.log(`🎭 Switched to OpenRouter dual mode:`);
            console.log(`🏃 Fast: ${fastModel}`);
            console.log(`🧠 Analytical: ${analyticalModel}`);
          } else {
            // Single mode
            isDualMode = false;
            fastProvider = null;
            analyticalProvider = null;
            newProvider = createLLMProvider('openrouter', {
              apiKey: apiKey,
              model: model
            });
            console.log(`🤖 Switched to OpenRouter single mode (${model})`);
          }
        } else {
          throw new Error('Valid OpenRouter API key required');
        }
        break;
        
      case 'openai':
        if (apiKey && apiKey !== 'your_openai_api_key_here') {
          newProvider = createLLMProvider('openai', {
            apiKey: apiKey,
            model: model
          });
          console.log(`🤖 Switched to OpenAI (${model})`);
        } else {
          throw new Error('Valid OpenAI API key required');
        }
        break;
        
      case 'anthropic':
        if (apiKey && apiKey !== 'your_anthropic_api_key_here') {
          newProvider = createLLMProvider('anthropic', {
            apiKey: apiKey,
            model: model
          });
          console.log(`🤖 Switched to Anthropic Claude (${model})`);
        } else {
          throw new Error('Valid Anthropic API key required');
        }
        break;
        
      case 'gemini':
        if (apiKey && apiKey !== 'your_gemini_api_key_here') {
          newProvider = createLLMProvider('gemini', {
            apiKey: apiKey,
            model: model
          });
          console.log(`🤖 Switched to Google Gemini (${model})`);
        } else {
          throw new Error('Valid Gemini API key required');
        }
        break;
        
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Update global provider
    llmProvider = newProvider;
    
    res.json({ 
      success: true,
      provider: provider,
      model: model,
      message: `Successfully switched to ${provider}${model ? ` with model ${model}` : ''}`
    });
    
  } catch (error) {
    console.error('Failed to update AI configuration:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Fetch available models for OpenRouter
app.post('/api/models/openrouter', async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }
    
    // Create temporary OpenRouter provider to fetch models
    const tempProvider = createLLMProvider('openrouter', { apiKey });
    const models = await tempProvider.fetchAvailableModels();
    
    res.json({ 
      models: models,
      count: models.length 
    });
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/commentary', (req, res) => {
  res.json({
    history: commentaryHistory,
    count: commentaryHistory.length
  });
});

app.get('/api/coaching', (req, res) => {
  res.json({
    history: coachingHistory,
    count: coachingHistory.length
  });
});

app.post('/api/commentary', async (req, res) => {
  try {
    const { events, options } = req.body;
    const apiKey = getConfig('API_KEY');
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(400).json({ error: 'API key not configured' });
    }
    
    const commentary = await generateEnhancedCommentary(apiKey, events, options);
    
    const commentaryEntry = {
      timestamp: new Date().toISOString(),
      events,
      commentary,
      options
    };
    
    commentaryHistory.push(commentaryEntry);
    
    // Emit to all connected clients
    io.emit('newCommentary', commentaryEntry);
    
    res.json({ commentary, timestamp: commentaryEntry.timestamp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/coaching', async (req, res) => {
  try {
    const { matchData, options } = req.body;
    const apiKey = getConfig('API_KEY');
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(400).json({ error: 'API key not configured' });
    }
    
    const coaching = await generateTechnicalCoachingAdvice(apiKey, matchData, options);
    
    const coachingEntry = {
      timestamp: new Date().toISOString(),
      matchData,
      coaching,
      options
    };
    
    coachingHistory.push(coachingEntry);
    
    // Emit to all connected clients
    io.emit('newCoaching', coachingEntry);
    
    res.json({ coaching, timestamp: coachingEntry.timestamp });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
app.post('/api/upload', upload.single('replay'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.originalname,
      filepath: req.file.path
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for directory detection
app.get('/api/debug/directories', (req, res) => {
  try {
    const monitor = getLiveSlpMonitor();
    
    // Create debug info
    const homedir = require('os').homedir();
    const testPaths = [
      path.join(homedir, 'Documents', 'Slippi'),
      path.join(homedir, 'Documents', 'Slippi', '2025-08'),
      path.join(homedir, 'AppData', 'Roaming', 'Slippi Launcher', 'playback')
    ];
    
    const debugInfo = {
      homeDirectory: homedir,
      autoDetectedPath: monitor.getStatus().slippiPath,
      testPaths: testPaths.map(testPath => {
        const exists = require('fs').existsSync(testPath);
        let contents = null;
        
        if (exists) {
          try {
            const files = require('fs').readdirSync(testPath);
            contents = {
              totalFiles: files.length,
              slpFiles: files.filter(f => f.endsWith('.slp')).length,
              directories: files.filter(f => {
                try {
                  return require('fs').statSync(path.join(testPath, f)).isDirectory();
                } catch (e) {
                  return false;
                }
              }),
              recentSlpFiles: files.filter(f => f.endsWith('.slp')).slice(0, 3)
            };
          } catch (error) {
            contents = { error: error.message };
          }
        }
        
        return {
          path: testPath,
          exists: exists,
          contents: contents
        };
      })
    };
    
    res.json(debugInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 9000;

server.listen(PORT, () => {
  console.log(`Slippi Coach Web Server running on port ${PORT}`);
  console.log(`Frontend available at: http://localhost:${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
});

export { app, io };
