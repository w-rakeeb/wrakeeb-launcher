use crate::{now, Library};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, State};

pub const REPOSITORY: &str = "w-rakeeb/wrakeeb-launcher";
pub const ASSET: &str = "Wrakeeb-Launcher-Windows-x64.exe";
const MAX_BYTES: u64 = 100 * 1024 * 1024;
fn installed_version() -> String {
    #[cfg(debug_assertions)]
    if let Ok(value) = std::env::var("WRAKEEB_TEST_INSTALLED_VERSION") {
        if semver::Version::parse(&value).is_ok() {
            return value;
        }
    }
    env!("CARGO_PKG_VERSION").into()
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct UpdateStatus {
    pub stage: String,
    pub message: String,
    pub installed_version: String,
    pub latest_version: Option<String>,
    pub last_checked: Option<u64>,
    pub notes: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub download_path: Option<String>,
}
pub struct Updates {
    state: Mutex<UpdateStatus>,
    busy: AtomicBool,
    cancel: AtomicBool,
    file: PathBuf,
}
impl Updates {
    pub fn new(data: &Path) -> Self {
        let file = data.join("launcher-update.json");
        let mut status: UpdateStatus = fs::read(&file)
            .ok()
            .and_then(|data| serde_json::from_slice(&data).ok())
            .unwrap_or_default();
        status.installed_version = installed_version();
        if status.stage.is_empty()
            || ["checking", "downloading", "applying"].contains(&status.stage.as_str())
        {
            status.stage = "idle".into();
            status.message = "Check for the latest stable release.".into();
        }
        let result = data.join("updates/result.json");
        if let Ok(bytes) = fs::read(&result) {
            if let Ok(message) = serde_json::from_slice::<UpdateResult>(&bytes) {
                status.stage = if message.success {
                    "installed"
                } else {
                    "error"
                }
                .into();
                status.message = message.message;
                let _ = fs::remove_file(result);
            }
        }
        Self {
            state: Mutex::new(status),
            busy: AtomicBool::new(false),
            cancel: AtomicBool::new(false),
            file,
        }
    }
    fn set(
        &self,
        app: &tauri::AppHandle,
        persist: bool,
        change: impl FnOnce(&mut UpdateStatus),
    ) -> Result<UpdateStatus, String> {
        let mut state = self.state.lock().map_err(|_| "Update status is busy")?;
        change(&mut state);
        if persist {
            crate::atomic_json(&self.file, &*state)?;
        }
        let snapshot = state.clone();
        drop(state);
        let _ = app.emit("launcher:update", &snapshot);
        Ok(snapshot)
    }
}
struct Busy<'a>(&'a AtomicBool);
impl Drop for Busy<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}
fn begin(updates: &Updates) -> Result<Busy<'_>, String> {
    if updates.busy.swap(true, Ordering::SeqCst) {
        return Err("An update operation is already running.".into());
    }
    Ok(Busy(&updates.busy))
}
#[derive(Clone, Debug)]
struct Release {
    version: semver::Version,
    url: String,
    digest: String,
    size: u64,
    notes: String,
}
fn trusted_host(host: &str) -> bool {
    [
        "api.github.com",
        "github.com",
        "release-assets.githubusercontent.com",
        "objects.githubusercontent.com",
        "github-releases.githubusercontent.com",
    ]
    .contains(&host)
}
pub(crate) fn client() -> Result<Client, String> {
    Client::builder()
        .user_agent(format!("Wrakeeb-Launcher/{}", env!("CARGO_PKG_VERSION")))
        .connect_timeout(Duration::from_secs(12))
        .timeout(Duration::from_secs(300))
        .redirect(reqwest::redirect::Policy::custom(|attempt| {
            if attempt.previous().len() >= 6 {
                return attempt.error("Too many redirects");
            }
            if attempt.url().scheme() != "https"
                || !attempt.url().host_str().is_some_and(trusted_host)
            {
                return attempt.error("Untrusted download server");
            }
            attempt.follow()
        }))
        .build()
        .map_err(|e| e.to_string())
}
fn parse_release(value: &serde_json::Value) -> Result<Release, String> {
    if value["draft"].as_bool() != Some(false) || value["prerelease"].as_bool() != Some(false) {
        return Err("No stable release is available.".into());
    }
    let tag = value["tag_name"]
        .as_str()
        .ok_or("Missing release version")?;
    let version = semver::Version::parse(tag.strip_prefix('v').unwrap_or(tag))
        .map_err(|_| "The release has an unsupported version.")?;
    if !version.pre.is_empty() || !version.build.is_empty() {
        return Err("Only stable release versions are supported.".into());
    }
    let asset = value["assets"]
        .as_array()
        .ok_or("Release assets are missing")?
        .iter()
        .find(|asset| asset["name"].as_str() == Some(ASSET))
        .ok_or("This release has no Windows x64 package.")?;
    let url = asset["browser_download_url"]
        .as_str()
        .ok_or("Missing package download")?;
    let expected = format!("https://github.com/{REPOSITORY}/releases/download/{tag}/{ASSET}");
    if url != expected {
        return Err("The release package points to an unexpected location.".into());
    }
    let digest = asset["digest"]
        .as_str()
        .and_then(|value| value.strip_prefix("sha256:"))
        .ok_or("GitHub has not provided a package checksum yet. Try again later.")?;
    if digest.len() != 64 || !digest.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("The release checksum is invalid.".into());
    }
    let size = asset["size"]
        .as_u64()
        .filter(|size| *size > 0 && *size <= MAX_BYTES)
        .ok_or("The release package size is invalid.")?;
    Ok(Release {
        version,
        url: url.into(),
        digest: digest.to_ascii_lowercase(),
        size,
        notes: value["body"]
            .as_str()
            .unwrap_or("")
            .chars()
            .take(12000)
            .collect(),
    })
}
fn latest() -> Result<Release, String> {
    let response = client()?
        .get(format!(
            "https://api.github.com/repos/{REPOSITORY}/releases/latest"
        ))
        .header("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(25))
        .send()
        .map_err(|_| "GitHub could not be reached. Check your connection and try again.")?;
    match response.status().as_u16() {
        404 => return Err("No public release has been published yet.".into()),
        403 | 429 => {
            return Err("GitHub's request limit was reached. Please try again later.".into())
        }
        status if status != 200 => {
            return Err(format!(
                "GitHub returned an unexpected response ({status})."
            ))
        }
        _ => {}
    }
    let mut bytes = Vec::new();
    response
        .take(2_000_001)
        .read_to_end(&mut bytes)
        .map_err(|_| "The release response was interrupted")?;
    if bytes.len() > 2_000_000 {
        return Err("The release response is too large.".into());
    }
    parse_release(
        &serde_json::from_slice(&bytes)
            .map_err(|_| "GitHub returned unreadable release information")?,
    )
}
pub fn hash(path: &Path) -> Result<String, String> {
    let mut stream = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let count = stream.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
fn verify(path: &Path, release: &Release) -> Result<(), String> {
    if fs::metadata(path).map_err(|e| e.to_string())?.len() != release.size
        || hash(path)? != release.digest
    {
        return Err("The package checksum did not match. Nothing was installed.".into());
    }
    crate::executable(path).map(|_| ())
}
pub fn download_directory(library: &Library) -> Result<PathBuf, String> {
    let selected = library
        .store
        .lock()
        .map_err(|_| "Library is busy")?
        .preferences
        .download_directory
        .clone();
    Ok(selected.map(PathBuf::from).unwrap_or(
        library
            .file
            .parent()
            .ok_or("Invalid app location")?
            .parent()
            .ok_or("Invalid app location")?
            .join("Downloads"),
    ))
}
fn output_path(directory: &Path, release: &Release) -> PathBuf {
    directory.join(format!(
        "Wrakeeb-Launcher-{}-Windows-x64.exe",
        release.version
    ))
}
#[tauri::command]
pub fn get_update_status(updates: State<Updates>) -> Result<UpdateStatus, String> {
    updates
        .state
        .lock()
        .map(|state| state.clone())
        .map_err(|_| "Update status is busy".into())
}
#[tauri::command]
pub async fn check_launcher_updates(app: tauri::AppHandle) -> Result<UpdateStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let updates = app.state::<Updates>();
        let _busy = begin(&updates)?;
        updates.set(&app, false, |s| {
            s.stage = "checking".into();
            s.message = "Checking the latest stable release on GitHub…".into();
            s.latest_version = None;
            s.notes.clear();
        })?;
        match latest() {
            Ok(release) => updates.set(&app, true, |s| {
                let installed = semver::Version::parse(&installed_version()).unwrap();
                s.stage = if release.version > installed {
                    "available"
                } else if release.version < installed {
                    "ahead"
                } else {
                    "current"
                }
                .into();
                s.message = match s.stage.as_str() {
                    "available" => "A newer version is available.",
                    "ahead" => "This build is ahead of the public release.",
                    _ => "You're up to date.",
                }
                .into();
                s.latest_version = Some(release.version.to_string());
                s.last_checked = Some(now());
                s.notes = release.notes;
                s.total_bytes = release.size;
            }),
            Err(error) => updates.set(&app, true, |s| {
                s.stage = "error".into();
                s.message = error;
                s.last_checked = Some(now());
                s.latest_version = None;
                s.download_path = None;
            }),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn download_launcher_update(app: tauri::AppHandle) -> Result<UpdateStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let updates = app.state::<Updates>(); let _busy = begin(&updates)?;
        updates.cancel.store(false, Ordering::SeqCst);
        let result = (|| {
            let release = latest()?;
            let library = app.state::<Library>(); let directory = download_directory(&library)?;
            fs::create_dir_all(&directory).map_err(|e| format!("The download folder is not writable: {e}"))?;
            let directory = crate::local_directory(&directory)?;
            let destination = output_path(&directory, &release);
            updates.set(&app, true, |s| { s.stage = "downloading".into(); s.message = "Downloading the Windows package…".into(); s.latest_version = Some(release.version.to_string()); s.notes = release.notes.clone(); s.total_bytes = release.size; s.downloaded_bytes = 0; s.download_path = None; })?;
            if destination.exists() { verify(&destination, &release).map_err(|_| "A different file already exists at the download destination. Choose another folder or remove that file first.")?; }
            else {
                let partial = directory.join(format!(".wrakeeb-{}.part", uuid::Uuid::new_v4()));
                let transfer = (|| {
                    let mut response = client()?.get(&release.url).send().map_err(|_| "The download could not start. Try again.")?.error_for_status().map_err(|_| "The package server returned an error.")?;
                    let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&partial).map_err(|e| e.to_string())?;
                    let mut count = 0u64; let mut buffer = [0u8; 65536]; let mut tick = Instant::now();
                    loop {
                        if updates.cancel.load(Ordering::SeqCst) { return Err("Download cancelled.".to_string()); }
                        let bytes = response.read(&mut buffer).map_err(|_| "The download was interrupted. You can retry.")?;
                        if bytes == 0 { break; }
                        count += bytes as u64; if count > release.size || count > MAX_BYTES { return Err("The download exceeded its expected size.".into()); }
                        file.write_all(&buffer[..bytes]).map_err(|_| "The download folder ran out of space or became unavailable.")?;
                        if tick.elapsed() > Duration::from_millis(120) { updates.set(&app, false, |s| s.downloaded_bytes = count)?; tick = Instant::now(); }
                    }
                    file.sync_all().map_err(|e| e.to_string())?; drop(file);
                    if count != release.size || hash(&partial)? != release.digest { return Err("The package checksum did not match. Nothing was installed.".into()); }
                    fs::rename(&partial, &destination).map_err(|e| e.to_string())?;
                    Ok::<_, String>(())
                })();
                if transfer.is_err() { let _ = fs::remove_file(&partial); }
                transfer?;
            }
            verify(&destination, &release)?;
            updates.set(&app, true, |s| { s.stage = "downloaded".into(); s.message = "Download verified against GitHub's SHA-256 checksum.".into(); s.downloaded_bytes = release.size; s.download_path = Some(destination.to_string_lossy().into_owned()); })
        })();
        match result { Ok(status) => Ok(status), Err(error) => updates.set(&app, true, |s| { s.stage = if updates.cancel.load(Ordering::SeqCst) { "cancelled" } else { "error" }.into(); s.message = error; s.download_path = None; }) }
    }).await.map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn cancel_launcher_download(updates: State<Updates>) {
    updates.cancel.store(true, Ordering::SeqCst);
}

