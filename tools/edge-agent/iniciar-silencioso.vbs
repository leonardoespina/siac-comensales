Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run "cmd /c cd /d """ & strPath & """ && npx tsx edgeServer.ts", 0, False
