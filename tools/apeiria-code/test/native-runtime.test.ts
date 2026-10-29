import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {readDescriptor,buildNativeInvocation,sanitizeArgs,sanitizeClientMessage,modelListResult} from '../src/native-runtime.ts';
import type {NativeDescriptor} from '../src/native-runtime.ts';
import {modelInfos} from '../src/config.ts';
import {ResponseEmitter} from '../src/conversion.ts';
import {applyNativeModelBaseline,nativePlaceholderSlug} from '../src/native-models.ts';
import type {Json} from '../src/types.ts';

const project=path.resolve('.');
function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-native-runtime-')),home=path.join(root,'engine-home'),workspace=path.join(root,'workspace');
  fs.mkdirSync(home);fs.mkdirSync(workspace);
  const catalogPath=path.join(home,'models.json');
  fs.writeFileSync(catalogPath,JSON.stringify({models:modelInfos({version:1,providers:[{id:'fixture',label:'Fixture',type:'responses',baseUrl:'http://127.0.0.1:1/v1',models:['one','two'],reasoning:{one:'default',two:'default'}}]})}));
  const descriptor:NativeDescriptor={version:1,root,home,cliPath:path.join(project,'engine','windows-x86_64','codex.exe'),manifestPath:path.join(project,'engine','manifest.json'),bridgeUrl:'http://127.0.0.1:1/v1',backendUrl:'http://127.0.0.1:1/backend',token:'local-native-token',catalogPath,nativeVersion:'26.1021.22027'};
  const file=path.join(root,'native-runtime.json');fs.writeFileSync(file,JSON.stringify(descriptor));
  return {root,home,workspace,descriptor,file};
}

