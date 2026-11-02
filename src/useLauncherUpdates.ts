import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { command, desktop } from "./bridge";
import { version } from "../package.json";

export const APP_VERSION = version;
export interface UpdateStatus {
  stage: string;
  message: string;
  installedVersion: string;
  latestVersion: string | null;
  lastChecked: number | null;
  notes: string;
  downloadedBytes: number;
  totalBytes: number;
  downloadPath: string | null;
}
const initial: UpdateStatus = {
  stage: "idle",
  message: "Check for the latest stable release.",
  installedVersion: version,
  latestVersion: null,
  lastChecked: null,
  notes: "",
  downloadedBytes: 0,
  totalBytes: 0,
  downloadPath: null,
};
export function useLauncherUpdates(autoCheck: boolean | undefined) {
  const [status, setStatus] = useState<UpdateStatus>(initial);
  const run = useCallback(async (name: string) => {
    setStatus((previous) => ({
      ...previous,
      stage:
        name === "check_launcher_updates"
          ? "checking"
          : name === "install_launcher_update"
            ? "applying"
            : "downloading",
      message:
        name === "check_launcher_updates"
          ? "Checking the latest stable release…"
          : "Preparing the verified package…",
    }));
    try {
      const result = await command<UpdateStatus>(name);
      if (result) setStatus(result);
    } catch (error) {
      setStatus((previous) => ({
        ...previous,
        stage: "error",
        latestVersion: null,
        downloadPath: null,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);
  useEffect(() => {
    if (!desktop || autoCheck === undefined) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    listen<UpdateStatus>("launcher:update", (event) => {
      if (active) setStatus(event.payload);
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch(() => {});
    command<UpdateStatus>("get_update_status")
      .then((saved) => {
        if (!active) return;
        setStatus(saved);
        if (
          autoCheck &&
          (!saved.lastChecked ||
            Date.now() / 1000 - saved.lastChecked > 12 * 3600)
        )
          void run("check_launcher_updates");
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [autoCheck, run]);
  return {
    status,
    check: () => run("check_launcher_updates"),
    download: () => run("download_launcher_update"),
    install: () => run("install_launcher_update"),
    cancel: () => command("cancel_launcher_download"),
  };
}
