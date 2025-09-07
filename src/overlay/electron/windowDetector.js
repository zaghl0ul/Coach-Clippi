// Coach Clippi - Advanced Window Detection System
const { exec } = require('child_process');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');
const SlpDetector = require('./slpDetector');
const SimpleDetector = require('./simpleDetector');
const NativeDetector = require('./nativeDetector');
const NWMDetector = require('./nwmDetector');

class WindowDetector {
  constructor(config) {
    this.config = config;
    this.detectedWindows = [];
    this.targetWindow = null;
    this.lastDetectionTime = null;
    this.detectionAttempts = 0;
    this.slpDetector = new SlpDetector();
    this.simpleDetector = new SimpleDetector();
    
    // Try to load native detector
    try {
      // First try node-window-manager
      this.nwmDetector = new NWMDetector();
      this.useNative = true;
      logger.info('WindowDetector initialized with node-window-manager');
    } catch (nwmError) {
      logger.warn('node-window-manager failed, trying custom native module', nwmError.message);
      
      // Fallback to custom native module
      try {
        this.nativeDetector = new NativeDetector();
        this.useNative = true;
        logger.info('WindowDetector initialized with custom native module');
      } catch (error) {
        this.useNative = false;
        logger.warn('Native modules not available, falling back to PowerShell', error.message);
      }
    }
    
    logger.info('WindowDetector initialized', { 
      config: this.config.detection,
      useNative: this.useNative 
    });
  }

  // Main detection method that tries all enabled methods
  async detectDolphinWindow() {
    this.detectionAttempts++;
    logger.detection(`Starting detection attempt #${this.detectionAttempts}`);
    
    const startTime = Date.now();
    let windows = [];

    try {
      // Try SLP-based detection first (most reliable)
      if (this.config.detection.methods.bySlp !== false) {
        const slpPid = await this.slpDetector.detectDolphinPid();
        if (slpPid) {
          logger.detection(`SLP detection found Dolphin PID: ${slpPid}`);
          this.config.detection.targetPid = slpPid;
        }
      }
      // Get all visible windows
      let allWindows;
      
      if (this.useNative) {
        // Use native module for better reliability
        if (this.nwmDetector) {
          // Try node-window-manager first
          allWindows = await this.nwmDetector.getAllWindows();
          logger.detection(`node-window-manager found ${allWindows.length} total windows`);
          
          // If no windows found, try Dolphin-specific detection
          if (allWindows.length === 0) {
            const dolphinWindows = await this.nwmDetector.findDolphinWindows();
            if (dolphinWindows.length > 0) {
              allWindows = dolphinWindows;
              logger.detection('node-window-manager found Dolphin windows', dolphinWindows);
            }
          }
        } else if (this.nativeDetector) {
          // Use custom native module
          allWindows = await this.nativeDetector.getAllWindows();
          logger.detection(`Native module found ${allWindows.length} total windows`);
          
          // If native found no windows, try Dolphin-specific detection
          if (allWindows.length === 0) {
            const dolphinPid = await this.nativeDetector.findDolphinProcess();
            if (dolphinPid) {
              const dolphinWindow = await this.nativeDetector.getDolphinWindow(dolphinPid);
              if (dolphinWindow) {
                allWindows = [dolphinWindow];
                logger.detection('Native module found Dolphin window', dolphinWindow);
              }
            }
          }
        }
      } else {
        // Fallback to PowerShell
        allWindows = await this.getAllWindows();
        logger.detection(`PowerShell found ${allWindows.length} total windows`);
      }
      
      // If still no windows found, try simple detection
      if (allWindows.length === 0) {
        logger.detection('Trying simple detection fallback...');
        const simpleResult = await this.simpleDetector.detectDolphin();
        if (simpleResult) {
          allWindows = [{
            title: simpleResult.title,
            x: simpleResult.bounds.x,
            y: simpleResult.bounds.y,
            width: simpleResult.bounds.width,
            height: simpleResult.bounds.height,
            pid: simpleResult.pid,
            className: simpleResult.className,
            processName: simpleResult.processName,
            handle: String(simpleResult.pid)
          }];
          logger.detection('Simple detection found window', simpleResult);
        }
      }

      // Try each detection method
      if (this.config.detection.methods.byPid && this.config.detection.targetPid) {
        const pidWindows = this.filterByPid(allWindows, this.config.detection.targetPid);
        if (pidWindows.length > 0) {
          logger.detection(`PID detection found ${pidWindows.length} windows`, { pid: this.config.detection.targetPid });
          windows = windows.concat(pidWindows);
        }
      }

      if (this.config.detection.methods.byProcessName) {
        const processWindows = await this.filterByProcessName(allWindows);
        if (processWindows.length > 0) {
          logger.detection(`Process name detection found ${processWindows.length} windows`);
          windows = windows.concat(processWindows);
        }
      }

      if (this.config.detection.methods.byWindowTitle) {
        const titleWindows = this.filterByTitle(allWindows, this.config.detection.titlePatterns);
        if (titleWindows.length > 0) {
          logger.detection(`Title pattern detection found ${titleWindows.length} windows`);
          windows = windows.concat(titleWindows);
        }
      }

      if (this.config.detection.methods.byClassName) {
        const classWindows = this.filterByClassName(allWindows, this.config.detection.classPatterns);
        if (classWindows.length > 0) {
          logger.detection(`Class name detection found ${classWindows.length} windows`);
          windows = windows.concat(classWindows);
        }
      }

      // Remove duplicates
      const uniqueWindows = this.removeDuplicates(windows);
      
      const detectionTime = Date.now() - startTime;
      logger.detection(`Detection completed in ${detectionTime}ms`, {
        windowsFound: uniqueWindows.length,
        attempts: this.detectionAttempts
      });

      this.detectedWindows = uniqueWindows;
      this.lastDetectionTime = new Date();

      // Select the best window
      if (uniqueWindows.length > 0) {
        this.targetWindow = this.selectBestWindow(uniqueWindows);
        logger.info('Target window selected', this.targetWindow);
      } else {
        this.targetWindow = null;
        logger.warn('No Dolphin windows detected');
      }

      return this.targetWindow;

    } catch (error) {
      logger.error('Detection failed', error);
      return null;
    }
  }

