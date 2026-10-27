import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const apply=process.argv.includes('--apply');
const root=path.join(os.homedir(),'.codex-model-switchboard');
const backupRoot=path.join(root,'native-backups','26.51007.21434');
const journal=JSON.parse(fs.readFileSync(path.join(backupRoot,'patch.json'),'utf8'));
const expectedRoot=path.join(os.homedir(),'.vscode','extensions','openai.chatgpt-26.51007.21434-win32-x64');
if(path.resolve(journal.extensionRoot).toLowerCase()!==path.resolve(expectedRoot).toLowerCase())throw Error('Unexpected extension root');
const originals=new Map([
 ['webview/assets/app-initial-fee819fe4f22.js','460201045b5f5a4255fda737c9baa4768367a973d735cb37f3467bfe6af95316'],
 ['webview/assets/app-initial-41ab338a184f.js','c755dbca916c0f830a554fe2e3057f8642b32394bea7701338e5d506f692ad56']
]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const plan=journal.files.map(f=>{
 if(originals.get(f.relative)!==f.beforeHash)throw Error('Unexpected original hash');
 const backup=path.resolve(backupRoot,f.beforeHash+'.js');
 const original=fs.readFileSync(backup),target=path.join(expectedRoot,f.relative),before=fs.readFileSync(target),currentHash=hash(before);
 if(hash(original)!==f.beforeHash)throw Error('Original backup failed verification');
 if(![f.beforeHash,f.afterHash].includes(currentHash))throw Error('Installed asset changed; refusing overwrite');
 return {...f,target,original,before,needsRestore:currentHash!==f.beforeHash};
});
if(plan.length!==originals.size)throw Error('Incomplete rollback journal');
const cachePath=path.join(os.homedir(),'.codex','models_cache.json');
const cacheBefore=fs.existsSync(cachePath)?fs.readFileSync(cachePath):undefined;
const cache=cacheBefore?JSON.parse(cacheBefore.toString('utf8')):undefined;
const originalModels=Array.isArray(cache?.models)?cache.models:[];
const models=originalModels.filter(m=>!String(m.slug||'').startsWith('thirdparty/'));
const report={applied:apply,assets:plan.map(f=>({file:f.relative,needsRestore:f.needsRestore})),removedCachedModels:originalModels.length-models.length};
if(apply){
 for(const f of plan)if(f.needsRestore){
  if(!fs.readFileSync(f.target).equals(f.before))throw Error('Asset changed during rollback');
  const temp=f.target+'.native-restore-'+crypto.randomUUID();fs.writeFileSync(temp,f.original);fs.renameSync(temp,f.target);
 }
 if(cacheBefore&&models.length!==originalModels.length){
  if(!fs.readFileSync(cachePath).equals(cacheBefore))throw Error('Catalog changed during rollback');
  const temp=cachePath+'.native-restore-'+crypto.randomUUID();fs.writeFileSync(temp,JSON.stringify({...cache,models}),{mode:0o600});fs.renameSync(temp,cachePath);
 }
 for(const f of plan)if(hash(fs.readFileSync(f.target))!==f.beforeHash)throw Error('Restored asset hash mismatch');
 report.originalAssetsVerified=true;
}
console.log(JSON.stringify(report));
