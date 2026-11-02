import brightnessLogo from "./assets/projects/brightness-control/logo.svg";
import brightnessMain from "./assets/projects/brightness-control/main.jpg";
import brightnessSettings from "./assets/projects/brightness-control/settings.jpg";
import demoInstalled from "./assets/projects/launcher-demo/installed.png";
import steamLogo from "./assets/projects/dual-steam/logo.png";
import steamProfiles from "./assets/projects/dual-steam/profiles.png";
import steamSettings from "./assets/projects/dual-steam/settings-general.png";
import steamSharing from "./assets/projects/dual-steam/sharing.png";
import dualFiles from "./assets/projects/dual-discord/files.png";
import dualUpdates from "./assets/projects/dual-discord/updates.png";
import stickyInspector from "./assets/projects/stickyn/inspector.png";
import stickyTools from "./assets/projects/stickyn/tools.png";
import presencePrivacy from "./assets/projects/codex-presence/privacy.png";
import presenceLayout from "./assets/projects/codex-presence/layout.png";
import launcherBrand from "./assets/brand/wrakeeb.png";
import dualLogo from "./assets/projects/dual-discord/logo.png";
import dualProfiles from "./assets/projects/dual-discord/profiles.png";
import dualSettings from "./assets/projects/dual-discord/settings.png";
import stickyLogo from "./assets/projects/stickyn/logo.png";
import stickyWorkspace from "./assets/projects/stickyn/workspace.png";
import stickySettings from "./assets/projects/stickyn/settings.png";
import presenceLogo from "./assets/projects/codex-presence/logo.png";
import presenceThumbnail from "./assets/projects/codex-presence/thumbnail.png";
import presenceOverview from "./assets/projects/codex-presence/overview.png";
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
  logoTreatment?: "paper";
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
  coucou: {},
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

projectMedia["dual-steam"] = {
  logo: steamLogo,
  images: [
    {
      src: steamProfiles,
      alt: "Dual Steam profile management screen",
      caption: "Profiles · Release 3.4.0",
    },
    {
      src: steamSettings,
      alt: "Dual Steam general settings",
      caption: "Settings · Release 3.4.0",
    },
    {
      src: steamSharing,
      alt: "Dual Steam optional sharing controls",
      caption: "Sharing · Release 3.4.0",
    },
  ],
};
projectMedia["launcher-demo"] = {
  logo: launcherBrand,
  images: [
    {
      src: demoInstalled,
      alt: "The independently installed Launcher Demo application",
      caption: "Installed application · Demo 1.0.0",
    },
  ],
};
projectMedia["demo-script"] = { logo: launcherBrand };
projectMedia["dual-discord"].images!.push(
  {
    src: dualFiles,
    alt: "Dual Discord file storage controls",
    caption: "Files · Windows reference",
  },
  {
    src: dualUpdates,
    alt: "Dual Discord update preferences",
    caption: "Updates · Windows reference",
  },
);
projectMedia["stickyn"].images!.push(
  {
    src: stickyInspector,
    alt: "StickyN note inspector",
    caption: "Inspector · Native 0.16.0",
  },
  {
    src: stickyTools,
    alt: "StickyN note tools",
    caption: "Note tools · Native 0.16.0",
  },
);
projectMedia["codex-presence"].images!.push(
  {
    src: presencePrivacy,
    alt: "Codex Discord Rich Presence privacy controls",
    caption: "Privacy · Current project documentation",
  },
  {
    src: presenceLayout,
    alt: "Codex Discord Rich Presence layout settings",
    caption: "Layout · Current project documentation",
  },
);

projectMedia["brightness-control"] = {
  logo: brightnessLogo,
  logoTreatment: "paper",
  images: [
    {
      src: brightnessMain,
      alt: "Official Brightness Control main window",
      caption: "Main window · Official project screenshot",
    },
    {
      src: brightnessSettings,
      alt: "Official Brightness Control settings",
      caption: "Settings · Official project screenshot",
    },
  ],
};
