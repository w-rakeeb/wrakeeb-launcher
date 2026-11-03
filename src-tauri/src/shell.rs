use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub fn show_launcher(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Launcher window unavailable")?;
    window.show().map_err(|e| e.to_string())?;
    window.unminimize().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())
}
#[tauri::command]
pub fn hide_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or("Launcher window unavailable")?
        .hide()
        .map_err(|e| e.to_string())
}
#[tauri::command]
pub fn exit_launcher(app: tauri::AppHandle) {
    app.exit(0);
}
#[tauri::command]
pub fn get_shell_status(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Launcher window unavailable")?;
    let tray = app.tray_by_id("wrakeeb-launcher");
    Ok(
        serde_json::json!({"trayRegistered":tray.is_some(),"trayRectAvailable":tray.as_ref().is_some_and(|t|t.rect().ok().flatten().is_some()),"visible":window.is_visible().map_err(|e|e.to_string())?,"minimized":window.is_minimized().map_err(|e|e.to_string())?}),
    )
}
#[tauri::command]
pub fn open_storage_directory(kind: String, app: tauri::AppHandle) -> Result<(), String> {
    let library = app.state::<crate::Library>();
    let folder = match kind.as_str() {
        "downloads" => crate::updates::download_directory(&library)?,
        "package" => crate::packages::operation_directory(
            &app.state::<crate::packages::Packages>(),
            &library,
        )?,
        "installations" => crate::packages::install_directory(&library)?,
        _ => return Err("Choose Downloads or Applications.".into()),
    };
    if !folder.is_absolute() || folder.to_string_lossy().starts_with(r"\\") {
        return Err("Choose a local storage folder.".into());
    }
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let folder = crate::local_directory(&folder)?;
    std::process::Command::new(
        std::path::PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows folder unavailable")?)
            .join("explorer.exe"),
    )
    .arg(folder)
    .spawn()
    .map_err(|e| e.to_string())?;
    Ok(())
}
pub fn setup(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Open Wrakeeb Launcher", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &settings, &quit])?;
    let mut builder = TrayIconBuilder::with_id("wrakeeb-launcher")
        .tooltip(format!("Wrakeeb Launcher {}", env!("CARGO_PKG_VERSION")))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = show_launcher(app.clone());
            }
            "settings" => {
                let _ = show_launcher(app.clone());
                let _ = app.emit("shell:navigate", "settings");
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                let _ = show_launcher(tray.app_handle().clone());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    app.manage(builder.build(app)?);
    if let Some(window) = app.get_webview_window("main") {
        let owned = window.clone();
        window.on_window_event(move |event| {
            let app = owned.app_handle();
            let prefs = app
                .try_state::<crate::Library>()
                .and_then(|l| l.store.lock().ok().map(|s| s.preferences.clone()));
            match event {
                tauri::WindowEvent::CloseRequested { api, .. }
                    if prefs.as_ref().is_some_and(|p| p.close_to_tray) =>
                {
                    api.prevent_close();
                    let _ = owned.hide();
                }
                tauri::WindowEvent::Resized(_)
                    if prefs.as_ref().is_some_and(|p| p.minimize_to_tray)
                        && owned.is_minimized().unwrap_or(false) =>
                {
                    let _ = owned.hide();
                }
                _ => {}
            }
        });
    }
    Ok(())
}

