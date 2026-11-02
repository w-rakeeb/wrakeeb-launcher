import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Github,
  FileArchive,
  FileCode2,
  FileText,
  AppWindow,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { command, desktop } from "./bridge";
import type { ViewApp } from "./catalog";
import type { ProjectRelease, PackageController } from "./usePackages";
import { bytes } from "./UpdateView";

export function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const kind =
    ext === "zip"
      ? "archive"
      : ext === "ps1"
        ? "powershell"
        : ["cmd", "bat"].includes(ext ?? "")
          ? "script"
          : ext === "exe"
            ? "application"
            : name.toLowerCase().includes("sha256")
              ? "checksum"
              : "document";
  const Icon =
    kind === "archive"
      ? FileArchive
      : ["powershell", "script"].includes(kind)
        ? FileCode2
        : kind === "application"
          ? AppWindow
          : kind === "checksum"
            ? ShieldCheck
            : FileText;
  return (
    <span className={`file-icon file-${kind}`} aria-hidden="true">
      <Icon size={21} />
    </span>
  );
}

export function StorageChoices({
  downloadDirectory,
  installDirectory,
  chooseDownload,
  chooseInstall,
}: {
  downloadDirectory?: string;
  installDirectory?: string;
  chooseDownload?: () => void;
  chooseInstall?: () => void;
}) {
  return (
    <div className="storage-choices">
      <div>
        <FolderOpen size={17} className="folder-color" />
        <div>
          <strong>Download location</strong>
          <span className="file-path">
            {downloadDirectory ?? "Choose a download folder"}
          </span>
        </div>
        {chooseDownload && (
          <button
            className="btn btn-sm"
            onClick={chooseDownload}
            disabled={!desktop}
          >
            Choose download folder
          </button>
        )}
      </div>
      <div>
        <FolderOpen size={17} className="folder-color" />
        <div>
          <strong>Application location</strong>
          <span className="file-path">
            {installDirectory ?? "Choose an installation folder"}
          </span>
        </div>
        {chooseInstall && (
          <button
            className="btn btn-sm"
            onClick={chooseInstall}
            disabled={!desktop}
          >
            Choose installation folder
          </button>
        )}
      </div>
      <p>
        Each project gets its own Downloads and Versions folders. Existing files
        stay in their original location when you change a folder.
      </p>
    </div>
  );
}

export function PackageOperation({
  packages,
  openFolder,
  launch,
  downloadDirectory,
  installDirectory,
  chooseDownload,
  chooseInstall,
}: {
  packages: PackageController;
  openFolder: () => void;
  launch?: () => void;
  downloadDirectory?: string;
  installDirectory?: string;
  chooseDownload?: () => void;
  chooseInstall?: () => void;
}) {
  const { status, busy } = packages;
  if (!status.stage)
    return (
      <section className="transfer-idle">
        <Download size={24} />
        <h2>No active downloads</h2>
        <p>
          Choose Download on a project to get its latest recommended release.
        </p>
        <StorageChoices
          {...{
            downloadDirectory,
            installDirectory,
            chooseDownload,
            chooseInstall,
          }}
        />
      </section>
    );
  const labels: Record<string, string> = {
    downloading: "Downloading",
    verifying: "Verifying",
    downloaded: "Ready to install",
    installing: "Installing",
    installed: "Ready",
    cancelled: "Cancelled",
    interrupted: "Interrupted",
    error: "Needs attention",
  };
  const moving = ["downloading", "verifying", "installing"].includes(
    status.stage,
  );
  const step =
    status.stage === "installed"
      ? 3
      : status.stage === "installing"
        ? 2
        : status.stage === "downloaded"
          ? 1
          : 0;
  return (
    <section
      className="package-operation"
      aria-label="Package operation"
      aria-live="polite"
    >
      <div className="transfer-heading">
        <FileIcon name={status.name} />
        <div>
          <h2>{status.name || "Project package"}</h2>
          <p>
            {status.version} · {bytes(status.totalBytes)}
          </p>
        </div>
        <span className={`badge status-pill status-${status.stage}`}>
          {labels[status.stage] ?? status.stage}
        </span>
      </div>
      <ul className="steps transfer-steps" aria-label="Installation stages">
        {["Download", "Verify", "Install", "Ready"].map((label, i) => (
          <li key={label} className={`step ${i <= step ? "step-primary" : ""}`}>
            {label}
          </li>
        ))}
      </ul>
      <p className="transfer-message">{status.message}</p>
      {moving && (
        <>
          <progress
            className="progress progress-primary"
            aria-label="Project download"
            value={status.downloadedBytes}
            max={status.totalBytes || 1}
          />
          <p className="transfer-bytes">
            {bytes(status.downloadedBytes)} / {bytes(status.totalBytes)}
          </p>
        </>
      )}
      {status.path && (
        <details className="package-path">
          <summary>Downloaded file</summary>
          <p className="file-path">{status.path}</p>
        </details>
      )}
      <StorageChoices
        {...{
          downloadDirectory,
          installDirectory,
          chooseDownload,
          chooseInstall,
        }}
      />
      <div className="folder-actions">
        {status.stage === "downloading" && (
          <button className="btn btn-sm" onClick={() => void packages.cancel()}>
            Cancel download
          </button>
        )}
        {status.stage === "downloaded" && status.asset?.installable && (
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => void packages.install()}
          >
            Install package
          </button>
        )}
        {status.stage === "installed" && launch && (
          <button className="btn btn-primary" onClick={launch}>
            Launch installed app
          </button>
        )}
        <button className="btn btn-sm" onClick={openFolder}>
          <FolderOpen size={15} className="folder-color" />
          Open download folder
        </button>
      </div>
    </section>
  );
}

