import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import readline from 'node:readline';
import {writeSettings,readSettings} from '../src/config.ts';

const launcher=path.resolve('dist/codex-switchboard.exe');
test('packaged launcher preserves original Codex CLI --version', {skip:!fs.existsSync(launcher),timeout:10000},()=>{
 const result=spawnSync(launcher,['--version'],{encoding:'utf8',windowsHide:true,timeout:8000});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/^codex-cli /);
});
test('packaged app-server adds picker models and falls back on corrupt provider config', {skip:!fs.existsSync(launcher),timeout:20000},async()=>{
 for(const corrupt of [false,true]){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-launcher-'));const home=path.join(root,'codex-home');fs.mkdirSync(home);
  const auth=JSON.stringify({auth_mode:'apikey',OPENAI_API_KEY:'original-api-fixture'});fs.writeFileSync(path.join(home,'auth.json'),auth);
  if(corrupt)fs.writeFileSync(path.join(root,'providers.json'),'{broken');else writeSettings({version:1,providers:[{id:'vertex',label:'Vertex',type:'vertex',project:'fixture-project',location:'global',credentialsFile:path.join(root,'fixture.json'),models:['gemini-4-argon']}]},root);
  const env={...process.env};for(const key of Object.keys(env))if(/OPENAI.*KEY|CODEX.*TOKEN|OPENAI_IDENTITY/.test(key))delete env[key];
  const child=spawn(launcher,['-c',`model_catalog_json=${JSON.stringify(path.resolve('test/fixtures/catalog.json'))}`,'-c','cli_auth_credentials_store="file"','app-server'],{env:{...env,CODEX_HOME:home,CODEX_SWITCHBOARD_HOME:root},windowsHide:true});
  const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:any)=>void}>();let id=0;let stderr='';
  child.stderr.on('data',b=>stderr+=b.toString());
  const lines=readline.createInterface({input:child.stdout});lines.on('line',line=>{const m=JSON.parse(line);if(m.id!=null){const entry=pending.get(m.id);if(entry){pending.delete(m.id);m.error?entry.reject(Error(JSON.stringify(m.error))):entry.resolve(m.result);}}});
  const rpc=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(Error(method+' timed out: '+stderr.slice(-1000)));},5000);pending.set(next,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});child.stdin.write(JSON.stringify({id:next,method,params})+'\n');});
  try{
   await rpc('initialize',{clientInfo:{name:'packaged_switchboard_test',version:'0.1.0'}});child.stdin.write('{"method":"initialized"}\n');
   const models=await rpc('model/list',{});assert.equal(models.data.some((m:any)=>m.id==='thirdparty/vertex/gemini-4-argon'),!corrupt);if(!corrupt){assert.equal(models.switchboardTransportVersion,4);assert.equal(models.switchboardBackendVersion,'0.5.0');}
   if(!corrupt){assert.equal(models.switchboardReasoningVersion,1);const current=readSettings(root);current.providers[0].reasoning={'gemini-4-argon':'default'};writeSettings(current,root);const refreshed=await rpc('model/list',{});assert.equal(refreshed.data.find((m:any)=>m.id==='thirdparty/vertex/gemini-4-argon').supportedReasoningEfforts.length,1);delete current.providers[0].reasoning;writeSettings(current,root);const restored=await rpc('model/list',{});assert.equal(restored.data.find((m:any)=>m.id==='thirdparty/vertex/gemini-4-argon').supportedReasoningEfforts.length,3);}
   const account=await rpc('account/read',{refreshToken:false});assert.equal(account.requiresOpenaiAuth,true);assert.equal(account.account.type,'apiKey');assert.equal(fs.readFileSync(path.join(home,'auth.json'),'utf8'),auth);
   if(corrupt)assert.match(stderr,/回退官方内核/);
  }finally{child.stdin.end();setTimeout(()=>child.kill(),1000).unref();lines.close();}
 }
});
