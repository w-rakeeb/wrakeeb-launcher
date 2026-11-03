export const preferenceDefaults = {
  compact: false, reduceMotion: false, rememberPage: true, theme: "discord", accent: "default", customAccent: null,
  sidebarCollapsed: false, libraryView: "grid", libraryFilter: "All apps", librarySort: "name", cardSize: 260,
  hideLinked: false, onboardingComplete: false, notifications: true, closeToTray: false, minimizeToTray: false,
  scanOnStart: true, scanDownloads: true, recordActivity: true, largeText: false, checkUpdatesOnStart: true,
} as const;
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
  return channels.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
export function contrast(first: string, second: string): number { const a = luminance(first), b = luminance(second); return (Math.max(a,b) + .05) / (Math.min(a,b) + .05); }
export function accessibleAccent(hex: string, theme: string): string {
  const background = theme === "light" ? "#ffffff" : theme === "obsidian" ? "#101113" : theme === "graphite" ? "#242629" : ["midnight", "slate"].includes(theme) ? "#1c2633" : "#1d1f23";
  const target = theme === "light" ? 0 : 255;
  let output = hex;
  for (let step = 0; step <= 20 && contrast(output, background) < 4.5; step++) output = "#" + [1,3,5].map(i => Math.round(parseInt(hex.slice(i,i+2),16) * (1 - step / 20) + target * step / 20).toString(16).padStart(2,"0")).join("");
  return output;
}

export const accentForeground = (hex: string): string => luminance(hex) > .179 ? "#000000" : "#ffffff";
