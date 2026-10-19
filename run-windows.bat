@echo off
title Rawdons Profit and Loss - Launcher
echo ========================================================
echo   Rawdons Profit and Loss - Restaurant Financial System
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found on your system!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules is missing
if not exist "node_modules" (
    echo [INFO] First time run detected. Installing dependencies via npm...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install encountered an error.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting application server...
echo App will open automatically in your browser at http://localhost:3000
echo.
call npm run dev -- --open --port 3000
pause
