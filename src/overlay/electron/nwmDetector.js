// Coach Clippi - Window Detection using node-window-manager
const windowManager = require('node-window-manager');
const logger = require('./logger');

class NWMDetector {
  constructor() {
    logger.info('NWMDetector initialized with node-window-manager');
  }
  
  // Get all windows using node-window-manager
  async getAllWindows() {
    try {
      const windows = windowManager.windowManager.getWindows();
      logger.debug('NWM getAllWindows returned', { count: windows.length });
      
      // Convert to our standard format
      return windows.map(w => {
        const bounds = w.getBounds();
        const process = w.process || {};
        return {
          title: w.getTitle() || '',
          x: bounds.x || 0,
          y: bounds.y || 0,
          width: bounds.width || 0,
          height: bounds.height || 0,
          pid: process.pid || 0,
          className: '', // NWM doesn't provide class name
          processName: process.name || '',
          handle: String(w.id || '0'),
          isVisible: w.isVisible()
        };
      });
    } catch (error) {
      logger.error('NWM getAllWindows failed', error);
      return [];
    }
  }
  
  // Find windows by process name
  async findWindowsByProcess(processName) {
    try {
      const allWindows = await this.getAllWindows();
      const targetName = processName.toLowerCase();
      
      const filtered = allWindows.filter(w => {
        const procName = w.processName.toLowerCase();
        return procName.includes(targetName.replace('.exe', ''));
      });
      
      logger.debug('NWM findWindowsByProcess returned', { 
        processName, 
        count: filtered.length 
      });
      
      return filtered;
    } catch (error) {
      logger.error('NWM findWindowsByProcess failed', error);
      return [];
    }
  }
  
  // Find Dolphin windows specifically
  async findDolphinWindows() {
    try {
      const allWindows = await this.getAllWindows();
      
      const dolphinWindows = allWindows.filter(w => {
        const title = (w.title || '').toLowerCase();
        const procName = (w.processName || '').toLowerCase();
        
        return (
          procName.includes('dolphin') ||
          procName.includes('slippi') ||
          title.includes('dolphin') ||
          title.includes('slippi') ||
          title.includes('faster melee')
        );
      });
      
      logger.info('NWM found Dolphin windows', { count: dolphinWindows.length });
      return dolphinWindows;
    } catch (error) {
      logger.error('NWM findDolphinWindows failed', error);
      return [];
    }
  }
}

module.exports = NWMDetector;
