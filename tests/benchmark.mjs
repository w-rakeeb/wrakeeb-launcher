import { chromium } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, copyFile, writeFile, stat, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
const source=resolve(process.argv[2]);const label=process.argv[3]||'baseline';const samples=Number(process.argv[4]||5);const root=resolve('runtime/performance',label);await mkdir(root,{recursive:true});const results=[];
for(let i=0;i<samples;i++){
 const dir=join(root,`sample-${i+1}`);await mkdir(join(dir,'data'),{recursive:true});const exe=join(dir,'Wrakeeb Launcher.exe');await copyFile(source,exe);await writeFile(join(dir,'data/library.json'),JSON.stringify({schema:1,apps:[],activity:[],installations:[],preferences:{theme:'discord',checkUpdatesOnStart:false,scanOnStart:false,rememberPage:false,reduceMotion:true}}));
 const start=performance.now();const child=spawn(exe,[],{cwd:dir,windowsHide:true,stdio:'ignore',env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-address=127.0.0.1 --remote-debugging-port=19438'}});let browser;
 try{
 for(let j=0;j<200;j++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:19438'); if (!browser.contexts()[0]?.pages()[0]) { await browser.close(); browser=undefined; throw Error('Target not ready'); } break;}catch{await new Promise(r=>setTimeout(r,25));}}
 if(!browser)throw Error('No debug target');const page=browser.contexts()[0].pages()[0];await page.waitForSelector('.page-heading h1');const startupMs=performance.now()-start;await new Promise(r=>setTimeout(r,1500));
 const metrics=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$all=Get-CimInstance Win32_Process; $ids=[System.Collections.Generic.HashSet[int]]::new(); [void]$ids.Add(${child.pid}); do { $old=$ids.Count; foreach($p in $all){ if($ids.Contains([int]$p.ParentProcessId)){ [void]$ids.Add([int]$p.ProcessId) } } } while($ids.Count -gt $old); $procs=Get-Process -Id @($ids) -ErrorAction SilentlyContinue; [pscustomobject]@{workingSet=($procs|Measure-Object WorkingSet64 -Sum).Sum; privateBytes=($procs|Measure-Object PrivateMemorySize64 -Sum).Sum;processes=$procs.Count}|ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true}));results.push({startupMs:Math.round(startupMs),...metrics});console.log(label,i+1,Math.round(startupMs),Math.round(metrics.privateBytes/1048576));
 }finally{await browser?.close().catch(()=>{});child.kill(); if(child.exitCode===null) await new Promise(r=>child.once("exit",r)); await new Promise(r=>setTimeout(r,1200));}
}
const median=key=>results.map(x=>x[key]).sort((a,b)=>a-b)[Math.floor(results.length/2)];const report={label,method:'Fresh process and WebView2 profile per sample; startup to first page heading via local CDP; idle entire launcher/WebView2 process tree 1.5s later. OS disk caches not flushed.',samples:results,median:{startupMs:median('startupMs'),workingSet:median('workingSet'),privateBytes:median('privateBytes')},exeBytes:(await stat(source)).size};await writeFile(join(root,'metrics.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.median));
