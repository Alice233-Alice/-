/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
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
const journeyContext = require('../src/灯火通明-测试版/journey-context');
const { ensureSentence } = require('../src/灯火通明-测试版/action-text');
const { buildQuestAction, buildFallbackActions } = require('../src/灯火通明-测试版/action-feed');
const cloudStories = require('../src/灯火通明-测试版/cloud-stories');
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
  const bookReads = [];
  const listeners = new Map();
  const messages = lodash.cloneDeep(
    options.messages ?? [
      {
        message_id: 0,
        role: 'assistant',
        name: '旁白',
        is_hidden: false,
        message: '<正文>你正在观月台随白清弦晨课，尚未下山。</正文>',
        extra: {},
      },
      { message_id: 1, role: 'user', name: '公子', is_hidden: false, message: '请教师尊方才的行气疑处。', extra: {} },
      {
        message_id: 2,
        role: 'assistant',
        name: '旁白',
        is_hidden: false,
        message: '<正文>白清弦让你先完成晨课，再看那卷旧剑谱。</正文>',
        extra: {},
      },
    ],
  );
  const books = options.books ?? {
    world: [
      { uid: 1, enabled: true, name: '世界观', content: '可远游的修仙世界' },
      { uid: 2, enabled: false, name: '世界观旧稿', content: '禁用的设定不应发送' },
    ],
  };
  const failedBooks = new Set(options.failedBooks ?? []);
  const tavernEvents = Object.fromEntries(
    [
      'MESSAGE_SENT',
      'MESSAGE_RECEIVED',
      'MESSAGE_EDITED',
      'MESSAGE_UPDATED',
      'MESSAGE_DELETED',
      'MESSAGE_SWIPED',
      'CHAT_CHANGED',
    ].map(name => [name, name]),
  );
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
    getGlobalWorldbookNames: () => options.globalBooks ?? [],
    getCharWorldbookNames: () => options.characterBooks ?? { primary: 'world', additional: [] },
    getChatWorldbookName: () => options.chatBook ?? null,
    getWorldbook: async name => {
      bookReads.push(name);
      if (failedBooks.has(name)) throw new Error('无法读取该书');
      if (!books[name]) throw new Error('世界书不存在');
      return lodash.cloneDeep(books[name]);
    },
    substitudeMacros: text => text.replaceAll('{{user}}', '公子').replaceAll('{{char}}', '旁白'),
    getChatMessages: () => {
      if (options.historyError) throw new Error(options.historyError);
      return lodash.cloneDeep(messages);
    },
    getLastMessageId: () => Math.max(-1, ...messages.map(message => message.message_id)),
    tavern_events: tavernEvents,
    eventOn: (event, callback) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
      return { stop: () => callbacks.delete(callback) };
    },
    generateRaw: async request => {
      requests.push(request);
      if (options.generateError) throw new Error(options.generateError);
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
      if (id === '../journey-context') return journeyContext;
      if (id === '../cloud-stories') return cloudStories;
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
    messages,
    books,
    bookReads,
    failedBooks,
    emit(event) {
      for (const listener of listeners.get(event) ?? []) listener();
    },
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

test('行动直接采用下一步，已有句末标点不重复，设定和进展留在后台', () => {
  for (const sentence of ['先去渡口问路。', '问问守人可曾见过？', '有人在吗?', '先过去看看！', '走吧!', '再等等…']) {
    assert.equal(ensureSentence('  ' + sentence + '\n'), sentence);
  }
  assert.equal(ensureSentence('  先去渡口问路  '), '先去渡口问路。');
  assert.equal(ensureSentence(' \n '), '');
  const journey = journeys.createJourney(proposals[0]);
  journey.所求 = '循着旧约探访远海。';
  journey.进展 = '已经与渡口守人交谈。';
  journey.下一步 = '  前往上游船坊，找船户辨认残木。  ';
  for (const status of ['待启程', '进行中']) {
    journey.状态 = status;
    assert.equal(journeys.buildJourneyAction(journey), '前往上游船坊，找船户辨认残木。');
  }
  journey.下一步 = '前往上游船坊，找船户辨认残木';
  assert.equal(journeys.buildJourneyAction(journey), '前往上游船坊，找船户辨认残木。');
});

test('行旅缺少下一步时依状态落笔，核实猜想只带真实关联线索', () => {
  const journey = journeys.createJourney(proposals[0]);
  journey.下一步 = '  ';
  assert.equal(journeys.buildJourneyAction(journey), '盘算着「望潮书」一事，先在附近寻个由头探探风声。');
  journey.状态 = '进行中';
  journey.进展 = '已经问清木片来自上游。；，';
  assert.equal(
    journeys.buildJourneyAction(journey),
    '顺着「望潮书」眼下的眉目（已经问清木片来自上游），继续往下追查。',
  );
  journey.进展 = '';
  assert.equal(journeys.buildJourneyAction(journey), '先把「望潮书」手头的线索理一理，看看下一步从哪儿落脚。');
  journey.线索.潮痕 = { 内容: '木片上有旧潮痕', 依据: '当面查验', 时地: '渡口' };
  journey.猜想.来处 = { 内容: '木片来自上游。', 关联线索: ['潮痕', '失效线索'], 状态: '待核实', 依据: '' };
  const guess = journeys.buildJourneyAction(journey, '来处');
  assert.match(guess, /木片来自上游。结合手头已知的线索（潮痕：木片上有旧潮痕）/u);
  assert.doesNotMatch(guess, /失效线索|。。/u);
  journey.猜想.来处.关联线索 = [];
  assert.doesNotMatch(journeys.buildJourneyAction(journey, '来处'), /结合手头已知的线索/u);
});

test('任务与世闻兜底沿用具体下一步，缺少切口时自然探听或静观', () => {
  assert.equal(buildQuestAction('问舟', { 名称: '问舟', 下一步: '去船坊问问。' }).行动, '去船坊问问。');
  assert.equal(buildQuestAction('问舟', { 下一步: '去船坊问问' }).行动, '去船坊问问。');
  assert.equal(buildQuestAction('问舟', {}).行动, '借眼下的空档理一理「问舟」的头绪，看看接下来先办哪一桩。');
  const event = { 状态: '活跃', 阶段: '征兆', 事件: '药香有异，尚待查证。', 下一步: '核对进货单。' };
  assert.equal(buildFallbackActions({}, '', { 丹香异变: event })[0].行动, '核对进货单。');
  const fallback = buildFallbackActions({}, '', { 丹香异变: { ...event, 下一步: '  ' } })[0];
  assert.equal(fallback.行动, '留意着「丹香异变」的动静，先在近处探听一下风声。');
  assert.equal(fallback.关联事件ID, '丹香异变');
  assert.equal(buildFallbackActions({}, '眼前暂静')[0].行动, '暂且按兵不动，先留意周遭的动静与风向。');
});

test('预设选篇固定ID与版本快照，重复选择保留进展及旧版，其他行旅继续保留', async () => {
  const { blueprintFile, ...metadata } = require('../examples/cloud-stories/sample.json');
  const story = { ...metadata, blueprint: fs.readFileSync('examples/cloud-stories/' + blueprintFile, 'utf8') };
  const h = harness({ state: { 行旅: { 当前追踪: '旧旅', 旅程: { 旧旅: journeys.createJourney(proposals[0]) } } } });
  try {
    assert.equal(await h.store.chooseStory(story), true);
    const id = cloudStories.cloudJourneyId(story.id);
    assert.equal(h.store.currentId, id);
    assert.equal(h.store.current.状态, '待启程');
    assert.equal(h.actions.length, 1);
    assert.equal(cloudStories.readStorySnapshot(h.data.rawData.$行旅蓝图[id]).revision, 1);
    assert.ok(h.data.rawData.行旅.旅程.旧旅);
    h.records.get(2).stat_data.行旅.旅程[id].进展 = '已查验登记簿';
    h.records.get(2).stat_data.行旅.旅程[id].状态 = '进行中';
    h.data.viewMessage(2);
    assert.equal(await h.store.chooseStory({ ...story, revision: 2, blueprint: '云端的新稿' }), true);
    assert.equal(h.actions.length, 1);
    assert.equal(h.store.current.进展, '已查验登记簿');
    assert.equal(Object.keys(h.store.archive.旅程).length, 2);
    assert.equal(cloudStories.readStorySnapshot(h.data.rawData.$行旅蓝图[id]).revision, 1);
    const context = journeys.buildJourneyContext(h.data.rawData);
    assert.match(context, /作者预设蓝图|固定核心真相|灯底旧骨/);
    assert.doesNotMatch(context, /云端的新稿/);
    await h.store.pause();
    assert.equal(journeys.buildJourneyContext(h.data.rawData), '');
    await h.store.resume();
    assert.equal(h.store.current.状态, '进行中');
    assert.match(journeys.buildJourneyContext(h.data.rawData), /已查验登记簿/);
  } finally {
    h.close();
  }
});

test('预设选篇沿用历史楼层与生成锁定，非法文稿不写入MVU', async () => {
  const h = harness();
  const story = {
    id: 'locked',
    revision: 1,
    name: '测试故事',
    genres: ['恐怖'],
    length: '短篇',
    lead: '待证传闻',
    goal: '调查异常',
    step: '先问路人',
    blueprint: '幕后真相',
  };
  try {
    h.pseudo.isStoryHistoryLatest = false;
    assert.equal(await h.store.chooseStory(story), false);
    h.pseudo.isStoryHistoryLatest = true;
    h.pseudo.isGenerating = true;
    assert.equal(await h.store.chooseStory(story), false);
    h.pseudo.isGenerating = false;
    assert.equal(await h.store.chooseStory({ ...story, id: '../invalid' }), false);
    assert.equal(h.writes.length, 0);
    assert.equal(h.actions.length, 0);
  } finally {
    h.close();
  }
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
    assert.match(request.ordered_prompts.at(-1).content, /想远游/);
    assert.match(request.ordered_prompts[1].content, /观月台随白清弦晨课/);
    assert.equal(request.ordered_prompts.length, 5);
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
    assert.equal(saved.stat_data.本尊.灵石.下品灵石, 543);
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

test('全部绑定世界书按书名去重，每条开启设定及其末尾完整发送，宏按当前聊天展开', async () => {
  const entry = (uid, name, content, enabled = true, type = 'selective') => ({
    uid,
    name,
    content,
    enabled,
    strategy: { type, keys: [] },
  });
  const h = harness({
    globalBooks: ['共用', '主书'],
    characterBooks: { primary: '主书', additional: ['附加', '共用'] },
    chatBook: '聊天书',
    books: {
      共用: [entry(1, '普通名称', '共用资料'.repeat(5000) + '共用末尾')],
      主书: [
        entry(1, '归墟地图', '地图全文'.repeat(2000) + '主书末尾{{user}}'),
        entry(2, '关闭设定', '绝不发送的关闭条目', false),
      ],
      附加: [entry(1, '[角色] 白清弦', '附加资料{{char}}末尾', true, 'constant')],
      聊天书: [entry(1, '当前旧约', '聊天设定末尾')],
    },
  });
  try {
    await h.store.seek();
    assert.equal(h.requests.length, 1);
    assert.deepEqual(h.bookReads, ['共用', '主书', '附加', '聊天书']);
    const text = h.requests[0].ordered_prompts[0].content;
    for (const word of ['共用末尾', '主书末尾公子', '附加资料旁白末尾', '聊天设定末尾']) assert.ok(text.includes(word));
    assert.doesNotMatch(text, /绝不发送的关闭条目|\{\{user\}\}|\{\{char\}\}/u);
    assert.equal((text.match(/归墟地图/gu) ?? []).length, 1);
    assert.deepEqual(Array.from(h.store.worldbooks.find(book => book.name === '主书').sources), ['全局', '角色主书']);
    assert.equal(h.store.worldEntryCount, 4);
    assert.equal(
      h.store.referenceCharacters,
      h.requests[0].ordered_prompts.reduce((sum, prompt) => sum + prompt.content.length, 0),
    );
  } finally {
    h.close();
  }
});

test('红颜主人设、阶段和别名只发送蓝灯条目，其余开启设定继续完整发送', async () => {
  const entry = (uid, name, content, type = 'selective', enabled = true) => ({
    uid,
    name,
    content,
    enabled,
    strategy: { type, keys: [] },
  });
  const h = harness({
    books: {
      world: [
        entry(1, '[角色] 白清弦', '蓝灯师尊主人设', 'constant'),
        entry(2, '[角色] 白清弦-陌生期', '蓝灯师尊陌生期', 'constant'),
        entry(3, '[角色] 许听雨', '绿灯人物主人设'),
        entry(4, '[角色] 白清弦-深爱期', '绿灯未来阶段'),
        entry(5, '[角色] 泠泠', '绿灯人物别名'),
        entry(6, '[角色] 梦杳泠', '向量人物人设', 'vectorized'),
        entry(7, '[角色] 晚棠', '已禁用的蓝灯人设', 'constant', false),
        entry(8, '[地图] 许听雨旧居', '绿灯地图仍完整带入'.repeat(1000)),
        entry(9, '世界观', '绿灯世界观仍然带入'),
        entry(10, '[红颜索引]', '蓝灯索引仍然带入', 'constant'),
        entry(11, '[地图] 旧稿', '关闭地图不发送', 'constant', false),
      ],
    },
  });
  try {
    const before = lodash.cloneDeep(h.books);
    await h.store.seek();
    const text = h.requests[0].ordered_prompts[0].content;
    assert.equal(h.store.worldEntryCount, 5);
    assert.deepEqual(
      Array.from(h.store.worldbooks[0].entries, row => row.uid),
      [1, 2, 8, 9, 10],
    );
    for (const word of [
      '蓝灯师尊主人设',
      '蓝灯师尊陌生期',
      h.books.world[7].content,
      '绿灯世界观仍然带入',
      '蓝灯索引仍然带入',
    ]) {
      assert.ok(text.includes(word));
    }
    assert.doesNotMatch(text, /绿灯人物主人设|绿灯未来阶段|绿灯人物别名|向量人物人设|已禁用的蓝灯人设|关闭地图不发送/u);
    assert.deepEqual(h.books, before);
    assert.equal(h.writes.length, 0);
  } finally {
    h.close();
  }
});

test('每次寻途重新读取红颜蓝灯状态，动态管理切换人设后采用当前蓝灯', async () => {
  const h = harness({
    books: {
      world: [
        {
          uid: 1,
          enabled: true,
          name: '[角色] 白清弦',
          content: '上一位蓝灯人物',
          strategy: { type: 'constant', keys: [] },
        },
        {
          uid: 2,
          enabled: true,
          name: '[角色] 许听雨',
          content: '当前新亮蓝灯人物',
          strategy: { type: 'selective', keys: [] },
        },
      ],
    },
  });
  try {
    await h.store.seek();
    assert.match(h.requests[0].ordered_prompts[0].content, /上一位蓝灯人物/u);
    assert.doesNotMatch(h.requests[0].ordered_prompts[0].content, /当前新亮蓝灯人物/u);
    h.books.world[0].strategy.type = 'selective';
    h.books.world[1].strategy.type = 'constant';
    await h.store.seek();
    assert.doesNotMatch(h.requests[1].ordered_prompts[0].content, /上一位蓝灯人物/u);
    assert.match(h.requests[1].ordered_prompts[0].content, /当前新亮蓝灯人物/u);
    assert.equal(h.store.worldEntryCount, 1);
  } finally {
    h.close();
  }
});

test('世界书保持原始换行与缩进，变量格式宏继续走酒馆助手的发送前展开流程', () => {
  const content = '<variables>\n{{format_message_variable::stat_data}}\n</variables>\n阶段条件:\n  - 依当前关系取用';
  const prompts = journeyContext.buildJourneyProposalPrompts(
    [{ name: '完整设定', sources: ['角色主书'], entries: [{ uid: 1, name: '变量与阶段', content }] }],
    [],
    Schema.parse({}),
    '',
    '',
  );
  assert.ok(prompts[0].content.includes(content));
  assert.match(prompts[0].content, /^\{\{format_message_variable::stat_data\}\}$/mu);
  assert.doesNotMatch(prompts[0].content, /\\n\{\{format_message_variable/u);
});

test('选中开局、玩家原意与归档交谈按楼层顺序发送，辅助块和未采用的分支留在请求之外', async () => {
  const meta = {
    version: 3,
    kind: 'dialogue',
    channel: 'present',
    sessionId: '课后问剑',
    targetName: '白清弦',
    canonicalName: '白清弦',
  };
  const message = (message_id, role, text, extra = {}, hidden = false) => ({
    message_id,
    role,
    message: text,
    extra,
    name: role === 'user' ? '公子' : '旁白',
    is_hidden: hidden,
  });
  const h = harness({
    messages: [
      {
        ...message(
          0,
          'assistant',
          '<think>内部构思不能发</think><正文>当前选中的晨课开局。' +
            '完整正文'.repeat(1600) +
            '正文末尾。</正文><UpdateVariable>旧变量命令</UpdateVariable>',
        ),
        swipes: ['未选中的其他开局', '当前选中的晨课开局。'],
      },
      message(1, 'user', '按照advice继续吧。', {
        izumi_advice: { version: 1, text: '先完成晨课，再问师尊旧剑谱。', assistantId: 0 },
      }),
      message(2, 'assistant', '<正文>师尊让你留下。</正文><visual_cards>前端展示资料</visual_cards>'),
      message(
        3,
        'user',
        '装饰过的交谈输入',
        { dhl_pseudo_interaction: { ...meta, rawUserText: '这卷旧谱从何而来？' } },
        true,
      ),
      message(
        4,
        'assistant',
        '<反应>她合上剑谱。</反应><正文>此事待晨课后细说。</正文><会话状态>结构化交谈状态</会话状态>',
        { extra: { dhl_pseudo_interaction: meta } },
        true,
      ),
      message(5, 'assistant', '<正文>手动隐藏的旧段落。</正文>', {}, true),
      message(6, 'system', '系统楼层不属于正文历史'),
      message(7, 'assistant', '<UpdateVariable>只有变量命令</UpdateVariable>'),
    ],
  });
  try {
    await h.store.seek();
    const prompts = h.requests[0].ordered_prompts;
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 1, 2, 3, 4]);
    assert.deepEqual(
      prompts.slice(1, -1).map(prompt => prompt.role),
      ['assistant', 'user', 'assistant', 'user', 'assistant'],
    );
    const text = prompts.map(prompt => prompt.content).join('\n');
    for (const word of [
      '当前选中的晨课开局',
      '正文末尾。',
      '先完成晨课，再问师尊旧剑谱',
      '这卷旧谱从何而来',
      '她合上剑谱',
      '此事待晨课后细说',
    ])
      assert.ok(text.includes(word));
    assert.doesNotMatch(
      text,
      /内部构思不能发|旧变量命令|前端展示资料|结构化交谈状态|未选中的其他开局|装饰过的交谈输入|手动隐藏的旧段落|系统楼层不属于/u,
    );
    h.store.toggleHistoryMessage(5);
    await h.store.seek();
    assert.match(
      h.requests
        .at(-1)
        .ordered_prompts.map(prompt => prompt.content)
        .join('\n'),
      /手动隐藏的旧段落/u,
    );
  } finally {
    h.close();
  }
});

test('区间批选后可取消区间内楼层和补选区间外楼层，选择影响实际请求并使旧候选失效', async () => {
  const messages = Array.from({ length: 45 }, (_, id) => ({
    message_id: id,
    role: id % 2 ? 'user' : 'assistant',
    name: '样稿',
    is_hidden: false,
    message: `剧情记录${id}末尾。`,
    extra: {},
  }));
  const h = harness({ messages });
  try {
    await h.store.refreshContext();
    assert.equal(h.store.rangeStart, 0);
    assert.equal(h.store.rangeEnd, 44);
    assert.equal(h.store.selectedHistory.length, 45);
    h.store.rangeStart = 10;
    h.store.rangeEnd = 30;
    h.store.applyHistoryRange();
    h.store.toggleHistoryMessage(18);
    h.store.toggleHistoryMessage(5);
    const selected = [5, ...Array.from({ length: 21 }, (_, i) => i + 10).filter(id => id !== 18)];
    assert.deepEqual(Array.from(h.store.selectedMessageIds), selected);
    await h.store.seek();
    const sentIds = h.requests[0].ordered_prompts
      .slice(1, -1)
      .map(prompt => Number(/第(\d+)楼/u.exec(prompt.content)[1]));
    assert.deepEqual(sentIds, selected);
    const proposal = h.store.proposals[0];
    h.store.toggleHistoryMessage(20);
    assert.equal(h.store.proposalsStale, true);
    assert.equal(await h.store.choose(proposal), false);
    assert.equal(h.writes.length, 0);
    h.store.selectAllHistory();
    assert.equal(h.store.selectedHistory.length, 45);
    assert.equal(h.store.historyMode, 'all');
  } finally {
    h.close();
  }
});

test('楼层改选后即使改回原状也须重寻，失败的重寻不会重新启用旧候选', async () => {
  const options = {};
  const h = harness(options);
  try {
    await h.store.seek();
    const old = h.store.proposals[0];
    h.store.toggleHistoryMessage(1);
    h.store.toggleHistoryMessage(1);
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 1, 2]);
    assert.equal(h.store.proposalsStale, true);
    options.response = '不完整的JSON';
    await h.store.seek();
    assert.equal(h.store.proposalsStale, true);
    assert.equal(await h.store.choose(old), false);
    options.response = response;
    await h.store.seek();
    assert.equal(h.store.proposalsStale, false);
    assert.equal(h.writes.length, 0);
  } finally {
    h.close();
  }
});

test('全选随新增剧情更新，手动模式保留所选，同聊天收起保留而切聊天重置', async () => {
  const h = harness();
  const addMessage = id =>
    h.messages.push({
      message_id: id,
      role: 'assistant',
      name: '旁白',
      is_hidden: false,
      message: `新剧情${id}`,
      extra: {},
    });
  try {
    await h.store.refreshContext();
    addMessage(3);
    h.emit('MESSAGE_RECEIVED');
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 1, 2, 3]);
    h.store.toggleHistoryMessage(1);
    h.store.panelOpen = false;
    h.store.panelOpen = true;
    await h.store.refreshContext();
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 2, 3]);
    addMessage(4);
    h.emit('MESSAGE_RECEIVED');
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 2, 3]);
    h.setChat('另一局');
    h.emit('CHAT_CHANGED');
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 1, 2, 3, 4]);
    assert.equal(h.store.historyMode, 'all');
    assert.equal(h.store.contextReady, false);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(h.store.contextReady, true);
  } finally {
    h.close();
  }
});

