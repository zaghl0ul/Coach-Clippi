// Coach Clippi - Electron Overlay Main Process with Advanced Logging
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const WindowDetector = require('./windowDetector');

// Load configuration
let config;
try {
  const configPath = path.join(__dirname, 'config.json');
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  logger.info('Configuration loaded successfully', { configPath });
} catch (error) {
  logger.error('Failed to load config, using defaults', error);
  config = {
    detection: {
      methods: {
        byPid: true,
        byProcessName: true,
        byWindowTitle: true,
        byClassName: true
      },
      targetPid: null,
      processNames: ["Dolphin.exe", "Slippi Dolphin.exe", "DolphinWx.exe", "DolphinQt2.exe"],
      titlePatterns: ["Dolphin", "Slippi", "Faster Melee", "FPS:", "VPS:"],
      classPatterns: ["wxWindowNR", "Qt", "Dolphin"],
      scanInterval: 500,
      maxRetries: 10
    },
    logging: {
      enabled: true,
      level: "DEBUG",
      fileLogging: true,
      consoleLogging: true,
      verboseDetection: true
    },
    overlay: {
      position: { x: null, y: null, width: 400, height: 600 },
      alwaysOnTop: true,
      resizable: true,
      movable: true,
      backgroundColor: "#1a1a2e",
      showDiagnostics: true
    }
  };
}

// Disable hardware acceleration to prevent GPU issues
app.disableHardwareAcceleration();
logger.info('Hardware acceleration disabled');

// Add command line switches for GPU stability
const gpuFlags = [
  'disable-gpu',
  'disable-software-rasterizer',
  'disable-gpu-compositing',
  'disable-gpu-rasterization',
  'disable-gpu-sandbox',
  'no-sandbox',
  'disable-dev-shm-usage',
  'force-cpu-draw'
];

gpuFlags.forEach(flag => {
  app.commandLine.appendSwitch(flag);
});
logger.info('GPU stability flags applied', { flags: gpuFlags });

let overlayWindow;
let windowDetector;
let isTracking = false;
let detectionInterval;

// Store for Dolphin window info
let dolphinInfo = {
  title: null,
  bounds: null,
  pid: null,
  className: null,
  processName: null
};

// Create the overlay window (now a solid coaching panel)
function createOverlayWindow() {
  try {
    const display = screen.getPrimaryDisplay();
    logger.info('Creating overlay window', { 
      displayBounds: display.bounds,
      overlayConfig: config.overlay 
    });
    
    // Create window with config settings
    overlayWindow = new BrowserWindow({
      width: config.overlay.position.width,
      height: config.overlay.position.height,
      x: config.overlay.position.x || (display.bounds.width - config.overlay.position.width - 20),
      y: config.overlay.position.y || 100,
      frame: true,
      transparent: false, // NO TRANSPARENCY - This fixes GPU issues
      backgroundColor: config.overlay.backgroundColor,
      alwaysOnTop: config.overlay.alwaysOnTop,
      skipTaskbar: false,
      resizable: config.overlay.resizable,
      movable: config.overlay.movable,
      focusable: true,
      minimizable: config.overlay.minimizable !== false,
      maximizable: false,
      fullscreen: false,
      title: 'Coach Clippi - Coaching Panel',
      icon: path.join(__dirname, 'icon.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: false,
        offscreen: false,
        backgroundThrottling: false,
        disableHardwareAcceleration: true
      }
    });

    logger.info('BrowserWindow created successfully');

    // Set window to stay on top but allow interaction
    overlayWindow.setAlwaysOnTop(config.overlay.alwaysOnTop, 'floating');
    
    // Load the overlay HTML
    const htmlPath = path.join(__dirname, 'overlay.html');
    overlayWindow.loadFile(htmlPath);
    logger.info('Loading HTML file', { path: htmlPath });
    
    // Show dev tools in dev mode (detached to avoid GPU issues)
    if (process.argv.includes('--dev')) {
      overlayWindow.webContents.openDevTools({ mode: 'detach' });
      logger.info('Developer tools opened');
    }
    
    // Handle GPU process crashes gracefully
    overlayWindow.webContents.on('render-process-gone', (event, details) => {
      logger.error('Render process gone', { details });
      if (details.reason === 'crashed' || details.reason === 'gpu-process-crashed') {
        logger.info('Attempting to reload window...');
        overlayWindow.reload();
      }
    });
    
    overlayWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.error('Failed to load page', { errorCode, errorDescription });
    });

    overlayWindow.webContents.on('did-finish-load', () => {
      logger.info('Page loaded successfully');
      // Send initial config to renderer
      overlayWindow.webContents.send('config-update', config);
    });
    
    overlayWindow.on('closed', () => {
      logger.info('Overlay window closed');
      overlayWindow = null;
      stopTracking();
    });
    
    // Add error recovery
    overlayWindow.webContents.on('crashed', () => {
      logger.error('Window crashed, recreating...');
      overlayWindow.destroy();
      setTimeout(createOverlayWindow, 1000);
    });

    // Track window position changes
    overlayWindow.on('moved', () => {
      const bounds = overlayWindow.getBounds();
      logger.debug('Window moved', bounds);
    });

    overlayWindow.on('resized', () => {
      const bounds = overlayWindow.getBounds();
      logger.debug('Window resized', bounds);
    });

  } catch (error) {
    logger.error('Failed to create overlay window', error);
  }
}

