param([Parameter(Mandatory=$true)][int]$AppProcessId)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$screen = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
if (-not $screen) { throw 'A second monitor is required for visible tests.' }
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class TestWindow {
 [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr handle, IntPtr after, int x, int y, int width, int height, uint flags);
}
'@
for ($attempt = 0; $attempt -lt 100; $attempt++) {
 $appProcess = Get-Process -Id $AppProcessId -ErrorAction Stop
 $appProcess.Refresh()
 if ($appProcess.MainWindowHandle -ne [IntPtr]::Zero) {
  $area = $screen.WorkingArea
  if (-not [TestWindow]::SetWindowPos($appProcess.MainWindowHandle, [IntPtr]::Zero, $area.X + 20, $area.Y + 40, [Math]::Min(1040, $area.Width - 40), 1000, 0x0014)) { throw 'Cannot position test window.' }
  Write-Output 'Test window placed on the second monitor.'
  exit 0
 }
 Start-Sleep -Milliseconds 100
}
throw 'No test window appeared.'
