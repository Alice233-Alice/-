import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {once} from 'node:events';
import {WebSocketServer} from 'ws';
import {createBridge} from '../src/bridge.ts';
import {ResponseEmitter} from '../src/conversion.ts';
import {alias,modelInfos,writeSettings} from '../src/config.ts';
import type {Json,Provider} from '../src/config.ts';
import {usageSnapshot} from '../src/usage.ts';

const codex=process.env.CODEX_SWITCHBOARD_TEST_CLI || (process.env.PATH || '').split(path.delimiter).map(p=>path.join(p,process.platform==='win32'?'codex.exe':'codex')).find(p=>fs.existsSync(p));
function stream(events:Json[]){return {async *[Symbol.asyncIterator](){for(const event of events)yield Buffer.from('data: '+JSON.stringify(event)+'\n\n');}};}
test('real Codex: permission-checked Vertex tool loop, failures, GPT switch, account and history survive', {skip:!codex,timeout:60000},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'codex-switchboard-integration-'));
 const home=path.join(root,'codex-home');fs.mkdirSync(home);
 const encode=(v:any)=>Buffer.from(JSON.stringify(v)).toString('base64url');
 const token=`${encode({alg:'RS256',typ:'JWT'})}.${encode({sub:'fixture-user',exp:Math.floor(Date.now()/1000)+86400,email:'fixture@example.invalid','https://api.openai.com/auth':{chatgpt_account_id:'fixture-account',chatgpt_plan_type:'plus',chatgpt_user_id:'fixture-user'},'https://api.openai.com/profile':{email:'fixture@example.invalid'}})}.fixture-signature`;
 const authFile=path.join(home,'auth.json');
 fs.writeFileSync(authFile,JSON.stringify({auth_mode:'chatgpt',OPENAI_API_KEY:null,tokens:{id_token:token,access_token:token,refresh_token:'fixture-refresh-token',account_id:'fixture-account'},last_refresh:new Date().toISOString()}));
 const before=fs.readFileSync(authFile);
 const provider:Provider={id:'vertex',label:'Vertex',type:'vertex',project:'fixture-project',location:'global',credentialsFile:path.join(root,'not-read.json'),models:['gemini-4-argon']};
 const settings={version:1 as const,providers:[provider]};writeSettings(settings,root);
 const catalog=JSON.parse(fs.readFileSync('test/fixtures/catalog.json','utf8'));catalog.models.push(...modelInfos(settings,catalog.models[0]));
 const catalogFile=path.join(root,'catalog.json');fs.writeFileSync(catalogFile,JSON.stringify(catalog));
 const official=http.createServer((req,res)=>{
  res.setHeader('content-type','application/json');
  if(req.url?.includes('/wham/accounts/check')){res.end(JSON.stringify({accounts:[{id:'fixture-account',workspace_backend_origin:'https://chatgpt.com',account_routing_override:'NO_CONSTRAINT'}]}));return;}
  if(req.url?.includes('/wham/config/bundle')){res.end('{}');return;}
  res.writeHead(404).end('{}');
 });
 const wss=new WebSocketServer({server:official});
 let officialRequests=0;
 wss.on('connection',(ws,req)=>{
  assert.equal(req.headers.authorization,'Bearer '+token);
  ws.on('message',data=>{
   const request=JSON.parse(data.toString());
   if(request.generate===false){ws.send(JSON.stringify({type:'response.completed',response:{id:'resp_gpt_warmup',status:'completed',model:'fixture-gpt',output:[]}}));return;}
   officialRequests++;assert.equal(request.model,'fixture-gpt');assert(!data.toString().includes('google-fixture-token'));assert(!data.toString().includes('sbcompact:v1:'),'Local ciphertext must never reach GPT');assert(data.toString().includes('fixture handoff summary'),'GPT receives the portable summary');
   const emitter=new ResponseEmitter('fixture-gpt',event=>ws.send(JSON.stringify(event)));emitter.start();emitter.text('GPT fixture OK');emitter.finish();
  });
 });
 await new Promise<void>(r=>official.listen(0,'127.0.0.1',r));
 const port=(official.address() as any).port;
 let mode='tool', vertexRequests=0, gotToolResult=false, toolOutput='',transientRequests=0,summaryRequests=0,sawResumedSummary=false;const thinkingLevels:string[]=[];
 const bridge=await createBridge({root,launcher:path.resolve('dist/codex-switchboard.exe'),upstream:`http://127.0.0.1:${port}/backend-api/codex`,catalog,
  vertexAuth:{getToken:async()=>{if(mode==='credentials')throw Error('bad credential fixture');return 'google-fixture-token';},invalidate:()=>{}} as any,
  fetcher:async(url:any,options:any)=>{
   assert(String(url).includes('aiplatform.googleapis.com'));assert.equal(options.headers.authorization,'Bearer google-fixture-token');assert(!JSON.stringify(options).includes(token));
   if(mode==='fail')return {ok:false,status:401,body:{cancel:async()=>{}}};
   if(mode==='timeout')throw Error('Vertex fixture timeout');
   if(mode==='transient'&&++transientRequests<3)return new Response(JSON.stringify({error:{code:429,status:'RESOURCE_EXHAUSTED',message:'Fixture shared capacity busy'}}),{status:429});
   if(mode==='invalid')return new Response(JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message:'Fixture parameter rejected',details:[{'@type':'type.googleapis.com/google.rpc.BadRequest',fieldViolations:[{field:'contents[0].parts[0]',description:'Fixture invalid part'}]}]}}),{status:400});
   const request=JSON.parse(options.body);vertexRequests++;thinkingLevels.push(request.generationConfig?.thinkingConfig?.thinkingLevel);
   assert(!options.body.includes('sbcompact:v1:'));
   if(request.systemInstruction?.parts?.some((p:Json)=>p.text.includes('Create a factual continuation summary'))){summaryRequests++;assert(!request.tools?.length);return {ok:true,body:stream([{candidates:[{content:{parts:[{text:'fixture handoff summary: preserve the task and continue safely. 中文摘要。'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:90,candidatesTokenCount:20,totalTokenCount:110}}])};}
   if(summaryRequests)sawResumedSummary=options.body.includes('fixture handoff summary');
   if(vertexRequests===1){
    const declaration=request.tools[0].functionDeclarations.find((f:Json)=>f.description.includes('apply_patch'));
    assert(declaration,'Codex must expose its apply_patch tool to Vertex');
    return {ok:true,body:stream([{candidates:[{content:{parts:[{functionCall:{name:declaration.name,args:{input:'*** Begin Patch\n*** Add File: fixture-created.txt\n+Vertex tool round trip OK\n*** End Patch'}},thoughtSignature:'fixture-thought-signature'}]},finishReason:'STOP'}]}])};
   }
   const serialized=JSON.stringify(request);
   gotToolResult=serialized.includes('functionResponse') && serialized.includes('fixture-thought-signature');
   toolOutput=JSON.stringify(request.contents.flatMap((c:Json)=>c.parts).filter((p:Json)=>p.functionResponse));
   return {ok:true,body:stream([{candidates:[{content:{parts:[{text:'Vertex fixture done'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:20,candidatesTokenCount:5,totalTokenCount:25}}])};
  }
 });
 const env={...process.env};for(const key of Object.keys(env))if(/OPENAI.*KEY|CODEX.*TOKEN|OPENAI_IDENTITY/.test(key))delete env[key];
 const args=['-c',`openai_base_url=${JSON.stringify(bridge.url)}`,'-c',`chatgpt_base_url=${JSON.stringify(`http://127.0.0.1:${port}/backend-api/`)}`,'-c','cli_auth_credentials_store="file"','app-server'];
 const startChild=()=>spawn(codex!,args,{env:{...env,CODEX_HOME:home},windowsHide:true});
 let child=startChild();
 let id=0;const calls=new Map<number,{resolve:(r:any)=>void;reject:(e:any)=>void}>();const turns:Json[]=[];const notifications:Json[]=[];let stderr='';
 const attach=()=>{
  child.stderr.on('data',b=>{stderr+=b.toString();});
  const lines=readline.createInterface({input:child.stdout});
  lines.on('line',line=>{const m=JSON.parse(line);if(m.id!=null && calls.has(m.id)){const p=calls.get(m.id)!;calls.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else{notifications.push(m);if(m.method==='turn/completed')turns.push(m.params);}});
  return lines;
 };
 let lines=attach();
 const rpc=(method:string,params:any={})=>new Promise<any>((resolve,reject)=>{const next=++id;calls.set(next,{resolve,reject:error=>reject(Error(method+': '+error.message))});child.stdin.write(JSON.stringify({id:next,method,params})+'\n');});
 const turn=async(threadId:string,model:string,text:string,effort?:string)=>{const start=turns.length;await rpc('turn/start',{threadId,model,...(effort?{effort}:{}),input:[{type:'text',text}]});const limit=Date.now()+15000;while(turns.length===start && Date.now()<limit)await new Promise(r=>setTimeout(r,20));assert(turns.length>start,'turn completion missing: '+stderr.slice(-2500));return turns.at(-1)!.turn;};
 try{
  await rpc('initialize',{clientInfo:{name:'switchboard_integration_test',version:'0.1.0'}});child.stdin.write('{"method":"initialized"}\n');
  const account=await rpc('account/read',{refreshToken:false});assert.equal(account.account?.type,'chatgpt');assert.equal(account.requiresOpenaiAuth,true);
  const models=await rpc('model/list',{includeHidden:true});assert(models.data.some((m:Json)=>m.id===alias(provider,provider.models[0])),'Remote Codex-native catalog includes Vertex');
  const thread=await rpc('thread/start',{model:alias(provider,provider.models[0]),cwd:root,approvalPolicy:'never',sandbox:'read-only'});
  const threadId=thread.thread.id;
  const successful=await turn(threadId,alias(provider,provider.models[0]),'Run the tool flow fixture','high');assert(thinkingLevels.length>=2);assert(thinkingLevels.every(level=>level==='HIGH'),'Selected effort must reach every tool-loop model request');
  assert.equal(successful.status,'completed');assert(gotToolResult,'Signed function call/result must be returned to Vertex');
  assert(!fs.existsSync(path.join(root,'fixture-created.txt')),'Adapter must preserve the Codex read-only policy');assert.match(toolOutput,/read-only sandbox/);
  const usageEvent=notifications.find(n=>n.method==='thread/tokenUsage/updated');assert(usageEvent,'Expected native token usage notification');assert.equal(usageEvent.params.tokenUsage.modelContextWindow,996147,'Native Codex uses the real Argon window with a 5% reserve');
  const beforeCompact=vertexRequests,compactStart=turns.length;
  await rpc('thread/compact/start',{threadId});
  const compactLimit=Date.now()+10000;while(turns.length===compactStart&&Date.now()<compactLimit)await new Promise(r=>setTimeout(r,20));
  assert(turns.length>compactStart);assert.equal(turns.at(-1)!.turn.status,'completed',JSON.stringify(turns.at(-1)));assert.equal(vertexRequests,beforeCompact+1);assert.equal(summaryRequests,1,'Native compact returns exactly one compaction item');
  const afterCompact=await turn(threadId,alias(provider,provider.models[0]),'Continue after compaction');assert.equal(afterCompact.status,'completed');assert(sawResumedSummary);
  assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  for(const failure of ['fail','credentials','timeout']){
   mode=failure;const failed=await turn(threadId,alias(provider,provider.models[0]),'Exercise '+failure+' fixture');assert.equal(failed.status,'failed');
   assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  }
  mode='transient';const recovered=await turn(threadId,alias(provider,provider.models[0]),'Exercise capacity recovery fixture');assert.equal(recovered.status,'completed');assert.equal(transientRequests,3);assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  mode='invalid';const invalid=await turn(threadId,alias(provider,provider.models[0]),'Exercise detailed 400 fixture');assert.equal(invalid.status,'failed');assert.match(JSON.stringify(invalid),/INVALID_ARGUMENT/);assert.match(JSON.stringify(invalid),/contents\[0\]/);assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  // Corrupt third-party config must not prevent official-model inference or touch its login.
  fs.writeFileSync(path.join(root,'providers.json'),'{invalid third-party config');
  mode='tool';const gpt=await turn(threadId,'fixture-gpt','Continue using GPT');assert.equal(gpt.status,'completed');assert(officialRequests>0);writeSettings(settings,root);
  assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  assert(!notifications.some(n=>n.method==='account/updated' && n.params?.authMode==null),'No account logout notifications');
  const threads=await rpc('thread/list',{});assert(threads.data.some((t:Json)=>t.id===threadId));
  const history=await rpc('thread/read',{threadId,includeTurns:true});assert(history.thread.turns.length>=5,'History includes successful and failed turns');
  const homeFiles=fs.readdirSync(home);assert(homeFiles.includes('sessions'),'Official history storage is reused');
  const exited=once(child,'exit');child.stdin.end();child.kill();await exited;lines.close();
  child=startChild();lines=attach();
  await rpc('initialize',{clientInfo:{name:'switchboard_integration_test',version:'0.1.0'}});child.stdin.write('{"method":"initialized"}\n');
  const resumed=await rpc('thread/resume',{threadId,model:alias(provider,provider.models[0]),cwd:root});assert.equal(resumed.thread.id,threadId);
  const continued=await turn(threadId,alias(provider,provider.models[0]),'Continue after process restart');assert.equal(continued.status,'completed');
  assert(sawResumedSummary,'Encrypted summary survives native history persistence and process restart');
  assert.deepEqual(await rpc('account/read',{refreshToken:false}),account);assert.deepEqual(fs.readFileSync(authFile),before);
  const sameProcess=child.pid;provider.models.push('gemini-fixture-added');writeSettings(settings,root);
  const added=await turn(threadId,alias(provider,'gemini-fixture-added'),'Use a model added while the engine is running');assert.equal(added.status,'completed');assert.equal(child.pid,sameProcess);assert.deepEqual(fs.readFileSync(authFile),before);
  const measured=usageSnapshot('month',root);assert(measured.rows.some(r=>r.model==='fixture-gpt' && r.requests>0));const gemini=measured.rows.find(r=>r.model===alias(provider,provider.models[0]));assert(gemini && gemini.input>=20 && gemini.failed>=3);
 }finally{
  child.stdin.end();child.kill();lines.close();await bridge.close();for(const ws of wss.clients)ws.terminate();wss.close();official.closeAllConnections();await new Promise<void>(r=>official.close(()=>r()));
 }
});
