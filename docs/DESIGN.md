# Interface decisions

## Update: original project imagery

Version 0.1.1 replaces the illustrative project scenes with original project screenshots, thumbnails and logos. Those scenes and their unused CSS were removed. Library/Discover cards use contained images, and app details add selectable full-size previews. The layout and launcher color system are preserved; represented apps retain their own original branding. See PROJECT-IMAGES.md for asset provenance and version limitations. The initial illustration notes below describe the 0.1.0 design history.

## Brief

Wrakeeb Launcher is worked in for short visits: find an app, open it and get back to work. It should feel like a compact Windows utility, with a clear identity and useful state, rather than a marketing page or game-store imitation.

Screen question: **Which application can I open, and what can I do with it?**

Real objects: local executable links, detected installation candidates, five descriptive project entries, favorites, launch requests, missing files and preferences. Counts are computed from those objects. No download, install, usage or release statistics are invented.

## Direction

Taste Skill's app-screen draw: **True-black flat**, seed **11587432**. We kept the already established neutral-charcoal palette and Segoe UI type. Its useful principle is elevation by lightness with quiet chrome. The warm accent appears only sparingly in the identity and status. Controls are neutral or inverted white. No gradients, glass, glowing borders, entrance choreography or promotional carousel.

A labelled desktop sidebar is intentionally retained instead of the draw's no-sidebar shell: this product has recurring Library, Discover, Downloads, Activity and Settings destinations, and the library should remain navigable while scrolling. Below desktop widths it folds into a top navigation row.

The product-specific element is the **local application collection**: distinct small illustrations for account workspaces, notes, presence, microphone control and a workspace window. These depict the purpose of each tool, not fabricated app screenshots or release claims. Original app icons/screenshots should replace these where suitable approved assets become available.

## Visual system

- Neutral warm charcoal ground, small tone steps for surfaces, soft white primary text.
- Segoe UI Variable / Segoe UI, no remote font or runtime network dependency.
- Main title 24–28 px; app names 16 px; working text 13–14 px; secondary metadata 11–12 px.
- One 8 px panel radius, 6 px controls; illustrations use shapes appropriate to their depicted objects.
- One grid gap of 20 px between app columns, 24 px between card rows; the grid uses the full canvas width.
- Four apps use two equal columns; five use three above two; narrow windows adapt to two and then one.
- Native Windows titlebar, resizing, snapping and system menu remain available.
- App previews, navigation, focus, dialogs and errors are usable without motion.

## Screen behavior

Library: linked apps, search, favorites, recent-use sort, grid/list switch, explicit Open action. Empty state offers Add application and actual detected installations.

Discover: project collection with real availability to link an existing local installation. There is no install action without a published package.

Details: purpose, available actions, local executable path, source, requirements that are actually known, favorite/reveal/remove actions. Unknown versions read Not verified.

Downloads: honest empty state and explanation of the next installation milestone. No inert pause/retry controls or simulated progress.

Settings: self-saving preferences with saved feedback; actual data location and portable-library explanation. One save model throughout.

## Checks and remaining improvements

Production-browser checks run at 1440, 768 and 390 px. The app also has UI checks at 900 px and a real native-window smoke test. Taste inspection reports have no failures after fixing button text-shadow, tiny mobile action text and contrast in the note illustration.

Remaining inspector warnings are explicit: small secondary labels in a dense desktop UI, and differing corner radii inside the app illustrations. Main controls and panels share their own consistent radius. A stricter 13 px metadata pass could improve accessibility further at the expense of density.

Native screenshot critique: the library's primary action and linked state are clear; neutral navigation recedes; the original three-plus-one arrangement for four apps wasted width, so four apps now use a two-by-two grid. Large collections scroll within the main pane. Screenshot capture should wait for state and rendering to settle.

Still to validate on real hardware: Windows high-contrast mode, Narrator, touch, 125–200% DPI across different monitors, cold startup, memory/CPU budgets, and a clean Windows installation.

## Skills

- Taste Skill: https://www.tasteskill.dev/ — installed from Leonxlnx/taste-skill, `skills/taste-skill`.
- UI/UX Pro Max for desktop hierarchy, interaction and accessibility guidance.
- daisyUI 5 with a deliberately customized desktop theme; React best-practices review for state, effects, semantics and bundle behavior.
- Ponytail for a focused implementation without a server, account system or speculative plugin architecture.

## 0.2.0 design update

The user's Dual Discord palette replaces the earlier default; original charcoal remains selectable. A single integrated title bar contains native controls. Cards now present original-logo/name covers, while screenshots remain in details. Settings has Appearance/Downloads/General tabs. Updates presents versions, check time, release notes, explicit download/install phases and a visible folder destination. Downloads now shows real launcher-package progress/cancellation. See LAUNCHER-REFERENCES.md for researched patterns. The newest inspection has no failures and only a 390px small-text warning, below the native minimum.