  // Get all visible windows using PowerShell
  async getAllWindows() {
    return new Promise((resolve) => {
      const script = `
        Add-Type @"
          using System;
          using System.Text;
          using System.Runtime.InteropServices;
          using System.Collections.Generic;
          using System.Diagnostics;
          
          public class WindowEnumerator {
            [DllImport("user32.dll")]
            private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
            
            [DllImport("user32.dll", CharSet = CharSet.Auto)]
            private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
            
            [DllImport("user32.dll")]
            private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            
            [DllImport("user32.dll")]
            private static extern bool IsWindowVisible(IntPtr hWnd);
            
            [DllImport("user32.dll")]
            private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
            
            [DllImport("user32.dll", CharSet = CharSet.Auto)]
            private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
            
            private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
            
            [StructLayout(LayoutKind.Sequential)]
            private struct RECT {
              public int Left;
              public int Top;
              public int Right;
              public int Bottom;
            }
            
            public static string GetAllWindows() {
              List<string> windows = new List<string>();
              
              EnumWindows((hWnd, lParam) => {
                if (IsWindowVisible(hWnd)) {
                  uint pid;
                  GetWindowThreadProcessId(hWnd, out pid);
                  
                  StringBuilder title = new StringBuilder(256);
                  GetWindowText(hWnd, title, 256);
                  
                  StringBuilder className = new StringBuilder(256);
                  GetClassName(hWnd, className, 256);
                  
                  RECT rect;
                  GetWindowRect(hWnd, out rect);
                  
                  int width = rect.Right - rect.Left;
                  int height = rect.Bottom - rect.Top;
                  
                  // Skip tiny windows
                  if (width > 50 && height > 50) {
                    try {
                      Process proc = Process.GetProcessById((int)pid);
                      string processName = proc.ProcessName;
                      
                      windows.Add(String.Format("{0}|{1}|{2}|{3}|{4}|{5}|{6}|{7}|{8}", 
                        title.ToString(), 
                        rect.Left, 
                        rect.Top, 
                        width, 
                        height, 
                        pid, 
                        className.ToString(),
                        processName,
                        hWnd.ToInt64()));
                    } catch {
                      // Process might have exited
                      windows.Add(String.Format("{0}|{1}|{2}|{3}|{4}|{5}|{6}|{7}|{8}", 
                        title.ToString(), 
                        rect.Left, 
                        rect.Top, 
                        width, 
                        height, 
                        pid, 
                        className.ToString(),
                        "Unknown",
                        hWnd.ToInt64()));
                    }
                  }
                }
                return true;
              }, IntPtr.Zero);
              
              return String.Join("\n", windows);
            }
          }
"@
        [WindowEnumerator]::GetAllWindows()
      `;

      exec(`powershell -Command "${script}"`, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          logger.error('Failed to enumerate windows', error);
          resolve([]);
          return;
        }

        const windows = stdout.trim().split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split('|');
            if (parts.length >= 9) {
              return {
                title: parts[0] || '',
                x: parseInt(parts[1]) || 0,
                y: parseInt(parts[2]) || 0,
                width: parseInt(parts[3]) || 0,
                height: parseInt(parts[4]) || 0,
                pid: parseInt(parts[5]) || 0,
                className: parts[6] || '',
                processName: parts[7] || '',
                handle: parts[8] || ''
              };
            }
            return null;
          })
          .filter(w => w !== null);

        if (this.config.logging.verboseDetection) {
          logger.debug('All windows enumerated', { count: windows.length });
        }

        resolve(windows);
      });
    });
  }

  // Filter windows by PID
  filterByPid(windows, targetPid) {
    return windows.filter(w => w.pid === targetPid);
  }

  // Filter windows by process name
  async filterByProcessName(windows) {
    const targetNames = this.config.detection.processNames.map(n => n.toLowerCase().replace('.exe', ''));
    return windows.filter(w => {
      const procName = w.processName.toLowerCase().replace('.exe', '');
      return targetNames.some(target => procName.includes(target.replace('.exe', '')));
    });
  }

  // Filter windows by title patterns
  filterByTitle(windows, patterns) {
    return windows.filter(w => {
      const title = w.title.toLowerCase();
      return patterns.some(pattern => title.includes(pattern.toLowerCase()));
    });
  }

  // Filter windows by class name patterns
  filterByClassName(windows, patterns) {
    return windows.filter(w => {
      const className = w.className.toLowerCase();
      return patterns.some(pattern => className.includes(pattern.toLowerCase()));
    });
  }

  // Remove duplicate windows
  removeDuplicates(windows) {
    const seen = new Set();
    return windows.filter(w => {
      const key = `${w.pid}-${w.handle}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Select the best window from multiple candidates
  selectBestWindow(windows) {
    // Prioritize windows with certain characteristics
    let scored = windows.map(w => {
      let score = 0;
      
      // Prefer larger windows (likely the game window)
      score += (w.width * w.height) / 100000;
      
      // Prefer windows with "Slippi" in title
      if (w.title.toLowerCase().includes('slippi')) score += 10;
      if (w.title.toLowerCase().includes('faster melee')) score += 10;
      
      // Prefer windows with FPS/VPS indicators (game is running)
      if (w.title.includes('FPS:') || w.title.includes('VPS:')) score += 5;
      
      // Prefer wxWindowNR class (typical for Dolphin)
      if (w.className === 'wxWindowNR') score += 5;
      
      return { window: w, score };
    });

    scored.sort((a, b) => b.score - a.score);
    
    if (scored.length > 0) {
      logger.debug('Window scoring results', scored.map(s => ({
        title: s.window.title,
        score: s.score,
        size: `${s.window.width}x${s.window.height}`
      })));
      
      return scored[0].window;
    }
    
    return windows[0];
  }

  // Get detection statistics
  getStats() {
    return {
      detectedWindows: this.detectedWindows.length,
      targetWindow: this.targetWindow,
      lastDetectionTime: this.lastDetectionTime,
      detectionAttempts: this.detectionAttempts,
      allWindows: this.detectedWindows
    };
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = newConfig;
    logger.info('WindowDetector config updated', { config: newConfig.detection });
  }

  // Manual window selection
  selectWindowManually(windowHandle) {
    const window = this.detectedWindows.find(w => w.handle === windowHandle);
    if (window) {
      this.targetWindow = window;
      logger.info('Window manually selected', window);
      return true;
    }
    return false;
  }
}

module.exports = WindowDetector;
