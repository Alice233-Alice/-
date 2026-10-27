// Bounded live regression: synthetic conversation and an in-memory echo tool.
// No workbench tools, workspace content, GPT account or history are accessed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readSettings,alias} from '../src/config.ts';
import {runAdapter} from '../src/adapters.ts';
import {VertexAuth} from '../src/auth.ts';
import {SignatureStore} from '../src/conversion.ts';
import {vertexScope} from '../src/vertex.ts';
import type {Json} from '../src/config.ts';
const provider=readSettings().providers.find(p=>p.enabled!==false&&p.type==='vertex');if(!provider)throw Error('No Vertex provider');
const model=provider.models[0],root=fs.mkdtempSync(path.join(os.tmpdir(),'vertex-live-loop-'));
const deps={signatures:new SignatureStore(root),vertexAuth:new VertexAuth()},signal=AbortSignal.timeout(180000);
const tools=[{type:'function',name:'fixture_echo',description:'Diagnostic echo function. Returns the supplied value unchanged.',parameters:{type:'object',properties:{value:{type:'integer'}},required:['value'],additionalProperties:false}}];
const instructions='For this synthetic diagnostic, call fixture_echo exactly once with value 1, then after seeing its result reply OK without further tools.';
let input:Json[]=[{role:'user',content:'Run the one-call diagnostic now.'}];
const results:Json[]=[];
for(let round=0;round<3;round++){
 const events:Json[]=[];
 // Restore the store on every round to test persistence, not an in-memory cache.
 await runAdapter(provider,model,{model:alias(provider,model),instructions,input,tools,reasoning:{effort:'low'},max_output_tokens:1024},e=>events.push(e),signal,{...deps,signatures:new SignatureStore(root)});
 const terminal=events.at(-1)!;if(terminal.type!=='response.completed')throw Error(terminal.response?.error?.message||'No completion');
 const output=terminal.response.output,calls=output.filter((i:Json)=>i.call_id);
 const cached=new SignatureStore(root).getTurn(calls[0]?.call_id||output[0]?.id,vertexScope(provider,model));
 const signaturePresent=!!cached?.parts.some((part:Json)=>typeof part.thoughtSignature==='string'&&part.thoughtSignature.length>0);
 results.push({round:round+1,toolCalls:calls.length,signaturePresent,usage:terminal.response.usage});
 input.push(...output);
 if(round===0){assert.equal(calls.length,1,'Diagnostic model did not make exactly one echo call');assert(signaturePresent,'Expected a real Google tool thought signature');for(const call of calls)input.push({type:'function_call_output',call_id:call.call_id,output:'1'});}
 else if(round===1){assert.equal(calls.length,0);input.push({role:'user',content:'Now just reply OK again, without calling tools.'});}
 else assert.equal(calls.length,0);
}
console.log(JSON.stringify({model,location:provider.location,status:'passed',checks:['native signed tool round trip','disk-restored signatures','multi-turn continuation'],results}));
