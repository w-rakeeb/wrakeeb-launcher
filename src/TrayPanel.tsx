import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  Download,
  FolderOpen,
  Grid2X2,
  Library,
  Power,
  RefreshCw,
  Settings2,
  Square,
  X,
  AlertCircle,
} from "lucide-react";
import { command, getSnapshot } from "./bridge";
import type { Snapshot } from "./catalog";
import type { RunningApp } from "./useRunningApps";
import type { PackageStatus } from "./usePackages";
import brandLogo from "./assets/brand/wrakeeb.png";
import { version } from "../package.json";
import { listen } from "@tauri-apps/api/event";

export function TrayPanel() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [running, setRunning] = useState<RunningApp[]>([]);
  const [transfer, setTransfer] = useState<PackageStatus>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [data, processes, status] = await Promise.all([
      getSnapshot(),
      command<RunningApp[]>("get_running_apps"),
      command<PackageStatus>("get_package_status"),
    ]);
    document.documentElement.dataset.theme =
      data.store.preferences.theme ?? "discord";
    document.documentElement.dataset.interface =
      data.store.preferences.interfaceStyle ?? "classic";
    setSnapshot(data);
    setRunning(processes);
    setTransfer(status);
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(String(e)));
    const stop = listen("tray:opened", () => {
      setError("");
      void load().catch((e) => setError(String(e)));
    }).catch(() => () => {});
    const timer = setInterval(() => {
      if (document.hasFocus()) void load().catch(() => {});
    }, 2000);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") void command("hide_tray_panel");
    };
    document.addEventListener("keydown", escape);
    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", escape);
      void stop.then((fn) => fn());
    };
  }, [load]);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const navigate = (page: string) =>
    void act(() => command("tray_navigate", { page }));
  const recent = [...(snapshot?.store.apps ?? [])]
    .filter((app) => app.lastLaunched)
    .sort((a, b) => (b.lastLaunched ?? 0) - (a.lastLaunched ?? 0))
    .slice(0, 3);
  const active = running
    .map((process) => ({
      process,
      app: snapshot?.store.apps.find((app) => app.id === process.id) ?? {
        name: process.name,
      },
    }))
    .filter((item) => item.app);
  return (
    <section
      className="tray-panel"
      aria-label="Wrakeeb Launcher quick access"
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="tray-heading">
        <img src={brandLogo} alt="" />
        <div>
          <strong>Wrakeeb Launcher</strong>
          <span>
            {snapshot?.store.apps.length ?? 0} in library · {running.length}{" "}
            running
          </span>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          aria-label="Dismiss quick access"
          onClick={() => void command("hide_tray_panel")}
        >
          <X size={16} />
        </button>
      </header>
      <div className="tray-body">
        <ul className="menu tray-menu" aria-label="Launcher destinations">
          <li>
            <button onClick={() => navigate("library")}>
              <Library size={17} />
              Open library
              <ArrowUpRight size={13} />
            </button>
          </li>
          <li>
            <button onClick={() => navigate("discover")}>
              <Grid2X2 size={17} />
              Discover applications
            </button>
          </li>
          <li>
            <button onClick={() => navigate("downloads")}>
              <Download size={17} />
              Downloads
              {transfer &&
                ["downloading", "verifying", "installing"].includes(
                  transfer.stage,
                ) && <span className="tray-status">Active</span>}
            </button>
          </li>
        </ul>
        {active.length > 0 && (
          <section className="tray-section">
            <h2>RUNNING FROM LAUNCHER</h2>
            {active.slice(0, 3).map(({ process, app }) => (
              <div className="tray-app" key={process.id}>
                <div>
                  <strong>{app!.name}</strong>
                  <span>
                    {process.instances}{" "}
                    {process.instances === 1 ? "instance" : "instances"}
                  </span>
                </div>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={busy || !process.canClose}
                  aria-label={`Close ${app!.name}`}
                  title="Request a normal close; save prompts stay with the app"
                  onClick={() =>
                    void act(() =>
                      command("close_launched_application", { id: process.id }),
                    )
                  }
                >
                  <Square size={14} />
                  Close
                </button>
              </div>
            ))}
          </section>
        )}
        {recent.length > 0 && (
          <section className="tray-section">
            <h2>RECENT APPLICATIONS</h2>
            <ul className="menu tray-menu">
              {recent.map((app) => (
                <li key={app.id}>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await command("launch_application", { id: app.id });
                        await command("hide_tray_panel");
                      })
                    }
                  >
                    <ArrowUpRight size={17} />
                    {app.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="tray-section">
          <h2>QUICK ACCESS</h2>
          <ul className="menu tray-menu">
            <li>
              <button onClick={() => navigate("settings")}>
                <Settings2 size={17} />
                Settings
              </button>
            </li>
            <li>
              <button
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await command("tray_navigate", { page: "updates" });
                    await command("check_launcher_updates");
                  })
                }
              >
                <RefreshCw size={17} />
                Check for launcher updates
              </button>
            </li>
            <li>
              <button
                disabled={busy}
                onClick={() => void act(() => command("open_launcher_folder"))}
              >
                <FolderOpen size={17} />
                Open launcher folder
              </button>
            </li>
          </ul>
        </section>
        {error && (
          <div className="alert alert-error tray-error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <footer className="tray-footer">
        <button
          className="btn btn-ghost"
          onClick={() => void command("exit_launcher")}
        >
          <Power size={17} />
          Exit Wrakeeb Launcher
        </button>
        <span>v{version}</span>
      </footer>
    </section>
  );
}
