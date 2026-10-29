import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import type {Json} from '../src/types.ts';

const require=createRequire(import.meta.url);
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate:()=>boolean){for(let i=0;i<200;i++){if(predicate())return;await delay(5);}throw Error('native bootstrap fixture timed out');}
let bundle:Promise<string>|undefined;
function source(){return bundle||=build({entryPoints:['src/extension.ts'],bundle:true,platform:'node',format:'cjs',packages:'external',write:false,logLevel:'silent',plugins:[{name:'native-bootstrap-fixture',setup(builder){
  builder.onResolve({filter:/^vscode$|^\.\/(native-loader|bridge)\.ts$/},args=>({path:args.path,namespace:'bootstrap'}));
  builder.onLoad({filter:/.*/,namespace:'bootstrap'},args=>({contents:args.path==='vscode'?`const a=globalThis.__apeiriaBootstrap.api;export const window=a.window,workspace=a.workspace,commands=a.commands,Uri=a.Uri,ViewColumn=a.ViewColumn;`:args.path==='./bridge.ts'?`export async function createBridge(){const f=globalThis.__apeiriaBootstrap;f.bridgeCreated++;return {url:'http://127.0.0.1:9/private/v1',backendUrl:'http://127.0.0.1:9/blocked',token:'private-loopback-token',async close(){f.bridgeClosed++;}};}`:`export async function loadNativeHost(context,options){const f=globalThis.__apeiriaBootstrap;f.nativeOptions=options;return f.loadNative(context,options);}`,loader:'js'}));
}}]}).then(result=>result.outputFiles[0].text);}

async function fixture(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-bootstrap-')),extensionPath=path.join(directory,'extension'),storage=path.join(directory,'storage');
  fs.mkdirSync(path.join(extensionPath,'engine'),{recursive:true});
  const baselinePath=path.join(extensionPath,'engine','native-model-baseline.json');
  fs.writeFileSync(baselinePath,JSON.stringify({coreVersion:'0.164.0-alpha.11.1',baselineSlug:'gpt-6.1-sol',model:{slug:'gpt-6.1-sol',model_messages:{instructions_template:'Native fixture instruction. '.repeat(600)}}}));
  const commands=new Map<string,()=>Promise<unknown>>(),messages:Json[]=[],secrets=new Map<string,string>();
  const uri=(file:string)=>({fsPath:file,toString:()=>`file://${file}`});
  const context:any={extensionPath,globalStorageUri:uri(storage),subscriptions:[],secrets:{get:async(k:string)=>secrets.get(k),store:async(k:string,value:string)=>{secrets.set(k,value);},delete:async(k:string)=>{secrets.delete(k);}}};
  let receive:(message:Json)=>void=()=>{},panel:any;
  const data:any={bridgeCreated:0,bridgeClosed:0,nativeClosed:0,nativeRefreshed:0,registeredViews:[],configurationWrites:[],executed:[],
    loadNative:async()=>({async deactivate(){data.nativeClosed++;},async refreshModels(){data.nativeRefreshed++;}}),
    api:{Uri:{file:uri},ViewColumn:{Active:1},
      window:{createOutputChannel:()=>({appendLine(){},dispose(){}}),showErrorMessage:async()=>{},
        registerWebviewViewProvider:(id:string)=>{data.registeredViews.push(id);return {dispose(){}};},
        createWebviewPanel:()=>{let disposed=false;const callbacks:(()=>void)[]=[];const view={cspSource:'https://fixture.invalid',html:'',asWebviewUri:(value:any)=>value,postMessage:async(message:Json)=>{messages.push(structuredClone(message));},onDidReceiveMessage:(fn:(message:Json)=>void)=>{receive=fn;return {dispose(){}};}};panel={webview:view,reveal(){},onDidDispose(fn:()=>void){callbacks.push(fn);return {dispose(){}};},dispose(){if(disposed)return;disposed=true;for(const callback of callbacks)callback();}};return panel;}},
      workspace:{workspaceFolders:[{uri:uri(path.join(directory,'workspace'))}],getConfiguration:()=>({update:async(...args:any[])=>{data.configurationWrites.push(args);}})},
      commands:{registerCommand:(id:string,fn:()=>Promise<unknown>)=>{commands.set(id,fn);return {dispose(){}};},executeCommand:async(id:string)=>{data.executed.push(id);}}},
  };
  (globalThis as any).__apeiriaBootstrap=data;
  const module={exports:{} as any};new Function('require','module','exports',await source())(require,module,module.exports);
  let sequence=0;
  const send=async(action:string,payload:Json={})=>{const requestId=`bootstrap-${++sequence}`;receive({action,requestId,...payload});await until(()=>messages.some(message=>message.type==='result'&&message.requestId===requestId));return messages.find(message=>message.type==='result'&&message.requestId===requestId)!;};
  return {directory,extensionPath,storage,baselinePath,context,module,data,commands,messages,send,get panel(){return panel;},async close(){await module.exports.deactivate();for(const subscription of context.subscriptions)await subscription.dispose?.();delete (globalThis as any).__apeiriaBootstrap;}};
}

