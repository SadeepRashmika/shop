@echo off
setlocal
title SmartPOS Shortcut Creator

set "TARGET_VBS=%~dp0SmartPOS.vbs"
set "ICON_FILE=%~dp0app\favicon.ico"
set "SCRIPT_FILE=%temp%\createshortcut.vbs"

echo Creating Desktop Shortcut for SmartPOS...

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT_FILE%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\SmartPOS.lnk" >> "%SCRIPT_FILE%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SCRIPT_FILE%"
echo oLink.TargetPath = "%TARGET_VBS%" >> "%SCRIPT_FILE%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SCRIPT_FILE%"
echo oLink.Description = "SmartPOS System" >> "%SCRIPT_FILE%"
echo oLink.Save >> "%SCRIPT_FILE%"

cscript /nologo "%SCRIPT_FILE%"
del "%SCRIPT_FILE%"

echo.
echo ========================================================
echo  [SUCCESS] SmartPOS Shortcut has been created on your Desktop!
echo ========================================================
echo.
pause
