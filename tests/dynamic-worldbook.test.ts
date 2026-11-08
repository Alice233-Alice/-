/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const lodash = require('lodash');
const contextTools = require('../src/踏月寻仙-动态世界书管理/character-context');
const aliases = require('../src/灯火阑珊-变量结构/companion-aliases');
const source = fs.readFileSync('src/踏月寻仙-动态世界书管理/index.ts', 'utf8');
const compile = (text: string) =>
  ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const compiled = compile(
  source +
    `\nObject.assign(exports, {
  getCharacterBaseDecision, getCharacterStageDecision, updateWorldbookEntries,
  getContext, readLatestUserContextHint, buildPreviewContext, applySettingsToConfig,
  registerGenerationHooks,
});`,
);

function message(text: string, role = 'assistant', extra = {}, is_hidden = false) {
  return { message: text, role, extra, is_hidden };
}

function harness() {
  const settingsHost: any = {
    exports: {},
    z: require('zod').z,
    _: lodash,
    klona: lodash.cloneDeep,
    getScriptId: () => 'test',
    getVariables: () => ({ debug: false, show_toasts: false }),
    defineStore: () => () => ({}),
  };
  vm.runInNewContext(compile(fs.readFileSync('src/踏月寻仙-动态世界书管理/settings.ts', 'utf8')), settingsHost);
  const settings = settingsHost.exports.readSettings();
  const state: any = {
    messages: [],
    entries: [],
    runtime: {},
    ranges: [],
    chatId: 'test-chat',
    writes: 0,
    variablesByMessage: null,
    variables: { stat_data: { 本尊: { 等级: 1, 行踪: { 当前区域: '未知' } }, 红颜: {} } },
  };
  const listeners = new Map<string, Array<(...args: any[]) => any>>();
  const on = (type: string, listener: (...args: any[]) => any) => {
    listeners.set(type, [...(listeners.get(type) ?? []), listener]);
  };
  const eventNames = [
    'GENERATION_AFTER_COMMANDS',
    'WORLDINFO_ENTRIES_LOADED',
    'WORLD_INFO_ACTIVATED',
    'GENERATION_ENDED',
    'GENERATION_STOPPED',
    'CHAT_CHANGED',
  ];
  const host: any = {
    exports: {},
    _: lodash,
    window: {},
    SillyTavern: { getCurrentChatId: () => state.chatId },
    tavern_events: Object.fromEntries(eventNames.map(name => [name, name])),
    eventOn: on,
    eventMakeLast: on,
    $: () => ({ on: () => {} }),
    console: { ...console, info: () => {} },
    setTimeout: (fn: () => void, ms: number) => {
      const timer: any = setTimeout(fn, ms);
      timer.unref();
      return timer;
    },
    waitGlobalInitialized: async () => {},
    getLastMessageId: () => state.messages.length - 1,
    getChatMessages: (range: string | number, options: any = {}) => {
      state.ranges.push(range);
      const [start, end] = typeof range === 'number' ? [range, range] : range.split('-').map(Number);
      return state.messages.slice(start, end + 1).filter((m: any) => !options.role || m.role === options.role);
    },
    getVariables: (options: any) =>
      lodash.cloneDeep(
        state.variablesByMessage?.[options.message_id] ?? (state.variablesByMessage ? {} : state.variables),
      ),
    replaceVariables: (value: any) => {
      state.variables = value;
    },
    getCharWorldbookNames: () => ({ primary: 'test' }),
    updateWorldbookWith: async (_: string, updater: any) => {
      if (state.beforeWrite) await state.beforeWrite();
      state.entries = updater(state.entries);
      state.writes += 1;
    },
    require: (id: string) => {
      if (id.endsWith('companion-aliases')) return aliases;
      if (id.endsWith('map-system')) return { resolveMapAnchor: () => '' };
      if (id.endsWith('region-utils')) return { inferLayerFromTrack: () => '' };
      if (id.endsWith('/schema')) return { Schema: { parse: (value: any) => value } };
      if (id === './character-context') return contextTools;
      if (id === './panel') return {};
      if (id === './settings') return settingsHost.exports;
      if (id === './runtime')
        return {
          getRuntimeSnapshot: () => state.runtime,
          updateRuntimeSnapshot: (patch: any) => Object.assign(state.runtime, patch),
          registerRuntimeActions: () => {},
        };
      throw Error(`Unexpected dependency: ${id}`);
    },
  };
  vm.runInNewContext(compiled, host);
  host.exports.registerGenerationHooks();
  return {
    ...host.exports,
    state,
    settings,
    settingsSchema: settingsHost.exports.DynamicWorldbookSettingsSchema,
    async emit(event: string, ...args: any[]) {
      for (const listener of listeners.get(event) ?? []) await listener(...args);
    },
    async refresh(mode = 'enable') {
      await host.exports.updateWorldbookEntries(mode, { force: true, reason: 'TEST' });
      assert.equal(state.runtime.lastError, '', state.runtime.lastError);
    },
  };
}

