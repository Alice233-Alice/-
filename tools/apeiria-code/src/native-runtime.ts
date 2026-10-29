import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {engineEnvironment,isolatedSkillOverrides,verifyEngine} from './engine.ts';
import type {Json} from './types.ts';
import {nativePlaceholderSlug} from './native-models.ts';

export interface NativeDescriptor {
  version:1;root:string;home:string;cliPath:string;manifestPath:string;
  bridgeUrl:string;backendUrl:string;token:string;catalogPath:string;
  defaultModel?:string;nativeVersion:'26.1021.22027';
}
const TOKEN_ENV='APEIRIA_LOOPBACK_TOKEN';
const protectedKeys=['model_provider','model_providers','openai_base_url','chatgpt_base_url','cli_auth_credentials_store','sqlite_home','log_dir','model_catalog_json','skills.config','web_search','features.apps','features.plugins','features.remote_plugin','features.recommended_plugins'];
const protectedKey=(key:string)=>protectedKeys.some(prefix=>key===prefix||key.startsWith(prefix+'.')||prefix.startsWith(key+'.'));
function within(parent:string,file:string):boolean {const relative=path.relative(parent,file);return !relative||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
function localUrl(value:unknown):string {
  if(typeof value!=='string')throw Error('本机适配地址无效。');
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash)throw Error('本机适配地址必须为无凭证的 loopback HTTP URL。');
  return url.toString().replace(/\/$/,'');
}
export function readDescriptor(file:string):NativeDescriptor {
  if(!file||!path.isAbsolute(file))throw Error('缺少独立内核运行描述文件。');
  const value=JSON.parse(fs.readFileSync(file,'utf8')) as NativeDescriptor;
  if(!value||value.version!==1||value.nativeVersion!=='26.1021.22027')throw Error('原生客户端运行描述版本不匹配。');
  for(const key of ['root','home','cliPath','manifestPath','catalogPath'] as const)if(typeof value[key]!=='string'||!path.isAbsolute(value[key]))throw Error('独立内核路径必须为绝对路径。');
  if(!within(value.root,value.home)||!within(value.root,value.catalogPath)||path.resolve(value.home)===path.resolve(os.homedir(),'.codex'))throw Error('独立内核数据目录超出专属存储范围。');
  if(typeof value.token!=='string'||!value.token||value.token.length>4096||/[\r\n]/.test(value.token))throw Error('本机适配令牌无效。');
  value.bridgeUrl=localUrl(value.bridgeUrl);value.backendUrl=localUrl(value.backendUrl);
  readCatalog(value);return value;
}
export function readCatalog(descriptor:NativeDescriptor):Json {
  const catalog=JSON.parse(fs.readFileSync(descriptor.catalogPath,'utf8'));
  if(!catalog||!Array.isArray(catalog.models)||catalog.models.some((m:Json)=>!m||typeof m.slug!=='string'||!m.slug||/[\r\n\0]/.test(m.slug)))throw Error('独立模型目录无效。');
  return catalog;
}
function toml(value:any):string {
  if(Array.isArray(value))return '['+value.map(toml).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).map(([key,item])=>JSON.stringify(key)+'='+toml(item)).join(',')+'}';
  return JSON.stringify(value);
}
/** Preserve native CLI options except settings that would redirect credentials or model traffic. */
export function sanitizeArgs(args:string[]):string[] {
  const result:string[]=[];
  for(let i=0;i<args.length;i++){
    const arg=args[i];let config:string|undefined;
    if(arg==='-c'||arg==='--config'){
      const value=args[++i];if(value===undefined)throw Error('CLI 配置参数缺少值。');config=value;
      if(!protectedKey(value.split('=',1)[0].trim().replace(/^['"]|['"]$/g,'')))result.push(arg,value);
      continue;
    }
    if(arg.startsWith('--config='))config=arg.slice('--config='.length);
    else if(arg.startsWith('-c')&&arg!=='-c')config=arg.slice(2);
    if(config!==undefined){if(!protectedKey(config.split('=',1)[0].trim().replace(/^['"]|['"]$/g,'')))result.push(arg);continue;}
    if(['--remote','--remote-auth-token','--remote-auth-token-env','--oss','--local-provider'].includes(arg)||/^--(?:remote(?:-auth-token(?:-env)?)?|oss|local-provider)=/.test(arg))throw Error('独立原生客户端的内核与模型连接由渠道配置管理。');
    result.push(arg);
  }
  return result;
}
export async function buildNativeInvocation(descriptor:NativeDescriptor,args:string[],source:NodeJS.ProcessEnv=process.env):Promise<{args:string[];env:NodeJS.ProcessEnv}> {
  const catalog=readCatalog(descriptor),model=catalog.models.some((m:Json)=>m.slug===descriptor.defaultModel)?descriptor.defaultModel:catalog.models[0]?.slug||'apeiria-unconfigured';
  const config:Json={
    model_provider:'apeiria',model,model_catalog_json:descriptor.catalogPath,
    sqlite_home:path.join(descriptor.home,'sqlite'),log_dir:path.join(descriptor.home,'logs'),
    cli_auth_credentials_store:'file',openai_base_url:descriptor.bridgeUrl,chatgpt_base_url:descriptor.backendUrl,
    'model_providers.apeiria.name':'Apeiria Code',
    'model_providers.apeiria.base_url':descriptor.bridgeUrl,'model_providers.apeiria.env_key':TOKEN_ENV,
    'model_providers.apeiria.wire_api':'responses','model_providers.apeiria.requires_openai_auth':false,
    'model_providers.apeiria.supports_websockets':false,
    'model_providers.apeiria.request_max_retries':0,'model_providers.apeiria.stream_max_retries':0,
    'skills.config':await isolatedSkillOverrides(source,descriptor.home),
    // This core otherwise syncs its hard-coded curated GitHub/export fallback
    // even without an account. Independent MCP servers and skills stay enabled.
    web_search:'disabled','features.apps':false,'features.plugins':false,'features.remote_plugin':false,'features.recommended_plugins':false,
    'otel.exporter':'none','otel.trace_exporter':'none','analytics.enabled':false,'feedback.enabled':false,
  };
  return {args:Object.entries(config).flatMap(([key,value])=>['-c',`${key}=${toml(value)}`]).concat(sanitizeArgs(args)),env:engineEnvironment(source,descriptor.home,descriptor.token)};
}
export function sanitizeClientMessage(message:Json,descriptor:NativeDescriptor):Json {
  if(/^account\/(?:login(?:\/|$)|logout(?:\/|$))/.test(message.method||''))throw Error('Apeiria Code 使用第三方渠道，未开放官方账号登录或退出操作。');
  if(['thread/start','thread/resume','thread/fork'].includes(message.method)){
    const params={...(message.params||{})},config:Json={};
    for(const [key,value]of Object.entries(params.config||{}))if(!protectedKey(key))config[key]=value;
    config.model_catalog_json=descriptor.catalogPath;params.modelProvider='apeiria';params.config=config;
    return {...message,params};
  }
  return message;
}
export function modelListResult(result:Json,params:Json,catalog:Json):Json {
  const cursor=params.cursor;
  let offset=0;
  if(cursor!=null){const match=/^apeiria-local:(\d+)$/.exec(String(cursor));if(!match)throw Error('模型目录分页标记无效。');offset=Number(match[1]);}
  const limit=Number.isInteger(params.limit)&&params.limit>0?Math.min(params.limit,1000):100;
  const template=result?.data?.[0]||{};
  const models=catalog.models.filter((model:Json)=>model.slug!==nativePlaceholderSlug).map((model:Json,index:number)=>({
    ...template,...(result?.data?.find((known:Json)=>known.model===model.slug||known.id===model.slug)||{}),id:model.slug,model:model.slug,displayName:model.display_name||model.slug,description:model.description||'第三方模型渠道',
    hidden:['hide','none'].includes(model.visibility),isDefault:index===0,
    defaultReasoningEffort:model.default_reasoning_level||'medium',
    supportedReasoningEfforts:(model.supported_reasoning_levels||[]).map((level:Json)=>({reasoningEffort:level.effort,description:level.description||level.effort})),
    inputModalities:model.input_modalities||['text'],upgrade:null,upgradeInfo:null,
    serviceTiers:model.service_tiers||[],additionalSpeedTiers:model.additional_speed_tiers||[],
  })).filter((model:Json)=>params.includeHidden||!model.hidden);
  return {...result,data:models.slice(offset,offset+limit),nextCursor:offset+limit<models.length?`apeiria-local:${offset+limit}`:null};
}

/** Run the original app-server protocol as a transparent child, retaining native client functionality. */
export async function runNativeRuntime(args=process.argv.slice(2),descriptorFile=process.env.APEIRIA_NATIVE_DESCRIPTOR||''):Promise<number> {
  const descriptor=readDescriptor(descriptorFile);
  await verifyEngine(descriptor.cliPath,descriptor.manifestPath);
  for(const dir of [descriptor.home,path.join(descriptor.home,'sqlite'),path.join(descriptor.home,'logs'),path.join(descriptor.home,'skills')])fs.mkdirSync(dir,{recursive:true});
  const invocation=await buildNativeInvocation(descriptor,args);
  const child=spawn(descriptor.cliPath,invocation.args,{env:invocation.env,stdio:['pipe','pipe','pipe'],windowsHide:true});
  const appServer=args.includes('app-server');
  let closing=false,grace:NodeJS.Timeout|undefined;
  const terminate=()=>{if(child.pid&&process.platform==='win32'){const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});killer.once('error',()=>child.kill());}else child.kill('SIGTERM');};
  const stop=()=>{if(closing)return;closing=true;child.stdin.end();grace=setTimeout(terminate,3000);grace.unref();};
  const force=()=>{stop();terminate();};
  process.once('SIGINT',force);process.once('SIGTERM',force);
  const clean=(text:string)=>text.split(descriptor.token).join('[local token]');
  child.stderr.on('data',chunk=>process.stderr.write(clean(String(chunk))));
  child.stdin.on('error',()=>{});
  const input=appServer?readline.createInterface({input:process.stdin,crlfDelay:Infinity}):undefined;
  const output=appServer?readline.createInterface({input:child.stdout,crlfDelay:Infinity}):undefined;
  if(input&&output){
    const pendingModels=new Map<string|number,Json>();let lastModelResult:Json={data:[],nextCursor:null};
    const respond=(id:string|number,error:unknown)=>process.stdout.write(JSON.stringify({id,error:{code:-32602,message:clean(error instanceof Error?error.message:'独立客户端请求失败。')}})+'\n');
    input.on('line',line=>{
      let message:Json;
      try{message=JSON.parse(line);}catch{child.stdin.write(line+'\n');return;}
      if(!message||typeof message!=='object'||Array.isArray(message)){child.stdin.write(line+'\n');return;}
      try{
        const outgoing=sanitizeClientMessage(message,descriptor);
        if(outgoing.method==='model/list'&&outgoing.id!=null){
          if(outgoing.params?.cursor?.startsWith('apeiria-local:')){process.stdout.write(JSON.stringify({id:outgoing.id,result:modelListResult(lastModelResult,outgoing.params,readCatalog(descriptor))})+'\n');return;}
          pendingModels.set(outgoing.id,outgoing.params||{});
        }
        child.stdin.write((outgoing===message?line:JSON.stringify(outgoing))+'\n');
      }catch(error){if(message.id!=null)respond(message.id,error);}
    });
    input.on('close',stop);
    output.on('line',line=>{
      try{
        const message=JSON.parse(line),params=pendingModels.get(message.id);
        if(params){pendingModels.delete(message.id);if(message.result){message.result=modelListResult(message.result,params,readCatalog(descriptor));lastModelResult=message.result;line=JSON.stringify(message);}}
      }catch(error){try{const message=JSON.parse(line);if(message.id!=null){respond(message.id,error);return;}}catch{}}
      process.stdout.write(line+'\n');
    });
  }else{process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);process.stdin.on('end',stop);}
  return await new Promise<number>((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',code=>{clearTimeout(grace);input?.close();output?.close();process.removeListener('SIGINT',force);process.removeListener('SIGTERM',force);resolve(code??1);});
  });
}

if(/^native-runtime\.(?:cjs|js|ts)$/.test(path.basename(process.argv[1]||''))){
  runNativeRuntime().then(code=>{process.exitCode=code;},error=>{process.stderr.write('[Apeiria Code] '+(error instanceof Error?error.message:'独立内核启动失败。')+'\n');process.exitCode=1;});
}
