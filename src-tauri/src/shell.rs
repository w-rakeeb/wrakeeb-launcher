use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{Emitter, Manager};

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
