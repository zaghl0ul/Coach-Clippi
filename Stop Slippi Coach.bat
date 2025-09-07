@echo off
title Stop Slippi Coach
color 0C

echo.
echo  ========================================
echo   STOPPING SLIPPI COACH
echo  ========================================
echo.

echo  Stopping backend server (port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo  ✓ Backend stopped
)

echo  Stopping frontend server (port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
    echo  ✓ Frontend stopped
)

echo.
echo  Slippi Coach has been stopped.
echo  You can now close this window.
echo.
timeout /t 3 /nobreak >nul

exit /b 0
