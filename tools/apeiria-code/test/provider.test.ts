import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {ProviderStore} from '../src/providers.ts';
import {createBridge} from '../src/bridge.ts';
import type {Json,Provider} from '../src/config.ts';
import {alias,resolveModel} from '../src/config.ts';
import {VertexAuth,parseServiceAccount} from '../src/auth.ts';
import {CompactionCodec} from '../src/compaction.ts';
import {SignatureStore,toGemini,bindings} from '../src/conversion.ts';
import {runAdapter} from '../src/adapters.ts';
import {sseEvents} from '../src/sse.ts';
import type {ProviderDraft} from '../src/types.ts';

function root(){return fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-providers-'));}
function secretStorage(){const values=new Map<string,string>();return {values,get:async(k:string)=>values.get(k),store:async(k:string,v:string)=>{values.set(k,v);},delete:async(k:string)=>{values.delete(k);}};}
const draft=(extra:Partial<ProviderDraft>={}):ProviderDraft=>({id:'fixture',label:'Fixture',type:'chat-completions',baseUrl:'https://api.fixture.invalid/v1',models:['test-model'],...extra});
const stream=(events:Json[])=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{headers:{'content-type':'text/event-stream'}});
const chat=(text='OK')=>stream([{choices:[{delta:{content:text},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:2,total_tokens:12}}]);
async function events(response:Response):Promise<Json[]>{const result:Json[]=[];for await(const event of sseEvents(response.body!))result.push(event);return result;}
function serviceAccount(){const key=crypto.generateKeyPairSync('rsa',{modulusLength:2048});return {key,account:{type:'service_account',project_id:'fixture-project',client_email:'fixture@fixture-project.iam.gserviceaccount.com',private_key:key.privateKey.export({type:'pkcs8',format:'pem'}).toString()}};}
async function requestModel(bridge:Awaited<ReturnType<typeof createBridge>>,body:Json,signal?:AbortSignal){return fetch(bridge.url+'/responses',{method:'POST',headers:{authorization:'Bearer '+bridge.token,'content-type':'application/json'},body:JSON.stringify(body),signal});}

test('provider views and files never contain secrets; headers support keep, replace and remove',async()=>{
  const dir=root(),secret=secretStorage(),store=new ProviderStore(dir,secret);
  await store.save(draft({apiKey:'api-secret-fixture',headers:[{name:'X-Private',value:'header-secret-fixture'},{name:'Authorization',value:'Custom auth-secret'}]}));
  const view=(await store.views())[0],raw=fs.readFileSync(path.join(dir,'providers.json'),'utf8');
  assert.deepEqual(view.headerNames,['x-private','authorization']);assert(view.hasKey);assert(!JSON.stringify(view).includes('secret'));assert(!raw.includes('secret-fixture'));assert(!raw.includes('auth-secret'));assert(!raw.includes('apiKey'));
  await store.save(draft({headers:[{name:'x-private'},{name:'Authorization',value:'Replacement auth'}]}));
  let c=await store.credentials(store.read().providers[0]);assert.equal(c.apiKey,'api-secret-fixture');assert.equal(c.headers['x-private'],'header-secret-fixture');assert.equal(c.headers.authorization,'Replacement auth');assert.equal(secret.values.size,1);
  await store.save(draft({clearKey:true,headers:[{name:'X-Private',remove:true}]}));c=await store.credentials(store.read().providers[0]);assert.equal(c.apiKey,undefined);assert.equal(c.headers['x-private'],undefined);
  assert(!store.safeError(Error('api-secret-fixture header-secret-fixture Replacement auth Bearer unknown-token')).includes('secret-fixture'));
  await store.remove('fixture');assert.equal(secret.values.size,0);assert.deepEqual(store.models(),[]);
});

test('invalid metadata, credentials and dangerous headers are rejected before writing',async()=>{
  const dir=root(),secrets=secretStorage(),store=new ProviderStore(dir,secrets);
  for(const bad of [draft({headers:[{name:'host',value:'attacker'}]}),draft({headers:[{name:'X-Test',value:'value\nAuthorization:bad'}]}),draft({baseUrl:'https://user:secret@fixture.invalid/v1'}),draft({modelMetadata:{'test-model':{contextWindow:100}}}),draft({type:'vertex',serviceAccountJson:'{}'})])await assert.rejects(store.save(bad));
  assert.equal(secrets.values.size,0);assert(!fs.existsSync(path.join(dir,'providers.json')));
});

test('model metadata, display labels, reasoning presets and enable state drive the independent catalog',async()=>{
  const store=new ProviderStore(root(),secretStorage());await store.save(draft({modelMetadata:{'test-model':{displayName:'Friendly',contextWindow:200000,maxOutputTokens:16000,imageInput:true}},reasoning:{'test-model':'low-medium-high'}}));
  assert.equal(store.models()[0].label,'Fixture · Friendly');assert.deepEqual(store.models()[0].efforts,['low','medium','high']);assert.equal(store.catalog().models[0].context_window,200000);assert.equal(store.catalog().models[0].prefer_websockets,false);assert.deepEqual(store.catalog().models[0].input_modalities,['text','image']);
  await store.toggle('fixture');assert.deepEqual(store.models(),[]);assert.throws(()=>resolveModel('thirdparty/fixture/test-model',store.read()));await store.toggle('fixture');assert.equal(store.models().length,1);
});

test('connection tests only GET the model directory, preserve saved credentials and do not save drafts',async()=>{
  const dir=root(),secrets=secretStorage(),calls:Json[]=[];
  const store=new ProviderStore(dir,secrets,async(url:any,options:any)=>{calls.push({url,...options});return new Response('{}');});
  await store.save(draft({apiKey:'old-key',headers:[{name:'Authorization',value:'Custom header'}]}));const before=fs.readFileSync(path.join(dir,'providers.json'),'utf8');
  assert.match(await store.test(draft({apiKey:'unsaved-key'})),/尚未验证模型生成权限/);assert.equal(calls[0].method,'GET');assert.equal(calls[0].headers.authorization,'Custom header');assert.equal(calls[0].body,undefined);assert.equal(fs.readFileSync(path.join(dir,'providers.json'),'utf8'),before);assert.equal((await store.credentials(store.read().providers[0])).apiKey,'old-key');
  const unsaved=new ProviderStore(root(),secretStorage(),async()=>new Response('{}'));await unsaved.test(draft());assert.equal(unsaved.read().providers.length,0);
});

test('Google OAuth tests sign valid JWTs and never generate or persist credentials',async()=>{
  const {key,account}=serviceAccount(),dir=root(),secrets=secretStorage();let calls=0;
  const store=new ProviderStore(dir,secrets,async(url:any,options:any)=>{
    calls++;assert.equal(url,'https://oauth2.googleapis.com/token');const jwt=new URLSearchParams(options.body).get('assertion')!.split('.');assert(crypto.verify('RSA-SHA256',Buffer.from(jwt.slice(0,2).join('.')),key.publicKey,Buffer.from(jwt[2],'base64url')));return new Response(JSON.stringify({access_token:'oauth-secret',expires_in:3600}));
  });
  assert.match(await store.test(draft({type:'vertex',serviceAccountJson:JSON.stringify(account)})),/OAuth/);assert.equal(calls,1);assert.equal(secrets.values.size,0);assert(!fs.existsSync(path.join(dir,'providers.json')));
  await store.save(draft({type:'vertex',serviceAccountJson:JSON.stringify(account)}));assert.equal(store.read().providers[0].project,account.project_id);assert.equal(store.read().providers[0].location,'global');assert(!(JSON.stringify(await store.views())+fs.readFileSync(path.join(dir,'providers.json'),'utf8')).includes('PRIVATE KEY'));
});

test('Google concurrent refresh is shared while cancellation affects only its caller',async()=>{
  const {account}=serviceAccount();let finish=()=>{},calls=0;const p:Provider={id:'v',label:'V',type:'vertex',models:['gemini-4-argon'],project:'fixture-project'};
  const auth=new VertexAuth(async()=>{calls++;await new Promise<void>(r=>finish=r);return new Response(JSON.stringify({access_token:'token',expires_in:3600}));},undefined,async()=>parseServiceAccount(JSON.stringify(account)));
  const abort=new AbortController(),one=auth.getToken(p,abort.signal),two=auth.getToken(p);await new Promise(r=>setTimeout(r,1));abort.abort(Error('one cancelled'));await assert.rejects(one,/one cancelled/);finish();assert.equal(await two,'token');assert.equal(calls,1);await auth.getToken(p);assert.equal(calls,1);
});

test('bridge rejects missing tokens, unknown models, official routes and damaged configuration without upstream calls',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft());let calls=0;
  const bridge=await createBridge({root:dir,store,fetcher:async()=>{calls++;return chat();}});
  try{
    assert.equal((await fetch(bridge.url+'/models')).status,401);assert.equal((await fetch(bridge.backendUrl+'/plugins')).status,404);
    for(const model of ['gpt-official','thirdparty/missing/model'])assert.equal((await requestModel(bridge,{model,input:'hello'})).status,400);
    const catalog=await fetch(bridge.url+'/models',{headers:{authorization:'Bearer '+bridge.token}});assert.equal((await catalog.json()).models.length,1);
    fs.writeFileSync(path.join(dir,'providers.json'),'broken');assert.equal((await requestModel(bridge,{model:'thirdparty/fixture/test-model',input:'hello'})).status,400);assert.equal(calls,0);
  }finally{await bridge.close();}
});

