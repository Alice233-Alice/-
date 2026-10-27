import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {Engine} from '../src/engine.ts';
import {ProviderStore} from '../src/providers.ts';
import {createBridge} from '../src/bridge.ts';
import type {Json} from '../src/types.ts';

const packageRoot=fileURLToPath(new URL('..',import.meta.url));
const cli=path.join(packageRoot,'engine','windows-x86_64','codex.exe');
function sse(res:http.ServerResponse,events:Json[]){res.writeHead(200,{'content-type':'text/event-stream'});for(const event of events)res.write(`data: ${JSON.stringify(event)}\n\n`);res.end();}
function native(res:http.ServerResponse,model:string,output:Json[]){
  const response={id:'resp_fixture_'+Math.random().toString(16).slice(2),object:'response',created_at:Math.floor(Date.now()/1000),status:'completed',model,output,error:null,incomplete_details:null,usage:{input_tokens:20,output_tokens:5,total_tokens:25}};
  const events:Json[]=[{type:'response.created',response:{...response,status:'in_progress',output:[]}}];
  output.forEach((item,index)=>{events.push({type:'response.output_item.added',output_index:index,item});if(item.type==='message')events.push({type:'response.output_text.delta',item_id:item.id,output_index:index,content_index:0,delta:item.content[0].text});events.push({type:'response.output_item.done',output_index:index,item});});
  events.push({type:'response.completed',response});sse(res,events.map((e,sequence_number)=>({...e,sequence_number})));
}

