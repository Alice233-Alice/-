import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {beforeFromDiff} from '../src/diff.ts';
import type {Json} from '../src/types.ts';

const require=createRequire(import.meta.url);
const disposable=()=>({dispose(){}});
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate:()=>boolean){for(let i=0;i<200;i++){if(predicate())return;await delay(5);}throw Error('review fixture timed out');}
let bundle:Promise<string>|undefined;
function source(){return bundle||=build({entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,logLevel:'silent',plugins:[{name:'review-fixture',setup(builder){
  builder.onResolve({filter:/^vscode$|^\.\/(engine|bridge)\.ts$/},args=>({path:args.path,namespace:'review'}));
  builder.onLoad({filter:/.*/,namespace:'review'},args=>({contents:args.path==='vscode'?`const a=globalThis.__apeiriaReview.api;export const window=a.window,workspace=a.workspace,commands=a.commands,Uri=a.Uri,env=a.env,ConfigurationTarget=a.ConfigurationTarget;`:args.path==='./bridge.ts'?`export async function createBridge(){return {url:'http://127.0.0.1:1/private/v1',backendUrl:'http://127.0.0.1:1/blocked',token:'local',async close(){globalThis.__apeiriaReview.bridgeClosed++;}};}`:`export class Engine{constructor(options){this.options=options;globalThis.__apeiriaReview.engine=this;}async start(){await globalThis.__apeiriaReview.start?.();}async updateCatalog(){}rpc(method,params={}){return globalThis.__apeiriaReview.rpc(method,params);}respond(){}async dispose(){globalThis.__apeiriaReview.engineDisposed++;}}`,loader:'js'}));
}}]}).then(result=>result.outputFiles[0].text);}

async function fixture(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-review-')),workspace=path.join(dir,'workspace');fs.mkdirSync(workspace);
  const messages:Json[]=[],calls:Json[]=[],commands=new Map<string,()=>Promise<unknown>>(),secret=new Map<string,string>(),saved=new Map<string,unknown>();
  const uri=(file:string)=>({fsPath:file,toString:()=>`file://${file}`});
  let provider:any,receive:(message:Json)=>void=()=>{},listening=true;
  const context:any={globalStorageUri:uri(path.join(dir,'private')),extensionPath:path.resolve('.'),subscriptions:[],secrets:{get:async(k:string)=>secret.get(k),store:async(k:string,v:string)=>{secret.set(k,v);},delete:async(k:string)=>{secret.delete(k);}},workspaceState:{get:(k:string,fallback:unknown)=>saved.get(k)??fallback,update:async(k:string,v:unknown)=>{if(v===undefined)saved.delete(k);else saved.set(k,v);}}};
  const data:any={calls,bridgeClosed:0,engineDisposed:0,api:{Uri:{file:uri,from:({path:p}:Json)=>uri(p)},ConfigurationTarget:{Workspace:2},
    window:{createOutputChannel:()=>({appendLine(){},dispose(){}}),registerWebviewViewProvider:(_id:string,p:any)=>{provider=p;return disposable();},showErrorMessage:async()=>{},showInformationMessage:async()=>{},showTextDocument:async()=>{}},
    workspace:{workspaceFolders:[{uri:uri(workspace)}],isTrusted:true,getConfiguration:()=>({get:(_k:string,fallback:unknown)=>fallback,update:async()=>{}}),registerTextDocumentContentProvider:()=>disposable()},
    commands:{registerCommand:(id:string,fn:()=>Promise<unknown>)=>{commands.set(id,fn);return disposable();},executeCommand:async()=>{}},env:{}},
    rpc:async(method:string,params:Json)=>{calls.push({method,params});if(method==='thread/start')return {thread:{id:'empty-thread',cwd:workspace}};if(method==='thread/resume')return {thread:{id:params.threadId,cwd:workspace}};if(method==='turn/start')return {turn:{id:'turn1'}};if(method==='thread/list'||method==='thread/turns/list')return {data:[]};return {};},
  };
  (globalThis as any).__apeiriaReview=data;
  const module={exports:{} as any};new Function('require','module','exports',await source())(require,module,module.exports);await module.exports.activate(context);
  const view={cspSource:'https://fixture.invalid',options:{},html:'',asWebviewUri:(u:any)=>u,postMessage:async(m:Json)=>{if(listening)messages.push(structuredClone(m));},onDidReceiveMessage:(fn:any)=>{receive=fn;return disposable();}};
  provider.resolveWebviewView({webview:view,onDidDispose:()=>disposable()});
  let sequence=0;
  const send=async(action:string,payload:Json={})=>{const requestId=`review-${++sequence}`;receive({action,requestId,...payload});await until(()=>messages.some(m=>m.type==='result'&&m.requestId===requestId));return messages.find(m=>m.type==='result'&&m.requestId===requestId)!;};
  await send('saveProvider',{draft:{id:'review',label:'Review',type:'responses',models:['one','two'],baseUrl:'https://fixture.invalid/v1'}});
  let disposed=false;
  const dispose=async()=>{if(disposed)return;disposed=true;for(const subscription of context.subscriptions)await subscription.dispose?.();};
  return {data,calls,messages,commands,send,receive,dispose,state:()=>messages.filter(m=>m.type==='state').at(-1)!.state,listening(value:boolean){listening=value;},async close(){await dispose();delete (globalThis as any).__apeiriaReview;}};
}

