import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(process.cwd(), '.env');
const jsonConfigPath = path.join(process.cwd(), 'config.json');

export function getConfig(key, defaultValue = null) {
    // First check environment variables
    if (process.env[key]) {
        return process.env[key];
    }
    
    // Then check config.json file
    try {
        if (fs.existsSync(jsonConfigPath)) {
            const config = JSON.parse(fs.readFileSync(jsonConfigPath, 'utf8'));
            
            // Handle nested keys like 'slippi.address' or 'ai.apiKey'
            if (key.includes('.')) {
                const parts = key.split('.');
                let value = config;
                for (const part of parts) {
                    if (value && typeof value === 'object') {
                        value = value[part];
                    } else {
                        value = undefined;
                        break;
                    }
                }
                if (value !== undefined) {
                    return value;
                }
            } else {
                // Handle direct keys
                if (config[key] !== undefined) {
                    return config[key];
                }
            }
        }
    } catch (error) {
        console.warn('Error reading config.json:', error.message);
    }
    
    // Then check .env file (legacy support)
    try {
        const envContent = fs.readFileSync(configPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            const [k, v] = line.split('=');
            if (k.trim() === key) {
                return v.trim();
            }
        }
    } catch (error) {
        // .env file doesn't exist or can't be read
    }
    
    return defaultValue;
}

export function getSlippiConfig() {
    return {
        address: getConfig('slippi.address', '127.0.0.1'),
        port: parseInt(getConfig('slippi.port', '2626')),
        autoRetry: getConfig('slippi.autoRetry', 'true') === 'true',
        maxRetries: parseInt(getConfig('slippi.maxRetries', '10')),
        retryDelay: parseInt(getConfig('slippi.retryDelay', '3000'))
    };
}

export function getAIConfig() {
    const provider = getConfig('AI_PROVIDER') || getConfig('ai.provider', 'local');
    
    // Get provider-specific API key
    let apiKey = getConfig('API_KEY', 'local');
    switch (provider.toLowerCase()) {
        case 'openai':
            apiKey = getConfig('OPENAI_API_KEY') || apiKey;
            break;
        case 'gemini':
        case 'google':
            apiKey = getConfig('GEMINI_API_KEY') || apiKey;
            break;
        case 'anthropic':
            apiKey = getConfig('ANTHROPIC_API_KEY') || apiKey;
            break;
        case 'openrouter':
            apiKey = getConfig('OPENROUTER_API_KEY') || apiKey;
            break;
        case 'bedrock':
        case 'aws':
        case 'aws-bedrock':
            // For Bedrock, we need AWS credentials instead of API key
            apiKey = {
                accessKeyId: getConfig('AWS_ACCESS_KEY_ID'),
                secretAccessKey: getConfig('AWS_SECRET_ACCESS_KEY'),
                region: getConfig('AWS_REGION', 'us-east-1')
            };
            break;
        case 'lmstudio':
        case 'local':
        default:
            apiKey = 'local';
            break;
    }
    
    return {
        provider: provider,
        apiKey: apiKey,
        model: getConfig('AI_MODEL') || getConfig('ai.model', getDefaultModelForProvider(provider)),
        maxTokens: parseInt(getConfig('AI_MAX_TOKENS') || getConfig('ai.maxTokens', '150')),
        temperature: parseFloat(getConfig('AI_TEMPERATURE') || getConfig('ai.temperature', '0.7')),
        endpoint: getConfig('LM_STUDIO_ENDPOINT', 'http://localhost:1234/v1'), // For LM Studio
        
        // Dual model configuration for parallel processing
        dualMode: getConfig('AI_DUAL_MODE', 'false') === 'true',
        fastModel: getConfig('AI_FAST_MODEL') || getConfig('ai.fastModel', 'anthropic/claude-3-haiku:beta'),
        analyticalModel: getConfig('AI_ANALYTICAL_MODEL') || getConfig('ai.analyticalModel', 'anthropic/claude-3.5-sonnet:beta'),
        fastMaxTokens: parseInt(getConfig('AI_FAST_MAX_TOKENS', '75')),
        analyticalMaxTokens: parseInt(getConfig('AI_ANALYTICAL_MAX_TOKENS', '200'))
    };
}

function getDefaultModelForProvider(provider) {
    switch (provider.toLowerCase()) {
        case 'openai':
            return 'gpt-3.5-turbo';
        case 'gemini':
        case 'google':
            return 'gemini-pro';
        case 'anthropic':
            return 'claude-3-sonnet-20240229';
        case 'openrouter':
            return 'openai/gpt-3.5-turbo';
        case 'bedrock':
        case 'aws':
        case 'aws-bedrock':
            return 'anthropic.claude-3-sonnet-20240229-v1:0';
        case 'lmstudio':
        case 'local':
        default:
            return 'local-model';
    }
}

export function getLoggingConfig() {
    return {
        level: getConfig('logging.level', 'info'),
        file: getConfig('logging.file', 'slippi-coach.log'),
        console: getConfig('logging.console', 'true') === 'true'
    };
}

export function validateConfig() {
    const errors = [];
    
    // Check AI config
    const aiConfig = getAIConfig();
    if (!aiConfig.apiKey || aiConfig.apiKey === 'your_api_key_here' || aiConfig.apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        errors.push('Please set a valid API key in the configuration');
    }
    
    // Check Slippi config
    const slippiConfig = getSlippiConfig();
    if (!slippiConfig.address || !slippiConfig.port) {
        errors.push('Invalid Slippi configuration');
    }
    
    return errors;
}

export function loadFullConfig() {
    try {
        if (fs.existsSync(jsonConfigPath)) {
            return JSON.parse(fs.readFileSync(jsonConfigPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading full config:', error.message);
    }
    return null;
}
