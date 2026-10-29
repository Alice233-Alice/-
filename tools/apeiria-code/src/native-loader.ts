import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire,isBuiltin} from 'node:module';
import * as childProcess from 'node:child_process';
import {EventEmitter} from 'node:events';
import type * as VSCode from 'vscode';
import {isolateNativeName,restoreNativeName} from './native-names.ts';

export interface NativeHostOptions {nativeRoot:string;launcherPath:string;descriptorPath:string;}
type Any=Record<string,any>;
interface NativeScope {api:any;context:any;process:NodeJS.Process;subscriptions:VSCode.Disposable[];setMessageDecoder(decode:(value:any)=>any):void;refreshModels():Promise<void>;}
const OLD='chatgpt',PREFIX='apeiriaCode.native',ID='ayanami-local.apeiria-code';
const SCHEME='apeiria-code-native';

/** Identifiers are translated only at this client's VS Code boundary. */
export function nativeIdentifier(value:string):string {
  return isolateNativeName(value);
}
function originalIdentifier(value:string):string {
  return restoreNativeName(value);
}
function isUri(value:any):boolean{return !!value&&typeof value==='object'&&typeof value.scheme==='string'&&typeof value.with==='function';}
function mapValue(value:any,outbound:boolean,seen=new WeakMap<object,any>()):any {
  if(isUri(value))return value.with({scheme:value.scheme==='openai-codex'&&outbound?SCHEME:value.scheme===SCHEME&&!outbound?'openai-codex':value.scheme,authority:value.scheme==='vscode'?(outbound&&value.authority==='openai.chatgpt'?ID:!outbound&&value.authority===ID?'openai.chatgpt':value.authority):value.authority});
  if(!value||typeof value!=='object')return value;
  if(seen.has(value))return seen.get(value);
  if(Array.isArray(value)){const result:any[]=[];seen.set(value,result);for(const item of value)result.push(mapValue(item,outbound,seen));return result;}
  const prototype=Object.getPrototypeOf(value);if(prototype&&prototype.constructor?.name!=='Object')return value;
  const result:Any={};seen.set(value,result);for(const [key,item] of Object.entries(value))result[key]=mapValue(item,outbound,seen);return result;
}
function overlay<T extends object>(target:T,overrides:Any):T {
  // A fresh proxy target also works with VS Code's frozen API namespaces.
  return new Proxy(Object.create(Object.getPrototypeOf(target)),{
    get(_unused,key){if(typeof key==='string'&&key in overrides)return overrides[key];const value=Reflect.get(target,key,target);return typeof value==='function'&&!value.prototype?value.bind(target):value;},
    set(_unused,key,value){return Reflect.set(target,key,value,target);},
    has(_unused,key){return typeof key==='string'&&key in overrides||key in target;},
    ownKeys(){return [...new Set([...Reflect.ownKeys(target),...Reflect.ownKeys(overrides)])];},
    getOwnPropertyDescriptor(_unused,key){const descriptor=Reflect.getOwnPropertyDescriptor(target,key);if(typeof key==='string'&&key in overrides)return {value:overrides[key],enumerable:descriptor?.enumerable??true,writable:true,configurable:true};return descriptor?{...descriptor,configurable:true}:undefined;},
  });
}
function ownEnvironment(context:Any):NodeJS.ProcessEnv {
  const env={...process.env};
  for(const key of Object.keys(env))if(/^(CODEX|OPENAI|CHATGPT|APEIRIA)_/i.test(key)||/^(ACCESS_TOKEN|ID_TOKEN|REFRESH_TOKEN|GOOGLE_APPLICATION_CREDENTIALS|GEMINI_API_KEY|VERTEX_API_KEY|NODE_OPTIONS|NODE_PATH)$/i.test(key))delete env[key];
  const home=path.join(context.globalStorageUri.fsPath,'engine-home');
  return {...env,CODEX_HOME:home,CODEX_SQLITE_HOME:path.join(home,'sqlite'),CODEX_LOG_DIR:path.join(home,'logs')};
}