export function ProjectReleasePanel({
  app,
  packages,
  onRelease,
  openFolder,
  launch,
  downloadDirectory,
  installDirectory,
  chooseDownload,
  chooseInstall,
}: {
  app: ViewApp;
  packages: PackageController;
  onRelease?: (release: ProjectRelease) => void;
  openFolder: () => void;
  launch: () => void;
  downloadDirectory?: string;
  installDirectory?: string;
  chooseDownload: () => void;
  chooseInstall: () => void;
}) {
  const [release, setRelease] = useState<ProjectRelease>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!desktop || !app.repository) return;
    setLoading(true);
    setError("");
    command<ProjectRelease>("get_project_release", {
      id: app.id,
      refresh: attempt > 0,
    })
      .then((result) => {
        if (active) {
          setRelease(result);
          onRelease?.(result);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [app.id, app.repository, attempt, onRelease]);
  const open = async (releases: boolean) => {
    try {
      await command("open_project_page", { id: app.id, releases });
    } catch (e) {
      setError(String(e));
    }
  };
  const recommended = release?.assets.find(
    (a) => a.id === release.recommendedAssetId,
  );
  return (
    <section className="release-workspace" id="release-files">
      <div className="section-heading">
        <h2>
          <Github size={19} className="github-color" />
          GitHub release
        </h2>
        <button
          className="btn btn-sm btn-ghost"
          aria-label="Refresh project release"
          disabled={loading || !desktop}
          onClick={() => setAttempt((n) => n + 1)}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>
      <div className="project-source">
        <span>{app.repository}</span>
        <button
          className="btn btn-sm btn-ghost"
          disabled={!desktop}
          onClick={() => void open(false)}
        >
          Repository <ExternalLink size={13} />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          disabled={!desktop}
          onClick={() => void open(true)}
        >
          Release history <ExternalLink size={13} />
        </button>
      </div>
      {loading && (
        <p className="loading-copy" role="status">
          Checking the latest release…
        </p>
      )}
      {error && (
        <div className="release-error" role="alert">
          <p>{error}</p>
          <p>
            Local apps remain available. You can also open the repository or
            locate an existing installation.
          </p>
          <button
            className="btn btn-sm"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry release check
          </button>
        </div>
      )}
      {!desktop && (
        <p>Open the desktop application to load live GitHub release details.</p>
      )}
      {release && (
        <>
          <div className="release-meta">
            <strong>{release.version}</strong>
            <span>
              {release.publishedAt
                ? new Date(release.publishedAt).toLocaleDateString(undefined, {
                    dateStyle: "medium",
                  })
                : "Date unavailable"}
            </span>
            <span>
              Checked{" "}
              {new Date(release.checkedAt * 1000).toLocaleTimeString(
                undefined,
                { hour: "2-digit", minute: "2-digit" },
              )}
            </span>
          </div>
          {recommended && (
            <div className="recommended-package">
              <FileIcon name={recommended.name} />
              <div>
                <span>Recommended for Windows</span>
                <strong>{recommended.name}</strong>
                <p>
                  {bytes(recommended.size)} ·{" "}
                  {recommended.installable
                    ? "Portable installation"
                    : "Manual setup"}
                </p>
              </div>
              <button
                className="btn btn-primary"
                disabled={packages.busy}
                onClick={() => void packages.downloadLatest(app.id)}
              >
                <Download size={16} />
                Download latest
              </button>
            </div>
          )}
          <details className="release-assets" open={!recommended}>
            <summary>
              All release files <span>{release.assets.length}</span>
              <ChevronDown size={14} />
            </summary>
            <div className="release-file-list">
              {release.assets.map((asset) => (
                <div className="release-file" key={asset.id}>
                  <FileIcon name={asset.name} />
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {bytes(asset.size)} ·{" "}
                      {asset.installable ? "Installable" : "Direct download"}
                    </span>
                    <details className="checksum-details">
                      <summary>SHA-256 checksum</summary>
                      <code>{asset.digest}</code>
                    </details>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={packages.busy}
                    onClick={() => void packages.download(app.id, asset.id)}
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </details>
          <details className="release-notes">
            <summary>Release notes</summary>
            <pre>{release.notes || "No release notes were provided."}</pre>
          </details>
        </>
      )}
      {packages.status.projectId === app.id ? (
        <PackageOperation
          packages={packages}
          openFolder={openFolder}
          launch={app.linked || app.available ? launch : undefined}
          {...{
            downloadDirectory,
            installDirectory,
            chooseDownload,
            chooseInstall,
          }}
        />
      ) : (
        <StorageChoices
          {...{
            downloadDirectory,
            installDirectory,
            chooseDownload,
            chooseInstall,
          }}
        />
      )}
      <p className="package-disclaimer">
        <ShieldCheck size={15} />
        The downloaded file is checked against GitHub’s size and SHA-256 before
        installation. Installing creates a separate version folder; it does not
        run the app or migrate existing app data.
      </p>
    </section>
  );
}
