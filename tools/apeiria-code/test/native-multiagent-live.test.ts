import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {Engine} from '../src/engine.ts';
import {ProviderStore} from '../src/providers.ts';
import {createBridge} from '../src/bridge.ts';
import {applyNativeModelBaseline} from '../src/native-models.ts';
import {ResponseEmitter} from '../src/conversion.ts';
import type {Json} from '../src/types.ts';

const packageRoot=fileURLToPath(new URL('..',import.meta.url)),cli=path.join(packageRoot,'engine','windows-x86_64','codex.exe'),baselinePath=path.join(packageRoot,'engine','native-model-baseline.json');

type Protocol='responses'|'chat-completions'|'vertex';
for(const protocol of ['responses','chat-completions','vertex']as Protocol[])test(`native multi-agent v2 sends a real child task and answer through ${protocol}`,{skip:process.platform!=='win32'||!fs.existsSync(cli)||!fs.existsSync(baselinePath),timeout:90000},async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-multiagent-')),workspace=path.join(root,'workspace'),home=path.join(root,'engine-home'),data=path.join(root,'data');fs.mkdirSync(workspace);fs.mkdirSync(home);fs.mkdirSync(data);
  const requests:Json[]=[],events:Json[]=[],errors:string[]=[],secrets=new Map<string,string>();let engine!:Engine,bridge!:Awaited<ReturnType<typeof createBridge>>;
  const childTask='NATIVE_CHILD_REQUEST: Return your local fixture result to the parent.',childEvidence='child-result-through-private-provider-71a2';
  let parentRound=0,childRequests=0,childComplete=false,waitIssued=false,parentSawChild=false,heldChild:{response:http.ServerResponse;body:Json}|undefined;
  const messages=(body:Json):Json[]=>protocol==='responses'?body.input:protocol==='chat-completions'?body.messages:body.contents;
  const functions=(body:Json):Json[]=>protocol==='responses'?body.tools.find((tool:Json)=>tool.type==='namespace'&&tool.name==='collaboration')?.tools||[]:protocol==='chat-completions'?body.tools.map((tool:Json)=>tool.function):body.tools?.[0]?.functionDeclarations||[];
  const lookup=(body:Json,name:string)=>functions(body).find((tool:Json)=>protocol==='responses'?tool.name===name:tool.name.startsWith(`collaboration_${name}_`));
  const finish=(response:http.ServerResponse,body:Json,text?:string,tool?:{name:string;args:Json})=>{
    if(protocol==='responses'){
      const emitter=new ResponseEmitter(body.model,event=>response.write(`data: ${JSON.stringify(event)}\n\n`));emitter.start();
      if(tool)emitter.tool({name:tool.name,namespace:'collaboration',wireName:tool.name,custom:false,parameters:lookup(body,tool.name)?.parameters||{}},tool.args);else emitter.text(text!);
      emitter.finish({input_tokens:100,output_tokens:5,total_tokens:105});
    }else if(protocol==='chat-completions'){
      const delta=tool?{tool_calls:[{index:0,id:`call-multiagent-${parentRound}`,type:'function',function:{name:lookup(body,tool.name)!.name,arguments:JSON.stringify(tool.args)}}]}:{content:text};
      response.write(`data: ${JSON.stringify({choices:[{delta,finish_reason:tool?'tool_calls':'stop'}],usage:{prompt_tokens:100,completion_tokens:5,total_tokens:105}})}\n\n`);
    }else{
      const part=tool?{functionCall:{name:lookup(body,tool.name)!.name,args:tool.args},thoughtSignature:`native-multiagent-signature-${parentRound}`}:{text};
      response.write(`data: ${JSON.stringify({candidates:[{content:{parts:[part]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:5,totalTokenCount:105}})}\n\n`);
    }
    response.end();
  };
  const finishChild=()=>{
    if(!heldChild||!waitIssued)return;const {response,body}=heldChild;heldChild=undefined;
    setTimeout(()=>{finish(response,body,childEvidence);childComplete=true;},100);
  };
  const server=http.createServer(async(request,response)=>{
    try{
      let raw='';for await(const chunk of request)raw+=chunk;const body=JSON.parse(raw||'{}');requests.push(body);
      assert.equal(request.url,protocol==='responses'?'/v1/responses':protocol==='chat-completions'?'/v1/chat/completions':'/vertex');
      assert.equal(request.headers.authorization,`Bearer ${protocol==='vertex'?'google-local-fixture':'multiagent-local-fixture'}`);
      if(protocol!=='vertex')assert.equal(body.model,'native-multiagent','Child generations must retain the configured third-party model.');
      assert(!body.input?.some((item:Json)=>item.type==='agent_message'),'Native collaboration history must be normalized before reaching compatible providers.');
      const input=messages(body);assert(Array.isArray(input));
      response.writeHead(200,{'content-type':'text/event-stream'});
      const isChild=input.some((item:Json)=>item.role==='user'&&JSON.stringify(item.content||item.parts).includes('NATIVE_CHILD_REQUEST:'));
      if(isChild){childRequests++;heldChild={response,body};finishChild();return;}
      const spawn=lookup(body,'spawn_agent'),wait=lookup(body,'wait_agent');assert(spawn&&wait,'Native collaboration tools must be available.');
      const parameters=spawn.parameters||spawn.parametersJsonSchema;assert(parameters.properties.task_name&&parameters.properties.message);assert.equal(parameters.properties.agent_type,undefined,'This v2 API has no explorer/worker role selector or preset model override.');
      if(parentRound===0){
        finish(response,body,undefined,{name:'spawn_agent',args:{task_name:'fixture_child',message:childTask,fork_turns:'none'}});
      }else if(parentRound===1){
        const results=protocol==='responses'?input.filter((item:Json)=>item.type==='function_call_output'):protocol==='chat-completions'?input.filter((item:Json)=>item.role==='tool'):input.flatMap((item:Json)=>item.parts||[]).filter((part:Json)=>part.functionResponse);
        assert(results.length,'The parent must receive its real spawn result before waiting.');
        assert(JSON.stringify(results).includes('/root/fixture_child'),'The native spawn result must contain the actual child identity.');
        waitIssued=true;finish(response,body,undefined,{name:'wait_agent',args:{timeout_ms:10000}});finishChild();
      }else{
        const collaborationData=input.filter((item:Json)=>item.role==='user'||item.role==='tool'||item.type==='function_call_output');
        parentSawChild=JSON.stringify(collaborationData).includes(childEvidence);assert(parentSawChild,'The actual child answer must reach the parent model input.');
        assert(JSON.stringify(collaborationData).includes('FINAL_ANSWER'),'The parent must retain the collaboration message type.');
        assert(JSON.stringify(collaborationData).includes('/root/fixture_child'),'The parent must retain the child sender.');
        finish(response,body,'Parent received '+childEvidence);
      }
      parentRound++;
    }catch(error){errors.push(String(error));if(!response.headersSent)response.writeHead(500);response.end('{}');}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address()as{port:number}).port}`;
  const store=new ProviderStore(data,{get:async key=>secrets.get(key),store:async(key,value)=>{secrets.set(key,value);},delete:async key=>{secrets.delete(key);}});
  if(protocol==='vertex'){
    const settings=store.read();settings.providers.push({id:'local',label:'Multi-agent fixture',type:'vertex',models:['native-multiagent'],project:'fixture-project',location:'global'});fs.writeFileSync(path.join(data,'providers.json'),JSON.stringify(settings));
  }else await store.save({id:'local',label:'Multi-agent fixture',type:protocol,models:['native-multiagent'],baseUrl:origin+'/v1',apiKey:'multiagent-local-fixture'});
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8')),catalog=applyNativeModelBaseline(store.catalog(),baseline),model=catalog.models[0]!.slug;
  bridge=await createBridge({root:data,store,vertexAuth:{getToken:async()=> 'google-local-fixture',invalidate(){}}as any,fetcher:async(url:any,options:any)=>{
    const target=String(url);if(target.startsWith(origin+'/'))return fetch(target,options);
    if(/^https:\/\/(?:[a-z0-9-]+-)?aiplatform\.googleapis\.com\//.test(target)){assert(target.includes('/models/native-multiagent:'));return fetch(origin+'/vertex',options);}throw Error('Unexpected external request');
  }});
  engine=new Engine({cliPath:cli,manifestPath:path.join(packageRoot,'engine','manifest.json'),home,workspace,bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token,catalog,onEvent(method,params){events.push({method,params});},onRequest(){throw Error('Unexpected approval in the no-tool multi-agent fixture.');}});
  t.after(async()=>{if(errors.length)t.diagnostic(JSON.stringify({errors,parentRound,childRequests}));await engine?.dispose();await bridge?.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));assert(path.basename(root).startsWith('apeiria-native-multiagent-')&&path.dirname(root)===os.tmpdir());fs.rmSync(root,{recursive:true,force:true});});
  const until=async(predicate:()=>boolean)=>{for(let i=0;i<2500;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Missing multi-agent completion: '+JSON.stringify(events.slice(-4)));};
  await engine.start();const account=await engine.rpc('account/read',{refreshToken:false});assert.equal(account.account,null);assert.equal(account.requiresOpenaiAuth,false);
  const parent=await engine.rpc('thread/start',{model,modelProvider:'apeiria',cwd:workspace,historyMode:'paginated',approvalPolicy:'on-request',sandbox:'workspace-write',config:{model_catalog_json:engine.catalogPath}});
  await engine.rpc('turn/start',{threadId:parent.thread.id,model,effort:'medium',input:[{type:'text',text:'Use a child agent to return the local fixture evidence, then wait for and report its answer.'}]});
  await until(()=>events.some(event=>event.method==='turn/completed'&&event.params.threadId===parent.thread.id));
  assert.equal(events.find(event=>event.method==='turn/completed'&&event.params.threadId===parent.thread.id)?.params.turn.status,'completed');
  assert.deepEqual(errors,[]);assert.equal(parentRound,3);assert.equal(childRequests,1);assert(childComplete&&parentSawChild&&waitIssued);
  assert(!fs.existsSync(path.join(home,'auth.json')));
  t.diagnostic(JSON.stringify({protocol,requests:requests.length,parentGenerations:parentRound,childGenerations:childRequests,childAnswerReturned:parentSawChild,roleSelector:false}));
});
