# Wrakeeb Launcher — original product, UI, and delivery roadmap

Prepared 2 November 2026. This is the original planning proposal; STATUS.md describes the actual implementation. The product is now named Wrakeeb Launcher. The original “App Hub” screen data is illustrative; no existing app or installation was changed for that concept.

## 1. Product definition

A Windows desktop launcher where people discover your published apps, install them, open installed apps, and manage updates. Apps remain independently usable. The launcher is optional after installation. The initial catalog is curated by you; it is not an open marketplace.

Primary users: new visitors discovering your tools; returning users managing several tools; you publishing new versions. Success means a new user can install the launcher, find an app, install it, launch it, update it, and remove it without losing unrelated settings or files.

Recommended initial scope: Windows 11 x64. Evaluate Windows 10 and ARM64 separately based on actual audience, dependency support, and test capacity. Do not advertise an OS just because the desktop framework can start on it.

## 2. Scope and release levels

| Level | Included | Release gate |
|---|---|---|
| Visual prototype | Library, discover, app details, downloads, settings; fake states clearly marked | Navigation and layout accepted |
| Vertical slice | One managed portable app, real download/verification/install/launch/update/uninstall | Full flow passes on a clean machine |
| Private alpha | Three audited apps, cached catalog, install detection, failures and recovery | All package types in alpha pass recovery checks |
| Public v1 | Signed release pipeline, tested launcher self-update, support materials, stable catalog | Clean-device, upgrade, failure and privacy checks pass |
| Later | Beta channels, repair improvements, localization, richer discovery | Demand and maintenance capacity justify each feature |

V1 includes search, grid/list library, favorites, chosen install location, one active package operation with a queue, cancel/retry, resumable downloads when the server supports validated range requests, app release notes, launch, update, uninstall, and local settings. Internet is needed to download new files; installed apps remain launchable offline subject to their own requirements.

Defer accounts, payments, social/chat, cloud saves, ads, plugin execution, arbitrary third-party uploads, delta patches, subscriptions, a separate web admin dashboard, and cross-platform releases. Account-free public delivery does not prevent adding authenticated products later, but private distribution requires a real authentication design.

## 3. UI direction

See `../design/Original-UI-Concept.png` for the original static library mockup. The current built interface is in `../design/screenshots/`. The original mockup uses illustrative names from existing project folders and invented release, installation, download, and version states. The catalog is not approved by that mockup.

Visual language: dark graphite surfaces, one restrained violet accent, readable neutral text, thin borders, 10–14 px corner radii, simple line icons in production, Segoe UI Variable where available, Segoe UI fallback. Keep existing app branding; do not redesign every app icon to match the launcher. The mockup uses text tiles as placeholders.

Proposed tokens: canvas #0D1016, sidebar #11151D, panel #171D28, border #2B3444, text #F4F6FC, secondary text #B1BCD0, accent #B8A9FF with dark button text, success #6EE7B7, warning #FCD778. Validate all actual text/background pairs during implementation. Base text 14–16 px, metadata at least 12 px, headings 22–30 px. Use 8 px spacing increments. Desktop controls can be compact with sufficiently large hit areas; provide approximately 44 px hit areas where touch is supported.

Layout: initial design at approximately 1280×820; minimum window around 960×640 subject to testing. Sidebar about 190–220 px; main content uses an adaptive grid. At narrow widths reduce columns and use a compact navigation rail with accessible labels. At 200% scaling allow vertical scrolling instead of clipping controls. Keep native resize, snap, system menu, close, maximize, and accessible window behavior.

### Screens and behavior

| Screen | Layout and main actions |
|---|---|
| Library, default | Search, Installed/Favorites/All filters, grid/list switch, app cards, Launch or Update action, context menu |
| Discover | Published apps only; category filters and modest featured area; no forced carousel |
| App details | App icon/name, purpose, screenshots, version, size, requirements, publisher, license, release notes; Install/Launch/Update and manage menu |
| Downloads | Queue with bytes, speed, current phase, pause where supported, cancel, retry, disk-space failures |
| Settings | Install root, appearance, launch behavior, update policy, cache controls, diagnostics and About |
| Help | Support link, app-specific troubleshooting, export redacted diagnostics |

