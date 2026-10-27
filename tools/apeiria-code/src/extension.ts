import * as vscode from 'vscode';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Engine} from './engine.ts';
import {ProviderStore} from './providers.ts';
import {createBridge} from './bridge.ts';
import {webviewHtml} from './webview.ts';
import {usageSnapshot} from './usage.ts';
import {reduceEvent,upsertItem,transcript} from './session.ts';
import {beforeFromDiff} from './diff.ts';
import type {UiState,UiAction,Json,PendingRequest} from './types.ts';

let shutdown:(()=>Promise<void>)|undefined;
export async function deactivate(){await shutdown?.();}

export async function activate(context:vscode.ExtensionContext){
  const root=context.globalStorageUri.fsPath,home=path.join(root,'engine-home');
  fs.mkdirSync(root,{recursive:true});fs.mkdirSync(home,{recursive:true});
  const store=new ProviderStore(root,{get:key=>Promise.resolve(context.secrets.get(key)),store:(key,value)=>Promise.resolve(context.secrets.store(key,value)),delete:key=>Promise.resolve(context.secrets.delete(key))});
  const output=vscode.window.createOutputChannel('Apeiria Code');context.subscriptions.push(output);
  const views=new Set<vscode.Webview>(),readyViews=new Set<vscode.Webview>(),diffDocuments=new Map<string,string>();
  const workspace=vscode.workspace.workspaceFolders?.[0]?.uri.fsPath||path.join(root,'scratch-workspace');
  fs.mkdirSync(workspace,{recursive:true});
  const state:UiState={providers:[],models:[],threads:[],items:[],attachments:[],pending:[],threadId:null,model:context.workspaceState.get('model',''),effort:context.workspaceState.get('effort','medium'),busy:false,engineStatus:'配置渠道后即可开始',workspace,permissions:vscode.workspace.getConfiguration('apeiriaCode').get('permissions','workspace-write')};
  let engine:Engine|undefined,bridge:Awaited<ReturnType<typeof createBridge>>|undefined,starting:Promise<Engine>|undefined,turnId:string|undefined,publishing:NodeJS.Timeout|undefined,closed=false,stopRequested=false,actionQueue:Promise<unknown>=Promise.resolve(),loadedModelSignature='',interruptSentFor:string|undefined,navigation:'settings'|undefined;
  const notice=(message:string,error=false)=>{for(const view of views)void view.postMessage({type:'notice',message,error});if(error)output.appendLine(message);};
  const post=()=>{if(closed)return;for(const view of views)void view.postMessage({type:'state',state});};
  const schedule=()=>{if(!publishing)publishing=setTimeout(()=>{publishing=undefined;post();},35);};
  const refresh=async()=>{
    state.providers=await store.views();state.models=store.models();
    if(!state.models.some(m=>m.id===state.model))state.model=state.models[0]?.id||'';
    const efforts=state.models.find(m=>m.id===state.model)?.efforts||[];
    if(efforts.length&&!efforts.includes(state.effort))state.effort=efforts.includes('medium')?'medium':efforts[0];
    state.usage=usageSnapshot('month',root);post();
  };
  const assertIdle=()=>{if(state.busy)throw Error('请先等待本轮结束，或停止当前生成。');};
  const selected=()=>{const model=store.models().find(m=>m.id===state.model);if(!model)throw Error('请先在齿轮中添加并选择一个模型。');return model;};
  const threadConfig=()=>{selected();const info=store.catalog().models.find((m:Json)=>m.slug===state.model);return {'model_catalog_json':path.join(home,'models.json'),'model_context_window':info.context_window,'model_auto_compact_token_limit':info.auto_compact_token_limit};};
  const modelSignature=()=>JSON.stringify({model:state.model,catalog:store.catalog()});
  const onEvent=(method:string,params:Json)=>{
    if(method==='serverRequest/resolved'){state.pending=state.pending.filter(p=>p.id!==params.requestId);schedule();return;}
    if(params.threadId&&params.threadId!==state.threadId)return;
    reduceEvent(state.items,method,params);
    if(method==='turn/started'){turnId=params.turn?.id;state.busy=true;if(stopRequested&&turnId)void interrupt(turnId).catch(()=>{});}
    if(method==='turn/completed'){state.busy=false;turnId=undefined;state.pending=[];void refreshThreads().catch(()=>{});void refresh().catch(()=>{});if(params.turn?.status==='failed')notice(store.safeError(Error(params.turn.error?.message||'本轮生成失败，请检查渠道配置。')),true);}
    if(method==='error'){notice(store.safeError(Error(params.error?.message||'模型请求失败。')),true);}
    schedule();
  };
  const onRequest=(id:string|number,method:string,params:Json)=>{state.pending.push({id,method,params});post();};
  const ensureEngine=async():Promise<Engine>=>{
    if(closed)throw Error('扩展正在关闭。');
    if(engine)return engine;if(starting)return starting;
    selected();
    starting=(async()=>{
      bridge=await createBridge({root,store});
      const candidate=new Engine({cliPath:path.join(context.extensionPath,'engine','windows-x86_64','codex.exe'),manifestPath:path.join(context.extensionPath,'engine','manifest.json'),home,workspace,bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token,catalog:store.catalog(),onEvent,onRequest,onStatus:status=>{state.engineStatus=status;if(status==='内核已停止'){state.busy=false;state.pending=[];}schedule();}});
      try{await candidate.start();if(closed)throw Error('扩展正在关闭。');engine=candidate;return candidate;}catch(error){try{await candidate.dispose();}finally{await bridge?.close();bridge=undefined;}state.engineStatus='内核启动失败';throw error;}
    })().finally(()=>{starting=undefined;});return starting;
  };
  const refreshThreads=async()=>{
    if(!engine)return;
    const result=await engine.rpc('thread/list',{cwd:workspace,modelProviders:['apeiria'],limit:100,sortKey:'updated_at'});
    state.threads=(result.data||[]).map((t:Json)=>({id:t.id,name:t.name||t.preview||'新对话',preview:t.preview||'',updatedAt:t.updatedAt,archived:t.archived}));post();
  };
  const loadHistory=async(id:string)=>{
    const e=await ensureEngine();const items:Json[]=[];let cursor:string|null=null;
    do{const result=await e.rpc('thread/turns/list',{threadId:id,itemsView:'full',sortDirection:'asc',limit:100,cursor});for(const turn of result.data||[])items.push(...(turn.items||[]));cursor=result.nextCursor||null;}while(cursor);
    state.items=[];for(const item of items)upsertItem(state.items,item);post();
  };
  const resume=async(id:string)=>{
    assertIdle();const e=await ensureEngine();
    await e.rpc('thread/unsubscribe',{threadId:id});
    const result=await e.rpc('thread/resume',{threadId:id,model:state.model,modelProvider:'apeiria',cwd:workspace,approvalPolicy:'on-request',sandbox:state.permissions,config:threadConfig(),excludeTurns:true});
    if(result.thread?.cwd&&path.resolve(result.thread.cwd)!==path.resolve(workspace))throw Error('该聊天属于另一个工作区，请在对应窗口打开。');
    state.threadId=id;loadedModelSignature=modelSignature();await context.workspaceState.update('threadId',id);await loadHistory(id);
  };
  const send=async(text:string)=>{
    assertIdle();if(!vscode.workspace.isTrusted)throw Error('请先信任此工作区，再启用编码工具。');
    const model=selected();if(typeof text!=='string'||text.length>500000)throw Error('消息内容无效或过长。');
    if(!text.trim()&&!state.attachments.length)return;
    if(!model.imageInput&&state.attachments.some(a=>a.kind==='image'))throw Error('当前模型未启用图片输入，请更换模型或移除图片。');
    state.busy=true;stopRequested=false;interruptSentFor=undefined;turnId=undefined;post();let createdThread=false;
    try{
    const e=await ensureEngine();
    if(stopRequested){state.busy=false;return;}
    if(!state.threadId){const result=await e.rpc('thread/start',{model:state.model,modelProvider:'apeiria',cwd:workspace,approvalPolicy:'on-request',sandbox:state.permissions,config:threadConfig(),historyMode:'paginated',allowProviderModelFallback:false});state.threadId=result.thread.id;createdThread=true;loadedModelSignature=modelSignature();await context.workspaceState.update('threadId',state.threadId);}
    else if(loadedModelSignature!==modelSignature()){
      await e.rpc('thread/unsubscribe',{threadId:state.threadId});
      await e.rpc('thread/resume',{threadId:state.threadId,model:state.model,modelProvider:'apeiria',cwd:workspace,approvalPolicy:'on-request',sandbox:state.permissions,config:threadConfig(),excludeTurns:true});loadedModelSignature=modelSignature();
    }
    if(stopRequested){state.busy=false;if(createdThread){const id=state.threadId;state.threadId=null;loadedModelSignature='';await context.workspaceState.update('threadId',undefined);await e.rpc('thread/unsubscribe',{threadId:id}).catch(()=>{});}return;}
    const input:Json[]=[{type:'text',text:text.trim()}];
    for(const a of state.attachments){if(a.kind==='image')input.push({type:'localImage',path:a.path});else input.push({type:'text',text:`[用户引用：${a.name}]\n${a.text||''}\n[引用结束]`});}
    const result=await e.rpc('turn/start',{threadId:state.threadId,model:state.model,effort:state.effort,input,approvalPolicy:'on-request',sandboxPolicy:state.permissions==='read-only'?{type:'readOnly'}:{type:'workspaceWrite',writableRoots:[workspace],networkAccess:false,excludeTmpdirEnvVar:false,excludeSlashTmp:false}});if(state.busy)turnId=result.turn?.id;state.attachments=[];if(stopRequested&&turnId)await interrupt(turnId);await refreshThreads();
    }catch(error){state.busy=false;if(createdThread&&!turnId){state.threadId=null;loadedModelSignature='';await context.workspaceState.update('threadId',undefined);}throw error;}finally{post();}
  };
  const interrupt=async(id:string)=>{if(!engine||!state.threadId||interruptSentFor===id)return;interruptSentFor=id;try{await engine.rpc('turn/interrupt',{threadId:state.threadId,turnId:id});}catch(error){if(/no active turn/i.test(String(error)))interruptSentFor=undefined;else throw error;}};
  const stop=async()=>{if(!state.busy)return;stopRequested=true;if(turnId)await interrupt(turnId);};
  const restart=async()=>{
    assertIdle();const id=state.threadId;const current=engine;engine=undefined;try{await current?.dispose();}finally{await bridge?.close();bridge=undefined;state.pending=[];}
    await ensureEngine();if(id)await resume(id);await refreshThreads();await refresh();
  };
  const attachSelection=async()=>{
    const editor=vscode.window.activeTextEditor;if(!editor)throw Error('请先打开一个文件。');
    const selection=editor.selection,text=selection.isEmpty?editor.document.getText():editor.document.getText(selection);
    if(text.length>200000)throw Error('引用内容过长，请选择较小的范围。');
    state.attachments.push({id:crypto.randomUUID(),kind:'selection',name:`${path.basename(editor.document.fileName)}${selection.isEmpty?'':`:${selection.start.line+1}`}`,text});post();
  };
  const attachFiles=async()=>{
    const files=await vscode.window.showOpenDialog({canSelectMany:true,title:'选择要引用的文件或图片'});if(!files)return;
    for(const file of files){const stat=fs.statSync(file.fsPath);if(stat.size>20*1024*1024)throw Error('附件不能超过 20 MB。');const image=/\.(png|jpe?g|webp|gif)$/i.test(file.fsPath);if(!image&&stat.size>200000)throw Error('文本附件不能超过 200 KB，请引用选区。');const bytes=image?undefined:fs.readFileSync(file.fsPath);if(bytes?.includes(0))throw Error('请选择文本文件或支持的图片。');state.attachments.push({id:crypto.randomUUID(),kind:image?'image':'file',name:path.basename(file.fsPath),path:file.fsPath,...(bytes?{text:bytes.toString('utf8')}:{})});}post();
  };
  const elicitation=async(request:PendingRequest):Promise<Json>=>{
    const schema=request.params.requestedSchema||request.params.schema||{},content:Json={};
    if(request.params.url){const choice=await vscode.window.showInformationMessage(String(request.params.message||'MCP 请求打开认证页面'),{modal:true},'打开页面');if(choice!=='打开页面')return {action:'cancel'};const u=vscode.Uri.parse(request.params.url);if(!['https','http'].includes(u.scheme))throw Error('MCP 认证页面地址无效。');await vscode.env.openExternal(u);return {action:'accept'};}
    for(const [key,raw] of Object.entries(schema.properties||{})){
      const field=raw as Json;let value:string|undefined;
      if(field.enum)value=await vscode.window.showQuickPick(field.enum.map(String),{title:field.title||key,placeHolder:field.description});
      else if(field.type==='boolean')value=await vscode.window.showQuickPick(['true','false'],{title:field.title||key});
      else value=await vscode.window.showInputBox({title:field.title||key,prompt:field.description||String(request.params.message||''),password:field.format==='password',ignoreFocusOut:true});
      if(value===undefined)return {action:'cancel'};
      if(field.type==='number'||field.type==='integer'){const n=Number(value);if(!Number.isFinite(n))throw Error('请输入有效数字。');content[key]=n;}else if(field.type==='boolean')content[key]=value==='true';else content[key]=value;
    }
    return {action:'accept',content};
  };
  const approve=async(message:UiAction)=>{
    const request=state.pending.find(p=>p.id===message.id);if(!request||!engine)throw Error('该请求已结束。');
    let result:Json;const decision=message.decision;
    if(request.method==='tool/requestUserInput'){
      if(decision!=='answers'||!message.answers)throw Error('请填写问题后提交。');result={answers:message.answers};
    }else if(request.method==='mcpServer/elicitation/request')result=decision==='accept'?await elicitation(request):{action:decision==='decline'?'decline':'cancel'};
    else if(request.method==='item/permissions/requestApproval')result=decision==='accept'||decision==='acceptForSession'?{permissions:request.params.permissions,scope:decision==='acceptForSession'?'session':'turn'}:{permissions:{},scope:'turn'};
    else if(['item/commandExecution/requestApproval','item/fileChange/requestApproval','execCommandApproval','applyPatchApproval'].includes(request.method)){
      if(!['accept','acceptForSession','decline','cancel'].includes(decision))throw Error('审批选项无效。');
      if(request.params.availableDecisions&&!request.params.availableDecisions.some((d:any)=>d===decision))throw Error('该审批不支持此选项。');result={decision};
    }else throw Error(`暂不支持此请求：${request.method}，请停止当前轮次。`);
    engine.respond(request.id,result);state.pending=state.pending.filter(p=>p.id!==request.id);post();
  };
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('apeiria-code-diff',{provideTextDocumentContent(uri){return diffDocuments.get(uri.toString())||'';}}));
  const virtual=(name:string,text:string)=>{const uri=vscode.Uri.from({scheme:'apeiria-code-diff',path:`/${crypto.randomUUID()}/${name}`});diffDocuments.set(uri.toString(),text);return uri;};
  const openDiff=async(itemId:string,index:number)=>{
    const item=state.items.find(i=>i.id===itemId),change=item?.changes?.[index];if(!change)throw Error('找不到文件差异。');
    const file=path.resolve(workspace,change.path),after=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
    let before=change.kind?.type==='add'?'':beforeFromDiff(after,change.diff||'');
    if(change.kind?.type==='delete')before=(change.diff||'').split('\n').filter((l:string)=>l.startsWith('-')&&!l.startsWith('---')).map((l:string)=>l.slice(1)).join('\n');
    if(before===null){await vscode.window.showTextDocument(await vscode.workspace.openTextDocument({content:change.diff||'没有可显示的差异。',language:'diff'}));return;}
    await vscode.commands.executeCommand('vscode.diff',virtual('before-'+path.basename(file),before),virtual('after-'+path.basename(file),after),path.basename(file));
  };
  const openMcp=async()=>{
    const file=path.join(home,'config.toml');if(!fs.existsSync(file))fs.writeFileSync(file,'# Apeiria Code 独立 MCP 配置。保存后点击重新连接内核。\n# [mcp_servers.example]\n# command = "node"\n# args = ["/path/to/server.js"]\n');
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(file));notice('编辑此独立配置中的 mcp_servers，保存后重新连接内核。');
  };
  const openSkills=async()=>{const dir=path.join(home,'skills');fs.mkdirSync(dir,{recursive:true});await vscode.commands.executeCommand('revealFileInOS',vscode.Uri.file(dir));notice('每个技能使用独立文件夹与 SKILL.md；项目技能继续从当前项目读取。');};
  const exportSummary=async()=>{const target=await vscode.window.showSaveDialog({defaultUri:vscode.Uri.file(path.join(workspace,'apeiria-handoff.md')),filters:{Markdown:['md']}});if(target)await vscode.workspace.fs.writeFile(target,Buffer.from(`# Apeiria Code 对话移交\n\n${transcript(state.items)}\n`));};
  const handle=async(message:UiAction,view:vscode.Webview)=>{
    if(!message||typeof message.action!=='string')return;
    let data:unknown;
    try{
      switch(message.action){
        case 'ready':readyViews.add(view);await refresh();if(navigation){await view.postMessage({type:'navigate',page:navigation});navigation=undefined;}if(store.models().length){await ensureEngine();await refreshThreads();const id=context.workspaceState.get<string>('threadId');if(id&&!state.threadId)try{await resume(id);}catch(error){notice(store.safeError(error),true);}}break;
        case 'newThread':assertIdle();state.threadId=null;state.items=[];state.attachments=[];await context.workspaceState.update('threadId',undefined);post();break;
        case 'selectThread':await resume(message.id);break;
        case 'send':await send(message.text);break;
        case 'stop':await stop();break;
        case 'selectModel':{assertIdle();const model=store.models().find(m=>m.id===message.model);if(!model)throw Error('模型不可用。');state.model=model.id;state.effort=model.efforts.includes(message.effort)?message.effort:model.efforts[0];await context.workspaceState.update('model',state.model);await context.workspaceState.update('effort',state.effort);post();break;}
        case 'saveProvider':data={id:await store.save(message.draft)};await engine?.updateCatalog(store.catalog());await refresh();notice('渠道已保存；保存未发送模型请求。');break;
        case 'removeProvider':await store.remove(message.id);await engine?.updateCatalog(store.catalog());await refresh();break;
        case 'toggleProvider':await store.toggle(message.id);await engine?.updateCatalog(store.catalog());await refresh();break;
        case 'testProvider':data={message:await store.test(message.draft)};notice((data as Json).message);break;
        case 'importJson':{const files=await vscode.window.showOpenDialog({canSelectMany:false,filters:{JSON:['json']},title:'导入 Google 服务账号 JSON'});if(files?.[0]){if(fs.statSync(files[0].fsPath).size>128000)throw Error('JSON 文件过大。');const json=fs.readFileSync(files[0].fsPath,'utf8'),value=JSON.parse(json);data={json,project:value.project_id};}break;}
        case 'attachFiles':await attachFiles();break;case 'attachSelection':await attachSelection();break;
        case 'removeAttachment':state.attachments=state.attachments.filter(a=>a.id!==message.id);post();break;
        case 'approval':await approve(message);break;
        case 'renameThread':if(!engine||typeof message.name!=='string'||!message.name.trim())throw Error('请填写聊天名称。');await engine.rpc('thread/name/set',{threadId:message.id,name:message.name.trim().slice(0,200)});await refreshThreads();break;
        case 'archiveThread':assertIdle();if(engine){await engine.rpc('thread/archive',{threadId:message.id});if(state.threadId===message.id){state.threadId=null;state.items=[];await context.workspaceState.update('threadId',undefined);}await refreshThreads();}break;
        case 'openDiff':await openDiff(message.itemId,Number(message.index)||0);break;
        case 'openFile':await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(vscode.Uri.file(path.resolve(workspace,message.path))));break;
        case 'exportSummary':await exportSummary();break;
        case 'compact':assertIdle();if(!state.threadId)throw Error('请先开始对话。');state.busy=true;stopRequested=false;interruptSentFor=undefined;post();try{await (await ensureEngine()).rpc('thread/compact/start',{threadId:state.threadId});}catch(error){state.busy=false;post();throw error;}break;
        case 'openMcp':await openMcp();break;case 'openSkills':await openSkills();break;
        case 'refreshUsage':await refresh();break;
        case 'setPermissions':assertIdle();if(!['workspace-write','read-only'].includes(message.permissions))throw Error('权限选项无效。');state.permissions=message.permissions;await vscode.workspace.getConfiguration('apeiriaCode').update('permissions',state.permissions,vscode.ConfigurationTarget.Workspace);post();break;
        case 'retryEngine':await restart();break;
        default:throw Error('未知的界面操作。');
      }
      if(message.requestId)await view.postMessage({type:'result',requestId:message.requestId,ok:true,data});
    }catch(error){const text=store.safeError(error);notice(text,true);if(message.requestId)await view.postMessage({type:'result',requestId:message.requestId,ok:false,message:text});}
  };
  const attach=(view:vscode.Webview)=>{
    views.add(view);view.options={enableScripts:true,localResourceRoots:[vscode.Uri.file(path.join(context.extensionPath,'dist'))]};
    const uri=(name:string)=>view.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath,'dist',name))).toString();
    view.html=webviewHtml(uri('webview.js'),uri('webview.css'),view.cspSource,crypto.randomBytes(20).toString('hex'));
    context.subscriptions.push(view.onDidReceiveMessage(m=>{if(['send','stop','approval'].includes(m?.action))void handle(m,view);else actionQueue=actionQueue.then(()=>handle(m,view),()=>handle(m,view));}));
  };
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('apeiriaCode.chat',{resolveWebviewView(view){attach(view.webview);view.onDidDispose(()=>{views.delete(view.webview);readyViews.delete(view.webview);});}},{webviewOptions:{retainContextWhenHidden:true}}));
  const open=async()=>{await vscode.commands.executeCommand('workbench.view.extension.apeiriaCode');await vscode.commands.executeCommand('apeiriaCode.chat.focus');};
  const command=(name:string,fn:()=>Promise<unknown>)=>context.subscriptions.push(vscode.commands.registerCommand('apeiriaCode.'+name,async()=>{try{await fn();}catch(error){void vscode.window.showErrorMessage(store.safeError(error));}}));
  command('open',open);command('settings',async()=>{navigation='settings';await open();for(const view of readyViews){await view.postMessage({type:'navigate',page:'settings'});navigation=undefined;}});
  command('newThread',async()=>{assertIdle();state.threadId=null;state.items=[];await context.workspaceState.update('threadId',undefined);await open();post();});
  command('attachSelection',async()=>{await attachSelection();await open();});command('openMcp',openMcp);command('openSkills',openSkills);command('restart',restart);
  const timer=setInterval(()=>{if(views.size&&!state.busy)void refresh().catch(()=>{});},20000);timer.unref();
  let disposeTask:Promise<void>|undefined;
  const cleanup=()=>disposeTask||=(async()=>{closed=true;clearInterval(timer);if(publishing)clearTimeout(publishing);await starting?.catch(()=>{});try{await engine?.dispose();}finally{await bridge?.close();bridge=undefined;diffDocuments.clear();readyViews.clear();views.clear();}})();
  shutdown=cleanup;context.subscriptions.push({dispose(){void cleanup().catch(()=>{});}});
}
