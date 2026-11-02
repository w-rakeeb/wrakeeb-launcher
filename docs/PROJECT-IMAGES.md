# Project artwork — current release 0.4.0

Original project imagery is bundled locally and preserved in proportion. Cards use consistent logo/name covers; galleries show authentic documentation captures with captions, thumbnail selection, previous/next and keyboard controls. No project screenshot is generated.

Coucou's original icon and screenshots are excluded because permission is unconfirmed. A neutral catalog icon is used. Earlier versions discussed below describe historical assets and must not be interpreted as current redistribution permission. See RIGHTS-REVIEW.md.

Brightness Control now uses its official SVG and main/settings screenshots, with the project's MIT notice preserved. PROJECT-ASSET-SOURCES.json records current files and SHA-256 hashes.

## Historical implementation notes

# Original project images — 0.2.0

The launcher's five catalog projects now use original files from their existing project folders. Fifteen files were copied unchanged: five logos and ten screenshots or original project thumbnails. SHA-256 checksums, exact source paths and descriptive captions are in PROJECT-ASSET-SOURCES.json. The source projects were not modified.

| Project | Logo source | Images |
|---|---|---|
| Dual Discord | Assets/Dual Discord.png | Original 2.7.1 Windows Profiles and Settings reference captures |
| StickyN | Source/Assets/logo.png | Native 0.16.0 review Workspace and Settings captures |
| Codex Presence | Assets/logo-256.png | Original social-card thumbnail and documented desktop workspace |
| Coucou | Windows app icon from src-tauri/icons/icon.png | Original project demo and original Windows overview capture |
| PulseMute | Release Source/PulseMute-professional-256.png | Published Main window and General settings screenshots |

The unrelated GitHub folder within Sticky Note was not used for StickyN imagery. Its README identifies it as Codex Presence, despite its parent folder name. A Coucou settings image containing account-path/API-field examples was excluded; the selected images show the app itself without those fields.

## Behavior

- Library/Discover cards use consistent original-logo/name covers, with the actual logo also beside the name. Original screenshots remain in the gallery.
- Detected installations also use their original logo.
- App details include the logo, two selectable original images, captions and a full-size viewer.
- Images preserve their proportions; screenshots are contained rather than stretched or cropped.
- Images are bundled with the executable. No live access to the source folders or an image server is required.
- A missing preview falls back to the logo/name. Manually linked unknown apps keep a neutral icon rather than an invented project screenshot.
- Escape closes the image viewer while keeping app details open.

## Scope and limitations

These are existing release/documentation captures, not newly taken screenshots of the currently installed app versions. Captions identify reference versions where known. The Coucou original project demo and its Windows overview are distinct images. Exact installed-app versions remain unverified.

Original logo colors and geometry were retained. Taste Skill's palette restrictions apply to launcher chrome, not to the existing brands represented in these assets.

Coucou's original asset notice is retained in Coucou-asset-notice.md. Images identify/show the existing project; the launcher does not claim its brand or redistribute its executable. App package redistribution remains a separate review before catalog installation can be enabled.

## Verification

All fifteen bundled files match their recorded source hashes. The production frontend built successfully. Seven browser checks and three unit checks passed, including actual image decoding for all five cards and their logos, thumbnail selection, full-size viewing, and Escape returning to the same detail image. The final Windows executable is also checked for embedded asset loading before replacing the personal build.

The prior executable and source/docs backup are in Backups/before-original-project-images-20261102. Existing library data is preserved during the replacement.

## 0.3.0 imagery

Added original Dual Discord Files/Updates reference captures, StickyN Inspector/Note tools captures, current Codex Discord Rich Presence Privacy/Layout documentation captures, and Dual Steam's original logo plus Profiles/Settings/Sharing release screenshots. Added an actual monitor-2 capture of the installed Launcher Demo. No generated replacement screenshots are used.

Sources: Dual Discord's existing reference Screenshots directory; StickyN Documentation/Native-0.16.0/Evidence; Codex Discord Rich Presence GitHub/docs/screenshots/current; Dual Steam Public Source/docs/screenshots and Assets. Hashes and bundled paths are recorded in PROJECT-ASSET-SOURCES.json. Existing screenshots can depict versions different from the current public release; gallery captions state their reference.
