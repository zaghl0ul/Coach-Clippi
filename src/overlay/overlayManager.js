// Overlay Manager - Main controller for the direct window injection overlay system
import { EventEmitter } from 'events';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main overlay manager that coordinates between the Node.js backend and the injected DLL
 */
export class OverlayManager extends EventEmitter {
    constructor() {
        super();
        this.isInjected = false;
        this.dolphinProcess = null;
        this.nativeModule = null;
        this.config = {
            hotkey: 'F9',
            transparency: 80,
            theme: 'default',
            position: 'auto',
            enabled: true
        };
        this.coachingQueue = [];
        this.currentAdvice = null;
    }

    /**
     * Initialize the overlay system
     */
    async initialize() {
        try {
            console.log('🎮 Initializing overlay manager...');
            
            // Load native module for process injection
            await this.loadNativeModule();
            
            // Load configuration
            await this.loadConfiguration();
            
            // Start monitoring for Dolphin process
            this.startDolphinMonitoring();
            
            console.log('✅ Overlay manager initialized successfully');
            this.emit('initialized');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize overlay manager:', error.message);
            this.emit('error', error);
            return false;
        }
    }

    /**
     * Load the native module for DLL injection
     */
    async loadNativeModule() {
        try {
            // Load the compiled native module
            const nativeModulePath = path.join(__dirname, 'native', 'build', 'Release', 'overlay_native.node');
            
            // Use dynamic import for native module
            const fs = await import('fs');
            if (fs.existsSync(nativeModulePath)) {
                // For native modules, we need to use createRequire
                const { createRequire } = await import('module');
                const require = createRequire(import.meta.url);
                this.nativeModule = require(nativeModulePath);
                console.log('📦 Native overlay module loaded successfully');
            } else {
                // Fallback to mock implementation for development
                console.warn('⚠️ Native module not found, using mock implementation');
                this.nativeModule = {
                    findDolphinProcess: () => this.mockFindDolphinProcess(),
                    injectDLL: (processId) => this.mockInjectDLL(processId),
                    sendMessage: (message) => this.mockSendMessage(message),
                    isInjected: () => this.isInjected,
                    isProcessRunning: (pid) => true,
                    cleanup: () => true
                };
            }
        } catch (error) {
            console.warn('⚠️ Failed to load native module, using mock:', error.message);
            // Fallback to mock implementation
            this.nativeModule = {
                findDolphinProcess: () => this.mockFindDolphinProcess(),
                injectDLL: (processId) => this.mockInjectDLL(processId),
                sendMessage: (message) => this.mockSendMessage(message),
                isInjected: () => this.isInjected,
                isProcessRunning: (pid) => true,
                cleanup: () => true
            };
        }
    }

    /**
     * Mock implementation for finding Dolphin process
     */
    mockFindDolphinProcess() {
        // In real implementation, this would use Windows API to find Dolphin.exe
        // For now, return a mock process ID
        return Math.floor(Math.random() * 10000) + 1000;
    }

    /**
     * Mock implementation for DLL injection
     */
    mockInjectDLL(processId) {
        console.log(`🔧 Mock: Injecting DLL into process ${processId}`);
        this.isInjected = true;
        return true;
    }

    /**
     * Mock implementation for sending messages to injected DLL
     */
    mockSendMessage(message) {
        console.log('📡 Mock: Sending message to overlay:', message);
        return true;
    }

    /**
     * Load overlay configuration
     */
    async loadConfiguration() {
        try {
            // Load from config file or use defaults
            const configPath = path.join(__dirname, 'config', 'overlay.json');
            
            // For now, use default configuration
            this.config = {
                hotkey: 'F9',
                transparency: 80,
                theme: 'default',
                position: 'auto',
                enabled: true,
                bubbleStyle: 'speech',
                fontSize: 14,
                maxBubbles: 3,
                displayDuration: 5000,
                fadeAnimation: true
            };
            
            console.log('⚙️ Overlay configuration loaded:', this.config);
        } catch (error) {
            console.warn('⚠️ Failed to load configuration, using defaults:', error.message);
        }
    }

    /**
     * Start monitoring for Dolphin process
     */
    startDolphinMonitoring() {
        console.log('🔍 Starting Dolphin process monitoring...');
        
        // Check for Dolphin process every 5 seconds
        this.dolphinMonitorInterval = setInterval(() => {
            this.checkDolphinProcess();
        }, 5000);
        
        // Initial check
        this.checkDolphinProcess();
    }

    /**
     * Check if Dolphin is running and inject if needed
     */
    async checkDolphinProcess() {
        try {
            const processId = this.nativeModule.findDolphinProcess();
            
            if (processId && !this.isInjected) {
                console.log(`🎯 Found Dolphin process: ${processId}`);
                await this.injectOverlay(processId);
            } else if (!processId && this.isInjected) {
                console.log('🔌 Dolphin process closed, cleaning up overlay');
                this.cleanup();
            }
        } catch (error) {
            console.error('Error checking Dolphin process:', error.message);
        }
    }

