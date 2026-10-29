import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ProviderStore} from './providers.ts';
import {createBridge} from './bridge.ts';
import {loadNativeHost} from './native-loader.ts';
import {applyNativeModelBaseline} from './native-models.ts';
import {webviewHtml} from './webview.ts';
import {usageSnapshot} from './usage.ts';
import type {NativeDescriptor} from './native-runtime.ts';
import type {UiState,UiAction} from './types.ts';

let shutdown:(()=>Promise<void>)|undefined;
export async function deactivate(){await shutdown?.();}

/** The original client owns chat interactions. This entry only isolates it and manages providers. */
export async function activate(context:vscode.ExtensionContext){
  const root=context.globalStorageUri.fsPath,home=path.join(root,'engine-home');
  fs.mkdirSync(home,{recursive:true});
  const baseline=JSON.parse(fs.readFileSync(path.join(context.extensionPath,'engine','native-model-baseline.json'),'utf8'));
  applyNativeModelBaseline({models:[]},baseline);
  const store=new ProviderStore(root,{get:k=>Promise.resolve(context.secrets.get(k)),store:(k,v)=>Promise.resolve(context.secrets.store(k,v)),delete:k=>Promise.resolve(context.secrets.delete(k))});
  const output=vscode.window.createOutputChannel('Apeiria Code 接入层');context.subscriptions.push(output);
  let bridge:Awaited<ReturnType<typeof createBridge>>|undefined;
  const instance=crypto.randomUUID(),runtimeRoot=path.join(root,'runtimes');fs.mkdirSync(runtimeRoot,{recursive:true});
  const descriptorPath=path.join(runtimeRoot,instance+'.json'),catalogPath=path.join(home,'models.json');
  const descriptor:NativeDescriptor={version:1,root,home,cliPath:path.join(context.extensionPath,'engine','windows-x86_64','codex.exe'),manifestPath:path.join(context.extensionPath,'engine','manifest.json'),bridgeUrl:'',backendUrl:'',token:'',catalogPath,nativeVersion:'26.1021.22027'};
  const atomicJson=(file:string,value:unknown)=>{const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600});fs.renameSync(temp,file);};
  const updateCatalog=()=>{
    const catalog=applyNativeModelBaseline(store.catalog(),baseline);atomicJson(catalogPath,catalog);
    descriptor.defaultModel=catalog.models[0]?.slug;atomicJson(descriptorPath,descriptor);
  };
  let native:Awaited<ReturnType<typeof loadNativeHost>>|undefined,loading:ReturnType<typeof loadNativeHost>|undefined,panel:vscode.WebviewPanel|undefined,queue:Promise<unknown>=Promise.resolve(),closing=false,disposeTask:Promise<void>|undefined;
  const notice=(message:string,error=false)=>{if(error)output.appendLine(message);void panel?.webview.postMessage({type:'notice',message,error});};
  const publish=async()=>{
    if(!panel||closing)return;
    const state:UiState={providers:await store.views(),models:store.models(),threads:[],items:[],attachments:[],pending:[],threadId:null,model:'',effort:'',busy:false,engineStatus:'Codex 原生客户端 · 第三方接入',workspace:vscode.workspace.workspaceFolders?.[0]?.uri.fsPath||'',permissions:'workspace-write',usage:usageSnapshot('month',root)};
    await panel.webview.postMessage({type:'state',state});
  };
  const openNative=async()=>{await vscode.commands.executeCommand('apeiriaCode.native.openSidebar');};
  const refreshNativeModels=async()=>{const active=native||await loading;await active?.refreshModels();};
  let modelRevision=0,refreshedRevision=0,refreshTask:Promise<void>|undefined;
  const scheduleNativeModels=()=>{
    modelRevision++;
    if(refreshTask)return;
    refreshTask=(async()=>{
      while(!closing&&refreshedRevision<modelRevision){const revision=modelRevision;await refreshNativeModels();refreshedRevision=revision;}
      if(!closing)notice('原生模型目录已更新，可以在聊天模型菜单中选择。');
    })().catch(error=>{if(!closing)notice('渠道已保存，内核重连失败：'+store.safeError(error),true);}).finally(()=>{refreshTask=undefined;});
  };
  const handle=async(message:UiAction,view:vscode.Webview)=>{
    if(!message||typeof message.action!=='string')return;
    let data:unknown;
    try{
      switch(message.action){
        case 'ready':await publish();await view.postMessage({type:'navigate',page:'settings'});break;
        case 'saveProvider':data={id:await store.save(message.draft)};updateCatalog();scheduleNativeModels();await publish();notice('渠道已保存，当前任务完成后更新原生模型菜单；保存未发送模型请求。');break;
        case 'removeProvider':await store.remove(message.id);updateCatalog();scheduleNativeModels();await publish();break;
        case 'toggleProvider':await store.toggle(message.id);updateCatalog();scheduleNativeModels();await publish();break;
        case 'testProvider':data={message:await store.test(message.draft)};notice((data as {message:string}).message);break;
        case 'importJson':{
          const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{JSON:['json']},title:'导入 Google 服务账号 JSON'});
          if(files?.[0]){const file=files[0].fsPath;if(fs.statSync(file).size>128000)throw Error('JSON 文件过大。');const json=fs.readFileSync(file,'utf8'),account=JSON.parse(json);data={json,project:account.project_id};}break;
        }
        case 'refreshUsage':await publish();break;
        case 'openNative':await openNative();panel?.dispose();break;
        default:throw Error('此页面只管理模型渠道。聊天和工具设置请使用原生客户端。');
      }
      if(message.requestId)await view.postMessage({type:'result',requestId:message.requestId,ok:true,data});
    }catch(error){const messageText=store.safeError(error);notice(messageText,true);if(message.requestId)await view.postMessage({type:'result',requestId:message.requestId,ok:false,message:messageText});}
  };
  const openProviders=async()=>{
    if(panel){panel.reveal();await publish();return;}
    panel=vscode.window.createWebviewPanel('apeiriaCode.providers','Apeiria Code · 模型提供商',vscode.ViewColumn.Active,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[vscode.Uri.file(path.join(context.extensionPath,'dist'))]});
    const current=panel,view=current.webview;const uri=(name:string)=>view.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath,'dist',name))).toString();
    view.html=webviewHtml(uri('webview.js'),uri('webview.css'),view.cspSource,crypto.randomBytes(20).toString('hex')).replace('<html lang="zh-CN">','<html lang="zh-CN" data-apeiria-mode="providers">');
    context.subscriptions.push(view.onDidReceiveMessage(message=>{queue=queue.then(()=>handle(message,view),()=>handle(message,view));}),current.onDidDispose(()=>{if(panel===current)panel=undefined;}),current);
  };
  const register=(name:string,action:()=>PromiseLike<unknown>)=>context.subscriptions.push(vscode.commands.registerCommand('apeiriaCode.'+name,async()=>{try{await action();}catch(error){void vscode.window.showErrorMessage(store.safeError(error));}}));
  register('settings',openProviders);register('open',openNative);
  register('newThread',()=>vscode.commands.executeCommand('apeiriaCode.native.newChat'));
  register('attachSelection',()=>vscode.commands.executeCommand('apeiriaCode.native.addToThread'));
  const cleanup=()=>disposeTask||=(async()=>{closing=true;try{const active=native||await loading?.catch(()=>undefined);await active?.deactivate();}finally{panel?.dispose();await bridge?.close();try{fs.unlinkSync(descriptorPath);}catch{}}})();
  shutdown=cleanup;context.subscriptions.push({dispose(){void cleanup().catch(()=>{});}});
  try{
    bridge=await createBridge({root,store});
    if(closing){await bridge.close();return;}
    Object.assign(descriptor,{bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token});
    updateCatalog();
    loading=loadNativeHost(context,{nativeRoot:path.join(context.extensionPath,'native'),launcherPath:path.join(context.extensionPath,'dist','apeiria-native-cli.exe'),descriptorPath});
    native=await loading;
    if(closing)return;
    output.appendLine('原生客户端 26.1021.22027 已加载；模型接入、命令、设置、IPC 与存储分别隔离。');
  }catch(error){await cleanup();throw error;}
}
