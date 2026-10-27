import fs from 'node:fs';
import path from 'node:path';
import {dataRoot} from './config.ts';
import type {VertexDiagnostic} from './vertex.ts';

// Store structured status/field paths only. Provider error text is shown in the
// failed turn but is not persisted here because it may echo request content.
export function recordVertexDiagnostic(record:VertexDiagnostic,root=dataRoot()){
  try{
    const file=path.join(root,'vertex-diagnostics.jsonl');fs.mkdirSync(root,{recursive:true});
    if(fs.existsSync(file)&&fs.statSync(file).size>131072){const lines=fs.readFileSync(file,'utf8').trim().split('\n').slice(-100);fs.writeFileSync(file,lines.join('\n')+'\n',{mode:0o600});}
    const fields=record.fields.map(f=>f.split(':')[0].replace(/[^a-zA-Z0-9_.\[\]-]/g,'').slice(0,200));
    fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),model:record.model,attempt:record.attempt,status:record.status,googleStatus:record.googleStatus,retryInMs:record.retryInMs,fields,partial:record.partial})+'\n',{mode:0o600});
  }catch{} // Diagnostics must not break a model request.
}
export function vertexDiagnostics(root=dataRoot()):string[]{
  try{return fs.readFileSync(path.join(root,'vertex-diagnostics.jsonl'),'utf8').trim().split('\n').slice(-20).map(line=>{const d=JSON.parse(line);return `${d.at} ${d.model} HTTP ${d.status} ${d.googleStatus} 尝试 ${d.attempt}${d.retryInMs===null?'':' · '+d.retryInMs+'ms 后重试'}${d.partial?' · 已收到部分内容':''}${d.fields?.length?' · 字段 '+d.fields.join(', '):''}`;});}catch{return [];}
}
