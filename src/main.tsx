import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./edition.css";
import "./classic.css";

const root = createRoot(document.getElementById("root")!);
if (location.hash === "#tray") {
  document.documentElement.classList.add("tray-surface");
  void import("./TrayPanel").then(({ TrayPanel }) =>
    root.render(<TrayPanel />),
  );
} else root.render(<App />);
