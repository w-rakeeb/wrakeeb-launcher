# Security boundaries

Release assets are limited to the catalog's pinned repositories, GitHub HTTPS release URLs, expected sizes and SHA-256 digests. Managed installation additionally requires a curated package name and known entry point. Source archives and arbitrary installers are not silently executed. ZIP extraction rejects traversal, links, duplicates and excessive counts/sizes. A new version directory is created; installation never starts the app or migrates existing data automatically.

Integrity checks match GitHub metadata, not an independently signed publisher identity. Binaries are currently unsigned. Downloaded applications and scripts require their own review. PowerShell retains the user's execution policy. Local discovery is bounded and skips reparse points. Existing linked applications are not changed by scanning.

Launcher updates preserve the previous executable, verify downloads again before replacement and require startup acknowledgment, with rollback on failed startup. Preserve the data folder and independent application folders before manual rollback. Older versions can discard newer settings on save.

Windows 10 22H2 x64 and Windows 11 x64 are targets. This release is tested on the current Windows 11 machine; Windows 10, clean recipient PCs, ARM64, physical DPI, Narrator and high-contrast validation remain outstanding. This review is not a penetration test or certification.

Report issues privately to the repository owner using an available GitHub contact channel. Do not publish credentials or personal library files in issue reports.
