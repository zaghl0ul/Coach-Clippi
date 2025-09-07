// Overlay Configuration Management
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration manager for overlay settings
 */
export class OverlayConfig {
    constructor() {
        this.configPath = path.join(__dirname, 'overlay.json');
        this.defaultConfig = {
            // Display Settings
            hotkey: 'F9',
            transparency: 80,
            theme: 'default',
            position: 'auto',
            enabled: true,
            
            // Bubble Settings
            bubbleStyle: 'speech',
            fontSize: 14,
            fontFamily: 'Arial',
            maxBubbles: 3,
            displayDuration: 5000,
            fadeAnimation: true,
            
            // Positioning
            bubblePositions: {
                topLeft: { x: 50, y: 50 },
                topRight: { x: -50, y: 50 },
                bottomLeft: { x: 50, y: -150 },
                bottomRight: { x: -50, y: -150 },
                center: { x: 0, y: 0 }
            },
            
            // Theme Definitions
            themes: {
                default: {
                    name: 'Default',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    textColor: '#ffffff',
                    borderColor: '#4a90e2',
                    borderWidth: 2,
                    borderRadius: 8,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                    shadowOffset: { x: 2, y: 2 },
                    shadowBlur: 4
                },
                dark: {
                    name: 'Dark Mode',
                    backgroundColor: 'rgba(20, 20, 20, 0.9)',
                    textColor: '#e0e0e0',
                    borderColor: '#666666',
                    borderWidth: 1,
                    borderRadius: 6,
                    shadowColor: 'rgba(0, 0, 0, 0.7)',
                    shadowOffset: { x: 1, y: 1 },
                    shadowBlur: 3
                },
                light: {
                    name: 'Light Mode',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    textColor: '#333333',
                    borderColor: '#cccccc',
                    borderWidth: 1,
                    borderRadius: 8,
                    shadowColor: 'rgba(0, 0, 0, 0.3)',
                    shadowOffset: { x: 2, y: 2 },
                    shadowBlur: 4
                },
                neon: {
                    name: 'Neon',
                    backgroundColor: 'rgba(10, 10, 30, 0.8)',
                    textColor: '#00ff88',
                    borderColor: '#00ff88',
                    borderWidth: 2,
                    borderRadius: 4,
                    shadowColor: 'rgba(0, 255, 136, 0.5)',
                    shadowOffset: { x: 0, y: 0 },
                    shadowBlur: 8
                },
                minimal: {
                    name: 'Minimal',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    textColor: '#ffffff',
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: 12,
                    shadowColor: 'rgba(0, 0, 0, 0.4)',
                    shadowOffset: { x: 1, y: 1 },
                    shadowBlur: 2
                },
                slippi: {
                    name: 'Slippi Green',
                    backgroundColor: 'rgba(33, 186, 69, 0.9)',  // #21ba45
                    textColor: '#ffffff',
                    borderColor: '#0f6428',  // Darker green border
                    borderWidth: 3,
                    borderRadius: 15,
                    shadowColor: 'rgba(33, 255, 80, 0.5)',  // Green glow
                    shadowOffset: { x: 0, y: 0 },
                    shadowBlur: 8,
                    gradient: {
                        start: 'rgba(33, 186, 69, 0.9)',
                        end: 'rgba(25, 140, 52, 0.8)'
                    },
                    glowLayers: {
                        outer: { color: 'rgba(33, 255, 80, 0.5)', width: 8 },
                        inner: { color: 'rgba(100, 255, 150, 0.3)', width: 2 }
                    },
                    pulseAnimation: true,
                    textShadow: { color: 'rgba(0, 0, 0, 0.6)', offset: 2 }
                }
            },
            
            // Coaching Categories
            coachingCategories: {
                neutral: {
                    name: 'Neutral Game',
                    color: '#4a90e2',
                    priority: 'medium',
                    position: 'topLeft'
                },
                combo: {
                    name: 'Combo Execution',
                    color: '#e74c3c',
                    priority: 'high',
                    position: 'topRight'
                },
                edgeguard: {
                    name: 'Edge Guarding',
                    color: '#f39c12',
                    priority: 'medium',
                    position: 'bottomLeft'
                },
                recovery: {
                    name: 'Recovery',
                    color: '#9b59b6',
                    priority: 'high',
                    position: 'bottomRight'
                },
                tech: {
                    name: 'Tech Skill',
                    color: '#1abc9c',
                    priority: 'low',
                    position: 'center'
                },
                general: {
                    name: 'General',
                    color: '#95a5a6',
                    priority: 'medium',
                    position: 'auto'
                }
            },
            
            // Animation Settings
            animations: {
                fadeIn: {
                    duration: 300,
                    easing: 'ease-out'
                },
                fadeOut: {
                    duration: 500,
                    easing: 'ease-in'
                },
                slideIn: {
                    duration: 400,
                    easing: 'ease-out'
                }
            },
            
            // Performance Settings
            performance: {
                maxFPS: 60,
                vsync: true,
                lowLatencyMode: false,
                renderQuality: 'high'
            }
        };
        
        this.config = { ...this.defaultConfig };
    }

