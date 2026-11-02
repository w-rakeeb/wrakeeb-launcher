import { useState } from "react";
import {
  ArrowRight,
  FolderOpen,
  Palette,
  Settings2,
  HardDrive,
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
}: {
  snapshot: Snapshot;
  busy: boolean;
  saved: boolean;
  change: (patch: Partial<Preferences>) => void;
  chooseDirectory: () => void;
  openFolder: () => void;
  openUpdates: () => void;
  help: () => void;
}) {
  const [tab, setTab] = useState("appearance");
  const prefs = snapshot.store.preferences;
  return (
    <div className="settings-content">
      <div
        className="settings-tabs"
        role="tablist"
        aria-label="Settings sections"
      >
        {[
          { id: "appearance", label: "Appearance", icon: Palette },
          { id: "downloads", label: "Downloads", icon: HardDrive },
          { id: "general", label: "General", icon: Settings2 },
        ].map((item) => (
          <button
            key={item.id}
            role="tab"
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
                <p>Dual Discord's palette, adapted for your app library.</p>
              </div>
              <div className="settings-panel">
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
          </>
        ) : (
          <>
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
