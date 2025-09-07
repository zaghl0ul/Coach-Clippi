// src/utils/providerSelector.js
import readline from 'readline';
import { createLLMProvider } from './llmProviders.js';

export async function selectLLMProvider() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => rl.question(query, resolve));
  
  console.log("\n==== LLM Provider Selection ====");
  console.log("1. Local LM Studio");
  console.log("2. OpenAI");
  console.log("3. Anthropic Claude");
  console.log("4. Google Gemini");
  console.log("5. Template-only (No LLM)");
  
  let provider = null;
  
  try {
    const selection = await question("\nSelect a provider (1-5): ");
    
    switch (selection.trim()) {
      case '1':
        const endpoint = await question("Enter LM Studio endpoint (default: http://localhost:1234/v1): ");
        provider = createLLMProvider('lmstudio', { 
          endpoint: endpoint.trim() || 'http://localhost:1234/v1' 
        });
        break;
      case '2':
        const openaiKey = await question("Enter OpenAI API key: ");
        const openaiModel = await question("Enter model name (default: gpt-3.5-turbo): ");
        provider = createLLMProvider('openai', { 
          apiKey: openaiKey.trim(),
          model: openaiModel.trim() || 'gpt-3.5-turbo'
        });
        break;
      case '3':
        const anthropicKey = await question("Enter Anthropic API key: ");
        const anthropicModel = await question("Enter model name (default: claude-instant-1): ");
        provider = createLLMProvider('anthropic', { 
          apiKey: anthropicKey.trim(),
          model: anthropicModel.trim() || 'claude-instant-1'
        });
        break;
      case '4':
        const geminiKey = await question("Enter Google API key: ");
        const geminiModel = await question("Enter model name (default: gemini-pro): ");
        provider = createLLMProvider('gemini', { 
          apiKey: geminiKey.trim(),
          model: geminiModel.trim() || 'gemini-pro'
        });
        break;
      case '5':
        console.log("Selected template-only mode. No LLM integration will be used.");
        provider = null;
        break;
      default:
        console.log("Invalid selection. Defaulting to template-only mode.");
        provider = null;
    }
    
    // Test connection if a provider was selected
    if (provider) {
      console.log(`\nTesting connection to ${provider.name}...`);
      const testResult = await provider.testConnection();
      
      if (testResult.success) {
        console.log(`✅ Successfully connected to ${provider.name}`);
        console.log(`Test response: "${testResult.response}"`);
      } else {
        console.log(`❌ Failed to connect to ${provider.name}: ${testResult.error}`);
        console.log("Defaulting to template-based system without LLM.");
        provider = null;
      }
    }
  } catch (error) {
    console.error("Error during provider selection:", error.message);
    provider = null;
  } finally {
    rl.close();
  }
  
  return provider;
}