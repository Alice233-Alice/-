import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {runAdapter} from '../src/adapters.ts';
import {bindings,SignatureStore,toGemini} from '../src/conversion.ts';
import {VertexAuth} from '../src/auth.ts';
import {vertexScope} from '../src/vertex.ts';
import type {VertexDependencies,VertexDiagnostic} from '../src/vertex.ts';
import type {Provider,Json} from '../src/config.ts';
import {readGoogleFailure,retryDelay,abortableDelay} from '../src/vertex-errors.ts';

const p:Provider={id:'vertex',label:'Vertex',type:'vertex',models:['gemini-4-argon'],project:'fixture-project',location:'global'};
const model='thirdparty/vertex/gemini-4-argon';
const temp=()=>fs.mkdtempSync(path.join(os.tmpdir(),'vertex-stability-'));
const stream=(events:Json[])=>({ok:true,body:{async *[Symbol.asyncIterator](){for(const e of events)yield Buffer.from('data: '+JSON.stringify(e)+'\n\n');}}});
const success=()=>stream([{candidates:[{content:{parts:[{text:'OK'}]},finishReason:'STOP'}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:2,totalTokenCount:12}}]);
const error=(status:number,message='Google fixture error',headers:Record<string,string>={})=>new Response(JSON.stringify({error:{code:status,status:status===429?'RESOURCE_EXHAUSTED':status===400?'INVALID_ARGUMENT':'UNAVAILABLE',message}}),{status,headers});
async function run(fetcher:any,extra:Partial<VertexDependencies>={},body:Json={model,input:'fixture'}){
 const events:Json[]=[],delays:number[]=[],diagnostics:VertexDiagnostic[]=[],signatures=extra.signatures||new SignatureStore(temp());
 await runAdapter(p,p.models[0],body,e=>events.push(e),new AbortController().signal,{signatures,vertexAuth:{getToken:async()=> 'google-secret-fixture',invalidate(){}} as any,sleep:async(ms,signal)=>{signal.throwIfAborted();delays.push(ms);},random:()=>0,onDiagnostic:d=>diagnostics.push(d),...extra,fetcher});
 return {events,delays,diagnostics,signatures};
}

