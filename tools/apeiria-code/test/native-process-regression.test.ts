import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {nativeProcess,createNativeFacade,nativeChildProcess,loadNativeBundle,createNativeFetch} from '../src/native-loader.ts';

test('native process polyfills and exit emitters stay entirely local',()=>{
  const scoped=nativeProcess({globalStorageUri:{fsPath:path.join(os.tmpdir(),'apeiria-private-process')}}) as NodeJS.Process & {__signal_exit_emitter__?:unknown};
  const originalEmit=process.emit,originalTitle=process.title,prior=(process as any).__signal_exit_emitter__;
  const marker={owner:'native-only'};scoped.__signal_exit_emitter__=marker;scoped.title='private-title';
  assert.equal(scoped.__signal_exit_emitter__,marker);assert.equal((process as any).__signal_exit_emitter__,prior);assert.equal(process.title,originalTitle);
  const event='apeiria-private-signal-test';let called=0;const before=process.listenerCount(event as any);
  scoped.on(event as any,()=>{called++;});assert.equal(process.listenerCount(event as any),before);scoped.emit(event as any);assert.equal(called,1);
  scoped.emit=((...args:any[])=>args[0]==='private') as NodeJS.Process['emit'];assert.equal(scoped.emit('private' as any),true);assert.equal(process.emit,originalEmit);
  assert.throws(()=>scoped.exit(0),/cannot change or terminate/);
});