App detail layout: title and concise description at top, primary action beside version/size, screenshots in the center, Overview/What's new tabs below, requirements and license in a side panel. Destructive operations use a separate management menu. Button state reflects the next useful action, not just installation status.

Download phases are explicit: queued → downloading → verifying → installing → checking → ready. Errors show a concrete reason and action. Never display 100% as if installation is finished while verification is still running.

First run: optional install-folder choice, brief explanation, then library/discover. No login wall or mandatory tutorial. Existing app detection is targeted and explainable. Unknown external installs can be linked for launch only until safe management is verified.

Accessibility: complete keyboard navigation, visible focus, labelled icon controls, screen-reader names and progress announcements without constant chatter, contrast checks, reduced motion, status text alongside colors, text scaling, high contrast checks. Search shortcut Ctrl+K; Escape closes a dialog; Enter activates the focused action. Preserve focus after updates and failures.

## 4. Architecture recommendation

Preferred candidate: Tauri 2 desktop shell, Rust for privileged operations, TypeScript UI with React/Vite, and a small local SQLite database for installed-app records and the operation journal. If React is chosen, use Tailwind/daisyUI components with a deliberate desktop theme rather than accepting default website styling. This is a proposed stack, not an assumption about current projects.

Tauri uses Windows WebView2. It can deliver a compact desktop shell, but it still renders web UI; native feeling depends on the implementation and must be validated. Compare against a small WinUI 3/.NET spike before committing if native rendering is a firm requirement. Reuse existing app experience if it materially reduces maintenance. Do not claim RAM or startup superiority without measurement.

Architecture:

```text
Public catalog + catalog signature       Versioned release files
                |                               |
                v                               v
  Local UI <--> Rust catalog/operations/download service
                       |
               local records + operation journal
                       |
        verified portable package / supported installer
                       |
             independently runnable app
```

Keep the UI bundled locally. Remote catalog text/images are data, not executable UI. Only narrowly scoped native commands may launch known apps, write inside managed locations, or invoke validated installer recipes. Remote release notes are sanitized. No general-purpose shell executor exposed to the UI.

Hosting v1: public static catalog and images on a static host; immutable binaries in GitHub Releases. GitHub documents that individual release assets must be under 2 GiB, with no stated aggregate release size or bandwidth cap. This is a hosting option, not a guarantee of unlimited service or permanent terms. Keep download URLs in metadata so the client can move to object storage/CDN later. Avoid polling the GitHub API for every card. Cache catalog data and refresh on a modest schedule with backoff.

A full backend/database server is unnecessary for a curated public catalog. Build one only for authenticated entitlements, payments, personalized sync, or an authoring workflow that actually needs it. Never put a GitHub personal access token in a public launcher. Private source code and public binary delivery can be separated when rights and configuration permit.

## 5. Catalog and local data contract

Each app needs a stable ID, display name, publisher, description, categories, screenshots/icon, license/attribution, support URL, supported OS and architecture, release channel, semantic version, minimum launcher version, download URL, byte size, SHA-256, package type, entry point, installation/upgrade/uninstall recipe ID, prerequisites, and user-data preservation policy.

Local state adds install root, provenance (managed/externally linked), installed version evidence, active version folder, favorites, pending jobs, last error, and whether an installer requires restart. Do not infer version solely from a filename. Use bounded schema versions and migrations for both catalog and local records.

Sign catalog bytes with a defined canonical format or verify a detached signature over exact published bytes. The launcher pins the trusted public key. Hashes authenticate packages only when the metadata containing them is itself trusted. Verify byte length and digest before execution; restrict download origins and redirects. Reject unknown recipe types, invalid paths, unsupported versions, and oversize metadata. Record the highest accepted metadata revision and expiry to resist replay, with a defined offline grace policy. A compromised running client or signing key is beyond what checksums alone solve.

