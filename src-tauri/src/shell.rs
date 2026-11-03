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
pub fn hide_tray_panel(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("tray-panel") {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn tray_navigate(page: String, app: tauri::AppHandle) -> Result<(), String> {
    if ![
        "library",
        "discover",
        "downloads",
        "updates",
        "activity",
        "settings",
    ]
    .contains(&page.as_str())
    {
        return Err("Unknown launcher section".into());
    }
    hide_tray_panel(app.clone())?;
    show_launcher(app.clone())?;
    app.emit_to("main", "shell:navigate", page)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_launcher_folder() -> Result<(), String> {
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    std::process::Command::new(crate::windows_tool("explorer.exe")?)
        .arg(
            executable
                .parent()
                .ok_or("Application folder unavailable")?,
        )
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn panel_position(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    area: &tauri::PhysicalRect<i32, u32>,
) -> (i32, i32) {
    let right = area.position.x + area.size.width as i32;
    let bottom = area.position.y + area.size.height as i32;
    (
        (x - width / 2).clamp(
            area.position.x + 8,
            (right - width - 8).max(area.position.x + 8),
        ),
        (y - height - 10).clamp(
            area.position.y + 8,
            (bottom - height - 8).max(area.position.y + 8),
        ),
    )
}

#[cfg(test)]
mod tray_tests {
    #[test]
    fn popup_stays_inside_negative_and_scaled_monitor_work_areas() {
        for (area, width, height) in [
            (
                tauri::PhysicalRect {
                    position: tauri::PhysicalPosition::new(-1080, -234),
                    size: tauri::PhysicalSize::new(1080, 1872),
                },
                360,
                620,
            ),
            (
                tauri::PhysicalRect {
                    position: tauri::PhysicalPosition::new(0, 0),
                    size: tauri::PhysicalSize::new(3840, 2080),
                },
                720,
                1240,
            ),
        ] {
            for (x, y) in [
                (area.position.x, area.position.y),
                (
                    area.position.x + area.size.width as i32,
                    area.position.y + area.size.height as i32,
                ),
            ] {
                let (left, top) = super::panel_position(x, y, width, height, &area);
                assert!(left >= area.position.x + 8 && top >= area.position.y + 8);
                assert!(left + width <= area.position.x + area.size.width as i32 - 8);
                assert!(top + height <= area.position.y + area.size.height as i32 - 8);
            }
        }
    }
}

#[tauri::command]
pub async fn show_tray_panel(
    x: Option<f64>,
    y: Option<f64>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || open_tray_panel(x, y, app))
        .await
        .map_err(|e| e.to_string())?
}
fn open_tray_panel(x: Option<f64>, y: Option<f64>, app: tauri::AppHandle) -> Result<(), String> {
    let main = app
        .get_webview_window("main")
        .ok_or("Launcher window unavailable")?;
    let monitors = main.available_monitors().map_err(|e| e.to_string())?;
    let monitor = x
        .zip(y)
        .and_then(|(x, y)| {
            monitors
                .iter()
                .find(|m| {
                    let p = m.position();
                    let s = m.size();
                    x >= p.x as f64
                        && y >= p.y as f64
                        && x < (p.x + s.width as i32) as f64
                        && y < (p.y + s.height as i32) as f64
                })
                .cloned()
        })
        .or(main.current_monitor().map_err(|e| e.to_string())?)
        .ok_or("Display unavailable")?;
    let window = if let Some(window) = app.get_webview_window("tray-panel") {
        window
    } else {
        let directory = std::env::current_exe()
            .map_err(|e| e.to_string())?
            .parent()
            .ok_or("Application folder unavailable")?
            .join("data")
            .join("webview");
        let window = tauri::WebviewWindowBuilder::new(
            &app,
            "tray-panel",
            tauri::WebviewUrl::App("index.html#tray".into()),
        )
        .title("Wrakeeb Launcher quick access")
        .inner_size(360.0, 620.0)
        .decorations(false)
        .shadow(true)
        .resizable(false)
        .skip_taskbar(true)
        .always_on_top(true)
        .visible(false)
        .background_color(tauri::window::Color(29, 31, 35, 255))
        .data_directory(directory)
        .build()
        .map_err(|e| e.to_string())?;
        let own = window.clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Focused(false)) {
                let _ = own.hide();
            }
        });
        window
    };
    let area = monitor.work_area();
    let scale = monitor.scale_factor();
    let width = (360.0 * scale)
        .round()
        .min((area.size.width.saturating_sub(16)) as f64) as i32;
    let recent = app
        .state::<crate::Library>()
        .store
        .lock()
        .map_err(|_| "Library is busy")?
        .apps
        .iter()
        .filter(|app| app.last_launched.is_some())
        .take(3)
        .count();
    let active = crate::processes::get_running_apps()?.len().min(3);
    let desired_height = 426
        + if recent > 0 { 44 + 38 * recent } else { 0 }
        + if active > 0 { 44 + 62 * active } else { 0 };
    let height = (desired_height as f64 * scale)
        .round()
        .min((area.size.height.saturating_sub(16)) as f64) as i32;
    let (left, top) = panel_position(
        x.unwrap_or((area.position.x + area.size.width as i32 - width / 2 - 8) as f64) as i32,
        y.unwrap_or((area.position.y + area.size.height as i32) as f64) as i32,
        width,
        height,
        area,
    );
    window
        .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
        .map_err(|e| e.to_string())?;
    window
        .set_position(tauri::PhysicalPosition::new(left, top))
        .map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    app.emit_to("tray-panel", "tray:opened", ())
        .map_err(|e| e.to_string())
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
    let quit = MenuItem::with_id(app, "quit", "Exit Wrakeeb Launcher", true, None::<&str>)?;
    let fallback = Menu::with_items(app, &[&show, &quit])?;
    let mut builder = TrayIconBuilder::with_id("wrakeeb-launcher")
        .tooltip(format!("Wrakeeb Launcher {}", env!("CARGO_PKG_VERSION")))
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                let _ = show_launcher(app.clone());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            {
                match button {
                    MouseButton::Left => {
                        let _ = show_launcher(tray.app_handle().clone());
                    }
                    MouseButton::Right => {
                        let tray = tray.clone();
                        let fallback = fallback.clone();
                        tauri::async_runtime::spawn(async move {
                            if show_tray_panel(
                                Some(position.x),
                                Some(position.y),
                                tray.app_handle().clone(),
                            )
                            .await
                            .is_err()
                            {
                                let _ = tray.set_menu(Some(fallback));
                                let _ = show_launcher(tray.app_handle().clone());
                            }
                        });
                    }
                    _ => {}
                }
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
                tauri::WindowEvent::CloseRequested { .. } => app.exit(0),
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
        let is_powershell = target.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("ps1"));
        let runner = if is_powershell { crate::windows_tool("WindowsPowerShell/v1.0/powershell.exe")? } else { target.clone() };
        let arguments = if is_powershell { format!(r#"-NoProfile -File "{}""#, target.display()) } else { String::new() };
        let mut process = std::process::Command::new(crate::windows_tool("WindowsPowerShell/v1.0/powershell.exe")?);
        process.args(["-NoProfile", "-NonInteractive", "-Command", "$ErrorActionPreference='Stop'; $p=Join-Path ([Environment]::GetFolderPath('Desktop')) ($env:WRAKEEB_SHORTCUT_NAME+'.lnk'); if(Test-Path -LiteralPath $p){throw 'A shortcut with this name already exists'}; $s=New-Object -ComObject WScript.Shell; $l=$s.CreateShortcut($p); $l.TargetPath=$env:WRAKEEB_SHORTCUT_RUNNER; $l.Arguments=$env:WRAKEEB_SHORTCUT_ARGUMENTS; $l.WorkingDirectory=[IO.Path]::GetDirectoryName($env:WRAKEEB_SHORTCUT_TARGET); $l.IconLocation=$env:WRAKEEB_SHORTCUT_TARGET+',0'; $l.Save()"])
            .env("WRAKEEB_SHORTCUT_TARGET", target).env("WRAKEEB_SHORTCUT_NAME", name).env("WRAKEEB_SHORTCUT_RUNNER", runner).env("WRAKEEB_SHORTCUT_ARGUMENTS", arguments);
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
    std::process::Command::new(crate::windows_tool("explorer.exe")?)
        .arg(directory)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[derive(serde::Serialize, serde::Deserialize)]
struct PreferencesFile {
    format: String,
    preferences: crate::Preferences,
}
#[tauri::command]
pub async fn export_preferences(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title("Export launcher preferences")
            .add_filter("JSON preferences", &["json"])
            .set_file_name("Wrakeeb-preferences.json")
            .blocking_save_file()
        else {
            return Ok(());
        };
        let path = file.into_path().map_err(|_| "Choose a local file")?;
        crate::local_directory(path.parent().ok_or("Choose a local folder")?)?;
        let library = app.state::<crate::Library>();
        let preferences = library
            .store
            .lock()
            .map_err(|_| "Library is busy")?
            .preferences
            .clone();
        crate::atomic_json(
            &path,
            &PreferencesFile {
                format: "wrakeeb-preferences-v1".into(),
                preferences,
            },
        )
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn import_preferences(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title("Import launcher preferences (replaces preferences only)")
            .add_filter("JSON preferences", &["json"])
            .blocking_pick_file()
        else {
            return Ok(());
        };
        let path = file.into_path().map_err(|_| "Choose a local file")?;
        if std::fs::metadata(&path).map_err(|e| e.to_string())?.len() > 131072 {
            return Err("Preference file is too large.".into());
        }
        let file: PreferencesFile =
            serde_json::from_slice(&std::fs::read(&path).map_err(|e| e.to_string())?)
                .map_err(|_| "This is not a valid launcher preferences export")?;
        if file.format != "wrakeeb-preferences-v1" {
            return Err("This preferences format is not supported.".into());
        }
        crate::validate_preferences(&file.preferences)?;
        crate::mutate(&app.state::<crate::Library>(), |store| {
            store.preferences = file.preferences;
            Ok(())
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn storage_capacity(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let library = app.state::<crate::Library>();
    let mut path = crate::packages::install_directory(&library)?;
    while !path.exists() {
        path = path.parent().ok_or("Drive is unavailable")?.to_path_buf();
    }
    let path = crate::local_directory(&path)?;
    #[cfg(windows)]
    {
        use std::os::windows::ffi::OsStrExt;
        #[link(name = "kernel32")]
        extern "system" {
            fn GetDiskFreeSpaceExW(
                path: *const u16,
                available: *mut u64,
                total: *mut u64,
                free: *mut u64,
            ) -> i32;
        }
        let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
        let (mut available, mut total, mut free) = (0u64, 0u64, 0u64);
        if unsafe { GetDiskFreeSpaceExW(wide.as_ptr(), &mut available, &mut total, &mut free) } == 0
        {
            return Err("Windows could not read available disk space.".into());
        }
        return Ok(serde_json::json!({ "available": available, "total": total }));
    }
    #[cfg(not(windows))]
    {
        let _ = path;
        Err("Disk capacity is available on Windows.".into())
    }
}

#[tauri::command]
pub fn open_notice_file(app: tauri::AppHandle) -> Result<(), String> {
    let portable = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Application folder unavailable")?
        .join("THIRD-PARTY-NOTICES.txt");
    let path = if portable.is_file() {
        portable
    } else {
        app.path()
            .resource_dir()
            .map_err(|e| e.to_string())?
            .join("THIRD-PARTY-NOTICES.txt")
    };
    if !path.is_file() {
        return Err("The notice file is missing. Use the notice pages above.".into());
    }
    std::process::Command::new(crate::windows_tool("notepad.exe")?)
        .arg(path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
