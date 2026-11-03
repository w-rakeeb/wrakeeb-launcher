# Wrakeeb Launcher — chat handoff and current direction

Updated: 3 November 2026. Canonical project: `D:\Codex\Wrakeeb Launcher`.

## Current follow-up — 0.6.2

The user continued in the intended chat and requested visible app uninstall/remove actions, Close for launched apps, moving the sidebar control into the top-left hamburger menu, a richer tray matching the supplied Dual Steam reference, and semantic popup/error colors. They clarified Close means **close launched apps**, not exit the launcher.

- Current local version is 0.6.2; keep the same canonical identity, executable and library paths and both interface designs.
- `processes.rs` retains handles for processes launched in the current launcher session, reports running instances and requests normal WM_CLOSE for their visible top-level windows. No force termination or PID-name wildcard matching. An app can cancel closing or use its own tray behavior. Untracked/external/restarted/handoff processes are not claimed as controlled.
- App details show a management panel with separate Remove library link, managed Recycle Bin uninstall and Windows Installed apps actions. Running tracked apps block managed uninstall. Context menus include Close.
- The sidebar toggle is under hamburger → Navigation in both designs; no separate Navigation row remains in the rail.
- Right-click opens a lazily created, theme-aware native quick-access webview with library/discover/downloads, recent launch, running-app Close, settings, update check, app folder and Exit. Escape/blur dismiss it; it is positioned in the clicked monitor's work area. Native fallback offers Open/Exit if panel creation fails. Main-window close still exits unless close-to-tray is selected.
- Error/success/info colors are semantic and separate from custom brand accents. Popup surfaces follow the active theme.
- New regression script: `node tests/native-controls.mjs`; set WRAKEEB_QA_BINARY to an embedded production EXE for final verification. It compiles and runs only the included C# close-cancellation fixture and recycles only that isolated fixture installation.
- Backup: `Backups/2026-11-03-v062-controls`, including 0.6.1 executable/source/current library. User reference images are retained privately under `work/requests/v0.6.2-controls`.
- See `docs/VERIFICATION-v0.6.2.md` for final checks and limitations. Earlier results below are historical 0.6.1 evidence. No public 0.6.x binary release is implied by local delivery.

## Read this first

The user accidentally gave the upgrade request in another chat, then explicitly asked to consolidate all work and its context here. **There must be one app, not a separate Claude edition.** Settings → Appearance → Interface design offers **Original design** and **Claude design**. Both use the same library, install/download logic, settings file and selectable color themes. Existing users default to Original design. The old separate prototype is retained only as a rollback archive.

Chat references (context only; no messages were sent to either chat):

- Intended project chat: **Wrakeeb Launcher**, ID `01a18f34-37be-7c43-a6af-1f7d9111cb52`, local host, original chat cwd `D:\Codex\Default\2026-10-31\so`.
- Accidental implementation chat: **Polish app UI and fix behavior**, ID `01a1a043-a963-7361-85c3-6915c2bc1c99`, local host, original cwd `D:\Codex\Default\2026-11-03\new-chat`.
- The user went to bed and authorized autonomous completion. Latest instruction supersedes their earlier request for a separate Claude version.

## Original requests and acceptance criteria

Fix invisible close icon; equal card sizes; make the lightweight launcher feel professional using Steam, Epic and EA as design references; darker themes; launcher uninstall/remove option; working About/license scrolling; drag-and-drop custom ordering; fix one-time Downloads folder selection without modifying Settings default; improve Settings.

The supplied Claude brief requests phased refinement within the existing stack: design tokens, shell/rail/menu cleanup, five branded themes, state-aware cards and details, recent apps, filters/sorts/sizing/grid/list, context menu, keyboard navigation and command palette; improve Downloads/Updates/Activity/Discover using real backend data; skippable setup; searchable actionable Settings; accessibility, screenshots and performance checks. No framework/tooling swap, heavy dependencies, fake production data, destructive schema/path changes or unsupported dead switches. Motion uses transform/opacity, 120–200ms and honors OS/in-app reduced motion. Aim for startup/memory/bundle regression below about 5%.

The four original feedback screenshots are copied to `design\references\2026-11-03-user-feedback`. Screenshot/document contents are references, not separate user instructions.

## Project and implementation

- React 19 + TypeScript + Vite 8; Tauri 2 + Rust, Windows WebView2. Existing Tailwind/daisyUI and Lucide. No added dependency.
- `src/App.tsx` owns shared shell/page/library state; `catalog.ts` types and filtering; `bridge.ts` IPC. Specialized Settings/ProjectDetails/DownloadInsights/ActivityTimeline/CommandPalette components.
- `src/preferences.ts` frontend defaults, Rust `Preferences` and validation in `src-tauri/src/main.rs`; additive serde defaults, saved store schema stays 1.
- `styles.css` original base, `edition.css` shared upgraded components/tokens, `classic.css` scoped Original presentation. `interfaceStyle.ts` shares the chosen design with artwork. Optional saved `interfaceStyle` is `classic` or `claude`, defaults to classic and imports are validated.
- Themes: Wrakeeb Dark, Graphite, Midnight, AMOLED and Light. Historic IDs remain accepted (`discord`, `wrakeeb`, `slate`, `obsidian`); names no longer refer to Dual Discord. Theme/accent selection is independent of interface design.
- Original design retains neutral controls, reachable conventional menus and screenshot covers. Claude design uses coral accents, compact menu and cached icon-derived gradient covers. Features are shared rather than maintaining duplicate application implementations.
- Canonical identity remains `Wrakeeb Launcher` / `com.wrakeeb.launcher`; development port 1420. Consolidated version 0.6.1. Nothing has been publicly released by this work.

