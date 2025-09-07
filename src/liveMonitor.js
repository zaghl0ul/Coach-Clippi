// Fix for CommonJS/ESM interoperability using createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// Direct require of CommonJS modules
const { SlpLiveStream, SlpRealTime } = require('@vinceau/slp-realtime');

async function startLiveMonitoring(address, port, onEventCallback) {
    const livestream = new SlpLiveStream();
    const realtime = new SlpRealTime();

    try {
        // Register error handler before attempting connection
        livestream.connection.on('error', (err) => {
            console.error(`Slippi relay connection error: ${err.message}`);
            console.log("Attempting to reconnect automatically...");
            // The reconnect-core library will handle reconnection attempts
        });

        // Register disconnect handler
        livestream.connection.on('disconnect', () => {
            console.log("Disconnected from Slippi relay. Waiting for reconnection...");
        });

        // Register reconnect handler
        livestream.connection.on('reconnect', (attempt) => {
            console.log(`Reconnection attempt #${attempt}`);
        });

        await livestream.start(address, port);
        console.log("Successfully connected to live stream!");

        realtime.setStream(livestream);

        // Subscribe to game start
        realtime.game.start$.subscribe(() => {
            console.log("Game started!");
            onEventCallback("gameStart", {});
        });

        // Subscribe to stock changes
        realtime.stock.countChange$.subscribe((payload) => {
            console.log(`Player ${payload.playerIndex + 1} stocks: ${payload.stocksRemaining}`);
            onEventCallback("stockChange", payload);
        });

        // Subscribe to combos
        realtime.combo.end$.subscribe((payload) => {
            console.log("Combo detected:", payload);
            onEventCallback("combo", payload);
        });

    } catch (err) {
        console.error("Failed to connect to live stream:", err.message);
        console.log("Verify that Slippi is running with relay protocol enabled");
        throw new Error(`Connection failure: ${err.message}`);
    }
}

export { startLiveMonitoring };