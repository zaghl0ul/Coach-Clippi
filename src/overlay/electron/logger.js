// Coach Clippi - Advanced Logging System
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    // Create logs directory
    this.logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Log file paths
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    this.logFile = path.join(this.logDir, `coach-clippi-${timestamp}.log`);
    this.errorFile = path.join(this.logDir, `coach-clippi-errors-${timestamp}.log`);
    
    // In-memory log buffer for UI display
    this.logBuffer = [];
    this.maxBufferSize = 100;
    
    // Log levels
    this.levels = {
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
      DETECTION: 'DETECTION'
    };

    // Write initial log entry
    this.info('Logger initialized', { logDir: this.logDir });
  }

  // Format log entry
  formatEntry(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level,
      message,
      data
    };
    return JSON.stringify(entry);
  }

  // Write to file
  writeToFile(file, entry) {
    fs.appendFileSync(file, entry + '\n', 'utf8');
  }

  // Add to buffer
  addToBuffer(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  // Log methods
  debug(message, data = null) {
    const entry = this.formatEntry(this.levels.DEBUG, message, data);
    console.log(`[DEBUG] ${message}`, data || '');
    this.writeToFile(this.logFile, entry);
    this.addToBuffer(this.levels.DEBUG, message, data);
  }

  info(message, data = null) {
    const entry = this.formatEntry(this.levels.INFO, message, data);
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile(this.logFile, entry);
    this.addToBuffer(this.levels.INFO, message, data);
  }

  warn(message, data = null) {
    const entry = this.formatEntry(this.levels.WARN, message, data);
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile(this.logFile, entry);
    this.addToBuffer(this.levels.WARN, message, data);
  }

  error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : null;
    
    const entry = this.formatEntry(this.levels.ERROR, message, errorData);
    console.error(`[ERROR] ${message}`, error || '');
    this.writeToFile(this.logFile, entry);
    this.writeToFile(this.errorFile, entry);
    this.addToBuffer(this.levels.ERROR, message, errorData);
  }

  detection(message, data = null) {
    const entry = this.formatEntry(this.levels.DETECTION, message, data);
    console.log(`[DETECTION] ${message}`, data || '');
    this.writeToFile(this.logFile, entry);
    this.addToBuffer(this.levels.DETECTION, message, data);
  }

  // Get recent logs for UI
  getRecentLogs(count = 20) {
    return this.logBuffer.slice(-count);
  }

  // Get all logs from file
  getAllLogs() {
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      return content.split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch (error) {
      this.error('Failed to read log file', error);
      return [];
    }
  }

  // Clear logs
  clearLogs() {
    this.logBuffer = [];
    fs.writeFileSync(this.logFile, '');
    fs.writeFileSync(this.errorFile, '');
    this.info('Logs cleared');
  }

  // Get log file paths
  getLogPaths() {
    return {
      logFile: this.logFile,
      errorFile: this.errorFile,
      logDir: this.logDir
    };
  }
}

// Export singleton instance
module.exports = new Logger();