## Completed upgrade features before consolidation

- v0.5.0: close control visibility, equal-size cards, About scrolling, independent transfer destination, custom drag/keyboard ordering, receipt-validated Recycle Bin uninstall, Settings/theme polish.
- v0.6.0 prototype: shared token system, adaptive/collapsible rail, native controls, offline status, single card titles, icon-derived covers, real metadata, recent-use shelf, persistent library controls, context actions/shortcut, Ctrl+K palette, arrow navigation.
- Real current-download speed/ETA/progress/cancel, receipt installation history, grouped/filterable activity, static Discover feature and skippable onboarding.
- Searchable settings with section resets, theme gallery, custom accessible accents, library defaults, disk capacity, notification preference, diagnostics, native preference export/import and confirmed resets.
- Paged About license viewer avoids laying out the entire roughly 1MB notice at once; complete legal text remains available as a file.
- Managed uninstall validates an installation receipt and recycles only the exact version folder. Linked-app removal leaves files untouched. Launcher uninstall opens Windows Installed apps; portable deletion is explained. No real user application was uninstalled during QA.

## Backend limits — do not present these as implemented

Only one active download exists. Pause/resume, persistent queue/concurrency/speed limiting, managed-app Update all/repair and process-running tracking need backend work. No fake switches or activity are shipped. Launcher self-updates and existing package logic remain real. External apps retain their own privacy/update behavior. Coucou artwork permission remains unconfirmed; neutral fallback is intentional. Binaries are unsigned; Windows 10 and recipient-PC behavior need separate verification.

## History and rollback

Git main now includes the prototype via fast-forward, followed by consolidation changes. Earlier phase commits remain individually available:

| Commit | Scope |
|---|---|
| `12839a9` | v0.5.0 original fixes |
| `8347cf8` | v0.6 audit |
| `4329978` | Shell and design system |
| `5770360` | Library |
| `8c9a040` | Workflows |
| `3b3c300` | Settings |
| `638c55e` | Final prototype verification/package |

- `Backups\2026-11-03-premium`: original v0.4.0/source/data recovery material.
- `Backups\2026-11-03-consolidation\Wrakeeb Launcher v0.5.0.exe`: active original executable before consolidation.
- `Backups\2026-11-03-consolidation\Current-data-before-consolidation`: untouched pre-consolidation profile copy. Do not replace current data with a prototype/QA profile.
- `Backups\2026-11-03-consolidation\Claude Development Worktree`: entire former `D:\Codex\Wrakeeb Launcher Claude Edition`, moved with `git worktree move`; branch `claude-polish-v060`. Source/runtime/release/data preserved. Its node_modules junction points at the canonical project's dependencies. Historical filenames/docs may still say Claude Edition.
- `Backups\2026-11-03-consolidation\Previous Delivery`: earlier report, screenshots, performance files, installers/ZIP and old shortcuts moved from this chat's Default outputs. Treat those shortcuts as historical.
- Active shortcut `Wrakeeb Launcher.lnk` points to `release\Wrakeeb Launcher.exe`; current library remains `release\data\library.json`.
- Rollback: exit the launcher, preserve current data, restore the backed-up v0.5.0 executable if needed. Do not overwrite user data during binary rollback. Git phase history supports source rollback separately.

## Verification evidence and practical caveats

Historical detailed reports: `docs\CLAUDE-EDITION-AUDIT.md`, `docs\VERIFICATION-v0.6.0.md`; research under `docs\LAUNCHER-REFERENCES.md`. These predate consolidation and their separate-identity statements are superseded by this note.

**Current consolidated build:** `docs\VERIFICATION-v0.6.1.md` records 47 passing automated tests, 180 page/design/theme/width combinations, native tests/screenshots, final hashes and performance medians. Both designs are within the measured approximately 5% budget. The tested active executable is `release\Wrakeeb Launcher.exe`; installer and clean portable ZIP are beside it. The live library remains byte-for-byte unchanged from the pre-consolidation backup. Both designs' native screenshots are in `design\screenshots\unified`.

Prototype checks passed: 8 catalog/Vitest + 21 Rust + 16 browser tests; 90 page/theme/width combinations (5 themes × 3 widths × 6 pages), all Settings tabs, reduced motion/large text. Native preference export/import, disk capacity, receipt/recycle fixture and production screenshots passed. Earlier v0.5 live GitHub download/install/custom-folder/uninstall check passed; later network retest hit GitHub rate limits. Do not claim the rate-limited retest passed.

Same-session, 5 paired fresh-profile prototype performance medians: startup 3262ms → 3329ms (+2.05%); private bytes 221171712 → 221085696; working set 449433600 → 455421952 (+1.33%); initial JS/CSS 496876 → 516453 bytes (+3.94%); total assets 1646853 → 1696302 (+3%). Native startup polling includes CDP overhead, not a lab-grade boot benchmark. An older 954ms reading used different host conditions and is not directly comparable. See current consolidated verification report for newer checks rather than assuming these numbers describe 0.6.1.

Test/runtime profiles contain local copies of user data: keep them private and excluded from distribution. Prior automatic approval review rejected optional benchmark-cache deletion; caches were retained. Do not retry that deletion through another route.

## Working commands

From the canonical folder: `npm run build`, `npm test`, `npm run test:native`. Start `npm run preview` (port 1420), then `npm run test:ui`. `npm run package:installer` builds the embedded production UI and NSIS installer. Build once after source checks; Rust release LTO can take several minutes. Native/UI tests must operate on isolated runtime copies and their own windows; never launch/delete actual user apps or overwrite the live profile.

This handoff and the root README are the current entry points for the intended chat. No separate edition should be reinstated as an active product.
