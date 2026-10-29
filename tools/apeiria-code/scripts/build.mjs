import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
fs.mkdirSync('dist',{recursive:true});
await build({entryPoints:['src/extension.ts'],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:'dist/extension.cjs',external:['vscode','bufferutil','utf-8-validate'],logLevel:'warning'});
await build({entryPoints:['src/native-runtime.ts'],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:'dist/native-runtime.cjs',external:['bufferutil','utf-8-validate'],logLevel:'warning'});
await build({entryPoints:['src/install-config.ts'],bundle:true,platform:'node',target:'node22',format:'cjs',outfile:'dist/configure-native-apis.cjs',logLevel:'warning'});
await import('./build-native-launcher.mjs');
await build({entryPoints:['ui/main.ts'],bundle:true,platform:'browser',target:'chrome120',format:'iife',outfile:'dist/webview.js',define:{__VUE_OPTIONS_API__:'false',__VUE_PROD_DEVTOOLS__:'false',__VUE_PROD_HYDRATION_MISMATCH_DETAILS__:'false','process.env.NODE_ENV':'"production"'},logLevel:'warning'});
fs.copyFileSync('ui/style.css','dist/webview.css');
const require=createRequire(import.meta.url),visited=new Set();let notices='Apeiria Code third-party notices\n';
function licenses(name){if(visited.has(name))return;visited.add(name);let file;try{file=require.resolve(name+'/package.json');}catch{let dir=path.dirname(require.resolve(name));while(true){const candidate=path.join(dir,'package.json');if(fs.existsSync(candidate)&&JSON.parse(fs.readFileSync(candidate,'utf8')).name===name){file=candidate;break;}const parent=path.dirname(dir);if(parent===dir)throw Error('Missing license metadata: '+name);dir=parent;}}const pkg=JSON.parse(fs.readFileSync(file,'utf8')),dir=path.dirname(file);const license=['LICENSE','LICENSE.md','LICENSE.txt','license'].map(n=>path.join(dir,n)).find(f=>fs.existsSync(f));notices+='\n\n'+name+' '+pkg.version+'\n'+(license?fs.readFileSync(license,'utf8'):String(pkg.license||'See upstream'));for(const dep of Object.keys(pkg.dependencies||{}))licenses(dep);}
for(const name of Object.keys(JSON.parse(fs.readFileSync('package.json','utf8')).dependencies))licenses(name);
licenses('jsonc-parser');
fs.writeFileSync('dist/THIRD_PARTY_NOTICES.txt',notices);
console.log('Built independent extension and Webview.');
