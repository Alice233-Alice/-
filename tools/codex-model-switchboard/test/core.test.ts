import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {VertexAuth} from '../src/auth.ts';
import {SignatureStore,toGemini,bindings,ResponseEmitter,toChat} from '../src/conversion.ts';
import {readSettings,writeSettings,alias,resolveModel,modelInfos} from '../src/config.ts';
import {runAdapter,vertexUrl} from '../src/adapters.ts';
import {sseEvents} from '../src/sse.ts';
import type {Json,Provider} from '../src/config.ts';

function tmp(){return fs.mkdtempSync(path.join(os.tmpdir(),'codex-switchboard-test-'));}
function sse(values:Json[]){return {async *[Symbol.asyncIterator](){for(const value of values)yield Buffer.from('data: '+JSON.stringify(value)+'\n\n');}};}
const provider:Provider={id:'vertex-test',label:'Vertex',type:'vertex',project:'project-test',location:'global',credentialsFile:'C:\\fixture\\account.json',models:['gemini-4-argon']};
test('channel config does not read or modify any Codex account or history',()=>{
 const root=tmp(), auth=path.join(root,'auth.json');fs.writeFileSync(auth,'official-session-fixture');
 writeSettings({version:1,providers:[provider]},root);assert.deepEqual(readSettings(root).providers,[provider]);
 assert.equal(fs.readFileSync(auth,'utf8'),'official-session-fixture');assert.equal(resolveModel(alias(provider,provider.models[0]),readSettings(root))?.model,'gemini-4-argon');
 assert.throws(()=>resolveModel('thirdparty/missing/test',readSettings(root)),/停用/);
 assert.equal(modelInfos(readSettings(root))[0].use_responses_lite,false);
});
test('OAuth JWT signed by service account, expiry cached, and concurrent refresh coalesced',async()=>{
 const root=tmp();const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
 const file=path.join(root,'service.json');fs.writeFileSync(file,JSON.stringify({type:'service_account',project_id:'project-test',client_email:'test@project.iam.gserviceaccount.com',private_key:keys.privateKey.export({type:'pkcs8',format:'pem'})}));
 let count=0;
 const auth=new VertexAuth(async(_url:any,options:any)=>{
   count++;assert.deepEqual(Object.keys(options.headers),['content-type']);
   const jwt=new URLSearchParams(options.body).get('assertion')!.split('.');
   assert(crypto.verify('RSA-SHA256',Buffer.from(jwt.slice(0,2).join('.')),keys.publicKey,Buffer.from(jwt[2],'base64url')));
   assert.equal(JSON.parse(Buffer.from(jwt[1],'base64url').toString()).scope,'https://www.googleapis.com/auth/cloud-platform');
   return {ok:true,json:async()=>({access_token:'google-test-token',expires_in:3600})};
 });
 const p={...provider,credentialsFile:file};
 assert.deepEqual(await Promise.all([auth.getToken(p),auth.getToken(p)]),['google-test-token','google-test-token']);assert.equal(count,1);
 await auth.getToken(p);assert.equal(count,1);auth.invalidate(p);await auth.getToken(p);assert.equal(count,2);
});
test('Google tool signatures survive restart; GPT-specific reasoning never goes to Google',()=>{
 const root=tmp(), store=new SignatureStore(root);
 const raw={functionCall:{name:'native_tool',args:{cmd:'echo test'}},thoughtSignature:'signature-fixture'};
 store.set('call_vertex',raw);
 const converted=toGemini({input:[{type:'reasoning',encrypted_content:'GPT-PRIVATE-FIXTURE'},{type:'function_call',call_id:'call_vertex',name:'exec_command',arguments:'{}'},{type:'function_call_output',call_id:'call_vertex',output:'done'}]},new SignatureStore(root));
 assert.deepEqual(converted.request.contents[0].parts[0],raw);assert.equal(converted.request.contents[1].parts[0].functionResponse.name,'native_tool');
 assert(!JSON.stringify(converted.request).includes('GPT-PRIVATE-FIXTURE'));
 const migrated=toGemini({input:[{type:'function_call',call_id:'old-gpt-call',name:'shell',arguments:'{}'},{type:'function_call_output',call_id:'old-gpt-call',output:'old result'}]},store);
 assert(!JSON.stringify(migrated.request).includes('functionCall'));assert(JSON.stringify(migrated.request).includes('old result'));
});
test('namespaced custom tools round trip with raw patch input',()=>{
 const tool={type:'namespace',name:'functions',tools:[{type:'custom',name:'apply_patch',description:'Apply patches'}]};
 const binding=bindings([tool])[0];const events:Json[]=[];const emitter=new ResponseEmitter('thirdparty/fixture/model',e=>events.push(e));emitter.start();emitter.tool(binding,{input:'*** Begin Patch\n*** End Patch'});emitter.finish();
 const done=events.find(e=>e.type==='response.output_item.done')!.item;
 assert.equal(done.type,'custom_tool_call');assert.equal(done.namespace,'functions');assert.equal(done.input,'*** Begin Patch\n*** End Patch');
 assert.equal(events.at(-1)!.type,'response.completed');
 const chat=toChat({model:'fixture',tools:[tool],input:[done,{type:'custom_tool_call_output',call_id:done.call_id,output:'ok'}]});
 assert.equal(chat.request.messages[0].tool_calls[0].function.name,binding.wireName);assert.equal(chat.request.messages[1].role,'tool');
});
test('Vertex 401, malformed credential and timeout failures never emit OpenAI auth events',async()=>{
 for(const kind of ['401','credentials','timeout']){
   const events:Json[]=[];
   await runAdapter(provider,'gemini-4-argon',{model:alias(provider,'gemini-4-argon'),input:'hello'},e=>events.push(e),new AbortController().signal,{
    signatures:new SignatureStore(tmp()),vertexAuth:{getToken:async()=>{if(kind==='credentials')throw Error('invalid service-account fixture');return 'google-fixture';},invalidate:()=>{}} as any,
    fetcher:async(_url:any,options:any)=>{assert.equal(options.headers.authorization,'Bearer google-fixture');assert(!JSON.stringify(options).includes('OPENAI'));if(kind==='timeout')throw Error('network timeout');return {ok:false,status:401,body:{cancel:async()=>{}}};}
   });
   assert.equal(events.at(-1)!.type,'response.failed');assert.equal(events.at(-1)!.response.error.code,'third_party_error');assert(!events.some(e=>String(e.method).startsWith('account/')));
 }
});
test('Vertex streaming, token usage and global endpoint',async()=>{
 const events:Json[]=[];
 await runAdapter(provider,'gemini-4-argon',{model:alias(provider,'gemini-4-argon'),input:'hello'},e=>events.push(e),new AbortController().signal,{signatures:new SignatureStore(tmp()),vertexAuth:{getToken:async()=> 'google-fixture'} as any,fetcher:async(url:any,options:any)=>{
   assert.equal(url,vertexUrl(provider,'gemini-4-argon'));assert.equal(options.headers.authorization,'Bearer google-fixture');
   return {ok:true,body:sse([{candidates:[{content:{parts:[{text:'Hello'}]}}]},{candidates:[{finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:2,totalTokenCount:12}}])};
 }});
 assert.equal(events.at(-1)!.response.output[0].content[0].text,'Hello');assert.equal(events.at(-1)!.response.usage.total_tokens,12);
});
test('third-party Responses error frames cannot masquerade as a GPT 401',async()=>{
 for(const type of ['error','response.failed']){
  const events:Json[]=[];
  await runAdapter({...provider,type:'responses',baseUrl:'https://provider.invalid/v1'},'fixture',{model:'thirdparty/api/fixture',input:'hi'},e=>events.push(e),new AbortController().signal,{signatures:new SignatureStore(tmp()),getKey:()=> 'provider-key-fixture',fetcher:async(_url:any,options:any)=>{assert.equal(options.headers.authorization,'Bearer provider-key-fixture');return {ok:true,body:streamError(type)};}});
  assert.equal(events.at(-1)!.type,'response.failed');assert.equal(events.at(-1)!.response.error.code,'third_party_error');assert(!events.some(e=>e.status===401));
 }
 function streamError(type:string){return sse([{type,status:401,error:{code:'invalid_api_key',message:'provider-only fixture'},response:{error:{code:'invalid_api_key',message:'provider-only fixture'}}}]);}
});
test('SSE chunks with split UTF-8, events and CRLF are parsed',async()=>{
 const text=Buffer.from('event: sample\r\ndata: {"text":"你好"}\r\n\r\ndata: [DONE]\n\n');
 const body={async *[Symbol.asyncIterator](){for(let i=0;i<text.length;i+=2)yield text.subarray(i,i+2);}};
 const result=[];for await(const e of sseEvents(body))result.push(e);assert.deepEqual(result,[{text:'你好'}]);
});
test('Windows credential encryption round trip does not store plaintext', {skip:process.platform!=='win32'||!fs.existsSync('dist/codex-switchboard.exe')},()=>{
 const p=spawnSync('dist/codex-switchboard.exe',['--protect'],{input:'provider-secret-fixture',encoding:'utf8',windowsHide:true});assert.equal(p.status,0);assert(!p.stdout.includes('provider-secret-fixture'));
 const u=spawnSync('dist/codex-switchboard.exe',['--unprotect'],{input:p.stdout,encoding:'utf8',windowsHide:true});assert.equal(u.status,0);assert.equal(u.stdout,'provider-secret-fixture');
});
