import dualLogo from "./assets/projects/dual-discord/logo.png";
import dualProfiles from "./assets/projects/dual-discord/profiles.png";
import dualSettings from "./assets/projects/dual-discord/settings.png";
import stickyLogo from "./assets/projects/stickyn/logo.png";
import stickyWorkspace from "./assets/projects/stickyn/workspace.png";
import stickySettings from "./assets/projects/stickyn/settings.png";
import presenceLogo from "./assets/projects/codex-presence/logo.png";
import presenceThumbnail from "./assets/projects/codex-presence/thumbnail.png";
import presenceOverview from "./assets/projects/codex-presence/overview.png";
import coucouLogo from "./assets/projects/coucou/logo.png";
import coucouThumbnail from "./assets/projects/coucou/thumbnail.png";
import coucouOverview from "./assets/projects/coucou/overview.png";
import pulseLogo from "./assets/projects/pulsemute/logo.png";
import pulseMain from "./assets/projects/pulsemute/main.png";
import pulseSettings from "./assets/projects/pulsemute/settings.png";

export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
}
export interface ProjectMedia {
  logo?: string;
  images?: ProjectImage[];
}

export const projectMedia: Record<string, ProjectMedia> = {
  "dual-discord": {
    logo: dualLogo,
    images: [
      {
        src: dualProfiles,
        alt: "Dual Discord Windows manager showing its two profile cards",
        caption: "Profiles · Windows",
      },
      {
        src: dualSettings,
        alt: "Dual Discord general settings window",
        caption: "General settings · Windows",
      },
    ],
  },
  stickyn: {
    logo: stickyLogo,
    images: [
      {
        src: stickyWorkspace,
        alt: "StickyN workspace with six paper notes",
        caption: "Workspace · Native 0.16.0",
      },
      {
        src: stickySettings,
        alt: "StickyN native settings window",
        caption: "Settings · Native 0.16.0",
      },
    ],
  },
  "codex-presence": {
    logo: presenceLogo,
    images: [
      {
        src: presenceThumbnail,
        alt: "Original Codex Presence project thumbnail and logo",
        caption: "Original project thumbnail",
      },
      {
        src: presenceOverview,
        alt: "Codex Presence workspace and Discord activity preview",
        caption: "Workspace · Desktop companion",
      },
    ],
  },
  coucou: {
    logo: coucouLogo,
    images: [
      {
        src: coucouThumbnail,
        alt: "Original Coucou project demo showing the Mochi character",
        caption: "Original project demo",
      },
      {
        src: coucouOverview,
        alt: "Coucou Windows overview with integration panels",
        caption: "Overview · Windows",
      },
    ],
  },
  pulsemute: {
    logo: pulseLogo,
    images: [
      {
        src: pulseMain,
        alt: "PulseMute main window with microphone controls",
        caption: "Main window · Release screenshot",
      },
      {
        src: pulseSettings,
        alt: "PulseMute general settings window",
        caption: "General settings · Release screenshot",
      },
    ],
  },
};