test('设定读取失败中止整次请求并保留手动选择，修复后重新读取最新开启状态', async () => {
  const h = harness({ failedBooks: ['world'] });
  try {
    await h.store.refreshContext();
    h.store.toggleHistoryMessage(1);
    await h.store.seek();
    assert.equal(h.requests.length, 0);
    assert.match(h.store.contextError, /世界书「world」读取失败/u);
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 2]);
    h.failedBooks.clear();
    h.books.world.push({ uid: 3, enabled: true, name: '刚开启的地点', content: '最新设定必须出现' });
    await h.store.seek();
    assert.equal(h.requests.length, 1);
    assert.match(h.requests[0].ordered_prompts[0].content, /最新设定必须出现/u);
    assert.deepEqual(Array.from(h.store.selectedMessageIds), [0, 2]);
  } finally {
    h.close();
  }
});

test('空选择、非法区间与历史读取失败不会发出请求，模型超限保留完整选择与错误', async () => {
  const h = harness();
  try {
    await h.store.refreshContext();
    h.store.rangeStart = 2;
    h.store.rangeEnd = 1;
    h.store.applyHistoryRange();
    assert.match(h.store.error, /有效的起止楼层/u);
    assert.equal(h.store.selectedHistory.length, 3);
    for (const id of [0, 1, 2]) h.store.toggleHistoryMessage(id);
    await h.store.seek();
    assert.equal(h.requests.length, 0);
    assert.match(h.store.error, /至少选中/u);
  } finally {
    h.close();
  }
  for (const options of [{ historyError: '历史读取中断' }, { generateError: 'maximum context length exceeded' }]) {
    const failed = harness(options);
    try {
      await failed.store.seek();
      assert.equal(failed.writes.length, 0);
      assert.match(failed.store.error, /历史读取中断|maximum context length exceeded/u);
      if (options.generateError) {
        assert.equal(failed.requests.length, 1);
        assert.deepEqual(Array.from(failed.store.selectedMessageIds), [0, 1, 2]);
      } else assert.equal(failed.requests.length, 0);
    } finally {
      failed.close();
    }
  }
});

