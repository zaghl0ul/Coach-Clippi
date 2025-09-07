import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SlpLiveStream, SlpRealTime } = require('@vinceau/slp-realtime');
import { getSlippiConfig } from './utils/configManager.js';

class EnhancedLiveMonitor {
    constructor() {
        this.livestream = null;
        this.realtime = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
        this.eventCallbacks = new Map();
        this.connectionTimeout = null;
        this.shouldStop = false;
    }

    async start(onEventCallback) {
        const config = getSlippiConfig();
        this.maxReconnectAttempts = config.maxRetries;
        this.reconnectDelay = config.retryDelay;

        if (onEventCallback) {
            this.eventCallbacks.set('default', onEventCallback);
        }

        console.log(`[LiveMonitor] Starting connection to ${config.address}:${config.port}`);
        
        return this.connect(config.address, config.port);
    }

    async connect(address, port) {
        if (this.shouldStop) {
            return;
        }

        try {
            this.livestream = new SlpLiveStream();
            this.realtime = new SlpRealTime();

            // Set up connection handlers
            this.setupConnectionHandlers(address, port);

            // Attempt connection with timeout
            const connectionPromise = this.livestream.start(address, port);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout')), 10000);
            });

            await Promise.race([connectionPromise, timeoutPromise]);
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            console.log(`[LiveMonitor] Successfully connected to ${address}:${port}`);
            
            this.realtime.setStream(this.livestream);
            this.setupEventSubscriptions();

            return true;

        } catch (error) {
            console.error(`[LiveMonitor] Connection failed: ${error.message}`);
            this.isConnected = false;
            
            if (this.shouldStop) {
                return false;
            }

            return this.handleConnectionFailure(address, port);
        }
    }

    setupConnectionHandlers(address, port) {
        // Handle connection errors
        this.livestream.connection.on('error', (err) => {
            console.error(`[LiveMonitor] Connection error: ${err.message}`);
            this.isConnected = false;
            this.handleConnectionFailure(address, port);
        });

        // Handle disconnections
        this.livestream.connection.on('disconnect', () => {
            console.log('[LiveMonitor] Disconnected from Slippi relay');
            this.isConnected = false;
            if (!this.shouldStop) {
                this.handleConnectionFailure(address, port);
            }
        });

        // Handle successful reconnections
        this.livestream.connection.on('reconnect', (attempt) => {
            console.log(`[LiveMonitor] Reconnected after ${attempt} attempts`);
            this.isConnected = true;
            this.reconnectAttempts = 0;
        });
    }

    setupEventSubscriptions() {
        if (!this.realtime) return;

        // Game start event
        this.realtime.game.start$.subscribe(() => {
            console.log('[LiveMonitor] Game started');
            this.emitEvent('gameStart', {});
        });

        // Game end event
        this.realtime.game.end$.subscribe(() => {
            console.log('[LiveMonitor] Game ended');
            this.emitEvent('gameEnd', {});
        });

        // Stock changes
        this.realtime.stock.countChange$.subscribe((payload) => {
            console.log(`[LiveMonitor] Player ${payload.playerIndex + 1} stocks: ${payload.stocksRemaining}`);
            this.emitEvent('stockChange', payload);
        });

        // Combo detection
        this.realtime.combo.end$.subscribe((payload) => {
            console.log('[LiveMonitor] Combo detected:', payload);
            this.emitEvent('combo', payload);
        });

        // Death detection
        this.realtime.stock.death$.subscribe((payload) => {
            console.log('[LiveMonitor] Player death:', payload);
            this.emitEvent('death', payload);
        });
    }

    emitEvent(eventType, eventData) {
        this.eventCallbacks.forEach((callback) => {
            try {
                callback(eventType, eventData);
            } catch (error) {
                console.error(`[LiveMonitor] Error in event callback: ${error.message}`);
            }
        });
    }

    async handleConnectionFailure(address, port) {
        const config = getSlippiConfig();
        
        if (!config.autoRetry || this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(`[LiveMonitor] Max reconnection attempts reached. Giving up.`);
            console.error(`[LiveMonitor] Please ensure Slippi Dolphin is running with:`);
            console.error(`  - Netplay Setup configured`);
            console.error(`  - Direct Connection selected`);
            console.error(`  - Address: ${address}`);
            console.error(`  - Port: ${port}`);
            console.error(`  - "Connect" button pressed in Dolphin`);
            return false;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`[LiveMonitor] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (!this.shouldStop) {
            return this.connect(address, port);
        }
        
        return false;
    }

    stop() {
        console.log('[LiveMonitor] Stopping live monitoring...');
        this.shouldStop = true;
        this.isConnected = false;
        
        if (this.livestream) {
            this.livestream.stop();
            this.livestream = null;
        }
        
        this.eventCallbacks.clear();
        console.log('[LiveMonitor] Live monitoring stopped');
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }

    addEventCallback(name, callback) {
        this.eventCallbacks.set(name, callback);
    }

    removeEventCallback(name) {
        this.eventCallbacks.delete(name);
    }
}

// Singleton instance
let monitorInstance = null;

export function getLiveMonitor() {
    if (!monitorInstance) {
        monitorInstance = new EnhancedLiveMonitor();
    }
    return monitorInstance;
}

export { EnhancedLiveMonitor };
