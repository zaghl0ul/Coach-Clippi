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
import { getOverlayManager } from './overlay/overlayManager.js';
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

// Initialize overlay manager
let overlayManager = null;
async function initializeOverlayManager() {
  try {
    overlayManager = getOverlayManager();
    await overlayManager.initialize();
    
    // Set up event handlers for overlay
    overlayManager.on('injected', (processId) => {
      console.log(`🎮 Overlay injected into Dolphin process ${processId}`);
      io.emit('overlay:status', { injected: true, processId });
    });
    
    overlayManager.on('injectionFailed', (error) => {
      console.error('❌ Overlay injection failed:', error.message);
      io.emit('overlay:status', { injected: false, error: error.message });
    });
    
    overlayManager.on('cleanup', () => {
      console.log('🧹 Overlay cleaned up');
      io.emit('overlay:status', { injected: false });
    });
    
    console.log('✅ Overlay manager initialized');
  } catch (error) {
    console.error('❌ Failed to initialize overlay manager:', error.message);
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
await initializeOverlayManager();

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
});

// API Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    liveMonitoring: liveMonitoringActive,
    currentGame: currentGameData,
    timestamp: new Date().toISOString()
  });
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
