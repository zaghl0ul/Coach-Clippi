// src/utils/api/localGeminiProxy.js
import http from 'http';
import axios from 'axios';
import { extractGeminiContent } from './extractGeminiContent.js';

/**
 * Default port for the local proxy server
 */
const DEFAULT_PORT = 3008;

/**
 * Local proxy server for Gemini API requests
 * Provides authentication abstraction and response normalization
 */
class LocalGeminiProxy {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.port = options.port || DEFAULT_PORT;
        this.server = null;
        this.isRunning = false;
        this.requestCount = 0;
        this.endpoint = options.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent';
        this.verbose = options.verbose || false;
    }
    
    /**
     * Starts the local proxy server
     * 
     * @returns {Promise<void>}
     */
    start() {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                return resolve();
            }
            
            this.server = http.createServer(this._handleRequest.bind(this));
            
            this.server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is already in use. Choose a different port.`);
                    reject(err);
                } else {
                    console.error('Proxy server error:', err);
                    reject(err);
                }
            });
            
            this.server.listen(this.port, () => {
                this.isRunning = true;
                console.log(`[GEMINI PROXY] Local proxy server running on http://localhost:${this.port}`);
                resolve();
            });
        });
    }
    
    /**
     * Stops the local proxy server
     * 
     * @returns {Promise<void>}
     */
    stop() {
        return new Promise((resolve) => {
            if (!this.isRunning || !this.server) {
                return resolve();
            }
            
            this.server.close(() => {
                this.isRunning = false;
                console.log('[GEMINI PROXY] Local proxy server stopped');
                resolve();
            });
        });
    }
    
    /**
     * Handles incoming HTTP requests to the proxy
     * 
     * @param {http.IncomingMessage} req - HTTP request
     * @param {http.ServerResponse} res - HTTP response
     * @private
     */
    async _handleRequest(req, res) {
        // Only handle POST requests to /generate
        if (req.method !== 'POST' || req.url !== '/generate') {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
        }
        
        // Parse request body
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const requestBody = JSON.parse(body);
                const requestId = ++this.requestCount;
                
                if (this.verbose) {
                    console.log(`[GEMINI PROXY] Request #${requestId} received: ${JSON.stringify(requestBody).substring(0, 100)}...`);
                }
                
                try {
                    // Forward request to Gemini API
                    const response = await axios.post(
                        `${this.endpoint}?key=${this.apiKey}`,
                        requestBody,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            validateStatus: null // Capture all status codes
                        }
                    );
                    
                    // Generate basic proxy response format regardless of success/failure
                    const proxyResponse = {
                        proxy: {
                            requestId,
                            status: response.status,
                            timestamp: new Date().toISOString()
                        }
                    };
                    
                    if (response.status === 200) {
                        // Extract content with our utility
                        const content = extractGeminiContent(response);
                        
                        // Provide standardized successful response
                        proxyResponse.success = true;
                        proxyResponse.content = content || '';
                        
                        if (this.verbose) {
                            console.log(`[GEMINI PROXY] Request #${requestId} successful: ${content?.substring(0, 50)}...`);
                        }
                    } else {
                        // Handle error responses
                        proxyResponse.success = false;
                        proxyResponse.error = {
                            code: response.status,
                            message: response.data?.error?.message || 'Unknown error',
                            details: response.data?.error || {}
                        };
                        
                        console.error(`[GEMINI PROXY] Request #${requestId} failed: ${proxyResponse.error.message}`);
                    }
                    
                    // Send response
                    res.statusCode = 200; // Always return 200 from proxy
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(proxyResponse));
                    
                } catch (error) {
                    // Handle request errors
                    console.error(`[GEMINI PROXY] Request #${requestId} error:`, error.message);
                    
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        success: false,
                        proxy: {
                            requestId,
                            status: 500,
                            timestamp: new Date().toISOString()
                        },
                        error: {
                            message: error.message,
                            code: error.code || 'INTERNAL_ERROR'
                        }
                    }));
                }
                
            } catch (error) {
                // Handle JSON parsing errors
                console.error('[GEMINI PROXY] Invalid request body:', error.message);
                
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    success: false,
                    error: {
                        message: 'Invalid request body',
                        details: error.message
                    }
                }));
            }
        });
    }
    
    /**
     * Returns the proxy URL for API configuration
     * 
     * @returns {string} - Proxy URL
     */
    getProxyUrl() {
        return `http://localhost:${this.port}/generate`;
    }
}

// Export singleton instance and factory function
let proxyInstance = null;

/**
 * Creates and initializes a local Gemini proxy server
 * 
 * @param {string} apiKey - Gemini API key
 * @param {Object} options - Proxy configuration options
 * @returns {Promise<LocalGeminiProxy>} - Initialized proxy instance
 */
export async function createLocalProxy(apiKey, options = {}) {
    if (!proxyInstance) {
        proxyInstance = new LocalGeminiProxy(apiKey, options);
        await proxyInstance.start();
    }
    return proxyInstance;
}

/**
 * Stops the running proxy server
 * 
 * @returns {Promise<void>}
 */
export async function stopLocalProxy() {
    if (proxyInstance) {
        await proxyInstance.stop();
        proxyInstance = null;
    }
}

export { LocalGeminiProxy };