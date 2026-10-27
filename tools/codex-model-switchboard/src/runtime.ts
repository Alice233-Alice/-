import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {dataRoot} from './config.ts';
export function installRuntime(extensionPath:string,root=dataRoot()){
  const directory=path.join(root,'runtime');fs.mkdirSync(directory,{recursive:true});
  for(const file of ['router.cjs','node-path.txt']){
    const source=fs.readFileSync(path.join(extensionPath,'dist',file)),target=path.join(directory,file);
    if(fs.existsSync(target) && source.equals(fs.readFileSync(target)))continue;
    const tmp=target+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,source);fs.renameSync(tmp,target);
  }
  const launcher=path.join(directory,'codex-switchboard.exe');
  // The stable launcher is immutable while running; its Node router is replaced atomically.
  if(!fs.existsSync(launcher))fs.copyFileSync(path.join(extensionPath,'dist','codex-switchboard.exe'),launcher);
  return launcher;
}
