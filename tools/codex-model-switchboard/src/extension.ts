import * as vscode from 'vscode';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {dataRoot,readSettings,writeSettings,validateBaseUrl} from './config.ts';
import type {Provider,Json} from './config.ts';
import {readServiceAccount,protectSecret} from './auth.ts';
import {panelHtml} from './panel-html.ts';
import {usageSnapshot,savePrice} from './usage.ts';
import type {PanelState} from './panel-types.ts';
import {installRuntime} from './runtime.ts';
import {installNativePatch,supportedVersion} from './native-patch.ts';
import {vertexDiagnostics} from './diagnostics.ts';

export async function activate(context:vscode.ExtensionContext){
  const launcher=installRuntime(context.extensionPath);
  const config=()=>vscode.workspace.getConfiguration('chatgpt');
  const startupCli=config().get<string|null>('cliExecutable');
  const owns=(file:unknown)=>typeof file==='string' && (file===launcher || /[\\/]ayanami-local\.codex-model-switchboard-[^\\/]+[\\/]dist[\\/]codex-switchboard\.exe$/i.test(file));
  const output=vscode.window.createOutputChannel('Codex 模型渠道');context.subscriptions.push(output);
  const views=new Set<vscode.Webview>(),selectedFiles=new Set<string>();
  let panel:vscode.WebviewPanel|undefined,period='month',queue=Promise.resolve();
  // Preserve the pre-adapter setting when an update changes our install path.
  if(owns(startupCli) && startupCli!==launcher)await config().update('cliExecutable',launcher,vscode.ConfigurationTarget.Global);
  const state=():PanelState=>{
    const settings=readSettings();
    for(const p of settings.providers)if(p.credentialsFile)selectedFiles.add(p.credentialsFile);
    return {enabled:owns(config().get('cliExecutable')),reloadRequired:!owns(startupCli)&&owns(config().get('cliExecutable')),providers:settings.providers.map(({encryptedKey,envKey,...p})=>({...p,hasKey:!!(encryptedKey||envKey)})),usage:usageSnapshot(period)};
  };
  const publish=()=>{const value=state();for(const view of views)void view.postMessage({type:'state',state:value});};
  const enable=async()=>{
    const previous=config().get<string|null>('cliExecutable');
    if(previous!==launcher){if(!owns(previous))await context.globalState.update('previousCli',previous??null);await config().update('cliExecutable',launcher,vscode.ConfigurationTarget.Global);}
  };
  const disable=async()=>{if(owns(config().get('cliExecutable')))await config().update('cliExecutable',context.globalState.get('previousCli')??undefined,vscode.ConfigurationTarget.Global);};
  const diagnostics=async()=>{
    const settings=readSettings();output.clear();output.appendLine('Codex 模型渠道 '+context.extension.packageJSON.version);
    output.appendLine('配置目录：'+dataRoot());output.appendLine('官网凭证及历史存储：沿用官方内核，适配器不写入。');
    output.appendLine('适配状态：'+(owns(config().get('cliExecutable'))?'已启用':'尚未启用'));
    for(const p of settings.providers)output.appendLine(`${p.label} [${p.type}] ${p.models.join(', ')} ${p.type==='vertex'?`JSON 文件${fs.existsSync(p.credentialsFile!)?'存在':'不存在'} / ${p.location}`:''}`);
    for(const line of vertexDiagnostics())output.appendLine(line);
    output.show();
  };
  const text=(value:unknown,max=1000)=>{if(typeof value!=='string' || value.length>max || value.includes('\0'))throw new Error('表单内容无效。');return value.trim();};
  const handle=async(message:Json,view:vscode.Webview)=>{
    if(!message || typeof message!=='object' || typeof message.action!=='string')return;
    let data:unknown,notice='';
    try{
      switch(message.action){
        case 'ready':break;
        case 'chooseJson':{
          const files=await vscode.window.showOpenDialog({title:'选择 Google 服务账号 JSON',canSelectMany:false,filters:{JSON:['json']}});if(!files?.[0])break;
          const file=files[0].fsPath,account=readServiceAccount(file);selectedFiles.add(file);data={credentialsFile:file,project:account.project_id};break;
        }
        case 'saveProvider':{
          const form=message.form;if(!form || typeof form!=='object')throw new Error('渠道表单无效。');
          const settings=readSettings(),id=text(form.id||'',41),previous=id?settings.providers.find(p=>p.id===id):undefined;
          if(id && !previous)throw new Error('该渠道已移除，请重新添加。');
          const label=text(form.label,100),type=text(form.type,40);if(!label || !['vertex','responses','chat-completions'].includes(type))throw new Error('请填写渠道名称并选择类型。');
          const models=[...new Set(text(form.models,10000).split(/[,，\r\n]/).map(s=>s.trim()).filter(Boolean))];if(!models.length || models.length>100)throw new Error('请填写 1 至 100 个模型 ID。');
          const p:Provider={id:previous?.id || (type==='vertex'?'vertex-':'api-')+crypto.randomBytes(6).toString('hex'),label,type:type as Provider['type'],models,enabled:previous?.enabled??true,...(previous?.contextWindow?{contextWindow:previous.contextWindow}:{})};
          if(form.reasoning!==undefined)p.reasoning=form.reasoning;
          else if(previous?.reasoning)p.reasoning=Object.fromEntries(Object.entries(previous.reasoning).filter(([m])=>models.includes(m)));
          if(type==='vertex'){
            const file=text(form.credentialsFile,32768);if(!selectedFiles.has(file))throw new Error('请使用“选择文件”选择服务账号 JSON。');
            readServiceAccount(file);Object.assign(p,{credentialsFile:file,project:text(form.project,200),location:text(form.location,100)||'global'});
          }else{
            const baseUrl=text(form.baseUrl,2000).replace(/\/$/,'');validateBaseUrl(baseUrl);p.baseUrl=baseUrl;
            const key=text(form.apiKey||'',16384);
            if(key)p.encryptedKey=protectSecret(key,launcher);else if(previous?.type!=='vertex'){p.encryptedKey=previous?.encryptedKey;p.envKey=previous?.envKey;}
          }
          settings.providers=previous?settings.providers.map(item=>item.id===p.id?p:item):[...settings.providers,p];writeSettings(settings);
          notice='渠道已保存。在聊天输入框的模型菜单中选择即可；保存未发送模型请求。';data={id:p.id};break;
        }
        case 'toggleProvider':case 'removeProvider':{
          const id=text(message.id,41),settings=readSettings(),p=settings.providers.find(p=>p.id===id);if(!p)throw new Error('该渠道已移除。');
          if(message.action==='removeProvider')settings.providers=settings.providers.filter(p=>p.id!==id);else p.enabled=p.enabled===false;
          writeSettings(settings);notice=message.action==='removeProvider'?'渠道已移除，历史对话保留。':'渠道状态已更新。';break;
        }
        case 'enable':await enable();notice='已启用。首次接入请点击“重载窗口”，后续切换模型无需重载。';break;
        case 'disable':await disable();notice='已恢复原来的内核设置。请重载窗口使其生效，登录与历史保留。';break;
        case 'reload':await vscode.commands.executeCommand('workbench.action.reloadWindow');break;
        case 'openChat':await vscode.commands.executeCommand('chatgpt.openSidebar');break;
        case 'diagnostics':await diagnostics();break;
        case 'refreshUsage':period=['today','month','all'].includes(message.period)?message.period:'month';break;
        case 'savePrice':{
          const model=text(message.model,400),price=message.price;if(!price || typeof price!=='object')throw new Error('计费设置无效。');
          savePrice(model,{currency:price.currency,input:price.input,output:price.output,...(price.cachedInput!==undefined?{cachedInput:price.cachedInput}:{}),...(price.monthlyBudget!==undefined?{monthlyBudget:price.monthlyBudget}:{})});notice='计费设置已保存，历史 Token 已按该单价重新估算。';break;
        }
        case 'billing':case 'quotas':{
          const p=readSettings().providers.find(p=>p.id===message.id && p.type==='vertex');if(!p)throw new Error('请选择 Vertex 渠道。');
          const url=message.action==='billing'?'https://console.cloud.google.com/billing':'https://console.cloud.google.com/iam-admin/quotas';
          await vscode.env.openExternal(vscode.Uri.parse(url+'?project='+encodeURIComponent(p.project!)));break;
        }
        default:throw new Error('不支持的面板操作。');
      }
      await view.postMessage({type:'result',action:message.action,ok:true,data,message:notice});publish();
    }catch(error){await view.postMessage({type:'result',action:message.action,ok:false,message:error instanceof Error?error.message:'操作失败；官网登录未更改。'});}
  };
  const attach=(view:vscode.Webview)=>{
    views.add(view);view.options={enableScripts:true,localResourceRoots:[vscode.Uri.file(path.join(context.extensionPath,'dist'))]};
    const uri=(file:string)=>view.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath,'dist',file))).toString();
    view.html=panelHtml(uri('panel.css'),uri('panel.js'),view.cspSource,crypto.randomBytes(18).toString('base64'));
    context.subscriptions.push(view.onDidReceiveMessage(message=>{queue=queue.then(()=>handle(message,view)).catch(()=>{});}));
  };
  const open=async(page='channels',type='vertex')=>{
    if(panel){panel.reveal();await panel.webview.postMessage({type:'navigate',page,providerType:type});publish();return;}
    panel=vscode.window.createWebviewPanel('codexModels.settings','Codex 模型渠道',vscode.ViewColumn.Active,{enableScripts:true,retainContextWhenHidden:true});
    const current=panel;attach(current.webview);
    context.subscriptions.push(current.webview.onDidReceiveMessage(message=>{if(message?.action==='ready')void current.webview.postMessage({type:'navigate',page,providerType:type});}));
    current.onDidDispose(()=>{views.delete(current.webview);panel=undefined;});context.subscriptions.push(current);
  };
  const register=(name:string,fn:()=>Promise<unknown>)=>context.subscriptions.push(vscode.commands.registerCommand(name,async()=>{try{await fn();}catch(error){void vscode.window.showErrorMessage(error instanceof Error?error.message:'操作失败；官网登录未更改。');}}));
  register('codexModels.manage',()=>open());register('codexModels.usageDetails',()=>open('usage'));
  register('codexModels.usage',async()=>{
    const usage=usageSnapshot('month'),settings=readSettings();
    const items=usage.rows.map(r=>{const p=settings.providers.find(p=>r.model.startsWith(`thirdparty/${p.id}/`)),model=p?`${p.label} · ${r.model.slice(`thirdparty/${p.id}/`.length)}`:r.model;return {label:model,description:`输入 ${r.input.toLocaleString()} · 输出 ${r.output.toLocaleString()}`,detail:r.cost===null?'未设置单价':`${r.currency} ${r.cost.toFixed(4)}（估算）${r.unknownUsage?' · 部分用量缺失':''}`,action:'details'};});
    const selected=await vscode.window.showQuickPick([...items,{label:'$(settings-gear) 详细统计与计费设置',description:'',detail:usage.rows.length?'':'启用后的请求将自动计入',action:'details'}],{title:'本月用量与费用',placeHolder:'本机 Token 统计；实际费用以服务商账单为准'});
    if(selected)await open('usage');
  });
  register('codexModels.addVertex',()=>open('channels','vertex'));register('codexModels.addCompatible',()=>open('channels','responses'));
  register('codexModels.enable',async()=>{await enable();publish();});register('codexModels.disable',async()=>{await disable();publish();});register('codexModels.diagnostics',diagnostics);
  const official=vscode.extensions?.getExtension('openai.chatgpt');
  if(official?.packageJSON.version===supportedVersion){try{installNativePatch(official.extensionPath,fs.readFileSync(path.join(context.extensionPath,'dist','native-menu.js'),'utf8'),path.join(dataRoot(),'native-backups',supportedVersion));}catch(error){output.appendLine(error instanceof Error?error.message:'原生菜单适配未应用。');}}
  const refresh=setInterval(()=>{if(views.size)try{publish();}catch{}},15000);refresh.unref();context.subscriptions.push({dispose(){clearInterval(refresh);}});
}
export function deactivate(){}
