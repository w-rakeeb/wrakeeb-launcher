import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, cp, copyFile, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { onSecondMonitor } from './second-monitor.mjs';

const root = resolve('runtime/unified-native-capture');
const out = resolve('design/screenshots/unified');
await mkdir(root, { recursive: true }); await mkdir(out, { recursive: true });
await cp(resolve('release/data'), join(root, 'data'), { recursive: true });
const library = join(root, 'data/library.json');
const store = JSON.parse(await readFile(library, 'utf8'));
Object.assign(store.preferences, { scanOnStart: false, checkUpdatesOnStart: false, rememberPage: false, theme: 'discord', interfaceStyle: 'classic', reduceMotion: true, libraryView: 'grid', libraryFilter: 'All apps', cardSize: 260 });
await writeFile(library, JSON.stringify(store));
const exe = join(root, 'Wrakeeb Launcher.exe');
await copyFile(resolve('src-tauri/target/release/wrakeeb-launcher.exe'), exe);
const child = spawn(exe, [], { cwd: root, stdio: 'ignore', windowsHide: true, env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-address=127.0.0.1 --remote-debugging-port=19439' } });
onSecondMonitor(child.pid);
let browser; const pause = ms => new Promise(r => setTimeout(r, ms));
try {
  for (let i = 0; i < 160; i++) { try { browser = await chromium.connectOverCDP('http://127.0.0.1:19439'); if (!browser.contexts()[0]?.pages()[0]) throw Error('Target not ready'); break; } catch { await pause(100); } }
  const page = browser.contexts()[0].pages()[0]; const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.locator('.page-heading h1').waitFor();
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('tests/resize-native-window.ps1'), '-AppProcessId', String(child.pid)], { windowsHide: true, stdio: 'pipe' });
  await expect.poll(() => page.evaluate(() => innerWidth)).toBe(1280);
  const dismiss = async () => { const notice = page.getByRole('button', { name: 'Dismiss notification', exact: true }); if (await notice.count()) await notice.click(); };
  for (const design of ['classic', 'claude']) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
    await page.getByRole('button', { name: design === 'classic' ? /Original design/ : /Claude design/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-interface', design);
    await dismiss(); await page.screenshot({ path: `${out}/${design}-settings.png` });
    await page.getByRole('button', { name: 'Library', exact: true }).click(); await dismiss();
    await page.screenshot({ path: `${out}/${design}-library-grid.png` });
    await page.getByRole('button', { name: 'List view', exact: true }).click(); await dismiss();
    await expect(page.locator('.apps-list')).toBeVisible(); await page.screenshot({ path: `${out}/${design}-library-list.png` });
    await page.getByRole('button', { name: 'Grid view', exact: true }).click();
    await page.getByRole('button', { name: 'StickyN', exact: true }).click(); await dismiss();
    await page.screenshot({ path: `${out}/${design}-app-detail.png` });
    await page.getByRole('button', { name: 'Downloads', exact: true }).click(); await dismiss();
    await page.screenshot({ path: `${out}/${design}-downloads.png` });
  }
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-interface', 'claude');
  const after = JSON.parse(await readFile(library, 'utf8')); expect(after.apps).toEqual(store.apps);
  if (errors.length) throw Error(errors.join('\n'));
  await writeFile(`${out}/capture.json`, JSON.stringify({ version: '0.6.1', realProductionBinary: true, isolatedCopiedProfile: true, mockIPC: false, bothDesigns: true, persistedSwitch: true, sharedLibraryPreserved: true, errors }, null, 2));
} finally { await browser?.close().catch(() => {}); child.kill(); }
console.log('PASS: native production app; both designs, settings, grid/list, detail, downloads, persisted design, unchanged shared library.');
