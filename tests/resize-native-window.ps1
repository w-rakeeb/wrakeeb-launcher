param([Parameter(Mandatory=$true)][int]$AppProcessId)
$ErrorActionPreference='Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class CaptureWindowSize {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window,int command);
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr window,IntPtr after,int x,int y,int width,int height,uint flags);
}
"@
$ownedProcess=Get-Process -Id $AppProcessId
$ownedProcess.Refresh()
$handle=$ownedProcess.MainWindowHandle
if($handle -eq [IntPtr]::Zero){throw 'The owned launcher window is unavailable.'}
[CaptureWindowSize]::ShowWindow($handle,9) | Out-Null
[CaptureWindowSize]::SetWindowPos($handle,[IntPtr]::Zero,-1296,80,1296,956,0x14) | Out-Null