/** The original bundle gets a private process object; even its direct env writes stay private. */
export function nativeProcess(context:Any):NodeJS.Process {
  const env=ownEnvironment(context);
  const shadow=new Map<PropertyKey,unknown>(),events=new EventEmitter(),eventMethods=new Map<PropertyKey,Function>();
  const eventNames=new Set(['on','once','addListener','prependListener','prependOnceListener','removeListener','off','removeAllListeners','listeners','rawListeners','listenerCount','eventNames','setMaxListeners','getMaxListeners','emit']);
  let scoped:NodeJS.Process;
  scoped=new Proxy(process,{get(target,key){
    if(key==='env')return env;
    if(shadow.has(key))return shadow.get(key);
    if(key==='exit'||key==='reallyExit'||key==='abort'||key==='chdir')return ()=>{throw Error('Native client cannot change or terminate the shared extension host.');};
    if(typeof key==='string'&&eventNames.has(key)){
      if(!eventMethods.has(key))eventMethods.set(key,(...args:any[])=>{const result=(events as any)[key](...args);return result===events?scoped:result;});
      return eventMethods.get(key);
    }
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  },set(_target,key,value){
    if(key==='env'){for(const name of Object.keys(env))delete env[name];Object.assign(env,value);return true;}
    shadow.set(key,value);return true;
  }});
  return scoped;
}