const context = (texts: string[], hongyan = {}) => ({ recentCharacterMessages: texts, mvuData: { 红颜: hongyan } });
const entry = (name: string, type = 'selective', enabled = true) => ({ name, enabled, strategy: { type } });
const dream = '[角色] 梦杳泠';
const stranger = '[角色] 梦杳泠-陌生期';
const tests: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, run: () => void | Promise<void>) => tests.push([name, run]);

test('实报原句“足踝鸣珠……泠泠作响”不触发主人设或陌生期', () => {
  const h = harness();
  const ctx = context(['羽岚赤足轻点湿滑岩台，足踝鸣珠在浪涛声中泠泠作响，抬首望向崖顶风口处的巨石。']);
  assert.equal(h.getCharacterBaseDecision(ctx, dream).matched, false);
  assert.equal(h.getCharacterStageDecision(ctx, stranger).matched, false);
  assert.match(h.getCharacterBaseDecision(ctx, dream).reasons.join(' '), /忽略歧义别名：泠泠/);
});
test('全名、明确称号仍能触发未入表人物及陌生期', () => {
  const h = harness();
  for (const name of ['梦杳泠', '乘黄少女', '末代乘黄']) {
    const ctx = context([`你走向${name}。`]);
    assert.equal(h.getCharacterBaseDecision(ctx, dream).matched, true, name);
    assert.equal(h.getCharacterStageDecision(ctx, stranger).matched, true, name);
    assert.match(h.getCharacterBaseDecision(ctx, dream).reasons.join(' '), /依据：/);
  }
});
test('只有红颜表记录或空上下文都不能开灯', () => {
  const h = harness();
  for (const texts of [[], [''], ['羽岚望向远处。']]) {
    const ctx = context(texts, { 梦杳泠: { 好感度: 75 } });
    assert.equal(h.getCharacterBaseDecision(ctx, dream).matched, false);
    assert.equal(h.getCharacterStageDecision(ctx, '[角色] 梦杳泠-心动期').matched, false);
  }
});
test('人物阶段按好感度互斥，歧义别名条目不能绕过限制', () => {
  const h = harness();
  const ctx = context(['梦杳泠笑了。'], { 梦杳泠: { 好感度: 0 } });
  assert.equal(h.getCharacterStageDecision(ctx, stranger).matched, true);
  for (const name of ['好感期', '心动期', '确认期', '深爱期']) {
    assert.equal(h.getCharacterStageDecision(ctx, `${dream}-${name}`).matched, false);
  }
  assert.equal(h.getCharacterBaseDecision(context(['泠泠作响']), '[角色] 泠泠').matched, false);
});
test('附属标签、思考、变量、候选行动不作人物证据，保留正文中的【人名】', () => {
  const { sanitizeContextMessage: clean } = contextTools;
  for (const tag of [
    'think',
    'UpdateVariable',
    'JSONPatch',
    'initvar',
    'advice',
    'choices',
    'visual_cards',
    'tucao',
    'current_event',
    'progress',
    'konatan_planning~',
  ]) {
    assert.equal(clean(`<${tag}>梦杳泠</${tag}>羽岚望向海面。`), '羽岚望向海面。', tag);
  }
  assert.equal(clean('计划让梦杳泠出现。</konatan_planning~>羽岚望向海面。<advice>梦杳泠</advice>'), '羽岚望向海面。');
  assert.equal(clean('<content>【梦杳泠】走了过来。</content><advice>羽岚</advice>'), '【梦杳泠】走了过来。');
  assert.equal(clean('羽岚。<UpdateVariable>梦杳泠'), '羽岚。');
  assert.equal(clean('羽岚。<advice>梦杳泠'), '羽岚。');
  assert.equal(clean('<!--梦杳泠--><div title="梦杳泠">羽岚。</div>```json\n梦杳泠\n```'), '羽岚。');
});
test('只读玩家实际输入，忽略系统和普通隐藏消息，保留隐藏对话', () => {
  const { readContextMessage: read } = contextTools;
  const meta = { izumi_advice: { version: 1, assistantId: 1, text: '去找梦杳泠。' } };
  assert.equal(read(message('按照advice继续吧。', 'user', meta)), '去找梦杳泠。');
  assert.equal(read(message('留在这里。', 'user', meta)), '留在这里。');
  assert.equal(read(message('梦杳泠', 'system')), '');
  assert.equal(read(message('梦杳泠', 'assistant', {}, true)), '');
  assert.equal(read(message('梦杳泠', 'assistant', { dhl_pseudo_interaction: { kind: 'dialogue' } }, true)), '梦杳泠');
});
test('窗口按物理楼层截取，空正文不挖出旧人物，预览清洗一致', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠'), message('<UpdateVariable>梦杳泠</UpdateVariable>'), message('羽岚走近。')];
  const ctx = await h.getContext();
  assert.equal(h.getCharacterBaseDecision(ctx, dream).matched, false);
  assert.deepEqual(h.state.ranges, ['1-2']);
  assert.deepEqual(Array.from(ctx.recentCharacterMessages), ['', '羽岚走近。']);
  const preview = h.buildPreviewContext(ctx, { recentMessages: ['<advice>梦杳泠</advice>'] });
  assert.equal(h.getCharacterBaseDecision(preview, dream).matched, false);
});
test('重生成不补入旧用户消息，正在发送的输入不重复占窗口', async () => {
  const h = harness();
  h.state.messages = [message('找梦杳泠', 'user'), message('羽岚'), message('羽岚')];
  assert.equal(h.readLatestUserContextHint(), '');
  h.state.messages.push(message('去找梦杳泠', 'user'));
  assert.equal(h.readLatestUserContextHint(), '去找梦杳泠');
  const ctx = await h.getContext('去找梦杳泠');
  assert.deepEqual(Array.from(ctx.recentCharacterMessages), ['羽岚', '去找梦杳泠']);
});
test('真实更新流程关闭旧误亮灯，重复刷新不续期，核心和不受管理条目保留', async () => {
  const h = harness();
  h.state.messages = [message('羽岚的鸣珠泠泠作响。')];
  h.state.variables.stat_data.红颜 = { 梦杳泠: { 好感度: 0 } };
  h.state.entries = [
    entry(dream, 'constant'),
    entry(stranger, 'constant'),
    entry('[系统] 规则', 'constant'),
    entry('其他手动条目', 'constant'),
  ];
  for (let i = 0; i < 3; i++) {
    await h.refresh();
    assert.deepEqual(
      h.state.entries.map((e: any) => e.strategy.type),
      ['selective', 'selective', 'constant', 'constant'],
    );
  }
});
test('真正出现则开启；移出窗口后在开灯和回复收灯两种模式都恢复绿灯', async () => {
  for (const mode of ['enable', 'disable']) {
    const h = harness();
    h.state.messages = [message('梦杳泠走近。')];
    h.state.entries = [entry(dream), entry(stranger)];
    await h.refresh();
    assert.ok(h.state.entries.every((e: any) => e.strategy.type === 'constant'));
    await h.refresh('disable');
    assert.ok(h.state.entries.every((e: any) => e.strategy.type === 'constant'));
    h.state.messages.push(message('我们继续。', 'user'), message('海面平静。'));
    await h.refresh(mode);
    assert.ok(
      h.state.entries.every((e: any) => e.strategy.type === 'selective'),
      mode,
    );
  }
});
test('强制开关和原本禁用的条目仍受尊重', async () => {
  const h = harness();
  h.applySettingsToConfig({ ...h.settings, forced_enable_entries: [dream], forced_disable_entries: [stranger] });
  h.state.messages = [message('羽岚')];
  h.state.entries = [entry(dream), entry(stranger, 'constant'), entry('[角色] 羽岚', 'selective', false)];
  for (const mode of ['enable', 'disable']) {
    await h.refresh(mode);
    assert.deepEqual(
      h.state.entries.map((e: any) => e.strategy.type),
      ['constant', 'selective', 'selective'],
    );
  }
});
test('旧设置迁移到两层人物窗口；地图延续轮数可以真正归零', () => {
  const h = harness();
  const settings = h.settingsSchema.parse({ character_sticky_cycles: 8, map_sticky_cycles: 0 });
  assert.equal(settings.character_context_window, 2);
  assert.equal(settings.character_sticky_cycles, undefined);
  assert.equal(settings.map_sticky_cycles, 0);
  h.applySettingsToConfig({ ...h.settings, character_context_window: 1 });
  const ctx = h.buildPreviewContext(null, { recentMessages: ['梦杳泠', '羽岚'] });
  assert.equal(h.getCharacterBaseDecision(ctx, dream).matched, false);
});

