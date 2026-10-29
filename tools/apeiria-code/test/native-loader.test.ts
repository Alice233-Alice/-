import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createNativeFacade,nativeIdentifier,nativeProcess,nativeChildProcess,loadNativeBundle} from '../src/native-loader.ts';

class Uri {
  constructor(readonly scheme:string,readonly authority:string,readonly path:string){}
  get fsPath(){return this.path;}
  static file(value:string){return new Uri('file','',value);}
  with(value:{scheme?:string;authority?:string;path?:string}){return new Uri(value.scheme??this.scheme,value.authority??this.authority,value.path??this.path);}
}
const dispose=()=>({dispose(){}});
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-loader-'));fs.mkdirSync(path.join(root,'out'));
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'chatgpt',publisher:'openai',version:'26.1021.22027'}));
  const calls:any[]=[],handlers=new Map<string,Function>();let onConfiguration:Function=()=>{};
  const config={get:(name:string,fallback:any)=>name==='localeOverride'?'zh-CN':fallback,has:()=>false,inspect:(name:string)=>({key:'apeiriaCode.native.'+name}),update:async(...args:any[])=>{calls.push(['configuration.update',...args]);}};
  const api:any=Object.freeze({Uri,workspace:Object.freeze({getConfiguration:(...args:any[])=>{calls.push(['getConfiguration',...args]);return Object.freeze(config);},onDidChangeConfiguration:(listener:Function)=>{onConfiguration=listener;return dispose();}}),
    commands:Object.freeze({registerCommand:(id:string,fn:Function)=>{calls.push(['registerCommand',id]);handlers.set(id,fn);return dispose();},executeCommand:async(...args:any[])=>{calls.push(['executeCommand',...args]);}}),
    window:Object.freeze({registerWebviewViewProvider:(id:string,p:any)=>{calls.push(['registerView',id,p]);return dispose();},registerCustomEditorProvider:(...args:any[])=>{calls.push(['registerEditor',...args]);return dispose();},createWebviewPanel:(...args:any[])=>{calls.push(['createPanel',...args]);return {viewType:args[0]};},registerUriHandler:(h:any)=>{calls.push(['uriHandler',h]);return dispose();}}),
    env:Object.freeze({openExternal:async(uri:Uri)=>{calls.push(['openExternal',uri]);},asExternalUri:async(uri:Uri)=>uri}),extensions:{getExtension:(id:string)=>{calls.push(['getExtension',id]);}},
  });
  const storage=Uri.file(path.join(root,'private'));
  const context:any={globalStorageUri:storage,storageUri:Uri.file(path.join(root,'workspace')),globalState:{owner:'new'},workspaceState:{owner:'new'},secrets:{owner:'new'},subscriptions:[],extension:{id:'ayanami-local.apeiria-code'}};
  const options={nativeRoot:root,launcherPath:path.join(root,'launcher.exe'),descriptorPath:path.join(root,'descriptor.json')};
  return {root,api,context,options,calls,handlers,configuration:(event:any)=>onConfiguration(event),scoped:createNativeFacade(api,context,options)};
}

test('native namespace preserves auth enums and isolates command, container, session and rule identifiers',()=>{
  assert.equal(nativeIdentifier('chatgpt'),'chatgpt');
  assert.equal(nativeIdentifier('chatgpt.openSidebar'),'apeiriaCode.native.openSidebar');
  assert.equal(nativeIdentifier('codexSecondaryViewContainer'),'apeiriaCode');
  assert.equal(nativeIdentifier('vscode://openai.chatgpt/x'),'vscode://ayanami-local.apeiria-code/x');
  assert.equal(nativeIdentifier('openai-codex'),'apeiria-code-native');
  assert.equal(nativeIdentifier('codex-rules'),'apeiria-code-rules');
});

test('frozen VS Code configuration is independently mapped and executable override never writes real settings',async()=>{
  const f=fixture(),api=f.scoped.api;const config=api.workspace.getConfiguration('chatgpt');
  assert.equal(config.get('cliExecutable'),f.options.launcherPath);
  assert.equal(config.get('localeOverride'),'zh-CN');assert.equal(config.inspect('cliExecutable').globalValue,f.options.launcherPath);
  await config.update('cliExecutable','do-not-write');assert(!f.calls.some(c=>c[0]==='configuration.update'));
  await config.update('localeOverride','en-US');assert.deepEqual(f.calls.at(-1),['configuration.update','localeOverride','en-US',undefined,undefined]);
  assert.equal(api.workspace.getConfiguration().get('chatgpt.cliExecutable'),f.options.launcherPath);
  let checked='';api.workspace.onDidChangeConfiguration((event:any)=>assert.equal(event.affectsConfiguration('chatgpt'),true));f.configuration({affectsConfiguration:(section:string)=>{checked=section;return true;}});assert.equal(checked,'apeiriaCode.native');
  assert.equal(f.scoped.context.secrets,f.context.secrets);assert.equal(f.scoped.context.globalState,f.context.globalState);assert.equal(f.scoped.context.extensionPath,f.root);
  assert.equal(f.scoped.context.extension.packageJSON.version,'26.1021.22027');
});

