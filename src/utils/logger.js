// This file provides logging functionality for the application. 
// It enhances console logging with timestamps and can be extended to log to files or external services.

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
    const timestamp = new Date().toISOString();
    originalConsoleLog.apply(console, [`[${timestamp}]`, ...args]);
};

console.error = function(...args) {
    const timestamp = new Date().toISOString();
    originalConsoleError.apply(console, [`[${timestamp}] ERROR:`, ...args]);
};

// Since this file just modifies the console methods globally, we don't need to export anything
// but it's good practice to add a default export to avoid linting warnings
export default {};