test('cancel before first turn forgets an unpersisted thread before switching models',async()=>{
  const f=await fixture();try{
    const original=f.data.rpc;let release:(value:unknown)=>void=()=>{};
    f.data.rpc=async(method:string,params:Json)=>{if(method==='thread/start'){f.calls.push({method,params});return new Promise(resolve=>release=resolve);}return original(method,params);};
    f.receive({action:'send',requestId:'cancel-before-turn',text:'hello'});await until(()=>f.calls.some(c=>c.method==='thread/start'));
    await f.send('stop');release({thread:{id:'empty-thread'}});await until(()=>f.messages.some(m=>m.requestId==='cancel-before-turn'));
    assert.equal(f.state().busy,false);assert.equal(f.state().threadId,null);
    assert.equal(f.calls.filter(c=>c.method==='turn/start').length,0);
    const model=f.state().models[1];assert.equal((await f.send('selectModel',{model:model.id,effort:'medium'})).ok,true);
  }finally{await f.close();}
});

test('one stop interrupts a turn once across event and acknowledgement ordering',async()=>{
  const f=await fixture();try{
    const original=f.data.rpc;let release:(value:unknown)=>void=()=>{};
    f.data.rpc=async(method:string,params:Json)=>{if(method==='turn/start'){f.calls.push({method,params});return new Promise(resolve=>release=resolve);}return original(method,params);};
    f.receive({action:'send',requestId:'stop-during-start',text:'hello'});await until(()=>f.calls.some(c=>c.method==='turn/start'));
    await f.send('stop');f.data.engine.options.onEvent('turn/started',{threadId:'empty-thread',turn:{id:'turn1'}});release({turn:{id:'turn1'}});
    await until(()=>f.messages.some(m=>m.requestId==='stop-during-start'));
    assert.equal(f.calls.filter(c=>c.method==='turn/interrupt').length,1);
  }finally{await f.close();}
});

test('settings command waits for the first webview ready handshake',async()=>{
  const f=await fixture();try{
    f.listening(false);await f.commands.get('apeiriaCode.settings')!();f.listening(true);await f.send('ready');
    assert.ok(f.messages.some(m=>m.type==='navigate'&&m.page==='settings'));
  }finally{await f.close();}
});

test('deletion-only unified hunks recover text after their preceding line',()=>{
  assert.equal(beforeFromDiff('a\nc\n','@@ -2,1 +1,0 @@\n-b\n'),'a\nb\nc\n');
});

test('deactivation during startup closes its candidate engine and bridge',async()=>{
  const f=await fixture();try{
    let release:()=>void=()=>{};f.data.start=()=>new Promise<void>(resolve=>release=resolve);
    f.receive({action:'send',requestId:'closing-startup',text:'hello'});await until(()=>Boolean(f.data.engine));
    const closing=f.dispose();release();await closing;
    await until(()=>f.messages.some(m=>m.requestId==='closing-startup'));
    assert.ok(f.data.engineDisposed>=1);assert.ok(f.data.bridgeClosed>=1);
  }finally{await f.close();}
});
