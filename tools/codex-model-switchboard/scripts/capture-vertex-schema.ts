// Capture only Codex tool schemas using a fresh test home and an invented prompt.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {createBridge} from '../src/bridge.ts';
import {readSettings,writeSettings,alias,modelInfos} from '../src/config.ts';
import type {Json} from '../src/config.ts';
process.env.CODEX_SWITCHBOARD_IMPORT_ONLY='1';
const {findOfficialCli}=await import('../src/router.ts');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'vertex-schema-probe-')),home=path.join(root,'home');fs.mkdirSync(home);
fs.writeFileSync(path.join(home,'auth.json'),JSON.stringify({auth_mode:'apikey',OPENAI_API_KEY:'isolated-probe-fixture'}));
const original=readSettings().providers.find(p=>p.enabled!==false&&p.type==='vertex');if(!original)throw Error('No Vertex provider');
const provider={...original,id:'probe',models:[original.models[0]]};writeSettings({version:1,providers:[provider]},root);
const catalog=JSON.parse(fs.readFileSync('test/fixtures/catalog.json','utf8'));catalog.models.push(...modelInfos({version:1,providers:[provider]},catalog.models[0]));
const catalogFile=path.join(root,'catalog.json');fs.writeFileSync(catalogFile,JSON.stringify(catalog));
let captured:Json|undefined;
const bridge=await createBridge({root,launcher:path.resolve('dist/codex-switchboard.exe'),catalog,vertexAuth:{getToken:async()=> 'local-probe-fixture'} as any,fetcher:async(_url:any,options:any)=>{
 captured=JSON.parse(options.body);
 return {ok:true,body:{async *[Symbol.asyncIterator](){yield Buffer.from('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'OK'}]},finishReason:'STOP'}]})+'\n\n');}}} as any;
}});
const child=spawn(findOfficialCli(),['-c',`openai_base_url=${JSON.stringify(bridge.url)}`,'-c',`model_catalog_json=${JSON.stringify(catalogFile)}`,'-c','cli_auth_credentials_store="file"','app-server'],{env:{...process.env,CODEX_HOME:home},windowsHide:true});
let id=0;const pending=new Map<number,{resolve:(r:any)=>void;reject:(e:any)=>void}>();
const lines=readline.createInterface({input:child.stdout});child.stderr.resume();
lines.on('line',line=>{const m=JSON.parse(line);const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
const rpc=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});child.stdin.write(JSON.stringify({id:next,method,params})+'\n');});
try{
 await rpc('initialize',{clientInfo:{name:'vertex_schema_probe',version:'1'}});child.stdin.write('{"method":"initialized"}\n');
 const t=await rpc('thread/start',{model:alias(provider,provider.models[0]),cwd:root,approvalPolicy:'never',sandbox:'read-only'});
 await rpc('turn/start',{threadId:t.thread.id,model:alias(provider,provider.models[0]),effort:'low',input:[{type:'text',text:'Reply OK only. Do not run tools.'}]});
 const until=Date.now()+15000;while(!captured&&Date.now()<until)await new Promise(r=>setTimeout(r,20));if(!captured)throw Error('No captured request');
 const payload={contents:[{role:'user',parts:[{text:'Reply OK only. Do not run tools.'}]}],tools:captured.tools};
 fs.mkdirSync('test-output',{recursive:true});fs.writeFileSync('test-output/vertex-schema-probe.json',JSON.stringify(payload,null,2));
 console.log(JSON.stringify({toolCount:payload.tools?.[0]?.functionDeclarations?.length,file:'test-output/vertex-schema-probe.json'}));
}finally{child.stdin.end();child.kill();lines.close();await bridge.close();}
