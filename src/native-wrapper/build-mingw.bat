@echo off
echo Building Coach Clippi Wrapper with MinGW...
echo.

REM Check if g++ is available (MinGW)
g++ --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: MinGW g++ not found.
    echo.
    echo Please install MinGW-w64 from: https://www.mingw-w64.org/downloads/
    echo Or use MSYS2: https://www.msys2.org/
    echo.
    echo After installation, add MinGW bin directory to your PATH
    echo Example: C:\msys64\mingw64\bin
    pause
    exit /b 1
)

echo Compiling with MinGW g++...
echo.

REM Create output directory
if not exist bin mkdir bin

REM Compile the application
g++ -std=c++17 -O2 -Wall -Wextra ^
    -I. ^
    main.cpp ^
    WindowManager.cpp ^
    GameDataInterface.cpp ^
    CoachingInterface.cpp ^
    -o bin/CoachClippiWrapper.exe ^
    -luser32 -lgdi32 -lkernel32 -lcomctl32 -lole32 -loleaut32 -luuid -ladvapi32 -lshell32 -lpsapi ^
    -mwindows

if errorlevel 1 (
    echo.
    echo ERROR: Compilation failed. Check the output above for errors.
    pause
    exit /b 1
)

REM Copy overlay.dll if it exists
if exist "..\..\build\overlay.dll" (
    echo Copying overlay.dll...
    copy "..\..\build\overlay.dll" "bin\" >nul
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Executable location:
echo   %CD%\bin\CoachClippiWrapper.exe
echo.
echo To run the application:
echo   1. Start Slippi Dolphin first
echo   2. Run the executable above
echo   3. The app will automatically detect and embed the game window
echo.
pause
