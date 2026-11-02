import { projectMedia, type ProjectMedia } from "./projectMedia";

export interface CatalogApp extends ProjectMedia {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  features: string[];
  repository?: string;
  kind?: "Application" | "Script" | "Demo";
  glyph: "mic" | "discord" | "note" | "code" | "window";
}

// Curated projects; GitHub release metadata is fetched by the native backend.
export const catalog: CatalogApp[] = [
  {
    id: "dual-discord",
    repository: "w-rakeeb/dual-discord",
    name: "Dual Discord",
    category: "Communication",
    tagline: "Separate Discord profiles for two accounts.",
    description:
      "Run two Discord accounts with separate profiles on one Windows PC. The manager detects your stable Discord installation, prepares an independent second profile, and offers optional Vencord and preference sharing. Discord must be installed; sign in to each account yourself.",
    features: [
      "Separate workspaces",
      "Windows desktop companion",
      "Existing profiles stay in place",
    ],
    glyph: "discord",
    ...projectMedia["dual-discord"],
  },
  {
    id: "stickyn",
    repository: "w-rakeeb/StickyN",
    name: "StickyN",
    category: "Productivity",
    tagline: "Portable sticky notes with local storage.",
    description:
      "A portable Windows sticky-note workspace with local storage, paper styles, note organization and in-app update checks. The public GitHub release and the screenshots may show different versions. Linking an existing installation preserves its notes and preferences.",
    features: [
      "Desktop notes",
      "Quick access to your thoughts",
      "Existing notes stay in place",
    ],
    glyph: "note",
    ...projectMedia["stickyn"],
  },
  {
    id: "codex-presence",
    repository: "w-rakeeb/Codex-Discord-Rich-Presence",
    name: "Codex Presence",
    category: "Utilities",
    tagline: "Discord Rich Presence for Codex sessions.",
    description:
      "Publish Codex session activity to Discord Rich Presence, with model and token information, privacy controls, manual timestamps and background mode. The current project is Codex Discord Rich Presence; its executable retains the Codex Presence name for shortcut compatibility. Requires the relevant desktop applications and your configuration.",
    features: [
      "Discord Rich Presence companion",
      "Desktop integration",
      "Existing configuration preserved",
    ],
    glyph: "code",
    ...projectMedia["codex-presence"],
  },
  {
    id: "coucou",
    repository: "w-rakeeb/coucou-windows",
    name: "Coucou",
    category: "Productivity",
    tagline: "Session monitoring and desktop companion tools.",
    description:
      "A Windows source fork of Coucou with Codex and Claude session monitoring, token/context usage, allowance timers, monitor controls and OpenAI/OpenRouter chat. This third-party project is shown with attribution. A public binary package may not be available; source and artwork retain their original licenses.",
    features: [
      "Windows workspace companion",
      "Launch from one library",
      "Existing settings preserved",
    ],
    glyph: "window",
    ...projectMedia["coucou"],
  },
  {
    id: "pulsemute",
    repository: "w-rakeeb/PulseMute",
    name: "PulseMute",
    category: "Utilities",
    tagline: "Microphone mute controls and configurable shortcuts.",
    description:
      "A Windows microphone mute utility with keyboard and mouse shortcuts, DualSense support, tray controls, audio feedback and configurable appearance. Starting PulseMute can activate its configured shortcuts; the launcher itself does not change microphone state.",
    features: [
      "Microphone control utility",
      "Shortcut-based workflow",
      "Launch your existing installation",
    ],
    glyph: "mic",
    ...projectMedia["pulsemute"],
  },
  {
    id: "launcher-demo",
    name: "Launcher Demo",
    category: "Demos",
    kind: "Demo",
    repository: "w-rakeeb/wrakeeb-launcher",
    tagline: "Test download, installation and independent launch.",
    description:
      "A small demonstration application built for this launcher. Download it from the dedicated GitHub demo release, install it in your chosen application folder, then launch it here or directly from Windows. It does not require an account, change system settings or install background services. Requires .NET Framework 4.8.",
    features: [
      "Real GitHub package download",
      "Separate installation folder",
      "Runs independently of the launcher",
    ],
    glyph: "window",
    ...projectMedia["launcher-demo"],
  },
  {
    id: "demo-script",
    name: "Command Script Demo",
    category: "Scripts",
    kind: "Script",
    repository: "w-rakeeb/wrakeeb-launcher",
    tagline: "A harmless CMD example for the script workflow.",
    description:
      "A clearly labeled sample command script. It prints a short installation confirmation and waits for a keypress. It does not change settings, install services, or request administrator access. Download and install it, then run it explicitly from the library or its folder.",
    features: [
      "Plain-text .cmd file",
      "No administrator privileges",
      "Explicit run action",
    ],
    glyph: "code",
    ...projectMedia["demo-script"],
  },
  {
    id: "dual-steam",
    name: "Dual Steam",
    category: "Utilities",
    kind: "Application",
    repository: "w-rakeeb/dual-steam",
    tagline: "Manage two separate Steam logins on Windows.",
    description:
      "A native Windows manager for independent Steam profiles, with optional sharing and verified updates. Steam must already be installed. Account, game, plugin and operating-system requirements belong to the project's own documentation; installing the package does not sign in or start Steam.",
    features: [
      "Independent Steam profiles",
      "Optional sharing controls",
      "Own update and recovery tools",
    ],
    glyph: "window",
    ...projectMedia["dual-steam"],
  },
  {
    id: "brightness-control",
    name: "Brightness Control",
    category: "Utilities",
    kind: "Application",
    repository: "w-rakeeb/brightness-control",
    tagline: "Adjust supported external monitors with DDC/CI.",
    description:
      "A portable Windows brightness utility for supported monitors using DDC/CI. Hardware support and monitor settings determine which displays can be controlled. Installing it does not change brightness; adjustments happen only when you run and use the utility.",
    features: [
      "DDC/CI monitor controls",
      "Portable Windows utility",
      "Hardware support required",
    ],
    glyph: "window",
    ...projectMedia["brightness-control"],
  },
  {
    id: "vencord-repair",
    name: "Vencord Auto Repair",
    category: "Scripts",
    kind: "Script",
    repository: "w-rakeeb/vencord-auto-repair",
    tagline: "Repair missing Vencord patches with the official installer.",
    description:
      "A Windows PowerShell watcher for detecting and repairing missing Vencord patches using the official installer. Review its repository and setup instructions before running it: its purpose includes modifying a Discord installation. Available here as a direct package download; automatic execution and installation are not enabled.",
    features: [
      "PowerShell-based watcher",
      "Uses the official installer",
      "Manual setup required",
    ],
    glyph: "code",
  },
];

