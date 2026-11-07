/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const lodash = require('lodash');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
global._ = lodash;
global.crypto = require('node:crypto').webcrypto;
const core = require('../src/灯火通明-测试版/opening-plot');
const { Schema } = require('../src/灯火阑珊/schema');
const { guardParsedCommands } = require('../src/灯火阑珊-变量结构/guard');
const opening = '【开局甲-某师】\n山中晨读。';
const files = {
  './开局甲-某师.md': '作者确定：来信出于求助。人物希望修复一段旧约。',
  './开局乙-某师.md': '另一开场独有的因果。',
};
const drafts = () => core.collectOpeningPlotDrafts(files);
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness({ deferred = false, failure = false } = {}) {
  const records = new Map([[2, { stat_data: Schema.parse({ 本尊: { 灵石: 321 } }), display_data: { keep: true } }]]);
  const requests = [],
    writes = [],
    stopped = [],
    order = [];
  let resolveRequest;
  let scope = { chatId: '甲局', messageId: 2, openingMessage: opening };
  const host = {
    drafts: drafts(),
    scope: () => scope,
    read: id => lodash.cloneDeep(records.get(id)),
    write: async (id, value) => {
      writes.push(id);
      records.set(id, lodash.cloneDeep(value));
      order.push('save');
    },
    generate: async request => {
      requests.push(request);
      order.push('plan');
      if (failure) throw new Error('temporary failure');
      return deferred
        ? new Promise(resolve => {
            resolveRequest = resolve;
          })
        : '以求助信为缘起，人物依自己的所求逐渐行动。';
    },
    stop: id => stopped.push(id),
  };
  const planner = core.createOpeningPlotPlanner(host);
  return {
    host,
    planner,
    records,
    requests,
    writes,
    stopped,
    order,
    setScope: value => {
      scope = value;
    },
    resolve: value => resolveRequest(value ?? '一份尚未发生的构思。'),
  };
}

test('按开场完整标题匹配，模板、示例、空文件与另一同名人物开场隔离', () => {
  const found = core.collectOpeningPlotDrafts({
    ...files,
    './_模板.md': '模板',
    './README.md': '说明',
    './空稿.md': '  ',
  });
  assert.equal(found.size, 2);
  assert.equal(core.resolveOpeningPlotDraft('\uFEFF  ' + opening, found).openingId, '开局甲-某师');
  assert.equal(core.resolveOpeningPlotDraft('[开局乙-某师]\n别处相逢', found).content, files['./开局乙-某师.md']);
  assert.equal(core.resolveOpeningPlotDraft('【开局丙-某师】\n不同经历', found), undefined);
  assert.equal(core.resolveOpeningPlotDraft('山中晨读，没有标题', found), undefined);
  assert.equal(
    core.collectOpeningPlotDrafts({ './甲.md': '甲\r\n乙' }).get('甲').fingerprint,
    core.collectOpeningPlotDrafts({ './甲.md': '甲\n乙' }).get('甲').fingerprint,
  );
  const directory = 'src/灯火阑珊/开场剧情';
  const actual = Object.fromEntries(
    fs
      .readdirSync(directory)
      .filter(name => name.startsWith('_') || name === 'README.md')
      .map(name => [name, fs.readFileSync(path.join(directory, name), 'utf8')]),
  );
  assert.equal(core.collectOpeningPlotDrafts(actual).size, 0);
});

test('无底稿与非测试版范围均不发请求；首次规划只写入隐藏缓存', async () => {
  const h = harness();
  h.setScope(null);
  assert.equal(await h.planner.prepare('晨读'), undefined);
  h.setScope({ chatId: '甲局', messageId: 2, openingMessage: '【没有底稿的开场】' });
  assert.equal(await h.planner.prepare('晨读'), undefined);
  h.setScope({ chatId: '甲局', messageId: 2, openingMessage: opening });
  const before = lodash.cloneDeep(h.records.get(2));
  const result = await h.planner.prepare('先整理书架');
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].userInput, '先整理书架');
  assert.match(h.requests[0].generationId, /^dhl-opening-plot-/);
  assert.equal(result.开场标识, '开局甲-某师');
  assert.deepEqual(lodash.omit(h.records.get(2).stat_data, '$开场剧情'), lodash.omit(before.stat_data, '$开场剧情'));
  assert.deepEqual(h.records.get(2).display_data, before.display_data);
});

