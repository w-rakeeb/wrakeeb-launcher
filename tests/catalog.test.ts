import { describe, expect, it } from "vitest";
import { appViews, filterApps, type Snapshot } from "../src/catalog";

const snapshot: Snapshot = {
  store: {
    schema: 1,
    preferences: { compact: false, reduceMotion: false, rememberPage: true },
    activity: [],
    apps: [
      {
        id: "one",
        name: "Dual Discord",
        catalogId: "dual-discord",
        path: "D:/Discord.exe",
        favorite: true,
        addedAt: 10,
        lastLaunched: 20,
      },
      {
        id: "two",
        name: "Personal tool",
        catalogId: null,
        path: "D:/Tool.exe",
        favorite: false,
        addedAt: 30,
        lastLaunched: null,
      },
    ],
  },
  availableIds: ["dual-discord", "stickyn"],
  missingIds: ["two"],
  dataDirectory: "test",
};
describe("library presentation", () => {
  it("keeps local links, detection and missing-file state distinct", () => {
    const apps = appViews(snapshot);
    expect(apps.find((app) => app.id === "dual-discord")?.linked?.id).toBe(
      "one",
    );
    expect(apps.find((app) => app.id === "stickyn")?.linked).toBeUndefined();
    expect(apps.find((app) => app.id === "stickyn")?.available).toBe(true);
    expect(apps.find((app) => app.id === "two")?.missing).toBe(true);
  });
  it("combines query and favorites without returning unlinked catalog entries", () => {
    const apps = appViews(snapshot);
    expect(
      filterApps(apps, "discord", "Favorites", "name").map((app) => app.id),
    ).toEqual(["dual-discord"]);
    expect(filterApps(apps, "sticky", "Favorites", "name")).toEqual([]);
    expect(
      filterApps(apps, "  PERSONAL  ", "All apps", "name").map((app) => app.id),
    ).toEqual(["two"]);
  });
  it("sorts recent activity using addition time when an app has never launched", () => {
    const apps = appViews(snapshot).filter((app) => app.linked);
    expect(
      filterApps(apps, "", "All apps", "recent").map((app) => app.id),
    ).toEqual(["two", "dual-discord"]);
    expect(snapshot.store.apps[0].id).toBe("one");
  });
});
