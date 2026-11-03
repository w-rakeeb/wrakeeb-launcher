import { useEffect, useRef, useState } from "react";
import type { Snapshot } from "./catalog";
import { catalog } from "./catalog";
import type { PackageStatus } from "./usePackages";
import { bytes } from "./UpdateView";
export function TransferInsights({ status }: { status: PackageStatus }) {
  const sample = useRef({ at: 0, bytes: 0, project: "" });
  const [speed, setSpeed] = useState(0);
  useEffect(() => {
    if (status.stage !== "downloading") { sample.current = { at: 0, bytes: 0, project: "" }; setSpeed(0); return; }
    const now = performance.now(); const last = sample.current;
    if (!last.at || last.project !== status.projectId || status.downloadedBytes < last.bytes) { sample.current = { at: now, bytes: status.downloadedBytes, project: status.projectId }; return; }
    if (now - last.at >= 500) { setSpeed((status.downloadedBytes - last.bytes) / ((now - last.at) / 1000)); sample.current = { at: now, bytes: status.downloadedBytes, project: status.projectId }; }
  }, [status.downloadedBytes, status.projectId, status.stage]);
  if (status.stage !== "downloading") return null;
  const seconds = speed > 0 && status.totalBytes > status.downloadedBytes ? Math.ceil((status.totalBytes - status.downloadedBytes) / speed) : undefined;
  return <div className="transfer-insights"><span>{speed > 0 ? `${bytes(speed)}/s` : "Measuring transfer rate…"}</span><span>{seconds === undefined ? "Estimating remaining time…" : seconds < 60 ? `About ${seconds}s remaining` : `About ${Math.ceil(seconds / 60)} min remaining`}</span></div>;
}
export function DownloadHistory({ snapshot }: { snapshot: Snapshot }) {
  const installations = [...(snapshot.store.installations || [])].sort((a, b) => (b.installedAt || 0) - (a.installedAt || 0));
  return <section className="download-history"><div className="section-heading"><h2>Installed packages</h2><span>{installations.length} current installations</span></div>{installations.length ? installations.map(receipt => <div className="history-row" key={receipt.catalogId}><span><strong>{catalog.find(app => app.id === receipt.catalogId)?.name || receipt.catalogId}</strong><small>{receipt.version} · {receipt.packageName || "Package receipt"}</small></span><span>{receipt.packageBytes ? bytes(receipt.packageBytes) : "Size unavailable"}</span><time>{receipt.installedAt ? new Date(receipt.installedAt * 1000).toLocaleDateString() : "Date unavailable"}</time></div>) : <p>Completed installations appear here. The latest transfer is retained above; this version downloads one package at a time.</p>}</section>;
}
