// Explicit, bounded live diagnostic: synthetic prompts only. Never reads GPT auth/history.
import {readSettings} from '../src/config.ts';
import {VertexAuth} from '../src/auth.ts';
import {vertexUrl} from '../src/adapters.ts';
import {request} from '../src/network.ts';
import fs from 'node:fs';
const p=readSettings().providers.find(p=>p.enabled!==false&&p.type==='vertex');
if(!p)throw Error('No enabled Vertex provider.');
const model=p.models[0],signal=AbortSignal.timeout(120000),token=await new VertexAuth().getToken(p,signal);
const payload=process.argv[2]?JSON.parse(fs.readFileSync(process.argv[2],'utf8')):{contents:[{role:'user',parts:[{text:'Reply with OK only.'}]}]};
payload.generationConfig={...payload.generationConfig,maxOutputTokens:512,thinkingConfig:{thinkingLevel:'LOW'}};
const response=await request(vertexUrl(p,model),{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload),signal});
const raw=await response.text();
if(!response.ok){let error:any;try{error=JSON.parse(raw).error;}catch{};const message=String(error?.message||'No JSON error body').replaceAll(token,'[redacted]').replaceAll(p.project!,'[project]').slice(0,2500);console.log(JSON.stringify({model,location:p.location,status:response.status,googleStatus:error?.status,message,details:error?.details?.map((d:any)=>({type:d['@type'],violations:d.fieldViolations?.map((f:any)=>({field:f.field,description:f.description}))}))}));process.exitCode=1;}
else{const rows=raw.split('\n').filter((s:string)=>s.startsWith('data:')).map((s:string)=>{try{return JSON.parse(s.slice(5));}catch{return {};}});console.log(JSON.stringify({model,location:p.location,status:response.status,finishReasons:rows.flatMap((r:any)=>r.candidates?.map((c:any)=>c.finishReason).filter(Boolean)||[]),usage:rows.findLast((r:any)=>r.usageMetadata)?.usageMetadata}));}
