@echo off
title Coach Clippi - Slippi Green Overlay Launcher
color 0A

echo.
echo ========================================================
echo    COACH CLIPPI - SLIPPI GREEN OVERLAY SYSTEM
echo ========================================================
echo.
echo    Wraps around your Slippi Dolphin window with
echo    beautiful green coaching overlays!
echo.
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Slippi Dolphin exists
echo [*] Looking for Slippi Dolphin...
tasklist /FI "IMAGENAME eq Slippi Dolphin.exe" 2>NUL | find /I /N "Slippi Dolphin.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [+] Slippi Dolphin is running!
) else (
    echo [!] Slippi Dolphin is not running. 
    echo [!] Please start Slippi Dolphin first, then run this launcher again.
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Starting Coach Clippi Overlay System...
echo.

:: Start the overlay manager
node src\overlay\launcher.js

pause
