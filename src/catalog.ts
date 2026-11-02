import { projectMedia, type ProjectMedia } from "./projectMedia";

export interface CatalogApp extends ProjectMedia {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  features: string[];
  glyph: "mic" | "discord" | "note" | "code" | "window";
}

// Descriptive project catalog, not a published distribution feed.
export const catalog: CatalogApp[] = [
  {
    id: "dual-discord",
    name: "Dual Discord",
    category: "Communication",
    tagline: "A separate space for every account.",
    description:
      "A Windows companion for keeping your Discord accounts and workspaces separate. Link your existing installation to open it from one library.",
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
    name: "StickyN",
    category: "Productivity",
    tagline: "A little space for your next thought.",
    description:
      "Keep notes close to the work in front of you. The launcher links your current StickyN installation and leaves your notes and preferences where they are.",
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
    name: "Codex Presence",
    category: "Utilities",
    tagline: "Let your coding session speak for itself.",
    description:
      "Your desktop companion for Codex Discord presence. Open your installed copy without changing its configuration or account connections.",
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
    name: "Coucou",
    category: "Productivity",
    tagline: "Your workspace companion, within reach.",
    description:
      "Bring your existing Coucou installation into the same library as your other tools. Installation, settings and integrations remain managed by the original app.",
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
    name: "PulseMute",
    category: "Utilities",
    tagline: "Microphone control at your fingertips.",
    description:
      "A microphone control utility. Choose your existing PulseMute executable to add it to the library. The launcher does not test or change your microphone state.",
    features: [
      "Microphone control utility",
      "Shortcut-based workflow",
      "Launch your existing installation",
    ],
    glyph: "mic",
    ...projectMedia["pulsemute"],
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
  theme?: "discord" | "wrakeeb";
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
  };
  availableIds: string[];
  missingIds: string[];
  dataDirectory: string;
  downloadDirectory?: string;
}
export type Page =
  "library" | "discover" | "downloads" | "updates" | "activity" | "settings";
export type ViewApp = CatalogApp & {
  linked?: LinkedApp;
  available: boolean;
  missing: boolean;
};

export function appViews(snapshot: Snapshot): ViewApp[] {
  const known = catalog.map((app) => ({
    ...app,
    linked: snapshot.store.apps.find((link) => link.catalogId === app.id),
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