    /**
     * Load configuration from file
     */
    async load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(configData);
                
                // Merge with defaults to ensure all properties exist
                this.config = this.mergeConfig(this.defaultConfig, loadedConfig);
                
                console.log('⚙️ Overlay configuration loaded from file');
            } else {
                console.log('⚙️ Using default overlay configuration');
                await this.save(); // Create default config file
            }
        } catch (error) {
            console.warn('⚠️ Failed to load overlay configuration:', error.message);
            this.config = { ...this.defaultConfig };
        }
        
        return this.config;
    }

    /**
     * Save configuration to file
     */
    async save() {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            console.log('💾 Overlay configuration saved');
        } catch (error) {
            console.error('❌ Failed to save overlay configuration:', error.message);
            throw error;
        }
    }

    /**
     * Merge configuration objects recursively
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in userConfig) {
            if (userConfig.hasOwnProperty(key)) {
                if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                    merged[key] = this.mergeConfig(defaultConfig[key] || {}, userConfig[key]);
                } else {
                    merged[key] = userConfig[key];
                }
            }
        }
        
        return merged;
    }

    /**
     * Get current configuration
     */
    get() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    async update(updates) {
        this.config = this.mergeConfig(this.config, updates);
        await this.save();
        return this.config;
    }

    /**
     * Reset to default configuration
     */
    async reset() {
        this.config = { ...this.defaultConfig };
        await this.save();
        return this.config;
    }

    /**
     * Get theme by name
     */
    getTheme(themeName = 'default') {
        return this.config.themes[themeName] || this.config.themes.default;
    }

    /**
     * Get all available themes
     */
    getThemes() {
        return Object.keys(this.config.themes).map(key => ({
            id: key,
            ...this.config.themes[key]
        }));
    }

    /**
     * Add custom theme
     */
    async addTheme(name, themeData) {
        this.config.themes[name] = themeData;
        await this.save();
        return this.config.themes[name];
    }

    /**
     * Remove custom theme
     */
    async removeTheme(name) {
        if (name === 'default') {
            throw new Error('Cannot remove default theme');
        }
        
        delete this.config.themes[name];
        
        // Reset to default if current theme was removed
        if (this.config.theme === name) {
            this.config.theme = 'default';
        }
        
        await this.save();
    }

    /**
     * Get coaching category configuration
     */
    getCoachingCategory(category) {
        return this.config.coachingCategories[category] || this.config.coachingCategories.general;
    }

    /**
     * Get all coaching categories
     */
    getCoachingCategories() {
        return Object.keys(this.config.coachingCategories).map(key => ({
            id: key,
            ...this.config.coachingCategories[key]
        }));
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];
        
        // Validate transparency
        if (this.config.transparency < 0 || this.config.transparency > 100) {
            errors.push('Transparency must be between 0 and 100');
        }
        
        // Validate font size
        if (this.config.fontSize < 8 || this.config.fontSize > 72) {
            errors.push('Font size must be between 8 and 72');
        }
        
        // Validate max bubbles
        if (this.config.maxBubbles < 1 || this.config.maxBubbles > 10) {
            errors.push('Max bubbles must be between 1 and 10');
        }
        
        // Validate display duration
        if (this.config.displayDuration < 1000 || this.config.displayDuration > 30000) {
            errors.push('Display duration must be between 1000 and 30000 milliseconds');
        }
        
        // Validate theme exists
        if (!this.config.themes[this.config.theme]) {
            errors.push(`Theme '${this.config.theme}' does not exist`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Export configuration for backup
     */
    export() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            config: this.config
        };
    }

    /**
     * Import configuration from backup
     */
    async import(backupData) {
        try {
            if (backupData.config) {
                this.config = this.mergeConfig(this.defaultConfig, backupData.config);
                await this.save();
                console.log('📥 Configuration imported successfully');
                return true;
            } else {
                throw new Error('Invalid backup data format');
            }
        } catch (error) {
            console.error('❌ Failed to import configuration:', error.message);
            throw error;
        }
    }
}

// Create singleton instance
let configInstance = null;

export function getOverlayConfig() {
    if (!configInstance) {
        configInstance = new OverlayConfig();
    }
    return configInstance;
}

export default { OverlayConfig, getOverlayConfig };