test('选中楼层编辑、删除、换版本或新增楼层后，生成中的结果与生成后的候选均不能采用', async () => {
  for (const mode of ['edit', 'delete', 'swipe', 'append']) {
    for (const pending of [true, false]) {
      const h = harness({ defer: pending });
      try {
        const result = h.store.seek();
        await new Promise(resolve => setImmediate(resolve));
        if (!pending) await result;
        const proposal = h.store.proposals[0];
        if (mode === 'delete') h.messages.splice(0, 1);
        else if (mode === 'append') h.messages.push({ ...h.messages[2], message_id: 3, message: '后来发生的剧情' });
        else
          h.messages[0].message =
            mode === 'swipe' ? '<正文>当前换用的另一开局。</正文>' : '<正文>编辑后的开局。</正文>';
        h.emit(
          mode === 'delete'
            ? 'MESSAGE_DELETED'
            : mode === 'swipe'
              ? 'MESSAGE_SWIPED'
              : mode === 'append'
                ? 'MESSAGE_RECEIVED'
                : 'MESSAGE_UPDATED',
        );
        if (pending) {
          h.resolve();
          await result;
          assert.equal(h.store.proposals.length, 0);
          assert.match(h.store.error, /场景已经变化/u);
        } else {
          assert.equal(h.store.proposalsStale, true);
          assert.equal(await h.store.choose(proposal), false);
        }
        assert.equal(h.writes.length, 0);
      } finally {
        h.close();
      }
    }
  }
});

