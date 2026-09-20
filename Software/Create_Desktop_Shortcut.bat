@echo off
setlocal
title SmartPOS Setup ^& Shortcut Creator

set "TARGET_VBS=%~dp0SmartPOS.vbs"
set "SCRIPT_FILE=%temp%\createshortcut.vbs"

echo ========================================================
echo          SMARTPOS DESKTOP SETUP ^& SHORTCUT
echo ========================================================
echo.
echo Creating SmartPOS Shortcut on your Desktop...

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SCRIPT_FILE%"
echo sLinkFile = oWS.SpecialFolders("Desktop") ^& "\SmartPOS.lnk" >> "%SCRIPT_FILE%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SCRIPT_FILE%"
echo oLink.TargetPath = "%TARGET_VBS%" >> "%SCRIPT_FILE%"
echo oLink.WorkingDirectory = "%~dp0" >> "%SCRIPT_FILE%"
echo oLink.Description = "SmartPOS - Advanced POS System" >> "%SCRIPT_FILE%"
echo oLink.Save >> "%SCRIPT_FILE%"

cscript /nologo "%SCRIPT_FILE%"
del "%SCRIPT_FILE%"

echo.
echo ========================================================
echo  [SUCCESS] SmartPOS Shortcut has been created on your Desktop!
echo  (ඩෙස්ක්ටොප් එක මත SmartPOS Icon එක සාර්ථකව සාදන ලදී)
echo ========================================================
echo.
echo Launching SmartPOS now...
start "" "%TARGET_VBS%"
timeout /t 3 >nul
exit
