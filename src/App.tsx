import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FolderOpen,
  Grid2X2,
  HardDrive,
  LayoutList,
  Library,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  X,
  Link2,
  RefreshCw,
  CircleHelp,
} from "lucide-react";
import {
  catalog,
  appViews,
  filterApps,
  type Page,
  type Snapshot,
  type ViewApp,
  type Preferences,
} from "./catalog";
import { command, desktop, getSnapshot, savePreferences } from "./bridge";
import { AppArtwork, AppGlyph, ProjectGallery } from "./AppArtwork";
import { SettingsView } from "./SettingsView";
import { UpdateView, bytes } from "./UpdateView";
import { WindowControls } from "./WindowControls";
import { APP_VERSION, useLauncherUpdates } from "./useLauncherUpdates";
import brandLogo from "./assets/brand/wrakeeb.png";
import { usePackages } from "./usePackages";
import { ProjectReleasePanel, PackageOperation } from "./ProjectRelease";

const navigation: { id: Page; label: string; icon: typeof Library }[] = [
  { id: "library", label: "Library", icon: Library },
  { id: "discover", label: "Discover", icon: Grid2X2 },
  { id: "downloads", label: "Downloads", icon: ArrowDownToLine },
  { id: "updates", label: "Updates", icon: RefreshCw },
  { id: "activity", label: "Activity", icon: ActivityIcon },
];
const headings: Record<Page, [string, string]> = {
  library: ["Your library", "Installed applications, scripts and local tools."],
  discover: [
    "Discover",
    "Applications, scripts and utilities published by Wrakeeb.",
  ],
  downloads: ["Downloads", "Package transfers, verification and installation."],
  updates: ["Launcher updates", "The latest stable release, on your terms."],
  activity: ["Activity", "The latest from your local library."],
  settings: ["Settings", "Appearance, storage and launcher preferences."],
};
function readPage(): Page {
  try {
    const page = location.hash.slice(1) || localStorage.getItem("wrakeeb-page");
    return navigation.some((item) => item.id === page) || page === "settings"
      ? (page as Page)
      : "library";
  } catch {
    return "library";
  }
}
function humanTime(value: number): string {
  const delta = Math.max(0, Date.now() / 1000 - value);
  if (delta < 60) return "Just now";
  if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} h ago`;
  return new Date(value * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const updates = useLauncherUpdates(
    snapshot
      ? (snapshot.store.preferences.checkUpdatesOnStart ?? true)
      : undefined,
  );
  useEffect(() => {
    document.documentElement.dataset.theme =
      snapshot?.store.preferences.theme ?? "discord";
    const accent = snapshot?.store.preferences.accent ?? "default";
    const colors: Record<string, string> = {
      blue: "#4055d6",
      teal: "#087f72",
      red: "#b93445",
      amber: "#946000",
    };
    for (const token of ["--color-primary", "--color-accent"]) {
      if (colors[accent])
        document.documentElement.style.setProperty(token, colors[accent]);
      else document.documentElement.style.removeProperty(token);
    }
    for (const token of ["--color-primary-content", "--color-accent-content"]) {
      if (colors[accent])
        document.documentElement.style.setProperty(token, "#ffffff");
      else document.documentElement.style.removeProperty(token);
    }
  }, [snapshot?.store.preferences.theme, snapshot?.store.preferences.accent]);
  const [page, setPage] = useState<Page>(readPage);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All apps");
  const [sort, setSort] = useState("name");
  const [list, setList] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  const [loadError, setLoadError] = useState<string>();
  const [removeId, setRemoveId] = useState<string>();
  const [help, setHelp] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [page, detailId]);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const notify = useCallback(
    (text: string, error = false) => setNotice({ text, error }),
    [],
  );
  const refresh = useCallback(async () => {
    const data = await getSnapshot();
    setSnapshot(data);
    setLoadError(undefined);
    return data;
  }, []);
  const packages = usePackages(refresh);
  useEffect(() => {
    refresh()
      .then((data) => {
        if (desktop) void command("confirm_frontend_ready").catch(() => {});
        if (!data.store.preferences.rememberPage) setPage("library");
      })
      .catch((error) => setLoadError(String(error)));
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(
      () => setNotice(undefined),
      notice.error ? 12000 : 4500,
    );
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (snapshot?.store.preferences.rememberPage) {
      try {
        localStorage.setItem("wrakeeb-page", page);
      } catch {
        /* Session still works without browser storage. */
      }
    }
  }, [page, snapshot?.store.preferences.rememberPage]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        setDetailId(undefined);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (removeId) removeDialog.current?.showModal();
    else removeDialog.current?.close();
  }, [removeId]);
  useEffect(() => {
    if (help) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [help]);

  async function perform(
    key: string,
    action: () => Promise<unknown>,
    message?: string,
  ) {
    if (busy || loadError) return;
    setBusy(key);
    try {
      await action();
      await refresh();
      if (message) notify(message);
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), true);
    } finally {
      setBusy(undefined);
    }
  }
  function navigate(next: Page, nextFilter = "All apps") {
    setPage(next);
    setDetailId(undefined);
    setQuery("");
    setFilter(nextFilter);
  }
  function addLocal() {
    return perform("add", async () => {
      const id = await command<string | null>("pick_application");
      if (id)
        notify("Application added. Its files stay in their original location.");
    });
  }
  function link(app: ViewApp) {
    if (!app.available) {
      if (app.repository) {
        setDetailId(app.id);
        requestAnimationFrame(() =>
          document
            .getElementById("release-files")
            ?.scrollIntoView({ behavior: "auto", block: "start" }),
        );
        return;
      }
      void addLocal();
      return;
    }
    void perform(
      app.id,
      () => command("link_catalog_app", { id: app.id }),
      `${app.name} added to your library.`,
    );
  }
  function launch(app: ViewApp) {
    if (app.linked)
      void perform(
        app.id,
        () => command("launch_application", { id: app.linked!.id }),
        `Asked Windows to open ${app.name}.`,
      );
  }
  async function preferences(patch: Partial<Preferences>) {
    if (!snapshot) return;
    await perform("settings", async () => {
      await savePreferences({ ...snapshot.store.preferences, ...patch });
      setSettingsSaved(true);
    });
  }
  const views = snapshot ? appViews(snapshot) : [];
  const linked = views.filter((app) => app.linked);
  const detected = views.filter((app) => app.available && !app.linked);
  const detail = views.find((app) => app.id === detailId);
  const removal = linked.find((app) => app.linked?.id === removeId);
  const collection = page === "library" ? linked : views;
  const displayed = filterApps(collection, query, filter, sort);
  const isEmptyLibrary = page === "library" && linked.length === 0;
  const pageTitle = detail ? detail.name : headings[page][0];

  return (
    <div
      className={`launcher ${snapshot?.store.preferences.compact ? "compact" : ""} ${snapshot?.store.preferences.reduceMotion ? "reduce-motion" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <span className="brand-badge">
            <img src={brandLogo} alt="Wrakeeb brand" />
          </span>
          <div>
            <strong>Wrakeeb</strong>
            <span>Launcher</span>
          </div>
        </div>
        <div className="scope">
          <HardDrive size={14} aria-hidden="true" />
          <span>This computer</span>
        </div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-collection">
          <span className="nav-group-title">Your collection</span>
          <button
            className={`nav-item ${filter === "Favorites" && page === "library" ? "active" : ""}`}
            onClick={() => navigate("library", "Favorites")}
          >
            <Star size={17} aria-hidden="true" />
            <span>Favorites</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            aria-label="Settings"
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} aria-hidden="true" />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} aria-hidden="true" />
            <span>About & help</span>
          </button>
          <div className="build-info">
            <span className="build-dot" />
            Early access <span>{APP_VERSION}</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar" data-tauri-drag-region>
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {detail ? "App details" : page[0].toUpperCase() + page.slice(1)}
            </strong>
          </div>
          <div className="topbar-actions">
            <label className="input search-input">
              <Search size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                aria-label="Search applications"
                placeholder="Find an app..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (detail) setDetailId(undefined);
                  if (page !== "library" && page !== "discover")
                    setPage("discover");
                }}
              />
              <span className="shortcut">Ctrl K</span>
            </label>
            <button
              className="btn btn-sm top-add"
              aria-label="Add application"
              onClick={() => void addLocal()}
              disabled={!!busy || !snapshot || !!loadError}
            >
              <Plus size={16} aria-hidden="true" />
              <span className="button-label">Add application</span>
            </button>
          </div>
          <WindowControls />
        </header>
        <main id="main" tabIndex={-1} ref={contentRef}>
          {!desktop && (
            <div className="preview-banner">
              <span>Browser preview</span> Open the desktop build to link and
              launch applications.
            </div>
          )}
          {loadError ? (
            <section className="load-error" role="alert">
              <h1>Unable to open your library</h1>
              <p>{loadError}</p>
              <button
                className="btn"
                onClick={() =>
                  refresh().catch((error) => setLoadError(String(error)))
                }
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </section>
          ) : !snapshot ? (
            <div className="loading-state" role="status">
              <LoaderCircle className="spin" size={22} />
              <span>Opening your library...</span>
            </div>
          ) : detail ? (
            <>
              <button
                className="back-link"
                onClick={() => setDetailId(undefined)}
              >
                <ArrowLeft size={15} />
                Back to {page === "library" ? "library" : "discover"}
              </button>
              <div className="detail-heading">
                <div className="detail-identity">
                  <AppGlyph app={detail} size={48} />
                  <div>
                    <span className="detail-category">{detail.category}</span>
                    <h1>{pageTitle}</h1>
                    <p>{detail.tagline}</p>
                  </div>
                </div>
                <Action
                  app={detail}
                  busy={!!busy}
                  launch={launch}
                  link={link}
                />
              </div>
              <div className="detail-grid">
                <div>
                  <ProjectGallery app={detail} key={detail.id} />
                  <section className="detail-about">
                    <h2>About {detail.name}</h2>
                    <p>{detail.description}</p>
                    <ul>
                      {detail.features.map((feature) => (
                        <li key={feature}>
                          <Check size={15} aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </section>
                  {detail.repository && (
                    <ProjectReleasePanel
                      key={detail.id}
                      app={detail}
                      installation={snapshot.store.installations?.find(
                        (i) => i.catalogId === detail.id,
                      )}
                      packages={packages}
                      openFolder={() =>
                        void perform("download-folder", () =>
                          command("open_download_directory"),
                        )
                      }
                      launch={() => launch(detail)}
                      installDirectory={snapshot.installDirectory}
                    />
                  )}
                </div>
                <aside className="detail-info">
                  <h2>Project information</h2>
                  <dl>
                    <div>
                      <dt>Platform</dt>
                      <dd>Windows 10 / 11</dd>
                    </div>
                    <div>
                      <dt>Type</dt>
                      <dd>{detail.kind ?? "Application"}</dd>
                    </div>
                    <div>
                      <dt>Distribution</dt>
                      <dd>
                        {detail.repository ? "GitHub Releases" : "Local file"}
                      </dd>
                    </div>
                    <div>
                      <dt>Installed version</dt>
                      <dd>
                        {snapshot.store.installations?.find(
                          (i) => i.catalogId === detail.id,
                        )?.version ??
                          (detail.linked
                            ? "Externally managed"
                            : "Not installed")}
                      </dd>
                    </div>
                  </dl>
                  {detail.linked ? (
                    <>
                      <label className="path-label">Executable</label>
                      <p className="file-path">{detail.linked.path}</p>
                      <button
                        className="btn btn-sm w-full"
                        disabled={!!busy || detail.missing}
                        onClick={() =>
                          void perform(detail.id, () =>
                            command("reveal_application", {
                              id: detail.linked!.id,
                            }),
                          )
                        }
                      >
                        <FolderOpen size={15} />
                        Open folder
                      </button>
                      <button
                        className="btn btn-sm btn-ghost w-full"
                        disabled={!!busy}
                        onClick={() =>
                          void perform(detail.id, () =>
                            command("set_favorite", {
                              id: detail.linked!.id,
                              favorite: !detail.linked!.favorite,
                            }),
                          )
                        }
                      >
                        <Star
                          size={15}
                          fill={
                            detail.linked.favorite ? "currentColor" : "none"
                          }
                        />
                        {detail.linked.favorite
                          ? "Remove favorite"
                          : "Add to favorites"}
                      </button>
                      <button
                        className="remove-link"
                        onClick={() => setRemoveId(detail.linked!.id)}
                      >
                        Remove from library
                      </button>
                    </>
                  ) : (
                    <p className="aside-note">
                      {detail.available
                        ? "An existing installation was found on this computer. Add it to your library to get started."
                        : "Choose a release file below to download. You can also link an existing app or script with Add application."}
                    </p>
                  )}
                  <div className="preserve-note">
                    <ShieldCheck size={17} />
                    <p>
                      Linking keeps the application and its data in their
                      original location.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1>{pageTitle}</h1>
                  <p>{headings[page][1]}</p>
                </div>
                {page === "discover" && (
                  <span className="collection-note">
                    {catalog.length} projects in the collection
                  </span>
                )}
                {page === "library" && (
                  <button
                    className="btn btn-sm btn-ghost refresh-button"
                    aria-label="Refresh library"
                    disabled={!!busy}
                    onClick={() =>
                      void perform(
                        "refresh",
                        async () => {},
                        "Library refreshed.",
                      )
                    }
                  >
                    <RefreshCw
                      size={15}
                      className={busy === "refresh" ? "spin" : ""}
                    />
                    <span className="button-label">Refresh</span>
                  </button>
                )}
              </div>
              {page === "library" || page === "discover" ? (
                <>
                  {!isEmptyLibrary && (
                    <div className="collection-toolbar">
                      <div className="filters" aria-label="Filter applications">
                        {(page === "library"
                          ? ["All apps", "Favorites"]
                          : [
                              "All apps",
                              "Utilities",
                              "Productivity",
                              "Communication",
                              "Scripts",
                              "Demos",
                            ]
                        ).map((item) => (
                          <button
                            key={item}
                            className={filter === item ? "selected" : ""}
                            onClick={() => setFilter(item)}
                            aria-pressed={filter === item}
                          >
                            {item}
                            {item === "All apps" && (
                              <span>{collection.length}</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="view-tools">
                        <label className="sort-control">
                          <span className="sr-only">Sort applications</span>
                          <select
                            className="select select-sm"
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                          >
                            <option value="name">Name</option>
                            <option value="recent">Recently used</option>
                          </select>
                          <ChevronDown size={12} aria-hidden="true" />
                        </label>
                        <div className="view-switch">
                          <button
                            aria-label="Grid view"
                            aria-pressed={!list}
                            onClick={() => setList(false)}
                          >
                            <Grid2X2 size={16} />
                          </button>
                          <button
                            aria-label="List view"
                            aria-pressed={list}
                            onClick={() => setList(true)}
                          >
                            <LayoutList size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {isEmptyLibrary ? (
                    <>
                      <div className="first-run">
                        <div className="first-run-copy">
                          <span className="quiet-label">Getting started</span>
                          <h2>No applications installed yet</h2>
                          <p>
                            Install a published package from Discover, or add an
                            existing application or script. Programs installed
                            through the launcher can also run independently.
                          </p>
                          <button
                            className="btn btn-primary"
                            onClick={() => void addLocal()}
                            disabled={!!busy}
                          >
                            <Plus size={16} />
                            Add your first app
                          </button>
                          <button
                            className="text-button"
                            onClick={() => navigate("discover")}
                          >
                            Explore the collection <ArrowRight size={14} />
                          </button>
                        </div>
                        <div className="first-run-guide">
                          <h3>Install your first package</h3>
                          <ol>
                            <li>Open Discover and select Launcher Demo.</li>
                            <li>Download its verified GitHub release.</li>
                            <li>Install the package, then launch it.</li>
                          </ol>
                          <p>
                            You can also add an existing .exe, .cmd, .bat or
                            .ps1 file.
                          </p>
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setPage("discover");
                              setDetailId("launcher-demo");
                            }}
                          >
                            Open Launcher Demo <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                      {detected.length ? (
                        <section className="detected-section">
                          <div className="section-heading">
                            <h2>Found on this computer</h2>
                            <span>
                              {detected.length} applications available to link
                            </span>
                          </div>
                          <div className="detected-list">
                            {detected.map((app) => (
                              <div className="detected-row" key={app.id}>
                                <AppGlyph app={app} />
                                <button
                                  className="detected-title"
                                  onClick={() => setDetailId(app.id)}
                                >
                                  <strong>{app.name}</strong>
                                  <span>{app.category}</span>
                                </button>
                                <button
                                  className="btn btn-sm"
                                  disabled={!!busy}
                                  onClick={() => link(app)}
                                >
                                  <Plus size={14} />
                                  Add to library
                                </button>
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : (
                        <div className="local-note">
                          <HardDrive size={18} />
                          <p>
                            Choose a local .exe file to add an application. No
                            files are moved.
                          </p>
                        </div>
                      )}
                    </>
                  ) : displayed.length ? (
                    <div
                      className={list ? "apps-list" : "apps-grid"}
                      data-count={displayed.length}
                    >
                      {displayed.map((app) => (
                        <article className="app-item" key={app.id}>
                          <button
                            className="art-button"
                            onClick={() => setDetailId(app.id)}
                            aria-label={`View ${app.name}`}
                          >
                            <AppArtwork app={app} />
                          </button>
                          <div className="app-card-content">
                            <div className="app-title-row">
                              <button
                                className="app-title"
                                onClick={() => setDetailId(app.id)}
                              >
                                <AppGlyph app={app} size={25} />
                                <span>{app.name}</span>
                              </button>
                              {app.linked && (
                                <button
                                  className="favorite-button"
                                  aria-label={`${app.linked.favorite ? "Unfavorite" : "Favorite"} ${app.name}`}
                                  aria-pressed={app.linked.favorite}
                                  disabled={!!busy}
                                  onClick={() =>
                                    void perform(app.id, () =>
                                      command("set_favorite", {
                                        id: app.linked!.id,
                                        favorite: !app.linked!.favorite,
                                      }),
                                    )
                                  }
                                >
                                  <Star
                                    size={16}
                                    fill={
                                      app.linked.favorite
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                </button>
                              )}
                            </div>
                            <p className="app-tagline">{app.tagline}</p>
                            <div className="app-bottom">
                              <span
                                className={`app-status ${app.missing ? "missing" : ""}`}
                              >
                                {app.missing
                                  ? "File not found"
                                  : app.linked
                                    ? app.installed
                                      ? "Installed"
                                      : app.kind === "Script"
                                        ? "Linked script"
                                        : "Linked application"
                                    : app.available
                                      ? "On this computer"
                                      : app.category}
                              </span>
                              <Action
                                app={app}
                                busy={!!busy}
                                launch={launch}
                                link={link}
                              />
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="no-results">
                      <Search size={24} />
                      <h2>
                        {filter === "Favorites" && !query
                          ? "Your favorites, close by."
                          : "No applications found"}
                      </h2>
                      <p>
                        {filter === "Favorites" && !query
                          ? "Star an app in your library to find it here."
                          : "Try another name or clear your filters."}
                      </p>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setFilter("All apps");
                          setQuery("");
                        }}
                      >
                        Show all apps
                      </button>
                    </div>
                  )}
                  {page === "discover" && (
                    <div className="catalog-footnote">
                      <ShieldCheck size={16} />
                      <p>
                        Release files are loaded directly from each project's
                        GitHub repository. Availability and requirements vary by
                        project.
                      </p>
                    </div>
                  )}
                </>
              ) : page === "downloads" ? (
                <div className="downloads-layout">
                  <PackageOperation
                    packages={packages}
                    openFolder={() =>
                      void perform("download-folder", () =>
                        command("open_download_directory"),
                      )
                    }
                    launch={
                      linked.find((a) => a.id === packages.status.projectId)
                        ? () =>
                            launch(
                              linked.find(
                                (a) => a.id === packages.status.projectId,
                              )!,
                            )
                        : undefined
                    }
                  />
                  <section className="downloads-empty">
                    <div className="empty-symbol">
                      <ArrowDownToLine size={29} strokeWidth={1.4} />
                    </div>
                    <h2>
                      {updates.status.stage === "downloading"
                        ? "Downloading launcher update"
                        : updates.status.downloadPath
                          ? "Verified package ready"
                          : "No downloads yet"}
                    </h2>
                    {updates.status.stage === "downloading" ? (
                      <>
                        <progress
                          className="progress progress-primary"
                          aria-label="Package download"
                          value={updates.status.downloadedBytes}
                          max={updates.status.totalBytes || 1}
                        />
                        <p>
                          {bytes(updates.status.downloadedBytes)} /{" "}
                          {bytes(updates.status.totalBytes)}
                        </p>
                        <button
                          className="btn"
                          onClick={() => void updates.cancel()}
                        >
                          Cancel download
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          {updates.status.downloadPath ??
                            "Launcher update packages appear here. Project downloads and installation status are shown above."}
                        </p>
                        <button
                          className="btn"
                          onClick={() => navigate("updates")}
                        >
                          Launcher updates <ArrowRight size={15} />
                        </button>
                      </>
                    )}
                  </section>
                  <section className="download-info">
                    <h2>Your download folder</h2>
                    <p className="file-path">{snapshot.downloadDirectory}</p>
                    <button
                      className="btn btn-sm"
                      disabled={!desktop || !!busy}
                      onClick={() =>
                        void perform(
                          "download-folder",
                          () => command("choose_download_directory"),
                          "Download location saved.",
                        )
                      }
                    >
                      <FolderOpen size={15} />
                      Choose folder
                    </button>
                    <div className="download-guidance">
                      <h2>Verified before install</h2>
                      <p>
                        Launcher packages are checked against GitHub's checksum.
                        Installing an update preserves your app links and
                        preferences.
                      </p>
                      <p>
                        Project files are downloaded from GitHub. Approved
                        portable packages can be installed in a separate folder;
                        other files remain direct downloads.
                      </p>
                    </div>
                  </section>
                </div>
              ) : page === "updates" ? (
                <UpdateView
                  updates={updates}
                  downloadDirectory={
                    snapshot.downloadDirectory ?? "Choose a download folder"
                  }
                  openFolder={() =>
                    void perform("open-downloads", () =>
                      command("open_download_directory"),
                    )
                  }
                  releasePage={() =>
                    void perform("release-page", () =>
                      command("open_release_page"),
                    )
                  }
                />
              ) : page === "activity" ? (
                <section className="activity-panel">
                  {snapshot.store.activity.length ? (
                    snapshot.store.activity.map((item) => (
                      <div className="activity-row" key={item.id}>
                        <span className="activity-dot" />
                        <div>
                          <strong>{item.name}</strong>
                          <span>{item.action}</span>
                        </div>
                        <time dateTime={new Date(item.at * 1000).toISOString()}>
                          {humanTime(item.at)}
                        </time>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">
                      <ActivityIcon size={26} />
                      <h2>A fresh start</h2>
                      <p>
                        App additions, launch requests and removals will appear
                        here.
                      </p>
                      <button
                        className="btn btn-sm"
                        onClick={() => navigate("library")}
                      >
                        Go to library
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <SettingsView
                  snapshot={snapshot}
                  busy={!!busy}
                  saved={settingsSaved}
                  change={(patch) => void preferences(patch)}
                  chooseDirectory={() =>
                    void perform(
                      "download-folder",
                      () => command("choose_download_directory"),
                      "Download location saved.",
                    )
                  }
                  openFolder={() =>
                    void perform("open-downloads", () =>
                      command("open_download_directory"),
                    )
                  }
                  openUpdates={() => navigate("updates")}
                  help={() => setHelp(true)}
                  chooseInstallDirectory={() =>
                    void perform(
                      "install-folder",
                      () => command("choose_install_directory"),
                      "Application folder updated. Existing installations stay in place.",
                    )
                  }
                  createShortcut={() =>
                    void perform(
                      "desktop-shortcut",
                      () => command("create_desktop_shortcut"),
                      "Desktop shortcut created.",
                    )
                  }
                />
              )}
            </>
          )}
        </main>
        <footer className="statusbar">
          <span>
            <span className="status-dot" />
            {desktop ? "Local library" : "Preview mode"}
          </span>
          <span>{linked.length} in library</span>
          <span className="footer-right">Made by Wrakeeb</span>
        </footer>
      </div>
      {notice && (
        <div
          className={`notification ${notice.error ? "is-error" : ""}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice(undefined)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        ref={removeDialog}
        className="modal"
        onClose={() => setRemoveId(undefined)}
        aria-labelledby="remove-title"
      >
        <div className="modal-box">
          <h2 id="remove-title">Remove {removal?.name}?</h2>
          <p>
            This removes the shortcut from your library. The application, its
            files and its settings stay on your computer.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Keep application</button>
            </form>
            <button
              className="btn"
              disabled={!!busy}
              onClick={() => {
                const id = removeId;
                setRemoveId(undefined);
                if (id)
                  void perform(
                    id,
                    () => command("remove_application", { id }),
                    "Removed from library. Application files were kept.",
                  );
              }}
            >
              Remove from library
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>
      <dialog
        ref={helpDialog}
        className="modal"
        onClose={() => setHelp(false)}
        aria-labelledby="help-title"
      >
        <div className="modal-box">
          <h2 id="help-title">Wrakeeb Launcher</h2>
          <p>Applications, scripts and utilities. Version {APP_VERSION}.</p>
          <h3>Getting started</h3>
          <p>
            Open Discover for GitHub releases, or use Add application to link an
            .exe, .cmd, .bat or .ps1 file. Select a project for screenshots,
            requirements, release files and installation controls.
          </p>
          <h3>Your apps stay yours</h3>
          <p>
            Linking and removing shortcuts never moves or deletes application
            files. Launching opens the program you selected. Only add
            executables you trust.
          </p>
          <h3>Downloads and installation</h3>
          <p>
            Project packages are downloaded, verified and installed separately.
            Installed apps run independently. Launcher updates are managed in
            Updates. Scripts run only when you choose Run script.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Got it</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>Close</button>
        </form>
      </dialog>
    </div>
  );
}

function Action({
  app,
  busy,
  launch,
  link,
}: {
  app: ViewApp;
  busy: boolean;
  launch: (app: ViewApp) => void;
  link: (app: ViewApp) => void;
}) {
  return app.linked ? (
    <button
      className="btn btn-sm launch-button"
      disabled={busy || app.missing}
      onClick={() => launch(app)}
    >
      {app.kind === "Script" ? "Run script" : "Launch"}{" "}
      <ArrowRight size={14} aria-hidden="true" />
    </button>
  ) : (
    <button
      className="btn btn-sm link-button"
      disabled={busy}
      onClick={() => link(app)}
    >
      {app.available ? (
        <>
          <Plus size={14} aria-hidden="true" />
          Add to library
        </>
      ) : (
        <>
          <Link2 size={14} aria-hidden="true" />
          {app.repository ? "View downloads" : "Choose file"}
        </>
      )}
    </button>
  );
}