test('晨课、受困与已有调查三组样稿完整进入创作依据，提示要求承接当前牵系与知情范围', async () => {
  for (const scene of [
    { text: '观月台晨课未完，白清弦指出行气疑处，答应课后解释旧剑谱。', state: '晨课尚未结束', clue: '课后旧谱之约' },
    {
      text: '黄泉古迹出口暂封，晚棠正守着舟首青灯，你只能在搁浅木舟周围活动。',
      state: '受困木舟，无法离开',
      clue: '青灯与封闭出口',
    },
    {
      text: '已经核对渡口旧碑与残木舟纹，守人说昨夜残木来自上游，船坊仍待访问。',
      state: '沿旧碑线索调查',
      clue: '残木来自上游',
    },
  ]) {
    const h = harness({
      state: { 当前处境: scene.state },
      messages: [
        {
          message_id: 0,
          role: 'assistant',
          name: '旁白',
          is_hidden: false,
          message: `<正文>${scene.text}</正文>`,
          extra: {},
        },
      ],
    });
    try {
      await h.store.seek();
      const text = h.requests[0].ordered_prompts.map(prompt => prompt.content).join('\n');
      assert.ok(text.includes(scene.text));
      assert.ok(text.includes(scene.state));
      assert.match(text, /人物各自的动机|行动限制/u);
      assert.match(text, /第一步须在眼前处境中做得成/u);
      assert.match(text, /阶段人设依当前关系取用/u);
      assert.match(text, /尚未揭开的秘密留在plan/u);
    } finally {
      h.close();
    }
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
    assert.equal(h.actions.at(-1)[1], proposals[0].step + '。');
    assert.match(journeys.buildJourneyContext(h.data.rawData), /已与渡口守人交谈/);
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
    'JourneyContextPicker.vue',
    'CloudStoriesPanel.vue',
    'CloudStoryManager.vue',
    'JourneyTrail.vue',
    'InlineActionChoices.vue',
    'AffairsPanel.vue',
    'AffairsActions.vue',
    'CultivationPanel.vue',
    'DialogueStage.vue',
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