test('bundled engine with real store and bridge: Responses, Chat and Vertex tools, same-thread switching and history restart',{skip:process.platform!=='win32'||!fs.existsSync(cli),timeout:120000},async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-providers-engine-')),workspace=path.join(directory,'workspace'),home=path.join(directory,'engine-home'),data=path.join(directory,'data');fs.mkdirSync(workspace);
  const secrets=new Map<string,string>(),requests:Json[]=[],notifications:Json[]=[],approvals:Json[]=[];
  const waiting:{method:string;resolve:(p:Json)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}[]=[];
  let engine!:Engine,bridge!:Awaited<ReturnType<typeof createBridge>>,round=0;
  const commandArgs=(name:string)=>({[name.includes('exec_command')?'cmd':'command']:'Write-Output apeiria-provider-tool',workdir:workspace,sandbox_permissions:'require_escalated',justification:'Run local provider bridge fixture.'});
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');requests.push({path:req.url,headers:req.headers,body});
    if(req.url==='/v1/responses'){
      assert.equal(req.headers.authorization,'Bearer responses-fixture-key');
      native(res,body.model,[{id:'msg_native_'+round++,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Responses bridge works',annotations:[]}]}]);return;
    }
    if(req.url==='/v1/chat/completions'){
      assert.equal(req.headers.authorization,'Bearer chat-fixture-key');const last=body.messages.at(-1);
      if(last?.role==='user'&&JSON.stringify(last.content).includes('[chat-tool]')){
        const tool=body.tools.find((tool:Json)=>/exec_command|shell_command/.test(tool.function.name));assert(tool,'CLI did not expose a shell tool convertible to Chat Completions');
        sse(res,[{choices:[{delta:{tool_calls:[{index:0,function:{name:tool.function.name,arguments:JSON.stringify(commandArgs(tool.function.name))}}]},finish_reason:'tool_calls'}]}]);return;
      }
      sse(res,[{choices:[{delta:{content:'Chat tool round trip works'},finish_reason:'stop'}],usage:{prompt_tokens:20,completion_tokens:5,total_tokens:25}}]);return;
    }
    if(req.url==='/vertex'){
      assert.equal(req.headers.authorization,'Bearer google-fixture-token');const last=body.contents.at(-1);
      if(last?.role==='user'&&last.parts.some((part:Json)=>part.text?.includes('[vertex-tool]'))){
        const tool=body.tools[0].functionDeclarations.find((tool:Json)=>/exec_command|shell_command/.test(tool.name));assert(tool,'CLI shell tool did not convert to Vertex');
        sse(res,[{candidates:[{content:{parts:[{functionCall:{name:tool.name,args:commandArgs(tool.name)},thoughtSignature:'native-fixture-signature'}]},finishReason:'STOP'}]}]);return;
      }
      sse(res,[{candidates:[{content:{parts:[{text:'Vertex tool round trip works'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:20,candidatesTokenCount:5,totalTokenCount:25}}]);return;
    }
    res.writeHead(404).end('{}');
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const store=new ProviderStore(data,{get:async k=>secrets.get(k),store:async(k,v)=>{secrets.set(k,v);},delete:async k=>{secrets.delete(k);}});
  await store.save({id:'responses',label:'Responses',type:'responses',models:['responses-model'],baseUrl:origin+'/v1',apiKey:'responses-fixture-key'});
  await store.save({id:'chat',label:'Chat',type:'chat-completions',models:['chat-model'],baseUrl:origin+'/v1',apiKey:'chat-fixture-key'});
  // The OAuth signing flow is covered separately. This fixture isolates the native Gemini wire path.
  const config=store.read();config.providers.push({id:'vertex',label:'Vertex',type:'vertex',models:['gemini-4-argon'],project:'fixture-project',location:'global'});
  fs.writeFileSync(path.join(data,'providers.json'),JSON.stringify(config));
  const connect=async()=>{
    bridge=await createBridge({root:data,store,vertexAuth:{getToken:async()=> 'google-fixture-token',invalidate(){}} as any,fetcher:async(url:any,options:any)=>{
      const target=String(url);if(target.startsWith(origin+'/'))return fetch(target,options);if(/^https:\/\/(?:[a-z0-9-]+-)?aiplatform\.googleapis\.com\//.test(target))return fetch(origin+'/vertex',options);throw Error('Unexpected external request: '+target);
    }});
    engine=new Engine({cliPath:cli,manifestPath:path.join(packageRoot,'engine','manifest.json'),home,workspace,bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token,catalog:store.catalog(),onEvent(method,params){notifications.push({method,params});for(const w of [...waiting])if(w.method===method){waiting.splice(waiting.indexOf(w),1);clearTimeout(w.timer);w.resolve(params);}},onRequest(id,method,params){approvals.push({method,params});engine.respond(id,{decision:'accept'});}});await engine.start();
  };
  const wait=(method:string)=>new Promise<Json>((resolve,reject)=>{const timer=setTimeout(()=>{reject(Error('Missing '+method+'; recent='+JSON.stringify(notifications.slice(-4))+' requests='+JSON.stringify(requests.map(r=>({path:r.path,model:r.body.model,tools:r.body.tools?.map((a:Json)=>a.name||a.type)})))));},20000);waiting.push({method,resolve,reject,timer});});
  t.after(async()=>{for(const w of waiting)clearTimeout(w.timer);await engine?.dispose();await bridge?.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));assert(path.resolve(directory).startsWith(path.join(path.resolve(os.tmpdir()),'apeiria-providers-engine-')));fs.rmSync(directory,{recursive:true,force:true});});
  await connect();const account=await engine.rpc('account/read',{refreshToken:false});assert.equal(account.account,null);assert.equal(account.requiresOpenaiAuth,false);
  const started=await engine.rpc('thread/start',{model:'thirdparty/responses/responses-model',modelProvider:'apeiria',cwd:workspace,historyMode:'paginated',allowProviderModelFallback:false,config:{model_catalog_json:engine.catalogPath}}),threadId=started.thread.id;
  for(const [model,text] of [['thirdparty/responses/responses-model','Responses greeting'],['thirdparty/chat/chat-model','[chat-tool] Run the fixture command.'],['thirdparty/vertex/gemini-4-argon','[vertex-tool] Run the fixture command.']]){
    if(model!=='thirdparty/responses/responses-model')await engine.rpc('thread/resume',{threadId,model,modelProvider:'apeiria',cwd:workspace,excludeTurns:true,approvalPolicy:'on-request',sandbox:'workspace-write',config:{model_catalog_json:engine.catalogPath}});
    const done=wait('turn/completed');await engine.rpc('turn/start',{threadId,model,effort:'medium',input:[{type:'text',text}]});const completed=await done;assert.equal(completed.turn.status,'completed',JSON.stringify(completed));
  }
  assert(requests.some(r=>r.path==='/v1/chat/completions'&&r.body.messages.some((m:Json)=>m.role==='tool')));
  assert(requests.some(r=>r.path==='/vertex'&&r.body.contents.some((c:Json)=>c.parts.some((p:Json)=>p.functionResponse))));
  assert(approvals.length>=2,'Both converted providers must complete a real approved CLI tool loop');
  assert(!JSON.stringify(requests).includes(bridge.token));assert(!fs.existsSync(path.join(home,'auth.json')));
  const compacted=wait('turn/completed');await engine.rpc('thread/compact/start',{threadId});assert.equal((await compacted).turn.status,'completed');
  const before=await engine.rpc('thread/turns/list',{threadId,sortDirection:'asc',itemsView:'full'});assert(before.data.length>=3);
  await engine.dispose();await bridge.close();await connect();await engine.rpc('thread/resume',{threadId,modelProvider:'apeiria',cwd:workspace,excludeTurns:true});const restored=await engine.rpc('thread/turns/list',{threadId,sortDirection:'asc',itemsView:'full'});assert.equal(restored.data.length,before.data.length);
  const continued=wait('turn/completed');await engine.rpc('turn/start',{threadId,model:'thirdparty/vertex/gemini-4-argon',input:[{type:'text',text:'Continue after compaction and process restart.'}]});assert.equal((await continued).turn.status,'completed');
  assert(!JSON.stringify(requests).includes('apeiria-compact:v1:'));
  t.diagnostic(JSON.stringify({upstreamRequests:requests.length,approvals:approvals.length,protocols:[...new Set(requests.map(r=>r.path))],restoredTurns:restored.data.length}));
});