test('重复挂载共享请求，成功结果跨刷新复用，底稿修改后重新准备', async () => {
  const h = harness({ deferred: true });
  const a = h.planner.prepare('晨读');
  const b = h.planner.prepare('晨读');
  assert.equal(h.requests.length, 1);
  h.resolve();
  assert.deepEqual(await a, await b);
  const reloaded = core.createOpeningPlotPlanner(h.host);
  await reloaded.prepare('重推或续行');
  assert.equal(h.requests.length, 1);
  h.host.drafts.set(
    '开局甲-某师',
    core.collectOpeningPlotDrafts({ './开局甲-某师.md': '修改后的作者因果' }).get('开局甲-某师'),
  );
  const updated = h.planner.prepare('继续');
  assert.equal(h.requests.length, 2);
  h.resolve('随新底稿调整未来铺陈。');
  assert.equal((await updated).构思, '随新底稿调整未来铺陈。');
});

test('规划期间的同层事实更新会保留，其他行旅与历史快照保持原值', async () => {
  const h = harness({ deferred: true });
  h.records.set(1, lodash.cloneDeep(h.records.get(2)));
  const history = lodash.cloneDeep(h.records.get(1));
  const pending = h.planner.prepare('整理书架');
  h.records.get(2).stat_data.本尊.灵石 = 456;
  h.records.get(2).stat_data.$行旅蓝图.玩家远途 = '玩家自己的构思';
  h.resolve();
  await pending;
  assert.equal(h.records.get(2).stat_data.本尊.灵石, 456);
  assert.equal(h.records.get(2).stat_data.$行旅蓝图.玩家远途, '玩家自己的构思');
  assert.deepEqual(h.records.get(1), history);
});

test('换聊天、换开场、换楼层与底稿变更均丢弃迟到结果', async () => {
  for (const change of ['chat', 'opening', 'floor', 'draft']) {
    const h = harness({ deferred: true });
    const pending = h.planner.prepare('晨读');
    if (change === 'draft') h.host.drafts.clear();
    else
      h.setScope({
        chatId: change === 'chat' ? '乙局' : '甲局',
        messageId: change === 'floor' ? 3 : 2,
        openingMessage: change === 'opening' ? '【开局乙-某师】\n另处' : opening,
      });
    h.resolve();
    await assert.rejects(pending, core.OpeningPlotCancelledError);
    assert.equal(h.writes.length, 0);
  }
});

test('停止立即结束等待且迟到回复不会落盘，失败后可以再试', async () => {
  const h = harness({ deferred: true });
  const pending = h.planner.prepare('晨读');
  h.planner.cancel();
  await assert.rejects(pending, core.OpeningPlotCancelledError);
  assert.equal(h.stopped.length, 1);
  h.resolve();
  await flush();
  assert.equal(h.writes.length, 0);
  const next = h.planner.prepare('重新准备');
  h.resolve('第二次构思。');
  await next;
  assert.equal(h.writes.length, 1);
});

test('正文同时保留作者原稿和本局构思，缺失缓存时承接原稿', async () => {
  const h = harness();
  const draft = h.host.drafts.get('开局甲-某师');
  const fallback = core.buildOpeningPlotContext(draft, undefined);
  assert.match(fallback, /来信出于求助/);
  assert.match(fallback, /直接依据作者底稿/);
  const cache = await h.planner.prepare('晨读');
  const ready = core.buildOpeningPlotContext(draft, cache);
  assert.match(ready, /来信出于求助/);
  assert.match(ready, /以求助信为缘起/);
  assert.match(ready, /玩家可以日常、暂离、改道/);
  assert.doesNotMatch(ready, /另一开场独有/);
});

