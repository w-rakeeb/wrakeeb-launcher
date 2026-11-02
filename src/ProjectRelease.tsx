import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { command, desktop } from "./bridge";
import type { ViewApp, Installation } from "./catalog";
import type { ProjectRelease, PackageController } from "./usePackages";
import { bytes } from "./UpdateView";

export function PackageOperation({
  packages,
  openFolder,
  launch,
}: {
  packages: PackageController;
  openFolder: () => void;
  launch?: () => void;
}) {
  const { status, busy } = packages;
  if (!status.stage)
    return (
      <div className="transfer-idle">
        <Download size={24} />
        <h2>No package transfers</h2>
        <p>
          Select a project in Discover to view its GitHub release files. Start
          with Launcher Demo to test installation.
        </p>
      </div>
    );
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
        <div>
          <span className="eyebrow">
            {status.projectId.replaceAll("-", " ")}
          </span>
          <h2>{status.name || "Package transfer"}</h2>
        </div>
        <span
          className={`badge badge-soft ${status.stage === "error" ? "badge-error" : status.stage === "installed" ? "badge-success" : "badge-neutral"}`}
        >
          {status.stage}
        </span>
      </div>
      <ul className="steps transfer-steps" aria-label="Installation stages">
        {["Download", "Verify", "Install", "Ready"].map((label, i) => (
          <li className={`step ${i <= step ? "step-primary" : ""}`} key={label}>
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
      {status.path && <p className="file-path transfer-path">{status.path}</p>}
      <div className="folder-actions">
        {status.stage === "downloading" && (
          <button className="btn btn-sm" onClick={() => void packages.cancel()}>
            Cancel download
          </button>
        )}
        {status.stage === "downloaded" && status.asset?.installable && (
          <button
            className="btn btn-sm btn-primary"
            disabled={busy}
            onClick={() => void packages.install()}
          >
            Install package
          </button>
        )}
        {status.stage === "installed" && launch && (
          <button className="btn btn-sm btn-primary" onClick={launch}>
            Launch installed app
          </button>
        )}
        <button className="btn btn-sm" onClick={openFolder}>
          <FolderOpen size={15} />
          Download folder
        </button>
      </div>
    </section>
  );
}

export function ProjectReleasePanel({
  app,
  installation,
  packages,
  openFolder,
  launch,
  installDirectory,
}: {
  app: ViewApp;
  installation?: Installation;
  packages: PackageController;
  openFolder: () => void;
  launch: () => void;
  installDirectory?: string;
}) {
  const [release, setRelease] = useState<ProjectRelease>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!desktop) return;
    setLoading(true);
    setError("");
    setRelease(undefined);
    command<ProjectRelease>("get_project_release", {
      id: app.id,
      refresh: attempt > 0,
    })
      .then((data) => {
        if (active) setRelease(data);
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
  }, [app.id, attempt]);
  return (
    <section className="release-workspace" id="release-files">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Distribution</span>
          <h2>GitHub release files</h2>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          disabled={loading || !desktop}
          aria-label="Refresh project release"
          onClick={() => setAttempt((a) => a + 1)}
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
          onClick={() =>
            void command("open_project_page", { id: app.id, releases: false })
          }
        >
          Repository <ExternalLink size={13} />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          disabled={!desktop}
          onClick={() =>
            void command("open_project_page", { id: app.id, releases: true })
          }
        >
          All releases <ExternalLink size={13} />
        </button>
      </div>
      {installation && (
        <p className="installed-summary">
          <CheckCircle2 size={16} /> Installed {installation.version}
          <span className="file-path">{installation.directory}</span>
        </p>
      )}
      {loading && <p role="status">Reading the latest release from GitHub…</p>}
      {error && (
        <div className="release-error" role="alert">
          <p>{error}</p>
          <p>
            Local library entries remain available. Use Repository to view
            source or releases in your browser.
          </p>
          <button
            className="btn btn-sm"
            onClick={() => setAttempt((a) => a + 1)}
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
                : "Publication date unavailable"}
            </span>
            <span>
              Source: GitHub · checked{" "}
              {new Date(release.checkedAt * 1000).toLocaleTimeString(
                undefined,
                { hour: "2-digit", minute: "2-digit" },
              )}
            </span>
          </div>
          {release.description && (
            <p className="repository-description">{release.description}</p>
          )}
          <div className="release-file-list">
            {release.assets.length ? (
              release.assets.map((asset) => (
                <div className="release-file" key={asset.id}>
                  <Download size={17} />
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {bytes(asset.size)} ·{" "}
                      {asset.installable
                        ? "Installable package"
                        : "Direct download"}{" "}
                      · SHA-256 provided
                    </span>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={packages.busy}
                    onClick={() => void packages.download(app.id, asset.id)}
                  >
                    Download
                  </button>
                </div>
              ))
            ) : (
              <p>
                No files with verifiable GitHub checksums are available in this
                release.
              </p>
            )}
          </div>
          <details className="release-notes">
            <summary>Release notes from GitHub</summary>
            <pre>
              {release.notes || "The publisher has not included release notes."}
            </pre>
          </details>
          <p className="install-destination">
            Application folder{" "}
            <span className="file-path">{installDirectory}</span>
          </p>
        </>
      )}
      {packages.status.projectId === app.id && (
        <PackageOperation
          packages={packages}
          openFolder={openFolder}
          launch={app.linked ? launch : undefined}
        />
      )}
      <p className="package-disclaimer">
        Packages are downloaded only when you choose Download. Installation
        creates a fresh version folder and switches its library link. Previous
        folders and data are retained; app-data migration is not automatic.
        Installation does not start the app. Run scripts only after reviewing
        their purpose. PowerShell uses your existing execution policy.
      </p>
    </section>
  );
}