test('Vertex retries 429/503 with bounded exponential backoff and identical request bodies',async()=>{
 const payloads:string[]=[];let calls=0;
 const result=await run(async(_url:any,options:any)=>{payloads.push(options.body);calls++;return calls===1?error(429,'Shared pool busy',{'retry-after':'3'}):calls===2?error(503):success();});
 assert.equal(calls,3);assert.deepEqual(result.delays,[3000,2000]);assert(payloads.every(p=>p===payloads[0]));assert.equal(result.events.at(-1)!.type,'response.completed');assert.equal(result.events.filter(e=>e.type==='response.created').length,1);assert.equal(result.diagnostics.length,2);
});
test('Vertex 400 reports Google field validation errors without retrying or exposing bearer tokens',async()=>{
 let calls=0;
 const result=await run(async()=>{calls++;return new Response(JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message:'Missing thought_signature. Bearer google-secret-fixture',details:[{'@type':'type.googleapis.com/google.rpc.BadRequest',fieldViolations:[{field:'contents[2].parts[0]',description:'Function response count mismatch'}]}]}}),{status:400});});
 const message=result.events.at(-1)!.response.error.message;
 assert.equal(calls,1);assert.equal(result.delays.length,0);assert.match(message,/INVALID_ARGUMENT/);assert.match(message,/contents\[2\]/);assert.match(message,/Function response count mismatch/);assert(!message.includes('google-secret-fixture'));assert(!message.includes('检查项目权限、地区和模型名称'));
});
test('Vertex persistent 429 stops after two retries and does not retry earlier than a long server cooldown',async()=>{
 let calls=0;const result=await run(async()=>{calls++;return error(429);});assert.equal(calls,3);assert.deepEqual(result.delays,[1000,2000]);assert.match(result.events.at(-1)!.response.error.message,/已尝试 3 次/);
 calls=0;const cooldown=await run(async()=>{calls++;return error(429,'Wait',{'retry-after':'120'});});assert.equal(calls,1);assert.equal(cooldown.delays.length,0);assert.match(cooldown.events.at(-1)!.response.error.message,/120 秒/);
});
test('RetryInfo and Retry-After HTTP dates are honored; delay waiting is cancelable',async()=>{
 const failure=await readGoogleFailure(new Response(JSON.stringify({error:{code:429,status:'RESOURCE_EXHAUSTED',details:[{'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:'4.5s'}]}}),{status:429}));assert.equal(retryDelay(0,failure,0),4500);
 const date=await readGoogleFailure(error(429,'Wait',{'retry-after':new Date(Date.now()+10000).toUTCString()}));assert(date.retryAfterMs>=8000&&date.retryAfterMs<=10000);
 const controller=new AbortController(),waiting=abortableDelay(30000,controller.signal);controller.abort(Error('fixture canceled'));await assert.rejects(waiting,/fixture canceled/);
});
test('cancellation during Vertex cooldown stops inference without retry or logout events',async()=>{
 const controller=new AbortController(),events:Json[]=[];let calls=0;
 await runAdapter(p,p.models[0],{model,input:'fixture'},e=>events.push(e),controller.signal,{signatures:new SignatureStore(temp()),vertexAuth:{getToken:async()=> 'token'} as any,fetcher:async()=>{calls++;return error(429);},sleep:async(_ms,signal)=>{controller.abort();signal.throwIfAborted();}});
 assert.equal(calls,1);assert(!events.some(e=>e.type==='response.failed'||e.type==='response.completed'||e.method));
});
test('in-stream errors retry only before model content; partial text/tools and truncated streams never replay',async()=>{
 let calls=0;const early=await run(async()=>++calls===1?stream([{error:{code:503,status:'UNAVAILABLE',message:'Overload'}}]):success());assert.equal(calls,2);assert.equal(early.events.at(-1)!.type,'response.completed');
 const tool={type:'function',name:'fixture_tool',parameters:{type:'object',properties:{}}},wire=bindings([tool])[0].wireName;
 for(const part of [{text:'partial'},{functionCall:{name:wire,args:{}},thoughtSignature:'partial-signature'},{thought:true,text:'private thinking'}]){
  calls=0;const result=await run(async()=>{calls++;return stream([{candidates:[{content:{parts:[part]}}]},{error:{code:503,status:'UNAVAILABLE'}}]);},{},{model,input:'fixture',tools:[tool]});assert.equal(calls,1);assert.equal(result.events.at(-1)!.type,'response.failed');
 }
 calls=0;const truncated=await run(async()=>{calls++;return stream([{candidates:[{content:{parts:[{text:'partial'}]}}]}]);});assert.equal(calls,1);assert.match(truncated.events.at(-1)!.response.error.message,/STREAM_INCOMPLETE/);
});
test('native signed text and parallel tool parts survive restart and out-of-order tool completion',async()=>{
 const tool={type:'function',name:'fixture_tool',parameters:{type:'object',properties:{}}},wire=bindings([tool])[0].wireName,root=temp();
 const raw=[{text:'Before ',thoughtSignature:'signed-text'},{functionCall:{name:wire,args:{n:1}},thoughtSignature:'signed-first-call'},{functionCall:{name:wire,args:{n:2}}},{text:'after',thoughtSignature:'signed-last-text'}];
 const generated=await run(async()=>stream([{candidates:[{content:{parts:raw},finishReason:'STOP'}]}]),{signatures:new SignatureStore(root)},{model,input:'fixture',tools:[tool]});
 const output=generated.events.at(-1)!.response.output,calls=output.filter((i:Json)=>i.call_id),input=[{role:'user',content:'fixture'},...output,{type:'function_call_output',call_id:calls[1].call_id,output:'second'},{type:'function_call_output',call_id:calls[0].call_id,output:'first'}];
 const request=toGemini({input,tools:[tool]},new SignatureStore(root),vertexScope(p,p.models[0])).request;
 assert.deepEqual(request.contents[1].parts,raw);assert.equal(request.contents[2].parts[0].functionResponse.response.output,'first');assert.equal(request.contents[2].parts[1].functionResponse.response.output,'second');
 const foreign=toGemini({input,tools:[tool]},new SignatureStore(root),vertexScope(p,'gemini-other')).request;
 assert(!JSON.stringify(foreign).includes('signed-'));assert(!JSON.stringify(foreign).includes('functionCall'));assert(JSON.stringify(foreign).includes('second'));
 const interrupted=toGemini({input:[{role:'user',content:'fixture'},...output,{type:'function_call_output',call_id:calls[0].call_id,output:'first'},{role:'user',content:'Continue after interruption'}],tools:[tool]},new SignatureStore(root),vertexScope(p,p.models[0])).request;
 assert(!JSON.stringify(interrupted).includes('functionCall'));assert(!JSON.stringify(interrupted).includes('signed-'));assert(JSON.stringify(interrupted).includes('Continue after interruption'));
});
test('legacy incomplete tool exchanges become history text rather than invalid Gemini function calls',()=>{
 const store=new SignatureStore(temp());store.set('old',{functionCall:{name:'fixture_tool',args:{}},thoughtSignature:'old-signature'});
 const request=toGemini({input:[{type:'function_call',call_id:'old',name:'fixture_tool',arguments:'{}'},{role:'user',content:'Resume after stopping'}]},store).request;
 assert(!JSON.stringify(request).includes('functionCall'));assert(!JSON.stringify(request).includes('old-signature'));assert(JSON.stringify(request).includes('Resume after stopping'));
});
test('Vertex streaming deadlines close a stalled connection and never replay partial output',async()=>{
 let count=0;const server=http.createServer((_req,res)=>{count++;res.writeHead(200,{'content-type':'text/event-stream'});res.write('data: '+JSON.stringify({candidates:[{content:{parts:[{text:'partial'}]}}]})+'\n\n');});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await run(async(_url:any,opts:any)=>fetch(`http://127.0.0.1:${(server.address() as any).port}`,opts),{idleTimeoutMs:30,headerTimeoutMs:1000});assert.equal(count,1);assert.match(result.events.at(-1)!.response.error.message,/NETWORK_ERROR/);}
 finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('Vertex header deadlines abort and retry a stalled server with a bounded attempt count',async()=>{
 let count=0;const server=http.createServer(()=>{count++;});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{const result=await run(async(_url:any,opts:any)=>fetch(`http://127.0.0.1:${(server.address() as any).port}`,opts),{headerTimeoutMs:50});assert.equal(count,3);assert.equal(result.delays.length,2);assert.match(result.events.at(-1)!.response.error.message,/NETWORK_ERROR/);}
 finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