export interface LinkedApp {
  id: string;
  name: string;
  catalogId: string | null;
  path: string;
  favorite: boolean;
  addedAt: number;
  lastLaunched: number | null;
}
export interface Preferences {
  compact: boolean;
  reduceMotion: boolean;
  rememberPage: boolean;
  theme?: "discord" | "wrakeeb" | "slate" | "light";
  accent?: "default" | "blue" | "teal" | "red" | "amber";
  installDirectory?: string | null;
  downloadDirectory?: string | null;
  checkUpdatesOnStart?: boolean;
}
export interface Activity {
  id: string;
  name: string;
  action: string;
  at: number;
}
export interface Snapshot {
  store: {
    schema: number;
    apps: LinkedApp[];
    preferences: Preferences;
    activity: Activity[];
    installations?: Installation[];
  };
  availableIds: string[];
  missingIds: string[];
  dataDirectory: string;
  downloadDirectory?: string;
  installDirectory?: string;
}
export interface Installation {
  catalogId: string;
  version: string;
  directory: string;
  entry: string;
  sha256: string;
}
export type Page =
  | "library"
  | "discover"
  | "downloads"
  | "updates"
  | "activity"
  | "settings";
export type ViewApp = CatalogApp & {
  linked?: LinkedApp;
  installed?: Installation;
  available: boolean;
  missing: boolean;
};

export function appViews(snapshot: Snapshot): ViewApp[] {
  const known = catalog.map((app) => ({
    ...app,
    linked: snapshot.store.apps.find((link) => link.catalogId === app.id),
    installed: snapshot.store.installations?.find(
      (i) => i.catalogId === app.id,
    ),
    available: snapshot.availableIds.includes(app.id),
    missing: snapshot.store.apps.some(
      (link) =>
        link.catalogId === app.id && snapshot.missingIds.includes(link.id),
    ),
  }));
  const custom: ViewApp[] = snapshot.store.apps
    .filter((app) => !app.catalogId)
    .map((app) => ({
      id: app.id,
      name: app.name,
      category: "Your applications",
      tagline: "Linked from this computer.",
      description:
        "A local Windows application you added to your library. Its program files and settings stay in their original location.",
      features: ["Local application", "Linked without moving files"],
      glyph: "window",
      kind: /\.(cmd|bat|ps1)$/i.test(app.path) ? "Script" : "Application",
      linked: app,
      available: true,
      missing: snapshot.missingIds.includes(app.id),
    }));
  return [...known, ...custom];
}

export function filterApps(
  apps: ViewApp[],
  query: string,
  filter: string,
  sort: string,
): ViewApp[] {
  const term = query.trim().toLocaleLowerCase();
  return apps
    .filter(
      (app) =>
        (!term ||
          `${app.name} ${app.category} ${app.tagline}`
            .toLocaleLowerCase()
            .includes(term)) &&
        (filter === "All apps" ||
          (filter === "Favorites"
            ? app.linked?.favorite
            : app.category === filter)),
    )
    .sort((a, b) =>
      sort === "recent"
        ? (b.linked?.lastLaunched ?? b.linked?.addedAt ?? 0) -
            (a.linked?.lastLaunched ?? a.linked?.addedAt ?? 0) ||
          a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
}
