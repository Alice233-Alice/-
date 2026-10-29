import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {transformSync} from 'esbuild';
import {isolateNativeName,restoreNativeName} from '../src/native-names.ts';

const utility='../scripts/prepare-native.mjs';
const {nativeContributions,patchNativeHost,patchNativeProfileMenu,patchNativeModelQueries,patchNativeOfflineEvaluations,prepareNative,supportedNativeVersion,nativeProfileMenu,nativeModelsQuery,nativeMessageBus,nativeHostServices}=await import(utility);
const originalStatsigOptions='function jT(e){let t={...GT,enableLiveValuesAutoRefresh:!0,...e===!0&&!Pr()?{}:{disableStorage:!0,loggingEnabled:`disabled`}};return t.networkConfig={...GT.networkConfig,preventAllNetworkTraffic:!1,networkOverrideFunc:(e,n)=>cT(e,n,t.loggingEnabled!==`disabled`)},t}';
const hash=(bytes:string|Buffer)=>crypto.createHash('sha256').update(bytes).digest('hex');
function write(root:string,relative:string,text:string){const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}

test('native contribution names are distinct while auth enum values stay intact',()=>{
  assert.equal(isolateNativeName('chatgpt'),'chatgpt');
  assert.equal(isolateNativeName('openai.chatgpt'),'ayanami-local.apeiria-code');
  assert.equal(isolateNativeName('chatgpt.sidebarView'),'apeiriaCode.native.sidebarView');
  assert.equal(restoreNativeName('apeiriaCode.native.newChat'),'chatgpt.newChat');
  assert.equal(isolateNativeName('codexSecondaryViewContainer'),'apeiriaCode');
  assert.equal(isolateNativeName('openai-codex://route/thread/one'),'apeiria-code-native://route/thread/one');
  const source={contributes:{
    commands:[{command:'chatgpt.openSidebar',category:'Codex',icon:{dark:'resources/blossom-white.svg'}}],
    keybindings:[{command:'chatgpt.newChat',when:'chatgpt.supportsNewChatKeyShortcut'}],
    configuration:{title:'Codex Settings',properties:{'chatgpt.cliExecutable':{type:['string','null']},'chatgpt.followUpQueueMode':{enum:['queue','steer','interrupt']}}},
    viewsContainers:{activitybar:[{id:'codexViewContainer'}],secondarySidebar:[{id:'codexSecondaryViewContainer'}]},
    views:{codexViewContainer:[{id:'chatgpt.sidebarView',when:'chatgpt.doesNotSupportSecondarySidebar'}],codexSecondaryViewContainer:[{id:'chatgpt.sidebarSecondaryView',when:'!chatgpt.doesNotSupportSecondarySidebar'}]},
    customEditors:[{viewType:'chatgpt.conversationEditor',selector:[{filenamePattern:'openai-codex:/**/*'}]}],
    chatSessions:[{type:'openai-codex',displayName:'OpenAI Codex'}],
    grammars:[{language:'codex-rules',scopeName:'source.codex-rules',path:'./syntaxes/starlark.tmLanguage.json'}],
    languages:[{id:'codex-rules',configuration:'./syntaxes/starlark.configuration.json'}],
  }};
  const before=JSON.stringify(source),result=nativeContributions(source);
  assert.equal(JSON.stringify(source),before,'Contribution generation never mutates source metadata');
  assert.equal(result.commands[0].command,'apeiriaCode.native.openSidebar');
  assert.equal(result.commands[0].icon.dark,'native/resources/blossom-white.svg');
  assert.equal(result.views.apeiriaCode.length,2);assert(!result.viewsContainers.secondarySidebar);
  assert.equal(result.views.apeiriaCode[1].when,'!apeiriaCode.native.doesNotSupportSecondarySidebar');
  assert.deepEqual(result.configuration.properties['apeiriaCode.native.followUpQueueMode'].enum,['queue','steer','interrupt']);
  assert.equal(result.customEditors[0].selector[0].filenamePattern,'apeiria-code-native:/**/*');
  assert.equal(result.grammars[0].path,'native/syntaxes/starlark.tmLanguage.json');
  assert.equal(result.grammars[0].scopeName,'source.apeiria-code-rules');
});

