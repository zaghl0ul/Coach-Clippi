# Direct test of window detection
Write-Host "Testing window detection..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Simple window enumeration
Write-Host "Test 1: Enumerating all windows using simple method" -ForegroundColor Cyan
Get-Process | Where-Object {$_.MainWindowTitle -ne ""} | Select-Object ProcessName, Id, MainWindowTitle | Format-Table

Write-Host ""
Write-Host "Test 2: Using Windows API directly" -ForegroundColor Cyan

Add-Type @"
    using System;
    using System.Text;
    using System.Runtime.InteropServices;
    using System.Diagnostics;
    
    public class TestWindowFinder {
      [DllImport("user32.dll")]
      private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
      
      [DllImport("user32.dll", CharSet = CharSet.Auto)]
      private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
      
      [DllImport("user32.dll")]
      private static extern bool IsWindowVisible(IntPtr hWnd);
      
      [DllImport("user32.dll")]
      private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
      
      private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
      
      public static void ListAllWindows() {
        int count = 0;
        EnumWindows((hWnd, lParam) => {
          if (IsWindowVisible(hWnd)) {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            
            StringBuilder title = new StringBuilder(256);
            GetWindowText(hWnd, title, 256);
            
            string titleStr = title.ToString();
            if (!string.IsNullOrEmpty(titleStr)) {
              count++;
              try {
                Process proc = Process.GetProcessById((int)pid);
                Console.WriteLine("[{0}] PID: {1} - Process: {2} - Title: {3}", 
                  count, pid, proc.ProcessName, titleStr);
              } catch {
                Console.WriteLine("[{0}] PID: {1} - Process: Unknown - Title: {2}", 
                  count, pid, titleStr);
              }
            }
          }
          return true;
        }, IntPtr.Zero);
        
        Console.WriteLine("\nTotal windows found: " + count);
      }
    }
"@

[TestWindowFinder]::ListAllWindows()

Write-Host ""
Write-Host "Test 3: Looking for Dolphin specifically" -ForegroundColor Cyan
$dolphinProcesses = Get-Process | Where-Object {$_.ProcessName -like "*Dolphin*" -or $_.ProcessName -like "*Slippi*"}
if ($dolphinProcesses) {
    Write-Host "Found Dolphin processes:" -ForegroundColor Green
    $dolphinProcesses | Format-Table ProcessName, Id, MainWindowTitle
} else {
    Write-Host "No Dolphin processes found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
