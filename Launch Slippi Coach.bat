@echo off
title Slippi Coach Launcher
color 0A

echo.
echo  ========================================
echo   SLIPPI COACH - Live AI Commentary
echo  ========================================
echo.
echo  Starting up...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found!
    echo  Please run SETUP.bat first to install dependencies.
    echo.
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "package.json" (
    echo  ERROR: Please run this from the Slippi Coach folder
    echo  Make sure this .bat file is in the same folder as package.json
    echo.
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo  Installing dependencies for first time...
    echo  This may take a few minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo  ERROR: Failed to install dependencies
        echo  Please check your internet connection and try again
        echo.
        pause
        exit /b 1
    )
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules" (
    echo  Installing frontend dependencies...
    echo.
    cd frontend
    call npm install
    if errorlevel 1 (
        echo  ERROR: Failed to install frontend dependencies
        echo.
        pause
        exit /b 1
    )
    cd ..
)

echo  ✓ Dependencies ready
echo.

REM Kill any existing processes on our ports
echo  Checking for existing processes...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo  Stopping existing backend process...
    taskkill /f /pid %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo  Stopping existing frontend process...
    taskkill /f /pid %%a >nul 2>&1
)

echo  ✓ Ports cleared
echo.

REM Start backend server
echo  Starting backend server...
start "Slippi Coach Backend" /min cmd /c "npm start"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo  ✓ Backend started
echo.

REM Start frontend server
echo  Starting frontend...
cd frontend
start "Slippi Coach Frontend" /min cmd /c "npm run dev"
cd ..

REM Wait for frontend to be ready
echo  Waiting for frontend to load...
timeout /t 8 /nobreak >nul

echo  ✓ Frontend ready
echo.

REM Open browser to Game Viewer
echo  Opening Game Viewer...
start http://localhost:5173/game-viewer

echo.
echo  ========================================
echo   SLIPPI COACH IS NOW RUNNING!
echo  ========================================
echo.
echo  Your browser should open automatically.
echo  If not, go to: http://localhost:5173/game-viewer
echo.
echo  USAGE:
echo  1. Make sure Slippi Dolphin is running
echo  2. Click 'Settings' in the Game Viewer
echo  3. Click 'Scan for Game Windows'
echo  4. Select your Slippi window
echo  5. Start playing and get live commentary!
echo.
echo  Press any key to close this launcher window
echo  (Slippi Coach will keep running in background)
echo.
pause >nul

REM Optional: Ask if user wants to stop the servers
echo.
echo  Do you want to stop Slippi Coach? (Y/N)
set /p choice=
if /i "%choice%"=="Y" (
    echo  Stopping Slippi Coach...
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
    for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
    echo  ✓ Slippi Coach stopped
)

exit /b 0