test('native descriptor refuses remote endpoints and keeps all state in its own root',()=>{
  const f=fixture();try{
    assert.equal(readDescriptor(f.file).home,f.home);
    fs.writeFileSync(f.file,JSON.stringify({...f.descriptor,bridgeUrl:'https://example.invalid/v1'}));assert.throws(()=>readDescriptor(f.file),/loopback/);
    fs.writeFileSync(f.file,JSON.stringify({...f.descriptor,catalogPath:path.join(f.root,'..','outside.json')}));assert.throws(()=>readDescriptor(f.file),/专属存储/);
    fs.writeFileSync(f.file,JSON.stringify({...f.descriptor,home:path.join(os.homedir(),'.codex')}));assert.throws(()=>readDescriptor(f.file),/专属存储/);
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('native invocation preserves ordinary host flags while isolating auth, provider, paths and parent environment',async()=>{
  const f=fixture();try{
    const original={...process.env,OPENAI_API_KEY:'official-key-sentinel',CODEX_HOME:path.join(f.root,'official-home')};
    const result=await buildNativeInvocation(f.descriptor,['-c','model_provider="openai"','-c','features.example=true','--config=chatgpt_base_url="https://example.invalid"','app-server','--analytics-default-enabled'],original);
    assert.equal(original.OPENAI_API_KEY,'official-key-sentinel');assert.equal(result.env.OPENAI_API_KEY,undefined);assert.equal(result.env.CODEX_HOME,f.home);assert.equal(result.env.APEIRIA_LOOPBACK_TOKEN,f.descriptor.token);
    assert(result.args.includes('features.example=true'));assert(result.args.includes('--analytics-default-enabled'));assert(!result.args.includes('model_provider="openai"'));assert(!result.args.some(a=>a.includes('example.invalid')));
    assert(result.args.includes('model_provider="apeiria"'));assert(result.args.includes('model_providers.apeiria.requires_openai_auth=false'));
    for(const name of ['plugins','remote_plugin','recommended_plugins','apps'])assert(result.args.includes('features.'+name+'=false'));
    assert.deepEqual(sanitizeArgs(['-c','features={plugins=true}','-c','skills={config=[]}','-c','features.example=true']),['-c','features.example=true']);
    assert.throws(()=>sanitizeArgs(['--remote','ws://example.invalid']),/渠道配置/);
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('only account switching and critical request overrides are changed by the stdio adapter',()=>{
  const f=fixture();try{
    assert.throws(()=>sanitizeClientMessage({id:1,method:'account/login/start',params:{type:'chatgpt'}},f.descriptor),/未开放/);
    assert.throws(()=>sanitizeClientMessage({id:2,method:'account/logout'},f.descriptor),/未开放/);
    const original={id:3,method:'config/read',params:{includeLayers:true}};assert.equal(sanitizeClientMessage(original,f.descriptor),original);
    const thread=sanitizeClientMessage({id:4,method:'thread/start',params:{modelProvider:'openai',approvalPolicy:'on-request',config:{model_provider:'openai',model_context_window:256000,features:{plugins:true},skills:{config:[]},'features.example':true}}},f.descriptor);
    assert.equal(thread.params.modelProvider,'apeiria');assert.equal(thread.params.config.model_provider,undefined);assert.equal(thread.params.config.model_context_window,256000);assert.equal(thread.params.approvalPolicy,'on-request');
    assert.equal(thread.params.config.features,undefined);assert.equal(thread.params.config.skills,undefined);assert.equal(thread.params.config['features.example'],true);
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('native model discovery uses the latest independent catalog and deterministic pagination',()=>{
  const f=fixture();try{
    const catalog=JSON.parse(fs.readFileSync(f.descriptor.catalogPath,'utf8'));
    const first=modelListResult({data:[{id:'old',futureField:'retained'}]}, {limit:1},catalog);
    assert.equal(first.data[0].model,'thirdparty/fixture/one');assert.equal(first.data[0].futureField,'retained');assert.equal(first.nextCursor,'apeiria-local:1');
    const second=modelListResult(first,{cursor:first.nextCursor,limit:1},catalog);assert.equal(second.data[0].model,'thirdparty/fixture/two');assert.equal(second.nextCursor,null);
    assert.throws(()=>modelListResult(first,{cursor:'foreign'},catalog),/分页/);
    const unconfigured={models:[{slug:nativePlaceholderSlug,visibility:'hide',supported_in_api:false}]};
    assert.deepEqual(modelListResult(first,{includeHidden:true},unconfigured).data,[]);
  }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('real native launcher transparently serves the full app-server protocol without OpenAI login', {skip:process.platform!=='win32'||!fs.existsSync(path.join(project,'dist','apeiria-native-cli.exe')),timeout:50000},async t=>{
  const f=fixture(),requests:Json[]=[],messages:Json[]=[],pending=new Map<number,{resolve:(r:any)=>void;reject:(e:Error)=>void;timer:NodeJS.Timeout}>();
  const baseline=JSON.parse(fs.readFileSync(path.join(project,'engine/native-model-baseline.json'),'utf8'));
  const configuredCatalog=applyNativeModelBaseline(JSON.parse(fs.readFileSync(f.descriptor.catalogPath,'utf8')),baseline);
  fs.writeFileSync(f.descriptor.catalogPath,JSON.stringify(applyNativeModelBaseline({models:[]},baseline)));
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};requests.push({path:req.url,body,authorization:req.headers.authorization});
    if(req.url!=='/v1/responses'){res.writeHead(404).end('{}');return;}
    const emitter=new ResponseEmitter(body.model,event=>res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`));
    res.writeHead(200,{'content-type':'text/event-stream'});emitter.start();emitter.text('Native stdio smoke OK');emitter.finish({input_tokens:7,output_tokens:5,total_tokens:12});res.end();
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=(server.address()as{port:number}).port;
  f.descriptor.bridgeUrl=`http://127.0.0.1:${port}/v1`;f.descriptor.backendUrl=`http://127.0.0.1:${port}/backend`;fs.writeFileSync(f.file,JSON.stringify(f.descriptor));
  // The user config must not override the launcher's forced provider,
  // data paths or disabled official service features.
  fs.writeFileSync(path.join(f.home,'config.toml'),`model_provider="profile-sentinel"\n[features]\nplugins=true\n[model_providers.profile-sentinel]\nname="Local override fixture"\nbase_url="http://127.0.0.1:${port}/blocked-profile"\nwire_api="responses"\nrequires_openai_auth=true\n`);
  let id=0,stderr='';const readers:readline.Interface[]=[];
  const launch=()=>{
    const running=spawn(path.join(project,'dist','apeiria-native-cli.exe'),['-c','model_provider="openai"','-c','features.native_runtime_fixture=true','app-server'],{cwd:f.workspace,env:{...process.env,APEIRIA_NATIVE_DESCRIPTOR:f.file,OPENAI_API_KEY:'official-sentinel',CODEX_HOME:path.join(f.root,'official-home'),HTTP_PROXY:'http://127.0.0.1:1',HTTPS_PROXY:'http://127.0.0.1:1',ALL_PROXY:'http://127.0.0.1:1',NO_PROXY:'127.0.0.1,localhost,::1'},windowsHide:true,stdio:['pipe','pipe','pipe']});
    const lines=readline.createInterface({input:running.stdout,crlfDelay:Infinity});readers.push(lines);
    running.stderr.on('data',chunk=>{stderr+=String(chunk);});
    lines.on('line',line=>{const value=JSON.parse(line);messages.push(value);if(value.method&&value.id!=null)running.stdin.write(JSON.stringify({id:value.id,result:{decision:'decline'}})+'\n');else if(value.id!=null){const p=pending.get(value.id);if(p){pending.delete(value.id);clearTimeout(p.timer);value.error?p.reject(Object.assign(Error(value.error.message),{code:value.error.code})):p.resolve(value.result);}}});
    return running;
  };
  let child=launch();
  const rpc=(method:string,params:Json={})=>new Promise<any>((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(Error(`Missing RPC ${method}: ${stderr}`));},12000);pending.set(next,{resolve,reject,timer});child.stdin.write(JSON.stringify({id:next,method,params})+'\n');});
  const until=async(predicate:()=>boolean)=>{for(let i=0;i<1000;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('Missing native event: '+stderr);};
  const initialize=async()=>{await rpc('initialize',{clientInfo:{name:'apeiria_native_runtime_test',title:'Native Runtime Test',version:'0.2.0'},capabilities:{experimentalApi:true}});child.stdin.write('{"method":"initialized"}\n');};
  t.after(async()=>{for(const p of pending.values())clearTimeout(p.timer);child.stdin.end();await Promise.race([new Promise(r=>child.once('close',r)),new Promise(r=>setTimeout(r,2000))]);if(child.exitCode===null)child.kill();for(const lines of readers)lines.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));fs.rmSync(f.root,{recursive:true,force:true});});
  await initialize();
  const account=await rpc('account/read',{refreshToken:false});assert.equal(account.account,null);assert.equal(account.requiresOpenaiAuth,false);
  await assert.rejects(rpc('account/login/start',{type:'chatgpt'}),/未开放/);
  const settings=await rpc('config/read',{includeLayers:true});assert.equal(settings.config.model_provider,'apeiria');
  assert.equal(settings.config.features.plugins,false,'user config cannot reactivate official plugin startup');
  const empty=await rpc('model/list',{includeHidden:true});assert.deepEqual(empty.data,[]);assert.equal(requests.filter(r=>r.path==='/v1/responses').length,0);
  fs.writeFileSync(f.descriptor.catalogPath,JSON.stringify(configuredCatalog));
  // ModelManager caches metadata for its process lifetime. The native host
  // reconnects only its own CLI after saving a changed model catalogue.
  const old=child;const exited=new Promise(resolve=>old.once('close',resolve));old.stdin.end();await exited;
  child=launch();await initialize();
  const first=await rpc('model/list',{limit:1});assert.equal(first.data[0].model,'thirdparty/fixture/one');
  const second=await rpc('model/list',{cursor:first.nextCursor,limit:1});assert.equal(second.data[0].model,'thirdparty/fixture/two');
  const thread=await rpc('thread/start',{model:'thirdparty/fixture/one',modelProvider:'openai',cwd:f.workspace,approvalPolicy:'on-request',sandbox:'workspace-write',historyMode:'paginated'});assert.equal(thread.modelProvider,'apeiria');
  await rpc('skills/list',{cwds:[f.workspace]});
  await rpc('turn/start',{threadId:thread.thread.id,input:[{type:'text',text:'hello'}]});
  await until(()=>messages.some(m=>m.method==='turn/completed'));
  assert(messages.some(m=>m.method==='item/agentMessage/delta'&&m.params.delta.includes('Native stdio')));
  const history=await rpc('thread/turns/list',{threadId:thread.thread.id,itemsView:'full'});assert.equal(history.data.length,1);
  assert(requests.some(r=>r.path==='/v1/responses'&&r.authorization==='Bearer '+f.descriptor.token));assert(!JSON.stringify(requests).includes('official-sentinel'));
  const generation=requests.find(r=>r.path==='/v1/responses')!.body;
  t.diagnostic(JSON.stringify({tools:generation.tools.map((tool:Json)=>({type:tool.type,name:tool.name})),instructions:generation.input.filter((item:Json)=>item.role==='developer').map((item:Json)=>JSON.stringify(item.content).length)}));
  assert(generation.tools.some((tool:Json)=>tool.type==='custom'&&tool.name==='exec'),'live catalog changes must retain native Code Mode');
  assert(generation.input.some((item:Json)=>item.role==='developer'&&JSON.stringify(item.content).length>20000),'the first real turn must retain the complete native instruction baseline');
  configuredCatalog.models.push({...structuredClone(configuredCatalog.models[0]),slug:'thirdparty/fixture/new-model',display_name:'Added later'});
  fs.writeFileSync(f.descriptor.catalogPath,JSON.stringify(configuredCatalog));
  const current=child,closed=new Promise(resolve=>current.once('close',resolve));current.stdin.end();await closed;child=launch();await initialize();
  const restored=await rpc('thread/resume',{threadId:thread.thread.id,model:'thirdparty/fixture/new-model',cwd:f.workspace,historyMode:'paginated'});
  assert.equal(restored.thread.id,thread.thread.id);
  await rpc('turn/start',{threadId:thread.thread.id,model:'thirdparty/fixture/new-model',input:[{type:'text',text:'continue with the newly added model'}]});
  await until(()=>messages.filter(m=>m.method==='turn/completed').length===2);
  const next=requests.filter(r=>r.path==='/v1/responses').at(-1)!.body;
  assert.equal(next.model,'thirdparty/fixture/new-model');assert(next.tools.some((tool:Json)=>tool.type==='custom'&&tool.name==='exec'));
  assert.equal((await rpc('thread/turns/list',{threadId:thread.thread.id,itemsView:'full'})).data.length,2);
  assert.equal(fs.existsSync(path.join(f.home,'auth.json')),false);assert.equal(fs.existsSync(path.join(f.root,'official-home')),false);assert(!stderr.includes(f.descriptor.token));
});
