const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const vue = require('vue');
const pinia = require('pinia');
const lodash = require('lodash');
const YAML = require('yaml');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
global._ = lodash;
const { Schema } = require('../src/灯火通明-测试版/schema');
const journeys = require('../src/灯火通明-测试版/journey');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');
const { guardParsedCommands } = require('../src/灯火阑珊-变量结构/guard');
const root = 'src/灯火通明-测试版/';
const proposals = ['望潮书', '问剑山外', '百草行'].map((name, index) => ({
  name,
  lead: `待核实的行路契机${index}`,
  goal: `愿意长久追寻的所求${index}`,
  step: `先从眼前拜访与问询开始${index}`,
  plan: `幕后构思${index}，各方的愿望与冲突，过程服从实际行动。`,
}));
const response = JSON.stringify({ proposals });

function harness(options = {}) {
  const p = pinia.createPinia();
  const initial = Schema.parse(options.state || {});
  const records = new Map([[2, { stat_data: lodash.cloneDeep(initial), display_data: { preserved: true } }]]);
  const data = vue.reactive({
    rawData: lodash.cloneDeep(initial),
    viewedMessageId: 2,
    viewMessage(id) {
      data.rawData = lodash.cloneDeep(records.get(id).stat_data);
    },
  });
  const pseudo = vue.reactive({
    isDetachedMode: false,
    isNativeLatest: true,
    isStoryHistoryLatest: true,
    isGenerating: false,
    performAction: (...args) => {
      actions.push(args);
      return true;
    },
  });
  let chat = 'current-chat';
  let resolveResponse;
  const writes = [];
  const requests = [];
  const actions = [];
  const stopped = [];
  const submitMode = vue.ref(options.direct ? 'direct' : 'confirm');
  const host = {
    exports: {},
    console,
    crypto: require('node:crypto').webcrypto,
    SillyTavern: { getCurrentChatId: () => chat },
    waitGlobalInitialized: async () => {},
    Mvu: {
      getMvuData: ({ message_id }) => lodash.cloneDeep(records.get(message_id)),
      replaceMvuData: async (next, target) => {
        writes.push({ next, target });
        records.set(target.message_id, lodash.cloneDeep(next));
      },
    },
    getCharWorldbookNames: () => ({ primary: 'world' }),
    getWorldbook: async () => [
      { enabled: true, name: '世界观', content: '可远游的修仙世界' },
      { enabled: false, name: '世界观旧稿', content: '禁用的设定不应发送' },
    ],
    generateRaw: async request => {
      requests.push(request);
      if (options.defer) return new Promise(resolve => (resolveResponse = resolve));
      return options.response ?? response;
    },
    stopGenerationById: id => stopped.push(id),
    require: id => {
      if (id === 'vue') return vue;
      if (id === 'pinia') return pinia;
      if (id === 'klona') return require('klona');
      if (id === '../action-preferences') return { useActionPreferences: () => ({ submitMode }) };
      if (id === '../journey') return journeys;
      if (id === '../../灯火阑珊/schema/journeys') return require('../src/灯火阑珊/schema/journeys');
      if (id === '../schema') return { Schema };
      if (id === './data-store') return { useDataStore: () => data };
      if (id === './pseudo-layer-store') return { usePseudoLayerStore: () => pseudo };
      throw new Error(`Unexpected dependency ${id}`);
    },
  };
  const compiled = ts.transpileModule(fs.readFileSync(root + 'stores/journey-store.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, host);
  const store = host.exports.useJourneyStore(p);
  return {
    store,
    data,
    pseudo,
    records,
    writes,
    requests,
    actions,
    stopped,
    setChat(value) {
      chat = value;
    },
    resolve(value = response) {
      resolveResponse(value);
    },
    close() {
      pinia.disposePinia(p);
    },
  };
}

test('提案完整校验，旧存档获得空行旅，候选保持待证意向', () => {
  assert.deepEqual(journeys.parseJourneyProposals('```json\n' + response + '\n```'), proposals);
  for (const invalid of [
    '未完成',
    '{"proposals":[]}',
    JSON.stringify({ proposals: [proposals[0], proposals[0], proposals[2]] }),
  ]) {
    assert.throws(() => journeys.parseJourneyProposals(invalid), /提案|格式|重复/);
  }
  const old = Schema.parse({ 本尊: { 灵石: 123 } });
  assert.deepEqual(old.行旅, { 当前追踪: '', 旅程: {} });
  assert.deepEqual(old.$行旅蓝图, {});
  const chosen = journeys.createJourney(proposals[0]);
  assert.equal(chosen.状态, '待启程');
  assert.deepEqual(chosen.线索, {});
  assert.deepEqual(chosen.纪事, {});
});

test('寻途为独立预览请求，过滤禁用设定，不写正文与MVU', async () => {
  const h = harness();
  try {
    h.store.preference = '想远游';
    await h.store.seek();
    assert.equal(h.store.proposals.length, 3);
    assert.equal(h.writes.length, 0);
    const request = h.requests[0];
    assert.match(request.generation_id, /^dhl-journey-/);
    assert.equal(request.max_chat_history, 0);
    assert.equal(request.overrides.chat_history.with_depth_entries, false);
    assert.match(request.ordered_prompts[0].content, /可远游的修仙世界/);
    assert.doesNotMatch(request.ordered_prompts[0].content, /禁用的设定不应发送/);
    assert.match(request.ordered_prompts[1].content, /想远游/);
    assert.equal(h.store.error, '');
  } finally {
    h.close();
  }
});

test('选择保存到当前MVU快照且保留现有数据，按原行动偏好起念', async () => {
  const h = harness({ direct: true });
  try {
    await h.store.seek();
    h.records.get(2).stat_data.本尊.灵石 = 543;
    assert.equal(await h.store.choose(h.store.proposals[0]), true);
    const saved = h.records.get(2);
    const id = saved.stat_data.行旅.当前追踪;
    assert.match(id, /^行旅_/);
    assert.equal(saved.stat_data.行旅.旅程[id].名称, proposals[0].name);
    assert.equal(saved.stat_data.$行旅蓝图[id], proposals[0].plan);
    assert.equal(saved.stat_data.本尊.灵石, 543);
    assert.equal(saved.display_data.preserved, true);
    assert.equal(h.writes[0].target.type, 'message');
    assert.equal(h.writes[0].target.message_id, 2);
    assert.equal(h.actions[0][2], true);
    assert.match(h.actions[0][1], /先从眼前拜访/);
    assert.equal(h.store.proposals.length, 0);
  } finally {
    h.close();
  }
});

test('旧楼层、主生成和保存期间不能修改行旅', async () => {
  const h = harness();
  try {
    for (const detached of [false, true]) {
      h.pseudo.isDetachedMode = detached;
      h.pseudo.isStoryHistoryLatest = false;
      h.pseudo.isNativeLatest = false;
      await h.store.seek();
      assert.equal(await h.store.choose(proposals[0]), false);
    }
    h.pseudo.isStoryHistoryLatest = h.pseudo.isNativeLatest = true;
    h.pseudo.isGenerating = true;
    await h.store.seek();
    assert.equal(await h.store.choose(proposals[0]), false);
    assert.equal(h.requests.length, 0);
    assert.equal(h.writes.length, 0);
  } finally {
    h.close();
  }
});

test('切聊天或楼层使预览失效，停止请求丢弃迟到结果', async () => {
  for (const mode of ['chat', 'message', 'cancel']) {
    const h = harness({ defer: true });
    try {
      const pending = h.store.seek();
      await new Promise(resolve => setImmediate(resolve));
      if (mode === 'chat') h.setChat('other-chat');
      if (mode === 'message') h.data.viewedMessageId = 3;
      if (mode === 'cancel') h.store.cancel();
      h.resolve();
      await pending;
      assert.equal(h.store.proposals.length, 0);
      assert.equal(h.writes.length, 0);
      assert.equal(h.store.seeking, false);
      if (mode === 'cancel') assert.equal(h.stopped.length, 1);
    } finally {
      h.close();
    }
  }
  const h = harness();
  try {
    await h.store.seek();
    h.data.viewedMessageId = 1;
    assert.equal(await h.store.choose(h.store.proposals[0]), false);
    assert.equal(h.writes.length, 0);
    assert.match(h.store.error, /先前场景/);
  } finally {
    h.close();
  }
});

test('请求失败显示可重试原因，保留已选行旅', async () => {
  const h = harness({ response: '半段未完成的JSON' });
  try {
    await h.store.seek();
    assert.equal(h.store.seeking, false);
    assert.match(h.store.error, /重新寻途/);
    assert.equal(h.writes.length, 0);
  } finally {
    h.close();
  }
});

test('暂歇、续行与重开手札保留事实，猜想核实经原行动输入', async () => {
  const h = harness();
  try {
    await h.store.seek();
    await h.store.choose(h.store.proposals[0]);
    const id = h.store.currentId;
    const state = h.records.get(2).stat_data;
    state.行旅.旅程[id].状态 = '进行中';
    state.行旅.旅程[id].进展 = '已与渡口守人交谈';
    state.行旅.旅程[id].线索.潮痕 = { 内容: '木片上有旧潮痕', 依据: '当面查验', 时地: '渡口' };
    h.data.viewMessage(2);
    await h.store.pause();
    assert.equal(h.store.current.状态, '暂歇');
    assert.equal(journeys.buildJourneyContext(h.data.rawData), '');
    await h.store.resume();
    assert.equal(h.store.current.状态, '进行中');
    assert.match(h.actions.at(-1)[1], /已与渡口守人交谈/);
    await h.store.addGuess('木片可能来自上游', ['潮痕', '不存在']);
    const guessId = Object.keys(h.store.current.猜想)[0];
    assert.deepEqual(Array.from(h.store.current.猜想[guessId].关联线索), ['潮痕']);
    assert.equal(h.store.current.猜想[guessId].状态, '待核实');
    const writeCount = h.writes.length;
    h.store.verifyGuess(guessId);
    assert.match(h.actions.at(-1)[1], /木片可能来自上游/);
    assert.match(h.actions.at(-1)[1], /木片上有旧潮痕/);
    assert.equal(h.writes.length, writeCount);
    await h.store.untrack();
    assert.equal(h.store.current, undefined);
    assert.equal(Object.keys(h.store.archive.旅程).length, 1);
    await h.store.track(id);
    assert.equal(h.store.current.线索.潮痕.内容, '木片上有旧潮痕');
  } finally {
    h.close();
  }
});

test('清理未追踪的行旅会同步移除蓝图，保留其他行旅、游戏事实与历史快照', async () => {
  const first = journeys.createJourney(proposals[0]);
  first.线索.旧碑 = { 内容: '旧碑残纹', 依据: '亲眼查验', 时地: '渡口' };
  const h = harness({
    state: {
      行旅: { 当前追踪: '乙', 旅程: { 甲: first, 乙: journeys.createJourney(proposals[1]) } },
      $行旅蓝图: { 甲: '甲的后台构思', 乙: '乙的后台构思' },
      本尊: { 灵石: 321 },
    },
  });
  try {
    const before = lodash.cloneDeep(h.records.get(2));
    h.records.set(1, lodash.cloneDeep(before));
    assert.equal(await h.store.removeJourney('甲'), true);
    const after = h.records.get(2);
    assert.equal(after.stat_data.行旅.旅程.甲, undefined);
    assert.equal(after.stat_data.$行旅蓝图.甲, undefined);
    assert.equal(after.stat_data.行旅.当前追踪, '乙');
    assert.deepEqual(after.stat_data.行旅.旅程.乙, before.stat_data.行旅.旅程.乙);
    assert.equal(after.stat_data.$行旅蓝图.乙, '乙的后台构思');
    assert.deepEqual(
      lodash.omit(after.stat_data, ['行旅', '$行旅蓝图']),
      lodash.omit(before.stat_data, ['行旅', '$行旅蓝图']),
    );
    assert.deepEqual(after.display_data, before.display_data);
    assert.deepEqual(h.records.get(1), before);
    assert.equal(h.writes.length, 1);
    assert.equal(h.writes[0].target.message_id, 2);
    assert.equal(h.actions.length, 0);
  } finally {
    h.close();
  }
});

test('清理当前行旅同时取消追踪，空结构不再生成行旅引导', async () => {
  const h = harness({
    state: {
      行旅: { 当前追踪: '甲', 旅程: { 甲: journeys.createJourney(proposals[0]) } },
      $行旅蓝图: { 甲: '当前后台构思' },
    },
  });
  try {
    assert.match(journeys.buildJourneyContext(h.data.rawData), /当前后台构思/);
    assert.equal(await h.store.removeJourney('甲'), true);
    assert.deepEqual(h.data.rawData.行旅, { 当前追踪: '', 旅程: {} });
    assert.deepEqual(h.data.rawData.$行旅蓝图, {});
    assert.equal(journeys.buildJourneyContext(h.data.rawData), '');
    assert.equal(h.store.current, undefined);
  } finally {
    h.close();
  }
});

test('清理沿用历史楼层与生成锁定，失效记录不会写入存档', async () => {
  const h = harness({
    state: {
      行旅: { 当前追踪: '', 旅程: { 甲: journeys.createJourney(proposals[0]) } },
      $行旅蓝图: { 甲: '保留构思' },
    },
  });
  try {
    h.pseudo.isStoryHistoryLatest = false;
    assert.equal(await h.store.removeJourney('甲'), false);
    h.pseudo.isStoryHistoryLatest = true;
    h.pseudo.isGenerating = true;
    assert.equal(await h.store.removeJourney('甲'), false);
    h.pseudo.isGenerating = false;
    assert.equal(await h.store.removeJourney('已失效'), false);
    assert.match(h.store.error, /已经不存在/);
    assert.equal(h.writes.length, 0);
    assert.equal(h.records.get(2).stat_data.$行旅蓝图.甲, '保留构思');
  } finally {
    h.close();
  }
});

test('正文后的真实MVU补丁推进篇章、线索、纪事与查证状态，旧快照可回看', () => {
  const journey = journeys.createJourney(proposals[0]);
  journey.猜想.上游 = { 内容: '木片来自上游', 关联线索: [], 状态: '待核实', 依据: '' };
  const old = Schema.parse({
    行旅: { 当前追踪: '行旅_甲', 旅程: { 行旅_甲: journey } },
    $行旅蓝图: { 行旅_甲: '未发生的构思' },
  });
  const replay = executeUpdateVariable(
    old,
    makeUpdateVariable('交谈核实潮木来处，承接渡口线索。', [
      { op: 'replace', path: '/行旅/旅程/行旅_甲/状态', value: '进行中' },
      { op: 'replace', path: '/行旅/旅程/行旅_甲/篇章', value: '渡口问潮' },
      { op: 'replace', path: '/行旅/旅程/行旅_甲/进展', value: '守人证实木片随昨夜涨水自上游漂来。' },
      { op: 'replace', path: '/行旅/旅程/行旅_甲/下一步', value: '沿河访问上游船户。' },
      {
        op: 'insert',
        path: '/行旅/旅程/行旅_甲/线索/潮木来处',
        value: { 内容: '木片随涨水从上游而来', 依据: '守人亲眼所见', 时地: '渡口晨间' },
      },
      {
        op: 'insert',
        path: '/行旅/旅程/行旅_甲/纪事/约访船户',
        value: { 内容: '与守人约定沿河探访', 依据: '本轮交谈', 时地: '渡口晨间' },
      },
      { op: 'replace', path: '/行旅/旅程/行旅_甲/猜想/上游/状态', value: '有证据支持' },
      { op: 'replace', path: '/行旅/旅程/行旅_甲/猜想/上游/依据', value: '守人描述支持上游来处，具体船只仍待查。' },
    ]),
  );
  assert.deepEqual(replay.errors, []);
  assert.equal(replay.commandGuardIntervened, false);
  assert.equal(replay.finalData.行旅.旅程.行旅_甲.线索.潮木来处.内容, '木片随涨水从上游而来');
  assert.equal(old.行旅.旅程.行旅_甲.状态, '待启程');
  assert.equal(replay.finalData.$行旅蓝图.行旅_甲, '未发生的构思');
});

test('酒馆解析器的括号路径归入stat_data，键名中的点号继续作为一个键', () => {
  const commands = [
    { type: 'set', args: ['["行旅"]["旅程"]["甲"]["状态"]', '"进行中"'] },
    { type: 'insert', args: ['["行旅"]["旅程"]["甲"]["线索"]["碑纹.甲"]', '{}'] },
    { type: 'set', args: ['["当前处境"]', '"已问询"'] },
  ];
  guardParsedCommands({ stat_data: Schema.parse({}) }, commands);
  assert.equal(commands[0].args[0], 'stat_data.行旅.旅程.甲.状态');
  assert.deepEqual(lodash.toPath(commands[1].args[0]), ['stat_data', '行旅', '旅程', '甲', '线索', '碑纹.甲']);
  assert.equal(commands[2].args[0], 'stat_data.当前处境');
});

test('请求只承接当前行旅，已知与构思分明，限量带入近期记录', () => {
  const current = journeys.createJourney(proposals[0]);
  for (let i = 0; i < 20; i++) {
    current.线索[`线索${i}`] = { 内容: `证据${i}`, 依据: '', 时地: '' };
    current.纪事[`纪事${i}`] = { 内容: `经历${i}`, 依据: '', 时地: '' };
  }
  const state = Schema.parse({
    行旅: { 当前追踪: '甲', 旅程: { 甲: current, 乙: journeys.createJourney(proposals[1]) } },
    $行旅蓝图: { 甲: '当前幕后构思', 乙: '其他行旅秘事' },
  });
  const context = journeys.buildJourneyContext(state);
  assert.match(context, /待启程仅表示意向/);
  assert.match(context, /当前幕后构思/);
  assert.doesNotMatch(context, /其他行旅秘事|问剑山外|"线索0"|"纪事11"/);
  assert.match(context, /"线索8"|"纪事12"/);
  state.行旅.旅程.甲.状态 = '已落幕';
  assert.equal(journeys.buildJourneyContext(state), '');
  assert.equal(journeys.buildJourneyContext({}), '');
});

test('测试版组件与世界书可编译，后台构思不进入提案卡片', () => {
  const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc');
  for (const file of [
    'JourneyPanel.vue',
    'JourneyTrail.vue',
    'InlineActionChoices.vue',
    'AffairsPanel.vue',
    'PseudoCommandDock.vue',
  ]) {
    const filename = path.join(root, 'components', file);
    const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename });
    assert.equal(errors.length, 0);
    const script = compileScript(descriptor, { id: file });
    const compiled = compileTemplate({
      source: descriptor.template.content,
      filename,
      id: file,
      compilerOptions: { bindingMetadata: script.bindings },
    });
    assert.deepEqual(compiled.errors, []);
    if (file === 'JourneyPanel.vue') assert.doesNotMatch(descriptor.template.content, /proposal\.plan|行旅蓝图/);
  }
  for (const file of ['[机制] 寻途与行旅.yaml', '变量更新规则&变量输出格式/[mvu_update]行旅更新规则.yaml']) {
    assert.ok(YAML.parse(fs.readFileSync(path.join('src/灯火阑珊/灯火阑珊-世界书', file), 'utf8')));
  }
  for (const file of ['PseudoStoryReader.vue', 'TimelineReader.vue']) {
    assert.match(fs.readFileSync(path.join(root, 'components', file), 'utf8'), /InlineActionChoices/);
  }
});

