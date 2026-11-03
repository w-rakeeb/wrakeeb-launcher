#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Seek, SeekFrom, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
mod discovery;
mod packages;
mod shell;
mod updates;

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct LinkedApp {
    id: String,
    name: String,
    catalog_id: Option<String>,
    path: String,
    favorite: bool,
    added_at: u64,
    last_launched: Option<u64>,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase", default)]
struct Preferences {
    compact: bool,
    reduce_motion: bool,
    remember_page: bool,
    theme: String,
    download_directory: Option<String>,
    check_updates_on_start: bool,
    install_directory: Option<String>,
    accent: String,
    close_to_tray: bool,
    minimize_to_tray: bool,
    scan_on_start: bool,
    scan_downloads: bool,
    record_activity: bool,
    large_text: bool,
    custom_order: Vec<String>,
    custom_accent: Option<String>,
    sidebar_collapsed: bool,
    library_view: String,
    library_filter: String,
    card_size: u16,
    hide_linked: bool,
    onboarding_complete: bool,
    notifications: bool,
    library_sort: String,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            compact: false,
            reduce_motion: false,
            remember_page: true,
            theme: "discord".into(),
            download_directory: None,
            check_updates_on_start: true,
            install_directory: None,
            accent: "default".into(),
            close_to_tray: false,
            minimize_to_tray: false,
            scan_on_start: true,
            scan_downloads: true,
            record_activity: true,
            large_text: false,
            custom_order: vec![],
            custom_accent: None,
            sidebar_collapsed: false,
            library_view: "grid".into(),
            library_filter: "All apps".into(),
            card_size: 260,
            hide_linked: false,
            onboarding_complete: false,
            notifications: true,
            library_sort: "name".into(),
        }
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Activity {
    id: String,
    name: String,
    action: String,
    at: u64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct Store {
    schema: u32,
    apps: Vec<LinkedApp>,
    preferences: Preferences,
    activity: Vec<Activity>,
    #[serde(default)]
    installations: Vec<packages::Installation>,
}
impl Default for Store {
    fn default() -> Self {
        Self {
            schema: 1,
            apps: vec![],
            preferences: Preferences::default(),
            activity: vec![],
            installations: vec![],
        }
    }
}
struct Library {
    file: PathBuf,
    store: Mutex<Store>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Snapshot {
    store: Store,
    available_ids: Vec<String>,
    missing_ids: Vec<String>,
    data_directory: String,
    download_directory: String,
    install_directory: String,
    detected_apps: Vec<discovery::DetectedApp>,
}

fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}
fn candidate(id: &str) -> Option<(&'static str, &'static str)> {
    match id {
        "dual-discord" => Some(("Dual Discord", r"D:\Codex\Dual Discord\Dual Discord.exe")),
        "stickyn" => Some(("StickyN", r"D:\Codex\Sticky Note\StickyN.exe")),
        "codex-presence" => Some((
            "Codex Presence",
            r"D:\Codex\Codex Presence\Codex Presence.exe",
        )),
        "coucou" => Some(("Coucou", r"E:\Coucou\coucou.exe")),
        "dual-steam" => Some(("Dual Steam", r"D:\Codex\Dual Steam\Dual Steam.exe")),
        _ => None,
    }
}
fn executable(path: &Path) -> Result<PathBuf, String> {
    let path_text = path.to_string_lossy();
    let path = Path::new(path_text.strip_prefix(r"\\?\").unwrap_or(&path_text));
    if !path.is_absolute() || path.to_string_lossy().starts_with(r"\\") {
        return Err("Choose an executable on a local drive.".into());
    }
    let resolved = path
        .canonicalize()
        .map_err(|_| "This file is missing or cannot be accessed.".to_string())?;
    if !resolved.is_file()
        || !resolved
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"))
    {
        return Err("Choose a Windows .exe application.".into());
    }
    let mut file = fs::File::open(&resolved).map_err(|e| e.to_string())?;
    let size = file.metadata().map_err(|e| e.to_string())?.len();
    let mut header = [0u8; 64];
    file.read_exact(&mut header)
        .map_err(|_| "This is not a valid Windows executable.".to_string())?;
    let offset = u32::from_le_bytes(header[60..64].try_into().unwrap()) as u64;
    if &header[..2] != b"MZ" || offset < 64 || offset.saturating_add(4) > size {
        return Err("This is not a valid Windows executable.".into());
    }
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| e.to_string())?;
    let mut signature = [0u8; 4];
    file.read_exact(&mut signature).map_err(|e| e.to_string())?;
    if signature != *b"PE\0\0" {
        return Err("This file has no valid Windows executable header.".into());
    }
    let resolved_text = resolved.to_string_lossy();
    if resolved_text.starts_with(r"\\?\UNC\") {
        return Err("Choose an application on a local drive.".into());
    }
    Ok(PathBuf::from(
        resolved_text
            .strip_prefix(r"\\?\")
            .unwrap_or(&resolved_text),
    ))
}
fn read_store(file: &Path) -> Result<Store, String> {
    if !file.exists() {
        return Ok(Store::default());
    }
    let bytes = fs::read(file).map_err(|e| e.to_string())?;
    let store: Store = serde_json::from_slice(&bytes).map_err(|_| "Library data could not be read. Your files have been preserved; restore library.json.bak before continuing.".to_string())?;
    if store.schema != 1 {
        return Err("This library was saved by a different launcher version. Update the launcher to continue.".into());
    }
    Ok(store)
}
fn windows_tool(name: &str) -> Result<PathBuf, String> {
    Ok(
        PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows directory unavailable")?)
            .join("System32")
            .join(name),
    )
}
fn launchable(path: &Path) -> Result<PathBuf, String> {
    if path
        .extension()
        .is_some_and(|ext| ext.eq_ignore_ascii_case("exe"))
    {
        return executable(path);
    }
    let text = path.to_string_lossy();
    if !path.is_absolute()
        || text.starts_with(r"\\")
        || text.chars().any(|c| "&|<>^%!\"\r\n".contains(c))
    {
        return Err(
            "Choose a local script whose path does not contain shell control characters.".into(),
        );
    }
    let resolved = path
        .canonicalize()
        .map_err(|_| "The selected script is missing or inaccessible")?;
    let normalized = resolved.to_string_lossy();
    let result = PathBuf::from(normalized.strip_prefix(r"\\?\").unwrap_or(&normalized));
    if !result.is_file()
        || !["cmd", "bat", "ps1"].contains(
            &result
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .to_ascii_lowercase()
                .as_str(),
        )
    {
        return Err("Choose an .exe, .cmd, .bat or .ps1 file.".into());
    }
    if result
        .to_string_lossy()
        .chars()
        .any(|c| "&|<>^%!\"\r\n".contains(c))
    {
        return Err("This script path contains unsupported shell characters.".into());
    }
    Ok(result)
}
fn save(file: &Path, store: &Store) -> Result<(), String> {
    let parent = file.parent().ok_or("Invalid library location")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temp = file.with_extension("tmp");
    let mut out = fs::File::create(&temp).map_err(|e| e.to_string())?;
    out.write_all(&serde_json::to_vec_pretty(store).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    out.sync_all().map_err(|e| e.to_string())?;
    drop(out);
    if file.exists() {
        fs::copy(file, file.with_extension("json.bak")).map_err(|e| e.to_string())?;
    }
    fs::rename(temp, file).map_err(|e| e.to_string())
}
fn log(store: &mut Store, name: &str, action: &str) {
    if !store.preferences.record_activity {
        return;
    }
    store.activity.insert(
        0,
        Activity {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.into(),
            action: action.into(),
            at: now(),
        },
    );
    store.activity.truncate(100);
}
fn mutate<T>(
    library: &Library,
    update: impl FnOnce(&mut Store) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = library
        .store
        .lock()
        .map_err(|_| "Library is busy".to_string())?;
    let mut next = guard.clone();
    let result = update(&mut next)?;
    save(&library.file, &next)?;
    *guard = next;
    Ok(result)
}
#[tauri::command]
fn snapshot(
    library: State<Library>,
    discovery: State<discovery::Discovery>,
) -> Result<Snapshot, String> {
    let store = library
        .store
        .lock()
        .map_err(|_| "Library is busy".to_string())?
        .clone();
    let detected_apps = discovery::current(&library, &discovery)?;
    let available_ids = detected_apps.iter().map(|a| a.catalog_id.clone()).collect();
    let missing_ids = store
        .apps
        .iter()
        .filter(|app| !Path::new(&app.path).is_file())
        .map(|app| app.id.clone())
        .collect();
    Ok(Snapshot {
        store,
        available_ids,
        detected_apps,
        missing_ids,
        download_directory: updates::download_directory(&library)?
            .to_string_lossy()
            .into_owned(),
        install_directory: packages::install_directory(&library)?
            .to_string_lossy()
            .into_owned(),
        data_directory: library
            .file
            .parent()
            .unwrap()
            .to_string_lossy()
            .into_owned(),
    })
}
fn add(
    library: &Library,
    name: String,
    path: PathBuf,
    catalog_id: Option<String>,
) -> Result<String, String> {
    let valid = launchable(&path)?;
    let path = valid.to_string_lossy().into_owned();
    mutate(library, |store| {
        if store
            .apps
            .iter()
            .any(|app| app.path.eq_ignore_ascii_case(&path))
        {
            return Err("This application is already in your library.".into());
        }
        let id = uuid::Uuid::new_v4().to_string();
        store.apps.push(LinkedApp {
            id: id.clone(),
            name: name.clone(),
            path,
            catalog_id,
            favorite: false,
            added_at: now(),
            last_launched: None,
        });
        log(store, &name, "Added to library");
        Ok(id)
    })
}
#[tauri::command]
fn link_catalog_app(
    id: String,
    library: State<Library>,
    discovery: State<discovery::Discovery>,
) -> Result<String, String> {
    let found = discovery::current(&library, &discovery)?
        .into_iter()
        .find(|a| a.catalog_id == id)
        .ok_or("No installation was found. Use Locate app to choose its file.")?;
    add(
        &library,
        discovery::name(&id).into(),
        found.path.into(),
        Some(id),
    )
}
#[tauri::command]
async fn pick_application(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title("Add an app or script to Wrakeeb Launcher")
            .add_filter("Applications and scripts", &["exe", "cmd", "bat", "ps1"])
            .blocking_pick_file();
        let Some(file) = selected else {
            return Ok(None);
        };
        let path = file
            .into_path()
            .map_err(|_| "Choose a local file".to_string())?;
        let valid = launchable(&path)?;
        let matching_id = [
            "dual-discord",
            "stickyn",
            "codex-presence",
            "coucou",
            "dual-steam",
        ]
        .iter()
        .find(|id| {
            candidate(id)
                .and_then(|(_, candidate_path)| executable(Path::new(candidate_path)).ok())
                .is_some_and(|candidate_path| {
                    candidate_path
                        .to_string_lossy()
                        .eq_ignore_ascii_case(&valid.to_string_lossy())
                })
        });
        let name = matching_id
            .and_then(|id| candidate(id).map(|(name, _)| name.to_string()))
            .unwrap_or_else(|| {
                path.file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
            });
        let library = app.state::<Library>();
        add(&library, name, valid, matching_id.map(|id| id.to_string())).map(Some)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn launch_application(id: String, app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let library = app.state::<Library>();
        launch_linked(&library, &id)
    })
    .await
    .map_err(|e| e.to_string())?
}
fn launch_command(path: &Path) -> Result<Command, String> {
    let path = launchable(path)?;
    let extension = path
        .extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase();
    let mut command = if extension == "ps1" {
        let mut process = Command::new(windows_tool("WindowsPowerShell/v1.0/powershell.exe")?);
        process.args(["-NoProfile", "-File"]).arg(&path);
        process
    } else if extension == "cmd" || extension == "bat" {
        let mut process = Command::new(windows_tool("cmd.exe")?);
        process.args(["/d", "/s", "/c"]);
        // cmd.exe does not use CRT argument escaping; the validated path is the sole command.
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            process.raw_arg(format!("\"\"{}\"\"", path.display()));
        }
        #[cfg(not(windows))]
        process.arg(&path);
        process
    } else {
        Command::new(&path)
    };
    command.current_dir(path.parent().ok_or("Invalid application directory")?);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x00000400);
    }
    Ok(command)
}
fn launch_linked(library: &Library, id: &str) -> Result<(), String> {
    let linked = library
        .store
        .lock()
        .map_err(|_| "Library is busy".to_string())?
        .apps
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or("Application is no longer linked")?;
    let mut command = launch_command(Path::new(&linked.path))?;
    let mut child = command
        .spawn()
        .map_err(|e| format!("Windows could not open this application: {e}"))?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    mutate(library, |store| {
        if let Some(item) = store.apps.iter_mut().find(|item| item.id == id) {
            item.last_launched = Some(now());
        }
        log(store, &linked.name, "Launch requested");
        Ok(())
    })
    .map_err(|e| format!("Application opened, but the launch history could not be saved: {e}"))
}
#[tauri::command]
fn set_favorite(id: String, favorite: bool, library: State<Library>) -> Result<(), String> {
    mutate(&library, |store| {
        store
            .apps
            .iter_mut()
            .find(|item| item.id == id)
            .ok_or("Application is no longer linked")?
            .favorite = favorite;
        Ok(())
    })
}
#[tauri::command]
fn remove_application(id: String, library: State<Library>) -> Result<(), String> {
    mutate(&library, |store| {
        let item = store
            .apps
            .iter()
            .find(|item| item.id == id)
            .cloned()
            .ok_or("Application is no longer linked")?;
        store.apps.retain(|item| item.id != id);
        log(store, &item.name, "Removed from library");
        Ok(())
    })
}
fn validate_preferences(preferences: &Preferences) -> Result<(), String> {
    if !["discord", "wrakeeb", "slate", "light", "obsidian", "midnight", "graphite"].contains(&preferences.theme.as_str())
        || !["default", "blue", "teal", "red", "amber"].contains(&preferences.accent.as_str())
    {
        return Err("Choose a supported theme.".into());
    }
    if preferences.custom_accent.as_ref().is_some_and(|v| v.len() != 7 || !v.starts_with('#') || !v[1..].chars().all(|c| c.is_ascii_hexdigit())) {
        return Err("Use a six-digit hex accent color.".into());
    }
    if !["grid", "list"].contains(&preferences.library_view.as_str()) || !(200..=360).contains(&preferences.card_size) {
        return Err("Choose a supported library size and view.".into());
    }
    if !["name", "recent", "added", "size", "custom"].contains(&preferences.library_sort.as_str()) || preferences.custom_order.len() > 10000 {
        return Err("Choose a supported library order.".into());
    }
    if let Some(path) = &preferences.download_directory {
        local_directory(Path::new(path))?;
    }
    if let Some(path) = &preferences.install_directory {
        local_directory(Path::new(path))?;
    }
    Ok(())
}
#[tauri::command]
fn save_preferences(preferences: Preferences, library: State<Library>) -> Result<(), String> {
    validate_preferences(&preferences)?;
    mutate(&library, |store| {
        store.preferences = preferences;
        Ok(())
    })
}
#[tauri::command]
fn reveal_application(id: String, library: State<Library>) -> Result<(), String> {
    let linked = library
        .store
        .lock()
        .map_err(|_| "Library is busy".to_string())?
        .apps
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or("Application is no longer linked")?;
    let path = launchable(Path::new(&linked.path))?;
    let explorer =
        PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows directory unavailable")?)
            .join("explorer.exe");
    let mut child = Command::new(explorer)
        .arg(path.parent().ok_or("Invalid directory")?)
        .spawn()
        .map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.get(1).map(String::as_str) == Some("--apply-launcher-update") {
        let result = args
            .get(2)
            .ok_or_else(|| "Missing update request".to_string())
            .and_then(|path| updates::run_helper(Path::new(path)));
        std::process::exit(if result.is_ok() { 0 } else { 1 });
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let directory = std::env::current_exe()?
                .parent()
                .ok_or("Executable directory unavailable")?
                .join("data");
            let file = directory.join("library.json");
            app.manage(updates::Updates::new(&directory));
            app.manage(packages::Packages::new(&directory));
            app.manage(discovery::Discovery::default());
            // Preserve unreadable data: commands return this startup error instead of overwriting it.
            let initial = read_store(&file);
            match initial {
                Ok(store) => {
                    app.manage(Library {
                        file,
                        store: Mutex::new(store),
                    });
                }
                Err(error) => {
                    app.manage(StartupError(error));
                }
            }
            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("Wrakeeb Launcher")
            .inner_size(1280.0, 860.0)
            .min_inner_size(960.0, 600.0)
            .decorations(false)
            .shadow(true)
            .center()
            .background_color(tauri::window::Color(22, 23, 26, 255))
            .data_directory(directory.join("webview"))
            .build()?;
            shell::setup(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            discovery::scan_installed_apps,
            discovery::locate_catalog_app,
            discovery::reveal_catalog_app,
            clear_activity,
            shell::hide_to_tray,
            shell::show_launcher,
            shell::create_application_shortcut,
            shell::export_preferences,
            shell::import_preferences,
            shell::storage_capacity,
            shell::open_launcher_data,
            shell::exit_launcher,
            shell::get_shell_status,
            shell::open_storage_directory,
            packages::download_latest_project,
            packages::get_project_release,
            packages::get_package_status,
            packages::download_project_asset,
            packages::uninstall_project,
            open_windows_uninstall,
            packages::install_project_package,
            packages::cancel_package_download,
            packages::choose_install_directory,
            packages::open_project_page,
            packages::create_desktop_shortcut,
            get_snapshot,
            link_catalog_app,
            pick_application,
            launch_application,
            set_favorite,
            remove_application,
            save_preferences,
            reveal_application,
            choose_download_directory,
            open_download_directory,
            open_release_page,
            updates::confirm_frontend_ready,
            updates::get_update_status,
            updates::check_launcher_updates,
            updates::download_launcher_update,
            updates::cancel_launcher_download,
            updates::install_launcher_update
        ])
        .run(tauri::generate_context!())
        .expect("Could not start Wrakeeb Launcher");
}
struct StartupError(String);
#[tauri::command]
fn clear_activity(library: State<Library>) -> Result<(), String> {
    mutate(&library, |store| {
        store.activity.clear();
        Ok(())
    })
}
pub fn atomic_json(file: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = file.parent().ok_or("Invalid data directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let temporary = parent.join(format!(".wrakeeb-{}.tmp", uuid::Uuid::new_v4()));
    let mut output = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temporary)
        .map_err(|e| e.to_string())?;
    output
        .write_all(&serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    output.sync_all().map_err(|e| e.to_string())?;
    drop(output);
    fs::rename(&temporary, file).map_err(|e| {
        let _ = fs::remove_file(temporary);
        e.to_string()
    })
}
pub fn local_directory(path: &Path) -> Result<PathBuf, String> {
    if !path.is_absolute() || path.to_string_lossy().starts_with(r"\\") {
        return Err("Choose a folder on a local drive.".into());
    }
    let canonical = path
        .canonicalize()
        .map_err(|_| "This folder is unavailable.")?;
    if !canonical.is_dir() {
        return Err("Choose a folder, not a file.".into());
    }
    let text = canonical.to_string_lossy();
    if text.starts_with(r"\\?\UNC\") {
        return Err("Choose a folder on a local drive.".into());
    }
    Ok(PathBuf::from(text.strip_prefix(r"\\?\").unwrap_or(&text)))
}
#[tauri::command]
async fn choose_download_directory(app: tauri::AppHandle, temporary: Option<bool>) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let library = app.state::<Library>();
        let default = updates::download_directory(&library)?;
        let selected = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title("Choose your download folder")
            .set_directory(default)
            .blocking_pick_folder();
        let Some(selected) = selected else {
            return Ok(None);
        };
        let folder = local_directory(&selected.into_path().map_err(|_| "Choose a local folder")?)?;
        let probe = folder.join(format!(".wrakeeb-write-check-{}", uuid::Uuid::new_v4()));
        let test = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&probe)
            .map_err(|_| "This folder is not writable.")?;
        drop(test);
        fs::remove_file(probe).map_err(|e| e.to_string())?;
        let path = folder.to_string_lossy().into_owned();
        if !temporary.unwrap_or(false) {
            mutate(&library, |store| {
                store.preferences.download_directory = Some(path.clone());
                Ok(())
            })?;
        }
        Ok(Some(path))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn open_windows_uninstall() -> Result<(), String> {
    Command::new(windows_tool("explorer.exe")?).arg("ms-settings:appsfeatures")
        .spawn().map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn open_download_directory(library: State<Library>) -> Result<(), String> {
    let path = updates::download_directory(&library)?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    let directory = local_directory(&path)?;
    let explorer =
        PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows directory unavailable")?)
            .join("explorer.exe");
    let mut child = Command::new(explorer)
        .arg(directory)
        .spawn()
        .map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
#[tauri::command]
fn open_release_page() -> Result<(), String> {
    let executable =
        PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows directory unavailable")?)
            .join("System32/rundll32.exe");
    let mut command = Command::new(executable);
    command.arg("url.dll,FileProtocolHandler").arg(format!(
        "https://github.com/{}/releases",
        updates::REPOSITORY
    ));
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}
#[tauri::command]
fn get_snapshot(app: tauri::AppHandle) -> Result<Snapshot, String> {
    if let Some(error) = app.try_state::<StartupError>() {
        return Err(error.0.clone());
    }
    snapshot(app.state::<Library>(), app.state::<discovery::Discovery>())
}

#[cfg(test)]
mod tests {
    use super::*;
    pub(crate) fn scratch() -> PathBuf {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("target/test-fixtures")
            .join(uuid::Uuid::new_v4().to_string());
        fs::create_dir_all(&root).unwrap();
        root
    }
    #[test]
    fn legacy_preferences_default_new_fields_without_losing_existing_choices() {
        let prefs: Preferences = serde_json::from_str(r#"{"theme":"slate","compact":true,"closeToTray":true}"#).unwrap();
        assert_eq!(prefs.theme, "slate"); assert!(prefs.compact && prefs.close_to_tray);
        assert_eq!(prefs.card_size, 260); assert_eq!(prefs.library_view, "grid"); assert!(prefs.notifications);
        assert!(validate_preferences(&prefs).is_ok());
        let mut invalid = prefs; invalid.custom_accent = Some("#oops!!".into()); assert!(validate_preferences(&invalid).is_err());
    }
    #[test]
    fn invalid_executable_and_relative_paths_are_rejected() {
        assert!(executable(Path::new("program.exe")).is_err());
        let root = scratch();
        let file = root.join("program.exe");
        fs::write(&file, b"not an exe").unwrap();
        assert!(executable(&file).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn store_roundtrip_backup_and_corruption_preservation() {
        let root = scratch();
        let file = root.join("library.json");
        let mut store = Store::default();
        save(&file, &store).unwrap();
        store.preferences.compact = true;
        save(&file, &store).unwrap();
        assert!(read_store(&file).unwrap().preferences.compact);
        assert!(
            !read_store(&file.with_extension("json.bak"))
                .unwrap()
                .preferences
                .compact
        );
        fs::write(&file, "broken").unwrap();
        assert!(read_store(&file).is_err());
        assert_eq!(fs::read_to_string(&file).unwrap(), "broken");
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn failed_mutation_does_not_change_memory() {
        let root = scratch();
        let library = Library {
            file: root.join("library.json"),
            store: Mutex::new(Store::default()),
        };
        let result: Result<(), String> = mutate(&library, |store| {
            store.preferences.compact = true;
            Err("failed".into())
        });
        assert!(result.is_err());
        assert!(!library.store.lock().unwrap().preferences.compact);
        assert!(!library.file.exists());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn newer_schema_is_not_overwritten() {
        let root = scratch();
        let file = root.join("library.json");
        let mut store = Store::default();
        store.schema = 2;
        save(&file, &store).unwrap();
        assert!(read_store(&file).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn canonical_windows_path_remains_valid_on_second_validation() {
        let current = std::env::current_exe().unwrap();
        let validated = executable(&current).unwrap();
        assert_eq!(validated, executable(&validated).unwrap());
        assert!(!validated.to_string_lossy().starts_with(r"\\?\"));
    }
    #[test]
    fn actual_launch_uses_registered_executable_and_preserves_files() {
        let root = scratch();
        let source = root.join("fixture.rs");
        let program = root.join("fixture.exe");
        fs::write(
            &source,
            "fn main() { std::fs::write(\"launch-marker.txt\", \"opened\").unwrap(); }",
        )
        .unwrap();
        assert!(Command::new("rustc")
            .arg(&source)
            .arg("-o")
            .arg(&program)
            .status()
            .unwrap()
            .success());
        let library = Library {
            file: root.join("data/library.json"),
            store: Mutex::new(Store::default()),
        };
        let id = add(&library, "QA fixture".into(), program.clone(), None).unwrap();
        assert!(add(&library, "Duplicate".into(), program.clone(), None).is_err());
        assert!(launch_linked(&library, "unknown-id").is_err());
        launch_linked(&library, &id).unwrap();
        for _ in 0..100 {
            if root.join("launch-marker.txt").exists() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        assert_eq!(
            fs::read_to_string(root.join("launch-marker.txt")).unwrap(),
            "opened"
        );
        assert!(read_store(&library.file).unwrap().apps[0]
            .last_launched
            .is_some());
        assert!(program.exists());
        // Give the short-lived child time to release its executable before cleanup on Windows.
        for _ in 0..100 {
            if fs::remove_file(&program).is_ok() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn command_scripts_run_from_paths_with_spaces_without_a_visible_console() {
        use std::os::windows::process::CommandExt;
        let root = scratch();
        let folder = root.join("folder with spaces");
        fs::create_dir(&folder).unwrap();
        for extension in ["cmd", "bat"] {
            let path = folder.join(format!("test script.{extension}"));
            fs::write(
                &path,
                format!("@echo off\r\necho worked>launched-{extension}.txt\r\n"),
            )
            .unwrap();
            let mut command = launch_command(&path).unwrap();
            command.creation_flags(0x08000000);
            assert!(command.status().unwrap().success());
            assert_eq!(
                fs::read_to_string(folder.join(format!("launched-{extension}.txt")))
                    .unwrap()
                    .trim(),
                "worked"
            );
        }
        let ps = folder.join("test script.ps1");
        fs::write(&ps, "Write-Output 'sample'").unwrap();
        let powershell = launch_command(&ps).unwrap();
        assert!(powershell.get_args().any(|a| a == "-File"));
        assert!(!powershell.get_args().any(|a| a == "-ExecutionPolicy"));
        let rejected = folder.join("not%allowed.cmd");
        fs::write(&rejected, "@echo off").unwrap();
        assert!(launch_command(&rejected).is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
