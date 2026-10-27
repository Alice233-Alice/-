import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {readSettings} from '../src/config.ts';

test('visual panel imports JSON, saves encrypted API keys, meters prices and only changes reversible CLI settings',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-ui-'));
 const account=path.join(root,'account.json');fs.writeFileSync(account,JSON.stringify({type:'service_account',project_id:'fixture-project',client_email:'fixture@project.iam.gserviceaccount.com',private_key:'-----BEGIN PRIVATE KEY----- fixture'}));
 const previousRoot=process.env.CODEX_SWITCHBOARD_HOME;process.env.CODEX_SWITCHBOARD_HOME=root;
 const commands=new Map<string,()=>Promise<void>>(),state=new Map<string,unknown>(),settings=new Map<string,unknown>([['cliExecutable','C:\\fixture\\original.exe']]);const updates:string[]=[],messages:any[]=[],handlers:((m:any)=>void)[]=[],providers=new Map<string,any>(),external:string[]=[],subscriptions:any[]=[];
 const disposable={dispose(){}};
 const webview={cspSource:'vscode-webview:',html:'',options:{},asWebviewUri:(uri:any)=>uri,postMessage:async(m:any)=>{messages.push(m);return true;},onDidReceiveMessage:(fn:any)=>{handlers.push(fn);return disposable;}};
 const vscode={StatusBarAlignment:{Right:2},ConfigurationTarget:{Global:1},ViewColumn:{Active:-1},Uri:{file:(p:string)=>({toString:()=>p}),parse:(p:string)=>p},env:{openExternal:async(uri:string)=>{external.push(uri);return true;}},commands:{registerCommand:(id:string,fn:any)=>{commands.set(id,fn);return disposable;},executeCommand:async()=>{}},workspace:{getConfiguration:()=>({get:(key:string)=>settings.get(key),update:async(key:string,value:unknown)=>{updates.push(key);settings.set(key,value);}})},window:{registerWebviewViewProvider:(id:string,p:any)=>{providers.set(id,p);return disposable;},createWebviewPanel:()=>({webview,reveal(){},onDidDispose:()=>disposable,dispose(){}}),createOutputChannel:()=>({appendLine(){},clear(){},show(){},dispose(){}}),createStatusBarItem:()=>({show(){},dispose(){}}),showOpenDialog:async()=>[{fsPath:account}],showErrorMessage:(message:string)=>{throw Error(message);}}};
 const require=createRequire(import.meta.url),Module=require('node:module'),original=Module._load;
 Module._load=function(id:string,...args:any[]){if(id==='vscode')return vscode;return original.call(this,id,...args);};
 const dispatch=async(message:any)=>{
   const from=messages.length;handlers.forEach(h=>h(message));
   for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,10));const result=messages.slice(from).find(m=>m.type==='result' && m.action===message.action);if(result)return result;}
   throw Error('Panel message did not complete: '+message.action);
 };
 try{
  const extension=require('../dist/extension.cjs');
  await extension.activate({extensionPath:path.resolve('.'),extension:{packageJSON:{version:'0.2.0'}},subscriptions,globalState:{get:(k:string)=>state.get(k),update:async(k:string,v:unknown)=>{state.set(k,v);}}});
  assert.equal(providers.size,0);await commands.get('codexModels.manage')!();assert.match(webview.html,/Content-Security-Policy/);assert(!webview.html.includes('unsafe-inline'));
  assert((await dispatch({action:'ready'})).ok);
  assert((await dispatch({action:'chooseJson'})).ok);assert(!JSON.stringify(messages).includes('PRIVATE KEY'));
  const form={id:'',type:'vertex',label:'Vertex',credentialsFile:account,project:'fixture-project',location:'global',models:'gemini-4-argon'};
  assert((await dispatch({action:'saveProvider',form})).ok);const p=readSettings(root).providers[0];assert.equal(p.credentialsFile,account);assert(!fs.readFileSync(path.join(root,'providers.json'),'utf8').includes('PRIVATE KEY'));
  assert(!(await dispatch({action:'saveProvider',form:{...form,credentialsFile:'C:\\arbitrary.json'}})).ok);assert.equal(readSettings(root).providers.length,1);
  assert((await dispatch({action:'billing',id:p.id})).ok);assert.match(external[0],/^https:\/\/console.cloud.google.com\/billing\?project=fixture-project$/);
  const apiForm={id:'',type:'responses',label:'Fixture API',baseUrl:'https://example.com/v1',models:'fixture-model',apiKey:'fixture-secret-key',reasoning:{'fixture-model':'low-medium-high-xhigh'}};
  assert((await dispatch({action:'saveProvider',form:apiForm})).ok);const api=readSettings(root).providers[1];assert(api.encryptedKey);assert(!JSON.stringify(messages).includes('fixture-secret-key'));assert(!JSON.stringify(messages).includes(api.encryptedKey!));
  assert((await dispatch({action:'saveProvider',form:{...apiForm,id:api.id,apiKey:''}})).ok);assert.equal(readSettings(root).providers[1].encryptedKey,api.encryptedKey);
  assert.deepEqual(readSettings(root).providers[1].reasoning,apiForm.reasoning);
  assert((await dispatch({action:'savePrice',model:`thirdparty/${p.id}/gemini-4-argon`,price:{currency:'USD',input:2,output:10,monthlyBudget:20}})).ok);
  assert((await dispatch({action:'enable'})).ok);assert.match(String(settings.get('cliExecutable')),/codex-switchboard.exe$/);assert.equal(state.get('previousCli'),'C:\\fixture\\original.exe');
  assert((await dispatch({action:'disable'})).ok);assert.equal(settings.get('cliExecutable'),'C:\\fixture\\original.exe');assert(updates.every(k=>k==='cliExecutable'));
  assert((await dispatch({action:'toggleProvider',id:p.id})).ok);assert.equal(readSettings(root).providers[0].enabled,false);
  assert((await dispatch({action:'removeProvider',id:p.id})).ok);assert.equal(readSettings(root).providers.length,1);
  settings.set('cliExecutable','C:\\Users\\fixture\\.vscode\\extensions\\ayanami-local.codex-model-switchboard-0.1.0\\dist\\codex-switchboard.exe');state.set('previousCli','C:\\fixture\\original.exe');
  await extension.activate({extensionPath:path.resolve('.'),extension:{packageJSON:{version:'0.2.0'}},subscriptions,globalState:{get:(k:string)=>state.get(k),update:async(k:string,v:unknown)=>{state.set(k,v);}}});
  assert.equal(settings.get('cliExecutable'),path.join(root,'runtime','codex-switchboard.exe'));assert.equal(state.get('previousCli'),'C:\\fixture\\original.exe');await commands.get('codexModels.disable')!();assert.equal(settings.get('cliExecutable'),'C:\\fixture\\original.exe');
 }finally{for(const item of subscriptions)item.dispose();Module._load=original;if(previousRoot===undefined)delete process.env.CODEX_SWITCHBOARD_HOME;else process.env.CODEX_SWITCHBOARD_HOME=previousRoot;}
});
