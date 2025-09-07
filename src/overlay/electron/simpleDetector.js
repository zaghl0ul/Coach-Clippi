// Coach Clippi - Simple Window Detection
const { exec } = require('child_process');
const logger = require('./logger');

class SimpleDetector {
  async detectDolphin() {
    return new Promise((resolve) => {
      // Use simple PowerShell command that we know works
      const script = `
        Get-Process | Where-Object {
          $_.ProcessName -like "*Dolphin*" -and $_.MainWindowTitle -ne ""
        } | Select-Object -First 1 | ForEach-Object {
          Write-Output "$($_.Id)|$($_.ProcessName)|$($_.MainWindowTitle)"
        }
      `;
      
      exec(`powershell -Command "${script}"`, (error, stdout, stderr) => {
        if (error) {
          logger.error('Simple detection failed', error);
          resolve(null);
          return;
        }
        
        const output = stdout.trim();
        if (output) {
          const [pid, name, title] = output.split('|');
          const result = {
            pid: parseInt(pid),
            processName: name,
            title: title,
            bounds: { x: 100, y: 100, width: 800, height: 600 }, // Default bounds
            className: 'Dolphin'
          };
          logger.info('Simple detection found Dolphin', result);
          resolve(result);
        } else {
          resolve(null);
        }
      });
    });
  }
}

module.exports = SimpleDetector;
