' Launches the fusion calculator with no console window.
' Starts the local server if it is not already running, then opens the browser.
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

repoRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = repoRoot
shell.Run "node """ & repoRoot & "\local\serve.js""", 0, False
