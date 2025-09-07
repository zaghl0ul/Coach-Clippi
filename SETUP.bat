@echo off
title Slippi Coach Setup
color 0B

echo.
echo  ========================================
echo   SLIPPI COACH - FIRST TIME SETUP
echo  ========================================
echo.
echo  This will install everything you need to run Slippi Coach.
echo  Make sure you have an internet connection.
echo.
echo  Press any key to continue, or close this window to cancel...
pause >nul

echo.
echo  Checking system requirements...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  Node.js not found - downloading and installing...
    echo.
    echo  IMPORTANT: Node.js installer will open
    echo  Please follow the installer and then run this setup again
    echo.
    start https://nodejs.org/en/download/
    echo  After installing Node.js, run this SETUP.bat again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo  ✓ Node.js found: %NODE_VERSION%
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: npm not found (should come with Node.js)
    echo  Please reinstall Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo  ✓ npm found: %NPM_VERSION%
)

echo.
echo  System requirements met!
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo  ERROR: Cannot find package.json
    echo  Please make sure you're running this from the Slippi Coach folder
    echo.
    pause
    exit /b 1
)

echo  Installing backend dependencies...
echo  This may take several minutes...
echo.

call npm install
if errorlevel 1 (
    echo.
    echo  ERROR: Failed to install backend dependencies
    echo  Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo  ✓ Backend dependencies installed
echo.

echo  Installing frontend dependencies...
echo.

cd frontend
call npm install
if errorlevel 1 (
    echo.
    echo  ERROR: Failed to install frontend dependencies
    echo  Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)
cd ..

echo  ✓ Frontend dependencies installed
echo.

REM Check if .env file exists, create basic one if not
if not exist ".env" (
    echo  Creating basic configuration file...
    echo # Slippi Coach Configuration > .env
    echo # Add your AI API keys here >> .env
    echo OPENAI_API_KEY=your_openai_key_here >> .env
    echo ANTHROPIC_API_KEY=your_anthropic_key_here >> .env
    echo PORT=3000 >> .env
    echo  ✓ Configuration file created (.env)
    echo.
    echo  IMPORTANT: Edit the .env file to add your AI API keys
    echo  You'll need either OpenAI or Anthropic API key for commentary
)

echo.
echo  ========================================
echo   SETUP COMPLETE!
echo  ========================================
echo.
echo  Slippi Coach is now ready to use!
echo.
echo  NEXT STEPS:
echo  1. Edit .env file to add your AI API keys (if needed)
echo  2. Double-click "Launch Slippi Coach.bat" to start
echo  3. Make sure Slippi Dolphin is running
echo  4. Enjoy live AI commentary!
echo.
echo  TROUBLESHOOTING:
echo  - If you get errors, try running as Administrator
echo  - Make sure Windows Defender isn't blocking the files
echo  - Check that ports 3000 and 5173 aren't used by other apps
echo.
echo  Press any key to exit...
pause >nul

exit /b 0
