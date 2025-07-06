@echo off
title YouTube Downloader - Setup and Launch
color 0A
cd /d "%~dp0"

echo.
echo =====================================================
echo          YouTube Downloader - Auto Setup
echo =====================================================
echo.

:: Check if Node.js is installed
echo [1/7] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo After installation, run this script again.
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
)

:: Check if yt-dlp exists and works
echo [2/7] Checking yt-dlp...
if not exist "yt-dlp.exe" (
    echo [INFO] yt-dlp.exe not found. Downloading latest version...
    goto :download_ytdlp
) else (
    echo [INFO] Testing existing yt-dlp.exe...
    yt-dlp.exe --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARNING] Existing yt-dlp.exe is corrupted. Re-downloading...
        del "yt-dlp.exe" >nul 2>&1
        goto :download_ytdlp
    ) else (
        echo [OK] yt-dlp.exe found and working
        goto :check_ffmpeg
    )
)

:download_ytdlp
echo Downloading yt-dlp.exe...
powershell -Command "try { Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'yt-dlp.exe' -UseBasicParsing } catch { exit 1 }"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to download yt-dlp.exe using PowerShell
    echo [INFO] Trying alternative method...
    curl -L -o yt-dlp.exe "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to download yt-dlp.exe
        echo Please download manually from: https://github.com/yt-dlp/yt-dlp/releases
        echo Save it as 'yt-dlp.exe' in this folder
        pause
        exit /b 1
    )
)

if exist "yt-dlp.exe" (
    echo [INFO] Testing downloaded yt-dlp.exe...
    yt-dlp.exe --version >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Downloaded yt-dlp.exe is not working properly
        echo Please download manually from: https://github.com/yt-dlp/yt-dlp/releases
        pause
        exit /b 1
    ) else (
        echo [OK] yt-dlp.exe downloaded and working
    )
) else (
    echo [ERROR] yt-dlp.exe download failed
    pause
    exit /b 1
)

:check_ffmpeg
:: Check if ffmpeg exists
echo [3/7] Checking ffmpeg...
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if not exist "ffmpeg.exe" (
        echo [WARNING] ffmpeg not found in PATH or current directory
        echo [INFO] Video merging may not work properly
        echo.
        echo To fix this:
        echo 1. Download ffmpeg from: https://ffmpeg.org/download.html
        echo 2. Either add it to PATH or place ffmpeg.exe in this folder
        echo.
        echo [INFO] Continuing without ffmpeg...
    ) else (
        echo [OK] ffmpeg.exe found in current directory
    )
) else (
    echo [OK] ffmpeg found in PATH
)

:: Check if package.json exists and install dependencies
echo [4/7] Setting up Node.js dependencies...
if not exist "package.json" (
    echo [INFO] Creating package.json...
    (
        echo {
        echo   "name": "youtube-downloader",
        echo   "version": "1.0.0",
        echo   "description": "YouTube Downloader with yt-dlp and ffmpeg",
        echo   "main": "server.js",
        echo   "scripts": {
        echo     "start": "node server.js",
        echo     "dev": "node server.js"
        echo   },
        echo   "dependencies": {
        echo     "express": "^4.18.2"
        echo   },
        echo   "keywords": ["youtube", "downloader", "yt-dlp"],
        echo   "author": "YouTube Downloader App",
        echo   "license": "MIT"
        echo }
    ) > package.json
    echo [OK] package.json created
)

if not exist "node_modules" (
    echo [INFO] Installing Node.js dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        echo Please run: npm install
        pause
        exit /b 1
    ) else (
        echo [OK] Dependencies installed successfully
    )
) else (
    echo [OK] Dependencies already installed
)

:: Create downloads folder
echo [5/7] Creating downloads folder...
if not exist "downloads" mkdir "downloads"
echo [OK] Downloads folder ready

:: Check if all required files exist
echo [6/7] Verifying application files...
set "missing_files="

if not exist "index.html" set "missing_files=%missing_files% index.html"
if not exist "styles.css" set "missing_files=%missing_files% styles.css"
if not exist "script.js" set "missing_files=%missing_files% script.js"
if not exist "server.js" set "missing_files=%missing_files% server.js"

if not "%missing_files%"=="" (
    echo [ERROR] Missing required files:%missing_files%
    echo Please ensure all application files are present
    pause
    exit /b 1
)

echo [OK] All application files found

:: Final verification of yt-dlp
echo [7/7] Final verification...
echo [INFO] Testing yt-dlp with a simple command...
yt-dlp.exe --help >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] yt-dlp.exe is not responding properly
    echo [INFO] Current directory: %CD%
    echo [INFO] yt-dlp.exe exists: 
    if exist "yt-dlp.exe" (echo YES) else (echo NO)
    dir yt-dlp.exe 2>nul
    pause
    exit /b 1
) else (
    echo [OK] yt-dlp.exe verified working
)

echo.
echo =====================================================
echo           Setup Complete! Starting Application...
echo =====================================================
echo.

:: Kill any existing Node.js processes on port 3000
echo [INFO] Checking for existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo [INFO] Killing existing process %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: Start the application
echo [INFO] Starting YouTube Downloader...
echo [INFO] Server will start on http://localhost:3000
echo [INFO] Browser will open automatically...
echo.
echo Press Ctrl+C to stop the server
echo.

:: Start server and open browser
start /B node server.js

:: Wait a moment for server to start
timeout /t 3 /nobreak >nul

:: Open browser
start "" "http://localhost:3000"

echo.
echo =====================================================
echo    YouTube Downloader is now running!
echo    Browser should open automatically
echo    If not, visit: http://localhost:3000
echo =====================================================
echo.
echo Press any key to stop the server and exit...
pause >nul

:: Clean shutdown
echo.
echo [INFO] Shutting down server...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [INFO] Server stopped
echo Thank you for using YouTube Downloader!
timeout /t 2 >nul
exit
