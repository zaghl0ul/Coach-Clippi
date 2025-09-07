// src/utils/api/inspectGeminiResponse.js
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Ensure proper path resolution in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Load environment variables
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

/**
 * Performs granular inspection of Gemini API response structure
 * Facilitates identification of precise object traversal paths for content extraction
 * 
 * @param {string} apiKey - Gemini API authentication key
 * @param {string} prompt - Test prompt for API invocation
 * @param {Object} options - Advanced configuration parameters
 * @returns {Promise<Object>} - Response structure analysis with traversal paths
 */
export async function inspectGeminiResponse(apiKey, prompt = "Hello, this is a test prompt.", options = {}) {
    const {
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent',
        logToFile = true,
        verbose = true,
        generationConfig = {
            temperature: 0.7,
            maxOutputTokens: 50,
            topP: 0.9,
            topK: 40
        }
    } = options;
    
    console.log(`\n[GEMINI API INSPECTION] Executing request to: ${endpoint}`);
    console.log(`API Key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`Test prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
    
    // Request construction with full parameter exposure
    const requestPayload = {
        contents: [
            {
                parts: [{ text: prompt }]
            }
        ],
        generationConfig
    };
    
    console.log(`\nRequest payload structure: ${JSON.stringify(requestPayload, null, 2)}`);
    
    try {
        // Execute request with explicit configuration
        console.log(`\n[REQUEST] Executing POST to Gemini API...`);
        const response = await axios.post(
            `${endpoint}?key=${apiKey}`,
            requestPayload,
            { 
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                validateStatus: false // Capture all status codes for inspection
            }
        );
        
        console.log(`\n[RESPONSE] Status: ${response.status} ${response.statusText}`);
        
        // Status code analysis
        if (response.status !== 200) {
            console.error(`\n[ERROR] Non-200 status code received: ${response.status}`);
            console.error(`Error details: ${JSON.stringify(response.data, null, 2)}`);
            return {
                success: false,
                statusCode: response.status,
                error: response.data,
                raw: response.data
            };
        }
        
        // Successful response analysis
        console.log(`\n[SUCCESS] Response received. Analyzing structure...`);
        
        // Full response logging
        if (verbose) {
            console.log(`\nFull response data structure:`);
            console.log(JSON.stringify(response.data, null, 2));
        }
        
        // Object path traversal analysis
        const pathAnalysis = analyzeResponseStructure(response.data);
        console.log(`\n[STRUCTURE ANALYSIS] Response object paths:`);
        Object.entries(pathAnalysis.paths).forEach(([path, value]) => {
            console.log(`${path}: ${value === null ? 'null' : (typeof value === 'object' ? JSON.stringify(value) : value)}`);
        });
        
        // Content extraction verification
        console.log(`\n[CONTENT EXTRACTION] Attempting content traversal...`);
        let extractedContent = null;
        let traversalPath = null;
        
        // Try standard extraction path
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            extractedContent = response.data.candidates[0].content.parts[0].text;
            traversalPath = "response.data.candidates[0].content.parts[0].text";
            console.log(`✓ Content extracted using path: ${traversalPath}`);
            console.log(`Content: "${extractedContent.substring(0, 100)}${extractedContent.length > 100 ? '...' : ''}"`);
        } 
        // Check alternative extraction paths
        else if (response.data?.candidates && response.data.candidates.length > 0) {
            console.log(`✗ Standard path traversal failed. Attempting alternative paths...`);
            
            // Explore candidate structure
            const candidate = response.data.candidates[0];
            console.log(`Candidate structure: ${JSON.stringify(candidate, null, 2)}`);
            
            // Try common alternatives
            const alternatives = [
                { path: "candidate.output", value: candidate.output },
                { path: "candidate.text", value: candidate.text },
                { path: "candidate.result", value: candidate.result },
                { path: "candidate.generated_text", value: candidate.generated_text },
                { path: "candidate.message?.content", value: candidate.message?.content }
            ];
            
            for (const alt of alternatives) {
                if (alt.value) {
                    extractedContent = alt.value;
                    traversalPath = `response.data.candidates[0].${alt.path.split('.')[0]}`;
                    console.log(`✓ Content extracted using alternative path: ${traversalPath}`);
                    console.log(`Content: "${extractedContent.substring(0, 100)}${extractedContent.length > 100 ? '...' : ''}"`);
                    break;
                }
            }
            
            if (!extractedContent) {
                console.log(`✗ No content found in standard or alternative paths`);
            }
        } else {
            console.log(`✗ No candidates array found in response`);
        }
        
        // Recommended extraction implementation
        const recommendedImplementation = generateImplementationCode(traversalPath, extractedContent);
        console.log(`\n[RECOMMENDED IMPLEMENTATION]`);
        console.log(recommendedImplementation);
        
        // Optional file logging
        if (logToFile) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const logFilePath = path.join(PROJECT_ROOT, `gemini-response-${timestamp}.json`);
            
            fs.writeFileSync(
                logFilePath, 
                JSON.stringify({
                    request: requestPayload,
                    response: response.data,
                    pathAnalysis,
                    extractedContent,
                    traversalPath,
                    recommendedImplementation
                }, null, 2)
            );
            
            console.log(`\n[LOG] Response analysis saved to: ${logFilePath}`);
        }
        
        return {
            success: true,
            statusCode: response.status,
            data: response.data,
            pathAnalysis,
            extractedContent,
            traversalPath,
            recommendedImplementation,
            raw: response.data
        };
        
    } catch (error) {
        console.error(`\n[ERROR] Request execution failed: ${error.message}`);
        
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.request) {
            console.error(`No response received. Request: ${error.request}`);
        }
        
        return {
            success: false,
            error: error.message,
            details: error.response?.data || null,
            raw: error.response?.data || null
        };
    }
}

