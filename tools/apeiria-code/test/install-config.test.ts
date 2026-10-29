import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parse} from 'jsonc-parser';
import {enableNativeApis,configureNativeApis,independentExtensionId} from '../src/install-config.ts';

test('native API configuration retains comments, original options and other extension grants',()=>{
  const before='// startup settings\r\n{\r\n\t"locale": "zh-cn",\r\n\t// retain the existing grant\r\n\t"enable-proposed-api": ["another.extension",],\r\n\t"enable-crash-reporter": false,\r\n}\r\n';
  const after=enableNativeApis(before),value=parse(after);
  assert.deepEqual(value,{'locale':'zh-cn','enable-proposed-api':['another.extension',independentExtensionId],'enable-crash-reporter':false});
  assert(after.includes('// startup settings\r\n'));assert(after.includes('// retain the existing grant'));assert.equal(enableNativeApis(after),after);
  assert.deepEqual(parse(enableNativeApis('{"locale":"zh-cn"}')),{'locale':'zh-cn','enable-proposed-api':[independentExtensionId]});
  for(const invalid of ['{broken','[]','{"enable-proposed-api":false}','{"enable-proposed-api":[4]}','{"enable-proposed-api":[],"enable-proposed-api":[]}'])assert.throws(()=>enableNativeApis(invalid),/原文件未修改/);
});

test('startup configuration has a byte-for-byte backup and invalid existing data is never overwritten',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-install-config-')),file=path.join(root,'argv.json');
  try{
    const before='// user comment\n{"locale":"zh-cn"}\n';fs.writeFileSync(file,before);
    const result=configureNativeApis(file);assert(result.changed&&result.backup);assert.equal(fs.readFileSync(result.backup,'utf8'),before);
    assert.equal(configureNativeApis(file).changed,false);assert.equal(fs.readdirSync(root).length,2);
    fs.writeFileSync(file,'\uFEFF'+fs.readFileSync(file,'utf8'));assert.equal(configureNativeApis(file).changed,false);assert.equal(fs.readFileSync(file,'utf8').charCodeAt(0),0xFEFF);
    fs.writeFileSync(file,'{broken');assert.throws(()=>configureNativeApis(file));assert.equal(fs.readFileSync(file,'utf8'),'{broken');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
