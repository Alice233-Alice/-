import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import type {Json} from '../src/types.ts';

const require=createRequire(import.meta.url);
const disposable=()=>({dispose(){}});
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function until(predicate:()=>boolean){for(let i=0;i<150;i++){if(predicate())return;await delay(5);}throw Error('host fixture timed out');}
let bundle:Promise<string>|undefined;
function source(){return bundle||=build({entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,logLevel:'silent',plugins:[{name:'host-fixture',setup(builder){
  builder.onResolve({filter:/^vscode$/},()=>({path:'vscode',namespace:'host-mock'}));
  builder.onResolve({filter:/\/engine\.ts$/},()=>({path:'engine',namespace:'host-mock'}));
  builder.onResolve({filter:/^\.\/engine\.ts$/},()=>({path:'engine',namespace:'host-mock'}));
  builder.onResolve({filter:/^\.\/bridge\.ts$/},()=>({path:'bridge',namespace:'host-mock'}));
  builder.onLoad({filter:/.*/,namespace:'host-mock'},args=>({contents:args.path==='vscode'?`const api=globalThis.__apeiriaHostFixture.api;export const window=api.window,workspace=api.workspace,commands=api.commands,Uri=api.Uri,env=api.env,ConfigurationTarget=api.ConfigurationTarget;`:args.path==='bridge'?`export async function createBridge(){return {url:'http://127.0.0.1:1/private/v1',backendUrl:'http://127.0.0.1:1/blocked',token:'local',async close(){}};}`:`export class Engine {constructor(options){this.options=options;globalThis.__apeiriaHostFixture.engine=this;}async start(){this.options.onStatus?.('已就绪');}async updateCatalog(catalog){globalThis.__apeiriaHostFixture.catalog=catalog;}rpc(method,params={}){return globalThis.__apeiriaHostFixture.rpc(method,params);}respond(id,result){globalThis.__apeiriaHostFixture.responses.push({id,result});}async dispose(){}}`,loader:'js'}));
}}]}).then(result=>result.outputFiles[0].text);}

async function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-host-')),workspace=path.join(dir,'workspace');fs.mkdirSync(workspace);
  const messages:Json[]=[],calls:Json[]=[],responses:Json[]=[],commands=new Map<string,()=>Promise<unknown>>(),secret=new Map<string,string>(),workspaceState=new Map<string,unknown>();
  const uri=(file:string,scheme='file')=>({fsPath:file,scheme,toString:()=>scheme+'://'+file});
  let receive:(message:Json)=>void=()=>{},provider:any,selectedFiles:any[]|undefined;
  const context:any={globalStorageUri:uri(path.join(dir,'private')),extensionPath:path.resolve('.'),subscriptions:[],secrets:{get:async(k:string)=>secret.get(k),store:async(k:string,v:string)=>{secret.set(k,v);},delete:async(k:string)=>{secret.delete(k);}},workspaceState:{get:(k:string,fallback:unknown)=>workspaceState.get(k)??fallback,update:async(k:string,v:unknown)=>{if(v===undefined)workspaceState.delete(k);else workspaceState.set(k,v);}}};
  const data:any={responses,calls,api:{
    Uri:{file:(p:string)=>uri(p),from:({scheme,path:p}:any)=>uri(p,scheme),parse:(p:string)=>{const u=new URL(p);return uri(p,u.protocol.slice(0,-1));}},ConfigurationTarget:{Workspace:2},
    window:{createOutputChannel:()=>({appendLine(){},dispose(){}}),registerWebviewViewProvider:(_id:string,p:any)=>{provider=p;return disposable();},showOpenDialog:async()=>selectedFiles,showErrorMessage:async()=>{},showInformationMessage:async()=>undefined,showTextDocument:async()=>{},showQuickPick:async()=>undefined,showInputBox:async()=>undefined},
    workspace:{workspaceFolders:[{uri:uri(workspace)}],isTrusted:true,getConfiguration:()=>({get:(_k:string,fallback:unknown)=>fallback,update:async()=>{}}),registerTextDocumentContentProvider:()=>disposable(),openTextDocument:async()=>({}),fs:{writeFile:async()=>{}}},
    commands:{registerCommand:(id:string,fn:()=>Promise<unknown>)=>{commands.set(id,fn);return disposable();},executeCommand:async()=>{}},env:{openExternal:async()=>true}},
    rpc:async(method:string,params:Json)=>{calls.push({method,params});if(method==='thread/list')return {data:[{id:'t1',name:'History',cwd:workspace}]};if(method==='thread/start')return {thread:{id:'t1',cwd:workspace}};if(method==='thread/resume')return {thread:{id:params.threadId,cwd:workspace}};if(method==='thread/turns/list')return {data:[{id:'turn-history',items:[{id:'user-history',type:'userMessage',content:[{type:'text',text:'persisted user text'}]},{id:'agent-history',type:'agentMessage',text:'persisted reply'}]}]};if(method==='thread/items/list')throw Error('Unsupported method: thread/items/list');if(method==='turn/start')return {turn:{id:'turn1'}};return {};},
  };
  (globalThis as any).__apeiriaHostFixture=data;
  const module={exports:{} as any};new Function('require','module','exports',await source())(require,module,module.exports);await module.exports.activate(context);
  const view={cspSource:'https://fixture.invalid',options:{},html:'',asWebviewUri:(u:any)=>u,postMessage:async(m:Json)=>{messages.push(structuredClone(m));},onDidReceiveMessage:(fn:any)=>{receive=fn;return disposable();}};
  provider.resolveWebviewView({webview:view,onDidDispose:()=>disposable()});
  let sequence=0;
  const send=async(action:string,payload:Json={})=>{const requestId='host-'+(++sequence);receive({action,requestId,...payload});await until(()=>messages.some(m=>m.type==='result'&&m.requestId===requestId));return messages.find(m=>m.type==='result'&&m.requestId===requestId)!;};
  await send('saveProvider',{draft:{id:'p',label:'P',type:'chat-completions',models:['model'],baseUrl:'https://fixture.invalid/v1',apiKey:'saved-secret'}});
  return {data,dir,workspace,messages,calls,responses,commands,send,receive,state:()=>messages.filter(m=>m.type==='state').at(-1)!.state,files:(paths:string[])=>{selectedFiles=paths.map(p=>uri(p));},async close(){for(const item of context.subscriptions)await item.dispose?.();delete (globalThis as any).__apeiriaHostFixture;}};
}

