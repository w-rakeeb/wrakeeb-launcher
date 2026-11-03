import { useState } from "react";
import { Activity as ActivityIcon, Plus, Play, Package, Trash2 } from "lucide-react";
import type { Activity } from "./catalog";
const category = (action: string) => /uninstall|remove/i.test(action) ? "Removed" : /launch/i.test(action) ? "Launched" : /install/i.test(action) ? "Installed" : "Added";
export default function ActivityTimeline({ activity, openLibrary }: { activity: Activity[]; openLibrary: () => void }) {
  const [filter, setFilter] = useState("All activity");
  const filtered = activity.filter(event => filter === "All activity" || category(event.action) === filter);
  const days = new Map<string, Activity[]>();
  for (const event of filtered) { const day = new Date(event.at * 1000).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); days.set(day, [...(days.get(day) || []), event]); }
  return <section className="activity-timeline"><div className="activity-toolbar"><span>{filtered.length} local events</span><label>Show<select className="select select-sm" aria-label="Filter activity" value={filter} onChange={e => setFilter(e.target.value)}>{["All activity", "Launched", "Installed", "Added", "Removed"].map(value => <option key={value}>{value}</option>)}</select></label></div>
    {filtered.length ? [...days].map(([day, events]) => <section className="activity-day" key={day}><h2>{day}</h2>{events.map(event => { const type = category(event.action); const Icon = type === "Launched" ? Play : type === "Installed" ? Package : type === "Removed" ? Trash2 : Plus; return <article key={event.id} className="timeline-event"><span className="timeline-marker"><Icon size={15} aria-hidden="true" /></span><div><strong>{event.name}</strong><span>{event.action}</span></div><time dateTime={new Date(event.at * 1000).toISOString()}>{new Date(event.at * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time></article>; })}</section>) : <div className="activity-empty"><ActivityIcon size={26} /><h2>{activity.length ? "No matching activity" : "A fresh start"}</h2><p>{activity.length ? "Choose another activity filter." : "App additions, launch requests and removals will appear here."}</p><button className="btn btn-sm" onClick={openLibrary}>Go to library</button></div>}
  </section>;
}
