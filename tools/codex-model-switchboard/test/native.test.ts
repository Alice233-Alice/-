import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {nativePatchPlan,installNativePatch,supportedVersion} from '../src/native-patch.ts';
import {installRuntime} from '../src/runtime.ts';

const official=path.join(os.homedir(),'.vscode','extensions','openai.chatgpt-'+supportedVersion+'-win32-x64');
function functionBody(source:string,name:string){const ast=ts.createSourceFile('fixture.js',source,ts.ScriptTarget.Latest,false,ts.ScriptKind.JS);let found='';function walk(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=source.slice(n.pos,n.end);ts.forEachChild(n,walk);}walk(ast);assert(found,'Missing installed function '+name);return found;}
test('installed native picker accepts configured providers, uses the native selection callback and preserves auth code',{skip:!fs.existsSync(official)},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-native-')),backupRoot=path.join(root,'backups');
  const originals=path.join(os.homedir(),'.codex-model-switchboard','native-backups',supportedVersion,'patch.json');
  let journal:any;try{journal=JSON.parse(fs.readFileSync(originals,'utf8'));}catch{}
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({publisher:'openai',name:'chatgpt',version:supportedVersion}));
  for(const relative of ['webview/assets/app-initial-fee819fe4f22.js','webview/assets/app-initial-41ab338a184f.js']){
    let source=fs.readFileSync(path.join(official,relative),'utf8');
    if(/\/\* codex-switchboard-native-menu-v\d+ \*\//.test(source)){const backup=journal?.files.find((f:any)=>f.relative===relative)?.backup;assert(backup,'Installed native patch must have an original backup');source=fs.readFileSync(backup,'utf8');}
    const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,source);
  }
  const helper=fs.readFileSync('dist/native-menu.js','utf8'),plan=nativePatchPlan(root,helper),core=plan[0],query=plan[1];
  const original=vm.runInNewContext('('+functionBody(core.before,'IJr')+')'),patched=vm.runInNewContext('('+functionBody(core.after,'IJr')+')');
  const argumentsFor=(model:string,hidden=false)=>({authMethod:'chatgpt',availableModels:new Set(['gpt-fixture']),model:{model,hidden},useHiddenModels:true});
  assert.equal(original(argumentsFor('thirdparty/vertex/gemini-4-argon')),false);assert.equal(patched(argumentsFor('thirdparty/vertex/gemini-4-argon')),true);
  for(const model of ['gpt-fixture','gpt-hidden','codex-auto-review'])for(const hidden of [false,true])assert.equal(patched(argumentsFor(model,hidden)),original(argumentsFor(model,hidden)));
  assert.equal(functionBody(core.after,'Lti'),functionBody(core.before,'Lti'),'Native permission-aware model setter is unchanged');
  assert(core.after.includes('ke?.some(e=>e.model.startsWith("thirdparty/"))?`advanced`'));assert(core.after.includes('Te().catch(()=>{});let e=FFe'));
  assert(functionBody(core.after,'hCa').includes('CodexSwitchboardMenu.composer(S7,mw,r)'));assert(functionBody(core.after,'hCa').includes('CodexSwitchboardMenu.composer(S7,mw,rr)'));
  assert(core.after.includes('menuFooter:Tn,switchboardExtras:CodexSwitchboardMenu.modelExtras'));
  assert(core.after.includes('let Ee=e.switchboardExtras==null?Te:{...Te,extras:e.switchboardExtras}'));
  assert(!core.after.includes('menuFooter:CodexSwitchboardMenu.footer'),'Custom controls must not activate the native footer lock or leak from a hidden track');
  assert(query.after.includes('page==="usage"?"codexModels.usage":"codexModels.manage"'));
  assert(query.after.includes('page==="update"?"workbench.action.restartExtensionHost"'));
  assert(query.after.includes('window.__codexSwitchboardReasoningVersion=result.switchboardReasoningVersion??0'));
  for(const f of plan){const parsed=ts.createSourceFile(f.relative,f.after,ts.ScriptTarget.Latest,false,ts.ScriptKind.JS) as ts.SourceFile & {parseDiagnostics:readonly ts.Diagnostic[]};assert.equal(parsed.parseDiagnostics.length,0,'Patched ES module parses');}
  assert.equal(installNativePatch(root,helper,backupRoot).changed,true);assert.equal(installNativePatch(root,helper,backupRoot).changed,false);
  const saved=JSON.parse(fs.readFileSync(path.join(backupRoot,'patch.json'),'utf8'));for(const f of plan){assert.equal(fs.readFileSync(saved.files.find((r:any)=>r.relative===f.relative).backup,'utf8'),f.before);assert.equal(fs.readFileSync(path.join(root,f.relative),'utf8'),f.after);}
  assert.equal(installNativePatch(root,helper+'\n// helper update\n',backupRoot).changed,true);assert.equal(JSON.parse(fs.readFileSync(path.join(backupRoot,'patch.json'),'utf8')).files.length,2);assert.equal(installNativePatch(root,helper+'\n// helper update\n',backupRoot).changed,false);
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({publisher:'openai',name:'chatgpt',version:'future-version'}));assert.throws(()=>nativePatchPlan(root,helper),/未修改文件/);
});

