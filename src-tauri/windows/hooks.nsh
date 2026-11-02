!include "WinVer.nsh"
!macro NSIS_HOOK_PREINSTALL
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "Wrakeeb Launcher requires Windows 10 or Windows 11 (64-bit)."
    Abort
  ${EndIf}
!macroend