test('native preparation retains runtime and licensing, namespaces IPC and adds only one provider menu row',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-assets-')),source=path.join(directory,'original'),target=path.join(directory,'copy');
  const manifest={name:'chatgpt',publisher:'openai',version:supportedNativeVersion,enabledApiProposals:['chatSessionsProvider','languageModelProxy'],contributes:{views:{codexViewContainer:[{id:'chatgpt.sidebarView'}]}}};
  write(source,'package.json',JSON.stringify(manifest));write(source,'LICENSE.md','Original client license notice');
  write(source,'out/extension.js',String.raw`const pipe=Qm.join("\\\\.\\pipe","codex-ipc");const socket=Qm.join(Zqe.tmpdir(),"codex-ipc",t?"ipc":"ipc");const auth="chatgpt";let v=new H1(t.extensionUri,u);e.push(v);module.exports={};`);
  write(source,nativeProfileMenu,'const menu={children:[q,Zn,null,tr,Xn,rr,Y,X,null,null,null,sr,cr]};const compact={children:[qn,K,null,te,null]};');
  write(source,nativeModelsQuery,'const query=()=>{let g=u!=null,y=v?.daybreakPreferences;return p;};');write(source,nativeMessageBus,'export const originalBus=true;');
  write(source,nativeHostServices,originalStatsigOptions);
  write(source,'webview/assets/unchanged-page.js','export const originalFeature=true;');
  write(source,'webview/assets/debug.js.map','debugging text');write(source,'resources/icon.svg','<svg/>');
  write(source,'syntaxes/starlark.tmLanguage.json',JSON.stringify({scopeName:'source.codex-rules',patterns:[]}));
  const beforeHost=fs.readFileSync(path.join(source,'out/extension.js')),beforeMenu=fs.readFileSync(path.join(source,nativeProfileMenu));
  const result=prepareNative(source,target);
  assert.equal(hash(fs.readFileSync(path.join(source,'out/extension.js'))),hash(beforeHost));
  assert.equal(hash(fs.readFileSync(path.join(source,nativeProfileMenu))),hash(beforeMenu));
  assert.equal(fs.readFileSync(path.join(target,'webview/assets/unchanged-page.js'),'utf8'),'export const originalFeature=true;');
  assert(!fs.existsSync(path.join(target,'webview/assets/debug.js.map')));
  assert.equal(fs.readFileSync(path.join(target,'LICENSE.md'),'utf8'),'Original client license notice');
  assert.match(fs.readFileSync(path.join(target,'out/extension.js'),'utf8'),/apeiria-code-ipc/);
  assert.match(fs.readFileSync(path.join(target,'out/extension.js'),'utf8'),/auth="chatgpt"/);
  const menu=fs.readFileSync(path.join(target,nativeProfileMenu),'utf8');
  assert.equal(menu.split('apeiriaCode.settings').length-1,2);assert.match(menu,/q,Zn,null,tr,/);
  const provenance=JSON.parse(fs.readFileSync(path.join(target,'provenance.json'),'utf8'));
  assert.deepEqual(provenance.enabledApiProposals,['chatSessionsProvider','languageModelProxy']);
  assert.match(provenance.license,/not covered/);
  for(const entry of result.files)assert.equal(hash(fs.readFileSync(path.join(target,entry.path))),entry.sha256);
  assert.equal(result.files.filter((f:any)=>f.modified).length,5);
});

test('native experiment SDK explicitly uses offline defaults with no initialization, refresh, log or exception traffic',()=>{
  const realm=vm.createContext({GT:{retainedOption:7,networkConfig:{api:'https://ab.chatgpt.com/v1',sdkExceptionUrl:'https://ab.chatgpt.com/v1/sdk_exception'}},Pr(){throw Error('must not inspect official telemetry preference');},cT(){throw Error('must not dispatch official SDK requests');}});
  vm.runInContext(patchNativeOfflineEvaluations(originalStatsigOptions),realm);
  for(const telemetryEnabled of [true,false]){
    const options=realm.jT(telemetryEnabled);
    assert.equal(options.retainedOption,7);assert.equal(options.enableLiveValuesAutoRefresh,false);assert.equal(options.disableStorage,true);assert.equal(options.loggingEnabled,'disabled');assert.equal(options.networkConfig.preventAllNetworkTraffic,true);assert.equal(options.networkConfig.networkOverrideFunc,undefined);
  }
  assert.throws(()=>patchNativeOfflineEvaluations('unrecognized SDK options'),/no longer matches/);
});

