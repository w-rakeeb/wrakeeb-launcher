import { chromium, expect } from '@playwright/test';
import { readFile, mkdir, writeFile, access, stat } from 'node:fs/promises';
const root='runtime/unified-matrix';await mkdir(root,{recursive:true});
const store=JSON.parse(await readFile('D:/Codex/Wrakeeb Launcher/release/data/library.json','utf8'));store.preferences={...store.preferences,theme:'discord',scanOnStart:false,checkUpdatesOnStart:false,rememberPage:true,reduceMotion:true,libraryView:'grid',libraryFilter:'All apps',cardSize:260};
const missingIds=[];for(const app of store.apps){try{await access(app.path);}catch{missingIds.push(app.id);}}
const detectedApps=[]; for(const [catalogId,path] of [['dual-discord','D:/Codex/Dual Discord/Dual Discord.exe'],['stickyn','D:/Codex/Sticky Note/StickyN.exe'],['codex-presence','D:/Codex/Codex Presence/Codex Presence.exe'],['coucou','E:/Coucou/coucou.exe'],['dual-steam','D:/Codex/Dual Steam/Dual Steam.exe']]){try{const file=await stat(path);detectedApps.push({catalogId,path,source:'Existing local installation',executableBytes:file.size});}catch{}}
const snapshot={store,missingIds,detectedApps,availableIds:store.apps.filter(a=>!missingIds.includes(a.id)).map(a=>a.catalogId).filter(Boolean).concat(detectedApps.map(a=>a.catalogId)),dataDirectory:'Local launcher data',downloadDirectory:'Selected download folder',installDirectory:'Selected application folder'};
const browser=await chromium.launch({channel:'msedge'});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
await page.addInitScript(snapshot=>{Object.defineProperty(globalThis,'isTauri',{value:true});window.__TAURI_INTERNALS__={invoke:async(name,args={})=>{if(name==='get_snapshot')return structuredClone(snapshot);if(name==='save_preferences'){snapshot.store.preferences=args.preferences;return;}if(name==='get_package_status')return{stage:'',projectId:'',name:'',message:'',totalBytes:0,downloadedBytes:0};if(name==='get_update_status')return{stage:'idle',installedVersion:'0.6.0',message:'Ready to check for launcher updates.',lastChecked:null};if(name==='get_project_release')throw Error('Release metadata is not loaded during offline visual verification.');if(name==='storage_capacity')return null;return null;}};},snapshot);
await page.goto('http://127.0.0.1:1420');const checks=[];
for (const design of ['classic','claude']) {
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();await page.getByRole('button',{name:design==='classic'?/Original design/:/Claude design/}).click();await expect(page.locator('html')).toHaveAttribute('data-interface',design);
for(const [theme,name] of [['discord','Wrakeeb Dark'],['graphite','Graphite'],['midnight','Midnight'],['obsidian','AMOLED'],['light','Light']]){
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();await page.getByRole('button',{name:`${name} theme`,exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
 for(const width of [960,1280,1920]){
  await page.setViewportSize({width,height:960});
  for(const name of ['Library','Discover','Downloads','Updates','Activity','Settings']){
   await page.getByRole('button',{name,exact:true}).first().click();await expect(page.locator('.page-heading h1')).toBeVisible();
   const dimensions=await page.locator('main').evaluate(main=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,main:main.scrollWidth,client:main.clientWidth}));
   if(dimensions.doc>dimensions.viewport||dimensions.main>dimensions.client)throw Error(`${theme}/${width}/${name} overflow ${JSON.stringify(dimensions)}`);
   if(name==='Settings')for(const tab of ['Appearance','Library','Downloads','General','Privacy','Advanced']){await page.getByRole('tab',{name:tab,exact:true}).click();expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
   checks.push({design,theme,width,page:name,overflow:false});
  }
  await page.getByRole('button',{name:'Library',exact:true}).click();await page.screenshot({path:`${root}/${design}-${theme}-${width}-library.png`});
 }
}
}
await page.setViewportSize({width:1280,height:960});await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();await page.getByRole('button',{name:'Wrakeeb Dark theme',exact:true}).click();await page.screenshot({path:`${root}/settings.png`});
await page.getByRole('button',{name:'Library',exact:true}).click();await page.screenshot({path:`${root}/library-grid.png`});await page.getByRole('button',{name:'List view',exact:true}).click();await page.screenshot({path:`${root}/library-list.png`});await page.getByRole('button',{name:'Grid view',exact:true}).click();
await page.getByRole('button',{name:'Discover',exact:true}).click();await page.getByRole('button',{name:'StickyN',exact:true}).click();await page.screenshot({path:`${root}/app-detail.png`});await page.getByRole('button',{name:'Downloads',exact:true}).click();await page.screenshot({path:`${root}/downloads.png`});
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('tab',{name:'General',exact:true}).click();await page.getByRole('checkbox',{name:/Show success notifications/}).uncheck();
await page.getByRole('button',{name:'Library',exact:true}).click();await page.keyboard.press('Control+k');await expect(page.getByRole('dialog',{name:'Command palette'})).toBeVisible();await page.screenshot({path:`${root}/command-palette.png`});await page.keyboard.press('Escape');
await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.app-item').first().evaluate(el=>getComputedStyle(el).transitionDuration)).toBe('0s');
await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('tab',{name:'Appearance',exact:true}).click();await page.getByRole('checkbox',{name:/Larger interface text/}).check();await page.setViewportSize({width:960,height:600});expect(await page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
if(errors.length)throw Error(errors.join('\n'));await writeFile(`${root}/results.json`,JSON.stringify({checks,settingsTabChecks:540,errors,screenshots:'Actual library records in a test-only IPC fixture; no app operations execute.'},null,2));await browser.close();console.log(`PASS: ${checks.length} page/theme/width combinations; every settings tab, reduced motion and enlarged text; no page errors.`);