Separate two signing concerns: package/catalog authenticity and Windows publisher identity. Tauri's updater verifies signed launcher updates; it does not provide an app manager for the rest of the catalog. Authenticode signing helps Windows identify the publisher and is distinct from updater signatures. Secure signing material in CI or an appropriate signing service, with offline backup and a tested key-rotation/recovery plan.

## 6. Installing and updating apps safely

Begin with a portable app whose binary folder is separate from settings/user data. Installation stages: preflight supported platform and free space → download to partial file → verify → extract to a staging folder → validate expected files → commit version folder → register local record → enable Launch. Check ZIP entries for traversal, absolute paths, links/reparse escapes, file-count limits, and inflated extraction size.

Use versioned managed directories. On update, keep the prior executable version and switch the launcher record only after validation. On same-volume storage an atomic rename can be used as part of commit; do not assume cross-volume rename is atomic. Recover interrupted operations from a small journal. Retain a supported previous version where compatible and disk space permits.

If an app is running, offer Close and update, or update later. Do not kill it silently. Apps that spawn child processes or background services need app-specific running-state detection. “Launch accepted” does not prove the app is healthy; use a practical startup check or documented health signal where available.

Portable rollback is not user-data rollback. If a version migrates its data irreversibly, do not promise safe downgrade; use an app-supported backup/migration strategy or disable rollback for that version.

Normal EXE/MSI installers are separate recipes, not arbitrary commands from catalog text. Use documented arguments and known exit/restart codes, and verify installed evidence afterward. Show the standard installer when unattended install is unsupported. Elevate only that installer if needed. Do not promise transactional rollback for an installer that cannot support it. Repair and uninstall are only enabled for tested recipes.

Externally linked installations are launch-only by default. Offer managed adoption only after checking identity, version, ownership, paths and backup behavior. Never overwrite arbitrary external directories or migrate profiles just to add an app to the library.

During uninstall show what is being removed. Keep app settings/user data by default; deleting them requires a separate explicit choice. Launcher uninstall does not implicitly remove installed apps. Clearing the download cache cannot delete installed packages or user data. Detect manually deleted/moved apps and offer Locate or Remove from library.

Download resume requires server support and validating ETag/Last-Modified or equivalent identity. If identity changed, restart the transfer and verify the final file. Handle offline mode, slow connections, redirects, permission errors, disk full, antivirus locking, and sleep/restart. Serialize conflicting jobs per app and block launcher self-update while app installation is committing. Do not promise background continuation after the launcher exits in v1.

## 7. Auditing existing projects

The D:\Codex directory listing includes project folders such as PulseMute Project, Dual Discord, Sticky Note, Codex Presence, Coucou, and Windows/Discord customizations. Folder presence does not establish release readiness, licensing, or current app behavior. No source audit was performed for this planning deliverable.

Inventory every candidate: owner and redistribution rights; current release; source and release location; packaging type; install scope; data/settings locations; prerequisites; admin need; update mechanism; startup entries/services; uninstall behavior; screenshots; known bugs; clean-device test result. Mark each Public candidate / Private only / Needs preparation / Exclude.

Select three initial apps only after that audit: one simple portable app first, one standard installer second, then one more complex integration if it can pass the same checks. Defer OS modifications and third-party patchers from the initial public cohort because they need distinct deployment and support recipes.

## 8. Publishing workflow

For each app: tag version → build from pinned dependencies → run focused checks → package → sign Windows artifacts where applicable → generate digests → upload immutable assets → test install/update in staging → generate validated catalog metadata → sign catalog → publish catalog last. Verify the public readback. Do not silently replace binaries under the same version.

For the launcher: independent version/release pipeline and Tauri updater manifest. Test a real older-version-to-new-version upgrade, cancelled UAC, blocked installer and failed download. Back up the updater signing key securely: Tauri documents that loss can prevent updates to existing installations.

