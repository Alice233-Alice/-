import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process';
import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import type {Json} from './types.ts';

export interface EngineOptions {
  cliPath:string;
  manifestPath?:string;
  home:string;
  workspace:string;
  bridgeUrl:string;
  backendUrl:string;
  token:string;
  catalog:Json;
  onEvent:(method:string,params:Json)=>void;
  onRequest:(id:string|number,method:string,params:Json)=>void;
  onStatus?:(status:string)=>void;
  requestTimeoutMs?:number;
}

interface Pending {resolve:(value:any)=>void;reject:(reason:Error)=>void;timer:NodeJS.Timeout;}
interface Manifest {version:string;files:{path:string;sha256:string}[];}
const TOKEN_ENV='APEIRIA_LOOPBACK_TOKEN';

/** Keep the runtime's user skill catalog separate without changing the shell's user profile. */
export async function isolatedSkillOverrides(source:NodeJS.ProcessEnv,home:string):Promise<{path:string;enabled:false}[]> {
  const roots=new Set<string>();
  for(const profile of [source.USERPROFILE,source.HOME,os.homedir()])if(profile)roots.add(path.resolve(profile,'.agents','skills'));
  if(source.CODEX_HOME && path.resolve(source.CODEX_HOME)!==path.resolve(home))roots.add(path.resolve(source.CODEX_HOME,'skills'));
  roots.add(path.join(os.homedir(),'.codex','skills'));
  const own=path.resolve(home),visited=new Set<string>(),disabled=new Set<string>();
  const scan=async(directory:string,depth:number):Promise<void>=>{
    if(depth>10)return;
    let canonical:string,entries:import('node:fs').Dirent[];
    try {
      canonical=await fs.realpath(directory);
      const relative=path.relative(own,canonical);
      if(!relative || (!relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative)) || visited.has(canonical))return;
      visited.add(canonical);entries=await fs.readdir(directory,{withFileTypes:true});
    } catch {return;}
    if(entries.some(entry=>entry.isFile()&&entry.name==='SKILL.md')) {disabled.add(path.join(directory,'SKILL.md'));return;}
    await Promise.all(entries.filter(entry=>entry.isDirectory()||entry.isSymbolicLink()).map(entry=>scan(path.join(directory,entry.name),depth+1)));
  };
  await Promise.all([...roots].map(root=>scan(root,0)));
  return [...disabled].sort().map(file=>({path:file,enabled:false}));
}

function toml(value:any):string {
  if(Array.isArray(value))return '['+value.map(toml).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.entries(value).map(([key,v])=>JSON.stringify(key)+'='+toml(v)).join(',')+'}';
  return JSON.stringify(value);
}

/** A child-only environment: inherited official credentials and paths never reach the engine. */
export function engineEnvironment(source:NodeJS.ProcessEnv,home:string,token:string):NodeJS.ProcessEnv {
  const env={...source};
  for(const key of Object.keys(env)) {
    if(/^(CODEX|OPENAI|CHATGPT|APEIRIA)_/i.test(key) || /^(ACCESS_TOKEN|ID_TOKEN|REFRESH_TOKEN|GOOGLE_APPLICATION_CREDENTIALS|GEMINI_API_KEY|VERTEX_API_KEY|NODE_OPTIONS|NODE_PATH)$/i.test(key))delete env[key];
  }
  Object.assign(env,{
    CODEX_HOME:home,CODEX_SQLITE_HOME:path.join(home,'sqlite'),
    CODEX_LOG_DIR:path.join(home,'logs'),[TOKEN_ENV]:token,
  });
  return env;
}

function localUrl(value:string,label:string):string {
  const url=new URL(value);
  if(url.protocol!=='http:' || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash)throw new Error(`${label} 必须使用无凭证的本机 HTTP 地址。`);
  return url.toString().replace(/\/$/,'');
}

/** Check every bundled resource before executing any of it, including the selected executable. */
export async function verifyEngine(cliPath:string,manifestPath:string):Promise<string> {
  const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8')) as Manifest;
  if(typeof manifest.version!=='string' || !Array.isArray(manifest.files) || !manifest.files.length)throw new Error('内核清单格式无效。');
  const root=await fs.realpath(path.dirname(manifestPath));
  const cli=await fs.realpath(cliPath);
  let found=false;
  const checked=new Set<string>();
  for(const entry of manifest.files) {
    if(typeof entry.path!=='string' || !/^[a-f0-9]{64}$/i.test(entry.sha256))throw new Error('内核清单包含无效文件。');
    const target=await fs.realpath(path.resolve(root,entry.path));
    const relative=path.relative(root,target);
    if(!relative || relative.startsWith('..'+path.sep) || relative==='..' || path.isAbsolute(relative))throw new Error('内核清单文件超出独立安装目录。');
    if(checked.has(target))throw new Error('内核清单包含重复文件。');
    checked.add(target);
    const digest=createHash('sha256').update(await fs.readFile(target)).digest('hex');
    if(digest!==entry.sha256.toLowerCase())throw new Error(`内核校验失败：${entry.path}`);
    if(target===cli)found=true;
  }
  if(!found)throw new Error('指定内核未列入独立安装清单。');
  return manifest.version;
}