test('Chat Completions translates streamed tools, reasoning, metadata limits and multi-turn results',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft({apiKey:'thirdparty-key',headers:[{name:'x-api-key',value:'custom-key'}],modelMetadata:{'test-model':{maxOutputTokens:1234}}}));
  let calls=0;const payloads:Json[]=[],bridge=await createBridge({root:dir,store,fetcher:async(_url:any,options:any)=>{
    calls++;assert.equal(options.headers.authorization,'Bearer thirdparty-key');assert.equal(options.headers['x-api-key'],'custom-key');assert(!JSON.stringify(options.headers).includes('official-login'));const body=JSON.parse(options.body);payloads.push(body);assert.equal(body.max_tokens,1234);
    return calls===1?stream([{choices:[{delta:{reasoning_content:'Think',tool_calls:[{index:0,function:{name:body.tools[0].function.name,arguments:'{"cmd":"dir"}'}}]},finish_reason:'tool_calls'}]}]):chat('All done');
  }});
  try{
    const model=store.models()[0].id,tool={type:'function',name:'exec_command',parameters:{type:'object',properties:{cmd:{type:'string'}}}},first=await events(await requestModel(bridge,{model,input:[{role:'user',content:'inspect'}],tools:[tool]}));
    assert(first.some(e=>e.type==='response.reasoning_summary_text.delta'));const response=first.at(-1)!.response,call=response.output.find((i:Json)=>i.type==='function_call');assert.equal(call.name,'exec_command');
    const second=await events(await requestModel(bridge,{model,previous_response_id:response.id,input:[{type:'function_call_output',call_id:call.call_id,output:'files'}]}));assert.equal(second.at(-1)!.response.output[0].content[0].text,'All done');assert.equal(payloads[1].messages.at(-1).role,'tool');assert.equal(calls,2);
  }finally{await bridge.close();}
});