function scanEntry(name: string, uid: number, extra = {}) {
  return {
    world: 'test',
    uid,
    comment: name,
    constant: false,
    disable: false,
    content: `${name}原始完整人设`,
    ...extra,
  };
}
function lores(entries: any[]) {
  return { globalLore: [], characterLore: entries, chatLore: [], personaLore: [] };
}

test('首次提及的新人物在本轮扫描前开启，旧条目副本同步且不重复注入', async () => {
  const h = harness();
  h.state.messages = [message('海风吹过。'), message('去找梦杳泠。', 'user')];
  h.state.entries = [entry(dream), entry(stranger)];
  const original = scanEntry(dream, 25);
  const book = lores([original, scanEntry(stranger, 65)]);
  await h.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  await h.emit('WORLDINFO_ENTRIES_LOADED', book);
  assert.ok(h.state.entries.every((e: any) => e.strategy.type === 'constant'));
  assert.ok(book.characterLore.every(e => e.constant && !e.disable));
  assert.equal(original.constant, false, '不能污染加载前的缓存对象');
  assert.equal(book.characterLore.length, 2, '不得再追加一份人设');
  assert.equal(book.characterLore[0].content, original.content, '保留完整原文');
  await h.emit('WORLD_INFO_ACTIVATED', book.characterLore);
  assert.equal(h.state.runtime.generationMessage, '本轮人设：2 项已通过世界书扫描');
});

