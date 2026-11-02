# Wrakeeb Launcher 0.4.0 verification

3 November 2026, Asia/Dhaka.

## Passed

- TypeScript/Vite and optimized Windows x64 NSIS builds.
- 3 catalog checks, 9 browser checks and 19 Rust checks. Browser coverage includes 1440/900/768/390px overflow and sidebar containment, gallery/viewer, mutations, error feedback, direct-download failures and update recovery.
- Taste app inspection at 1440/900/768px: no findings; screenshots reviewed.
- Production executable runs with the preview server stopped. Native tray registration and shell rectangle, hide/show, close-to-tray and minimize-to-tray pass on monitor 2.
- Existing Dual Steam is detected and shows Launch instead of Download. Read-only bounded scan found five catalog apps while checking 1,500 folders. No real Steam or linked utility was launched by this QA.
- Real latest demo ZIP download, GitHub integrity verification, Unicode download-root path, chosen install-root persistence, per-project Downloads/Versions directories and package/installed byte counts pass.
- Installed GUI demo runs independently after launcher exit. Bundled license notices load through the production app protocol.
- Actual current-user installer into an isolated folder: empty writable library, four themes/five accents, keyboard settings tabs, maximize/restore, public Dual Steam ZIP and inert CMD package installation without executing either.
- Installer includes privacy/security/rights and full dependency notices. Its removal preserves the QA library, independent applications and personal desktop shortcut; its registry entry is removed.
- Official Brightness Control assets match SHA-256 against pinned upstream commit aba1f586e3456f38ece6e6612bb208f4a3bf96a5. Current artwork manifest verified.
- Portable ZIP has exactly the standalone EXE, release notes and four notice/policy documents, with no library, profile, account or QA data.
- Windows CI at tested application commit 6b69b6a19cf7d4923352fa3680896dca2143de20 passed: https://github.com/w-rakeeb/wrakeeb-launcher/actions/runs/41512701022

## Artifact SHA-256

Standalone EXE: 66a3072d1973cb1291df441741b0110f13b1fec3d82c862d9b6cdc41d94837ac

Setup EXE: 174718048abf5617fd72b31b23dc513a7c175e4a165ab7b47f150af9263f2a15

Portable ZIP: 68a6e2a8aa4300eaf2eb99d63d18abe21fccc976258b295f925b471bbeb25769

## Limits and remaining work

- Windows 11 tested locally. Separate Windows 10/recipient-PC, missing-WebView2 bootstrap, ARM64/32-bit, Narrator/high-contrast and physical-DPI validation are outstanding. Binaries are unsigned.
- Native folder dialog placement and cancellation are verified on monitor 2. Selection is not fully automated because focus protection blocks scoped keyboard automation. Custom-root persistence and resulting filesystem paths are verified separately.
- The first opening of the full dependency notice panel can take several seconds in WebView2. It is loaded on demand and does not block normal launcher startup.
- One transfer at a time; queue/pause/resume, managed uninstall/repair and automatic app-data migration remain planned. Detection identifies expected filenames/executable structure, not a cryptographically verified publisher.
- Coucou artwork is omitted from current binaries/source tree. Older archives/history remain untouched, with unresolved permissions. No blanket legal/security compliance certification is made.

## Post-publication checks

The authentic v0.3.0-to-v0.4.0 public upgrade and personal-copy replacement are performed after publication. Their results will be recorded in the final delivery report without moving the release tag or replacing release assets.
