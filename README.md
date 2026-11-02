# Wrakeeb Launcher

A Windows desktop library for your applications. Link existing programs, browse the project collection, and keep the launcher updated. Built with Tauri 2, Rust and React.

## Download and run

Download the Windows x64 portable ZIP from [Releases](https://github.com/w-rakeeb/wrakeeb-launcher/releases/latest), extract into a writable folder, and run **Wrakeeb Launcher.exe**. Microsoft WebView2 is required. This early-access executable is not Authenticode-signed. Windows 11 x64 is the development environment; clean-machine and Windows 10 validation remain outstanding.

Your library starts empty. Use **Add application** to select a trusted Windows executable. Known existing installations may appear under **This computer**. Linking keeps app files and settings in place; removing a link does not uninstall it.

## Version 0.2.0

- Dual Discord colors by default; **Original charcoal** remains in Settings → Appearance.
- Supplied Wrakeeb brand mark and one integrated, draggable title bar with window controls.
- Consistent centered original-logo/name covers; original screenshots remain in project galleries.
- Search, categories, favorites, grid/list views, recent-use sorting, missing-file feedback and activity.
- Restrained transitions, compact layout and reduced motion.
- Settings → Downloads: choose a local download folder. Downloads shows real launcher-package progress and cancellation.
- Updates: installed/latest versions, last check, release notes, download and **Install & restart**. Optional background checks never block the local library.

## Launcher updates

The updater reads this repository's latest stable release and requires the fixed Windows asset name, expected size and GitHub SHA-256 asset digest. HTTPS hosts and download size are restricted. Downloads are checked again before installation. A helper waits for the launcher to exit, backs up its executable, replaces it and starts the new version. The interface must acknowledge readiness; failed starts restore the previous executable. Library data stays separate.

These checks provide integrity against GitHub metadata; they are not publisher signatures or Authenticode signing. Publish a new version rather than replacing release assets. Network failure leaves local apps usable.

## Current boundaries

This release manages **local app links and launcher updates**. Individual catalog-app downloads, installation, app updates, repair and uninstall remain planned. Each app needs packaging and redistribution review before installation is offered. The chosen Downloads folder applies to launcher packages today; it is not an app install-location setting. Cancellation/retry work; pause/resume and a multi-app queue are not implemented.

Project logos/screenshots identify their corresponding apps without implying endorsement. See [image provenance](docs/PROJECT-IMAGES.md), [Coucou's original asset notice](docs/Coucou-asset-notice.md), and [reference license](docs/Dual-Discord-reference-license.txt). No third-party app executable is distributed. No blanket license is granted over third-party artwork.

## Data and recovery

Keep the portable executable in a writable folder:

| Path | Contents |
|---|---|
| data/library.json | App links, preferences and recent activity |
| data/library.json.bak | Previous successful library state |
| data/webview/ | Embedded browser profile |
| data/launcher-update.json | Update feedback |
| Downloads/ | Default download destination unless changed |
| Backups/Launcher-update-* | Previous executable from an update |

Back up the portable folder when moving computers. Unreadable/unsupported library data is preserved and reported. For manual recovery, close the launcher, preserve data, and replace only the executable with a working release. Restoring library.json.bak is a separate data-recovery action.

## Development

Install Node.js, Rust's Windows MSVC toolchain, Microsoft C++ build tools and WebView2.

```powershell
npm ci
npm run desktop
```

```powershell
npm run build
npm test
npm run test:native
# Start npm run preview in another terminal for browser tests:
npm run test:ui
npm run package
```

Production output: src-tauri/target/release/wrakeeb-launcher.exe. The interface is embedded. Browser preview cannot launch Windows programs; privileged operations go through scoped Rust commands.

The native smoke script runs an isolated copy under runtime/native-qa and requires a second monitor for visible tests. Set WRAKEEB_QA_BINARY to a production binary to test that build. The live-update script exercises the public feed and replacement in another isolated copy. Its older-version override works only in debug builds; production ignores it. Debug endpoints are local and absent from ordinary launches.

See [status](docs/STATUS.md), [release notes](docs/CHANGELOG.md), [research](docs/LAUNCHER-REFERENCES.md), and the [full roadmap](docs/ROADMAP.md).

## Screenshots

![Original project artwork in the desktop collection](docs/images/discover.png)

![Theme and motion preferences](docs/images/settings.png)
