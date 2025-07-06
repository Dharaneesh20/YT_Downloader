@echo off
title YouTube Downloader - Update Dependencies
color 0B
cd /d "%~dp0"

echo.
echo =====================================================
echo      YouTube Downloader - Update Dependencies
echo =====================================================
echo.

:: Update yt-dlp
echo [1/3] Updating yt-dlp...
if exist "yt-dlp.exe" (
    echo [INFO] Current yt-dlp version:
    yt-dlp.exe --version
    echo.
    echo [INFO] Updating to latest version...
    yt-dlp.exe -U
    if %ERRORLEVEL% EQU 0 (
        echo [OK] yt-dlp updated successfully
    ) else (
        echo [INFO] yt-dlp is already up to date or update failed
    )
) else (
    echo [INFO] yt-dlp.exe not found. Downloading...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'yt-dlp.exe'}"
    if exist "yt-dlp.exe" (
        echo [OK] yt-dlp.exe downloaded successfully
    ) else (
        echo [ERROR] Failed to download yt-dlp.exe
    )
)

echo.

:: Update Node.js dependencies
echo [2/3] Updating Node.js dependencies...
if exist "package.json" (
    echo [INFO] Checking for dependency updates...
    call npm update
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Dependencies updated successfully
    ) else (
        echo [WARNING] Some dependencies may not have updated
    )
) else (
    echo [WARNING] package.json not found
)

echo.

:: Check ffmpeg
echo [3/3] Checking ffmpeg...
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if not exist "ffmpeg.exe" (
        echo [INFO] ffmpeg not found
        echo [INFO] For video merging functionality, please:
        echo 1. Download ffmpeg from: https://ffmpeg.org/download.html
        echo 2. Add to PATH or place ffmpeg.exe in this folder
    ) else (
        echo [OK] ffmpeg.exe found in current directory
    )
) else (
    echo [OK] ffmpeg found and working
)

echo.
echo =====================================================
echo              Update Complete!
echo =====================================================
echo.
echo Press any key to exit...
pause >nul
exit