test('Responses preserves native tool events and sanitizes provider errors',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft({type:'responses',apiKey:'native-secret'}));let failed=false;
  const bridge=await createBridge({root:dir,store,fetcher:async(_url:any,options:any)=>{
    const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.model,'test-model');assert.equal(options.headers.authorization,'Bearer native-secret');
    return failed?stream([{type:'response.failed',response:{error:{message:'Rejected native-secret'}}}]):stream([{type:'response.created',response:{id:'native-response',output:[]}},{type:'response.output_item.done',item:{type:'custom_tool_call',name:'apply_patch',input:'patch',call_id:'c'}},{type:'response.completed',response:{id:'native-response',status:'completed',model:'test-model',output:[{type:'custom_tool_call',name:'apply_patch',input:'patch',call_id:'c'}]}}]);
  }});
  try{const first=await events(await requestModel(bridge,{model:store.models()[0].id,input:'hi'}));assert.equal(first[1].item.type,'custom_tool_call');assert.equal(first.at(-1)!.response.model,store.models()[0].id);failed=true;const bad=await events(await requestModel(bridge,{model:store.models()[0].id,input:'hi'}));assert(!JSON.stringify(bad).includes('native-secret'));assert.equal(bad.at(-1)!.type,'response.failed');}finally{await bridge.close();}
});

