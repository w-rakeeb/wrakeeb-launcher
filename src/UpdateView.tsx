import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  CheckCheck,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { UpdateStatus } from "./useLauncherUpdates";
import { desktop } from "./bridge";

export interface UpdateActions {
  status: UpdateStatus;
  check: () => Promise<void>;
  download: () => Promise<void>;
  install: () => Promise<void>;
  cancel: () => Promise<void>;
}
export const bytes = (value: number) =>
  `${(value / 1024 / 1024).toFixed(1)} MB`;
export function UpdateView({
  updates,
  downloadDirectory,
  openFolder,
  releasePage,
}: {
  updates: UpdateActions;
  downloadDirectory: string;
  openFolder: () => void;
  releasePage: () => void;
}) {
  const { status } = updates;
  const busy = ["checking", "downloading", "applying"].includes(status.stage);
  const newer = status.latestVersion
    ? status.latestVersion.localeCompare(status.installedVersion, undefined, {
        numeric: true,
      }) > 0
    : false;
  return (
    <div className="updates-layout">
      <section className="update-main-panel">
        <div className={`update-result result-${status.stage}`}>
          <div className="update-result-icon">
            {busy ? (
              <LoaderCircle size={24} className="spin" />
            ) : status.stage === "current" || status.stage === "installed" ? (
              <CheckCheck size={26} />
            ) : (
              <RefreshCw size={25} />
            )}
          </div>
          <div>
            <h2>
              {status.stage === "available"
                ? "A new version is ready"
                : status.stage === "current"
                  ? "You're up to date"
                  : status.stage === "error"
                    ? "Couldn't finish the update check"
                    : status.stage === "downloaded"
                      ? "Package verified"
                      : status.stage === "checking"
                        ? "Checking for updates"
                        : status.stage === "downloading"
                          ? "Downloading package"
                          : "Wrakeeb Launcher"}
            </h2>
            <p role="status">{status.message}</p>
          </div>
        </div>
        <dl className="update-version-grid">
          <div>
            <dt>Installed version</dt>
            <dd>{status.installedVersion}</dd>
          </div>
          <div>
            <dt>Latest stable</dt>
            <dd>{status.latestVersion ?? "Not checked"}</dd>
          </div>
          <div>
            <dt>Last checked</dt>
            <dd>
              {status.lastChecked
                ? new Date(status.lastChecked * 1000).toLocaleString()
                : "Not yet"}
            </dd>
          </div>
        </dl>
        {status.stage === "downloading" && (
          <div className="update-progress">
            <progress
              className="progress progress-primary"
              aria-label="Launcher package download"
              value={status.downloadedBytes}
              max={status.totalBytes || 1}
            />
            <div>
              <span>
                {bytes(status.downloadedBytes)} / {bytes(status.totalBytes)}
              </span>
              <button
                className="text-button"
                onClick={() => void updates.cancel()}
              >
                Cancel download
              </button>
            </div>
          </div>
        )}
        <div className="update-actions">
          <button
            className="btn btn-primary"
            disabled={!desktop || busy}
            onClick={() => void updates.check()}
          >
            <RefreshCw
              size={16}
              className={status.stage === "checking" ? "spin" : ""}
            />
            {status.stage === "checking" ? "Checking…" : "Check for updates"}
          </button>
          {status.latestVersion &&
            !["error", "ahead"].includes(status.stage) && (
              <button
                className="btn"
                disabled={!desktop || busy}
                onClick={() => void updates.download()}
              >
                <ArrowDownToLine size={16} />
                {newer ? "Download update" : "Download release"}
              </button>
            )}
          {status.stage === "downloaded" && newer && (
            <button
              className="btn"
              disabled={busy}
              onClick={() => void updates.install()}
            >
              <Check size={16} />
              Install & restart
            </button>
          )}
        </div>
        {!desktop && (
          <p className="update-preview-note">
            Update checks and downloads are available in the desktop
            application.
          </p>
        )}
        <div className="update-safety">
          <ShieldCheck size={17} />
          <span>
            Stable GitHub releases. SHA-256 verification before install. The
            previous executable is backed up; your library stays in place.
          </span>
        </div>
      </section>
      <aside className="update-side-panel">
        <h2>Download location</h2>
        <p className="file-path">{downloadDirectory}</p>
        <button className="btn btn-sm" disabled={!desktop} onClick={openFolder}>
          <FolderOpen size={15} />
          Open folder
        </button>
        <div className="update-channel">
          <span>Release channel</span>
          <strong>Stable · Windows x64</strong>
        </div>
        <button
          className="text-button"
          disabled={!desktop}
          onClick={releasePage}
        >
          Release history <ArrowUpRight size={14} />
        </button>
      </aside>
      <section className="release-notes-panel">
        <h2>What's new</h2>
        {status.notes ? (
          <p className="release-notes-text">{status.notes}</p>
        ) : (
          <p>Check for updates to read the latest published release notes.</p>
        )}
      </section>
    </div>
  );
}
