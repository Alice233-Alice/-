import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type {Settings} from './config.ts';
import {modelInfos} from './config.ts';

// Codex may reuse a still-fresh remote catalog before contacting the bridge.
// Update only our namespaced models at startup; preserve official entries,
// timestamps and identity. Never read or write auth or session files.
export function refreshCachedModels(settings:Settings,home=process.env.CODEX_HOME||path.join(os.homedir(),'.codex')){
  const file=path.join(home,'models_cache.json');if(!fs.existsSync(file))return;
  const before=fs.readFileSync(file,'utf8'),cache=JSON.parse(before);
  if(!Array.isArray(cache.models))return;
  const official=cache.models.filter((m:any)=>!String(m.slug||'').startsWith('thirdparty/'));
  const models=[...official,...modelInfos(settings,official[0])];
  if(JSON.stringify(models)===JSON.stringify(cache.models))return;
  const tmp=file+'.'+crypto.randomUUID()+'.tmp';
  try{
    // Leave a concurrently refreshed cache alone; normal network discovery will
    // supply the new capabilities in that case.
    if(fs.readFileSync(file,'utf8')!==before)return;
    fs.writeFileSync(tmp,JSON.stringify({...cache,models}),{mode:0o600});fs.renameSync(tmp,file);
  }finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
