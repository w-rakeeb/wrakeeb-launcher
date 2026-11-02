# Current status — 0.4.0

Windows x64 desktop launcher with native tray, local libraries, GitHub releases, verified project downloads, portable installation and explicit independent launch. Catalog supports applications, scripts and source/direct-download entries.

## Validation

- TypeScript/Vite production build and 3 catalog unit checks pass.
- 9 browser checks pass, including image viewer, filtering, launch-error handling, favorites, removal, preferences, update-error recovery and 1440/900/768/390px layouts. Sidebar control containment is checked as well as document overflow.
- 19 Rust checks pass, including state recovery, real inert EXE/CMD/BAT launches, download validation, curated recipes, ZIP traversal/duplicate rejection and launcher rollback/readiness.
- Native monitor-2 checks pass for tray registration/hide/restore/close/minimize, existing Dual Steam detection, bounded scans, image controls, direct latest demo download, Unicode folder paths, independent version-folder installation and recorded sizes.
- Native folder dialog placement/cancellation is verified on monitor 2; full folder selection is not automated because Windows focus protection blocks scoped keyboard automation. Custom root persistence and installation are verified separately.
- Final packaged-executable, installer and authentic public 0.3.0-to-0.4.0 upgrade checks passed; details are in VERIFICATION-v0.4.0.md.

## Boundaries

Current machine is Windows 11. Windows 10 22H2 x64 is a target, not a separately verified recipient platform. Clean-PC/WebView2 bootstrap, ARM64/32-bit, Narrator/high-contrast and physical DPI coverage are outstanding. Binaries are unsigned.

One package operation runs at a time. Queue/pause/resume, managed uninstall/repair, automatic catalog-app updating and automatic app-data migration remain planned. Existing version folders/data are retained. GitHub SHA-256 checks are integrity checks, not publisher signatures.

Coucou artwork is omitted from this release because permission is unconfirmed. Older releases/Git history remain preserved with unresolved artwork permissions. See RIGHTS-REVIEW.md. A formal security/legal certification is not claimed.
