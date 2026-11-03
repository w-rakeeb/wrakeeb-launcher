import { useState } from "react";
import {
  ArrowRight,
  FolderOpen,
  Palette,
  Settings2,
  HardDrive,
  Check,
} from "lucide-react";
import type { Preferences, Snapshot } from "./catalog";
import { desktop } from "./bridge";
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
}) {
  const [tab, setTab] = useState("appearance");
  const [confirmClear, setConfirmClear] = useState(false);
  const prefs = snapshot.store.preferences;
  return (
    <div className="settings-content">
      <div className="settings-intro"><h2>Your launcher. Your workspace.</h2><p>Fine-tune the look, choose where things live, and stay in control.</p></div>
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
          { id: "downloads", label: "Downloads", icon: HardDrive },
          { id: "general", label: "General", icon: Settings2 },
          { id: "privacy", label: "Privacy", icon: Settings2 },
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
        role="tabpanel"
        id={`settings-panel-${tab}`}
        aria-labelledby={`settings-tab-${tab}`}
      >
        {tab === "appearance" ? (
          <>
            <section className="settings-section">
              <div>
                <h2>Theme</h2>
                <p>Choose the interface palette and accent color.</p>
              </div>
              <div className="settings-panel appearance-panel">
                <div className="theme-gallery" role="group" aria-label="Theme previews">
                  {[
                    ["discord", "Discord", "Familiar charcoal", "#17181c", "#25262c", "#a5adff"],
                    ["obsidian", "Obsidian", "Deep neutral black", "#090a0c", "#15171a", "#e5e7eb"],
                    ["midnight", "Midnight", "Dark ocean blue", "#0b111c", "#192334", "#9abfff"],
                    ["graphite", "Graphite", "Soft smoke grey", "#1b1c1e", "#2b2d30", "#d8c3a6"],
                    ["wrakeeb", "Charcoal", "Original warm dark", "#171818", "#303232", "#dbb383"],
                    ["slate", "Slate", "Cool blue grey", "#17212d", "#2d3b4e", "#adcbff"],
                    ["light", "Light", "A brighter workspace", "#f4f6f9", "#e1e5ec", "#4055d6"],
                  ].map(([id, name, description, ground, surface, accent]) => <button key={id} className={`theme-choice ${prefs.theme === id ? "selected" : ""}`} aria-label={`${name} theme`} aria-pressed={prefs.theme === id} disabled={busy || !desktop} onClick={() => change({ theme: id as Preferences["theme"] })}>
                    <span className="theme-preview" style={{ background: ground, color: accent }}><i style={{ background: surface }} /><b /><span><i style={{ background: surface }} /><i style={{ background: surface }} /><i style={{ background: surface }} /></span></span>
                    <strong>{name}<span>{prefs.theme === id ? <Check size={14} aria-hidden="true" /> : null}</span></strong><small>{description}</small>
                  </button>)}
                </div>
                <label className="theme-select-label" htmlFor="theme-choice">
                  Color scheme
                </label>
                <select
                  id="theme-choice"
                  className="select theme-select"
                  value={prefs.theme ?? "discord"}
                  disabled={busy || !desktop}
                  onChange={(event) =>
                    change({
                      theme: event.target.value as Preferences["theme"],
                    })
                  }
                >
                  <option value="discord">Dual Discord · Default</option>
                  <option value="wrakeeb">Original charcoal</option>
                  <option value="slate">Slate</option>
                  <option value="light">Corporate light</option>
                  <option value="obsidian">Obsidian · Deep black</option>
                  <option value="midnight">Midnight · Dark blue</option>
                  <option value="graphite">Graphite · Smoke grey</option>
                </select>
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
                      accent: event.target.value as Preferences["accent"],
                    })
                  }
                >
                  <option value="default">Theme default</option>
                  <option value="blue">Blue</option>
                  <option value="teal">Teal</option>
                  <option value="red">Red</option>
                  <option value="amber">Amber</option>
                </select>
                <div className="theme-swatches" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </section>
            <section className="settings-section">
              <div>
                <h2>Library & motion</h2>
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
        ) : tab === "downloads" ? (
          <>
            <section className="settings-section">
              <div>
                <h2>Download location</h2>
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
                <h2>Application installations</h2>
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
                <h2>Activity history</h2>
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
                <h2>Window and tray</h2>
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
                <h2>App discovery</h2>
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
                <h2>Startup</h2>
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
      <p className="saved-status" role="status">
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
