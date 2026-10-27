import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {Engine} from '../src/engine.ts';
import type {Json} from '../src/types.ts';

const root=fileURLToPath(new URL('..',import.meta.url));

function model(slug:string):Json {
  return {
    slug,display_name:slug,description:'Local smoke fixture',visibility:'list',supported_in_api:true,
    priority:0,prefer_websockets:false,support_verbosity:false,default_verbosity:'low',
    apply_patch_tool_type:'freeform',web_search_tool_type:'text',input_modalities:['text','image'],
    supports_image_detail_original:false,truncation_policy:{mode:'tokens',limit:10000},
    supports_parallel_tool_calls:true,tool_mode:'direct',multi_agent_version:null,
    multi_agent_reasoning_effort:null,use_responses_lite:false,supports_reasoning_effort_updates:false,
    include_skills_usage_instructions:false,include_apps_usage_instructions:false,include_plugin_usage_instructions:false,
    node_repl_auto_review_required:true,node_repl_disabled:true,requires_sandboxed_review:false,
    context_window:64000,max_context_window:64000,auto_compact_token_limit:null,comp_hash:'3000',
    default_reasoning_summary:'none',default_reasoning_level:'medium',
    supported_reasoning_levels:[{effort:'medium',description:'Default'}],shell_type:'shell_command',
    minimal_client_version:'0.153.0',experimental_supported_tools:[],available_in_plans:[],
    supports_search_tool:false,supports_experimental_context:false,service_tiers:[],additional_speed_tiers:[],
    supports_reasoning_summary_parameter:true,supports_reasoning_summaries:false,
    base_instructions:'You are a coding assistant. Use available tools when requested.',
  };
}

function stream(res:http.ServerResponse,output:Json[],name:string):void {
  res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});
  const response={id:'resp_'+Math.random().toString(16).slice(2),object:'response',created_at:Math.floor(Date.now()/1000),status:'completed',model:name,output,error:null,incomplete_details:null,usage:{input_tokens:10,output_tokens:5,total_tokens:15}};
  let sequence=0;
  const send=(event:Json)=>res.write(`event: ${event.type}\ndata: ${JSON.stringify({...event,sequence_number:sequence++})}\n\n`);
  send({type:'response.created',response:{...response,status:'in_progress',output:[]}});
  for(const [index,item]of output.entries()) {
    send({type:'response.output_item.added',output_index:index,item:{...item,status:'in_progress'}});
    if(item.type==='message') {
      const part=item.content[0];
      send({type:'response.content_part.added',item_id:item.id,output_index:index,content_index:0,part:{...part,text:''}});
      send({type:'response.output_text.delta',item_id:item.id,output_index:index,content_index:0,delta:part.text});
      send({type:'response.output_text.done',item_id:item.id,output_index:index,content_index:0,text:part.text});
      send({type:'response.content_part.done',item_id:item.id,output_index:index,content_index:0,part});
    }
    send({type:'response.output_item.done',output_index:index,item});
  }
  send({type:'response.completed',response});res.end();
}

