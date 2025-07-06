@echo off
cd /d "%~dp0"

set "download_folder=downloads"
set "log_file=log.txt"

:: Create folder if it doesn't exist
if not exist "%download_folder%" mkdir "%download_folder%"

:: Check if yt-dlp.exe exists
if not exist "yt-dlp.exe" (
    echo [ERROR] yt-dlp.exe not found in current directory: %CD%
    echo [INFO] Please run Setup-and-Run.bat first to download yt-dlp.exe
    echo [INFO] Or download it manually from: https://github.com/yt-dlp/yt-dlp/releases
    exit /b 1
)

:: Test if yt-dlp.exe works
echo [INFO] Testing yt-dlp.exe...
yt-dlp.exe --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] yt-dlp.exe is corrupted or not working
    echo [INFO] Please run Setup-and-Run.bat to re-download yt-dlp.exe
    exit /b 1
)

:: Check if URL is provided as parameter
if "%~1"=="" (
    :: Interactive mode
    cls
    echo Enter the YouTube URL:
    set /p URL=

    cls
    echo Listing available formats...
    echo --------------------------------
    yt-dlp.exe -F "%URL%"
    echo --------------------------------
    echo.
    echo Copy the format codes (example: 401+251 for 8K video + audio)
    set /p format=Enter video+audio format code: 
) else (
    :: API mode - parameters provided
    set "URL=%~1"
    set "format=%~2"
    echo [info] Using URL: %URL%
    echo [info] Using format: %format%
)

echo [download] Starting download process...
echo Downloading with format %format%...

:: Use yt-dlp with better error handling
yt-dlp.exe -f "%format%" -P "%download_folder%" -o "%%(title)s.%%(ext)s" --merge-output-format mp4 --newline "%URL%" 2>&1

set "exit_code=%ERRORLEVEL%"

if %exit_code% EQU 0 (
    echo.
    echo [info] Download completed successfully
    echo Saved to "%download_folder%"
) else (
    echo [error] Download failed with error code %exit_code%
    echo [info] This could be due to:
    echo   - Invalid URL
    echo   - Network connectivity issues
    echo   - Unavailable video format
    echo   - Video is private or deleted
)

:: Log it
echo %date% %time% - Format %format% - %URL% - ExitCode: %exit_code% >> "%log_file%"

:: Only show this in interactive mode
if "%~1"=="" (
    echo.
    set /p more=Download another? (y/n): 
    if /i "%more%"=="y" start "" "%~f0"
)

exit /b %exit_code%
