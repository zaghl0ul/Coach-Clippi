#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getConfig, validateConfig, getSlippiConfig, getAIConfig, loadFullConfig } from './utils/configManager.js';
import { getLiveMonitor } from './enhancedLiveMonitor.js';
import { provideLiveCommentary } from './liveCommentary.js';
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

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../setup-wizard')));

// API Routes
app.get('/api/config', (req, res) => {
    try {
        const config = loadFullConfig() || {
            ai: getAIConfig(),
            slippi: getSlippiConfig(),
            logging: {
                level: getConfig('logging.level', 'info'),
                file: getConfig('logging.file', 'slippi-coach.log'),
                console: getConfig('logging.console', 'true') === 'true'
            }
        };
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/config', (req, res) => {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        const newConfig = req.body;
        
        // Validate required fields
        if (!newConfig.ai?.apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
        res.json({ success: true, message: 'Configuration saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/validate', async (req, res) => {
    try {
        const errors = validateConfig();
        
        if (errors.length > 0) {
            return res.json({ valid: false, errors });
        }
        
        // Test AI connection if not using local
        const aiConfig = getAIConfig();
        if (aiConfig.apiKey !== 'local') {
            try {
                const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': aiConfig.apiKey
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "test" }] }]
                    })
                });
                
                if (!response.ok) {
                    errors.push('Invalid API key or AI service unavailable');
                }
            } catch (error) {
                errors.push(`AI service error: ${error.message}`);
            }
        }
        
        res.json({ valid: errors.length === 0, errors });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// WebSocket for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Live monitoring integration
let liveMonitor = null;
let isMonitoring = false;

async function startLiveMonitoring() {
    if (isMonitoring) return;
    
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
        console.error('❌ Configuration errors:', configErrors);
        return;
    }
    
    liveMonitor = getLiveMonitor();
    
    liveMonitor.addEventCallback('main', async (eventType, eventData) => {
        console.log(`📡 Event: ${eventType}`, eventData);
        
        // Emit to all connected clients
        io.emit('slippi-event', { type: eventType, data: eventData });
        
        // Generate commentary for specific events
        if (['combo', 'death', 'stockChange'].includes(eventType)) {
            try {
                const commentary = await provideLiveCommentary(eventType, eventData);
                console.log(`🗣️  Commentary: ${commentary}`);
                io.emit('commentary', { text: commentary });
            } catch (error) {
                console.error(`❌ Error generating commentary: ${error.message}`);
            }
        }
    });
    
    try {
        const connected = await liveMonitor.start();
        isMonitoring = connected;
        
        if (connected) {
            console.log("✅ Live monitoring started!");
            io.emit('monitoring-status', { status: 'started', connected: true });
        } else {
            console.log("⚠️  Connection pending - waiting for Slippi Dolphin...");
            io.emit('monitoring-status', { status: 'pending', connected: false });
        }
    } catch (error) {
        console.error(`❌ Failed to start live monitoring: ${error.message}`);
        io.emit('monitoring-status', { status: 'error', error: error.message });
    }
}

function stopLiveMonitoring() {
    if (liveMonitor && isMonitoring) {
        liveMonitor.stop();
        isMonitoring = false;
        console.log("🛑 Live monitoring stopped");
        io.emit('monitoring-status', { status: 'stopped' });
    }
}

// Control endpoints
app.post('/api/start-monitoring', async (req, res) => {
    await startLiveMonitoring();
    res.json({ success: true });
});

app.post('/api/stop-monitoring', (req, res) => {
    stopLiveMonitoring();
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    res.json({ 
        monitoring: isMonitoring,
        configValid: validateConfig().length === 0
    });
});

// Serve the setup wizard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../setup-wizard/index.html'));
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n🛑 Shutting down gracefully...");
    stopLiveMonitoring();
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log("\n🛑 Shutting down gracefully...");
    stopLiveMonitoring();
    server.close(() => {
        process.exit(0);
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🎮 Slippi Coach Integrated App`);
    console.log(`🌐 Setup wizard: http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at: http://localhost:${PORT}/api/*`);
    console.log("\n📋 To get started:");
    console.log("   1. Open your browser to http://localhost:3000");
    console.log("   2. Configure your settings in the setup wizard");
    console.log("   3. Start live monitoring when ready");
});