test('旧存档补齐空缓存，MVU命令不能覆盖或删除幕后构思', () => {
  const old = Schema.parse({});
  assert.deepEqual(old.$开场剧情, { 开场标识: '', 底稿指纹: '', 构思: '' });
  const variables = {
    stat_data: Schema.parse({ $开场剧情: { 开场标识: '甲', 底稿指纹: '版本甲', 构思: '作者约束下的构思' } }),
  };
  const commands = [
    { type: 'delete', args: ['["$开场剧情"]'] },
    { type: 'set', args: ['["$开场剧情"]["构思"]', '"模型改写"'] },
  ];
  guardParsedCommands(variables, commands);
  for (const command of commands) {
    assert.equal(command.type, 'set');
    assert.equal(command.args[0], 'stat_data.$开场剧情');
    assert.deepEqual(JSON.parse(command.args[1]), variables.stat_data.$开场剧情);
  }
  assert.deepEqual(Schema.parse(variables.stat_data), variables.stat_data);
});

test('规划请求只携带本开场和有关设定，排除其他蓝图及禁用条目', async () => {
  const names = ['getCharWorldbookNames', 'getWorldbook', 'generateRaw'];
  const previous = names.map(name => [name, global[name]]);
  let sent;
  global.getCharWorldbookNames = () => ({ primary: '本局世界书' });
  global.getWorldbook = async () => [
    { enabled: true, name: '世界观', content: '世界依据' },
    { enabled: true, name: '某师人设', content: '人物固定动机' },
    { enabled: false, name: '世界观旧稿', content: '禁用素材' },
    { enabled: true, name: '[开场剧情] 其他开场', content: '无关开场秘密' },
  ];
  global.generateRaw = async request => {
    sent = request;
    return '本局构思';
  };
  try {
    await core.generateOpeningPlot(
      {
        generationId: '独立规划',
        draft: drafts().get('开局甲-某师'),
        openingMessage: opening,
        statData: {
          当前处境: '晨读',
          红颜: { 某师: {} },
          $行旅蓝图: { 甲: '其他后台蓝图' },
          红颜角色库: { 某师: '无关资料库' },
        },
        userInput: '整理书架',
      },
      () => true,
    );
    assert.equal(sent.max_chat_history, 0);
    assert.equal(sent.overrides.chat_history.with_depth_entries, false);
    const content = sent.ordered_prompts.map(item => item.content).join('\n');
    assert.match(content, /世界依据/);
    assert.match(content, /人物固定动机/);
    assert.match(content, /来信出于求助/);
    assert.doesNotMatch(content, /其他后台蓝图|无关开场秘密|禁用素材|无关资料库/);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete global[name];
      else global[name] = value;
    }
  }
});

