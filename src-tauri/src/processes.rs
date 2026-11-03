use serde::Serialize;
use std::{
    collections::BTreeMap,
    process::Child,
    sync::{LazyLock, Mutex},
};

// Retained process handles prevent a stale PID from being mistaken for a new application.
struct Launched {
    name: String,
    path: std::path::PathBuf,
    children: Vec<Child>,
}
static LAUNCHED: LazyLock<Mutex<BTreeMap<String, Launched>>> =
    LazyLock::new(|| Mutex::new(BTreeMap::new()));

pub fn track(id: &str, name: &str, path: &std::path::Path, child: Child) -> Result<(), String> {
    LAUNCHED
        .lock()
        .map_err(|_| "Application status is busy")?
        .entry(id.into())
        .or_insert_with(|| Launched {
            name: name.into(),
            path: path.to_path_buf(),
            children: Vec::new(),
        })
        .children
        .push(child);
    Ok(())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningApp {
    pub id: String,
    #[serde(skip)]
    pub path: std::path::PathBuf,
    name: String,
    instances: usize,
    can_close: bool,
}

#[cfg(windows)]
fn windows_for(pids: &[u32], close: bool) -> usize {
    use windows_sys::Win32::{
        Foundation::{HWND, LPARAM},
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindow, GetWindowThreadProcessId, IsWindowVisible, PostMessageW,
            GW_OWNER, WM_CLOSE,
        },
    };
    struct Request<'a> {
        pids: &'a [u32],
        close: bool,
        count: usize,
    }
    unsafe extern "system" fn visit(window: HWND, data: LPARAM) -> i32 {
        let request = &mut *(data as *mut Request<'_>);
        let mut pid = 0;
        GetWindowThreadProcessId(window, &mut pid);
        if request.pids.contains(&pid)
            && IsWindowVisible(window) != 0
            && GetWindow(window, GW_OWNER).is_null()
        {
            if !request.close || PostMessageW(window, WM_CLOSE, 0, 0) != 0 {
                request.count += 1;
            }
        }
        1
    }
    let mut request = Request {
        pids,
        close,
        count: 0,
    };
    unsafe {
        EnumWindows(Some(visit), &mut request as *mut _ as LPARAM);
    }
    request.count
}

#[cfg(not(windows))]
fn windows_for(_: &[u32], _: bool) -> usize {
    0
}

fn alive(children: &mut Vec<Child>) {
    children.retain_mut(|child| matches!(child.try_wait(), Ok(None)));
}

#[tauri::command]
pub fn get_running_apps() -> Result<Vec<RunningApp>, String> {
    let mut launched = LAUNCHED.lock().map_err(|_| "Application status is busy")?;
    let mut result = Vec::new();
    launched.retain(|id, group| {
        let children = &mut group.children;
        alive(children);
        if children.is_empty() {
            return false;
        }
        let pids: Vec<_> = children.iter().map(Child::id).collect();
        result.push(RunningApp {
            id: id.clone(),
            path: group.path.clone(),
            name: group.name.clone(),
            instances: pids.len(),
            can_close: windows_for(&pids, false) > 0,
        });
        true
    });
    Ok(result)
}

#[tauri::command]
pub fn close_launched_application(id: String) -> Result<usize, String> {
    let mut launched = LAUNCHED.lock().map_err(|_| "Application status is busy")?;
    let children = launched
        .get_mut(&id)
        .ok_or("This application was not started by this launcher session.")?;
    let children = &mut children.children;
    alive(children);
    let pids: Vec<_> = children.iter().map(Child::id).collect();
    let count = windows_for(&pids, true);
    if count == 0 {
        return Err("No closable application window was found. Use the application's own Quit command; nothing was force-stopped.".into());
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    #[test]
    fn cannot_close_an_untracked_process() {
        assert!(super::close_launched_application("not-launched".into()).is_err());
    }
}
