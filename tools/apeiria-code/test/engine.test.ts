import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import {Engine,engineEnvironment,isolatedSkillOverrides,verifyEngine} from '../src/engine.ts';

test('engine environment isolates official auth and storage without changing the parent',()=>{
  const source={PATH:'bin',CODEX_HOME:'official',CODEX_SQLITE_HOME:'official-db',CODEX_CLI_PATH:'official.exe',OPENAI_API_KEY:'official-secret',CHATGPT_ACCESS_TOKEN:'official-token',ACCESS_TOKEN:'token',NODE_OPTIONS:'--require injected',ELECTRON_RUN_AS_NODE:'1',GOOGLE_APPLICATION_CREDENTIALS:'vertex.json',PROJECT_VARIABLE:'preserved'};
  const env=engineEnvironment(source,path.resolve('private-home'),'local-only');
  assert.equal(source.CODEX_HOME,'official');
  assert.equal(source.OPENAI_API_KEY,'official-secret');
  assert.equal(env.OPENAI_API_KEY,undefined);
  assert.equal(env.CHATGPT_ACCESS_TOKEN,undefined);
  assert.equal(env.ACCESS_TOKEN,undefined);
  assert.equal(env.CODEX_CLI_PATH,undefined);
  assert.equal(env.NODE_OPTIONS,undefined);
  assert.equal(env.ELECTRON_RUN_AS_NODE,undefined);
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS,undefined);
  assert.equal(env.CODEX_HOME,path.resolve('private-home'));
  assert.equal(env.CODEX_SQLITE_HOME,path.resolve('private-home','sqlite'));
  assert.equal(env.APEIRIA_LOOPBACK_TOKEN,'local-only');
  assert.equal(env.PROJECT_VARIABLE,'preserved');
});

test('bundled manifest checks every file and requires the requested executable',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'apeiria-manifest-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const file=path.join(directory,'codex.exe'),support=path.join(directory,'sandbox.exe'),manifest=path.join(directory,'manifest.json');
  await fs.writeFile(file,'engine');await fs.writeFile(support,'sandbox');
  const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
  const data={version:'test',files:[{path:'codex.exe',sha256:hash('engine')},{path:'sandbox.exe',sha256:hash('sandbox')}]};
  await fs.writeFile(manifest,JSON.stringify(data));
  assert.equal(await verifyEngine(file,manifest),'test');
  await fs.writeFile(support,'modified');
  await assert.rejects(verifyEngine(file,manifest),/校验失败/);
  await fs.writeFile(support,'sandbox');
  await assert.rejects(verifyEngine(manifest,manifest),/未列入/);
  data.files[1]={path:'../escape',sha256:hash('escape')};
  await fs.writeFile(manifest,JSON.stringify(data));
  await assert.rejects(verifyEngine(file,manifest));
});

test('global skills are disabled by path while the independent personal directory is preserved',async t=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'apeiria-skills-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const profile=path.join(directory,'profile'),home=path.join(directory,'engine-home');
  const external=path.join(profile,'.agents','skills','external'),personal=path.join(home,'skills','personal');
  await fs.mkdir(external,{recursive:true});await fs.mkdir(personal,{recursive:true});
  await fs.writeFile(path.join(external,'SKILL.md'),'external');await fs.writeFile(path.join(personal,'SKILL.md'),'personal');
  const disabled=await isolatedSkillOverrides({USERPROFILE:profile,CODEX_HOME:home},home);
  assert.ok(disabled.some(entry=>entry.path===path.join(external,'SKILL.md')&&!entry.enabled));
  assert.ok(!disabled.some(entry=>entry.path.startsWith(home)));
});

test('external endpoints are rejected before launching a process',async()=>{
  const engine=new Engine({cliPath:path.resolve('missing.exe'),home:path.resolve('private-home'),workspace:process.cwd(),bridgeUrl:'https://api.openai.com/v1',backendUrl:'http://127.0.0.1:1',token:'local',catalog:{models:[]},onEvent(){},onRequest(){}});
  await assert.rejects(engine.start(),/本机 HTTP/);
  await engine.dispose();
});

test('disposed engines and official login operations cannot be started',async()=>{
  const engine=new Engine({cliPath:path.resolve('missing.exe'),home:path.resolve('private-home'),workspace:process.cwd(),bridgeUrl:'http://127.0.0.1:1/v1',backendUrl:'http://127.0.0.1:1',token:'local',catalog:{models:[]},onEvent(){},onRequest(){}});
  await assert.rejects(engine.rpc('account/login/start',{type:'chatgpt'}),/第三方渠道/);
  await engine.dispose();
  await assert.rejects(engine.start(),/已关闭/);
});