/** Dedicated stdio app-server client. It never discovers or launches the official extension. */
export class Engine {
  private child?:ChildProcessWithoutNullStreams;
  private pending=new Map<string|number,Pending>();
  private requests=new Set<string|number>();
  private sequence=0;
  private starting?:Promise<void>;
  private stopping?:Promise<void>;
  private ready=false;
  private disposed=false;
  private logTail='';
  private logQueue:Promise<void>=Promise.resolve();
  readonly catalogPath:string;

  constructor(private readonly options:EngineOptions) {
    this.catalogPath=path.join(path.resolve(options.home),'models.json');
  }

  async updateCatalog(catalog:Json):Promise<void> {
    if(!Array.isArray(catalog.models))throw new Error('模型目录必须包含 models 数组。');
    await fs.mkdir(this.options.home,{recursive:true});
    const tmp=this.catalogPath+'.'+randomUUID()+'.tmp';
    await fs.writeFile(tmp,JSON.stringify(catalog),{encoding:'utf8',mode:0o600});
    await fs.rename(tmp,this.catalogPath);
    this.options.catalog=catalog;
  }

  start():Promise<void> {
    if(this.disposed)return Promise.reject(new Error('内核已关闭。'));
    if(this.ready)return Promise.resolve();
    if(this.starting)return this.starting;
    this.starting=this.startInner().finally(()=>{this.starting=undefined;});
    return this.starting;
  }

