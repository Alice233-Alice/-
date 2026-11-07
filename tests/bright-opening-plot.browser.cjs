/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compile = file =>
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

const script = `() => {
  if(window.__openingPlotCheck?.running) return {running:true};
  window.__openingPlotCheck={running:true,started:Date.now()};
  void (async()=>{
    const frame=document.querySelector('#dhl-pseudo-stage-root iframe');
    if(!frame?.contentWindow.Mvu)throw Error('测试版舞台尚未就绪');
    const w=frame.contentWindow;
    const zod={z:w.z};
    const schema={exports:{}};
    ((exports,require)=>{${compile('src/灯火阑珊/schema/opening-plot.ts')}})(schema.exports,()=>zod);
    const getCharWorldbookNames=()=>({primary:'独立校验世界'});
    const getWorldbook=async()=>[{enabled:true,name:'世界观',content:'独立虚构的山中书院，师徒通过日常相处与查证旧事建立信任。'}];
    let requests=0;
    let submitted;
    const generateRaw=async options=>{requests++;submitted=options;return '来信确实出于求助，旧友没有背叛老师。先让玩家从整理旧册中察觉牵挂，再由老师根据相处决定是否谈起求助。旧约可以通过查证或交涉处理，玩家也能先专心晨读，过程和结局留待实际选择。'};
    const core={exports:{}};
    ((exports,require)=>{${compile('src/灯火通明-测试版/opening-plot.ts')}})(core.exports,()=>schema.exports);
    const original=w.Mvu.getMvuData({type:'message',message_id:0});
    const before=JSON.stringify(original.stat_data), beforeMessages=SillyTavern.getContext().chat.length;
    const drafts=core.exports.collectOpeningPlotDrafts({'./校验开场-山中书院.md':'独立校验素材：老师收到旧友的求助信。来信确实出于求助，旧友没有背叛老师。这两个事实固定。想讲师徒如何逐渐建立信任。可从旧册、避雨来客和整理书架引出可查证的线索，玩家可以先学习或外出，解决方式和结局留给实际选择。'});
    let variables={initialized_lorebooks:{},stat_data:{当前处境:'独立校验：山中书院晨读。',本尊:{等级:1,身份:'书院学生',行踪:{当前区域:'山中书院'}},红颜:{},任务列表:{},行旅:{当前追踪:'',旅程:{}}}};
    const planner=core.exports.createOpeningPlotPlanner({
      drafts,scope:()=>({chatId:'隔离校验',messageId:0,openingMessage:'【校验开场-山中书院】\\n老师在晨读后把一封信收进书册。'}),
      read:()=>structuredClone(variables),write:async(_id,value)=>{variables=structuredClone(value)},
      generate:core.exports.generateOpeningPlot,stop:()=>{}
    });
    const cache=await planner.prepare('先整理书架，看看老师是否愿意谈起旧友。');
    await planner.prepare('再次准备，应复用同一份构思');
    const shadow=w._.cloneDeep(original);
    shadow.stat_data.$开场剧情=cache;
    const parsed=await w.Mvu.parseMessage('<UpdateVariable><Analysis>独立副本中的缓存保护校验。</Analysis><JSONPatch>[{"op":"remove","path":"/$开场剧情"}]</JSONPatch></UpdateVariable>',shadow);
    return {mode:'local-only',requests,cacheReady:!!cache.构思,cacheProtected:JSON.stringify(parsed.stat_data.$开场剧情)===JSON.stringify(cache),
      promptChecked:submitted.ordered_prompts.some(p=>p.content.includes('旧友没有背叛老师')),noChatHistory:submitted.max_chat_history===0,
      liveSaveUnchanged:JSON.stringify(w.Mvu.getMvuData({type:'message',message_id:0}).stat_data)===before,
      chatUnchanged:SillyTavern.getContext().chat.length===beforeMessages,
      plan:cache.构思,elapsedMs:Date.now()-window.__openingPlotCheck.started};
  })().then(report=>window.__openingPlotCheck={running:false,...report},error=>window.__openingPlotCheck={running:false,error:String(error)});
  return {started:true};
}`;
const directory = path.resolve('output/opening-plot-checks');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'verify-tavern.js'), script);
console.log('Local opening plot browser verification generated; model requests are replaced locally.');
