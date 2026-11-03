import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const root='runtime/performance';const runPrefix='verified-'+Date.now();const variants=[['v050',process.env.WRAKEEB_BASELINE_BINARY || 'D:/Codex/Wrakeeb Launcher/release/Wrakeeb Launcher.exe'],['v060',process.env.WRAKEEB_CANDIDATE_BINARY || 'release/Wrakeeb Launcher Claude Edition.exe']];const samples={v050:[],v060:[]};
for(let i=0;i<5;i++)for(const [version,binary] of (i%2?[...variants].reverse():variants)){
 const label=`${runPrefix}-${version}-${i+1}`;execFileSync(process.execPath,['tests/benchmark.mjs',binary,label,'1'],{stdio:'inherit',windowsHide:true});const report=JSON.parse(await readFile(`${root}/${label}/metrics.json`,'utf8'));samples[version].push(report.samples[0]);
}
const median=(values,key)=>values.map(s=>s[key]).sort((a,b)=>a-b)[Math.floor(values.length/2)];const summary={method:'Five alternating paired runs per version, after compilation and functional tests completed; fresh process and fresh WebView2 profile, no OS disk-cache flush. Startup includes CDP harness overhead; idle entire native+WebView2 tree measured 1.5 seconds after UI ready.',samples,versions:{}};
for(const version of Object.keys(samples))summary.versions[version]={startupMs:median(samples[version],'startupMs'),privateBytes:median(samples[version],'privateBytes'),workingSet:median(samples[version],'workingSet')};
summary.percentChange=Object.fromEntries(Object.keys(summary.versions.v050).map(key=>[key,(summary.versions.v060[key]/summary.versions.v050[key]-1)*100]));await writeFile(`${root}/paired-final.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary.versions));console.log(JSON.stringify(summary.percentChange));