  private async startInner():Promise<void> {
    this.status('正在校验独立内核');
    const o=this.options;
    const bridge=localUrl(o.bridgeUrl,'模型转接地址');
    const backend=localUrl(o.backendUrl,'后台拒绝地址');
    if(!o.token || /[\r\n]/.test(o.token))throw new Error('本机转接令牌无效。');
    if(!path.isAbsolute(o.cliPath) || !path.isAbsolute(o.home) || !path.isAbsolute(o.workspace))throw new Error('内核、数据与工作区路径必须为绝对路径。');
    const manifest=o.manifestPath??path.join(path.dirname(path.dirname(o.cliPath)),'manifest.json');
    await verifyEngine(o.cliPath,manifest);
    if(this.disposed)throw new Error('内核已关闭。');
    await Promise.all([fs.mkdir(path.join(o.home,'sqlite'),{recursive:true}),fs.mkdir(path.join(o.home,'logs'),{recursive:true}),fs.mkdir(path.join(o.home,'skills'),{recursive:true})]);
    await this.updateCatalog(o.catalog);
    const first=Array.isArray(o.catalog.models)?o.catalog.models[0]?.slug:undefined;
    const configs:Json={
      model_provider:'apeiria',model:first??'apeiria-unconfigured',model_catalog_json:this.catalogPath,
      sqlite_home:path.join(o.home,'sqlite'),log_dir:path.join(o.home,'logs'),
      cli_auth_credentials_store:'file',openai_base_url:bridge,chatgpt_base_url:backend,
      'model_providers.apeiria.name':'Apeiria Code',
      'model_providers.apeiria.base_url':bridge,
      'model_providers.apeiria.env_key':TOKEN_ENV,
      'model_providers.apeiria.wire_api':'responses',
      'model_providers.apeiria.requires_openai_auth':false,
      'model_providers.apeiria.supports_websockets':false,
      'model_providers.apeiria.request_max_retries':0,
      'model_providers.apeiria.stream_max_retries':0,
      approval_policy:'on-request',sandbox_mode:'workspace-write',
      web_search:'disabled','features.apps':false,'features.plugins':false,
      'otel.exporter':'none','otel.trace_exporter':'none','analytics.enabled':false,'feedback.enabled':false,
      'skills.config':await isolatedSkillOverrides(process.env,o.home),
    };
    const args=Object.entries(configs).flatMap(([key,value])=>['-c',`${key}=${toml(value)}`]).concat(['app-server','--listen','stdio://']);
    if(this.disposed)throw new Error('内核已关闭。');
    const child=spawn(o.cliPath,args,{cwd:o.workspace,env:engineEnvironment(process.env,o.home,o.token),windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
    this.child=child;
    this.logTail='';
    const lines=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
    lines.on('line',line=>this.receive(line));
    child.stderr.on('data',(chunk:Buffer)=>{
      const clean=chunk.toString('utf8').split(o.token).join('[local token]');
      this.logTail=(this.logTail+clean).slice(-2000);
      this.logQueue=this.logQueue.then(()=>fs.appendFile(path.join(o.home,'logs','app-server.log'),clean)).catch(()=>{});
    });
    child.stdin.on('error',error=>this.fail(error));
    child.on('error',error=>this.fail(error));
    child.once('close',(code,signal)=>{
      lines.close();
      if(this.child===child)this.child=undefined;
      this.ready=false;
      this.fail(new Error(`独立内核已退出（${signal??code??'未知'}）。${this.disposed?'':this.logTail.trim()}`));
      this.status(this.disposed?'已停止':'内核已停止');
    });
    this.status('正在启动独立内核');
    try {
      await this.call('initialize',{clientInfo:{name:'apeiria_code',title:'Apeiria Code',version:'0.1.0'},capabilities:{experimentalApi:true}});
      this.write({method:'initialized'});
      this.ready=true;
      this.status('已就绪');
    } catch(error) {
      await this.stopChild();
      throw error;
    }
  }

  async rpc(method:string,params:Json={}):Promise<any> {
    if(/^(account\/(login|logout)|login|logout)(\/|$)/.test(method))throw new Error('Apeiria Code 仅使用第三方渠道，未启用官方账号登录。');
    await this.start();
    return this.call(method,params);
  }

  respond(id:string|number,result:any):void {
    if(!this.requests.delete(id))throw new Error('审批请求已结束或内核已重启。');
    this.write({id,result});
  }

  private call(method:string,params:Json):Promise<any> {
    if(!this.child || this.disposed)return Promise.reject(new Error('独立内核尚未运行。'));
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{
        this.pending.delete(id);
        reject(new Error(`内核请求超时：${method}`));
      },this.options.requestTimeoutMs??45_000);
      timer.unref();
      this.pending.set(id,{resolve,reject,timer});
      try {this.write({id,method,params});}
      catch(error) {clearTimeout(timer);this.pending.delete(id);reject(error);}
    });
  }

  private write(message:Json):void {
    if(!this.child || this.child.stdin.destroyed || !this.child.stdin.writable)throw new Error('独立内核连接已关闭。');
    this.child.stdin.write(JSON.stringify(message)+'\n');
  }

  private receive(line:string):void {
    let message:Json;
    try {message=JSON.parse(line);}catch {return;}
    if(!message || typeof message!=='object')return;
    if(typeof message.method==='string') {
      if(typeof message.id==='string' || typeof message.id==='number') {
        this.requests.add(message.id);
        try {this.options.onRequest(message.id,message.method,message.params??{});}
        catch {this.requests.delete(message.id);this.write({id:message.id,error:{code:-32603,message:'Client request handler failed'}});}
      } else {
        try {this.options.onEvent(message.method,message.params??{});}catch { /* UI errors cannot corrupt RPC transport. */ }
      }
      return;
    }
    const pending=this.pending.get(message.id);
    if(!pending)return;
    this.pending.delete(message.id);
    clearTimeout(pending.timer);
    if(message.error) {
      const error=Object.assign(new Error(message.error.message??'内核请求失败。'),{code:message.error.code,data:message.error.data});
      pending.reject(error);
    } else pending.resolve(message.result);
  }

  private fail(error:Error):void {
    for(const p of this.pending.values()) {clearTimeout(p.timer);p.reject(error);}
    this.pending.clear();
    this.requests.clear();
  }

  private status(value:string):void {try {this.options.onStatus?.(value);}catch {}}

  private async stopChild():Promise<void> {
    const child=this.child;
    if(!child)return;
    this.fail(new Error('独立内核连接已关闭。'));
    await new Promise<void>(resolve=>{
      let finished=false;
      const done=()=>{if(finished)return;finished=true;clearTimeout(timer);resolve();};
      child.once('close',done);
      const timer=setTimeout(()=>{
        if(child.pid && process.platform==='win32') {
          // Target this child tree only; the official extension has another process and home.
          const killer=spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
          killer.once('error',()=>{child.kill();done();});
          killer.once('close',done);
        } else {
          try {if(child.pid)process.kill(-child.pid,'SIGKILL');}catch {child.kill('SIGKILL');}
          done();
        }
      },3000);
      timer.unref();
      // Closing stdin gracefully shuts down app-server and its execution sessions.
      child.stdin.end();
    });
    if(this.child===child)this.child=undefined;
    this.ready=false;
  }

  dispose():Promise<void> {
    if(this.stopping)return this.stopping;
    this.disposed=true;
    this.stopping=this.stopChild().then(()=>this.logQueue);
    return this.stopping;
  }
}
