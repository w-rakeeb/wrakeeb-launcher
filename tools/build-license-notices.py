from pathlib import Path
import json,subprocess,hashlib
metadata=json.loads(subprocess.check_output(['cargo','metadata','--locked','--format-version','1','--filter-platform','x86_64-pc-windows-msvc','--manifest-path','src-tauri/Cargo.toml'],text=True,encoding='utf-8'))
ids={node['id'] for node in metadata['resolve']['nodes']}
sections=['THIRD-PARTY NOTICES\nWrakeeb Launcher 0.4.0\n\nThis inventory includes resolved Windows Rust dependencies and front-end/build packages. Inclusion is intentionally broad; it does not assert that every listed package is linked into the final executable. Original license terms govern each component.\n']
inventory=[];missing=[]
for pkg in sorted(metadata['packages'],key=lambda p:p['name']):
 if pkg['id'] not in ids or pkg['name']=='wrakeeb-launcher':continue
 root=Path(pkg['manifest_path']).parent
 files=[f for f in root.iterdir() if f.is_file() and f.name.upper().startswith(('LICENSE','LICENCE','COPYING','NOTICE','UNLICENSE'))]
 inventory.append({'ecosystem':'Cargo','name':pkg['name'],'version':pkg['version'],'license':pkg.get('license'),'repository':pkg.get('repository'),'noticeFiles':[f.name for f in files]})
 sections.append('\n'+'='*72+'\n'+pkg['name']+' '+pkg['version']+'\nSPDX: '+str(pkg.get('license'))+'\nSource: '+str(pkg.get('repository'))+'\n')
 if not files:missing.append('Cargo '+pkg['name'])
 for f in files: sections.append('\n--- '+f.name+' ---\n'+f.read_text(encoding='utf-8',errors='replace')+'\n')
lock=json.loads(Path('package-lock.json').read_text(encoding='utf-8'))
for key,pkg in sorted(lock['packages'].items()):
 if not key.startswith('node_modules/'):continue
 root=Path(key)
 if not root.exists():continue
 name=key.removeprefix('node_modules/');files=[f for f in root.iterdir() if f.is_file() and f.name.upper().startswith(('LICENSE','LICENCE','COPYING','NOTICE','UNLICENSE'))]
 inventory.append({'ecosystem':'npm','name':name,'version':pkg.get('version'),'license':pkg.get('license'),'noticeFiles':[f.name for f in files]})
 sections.append('\n'+'='*72+'\n'+name+' '+str(pkg.get('version'))+'\nSPDX: '+str(pkg.get('license'))+'\n')
 if not files:missing.append('npm '+name)
 for f in files:sections.append('\n--- '+f.name+' ---\n'+f.read_text(encoding='utf-8',errors='replace')+'\n')
# Supplement package archives that omit a root license file, retaining provenance.
for item in json.loads(Path('docs/references/upstream-license-sources.json').read_text(encoding='utf-8')):
 sections.append('\n'+'='*72+'\nSupplement: '+item['component']+'\nSource: '+item['source']+'\n'+Path(item['file']).read_text(encoding='utf-8')+'\n')
 missing=[name for name in missing if name.split(' ',1)[1]!=item['component']]
# Exact repeated license bodies share a single copy; component references remain intact.
texts={}; compressed=[]
for section in sections:
 if section.startswith('\n--- '):
  split=section.index(' ---\n')+5; body=section[split:]; digest=hashlib.sha256(body.encode()).hexdigest()[:16]
  if digest in texts: compressed.append(section[:split]+'See license text '+digest+' above.\n')
  else: texts[digest]=True; compressed.append(section[:split]+'License text '+digest+'\n'+body)
 else: compressed.append(section)
compressed.append('\nInventory exception: stackback 0.0.2 declares MIT in package metadata but omits its license text. It is a Vitest test-only dependency, excluded from the production bundle. No reconstructed copyright notice is asserted.\n')
Path('docs/THIRD-PARTY-NOTICES.txt').write_text(''.join(compressed),encoding='utf-8')
Path('docs/DEPENDENCY-LICENSES.json').write_text(json.dumps({'components':inventory,'missingRootNoticeFiles':missing},indent=2),encoding='utf-8')
print(json.dumps({'components':len(inventory),'noRootLicenseFile':missing,'noticeBytes':Path('docs/THIRD-PARTY-NOTICES.txt').stat().st_size}))
