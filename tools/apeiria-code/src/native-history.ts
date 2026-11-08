import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';

export interface SelectedHistoryOptions {threadId:string;cliPath:string;home:string;argsPrefix:string[];env:NodeJS.ProcessEnv;token:string;run?:(args:string[])=>Promise<string>;}
/** Called only by an explicit edit of this thread; never scans or migrates other chats. */
export async function migrateSelectedHistory(options:SelectedHistoryOptions):Promise<{migrated:boolean;backup?:string}> {
  if(!/^[a-zA-Z0-9._-]{1,200}$/.test(options.threadId))throw Error('目标对话 ID 无效。');
  const run=options.run||((args:string[])=>new Promise<string>((resolve,reject)=>{
    const child=spawn(options.cliPath,[...options.argsPrefix,'migrate-rollouts','--thread',options.threadId,...args],{env:options.env,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='',finished=false;
    const finish=(error?:Error)=>{if(finished)return;finished=true;clearTimeout(timer);error?reject(error):resolve(stdout);};
    const timer=setTimeout(()=>{child.kill();finish(Error('目标对话历史升级超时。'));},120000);
    child.stdout.on('data',chunk=>{stdout+=String(chunk);if(stdout.length>1024*1024){child.kill();finish(Error('目标历史报告过大。'));}});
    child.stderr.on('data',chunk=>{stderr=(stderr+String(chunk)).slice(-2000);});
    child.once('error',finish);child.once('close',code=>finish(code===0?undefined:Error('目标历史升级失败：'+stderr.split(options.token).join('[local token]'))));
  }));
  const parse=(text:string)=>{const result=JSON.parse(text);if(!Array.isArray(result.outcomes)||result.outcomes.length!==1||result.outcomes[0].thread_id!==options.threadId)throw Error('目标历史报告不匹配，未处理其他对话。');return result.outcomes[0];};
  const inspected=parse(await run(['--json']));
  if(inspected.status==='already_paginated')return {migrated:false};
  if(inspected.status!=='eligible')throw Error('目标旧对话暂时无法升级：'+String(inspected.message||inspected.status));
  const home=fs.realpathSync(options.home),original=fs.realpathSync(inspected.rollout_path),relative=path.relative(home,original);
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep)||!['sessions','archived_sessions'].includes(relative.split(path.sep)[0]))throw Error('目标历史文件超出独立会话目录。');
  const backup=path.join(home,'history-backups',options.threadId+'-'+crypto.randomUUID());fs.mkdirSync(backup,{recursive:true});
  const saved=path.join(backup,path.basename(original));fs.copyFileSync(original,saved,fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({version:1,threadId:options.threadId,original,backup:saved,sha256:crypto.createHash('sha256').update(fs.readFileSync(saved)).digest('hex')},null,2),{mode:0o600});
  let applied=parse(await run(['--apply','--json']));
  const deadline=Date.now()+8000;
  while(applied.status==='skipped_busy'&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,150));applied=parse(await run(['--apply','--json']));}
  if(!['migrated','already_paginated'].includes(applied.status))throw Error('目标历史未能升级（'+String(applied.status)+'：'+String(applied.message||'')+'）；原始备份保留于 '+backup+'。');
  return {migrated:true,backup};
}
