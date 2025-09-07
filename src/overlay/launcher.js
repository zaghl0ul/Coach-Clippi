// Coach Clippi - Slippi Green Overlay Launcher
// Clean, user-friendly interface for the overlay system

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ASCII Art Logo
const LOGO = `
  ╔═══════════════════════════════════════════════╗
  ║   🎮 COACH CLIPPI - SLIPPI GREEN OVERLAY 🎮   ║
  ╠═══════════════════════════════════════════════╣
  ║   Advanced coaching overlay for Slippi        ║
  ║   Now with Slippi's signature green theme!    ║
  ╚═══════════════════════════════════════════════╝
`;

class SlippiOverlayLauncher {
    constructor() {
        this.overlayProcess = null;
        this.isRunning = false;
        this.dolphinPID = null;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    // Display welcome message
    showWelcome() {
        console.clear();
        console.log('\x1b[32m%s\x1b[0m', LOGO);  // Green color
        console.log();
    }

    // Find Dolphin/Slippi process
    async findDolphinProcess() {
        try {
            // Try "Slippi Dolphin.exe" first (the actual process name)
            const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Slippi Dolphin.exe" /FO CSV');
            const lines = stdout.split('\n');
            
            for (const line of lines) {
                if (line.includes('Slippi Dolphin.exe')) {
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const pid = parts[1].replace(/"/g, '').trim();
                        return parseInt(pid);
                    }
                }
            }
            
            // Fallback to regular Dolphin.exe if not found
            const { stdout: stdout2 } = await execAsync('tasklist /FI "IMAGENAME eq Dolphin.exe" /FO CSV');
            const lines2 = stdout2.split('\n');
            
            for (const line of lines2) {
                if (line.includes('Dolphin.exe')) {
                    const parts = line.split(',');
                    if (parts.length >= 2) {
                        const pid = parts[1].replace(/"/g, '').trim();
                        return parseInt(pid);
                    }
                }
            }
        } catch (error) {
            console.error('Error finding Dolphin process:', error.message);
        }
        return null;
    }

    // Start the overlay system
    async startOverlay() {
        console.log('\x1b[36m[INFO]\x1b[0m Starting overlay system...\n');

        // Check if Dolphin is running
        this.dolphinPID = await this.findDolphinProcess();
        if (!this.dolphinPID) {
            console.log('\x1b[31m[ERROR]\x1b[0m Slippi Dolphin is not running!');
            console.log('Please start Slippi Dolphin first, then run this launcher again.\n');
            return false;
        }

        console.log(`\x1b[32m[✓]\x1b[0m Found Slippi Dolphin (PID: ${this.dolphinPID})`);

        // Check if DLL exists
        const dllPath = path.join(__dirname, '..', '..', 'build', 'overlay.dll');
        if (!fs.existsSync(dllPath)) {
            console.log('\x1b[31m[ERROR]\x1b[0m overlay.dll not found!');
            console.log('Building DLL...\n');
            
            try {
                await this.buildDLL();
            } catch (error) {
                console.log('\x1b[31m[ERROR]\x1b[0m Failed to build DLL:', error.message);
                return false;
            }
        }

        // Start overlay injection
        console.log('\x1b[36m[INFO]\x1b[0m Injecting overlay into Dolphin...');
        
        try {
            // Use the CommonJS test file which handles injection
            const testScript = path.join(__dirname, '..', '..', 'test_overlay_clean.cjs');
            
            const { spawn } = await import('child_process');
            this.overlayProcess = spawn('node', [testScript], {
                stdio: 'pipe'
            });

            this.overlayProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('✅')) {
                    console.log('\x1b[32m%s\x1b[0m', output.trim());
                } else if (output.includes('❌')) {
                    console.log('\x1b[31m%s\x1b[0m', output.trim());
                } else {
                    console.log(output.trim());
                }
            });

            this.overlayProcess.stderr.on('data', (data) => {
                console.error('\x1b[31m[ERROR]\x1b[0m', data.toString());
            });

            this.overlayProcess.on('close', (code) => {
                if (code !== 0) {
                    console.log(`\x1b[31m[ERROR]\x1b[0m Overlay process exited with code ${code}`);
                }
                this.isRunning = false;
            });

            this.isRunning = true;
            
            // Wait a moment for injection
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('\x1b[32m[✓]\x1b[0m Overlay system started successfully!');
            console.log('\x1b[32m[✓]\x1b[0m Slippi green theme activated!');
            console.log();
            
            return true;
        } catch (error) {
            console.log('\x1b[31m[ERROR]\x1b[0m Failed to start overlay:', error.message);
            return false;
        }
    }

    // Build the DLL if needed
    async buildDLL() {
        const buildScript = path.join(__dirname, 'injection', 'build_dll.bat');
        await execAsync(`cd "${path.join(__dirname, 'injection')}" && build_dll.bat`);
        console.log('\x1b[32m[✓]\x1b[0m DLL built successfully!');
    }

    // Send test message
    async sendTestMessage() {
        if (!this.isRunning) {
            console.log('\x1b[31m[ERROR]\x1b[0m Overlay is not running!');
            return;
        }

        const messages = [
            "Great wavedash!",
            "Perfect L-cancel timing!",
            "Watch your DI on that combo!",
            "Excellent edgeguard setup!",
            "Try mixing up your recovery options",
            "Strong neutral game!",
            "Beautiful combo extension!"
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // Send message through the overlay process
        if (this.overlayProcess && this.overlayProcess.stdin) {
            this.overlayProcess.stdin.write(randomMessage + '\n');
            console.log(`\x1b[36m[SENT]\x1b[0m "${randomMessage}"`);
        }
    }

    // Interactive menu
    async showMenu() {
        console.log('\x1b[36m╔════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[36m║           OVERLAY CONTROLS         ║\x1b[0m');
        console.log('\x1b[36m╠════════════════════════════════════╣\x1b[0m');
        console.log('\x1b[36m║\x1b[0m  1. Send test message              \x1b[36m║\x1b[0m');
        console.log('\x1b[36m║\x1b[0m  2. Toggle overlay visibility      \x1b[36m║\x1b[0m');
        console.log('\x1b[36m║\x1b[0m  3. Restart overlay                \x1b[36m║\x1b[0m');
        console.log('\x1b[36m║\x1b[0m  4. Exit                           \x1b[36m║\x1b[0m');
        console.log('\x1b[36m╚════════════════════════════════════╝\x1b[0m');
        console.log();

        this.rl.question('Select option (1-4): ', async (answer) => {
            switch(answer) {
                case '1':
                    await this.sendTestMessage();
                    break;
                case '2':
                    console.log('\x1b[36m[INFO]\x1b[0m Toggling overlay visibility...');
                    // Send toggle command
                    if (this.overlayProcess && this.overlayProcess.stdin) {
                        this.overlayProcess.stdin.write('TOGGLE\n');
                    }
                    break;
                case '3':
                    console.log('\x1b[36m[INFO]\x1b[0m Restarting overlay...');
                    await this.stopOverlay();
                    await this.startOverlay();
                    break;
                case '4':
                    await this.shutdown();
                    return;
                default:
                    console.log('\x1b[31m[ERROR]\x1b[0m Invalid option!');
            }
            
            // Show menu again
            setTimeout(() => this.showMenu(), 1000);
        });
    }

    // Stop overlay
    async stopOverlay() {
        if (this.overlayProcess) {
            this.overlayProcess.kill();
            this.overlayProcess = null;
            this.isRunning = false;
            console.log('\x1b[36m[INFO]\x1b[0m Overlay stopped.');
        }
    }

    // Shutdown
    async shutdown() {
        console.log('\n\x1b[36m[INFO]\x1b[0m Shutting down...');
        await this.stopOverlay();
        this.rl.close();
        process.exit(0);
    }

    // Main run function
    async run() {
        this.showWelcome();
        
        const started = await this.startOverlay();
        if (!started) {
            this.rl.close();
            process.exit(1);
        }

        // Show interactive menu
        await this.showMenu();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\x1b[36m[INFO]\x1b[0m Received interrupt signal...');
    if (launcher) {
        await launcher.shutdown();
    }
});

// Start the launcher
const launcher = new SlippiOverlayLauncher();
launcher.run().catch(error => {
    console.error('\x1b[31m[FATAL ERROR]\x1b[0m', error);
    process.exit(1);
});
