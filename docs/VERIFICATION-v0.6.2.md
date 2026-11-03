# Wrakeeb Launcher 0.6.2 — verification

Implemented 3–4 November 2026. This is one local app with shared Original/Claude designs, canonical identity and existing data paths. Source history is preserved on GitHub; this update does not publish a new binary release.

## Changes

- App details expose Remove from library, receipt-validated Recycle Bin uninstall, and Windows Installed apps for external registered installations. Removing a link preserves files.
- Close application requests a normal close for desktop windows belonging to retained process handles from the current launcher session. It does not force-terminate. Windows allows an app to cancel closing or present save handling: [WM_CLOSE reference](https://learn.microsoft.com/en-us/windows/win32/winmsg/wm-close).
- Tracked running apps block managed uninstall even after their library link is removed. The tray retains their display name and Close action after unlinking.
- Hamburger → Navigation holds Collapse/Expand sidebar in both designs; the separate rail row is removed.
- Tray right-click is wired to a lazy native, monitor-aware quick-access webview: library, discovery, downloads, recent apps, tracked app Close, settings, update check, launcher folder and Exit. Escape/blur dismiss it. A native Open/Exit menu is retained as a creation-failure fallback.
- Feedback uses independent red/green/blue semantic colors for error/success/info, with theme-aware popup surfaces and disabled destructive controls.

## Checks passed

- TypeScript/Vite production build; optimized Windows x64 executable and NSIS installer.
- 8 catalog/Vitest, 24 Rust and 20 browser tests: **52 automated tests**. Coverage includes both interface designs, sidebar menu controls, visible management actions, close-error feedback, five tray themes, existing preference/import/export/settings flows, four browser widths, package validation and launcher rollback.
- Native debug and final embedded production flows used isolated profiles and windows on monitor 2. The production flow passed with the preview server stopped.
- A compiled WinForms fixture cancelled its first normal Close request and exited after the second request from the tray. Untracked close was rejected. No real user app was launched, closed or uninstalled during QA.
- Managed uninstall was blocked while the fixture was running, including after unlinking. Once closed, only the receipt-matched test version was recycled; the directory was verified absent and the receipt removed.
- Native dark/light tray screenshots, main navigation, Escape dismissal and main-window exit after auxiliary tray creation passed. Monitor positioning tests also cover negative coordinates and scaled geometry; this is not physical-DPI certification.
- The final installer was installed into runtime/v062-final-installer-qa, its own installed executable completed the controls flow, and the test installation was removed. Its library survived removal; the personal desktop shortcut was restored.
- Personal v0.6.2 startup, native tray registration, top-left menu and shortcut were verified. Four existing links and one installation remain; the live library was byte-identical before/after replacement and startup. The launcher was reopened normally on monitor 2 without remote debugging.
- The portable ZIP has exactly six selected executable/readme/legal files and no library, WebView profile or test data. The 0.6.1 executable/source/library recovery files and earlier installers/ZIPs are retained.

## Build and artifacts

Application-source commit: `855c9b76eba726b7077687f55f5860b02bcf635f`.

[Windows build workflow](https://github.com/w-rakeeb/wrakeeb-launcher/actions/runs/41690749820) passed for the application-source commit. Subsequent delivery-report/test-fixture changes do not change application inputs.

| Artifact | SHA-256 |
|---|---|
| Canonical executable (15416320 bytes) | `3dbd89870cd5834bc2bb2f55dd0ed99de3a6cf9ba9918b3c70a55a34b5a9075b` |
| 0.6.2 setup | `8bb5b46c3a494a87f05a03ba4414d52d393da6404a1baf864cf244722d7472f6` |
| Clean portable ZIP (6523976 bytes) | `fedf91d9b16ecfc49aa3434d755fcfc9ec78cbddf29b81f6dfb55ed6de5bfb2f` |

Initial JS/CSS is 531765 bytes, +2.12% relative to the recorded 0.6.1 initial-code size of 520723 bytes. Tray code is loaded on demand. Runtime startup/memory benchmarks were not repeated; opening the custom tray creates an additional WebView that is reused while the app runs. No general performance guarantee is made.

## Boundaries

- Close controls direct processes launched during this launcher session. Existing external instances, processes from before a restart and short-lived bootstrapper handoffs are not automatically controlled. Apps can refuse closing or keep running through their own close-to-tray settings. There is no force-kill option.
- External registered apps use Windows Installed apps; no arbitrary external uninstaller is executed and portable external folders are not silently deleted.
- The physical notification-area right-click itself was not automated in this run; the shared native popup path and its complete UI actions were exercised on monitor 2. Native Windows folder/Installed apps UI is owned by Windows.
- Binaries remain unsigned. Separate Windows 10/recipient-PC, physical DPI, Narrator and high-contrast coverage remain outstanding. Queue/pause/resume and managed-app repair/update-all remain backend work.
- Coucou stays neutral because artwork permission is unconfirmed; older archived artwork permissions remain unresolved. This task does not change that status.

Recovery: `Backups/2026-11-03-v062-controls`. Preserve current data, exit the launcher and restore only the old executable for binary rollback.
