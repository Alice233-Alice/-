/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { parse, compileScript, compileStyleAsync } = require('vue/compiler-sfc');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
global._ = require('lodash');
const { themes } = require('../src/灯火通明-测试版/themes');
const { createJourney } = require('../src/灯火通明-测试版/journey');

async function main() {
  const modules = [];
  const styles = [];
  for (const name of ['JourneyContextPicker', 'JourneyPanel', 'JourneyTrail']) {
    const filename = `src/灯火通明-测试版/components/${name}.vue`;
    const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename });
    assert.deepEqual(errors, []);
    const id = `data-v-preview-${name.toLowerCase()}`;
    const script = compileScript(descriptor, { id, inlineTemplate: true });
    modules.push(
      `const ${name} = {exports:{}}; ((exports,require)=>{${ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}})(${name}.exports,dependency);${name}.exports.default.__scopeId=${JSON.stringify(id)};`,
    );
    for (const style of descriptor.styles) {
      const result = await compileStyleAsync({
        source: style.content,
        filename,
        id,
        scoped: style.scoped,
        preprocessLang: 'scss',
      });
      assert.deepEqual(result.errors, []);
      styles.push(result.code);
    }
  }
  const proposals = [
    {
      name: '潮声寄远',
      lead: '渡口守人提起，旧潮线上近日又见失传的舟纹；来处仍待查证。',
      goal: '追索渡舟旧约，探访远海各方，并寻找一处能够自在停舟的居所。',
      step: '从眼前渡口问询旧舟纹的出处。',
      plan: '只供后台的未发生构思。',
    },
    {
      name: '山外问剑',
      lead: '有人愿以一卷旧剑帖换取沿途剑痕的拓印，交易条件尚可商议。',
      goal: '走访不同门派，在切磋与抉择中寻得自己的剑道。',
      step: '向当面的来客问清交换条件。',
      plan: '只供后台的另一份构思。',
    },
    {
      name: '草木长生',
      lead: '山下药园托人求助，灵苗近来的枯荣规律值得一看。',
      goal: '从药园起步，建立能与同行之人长久经营的修行资粮。',
      step: '先询问药园所在与灵苗异状的发生时辰。',
      plan: '只供后台的第三份构思。',
    },
  ];
  const current = createJourney(proposals[0]);
  const archived = createJourney(proposals[1]);
  Object.assign(current, {
    状态: '进行中',
    篇章: '第一章 · 渡口问潮',
    进展: '守人确认残木随昨夜潮水从上游漂来，曾答应替你留意同类木片。',
    下一步: '沿河访问上游船户，或先比对木片上的舟纹。',
    关联任务: ['渡口访舟'],
    关联世闻: ['旧渡重开'],
  });
  current.线索.残木舟纹 = {
    内容: '残木上的三道舟纹与渡口旧碑一角相近。是否出自同一处仍待核实。',
    依据: '你当面比对了木片与旧碑。',
    时地: '第七日清晨 · 柳渡',
  };
  current.线索.涨水来向 = {
    内容: '守人亲见残木从上游漂来；这是守人的见闻。',
    依据: '渡口守人的口述。',
    时地: '第七日清晨 · 柳渡',
  };
  current.纪事.留木之约 = {
    内容: '你将半枚木片留在渡口，请守人留意同类舟纹。',
    依据: '守人收下木片，答应下次涨水时查看。',
    时地: '第七日清晨 · 柳渡',
  };
  current.猜想.旧舟来处 = {
    内容: '旧碑与残木可能同出上游旧舟坊。',
    关联线索: ['残木舟纹', '涨水来向'],
    状态: '待核实',
    依据: '',
  };
  const themeVars = Object.entries(themes[0].colors)
    .map(([key, value]) => `--${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}:${value}`)
    .join(';');
  const runtime = fs.readFileSync(require.resolve('vue/dist/vue.global.prod.js'), 'utf8');
  const scenes = [
    {
      title: '晨课开局',
      texts: [
        '观月台晨课未完，白清弦指出你行气时的一处疑处。',
        '先把这一周天练稳，再请教师尊旧剑谱。',
        '白清弦答应待晨课结束后，与你细说旧谱的来历。',
      ],
    },
    {
      title: '受困原地',
      texts: [
        '黄泉古迹出口暂封，晚棠守着搁浅木舟上的青灯。',
        '与晚棠一起查看舟首禁制，先找能够立足的办法。',
        '灯焰照出了半道旧纹，附近石阶仍被雾气遮住。',
      ],
    },
    {
      title: '已有调查',
      texts: [
        '你已经比对渡口旧碑与残木舟纹，确认两者有相似之处。',
        '向守人问清昨夜涨水的来向。',
        '守人亲见残木从上游漂来，船坊尚待访问。',
      ],
    },
  ];
  const script = `const {reactive,createApp}=Vue;
    const state=reactive({archive:{当前追踪:'样稿甲',旅程:{样稿甲:${JSON.stringify(current)},样稿乙:${JSON.stringify(archived)}}},get currentId(){return this.archive.当前追踪},get current(){return this.archive.旅程[this.currentId]},disabled:false,seeking:false,saving:false,error:'',panelOpen:false,preference:'',inspiration:'',proposals:[],proposalsStale:false,
      seek(){this.proposals=${JSON.stringify(proposals)}},cancel(){this.seeking=false},choose(p){this.proposals=[];this.panelOpen=false;showAction(p.step)},track(id){this.archive.当前追踪=id},pause(){this.current.状态='暂歇'},resume(){this.current.状态='进行中';showAction(this.current.下一步)},untrack(){this.archive.当前追踪=''},addGuess(content,clues){this.current.猜想['手记'+Date.now()]={内容:content,关联线索:clues,状态:'待核实',依据:''};return Promise.resolve(true)},verifyGuess(id){showAction('核实：'+this.current.猜想[id].内容)}});
    state.removeJourney=async id=>{delete state.archive.旅程[id];if(state.currentId===id)state.archive.当前追踪='';return true};
    Object.assign(state,{historyRows:[],selectedMessageIds:[],historyMode:'all',rangeStart:0,rangeEnd:2,historyLastMessageId:2,worldbooks:[{name:'本地样稿设定'}],worldEntryCount:1,contextReady:true,contextLoading:false,contextError:'',refreshContext:async()=>true});
    Object.defineProperty(state,'selectedHistory',{get(){return this.historyRows.filter(row=>this.selectedMessageIds.includes(row.id))}});
    Object.defineProperty(state,'referenceCharacters',{get(){return this.selectedHistory.reduce((sum,row)=>sum+row.content.length,0)}});
    state.selectAllHistory=()=>{state.historyMode='all';state.rangeStart=0;state.rangeEnd=state.historyLastMessageId;state.selectedMessageIds=state.historyRows.filter(row=>row.defaultSelected).map(row=>row.id)};
    state.applyHistoryRange=()=>{state.historyMode='manual';state.selectedMessageIds=state.historyRows.filter(row=>row.id>=state.rangeStart&&row.id<=state.rangeEnd&&row.defaultSelected).map(row=>row.id)};
    state.toggleHistoryMessage=id=>{state.historyMode='manual';state.selectedMessageIds=state.selectedMessageIds.includes(id)?state.selectedMessageIds.filter(value=>value!==id):[...state.selectedMessageIds,id].sort((a,b)=>a-b);state.proposalsStale=state.proposals.length>0};
    const scenes=${JSON.stringify(scenes)};
    function selectScene(index){state.historyRows=scenes[index].texts.map((content,id)=>({id,content,role:id%2?'user':'assistant',name:'旁白',kind:'正文',hidden:false,defaultSelected:true}));state.proposals=[];state.proposalsStale=false;state.panelOpen=true;state.selectAllHistory()}
    selectScene(0);
    function showAction(text){document.getElementById('action').textContent=text}
    const affairs={navigate:(kind,id)=>showAction('前往 '+kind+'：'+id)};
    const data={任务列表:{渡口访舟:{名称:'渡口访舟'}},世界图志:{旧渡重开:{}},rawData:{_近期任务结果:{}}};
    function dependency(id){if(id==='vue')return Vue;if(id.endsWith('JourneyContextPicker.vue'))return JourneyContextPicker.exports;if(id.endsWith('CloudStoriesPanel.vue'))return {default:{render:()=>Vue.h('p','云端故事请在酒馆内翻阅。')}};if(id.includes('journey-store'))return {useJourneyStore:()=>state};if(id.includes('affairs-store'))return {useAffairsStore:()=>affairs};return {useDataStore:()=>data}}
    ${modules.join('\n')}
    createApp(JourneyTrail.exports.default).mount('#trail');createApp(JourneyPanel.exports.default).mount('#panel');window.journeyPreview=state;window.selectJourneyScene=selectScene;
    const sceneNav=document.createElement('nav');sceneNav.setAttribute('aria-label','剧情参考样稿');sceneNav.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin:18px 0';scenes.forEach((scene,index)=>{const button=document.createElement('button');button.textContent=scene.title;button.onclick=()=>selectScene(index);button.style.cssText='padding:10px;background:var(--surface);color:var(--gold);border:1px solid var(--line-subtle);cursor:pointer';sceneNav.append(button)});document.getElementById('panel').before(sceneNav);`;
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>寻途与行旅 · 测试版交互样稿</title><style>html{color-scheme:dark}*{box-sizing:border-box}body{${themeVars};--semantic-danger:var(--danger);margin:0;background:#102326;color:var(--text-primary);font:14px/1.7 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:24px 18px}body>header{padding:14px 18px;color:var(--text-secondary);background:var(--surface-inset);font-size:12px}#action{white-space:pre-wrap;min-height:50px;color:var(--gold);padding:16px;border:1px solid var(--line-subtle)}.fa-solid{display:inline-block;width:1em}.journey-panel:focus{outline:none}${styles.join('\n')}</style><header>本地交互样稿，使用测试版实际组件与主题。样例资料仅在本页内变化。</header><main><div id="trail"></div><div id="panel"></div><pre id="action">点选「循此起念」或「循此核实」，查看行动文本。</pre></main><script src="./vue.runtime.js"></script><script>${script.replaceAll('</script', '<\\/script')}</script></html>`;
  const output = path.resolve('output/journey-checks');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'vue.runtime.js'), runtime);
  fs.writeFileSync(path.join(output, 'preview.html'), html);
  console.log('Journey preview generated from experimental frontend components.');
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