test('控制器在正文生成前注入当前行旅，寻途、交谈与暂歇时清理引导', () => {
  const source = fs.readFileSync('src/灯火通明-伪同层控制器/index.ts', 'utf8');
  const ast = ts.createSourceFile('controller.ts', source, ts.ScriptTarget.Latest, true);
  const setup = ast.statements
    .filter(statement => {
      const text = statement.getText(ast);
      return (
        (ts.isVariableStatement(statement) &&
          statement.declarationList.declarations.some(item => item.name.getText(ast) === 'syncJourneyPrompt')) ||
        (ts.isExpressionStatement(statement) &&
          text.startsWith('controllerEventStops.push(') &&
          text.includes('eventOn(tavern_events.GENERATION_AFTER_COMMANDS,'))
      );
    })
    .map(statement => statement.getText(ast))
    .join('\n');
  assert.ok(setup.includes('iframe_events.GENERATION_STARTED'));
  const state = Schema.parse({
    行旅: { 当前追踪: '甲', 旅程: { 甲: journeys.createJourney(proposals[0]) } },
    $行旅蓝图: { 甲: '仅当前构思' },
  });
  const handlers = {};
  const inserted = [];
  const removed = [];
  const host = {
    controllerDisposed: false,
    activeInteraction: { mode: 'story' },
    Mvu: { getMvuData: () => ({ stat_data: state }) },
    latestStoryStageId: () => 2,
    buildJourneyContext: journeys.buildJourneyContext,
    JOURNEY_PROMPT_ID: journeys.JOURNEY_PROMPT_ID,
    JOURNEY_GENERATION_PREFIX: journeys.JOURNEY_GENERATION_PREFIX,
    injectPrompts: value => inserted.push(value),
    uninjectPrompts: value => removed.push(value),
    console,
    controllerEventStops: [],
    tavern_events: { GENERATION_AFTER_COMMANDS: 'native' },
    iframe_events: { GENERATION_STARTED: 'helper' },
    eventOn: (event, fn) => {
      handlers[event] = fn;
      return { stop() {} };
    },
  };
  vm.runInNewContext(
    ts.transpileModule(setup, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    host,
  );
  handlers.native('normal');
  assert.equal(inserted.length, 1);
  assert.match(inserted[0][0].content, /仅当前构思/);
  assert.equal(inserted[0][0].should_scan, false);
  handlers.helper('dhl-journey-preview');
  handlers.native('quiet');
  host.activeInteraction.mode = 'dialogue';
  handlers.native('normal');
  host.activeInteraction.mode = 'story';
  state.行旅.旅程.甲.状态 = '暂歇';
  handlers.native('normal');
  assert.equal(inserted.length, 1);
  assert.equal(removed.length, 5);
});