// Initialize window detector
function initializeDetector() {
  try {
    windowDetector = new WindowDetector(config);
    logger.info('WindowDetector initialized');
  } catch (error) {
    logger.error('Failed to initialize WindowDetector', error);
  }
}

// Start tracking Dolphin window
function startTracking() {
  if (isTracking) {
    logger.warn('Tracking already active');
    return;
  }

  isTracking = true;
  logger.info('Starting Dolphin window tracking', {
    interval: config.detection.scanInterval,
    methods: config.detection.methods
  });

  // Initial detection
  detectDolphinWindow();

  // Set up periodic detection
  detectionInterval = setInterval(() => {
    if (isTracking) {
      detectDolphinWindow();
    }
  }, config.detection.scanInterval);
}

// Stop tracking
function stopTracking() {
  isTracking = false;
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  logger.info('Dolphin window tracking stopped');
}

// Detect Dolphin window
async function detectDolphinWindow() {
  if (!windowDetector) {
    logger.error('WindowDetector not initialized');
    return;
  }

  try {
    const window = await windowDetector.detectDolphinWindow();
    
    if (window) {
      dolphinInfo = {
        title: window.title,
        bounds: {
          x: window.x,
          y: window.y,
          width: window.width,
          height: window.height
        },
        pid: window.pid,
        className: window.className,
        processName: window.processName
      };
      
      logger.info('Dolphin window detected', dolphinInfo);
      
      // Send to renderer
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('dolphin-found', dolphinInfo);
        overlayWindow.webContents.send('dolphin-position', dolphinInfo.bounds);
      }
    } else {
      logger.debug('No Dolphin window found');
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('dolphin-not-found');
      }
    }

    // Send detection stats to renderer
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      const stats = windowDetector.getStats();
      overlayWindow.webContents.send('detection-stats', stats);
    }

  } catch (error) {
    logger.error('Detection error', error);
  }
}

// IPC Handlers
ipcMain.on('start-tracking', () => {
  logger.info('IPC: start-tracking received');
  startTracking();
});

ipcMain.on('stop-tracking', () => {
  logger.info('IPC: stop-tracking received');
  stopTracking();
});

ipcMain.on('send-message', (event, message) => {
  logger.info('IPC: send-message received', { message });
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('display-message', message);
  }
});

ipcMain.on('get-logs', (event) => {
  const logs = logger.getRecentLogs(50);
  event.reply('logs-data', logs);
});

ipcMain.on('clear-logs', () => {
  logger.clearLogs();
  logger.info('Logs cleared via IPC');
});

ipcMain.on('get-log-paths', (event) => {
  const paths = logger.getLogPaths();
  event.reply('log-paths', paths);
});

ipcMain.on('update-config', (event, newConfig) => {
  logger.info('Config update received', newConfig);
  config = { ...config, ...newConfig };
  
  // Save to file
  const configPath = path.join(__dirname, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Update detector
  if (windowDetector) {
    windowDetector.updateConfig(config);
  }
  
  event.reply('config-updated', config);
});

ipcMain.on('manual-detect', async (event) => {
  logger.info('Manual detection requested');
  await detectDolphinWindow();
});

ipcMain.on('select-window', (event, windowHandle) => {
  logger.info('Manual window selection', { handle: windowHandle });
  if (windowDetector) {
    const success = windowDetector.selectWindowManually(windowHandle);
    event.reply('window-selected', success);
  }
});

ipcMain.on('toggle-always-on-top', (event, shouldBeOnTop) => {
  logger.info('Toggle always on top', { shouldBeOnTop });
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setAlwaysOnTop(shouldBeOnTop);
  }
});

// App event handlers
app.whenReady().then(() => {
  logger.info('===========================================');
  logger.info('Coach Clippi Overlay Starting');
  logger.info('===========================================');
  logger.info('System info', {
    platform: process.platform,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    v8Version: process.versions.v8
  });
  
  initializeDetector();
  createOverlayWindow();
  
  // Auto-start tracking after a delay
  setTimeout(() => {
    startTracking();
  }, 2000);
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!overlayWindow) {
    createOverlayWindow();
  }
});

// Handle app termination
app.on('before-quit', () => {
  logger.info('App quitting...');
  stopTracking();
});

// GPU process crash handler
app.on('gpu-process-crashed', (event, killed) => {
  logger.error('GPU Process Crashed!', { killed });
  logger.info('App will continue running with CPU rendering...');
});

// Renderer process crash handler
app.on('renderer-process-crashed', (event, webContents, killed) => {
  logger.error('Renderer Process Crashed!', { killed });
  logger.info('Attempting to recover...');
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.reload();
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

logger.info('Coach Clippi Overlay - Main Process Initialized');
logger.info('GPU Acceleration Disabled for Stability');
logger.info('Waiting for app ready event...');
