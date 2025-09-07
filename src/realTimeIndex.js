import { CurrentGameMonitor } from './currentGameMonitor.js';
import { getConfig } from './utils/configManager.js';
import './utils/logger.js';

async function main() {
    console.log("Initializing Slippi Coach (Real-time Mode)...");
    
    // Validate API key
    const apiKey = getConfig('API_KEY');
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.error('ERROR: Please set a valid API key in the .env file');
        console.error('Instructions: Update the .env file in the root directory with API_KEY=your_actual_api_key');
        process.exit(1);
    }
    
    try {
        // Create monitor instance
        const monitor = new CurrentGameMonitor(apiKey);
        
        // Handle application shutdown
        process.on('SIGINT', () => {
            console.log("\nShutting down Slippi Coach...");
            monitor.stop();
            process.exit(0);
        });
        
        // Start monitoring
        await monitor.start();
        
        console.log("Real-time Slippi Coach is now running!");
        console.log("Monitoring for active games in progress...");
        console.log("Press Ctrl+C to exit.");
        
    } catch (err) {
        console.error(`Failed to initialize monitor: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    }
}

main().catch(err => {
    console.error(`Unexpected error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
});