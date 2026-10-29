import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {isolateNativeName,nativeContainerId} from '../src/native-names.ts';

export const supportedNativeVersion='26.1021.22027';
export const nativeProfileMenu='webview/assets/profile-dropdown-items-31555d8c5bbd.js';
export const nativeModelsQuery='webview/assets/model-queries-643676f8d27a.js';
export const nativeMessageBus='webview/assets/message-bus-4113ba7287d7.js';
export const nativeHostServices='webview/assets/initialize-app-host-services.extension-f722db488e05.js';
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function mapContributions(value){
  if(typeof value==='string'){
    const mapped=isolateNativeName(value);
    return /^(?:\.\/)?(?:resources|syntaxes|webview)\//.test(mapped)?'native/'+mapped.replace(/^\.\//,''):mapped;
  }
  if(Array.isArray(value))return value.map(mapContributions);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[isolateNativeName(key),mapContributions(item)]));
  return value;
}

/** Derive the complete editor contribution surface, preserving the native client's features. */
export function nativeContributions(manifest){
  const result=mapContributions(structuredClone(manifest.contributes||{}));
  result.viewsContainers={activitybar:[{id:nativeContainerId,title:'Apeiria Code',icon:'media/icon.svg'}]};
  const views=Object.values(manifest.contributes?.views||{}).flat().map(view=>({...mapContributions(view),name:'Apeiria Code'}));
  result.views={[nativeContainerId]:views};
  if(result.commands)result.commands=result.commands.map(command=>({...command,category:'Apeiria Code'}));
  if(result.configuration)result.configuration.title='Apeiria Code 原生设置';
  if(result.chatSessions)result.chatSessions=result.chatSessions.map(session=>({...session,name:'Apeiria Code',displayName:'Apeiria Code'}));
  if(result.customEditors)result.customEditors=result.customEditors.map(editor=>({...editor,displayName:'Apeiria Code Chat'}));
  return result;
}

function replaceExactlyOnce(source,before,after,label){
  if(source.split(before).length!==2)throw Error(`Native ${label} no longer matches the validated version.`);
  return source.replace(before,after);
}

/** A single native menu row opens our provider manager; the native settings row stays intact. */
export function patchNativeProfileMenu(source){
  const row='(0,$.jsx)(B,{leftIconAsset:Tn,onClick:()=>{o(),m.dispatchMessage(`open-vscode-command`,{command:`apeiriaCode.settings`})},children:`模型提供商`},`apeiria-model-providers`)';
  const patched=replaceExactlyOnce(source,'children:[q,Zn,null,tr,Xn,rr,Y,X,null,null,null,sr,cr]',
    'children:[q,Zn,null,tr,'+row+',Xn,rr,Y,X,null,null,null,sr,cr]',
    'profile menu');
  return replaceExactlyOnce(patched,'children:[qn,K,null,te,null]','children:[qn,K,'+row+',te,null]','compact profile menu');
}

/** Invalidate the existing native model query after a provider-only panel saves. */
export function patchNativeModelQueries(source){
  const anchor='=>{let g=u!=null,y=v?.daybreakPreferences';
  const patched=replaceExactlyOnce(source,anchor,'=>{apeiriaBindModelUpdates(p);let g=u!=null,y=v?.daybreakPreferences','model query cache invalidation');
  const integration='import{n as apeiriaInitMessageBus,r as apeiriaMessageBus}from"./message-bus-4113ba7287d7.js";'+
    'const apeiriaModelQueryClients=new WeakSet;'+
    'function apeiriaBindModelUpdates(client){if(apeiriaModelQueryClients.has(client))return;apeiriaModelQueryClients.add(client);apeiriaInitMessageBus();apeiriaMessageBus.subscribe(`apeiria-models-changed`,()=>{client.invalidateQueries({queryKey:[`models`]}).catch(()=>{})})}';
  return integration+patched;
}

/** Use the SDK's own offline mode, including initialization, logs and exceptions. */
export function patchNativeOfflineEvaluations(source){
  const original='function jT(e){let t={...GT,enableLiveValuesAutoRefresh:!0,...e===!0&&!Pr()?{}:{disableStorage:!0,loggingEnabled:`disabled`}};return t.networkConfig={...GT.networkConfig,preventAllNetworkTraffic:!1,networkOverrideFunc:(e,n)=>cT(e,n,t.loggingEnabled!==`disabled`)},t}';
  const offline='function jT(e){return{...GT,enableLiveValuesAutoRefresh:!1,disableStorage:!0,loggingEnabled:`disabled`,networkConfig:{...GT.networkConfig,preventAllNetworkTraffic:!0}}}';
  return replaceExactlyOnce(source,original,offline,'offline experiment evaluations');
}