test('provider changes invalidate active native model queries once per client through the existing message bus',async()=>{
  const listeners=new Map<string,Function[]>(),invalidations:unknown[]=[],client={invalidateQueries:async(value:unknown)=>{invalidations.push(value);}};
  let initialized=0;
  const original='globalThis.query=(p)=>{let g=u!=null,y=v?.daybreakPreferences;return p;};';
  const patched=patchNativeModelQueries(original).replace(/^import\{[^;]+;/,'');
  const realm=vm.createContext({apeiriaInitMessageBus:()=>{initialized++;},apeiriaMessageBus:{subscribe:(type:string,listener:Function)=>{listeners.set(type,[...(listeners.get(type)||[]),listener]);}},u:null,v:null});
  vm.runInContext(patched,realm);realm.query(client);realm.query(client);
  assert.equal(initialized,1);assert.equal(listeners.get('apeiria-models-changed')?.length,1);
  for(const listener of listeners.get('apeiria-models-changed')||[])await listener({type:'apeiria-models-changed'});
  assert.equal(JSON.stringify(invalidations),JSON.stringify([{queryKey:['models']}]));
  assert.throws(()=>patchNativeModelQueries('unrecognized model query'),/no longer matches/);
});

test('private native restart waits for all turns and requests and retains original providers and notification hooks',async()=>{
  const retained=()=>{},initializations:unknown[]=[];
  class Connection {
    initialized=true;fatalError=null;internalNotificationHandlers=new Set<Function>([retained]);providers=new Map<string,any>();pendingRequests=new Map<string,unknown>();starts=0;
    registerInternalNotificationHandler(handler:Function){this.internalNotificationHandlers.add(handler);return {dispose:()=>this.internalNotificationHandlers.delete(handler)};}
    registerProvider(id:string,provider:any){assert(!this.providers.has(id));this.providers.set(id,provider);if(this.initialized)provider.onInitialized?.();return {dispose:()=>this.providers.delete(id)};}
    startCodexProcess(){this.starts++;this.initialized=false;this.internalNotificationHandlers.clear();setTimeout(()=>{this.initialized=true;for(const provider of this.providers.values())provider.onInitialized?.();initializations.push(this.starts);},5);return {success:true};}
    dispose(){}
  }
  const original=String.raw`const pipe=Qm.join("\\\\.\\pipe","codex-ipc");const socket=Qm.join(Zqe.tmpdir(),"codex-ipc",t?"ipc":"ipc");let v=new H1(t.extensionUri,u);e.push(v);`;
  const realm=vm.createContext({Qm:{join:()=>''},Zqe:{tmpdir:()=>''},t:{extensionUri:{}},u:{},e:[],H1:Connection,setTimeout,clearTimeout});
  vm.runInContext(patchNativeHost(original),realm);
  const connection=realm.__apeiriaNativeConnection as Connection&{apeiriaRefreshModels():Promise<void>;apeiriaActiveTurns:Set<string>};
  connection.registerProvider('original-provider',{onInitialized(){}});
  for(const handler of connection.internalNotificationHandlers)handler({method:'turn/started',params:{threadId:'parent'}});
  for(const handler of connection.internalNotificationHandlers)handler({method:'turn/started',params:{threadId:'child'}});
  connection.pendingRequests.set('request',{});
  const refreshing=connection.apeiriaRefreshModels();assert.equal(connection.apeiriaRefreshModels(),refreshing);assert.equal(connection.starts,0);
  for(const handler of connection.internalNotificationHandlers)handler({method:'turn/completed',params:{threadId:'parent'}});
  assert.equal(connection.starts,0);
  for(const handler of connection.internalNotificationHandlers)handler({method:'turn/completed',params:{threadId:'child'}});
  connection.pendingRequests.clear();await refreshing;
  assert.equal(connection.starts,1);assert.equal(connection.apeiriaActiveTurns.size,0);assert(connection.internalNotificationHandlers.has(retained));assert(connection.providers.has('original-provider'));assert(!connection.providers.has('apeiria-model-refresh'));assert.equal(initializations.length,1);
  for(const handler of connection.internalNotificationHandlers)handler({method:'turn/started',params:{threadId:'unfinished'}});
  const pending=connection.apeiriaRefreshModels();connection.dispose();await assert.rejects(pending,/closed/);
});

test('unknown version and ambiguous native anchors fail before destination writes',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-unknown-')),source=path.join(directory,'original'),target=path.join(directory,'copy');
  write(source,'package.json',JSON.stringify({name:'chatgpt',publisher:'openai',version:'unknown'}));
  assert.throws(()=>prepareNative(source,target),/Unsupported native client/);assert(!fs.existsSync(target));
  assert.throws(()=>patchNativeHost('const x="codex-ipc";const y="codex-ipc";'),/no longer matches/);
  assert.throws(()=>patchNativeProfileMenu('different module'),/no longer matches/);
  assert.throws(()=>prepareNative(source,source),/separate/);
});

const original=process.env.APEIRIA_NATIVE_SOURCE||'C:/Users/ayanami/.vscode/extensions/openai.chatgpt-26.1021.22027-win32-x64';
test('validated installed native profile and host still parse after the scoped patches',{skip:!fs.existsSync(original)},()=>{
  const host=patchNativeHost(fs.readFileSync(path.join(original,'out/extension.js'),'utf8'));
  const profile=patchNativeProfileMenu(fs.readFileSync(path.join(original,nativeProfileMenu),'utf8'));
  const models=patchNativeModelQueries(fs.readFileSync(path.join(original,nativeModelsQuery),'utf8'));
  const services=patchNativeOfflineEvaluations(fs.readFileSync(path.join(original,nativeHostServices),'utf8'));
  assert.doesNotThrow(()=>transformSync(host,{loader:'js',format:'cjs',logLevel:'silent'}));
  assert.doesNotThrow(()=>transformSync(profile,{loader:'js',format:'esm',logLevel:'silent'}));
  assert.doesNotThrow(()=>transformSync(models,{loader:'js',format:'esm',logLevel:'silent'}));
  assert.doesNotThrow(()=>transformSync(services,{loader:'js',format:'esm',logLevel:'silent'}));
  assert.equal(host.split('apeiria-code-ipc').length-1,2);
});
