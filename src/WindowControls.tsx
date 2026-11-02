import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { desktop } from "./bridge";

export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!desktop) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    try {
      const win = getCurrentWindow();
      const update = () => {
        win
          .isMaximized()
          .then((value) => {
            if (active) setMaximized(value);
          })
          .catch(() => {});
      };
      update();
      win
        .onResized(update)
        .then((stop) => {
          if (active) unlisten = stop;
          else stop();
        })
        .catch(() => {});
    } catch {
      /* Browser bridge previews have no native window. */
    }
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);
  if (!desktop) return null;
  return (
    <div className="window-controls" aria-label="Window controls">
      <button
        aria-label="Minimize window"
        title="Minimize"
        onClick={() => void getCurrentWindow().minimize()}
      >
        <Minus size={15} />
      </button>
      <button
        aria-label={maximized ? "Restore window" : "Maximize window"}
        title={maximized ? "Restore" : "Maximize"}
        onClick={() => void getCurrentWindow().toggleMaximize()}
      >
        {maximized ? <Copy size={12} /> : <Square size={12} />}
      </button>
      <button
        className="window-close"
        aria-label="Close launcher"
        title="Close"
        onClick={() => void getCurrentWindow().close()}
      >
        <X size={17} />
      </button>
    </div>
  );
}
