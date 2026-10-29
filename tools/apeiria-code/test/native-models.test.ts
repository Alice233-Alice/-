import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {applyNativeModelBaseline,extractEmbeddedModelCatalog,nativeBaselineSlug,nativeCoreVersion,nativePlaceholderSlug} from '../src/native-models.ts';

const hash=(bytes:Buffer|string)=>crypto.createHash('sha256').update(bytes).digest('hex');
const file=path.resolve('engine/windows-x86_64/codex.exe');
const extraction=fs.existsSync(file)?extractEmbeddedModelCatalog(fs.readFileSync(file)):undefined;

test('native baseline comes from the verified bundled CLI rather than the fixture prompt',{skip:!extraction},()=>{
  const model=extraction!.catalog.models.find((m:any)=>m.slug===nativeBaselineSlug);
  assert(model.model_messages.instructions_template.length>20000);
  for(const group of ['tools','approvals','collaboration_modes','multi_agent','permissions','token_budget'])assert(group in model.model_messages,group);
  assert.equal(model.multi_agent_version,'v2');assert.equal(model.tool_mode,'code_mode_only');
  assert(extraction!.length>400000);assert.equal(extraction!.catalog.models.length,11);
});

test('provider model identity and limits remain independent from native agent instructions',{skip:!extraction},()=>{
  const original=extraction!.catalog.models.find((m:any)=>m.slug===nativeBaselineSlug);
  const baseline={coreVersion:nativeCoreVersion,baselineSlug:nativeBaselineSlug,model:original};
  const provider={models:[{slug:'thirdparty/demo/model',display_name:'Demo',context_window:100000,max_context_window:100000,auto_compact_token_limit:85000,input_modalities:['text'],default_reasoning_level:'medium',supported_reasoning_levels:[{effort:'medium',description:'Provider default'}],supports_reasoning_summaries:false,supports_reasoning_summary_parameter:false,supports_reasoning_effort_updates:false,base_instructions:'old generic placeholder',multi_agent_version:null,model_messages:null}]};
  const before=JSON.stringify(provider),result=applyNativeModelBaseline(provider,baseline),model=result.models[0];
  assert.equal(JSON.stringify(provider),before);
  assert.equal(model.slug,'thirdparty/demo/model');assert.equal(model.context_window,100000);assert.deepEqual(model.input_modalities,['text']);
  assert.deepEqual(model.model_messages,original.model_messages);assert.equal(model.multi_agent_version,'v2');assert.equal(model.tool_mode,'code_mode_only');
  assert.equal(model.supports_search_tool,false);assert.equal(model.supports_experimental_context,false);assert.equal(model.prefer_websockets,false);
  assert.equal(model.guardian,null);assert.equal(model.auto_review_model_override,null);assert.deepEqual(model.available_in_plans,[]);
  assert(!('base_instructions' in model));assert.equal(model.supports_reasoning_summaries,false);
  assert.throws(()=>applyNativeModelBaseline(provider,{...baseline,coreVersion:'other'}),/基线无效/);
});

test('preparing baseline appends an integrity record without modifying the binary',{skip:!extraction},async()=>{
  const utility='../scripts/prepare-native-models.mjs';const {prepareNativeModels}=await import(utility);
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-models-'));fs.mkdirSync(path.join(directory,'windows-x86_64'));
  const originalBytes=fs.readFileSync(file),originalChecksum=hash(originalBytes);
  // A small container keeps this storage test independent of cross-volume hard links.
  // Its embedded catalog is copied byte-for-byte from the already verified real binary.
  const container=Buffer.concat([Buffer.from('PE-test\0'),originalBytes.subarray(extraction!.offset,extraction!.offset+extraction!.length),Buffer.from('\0end')]);
  fs.writeFileSync(path.join(directory,'windows-x86_64/codex.exe'),container);
  const checksum=hash(container);
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({version:nativeCoreVersion,files:[{path:'windows-x86_64/codex.exe',sha256:checksum}]}));
  const result=prepareNativeModels(directory),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
  assert.equal(result.source.binarySha256,checksum);assert.equal(result.source.catalogSha256,extraction!.sha256);
  const entry=manifest.files.find((f:any)=>f.path==='native-model-baseline.json');assert.equal(entry.sha256,hash(fs.readFileSync(path.join(directory,entry.path))));
  assert.equal(hash(fs.readFileSync(file)),originalChecksum);
});

test('an unconfigured profile has a hidden startup entry without advertising an upstream model',{skip:!extraction},()=>{
  const baseline={coreVersion:nativeCoreVersion,baselineSlug:nativeBaselineSlug,model:extraction!.catalog.models.find((m:any)=>m.slug===nativeBaselineSlug)};
  const result=applyNativeModelBaseline({models:[]},baseline);
  assert.equal(result.models.length,1);
  assert.equal(result.models[0].slug,nativePlaceholderSlug);
  assert.equal(result.models[0].visibility,'hide');
  assert.equal(result.models[0].supported_in_api,false);
  assert.equal(result.models[0].multi_agent_version,'v2');
  assert.equal(result.models[0].model_messages.instructions_template,baseline.model.model_messages.instructions_template);
});

test('non-catalog and incomplete binary data cannot become a native baseline',()=>{
  assert.throws(()=>extractEmbeddedModelCatalog(Buffer.from('plain text')),/没有找到/);
  assert.throws(()=>extractEmbeddedModelCatalog(Buffer.from('{"models": [{"slug":"gpt-6.1-sol"}]}')),/没有找到/);
});
