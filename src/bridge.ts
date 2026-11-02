import { invoke, isTauri } from "@tauri-apps/api/core";
import type { Preferences, Snapshot } from "./catalog";

export const desktop = isTauri();
const preview: Snapshot = {
  store: {
    schema: 1,
    apps: [],
    activity: [],
    preferences: {
      compact: false,
      reduceMotion: false,
      rememberPage: true,
      theme: "discord",
      downloadDirectory: null,
      checkUpdatesOnStart: true,
    },
  },
  availableIds: [],
  missingIds: [],
  dataDirectory: "Available in the desktop application",
  downloadDirectory: "Choose a folder in the desktop application",
};
export const getSnapshot = (): Promise<Snapshot> =>
  desktop ? invoke("get_snapshot") : Promise.resolve(structuredClone(preview));
export async function command<T = void>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!desktop)
    throw new Error(
      "Open the desktop application to link or launch Windows apps.",
    );
  return invoke<T>(name, args);
}
export const savePreferences = (preferences: Preferences) =>
  command("save_preferences", { preferences });
