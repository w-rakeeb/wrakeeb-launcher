import { chromium, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, copyFile, writeFile, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { onSecondMonitor } from '../tests/second-monitor.mjs';
const root=resolve('runtime/v060-native-qa');await mkdir(join(root,'data'),{recursive:true});
const downloads=join(root,'Default Downloads'), custom=join(root,'One-time নমুনা'), installs=join(root,'Applications');for(const p of [downloads,custom,installs])await mkdir(p,{recursive:true});
const prefs={compact:false,reduceMotion:true,rememberPage:false,theme:'discord',checkUpdatesOnStart:false,scanOnStart:false,downloadDirectory:downloads,installDirectory:installs};
const directory=join(installs,'launcher-demo','Versions','qa-'+Date.now());await mkdir(directory,{recursive:true});const entry=join(directory,'qa-removal-fixture.txt');await writeFile(entry,'Native uninstall QA fixture');const fixture={catalogId:'launcher-demo',version:'QA fixture',directory,entry,sha256:'a'.repeat(64),packageName:'Local QA fixture',packageBytes:26,installedBytes:26,installedAt:Math.floor(Date.now()/1000)};await writeFile(join(directory,'wrakeeb-installation.json'),JSON.stringify(fixture));
await writeFile(join(root,'data/library.json'),JSON.stringify({schema:1,apps:[{id:'qa-demo',catalogId:'launcher-demo',name:'Launcher Demo QA fixture',path:entry,favorite:false,addedAt:1,lastLaunched:null}],activity:[],installations:[fixture],preferences:prefs}));
const exe=join(root,'Wrakeeb Launcher.exe');await copyFile(resolve('D:/Codex/Wrakeeb Launcher/src-tauri/target/release/wrakeeb-launcher.exe'),exe);
const child=spawn(exe,[],{cwd:root,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-address=127.0.0.1 --remote-debugging-port=19437'}});onSecondMonitor(child.pid);
let browser; const pause=ms=>new Promise(r=>setTimeout(r,ms));
try {for(let i=0;i<80;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:19437');break;}catch{await pause(250);}}assert.ok(browser);
const page=browser.contexts()[0].pages()[0];await page.getByRole('heading',{name:'Your library',exact:true}).waitFor();
const call=(name,args)=>page.evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke(name,args),{name,args});
const close=await page.getByRole('button',{name:'Close launcher',exact:true}).boundingBox();const width=await page.evaluate(()=>innerWidth);assert.ok(close.x+close.width<=width);
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Midnight theme',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','midnight');await page.screenshot({path:join(root,'settings.png')});
const capacity=await call('storage_capacity');assert.ok(capacity.available>0 && capacity.total>=capacity.available);
const exportFile=join(root,'preferences-export-'+Date.now()+'.json');
const exported=call('export_preferences');exported.catch(error=>console.log('Export command:',String(error)));await pause(100);
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',resolve('tests/native-file-dialog.ps1'),'-AppProcessId',String(child.pid),'-DialogTitle','Export launcher preferences','-FilePath',exportFile,'-Action','Save'],{windowsHide:true,stdio:'pipe'});await exported;
const exportedData=JSON.parse(await readFile(exportFile,'utf8'));assert.equal(exportedData.format,'wrakeeb-preferences-v1');assert.equal(exportedData.preferences.downloadDirectory,downloads);exportedData.preferences.theme='graphite';const importFile=join(root,'preferences-import-'+Date.now()+'.json');await writeFile(importFile,JSON.stringify(exportedData));
const imported=call('import_preferences');imported.catch(error=>console.log('Import command:',String(error)));await pause(100);
execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',resolve('tests/native-file-dialog.ps1'),'-AppProcessId',String(child.pid),'-DialogTitle','Import launcher preferences (replaces preferences only)','-FilePath',importFile,'-Action','Open'],{windowsHide:true,stdio:'pipe'});await imported;
assert.equal((await call('get_snapshot')).store.preferences.theme,'graphite');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','graphite');
let snapshot=await call('get_snapshot');assert.equal(snapshot.downloadDirectory,downloads);const receipt=snapshot.store.installations.find(i=>i.catalogId==='launcher-demo');assert.ok(receipt);const downloaded={path:join(custom,'preservation-marker.txt')};await writeFile(downloaded.path,'Preserve independent download fixture');
const older=join(installs,'launcher-demo','Versions','older-preserved');await mkdir(older,{recursive:true});await writeFile(join(older,'keep.txt'),'keep');await writeFile(join(root,'profile.txt'),'keep profile');
await page.getByRole('button',{name:'Library',exact:true}).click();await page.getByRole('button',{name:'Refresh library'}).click();await page.getByRole('button',{name:'Launcher Demo',exact:true}).click();await page.getByLabel('Project options',{exact:true}).click();await page.getByRole('button',{name:'Uninstall application…',exact:true}).click();await expect(page.getByRole('dialog',{name:'Uninstall Launcher Demo?'})).toBeVisible();await page.getByRole('dialog',{name:'Uninstall Launcher Demo?'}).getByRole('button',{name:'Uninstall application',exact:true}).click();await expect(page.getByRole('status')).toContainText('recoverable',{timeout:30000});
snapshot=await call('get_snapshot');assert.equal(snapshot.store.installations.length,0);await assert.rejects(access(receipt.directory));await access(older);await access(downloaded.path);await access(join(root,'profile.txt'));assert.equal(snapshot.downloadDirectory,downloads);
await page.getByRole('button',{name:'About & help',exact:true}).click();await page.locator('.about-dialog').focus();await page.keyboard.press('Control+End');await expect(page.getByRole('button',{name:'Got it',exact:true})).toBeInViewport();await page.getByRole('button',{name:'Got it',exact:true}).click();
console.log(JSON.stringify({version:'0.6.0',nativeChecks:'PASS',nativeFileExportImport:true,diskCapacity:true,managedUninstall:'recycled only test version',preserved:['default folder','older version','download','separate profile'],closeBounds:close}));
await writeFile(join(root,'results.json'),JSON.stringify({passed:true,version:'0.6.0',nativeFileExportImport:true,diskCapacity:true,defaultFolderPreserved:true,managedUninstall:true},null,2));
} finally {await browser?.close().catch(()=>{});child.kill();}


