# Research translated into this release

Reviewed 2 November 2026. Selected interaction ideas, not copied interfaces or claims of measured performance superiority.

| Reference | Adaptation |
|---|---|
| [Steam storage](https://help.steampowered.com/en/faqs/view/4BD4-4528-6B2E-8327) | Visible configurable destination; app libraries remain planned. |
| [Epic install guide](https://dev.epicgames.com/documentation/unreal-engine/install-unreal-engine) | Clear folder choice and explicit download/install actions. |
| [EA app guide](https://help.ea.com/en/articles/platforms/how-to-use-ea-app/) | Distinct Library, Downloads and settings workspaces. |
| [Ubisoft download options](https://www.ubisoft.com/en-us/help/connectivity-and-performance/article/changing-download-options-in-ubisoft-connect/000061161) | Dedicated download preferences. |
| [Heroic](https://heroicgameslauncher.com/) and [wiki](https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher/wiki) | Local imports usable independently of online checks; clear artwork and state. |
| [Playnite metadata](https://github.com/Playnite/Docs/blob/main/docs/manual/library/games/metadata.md) | Original logos, consistent covers, separate detailed screenshots. |
| [Tauri window customization](https://v2.tauri.app/learn/window-customization/) | Integrated draggable chrome with explicit native window permissions. |

The user's Dual Discord design supplies default surface, text, border, accent and focus colors. Its token snapshot is in design/dual-discord-tokens.json; its license is retained. The previous charcoal palette remains selectable. The supplied Wrakeeb mark is reused unchanged and exported to Windows icon formats.

Dual Steam's existing updater informed stable-release selection, trusted asset checks, persistent feedback and backup/recovery. The launcher-specific Rust implementation adds cancellation, configurable destination, readiness acknowledgment and its own Updates screen. No Steam account/profile management behavior is imported. No Heroic/Playnite application code is copied.

Taste Skill inspection at 1440, 768 and 390px reported no failures and one small-text warning at 390px. The desktop minimum is 760×560. The user's palette takes priority over generic art-direction restrictions. Reduced motion is respected.
