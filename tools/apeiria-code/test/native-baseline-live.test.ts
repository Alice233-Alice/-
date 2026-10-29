import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {Engine} from '../src/engine.ts';
import {ProviderStore} from '../src/providers.ts';
import {createBridge} from '../src/bridge.ts';
import {applyNativeModelBaseline} from '../src/native-models.ts';
import {ResponseEmitter} from '../src/conversion.ts';
import type {Json} from '../src/types.ts';

const packageRoot=path.resolve('.'),cli=path.join(packageRoot,'engine','windows-x86_64','codex.exe'),baselinePath=path.join(packageRoot,'engine','native-model-baseline.json');
function sse(response:http.ServerResponse,events:Json[]){response.writeHead(200,{'content-type':'text/event-stream'});for(const event of events)response.write(`data: ${JSON.stringify(event)}\n\n`);response.end();}

test('native binary model baseline runs all three protocols with full instructions and native code-mode tools',{skip:process.platform!=='win32'||!fs.existsSync(cli)||!fs.existsSync(baselinePath),timeout:120000},async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-baseline-')),workspace=path.join(root,'workspace'),home=path.join(root,'engine-home'),data=path.join(root,'data');fs.mkdirSync(workspace);fs.mkdirSync(home);
  const secrets=new Map<string,string>(),requests:Json[]=[],events:Json[]=[],approvals:Json[]=[],errors:string[]=[],rounds=new Map<string,number>(),completedTools=new Set<string>();
  const code=(protocol:string)=>`const result = await tools.exec_command(${JSON.stringify({cmd:`Write-Output native-code-mode-${protocol}`,workdir:workspace,sandbox_permissions:'require_escalated',justification:'Local native code-mode approval fixture.',max_output_tokens:1000})}); text(result.output);`;
  let engine!:Engine,bridge!:Awaited<ReturnType<typeof createBridge>>;
  const server=http.createServer(async(request,response)=>{
    try{
      let raw='';for await(const chunk of request)raw+=chunk;const body=JSON.parse(raw||'{}');requests.push({path:request.url,body});
      const protocol=request.url==='/v1/responses'?'responses':request.url==='/v1/chat/completions'?'chat':request.url==='/vertex'?'vertex':null;
      if(!protocol){response.writeHead(404).end('{}');return;}
      assert.equal(request.headers.authorization,`Bearer ${protocol==='vertex'?'google-local-fixture':protocol+'-local-fixture'}`,'Only the selected provider credential may reach its upstream.');
      const round=rounds.get(protocol)||0;rounds.set(protocol,round+1);
      if(round>0){
        const toolResults=protocol==='responses'?body.input?.filter((item:Json)=>item.type==='custom_tool_call_output'):protocol==='chat'?body.messages?.filter((item:Json)=>item.role==='tool'):body.contents?.flatMap((content:Json)=>content.parts||[]).filter((part:Json)=>part.functionResponse);
        assert(JSON.stringify(toolResults).includes(`native-code-mode-${protocol}`),`${protocol} did not receive the executed command result: ${JSON.stringify(toolResults)}`);completedTools.add(protocol);
      }
      if(protocol==='responses'){
        response.writeHead(200,{'content-type':'text/event-stream'});const emitter=new ResponseEmitter(body.model,event=>response.write(`data: ${JSON.stringify(event)}\n\n`));emitter.start();
        if(round===0){assert(body.tools.some((tool:Json)=>tool.type==='custom'&&tool.name==='exec'));emitter.tool({name:'exec',wireName:'exec',custom:true,parameters:{}},{input:code(protocol)});}else emitter.text('Native baseline Responses OK');
        emitter.finish({input_tokens:100,output_tokens:5,total_tokens:105});response.end();return;
      }
      if(protocol==='chat'){
        const exec=body.tools.find((tool:Json)=>tool.function.description?.startsWith('Run JavaScript code to orchestrate/compose tool calls'));assert(exec,'Code-mode exec must be offered through Chat Completions.');
        sse(response,[{choices:[{delta:round===0?{tool_calls:[{index:0,id:'call-native-chat',type:'function',function:{name:exec.function.name,arguments:JSON.stringify({input:code(protocol)})}}]}:{content:'Native baseline Chat OK'},finish_reason:round===0?'tool_calls':'stop'}],usage:{prompt_tokens:100,completion_tokens:5,total_tokens:105}}]);return;
      }
      const exec=body.tools?.[0]?.functionDeclarations?.find((tool:Json)=>tool.description?.startsWith('exec\nRun JavaScript code to orchestrate/compose tool calls'));assert(exec,'Code-mode exec must be offered through Vertex.');
      sse(response,[{candidates:[{content:{parts:[round===0?{functionCall:{name:exec.name,args:{input:code(protocol)}},thoughtSignature:'native-baseline-code-signature'}:{text:'Native baseline Vertex OK'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:5,totalTokenCount:105}}]);return;
    }catch(error){errors.push(String(error));response.writeHead(500).end('{}');}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address()as{port:number}).port}`;
  const store=new ProviderStore(data,{get:async key=>secrets.get(key),store:async(key,value)=>{secrets.set(key,value);},delete:async key=>{secrets.delete(key);}});
  await store.save({id:'responses',label:'Responses',type:'responses',models:['native-responses'],baseUrl:origin+'/v1',apiKey:'responses-local-fixture'});
  await store.save({id:'chat',label:'Chat',type:'chat-completions',models:['native-chat'],baseUrl:origin+'/v1',apiKey:'chat-local-fixture'});
  const settings=store.read();settings.providers.push({id:'vertex',label:'Vertex',type:'vertex',models:['gemini-fixture'],project:'fixture-project',location:'global'});fs.writeFileSync(path.join(data,'providers.json'),JSON.stringify(settings));
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')),catalog=applyNativeModelBaseline(store.catalog(),baseline);
  for(const model of catalog.models){assert.equal(model.tool_mode,'code_mode_only');assert.equal(model.multi_agent_version,'v2');assert.equal(model.model_messages.instructions_template,baseline.model.model_messages.instructions_template);assert.equal(model.base_instructions,undefined);}
  bridge=await createBridge({root:data,store,vertexAuth:{getToken:async()=> 'google-local-fixture',invalidate(){}}as any,fetcher:async(url:any,options:any)=>{
    const target=String(url);if(target.startsWith(origin+'/'))return fetch(target,options);if(/^https:\/\/(?:[a-z0-9-]+-)?aiplatform\.googleapis\.com\//.test(target))return fetch(origin+'/vertex',options);throw Error('Unexpected external request: '+target);
  }});
  engine=new Engine({cliPath:cli,manifestPath:path.join(packageRoot,'engine','manifest.json'),home,workspace,bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token,catalog,onEvent(method,params){events.push({method,params});},onRequest(id,method,params){approvals.push({method,params});engine.respond(id,{decision:'accept'});}});
  t.after(async()=>{await engine?.dispose();await bridge?.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true});});
  const until=async(predicate:()=>boolean)=>{for(let i=0;i<2500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Missing native baseline event: '+JSON.stringify(events.slice(-5)));};
  await engine.start();const account=await engine.rpc('account/read',{refreshToken:false});assert.equal(account.account,null);assert.equal(account.requiresOpenaiAuth,false);
  for(const model of catalog.models){
    const thread=await engine.rpc('thread/start',{model:model.slug,modelProvider:'apeiria',cwd:workspace,historyMode:'paginated',approvalPolicy:'on-request',sandbox:'workspace-write',config:{model_catalog_json:engine.catalogPath}});
    const count=events.filter(event=>event.method==='turn/completed').length;
    await engine.rpc('turn/start',{threadId:thread.thread.id,model:model.slug,effort:'medium',input:[{type:'text',text:'A short local baseline greeting.'}]});
    await until(()=>events.filter(event=>event.method==='turn/completed').length>count);
    assert.equal(events.filter(event=>event.method==='turn/completed').at(-1)?.params.turn.status,'completed',JSON.stringify(events.slice(-5)));
  }
  assert.deepEqual(errors,[]);
  const raw=requests.find(request=>request.path==='/v1/responses')!.body;
  const instructions=raw.instructions||raw.input.find((item:Json)=>item.role==='developer'&&item.content?.[0]?.text?.startsWith('You are Codex'))?.content[0].text;
  assert(instructions?.length>10000,'The embedded native instructions must reach the provider.');
  assert(raw.tools.length>0);
  assert.deepEqual([...completedTools].sort(),['chat','responses','vertex']);
  assert(approvals.length>=3,'Each protocol must execute a real approved command.');
  assert(approvals.every(approval=>approval.method==='item/commandExecution/requestApproval'));
  t.diagnostic(JSON.stringify({upstreamRequests:requests.length,protocols:[...completedTools],instructions:instructions.length,nativeToolTypes:raw.tools.map((tool:Json)=>({type:tool.type,name:tool.name})),approvals:approvals.map(a=>a.method)}));
  assert(!fs.existsSync(path.join(home,'auth.json')));
});