export function createNativeFacade(api:typeof VSCode|Any,context:VSCode.ExtensionContext|Any,options:NativeHostOptions):NativeScope {
  const real=api as Any,owner=context as Any;
  const webviews=new Set<any>(),subscriptions:VSCode.Disposable[]=[];
  let decodeMessage=(value:any)=>value;
  const configuration=(section?:string,scope?:any)=>{
    const mappedSection=section===OLD?PREFIX:section?nativeIdentifier(section):undefined;
    const actual=real.workspace.getConfiguration(mappedSection,scope);
    const key=(value:string)=>section===OLD||mappedSection===PREFIX?value:nativeIdentifier(value);
    const cli=(value:string)=>((mappedSection===PREFIX&&value==='cliExecutable')||(!mappedSection&&value===`${OLD}.cliExecutable`)||(!mappedSection&&value===`${PREFIX}.cliExecutable`));
    return overlay(actual,{
      get(name:string,fallback?:unknown){return cli(name)?options.launcherPath:actual.get(key(name),fallback);},
      has(name:string){return cli(name)||actual.has(key(name));},
      inspect(name:string){if(cli(name))return {key:section===OLD?'chatgpt.cliExecutable':name,defaultValue:null,globalValue:options.launcherPath};const result=actual.inspect(key(name));return result?{...result,key:originalIdentifier(result.key)}:result;},
      update(name:string,value:any,target?:any,override?:any){if(cli(name))return Promise.resolve();return actual.update(key(name),value,target,override);},
    });
  };
  const wrapDocument=(document:any)=>document&&isUri(document.uri)?overlay(document,{uri:mapValue(document.uri,false)}):document;
  const wrapWebview=(webview:any)=>overlay(webview,{
    onDidReceiveMessage(listener:Function,thisArg?:any,disposables?:any[]){return webview.onDidReceiveMessage((message:any)=>listener.call(thisArg,decodeMessage(message)),undefined,disposables);},
    postMessage(message:any){return webview.postMessage(mapValue(message,true));},
  });
  const wrapView=(view:any)=>{
    if(!view||typeof view!=='object')return view;
    if(view.webview&&!webviews.has(view.webview)){webviews.add(view.webview);if(view.onDidDispose)subscriptions.push(view.onDidDispose(()=>webviews.delete(view.webview)));}
    return overlay(view,{...(view.viewType?{viewType:originalIdentifier(view.viewType)}:{}),...(view.document?{document:wrapDocument(view.document)}:{}),...(view.webview?{webview:wrapWebview(view.webview)}:{})});
  };
  const officialTab=(tab:any)=>tab?.input?.uri?.scheme==='openai-codex';
  const wrapTab=(tab:any)=>tab?.input?.uri?overlay(tab,{input:overlay(tab.input,{uri:mapValue(tab.input.uri,false)})}):tab;
  const wrapTabGroup=(group:any)=>overlay(group,{get tabs(){return group.tabs.filter((tab:any)=>!officialTab(tab)).map(wrapTab);},get activeTab(){return officialTab(group.activeTab)?undefined:group.activeTab?wrapTab(group.activeTab):undefined;}});
  const callback=(listener:Function)=>function(this:any,...args:any[]){return listener.apply(this,args.map(arg=>isUri(arg)?mapValue(arg,false):arg));};
  const provider=(original:any)=>new Proxy(original,{get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;return function(...args:any[]){const mapped=args.map(arg=>isUri(arg)?mapValue(arg,false):arg?.document?wrapView(arg):arg?.uri?wrapDocument(arg):arg);const result=value.apply(target,mapped);return result&&typeof result.then==='function'?result.then((r:any)=>mapValue(r,true)):mapValue(result,true);};}});
  const workspace=overlay(real.workspace,{
    getConfiguration:configuration,
    ...(real.workspace.textDocuments?{get textDocuments(){return real.workspace.textDocuments.filter((doc:any)=>doc.uri?.scheme!=='openai-codex').map(wrapDocument);}}:{}),
    onDidChangeConfiguration(listener:Function,thisArg?:any,disposables?:any[]){return real.workspace.onDidChangeConfiguration((event:any)=>listener.call(thisArg,overlay(event,{affectsConfiguration:(section:string,scope?:any)=>event.affectsConfiguration(section===OLD?PREFIX:nativeIdentifier(section),scope)})),undefined,disposables);},
    ...(real.workspace.openTextDocument?{openTextDocument:(...args:any[])=>Promise.resolve(real.workspace.openTextDocument(...args.map(arg=>mapValue(arg,true)))).then(wrapDocument)}:{}),
    ...(real.workspace.registerTextDocumentContentProvider?{registerTextDocumentContentProvider:(scheme:string,p:any)=>real.workspace.registerTextDocumentContentProvider(nativeIdentifier(scheme),provider(p))}:{}),
    ...(real.workspace.registerFileSystemProvider?{registerFileSystemProvider:(scheme:string,p:any,opts:any)=>real.workspace.registerFileSystemProvider(nativeIdentifier(scheme),provider(p),opts)}:{}),
    ...(real.workspace.fs?{fs:overlay(real.workspace.fs,Object.fromEntries(Reflect.ownKeys(real.workspace.fs).filter(key=>typeof key==='string'&&typeof real.workspace.fs[key]==='function').map(key=>[key,(...args:any[])=>real.workspace.fs[key](...args.map(arg=>mapValue(arg,true)))])))}:{}),
  });
  const commands=overlay(real.commands,{
    registerCommand(command:string,fn:Function,thisArg?:any){return real.commands.registerCommand(nativeIdentifier(command),callback(fn),thisArg);},
    ...(real.commands.registerTextEditorCommand?{registerTextEditorCommand:(command:string,fn:Function,thisArg?:any)=>real.commands.registerTextEditorCommand(nativeIdentifier(command),callback(fn),thisArg)}:{}),
    executeCommand(command:string,...args:any[]){
      const mapped=args.map(arg=>mapValue(arg,true));
      if(command==='setContext'&&typeof mapped[0]==='string')mapped[0]=nativeIdentifier(mapped[0]);
      if(command==='vscode.openWith'&&typeof mapped[1]==='string')mapped[1]=nativeIdentifier(mapped[1]);
      if(command==='workbench.action.openSettings'&&typeof mapped[0]==='string')mapped[0]=mapped[0].replaceAll('@ext:openai.chatgpt','@ext:'+ID).replace(/^chatgpt(?=\.|$)/,PREFIX);
      return real.commands.executeCommand(nativeIdentifier(command),...mapped);
    },
    ...(real.commands.getCommands?{getCommands:(filter?:boolean)=>Promise.resolve(real.commands.getCommands(filter)).then((names:string[])=>names.map(originalIdentifier))}:{}),
  });
  const window=overlay(real.window,{
    ...(real.window.tabGroups?{tabGroups:overlay(real.window.tabGroups,{get all(){return real.window.tabGroups.all.map(wrapTabGroup);},get activeTabGroup(){return wrapTabGroup(real.window.tabGroups.activeTabGroup);}})}:{}),
    registerWebviewViewProvider(id:string,p:any,opts:any){return real.window.registerWebviewViewProvider(nativeIdentifier(id),{async resolveWebviewView(view:any,...args:any[]){try{return await p.resolveWebviewView(wrapView(view),...args);}catch(error){console.error('[Apeiria native webview]',String((error as any)?.stack||error));throw error;}}},opts);},
    registerCustomEditorProvider(id:string,p:any,opts:any){return real.window.registerCustomEditorProvider(nativeIdentifier(id),provider(p),opts);},
    createWebviewPanel(id:string,title:string,...args:any[]){return wrapView(real.window.createWebviewPanel(nativeIdentifier(id),title,...args));},
    ...(real.window.registerUriHandler?{registerUriHandler:(handler:any)=>real.window.registerUriHandler({handleUri:(uri:any)=>handler.handleUri(mapValue(uri,false))})}:{}),
    ...(real.window.showTextDocument?{showTextDocument:(document:any,...args:any[])=>real.window.showTextDocument(isUri(document)?mapValue(document,true):document,...args)}:{}),
    ...(real.window.createOutputChannel?{createOutputChannel:(name:string,...args:any[])=>real.window.createOutputChannel(name==='Codex'?'Apeiria Code':name.replace(/^Codex\b/,'Apeiria Code'),...args)}:{}),
  });
  const nativeUri=real.Uri.file(options.nativeRoot),manifest=JSON.parse(fs.readFileSync(path.join(options.nativeRoot,'package.json'),'utf8'));
  const extension=overlay(owner.extension||{}, {id:ID,extensionPath:options.nativeRoot,extensionUri:nativeUri,packageJSON:manifest});
  const nativeContext=overlay(owner,{extensionPath:options.nativeRoot,extensionUri:nativeUri,extension,subscriptions,asAbsolutePath:(relative:string)=>path.join(options.nativeRoot,relative)});
  const extensions=real.extensions?overlay(real.extensions,{getExtension:(id:string)=>id==='openai.chatgpt'||id===ID?extension:real.extensions.getExtension(id)}):undefined;
  const env=real.env?overlay(real.env,{
    isTelemetryEnabled:false,
    createTelemetryLogger:()=>({isUsageEnabled:false,isErrorsEnabled:false,logUsage(){},logError(){},dispose(){},onDidChangeEnableStates:()=>({dispose(){}})}),
    onDidChangeTelemetryEnabled:(_listener:unknown,_thisArg?:unknown,disposables?:VSCode.Disposable[])=>{const value={dispose(){}};disposables?.push(value);return value;},
    ...(real.env.openExternal?{openExternal:(uri:any,opts:any)=>real.env.openExternal(mapValue(uri,true),opts)}:{}),
    ...(real.env.asExternalUri?{asExternalUri:(uri:any)=>real.env.asExternalUri(mapValue(uri,true))}:{}),
  }):undefined;
  const chat=real.chat?overlay(real.chat,{
    registerChatSessionItemProvider:(id:string,p:any)=>real.chat.registerChatSessionItemProvider(nativeIdentifier(id),provider(p)),
    registerChatSessionContentProvider:(id:string,p:any,capabilities:any)=>real.chat.registerChatSessionContentProvider(nativeIdentifier(id),provider(p),capabilities),
  }):undefined;
  return {api:overlay(real,{workspace,commands,window,...(extensions?{extensions}:{}),...(env?{env}:{}),...(chat?{chat}:{})}),context:nativeContext,process:nativeProcess(owner),subscriptions,setMessageDecoder(decode){decodeMessage=decode;},async refreshModels(){await Promise.all([...webviews].map(async webview=>{try{await webview.postMessage({type:'apeiria-models-changed'});}catch{webviews.delete(webview);}}));}};
}