test('Vertex signed parallel tool calls survive store restart and replay in call order',async()=>{
  const dir=root(),sigRoot=path.join(dir,'signatures'),p:Provider={id:'vertex',label:'Vertex',type:'vertex',project:'fixture-project',models:['gemini-4-argon']},tool={type:'function',name:'read',parameters:{type:'object',properties:{}}},wire=bindings([tool])[0].wireName;
  const raw=[{thought:true,text:'planning',thoughtSignature:'thinking-signature'},{functionCall:{name:wire,args:{n:1}},thoughtSignature:'first-signature'},{functionCall:{name:wire,args:{n:2}},thoughtSignature:'second-signature'}],out:Json[]=[];
  await runAdapter(p,p.models[0],{model:alias(p,p.models[0]),input:'hello',tools:[tool]},e=>out.push(e),new AbortController().signal,{signatures:new SignatureStore(sigRoot),vertexAuth:{getToken:async()=> 'google-token'} as any,fetcher:async()=>stream([{candidates:[{content:{parts:raw},finishReason:'STOP'}]}])});
  assert(out.some(e=>e.type==='response.reasoning_summary_text.delta'));const output=out.at(-1)!.response.output,calls=output.filter((i:Json)=>i.call_id),input=[{role:'user',content:'hello'},...output,{type:'function_call_output',call_id:calls[1].call_id,output:'second'},{type:'function_call_output',call_id:calls[0].call_id,output:'first'}];
  const request=toGemini({input,tools:[tool]},new SignatureStore(sigRoot),'vertex/fixture-project/global/gemini-4-argon').request;assert.deepEqual(request.contents[1].parts,raw);assert.equal(request.contents[2].parts[0].functionResponse.response.output,'first');
  const foreign=toGemini({input,tools:[tool]},new SignatureStore(sigRoot),'foreign').request;assert(!JSON.stringify(foreign).includes('signature'));assert(JSON.stringify(foreign).includes('second'));
});

test('local encrypted compaction survives bridge restart and is expanded before any upstream request',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft());let calls=0;
  const fetcher=async(_url:any,options:any)=>{calls++;assert(!options.body.includes('apeiria-compact:'));if(calls>1)assert(options.body.includes('continuation summary'));return chat(calls===1?'continuation summary: finish task':'done');};
  let bridge=await createBridge({root:dir,store,fetcher});let compact:Json;
  try{const result=await events(await requestModel(bridge,{model:store.models()[0].id,input:[{role:'user',content:'finish task'},{type:'compaction_trigger'}]}));assert.equal(result.at(-1)!.type,'response.completed');compact=result.at(-1)!.response.output[0];assert.equal(compact.type,'compaction');assert(!compact.encrypted_content.includes('finish task'));}finally{await bridge.close();}
  bridge=await createBridge({root:dir,store,fetcher});try{const result=await events(await requestModel(bridge,{model:store.models()[0].id,input:[compact!,{role:'user',content:'continue'}]}));assert.equal(result.at(-1)!.type,'response.completed');assert.equal(calls,2);}finally{await bridge.close();}
  const codec=new CompactionCodec(dir);assert.throws(()=>codec.expand({input:[{type:'compaction',encrypted_content:'apeiria-compact:v1:damaged'}]},true),/无法读取/);assert.throws(()=>codec.expand({input:[{type:'compaction',encrypted_content:'foreign-encrypted'}]},true),/无法解密/);
});

test('client cancellation aborts an upstream generation and no reply is replayed',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft());let aborted=false,calls=0;
  const bridge=await createBridge({root:dir,store,fetcher:async(_url:any,options:any)=>{
    calls++;return new Response(new ReadableStream({start(controller){controller.enqueue(Buffer.from('data: '+JSON.stringify({choices:[{delta:{content:'partial'}}]})+'\n\n'));options.signal.addEventListener('abort',()=>{aborted=true;controller.error(options.signal.reason);},{once:true});}}));
  }});
  try{const abort=new AbortController(),response=await requestModel(bridge,{model:store.models()[0].id,input:'hi'},abort.signal),reader=response.body!.getReader();await reader.read();abort.abort();await new Promise(r=>setTimeout(r,30));assert(aborted);assert.equal(calls,1);}finally{await bridge.close();}
});

test('incomplete streams and third-party 401 stay channel failures and allow the next request',async()=>{
  const dir=root(),store=new ProviderStore(dir,secretStorage());await store.save(draft());let mode='401';
  const bridge=await createBridge({root:dir,store,fetcher:async()=>mode==='401'?new Response('{}',{status:401}):mode==='partial'?stream([{choices:[{delta:{content:'partial'}}]}]):chat('recovered')});
  try{for(const next of ['401','partial','ok']){mode=next;const response=await requestModel(bridge,{model:store.models()[0].id,input:'hi'});assert.equal(response.status,200);const result=await events(response);assert.equal(result.at(-1)!.type,next==='ok'?'response.completed':'response.failed');assert(!result.some(e=>String(e.method).startsWith('account/')));}}finally{await bridge.close();}
});
