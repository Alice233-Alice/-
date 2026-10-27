import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {dataRoot} from './config.ts';
export const supportedVersion='26.51007.21434';
const coreFile='webview/assets/app-initial-fee819fe4f22.js';
const queryFile='webview/assets/app-initial-41ab338a184f.js';
export interface PatchFile {relative:string;before:string;after:string;original:string;}
const marker='/* codex-switchboard-native-menu-v6 */';
function replaceOnce(source:string,before:string,after:string){
  if(source.split(before).length!==2)throw new Error('官方模型菜单结构与适配版本不符，未修改文件。');return source.replace(before,after);
}
export function nativePatchPlan(extensionRoot:string,helper:string,backupRoot=path.join(dataRoot(),'native-backups',supportedVersion)):PatchFile[]{
  const manifest=JSON.parse(fs.readFileSync(path.join(extensionRoot,'package.json'),'utf8'));
  if(manifest.publisher!=='openai' || manifest.name!=='chatgpt' || manifest.version!==supportedVersion)throw new Error('当前官方扩展版本尚未通过原生菜单兼容检查，未修改文件。');
  return [coreFile,queryFile].map(relative=>{
    const before=fs.readFileSync(path.join(extensionRoot,relative),'utf8');
    let original=before;
    if(/\/\* codex-switchboard-native-menu-v\d+ \*\//.test(before)){
      const journal=JSON.parse(fs.readFileSync(path.join(backupRoot,'patch.json'),'utf8')),entry=journal.files?.find((f:any)=>f.relative===relative);
      if(!entry || path.resolve(journal.extensionRoot)!==path.resolve(extensionRoot) || crypto.createHash('sha256').update(before).digest('hex')!==entry.afterHash)throw new Error('已安装的原生菜单文件发生变化，未覆盖。');
      original=fs.readFileSync(entry.backup,'utf8');if(crypto.createHash('sha256').update(original).digest('hex')!==entry.beforeHash)throw new Error('原生菜单原文件备份校验失败，未修改文件。');
    }
    let after=original;
    if(relative===coreFile){
      after=replaceOnce(after,'let c=o.availableAccessPrograms?.cyber;return n===`apikey`','let c=o.availableAccessPrograms?.cyber;if(o.model.startsWith("thirdparty/")&&!o.hidden)return true;return n===`apikey`');
      after=replaceOnce(after,'Nt=jt.length<2?`advanced`:m','Nt=ke?.some(e=>e.model.startsWith("thirdparty/"))?`advanced`:jt.length<2?`advanced`:m');
      after=replaceOnce(after,'if(g.current!=null&&(window.clearTimeout(g.current),g.current=null),e){let e=FFe(s,r)','if(g.current!=null&&(window.clearTimeout(g.current),g.current=null),e){Te().catch(()=>{});let e=FFe(s,r)');
      after=replaceOnce(after,'menuFooter:Tn,menuView:Nt','menuFooter:Tn,switchboardExtras:CodexSwitchboardMenu.modelExtras(S7,x7,{model:Oe,effort:bt,options:gt,disabled:jn,needsUpdate:ke?.some(e=>e.model.startsWith("thirdparty/"))&&window.__codexSwitchboardTransportVersion!==4,onChange:effort=>$t(Oe,effort)}),menuView:Nt');
      after=replaceOnce(after,'let Ee=Te;if(m!=null)','let Ee=e.switchboardExtras==null?Te:{...Te,extras:e.switchboardExtras};if(m!=null)');
      after=replaceOnce(after,'t[150]=r):r=t[150],r}let wn','t[150]=r):r=t[150],CodexSwitchboardMenu.composer(S7,mw,r)}let wn');
      after=replaceOnce(after,'t[298]=rr):rr=t[298],rr}function gCa','t[298]=rr):rr=t[298],CodexSwitchboardMenu.composer(S7,mw,rr)}function gCa');
      after+='\n'+helper+'\n'+marker+'\n';
    }else{
      after=replaceOnce(after,'mm=acquireVsCodeApi()','mm=acquireVsCodeApi(),window.__codexSwitchboardOpen=(page)=>mm.postMessage({type:"open-vscode-command",command:page==="update"?"workbench.action.restartExtensionHost":page==="usage"?"codexModels.usage":"codexModels.manage"})');
      after=replaceOnce(after,'sendRequest(`model/list`,{includeHidden:!0,cursor:null,limit:s},{priority:t})},select:','sendRequest(`model/list`,{includeHidden:!0,cursor:null,limit:s},{priority:t}).then(result=>{window.__codexSwitchboardTransportVersion=result.switchboardTransportVersion??0;window.__codexSwitchboardBackendVersion=result.switchboardBackendVersion??null;window.__codexSwitchboardReasoningVersion=result.switchboardReasoningVersion??0;window.__codexSwitchboardUsage=result.switchboardUsage??null;window.dispatchEvent(new CustomEvent("codex-switchboard-usage",{detail:window.__codexSwitchboardUsage}));return result})},select:');
      after+='\n'+marker+'\n';
    }
    return {relative,before,after,original};
  });
}
export function installNativePatch(extensionRoot:string,helper:string,backupRoot:string){
  const fullPlan=nativePatchPlan(extensionRoot,helper,backupRoot),plan=fullPlan.filter(f=>f.before!==f.after);if(!plan.length)return {changed:false};
  fs.mkdirSync(backupRoot,{recursive:true});const journal:{relative:string;backup:string;beforeHash:string;afterHash:string}[]=[];
  for(const f of fullPlan){
    const beforeHash=crypto.createHash('sha256').update(f.original).digest('hex'),afterHash=crypto.createHash('sha256').update(f.after).digest('hex');
    const backup=path.join(backupRoot,beforeHash+'.js');if(!fs.existsSync(backup))fs.writeFileSync(backup,f.original,{mode:0o600});
    journal.push({relative:f.relative,backup,beforeHash,afterHash});
  }
  // All checks and backups complete before either installed asset is modified.
  try{for(const f of plan){const target=path.join(extensionRoot,f.relative);if(fs.readFileSync(target,'utf8')!==f.before)throw new Error('官方扩展文件在安装期间发生变化，已停止。');const tmp=target+'.switchboard-tmp';fs.writeFileSync(tmp,f.after);fs.renameSync(tmp,target);}}
  catch(error){for(const f of plan){const target=path.join(extensionRoot,f.relative);if(fs.readFileSync(target,'utf8')===f.after)fs.writeFileSync(target,f.before);}throw error;}
  fs.writeFileSync(path.join(backupRoot,'patch.json'),JSON.stringify({version:supportedVersion,extensionRoot,files:journal},null,2)+'\n');return {changed:true};
}
