import fs from 'node:fs';
import path from 'node:path';
import {zipSync,strToU8} from 'fflate';
const directory=path.resolve('test-output');fs.mkdirSync(directory,{recursive:true});
const marker=path.join(directory,'native-restored.json'),workspace=path.resolve('../..');
const manifest={name:'codex-native-restore-once',publisher:'ayanami-local',version:'0.0.1',displayName:'Codex native restore (one use)',engines:{vscode:'^1.95.0'},main:'./extension.cjs',activationEvents:['onStartupFinished']};
const main=`const vscode=require('vscode'),fs=require('node:fs'),path=require('node:path');
exports.activate=async()=>{
 const marker=${JSON.stringify(marker)},target=${JSON.stringify(workspace)};
 if(!vscode.workspace.workspaceFolders?.some(f=>path.resolve(f.uri.fsPath).toLowerCase()===target.toLowerCase()))return;
 let state;try{state=JSON.parse(fs.readFileSync(marker,'utf8'));}catch{}
 if(state?.completed)return;
 const owns=v=>typeof v==='string'&&/codex-switchboard\\.exe$/i.test(v);
 const scopes=[{config:vscode.workspace.getConfiguration('chatgpt'),scope:vscode.ConfigurationTarget.Global,key:'globalValue'},{config:vscode.workspace.getConfiguration('chatgpt'),scope:vscode.ConfigurationTarget.Workspace,key:'workspaceValue'},...vscode.workspace.workspaceFolders.map(f=>({config:vscode.workspace.getConfiguration('chatgpt',f.uri),scope:vscode.ConfigurationTarget.WorkspaceFolder,key:'workspaceFolderValue'}))];
 for(const entry of scopes){const inspected=entry.config.inspect('cliExecutable');if(owns(inspected?.[entry.key]))await entry.config.update('cliExecutable',undefined,entry.scope);}
 if(owns(vscode.workspace.getConfiguration('chatgpt').get('cliExecutable')))throw Error('Adapter override still active');
 if(state?.phase==='restart-requested'){
  await vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction');
  const extension=vscode.extensions.getExtension('openai.chatgpt');
  await extension?.activate();
  await vscode.commands.executeCommand('chatgpt.openSidebar');
  fs.writeFileSync(marker,JSON.stringify({completed:true,officialVersion:extension?.packageJSON.version,usesOfficialDefault:vscode.workspace.getConfiguration('chatgpt').get('cliExecutable')==null,companionInstalled:!!vscode.extensions.getExtension('ayanami-local.codex-model-switchboard'),at:new Date().toISOString()}));
  return;
 }
 fs.writeFileSync(marker,JSON.stringify({phase:'restart-requested',at:new Date().toISOString()}));
 await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
};`;
const vsix=`<?xml version="1.0" encoding="utf-8"?><PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="${manifest.name}" Version="${manifest.version}" Publisher="${manifest.publisher}"/><DisplayName>${manifest.displayName}</DisplayName><Description xml:space="preserve">One-use native Codex restoration.</Description><Properties><Property Id="Microsoft.VisualStudio.Code.Engine" Value="${manifest.engines.vscode}"/></Properties></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>`;
const files={'extension.vsixmanifest':strToU8(vsix),'[Content_Types].xml':strToU8('<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="cjs" ContentType="application/javascript"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>'),'extension/package.json':strToU8(JSON.stringify(manifest)),'extension/extension.cjs':strToU8(main)};
const filename=path.join(directory,manifest.name+'-0.0.1.vsix');fs.writeFileSync(filename,zipSync(files));console.log(filename);
