Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

strPath = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = Chr(34) & strPath & "\SmartPOS.bat" & Chr(34)

' Run SmartPOS.bat invisibly (0 = hide window)
WshShell.Run batPath, 0, False