test('real bundled engine: no login, streaming, approvals, tool loop, cancellation, catalog update, persistent history', {skip:process.env.APEIRIA_ENGINE_SMOKE!=='1',timeout:100_000},async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'apeiria-engine-live-'));
  const workspace=path.join(directory,'workspace'),home=path.join(directory,'private-home');
  await fs.mkdir(workspace);await fs.mkdir(home);
  await fs.writeFile(path.join(workspace,'AGENTS.md'),'Project instruction marker: apeiria-private-project.');
  for(const [base,name]of [[path.join(home,'skills'),'apeiria-personal'],[path.join(workspace,'.agents','skills'),'apeiria-project']]) {
    const skill=path.join(base!,name!);await fs.mkdir(skill,{recursive:true});
    await fs.writeFile(path.join(skill,'SKILL.md'),`---\nname: ${name}\ndescription: Local smoke test skill\n---\nUse the fixture instructions.\n`);
  }
  const globalProfile=path.join(directory,'official-profile'),globalSkill=path.join(globalProfile,'.agents','skills','official-skill');
  await fs.mkdir(globalSkill,{recursive:true});await fs.writeFile(path.join(globalSkill,'SKILL.md'),'---\nname: official-skill\ndescription: This user skill belongs to another product\n---\nOfficial global skill sentinel.');
  await fs.writeFile(path.join(home,'config.toml'),`[mcp_servers.local_fixture]\ncommand = ${JSON.stringify(process.execPath)}\nargs = [${JSON.stringify(path.join(root,'test','fixtures','engine-mcp.mjs'))}]\nstartup_timeout_sec = 10\ntool_timeout_sec = 10\n`);
  const token='smoke-local-token',requests:Json[]=[],events:Json[]=[],approvals:Json[]=[];
  const waiting:{method:string;predicate:(p:Json)=>boolean;resolve:(p:Json)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}[]=[];
  let engine:Engine,toolRound=0;
  let slowStarted:()=>void=()=>{};
  const slowRequest=new Promise<void>(resolve=>{slowStarted=resolve;});
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const part of req)raw+=part;
    const body=raw?JSON.parse(raw):{};
    requests.push({path:req.url,authorization:req.headers.authorization,body});
    if(req.url!=='/v1/responses') {res.writeHead(404,{'content-type':'application/json'}).end('{}');return;}
    const input=JSON.stringify(body.input);
    const latestUser=JSON.stringify(body.input?.filter((item:Json)=>item.role==='user').at(-1));
    if(latestUser?.includes('[slow]')) {res.writeHead(200,{'content-type':'text/event-stream'});res.write(': waiting\n\n');slowStarted();return;}
    if(input.includes('[tool]') && !input.includes('function_call_output') && toolRound++===0) {
      const toolName=body.tools.some((tool:Json)=>tool.name==='exec_command')?'exec_command':'shell_command';
      const args={workdir:workspace,sandbox_permissions:'require_escalated',justification:'Local smoke test approval.',[toolName==='exec_command'?'cmd':'command']:'Write-Output apeiria-tool-smoke'};
      stream(res,[{type:'function_call',id:'fc_smoke',call_id:'call_smoke',name:toolName,arguments:JSON.stringify(args),status:'completed'}],body.model);return;
    }
    stream(res,[{id:'msg_smoke_'+requests.length,type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Apeiria local smoke OK',annotations:[]}]}],body.model);
  });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
  const port=(server.address() as {port:number}).port;
  const catalog={models:[model('fixture-apeiria')]};
  const create=()=>new Engine({
    cliPath:path.join(root,'engine','windows-x86_64','codex.exe'),manifestPath:path.join(root,'engine','manifest.json'),
    home,workspace,bridgeUrl:`http://127.0.0.1:${port}/v1`,backendUrl:`http://127.0.0.1:${port}/backend`,token,catalog,
    onEvent(method,params) {
      events.push({method,params});
      for(const w of [...waiting])if(w.method===method && w.predicate(params)) {waiting.splice(waiting.indexOf(w),1);clearTimeout(w.timer);w.resolve(params);}
    },
    onRequest(id,method,params) {approvals.push({method,params});engine.respond(id,method==='mcpServer/elicitation/request'?{action:'accept',content:{label:'mcp-smoke'}}:{decision:'accept'});},
  });
  const wait=(method:string,predicate=(p:Json)=>true)=>new Promise<Json>((resolve,reject)=>{
    const timer=setTimeout(()=>{reject(new Error(`Missing event: ${method}. Requests=${JSON.stringify(requests.map(r=>({path:r.path,tools:r.body?.tools?.map((tool:Json)=>tool.name??tool.type)})))} Last events=${JSON.stringify(events.slice(-6))}`));},20_000);
    waiting.push({method,predicate,resolve,reject,timer});
  });
  const envKeys=['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','OPENAI_API_KEY','CODEX_HOME','USERPROFILE'];
  const previous=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{HTTP_PROXY:'http://127.0.0.1:1',HTTPS_PROXY:'http://127.0.0.1:1',ALL_PROXY:'http://127.0.0.1:1',NO_PROXY:'127.0.0.1,localhost,::1',OPENAI_API_KEY:'official-sentinel-never-send',CODEX_HOME:path.join(directory,'official-sentinel'),USERPROFILE:globalProfile});
  engine=create();
  t.after(async()=>{
    for(const w of waiting)clearTimeout(w.timer);
    await engine.dispose();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));
    for(const [key,value]of Object.entries(previous))if(value===undefined)delete process.env[key];else process.env[key]=value;
    await fs.rm(directory,{recursive:true,force:true});
  });
  await engine.start();
  const account=await engine.rpc('account/read',{refreshToken:false});
  assert.equal(account.account,null);assert.equal(account.requiresOpenaiAuth,false);
  const result=await engine.rpc('thread/start',{model:'fixture-apeiria',modelProvider:'apeiria',cwd:workspace,historyMode:'paginated',approvalPolicy:'on-request',sandbox:'workspace-write',allowProviderModelFallback:false});
  const threadId=result.thread.id;
  assert.ok(result.instructionSources.some((file:string)=>file.endsWith('AGENTS.md')));
  const skills=await engine.rpc('skills/list',{cwds:[workspace],forceReload:true});
  const names=skills.data.flatMap((entry:Json)=>entry.skills.map((skill:Json)=>skill.name));
  assert.ok(names.includes('apeiria-personal'),JSON.stringify(names));
  assert.ok(names.includes('apeiria-project'),JSON.stringify(names));
  assert.ok(!skills.data.flatMap((entry:Json)=>entry.skills).some((skill:Json)=>skill.name==='official-skill'&&skill.enabled));
  const mcp=await engine.rpc('mcpServerStatus/list',{threadId,serverName:'local_fixture'});
  assert.ok(mcp.data.some((server:Json)=>server.name==='local_fixture'&&server.tools?.echo));
  const echo=await engine.rpc('mcpServer/tool/call',{threadId,server:'local_fixture',tool:'echo',arguments:{}});
  const echoResult=JSON.parse(echo.content[0].text);
  assert.equal(echoResult.echo,'mcp-smoke');assert.equal(echoResult.officialKeyPresent,false);
  assert.ok(approvals.some(a=>a.method==='mcpServer/elicitation/request'));
  const done=wait('turn/completed');
  await engine.rpc('turn/start',{threadId,model:'fixture-apeiria',effort:'medium',input:[{type:'text',text:'A short local greeting.'}]});
  assert.equal((await done).turn.status,'completed');
  assert.ok(events.some(e=>e.method==='item/agentMessage/delta' && e.params.delta.includes('local smoke')));
  assert.ok(JSON.stringify(requests[0].body).includes('apeiria-private-project'));
  const toolDone=wait('turn/completed');
  await engine.rpc('turn/start',{threadId,input:[{type:'text',text:'[tool] Run the shell smoke command.'}]});
  assert.equal((await toolDone).turn.status,'completed');
  assert.ok(approvals.some(a=>a.method==='item/commandExecution/requestApproval'),JSON.stringify({approvals,items:events.filter(e=>e.method==='item/completed'),tools:requests.find(r=>r.path==='/v1/responses')?.body.tools?.map((tool:Json)=>tool.name)}));
  assert.ok(requests.some(r=>JSON.stringify(r.body.input).includes('function_call_output')));
  assert.ok(events.some(e=>e.method==='item/commandExecution/outputDelta'));
  const slowDone=wait('turn/completed');
  const slow=await engine.rpc('turn/start',{threadId,input:[{type:'text',text:'[slow] Wait for cancellation.'}]});
  await slowRequest;
  await engine.rpc('turn/interrupt',{threadId,turnId:slow.turn.id});
  assert.equal((await slowDone).turn.status,'interrupted');
  await engine.updateCatalog({models:[...catalog.models,model('fixture-updated')]});
  const updated=await engine.rpc('thread/start',{model:'fixture-updated',modelProvider:'apeiria',cwd:workspace,historyMode:'paginated',allowProviderModelFallback:false,config:{model_catalog_json:engine.catalogPath}});
  assert.equal(updated.model,'fixture-updated');
  const updatedDone=wait('turn/completed',p=>p.threadId===updated.thread.id);
  await engine.rpc('turn/start',{threadId:updated.thread.id,model:'fixture-updated',input:[{type:'text',text:'A greeting with the newly configured model.'}]});
  assert.equal((await updatedDone).turn.status,'completed');
  assert.ok(requests.some(r=>r.body.model==='fixture-updated'));
  const changed=await engine.rpc('thread/resume',{threadId,model:'fixture-updated',modelProvider:'apeiria',excludeTurns:true,config:{model_catalog_json:engine.catalogPath,model_context_window:128000}});
  assert.equal(changed.model,'fixture-apeiria');
  const changedDone=wait('turn/completed',p=>p.threadId===threadId);
  await engine.rpc('turn/start',{threadId,model:'fixture-updated',input:[{type:'text',text:'Continue the same dialogue with the updated model.'}]});
  assert.equal((await changedDone).turn.status,'completed');
  assert.ok(requests.filter(r=>r.body.model==='fixture-updated').length>=2);
  const unloaded=await engine.rpc('thread/unsubscribe',{threadId});
  assert.equal(unloaded.status,'unsubscribed');
  const reconfigured=await engine.rpc('thread/resume',{threadId,model:'fixture-updated',modelProvider:'apeiria',excludeTurns:true,config:{model_catalog_json:engine.catalogPath,model_context_window:128000}});
  assert.equal(reconfigured.model,'fixture-updated');
  const reconfiguredDone=wait('turn/completed',p=>p.threadId===threadId);
  await engine.rpc('turn/start',{threadId,model:'fixture-updated',input:[{type:'text',text:'Continue after reconfiguring the context capacity.'}]});
  assert.equal((await reconfiguredDone).turn.status,'completed');
  assert.ok(events.some(e=>e.method==='thread/tokenUsage/updated'&&e.params.threadId===threadId&&e.params.tokenUsage.modelContextWindow>64000));
  const compactDone=wait('turn/completed',p=>p.threadId===threadId);
  await engine.rpc('thread/compact/start',{threadId});
  assert.equal((await compactDone).turn.status,'completed');
  assert.ok(events.some(e=>e.method==='item/completed'&&e.params.item?.type==='contextCompaction'));
  const page=await engine.rpc('thread/turns/list',{threadId,sortDirection:'asc',itemsView:'full'});
  assert.ok(page.data.length>=5);
  assert.ok(page.data.some((turn:Json)=>turn.items.some((item:Json)=>item.type==='agentMessage')));
  await engine.dispose();engine=create();await engine.start();
  await engine.rpc('thread/resume',{threadId,modelProvider:'apeiria',cwd:workspace,excludeTurns:true});
  const restored=await engine.rpc('thread/turns/list',{threadId,sortDirection:'asc',itemsView:'full'});
  assert.equal(restored.data.length,page.data.length);
  assert.equal(await fs.stat(path.join(home,'auth.json')).then(()=>true,()=>false),false);
  assert.equal(await fs.stat(path.join(directory,'official-sentinel')).then(()=>true,()=>false),false);
  for(const request of requests.filter(r=>r.path==='/v1/responses'))assert.equal(request.authorization,`Bearer ${token}`);
  assert.ok(!JSON.stringify(requests).includes('official-sentinel-never-send'));
  t.diagnostic(JSON.stringify({responses:requests.filter(r=>r.path==='/v1/responses').length,backendRejected:requests.filter(r=>r.path!=='/v1/responses').map(r=>r.path),approvalCount:approvals.length,turns:page.data.length,authFileCreated:false}));
});