Release only to a small alpha audience first; then a beta cohort; then public stable. Beta packages remain isolated from stable packages. V1 can support stable only, with beta channels added later. Keep last known-good release metadata and packages. If a release is broken, stop advertising it through newly signed metadata, show an advisory, and release a fixed higher version; do not silently downgrade user data. A restricted advisory mechanism may block installation/launch of a known-dangerous version with an explanation; define that policy before using it.

Operator runbooks: signing-key loss/compromise; malicious package report; unavailable host; bad app update; catalog signature failure; installer failure; data-loss report. Maintain a direct launcher download and individual app downloads so recovery does not depend on one running launcher.

## 9. Delivery phases and estimates

These are planning estimates in focused engineering days, not guaranteed calendar dates. Existing packaging problems, real-device feedback, signing approval and release review may add elapsed time.

| Phase | Work | Estimate | Acceptance gate |
|---|---|---|---|
| 0: Audit and decisions | Inventory, choose three apps, packaging/data map, product name shortlist, platform scope | 2–3 days | Three realistic app recipes and known data paths |
| 1: UI prototype | Library, discover, detail, queue, settings, errors; responsive and accessible states | 3–5 days | All main journeys can be reviewed with fake data |
| 2: Architecture spike | Compare shell choice, verify native commands, install root, catalog verification | 2–4 days | Framework and signing approach accepted from evidence |
| 3: One-app vertical slice | Real verified portable install, launch, update, recovery and uninstall | 5–8 days | Clean-device full lifecycle succeeds without data loss |
| 4: Multi-app alpha | Two additional adapters, external linking, catalog cache, queue and settings | 5–8 days | Three-app lifecycle and offline launch checks pass |
| 5: Hardening | Signed publishing, launcher self-update, interruption/security/accessibility/performance checks | 5–8 days | Recovery matrix and upgrade checks pass |
| 6: Beta and public release | Tester feedback, docs, support, landing/download page, staged release | 4–7 days | No unresolved blocker; public files and metadata verified |

Total: approximately 26–43 focused engineering days, often 6–10 calendar weeks for one developer with feedback cycles. An early visual prototype takes days; a public distribution product takes longer. Re-estimate after phase 0 and after the vertical slice.

## 10. Quality and launch checklist

Functional: install, launch, update, uninstall, reinstall, existing-install detection, missing file recovery, launcher update and app settings preservation. Test actual packaged builds as a normal user on a clean Windows 11 machine/VM; developer-machine success is insufficient.

Failure: disconnect mid-download; altered bytes; invalid catalog signature; expired/replayed metadata; low disk before and during install; denied permissions; running app; locked file; cancelled UAC; restart during staging/commit; older launcher reading new catalog; corrupt local database recovery; unsupported OS/CPU; unavailable host. Test journal recovery by interrupting actual operations, not only mocking success.

Security: reject traversal/absolute ZIP paths, archive expansion bombs, redirected unapproved executable sources, release-note script injection, untrusted recipe commands and path escapes. Native commands validate IDs/paths independently of UI checks. Diagnostics redact usernames, local paths, tokens and query strings where relevant. No analytics by default; support exports are user initiated.

UX: keyboard/screen reader, 100/125/150/200% scale, small window, long names, empty library, zero search results, offline catalog, reduced motion, dark/light/high contrast where supported. App data loss, unverified execution, and unrecoverable update states block public release.

Performance targets, to measure rather than claim: warm interactive startup around 2 s, cold around 4 s on a named reference SSD PC; idle CPU around 0–1% once work settles; provisional total process memory budget around 150 MB including launcher WebView processes; no repeated polling loop or idle animation. If targets fail, profile and revise architecture/targets before release. Package size budget is set after the spike, with runtime prerequisites counted separately.

