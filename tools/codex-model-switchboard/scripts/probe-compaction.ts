// Two bounded paid requests with synthetic history; no user conversation,
// official credentials or workspace content is sent to Google.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {readSettings,alias} from '../src/config.ts';
import type {Json} from '../src/config.ts';
import {runCompaction,CompactionCodec} from '../src/compaction.ts';
import {runAdapter} from '../src/adapters.ts';
import {SignatureStore} from '../src/conversion.ts';
import {VertexAuth} from '../src/auth.ts';
const provider=readSettings().providers.find(p=>p.type==='vertex'&&p.enabled!==false);if(!provider)throw Error('No configured Vertex');
const model=provider.models[0],root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-live-compact-'));
const launcher=path.resolve('dist/codex-switchboard.exe'),codec=new CompactionCodec(launcher),deps={vertexAuth:new VertexAuth(),signatures:new SignatureStore(root)};
const events:Json[]=[],signal=AbortSignal.timeout(180000);
await runCompaction(provider,model,{model:alias(provider,model),input:[{role:'user',content:'Synthetic diagnostic only. Remember the project code violet-731 and the unresolved task: verify the blue button. Do not execute any tools.'},{role:'assistant',content:'Acknowledged. The project code is violet-731, and verification of the blue button is still pending.'},{type:'compaction_trigger'}]},e=>events.push(e),signal,deps,codec);
const compact=events.at(-1);assert.equal(compact?.type,'response.completed',compact?.response?.error?.message);assert.equal(compact.response.output.length,1);assert.equal(compact.response.output[0].type,'compaction');
const restored=new CompactionCodec(launcher).expand({model:alias(provider,model),input:[...compact.response.output,{role:'user',content:'What is the project code and pending task? Reply in one sentence.'}],tools:[],reasoning:{effort:'low'},max_output_tokens:256},true);
const next:Json[]=[];await runAdapter(provider,model,restored,e=>next.push(e),signal,deps);const completed=next.at(-1);assert.equal(completed?.type,'response.completed',completed?.response?.error?.message);assert(JSON.stringify(completed.response.output).includes('violet-731'));assert(/blue button/i.test(JSON.stringify(completed.response.output)));
console.log(JSON.stringify({status:'passed',model,checks:['native compaction item','DPAPI restored by new codec','Gemini continuation preserves synthetic task'],summaryUsage:compact.response.usage,continuationUsage:completed.response.usage}));
