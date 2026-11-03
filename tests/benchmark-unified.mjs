import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
const prefix = 'unified-' + Date.now();
const variants = [
  ['v050', 'Backups/2026-11-03-consolidation/Wrakeeb Launcher v0.5.0.exe', 'classic'],
  ['v061-classic', 'src-tauri/target/release/wrakeeb-launcher.exe', 'classic'],
  ['v061-claude', 'src-tauri/target/release/wrakeeb-launcher.exe', 'claude'],
];
const samples = Object.fromEntries(variants.map(([key]) => [key, []]));
for (let run = 0; run < 5; run++) {
  for (const [key, binary, design] of run % 2 ? [...variants].reverse() : variants) {
    const label = `${prefix}-${key}-${run + 1}`;
    execFileSync(process.execPath, ['tests/benchmark.mjs', binary, label, '1'], { stdio: 'inherit', windowsHide: true, env: { ...process.env, WRAKEEB_BENCHMARK_INTERFACE: design } });
    samples[key].push(JSON.parse(await readFile(`runtime/performance/${label}/metrics.json`, 'utf8')).samples[0]);
  }
}
const median = (rows, key) => rows.map(row => row[key]).sort((a,b) => a-b)[2];
const versions = Object.fromEntries(Object.entries(samples).map(([key, rows]) => [key, Object.fromEntries(['startupMs','privateBytes','workingSet'].map(metric => [metric, median(rows, metric)]))]));
const percentChange = Object.fromEntries(['v061-classic','v061-claude'].map(key => [key, Object.fromEntries(Object.keys(versions.v050).map(metric => [metric, (versions[key][metric] / versions.v050[metric] - 1) * 100]))]));
const report = { method: 'Five interleaved runs per variant; copied production binary, fresh empty local profile/WebView2 profile, idle native+WebView2 tree. CDP polling overhead included; no OS cache flush. Same-session comparison.', samples, versions, percentChange };
await writeFile('runtime/performance/unified-final.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({versions, percentChange}));
