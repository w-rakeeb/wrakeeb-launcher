param([Parameter(Mandatory=$true)][int]$AppProcessId)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class OwnedFolderWindow {
 public delegate bool Callback(IntPtr window, IntPtr data);
 [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr data);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint processId);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window,StringBuilder text,int max);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
 [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr window,uint message,IntPtr wParam,IntPtr lParam);
 public static IntPtr Find(int expected) { IntPtr found=IntPtr.Zero; EnumWindows((window,data)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(pid==expected && IsWindowVisible(window)){var text=new StringBuilder(256);GetWindowText(window,text,256);if(text.ToString().StartsWith("Choose",StringComparison.OrdinalIgnoreCase)){found=window;return false;}}return true;},IntPtr.Zero);return found; }
}
'@
$dialog=$null
for($attempt=0;$attempt -lt 100;$attempt++) {
 $handle=[OwnedFolderWindow]::Find($AppProcessId)
 if($handle -ne [IntPtr]::Zero) { $dialog=[System.Windows.Automation.AutomationElement]::FromHandle($handle);break }
 Start-Sleep -Milliseconds 100
}
if(-not $dialog) { throw 'The owned folder dialog did not appear.' }
Start-Sleep -Milliseconds 500
if($dialog.Current.BoundingRectangle.X -ge 0) { throw 'Folder dialog did not open on monitor 2.' }
 [OwnedFolderWindow]::PostMessage($handle,0x0010,[IntPtr]::Zero,[IntPtr]::Zero) | Out-Null
 Write-Output 'Verified owned folder dialog on monitor 2 and cancelled its owned dialog.'
 exit 0
