# Wrakeeb Launcher — completed upgrade

> Historical 0.6.0 prototype report, superseded on 3 November 2026. The user's latest direction is one shared app with switchable designs. See [HANDOFF.md](../HANDOFF.md); no separate Claude edition is active.

Two independent versions are ready. **v0.5.0** completes the original fixes and remains the fallback. **v0.6.0 Claude Edition** implements the supplied brief in a separate folder, branch, Windows app identity, executable, optional installer and data store. Your original library file was verified unchanged. The pre-change v0.4.0 binary/data backup is retained.

## What changed

| Phase | Completed |
|---|---|
| Audit | Existing React/TypeScript/Vite/Tauri stack retained; baseline measured; no new dependencies. |
| Shell | Branded dark/light themes, coral accents, shared tokens, native controls, menu button, adaptive sidebar, offline feedback and launcher update count. |
| Library | Equal covers, one title, real metadata, recent-use shelf, remembered view/filter/sort/card size, persistent drag ordering, context menu, shortcuts, keyboard navigation and Ctrl+K commands. |
| Workflows | Transfer progress/speed/ETA/cancel, current-install receipt history, grouped/filterable activity, static Discover feature and skippable setup. |
| Settings | Search, section resets, theme previews, custom accents with AA contrast handling, library defaults, disk capacity, notifications, local diagnostics, native preference export/import and confirmed reset. |
| Verify | Close icon, About scrolling, one-time download folders and safe managed uninstall verified; licenses paged; separate releases built; screenshots and performance recorded. |

## Performance

Five alternating paired fresh-process/WebView2-profile runs per version, after compilation completed. Startup includes local CDP harness overhead; OS disk caches were not flushed. Idle memory includes the native app and its WebView2 process tree. Saved app/activity records were empty and startup network/scanning was disabled; built-in local detection remained active.

| Metric | v0.5.0 control | v0.6.0 | Change |
|---|---:|---:|---:|
| Median startup | 3262 ms | 3329 ms | 2.05% |
| Median private memory | 210.9 MiB | 210.8 MiB | -0.04% |
| Median working set | 428.6 MiB | 434.3 MiB | 1.33% |
| Initial JS + CSS | 496.9 KB | 516.5 KB | 3.94% |
| Total JS + CSS, including lazy notices | 1.647 MB | 1.696 MB | 3.00% |

The paired comparison stays within the requested 5% budget. Treat small timing differences as noise. The earlier audit recorded 954 ms in a separate run; paired same-session controls are used for the final comparison because timing conditions varied. Raw samples are included in Performance/performance.json.

## Verification and remaining limits

**45 automated tests passed** (8 catalog/contrast/license, 21 Rust, 16 browser). **90 page/theme/width combinations** passed at 960/1280/1920, including all settings tabs, enlarged text and reduced motion. Native file-dialog export/import, disk capacity, close controls and removal of an isolated managed fixture passed. Separately stored profiles, older versions and download fixtures were preserved. No real user app was uninstalled.

The v0.5.0 live GitHub download/verification/install/uninstall flow passed. A repeat live check later hit GitHub's rate limit; v0.6.0 was checked with a local removal fixture and its transfer/install implementation is unchanged from v0.5.0. The installer was built; it was not installed into the main Windows environment. Nothing was published externally.

No unsupported switches were added: queue/pause/resume/concurrency/speed limits, per-app Update all/repair/running detection, arbitrary scan roots and automatic app updates still need backend work. Apps retain their own updaters. Removing a library link preserves files; managed uninstall recycles the validated version folder, including data stored inside it. App paths are shared references even though the two launchers' settings are separate.

To fall back, exit Claude Edition and open the current v0.5.0 shortcut. No renaming or migration is required. The original library/settings stay independent.

## Next round

1. Cached per-app release inventory and genuine update detection.
2. Durable queue with verified resume/retry before exposing more download controls.
3. Process-aware running state and app-specific repair that preserves profiles.