export function nativeChildProcess(options:NativeHostOptions,environment:NodeJS.ProcessEnv):typeof childProcess {
  const launcher=path.resolve(options.launcherPath).toLowerCase();
  const envFor=(file:string,opts:Any={})=>{
    const env={...environment,...opts.env,CODEX_HOME:environment.CODEX_HOME,CODEX_SQLITE_HOME:environment.CODEX_SQLITE_HOME,CODEX_LOG_DIR:environment.CODEX_LOG_DIR};
    if(path.resolve(file).toLowerCase()===launcher){env.APEIRIA_NATIVE_DESCRIPTOR=options.descriptorPath;env.APEIRIA_NATIVE_NODE=process.execPath;}
    return {...opts,env};
  };
  const overrides:Any={};
  for(const method of ['spawn','spawnSync','execFile','execFileSync'] as const)overrides[method]=(file:string,...args:any[])=>{
    const next=[...args];let index=Array.isArray(next[0])?1:0;
    if(typeof next[index]==='function'||next[index]===undefined)next.splice(index,0,envFor(file));else next[index]=envFor(file,next[index]);
    return (childProcess[method] as Function)(file,...next);
  };
  for(const method of ['exec','execSync'] as const)overrides[method]=(command:string,...args:any[])=>{const next=[...args];if(typeof next[0]==='function'||next[0]===undefined)next.unshift(envFor(''));else next[0]=envFor('',next[0]);return (childProcess[method] as Function)(command,...next);};
  return overlay(childProcess,overrides);
}

