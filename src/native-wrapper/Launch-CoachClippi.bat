@echo off
echo Starting Coach Clippi Native Wrapper...
echo.

REM Check if executable exists
if not exist "build\bin\Release\CoachClippiWrapper.exe" (
    echo ERROR: CoachClippiWrapper.exe not found!
    echo Please build the application first using build-direct.bat
    pause
    exit /b 1
)

REM Check if overlay.dll exists
if not exist "build\bin\Release\overlay.dll" (
    echo WARNING: overlay.dll not found in Release directory
    echo Attempting to copy from build directory...
    if exist "..\..\build\overlay.dll" (
        copy "..\..\build\overlay.dll" "build\bin\Release\" >nul
        echo overlay.dll copied successfully
    ) else (
        echo ERROR: overlay.dll not found anywhere!
        echo The application may not work properly without it.
        pause
    )
)

echo.
echo ========================================
echo Launching Coach Clippi Native Wrapper
echo ========================================
echo.
echo Instructions:
echo 1. Make sure Slippi Dolphin is running first
echo 2. The application will automatically detect and embed the game window
echo 3. Coaching panels will appear around the embedded game
echo.
echo Starting application...

REM Launch the application
cd build\bin\Release
start CoachClippiWrapper.exe

echo.
echo Application launched! Check for the Coach Clippi window.
echo If you don't see it, check the console output for any errors.
echo.
pause
