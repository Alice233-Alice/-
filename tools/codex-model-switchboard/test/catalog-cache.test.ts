import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {refreshCachedModels} from '../src/catalog-cache.ts';
import type {Settings} from '../src/config.ts';
test('startup refresh removes stale third-party windows while preserving official catalog and identity',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-catalog-')),file=path.join(root,'models_cache.json');
 const official={slug:'fixture-gpt',context_window:500000,auto_compact_token_limit:450000,base_instructions:'official fixture'};
 const cache={fetched_at:new Date().toISOString(),client_version:'fixture',identity:{fixture:true},models:[official,{slug:'thirdparty/vertex/gemini-4-argon',context_window:128000}]};
 fs.writeFileSync(file,JSON.stringify(cache));fs.writeFileSync(path.join(root,'auth.json'),'do not touch');fs.mkdirSync(path.join(root,'sessions'));fs.writeFileSync(path.join(root,'sessions','fixture'),'history intact');
 const settings:Settings={version:1,providers:[{id:'vertex',label:'Vertex',type:'vertex',models:['gemini-4-argon'],project:'fixture',credentialsFile:path.join(root,'not-read.json')}]};
 refreshCachedModels(settings,root);const after=JSON.parse(fs.readFileSync(file,'utf8'));assert.deepEqual(after.models[0],official);assert.equal(after.models[1].context_window,1048576);assert.equal(after.models[1].auto_compact_token_limit,null);assert.deepEqual(after.identity,cache.identity);assert.equal(after.fetched_at,cache.fetched_at);assert.equal(after.client_version,cache.client_version);assert.equal(fs.readFileSync(path.join(root,'auth.json'),'utf8'),'do not touch');assert.equal(fs.readFileSync(path.join(root,'sessions','fixture'),'utf8'),'history intact');
 const updated=fs.readFileSync(file);refreshCachedModels(settings,root);assert.deepEqual(fs.readFileSync(file),updated);
});
