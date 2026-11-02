use crate::{candidate, launchable, now, Library};
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

pub const IDS: [&str; 8] = [
    "dual-steam",
    "dual-discord",
    "stickyn",
    "codex-presence",
    "coucou",
    "pulsemute",
    "brightness-control",
    "launcher-demo",
];
pub fn name(id: &str) -> &str {
    match id {
        "dual-steam" => "Dual Steam",
        "dual-discord" => "Dual Discord",
        "stickyn" => "StickyN",
        "codex-presence" => "Codex Presence",
        "coucou" => "Coucou",
        "pulsemute" => "PulseMute",
        "brightness-control" => "Brightness Control",
        "launcher-demo" => "Launcher Demo",
        _ => "Application",
    }
}
fn filenames(id: &str) -> &[&str] {
    match id {
        "dual-steam" => &["Dual Steam.exe"],
        "dual-discord" => &["Dual Discord.exe"],
        "stickyn" => &["StickyN.exe"],
        "codex-presence" => &["Codex Presence.exe", "Codex Discord Rich Presence.exe"],
        "coucou" => &["coucou.exe"],
        "pulsemute" => &["PulseMute.exe"],
        "brightness-control" => &["BrightnessControl.exe", "Brightness Control.exe"],
        "launcher-demo" => &["Wrakeeb-Launcher-Demo-Windows-x64.exe"],
        _ => &[],
    }
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedApp {
    pub catalog_id: String,
    pub path: String,
    pub source: String,
    pub executable_bytes: u64,
}
#[derive(Default)]
pub struct Discovery {
    entries: Mutex<Vec<DetectedApp>>,
    busy: std::sync::atomic::AtomicBool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
    found: usize,
    folders_checked: usize,
    checked_at: u64,
    limited: bool,
}
fn detected(id: &str, path: &Path, source: &str) -> Option<DetectedApp> {
    let valid = launchable(path).ok()?;
    Some(DetectedApp {
        catalog_id: id.into(),
        executable_bytes: fs::metadata(&valid).ok()?.len(),
        path: valid.to_string_lossy().into_owned(),
        source: source.into(),
    })
}
pub fn current(library: &Library, discovery: &Discovery) -> Result<Vec<DetectedApp>, String> {
    let store = library.store.lock().map_err(|_| "Library is busy")?;
    let mut entries = BTreeMap::new();
    for item in discovery
        .entries
        .lock()
        .map_err(|_| "Discovery is busy")?
        .iter()
    {
        if let Some(valid) = detected(&item.catalog_id, Path::new(&item.path), &item.source) {
            entries.insert(item.catalog_id.clone(), valid);
        }
    }
    for id in IDS {
        if let Some((_, path)) = candidate(id) {
            if let Some(found) = detected(id, Path::new(path), "Known application folder") {
                entries.insert(id.into(), found);
            }
        }
    }
    for item in &store.installations {
        if let Some(found) = detected(
            &item.catalog_id,
            Path::new(&item.entry),
            "Launcher installation",
        ) {
            entries.insert(item.catalog_id.clone(), found);
        }
    }
    for item in &store.apps {
        if let Some(id) = &item.catalog_id {
            if let Some(found) = detected(id, Path::new(&item.path), "Your library") {
                entries.insert(id.clone(), found);
            }
        }
    }
    Ok(entries.into_values().collect())
}
fn skip(path: &Path) -> bool {
    let Ok(meta) = fs::symlink_metadata(path) else {
        return true;
    };
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if meta.file_attributes() & 0x400 != 0 {
            return true;
        }
    }
    meta.file_type().is_symlink()
        || path.file_name().is_some_and(|n| {
            [
                "node_modules",
                ".git",
                "backups",
                "runtime",
                "target",
                "windows",
                "webview",
                "$recycle.bin",
            ]
            .contains(&n.to_string_lossy().to_ascii_lowercase().as_str())
        })
}
fn walk(roots: Vec<PathBuf>) -> (Vec<DetectedApp>, usize, bool) {
    let mut found = BTreeMap::new();
    let mut seen = HashSet::new();
    let mut stack: Vec<_> = roots.into_iter().map(|p| (p, 0usize)).collect();
    let mut count = 0;
    while let Some((folder, depth)) = stack.pop() {
        if count >= 2500 {
            return (found.into_values().collect(), count, true);
        }
        if skip(&folder) || !seen.insert(folder.to_string_lossy().to_ascii_lowercase()) {
            continue;
        }
        count += 1;
        let Ok(children) = fs::read_dir(&folder) else {
            continue;
        };
        for child in children.flatten().take(1500) {
            let path = child.path();
            let Ok(kind) = child.file_type() else {
                continue;
            };
            if kind.is_dir() && depth < 3 {
                stack.push((path, depth + 1));
            } else if kind.is_file() {
                for id in IDS {
                    if filenames(id)
                        .iter()
                        .any(|f| child.file_name().to_string_lossy().eq_ignore_ascii_case(f))
                    {
                        if let Some(item) = detected(id, &path, "Local folder scan") {
                            found.entry(id.to_string()).or_insert(item);
                        }
                    }
                }
            }
        }
    }
    (found.into_values().collect(), count, false)
}
fn windows_locations(include_downloads: bool) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        roots.push(PathBuf::from(local).join("Programs"));
    }
    for name in ["ProgramFiles", "ProgramFiles(x86)"] {
        if let Some(folder) = std::env::var_os(name) {
            roots.push(folder.into());
        }
    }
    if let Some(profile) = std::env::var_os("USERPROFILE") {
        let profile = PathBuf::from(profile);
        roots.push(profile.join("Desktop"));
        if include_downloads {
            roots.push(profile.join("Downloads"));
        }
    }
    // Read only Windows installation locations; never run registry commands or scan entire drives.
    let script = r"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); $paths=@(); foreach($root in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*')) { Get-ItemProperty -Path $root -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '^(Dual Steam|Dual Discord|StickyN|Codex Presence|Codex Discord Rich Presence|PulseMute|Brightness Control|Coucou)( |$)' } | ForEach-Object { if($_.InstallLocation){$paths += $_.InstallLocation} } }; $paths += [Environment]::GetFolderPath('Desktop'); $paths | ConvertTo-Json -Compress";
    if let Ok(tool) = crate::windows_tool("WindowsPowerShell/v1.0/powershell.exe") {
        let mut process = std::process::Command::new(tool);
        process.args(["-NoProfile", "-NonInteractive", "-Command", script]);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            process.creation_flags(0x08000000);
        }
        if let Ok(output) = process.output() {
            if output.stdout.len() < 65536 {
                if let Ok(value) = serde_json::from_slice::<serde_json::Value>(&output.stdout) {
                    match value {
                        serde_json::Value::String(path) => roots.push(path.into()),
                        serde_json::Value::Array(paths) => {
                            roots.extend(paths.iter().filter_map(|p| p.as_str().map(PathBuf::from)))
                        }
                        _ => {}
                    }
                }
            }
        }
    }
    roots
        .into_iter()
        .filter(|p| p.is_absolute() && !p.to_string_lossy().starts_with(r"\\"))
        .collect()
}
#[tauri::command]
pub async fn scan_installed_apps(app: tauri::AppHandle) -> Result<ScanReport, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let discovery = app.state::<Discovery>();
        if discovery
            .busy
            .swap(true, std::sync::atomic::Ordering::SeqCst)
        {
            return Err("An application scan is already running.".into());
        }
        struct Busy<'a>(&'a std::sync::atomic::AtomicBool);
        impl Drop for Busy<'_> {
            fn drop(&mut self) {
                self.0.store(false, std::sync::atomic::Ordering::SeqCst);
            }
        }
        let _busy = Busy(&discovery.busy);
        let library = app.state::<Library>();
        let include = library
            .store
            .lock()
            .map_err(|_| "Library is busy")?
            .preferences
            .scan_downloads;
        let mut roots = windows_locations(include);
        roots.push(crate::packages::install_directory(&library)?);
        let (entries, count, limited) = walk(roots);
        *discovery.entries.lock().map_err(|_| "Discovery is busy")? = entries;
        let count_found = current(&library, &discovery)?.len();
        Ok(ScanReport {
            found: count_found,
            folders_checked: count,
            checked_at: now(),
            limited,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn locate_catalog_app(
    id: String,
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let allowed = filenames(&id);
        if allowed.is_empty() {
            return Err("Use Add application to link this file.".into());
        }
        let Some(file) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title(format!("Locate {}", name(&id)))
            .add_filter("Windows application", &["exe"])
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = file.into_path().map_err(|_| "Choose a local application")?;
        if !allowed.iter().any(|expected| {
            path.file_name()
                .is_some_and(|n| n.to_string_lossy().eq_ignore_ascii_case(expected))
        }) {
            return Err(format!("Choose {} for this project.", allowed.join(" or ")));
        }
        let valid = launchable(&path)?;
        let library = app.state::<Library>();
        let existing = library
            .store
            .lock()
            .map_err(|_| "Library is busy")?
            .apps
            .iter()
            .find(|a| a.catalog_id.as_deref() == Some(&id))
            .map(|a| a.id.clone());
        if let Some(existing) = existing {
            crate::mutate(&library, |store| {
                if let Some(link) = store.apps.iter_mut().find(|a| a.id == existing) {
                    link.path = valid.to_string_lossy().into_owned();
                }
                Ok(())
            })?;
            Ok(Some(existing))
        } else {
            crate::add(&library, name(&id).into(), valid, Some(id)).map(Some)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn reveal_catalog_app(id: String, app: tauri::AppHandle) -> Result<(), String> {
    let found = current(&app.state::<Library>(), &app.state::<Discovery>())?
        .into_iter()
        .find(|a| a.catalog_id == id)
        .ok_or("Locate the application first.")?;
    let path = PathBuf::from(found.path);
    let explorer = PathBuf::from(std::env::var_os("WINDIR").ok_or("Windows folder unavailable")?)
        .join("explorer.exe");
    std::process::Command::new(explorer)
        .arg(path.parent().ok_or("Application directory unavailable")?)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scan_is_bounded_and_rejects_fake_executables() {
        let root = crate::tests::scratch();
        fs::create_dir_all(root.join("Nested/App")).unwrap();
        fs::write(root.join("Nested/App/Dual Steam.exe"), "not an exe").unwrap();
        let (found, checked, limited) = walk(vec![root.clone()]);
        assert!(found.is_empty());
        assert_eq!(checked, 3);
        assert!(!limited);
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn known_dual_steam_path_is_available_without_a_background_scan() {
        assert_eq!(filenames("dual-steam"), &["Dual Steam.exe"]);
        assert!(crate::candidate("dual-steam").is_some());
    }
}
