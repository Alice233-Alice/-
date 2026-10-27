import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {dataRoot} from './config.ts';
import type {Json} from './config.ts';

export interface Price {currency:'USD'|'CNY';input:number;output:number;cachedInput?:number;monthlyBudget?:number;}
export interface UsageRecord {id:string;at:string;model:string;status:'completed'|'failed'|'interrupted';input:number|null;output:number|null;cached:number;reasoning:number;}
export interface UsageRow {model:string;requests:number;failed:number;unknownUsage:number;input:number;output:number;cached:number;reasoning:number;cost:number|null;currency?:string;monthlyCost:number|null;budgetRemaining:number|null;}
export interface Quota {name:string;at:string;windows:{label:string;usedPercent:number;minutes:number|null;resetsAt:number|null}[];remainingRequests?:number;remainingTokens?:number;resetRequests?:string;resetTokens?:string;}
export interface UsageSnapshot {rows:UsageRow[];prices:Record<string,Price>;quotas:Quota[];period:string;}
const processId=crypto.randomUUID();
const number=(v:unknown):number|null=>typeof v==='number' && Number.isFinite(v) && v>=0?v:null;
function day(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function append(record:UsageRecord,root:string){
  // Each process writes its own file. Account IDs, prompts and credentials are never logged.
  try{const dir=path.join(root,'usage',day(new Date(record.at)));fs.mkdirSync(dir,{recursive:true});fs.appendFileSync(path.join(dir,processId+'.jsonl'),JSON.stringify(record)+'\n',{mode:0o600});}catch{}
}
export function usageAttempt(model:string,root=dataRoot()){
  let done=false, usage:Json|undefined;
  const id=crypto.randomUUID();
  const finish=(status:UsageRecord['status'])=>{
    if(done)return;done=true;
    append({id,at:new Date().toISOString(),model,status,input:number(usage?.input_tokens),output:number(usage?.output_tokens),cached:number(usage?.input_tokens_details?.cached_tokens)||0,reasoning:number(usage?.output_tokens_details?.reasoning_tokens)||0},root);
  };
  return {finish,observe(event:Json){
    try{
      if(event.type==='codex.rate_limits' || event.type==='rate_limits.updated')saveQuotas(event.rate_limits || event.rateLimits,root);
      if(event.response?.usage)usage=event.response.usage;
      if(event.type==='response.completed')finish('completed');
      else if(['response.failed','response.incomplete','error'].includes(event.type))finish('failed');
    }catch{} // Metering must never interrupt a model or trigger account recovery.
  }};
}
export function saveQuotas(raw:unknown,root=dataRoot()){
  try{
    if(!raw || typeof raw!=='object')return;
    const value=raw as Json;
    const candidates=value.rateLimitsByLimitId?Object.values(value.rateLimitsByLimitId):value.rate_limits_by_limit_id?Object.values(value.rate_limits_by_limit_id):[value.rateLimits || value.rate_limits || value];
    const quotas:Quota[]=[];
    for(const item of candidates as Json[]){
      const windows:Quota['windows']=[];
      for(const [key,label] of [['primary','主要额度'],['secondary','次要额度']]){
        const w=item?.[key], used=number(w?.usedPercent ?? w?.used_percent);if(used===null)continue;
        windows.push({label,usedPercent:Math.min(100,used),minutes:number(w.windowDurationMins ?? w.window_minutes ?? w.window_duration_mins),resetsAt:number(w.resetsAt ?? w.reset_at ?? w.resets_at)});
      }
      if(windows.length)quotas.push({name:String(item.limitName || item.limit_name || item.limitId || item.limit_id || 'GPT 官方').slice(0,100),at:new Date().toISOString(),windows});
    }
    if(!quotas.length)return;
    persistQuotas(quotas,root);
  }catch{}
}
function persistQuotas(quotas:Quota[],root:string){
  const dir=path.join(root,'usage-quotas');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,processId+'.json'),tmp=file+'.tmp';let previous:Quota[]=[];try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
  const names=new Set(quotas.map(q=>q.name));fs.writeFileSync(tmp,JSON.stringify([...previous.filter(q=>!names.has(q.name)),...quotas]),{mode:0o600});fs.renameSync(tmp,file);
}
export function saveProviderQuota(model:string,headers:{get:(name:string)=>string|null}|undefined,root=dataRoot()){
  try{
    if(!headers?.get)return;
    const numeric=(name:string)=>{const raw=headers.get(name);return raw!==null && /^\d+(?:\.\d+)?$/.test(raw)?number(Number(raw)):null;};
    const requests=numeric('x-ratelimit-remaining-requests'),tokens=numeric('x-ratelimit-remaining-tokens');if(requests===null && tokens===null)return;
    const reset=(name:string)=>{const raw=headers.get(name)||'';return /^(?:\d+(?:\.\d+)?(?:ms|s|m|h|d))+$|^\d{4}-\d\d-\d\dT[\d:.+-]+Z?$/.test(raw)?raw.slice(0,80):undefined;};
    persistQuotas([{name:model,at:new Date().toISOString(),windows:[],...(requests!==null?{remainingRequests:requests}:{}),...(tokens!==null?{remainingTokens:tokens}:{}),resetRequests:reset('x-ratelimit-reset-requests'),resetTokens:reset('x-ratelimit-reset-tokens')}],root);
  }catch{}
}
export function readPrices(root=dataRoot()):Record<string,Price>{
  const file=path.join(root,'usage-prices.json');if(!fs.existsSync(file))return {};
  try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw new Error('计费设置无法读取。');}
}
export function savePrice(model:string,price:Price,root=dataRoot()){
  if(!model || model.length>400 || ['__proto__','prototype','constructor'].includes(model) || !['USD','CNY'].includes(price.currency) || number(price.input)===null || number(price.output)===null || (price.cachedInput!==undefined && number(price.cachedInput)===null) || (price.monthlyBudget!==undefined && number(price.monthlyBudget)===null))throw new Error('请输入有效的模型单价和预算。');
  const prices=readPrices(root);prices[model]=price;fs.mkdirSync(root,{recursive:true});
  const file=path.join(root,'usage-prices.json'),tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(prices,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,file);
}
function estimate(r:{input:number;output:number;cached:number},p:Price){const cached=Math.min(r.input,r.cached);return ((r.input-cached)*p.input+cached*(p.cachedInput??p.input)+r.output*p.output)/1000000;}
export function usageSnapshot(period='month',root=dataRoot()):UsageSnapshot{
  if(!['today','month','all'].includes(period))throw new Error('统计范围无效。');
  const prices=readPrices(root),rows=new Map<string,UsageRow>(),monthly=new Map<string,number>(),monthlyMissing=new Set<string>();
  const today=day(),month=today.slice(0,7),dir=path.join(root,'usage'),seen=new Set<string>();
  if(fs.existsSync(dir))for(const date of fs.readdirSync(dir).filter(s=>/^\d{4}-\d{2}-\d{2}$/.test(s))){
    const included=period==='all' || (period==='today'?date===today:date.startsWith(month));
    if(!included && !date.startsWith(month))continue;
    for(const file of fs.readdirSync(path.join(dir,date)).filter(s=>s.endsWith('.jsonl'))){
      let lines:string[];try{lines=fs.readFileSync(path.join(dir,date,file),'utf8').split('\n');}catch{continue;}
      for(const line of lines){
        let r:UsageRecord;try{r=JSON.parse(line);}catch{continue;}
        if(!r.id || typeof r.model!=='string' || seen.has(r.id))continue;seen.add(r.id);
        const input=number(r.input),output=number(r.output),cached=number(r.cached)||0,reasoning=number(r.reasoning)||0;
        const p=prices[r.model],cost=p && input!==null && output!==null?estimate({input,output,cached},p):null;
        if(date.startsWith(month) && (input===null || output===null))monthlyMissing.add(r.model);
        if(cost!==null && date.startsWith(month))monthly.set(r.model,(monthly.get(r.model)||0)+cost);
        if(!included)continue;
        let row=rows.get(r.model);if(!row){row={model:r.model,requests:0,failed:0,unknownUsage:0,input:0,output:0,cached:0,reasoning:0,cost:p?0:null,currency:p?.currency,monthlyCost:null,budgetRemaining:null};rows.set(r.model,row);}
        row.requests++;if(r.status!=='completed')row.failed++;if(input===null || output===null)row.unknownUsage++;
        row.input+=input||0;row.output+=output||0;row.cached+=cached;row.reasoning+=reasoning;if(cost!==null)row.cost=(row.cost||0)+cost;
      }
    }
  }
  for(const row of rows.values()){
    const p=prices[row.model];row.monthlyCost=p?monthly.get(row.model)||0:null;
    if(p?.monthlyBudget!==undefined && !monthlyMissing.has(row.model))row.budgetRemaining=Math.max(0,p.monthlyBudget-(row.monthlyCost||0));
  }
  let quotas:Quota[]=[];const quotaDir=path.join(root,'usage-quotas');
  if(fs.existsSync(quotaDir)){
    const merged=new Map<string,Quota>();
    for(const file of fs.readdirSync(quotaDir).filter(s=>s.endsWith('.json'))){try{for(const q of JSON.parse(fs.readFileSync(path.join(quotaDir,file),'utf8')) as Quota[])if(!merged.has(q.name) || merged.get(q.name)!.at<q.at)merged.set(q.name,q);}catch{}}
    const normalized=new Map<string,Quota>();for(const q of merged.values()){const name=q.name==='codex'?'GPT 官方':q.name;if(!normalized.has(name)||normalized.get(name)!.at<q.at)normalized.set(name,{...q,name});}quotas=[...normalized.values()];
  }
  return {period,rows:[...rows.values()].sort((a,b)=>b.requests-a.requests),prices,quotas};
}

// Read a copy of SSE text while passing the original bytes through unchanged.
export function usageSse(observer:ReturnType<typeof usageAttempt>){
  const decoder=new TextDecoder();let buffer='';
  return (chunk:Uint8Array)=>{
    try{
      buffer+=decoder.decode(chunk,{stream:true});
      let match:RegExpExecArray|null;
      while((match=/\r?\n\r?\n/.exec(buffer))){const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data && data!=='[DONE]'){try{observer.observe(JSON.parse(data));}catch{}}}
      if(buffer.length>4*1024*1024)buffer='';
    }catch{}
  };
}

