import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {createBridge} from '../src/bridge.ts';
import {writeSettings} from '../src/config.ts';
import {usageSnapshot} from '../src/usage.ts';

test('HTTP proxy handles zstd, keeps GPT auth upstream, and never maps Vertex failures to 401',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-http-'));
 writeSettings({version:1,providers:[{id:'vertex',label:'Vertex',type:'vertex',project:'fixture',location:'global',models:['gemini-4-argon'],credentialsFile:path.join(root,'missing.json')}]},root);
 let gptRequests=0;
 const upstream=http.createServer(async(req,res)=>{
  assert.equal(req.headers.authorization,'Bearer gpt-only-fixture');
  if(req.url?.startsWith('/models')){res.setHeader('content-type','application/json');res.end(JSON.stringify({models:[]}));return;}
  let body='';for await(const c of req)body+=c;assert.equal(JSON.parse(body).model,'fixture-gpt');assert(!req.headers['content-encoding']);gptRequests++;
  res.setHeader('content-type','text/event-stream');res.end('data: {"type":"response.completed","response":{"id":"fixture-gpt-response","output":[],"usage":{"input_tokens":15,"output_tokens":6}}}\n\n');
 });
 await new Promise<void>(r=>upstream.listen(0,'127.0.0.1',r));
 const bridge=await createBridge({root,launcher:path.resolve('dist/codex-switchboard.exe'),upstream:`http://127.0.0.1:${(upstream.address() as any).port}`,vertexAuth:{getToken:async()=>{throw Error('Google credential fixture failure');}} as any});
 try{
  const models=await fetch(bridge.url+'/models',{headers:{authorization:'Bearer gpt-only-fixture'}});assert.equal(models.status,200);assert.equal((await models.json()).models[0].slug,'thirdparty/vertex/gemini-4-argon');
  for(const input of [[{type:'compaction',encrypted_content:'opaque-firstparty-summary'}]]){
   const unsupported=await fetch(bridge.url+'/responses',{method:'POST',headers:{authorization:'Bearer gpt-only-fixture','content-type':'application/json'},body:JSON.stringify({model:'thirdparty/vertex/gemini-4-argon',input})});assert.equal(unsupported.status,400);const failure=await unsupported.json();assert.equal(failure.error.code,'third_party_error');assert.match(failure.error.message,/压缩/);assert.equal(usageSnapshot('month',root).rows.length,0,'Unsupported compaction never starts inference or metering');
  }
  const denied=await fetch(bridge.url+'/responses',{method:'POST',headers:{authorization:'Bearer gpt-only-fixture','content-type':'application/json'},body:JSON.stringify({model:'thirdparty/vertex/gemini-4-argon',input:'hello'})});assert.equal(denied.status,400);assert.equal((await denied.json()).error.code,'third_party_error');
  const encoded=zlib.zstdCompressSync(Buffer.from(JSON.stringify({model:'fixture-gpt',input:'hello'})));
  const gpt=await fetch(bridge.url+'/responses',{method:'POST',headers:{authorization:'Bearer gpt-only-fixture','content-encoding':'zstd','content-type':'application/json'},body:encoded});assert.equal(gpt.status,200);assert.match(await gpt.text(),/response.completed/);assert.equal(gptRequests,1);
  const usage=usageSnapshot('month',root);assert.equal(usage.rows.find(r=>r.model==='fixture-gpt')?.input,15);assert.equal(usage.rows.find(r=>r.model.startsWith('thirdparty/'))?.failed,1);
 }finally{await bridge.close();upstream.closeAllConnections();await new Promise<void>(r=>upstream.close(()=>r()));}
});