test('本轮人物筛选不会被绿灯关键词、递归或旧常亮绕过，不影响别的世界书', async () => {
  const h = harness();
  h.state.messages = [message('羽岚的鸣珠泠泠作响。<think>梦杳泠</think>')];
  h.state.entries = [entry(dream, 'constant')];
  const other = scanEntry(dream, 25, { world: 'other', constant: true });
  const disabled = scanEntry('[角色] 羽岚', 90, { disable: true });
  const book = lores([scanEntry(dream, 25, { constant: true, key: ['泠泠'], sticky: 9 }), other, disabled]);
  await h.emit('WORLDINFO_ENTRIES_LOADED', book);
  assert.equal(book.characterLore[0].constant, false);
  assert.equal(book.characterLore[0].disable, true);
  assert.equal(book.characterLore[1], other);
  assert.equal(book.characterLore[2], disabled);
});

test('扫描会等待正在执行的写入及自己的刷新都结束', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠走来。')];
  h.state.entries = [entry(dream)];
  let release!: () => void;
  let entered!: () => void;
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  h.state.beforeWrite = async () => {
    entered();
    await blocked;
  };
  const background = h.refresh();
  await started;
  const book = lores([scanEntry(dream, 25)]);
  let scanDone = false;
  const scan = h.emit('WORLDINFO_ENTRIES_LOADED', book).then(() => {
    scanDone = true;
  });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(scanDone, false);
  assert.equal(book.characterLore[0].constant, false);
  release();
  await Promise.all([background, scan]);
  assert.equal(h.state.writes, 2);
  assert.equal(book.characterLore[0].constant, true);
});

test('用户新楼层暂缺 MVU 时读取上一层，避免首轮开灯被跳过', async () => {
  const h = harness();
  h.state.messages = [message('海风吹过。'), message('梦杳泠', 'user')];
  h.state.variablesByMessage = { 0: h.state.variables, 1: {} };
  h.state.entries = [entry(dream)];
  const book = lores([scanEntry(dream, 25)]);
  await h.emit('WORLDINFO_ENTRIES_LOADED', book);
  assert.equal(book.characterLore[0].constant, true);
});