/** Distinct Windows named pipe. Other native host code remains byte-for-byte retained. */
export function patchNativeHost(source){
  const windows=String.raw`Qm.join("\\\\.\\pipe","codex-ipc")`;
  const unix='Qm.join(Zqe.tmpdir(),"codex-ipc",t?';
  const patched=replaceExactlyOnce(source,windows,windows.replace('codex-ipc','apeiria-code-ipc'),'Windows IPC namespace');
  const namespaced=replaceExactlyOnce(patched,unix,unix.replace('codex-ipc','apeiria-code-ipc'),'fallback IPC namespace');
  const exposed=replaceExactlyOnce(namespaced,'let v=new H1(t.extensionUri,u);e.push(v);','let v=new H1(t.extensionUri,u);e.push(v);apeiriaExposeNativeConnection(v);','private app-server lifecycle');
  return exposed+'\n'+nativeConnectionLifecycle+'\n';
}

// Kept local to the copied client's VM. The CLI ModelManager owns a startup
// catalogue cache, so a file/query refresh alone cannot retain native tools.
const nativeConnectionLifecycle=String.raw`
function apeiriaExposeNativeConnection(connection){
  const activeTurns=new Set;
  let disposed=false,refreshTask=null,idleTimer=null,initializeTimer=null,watcher=null,failRefresh=null;
  const observe=event=>{
    const id=event.params?.threadId??event.params?.thread?.id;
    if(id==null)return;
    if(event.method==='turn/started')activeTurns.add(id);
    else if(event.method==='turn/completed')activeTurns.delete(id);
  };
  connection.registerInternalNotificationHandler(observe);
  connection.registerProvider('apeiria-model-lifecycle',{onFatalError(){activeTurns.clear()}});
  connection.apeiriaActiveTurns=activeTurns;
  connection.apeiriaRefreshModels=function(){
    if(disposed)return Promise.reject(new Error('Apeiria native client is closed.'));
    if(refreshTask)return refreshTask;
    let resolveTask,rejectTask;
    const task=new Promise((resolve,reject)=>{resolveTask=resolve;rejectTask=reject});
    refreshTask=task;
    const finish=error=>{
      clearTimeout(idleTimer);clearTimeout(initializeTimer);idleTimer=null;initializeTimer=null;
      watcher?.dispose();watcher=null;failRefresh=null;
      error?rejectTask(error):resolveTask();
    };
    failRefresh=finish;
    const restartWhenIdle=()=>{
      if(disposed){finish(new Error('Apeiria native client is closed.'));return}
      if(activeTurns.size||connection.pendingRequests.size||(!connection.initialized&&!connection.fatalError)){
        idleTimer=setTimeout(restartWhenIdle,50);return;
      }
      let awaitingInitialize=false;
      watcher=connection.registerProvider('apeiria-model-refresh',{
        onInitialized(){if(awaitingInitialize)finish()},
        onFatalError(error){if(awaitingInitialize)finish(error)}
      });
      const handlers=[...connection.internalNotificationHandlers];
      awaitingInitialize=true;
      try{
        const result=connection.startCodexProcess();
        for(const handler of handlers)connection.internalNotificationHandlers.add(handler);
        if(!result?.success){finish(new Error(result?.errorMessage??'Failed to restart the independent app-server.'));return}
        initializeTimer=setTimeout(()=>finish(new Error('Independent app-server initialization timed out.')),30000);
      }catch(error){
        for(const handler of handlers)connection.internalNotificationHandlers.add(handler);
        finish(error);
      }
    };
    task.then(()=>{refreshTask=null},()=>{refreshTask=null});
    restartWhenIdle();
    return task;
  };
  const dispose=connection.dispose;
  connection.dispose=function(...args){disposed=true;failRefresh?.(new Error('Apeiria native client is closed.'));return dispose.apply(this,args)};
  globalThis.__apeiriaNativeConnection=connection;
}
`;

