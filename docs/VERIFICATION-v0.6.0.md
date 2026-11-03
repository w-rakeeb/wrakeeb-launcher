# Verification notes — Claude edition 0.6.0

## Completed phases

| Phase | Result |
|---|---|
| 0 Audit | Existing stack and data ownership documented; original upgrade preserved on main; alternate worktree and branch created. |
| 1 Shell | Shared tokens, Wrakeeb-branded theme names, coral accent, dark/light surfaces, menu button, native window controls, adaptive rail, local/offline feedback. |
| 2 Library | Single card title; cached icon-derived covers; real version/size/last-used metadata; persistent filtering, sorting, sizing and views; recent-use shelf; context actions; keyboard navigation and command palette. |
| 3 Workflows | Current transfer progress, measured speed/ETA, cancellation, receipt-based install history, grouped/filterable real activity, static Discover feature, skippable setup. |
| 4 Settings | Search, section resets, theme gallery, preset/custom accessible accents, library defaults, disk capacity, notification preference, diagnostics, native preference export/import and confirmed reset. |
| 5 Verification | Native builds, tests, multi-theme/width checks, paged license viewer, separate app identity/portable build/installer, performance comparison and screenshots. |

## Evidence

- TypeScript and production Vite builds pass; no new dependencies.
- 8 catalog/contrast/notice tests, 21 Rust tests, 16 browser tests.
- 90 page/theme/width combinations at 960/1280/1920, all settings tabs, enlarged text, OS reduced motion: no overflow or runtime errors. Compositor-only transition properties and 150 ms durations are checked explicitly.
- Native production binary: owned Windows export/save and import/open dialogs, validation/persistence, live disk capacity, visible close button, About scrolling and Recycle Bin removal of an isolated version fixture. Older-version folder, independent marker/download and separate profile fixture were preserved.
- v0.5.0 had already passed a live GitHub download into a one-time Unicode folder, checksum verification, installation and recycle uninstall. A later repeat hit GitHub's request limit; no bypass was attempted. Native v0.6.0 uninstall was therefore rechecked against an isolated local fixture. Package transfer/install code is unchanged from v0.5.0.
- The production design inspector has zero failures. Its two warnings concern deliberately contrasted theme-preview controls and compact secondary labels; enlarged-text mode is available and was checked.
- License text remains complete: paging preserves its bytes, and the full notice file can be opened separately. The test for opening and scrolling About fell from tens of seconds to roughly two to four seconds on this host.

## Honest boundaries

The backend has one current transfer. No queue/pause/resume/concurrency/speed-limit controls are shown. Per-app update availability, Update all, repair, running-process state, arbitrary scan roots and automated app updates remain unimplemented. Existing apps keep their own updaters. The size field labels executable-only measurements separately from installation sizes; unavailable versions/sizes are not invented.

The installer was built but not installed into the main Windows environment; portable binaries were exercised in isolated folders. Launcher uninstall opens Windows Installed apps. For portable copies, exit and remove the folder. Version removal only recycles a receipt-validated managed version directory, including any data stored inside that directory. Separately stored application profiles are preserved.

The alternate copy owns its own data/webview files and single-instance identity. It starts from a copy of the existing library, with original executable paths intact. Those paths still refer to shared app files: explicitly uninstalling an app affects every launcher using that installation. No real user app was uninstalled during testing. No GitHub release or other external publication was made.

## Research

Reviewed the official [Steam library showcase](https://store.steampowered.com/libraryupdate/), [Epic launcher showcase](https://launcher.epicgames.com/), [EA app](https://www.ea.com/ea-app), [EA download guide](https://help.ea.com/en/articles/platforms/download-and-play-ea-app-games/), and GitHub references [Heroic](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher) and [design-engineering-skill](https://github.com/ryktara/design-engineering-skill). Used the existing local design skills and retained the current framework, assets and conventions; no remote skill or UI dependency was installed.

## Next round

1. Add a cached per-app release inventory so Update available and Update all can be real.
2. Build a durable transfer queue with verified resume/retry before exposing pause/concurrency controls.
3. Add process-aware running state and app-specific repair recipes that preserve profiles.
