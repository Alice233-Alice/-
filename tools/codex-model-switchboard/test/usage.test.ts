import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {usageAttempt,usageSnapshot,savePrice,saveQuotas,saveProviderQuota,usageSse} from '../src/usage.ts';

test('usage records deduplicate terminal events and price cached tokens without logging secrets',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-usage-')),model='thirdparty/vertex/gemini-test';
  const a=usageAttempt(model,root);a.observe({type:'response.created',response:{id:'secret-prompt'}});
  a.observe({type:'response.completed',response:{usage:{input_tokens:1000000,output_tokens:100000,input_tokens_details:{cached_tokens:200000},output_tokens_details:{reasoning_tokens:40000}},output:[{text:'secret-output'}]}});a.finish('interrupted');a.observe({type:'response.completed'});
  savePrice(model,{currency:'USD',input:2,output:10,cachedInput:0.5,monthlyBudget:20},root);
  let row=usageSnapshot('today',root).rows[0];assert.equal(row.requests,1);assert.equal(row.input,1000000);assert.equal(row.cached,200000);assert.equal(row.reasoning,40000);assert.equal(row.cost,2.7);assert.equal(row.budgetRemaining,17.3);
  const missing=usageAttempt(model,root);missing.observe({type:'error',status:400,error:{message:'secret-api-key'}});
  row=usageSnapshot('month',root).rows[0];assert.equal(row.requests,2);assert.equal(row.failed,1);assert.equal(row.unknownUsage,1);assert.equal(row.budgetRemaining,null);
  const records=fs.readdirSync(path.join(root,'usage'),{recursive:true}).filter(f=>String(f).endsWith('.jsonl')).map(f=>fs.readFileSync(path.join(root,'usage',String(f)),'utf8')).join('');assert(!records.includes('secret-'));
  assert.throws(()=>savePrice(model,{currency:'USD',input:-1,output:3},root));assert.throws(()=>savePrice(model,{currency:'EUR' as any,input:1,output:3},root));
});
test('compatible provider rate-limit headers are recorded as server data rather than a billing balance',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-headers-'));
  saveProviderQuota('thirdparty/api/model',new Headers({'x-ratelimit-remaining-requests':'25','x-ratelimit-remaining-tokens':'50000','x-ratelimit-reset-requests':'6m20s','authorization':'must-not-log'}),root);
  const q=usageSnapshot('month',root).quotas[0];assert.equal(q.remainingRequests,25);assert.equal(q.remainingTokens,50000);assert.equal(q.resetRequests,'6m20s');assert(!JSON.stringify(q).includes('must-not-log'));
});
test('official quota snapshots whitelist limits and fragmented SSE metering leaves bytes intact',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-quota-'));
  saveQuotas({rateLimitsByLimitId:{codex:{limitName:'Codex',primary:{usedPercent:25,windowDurationMins:300,resetsAt:2000000000},secondary:{usedPercent:10,windowDurationMins:10080,resetsAt:2100000000},accountId:'do-not-store'}}},root);
  const quota=usageSnapshot('month',root).quotas[0];assert.equal(quota.windows[0].usedPercent,25);assert.equal(quota.windows[1].minutes,10080);assert(!JSON.stringify(quota).includes('do-not-store'));
  const attempt=usageAttempt('gpt-fixture',root),observe=usageSse(attempt);
  const bytes=Buffer.from('event: response.completed\r\ndata: '+JSON.stringify({type:'response.completed',response:{usage:{input_tokens:12,output_tokens:8},output:[{text:'中文'}]}})+'\r\n\r\n');
  const original=Buffer.from(bytes);for(let i=0;i<bytes.length;i++)observe(bytes.subarray(i,i+1));assert(bytes.equals(original));
  attempt.finish('interrupted');const row=usageSnapshot('month',root).rows[0];assert.equal(row.input,12);assert.equal(row.output,8);assert.equal(row.requests,1);assert.equal(row.cost,null);
});