const controllerFile = 'src/灯火通明-伪同层控制器/index.ts';
const controller = ts.createSourceFile(
  controllerFile,
  fs.readFileSync(controllerFile, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
function declarations(names) {
  return controller.statements
    .filter(
      statement =>
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(item => names.includes(item.name.getText(controller))),
    )
    .map(statement => statement.getText(controller))
    .join('\n');
}
const compile = text =>
  ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
    .outputText;

function pipeline(options) {
  const h = harness(options);
  const errors = [];
  const host = {
    ...core,
    openingPlotDrafts: h.host.drafts,
    openingPlotPlanner: h.planner,
    getOpeningPlotScope: h.host.scope,
    activeGeneration: null,
    selectedHistoryKind: null,
    browsingHistory: false,
    controllerDisposed: false,
    deletingMessageId: null,
    updatingMessageId: null,
    getStageEntries: () => [],
    getGenerationAnchor: () => 2,
    getCurrentChatId: () => '甲局',
    getLastMessageId: () => 2,
    STORY_INTERACTION: { mode: 'story' },
    setActiveInteraction() {},
    sendGenerationState: (_generation, state) => h.order.push(state),
    applyStageVisibility() {},
    waitGlobalInitialized: async () => {},
    prepareDialogueCarryoverPrompt: async () => h.order.push('carryover'),
    triggerNativeSend: () => h.order.push('story'),
    failNativeGeneration: async (generation, error) => {
      errors.push(error);
      host.activeGeneration = null;
    },
    window: { setTimeout() {} },
    toastr: { info: () => h.order.push('fallback') },
    console: { warn() {} },
  };
  vm.runInNewContext(
    compile(
      declarations(['prepareOpeningPlotForGeneration', 'beginGeneration']) + '\nglobalThis.start=beginGeneration;',
    ),
    host,
  );
  host.start(
    { type: 'generate', requestId: 'request-1', messageId: 2, prompt: '先整理书架', interaction: { mode: 'story' } },
    {},
  );
  return { ...h, runtime: host, errors };
}

test('实际控制器先准备并保存构思，再发送正文起念', async () => {
  const h = pipeline({ deferred: true });
  await flush();
  assert.deepEqual(h.order, ['preparing', 'plan']);
  h.resolve();
  await flush();
  assert.deepEqual(h.order, ['preparing', 'plan', 'save', 'carryover', 'story']);
  assert.equal(h.errors.length, 0);
});

test('实际控制器准备失败时沿用原稿发送正文，取消则保留输入且不发送', async () => {
  const failed = pipeline({ failure: true });
  await flush();
  assert.deepEqual(failed.order, ['preparing', 'plan', 'fallback', 'carryover', 'story']);
  const cancelled = pipeline({ deferred: true });
  await flush();
  const generation = cancelled.runtime.activeGeneration;
  generation.cancelled = true;
  cancelled.planner.cancel();
  await flush();
  assert.equal(cancelled.errors.length, 1);
  assert.equal(generation.rawUserText, '先整理书架');
  assert.ok(!cancelled.order.includes('story'));
  assert.equal(cancelled.writes.length, 0);
});

test('实际控制器限定测试版伪同层正文，并匹配最初开场', () => {
  const host = {
    controllerDisposed: false,
    detachedMode: false,
    activeInteraction: { mode: 'story' },
    getParkedMessageId: () => 8,
    getFrameKeeper: () => ({ querySelector: () => ({ dataset: { dhlFrontendRevision: host.revision } }) }),
    revision: 'bright-test-123',
    getStageEntries: () => [{ messageIds: [0], representativeMessageId: 0, stage: { kind: 'story' } }],
    getHistoryEntries: entries => entries,
    latestStageId: () => 8,
    getChatMessages: () => [{ message: opening }],
    getCurrentChatId: () => '甲局',
    parseMessageContent: require('../src/灯火通明-测试版/message-content').parseMessageContent,
  };
  vm.runInNewContext(compile(declarations(['getOpeningPlotScope']) + '\nglobalThis.scope=getOpeningPlotScope;'), host);
  assert.equal(host.scope().openingMessage, opening);
  assert.equal(host.scope().messageId, 8);
  host.revision = 'formal-123';
  assert.equal(host.scope(), null);
  host.revision = 'bright-test-123';
  host.detachedMode = true;
  assert.equal(host.scope(), null);
  host.detachedMode = false;
  host.activeInteraction.mode = 'dialogue';
  assert.equal(host.scope(), null);
});

test('准备阶段的停止按钮取消独立请求，保留输入并阻止正文发送', async () => {
  const h = pipeline({ deferred: true });
  await flush();
  let branch;
  const visit = node => {
    if (ts.isIfStatement(node) && node.expression.getText(controller) === "request.type === 'stop'") branch = node;
    ts.forEachChild(node, visit);
  };
  visit(controller);
  assert.ok(branch);
  vm.runInNewContext(compile(`globalThis.stopRequest=(request,source)=>{${branch.getText(controller)}};`), h.runtime);
  const generation = h.runtime.activeGeneration;
  h.runtime.stopRequest({ type: 'stop', requestId: generation.requestId }, {});
  await flush();
  assert.equal(h.stopped.length, 1);
  assert.equal(generation.rawUserText, '先整理书架');
  assert.equal(h.errors.length, 1);
  assert.ok(!h.order.includes('story'));
  assert.equal(h.writes.length, 0);
});
