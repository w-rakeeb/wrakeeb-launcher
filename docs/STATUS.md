# Build status — 2 November 2026

## Current milestone: 0.3.0

A working curated package launcher: live GitHub release files, verified downloads, independent portable application/script installation, library launch and standalone operation. Ten catalog projects, precise descriptions, original images, four themes, five accent options, separate storage preferences, a desktop shortcut action and a current-user NSIS installer.

The installer targets Windows 10 22H2 x64 and Windows 11 x64, rejects pre-Windows-10 systems, handles the WebView2 bootstrapper, and requires no fixed username or D: drive. The portable edition remains supported. Windows 11 is verified locally; a separate Windows 10 PC has not been tested.

## Verified

- TypeScript/production frontend and optimized native/NSIS builds.
- Three catalog unit checks and eight browser checks, including layouts at 1440/900/768/390px.
- Sixteen Rust tests: state preservation, native executable launch, stable metadata validation, checksum corruption, target changes, update readiness/rollback, ZIP traversal/duplicate rejection, and real hidden CMD/BAT execution from paths with spaces. PowerShell invocation preserves the existing execution policy.
- Live GitHub demo download, corrupt-file rejection, chosen download/install roots, ZIP installation, launch and continued standalone use after launcher exit. Visible tests use monitor 2.
- Actual current-user NSIS installation into an isolated directory, fresh empty library, writable data, four themes/five accents, keyboard settings tabs and native maximize/restore.
- Actual public Dual Steam ZIP and demo CMD installation without running either. App settings/accounts/microphones/Steam state were not changed by those installations.
- Isolated installer removal removed its registration while preserving its library, independent app folders and the personal portable copy.
- Taste inspection at 1440/900/768px: zero failures and warnings. Screenshots reviewed, including dark/light settings.
- Recovered 0.1.0/0.1.1 recovery bundles published with explicit source completeness notes; 0.2.0 retained. New version tags and release assets are preserved.

## Boundaries

No claim of Windows 10 hardware validation, ARM64/32-bit validation, clean-PC dependency validation, Narrator/high-contrast/physical-DPI verification or measured superiority to other launchers. Native file/folder picker interaction is not automated. Windows binaries are unsigned.

One package operation is supported at a time. Pause/resume, a multi-app queue, managed uninstall/repair, automatic catalog-app updates and application-data migration are not implemented. Each installation creates a fresh version folder and switches its link; older folders/data remain. Source/installer-style/unsupported assets are direct downloads only. GitHub SHA-256 integrity checks are not publisher signatures.

The latest code is tested before publishing; final live launcher-update and personal-library preservation results are recorded in the delivery report. No personal library/profile or QA data is included in GitHub source or release ZIPs.
