import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { command, desktop } from "./bridge";

export interface ReleaseAsset {
  id: number;
  name: string;
  size: number;
  digest: string;
  url: string;
  installable: boolean;
  downloads: number;
}
export interface ProjectRelease {
  repository: string;
  description: string;
  version: string;
  publishedAt: string;
  notes: string;
  assets: ReleaseAsset[];
  checkedAt: number;
  recommendedAssetId?: number;
  license?: string;
}
export interface PackageStatus {
  stage: string;
  projectId: string;
  name: string;
  version: string;
  message: string;
  downloadedBytes: number;
  totalBytes: number;
  path: string | null;
  asset?: ReleaseAsset;
}
const empty: PackageStatus = {
  stage: "",
  projectId: "",
  name: "",
  version: "",
  message: "No package transfers yet.",
  downloadedBytes: 0,
  totalBytes: 0,
  path: null,
};
export function usePackages(refresh: () => Promise<unknown>) {
  const [status, setStatus] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [downloadDirectory, setDownloadDirectory] = useState<string>();
  useEffect(() => {
    if (!desktop) return;
    let active = true;
    let stop: (() => void) | undefined;
    command<PackageStatus>("get_package_status")
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {});
    listen<PackageStatus>("package:status", (event) => {
      if (active) setStatus(event.payload);
    })
      .then((fn) => {
        if (active) stop = fn;
        else fn();
      })
      .catch(() => {});
    return () => {
      active = false;
      stop?.();
    };
  }, []);
  const run = useCallback(
    async (name: string, args?: Record<string, unknown>) => {
      setBusy(true);
      try {
        if (name.startsWith("download_")) setDownloadDirectory(undefined);
        setStatus(await command<PackageStatus>(name, args));
        await refresh();
      } catch (error) {
        setStatus((s) => ({ ...s, stage: "error", message: String(error) }));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  return {
    status,
    busy,
    download: (id: string, assetId: number) =>
      run("download_project_asset", { id, assetId, directory: downloadDirectory }),
    install: () => run("install_project_package"),
    downloadLatest: (id: string) => run("download_latest_project", { id, directory: downloadDirectory }),
    downloadDirectory,
    setDownloadDirectory,
    cancel: () => command("cancel_package_download"),
  };
}
export type PackageController = ReturnType<typeof usePackages>;
