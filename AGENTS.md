# Wrakeeb Launcher project context

Before changing this project, read `HANDOFF.md` and `README.md`.

The latest user direction is one shared app with selectable Original and Claude interface designs in Settings → Appearance. Do not recreate a separate Claude edition or change the canonical application identity or data paths. The old prototype lives only under `Backups`.

Keep real library/profile data private. Work and test in isolated `runtime` copies, preserve `release/data`, and never uninstall or launch real user applications during QA. Do not add unsupported switches or fake production data. Follow the existing React/TypeScript/Tauri/Rust stack without heavy dependencies.

Place project resources here under `D:\Codex\Wrakeeb Launcher`, and preserve rollback material. Details, chat IDs, historical validation and limitations are in `HANDOFF.md`.
