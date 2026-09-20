@echo off
setlocal enabledelayedexpansion
title SmartPOS System Launcher

:: Get full path to index.html
set "APP_DIR=%~dp0app"
set "APP_HTML=%APP_DIR%\index.html"
set "DATA_DIR=%~dp0data"

:: Check if app directory exists
if not exist "%APP_HTML%" (
    echo [ERROR] SmartPOS application files not found!
    echo Please make sure the 'app' folder exists inside this directory.
    pause
    exit /b 1
)

:: Create dedicated profile directory so POS offline data is safe & isolated
if not exist "%DATA_DIR%" (
    mkdir "%DATA_DIR%"
)

:: Convert path to file URL
set "FILE_URL=file:///%APP_HTML:\=/%"

:: 1. Search for Microsoft Edge (built-in on all Windows 10/11)
set "EDGE_EXE="
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
    set "EDGE_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
)

:: 2. Search for Google Chrome
set "CHROME_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
)

:: Launch in native Standalone App Window mode
if defined EDGE_EXE (
    start "" "!EDGE_EXE!" --app="!FILE_URL!" --user-data-dir="!DATA_DIR!" --allow-file-access-from-files --start-maximized --disable-features=Translate
    exit /b 0
) else if defined CHROME_EXE (
    start "" "!CHROME_EXE!" --app="!FILE_URL!" --user-data-dir="!DATA_DIR!" --allow-file-access-from-files --start-maximized --disable-features=Translate
    exit /b 0
) else (
    :: Fallback to default browser
    start "" "!APP_HTML!"
    exit /b 0
)
