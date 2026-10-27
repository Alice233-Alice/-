import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {createBridge} from './bridge.ts';
import {dataRoot,readSettings,modelPresets} from './config.ts';
import {saveQuotas,usageSnapshot} from './usage.ts';
import {refreshCachedModels} from './catalog-cache.ts';

export function findOfficialCli():string {
  if(process.env.CODEX_SWITCHBOARD_ORIGINAL_CLI)return process.env.CODEX_SWITCHBOARD_ORIGINAL_CLI;
  const roots=[path.join(os.homedir(),'.vscode','extensions'),path.join(os.homedir(),'.vscode-insiders','extensions')];
  const candidates:string[]=[];
  for(const root of roots){
    if(!fs.existsSync(root))continue;
    for(const dir of fs.readdirSync(root))if(dir.startsWith('openai.chatgpt-')){
      const file=path.join(root,dir,'bin','windows-x86_64','codex.exe');if(fs.existsSync(file))candidates.push(file);
    }
  }
  candidates.sort((a,b)=>fs.statSync(b).mtimeMs-fs.statSync(a).mtimeMs);
  if(!candidates.length)throw new Error('找不到官方 Codex 内核，请检查 OpenAI 扩展安装。');
  return candidates[0];
}
export async function runRouter(args=process.argv.slice(2)){
  const official=findOfficialCli();
  let bridge:Awaited<ReturnType<typeof createBridge>>|undefined;
  const appServer=args.includes('app-server');
  if(appServer){
    try{
      const settings=readSettings();
      try{refreshCachedModels(settings);}catch{process.stderr.write('[模型渠道] 本机模型目录未更新，将使用正常服务发现。\n');}
      bridge=await createBridge({launcher:process.env.CODEX_SWITCHBOARD_LAUNCHER || path.join(__dirname,'codex-switchboard.exe')});
    }catch{
      // A broken third-party configuration must not stop the original GPT client.
      process.stderr.write('[模型渠道] 配置或适配启动失败，已回退官方内核；官网登录未更改。\n');
    }
  }
  const child=spawn(official,bridge?['-c',`openai_base_url=${JSON.stringify(bridge.url)}`,...args]:args,{stdio:['pipe','pipe','pipe'],windowsHide:true,env:process.env});
  const stop=async()=>{child.stdin.end();await bridge?.close();};
  process.on('SIGINT',()=>{child.kill('SIGINT');void bridge?.close();});
  process.on('SIGTERM',()=>{child.kill();void bridge?.close();});
  child.stderr.pipe(process.stderr);
  if(!appServer || !bridge){process.stdin.pipe(child.stdin);child.stdout.pipe(process.stdout);}
  else{
    const pending=new Map<string,{method:string;params:any}>();
    const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
    const output=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
    input.on('line',line=>{
      try{const m=JSON.parse(line);if(m.id!=null && m.method)pending.set(String(m.id),{method:m.method,params:m.params});}catch{}
      // Account APIs and thread/history operations pass through byte-for-byte.
      child.stdin.write(line+'\n');
    });
    input.on('close',()=>void stop());
    output.on('line',line=>{
      try{
        const message=JSON.parse(line);const original=pending.get(String(message.id));
        if(message.id!=null)pending.delete(String(message.id));
        if(original?.method==='account/rateLimits/read' && message.result)saveQuotas(message.result);
        if(message.method==='account/rateLimits/updated')saveQuotas(message.params);
        if(original?.method==='model/list' && message.result?.data && !original.params?.cursor){
          try{
            const additions=modelPresets(readSettings());
            // The official engine may cache its catalog. Refresh our own model
            // capabilities from disk so editing reasoning settings needs no restart.
            message.result.data=message.result.data.filter((m:any)=>!String(m.id??m.model??'').startsWith('thirdparty/'));
            message.result.switchboardReasoningVersion=1;
            message.result.switchboardTransportVersion=4;
            message.result.switchboardBackendVersion='0.5.0';
            message.result.data.push(...additions);line=JSON.stringify(message);
            try{message.result.switchboardUsage=usageSnapshot('month');line=JSON.stringify(message);}catch{}
          }catch{} // A bad channel config cannot break GPT discovery.
        }
      }catch{}
      process.stdout.write(line+'\n');
    });
  }
  child.on('error',()=>{process.stderr.write('[模型渠道] 无法启动官方 Codex 内核。\n');void bridge?.close();process.exitCode=1;});
  child.on('exit',code=>{void (bridge?.close() || Promise.resolve()).finally(()=>process.exit(code || 0));});
}
if(process.env.CODEX_SWITCHBOARD_IMPORT_ONLY!=='1'){
  runRouter().catch(()=>{process.stderr.write('[模型渠道] 启动失败。未执行登录、登出或凭证写入。\n');process.exitCode=1;});
}
