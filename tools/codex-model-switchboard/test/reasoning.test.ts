import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPresets,modelInfos,validateSettings,modelContextWindow} from '../src/config.ts';
import type {Provider,Json} from '../src/config.ts';
import {reasoningProfile} from '../src/reasoning.ts';
import {runAdapter} from '../src/adapters.ts';
import {SignatureStore} from '../src/conversion.ts';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const vertex:Provider={id:'vertex',label:'Vertex',type:'vertex',models:['gemini-4-argon'],project:'fixture',location:'global',credentialsFile:path.join(os.tmpdir(),'fixture.json')};
test('catalog advertises real model-specific effort levels and explicit compatible-provider capabilities',()=>{
 const settings={version:1 as const,providers:[vertex]},preset=modelPresets(settings)[0],info=modelInfos(settings)[0];
 assert.deepEqual(preset.supportedReasoningEfforts.map((p:Json)=>p.reasoningEffort),['low','medium','high']);
 assert.equal(preset.defaultReasoningEffort,'medium');assert.deepEqual(info.supported_reasoning_levels.map((p:Json)=>p.effort),['low','medium','high']);
 assert.deepEqual(reasoningProfile(vertex,'gemini-3-pro-preview').levels,['low','high']);
 assert.equal(reasoningProfile(vertex,'gemini-2.5-flash').mode,'gemini-budget');
 const api:Provider={id:'api',label:'API',type:'responses',models:['known','unknown'],baseUrl:'https://example.invalid/v1',reasoning:{known:'low-medium-high-xhigh'}};
 const presets=modelPresets({version:1,providers:[api]});assert.equal(presets[0].supportedReasoningEfforts.length,4);assert.equal(presets[1].supportedReasoningEfforts.length,1);
 assert.throws(()=>validateSettings({version:1,providers:[{...vertex,reasoning:{'gemini-4-argon':'low-medium-high-xhigh'}}]}),/不支持/);
 for(const preset of ['gemini-budget','minimal-low-medium-high'] as const)assert.throws(()=>validateSettings({version:1,providers:[{...vertex,reasoning:{'gemini-4-argon':preset}}]}),/不支持所选/);
 assert.throws(()=>validateSettings({version:1,providers:[{...api,reasoning:{unknown:'gemini-budget'}}]}),/仅用于/);
});

test('Argon advertises its verified unified 1M window, preserving explicit caps and other model defaults',()=>{
 const info=modelInfos({version:1,providers:[vertex]},{context_window:128000,max_context_window:128000})[0];
 assert.equal(info.context_window,1048576);assert.equal(info.max_context_window,1048576);assert.equal(info.effective_context_window_percent,95);
 assert.equal(modelContextWindow(vertex,'gemini-4-argon-cyber-permissive'),1048576);
 assert.equal(modelContextWindow({...vertex,contextWindow:128000},'gemini-4-argon'),128000);
 assert.equal(modelContextWindow(vertex,'unverified-model'),128000);
 assert.equal(modelContextWindow({...vertex,type:'responses'},'gemini-4-argon'),128000);
});

test('selected effort reaches Vertex level/budget and compatible Responses/Chat request fields',async()=>{
 const signatures=new SignatureStore(fs.mkdtempSync(path.join(os.tmpdir(),'reasoning-fixture-'))),signal=new AbortController().signal;
 const captured:Json[]=[];
 const invoke=async(p:Provider,model:string,effort:string)=>{
   const events:Json[]=[];
   await runAdapter(p,model,{model:'thirdparty/fixture/'+model,input:[],reasoning:{effort}},e=>events.push(e),signal,{signatures,getKey:()=>'',vertexAuth:{getToken:async()=> 'fixture-token'} as any,fetcher:async(_url:any,options:any)=>{
     captured.push(JSON.parse(options.body));
     const event=p.type==='vertex'?{candidates:[{content:{parts:[{text:'ok'}]},finishReason:'STOP'}]}:p.type==='responses'?{type:'response.completed',response:{status:'completed'}}:{choices:[{delta:{content:'ok'},finish_reason:'stop'}]};
     return {ok:true,body:{async *[Symbol.asyncIterator](){yield Buffer.from('data: '+JSON.stringify(event)+'\n\n');}}} as any;
   }});
   assert(!events.some(e=>e.type==='response.failed'),JSON.stringify(events));return captured.at(-1)!;
 };
 for(const effort of ['low','medium','high']){const body=await invoke(vertex,'gemini-4-argon',effort);assert.deepEqual(body.generationConfig.thinkingConfig,{thinkingLevel:effort.toUpperCase()});}
 assert.deepEqual((await invoke(vertex,'gemini-2.5-pro','high')).generationConfig.thinkingConfig,{thinkingBudget:24576});
 const api:Provider={id:'api',label:'API',type:'responses',models:['fixture'],baseUrl:'https://example.invalid/v1',reasoning:{fixture:'low-medium-high-xhigh'}};
 assert.equal((await invoke(api,'fixture','xhigh')).reasoning.effort,'xhigh');
 assert.equal((await invoke({...api,type:'chat-completions'},'fixture','low')).reasoning_effort,'low');
 const unknown=await invoke({...api,reasoning:undefined},'fixture','high');assert(!('reasoning' in unknown));
 const events:Json[]=[],count=captured.length;
 await runAdapter(vertex,'gemini-4-argon',{model:'alias',input:[],reasoning:{effort:'xhigh'}},e=>events.push(e),signal,{signatures});
 assert.equal(captured.length,count);assert(events.some(e=>e.type==='response.failed'));assert(!JSON.stringify(events).includes('401'));
});
