# Build status — 2 November 2026

## Current release: 0.2.0

Dual Discord default palette, selectable original charcoal, original brand mark, integrated window chrome, centered logo/name covers, screenshot galleries, motion controls, download destination and a dedicated launcher-update workspace.

Launcher updates use stable GitHub metadata, restricted HTTPS hosts, size/SHA-256 validation, cancellable downloads, executable backups, atomic replacement, restart readiness and failed-start rollback. This is integrity verification, not publisher signing.

## Verification

- TypeScript and production frontend build passed.
- Three catalog unit checks and eight browser checks passed.
- Twelve Rust tests passed, including corrupt download rejection, changed-target rejection, actual inert executable launch, replacement/restart, readiness and failed-start rollback.
- Optimized desktop build passed native IPC/image/gallery/link/favorite/removal/preferences/restart smoke checks on the second monitor. Four workstation app links survived in isolated QA data.
- Taste inspection: no failures; small-text warning only at 390px, below native minimum width.

## Outstanding

Individual catalog-app package downloads, install/update/repair/uninstall, pause/resume, multi-app queue, Authenticode and publisher signatures, clean-machine testing, Windows 10/ARM64 and physical DPI/accessibility validation remain outstanding. File-picker interaction is not automated. User apps are not launched during QA; the launch test uses an inert generated executable.

Live GitHub feed/download/replacement verification is recorded separately after publication. Personal library and unrelated apps are preserved.
