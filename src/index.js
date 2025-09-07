import { getLiveSlpMonitor } from './liveSlpMonitor.js';
import { provideLiveCommentary } from './liveCommentary.js';
import { getConfig, validateConfig, getSlippiConfig, getAIConfig } from './utils/configManager.js';
import { createLLMProvider, TemplateProvider } from './utils/llmProviders.js';
import './utils/logger.js';

async function main() {
    console.log("🎮 Initializing Slippi Coach...");
    
    // Validate configuration
    const configErrors = validateConfig();
    if (configErrors.length > 0) {
        console.error('❌ Configuration errors:');
        configErrors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
    }
    
    const apiKey = getConfig('ai.apiKey');
    const slippiConfig = getSlippiConfig();
    const aiConfig = getAIConfig();
    
    // Initialize LLM Provider
    let llmProvider = null;
    try {
        const providerType = aiConfig.provider.toLowerCase();
        
        switch (providerType) {
            case 'lmstudio':
            case 'local':
                llmProvider = createLLMProvider('lmstudio', {
                    endpoint: aiConfig.endpoint
                });
                console.log('🤖 Using LM Studio (local) for AI inference');
                break;
                
            case 'openai':
                if (typeof apiKey === 'string' && apiKey !== 'your_openai_api_key_here') {
                    llmProvider = createLLMProvider('openai', {
                        apiKey: apiKey,
                        model: aiConfig.model
                    });
                    console.log(`🤖 Using OpenAI (${aiConfig.model}) for AI inference`);
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
                    console.log(`🤖 Using Google Gemini (${aiConfig.model}) for AI inference`);
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
                    console.log(`🤖 Using Anthropic Claude (${aiConfig.model}) for AI inference`);
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
                    console.log(`🤖 Using OpenRouter (${aiConfig.model}) for AI inference`);
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
                    console.log(`🤖 Using AWS Bedrock (${aiConfig.model}) for AI inference`);
                } else {
                    throw new Error('Valid AWS credentials required for Bedrock');
                }
                break;
                
            default:
                throw new Error(`Unknown provider: ${aiConfig.provider}`);
        }
    } catch (error) {
        console.warn(`⚠️  Failed to initialize LLM provider: ${error.message}`);
        console.log('📝 Falling back to template-based commentary system');
        llmProvider = new TemplateProvider();
    }
    
    console.log(`🔧 Configuration loaded:`);
    console.log(`   AI Provider: ${aiConfig.provider}`);
    console.log(`   AI Model: ${aiConfig.model}`);
    console.log(`   API Key: ${apiKey === 'local' ? 'Local LLM' : 'External AI'}`);
    console.log(`   Slippi Relay: ${slippiConfig.address}:${slippiConfig.port}`);
    console.log(`   Auto-retry: ${slippiConfig.autoRetry}`);
    console.log(`   Max retries: ${slippiConfig.maxRetries}`);
    
    const liveSlpMonitor = getLiveSlpMonitor();
    
    // Set up event handler for live .slp file monitoring
    liveSlpMonitor.addEventCallback('main', async (eventType, eventData) => {
        console.log(`📡 Event: ${eventType}`, eventData);
        
        // Generate commentary for specific events
        if (['hit', 'combo', 'gameStart', 'gameEnd', 'lowStock'].includes(eventType)) {
            try {
                const commentary = await provideLiveCommentary(llmProvider, [eventData], {
                    eventType: eventType,
                    maxLength: aiConfig.maxTokens,
                    temperature: aiConfig.temperature
                });
                console.log(`🗣️  Commentary: ${commentary}`);
            } catch (error) {
                console.error(`❌ Error generating commentary: ${error.message}`);
            }
        }
    });
    
    // Start live .slp file monitoring
    console.log("\n🚀 Starting live .slp file monitoring...");
    console.log("📋 This will automatically detect when you start playing:");
    console.log("   1. Open Slippi Dolphin (any version)");
    console.log("   2. Start playing (online, offline, or training)"); 
    console.log("   3. The system will detect new .slp files automatically");
    console.log("   4. Real-time analysis will begin immediately");
    
    const slippiPath = getConfig('slippi.replayPath', null);
    console.log(`\n📁 Monitoring directory: ${slippiPath || 'auto-detected'}\n`);
    
    try {
        const started = await liveSlpMonitor.start(slippiPath);
        if (started) {
            console.log("✅ Live .slp monitoring started successfully!");
            console.log("🎮 Ready to analyze your gameplay - start a match in Slippi!");
            
            // Display current status
            const status = liveSlpMonitor.getStatus();
            console.log(`📊 Status: ${JSON.stringify(status, null, 2)}`);
        }
    } catch (error) {
        console.error(`❌ Failed to start .slp monitoring: ${error.message}`);
        console.log("💡 Try setting a custom Slippi directory in your config");
    }
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log("\n🛑 Shutting down gracefully...");
        liveSlpMonitor.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log("\n🛑 Shutting down gracefully...");
        liveSlpMonitor.stop();
        process.exit(0);
    });
}

main().catch(err => {
    console.error(`❌ Unexpected error: ${err.message}`);
    console.error("Stack trace:", err.stack);
    process.exit(1);
});