    /**
     * Inject overlay into Dolphin process
     */
    async injectOverlay(processId) {
        try {
            console.log(`💉 Injecting overlay into Dolphin process ${processId}...`);
            
            const success = this.nativeModule.injectDLL(processId);
            
            if (success) {
                this.dolphinProcess = processId;
                this.isInjected = true;
                
                // Send initial configuration to overlay
                await this.updateOverlayConfig();
                
                console.log('✅ Overlay injected successfully');
                this.emit('injected', processId);
            } else {
                throw new Error('DLL injection failed');
            }
            
        } catch (error) {
            console.error('❌ Failed to inject overlay:', error.message);
            this.emit('injectionFailed', error);
        }
    }

    /**
     * Update overlay configuration
     */
    async updateOverlayConfig() {
        if (!this.isInjected) return;
        
        const configMessage = {
            type: 'config',
            data: this.config
        };
        
        this.nativeModule.sendMessage(JSON.stringify(configMessage));
    }

    /**
     * Display coaching advice on overlay
     */
    async displayCoachingAdvice(advice) {
        if (!this.isInjected || !this.config.enabled) {
            console.log('⚠️ Overlay not available, queuing advice for later');
            this.coachingQueue.push(advice);
            return;
        }

        try {
            const message = {
                type: 'coaching',
                data: {
                    text: advice.text || advice,
                    category: advice.category || 'general',
                    priority: advice.priority || 'normal',
                    duration: advice.duration || this.config.displayDuration,
                    position: advice.position || 'auto'
                }
            };

            this.nativeModule.sendMessage(JSON.stringify(message));
            this.currentAdvice = message.data;
            
            console.log('💬 Coaching advice sent to overlay:', message.data.text);
            this.emit('adviceDisplayed', message.data);
            
        } catch (error) {
            console.error('Error displaying coaching advice:', error.message);
        }
    }

    /**
     * Clear current coaching advice
     */
    clearAdvice() {
        if (!this.isInjected) return;
        
        const message = {
            type: 'clear',
            data: {}
        };
        
        this.nativeModule.sendMessage(JSON.stringify(message));
        this.currentAdvice = null;
    }

    /**
     * Toggle overlay visibility
     */
    toggleOverlay() {
        this.config.enabled = !this.config.enabled;
        
        if (this.isInjected) {
            const message = {
                type: 'toggle',
                data: { enabled: this.config.enabled }
            };
            
            this.nativeModule.sendMessage(JSON.stringify(message));
        }
        
        console.log(`🔄 Overlay ${this.config.enabled ? 'enabled' : 'disabled'}`);
        this.emit('toggled', this.config.enabled);
    }

    /**
     * Update overlay theme
     */
    setTheme(themeName) {
        this.config.theme = themeName;
        
        if (this.isInjected) {
            this.updateOverlayConfig();
        }
        
        console.log(`🎨 Overlay theme changed to: ${themeName}`);
        this.emit('themeChanged', themeName);
    }

    /**
     * Update overlay transparency
     */
    setTransparency(level) {
        this.config.transparency = Math.max(0, Math.min(100, level));
        
        if (this.isInjected) {
            this.updateOverlayConfig();
        }
        
        console.log(`🔍 Overlay transparency set to: ${this.config.transparency}%`);
        this.emit('transparencyChanged', this.config.transparency);
    }

    /**
     * Get current overlay status
     */
    getStatus() {
        return {
            isInjected: this.isInjected,
            dolphinProcess: this.dolphinProcess,
            config: this.config,
            currentAdvice: this.currentAdvice,
            queuedAdvice: this.coachingQueue.length
        };
    }

    /**
     * Process queued coaching advice
     */
    processQueue() {
        if (this.coachingQueue.length > 0 && this.isInjected) {
            const advice = this.coachingQueue.shift();
            this.displayCoachingAdvice(advice);
        }
    }

    /**
     * Cleanup overlay resources
     */
    cleanup() {
        console.log('🧹 Cleaning up overlay resources...');
        
        this.isInjected = false;
        this.dolphinProcess = null;
        this.currentAdvice = null;
        
        if (this.dolphinMonitorInterval) {
            clearInterval(this.dolphinMonitorInterval);
            this.dolphinMonitorInterval = null;
        }
        
        this.emit('cleanup');
    }

    /**
     * Check if Dolphin is running
     */
    isDolphinRunning() {
        if (!this.nativeModule) return false;
        const processId = this.nativeModule.findDolphinProcess();
        return processId > 0;
    }

    /**
     * Set overlay enabled state
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (this.isInjected) {
            const message = {
                type: 'toggle',
                data: { enabled: this.config.enabled }
            };
            
            this.nativeModule.sendMessage(JSON.stringify(message));
        }
        
        console.log(`🔄 Overlay ${this.config.enabled ? 'enabled' : 'disabled'}`);
        this.emit('toggled', this.config.enabled);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.isInjected) {
            this.updateOverlayConfig();
        }
        
        console.log('⚙️ Configuration updated:', this.config);
        this.emit('configUpdated', this.config);
    }

    /**
     * Shutdown overlay manager
     */
    shutdown() {
        console.log('🛑 Shutting down overlay manager...');
        
        this.cleanup();
        this.removeAllListeners();
        
        console.log('✅ Overlay manager shutdown complete');
    }
}

// Create singleton instance
let overlayManagerInstance = null;

export function getOverlayManager() {
    if (!overlayManagerInstance) {
        overlayManagerInstance = new OverlayManager();
    }
    return overlayManagerInstance;
}

export default { OverlayManager, getOverlayManager };