Pilot success targets: all lifecycle checks pass on each supported package recipe; 10–20 voluntary testers can complete first install without developer intervention; zero confirmed data loss; download/update failures are recoverable; every blocker has an owner. Percentage reliability claims need adequate real usage, not a tiny alpha sample.

## 11. Costs and ongoing ownership

Prototype can use local tools and public hosting allowances with little or no incremental cash cost. A public product adds domain, signing, possible CI usage, hosting/bandwidth, backup and support costs. No service has been purchased and no current provider quote is assumed.

Use a provisional $20–60/month operating allowance for a small public pilot, excluding development labor, taxes, and potentially annual certificate fees. This is a budgeting placeholder, not a verified quote. Signing eligibility and billing may change the total; verify country/entity support before choosing a service. Public downloads need no account infrastructure in the proposed v1.

Bandwidth example: 1,000 users × 100 MB × two downloads/month is about 200 GB of payload traffic before retries, screenshots and launcher updates. Measure actual download demand before moving to paid CDN plans.

You own product direction and catalog approval. Development owns adapters, builds, signatures, tests and recovery. Each app needs a maintainer for compatibility and support. Review dependencies and restore procedures regularly; renew signing identity before expiry; preserve original app license/attribution materials.

## 12. A–Z coverage index

| Letter | Decision/work item |
|---|---|
| A | Audience and optional-launcher product promise |
| B | Brand name, publisher identity, rights and later logo |
| C | Curated signed catalog and categories |
| D | Downloads, queue, validated resume and retry |
| E | Execution with validated entry points and running-state checks |
| F | Filesystem ownership, safe paths and install location |
| G | Git/CI build and immutable release workflow |
| H | Hosting, cache, origin restrictions and outage behavior |
| I | Installer recipes and per-app prerequisites |
| J | Journal and recovery from interrupted operations |
| K | Keys, Windows signing, backups and rotation |
| L | Library, search, favorites and external linking |
| M | Migrations of local records and app data compatibility |
| N | Notifications, consent and quiet idle behavior |
| O | Offline launch and cached catalog |
| P | Privacy, permissions and redacted support diagnostics |
| Q | Quality gates, clean devices and accessibility |
| R | Release channels, incident response and supported rollback |
| S | Settings, startup behavior and disk/cache management |
| T | Telemetry policy and measured performance |
| U | Updates for launcher versus updates for catalog apps |
| V | Version comparison, supported platforms and verification |
| W | Windows packaging, UAC, runtime and publisher trust |
| X | Extensibility by reviewed recipes rather than arbitrary code |
| Y | Your publishing workflow and catalog approval |
| Z | Zero-data-loss objective and explicit release blockers |

## 13. Decisions to confirm before implementation

Final brand; public versus private catalog scope; initial three apps after audit; Windows version/architecture scope; whether WebView-based rendering is acceptable; default user installation scope; hosting account; signing identity/eligibility; desired update consent policy. These do not prevent planning or static design. Implementation begins with phase 0, followed by the reviewable UI prototype.

## 14. Evidence and limitations

Official technical references checked 2 November 2026:

- Tauri WebView2 behavior: https://v2.tauri.app/reference/webview-versions/
- Scoped native access: https://v2.tauri.app/security/capabilities/
- Launcher updater/signatures: https://v2.tauri.app/plugin/updater/
- Windows signing and SmartScreen limits: https://learn.microsoft.com/windows/apps/package-and-deploy/smartscreen-reputation
- Signing eligibility/identity FAQ: https://learn.microsoft.com/en-us/azure/artifact-signing/faq
- GitHub release asset limits: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases

The design-system search returned a usable minimal visual style but a marketing-page layout. Targeted desktop product searches returned no verified match; the screen structure therefore uses general desktop UX guidance and the user's compact-layout preference. It does not claim to be a matched template.

No application source code, redistribution license, installer, hardware behavior, signing account, hosting entitlement, or performance claim was validated. Candidate apps and estimates must be confirmed during the audit. This deliverable intentionally contains no working launcher, purchases, public releases, or installation changes.
