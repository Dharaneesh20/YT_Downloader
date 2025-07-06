@echo off
title YouTube Downloader - Quick Start
color 0C
cd /d "%~dp0"

echo.
echo =====================================================
echo        YouTube Downloader - Quick Start
echo =====================================================
echo.

:: Quick check for essential files
if not exist "server.js" (
    echo [ERROR] server.js not found. Please run Setup-and-Run.bat first
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [ERROR] Dependencies not installed. Please run Setup-and-Run.bat first
    pause
    exit /b 1
)

:: Kill any existing processes
echo [INFO] Preparing to start...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Start application
echo [INFO] Starting YouTube Downloader...
start /B node server.js

:: Wait and open browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo =====================================================
echo    YouTube Downloader is running!
echo    Visit: http://localhost:3000
echo =====================================================
echo.
echo Press any key to stop the server...
pause >nul

:: Cleanup
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Server stopped.
timeout /t 1 >nul
exit