test('the native launcher receives the current host executable without affecting other processes',()=>{
  const root=path.join(os.tmpdir(),'apeiria-native-node-regression');
  const options={nativeRoot:root,launcherPath:process.execPath,descriptorPath:path.join(root,'descriptor.json')};
  const child=nativeChildProcess(options,{CODEX_HOME:path.join(root,'home')});
  const result=child.spawnSync(process.execPath,['-e','process.stdout.write(process.env.APEIRIA_NATIVE_NODE||"missing")'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,process.execPath);assert.equal(process.env.APEIRIA_NATIVE_NODE,undefined);
});

test('native API constructors retain static methods and class identity',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-classes-'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'26.1021.22027'}));
  class Disposable {static from(...values:unknown[]){return values;}dispose(){}}
  class Uri {constructor(readonly fsPath:string){}static file(value:string){return new Uri(value);}}
  const real={Disposable,Uri,commands:{},workspace:{getConfiguration:()=>({})},window:{}};
  const context={globalStorageUri:{fsPath:path.join(root,'storage')},extension:{}};
  try{const scoped=createNativeFacade(real,context,{nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')});assert.deepEqual(scoped.api.Disposable.from('one','two'),['one','two']);assert(scoped.api.Uri.file(root) instanceof Uri);assert(new scoped.api.Disposable() instanceof Disposable);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('frozen workspace file APIs remain callable through the private URI facade',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-frozen-fs-'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({version:'26.1021.22027'}));
  class Uri {constructor(readonly scheme:string,readonly path:string){}get fsPath(){return this.path;}with(value:{scheme?:string}){return new Uri(value.scheme||this.scheme,this.path);}static file(value:string){return new Uri('file',value);}}
  const received:Uri[]=[];
  const fileApi=Object.freeze({async readFile(uri:Uri){received.push(uri);return Uint8Array.from([42]);}});
  const real={Uri,commands:{},workspace:{getConfiguration:()=>({}),fs:fileApi},window:{}};
  const context={globalStorageUri:{fsPath:path.join(root,'storage')},extension:{}};
  try{const scoped=createNativeFacade(real,context,{nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')});assert.deepEqual(await scoped.api.workspace.fs.readFile(new Uri('openai-codex','/fixture')),Uint8Array.from([42]));assert.equal(received[0].scheme,'apeiria-code-native');assert.equal(real.workspace.fs,fileApi);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('the native HTTP client receives standard Node web globals inside its realm',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-web-globals-'));
  fs.mkdirSync(path.join(root,'out'));fs.writeFileSync(path.join(root,'package.json'),'{}');
  fs.writeFileSync(path.join(root,'out','extension.js'),'module.exports={blob:new Blob(["fixture"]),form:new FormData(),uuid:crypto.randomUUID()};');
  const options={nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')};
  try{const loaded=loadNativeBundle(options,{api:{},context:{},process:nativeProcess({globalStorageUri:{fsPath:path.join(root,'storage')}})});assert.equal(await loaded.exports.blob.text(),'fixture');assert(loaded.exports.form instanceof FormData);assert.match(loaded.exports.uuid,/^[0-9a-f-]{36}$/);loaded.clear();}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native webview RPC containers cross into the correct realm and model notifications stay local',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-rpc-realm-'));
  fs.mkdirSync(path.join(root,'out'));fs.writeFileSync(path.join(root,'package.json'),'{}');
  fs.writeFileSync(path.join(root,'out','extension.js'),`module.exports={activate(){require('vscode').window.registerWebviewViewProvider('chatgpt.sidebarView',{resolveWebviewView(view){view.webview.onDidReceiveMessage(message=>{module.exports.matched=message.items instanceof Array&&message.items[0].nested instanceof Array;view.webview.postMessage({items:[1,2]});});}},{});}};`);
  class Uri {constructor(readonly fsPath:string){}static file(value:string){return new Uri(value);}}
  let registered:any,receive:any;const sent:any[]=[];
  const real={Uri,commands:{},workspace:{getConfiguration:()=>({})},window:{registerWebviewViewProvider(_id:string,p:any){registered=p;return {dispose(){}};}}};
  const context={globalStorageUri:{fsPath:path.join(root,'storage')},extension:{}};
  const options={nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')};
  try{const scoped=createNativeFacade(real,context,options),loaded=loadNativeBundle(options,scoped);loaded.exports.activate();await registered.resolveWebviewView({viewType:'apeiriaCode.native.sidebarView',webview:Object.freeze({onDidReceiveMessage(fn:any){receive=fn;return {dispose(){}};},postMessage(message:any){sent.push(message);return Promise.resolve(true);}})});receive({items:[{nested:[42]}]});assert.equal(loaded.exports.matched,true);assert(sent[0].items instanceof Array);await scoped.refreshModels();assert.deepEqual(sent.at(-1),{type:'apeiria-models-changed'});loaded.clear();}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('native account and experimentation fetches are rejected locally without replacing the host fetch',async()=>{
  const hostFetch=globalThis.fetch,addresses:string[]=[];
  const scoped=createNativeFetch((async(input:any)=>{addresses.push(String(input));return Response.json({local:true});}) as typeof fetch);
  for(const url of ['https://ab.chatgpt.com/v1/initialize','https://chatgpt.com/backend-api/wham/usage','https://api.openai.com/v1/responses']){const response=await scoped(url);assert.equal(response.status,403);assert.equal((await response.json()).error.code,'local_only');}
  assert.deepEqual(addresses,[]);assert.equal((await scoped('http://127.0.0.1:12345/bridge')).status,200);assert.equal(addresses.length,1);assert.equal(globalThis.fetch,hostFetch);
});

test('model refresh invokes only the connection inside its private native realm',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-refresh-hook-'));
  fs.mkdirSync(path.join(root,'out'));fs.writeFileSync(path.join(root,'package.json'),'{}');
  fs.writeFileSync(path.join(root,'out','extension.js'),'module.exports={refreshes:0};globalThis.__apeiriaNativeConnection={async apeiriaRefreshModels(){module.exports.refreshes++;}};');
  const options={nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')};
  try{const loaded=loadNativeBundle(options,{api:{},context:{},process:nativeProcess({globalStorageUri:{fsPath:path.join(root,'storage')}})});await loaded.refreshModels();assert.equal(loaded.exports.refreshes,1);assert.equal((globalThis as any).__apeiriaNativeConnection,undefined);loaded.clear();}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('saved queues and sidebar state reenter the native realm after a restart',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-memento-'));
  fs.mkdirSync(path.join(root,'out'));fs.writeFileSync(path.join(root,'package.json'),'{}');
  fs.writeFileSync(path.join(root,'out','extension.js'),`module.exports={async activate(context){const value=context.globalState.get('queued',{items:[]});module.exports.valid=Object.getPrototypeOf(value)===Object.prototype&&value.items instanceof Array&&Object.getPrototypeOf(value.items[0])===Object.prototype;const configuration=require('vscode').workspace.getConfiguration('chatgpt').get('fixture');module.exports.configValid=Object.getPrototypeOf(configuration)===Object.prototype;await context.workspaceState.update('order',{items:[{id:'native'}]});}};`);
  class Uri {constructor(readonly fsPath:string){}static file(value:string){return new Uri(value);}}
  const writes:any[]=[];const saved={items:[{text:'continue after timeout'}]};
  const memento={get:()=>saved,keys:()=>['queued'],async update(name:string,value:any){writes.push({name,value});}};
  const real={Uri,commands:{},workspace:{getConfiguration:()=>({get:()=>({nested:[42]})})},window:{}};
  const context={globalStorageUri:{fsPath:path.join(root,'storage')},extension:{},globalState:memento,workspaceState:memento};
  const options={nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')};
  try{const scoped=createNativeFacade(real,context,options),loaded=loadNativeBundle(options,scoped);await loaded.exports.activate(scoped.context);assert.equal(loaded.exports.valid,true);assert.equal(loaded.exports.configValid,true);assert.equal(Object.getPrototypeOf(writes[0].value),Object.prototype);assert(writes[0].value.items instanceof Array);assert.deepEqual(saved,{items:[{text:'continue after timeout'}]});loaded.clear();}finally{fs.rmSync(root,{recursive:true,force:true});}
});
