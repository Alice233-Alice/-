import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('engine/manifest.json','utf8'));
for(const entry of manifest.files){const bytes=fs.readFileSync(path.join('engine',entry.path));if(crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Engine hash mismatch: '+entry.path);}
const shipped={...pkg};for(const key of ['dependencies','devDependencies','scripts','private'])delete shipped[key];
const xml=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const vsix=`<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="${pkg.name}" Version="${pkg.version}" Publisher="${pkg.publisher}" TargetPlatform="win32-x64"/><DisplayName>${pkg.displayName}</DisplayName><Description xml:space="preserve">${xml(pkg.description)}</Description><Tags>AI,codex,vertex</Tags><Categories>AI,Other</Categories><GalleryFlags>Public</GalleryFlags><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="${pkg.engines.vscode}"/><Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value=""/><Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/></Properties></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/><Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/><Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true"/></Assets></PackageManifest>`;
const files={'extension.vsixmanifest':strToU8(vsix),'extension/package.json':strToU8(JSON.stringify(shipped,null,2))};
for(const f of ['README.md','LICENSE'])files['extension/'+f]=fs.readFileSync(f);
function add(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())add(f);else if(e.name!=='.gitkeep'&&!e.name.endsWith('.cs')&&!e.name.endsWith('.map'))files['extension/'+f.replaceAll('\\','/')]=fs.readFileSync(f);}}
for(const dir of ['dist','media','engine','native'])add(dir);
const provenance=JSON.parse(fs.readFileSync('native/provenance.json','utf8'));
if(provenance.version!=='26.1021.22027')throw Error('Unsupported native client version');
for(const entry of provenance.files){const bytes=files['extension/native/'+entry.path];if(!bytes||crypto.createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Native asset hash mismatch: '+entry.path);}
// Native UI resources include fonts, WASM, audio and extensionless license files.
// Declare every packaged part rather than relying on the prototype's short list.
const contentTypes={js:'text/javascript',cjs:'text/javascript',json:'application/json',html:'text/html',css:'text/css',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',wasm:'application/wasm',vsixmanifest:'text/xml'};
const extensions=new Set(),overrides=[];
for(const file of Object.keys(files)){const ext=path.posix.extname(file).slice(1);if(ext)extensions.add(ext);else overrides.push(`<Override PartName="/${xml(file)}" ContentType="application/octet-stream"/>`);}
files['[Content_Types].xml']=strToU8('<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+[...extensions].sort().map(ext=>`<Default Extension="${xml(ext)}" ContentType="${contentTypes[ext]||'application/octet-stream'}"/>`).join('')+overrides.join('')+'</Types>');
const output=`apeiria-code-${pkg.version}-win32-x64.vsix`;
fs.writeFileSync(output,zipSync(files,{level:6}));
console.log(`${output} (${(fs.statSync(output).size/1024/1024).toFixed(1)} MB)`);