test('重 roll 不从待替换的旧回复和旧 MVU 激活人物，续写保留当前正文', async () => {
  for (const type of ['swipe', 'regenerate', 'continue']) {
    const h = harness();
    h.state.messages = [message('羽岚走来。'), message('继续。', 'user'), message('梦杳泠出现。')];
    h.state.entries = [entry(dream, 'constant')];
    await h.emit('GENERATION_AFTER_COMMANDS', type, {}, false);
    const book = lores([scanEntry(dream, 25)]);
    await h.emit('WORLDINFO_ENTRIES_LOADED', book);
    assert.equal(book.characterLore[0].constant, type === 'continue', type);
  }
});

test('预览只修正本轮副本；后台 quiet、代写和关闭自动应用不修改世界书', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠')];
  h.state.entries = [entry(dream)];
  await h.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, true);
  const preview = lores([scanEntry(dream, 25)]);
  await h.emit('WORLDINFO_ENTRIES_LOADED', preview);
  assert.equal(preview.characterLore[0].constant, true);
  assert.equal(h.state.writes, 0);
  for (const type of ['quiet', 'impersonate']) {
    await h.emit('GENERATION_AFTER_COMMANDS', type, {}, false);
    const book = lores([scanEntry(dream, 25)]);
    await h.emit('WORLDINFO_ENTRIES_LOADED', book);
    assert.equal(book.characterLore[0].constant, false);
    assert.equal(h.state.writes, 0);
  }
  h.applySettingsToConfig({ ...h.settings, auto_apply: false });
  await h.emit('GENERATION_AFTER_COMMANDS', 'normal', {}, false);
  const manual = lores([scanEntry(dream, 25)]);
  await h.emit('WORLDINFO_ENTRIES_LOADED', manual);
  assert.equal(manual.characterLore[0].constant, false);
  assert.equal(h.state.writes, 0);
});

test('预算或条目限制导致未被扫描采用时，不能误报全部加载成功', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠')];
  h.state.entries = [entry(dream), entry(stranger)];
  const book = lores([scanEntry(dream, 25), scanEntry(stranger, 65)]);
  await h.emit('WORLDINFO_ENTRIES_LOADED', book);
  await h.emit('WORLD_INFO_ACTIVATED', [book.characterLore[0], scanEntry(stranger, 65, { world: 'other' })]);
  assert.match(h.state.runtime.generationMessage, /1\/2 项/);
  assert.match(h.state.runtime.generationMessage, /未纳入：\[角色\] 梦杳泠-陌生期/);
});

test('聊天切换时丢弃旧刷新与旧扫描，不把上一聊天人设带过去', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠')];
  h.state.entries = [entry(dream)];
  let release!: () => void;
  let entered!: () => void;
  const blocked = new Promise<void>(resolve => {
    release = resolve;
  });
  const started = new Promise<void>(resolve => {
    entered = resolve;
  });
  h.state.beforeWrite = async () => {
    entered();
    await blocked;
  };
  const book = lores([scanEntry(dream, 25)]);
  const scan = h.emit('WORLDINFO_ENTRIES_LOADED', book);
  await started;
  h.state.chatId = 'new-chat';
  await h.emit('CHAT_CHANGED');
  release();
  await scan;
  assert.equal(h.state.entries[0].strategy.type, 'selective');
  assert.equal(book.characterLore[0].constant, false);
  assert.equal(h.state.runtime.generationMessage, '');
});

test('没有激活事件或生成中止时，清理等待状态和旧人物清单', async () => {
  const h = harness();
  h.state.messages = [message('梦杳泠')];
  h.state.entries = [entry(dream)];
  await h.emit('WORLDINFO_ENTRIES_LOADED', lores([scanEntry(dream, 25)]));
  await h.emit('GENERATION_ENDED');
  assert.match(h.state.runtime.generationMessage, /0\/1 项/);
  await h.emit('WORLDINFO_ENTRIES_LOADED', lores([scanEntry(dream, 25)]));
  await h.emit('GENERATION_STOPPED');
  assert.equal(h.state.runtime.generationMessage, '本轮人设核对已取消');
  await h.emit('WORLD_INFO_ACTIVATED', [scanEntry(dream, 25)]);
  assert.equal(h.state.runtime.generationMessage, '本轮人设核对已取消');
});

void (async () => {
  for (const [name, run] of tests) {
    await run();
    console.log(`✓ ${name}`);
  }
  console.log(`${tests.length} dynamic worldbook tests passed`);
})().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
