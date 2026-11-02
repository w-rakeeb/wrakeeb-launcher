# Version history and restoration

Releases retain binaries, checksums, source references and change notes. Never force-push version history, move a released tag, or overwrite an existing release asset. Publish a new patch version for corrections.

| Version | Main changes | Recovery |
|---|---|---|
| 0.1.0 | Local links/launch, library organization, favorites, preferences and activity | [Archival executable and original partial source snapshot](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/archive-v0.1.0) |
| 0.1.1 | Original project logos/screenshots, galleries and full-size viewer | [Archival executable and original source snapshot](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/archive-v0.1.1) |
| 0.2.0 | Dual Discord theme, original theme retained, brand mark, integrated chrome, covers, chosen download folder, launcher updates/recovery | [Release and source tag](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/v0.2.0) |
| Demo 1.0.0 | Standalone GUI and CMD samples | [Separate demo release](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/demo-v1.0.0); not the launcher update channel |
| 0.3.0 | GitHub packages, independent installation, script support, per-user Windows installer, catalog information, galleries, themes/accents and UI cleanup | [Release and source tag](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/v0.3.0) |

| 0.4.0 | Tray, bounded discovery, direct latest downloads, per-app storage, project tabs/gallery, typography and rights notices | [Release and source tag](https://github.com/w-rakeeb/wrakeeb-launcher/releases/tag/v0.4.0) |

The two archival tags identify recovered bundles, not original historical Git commits. The 0.1.0 source archive is partial; 0.1.1 has flattened native paths and is not a complete reproducible build archive. Those limitations are stated in each release. Full Git source history begins with 0.2.0.

## Restore an executable

1. Close the launcher and preserve its whole data folder. Preserve independent app folders too.
2. Download the required release and SHA256SUMS.txt; verify the executable/ZIP hash.
3. For a portable copy, replace only the launcher executable, keeping the appropriate data backup separate. Extract portable ZIPs into a separate empty folder before selecting what to restore.
4. For an installed copy, preserve data first and use the corresponding installer when available. Older releases were portable only.
5. Open and verify the required version before making further changes.

A rollback does not automatically undo app installations or migrate a newer library backward. Older launchers may not understand installation receipts or new settings; saving in an older version can drop unknown fields. Restore a matching data backup when full state restoration is required. Never test rollback against your sole copy of the library.

## Restore source

For versions from 0.2.0 onward, create a separate Git worktree at the version tag, run npm ci, use the recorded Rust toolchain and Cargo.lock, then build. Do not overwrite a working checkout with unfinished changes. Third-party downloads and tool availability can still affect historical builds.

Historical Coucou artwork permissions are unresolved. Current release removal does not retroactively clear archived assets. See RIGHTS-REVIEW.md.