test('native reasoning controls use current model capabilities and native effort callback',()=>{
 const context:any={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/native-menu.js','utf8'),context);
 const jsx={jsx:(type:any,props:any)=>({type,props}),jsxs:(type:any,props:any)=>({type,props})};
 const all=(n:any):any[]=>!n?[]:Array.isArray(n)?n.flatMap(all):typeof n==='object'?[n,...all(n.props?.children)]:[n];
 const calls:string[]=[],options=['low','medium','high'].map(reasoningEffort=>({reasoningEffort}));
 const render=(effort='medium',disabled=false,list=options)=>all(context.CodexSwitchboardMenu.modelExtras(jsx,{}, {model:'vertex',effort,options:list,disabled,onChange:(e:string)=>calls.push(e)}));
 let nodes=render();const controls=nodes.filter(n=>n.type==='button');assert.equal(controls.length,3);assert.equal(controls.filter(n=>n.props['aria-checked']).length,1);
 controls[2].props.onClick({preventDefault(){}});assert.deepEqual(calls,['high']);
 nodes=render('high');assert(nodes.find(n=>n.props?.children==='高').props['aria-checked']);
 const disabled=render('medium',true).filter(n=>n.type==='button');assert(disabled.every(n=>n.props.disabled));disabled[0].props.onClick({preventDefault(){}});assert.deepEqual(calls,['high']);
 assert(!render('medium',false,[{reasoningEffort:'medium'}]).some(n=>n.type==='button'));
 assert(render('xhigh',false,[...options,{reasoningEffort:'xhigh'}]).some(n=>n.props?.children==='极高'));
 const updated=all(context.CodexSwitchboardMenu.modelExtras(jsx,{}, {model:'vertex',effort:'medium',options,disabled:false,needsUpdate:true,onChange(){}}));
 const update=updated.find(n=>n.type==='button'&&n.props.children==='加载适配器更新');assert(update);assert.match(update.props.title,/当前回复结束后/);
 assert(!render().some(n=>n.props?.children==='加载适配器更新'),'No reconnect control after new backend is running');
});
test('configuration is a visible native composer button beside the existing model picker',()=>{
  const opened:string[]=[],context:any={window:{__codexSwitchboardOpen:(page:string)=>opened.push(page)}};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/native-menu.js','utf8'),context);
  const jsx={jsx:(type:any,props:any)=>({type,props}),jsxs:(type:any,props:any)=>({type,props})},Button=()=>{},picker={nativePicker:true};
  const result=context.CodexSwitchboardMenu.composer(jsx,Button,picker),children=result.props.children;
  assert.equal(children[0],picker);assert.equal(children[1].type,Button);assert.equal(children[1].props.children,'模型配置');assert.equal(children[1].props['aria-label'],'模型配置');assert(!children[1].props.hidden);assert(!children[1].props.disabled);children[1].props.onClick();assert.deepEqual(opened,['settings']);
});
test('extension updates reuse a stable launcher without overwriting a running executable',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'switchboard-runtime-')),extension=path.join(root,'extension');fs.mkdirSync(path.join(extension,'dist'),{recursive:true});
  for(const [file,content] of [['codex-switchboard.exe','launcher-v1'],['node-path.txt','node'],['router.cjs','router-v1']])fs.writeFileSync(path.join(extension,'dist',file),content);
  const first=installRuntime(extension,root);fs.writeFileSync(path.join(extension,'dist','router.cjs'),'router-v2');fs.writeFileSync(path.join(extension,'dist','codex-switchboard.exe'),'different-build-timestamp');const second=installRuntime(extension,root);
  assert.equal(first,second);assert.equal(fs.readFileSync(first,'utf8'),'launcher-v1');assert.equal(fs.readFileSync(path.join(root,'runtime','router.cjs'),'utf8'),'router-v2');
});
test('native menu footer keeps its component identity and expands usage in place',()=>{
  const helper=fs.readFileSync('dist/native-menu.js','utf8'),opened:string[]=[],state:any[]=[],window:any={__codexSwitchboardUsage:{rows:[{model:'thirdparty/vertex/gemini-test',input:100,output:20,requests:1,unknownUsage:0,cost:.001,currency:'USD'}],quotas:[]},__codexSwitchboardOpen:(page:string)=>opened.push(page),addEventListener(){},removeEventListener(){}};
  const context:any={window,Intl,Date,Event};vm.createContext(context);vm.runInContext(helper,context);
  const jsx={jsx:(type:any,props:any)=>({type,props}),jsxs:(type:any,props:any)=>({type,props})};let index=0;
  const react={useState:(initial:any)=>{const slot=index++;if(!(slot in state))state[slot]=initial;return [state[slot],(v:any)=>{state[slot]=typeof v==='function'?v(state[slot]):v;}];},useEffect(){}};
  const element=context.CodexSwitchboardMenu.footer(jsx,react,null);assert.equal(context.CodexSwitchboardMenu.footer(jsx,react,null).type,element.type);
  const render=()=>{index=0;return element.type({existing:null});};
  const all=(node:any):any[]=>node==null?[]:Array.isArray(node)?node.flatMap(all):typeof node==='object'?[node,...all(node.props?.children)]:[node];
  let rendered=all(render());rendered.find(n=>n.type==='button'&&n.props.children==='用量与费用').props.onClick();rendered=all(render());assert(rendered.includes('gemini-test'));assert(rendered.some(n=>typeof n==='string'&&n.includes('输入 100')));
  rendered.find(n=>n.type==='button'&&n.props.children==='管理渠道').props.onClick();assert.deepEqual(opened,['settings']);
});
