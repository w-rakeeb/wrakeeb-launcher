import { lazy, Suspense, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
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
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
  MoreHorizontal,
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
const SettingsView = lazy(() => import("./SettingsView").then(module => ({ default: module.SettingsView })));
import { accessibleAccent, luminance } from "./preferences";
import { UpdateView, bytes } from "./UpdateView";

import { APP_VERSION, useLauncherUpdates } from "./useLauncherUpdates";
import brandLogo from "./assets/brand/wrakeeb.png";
import { usePackages, type PackageController } from "./usePackages";
import type { PaletteAction } from "./CommandPalette";
const CommandPalette = lazy(() => import("./CommandPalette"));
const ActivityTimeline = lazy(() => import("./ActivityTimeline"));
import { DownloadHistory } from "./DownloadInsights";
import { PackageOperation } from "./DistributionPanel";
import { ProjectDetails } from "./ProjectDetails";
import { AppMenu } from "./AppMenu";
import { listen } from "@tauri-apps/api/event";

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
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const updates = useLauncherUpdates(
    snapshot
      ? (snapshot.store.preferences.checkUpdatesOnStart ?? true)
      : undefined,
  );
  useEffect(() => {
    document.documentElement.dataset.theme =
      snapshot?.store.preferences.theme ?? "discord";
    const accent = snapshot?.store.preferences.accent ?? "default";
    const customAccent = snapshot?.store.preferences.customAccent;
    const colors: Record<string, string> = {
      blue: "#4055d6",
      teal: "#087f72",
      red: "#b93445",
      amber: "#946000",
    };
    for (const token of ["--color-primary", "--color-accent"]) {
      if (customAccent || colors[accent])
        document.documentElement.style.setProperty(token, accessibleAccent(customAccent || colors[accent], snapshot?.store.preferences.theme ?? "discord"));
      else document.documentElement.style.removeProperty(token);
    }
    for (const token of ["--color-primary-content", "--color-accent-content"]) {
      if (customAccent || colors[accent]) {
        const color = accessibleAccent(customAccent || colors[accent], snapshot?.store.preferences.theme ?? "discord");
        document.documentElement.style.setProperty(token, luminance(color) > .179 ? "#111318" : "#ffffff");
      }
      else document.documentElement.style.removeProperty(token);
    }
  }, [snapshot?.store.preferences.theme, snapshot?.store.preferences.accent, snapshot?.store.preferences.customAccent]);
  const [page, setPage] = useState<Page>(readPage);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => { const timer = setTimeout(() => setDebouncedQuery(query), 120); return () => clearTimeout(timer); }, [query]);
  const [palette, setPalette] = useState(false);
  const [context, setContext] = useState<{ id: string; x: number; y: number }>();
  const contextRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!context) return; contextRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); const close = (e: Event) => { if (!contextRef.current?.contains(e.target as Node)) setContext(undefined); }; const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setContext(undefined); }; document.addEventListener("pointerdown", close); window.addEventListener("keydown", escape); return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("keydown", escape); }; }, [context]);
  const [filter, setFilter] = useState("All apps");
  const [sort, setSort] = useState("name");
  const [list, setList] = useState(false);
  const [cardSize, setCardSize] = useState(260);
  const initialPreferences = useRef(false);
  useEffect(() => { if (!snapshot || initialPreferences.current) return; initialPreferences.current = true; setList(snapshot.store.preferences.libraryView === "list"); setFilter(snapshot.store.preferences.libraryFilter ?? "All apps"); setCardSize(snapshot.store.preferences.cardSize ?? 260); }, [snapshot]);
  const [dragId, setDragId] = useState<string>();
  const [dropId, setDropId] = useState<string>();
  const [uninstallId, setUninstallId] = useState<string>();
  const uninstallDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (uninstallId) uninstallDialog.current?.showModal();
    else uninstallDialog.current?.close();
  }, [uninstallId]);
  useEffect(() => { if (snapshot) setList(snapshot.store.preferences.libraryView === "list"); }, [snapshot?.store.preferences.libraryView]);
  useEffect(() => { if (snapshot) setCardSize(snapshot.store.preferences.cardSize ?? 260); }, [snapshot?.store.preferences.cardSize]);
  useEffect(() => { if (snapshot) setFilter(snapshot.store.preferences.libraryFilter ?? "All apps"); }, [snapshot?.store.preferences.libraryFilter]);
  const [detailId, setDetailId] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  const [loadError, setLoadError] = useState<string>();
  const [removeId, setRemoveId] = useState<string>();
  const [help, setHelp] = useState(false);
  const [legalNotices, setLegalNotices] = useState<string>();
  const [settingsSaved, setSettingsSaved] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const scanned = useRef(false);
  const [scanning, setScanning] = useState(false);
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
    if (!snapshot || !desktop || scanned.current) return;
    scanned.current = true;
    if (snapshot.store.preferences.scanOnStart ?? true) {
      setScanning(true);
      command("scan_installed_apps")
        .then(refresh)
        .catch(() => {})
        .finally(() => setScanning(false));
    }
  }, [snapshot, refresh]);
  useEffect(() => {
    if (!desktop) return;
    let active = true;
    let stop: (() => void) | undefined;
    listen<string>("shell:navigate", (event) => {
      if (active) {
        setPage(event.payload as Page);
        setDetailId(undefined);
      }
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
        setPalette(true);
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
  async function scan() {
    if (scanning) return;
    setScanning(true);
    try {
      const result = await command<{
        found: number;
        foldersChecked: number;
        limited: boolean;
      }>("scan_installed_apps");
      await refresh();
      notify(
        `Found ${result.found} applications. ${result.limited ? "Scan limit reached; use Locate app for other folders." : "No application files were changed."}`,
      );
    } catch (error) {
      notify(String(error), true);
    } finally {
      setScanning(false);
    }
  }
  function locate(app: ViewApp) {
    if (!app.repository) {
      void addLocal();
      return;
    }
    void perform("locate", () => command("locate_catalog_app", { id: app.id }));
  }
  function link(app: ViewApp) {
    if (app.missing) {
      locate(app);
      return;
    }
    if (app.available) {
      void perform(
        "link",
        () => command("link_catalog_app", { id: app.id }),
        `${app.name} added to your library.`,
      );
      return;
    }
    if (app.id === "coucou") {
      setDetailId(app.id);
      return;
    }
    if (app.repository) {
      setDetailId(app.id);
      void packages.downloadLatest(app.id);
      return;
    }
    void addLocal();
  }
  function launch(app: ViewApp) {
    void perform(
      app.id,
      async () => {
        const id =
          app.linked?.id ??
          (await command<string>("link_catalog_app", { id: app.id }));
        await command("launch_application", { id });
      },
      `Asked Windows to open ${app.name}.`,
    );
  }
  const chooseDownload = () =>
    void perform("download-folder", async () => {
      const directory = await command<string | null>("choose_download_directory", { temporary: true });
      if (directory) packages.setDownloadDirectory(directory);
    });
  const chooseInstall = () =>
    void perform("install-folder", () => command("choose_install_directory"));
  const openDownloads = () =>
    void perform("download-folder", () =>
      command("open_storage_directory", { kind: "package" }),
    );
  async function preferences(patch: Partial<Preferences>) {
    if (!snapshot) return;
    await perform("settings", async () => {
      await savePreferences({ ...snapshot.store.preferences, ...patch });
      if (patch.libraryView) setList(patch.libraryView === "list");
      if (patch.libraryFilter) setFilter(patch.libraryFilter);
      if (patch.cardSize) setCardSize(patch.cardSize);
      setSettingsSaved(true);
      notify("Preferences saved.");
    });
  }
  const views = snapshot ? appViews(snapshot) : [];
  const linked = views.filter((app) => app.linked);
  const detected = views.filter((app) => app.available && !app.linked);
  const detail = views.find((app) => app.id === detailId);
  const removal = linked.find((app) => app.linked?.id === removeId);
  const collection = page === "library"
      ? views.filter(app => (filter === "Not installed" || app.linked || app.available) && (!snapshot?.store.preferences.hideLinked || !app.linked || app.installed))
      : views;
  const effectiveSort = snapshot?.store.preferences.librarySort ?? sort;
  const displayed = filterApps(collection, debouncedQuery, filter, effectiveSort, snapshot?.store.preferences.customOrder);
  async function reorder(source: string, target: string) {
    if (source === target || !snapshot || busy) return;
    const order = filterApps(views, "", "All apps", effectiveSort, snapshot.store.preferences.customOrder).map(a => a.id);
    const moved = order.indexOf(source);
    const destination = order.indexOf(target);
    if (moved < 0 || destination < 0) return;
    order.splice(moved, 1);
    order.splice(destination, 0, source);
    await preferences({ customOrder: order, librarySort: "custom" });
    notify("Custom order saved.");
  }
  const isEmptyLibrary = page === "library" && collection.length === 0;
  const pageTitle = detail ? detail.name : headings[page][0];
  const contextApp = views.find(a => a.id === context?.id);
  function revealApp(app: ViewApp) { void perform("reveal", () => command(app.linked ? "reveal_application" : "reveal_catalog_app", { id: app.linked?.id ?? app.id })); }
  function shortcut(app: ViewApp) { void perform("shortcut", async () => { const id = app.linked?.id ?? await command<string>("link_catalog_app", { id: app.id }); await command("create_application_shortcut", { id }); }, "Application shortcut created on your desktop."); }
  const paletteActions: PaletteAction[] = [
    ...views.map(app => ({ id: `app-${app.id}`, label: app.name, group: "Applications", detail: app.linked || app.available ? "Launch application" : "View project details", run: () => { if (app.linked || app.available) launch(app); else { setPage("discover"); setDetailId(app.id); } } })),
    ...[...navigation, { id: "settings" as Page, label: "Settings" }].map(item => ({ id: `page-${item.id}`, label: `Open ${item.label}`, group: "Pages", run: () => navigate(item.id) })),
    { id: "scan", label: "Scan installed apps", group: "Actions", disabled: !desktop || scanning, run: () => void scan() },
    { id: "refresh", label: "Refresh library", group: "Actions", run: () => void perform("refresh", async () => {}, "Library refreshed.") },
    { id: "theme", label: "Toggle light / dark theme", group: "Appearance", disabled: !desktop, run: () => void preferences({ theme: snapshot?.store.preferences.theme === "light" ? "discord" : "light" }) },
  ];
  const recentApps = filterApps(collection.filter(a => a.linked?.lastLaunched && !a.missing), "", "All apps", "recent").slice(0, 4);

  return (
    <div
      className={`launcher ${snapshot?.store.preferences.sidebarCollapsed ? "rail-collapsed" : ""} ${snapshot?.store.preferences.compact ? "compact" : ""} ${snapshot?.store.preferences.reduceMotion ? "reduce-motion" : ""} ${snapshot?.store.preferences.largeText ? "large-text" : ""}`}
    >
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <AppMenu
        back={() => setDetailId(undefined)}
        canGoBack={!!detail}
        menus={{
          File: [
            {
              label: "Add application or script…",
              action: () => void addLocal(),
              disabled: !!busy,
            },
            {
              label: "Scan installed apps",
              action: () => void scan(),
              disabled: scanning,
            },
            {
              label: "Open downloads folder",
              action: () =>
                void perform("download-folder", () =>
                  command("open_storage_directory", { kind: "downloads" }),
                ),
            },
            {
              label: "Hide to tray",
              action: () => void perform("hide", () => command("hide_to_tray")),
              disabled: !desktop,
            },
            {
              label: "Exit",
              action: () => void command("exit_launcher"),
              disabled: !desktop,
            },
          ],
          Edit: [
            {
              label: "Find an application",
              action: () => setPalette(true),
              shortcut: "Ctrl K",
            },
            {
              label: "Clear search and filters",
              action: () => {
                setQuery("");
                setFilter("All apps");
              },
            },
          ],
          View: [
            ...navigation.map((item) => ({
              label: item.label,
              action: () => navigate(item.id),
            })),
            { label: "Settings", action: () => navigate("settings") },
            { label: "Refresh library", action: () => void refresh() },
          ],
          Help: [
            {
              label: "About, privacy and notices",
              action: () => setHelp(true),
            },
            {
              label: "Check for launcher updates",
              action: () => {
                navigate("updates");
                void updates.check();
              },
            },
            {
              label: "Release history",
              action: () =>
                void perform("history", () => command("open_release_page")),
              disabled: !desktop,
            },
          ],
        }}
      />
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
        <button className="rail-toggle" title="Collapse or expand sidebar" aria-label="Collapse or expand sidebar" aria-pressed={snapshot?.store.preferences.sidebarCollapsed ?? false} disabled={!desktop || !!busy} onClick={() => void preferences({ sidebarCollapsed: !snapshot?.store.preferences.sidebarCollapsed })}>{snapshot?.store.preferences.sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}<span>Navigation</span></button>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              title={label}
              className={`nav-item ${page === id && !(id === "library" && filter === "Favorites") ? "active" : ""}`}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              {id === "downloads" && packages.busy && <b className="nav-count">1</b>}
              {id === "updates" && updates.status.stage === "available" && <b className="nav-count">1</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-collection">
          <button
            aria-label="Favorites"
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
          <button
            className="nav-item"
            aria-label="About & help"
            onClick={() => setHelp(true)}
          >
            <CircleHelp size={18} aria-hidden="true" />
            <span>About & help</span>
          </button>
          <div className="build-info">
            <span className="build-dot" />
            <span className="connection-state">{online ? "Online" : "Offline"}</span><span>{APP_VERSION}</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar" data-tauri-drag-region>
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
        </header>
        <main id="main" tabIndex={-1} ref={contentRef}>
          {!desktop && (
            <div className="preview-banner">
              <span>Browser preview</span> Open the desktop build to link and
              launch applications.
            </div>
          )}
          {!online && <div className="offline-banner" role="status"><WifiOff size={16} /><span>Offline · Your local apps are ready. Release checks and downloads need a connection.</span></div>}
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
            <ProjectDetails
              key={detail.id}
              app={detail}
              snapshot={{ ...snapshot, downloadDirectory: packages.downloadDirectory ?? snapshot.downloadDirectory }}
              packages={packages}
              busy={!!busy}
              action={
                <Action
                  app={detail}
                  busy={!!busy || packages.busy}
                  operation={packages}
                  launch={launch}
                  link={link}
                />
              }
              back={() => setDetailId(undefined)}
              locate={() => locate(detail)}
              launch={() => launch(detail)}
              reveal={() =>
                void perform("reveal", () =>
                  command(
                    detail.linked ? "reveal_application" : "reveal_catalog_app",
                    { id: detail.linked?.id ?? detail.id },
                  ),
                )
              }
              favorite={() =>
                void perform("favorite", () =>
                  command("set_favorite", {
                    id: detail.linked!.id,
                    favorite: !detail.linked!.favorite,
                  }),
                )
              }
              remove={() => setRemoveId(detail.linked!.id)}
              uninstall={() => setUninstallId(detail.id)}
              openRepository={() =>
                void perform("source", () =>
                  command("open_project_page", {
                    id: detail.id,
                    releases: false,
                  }),
                )
              }
              openFolder={openDownloads}
              chooseDownload={chooseDownload}
              chooseInstall={chooseInstall}
              createShortcut={() => shortcut(detail)}
            />
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
                {(page === "library" || page === "discover") && (
                  <button
                    className="btn btn-sm scan-button"
                    onClick={() => void scan()}
                    disabled={scanning || !desktop}
                  >
                    <RefreshCw size={15} className={scanning ? "spin" : ""} />
                    {scanning ? "Scanning…" : "Scan installed apps"}
                  </button>
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
                  {page === "discover" && !query && filter === "All apps" && <section className="discover-feature"><div><span>From the Wrakeeb collection</span><h2>A little more room for your ideas.</h2><p>StickyN keeps notes close to your work. Explore the app, see its workspace, and choose a release.</p><button className="btn btn-primary" onClick={() => setDetailId("stickyn")}>Explore StickyN <ArrowRight size={15} /></button></div><button aria-label="Preview StickyN" onClick={() => setDetailId("stickyn")}><img src={catalog.find(app => app.id === "stickyn")?.images?.[0]?.src} alt="StickyN desktop workspace" loading="lazy" /></button></section>}
                  {page === "library" && !query && filter === "All apps" && recentApps.length > 0 && <section className="recent-shelf" aria-label="Recently used"><div className="section-heading"><h2>Continue where you left off</h2><span>Recently launched</span></div><div>{recentApps.map(app => <button className="recent-app" key={app.id} onClick={() => launch(app)} disabled={!!busy}><AppGlyph app={app} size={30} /><span><strong>{app.name}</strong><small>{humanTime(app.linked!.lastLaunched!)}</small></span><ArrowRight size={16} /></button>)}</div></section>}
                  {!isEmptyLibrary && (
                    <div className="collection-toolbar">
                      <div className="filters" aria-label="Filter applications">
                        {(page === "library"
                          ? ["All apps", "Installed", "Linked", "Favorites", "Not installed"]
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
                            onClick={() => { setFilter(item); if (desktop && page === "library") void preferences({ libraryFilter: item }); }}
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
                        {!list && <label className="card-size-control"><span>Card size</span><input className="range range-xs" type="range" min="200" max="360" step="20" aria-label="Library card size" value={cardSize} onChange={event => setCardSize(Number(event.target.value))} onPointerUp={() => void preferences({ cardSize })} onKeyUp={() => void preferences({ cardSize })} /></label>}
                        <label className="sort-control">
                          <span className="sr-only">Sort applications</span>
                          <select
                            className="select select-sm"
                            value={effectiveSort}
                            onChange={(event) => { setSort(event.target.value); if (desktop) void preferences({ librarySort: event.target.value }); }}
                          >
                            <option value="name">Name</option>
                            <option value="recent">Recently used</option>
                            <option value="added">Recently added</option>
                            <option value="size">Size</option>
                            <option value="custom">Custom order</option>
                          </select>
                          <ChevronDown size={12} aria-hidden="true" />
                        </label>
                        <div className="view-switch">
                          <button
                            aria-label="Grid view"
                            aria-pressed={!list}
                            onClick={() => { setList(false); if (desktop) void preferences({ libraryView: "grid" }); }}
                          >
                            <Grid2X2 size={16} />
                          </button>
                          <button
                            aria-label="List view"
                            aria-pressed={list}
                            onClick={() => { setList(true); if (desktop) void preferences({ libraryView: "list" }); }}
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
                          {!snapshot.store.preferences.onboardingComplete && <div className="quick-setup"><h3>Make yourself at home</h3><ol><li><button className="text-button" onClick={chooseInstall}>Choose an application folder</button></li><li><label>Choose your look<select className="select select-sm" aria-label="Setup theme" disabled={!desktop || !!busy} value={snapshot.store.preferences.theme ?? "discord"} onChange={e => void preferences({ theme: e.target.value as Preferences["theme"] })}><option value="discord">Wrakeeb Dark</option><option value="light">Light</option><option value="midnight">Midnight</option><option value="obsidian">AMOLED</option></select></label></li><li><button className="text-button" disabled={scanning || !desktop} onClick={() => void scan()}>Scan for installed apps</button></li></ol><button className="btn btn-sm btn-ghost" disabled={!desktop || !!busy} onClick={() => void preferences({ onboardingComplete: true })}>Done / skip setup</button></div>}
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
                      style={{ "--card-size": `${cardSize}px` } as CSSProperties}
                      onKeyDown={event => { const card = (event.target as HTMLElement).closest<HTMLElement>(".app-item"); if (!card || event.altKey || (event.target as HTMLElement).closest("select,input")) return; const index = displayed.findIndex(a => a.id === card.dataset.appId); if (event.key === "Enter" && event.target === card) { event.preventDefault(); const app = displayed[index]; if (app.linked || app.available) launch(app); else setDetailId(app.id); } if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); const columns = list ? 1 : Math.max(1, getComputedStyle(event.currentTarget).gridTemplateColumns.split(" ").length); const next = index + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -columns : columns); event.currentTarget.querySelectorAll<HTMLElement>(".app-item")[Math.max(0, Math.min(displayed.length - 1, next))]?.focus(); } }}
                    >
                      {displayed.map((app) => (
                        <article tabIndex={0} data-app-id={app.id} aria-label={app.name}
                          onContextMenu={event => { event.preventDefault(); setContext({ id: app.id, x: event.clientX, y: event.clientY }); }}
                          className={`app-item ${dragId === app.id ? "is-dragging" : ""} ${dropId === app.id ? "is-drop-target" : ""}`} key={app.id}
                          onDragOver={event => { if (dragId && dragId !== app.id) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropId(app.id); } }}
                          onDrop={event => { event.preventDefault(); if (dragId) void reorder(dragId, app.id); setDragId(undefined); setDropId(undefined); }}>
                          {page === "library" && <button className="reorder-handle" draggable={desktop && !busy} disabled={!desktop || !!busy}
                            aria-label={`Reorder ${app.name}`} title="Drag to reorder · Alt + Arrow keys to move"
                            onDragStart={event => { setDragId(app.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", app.id); }}
                            onDragEnd={() => { setDragId(undefined); setDropId(undefined); }}
                            onKeyDown={event => { if (event.altKey && ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"].includes(event.key)) { event.preventDefault(); const index = displayed.findIndex(a => a.id === app.id); const target = displayed[index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1)]; if (target) void reorder(app.id, target.id); } }}><GripVertical size={16} /></button>}
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
                              <button className="card-options" aria-label={`Options for ${app.name}`} onClick={event => { const box = event.currentTarget.getBoundingClientRect(); setContext({ id: app.id, x: box.right, y: box.bottom }); }}><MoreHorizontal size={17} /></button>
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
                            <div className="card-metadata"><span>{app.installed?.version ?? (app.linked ? "Linked" : app.available ? "Detected" : "Not installed")}</span><span>{app.installed?.installedBytes ? bytes(app.installed.installedBytes) : app.detected ? `${bytes(app.detected.executableBytes)} exe` : "Size unavailable"}</span><span className="last-used">{app.linked?.lastLaunched ? humanTime(app.linked.lastLaunched) : "Never launched"}</span></div>
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
                                operation={packages}
                                busy={!!busy || packages.busy}
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
                    downloadDirectory={packages.downloadDirectory ?? snapshot.downloadDirectory}
                    installDirectory={snapshot.installDirectory}
                    chooseDownload={chooseDownload}
                    chooseInstall={chooseInstall}
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
                  <DownloadHistory snapshot={snapshot} />
                  <section className="downloads-empty">
                    <div className="empty-symbol">
                      <ArrowDownToLine size={29} strokeWidth={1.4} />
                    </div>
                    <h2>
                      {updates.status.stage === "downloading"
                        ? "Downloading launcher update"
                        : updates.status.downloadPath
                          ? "Verified package ready"
                          : packages.status.stage ? "Launcher update packages" : "No downloads yet"}
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
                    <h2>Download destination</h2>
                    <p className="file-path">{packages.downloadDirectory ?? snapshot.downloadDirectory}</p>
                    <p className="setting-help">{packages.downloadDirectory ? "One-time folder · resets after this download" : "Using your default folder from Settings"}</p>
                    <button
                      className="btn btn-sm"
                      disabled={!desktop || !!busy}
                      onClick={chooseDownload}
                    >
                      <FolderOpen size={15} />
                      Choose folder
                    </button>
                    {packages.downloadDirectory && <button className="btn btn-sm btn-ghost" onClick={() => packages.setDownloadDirectory(undefined)}>Use default folder</button>}
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
                <Suspense fallback={<div className="loading-state" role="status">Opening activity…</div>}><ActivityTimeline activity={snapshot.store.activity} openLibrary={() => navigate("library")} /></Suspense>
              ) : (
                <Suspense fallback={<div className="loading-state" role="status">Opening settings…</div>}><SettingsView
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
                  clearActivity={() =>
                    void perform(
                      "clear-activity",
                      () => command("clear_activity"),
                      "Activity history cleared. Previous-state backups are retained.",
                    )
                  }
                  uninstallLauncher={() => void perform("uninstall-launcher", () => command("open_windows_uninstall"), "Windows Installed apps opened. Choose Wrakeeb Launcher to uninstall. Portable copies can be removed from their folder after exiting.")}
                  createShortcut={() =>
                    void perform(
                      "desktop-shortcut",
                      () => command("create_desktop_shortcut"),
                      "Desktop shortcut created.",
                    )
                  }
                  utility={(name) => void perform(name, () => command(name))}
                /></Suspense>
              )}
            </>
          )}
        </main>
      </div>
      {palette && <Suspense fallback={null}><CommandPalette actions={paletteActions} close={() => setPalette(false)} /></Suspense>}
      {contextApp && context && <div ref={contextRef} className="app-context-menu menu" role="menu" aria-label={`${contextApp.name} actions`} style={{ left: Math.min(context.x, innerWidth - 248), top: Math.min(context.y, innerHeight - 320) }} onKeyDown={event => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")); const i = items.indexOf(document.activeElement as HTMLButtonElement); items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (i + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus(); } }}>
        <strong>{contextApp.name}</strong>
        {(contextApp.linked || contextApp.available) && <><button role="menuitem" disabled={!!busy || contextApp.missing} onClick={() => { launch(contextApp); setContext(undefined); }}>Launch</button><button role="menuitem" onClick={() => { revealApp(contextApp); setContext(undefined); }}>Open application folder</button><button role="menuitem" onClick={() => { shortcut(contextApp); setContext(undefined); }}>Create desktop shortcut</button></>}
        {contextApp.linked && <button role="menuitem" onClick={() => { void perform("favorite", () => command("set_favorite", { id: contextApp.linked!.id, favorite: !contextApp.linked!.favorite })); setContext(undefined); }}>{contextApp.linked.favorite ? "Remove favorite" : "Add to favorites"}</button>}
        <button role="menuitem" onClick={() => { setDetailId(contextApp.id); setContext(undefined); }}>Details</button>
        {contextApp.linked && <button role="menuitem" onClick={() => { setRemoveId(contextApp.linked!.id); setContext(undefined); }}>Remove from library…</button>}
        {contextApp.installed && <button role="menuitem" className="text-error" disabled={packages.busy} onClick={() => { setUninstallId(contextApp.id); setContext(undefined); }}>Uninstall application…</button>}
      </div>}
      {notice && (notice.error || snapshot?.store.preferences.notifications !== false || notice.text === "Preferences saved.") && (
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
      <dialog ref={uninstallDialog} className="modal" onClose={() => setUninstallId(undefined)} aria-labelledby="uninstall-title">
        <div className="modal-box">
          <h2 id="uninstall-title">Uninstall {views.find(a => a.id === uninstallId)?.name}?</h2>
          <p>The launcher-installed version folder will move to the Recycle Bin and its library link will be removed. Close the application first. Downloads, older versions and separately stored profiles stay on your PC. Data saved inside this version folder moves with it.</p>
          <div className="modal-action"><form method="dialog"><button className="btn">Cancel</button></form>
            <button className="btn btn-error" disabled={!!busy || packages.busy} onClick={() => { const id = uninstallId; setUninstallId(undefined); if (id) void perform("uninstall", () => command("uninstall_project", { id }), "Application uninstalled. Its version folder is recoverable from the Recycle Bin."); }}>Uninstall application</button>
          </div>
        </div><form method="dialog" className="modal-backdrop"><button>Close</button></form>
      </dialog>
      <dialog
        ref={helpDialog}
        className="modal"
        onClose={() => setHelp(false)}
        aria-labelledby="help-title"
      >
        <div className="modal-box about-dialog" tabIndex={0}>
          <form method="dialog" className="about-close"><button className="btn btn-sm btn-ghost" aria-label="Close About"><X size={18} /></button></form>
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
          <h3>Privacy and rights</h3>
          <p>
            The launcher stores its library locally and has no advertising
            analytics or usage telemetry. GitHub receives normal network request
            information during release checks/downloads. Scanning is local.
            Installed apps have their own privacy policies. Coucou artwork is
            not bundled because redistribution permission is unconfirmed.
          </p>
          <details className="legal-notices">
            <summary
              onClick={() => {
                if (!legalNotices)
                  void import("../docs/THIRD-PARTY-NOTICES.txt?raw")
                    .then((module) => setLegalNotices(module.default))
                    .catch(() =>
                      setLegalNotices(
                        "The notice file could not be loaded. See the installation folder or the GitHub documentation.",
                      ),
                    );
              }}
            >
              Third-party license notices
            </summary>
            <pre>{legalNotices ?? "Open to load the bundled notices."}</pre>
          </details>
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
  operation,
  app,
  busy,
  launch,
  link,
}: {
  app: ViewApp;
  operation?: PackageController;
  busy: boolean;
  launch: (app: ViewApp) => void;
  link: (app: ViewApp) => void;
}) {
  const transfer = operation?.status.projectId === app.id ? operation.status : undefined;
  if (transfer && ["downloading", "verifying", "installing"].includes(transfer.stage)) return <button className="btn btn-sm transfer-button" disabled><span>{transfer.stage === "downloading" ? `Downloading ${transfer.totalBytes ? Math.floor(transfer.downloadedBytes / transfer.totalBytes * 100) : 0}%` : transfer.stage === "verifying" ? "Verifying…" : "Installing…"}</span><progress className="progress progress-primary" value={transfer.downloadedBytes} max={transfer.totalBytes || 1} aria-label="Download progress" /></button>;
  if (transfer?.stage === "downloaded" && transfer.asset?.installable) return <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => void operation?.install()}>Install package</button>;
  return app.linked || app.available ? (
    <button
      className="btn btn-sm launch-button"
      disabled={busy}
      onClick={() => (app.missing ? link(app) : launch(app))}
    >
      {app.missing
        ? "Locate app"
        : app.kind === "Script"
          ? "Run script"
          : "Launch"}{" "}
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
          <ArrowDownToLine size={14} aria-hidden="true" />
          {app.id === "coucou"
            ? "Source"
            : app.repository
              ? "Download"
              : "Choose file"}
        </>
      )}
    </button>
  );
}