export function prepareNative(sourceRoot,targetRoot){
  const source=path.resolve(sourceRoot),target=path.resolve(targetRoot);
  if(source===target||target.startsWith(source+path.sep))throw Error('Native destination must be separate from the original installation.');
  const manifest=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));
  if(manifest.publisher!=='openai'||manifest.name!=='chatgpt'||manifest.version!==supportedNativeVersion)throw Error('Unsupported native client; no files were copied.');
  const profileOriginal=fs.readFileSync(path.join(source,nativeProfileMenu),'utf8');
  const hostOriginal=fs.readFileSync(path.join(source,'out/extension.js'),'utf8');
  const modelsOriginal=fs.readFileSync(path.join(source,nativeModelsQuery),'utf8');
  const servicesOriginal=fs.readFileSync(path.join(source,nativeHostServices),'utf8');
  const profilePatched=patchNativeProfileMenu(profileOriginal),hostPatched=patchNativeHost(hostOriginal),modelsPatched=patchNativeModelQueries(modelsOriginal),servicesPatched=patchNativeOfflineEvaluations(servicesOriginal);
  // Verify every planned source and patch before creating or modifying the destination.
  for(const relative of ['out','webview','resources','syntaxes','LICENSE.md','package.json',nativeMessageBus])if(!fs.existsSync(path.join(source,relative)))throw Error('Native source is incomplete: '+relative);
  fs.mkdirSync(target,{recursive:true});
  const records=[];
  function copy(relative){
    const absolute=path.join(source,relative),stat=fs.lstatSync(absolute);
    if(stat.isSymbolicLink())throw Error('Native source contains an unexpected symbolic link: '+relative);
    if(stat.isDirectory()){
      fs.mkdirSync(path.join(target,relative),{recursive:true});
      for(const entry of fs.readdirSync(absolute))copy(path.join(relative,entry));return;
    }
    // Source maps contain debugging source text and are not required by the retained runtime.
    if(relative.endsWith('.map'))return;
    const before=fs.readFileSync(absolute);let after=before;
    const normalized=relative.replaceAll('\\','/');
    if(normalized===nativeProfileMenu)after=Buffer.from(profilePatched);
    else if(normalized===nativeModelsQuery)after=Buffer.from(modelsPatched);
    else if(normalized===nativeHostServices)after=Buffer.from(servicesPatched);
    else if(normalized==='out/extension.js')after=Buffer.from(hostPatched);
    else if(normalized==='syntaxes/starlark.tmLanguage.json'){
      const grammar=JSON.parse(before.toString('utf8'));
      if(grammar.scopeName==='source.codex-rules'){grammar.scopeName='source.apeiria-code-rules';after=Buffer.from(JSON.stringify(grammar));}
    }
    const destination=path.join(target,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(!fs.existsSync(destination)||!fs.readFileSync(destination).equals(after))fs.writeFileSync(destination,after);
    records.push({path:normalized,sourceSha256:digest(before),sha256:digest(after),modified:!before.equals(after),bytes:after.length});
  }
  for(const relative of ['out','webview','resources','syntaxes','LICENSE.md','package.json'])copy(relative);
  if(fs.existsSync(path.join(source,'readme.md')))copy('readme.md');
  const contributions=nativeContributions(manifest);
  fs.writeFileSync(path.join(target,'contributions.json'),JSON.stringify(contributions,null,2)+'\n');
  fs.writeFileSync(path.join(target,'provenance.json'),JSON.stringify({
    version:supportedNativeVersion,sourceExtension:'openai.chatgpt',license:'See retained LICENSE.md; these original client assets are not covered by Apeiria Code MIT license.',
    purpose:'Locally prepared client copy with separate VS Code registrations, third-party model access and independent storage.',
    retainedDirectories:['out','webview','resources','syntaxes'],omitted:['bin (independently bundled CLI)','*.map (debugging source maps)'],
    enabledApiProposals:manifest.enabledApiProposals||[],files:records,
  },null,2)+'\n');
  console.log(`Prepared native client ${supportedNativeVersion}: ${records.length} files; original installation unchanged.`);
  return {contributions,files:records};
}

const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
  if(!process.argv[2])throw Error('Provide the original installed extension directory.');
  prepareNative(process.argv[2],process.argv[3]||path.resolve('native'));
}
