import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { WindowControls } from "./WindowControls";
export interface MenuAction {
  label: string;
  action: () => void;
  disabled?: boolean;
  shortcut?: string;
}
export function AppMenu({
  back,
  canGoBack,
  menus,
}: {
  back: () => void;
  canGoBack: boolean;
  menus: Record<string, MenuAction[]>;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node))
        root.current
          ?.querySelectorAll("details")
          .forEach((item) => (item.open = false));
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        root.current
          ?.querySelectorAll("details")
          .forEach((item) => (item.open = false));
      if (
        event.altKey &&
        ["f", "e", "v", "h"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
        const item = Array.from(
          root.current?.querySelectorAll("details") ?? [],
        ).find((item) =>
          item.dataset.menu?.startsWith(event.key.toLowerCase()),
        );
        if (item) {
          item.open = !item.open;
          item.querySelector<HTMLElement>("button")?.focus();
        }
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", keyboard);
    };
  }, []);
  return (
    <header className="app-menubar" data-tauri-drag-region ref={root}>
      <button
        className="caption-back"
        title="Back to collection"
        aria-label="Back to collection"
        disabled={!canGoBack}
        onClick={back}
      >
        <ArrowLeft size={15} />
      </button>
      <nav aria-label="Application menu" className="desktop-menus">
        {Object.entries(menus).map(([name, actions]) => (
          <details
            key={name}
            data-menu={name.toLowerCase()}
            className="dropdown"
            onToggle={(event) => {
              if (event.currentTarget.open)
                root.current?.querySelectorAll("details").forEach((item) => {
                  if (item !== event.currentTarget) item.open = false;
                });
            }}
            onKeyDown={(event) => {
              if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
                return;
              event.preventDefault();
              event.currentTarget.open = true;
              const buttons = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ),
              );
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current +
                        (event.key === "ArrowUp" ? -1 : 1) +
                        buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
            }}
          >
            <summary>{name}</summary>
            <ul
              className="dropdown-content menu menu-sm"
              aria-label={`${name} actions`}
            >
              {actions.map((item) => (
                <li key={item.label}>
                  <button
                    disabled={item.disabled}
                    onClick={(event) => {
                      event.currentTarget.closest("details")!.open = false;
                      item.action();
                    }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <kbd>{item.shortcut}</kbd>}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
      <span className="caption-title" data-tauri-drag-region>
        Wrakeeb Launcher
      </span>
      <WindowControls />
    </header>
  );
}
