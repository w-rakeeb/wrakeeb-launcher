# Publishing catalog projects

The catalog is curated by the launcher publisher. Adding a repository to the interface alone does not grant it native download or execution access.

1. Confirm the project's license, supported Windows versions, dependencies, settings location and actual entry point.
2. Publish a GitHub release with a Windows portable ZIP, standalone EXE, or explicit script. Keep required sidecars/licenses together in a ZIP. Do not put API keys, account profiles or personal settings in it.
3. GitHub must provide a valid SHA-256 asset digest. Preserve released assets; publish a new version instead of replacing them.
4. Add accurate description, requirements, category, repository and original artwork in src/catalog.ts and src/projectMedia.ts. Record image provenance/hashes.
5. Add the same catalog ID and pinned repository in src-tauri/src/packages.rs. Approve an exact entry filename only after inspecting the package. Entries without a recipe support direct downloads/source links.
6. Test a fresh download, corrupted-file rejection, extraction, the exact launch target, standalone use, data paths and recovery. Test on Windows 10 and 11 before claiming both are verified.
7. Document the change, build/test the launcher, publish an immutable new version tag and attach binaries, portable ZIP, installer and checksums. Retain earlier releases.

The current engine supports one project operation at a time. Installing creates a fresh version folder and switches its link; earlier folders are preserved. It does not migrate app-local settings or execute installer-style packages silently. Files without a managed recipe remain direct downloads. PowerShell uses the current user's execution policy; the launcher does not weaken it.

Live metadata is cached in memory for ten minutes. Refresh bypasses the cache. Downloads and installs re-read trusted release metadata and verify bytes. The two demonstration entries use a dedicated release tag so they never become launcher updates.
