Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run "cmd /c cd /d """ & strPath & """ && node server.cjs", 0, False
