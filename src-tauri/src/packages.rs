use crate::{atomic_json, local_directory, mutate, now, updates, Library};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

const MAX_DOWNLOAD: u64 = 512 * 1024 * 1024;
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Installation {
    pub catalog_id: String,
    pub version: String,
    pub directory: String,
    pub entry: String,
    pub sha256: String,
    pub package_name: String,
    pub package_bytes: u64,
    pub installed_bytes: u64,
    pub installed_at: u64,
}
pub struct Project {
    repo: &'static str,
    tag: Option<&'static str>,
    entry: Option<&'static str>,
}
fn project(id: &str) -> Result<Project, String> {
    let (repo, tag, entry) = match id {
        "launcher-demo" => (
            "w-rakeeb/wrakeeb-launcher",
            Some("demo-v1.0.0"),
            Some("Wrakeeb-Launcher-Demo-Windows-x64.exe"),
        ),
        "demo-script" => (
            "w-rakeeb/wrakeeb-launcher",
            Some("demo-v1.0.0"),
            Some("Launcher-Demo.cmd"),
        ),
        "dual-discord" => ("w-rakeeb/dual-discord", None, Some("Dual Discord.exe")),
        "codex-presence" => (
            "w-rakeeb/Codex-Discord-Rich-Presence",
            None,
            Some("Codex Presence.exe"),
        ),
        "stickyn" => ("w-rakeeb/StickyN", None, Some("StickyN.exe")),
        "pulsemute" => ("w-rakeeb/PulseMute", None, Some("PulseMute.exe")),
        "dual-steam" => ("w-rakeeb/dual-steam", None, Some("Dual Steam.exe")),
        "brightness-control" => (
            "w-rakeeb/brightness-control",
            None,
            Some("BrightnessControl.exe"),
        ),
        "coucou" => ("w-rakeeb/coucou-windows", None, None),
        "vencord-repair" => ("w-rakeeb/vencord-auto-repair", None, None),
        _ => return Err("This project has no approved GitHub source.".into()),
    };
    Ok(Project { repo, tag, entry })
}
fn preferred_package(p: &Project, name: &str) -> bool {
    match p.entry {
        Some("Dual Steam.exe") => name == "Dual-Steam-Windows.zip",
        Some("Dual Discord.exe") => name == "Dual-Discord-Windows.zip",
        Some("Codex Presence.exe") => {
            name.starts_with("Codex-Discord-Rich-Presence-") && name.ends_with("-windows-x64.zip")
        }
        Some("BrightnessControl.exe") => name == "Brightness.Control.Universal.zip",
        Some("Wrakeeb-Launcher-Demo-Windows-x64.exe") => name == "Launcher-Demo-1.0.0.zip",
        Some(entry) => name == entry,
        None => {
            p.repo == "w-rakeeb/vencord-auto-repair" && name == "Vencord-Auto-Repair-Windows.zip"
        }
    }
}
fn approved_package(p: &Project, name: &str) -> bool {
    p.entry
        .is_some_and(|entry| name == entry || preferred_package(p, name))
}
fn directory_bytes(root: &Path) -> Result<u64, String> {
    let mut total = 0u64;
    let mut pending = vec![root.to_path_buf()];
    while let Some(folder) = pending.pop() {
        for item in fs::read_dir(folder).map_err(|e| e.to_string())? {
            let item = item.map_err(|e| e.to_string())?;
            let metadata = item.metadata().map_err(|e| e.to_string())?;
            if metadata.is_dir() {
                pending.push(item.path());
            } else {
                total = total
                    .checked_add(metadata.len())
                    .ok_or("Installed size overflow")?;
            }
        }
    }
    Ok(total)
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    id: u64,
    name: String,
    size: u64,
    digest: String,
    url: String,
    installable: bool,
    downloads: u64,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRelease {
    repository: String,
    description: String,
    version: String,
    published_at: String,
    notes: String,
    assets: Vec<Asset>,
    checked_at: u64,
    recommended_asset_id: Option<u64>,
    license: String,
}
fn json(url: &str) -> Result<serde_json::Value, String> {
    let response = updates::client()?
        .get(url)
        .timeout(Duration::from_secs(20))
        .header("Accept", "application/vnd.github+json")
        .send()
        .map_err(|_| "GitHub could not be reached. Check your connection and retry.")?;
    match response.status().as_u16() {
        404 => return Err("No public release is available for this project.".into()),
        403 | 429 => return Err("GitHub's request limit was reached. Try again later.".into()),
        200 => {}
        _ => return Err("GitHub could not provide this release.".into()),
    }
    let mut bytes = Vec::new();
    response
        .take(2_000_001)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > 2_000_000 {
        return Err("GitHub metadata is too large.".into());
    }
    serde_json::from_slice(&bytes).map_err(|_| "GitHub returned unreadable metadata.".into())
}
fn safe_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() < 180
        && !name.starts_with('.')
        && name
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b" ._()-".contains(&c))
        && !name.ends_with([' ', '.'])
}
fn parse_release(p: &Project, value: &serde_json::Value) -> Result<ProjectRelease, String> {
    if value["draft"].as_bool() != Some(false) || value["prerelease"].as_bool() != Some(false) {
        return Err("Only published stable packages are supported.".into());
    }
    let version = value["tag_name"]
        .as_str()
        .filter(|v| safe_name(v))
        .ok_or("Invalid release tag")?;
    let assets: Vec<Asset> = value["assets"]
        .as_array()
        .ok_or("No release files are available")?
        .iter()
        .filter_map(|a| {
            let name = a["name"].as_str()?;
            let size = a["size"].as_u64()?;
            let digest = a["digest"].as_str()?.strip_prefix("sha256:")?;
            let url = a["browser_download_url"].as_str()?;
            if !safe_name(name)
                || size == 0
                || size > MAX_DOWNLOAD
                || digest.len() != 64
                || !digest.bytes().all(|c| c.is_ascii_hexdigit())
                || url
                    != format!(
                        "https://github.com/{}/releases/download/{version}/{name}",
                        p.repo
                    )
            {
                return None;
            }
            let installable = approved_package(p, name);
            Some(Asset {
                id: a["id"].as_u64()?,
                name: name.into(),
                size,
                digest: digest.to_ascii_lowercase(),
                url: url.into(),
                installable,
                downloads: a["download_count"].as_u64().unwrap_or(0),
            })
        })
        .collect();
    Ok(ProjectRelease {
        repository: p.repo.into(),
        description: String::new(),
        version: version.into(),
        published_at: value["published_at"].as_str().unwrap_or("").into(),
        notes: value["body"]
            .as_str()
            .unwrap_or("")
            .chars()
            .take(16000)
            .collect(),
        recommended_asset_id: assets
            .iter()
            .find(|a| preferred_package(p, &a.name))
            .or_else(|| assets.iter().find(|a| a.installable))
            .map(|a| a.id),
        license: "See repository".into(),
        assets,
        checked_at: now(),
    })
}
fn release(id: &str) -> Result<ProjectRelease, String> {
    let p = project(id)?;
    let endpoint = match p.tag {
        Some(tag) => format!("tags/{tag}"),
        None => "latest".into(),
    };
    parse_release(
        &p,
        &json(&format!(
            "https://api.github.com/repos/{}/releases/{endpoint}",
            p.repo
        ))?,
    )
}
#[tauri::command]
pub async fn get_project_release(
    id: String,
    refresh: Option<bool>,
) -> Result<ProjectRelease, String> {
    tauri::async_runtime::spawn_blocking(move || {
        static CACHE: std::sync::OnceLock<
            Mutex<std::collections::HashMap<String, ProjectRelease>>,
        > = std::sync::OnceLock::new();
        let cache = CACHE.get_or_init(|| Mutex::new(std::collections::HashMap::new()));
        if refresh != Some(true) {
            if let Ok(values) = cache.lock() {
                if let Some(cached) = values.get(&id) {
                    if now().saturating_sub(cached.checked_at) < 600 {
                        return Ok(cached.clone());
                    }
                }
            }
        }
        let mut result = release(&id)?;
        if let Ok(repo) = json(&format!(
            "https://api.github.com/repos/{}",
            result.repository
        )) {
            result.description = repo["description"]
                .as_str()
                .unwrap_or("")
                .chars()
                .take(1000)
                .collect();
            result.license = repo["license"]["spdx_id"]
                .as_str()
                .filter(|v| *v != "NOASSERTION")
                .unwrap_or("See repository")
                .into();
        }
        if let Ok(mut values) = cache.lock() {
            values.insert(id, result.clone());
        }
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PackageStatus {
    stage: String,
    project_id: String,
    name: String,
    version: String,
    message: String,
    downloaded_bytes: u64,
    total_bytes: u64,
    path: Option<String>,
    asset: Option<Asset>,
}
pub struct Packages {
    status: Mutex<PackageStatus>,
    file: PathBuf,
    busy: AtomicBool,
    cancel: AtomicBool,
}
impl Packages {
    pub fn new(data: &Path) -> Self {
        let file = data.join("package-operation.json");
        let mut status: PackageStatus = fs::read(&file)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .unwrap_or_default();
        if ["downloading", "verifying", "installing"].contains(&status.stage.as_str()) {
            status.stage = "interrupted".into();
            status.message =
                "The previous operation was interrupted. Download the package again to retry."
                    .into();
            status.path = None;
        }
        Self {
            status: Mutex::new(status),
            file,
            busy: AtomicBool::new(false),
            cancel: AtomicBool::new(false),
        }
    }
    fn set(
        &self,
        app: &tauri::AppHandle,
        update: impl FnOnce(&mut PackageStatus),
        persist: bool,
    ) -> Result<PackageStatus, String> {
        let mut state = self.status.lock().map_err(|_| "Package status is busy")?;
        update(&mut state);
        if persist {
            atomic_json(&self.file, &*state)?;
        }
        let _ = app.emit("package:status", &*state);
        Ok(state.clone())
    }
}
struct Busy<'a>(&'a AtomicBool);
impl Drop for Busy<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
fn begin(p: &Packages) -> Result<Busy<'_>, String> {
    if p.busy.swap(true, Ordering::SeqCst) {
        Err("Finish the current package operation first.".into())
    } else {
        Ok(Busy(&p.busy))
    }
}
#[tauri::command]
pub fn get_package_status(packages: State<Packages>) -> Result<PackageStatus, String> {
    packages
        .status
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "Package status is busy".into())
}
#[tauri::command]
pub fn cancel_package_download(packages: State<Packages>) {
    packages.cancel.store(true, Ordering::SeqCst);
}
fn verify(path: &Path, asset: &Asset) -> Result<(), String> {
    if fs::metadata(path)
        .map_err(|_| "Download the package again; its file is missing.")?
        .len()
        != asset.size
        || updates::hash(path)? != asset.digest
    {
        return Err("Package checksum mismatch. Nothing was installed.".into());
    }
    Ok(())
}
#[tauri::command]
pub async fn download_project_asset(
    id: String,
    asset_id: u64,
    app: tauri::AppHandle,
) -> Result<PackageStatus, String> {
    transfer(id, Some(asset_id), app).await
}
#[tauri::command]
pub async fn download_latest_project(
    id: String,
    app: tauri::AppHandle,
) -> Result<PackageStatus, String> {
    transfer(id, None, app).await
}
async fn transfer(
    id: String,
    asset_id: Option<u64>,
    app: tauri::AppHandle,
) -> Result<PackageStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = app.state::<Packages>(); let _busy = begin(&p)?; p.cancel.store(false, Ordering::SeqCst);
        p.set(&app, |s| *s = PackageStatus { stage: "downloading".into(), project_id: id.clone(), message: "Checking the latest GitHub package…".into(), ..Default::default() }, true)?;
        let result = (|| {
            let release = release(&id)?;
            let selected = asset_id.or(release.recommended_asset_id).ok_or("No recommended package is published. Open GitHub releases to choose a file.")?;
            let asset = release.assets.iter().find(|a| a.id == selected).ok_or("This release file changed. Refresh the release details.")?.clone();
            p.set(&app, |s| { *s = PackageStatus { stage: "downloading".into(), project_id: id.clone(), name: asset.name.clone(), version: release.version.clone(), message: "Downloading from GitHub…".into(), total_bytes: asset.size, asset: Some(asset.clone()), ..Default::default() }; }, true)?;
            let base = updates::download_directory(&app.state::<Library>())?; fs::create_dir_all(&base).map_err(|e| e.to_string())?;
            let directory = local_directory(&base)?.join(&id).join("Downloads"); fs::create_dir_all(&directory).map_err(|e| e.to_string())?; reject_links(&directory)?;
            let destination = directory.join(format!("{}-{}-{}", release.version, &asset.digest[..8], asset.name));
            if destination.exists() { verify(&destination, &asset)?; }
            else {
                let partial = directory.join(format!(".{}.part", uuid::Uuid::new_v4()));
                let transfer = (|| {
                    let mut response = updates::client()?.get(&asset.url).send().map_err(|_| "The download could not start.")?.error_for_status().map_err(|_| "GitHub could not serve this file.")?;
                    let mut file = fs::OpenOptions::new().create_new(true).write(true).open(&partial).map_err(|e| e.to_string())?;
                    let mut count = 0; let mut buffer = [0u8; 65536]; let mut tick = Instant::now();
                    loop {
                        if p.cancel.load(Ordering::SeqCst) { return Err("Download cancelled. You can retry from the project's release files.".to_string()); }
                        let bytes = response.read(&mut buffer).map_err(|_| "The transfer was interrupted. Retry the download.")?; if bytes == 0 { break; }
                        count += bytes as u64; if count > asset.size { return Err("The package exceeded its expected size.".into()); }
                        file.write_all(&buffer[..bytes]).map_err(|_| "The download folder is full or unavailable.")?;
                        if tick.elapsed() >= Duration::from_millis(100) { p.set(&app, |s| s.downloaded_bytes = count, false)?; tick = Instant::now(); }
                    }
                    file.sync_all().map_err(|e| e.to_string())?; drop(file);
                    p.set(&app, |s| { s.stage = "verifying".into(); s.message = "Verifying the package checksum…".into(); }, false)?;
                    verify(&partial, &asset)?; fs::rename(&partial, &destination).map_err(|e| e.to_string())?; Ok::<_, String>(())
                })();
                if transfer.is_err() { let _ = fs::remove_file(&partial); } transfer?;
            }
            p.set(&app, |s| { s.stage = "downloaded".into(); s.message = if asset.installable { "Verified package ready to install." } else { "Download verified. Open the download folder to use this file." }.into(); s.downloaded_bytes = asset.size; s.path = Some(destination.to_string_lossy().into_owned()); }, true)
        })();
        match result { Ok(status) => Ok(status), Err(error) => p.set(&app, |s| { s.stage = if p.cancel.load(Ordering::SeqCst) { "cancelled" } else { "error" }.into(); s.message = error; s.path = None; }, true) }
    }).await.map_err(|e| e.to_string())?
}
pub fn install_directory(library: &Library) -> Result<PathBuf, String> {
    let selected = library
        .store
        .lock()
        .map_err(|_| "Library is busy")?
        .preferences
        .install_directory
        .clone();
    selected
        .map(PathBuf::from)
        .map(Ok)
        .unwrap_or_else(default_storage_root)
}
pub fn default_storage_root() -> Result<PathBuf, String> {
    Ok(PathBuf::from(
        std::env::var_os("LOCALAPPDATA")
            .ok_or("Your Windows user application folder is unavailable")?,
    )
    .join("Programs")
    .join("Wrakeeb Launcher"))
}
pub fn operation_directory(packages: &Packages, library: &Library) -> Result<PathBuf, String> {
    let path = packages
        .status
        .lock()
        .map_err(|_| "Package status is busy")?
        .path
        .clone();
    match path {
        Some(path) => PathBuf::from(path)
            .parent()
            .map(Path::to_path_buf)
            .ok_or("The package folder is unavailable.".into()),
        None => updates::download_directory(library),
    }
}