test('commands and views register under separate identities and URI boundaries round trip',async()=>{
  const f=fixture(),api=f.scoped.api;api.commands.registerCommand('chatgpt.openSidebar',()=>{});
  assert(f.handlers.has('apeiriaCode.native.openSidebar'));
  await api.commands.executeCommand('setContext','chatgpt.sidebarView.visible',true);
  assert.deepEqual(f.calls.at(-1),['executeCommand','setContext','apeiriaCode.native.sidebarView.visible',true]);
  api.window.registerWebviewViewProvider('chatgpt.sidebarView',{resolveWebviewView:(view:any)=>assert.equal(view.viewType,'chatgpt.sidebarView')},{});
  const entry=f.calls.find(c=>c[0]==='registerView');assert.equal(entry[1],'apeiriaCode.native.sidebarView');entry[2].resolveWebviewView({viewType:'apeiriaCode.native.sidebarView'});
  await api.commands.executeCommand('vscode.openWith',new Uri('openai-codex','route','/local/thread'),'chatgpt.conversationEditor');
  assert.equal(f.calls.at(-1)[2].scheme,'apeiria-code-native');assert.equal(f.calls.at(-1)[3],'apeiriaCode.native.conversationEditor');
  await api.commands.executeCommand('workbench.action.terminal.sendSequence',{text:'chatgpt.user_content openai-codex'});
  assert.deepEqual(f.calls.at(-1),['executeCommand','workbench.action.terminal.sendSequence',{text:'chatgpt.user_content openai-codex'}]);
  let authority='';api.window.registerUriHandler({handleUri:(uri:Uri)=>{authority=uri.authority;}});f.calls.find(c=>c[0]==='uriHandler')[1].handleUri(new Uri('vscode','ayanami-local.apeiria-code','/x'));assert.equal(authority,'openai.chatgpt');
});

test('direct native process env changes stay private and inherited official credentials are removed',()=>{
  const f=fixture(),before=process.env.CODEX_HOME,privateProcess=nativeProcess(f.context);
  assert.equal(privateProcess.env.CODEX_HOME,path.join(f.context.globalStorageUri.fsPath,'engine-home'));
  privateProcess.env.APEIRIA_NATIVE_PRIVATE_TEST='native-only';assert.equal(process.env.APEIRIA_NATIVE_PRIVATE_TEST,undefined);
  privateProcess.env.CODEX_HOME='changed-only-in-realm';assert.equal(process.env.CODEX_HOME,before);
  assert.throws(()=>privateProcess.exit(1),/cannot change or terminate/);
});

test('only the native launcher receives its descriptor while child storage stays pinned',()=>{
  const f=fixture(),environment=nativeProcess(f.context).env;
  const child=nativeChildProcess({...f.options,launcherPath:process.execPath},environment);
  const result=child.spawnSync(process.execPath,['-e','console.log(JSON.stringify({home:process.env.CODEX_HOME,descriptor:process.env.APEIRIA_NATIVE_DESCRIPTOR}))'],{encoding:'utf8',env:{CODEX_HOME:'wrong-home'}});
  assert.equal(result.status,0,result.stderr);const value=JSON.parse(result.stdout);assert.equal(value.home,environment.CODEX_HOME);assert.equal(value.descriptor,f.options.descriptorPath);
  const other=nativeChildProcess(f.options,environment).spawnSync(process.execPath,['-e','console.log(process.env.APEIRIA_NATIVE_DESCRIPTOR||"absent")'],{encoding:'utf8'});assert.equal(other.stdout.trim(),'absent');
});

test('a native CommonJS bundle gets an isolated global, process, require cache and API',async()=>{
  const f=fixture();fs.writeFileSync(path.join(f.root,'out','extension.js'),`globalThis.nativePrivate=true;process.env.APEIRIA_NATIVE_PRIVATE_TEST='realm-only';const api=require('vscode');const p=require('node:process');module.exports={activate(context){api.commands.registerCommand('chatgpt.vmTest',()=>context.secrets.owner);return {sameProcess:p===process,home:process.env.CODEX_HOME,globalValue:globalThis.nativePrivate};}};`);
  const loaded=loadNativeBundle(f.options,f.scoped),result=await loaded.exports.activate(f.scoped.context);
  assert.equal(result.sameProcess,true);assert.equal(result.globalValue,true);assert.equal((globalThis as any).nativePrivate,undefined);assert.equal(process.env.APEIRIA_NATIVE_PRIVATE_TEST,undefined);
  assert.equal(f.handlers.get('apeiriaCode.native.vmTest')!(),'new');loaded.clear();
});

test('restored native tabs map back internally while the official client tabs stay separate',()=>{
  const f=fixture();class TabInput{constructor(readonly uri:Uri){}}
  const official={input:new TabInput(new Uri('openai-codex','route','/local/official-thread'))};
  const own={input:new TabInput(new Uri('apeiria-code-native','route','/local/private-thread'))};
  const group={tabs:[official,own],activeTab:own};
  const api={...f.api,window:{...f.api.window,tabGroups:{all:[group],activeTabGroup:group}}};
  const scoped=createNativeFacade(api,f.context,f.options),tabs=scoped.api.window.tabGroups.all[0].tabs;
  assert.equal(tabs.length,1);assert(tabs[0].input instanceof TabInput);assert.equal(tabs[0].input.uri.scheme,'openai-codex');assert.equal(tabs[0].input.uri.path,'/local/private-thread');
});

test('native telemetry is disabled locally and native disposables never enter the provider manager scope',()=>{
  const f=fixture();let sent=0,disposed=0;
  const real={...f.api,env:{...f.api.env,isTelemetryEnabled:true,createTelemetryLogger:()=>{sent++;return {};}}};
  const scoped=createNativeFacade(real,f.context,f.options);
  assert.equal(scoped.api.env.isTelemetryEnabled,false);assert.equal(real.env.isTelemetryEnabled,true);
  const logger=scoped.api.env.createTelemetryLogger({sendEventData(){sent++;}});logger.logUsage('test');logger.logError('error');logger.dispose();assert.equal(sent,0);
  scoped.context.subscriptions.push({dispose(){disposed++;}});assert.equal(f.context.subscriptions.length,0);assert.equal(scoped.subscriptions.length,1);scoped.subscriptions[0].dispose();assert.equal(disposed,1);
});
