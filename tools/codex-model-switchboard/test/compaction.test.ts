import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {CompactionCodec,runCompaction} from '../src/compaction.ts';
import {createBridge} from '../src/bridge.ts';
import {writeSettings,alias} from '../src/config.ts';
import type {Json,Provider} from '../src/config.ts';
import {SignatureStore} from '../src/conversion.ts';
import {sseEvents} from '../src/sse.ts';
import {usageSnapshot} from '../src/usage.ts';

const launcher=path.resolve('dist/codex-switchboard.exe');
const windows=process.platform==='win32'&&fs.existsSync(launcher);
const provider:Provider={id:'vertex',label:'Vertex',type:'vertex',models:['gemini-4-argon'],project:'fixture',location:'global',credentialsFile:path.resolve('fixture.json')};
function stream(parts:Json[],finishReason='STOP'){return new Response('data: '+JSON.stringify({candidates:[{content:{parts},finishReason}],usageMetadata:{promptTokenCount:80,candidatesTokenCount:10,totalTokenCount:90}})+'\n\n',{headers:{'content-type':'text/event-stream'}});}

test('compaction is encrypted, self-contained, Unicode-safe and portable only through this adapter',{skip:!windows},()=>{
 const codec=new CompactionCodec(launcher),text='保持 GPT 登录。待办：修复 src/文件.ts。';
 const sealed=codec.seal(text);assert(!sealed.includes(text));
 const input={input:[{type:'compaction',encrypted_content:sealed}]};
 for(const thirdParty of [true,false])assert(new CompactionCodec(launcher).expand(input,thirdParty).input[0].content[0].text.includes(text));
 const opaque={input:[{type:'compaction',encrypted_content:'official-opaque'}]};assert.equal(codec.expand(opaque,false),opaque);assert.throws(()=>codec.expand(opaque,true),/官网加密/);
 const damaged={input:[{type:'compaction',encrypted_content:'sbcompact:v1:invalid'}]};assert.throws(()=>codec.expand(damaged,false),/无法读取/);assert.throws(()=>codec.expand(damaged,true),/无法读取/);
});

test('HTTP native compaction, recursive summary and GPT switch; usage counts actual summary call',{skip:!windows},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-compact-'));writeSettings({version:1,providers:[provider]},root);
 let calls=0,gptInput:Json|undefined;
 const upstream=http.createServer(async(req,res)=>{assert.equal(req.headers.authorization,'Bearer gpt-fixture');let raw='';for await(const chunk of req)raw+=chunk;gptInput=JSON.parse(raw);res.end('ok');});
 await new Promise<void>(r=>upstream.listen(0,'127.0.0.1',r));
 const bridge=await createBridge({root,launcher,upstream:`http://127.0.0.1:${(upstream.address() as any).port}`,vertexAuth:{getToken:async()=> 'google-fixture'} as any,fetcher:async(url:any,options:any)=>{
  if(!String(url).includes('aiplatform'))return fetch(url,options);
  calls++;assert.equal(options.headers.authorization,'Bearer google-fixture');const body=JSON.parse(options.body);assert(!body.tools);assert(!options.body.includes('sbcompact:v1:'));
  if(calls===2)assert(options.body.includes('summary 1'));
  return stream([{text:'summary '+calls+'：任务继续，保留限制。'}]);
 }});
 try{
  let previous:Json|undefined;
  for(let round=0;round<2;round++){
   const response=await fetch(bridge.url+'/responses',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer gpt-fixture'},body:JSON.stringify({model:alias(provider,provider.models[0]),input:[...(previous?[previous]:[{role:'user',content:'Keep my login and finish the task.'}]),{type:'compaction_trigger'}]})});
   assert.equal(response.status,200);const events=[];for await(const event of sseEvents(response.body!))events.push(event);
   const done=events.filter(e=>e.type==='response.output_item.done');assert.equal(done.length,1);assert.equal(done[0].item.type,'compaction');previous=done[0].item;assert.equal(events.at(-1).type,'response.completed');
  }
  const gpt=await fetch(bridge.url+'/responses',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer gpt-fixture'},body:JSON.stringify({model:'gpt',input:[previous],previous_response_id:'resp_sb_old'})});await gpt.text();assert(gptInput);assert(!gptInput.previous_response_id);assert(JSON.stringify(gptInput).includes('summary 2'));assert(!JSON.stringify(gptInput).includes('sbcompact:v1:'));
  const row=usageSnapshot('month',root).rows.find(r=>r.model.startsWith('thirdparty/'));assert.equal(row?.requests,2);assert.equal(row?.input,160);assert.equal(row?.output,20);
 }finally{await bridge.close();upstream.closeAllConnections();await new Promise<void>(r=>upstream.close(()=>r()));}
});

test('empty, truncated, interrupted, malformed or failed summaries never produce a compaction item',{skip:!windows},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-summary-fail-'));
 for(const mode of ['empty','truncated','failed','cancelled']){
  const events:Json[]=[],abort=new AbortController();
  const deps={signatures:new SignatureStore(root),vertexAuth:{getToken:async()=> 'fixture'} as any,fetcher:async()=>{if(mode==='cancelled'){abort.abort();throw abort.signal.reason;}if(mode==='failed')return new Response('{}',{status:400});return stream([{text:mode==='empty'?'':'partial summary'}],mode==='truncated'?'MAX_TOKENS':'STOP');},sleep:async()=>{}};
  await runCompaction(provider,provider.models[0],{model:alias(provider,provider.models[0]),input:[{role:'user',content:'Fixture'},{type:'compaction_trigger'}]},e=>events.push(e),abort.signal,deps,new CompactionCodec(launcher));
  assert(!events.some(e=>e.type==='response.completed'||e.item?.type==='compaction'),mode);
  if(mode!=='cancelled')assert.equal(events.at(-1)?.type,'response.failed');
 }
});
