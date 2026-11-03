# Consolidation verification — 0.6.1

User direction: one Wrakeeb Launcher app, with Original/Claude interface design selectable in Appearance. The earlier separate edition is archived. Read [HANDOFF.md](../HANDOFF.md) for the original request, chat references and rollback locations.

## Checks

- TypeScript + Vite production build passed. No new dependencies.
- 8 catalog tests, 22 Rust tests and 17 browser tests passed, including persisted design switching independent of color themes, legacy preference defaults, rejection of unsupported design values, custom ordering and one-transfer download destination preservation.
- 180 page/design/theme/width combinations passed: both designs × five color themes × 960/1280/1920px × six pages. 540 Settings-tab checks, reduced motion and enlarged text passed; no horizontal overflow or page errors. Visual screenshots reviewed for both library designs and the Appearance chooser.
- Existing live library and pre-consolidation backup share SHA-256 `8DFC101057B90903C861CA03253BB1139F314A5D5E713D4F412A25E6DB018D0D`. Tests operate on isolated profiles.
- Build/test source scanning explicitly excludes archived worktrees so backups cannot add production CSS or duplicate test execution.
- Final optimized Windows executable and NSIS installer built successfully. Native checks passed for both designs, saved design after reload, unchanged shared app entries, grid/list, details, Downloads and Settings. Native export/import, disk capacity, close bounds, About scroll and fixture-only receipt/recycle removal also passed.
- Native screenshots for both designs: `design/screenshots/unified` (10 PNGs plus `capture.json`). These use a copied real library and the production binary, with no mock IPC and no app launches. Matrix evidence is in `runtime/unified-matrix/results.json`; native fixture results are in `runtime/unified-native-qa/results.json`.

## Performance

The 0.5.0 baseline initial JS/CSS was 496876 bytes. Final unified build initial JS/CSS: 520723 bytes (+4.80%). Total JS/CSS including lazy chunks: 1646853 → 1701889 bytes (+3.34%). New UI is a small presentation context, scoped CSS and a saved preference; shared functionality and backend are not duplicated. Complete code assets include the lazy full legal-notice chunk. Vite's large-chunk warning refers to that existing on-demand notice text, which is paged and not loaded on startup.

Five interleaved fresh-profile runs per variant, after compilation and functional checks, measured the entire native/WebView2 process tree. CDP first-heading polling adds overhead; OS caches are not flushed. These are same-session comparative medians, not lab-grade cold-boot guarantees. The earliest pair overlapped the brief ZIP packaging task, so timing noise remains a practical limitation of this desktop measurement.

| Metric | v0.5.0 baseline | v0.6.1 Original | v0.6.1 Claude |
|---|---:|---:|---:|
| Startup to first heading | 922ms | 923ms (+0.11%) | 948ms (+2.82%) |
| Idle private bytes | 216043520 | 223543296 (+3.47%) | 219176960 (+1.45%) |
| Idle working set | 397115392 | 400977920 (+0.97%) | 405786624 (+2.18%) |

All measured final medians and bundle totals are within the approximately 5% budget. An earlier pass measured Claude startup +5.96%; icon color sampling was deferred 300ms to let the shell paint first, then the final build was remeasured. Host timing varies, so the whole difference cannot be attributed solely to that change. Raw final samples: `runtime/performance/unified-final.json`; prior pass retained as `unified-before-deferred-artwork.json`.

Historical prototype measurements in [0.6.0 verification](VERIFICATION-v0.6.0.md) describe that earlier build, not this one.

## Active delivery

- `release/Wrakeeb Launcher.exe`: 15280640 bytes; SHA-256 `E278EFE231609598C93016CC286A99672467D796593EFB4383328689CC0B01BB`.
- `release/Wrakeeb Launcher_0.6.1_x64-setup.exe`: 5366645 bytes.
- `release/Wrakeeb-Launcher-0.6.1-portable.zip`: 6710101 bytes; six explicitly selected app/legal/readme files; no library/profile data.
- `release/SHA256SUMS.txt` records all three hashes. Existing desktop/project shortcut still targets the same canonical executable. Product name and `com.wrakeeb.launcher` identity are restored. No installer was applied to the user's machine and nothing was published.

## Limits

No new network package flow was required for consolidation. The earlier real download/install/custom-folder/recycle check passed in 0.5.0; a later prototype retest hit GitHub rate limits. Pause/resume, persistent queues, concurrency/speed controls, process-running status and managed-app repair/update-all still need backend work. Binaries are unsigned; Windows 10/other PCs remain separate validation work.

Three next steps: add a resumable persisted transfer queue; add receipt-aware managed-app update/repair; sign release artifacts and validate clean Windows 10/11 machines before publishing.