/**
 * Recursively analyzes object structure to identify all traversal paths
 * 
 * @param {Object} obj - Object to analyze
 * @param {string} prefix - Current path prefix
 * @param {Object} result - Accumulator for path analysis
 * @returns {Object} - Complete structure analysis with paths and types
 */
function analyzeResponseStructure(obj, prefix = '', result = { paths: {}, types: {} }) {
    if (obj === null || obj === undefined) {
        result.paths[prefix] = null;
        result.types[prefix] = 'null';
        return result;
    }
    
    if (typeof obj !== 'object') {
        result.paths[prefix] = obj;
        result.types[prefix] = typeof obj;
        return result;
    }
    
    // Handle arrays specially
    if (Array.isArray(obj)) {
        result.paths[prefix] = `Array(${obj.length})`;
        result.types[prefix] = 'array';
        
        // Analyze first few array elements
        obj.slice(0, 3).forEach((item, index) => {
            analyzeResponseStructure(
                item, 
                prefix ? `${prefix}[${index}]` : `[${index}]`, 
                result
            );
        });
        
        return result;
    }
    
    // Handle objects
    result.paths[prefix] = `Object(${Object.keys(obj).length} keys)`;
    result.types[prefix] = 'object';
    
    Object.entries(obj).forEach(([key, value]) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        analyzeResponseStructure(value, newPrefix, result);
    });
    
    return result;
}

/**
 * Generates optimal implementation code based on traversal analysis
 * 
 * @param {string} traversalPath - Successful content extraction path
 * @param {string} extractedContent - Content successfully extracted
 * @returns {string} - Generated implementation code
 */
function generateImplementationCode(traversalPath, extractedContent) {
    if (!traversalPath) {
        return `// No valid traversal path identified. Manual response structure examination required.
function extractGeminiContent(response) {
    console.log('Response structure:', JSON.stringify(response.data, null, 2));
    return 'Unable to extract content from response structure';
}`;
    }
    
    return `/**
 * Extracts content from Gemini API response with proper structure traversal
 * Based on response inspection analysis on ${new Date().toISOString()}
 * 
 * @param {Object} response - Axios response object from Gemini API
 * @returns {string} - Extracted content or fallback message
 */
function extractGeminiContent(response) {
    // Validated traversal path: ${traversalPath}
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
    }
    
    // Fallback extraction logic for alternative paths
    const candidate = response.data?.candidates?.[0];
    if (candidate) {
        // Try common alternative properties
        if (candidate.output) return candidate.output;
        if (candidate.text) return candidate.text;
        if (candidate.result) return candidate.result;
        if (candidate.generated_text) return candidate.generated_text;
        if (candidate.message?.content) return candidate.message.content;
    }
    
    console.error('Unable to extract content from response:', 
        JSON.stringify(response.data, null, 2));
    return 'Unable to extract content from Gemini API response';
}`;
}

/**
 * Direct execution entry point for CLI usage
 */
async function main() {
    const API_KEY = process.env.API_KEY;
    
    if (!API_KEY) {
        console.error('API_KEY not found in environment variables. Please set in .env file.');
        process.exit(1);
    }
    
    const testPrompt = "Generate a short analysis of wavedashing techniques in Super Smash Bros Melee.";
    
    try {
        await inspectGeminiResponse(API_KEY, testPrompt);
    } catch (error) {
        console.error('Fatal error during API inspection:', error);
    }
}

// Auto-execute when run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}