#[tauri::command]
pub async fn create_application_shortcut(id: String, app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let library = app.state::<crate::Library>();
        let linked = library.store.lock().map_err(|_| "Library is busy")?.apps.iter().find(|a| a.id == id).cloned().ok_or("Link this application first")?;
        let target = crate::launchable(std::path::Path::new(&linked.path))?;
        let name: String = linked.name.chars().filter(|c| !c.is_control() && !r#"<>:\"/\|?*"#.contains(*c)).take(100).collect();
        if name.trim().is_empty() { return Err("The application has no valid shortcut name.".into()); }
        let mut process = std::process::Command::new(crate::windows_tool("WindowsPowerShell/v1.0/powershell.exe")?);
        process.args(["-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop'; $p=Join-Path ([Environment]::GetFolderPath('Desktop')) ($env:WRAKEEB_SHORTCUT_NAME+'.lnk'); if(Test-Path -LiteralPath $p){throw 'A shortcut with this name already exists'}; $s=New-Object -ComObject WScript.Shell; $l=$s.CreateShortcut($p); $l.TargetPath=$env:WRAKEEB_SHORTCUT_TARGET; $l.WorkingDirectory=[IO.Path]::GetDirectoryName($env:WRAKEEB_SHORTCUT_TARGET); $l.IconLocation=$env:WRAKEEB_SHORTCUT_TARGET+',0'; $l.Save()"])
            .env("WRAKEEB_SHORTCUT_TARGET", target).env("WRAKEEB_SHORTCUT_NAME", name);
        #[cfg(windows)] { use std::os::windows::process::CommandExt; process.creation_flags(0x08000000); }
        if !process.status().map_err(|e| e.to_string())?.success() { return Err("Windows could not create the shortcut, or that name already exists.".into()); }
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn open_launcher_data(app: tauri::AppHandle) -> Result<(), String> {
    let library = app.state::<crate::Library>();
    let directory = library.file.parent().ok_or("Data folder unavailable")?;
    let directory = crate::local_directory(directory)?;
    std::process::Command::new(crate::windows_tool("explorer.exe")?).arg(directory).spawn().map_err(|e| e.to_string())?;
    Ok(())
}
#[derive(serde::Serialize, serde::Deserialize)]
struct PreferencesFile { format: String, preferences: crate::Preferences }
#[tauri::command]
pub async fn export_preferences(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app.dialog().file().set_parent(&app.get_webview_window("main").ok_or("Launcher window unavailable")?).set_title("Export launcher preferences").add_filter("JSON preferences", &["json"]).set_file_name("Wrakeeb-preferences.json").blocking_save_file() else { return Ok(()); };
        let path = file.into_path().map_err(|_| "Choose a local file")?;
        crate::local_directory(path.parent().ok_or("Choose a local folder")?)?;
        let library = app.state::<crate::Library>();
        let preferences = library.store.lock().map_err(|_| "Library is busy")?.preferences.clone();
        crate::atomic_json(&path, &PreferencesFile { format: "wrakeeb-preferences-v1".into(), preferences })
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn import_preferences(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app.dialog().file().set_parent(&app.get_webview_window("main").ok_or("Launcher window unavailable")?).set_title("Import launcher preferences (replaces preferences only)").add_filter("JSON preferences", &["json"]).blocking_pick_file() else { return Ok(()); };
        let path = file.into_path().map_err(|_| "Choose a local file")?;
        if std::fs::metadata(&path).map_err(|e| e.to_string())?.len() > 131072 { return Err("Preference file is too large.".into()); }
        let file: PreferencesFile = serde_json::from_slice(&std::fs::read(&path).map_err(|e| e.to_string())?).map_err(|_| "This is not a valid launcher preferences export")?;
        if file.format != "wrakeeb-preferences-v1" { return Err("This preferences format is not supported.".into()); }
        crate::validate_preferences(&file.preferences)?;
        crate::mutate(&app.state::<crate::Library>(), |store| { store.preferences = file.preferences; Ok(()) })
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn storage_capacity(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let library = app.state::<crate::Library>();
    let mut path = crate::packages::install_directory(&library)?;
    while !path.exists() { path = path.parent().ok_or("Drive is unavailable")?.to_path_buf(); }
    let path = crate::local_directory(&path)?;
    #[cfg(windows)] {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        extern "system" { fn GetDiskFreeSpaceExW(path: *const u16, available: *mut u64, total: *mut u64, free: *mut u64) -> i32; }
        let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
        let (mut available, mut total, mut free) = (0u64, 0u64, 0u64);
        if unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut available, &mut total, &mut free) } == 0 { return Err("Windows could not read available disk space.".into()); }
        return Ok(serde_json::json!({ "available": available, "total": total }));
    }
    #[cfg(not(windows))] { let _ = path; Err("Disk capacity is available on Windows.".into()) }
}
