import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const mode=process.argv[2]||'capture',file='test-output/official-isolation.json';
const extensions=path.join(os.homedir(),'.vscode','extensions');
function snapshot(){const selected=[];
 for(const dir of fs.readdirSync(extensions).filter(n=>n.startsWith('openai.chatgpt-'))){const base=path.join(extensions,dir);for(const relative of ['package.json','out/extension.js','bin/windows-x86_64/codex.exe']){const f=path.join(base,relative);if(fs.existsSync(f))selected.push(f);}const assets=path.join(base,'webview','assets');if(fs.existsSync(assets))for(const name of fs.readdirSync(assets)){if(!/^(profile-dropdown|dynamic-intelligence-dropdown|model-queries|list-filter|use-composer-model-and-reasoning-selection|app-initial|message-bus|settings)-.*\.js$/.test(name))continue;const f=path.join(assets,name);if(fs.statSync(f).isFile())selected.push(f);}}
 for(const f of [path.join(os.homedir(),'.codex','config.toml'),path.join(os.homedir(),'AppData','Roaming','Code','User','settings.json')])if(fs.existsSync(f))selected.push(f);
 console.log(`Checking ${selected.length} official program/configuration files; credential contents are excluded.`);
 return Object.fromEntries(selected.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
}
if(mode==='capture'){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(snapshot()));console.log('Official extension/configuration fingerprints recorded; no credential contents recorded.');}
else {const before=JSON.parse(fs.readFileSync(file,'utf8')),after=snapshot(),changed=Object.keys(before).filter(f=>before[f]!==after[f]);if(changed.length)throw Error('Official files changed: '+changed.join(', '));console.log(`Official isolation verified: ${Object.keys(before).length} fingerprints unchanged.`);}
