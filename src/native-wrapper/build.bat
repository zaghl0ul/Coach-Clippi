@echo off
echo Building Coach Clippi Wrapper...
if not exist build mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
echo.
echo Build complete! Executable is in build/bin/Release/
pause
