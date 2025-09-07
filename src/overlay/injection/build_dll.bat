@echo off
echo Building Coach Clippi Overlay DLL with Visual Rendering...

REM Set up Visual Studio environment
call "C:\Program Files (x86)\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

REM Change to the injection directory
cd /d "%~dp0"

REM Compile the DLL with GDI+ support
cl /LD /MD /O2 /EHsc /Fe:overlay.dll overlay_simple.cpp user32.lib kernel32.lib gdi32.lib gdiplus.lib ole32.lib

if %ERRORLEVEL% EQU 0 (
    echo Build successful! overlay.dll created.
    copy overlay.dll ..\..\..\build\overlay.dll
    echo DLL copied to build directory.
) else (
    echo Build failed!
)

pause