#[derive(Serialize, Deserialize)]
struct UpdatePlan {
    target: PathBuf,
    source: PathBuf,
    digest: String,
    size: u64,
    previous_hash: String,
    parent_pid: u32,
    token: String,
    version: String,
}
#[derive(Serialize, Deserialize)]
struct UpdateResult {
    success: bool,
    message: String,
}
#[derive(Serialize, Deserialize)]
struct Ready {
    token: String,
    pid: u32,
}
fn valid_target_name(path: &Path) -> bool {
    matches!(
        path.file_name().and_then(|s| s.to_str()),
        Some("Wrakeeb Launcher.exe" | "Wrakeeb-Launcher-Windows-x64.exe" | "wrakeeb-launcher.exe")
    )
}
#[tauri::command]
pub fn confirm_frontend_ready() -> Result<(), String> {
    let Ok(token) = std::env::var("WRAKEEB_UPDATE_TOKEN") else {
        return Ok(());
    };
    let executable = std::env::current_exe().map_err(|e| e.to_string())?;
    let root = executable.parent().ok_or("Invalid app directory")?;
    let request = root.join("data/updates/pending.json");
    let plan: UpdatePlan = serde_json::from_slice(&fs::read(request).map_err(|e| e.to_string())?)
        .map_err(|_| "Invalid update marker")?;
    if plan.token != token
        || hash(&executable)? != plan.digest
        || plan.version != env!("CARGO_PKG_VERSION")
    {
        return Err("Startup marker did not match the verified update.".into());
    }
    crate::atomic_json(
        &root.join("data/updates/ready.json"),
        &Ready {
            token,
            pid: std::process::id(),
        },
    )
}
#[tauri::command]
pub async fn install_launcher_update(app: tauri::AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let updates = app.state::<Updates>();
        let _busy = begin(&updates)?;
        let release = latest()?;
        if release.version <= semver::Version::parse(&installed_version()).unwrap() {
            return Err("There is no newer stable release to install.".into());
        }
        let source = updates
            .state
            .lock()
            .map_err(|_| "Update status is busy")?
            .download_path
            .clone()
            .ok_or("Download the update first")?;
        let source = crate::executable(Path::new(&source))?;
        verify(&source, &release)?;
        let target = std::env::current_exe().map_err(|e| e.to_string())?;
        if !valid_target_name(&target) {
            return Err("Run the portable Windows release to install updates.".into());
        }
        let root = target.parent().ok_or("Invalid app folder")?;
        let stage = root.join("data/updates");
        fs::create_dir_all(&stage).map_err(|e| e.to_string())?;
        no_links(&stage)?;
        no_links(&target)?;
        let helper = stage.join("launcher-helper.exe");
        fs::copy(&target, &helper).map_err(|e| e.to_string())?;
        let plan = UpdatePlan {
            previous_hash: hash(&target)?,
            target: target.clone(),
            source,
            digest: release.digest,
            size: release.size,
            parent_pid: std::process::id(),
            token: uuid::Uuid::new_v4().to_string(),
            version: release.version.to_string(),
        };
        let request = stage.join("pending.json");
        crate::atomic_json(&request, &plan)?;
        updates.set(&app, true, |s| {
            s.stage = "applying".into();
            s.message = "Restarting to install the verified update…".into();
        })?;
        let mut process = Command::new(&helper);
        process
            .arg("--apply-launcher-update")
            .arg(request)
            .current_dir(root);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            process.creation_flags(0x08000000);
        }
        process.spawn().map_err(|e| e.to_string())?;
        app.exit(0);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
