@echo off
title Pelican Command Center - Startup
echo.
echo  ========================================
echo   🦜 Pelican Command Center
echo  ========================================
echo.
echo  Starting application...
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo  ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Start the application
echo  🚀 Launching Pelican...
npm start

:: Handle exit
if errorlevel 1 (
    echo.
    echo  ⚠️  Application exited with errors
    echo     This is usually normal when closing the app
) else (
    echo.
    echo  ✅ Application closed normally
)

echo.
echo  Press any key to exit...
pause >nul