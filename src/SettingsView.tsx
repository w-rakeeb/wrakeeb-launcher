import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FolderOpen,
  Palette,
  Settings2,
  HardDrive,
  Check,
  Library,
  Wrench,
  Search,
} from "lucide-react";
import type { Preferences, Snapshot } from "./catalog";
import { command, desktop } from "./bridge";
import { preferenceDefaults } from "./preferences";
import { APP_VERSION } from "./useLauncherUpdates";

export function SettingsView({
  snapshot,
  busy,
  saved,
  change,
  chooseDirectory,
  openFolder,
  openUpdates,
  help,
  chooseInstallDirectory,
  createShortcut,
  clearActivity,
  uninstallLauncher,
  utility,
}: {
  snapshot: Snapshot;
  busy: boolean;
  saved: boolean;
  change: (patch: Partial<Preferences>) => void;
  chooseDirectory: () => void;
  openFolder: () => void;
  openUpdates: () => void;
  help: () => void;
  chooseInstallDirectory: () => void;
  createShortcut: () => void;
  clearActivity: () => void;
  uninstallLauncher: () => void;
  utility: (name: string) => void;
}) {
  const [tab, setTab] = useState("appearance");
  const [confirmClear, setConfirmClear] = useState(false);
  const prefs = snapshot.store.preferences;
  const [search, setSearch] = useState("");
  const [accentInput, setAccentInput] = useState(prefs.customAccent ?? "");
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [capacity, setCapacity] = useState<{ available: number; total: number }>();
  const [capacityError, setCapacityError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [hasSearchMatch, setHasSearchMatch] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const chosenTheme = prefs.theme === "wrakeeb" ? "discord" : prefs.theme === "slate" ? "midnight" : prefs.theme ?? "discord";
  useEffect(() => setAccentInput(prefs.customAccent ?? ""), [prefs.customAccent]);
  useEffect(() => { if (tab !== "downloads" || !desktop) return; let active = true; command<{available:number;total:number}>("storage_capacity").then(value => { if(active && value) setCapacity(value); }).catch(() => { if(active) setCapacityError("Disk capacity unavailable."); }); return () => { active = false; }; }, [tab, snapshot.installDirectory]);
  useEffect(() => {
    if (!search.trim()) return;
    const term = search.toLowerCase();
    const choices = [
      ["appearance", "theme interface design original claude color accent text size compact motion density"],
      ["library", "library view sort filter card size linked"],
      ["downloads", "download install storage disk location folder package verification"],
      ["general", "window tray close minimize startup scan desktop shortcut notification about uninstall"],
      ["privacy", "privacy activity history telemetry analytics local data"],
      ["advanced", "advanced diagnostics export import reset data folder preferences"],
    ];
    const match = choices.find(([, words]) => words.includes(term)); if (match) setTab(match[0]);
  }, [search]);
  useEffect(() => { const sections = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(".settings-section") ?? []); sections.forEach(section => { section.hidden = !!search.trim() && !section.textContent?.toLowerCase().includes(search.trim().toLowerCase()); }); setHasSearchMatch(sections.some(section => !section.hidden)); }, [tab, search]);
  const validAccent = !accentInput || /^#[0-9a-f]{6}$/i.test(accentInput);
  const diagnostics = JSON.stringify({ application: "Wrakeeb Launcher", version: APP_VERSION, platform: navigator.platform, theme: prefs.theme, linkedApps: snapshot.store.apps.length, managedInstallations: snapshot.store.installations?.length ?? 0, activityRecords: snapshot.store.activity.length, online: navigator.onLine, dataStorage: "Local files; paths omitted from diagnostics", telemetry: false }, null, 2);
  return (
    <div className="settings-content">
      <div className="settings-intro"><div><h2>Your launcher. Your workspace.</h2><p>Preferences apply instantly and stay on this PC.</p></div><label className="input settings-search"><Search size={16} /><input type="search" aria-label="Search settings" placeholder="Find a setting…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      <div
        className="tabs tabs-box settings-tabs"
        role="tablist"
        aria-label="Settings sections"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const tabs = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]',
            ),
          );
          const current = tabs.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (current +
                    (event.key === "ArrowRight" ? 1 : -1) +
                    tabs.length) %
                  tabs.length;
          tabs[next]?.focus();
          tabs[next]?.click();
        }}
      >
        {[
          { id: "appearance", label: "Appearance", icon: Palette },
          { id: "library", label: "Library", icon: Library },
          { id: "downloads", label: "Downloads", icon: HardDrive },
          { id: "general", label: "General", icon: Settings2 },
          { id: "privacy", label: "Privacy", icon: Settings2 },
          { id: "advanced", label: "Advanced", icon: Wrench },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
            tabIndex={tab === item.id ? 0 : -1}
            className={`tab ${tab === item.id ? "tab-active" : ""}`}
            aria-selected={tab === item.id}
            id={`settings-tab-${item.id}`}
            aria-controls={`settings-panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </div>
      <div
        ref={panelRef}
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
      >
        {tab === "appearance" ? (
          <>
            <section className="settings-section">
              <div><h2>Interface design</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({ interfaceStyle: "classic" })}>Reset to defaults</button><p>Two designs, one library. Switch instantly without changing your apps or color theme.</p></div>
              <div className="settings-panel interface-gallery" role="group" aria-label="Interface design">
                {([
                  ["classic", "Original design", "Familiar neutral controls and project screenshot covers."],
                  ["claude", "Claude design", "Brand coral, icon gradients and a refined launcher shell."],
                ] as const).map(([id, name, description]) => <button key={id} className={`theme-choice interface-choice ${id === (prefs.interfaceStyle ?? "classic") ? "selected" : ""}`} aria-pressed={id === (prefs.interfaceStyle ?? "classic")} disabled={busy || !desktop} onClick={() => change({ interfaceStyle: id })}>
                  <span className={`interface-preview preview-${id}`} aria-hidden="true"><i /><span><b /><span><i /><i /><i /></span></span></span>
                  <strong>{name}{id === (prefs.interfaceStyle ?? "classic") ? <Check size={14} aria-hidden="true" /> : null}</strong><small>{description}</small>
                </button>)}
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Theme</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({theme:"discord",accent:"default",customAccent:null})}>Reset to defaults</button>
                <p>Choose the interface palette and accent color.</p>
              </div>
              <div className="settings-panel appearance-panel">
                <div className="theme-gallery" role="group" aria-label="Theme previews">
                  {[
                    ["discord", "Wrakeeb Dark", "Signature charcoal", "#151619", "#27292e", "#ed776a"],
                    ["graphite", "Graphite", "Soft smoke grey", "#1b1c1e", "#2b2d30", "#ed776a"],
                    ["midnight", "Midnight", "Deep ocean blue", "#0b111c", "#192334", "#ed776a"],
                    ["obsidian", "AMOLED", "Pure black", "#000000", "#141416", "#ed776a"],
                    ["light", "Light", "A brighter workspace", "#f4f6f9", "#e1e5ec", "#b43830"],
                  ].map(([id, name, description, ground, surface, accent]) => <button key={id} className={`theme-choice ${chosenTheme === id ? "selected" : ""}`} aria-label={`${name} theme`} aria-pressed={chosenTheme === id} disabled={busy || !desktop} onClick={() => change({ theme: id as Preferences["theme"] })}>
                    <span className="theme-preview" style={{ background: ground, color: accent }}><i style={{ background: surface }} /><b /><span><i style={{ background: surface }} /><i style={{ background: surface }} /><i style={{ background: surface }} /></span></span>
                    <strong>{name}<span>{chosenTheme === id ? <Check size={14} aria-hidden="true" /> : null}</span></strong><small>{description}</small>
                  </button>)}
                </div>
                <label className="theme-select-label" htmlFor="accent-choice">
                  Accent color
                </label>
                <select
                  id="accent-choice"
                  className="select theme-select"
                  value={prefs.accent ?? "default"}
                  disabled={busy || !desktop}
                  onChange={(event) =>
                    change({
                      accent: event.target.value as Preferences["accent"], customAccent: null,
                    })
                  }
                >
                  <option value="default">Theme default</option>
                  <option value="blue">Blue</option>
                  <option value="teal">Teal</option>
                  <option value="red">Red</option>
                  <option value="amber">Amber</option>
                </select>
                <div className="custom-accent-field"><label htmlFor="custom-accent">Custom accent</label><div><input id="custom-accent" className="input" value={accentInput} onChange={e => setAccentInput(e.target.value)} placeholder="#ed776a" maxLength={7} aria-invalid={!validAccent} aria-describedby="custom-accent-help" disabled={busy || !desktop} /><button className="btn btn-sm" disabled={busy || !desktop || !validAccent} onClick={() => change({ customAccent: accentInput || null })}>Apply color</button></div><p id="custom-accent-help">{validAccent ? "Use six-digit hex. Contrast is adjusted for the chosen theme." : "Enter # followed by six hexadecimal digits."}</p></div>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Library & motion</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({compact:false,largeText:false,reduceMotion:false})}>Reset to defaults</button>
                <p>Choose the density and movement that feel right.</p>
              </div>
              <div className="settings-panel">
                <Setting
                  label="Larger interface text"
                  description="Increase text and control sizes while keeping the layout responsive."
                  checked={prefs.largeText ?? false}
                  disabled={busy || !desktop}
                  change={(value) => change({ largeText: value })}
                />
                <Setting
                  label="Compact library"
                  description="Smaller covers and closer spacing."
                  checked={prefs.compact}
                  disabled={busy || !desktop}
                  change={(value) => change({ compact: value })}
                />
                <Setting
                  label="Reduce motion"
                  description="Keep the interface still, including hover movement."
                  checked={prefs.reduceMotion}
                  disabled={busy || !desktop}
                  change={(value) => change({ reduceMotion: value })}
                />
              </div>
            </section>
          </>
        ) : tab === "library" ? (
          <>
            <section className="settings-section"><div><h2>Library defaults</h2><p>Choose how your application collection opens.</p><button className="section-reset" disabled={busy || !desktop} onClick={() => change({libraryView:"grid",librarySort:"name",libraryFilter:"All apps",cardSize:260,hideLinked:false})}>Reset to defaults</button></div><div className="settings-panel library-preferences">
              <label>Default view<select className="select" aria-label="Default library view" value={prefs.libraryView ?? "grid"} disabled={busy || !desktop} onChange={e => change({ libraryView:e.target.value as "grid"|"list" })}><option value="grid">Grid</option><option value="list">List</option></select></label>
              <label>Default sort<select className="select" aria-label="Default library sort" value={prefs.librarySort ?? "name"} disabled={busy || !desktop} onChange={e => change({ librarySort:e.target.value })}><option value="name">Name</option><option value="recent">Recently used</option><option value="added">Recently added</option><option value="size">Size</option><option value="custom">Custom order</option></select></label>
              <label>Card size<select className="select" aria-label="Default card size" value={prefs.cardSize ?? 260} disabled={busy || !desktop} onChange={e => change({ cardSize:Number(e.target.value) })}>{[200,220,240,260,280,300,320,340,360].map(value => <option key={value} value={value}>{value}px</option>)}</select></label>
              <Setting label="Hide linked applications" description="Show managed installs and detected apps. Existing links remain saved." checked={prefs.hideLinked ?? false} disabled={busy || !desktop} change={value => change({hideLinked:value})} />
              <p className="setting-help">Running detection, custom scan folders and app-update filters are not available in this edition.</p>
            </div></section>
          </>
        ) : tab === "advanced" ? (
          <>
            <section className="settings-section"><div><h2>Diagnostics & local files</h2><p>Review useful diagnostics without account details or private paths.</p></div><div className="settings-panel data-panel"><pre className="diagnostics-preview">{diagnostics}</pre><div className="folder-actions"><button className="btn btn-sm" onClick={() => { void navigator.clipboard.writeText(diagnostics).then(() => {setCopied(true);setCopyError(false);}).catch(() => setCopyError(true)); }}>{copied ? "Diagnostics copied" : "Copy diagnostics"}</button><button className="btn btn-sm" disabled={busy || !desktop} onClick={() => utility("open_launcher_data")}>Open data folder</button></div>{copyError && <p role="alert">Clipboard access failed. Select and copy the diagnostics text above.</p>}<p>No separate log file is generated by this launcher.</p></div></section>
            <section className="settings-section"><div><h2>Export & import preferences</h2><p>Move preferences between launcher copies. App links and installation records are excluded.</p></div><div className="settings-panel data-panel"><p>Exports include your chosen storage paths. Keep them private. Importing validates the file and replaces preferences, keeping a previous-state backup.</p><div className="folder-actions"><button className="btn btn-sm" disabled={busy || !desktop} onClick={() => utility("export_preferences")}>Export preferences</button><button className="btn btn-sm" disabled={busy || !desktop} onClick={() => setConfirmImport(true)}>Import preferences…</button></div>{confirmImport && <div className="settings-confirm"><p>Replace current preferences with an exported file? Your library and installed applications stay in place.</p><button className="btn btn-sm" disabled={busy} onClick={() => {utility("import_preferences");setConfirmImport(false);}}>Choose import file</button><button className="btn btn-sm btn-ghost" onClick={() => setConfirmImport(false)}>Cancel</button></div>}</div></section>
            <section className="settings-section"><div><h2>Reset all preferences</h2><p>Restore this edition's defaults while keeping apps and their files.</p></div><div className="settings-panel data-panel"><button className="btn btn-sm btn-error" disabled={busy || !desktop} onClick={() => setConfirmReset(true)}>Reset all preferences…</button>{confirmReset && <div className="settings-confirm"><p>Reset appearance, library defaults, custom order and future storage destinations? Existing applications, profiles and downloads are preserved.</p><button className="btn btn-sm btn-error" disabled={busy} onClick={() => {change({...preferenceDefaults,customOrder:[],downloadDirectory:null,installDirectory:null});setConfirmReset(false);}}>Confirm reset preferences</button><button className="btn btn-sm btn-ghost" onClick={() => setConfirmReset(false)}>Cancel</button></div>}</div></section>
          </>
        ) : tab === "downloads" ? (
          <>
            <section className="settings-section">
              <div>
                <h2>Download location</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({downloadDirectory:null})}>Reset to defaults</button>
                <p>Choose where launcher packages are saved.</p>
              </div>
              <div className="settings-panel data-panel">
                <strong>Save downloads to</strong>
                <p className="file-path download-location">
                  {snapshot.downloadDirectory ?? "Choose a download folder"}
                </p>
                <div className="folder-actions">
                  <button
                    className="btn"
                    disabled={busy || !desktop}
                    onClick={chooseDirectory}
                  >
                    <FolderOpen size={16} />
                    Choose folder
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={busy || !desktop}
                    onClick={openFolder}
                  >
                    Open folder
                  </button>
                </div>
                <p>
                  Existing downloads stay in their current folder. Changing this
                  location does not move your installed apps.
                </p>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Package checks</h2>
                <p>Downloads are verified before they can be installed.</p>
              </div>
              <div className="settings-panel data-panel">
                <strong>GitHub SHA-256 verification</strong>
                <p>
                  The launcher checks each package against the checksum
                  published by GitHub. A failed check stops installation.
                </p>
                <button className="text-button" onClick={openUpdates}>
                  Open launcher updates <ArrowRight size={14} />
                </button>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Application installations</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({installDirectory:null})}>Reset to defaults</button>
                <p>
                  Separate application folders let programs run independently.
                </p>
              </div>
              <div className="settings-panel data-panel">
                <strong>Install new applications to</strong>
                <p className="file-path install-location">
                  {snapshot.installDirectory ??
                    "Your local Windows application folder"}
                </p>
                <button
                  className="btn"
                  disabled={busy || !desktop}
                  onClick={chooseInstallDirectory}
                >
                  <FolderOpen size={16} />
                  Choose installation folder
                </button>
                <p className="disk-space">{capacity ? `${(capacity.available / 1024 ** 3).toFixed(1)} GiB free of ${(capacity.total / 1024 ** 3).toFixed(1)} GiB on the installation drive` : capacityError || "Reading available space…"}</p>
                <p>
                  Applies to future installations. Existing versions and their
                  data are not moved or deleted.
                </p>
              </div>
            </section>
          </>
        ) : tab === "privacy" ? (
          <>
            <section className="settings-section">
              <div>
                <h2>Privacy</h2>
                <p>
                  No launcher account, advertising analytics or usage telemetry.
                </p>
              </div>
              <div className="settings-panel data-panel">
                <strong>What stays on your PC</strong>
                <p>
                  Your library, application paths, preferences and history are
                  stored locally. Scans inspect application filenames and
                  executable headers in common local folders and selected
                  install locations; they do not upload the results.
                </p>
                <strong>What connects to GitHub</strong>
                <p>
                  Release checks and downloads send normal HTTPS requests to
                  GitHub. GitHub receives your IP address and the launcher user
                  agent. The launcher sends no library contents, account
                  credentials or app profiles.
                </p>
                <p>
                  Installed programs have their own permissions, network
                  behavior and privacy policies. SHA-256 checks confirm package
                  integrity; they are not malware scans or publisher signatures.
                </p>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Activity history</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({recordActivity:true})}>Reset to defaults</button>
                <p>Control the local record of launcher actions.</p>
              </div>
              <div className="settings-panel">
                <Setting
                  label="Record launcher activity"
                  description="Store up to 100 recent additions, installations and launch requests locally."
                  checked={prefs.recordActivity ?? true}
                  disabled={busy || !desktop}
                  change={(value) => change({ recordActivity: value })}
                />
                {confirmClear ? (
                  <div className="activity-clear-confirm">
                    <p>
                      Clear this launcher's activity list? Previous-state
                      backups may still contain older history.
                    </p>
                    <button
                      className="btn btn-sm btn-error"
                      disabled={busy}
                      onClick={() => {
                        clearActivity();
                        setConfirmClear(false);
                      }}
                    >
                      Clear activity history
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => setConfirmClear(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm"
                    disabled={busy || !desktop}
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear activity…
                  </button>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="settings-section">
              <div>
                <h2>Window and tray</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({closeToTray:false,minimizeToTray:false})}>Reset to defaults</button>
                <p>The tray icon remains available while the launcher runs.</p>
              </div>
              <div className="settings-panel">
                <Setting
                  label="Close to system tray"
                  description="The close button hides the window. Use File → Exit or the tray menu to quit."
                  checked={prefs.closeToTray ?? false}
                  disabled={busy || !desktop}
                  change={(value) => change({ closeToTray: value })}
                />
                <Setting
                  label="Minimize to system tray"
                  description="Hide the minimized window from the taskbar; reopen it from the tray."
                  checked={prefs.minimizeToTray ?? false}
                  disabled={busy || !desktop}
                  change={(value) => change({ minimizeToTray: value })}
                />
                <p className="setting-help">
                  Windows may initially place new tray icons in the overflow
                  menu. The launcher does not change your Windows
                  notification-area preferences.
                </p>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>App discovery</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({scanOnStart:true,scanDownloads:true})}>Reset to defaults</button>
                <p>Locate existing copies without changing their files.</p>
              </div>
              <div className="settings-panel">
                <Setting
                  label="Scan common folders on startup"
                  description="Check known installations and common application folders in the background."
                  checked={prefs.scanOnStart ?? true}
                  disabled={busy || !desktop}
                  change={(value) => change({ scanOnStart: value })}
                />
                <Setting
                  label="Include Downloads in scans"
                  description="Find extracted GitHub releases in your Windows Downloads folder. ZIP files must be installed before they can run."
                  checked={prefs.scanDownloads ?? true}
                  disabled={busy || !desktop}
                  change={(value) => change({ scanDownloads: value })}
                />
                <p className="setting-help">
                  Scans are bounded and skip junctions, backups, build output
                  and browser profiles. Use Locate app for other folders. A
                  filename match is not publisher verification.
                </p>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Startup</h2><button className="section-reset" disabled={busy || !desktop} onClick={() => change({rememberPage:true,checkUpdatesOnStart:true})}>Reset to defaults</button>
                <p>Keep your library ready when you return.</p>
              </div>
              <div className="settings-panel">
                <Setting
                  label="Remember last page"
                  description="Return to the page you were using."
                  checked={prefs.rememberPage}
                  disabled={busy || !desktop}
                  change={(value) => change({ rememberPage: value })}
                />
                <Setting
                  label="Check for updates on startup"
                  description="Check in the background, at most once every 12 hours. Your apps stay available offline."
                  checked={prefs.checkUpdatesOnStart ?? true}
                  disabled={busy || !desktop}
                  change={(value) => change({ checkUpdatesOnStart: value })}
                />
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Your data</h2>
                <p>Local, portable and under your control.</p>
              </div>
              <div className="settings-panel data-panel">
                <strong>Library location</strong>
                <p className="file-path">{snapshot.dataDirectory}</p>
                <p>
                  App links, favorites and preferences are stored here. A
                  previous-state backup is kept when the library changes.
                </p>
              </div>
            </section>
            <section className="settings-section"><div><h2>Notifications</h2><p>Control feedback inside the launcher.</p><button className="section-reset" disabled={busy || !desktop} onClick={() => change({notifications:true})}>Reset to defaults</button></div><div className="settings-panel"><Setting label="Show success notifications" description="Show confirmations for launches and library actions. Errors and preference-save feedback remain visible." checked={prefs.notifications ?? true} disabled={busy || !desktop} change={value => change({notifications:value})}/></div></section>
            <section className="settings-section">
              <div>
                <h2>Desktop access</h2>
                <p>Open the launcher from your Windows desktop.</p>
              </div>
              <div className="settings-panel data-panel">
                <button
                  className="btn"
                  disabled={busy || !desktop}
                  onClick={createShortcut}
                >
                  Create desktop shortcut
                </button>
                <p>
                  Creates a shortcut for the current Windows user. No startup
                  task is added.
                </p>
              </div>
            </section>
            <section className="settings-section">
              <div><h2>Uninstall launcher</h2><p>Manage this installation through Windows.</p></div>
              <div className="settings-panel data-panel"><strong>Remove Wrakeeb Launcher</strong><p>Open Windows Installed apps, then select Wrakeeb Launcher → Uninstall. For a portable copy, exit the launcher and remove its folder. Independently installed applications remain in their own folders.</p><button className="btn btn-sm" disabled={busy || !desktop} onClick={uninstallLauncher}>Open Windows uninstall settings</button></div>
            </section>
            <section className="settings-section">
              <div>
                <h2>About</h2>
                <p>Wrakeeb Launcher {APP_VERSION}</p>
              </div>
              <div className="settings-panel data-panel">
                <strong>Your applications, in one place.</strong>
                <p>
                  Created by Wrakeeb. App package publishing and installation
                  are separate from launcher updates.
                </p>
                <div className="folder-actions">
                  <button className="btn btn-sm" onClick={openUpdates}>
                    Launcher updates
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={help}>
                    About & help
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      {search && !hasSearchMatch && <p className="settings-no-match">No matching setting. Try a different term or clear the search.</p>}
      <p className="saved-status">
        {saved ? "Changes saved" : "Preferences save automatically"}
      </p>
    </div>
  );
}
function Setting({
  label,
  description,
  checked,
  disabled,
  change,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  change: (value: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        <span>{description}</span>
      </span>
      <input
        className="toggle toggle-sm"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => change(event.target.checked)}
      />
    </label>
  );
}
