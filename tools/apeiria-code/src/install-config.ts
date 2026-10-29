import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {parse,parseTree,modify,applyEdits,type ParseError} from 'jsonc-parser';

export const independentExtensionId='ayanami-local.apeiria-code';

/** Preserve JSONC comments and every other startup setting. */
export function enableNativeApis(source:string):string {
  const errors:ParseError[]=[],value=parse(source,errors,{allowTrailingComma:true});
  if(errors.length||!value||typeof value!=='object'||Array.isArray(value))throw Error('VS Code argv.json 必须为有效的 JSONC 对象，原文件未修改。');
  const tree=parseTree(source,[],{allowTrailingComma:true});
  if((tree?.children||[]).filter(property=>property.children?.[0]?.value==='enable-proposed-api').length>1)throw Error('argv.json 中存在重复的 enable-proposed-api，原文件未修改。');
  const existing=value['enable-proposed-api'];
  if(existing!==undefined&&(!Array.isArray(existing)||existing.some(id=>typeof id!=='string')))throw Error('enable-proposed-api 必须为扩展 ID 数组，原文件未修改。');
  if(existing?.includes(independentExtensionId))return source;
  const options={formattingOptions:{insertSpaces:!/^\t/m.test(source),tabSize:2,eol:source.includes('\r\n')?'\r\n':'\n'}};
  const edits=existing?modify(source,['enable-proposed-api',existing.length],independentExtensionId,options):modify(source,['enable-proposed-api'],[independentExtensionId],options);
  return applyEdits(source,edits);
}

export function configureNativeApis(file:string):{changed:boolean;file:string;backup?:string} {
  file=path.resolve(file);
  const exists=fs.existsSync(file),before=exists?fs.readFileSync(file,'utf8'):'{\n}\n';
  const after=(before.startsWith('\uFEFF')?'\uFEFF':'')+enableNativeApis(before.replace(/^\uFEFF/,''));
  if(after===before)return {changed:false,file};
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const suffix=crypto.randomUUID(),backup=exists?file+'.apeiria-backup-'+suffix:undefined;
  if(backup)fs.copyFileSync(file,backup,fs.constants.COPYFILE_EXCL);
  const temporary=file+'.apeiria-'+suffix+'.tmp';
  try{fs.writeFileSync(temporary,after,{encoding:'utf8',mode:0o600});fs.renameSync(temporary,file);}
  finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
  return {changed:true,file,backup};
}

if(/^configure-native-apis\.(?:cjs|js|ts)$/.test(path.basename(process.argv[1]||''))){
  try{
    const result=configureNativeApis(process.argv[2]||path.join(os.homedir(),'.vscode','argv.json'));
    process.stdout.write((result.changed?'已为 Apeiria Code 启用原生 API。请完全退出并重新打开 VS Code 后使用。':'Apeiria Code 原生 API 已启用。')+'\n'+result.file+'\n');
    if(result.backup)process.stdout.write('原启动配置备份：'+result.backup+'\n');
  }catch(error){process.stderr.write(String(error instanceof Error?error.message:error)+'\n');process.exitCode=1;}
}
