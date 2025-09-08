@echo off
echo Building Coach Clippi Wrapper directly with Visual Studio...
echo.

REM Try to find Visual Studio Developer Command Prompt
set "VSCMD_PATH="
for /f "usebackq tokens=*" %%i in (`where /r "C:\Program Files" vswhere.exe 2^>nul`) do (
    for /f "usebackq tokens=*" %%j in (`"%%i" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do (
        set "VSCMD_PATH=%%j\Common7\Tools\VsDevCmd.bat"
    )
)

if not exist "%VSCMD_PATH%" (
    echo ERROR: Visual Studio Developer Command Prompt not found.
    echo Please open "Developer Command Prompt for VS" and run this script from there.
    echo Or try opening the solution file directly in Visual Studio:
    echo   build\CoachClippiWrapper.sln
    pause
    exit /b 1
)

echo Setting up Visual Studio environment...
call "%VSCMD_PATH%" -arch=x64 >nul 2>&1

echo Building project...
cd build
msbuild CoachClippiWrapper.sln /p:Configuration=Release /p:Platform=x64 /m

if errorlevel 1 (
    echo.
    echo ERROR: Build failed. You can try:
    echo 1. Open build\CoachClippiWrapper.sln in Visual Studio and build manually
    echo 2. Use "Developer Command Prompt for VS" and run: msbuild CoachClippiWrapper.sln /p:Configuration=Release
    pause
    exit /b 1
)

echo.
echo Copying overlay.dll...
if exist "..\..\..\build\overlay.dll" (
    copy "..\..\..\build\overlay.dll" "bin\Release\" >nul 2>&1
    echo overlay.dll copied successfully
) else (
    echo WARNING: overlay.dll not found at ..\..\..\build\overlay.dll
    echo You'll need to copy it manually to bin\Release\
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Executable location:
echo   %CD%\bin\Release\CoachClippiWrapper.exe
echo.
echo To run the application:
echo   1. Start Slippi Dolphin first
echo   2. Run the executable above
echo   3. The app will automatically detect and embed the game window
echo.
pause
