param([Parameter(Mandatory=$true)][int]$AppProcessId,[Parameter(Mandatory=$true)][string]$DialogTitle,[Parameter(Mandatory=$true)][string]$FilePath,[ValidateSet('Save','Open')][string]$Action='Open')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class OwnedPreferenceDialog {
 public delegate bool Callback(IntPtr window, IntPtr data);
 [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr data);
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window,out uint processId);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window,StringBuilder text,int max);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr window);
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left,Top,Right,Bottom; }
 [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent,Callback callback,IntPtr data);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr window,StringBuilder text,int max);
 [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr window,int index);
 [DllImport("user32.dll")] public static extern bool IsWindowEnabled(IntPtr window);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr window,out Rect rect);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr window,uint message,IntPtr wParam,string text);
 public static IntPtr FilenameEdit(IntPtr parent) { IntPtr found=IntPtr.Zero; int top=int.MinValue; EnumChildWindows(parent,(window,data)=>{var name=new StringBuilder(128);GetClassName(window,name,128);Rect rect; if(name.ToString()=="Edit" && IsWindowEnabled(window) && (GetWindowLong(window,-16)&0x800)==0 && GetWindowRect(window,out rect) && rect.Top>top){top=rect.Top;found=window;}return true;},IntPtr.Zero);return found; }
 public static bool Submit(IntPtr parent,string action) { IntPtr found=IntPtr.Zero; EnumChildWindows(parent,(window,data)=>{var name=new StringBuilder(128);var text=new StringBuilder(128);GetClassName(window,name,128);GetWindowText(window,text,128);if(name.ToString()=="Button" && text.ToString().Replace("&","").Equals(action,StringComparison.OrdinalIgnoreCase)){found=window;return false;}return true;},IntPtr.Zero);if(found==IntPtr.Zero)return false;SendMessage(found,0x00F5,IntPtr.Zero,null);return true; }
 public static IntPtr Find(int expected,string title) { IntPtr found=IntPtr.Zero; EnumWindows((window,data)=>{uint pid;GetWindowThreadProcessId(window,out pid);if(pid==expected && IsWindowVisible(window)){var text=new StringBuilder(256);GetWindowText(window,text,256);if(text.ToString().StartsWith(title,StringComparison.OrdinalIgnoreCase)){found=window;return false;}}return true;},IntPtr.Zero);return found; }
}
'@
$dialog=$null
for($attempt=0;$attempt -lt 100;$attempt++) {
 $handle=[OwnedPreferenceDialog]::Find($AppProcessId,$DialogTitle)
 if($handle -ne [IntPtr]::Zero){$dialog=[System.Windows.Automation.AutomationElement]::FromHandle($handle);break}
 Start-Sleep -Milliseconds 100
}
if(-not $dialog){throw 'The owned file dialog did not appear.'}
$editHandle=[OwnedPreferenceDialog]::FilenameEdit($handle)
if($editHandle -eq [IntPtr]::Zero){throw 'The owned dialog filename edit is unavailable.'}
[OwnedPreferenceDialog]::SendMessage($editHandle,0x000C,[IntPtr]::Zero,$FilePath) | Out-Null
if(-not [OwnedPreferenceDialog]::Submit($handle,$Action)){throw 'The owned file dialog action is unavailable.'}
Write-Output 'Completed the owned launcher file dialog.'