/** Account, telemetry and experimentation services have no role in this client. */
export function createNativeFetch(upstream:typeof fetch=fetch):typeof fetch {
  return (async(input:Parameters<typeof fetch>[0],init?:Parameters<typeof fetch>[1])=>{
    const address=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    let host='';try{host=new URL(address).hostname.toLowerCase();}catch{}
    if(host==='chatgpt.com'||host.endsWith('.chatgpt.com')||host==='openai.com'||host.endsWith('.openai.com'))return Response.json({error:{code:'local_only',message:'Official account services are disabled in this independent client.'}},{status:403});
    return upstream(input,init);
  }) as typeof fetch;
}

/** Load only this private native copy. No process-wide Module._load hooks are used. */
export function loadNativeBundle(options:NativeHostOptions,scoped:{api:any;context:any;process:NodeJS.Process;setMessageDecoder?:(decode:(value:any)=>any)=>void}):{exports:any;refreshModels():Promise<void>;clear():void} {
  const nativeRequire=createRequire(path.join(options.nativeRoot,'package.json'));
  const builtins=new Map<string,any>(),modules=new Map<string,{exports:any}>();
  const sandbox:Any={Buffer,process:scoped.process,console,setTimeout,clearTimeout,setInterval,clearInterval,setImmediate,clearImmediate,queueMicrotask,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,AbortSignal,DOMException,fetch:createNativeFetch(),Headers,Request,Response,ReadableStream,WritableStream,TransformStream,structuredClone,performance,atob,btoa};
  // Preserve the standard Node web globals expected by the native HTTP client.
  // The process and extension API remain explicitly scoped above.
  for(const name of ['Blob','File','FormData','crypto','MessageChannel','MessagePort','BroadcastChannel','CompressionStream','DecompressionStream','CountQueuingStrategy','ByteLengthQueuingStrategy','ReadableStreamDefaultReader','WritableStreamDefaultWriter'])if(name in globalThis)sandbox[name]=(globalThis as Any)[name];
  sandbox.global=sandbox;
  const realm=vm.createContext(sandbox,{name:'Apeiria Code native client'});
  // VS Code deserializes messages in the extension-host realm. Native RPC uses
  // instanceof Array, so incoming JSON containers must be recreated here.
  scoped.setMessageDecoder?.(vm.runInContext(`(function clone(value,seen=new Map()){
    if(value===null||typeof value!=='object')return value;
    if(seen.has(value))return seen.get(value);
    if(Array.isArray(value)){const result=[];seen.set(value,result);for(const item of value)result.push(clone(item,seen));return result;}
    if(Object.prototype.toString.call(value)==='[object Object]'){const result={};seen.set(value,result);for(const key of Object.keys(value))Object.defineProperty(result,key,{value:clone(value[key],seen),writable:true,enumerable:true,configurable:true});return result;}
    if(ArrayBuffer.isView(value)){if(Object.prototype.toString.call(value)==='[object DataView]')return new DataView(new Uint8Array(value.buffer,value.byteOffset,value.byteLength).slice().buffer);const Constructor=globalThis[value.constructor.name];return Constructor?new Constructor(value):value;}
    if(Object.prototype.toString.call(value)==='[object ArrayBuffer]')return new Uint8Array(new Uint8Array(value)).buffer;
    return value;
  })`,realm));
  const load=(filename:string):any=>{
    if(modules.has(filename))return modules.get(filename)!.exports;
    if(filename.endsWith('.json'))return JSON.parse(fs.readFileSync(filename,'utf8'));
    const module={exports:{}};modules.set(filename,module);
    const localRequire=Object.assign((specifier:string):any=>{
      if(specifier==='vscode')return scoped.api;
      const name=specifier.replace(/^node:/,'');
      if(name==='process')return scoped.process;
      if(name==='child_process')return nativeChildProcess(options,scoped.process.env);
      if(isBuiltin(specifier)){
        if(!builtins.has(name)){
          const value=nativeRequire(specifier);
          builtins.set(name,value&&typeof value==='object'?Object.defineProperties(Object.create(Object.getPrototypeOf(value)),Object.getOwnPropertyDescriptors(value)):value);
        }
        return builtins.get(name);
      }
      const resolved=createRequire(filename).resolve(specifier),relative=path.relative(options.nativeRoot,resolved);
      if(relative.startsWith('..'+path.sep)||path.isAbsolute(relative))return nativeRequire(specifier);
      return load(resolved);
    },{resolve:(specifier:string)=>createRequire(filename).resolve(specifier),cache:Object.create(null),main:undefined});
    const source=fs.readFileSync(filename,'utf8');
    const wrapper=vm.runInContext(`(function(exports,require,module,__filename,__dirname){${source}\n})`,realm,{filename});
    wrapper(module.exports,localRequire,module,filename,path.dirname(filename));return module.exports;
  };
  return {exports:load(path.join(options.nativeRoot,'out','extension.js')),async refreshModels(){
    const connection=(realm as Any).__apeiriaNativeConnection;
    if(typeof connection?.apeiriaRefreshModels!=='function')throw Error('The independent native model refresh hook is unavailable.');
    await connection.apeiriaRefreshModels();
  },clear(){modules.clear();builtins.clear();}};
}

export async function loadNativeHost(context:VSCode.ExtensionContext,options:NativeHostOptions):Promise<{deactivate():Promise<void>;refreshModels():Promise<void>}> {
  const vscode=await import('vscode'),scoped=createNativeFacade(vscode,context,options);
  let loaded:ReturnType<typeof loadNativeBundle>|undefined,native:any,cleanup:Promise<void>|undefined;
  const deactivate=()=>cleanup||=(async()=>{
    try{if(typeof native?.deactivate==='function')await native.deactivate();}
    finally{const owned=scoped.subscriptions.splice(0).reverse();for(const disposable of owned)try{await disposable.dispose();}catch{}loaded?.clear();}
  })();
  try{
    loaded=loadNativeBundle(options,scoped);native=loaded.exports;
    if(typeof native.activate!=='function')throw Error('原生客户端入口缺少 activate。');
    await native.activate(scoped.context);return {deactivate,async refreshModels(){if(cleanup)return;await loaded!.refreshModels();await scoped.refreshModels();}};
  }catch(error){await deactivate().catch(()=>{});throw error;}
}
