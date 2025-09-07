@echo off
echo ========================================================
echo    COACH CLIPPI - GPU-FIXED OVERLAY TEST
echo ========================================================
echo.
echo Testing the GPU-fixed Electron overlay...
echo.
echo CHANGES MADE:
echo [✓] Removed transparency (solid background)
echo [✓] Disabled hardware acceleration
echo [✓] Added GPU stability flags
echo [✓] Created coaching panel interface
echo [✓] Added error recovery mechanisms
echo.
echo Starting overlay...
echo.

cd src\overlay\electron
call npm start -- --dev

pause
