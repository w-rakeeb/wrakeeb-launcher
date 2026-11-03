import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
export interface PaletteAction { id: string; label: string; group: string; detail?: string; run: () => void; disabled?: boolean }
export default function CommandPalette({ actions, close }: { actions: PaletteAction[]; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const results = actions.filter(a => !a.disabled && `${a.label} ${a.group} ${a.detail || ""}`.toLowerCase().includes(query.toLowerCase())).slice(0, 30);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => { setSelected(0); }, [query]);
  useEffect(() => { document.getElementById(`command-${selected}`)?.scrollIntoView({ block: "nearest" }); }, [selected]);
  const run = (action: PaletteAction) => { close(); action.run(); };
  return <dialog ref={dialog} className="modal command-dialog" onClose={close} aria-label="Command palette">
    <div className="modal-box command-box">
      <label className="command-search"><Search size={19} aria-hidden="true" /><input autoFocus role="combobox" aria-label="Search commands and applications" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results[selected] ? `command-${selected}` : undefined} placeholder="Search apps, pages, and actions…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); setSelected(i => e.key === "Home" ? 0 : e.key === "End" ? Math.max(0, results.length - 1) : (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % Math.max(1, results.length)); }
        if (e.key === "Enter" && results[selected]) { e.preventDefault(); run(results[selected]); }
      }} /><kbd>Esc</kbd></label>
      <div id="command-results" role="listbox" aria-label="Commands" className="command-results">
        {results.length ? results.map((action, index) => <button role="option" aria-selected={selected === index} tabIndex={-1} id={`command-${index}`} key={action.id} onMouseMove={() => setSelected(index)} onClick={() => run(action)}><span><small>{action.group}</small><strong>{action.label}</strong>{action.detail && <span>{action.detail}</span>}</span><ArrowUpRight size={15} aria-hidden="true" /></button>) : <p className="command-empty">No matching apps or commands.</p>}
      </div><footer>↑ ↓ to navigate <span>Enter to open</span></footer>
    </div><form method="dialog" className="modal-backdrop"><button>Close command palette</button></form>
  </dialog>;
}
