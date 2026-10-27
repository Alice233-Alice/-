import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
fs.mkdirSync('dist',{recursive:true});
for(const entry of ['extension','router'])await build({entryPoints:[`src/${entry}.ts`],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:`dist/${entry}.cjs`,external:['vscode','bufferutil','utf-8-validate'],sourcemap:false,logLevel:'warning'});
await build({entryPoints:['src/panel-client.ts'],bundle:true,platform:'browser',target:'chrome120',format:'iife',outfile:'dist/panel.js',logLevel:'warning'});
await build({entryPoints:['src/native-menu.ts'],bundle:true,platform:'browser',target:'chrome120',format:'iife',globalName:'CodexSwitchboardMenu',outfile:'dist/native-menu.js',logLevel:'warning'});
fs.copyFileSync('src/panel.css','dist/panel.css');
fs.writeFileSync('dist/node-path.txt',process.execPath+'\n');
const require=createRequire(import.meta.url), visited=new Set();let notices='Third-party runtime dependency licenses\n';
function licenses(name){if(visited.has(name))return;visited.add(name);const packageFile=require.resolve(name+'/package.json');const pkg=JSON.parse(fs.readFileSync(packageFile,'utf8'));const directory=path.dirname(packageFile);const file=['LICENSE','LICENSE.md','LICENSE.txt','license'].map(n=>path.join(directory,n)).find(f=>fs.existsSync(f));notices+='\n\n--- '+name+' '+pkg.version+' ---\n'+(file?fs.readFileSync(file,'utf8'):String(pkg.license || 'See upstream package.'));for(const dep of Object.keys(pkg.dependencies || {}))licenses(dep);}
for(const name of Object.keys(JSON.parse(fs.readFileSync('package.json','utf8')).dependencies))licenses(name);
fs.writeFileSync('dist/THIRD_PARTY_NOTICES.txt',notices);
if(process.platform==='win32'){
 const compiler=path.join(process.env.WINDIR || 'C:/Windows','Microsoft.NET/Framework64/v4.0.30319/csc.exe');
 execFileSync(compiler,['/nologo','/utf8output','/target:exe','/optimize+','/reference:System.Security.dll','/out:'+path.resolve('dist/codex-switchboard.exe'),path.resolve('native/Launcher.cs')],{stdio:'inherit',windowsHide:true});
}
console.log('Built extension, local adapter and Windows launcher.');