fn no_links(path: &Path) -> Result<(), String> {
    for part in path.ancestors() {
        if let Ok(metadata) = fs::symlink_metadata(part) {
            #[cfg(windows)]
            {
                use std::os::windows::fs::MetadataExt;
                if metadata.file_attributes() & 0x400 != 0 {
                    return Err("Linked update paths are not supported.".into());
                }
            }
            if metadata.file_type().is_symlink() {
                return Err("Linked update paths are not supported.".into());
            }
        }
    }
    Ok(())
}
fn apply(plan: &UpdatePlan) -> Result<(), String> {
    if !plan.target.is_absolute() || !plan.source.is_absolute() || !valid_target_name(&plan.target)
    {
        return Err("Invalid update target.".into());
    }
    no_links(&plan.target)?;
    no_links(&plan.source)?;
    if hash(&plan.target)? != plan.previous_hash {
        return Err("The installed executable changed after the update was prepared.".into());
    }
    if fs::metadata(&plan.source).map_err(|e| e.to_string())?.len() != plan.size
        || hash(&plan.source)? != plan.digest
    {
        return Err("The staged package checksum did not match.".into());
    }
    crate::executable(&plan.source)?;
    let root = plan.target.parent().ok_or("Invalid update folder")?;
    let backup = root.join("Backups").join(format!(
        "Launcher-update-{}-{}",
        now(),
        uuid::Uuid::new_v4()
    ));
    no_links(&backup)?;
    fs::create_dir_all(&backup).map_err(|e| e.to_string())?;
    let saved = backup.join("Wrakeeb Launcher.exe");
    fs::copy(&plan.target, &saved).map_err(|e| e.to_string())?;
    let temp = root.join(format!(".launcher-{}.update", uuid::Uuid::new_v4()));
    fs::copy(&plan.source, &temp).map_err(|e| e.to_string())?;
    if hash(&temp)? != plan.digest {
        let _ = fs::remove_file(temp);
        return Err("The replacement package checksum did not match.".into());
    }
    fs::rename(&temp, &plan.target).map_err(|e| {
        let _ = fs::remove_file(&temp);
        e.to_string()
    })?;
    let result_file = root.join("data/updates/result.json");
    let ready_file = root.join("data/updates/ready.json");
    let _ = fs::remove_file(&ready_file);
    let started = Command::new(&plan.target)
        .current_dir(root)
        .env("WRAKEEB_UPDATE_TOKEN", &plan.token)
        .spawn();
    let healthy = match started {
        Ok(mut child) => {
            let started = Instant::now();
            let mut ready = false;
            while started.elapsed() < Duration::from_secs(30) {
                if let Ok(bytes) = fs::read(&ready_file) {
                    if let Ok(signal) = serde_json::from_slice::<Ready>(&bytes) {
                        if signal.token == plan.token && signal.pid == child.id() {
                            ready = true;
                            break;
                        }
                    }
                }
                if child.try_wait().map_err(|e| e.to_string())?.is_some() {
                    break;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            if !ready {
                let _ = child.kill();
                let _ = child.wait();
            } else {
                std::thread::spawn(move || {
                    let _ = child.wait();
                });
            }
            ready
        }
        Err(_) => false,
    };
    if !healthy {
        fs::copy(saved, &plan.target)
            .map_err(|e| format!("Restart failed and rollback needs attention: {e}"))?;
        crate::atomic_json(
            &result_file,
            &UpdateResult {
                success: false,
                message:
                    "The new launcher did not become ready. The previous version was restored."
                        .into(),
            },
        )?;
        let _ = Command::new(&plan.target).current_dir(root).spawn();
        return Err("The update was rolled back.".into());
    }
    let _ = fs::remove_file(&ready_file);
    crate::atomic_json(
        &result_file,
        &UpdateResult {
            success: true,
            message: "The launcher was updated. Your library and preferences were preserved."
                .into(),
        },
    )?;
    Ok(())
}
pub fn run_helper(request: &Path) -> Result<(), String> {
    let plan: UpdatePlan = serde_json::from_slice(&fs::read(request).map_err(|e| e.to_string())?)
        .map_err(|_| "Invalid update request")?;
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::{
            Foundation::{CloseHandle, WAIT_TIMEOUT},
            System::Threading::{OpenProcess, WaitForSingleObject},
        };
        let process = OpenProcess(0x00100000, 0, plan.parent_pid);
        if !process.is_null() {
            let result = WaitForSingleObject(process, 40000);
            CloseHandle(process);
            if result == WAIT_TIMEOUT {
                return Err("The launcher did not exit. No update was installed.".into());
            }
        }
    }
    let result = apply(&plan);
    if let Err(error) = &result {
        if let Some(root) = plan.target.parent() {
            let _ = crate::atomic_json(
                &root.join("data/updates/result.json"),
                &UpdateResult {
                    success: false,
                    message: format!("Update failed: {error}"),
                },
            );
        }
    }
    let _ = fs::remove_file(request);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    fn release_value() -> serde_json::Value {
        serde_json::json!({ "draft":false,"prerelease":false,"tag_name":"v9.0.0","body":"Notes","assets":[{"name":ASSET,"browser_download_url":format!("https://github.com/{REPOSITORY}/releases/download/v9.0.0/{ASSET}"),"digest":format!("sha256:{}","a".repeat(64)),"size":120}] })
    }
    #[test]
    fn rejects_untrusted_assets_and_missing_digest() {
        let mut value = release_value();
        assert!(parse_release(&value).is_ok());
        value["assets"][0]["browser_download_url"] = "https://example.com/app.exe".into();
        assert!(parse_release(&value).is_err());
        value = release_value();
        value["assets"][0]["digest"] = serde_json::Value::Null;
        assert!(parse_release(&value).is_err());
    }
    #[test]
    fn rejects_prerelease_and_oversized_package() {
        let mut value = release_value();
        value["prerelease"] = true.into();
        assert!(parse_release(&value).is_err());
        value = release_value();
        value["assets"][0]["size"] = (MAX_BYTES + 1).into();
        assert!(parse_release(&value).is_err());
    }
    #[test]
    fn corrupted_download_is_rejected() {
        let root = crate::tests::scratch();
        let path = root.join("update.exe");
        fs::write(&path, b"bad").unwrap();
        let release = parse_release(&release_value()).unwrap();
        assert!(verify(&path, &release).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn helper_preserves_library_and_rejects_changed_installation() {
        let root = crate::tests::scratch();
        let target = root.join("Wrakeeb Launcher.exe");
        let source = root.join("new.exe");
        fs::copy(std::env::current_exe().unwrap(), &target).unwrap();
        fs::copy(&target, &source).unwrap();
        let data = root.join("data");
        fs::create_dir_all(&data).unwrap();
        fs::write(data.join("library.json"), b"keep").unwrap();
        let plan = UpdatePlan {
            target: target.clone(),
            source,
            digest: "0".repeat(64),
            size: 1,
            previous_hash: hash(&target).unwrap(),
            parent_pid: 0,
            token: uuid::Uuid::new_v4().to_string(),
            version: "9.0.0".into(),
        };
        assert!(apply(&plan).is_err());
        assert_eq!(fs::read(data.join("library.json")).unwrap(), b"keep");
        assert_eq!(hash(&target).unwrap(), plan.previous_hash);
        fs::remove_dir_all(root).unwrap();
    }
    fn fixture(root: &Path, name: &str) -> PathBuf {
        let source = root.join(format!("{name}.rs"));
        let executable = root.join(format!("{name}.exe"));
        let body = format!(
            r#"fn main() {{
            std::fs::write("{name}.marker", "ok").unwrap();
            if let Ok(token) = std::env::var("WRAKEEB_UPDATE_TOKEN") {{
                std::fs::create_dir_all("data/updates").unwrap();
                let data = format!("{{{{\"token\":\"{{}}\",\"pid\":{{}}}}}}", token, std::process::id());
                std::fs::write("data/updates/ready.json", data).unwrap();
            }}
        }}"#
        );
        fs::write(&source, body).unwrap();
        assert!(Command::new("rustc")
            .arg(source)
            .arg("-o")
            .arg(&executable)
            .status()
            .unwrap()
            .success());
        executable
    }
    fn cleanup(root: &Path, target: &Path) {
        for _ in 0..100 {
            if fs::remove_file(target).is_ok() {
                break;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn portable_apply_restarts_new_binary_and_preserves_data() {
        let root = crate::tests::scratch();
        let target = root.join("Wrakeeb Launcher.exe");
        fs::copy(std::env::current_exe().unwrap(), &target).unwrap();
        let source = fixture(&root, "newlauncher");
        fs::create_dir_all(root.join("data")).unwrap();
        fs::write(root.join("data/library.json"), b"original library").unwrap();
        let plan = UpdatePlan {
            previous_hash: hash(&target).unwrap(),
            target: target.clone(),
            digest: hash(&source).unwrap(),
            size: fs::metadata(&source).unwrap().len(),
            source,
            parent_pid: 0,
            token: uuid::Uuid::new_v4().to_string(),
            version: "9.0.0".into(),
        };
        apply(&plan).unwrap();
        for _ in 0..100 {
            if root.join("newlauncher.marker").exists() {
                break;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        assert!(root.join("newlauncher.marker").exists());
        assert_eq!(hash(&target).unwrap(), plan.digest);
        assert_eq!(
            fs::read(root.join("data/library.json")).unwrap(),
            b"original library"
        );
        assert_eq!(fs::read_dir(root.join("Backups")).unwrap().count(), 1);
        cleanup(&root, &target);
    }
    #[test]
    fn failed_new_binary_rolls_back_and_restarts_previous_version() {
        let root = crate::tests::scratch();
        let target = root.join("Wrakeeb Launcher.exe");
        fs::copy(fixture(&root, "oldlauncher"), &target).unwrap();
        let source = root.join("invalid.exe");
        let mut fake = [0u8; 80];
        fake[..2].copy_from_slice(b"MZ");
        fake[60..64].copy_from_slice(&64u32.to_le_bytes());
        fake[64..68].copy_from_slice(b"PE\0\0");
        fs::write(&source, fake).unwrap();
        let plan = UpdatePlan {
            previous_hash: hash(&target).unwrap(),
            target: target.clone(),
            digest: hash(&source).unwrap(),
            size: 80,
            source,
            parent_pid: 0,
            token: uuid::Uuid::new_v4().to_string(),
            version: "9.0.0".into(),
        };
        assert!(apply(&plan).is_err());
        assert_eq!(hash(&target).unwrap(), plan.previous_hash);
        for _ in 0..100 {
            if root.join("oldlauncher.marker").exists() {
                break;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        assert!(root.join("oldlauncher.marker").exists());
        let result: UpdateResult =
            serde_json::from_slice(&fs::read(root.join("data/updates/result.json")).unwrap())
                .unwrap();
        assert!(!result.success);
        cleanup(&root, &target);
    }
}
