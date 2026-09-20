@echo off
setlocal
title SmartPOS System Uninstaller

echo ========================================================
echo             SMARTPOS UNINSTALLATION UTILITY
echo ========================================================
echo.
echo Are you sure you want to remove SmartPOS from this PC?
echo.
set /p CONFIRM="Type 'Y' to confirm uninstallation (Y/N): "

if /i "%CONFIRM%" NEQ "Y" (
    echo Uninstallation cancelled.
    pause
    exit /b 0
)

echo.
echo 1. Removing Desktop Shortcut...
set "SCRIPT_FILE=%temp%\remove_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT_FILE%"
echo Set fso = CreateObject("Scripting.FileSystemObject") >> "%SCRIPT_FILE%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\SmartPOS.lnk" >> "%SCRIPT_FILE%"
echo If fso.FileExists(sLinkFile) Then fso.DeleteFile(sLinkFile) >> "%SCRIPT_FILE%"
cscript /nologo "%SCRIPT_FILE%"
del "%SCRIPT_FILE%"

echo.
echo ========================================================
echo  [SUCCESS] Desktop Shortcut removed!
echo  To finish uninstallation, simply delete this 'Software' folder.
echo ========================================================
echo.
pause
