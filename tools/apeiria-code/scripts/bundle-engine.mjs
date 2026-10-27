import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source=process.argv[2];
if(!source)throw Error('Provide the directory of the licensed Windows x64 Codex CLI distribution.');
const pinned='0.164.0-alpha.11.1';
const version=execFileSync(path.join(source,'codex.exe'),['--version'],{encoding:'utf8',windowsHide:true}).trim().replace(/^codex-cli\s+/,'');
if(version!==pinned)throw Error(`Engine version ${version} does not match pinned ${pinned}`);
const root=path.resolve('engine'),dest=path.join(root,'windows-x86_64');fs.mkdirSync(dest,{recursive:true});
const names=['codex.exe','codex-command-runner.exe','codex-windows-sandbox-setup.exe','codex-code-mode-host.exe','rg.exe','codex-package.json'];
for(const name of names)fs.copyFileSync(path.join(source,name),path.join(dest,name));
for(const relative of ['codex-resources/codex-command-runner.exe','codex-resources/codex-windows-sandbox-setup.exe','codex-path/rg.exe']){
 const input=path.join(source,relative);if(!fs.existsSync(input))continue;fs.mkdirSync(path.dirname(path.join(dest,relative)),{recursive:true});fs.copyFileSync(input,path.join(dest,relative));
}
for(const name of ['LICENSE','NOTICE']){
 const result=await fetch('https://raw.githubusercontent.com/openai/codex/main/'+name);
 if(!result.ok)throw Error(`Unable to obtain upstream ${name}: ${result.status}`);
 fs.writeFileSync(path.join(root,'CODEX_'+name+'.txt'),await result.text());
}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const entries=files(root).filter(f=>!['manifest.json','.gitkeep'].includes(path.basename(f))).map(file=>({path:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version,target:'x86_64-pc-windows-msvc',source:'https://github.com/openai/codex',entrypoint:'windows-x86_64/codex.exe',files:entries},null,2)+'\n');
console.log(`Bundled independent Codex CLI ${version}: ${entries.length} verified files.`);
