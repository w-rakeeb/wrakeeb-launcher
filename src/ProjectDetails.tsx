import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  FolderOpen,
  Github,
  LocateFixed,
  ShieldCheck,
  Star,
  ExternalLink,
  MoreHorizontal,
} from "lucide-react";
import type { Snapshot, ViewApp } from "./catalog";
import type { PackageController, ProjectRelease } from "./usePackages";
import { ProjectGallery, AppGlyph } from "./AppArtwork";
import { ProjectReleasePanel } from "./DistributionPanel";
import { bytes } from "./UpdateView";
import { desktop } from "./bridge";

export function ProjectDetails({
  app,
  snapshot,
  packages,
  action,
  back,
  locate,
  reveal,
  favorite,
  remove,
  uninstall,
  createShortcut,
  openRepository,
  openFolder,
  chooseDownload,
  chooseInstall,
  launch,
  busy,
}: {
  app: ViewApp;
  snapshot: Snapshot;
  packages: PackageController;
  action: ReactNode;
  back: () => void;
  locate: () => void;
  reveal: () => void;
  favorite: () => void;
  remove: () => void;
  uninstall: () => void;
  createShortcut: () => void;
  openRepository: () => void;
  openFolder: () => void;
  chooseDownload: () => void;
  chooseInstall: () => void;
  launch: () => void;
  busy: boolean;
}) {
  const [tab, setTab] = useState("overview");
  const [release, setRelease] = useState<ProjectRelease>();
  useEffect(() => {
    if (
      packages.status.projectId === app.id &&
      [
        "downloading",
        "downloaded",
        "verifying",
        "installing",
        "error",
        "cancelled",
        "interrupted",
      ].includes(packages.status.stage)
    )
      setTab("downloads");
  }, [app.id, packages.status.projectId, packages.status.stage]);
  const recommended = release?.assets.find(
    (a) => a.id === release.recommendedAssetId,
  );
  const path = app.linked?.path ?? app.detected?.path;
  const status = app.missing
    ? "File missing"
    : app.installed
      ? "Installed"
      : app.linked || app.available
        ? "Detected on this PC"
        : "Not installed";
  const facts = [
    ["Latest release", release?.version ?? "—"],
    ["Package size", recommended ? bytes(recommended.size) : "—"],
    [
      "Installed files",
      app.installed?.installedBytes
        ? bytes(app.installed.installedBytes)
        : app.detected
          ? `${bytes(app.detected.executableBytes)} executable`
          : "Not measured",
    ],
  ];
  return (
    <article className="project-details">
      <button className="back-link" onClick={back}>
        <ArrowLeft size={14} />
        Back to collection
      </button>
      <header className="project-hero">
        <AppGlyph app={app} size={62} />
        <div className="project-heading">
          <div className="project-heading-meta">
            <span>{app.category}</span>
            <span
              className={`project-state ${app.missing ? "is-missing" : ""}`}
            >
              {status}
            </span>
          </div>
          <h1>{app.name}</h1>
          <p>{app.tagline}</p>
        </div>
        <div className="project-primary-actions">
          {action}
          <button
            className="btn btn-sm"
            disabled={busy || !desktop}
            onClick={locate}
          >
            <LocateFixed size={15} />
            Locate app
          </button>
        </div>
      </header>
      <div className="project-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div>
          <span>Distribution</span>
          <strong className="source-identity">
            <Github size={15} />
            {app.repository ? "GitHub Releases" : "Local file"}
          </strong>
        </div>
      </div>
      <div className="project-tabbar">
        <div
          className="tabs tabs-border"
          role="tablist"
          aria-label="Project sections"
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const tabs = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]',
              ),
            );
            const index = tabs.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (index +
                      (event.key === "ArrowRight" ? 1 : -1) +
                      tabs.length) %
                    tabs.length;
            tabs[next]?.click();
            tabs[next]?.focus();
          }}
        >
          {["overview", "downloads", "information"].map((id) => (
            <button
              key={id}
              role="tab"
              tabIndex={tab === id ? 0 : -1}
              aria-selected={tab === id}
              aria-controls={`project-panel-${id}`}
              id={`project-tab-${id}`}
              className={`tab ${tab === id ? "tab-active" : ""}`}
              onClick={() => setTab(id)}
            >
              {id === "overview"
                ? "Overview"
                : id === "downloads"
                  ? "Downloads"
                  : "Information"}
            </button>
          ))}
        </div>
        <details className="dropdown dropdown-end project-more">
          <summary
            className="btn btn-sm btn-ghost"
            aria-label="Project options"
          >
            <MoreHorizontal size={18} />
          </summary>
          <ul className="dropdown-content menu menu-sm">
            <li>
              <button
                onClick={openRepository}
                disabled={!app.repository || !desktop}
              >
                Open GitHub repository
              </button>
            </li>
            {path && <li><button onClick={createShortcut}>Create desktop shortcut</button></li>}
            {path && (
              <li>
                <button onClick={reveal}>Open application folder</button>
              </li>
            )}
            {app.installed && <li><button className="text-error" disabled={busy || packages.busy} onClick={uninstall}>Uninstall application…</button></li>}
            {app.linked && (
              <>
                <li>
                  <button onClick={favorite}>
                    {app.linked.favorite
                      ? "Remove favorite"
                      : "Add to favorites"}
                  </button>
                </li>
                <li>
                  <button className="text-error" onClick={remove}>
                    Remove library link
                  </button>
                </li>
              </>
            )}
          </ul>
        </details>
      </div>
      <section
        role="tabpanel"
        id="project-panel-overview"
        aria-labelledby="project-tab-overview"
        hidden={tab !== "overview"}
      >
        <div className="project-overview-grid">
          <div>
            <ProjectGallery app={app} key={app.id} />
            <section className="project-description">
              <h2>About {app.name}</h2>
              <p>{app.description}</p>
              <ul>
                {app.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="project-summary">
            <h2>At a glance</h2>
            <dl>
              <div>
                <dt>Platform</dt>
                <dd>Windows</dd>
              </div>
              <div>
                <dt>Project type</dt>
                <dd>{app.kind ?? "Application"}</dd>
              </div>
              <div>
                <dt>Installed version</dt>
                <dd>
                  {app.installed?.version ??
                    (path ? "External installation" : "Not installed")}
                </dd>
              </div>
              <div><dt>Last launched</dt><dd>{app.linked?.lastLaunched ? new Date(app.linked.lastLaunched * 1000).toLocaleString() : "Never launched"}</dd></div>
              <div>
                <dt>License</dt>
                <dd>{release?.license ?? "See repository"}</dd>
              </div>
            </dl>
            {app.repository && (
              <button
                className="btn btn-sm w-full"
                onClick={openRepository}
                disabled={!desktop}
              >
                <Github size={16} />
                GitHub repository <ExternalLink size={13} />
              </button>
            )}
            {path && (
              <div className="summary-location">
                <strong>Application file</strong>
                <p className="file-path">{path}</p>
                <button className="btn btn-sm w-full" onClick={reveal}>
                  <FolderOpen size={15} className="folder-color" />
                  Open folder
                </button>
              </div>
            )}
            <p className="summary-note">
              <ShieldCheck size={16} />
              Installation never starts an app automatically. Existing profiles
              and account settings remain separate.
            </p>
          </aside>
        </div>
      </section>
      <section
        role="tabpanel"
        id="project-panel-downloads"
        aria-labelledby="project-tab-downloads"
        hidden={tab !== "downloads"}
      >
        {app.repository ? (
          <ProjectReleasePanel
            app={app}
            packages={packages}
            onRelease={setRelease}
            {...{ openFolder, launch, chooseDownload, chooseInstall }}
            downloadDirectory={snapshot.downloadDirectory}
            installDirectory={snapshot.installDirectory}
          />
        ) : (
          <p className="local-project-note">
            This is a locally linked file. No GitHub download source is
            registered.
          </p>
        )}
      </section>
      <section
        role="tabpanel"
        id="project-panel-information"
        aria-labelledby="project-tab-information"
        hidden={tab !== "information"}
      >
        <div className="project-information-grid">
          <section>
            <h2>Installation details</h2>
            <dl className="information-list">
              <div>
                <dt>State</dt>
                <dd>{status}</dd>
              </div>
              <div>
                <dt>Installed release</dt>
                <dd>
                  {app.installed?.version ?? "Managed outside the launcher"}
                </dd>
              </div>
              <div>
                <dt>Package file</dt>
                <dd>
                  {app.installed?.packageName ??
                    recommended?.name ??
                    "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Package size</dt>
                <dd>
                  {app.installed?.packageBytes
                    ? bytes(app.installed.packageBytes)
                    : recommended
                      ? bytes(recommended.size)
                      : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Installed files</dt>
                <dd>
                  {app.installed?.installedBytes
                    ? bytes(app.installed.installedBytes)
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Installed on</dt>
                <dd>
                  {app.installed?.installedAt
                    ? new Date(
                        app.installed.installedAt * 1000,
                      ).toLocaleString()
                    : "Not recorded"}
                </dd>
              </div>
              <div>
                <dt>Detected by</dt>
                <dd>{app.detected?.source ?? "Your library"}</dd>
              </div>
            </dl>
            {path && <p className="file-path information-path">{path}</p>}
          </section>
          <section>
            <h2>Publisher and integrity</h2>
            <p>
              Release files come directly from{" "}
              {app.repository ?? "the local file you selected"}. A GitHub
              checksum verifies the downloaded bytes; it is not an application
              security audit or a publisher signature.
            </p>
            {app.installed?.sha256 && (
              <>
                <h3>Installed package SHA-256</h3>
                <code className="checksum-value">{app.installed.sha256}</code>
              </>
            )}
            <h3>Application data</h3>
            <p>
              New versions use separate folders. Previous files are retained,
              but app-local data is not migrated automatically. Removing a
              library link does not uninstall the app.
            </p>
            {app.id === "coucou" && (
              <p>
                Original Coucou and Mochi branding/artwork belong to Louis
                Raillé. This launcher uses a neutral catalog icon while
                redistribution permission is unconfirmed.
              </p>
            )}
          </section>
        </div>
      </section>
    </article>
  );
}