fn reject_links(path: &Path) -> Result<(), String> {
    for ancestor in path.ancestors() {
        let metadata = fs::symlink_metadata(ancestor).map_err(|e| e.to_string())?;
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            if metadata.file_attributes() & 0x400 != 0 {
                return Err("Choose a folder without symbolic links or junctions.".into());
            }
        }
        if metadata.file_type().is_symlink() {
            return Err("Symbolic links are not supported for package storage.".into());
        }
    }
    Ok(())
}
fn unpack(archive: &Path, directory: &Path) -> Result<(), String> {
    let mut zip = zip::ZipArchive::new(fs::File::open(archive).map_err(|e| e.to_string())?)
        .map_err(|_| "This package is not a readable ZIP archive.")?;
    if zip.len() > 4000 {
        return Err("The package contains too many files.".into());
    }
    let mut total = 0u64;
    for i in 0..zip.len() {
        let mut item = zip
            .by_index(i)
            .map_err(|_| "The package contains an unreadable entry.")?;
        let name = item.name();
        if name.contains(['\\', ':'])
            || name.split('/').filter(|part| !part.is_empty()).any(|part| {
                part == ".."
                    || part == "."
                    || part.ends_with([' ', '.'])
                    || part.chars().any(|c| "<>|?*\"".contains(c))
            })
            || item
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("The package contains an unsafe path or link.".into());
        }
        let relative = item
            .enclosed_name()
            .ok_or("The package contains a path outside its folder.")?;
        if relative.as_os_str().is_empty() {
            return Err("The package contains an empty path.".into());
        }
        total = total
            .checked_add(item.size())
            .ok_or("Package size overflow")?;
        if total > 2 * 1024 * 1024 * 1024 || item.size() > 1024 * 1024 * 1024 {
            return Err("The unpacked package is too large.".into());
        }
        let target = directory.join(relative);
        if item.is_dir() {
            fs::create_dir_all(&target).map_err(|e| e.to_string())?;
        } else {
            fs::create_dir_all(target.parent().ok_or("Invalid archive directory")?)
                .map_err(|e| e.to_string())?;
            let mut file = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&target)
                .map_err(|_| "The package contains duplicate or conflicting paths.")?;
            let expected = item.size();
            let count = std::io::copy(&mut item.by_ref().take(expected + 1), &mut file)
                .map_err(|e| e.to_string())?;
            if count != expected {
                return Err("An archive entry has an unexpected size.".into());
            }
        }
    }
    Ok(())
}
fn find_entry(directory: &Path, name: &str) -> Result<PathBuf, String> {
    let mut pending = vec![directory.to_path_buf()];
    let mut found = Vec::new();
    while let Some(folder) = pending.pop() {
        for item in fs::read_dir(folder).map_err(|e| e.to_string())? {
            let item = item.map_err(|e| e.to_string())?;
            if item.file_type().map_err(|e| e.to_string())?.is_dir() {
                pending.push(item.path());
            } else if item
                .file_name()
                .to_string_lossy()
                .eq_ignore_ascii_case(name)
            {
                found.push(item.path());
            }
        }
    }
    if found.len() != 1 {
        return Err(format!("The package must contain exactly one {name}. Download it manually or report the packaging change."));
    }
    crate::launchable(&found[0])
}
#[tauri::command]
pub async fn install_project_package(app: tauri::AppHandle) -> Result<PackageStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = app.state::<Packages>(); let _busy = begin(&p)?;
        let result = (|| {
            let status = p.status.lock().map_err(|_| "Package status is busy")?.clone();
            if status.stage != "downloaded" { return Err("Download and verify a package before installing.".into()); }
            let project = project(&status.project_id)?; let entry_name = project.entry.ok_or("This project currently supports direct downloads only.")?;
            let release = release(&status.project_id)?;
            let saved = status.asset.ok_or("Package details are missing")?;
            let asset = release.assets.iter().find(|a| a.id == saved.id && a.digest == saved.digest && a.installable).ok_or("This package is no longer the current release. Refresh and download again.")?;
            let source = PathBuf::from(status.path.ok_or("The downloaded file is missing")?); reject_links(&source)?; verify(&source, asset)?;
            let library = app.state::<Library>(); let root = install_directory(&library)?;
            fs::create_dir_all(&root).map_err(|_| "The installation folder could not be created.")?;
            let root = local_directory(&root)?; reject_links(&root)?;
            let parent = root.join(&status.project_id).join("Versions"); fs::create_dir_all(&parent).map_err(|e| e.to_string())?; reject_links(&parent)?;
            let directory = parent.join(format!("{}-{}", release.version, uuid::Uuid::new_v4())); fs::create_dir(&directory).map_err(|e| e.to_string())?;
            p.set(&app, |s| { s.stage = "installing".into(); s.message = "Installing into a separate application folder…".into(); }, true)?;
            let installed = (|| {
                if asset.name.to_ascii_lowercase().ends_with(".zip") { unpack(&source, &directory)?; }
                else { fs::copy(&source, directory.join(entry_name)).map_err(|e| e.to_string())?; }
                let entry = find_entry(&directory, entry_name)?;
                let installation = Installation { catalog_id: status.project_id.clone(), version: release.version.clone(), directory: directory.to_string_lossy().into_owned(), entry: entry.to_string_lossy().into_owned(), sha256: asset.digest.clone(), package_name: asset.name.clone(), package_bytes: asset.size, installed_bytes: directory_bytes(&directory)?, installed_at: now() };
                atomic_json(&directory.join("wrakeeb-installation.json"), &installation)?;
                mutate(&library, |store| {
                    if let Some(existing) = store.apps.iter_mut().find(|a| a.catalog_id.as_deref() == Some(&status.project_id)) { existing.path = installation.entry.clone(); }
                    else { store.apps.push(crate::LinkedApp { id: uuid::Uuid::new_v4().to_string(), name: status.project_id.clone(), catalog_id: Some(status.project_id.clone()), path: installation.entry.clone(), favorite: false, added_at: now(), last_launched: None }); }
                    store.installations.retain(|i| i.catalog_id != status.project_id); store.installations.push(installation);
                    crate::log(store, &status.project_id, "Package installed"); Ok(())
                })
            })();
            if installed.is_err() { let _ = fs::remove_dir_all(&directory); } installed?;
            p.set(&app, |s| { s.stage = "installed".into(); s.message = "Installed and added to your library. Launch here or open the app directly from its folder.".into(); }, true)
        })();
        match result { Ok(status) => Ok(status), Err(error) => p.set(&app, |s| { s.stage = "error".into(); s.message = error; }, true) }
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn choose_install_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(file) = app
            .dialog()
            .file()
            .set_parent(
                &app.get_webview_window("main")
                    .ok_or("Launcher window unavailable")?,
            )
            .set_title("Choose an application installation folder")
            .blocking_pick_folder()
        else {
            return Ok(None);
        };
        let path = local_directory(&file.into_path().map_err(|_| "Choose a local directory")?)?;
        reject_links(&path)?;
        let probe = path.join(format!(".wrakeeb-probe-{}", uuid::Uuid::new_v4()));
        fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&probe)
            .map_err(|_| "The chosen installation folder is not writable.")?;
        fs::remove_file(probe).map_err(|e| e.to_string())?;
        let text = path.to_string_lossy().into_owned();
        mutate(&app.state::<Library>(), |s| {
            s.preferences.install_directory = Some(text.clone());
            Ok(())
        })?;
        Ok(Some(text))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn open_project_page(id: String, releases: bool) -> Result<(), String> {
    let p = project(&id)?;
    let url = format!(
        "https://github.com/{}{}",
        p.repo,
        if releases { "/releases" } else { "" }
    );
    let mut process = std::process::Command::new(crate::windows_tool("rundll32.exe")?);
    process.arg("url.dll,FileProtocolHandler").arg(url);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        process.creation_flags(0x08000000);
    }
    process.spawn().map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub async fn create_desktop_shortcut() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let target = std::env::current_exe().map_err(|e| e.to_string())?;
        let mut process = std::process::Command::new(crate::windows_tool("WindowsPowerShell/v1.0/powershell.exe")?);
        process.args(["-NoProfile", "-NonInteractive", "-Command", "$s=New-Object -ComObject WScript.Shell; $p=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Wrakeeb Launcher.lnk'; $l=$s.CreateShortcut($p); $l.TargetPath=$env:WRAKEEB_SHORTCUT_TARGET; $l.WorkingDirectory=[IO.Path]::GetDirectoryName($env:WRAKEEB_SHORTCUT_TARGET); $l.IconLocation=$env:WRAKEEB_SHORTCUT_TARGET+',0'; $l.Save()"]).env("WRAKEEB_SHORTCUT_TARGET", target);
        #[cfg(windows)] { use std::os::windows::process::CommandExt; process.creation_flags(0x08000000); }
        if !process.status().map_err(|e| e.to_string())?.success() { return Err("Windows could not create the desktop shortcut.".into()); } Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_curated_release_packages_are_installable() {
        let steam = project("dual-steam").unwrap();
        assert!(approved_package(&steam, "Dual-Steam-Windows.zip"));
        assert!(!approved_package(&steam, "Source.zip"));
        assert!(!approved_package(&steam, "Other-Installer.exe"));
        assert!(!approved_package(&project("coucou").unwrap(), "Coucou.zip"));
        assert!(!approved_package(
            &project("vencord-repair").unwrap(),
            "Repair.zip"
        ));
    }
    #[test]
    fn release_rejects_foreign_urls_and_bad_checksums() {
        let p = project("launcher-demo").unwrap();
        let mut value = serde_json::json!({"draft":false,"prerelease":false,"tag_name":"demo-v1.0.0","assets":[{"id":1,"name":"Wrakeeb-Launcher-Demo-Windows-x64.exe","size":12,"digest":format!("sha256:{}", "a".repeat(64)),"browser_download_url":"https://evil.example/file.exe"}]});
        assert!(parse_release(&p, &value).unwrap().assets.is_empty());
        value["assets"][0]["browser_download_url"] = format!("https://github.com/{}/releases/download/demo-v1.0.0/Wrakeeb-Launcher-Demo-Windows-x64.exe", p.repo).into();
        assert_eq!(parse_release(&p, &value).unwrap().assets.len(), 1);
        value["assets"][0]["digest"] = "sha256:bad".into();
        assert!(parse_release(&p, &value).unwrap().assets.is_empty());
    }
    #[test]
    fn archive_cannot_escape_or_overwrite() {
        let root = crate::tests::scratch();
        let destination = root.join("app");
        fs::create_dir(&destination).unwrap();
        let archive = root.join("malicious.zip");
        let mut zip = zip::ZipWriter::new(fs::File::create(&archive).unwrap());
        zip.start_file("../escaped.cmd", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"echo nope").unwrap();
        zip.finish().unwrap();
        assert!(unpack(&archive, &destination).is_err());
        assert!(!root.join("escaped.cmd").exists());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn valid_archive_and_script_entry_are_supported() {
        let root = crate::tests::scratch();
        let destination = root.join("app");
        fs::create_dir(&destination).unwrap();
        let archive = root.join("valid.zip");
        let mut zip = zip::ZipWriter::new(fs::File::create(&archive).unwrap());
        zip.start_file(
            "Demo/Launcher-Demo.cmd",
            zip::write::SimpleFileOptions::default(),
        )
        .unwrap();
        zip.write_all(b"@echo off\r\necho Demo\r\n").unwrap();
        zip.finish().unwrap();
        unpack(&archive, &destination).unwrap();
        assert!(find_entry(&destination, "Launcher-Demo.cmd")
            .unwrap()
            .is_file());
        assert!(unpack(&archive, &destination).is_err());
        fs::remove_dir_all(root).unwrap();
    }
}
