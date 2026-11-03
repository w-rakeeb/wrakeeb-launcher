# Claude edition — phase 0 audit

3 November 2026. Alternate worktree: D:\Codex\Wrakeeb Launcher Claude Edition. Base: v0.5.0 / 12839a9. The user's original request was completed first and remains independently runnable.

- React 19 / TypeScript / Vite 8, Tauri 2 / Rust, existing Tailwind+daisyUI and Lucide.
- src: page shell, library, project details, settings, transfers and update components. src-tauri/src: main storage/launch commands, shell/tray, bounded discovery, project packages, launcher updater.
- App receives a local Snapshot. Preferences and library links live in the executable's sibling data/library.json; mutations retain a prior-state backup. Themes are CSS variables.
- Catalog entries supply names, categories, descriptions, icons, original screenshots, repository and project kind. Linked records supply paths, favorite, added and last-launched timestamps. Installation receipts supply managed version, directory/entry, digest and measured size. Detection is distinct from managed installation.
- Packages exposes one current transfer; activity has up to 100 real records. App update availability, running PID state, queue, speed limit, pause/resume and repair are not backed by commands.
- Build: shell/tokens and branded themes; supported library metadata, reorder, remembered controls, keyboard/context menus/command palette; current transfer progress/history and grouped activity; searchable settings, real diagnostics and reversible preference tools.
- Defer: concurrent queue, pause/resume, app repair/update-all, arbitrary scan roots, automatic app updates, opacity/startup/languages unless backed by actual commands. No dead switches.

## Baseline

Five fresh-process/fresh-WebView2-profile runs of the preserved production v0.5.0 binary, isolated empty saved link/activity records (built-in local detection remained active), startup scanning and update checks disabled. Startup is process spawn to first rendered page heading via local CDP; it includes harness overhead. Idle is measured 1.5 seconds later across the entire native+WebView2 process tree. OS file caches were not flushed, so this is not an OS-cold disk benchmark.

Median startup 954 ms; private bytes 215,285,760 (205.3 MiB); working set 415,354,880 (396.1 MiB); executable 15,113,728 bytes. Initial minified JS+CSS 496,876 bytes. Lazy license chunk is 1,149,966 bytes and is not startup code. Baseline samples are under the original project's runtime/performance/baseline-v050/metrics.json.

Budget: <=5% regression, measured with the same fixture and method; inspect noise and retest if a single metric exceeds it. No new dependencies planned. Each phase must build and pass its relevant checks before committing and moving on.
