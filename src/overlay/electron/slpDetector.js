// Coach Clippi - SLP File Detection for Dolphin Window Discovery
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const logger = require('./logger');

class SlpDetector {
  constructor() {
    this.currentSlpFile = null;
    this.dolphinPid = null;
    this.lastCheck = null;
    
    // Common Slippi directories
    this.slpDirectories = [
      path.join(os.homedir(), 'Documents', 'Slippi'),
      path.join(os.homedir(), 'Slippi'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Slippi Launcher', 'netplay'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'Slippi Desktop App', 'Slippi'),
      'C:\\Slippi',
      'D:\\Slippi',
    ];
    
    logger.info('SlpDetector initialized', { directories: this.slpDirectories });
  }

  // Find the most recently modified SLP file
  async findRecentSlpFile() {
    let mostRecentFile = null;
    let mostRecentTime = 0;
    
    for (const dir of this.slpDirectories) {
      try {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (!file.endsWith('.slp')) continue;
          
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          
          // Only consider files modified in the last 5 minutes
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          if (stats.mtimeMs > fiveMinutesAgo && stats.mtimeMs > mostRecentTime) {
            mostRecentTime = stats.mtimeMs;
            mostRecentFile = filePath;
          }
        }
      } catch (error) {
        logger.debug(`Error scanning directory ${dir}:`, error.message);
      }
    }
    
    if (mostRecentFile) {
      logger.info('Found recent SLP file', { 
        file: mostRecentFile,
        modified: new Date(mostRecentTime).toISOString()
      });
    }
    
    return mostRecentFile;
  }

  // Find which process has the SLP file open using Windows Handle utility
  async findProcessWithFileOpen(filePath) {
    return new Promise((resolve) => {
      // Use PowerShell with WMI to find process with file handle
      const script = `
        $filePath = "${filePath.replace(/\\/g, '\\\\')}"
        
        # Try using handle.exe if available (more reliable)
        $handlePath = "$env:TEMP\\handle.exe"
        $handleUrl = "https://live.sysinternals.com/handle.exe"
        
        try {
          if (-not (Test-Path $handlePath)) {
            # Download handle.exe if not present
            Invoke-WebRequest -Uri $handleUrl -OutFile $handlePath -ErrorAction SilentlyContinue
          }
          
          if (Test-Path $handlePath) {
            $output = & $handlePath -a -p Dolphin.exe 2>$null | Out-String
            $lines = $output -split '\\r?\\n'
            foreach ($line in $lines) {
              if ($line -match 'pid: (\\d+)' -and $line -like "*$($filePath)*") {
                return $matches[1]
              }
            }
          }
        } catch {}
        
        # Fallback: Use WMI (less reliable but doesn't need external tools)
        try {
          Get-Process | Where-Object {
            $_.ProcessName -like "*Dolphin*" -or $_.ProcessName -like "*Slippi*"
          } | ForEach-Object {
            $processId = $_.Id
            try {
              $handles = (Get-WmiObject -Query "SELECT * FROM Win32_Process WHERE ProcessId = $processId").GetOwner()
              # Check if process has recent CPU activity (indicates it's active)
              if ($_.CPU -gt 0) {
                Write-Output $processId
                return
              }
            } catch {}
          }
        } catch {}
        
        # Last resort: Find any Dolphin process
        $dolphinProcess = Get-Process | Where-Object { 
          $_.ProcessName -like "*Dolphin*" -and $_.MainWindowTitle -ne ""
        } | Select-Object -First 1
        
        if ($dolphinProcess) {
          Write-Output $dolphinProcess.Id
        }
      `;
      
      exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
        if (error) {
          logger.error('Error finding process with file open', error);
          resolve(null);
          return;
        }
        
        const pid = parseInt(stdout.trim());
        if (pid && !isNaN(pid)) {
          logger.info('Found process with SLP file open', { pid, file: filePath });
          resolve(pid);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Alternative method: Find Dolphin process by checking file handles
  async findDolphinByHandles() {
    return new Promise((resolve) => {
      const script = `
        # Get all Dolphin/Slippi processes
        $processes = Get-Process | Where-Object {
          $_.ProcessName -like "*Dolphin*" -or 
          $_.ProcessName -like "*Slippi*" -or
          $_.MainWindowTitle -like "*Dolphin*" -or
          $_.MainWindowTitle -like "*Slippi*"
        }
        
        foreach ($proc in $processes) {
          # Check if process has significant CPU/memory usage (active game)
          if ($proc.WorkingSet64 -gt 100MB -or $proc.CPU -gt 0) {
            Write-Output "$($proc.Id)|$($proc.ProcessName)|$($proc.MainWindowTitle)"
            break
          }
        }
      `;
      
      exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
        if (error) {
          logger.error('Error finding Dolphin by handles', error);
          resolve(null);
          return;
        }
        
        const output = stdout.trim();
        if (output) {
          const [pid, name, title] = output.split('|');
          logger.info('Found Dolphin process', { pid, name, title });
          resolve(parseInt(pid));
        } else {
          resolve(null);
        }
      });
    });
  }

  // Main detection method
  async detectDolphinPid() {
    try {
      // Method 1: Find recent SLP file and check who has it open
      const slpFile = await this.findRecentSlpFile();
      if (slpFile) {
        this.currentSlpFile = slpFile;
        const pid = await this.findProcessWithFileOpen(slpFile);
        if (pid) {
          this.dolphinPid = pid;
          this.lastCheck = Date.now();
          return pid;
        }
      }
      
      // Method 2: Find Dolphin by process characteristics
      const pid = await this.findDolphinByHandles();
      if (pid) {
        this.dolphinPid = pid;
        this.lastCheck = Date.now();
        return pid;
      }
      
      logger.warn('No Dolphin process detected via SLP files');
      return null;
      
    } catch (error) {
      logger.error('Error in SLP detection', error);
      return null;
    }
  }

  // Get cached PID if recent
  getCachedPid() {
    // Cache is valid for 30 seconds
    if (this.dolphinPid && this.lastCheck && (Date.now() - this.lastCheck < 30000)) {
      return this.dolphinPid;
    }
    return null;
  }

  // Add custom SLP directory
  addDirectory(dir) {
    if (!this.slpDirectories.includes(dir)) {
      this.slpDirectories.push(dir);
      logger.info('Added SLP directory', { directory: dir });
    }
  }

  // Get detection info
  getInfo() {
    return {
      currentSlpFile: this.currentSlpFile,
      dolphinPid: this.dolphinPid,
      lastCheck: this.lastCheck,
      directories: this.slpDirectories
    };
  }
}

module.exports = SlpDetector;
