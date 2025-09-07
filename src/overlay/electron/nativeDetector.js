// Coach Clippi - Native Window Detection using C++ Module
const path = require('path');
const logger = require('./logger');

class NativeDetector {
  constructor() {
    this.native = null;
    this.loadNativeModule();
  }
  
  loadNativeModule() {
    try {
      // Load the native module
      const nativePath = path.join(__dirname, '..', 'native', 'build', 'Release', 'overlay_native.node');
      this.native = require(nativePath);
      logger.info('Native module loaded successfully', { path: nativePath });
    } catch (error) {
      logger.error('Failed to load native module', error);
      throw new Error('Native module not found. Please build it first: cd src/overlay/native && npm run build');
    }
  }
  
  // Get all windows using native module
  async getAllWindows() {
    try {
      const windows = this.native.getAllWindows();
      logger.debug('Native getAllWindows returned', { count: windows.length });
      
      // Convert native format to our standard format
      return windows.map(w => ({
        title: w.title || '',
        x: w.bounds.x || 0,
        y: w.bounds.y || 0,
        width: w.bounds.width || 0,
        height: w.bounds.height || 0,
        pid: w.pid || 0,
        className: w.className || '',
        processName: w.processName || '',
        handle: String(w.handle || '0')
      }));
    } catch (error) {
      logger.error('Native getAllWindows failed', error);
      return [];
    }
  }
  
  // Find windows by process name
  async findWindowsByProcess(processName) {
    try {
      const windows = this.native.findWindowsByProcess(processName);
      logger.debug('Native findWindowsByProcess returned', { 
        processName, 
        count: windows.length 
      });
      
      // Convert native format to our standard format
      return windows.map(w => ({
        title: w.title || '',
        x: w.bounds.x || 0,
        y: w.bounds.y || 0,
        width: w.bounds.width || 0,
        height: w.bounds.height || 0,
        pid: w.pid || 0,
        className: w.className || '',
        processName: w.processName || '',
        handle: String(w.handle || '0')
      }));
    } catch (error) {
      logger.error('Native findWindowsByProcess failed', error);
      return [];
    }
  }
  
  // Find Dolphin process specifically
  async findDolphinProcess() {
    try {
      const pid = this.native.findDolphinProcess();
      logger.info('Native findDolphinProcess returned', { pid });
      return pid;
    } catch (error) {
      logger.error('Native findDolphinProcess failed', error);
      return 0;
    }
  }
  
  // Check if process is running
  async isProcessRunning(pid) {
    try {
      const running = this.native.isProcessRunning(pid);
      return running;
    } catch (error) {
      logger.error('Native isProcessRunning failed', error);
      return false;
    }
  }
  
  // Get Dolphin window by PID
  async getDolphinWindow(pid) {
    try {
      const handle = this.native.getDolphinWindow(pid);
      if (handle) {
        // Get full window info
        const windows = await this.getAllWindows();
        return windows.find(w => w.handle === String(handle));
      }
      return null;
    } catch (error) {
      logger.error('Native getDolphinWindow failed', error);
      return null;
    }
  }
}

module.exports = NativeDetector;