test('native bootstrap keeps chat in the retained client and provider UI contains no saved secrets',async()=>{
  const f=await fixture();try{
    await f.module.exports.activate(f.context);
    assert.deepEqual(f.data.registeredViews,[],'bootstrap must not register the old custom chat view');
    assert.equal(f.data.nativeOptions.nativeRoot,path.join(f.extensionPath,'native'));
    await f.commands.get('apeiriaCode.settings')!();
    assert.match(f.panel.webview.html,/data-apeiria-mode="providers"/);
    assert.equal((await f.send('ready')).ok,true);
    assert.equal((await f.send('saveProvider',{draft:{id:'native-fixture',label:'Fixture',type:'responses',models:['native-model'],baseUrl:'https://fixture.invalid/v1',apiKey:'saved-secret-sentinel'}})).ok,true);
    const states=f.messages.filter(message=>message.type==='state').map(message=>message.state);
    assert.ok(states.at(-1).providers[0].hasKey);
    assert.ok(!JSON.stringify(states).includes('saved-secret-sentinel'));
    assert.ok(!JSON.stringify(states).includes('private-loopback-token'));
    assert.deepEqual(f.data.configurationWrites,[],'provider management must not rewrite official settings');
    assert.equal((await f.send('send',{text:'must not be handled here'})).ok,false);
    const descriptor=JSON.parse(fs.readFileSync(f.data.nativeOptions.descriptorPath,'utf8'));
    assert.equal(descriptor.root,f.storage);assert.equal(descriptor.home,path.join(f.storage,'engine-home'));
    assert.equal(descriptor.catalogPath,path.join(f.storage,'engine-home','models.json'));
    assert.equal(descriptor.defaultModel,'thirdparty/native-fixture/native-model');
    assert.equal(descriptor.token,'private-loopback-token');
    assert.equal(f.data.nativeRefreshed,1,'saving a provider must invalidate the original model menu');
    assert.equal((await f.send('toggleProvider',{id:'native-fixture'})).ok,true);
    assert.equal((await f.send('removeProvider',{id:'native-fixture'})).ok,true);
    assert.equal(f.data.nativeRefreshed,3,'toggle and remove must also invalidate the original model menu');
    await f.commands.get('apeiriaCode.open')!();assert.deepEqual(f.data.executed,['apeiriaCode.native.openSidebar']);
  }finally{await f.close();}
});

test('failed native host activation closes its bridge and removes the transient descriptor',async()=>{
  const f=await fixture();try{
    f.data.loadNative=async()=>{throw Error('native activation fixture failed');};
    await assert.rejects(f.module.exports.activate(f.context),/native activation fixture failed/);
    assert.equal(f.data.bridgeCreated,1);assert.equal(f.data.bridgeClosed,1);
    assert.ok(!fs.existsSync(f.data.nativeOptions.descriptorPath));
  }finally{await f.close();}
});

test('provider save returns immediately while an active turn delays native model refresh',async()=>{
  const f=await fixture();let release:()=>void=()=>{};
  const waiting=new Promise<void>(resolve=>{release=resolve;});
  try{
    f.data.loadNative=async()=>({async deactivate(){f.data.nativeClosed++;},async refreshModels(){f.data.nativeRefreshed++;await waiting;}});
    await f.module.exports.activate(f.context);await f.commands.get('apeiriaCode.settings')!();
    const saved=await f.send('saveProvider',{draft:{id:'during-turn',label:'During turn',type:'responses',models:['one'],baseUrl:'https://fixture.invalid/v1'}});
    assert.equal(saved.ok,true);assert.equal(f.data.nativeRefreshed,1);
    assert(f.messages.some(message=>message.type==='notice'&&message.message.includes('当前任务完成后')));
    const removed=await f.send('removeProvider',{id:'during-turn'});assert.equal(removed.ok,true,'a pending reconnect must not block further provider changes');
  }finally{release();await f.close();}
});

test('missing model baseline cannot leak a bridge during early activation failure',async()=>{
  const f=await fixture();try{
    fs.unlinkSync(f.baselinePath);
    await assert.rejects(f.module.exports.activate(f.context));
    assert.equal(f.data.bridgeClosed,f.data.bridgeCreated);
  }finally{await f.close();}
});

test('deactivation during native activation cleans the eventual native host exactly once',async()=>{
  const f=await fixture();try{
    let release:(value:any)=>void=()=>{};
    f.data.loadNative=()=>new Promise(resolve=>{release=resolve;});
    const activation=f.module.exports.activate(f.context);await until(()=>!!f.data.nativeOptions);
    const stopping=f.module.exports.deactivate();release({async deactivate(){f.data.nativeClosed++;}});
    await Promise.allSettled([activation,stopping]);
    assert.equal(f.data.nativeClosed,1);assert.equal(f.data.bridgeClosed,1);
    assert.ok(!fs.existsSync(f.data.nativeOptions.descriptorPath));
  }finally{await f.close();}
});