test('host import only returns the JSON file explicitly selected in the file dialog',async()=>{
  const f=await fixture();try{const selected=path.join(f.dir,'selected.json'),arbitrary=path.join(f.dir,'arbitrary.json');fs.writeFileSync(selected,'{"project_id":"chosen","private_key":"newly-selected"}');fs.writeFileSync(arbitrary,'{"private_key":"arbitrary-secret"}');f.files([selected]);const result=await f.send('importJson',{path:arbitrary});assert.equal(result.ok,true);assert.match(result.data.json,/newly-selected/);assert(!result.data.json.includes('arbitrary-secret'));assert(!JSON.stringify(f.state()).includes('saved-secret'));}finally{await f.close();}
});

test('host restores persisted thread turns using the supported paginated history API',async()=>{
  const f=await fixture();try{const result=await f.send('selectThread',{id:'t1'});assert.equal(result.ok,true,result.message);assert(f.state().items.some((i:Json)=>i.text==='persisted reply'));assert(f.calls.some(c=>c.method==='thread/turns/list'));}finally{await f.close();}
});

test('host handles tool approvals and rejects unsupported or stale decisions',async()=>{
  const f=await fixture();try{await f.send('ready');f.data.engine.options.onRequest(7,'item/commandExecution/requestApproval',{threadId:'t1',availableDecisions:['accept','decline'],command:'echo fixture'});const rejected=await f.send('approval',{id:7,decision:'acceptForSession'});assert.equal(rejected.ok,false);assert.equal(f.responses.length,0);const accepted=await f.send('approval',{id:7,decision:'accept'});assert.equal(accepted.ok,true);assert.deepEqual(f.responses,[{id:7,result:{decision:'accept'}}]);assert.equal((await f.send('approval',{id:7,decision:'accept'})).ok,false);}finally{await f.close();}
});

test('host locks generation before async startup so rapid sends cannot create duplicate threads',async()=>{
  const f=await fixture();try{const original=f.data.rpc;let release:(value:unknown)=>void=()=>{};f.data.rpc=async(method:string,params:Json)=>{if(method==='thread/start'){f.calls.push({method,params});return new Promise(r=>release=r);}return original(method,params);};f.receive({action:'send',requestId:'first-send',text:'one'});await until(()=>f.calls.some(c=>c.method==='thread/start'));const second=await f.send('send',{text:'two'});assert.equal(second.ok,false);assert.equal(f.calls.filter(c=>c.method==='thread/start').length,1);release({thread:{id:'t1',cwd:f.workspace}});await until(()=>f.messages.some(m=>m.requestId==='first-send'));}finally{await f.close();}
});

test('host remembers stop while the turn start acknowledgement is still pending',async()=>{
  const f=await fixture();try{
    const original=f.data.rpc;let release:(value:unknown)=>void=()=>{};
    f.data.rpc=async(method:string,params:Json)=>{if(method==='turn/start'){f.calls.push({method,params});return new Promise(r=>release=r);}return original(method,params);};
    f.receive({action:'send',requestId:'pending-turn',text:'start then stop'});await until(()=>f.calls.some(c=>c.method==='turn/start'));
    assert.equal((await f.send('stop')).ok,true);f.data.engine.options.onEvent('turn/started',{threadId:'t1',turn:{id:'turn1'}});release({turn:{id:'turn1'}});
    await until(()=>f.calls.some(c=>c.method==='turn/interrupt'));assert.equal(f.calls.filter(c=>c.method==='turn/interrupt').length,1);
  }finally{await f.close();}
});
