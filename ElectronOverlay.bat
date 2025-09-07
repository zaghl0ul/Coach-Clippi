@echo off
title Coach Clippi - Electron Overlay System
color 0A

echo.
echo ========================================================
echo    COACH CLIPPI - ELECTRON OVERLAY SYSTEM
echo ========================================================
echo.
echo    Modern transparent overlay for Slippi Dolphin
echo    with beautiful Slippi green coaching messages!
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

:: Check if Slippi Dolphin is running
echo [*] Checking for Slippi Dolphin...
powershell -Command "Get-Process | Where-Object {$_.ProcessName -like '*Dolphin*' -or $_.MainWindowTitle -like '*Slippi*'}" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Warning: Slippi Dolphin doesn't appear to be running
    echo [!] Please start Slippi Dolphin for the overlay to track it
    echo.
)

:: Navigate to electron directory
cd /d "%~dp0src\overlay\electron"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [*] First time setup - Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [+] Dependencies installed successfully!
    echo.
)

:: Start the overlay
echo [*] Starting Electron Overlay...
echo.
echo Press Ctrl+C to stop the overlay
echo.

:: Run electron with optional dev flag
if "%1"=="--dev" (
    npm start -- --dev
) else (
    npm start
)
