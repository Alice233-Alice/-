/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const vue = require('vue');
const pinia = require('pinia');
const protocol = require('../src/灯火通明/pseudo-layer-protocol');
const content = require('../src/灯火通明/message-content');
const playerInput = require('../src/灯火通明/player-input');

const compile = (path: string) =>
  ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const compiledStore = compile('src/灯火通明/stores/pseudo-layer-store.ts');

function timers() {
  let now = 0;
  let id = 0;
  const tasks = new Map<number, { at: number; run: () => void; interval?: number }>();
  const set = (run: () => void, delay = 0, interval?: number) => {
    tasks.set(++id, { at: now + delay, run, interval });
    return id;
  };
  return {
    setTimeout: (fn: () => void, ms: number) => set(fn, ms),
    setInterval: (fn: () => void, ms: number) => set(fn, ms, ms),
    clearTimeout: (key: number) => tasks.delete(key),
    clearInterval: (key: number) => tasks.delete(key),
    async advance(ms: number) {
      const until = now + ms;
      for (;;) {
        const next = [...tasks].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        const [key, task] = next;
        tasks.delete(key);
        now = task.at;
        if (task.interval) tasks.set(key, { ...task, at: now + task.interval });
        task.run();
        await vue.nextTick();
      }
      now = until;
      await vue.nextTick();
    },
  };
}

function harness() {
  const clock = timers();
  const messages = new Map<number, any>([
    [0, { message_id: 0, role: 'assistant', message: '<content>旧正文</content>', extra: {} }],
  ]);
  const sent: any[] = [];
  let listener: (event: any) => void = () => {};
  const host: any = {
    ...vue,
    defineStore: pinia.defineStore,
    console,
    exports: {},
    getCurrentMessageId: () => 0,
    getLastMessageId: () => Math.max(...messages.keys()),
    getChatMessages: (range: number | string) =>
      typeof range === 'number'
        ? messages.has(range)
          ? [messages.get(range)]
          : []
        : [...messages.values()].filter(m => m.message_id <= Number(range.split('-').at(-1))),
    window: {
      ...clock,
      frameElement: { dataset: { dhlMessageId: '0' }, closest: () => null },
      parent: { postMessage: (message: any) => sent.push(message) },
      addEventListener: (_: string, fn: any) => {
        listener = fn;
      },
      removeEventListener: () => {},
      queueMicrotask,
      confirm: () => true,
    },
    require: (id: string) => {
      if (id === '../pseudo-layer-protocol') return protocol;
      if (id === '../message-content') return content;
      if (id === '../player-input') return playerInput;
      throw Error(`Unexpected dependency: ${id}`);
    },
  };
  vm.runInNewContext(compiledStore, host);
  const owner = pinia.createPinia();
  const store = host.exports.usePseudoLayerStore(owner);
  const receive = (response: any) =>
    listener({
      data: {
        channel: protocol.PSEUDO_LAYER_CHANNEL,
        version: protocol.PSEUDO_LAYER_VERSION,
        ...response,
      },
    });
  const view = {
    hostMessageId: 0,
    revision: 1,
    selectedMessageId: 0,
    latestMessageId: 0,
    index: 1,
    total: 1,
    isLatest: true,
    nativeInputCollapsed: true,
    stage: { kind: 'story' },
    activeInteraction: { mode: 'story' },
    latestStoryMessageId: 0,
    histories: {
      story: { selectedMessageId: 0, latestMessageId: 0, index: 1, total: 1, isLatest: true },
      dialogue: { selectedMessageId: -1, latestMessageId: -1, index: 0, total: 0, isLatest: true },
    },
  };
  store.start();
  receive({ type: 'ready', busy: false });
  receive({ type: 'view', view });
  const start = () => {
    store.selectDraft('问路', '请问前路如何？');
    store.submit('story');
    return sent.filter(m => m.type === 'generate').at(-1).requestId;
  };
  const entry = (messageId: number, text = '<content>完整的新正文。</content>') => ({
    representativeMessageId: messageId,
    messageIds: [messageId],
    index: messageId + 1,
    historyIndex: messageId + 1,
    stage: { kind: 'story' },
    turns: [
      {
        assistantMessageId: messageId,
        userMessageId: messageId - 1,
        userText: '请问前路如何？',
        assistantText: text,
        reasoning: '',
        reasoningDuration: null,
      },
    ],
  });
  const replyPage = (entries: any[]) =>
    receive({
      type: 'timeline_page',
      requestId: sent.filter(m => m.type === 'timeline_page').at(-1).requestId,
      revision: 2,
      entries,
      hasOlder: false,
      hasNewer: false,
    });
  if (sent.some(m => m.type === 'timeline_page')) replyPage([entry(0)]);
  sent.length = 0;
  return {
    store,
    receive,
    start,
    clock,
    sent,
    messages,
    view,
    entry,
    replyPage,
    close: () => {
      store.dispose();
      pinia.disposePinia(owner);
    },
  };
}

const cases: Array<{ name: string; run: () => void | Promise<void> }> = [];
const test = (name: string, run: () => void | Promise<void>) => cases.push({ name, run });

test('发送立即收起草稿；重复点击只发送一次，失败完整恢复标题和输入', () => {
  const h = harness();
  try {
    const requestId = h.start();
    assert.equal(h.store.generationInteractionMode, 'story');
    assert.equal(h.store.draftPrompt, '');
    assert.equal(h.store.selectedTitle, '');
    assert.equal(h.store.generationUserMessage, '请问前路如何？');
    h.store.submit('story');
    assert.equal(h.sent.filter(m => m.type === 'generate').length, 1);
    h.receive({ type: 'error', requestId, message: '连接中断' });
    assert.equal(h.store.draftPrompt, '请问前路如何？');
    assert.equal(h.store.selectedTitle, '问路');
    assert.equal(h.store.canSubmitStory, true);
    h.receive({ type: 'ready', busy: false });
    assert.equal(h.store.generationError, '连接中断', '心跳不能抹掉失败提示');
  } finally {
    h.close();
  }
});

test('停止后迟到的流片段和生成回执不能重新启动状态，停止请求只发一次', () => {
  const h = harness();
  try {
    const requestId = h.start();
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    h.store.stop();
    h.receive({ type: 'stream', requestId, text: '<content>半截正文' });
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    h.store.stop();
    assert.equal(h.store.generationState, 'stopping');
    assert.equal(h.store.streamText, '<content>半截正文');
    assert.equal(h.sent.filter(m => m.type === 'stop').length, 1);
    h.receive({ type: 'error', requestId, message: '已停止' });
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    assert.equal(h.store.generationState, 'idle', '过期请求不能复活');
  } finally {
    h.close();
  }
});

test('最终正文到达前保留流式文本；保存不可停止，旧状态和重复完成不能回退', () => {
  const h = harness();
  try {
    const requestId = h.start();
    h.receive({ type: 'stream', requestId, text: '<content>正文仍在接收' });
    h.receive({ type: 'state', requestId, state: 'saving', operation: 'generate' });
    h.receive({ type: 'stream', requestId, text: '<content>正文最后一句。</content>' });
    assert.equal(h.store.generationState, 'saving');
    h.receive({ type: 'complete', requestId, messageId: 2 });
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    h.receive({ type: 'error', requestId, message: '迟到的旧错误' });
    h.receive({ type: 'complete', requestId, messageId: 2 });
    assert.equal(h.store.canStop, false);
    assert.equal(h.store.streamText, '<content>正文最后一句。</content>');
    assert.equal(h.sent.filter(m => m.type === 'timeline_page').length, 1);
    h.replyPage([h.entry(2)]);
    assert.equal(h.store.generationState, 'idle');
    assert.equal(h.store.streamText, '');
    assert.equal(h.store.timelineEntries[0].turns[0].assistantText, '<content>完整的新正文。</content>');
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    assert.equal(h.store.isGenerating, false);
  } finally {
    h.close();
  }
});

test('旧请求的流片段不会污染重试，心跳携带本次请求以找回丢失的完成回执', async () => {
  const h = harness();
  try {
    const first = h.start();
    h.receive({ type: 'error', requestId: first, message: '失败' });
    const second = h.start();
    h.receive({ type: 'stream', requestId: first, text: '错误的旧回复' });
    assert.equal(h.store.streamText, '');
    await h.clock.advance(4000);
    assert.equal(h.sent.filter(m => m.type === 'hello').at(-1).requestId, second);
    h.receive({ type: 'complete', requestId: second, messageId: 2 });
    h.replyPage([h.entry(2)]);
    assert.equal(h.store.isGenerating, false);
  } finally {
    h.close();
  }
});

test('重推成功保留尚未发送的下一回草稿', () => {
  const h = harness();
  try {
    h.store.selectDraft('下回行动', '先喝一杯茶。');
    h.store.reroll(0);
    const requestId = h.sent.filter(m => m.type === 'reroll').at(-1).requestId;
    h.receive({ type: 'complete', requestId, messageId: 0 });
    h.replyPage([h.entry(0)]);
    assert.equal(h.store.draftPrompt, '先喝一杯茶。');
    assert.equal(h.store.selectedTitle, '下回行动');
  } finally {
    h.close();
  }
});

test('仅推演内容不能被标成正文落笔；推演结束、正文开始分别显示正确状态', () => {
  const h = harness();
  try {
    const requestId = h.start();
    h.receive({ type: 'stream', requestId, text: '<think>正在思考' });
    assert.equal(h.store.generationLabel, '推演中');
    h.receive({ type: 'stream', requestId, text: '<think>思考结束</think>' });
    assert.equal(h.store.generationLabel, '等待正文');
    h.receive({ type: 'stream', requestId, text: '<think>思考结束</think><content>她抬起头' });
    assert.equal(h.store.generationLabel, '正文落笔中');
  } finally {
    h.close();
  }
});

test('时间线回执丢失会解锁同步，并从楼层接回正文，不清空已有历史', async () => {
  const h = harness();
  try {
    h.store.timelineEntries = [h.entry(0)];
    const requestId = h.start();
    h.messages.set(1, { message_id: 1, role: 'user', message: '请问前路如何？', extra: {} });
    h.messages.set(2, { message_id: 2, role: 'assistant', message: '<content>最终正文和结尾。</content>', extra: {} });
    h.receive({ type: 'stream', requestId, text: '<content>最终正文' });
    h.receive({ type: 'complete', requestId, messageId: 2 });
    await h.clock.advance(5001);
    assert.equal(h.store.isGenerating, false);
    assert.equal(h.store.storyFloorMessage, '<content>最终正文和结尾。</content>');
    assert.equal(h.store.timelineEntries.length, 2);
    assert.ok(h.store.timelineEntries.some((e: any) => e.turns[0].assistantText.includes('和结尾')));
    assert.ok(h.sent.filter(m => m.type === 'timeline_page').length > 1);
  } finally {
    h.close();
  }
});

test('空闲后补发的无请求完成通知只刷新正文，不重新进入生成或清空草稿', () => {
  const h = harness();
  try {
    h.store.draftPrompt = '下一回尚未发送的输入';
    h.receive({ type: 'complete', messageId: 0 });
    assert.equal(h.store.generationState, 'idle');
    assert.equal(h.store.isGenerating, false);
    assert.equal(h.store.draftPrompt, '下一回尚未发送的输入');
    assert.ok(h.sent.some(m => m.type === 'timeline_page'));
    h.replyPage([h.entry(0, '<content>原正文。</content><UpdateVariable>补写变量</UpdateVariable>')]);
    assert.ok(h.store.timelineEntries[0].turns[0].assistantText.includes('补写变量'));
    assert.equal(h.store.isGenerating, false);
  } finally {
    h.close();
  }
});

test('交谈停止恢复交谈草稿，不污染正文草稿', () => {
  const h = harness();
  try {
    const dialogue = {
      mode: 'dialogue',
      sessionId: 'session',
      targetName: '沈倩宁',
      canonicalName: '沈倩宁',
      channel: 'present',
      anchorStoryMessageId: 0,
    };
    h.store.view = { ...h.store.view, activeInteraction: dialogue };
    h.store.drawerDialogue = dialogue;
    h.store.dialogueDrawerOpen = true;
    h.store.draftPrompt = '正文草稿';
    h.store.dialogueDraftPrompt = '你好';
    h.store.submit('dialogue');
    const requestId = h.sent.filter(m => m.type === 'generate').at(-1).requestId;
    assert.equal(h.store.dialogueDraftPrompt, '');
    h.store.stop();
    h.receive({ type: 'error', requestId, message: '已停止' });
    assert.equal(h.store.dialogueDraftPrompt, '你好');
    assert.equal(h.store.draftPrompt, '正文草稿');
  } finally {
    h.close();
  }
});

function streamFollowHarness() {
  const clock = timers();
  let cleanup = () => {};
  const host: any = {
    exports: {},
    window: clock,
    require: () => ({
      ...vue,
      onBeforeUnmount: (fn: any) => {
        cleanup = fn;
      },
    }),
  };
  vm.runInNewContext(compile('src/灯火通明/composables/use-stream-follow.ts'), host);
  const element = { scrollHeight: 1000, scrollTop: 580, clientHeight: 400 };
  const follow = host.exports.useStreamFollow(vue.ref(element));
  return { clock, element, follow, close: () => cleanup() };
}

test('靠近底部向上滚动仍暂停跟随，收到新内容不抢回位置', async () => {
  const { clock, element, follow, close } = streamFollowHarness();
  follow.handleScroll();
  await vue.nextTick();
  element.scrollTop = 580;
  follow.handleWheel({ deltaY: -20 });
  follow.handleScroll();
  await clock.advance(250);
  assert.equal(follow.isFollowing.value, false);
  follow.queueFollow();
  await vue.nextTick();
  assert.equal(element.scrollTop, 580);
  follow.handleWheel({ deltaY: 20 });
  await clock.advance(250);
  assert.equal(follow.isFollowing.value, true);
  element.scrollHeight = 1500;
  follow.handleScroll();
  await vue.nextTick();
  assert.equal(follow.isFollowing.value, true, '正文增长与输入栏收起不能被误判为手动上滚');
  close();
});

test('解析重绘产生的向下滚动不能解除暂停，下一次更新仍保留阅读位置', async () => {
  const { clock, element, follow, close } = streamFollowHarness();
  try {
    follow.handleScroll();
    await vue.nextTick();
    follow.handleWheel({ deltaY: -30 });
    element.scrollTop = 550;
    follow.handleScroll();
    await clock.advance(250);
    element.scrollTop = 580;
    follow.handleScroll();
    assert.equal(follow.isFollowing.value, false);
    element.scrollHeight = 1400;
    follow.queueFollow();
    await vue.nextTick();
    assert.equal(element.scrollTop, 580);
  } finally {
    close();
  }
});

test('已排队的跟随在玩家上滑或组件卸载后失效', async () => {
  const { element, follow, close } = streamFollowHarness();
  element.scrollTop = 200;
  follow.resumeFollowing(false);
  follow.handleTouchStart({ touches: [{ clientY: 100 }] });
  follow.handleTouchMove({ touches: [{ clientY: 180 }] });
  await vue.nextTick();
  assert.equal(element.scrollTop, 200);
  assert.equal(follow.isFollowing.value, false);
  follow.resumeFollowing(false);
  close();
  await vue.nextTick();
  assert.equal(element.scrollTop, 200);
});

test('暂停后主动按 End 或向下拖动滚动条仍能恢复跟随', async () => {
  const { clock, element, follow, close } = streamFollowHarness();
  try {
    follow.handleScroll();
    await vue.nextTick();
    follow.pauseFollowing();
    follow.handleKeydown({ key: 'End', target: null });
    element.scrollTop = 600;
    follow.handleScroll();
    await clock.advance(250);
    assert.equal(follow.isFollowing.value, true);
    follow.pauseFollowing();
    element.scrollTop = 200;
    follow.handleScroll();
    follow.handlePointerDown({ pointerType: 'mouse', button: 0, target: vue.reactive(element) });
    element.scrollTop = 600;
    follow.handleScroll();
    follow.handlePointerUp({ pointerType: 'mouse', button: 0 });
    await clock.advance(250);
    assert.equal(follow.isFollowing.value, true);
  } finally {
    close();
  }
});

// Load private production declarations with the TS parser, keeping their actual
// implementation while replacing only the Tavern host and event clock.
function controllerDeclarations(names: string[]) {
  const path = 'src/灯火通明-伪同层控制器/index.ts';
  const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const statements = source.statements.filter(
    (node: any) =>
      (ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((d: any) => names.includes(d.name.text))) ||
      (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)),
  );
  assert.equal(statements.length, names.length);
  return ts.transpileModule(statements.map((s: any) => s.getText(source)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
}

test('控制器保留思考、错误原文和半截正文供恢复，仅清理真正的空占位', () => {
  const host: any = { parseMessageContent: content.parseMessageContent };
  vm.runInNewContext(
    controllerDeclarations(['stripNativeSwipeMarker', 'isNativeSwipePlaceholder', 'isUsableNativeSwipeCandidate']) +
      '\nglobalThis.check = isUsableNativeSwipeCandidate;',
    host,
  );
  assert.equal(host.check('<think>只有推演，尚未生成正文'), true);
  assert.equal(host.check('<think>只有推演</think>'), true);
  assert.equal(host.check('Error: upstream connection closed'), true);
  assert.equal(host.check('...'), false);
  assert.equal(host.check('<content>她刚要开口'), true);
  assert.equal(host.check('<think>计划</think><content>她刚要开口'), true);
});

test('原生流仍在接收时忽略提前结束信号，流结束才收尾，过期计时器不干扰新回合', async () => {
  const clock = timers();
  const generation = { received: false, cancelled: false };
  const processor = { isFinished: false, isStopped: false };
  const finished: number[] = [];
  const failed: unknown[] = [];
  const host: any = {
    window: clock,
    activeGeneration: generation,
    tavernWindow: { SillyTavern: { getContext: () => ({ streamingProcessor: processor }) } },
    isNativeGenerationAssistant: (_: any, id: number) => id === 2,
    findNativeGenerationAssistant: () => ({ message_id: 2 }),
    finishMessage: (id: number) => {
      finished.push(id);
    },
    failNativeGeneration: (_: any, error: unknown) => {
      failed.push(error);
    },
  };
  vm.runInNewContext(
    controllerDeclarations(['settleNativeGeneration']) + '\nglobalThis.settle = settleNativeGeneration;',
    host,
  );
  host.settle(generation, 2, '生成失败', 800);
  await clock.advance(3000);
  assert.equal(finished.length, 0);
  assert.equal(failed.length, 0);
  processor.isFinished = true;
  await clock.advance(1000);
  assert.deepEqual(finished, [2]);
  host.settle(generation, 2, '生成失败', 800);
  host.activeGeneration = {};
  await clock.advance(1000);
  assert.deepEqual(finished, [2]);
});

test('报错留下无标记的原生回复时，主动补入时间线且允许重生成和删除', async () => {
  const h = harness();
  try {
    const requestId = h.start();
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    h.messages.set(1, { message_id: 1, role: 'user', message: '请问前路如何？', extra: {} });
    h.messages.set(2, { message_id: 2, role: 'assistant', message: '<think>中断的推演', extra: {} });
    h.receive({ type: 'error', requestId, message: '上游模型报错' });
    h.receive({
      type: 'view',
      view: {
        ...h.view,
        revision: 2,
        selectedMessageId: 2,
        latestMessageId: 2,
        latestStoryMessageId: 2,
        total: 2,
        index: 2,
        histories: {
          ...h.view.histories,
          story: { selectedMessageId: 2, latestMessageId: 2, total: 2, index: 2, isLatest: true },
        },
      },
    });
    await vue.nextTick();
    h.replyPage([h.entry(0), h.entry(2, '<think>中断的推演')]);
    assert.ok(h.store.timelineEntries.some((e: any) => e.representativeMessageId === 2));
    assert.equal(h.store.canRerollLatest, true);
    assert.equal(h.store.canDeleteLatest, true);
    h.store.reroll(2);
    assert.equal(h.sent.filter(m => m.type === 'reroll').at(-1).messageId, 2);
  } finally {
    h.close();
  }
});

test('空闲后发现没有完成回执的新楼层也补载，历史浏览不被强制切换', () => {
  const h = harness();
  try {
    h.receive({ type: 'view', view: { ...h.view, revision: 2, latestMessageId: 2, latestStoryMessageId: 2 } });
    assert.equal(h.sent.filter(m => m.type === 'timeline_page').at(-1).anchorMessageId, 2);
    h.replyPage([h.entry(2)]);
    assert.equal(h.store.timelineEntries.length, 2);
    h.store.timelineHasNewer = true;
    const count = h.sent.length;
    h.receive({ type: 'view', view: { ...h.view, revision: 3, latestMessageId: 4, latestStoryMessageId: 4 } });
    assert.equal(h.sent.length, count);
  } finally {
    h.close();
  }
});

test('控制器已空闲但错误回执缺失时，恢复操作并同步实际原生楼层', async () => {
  const h = harness();
  try {
    const requestId = h.start();
    h.receive({ type: 'state', requestId, state: 'generating', operation: 'generate' });
    h.receive({ type: 'ready', busy: false });
    await vue.nextTick();
    assert.equal(h.store.isGenerating, false);
    assert.equal(h.store.draftPrompt, '请问前路如何？');
    assert.ok(h.sent.some(m => m.type === 'timeline_page'));
  } finally {
    h.close();
  }
});

test('提供方不派发结束事件时，健康检查仅在原生生成确已停止后接回残留回合', () => {
  let now = 1000;
  let calls = 0;
  let busy = true;
  const generation: any = { engine: 'native', operation: 'generate', sent: true };
  const processor = { isFinished: false, isStopped: false };
  const host: any = {
    activeGeneration: generation,
    Date: { now: () => now },
    tavernWindow: {
      SillyTavern: { getContext: () => ({ streamingProcessor: processor }) },
      getComputedStyle: () => ({ display: busy ? 'flex' : 'none' }),
    },
    tavernDocument: { querySelector: () => ({}) },
    settleNativeGeneration: () => {
      calls++;
    },
  };
  vm.runInNewContext(
    controllerDeclarations(['reconcileNativeGeneration']) + '\nglobalThis.check = reconcileNativeGeneration;',
    host,
  );
  host.check();
  now += 120000;
  host.check();
  assert.equal(calls, 0, '耗时很长的正常流不能被强制收尾');
  busy = false;
  processor.isStopped = true;
  host.check();
  now += 4001;
  host.check();
  assert.equal(calls, 1);
});

test('失败原文没有伪同层标记时，控制器仍能删除对应输入和回复，保留之前回合', async () => {
  const messages = [
    { message_id: 0, role: 'assistant', message: '之前正常的回复' },
    { message_id: 1, role: 'user', message: '本轮输入' },
    { message_id: 2, role: 'assistant', message: '<think>中断的回复' },
  ];
  const entries = [0, 2].map(id => ({ representativeMessageId: id, messageIds: [id], stage: { kind: 'story' } }));
  const deleted: number[][] = [];
  const responses: any[] = [];
  const host: any = {
    activeGeneration: null,
    deletingMessageId: null,
    updatingMessageId: null,
    selectedMessageId: 2,
    selectedHistoryKind: 'story',
    browsingHistory: false,
    viewRevision: 1,
    getStageEntries: () => entries,
    getHistoryEntries: (value: any[]) => value,
    getAllMessages: () => messages,
    resolveAssistantInteractionMetadata: () => null,
    findPreviousUserMessage: () => messages[1],
    deleteChatMessages: async (ids: number[]) => {
      deleted.push(Array.from(ids));
    },
    invalidateStageSnapshot: () => {},
    latestStoryStageId: () => 0,
    rememberStageSelection: () => {},
    send: (_: any, response: any) => responses.push(response),
    scheduleViewRefresh: () => {},
  };
  vm.runInNewContext(controllerDeclarations(['deleteLatestTurn']) + '\nglobalThis.remove = deleteLatestTurn;', host);
  await host.remove({ type: 'delete_message', requestId: 'delete-failed', messageId: 2 }, {});
  assert.deepEqual(deleted, [[1, 2]]);
  assert.equal(responses.at(-1).type, 'deleted');
  assert.equal(host.deletingMessageId, null);
});

test('失败回复没有前端标记也能发起原生重生成，无需关闭伪同层', async () => {
  const messages = [
    { message_id: 0, role: 'assistant', message: '正常开场' },
    { message_id: 1, role: 'user', message: '本轮输入' },
    { message_id: 2, role: 'assistant', message: 'Error: upstream closed', extra: {} },
  ];
  const rerolled: number[] = [];
  const host: any = {
    console,
    activeGeneration: null,
    deletingMessageId: null,
    updatingMessageId: null,
    selectedHistoryKind: null,
    browsingHistory: false,
    STORY_INTERACTION: { mode: 'story' },
    getAllMessages: () => messages,
    resolveAssistantInteractionMetadata: () => null,
    getStageEntries: () =>
      [0, 2].map(id => ({ representativeMessageId: id, messageIds: [id], stage: { kind: 'story' } })),
    latestStageId: () => 2,
    latestStoryStageId: () => 2,
    findPreviousUserMessage: () => messages[1],
    getNativeSwipeMessage: () => ({ mes: messages[2].message }),
    repairNativeSwipeState: () => {},
    setActiveInteraction: () => {},
    makeView: () => ({}),
    getCurrentChatId: () => 'test-chat',
    captureNativeRerollOriginal: (m: any) => m,
    _: require('lodash'),
    persistPendingNativeReroll: () => {},
    parkSourceFrame: () => {},
    sendGenerationState: () => {},
    applyStageVisibility: () => {},
    triggerNativeReroll: async (id: number) => {
      rerolled.push(id);
    },
    window: timers(),
    send: (_: any, response: any) => {
      throw Error(response.message);
    },
  };
  host.readTimelineUserText = (m: any) => playerInput.readPlayerInput(m);
  vm.runInNewContext(controllerDeclarations(['beginReroll']) + '\nglobalThis.reroll = beginReroll;', host);
  await host.reroll({ type: 'reroll', requestId: 'retry-failed', messageId: 2 }, {});
  assert.deepEqual(rerolled, [2]);
  assert.equal(host.activeGeneration.rawUserText, '本轮输入');
  assert.equal(host.activeGeneration.rerollOriginal.message, 'Error: upstream closed');
});

test('现场残留的 JSON 推演片段属于最新回复，不把对应输入再次判为未获回复', () => {
  const messages = [
    { message_id: 0, role: 'assistant', message: '正常开场' },
    { message_id: 1, role: 'user', message: '按照advice继续吧。' },
    {
      message_id: 2,
      role: 'assistant',
      message:
        '{\n  "Master，小此已经切换到日本語进行思考啦！我会严格按照konatan_planning~里的规定逐条思考的～": "思考開始"\n}\n\n<pseudo_layer>\n灯火阑珊\n</pseudo_layer>',
    },
  ];
  const host: any = {
    activeGeneration: null,
    stageSnapshotCache: null,
    stageSnapshotLastMessageId: NaN,
    getLastMessageId: () => 2,
    getAllMessages: () => messages,
    readInteractionMetadata: () => null,
    console,
  };
  vm.runInNewContext(
    controllerDeclarations([
      'stripNativeSwipeMarker',
      'isNativeSwipePlaceholder',
      'isUsableNativeSwipeCandidate',
      'getPendingInput',
      'buildStageEntries',
      'getStageSnapshot',
    ]) + '\nglobalThis.snapshot = getStageSnapshot; globalThis.pending = getPendingInput;',
    host,
  );
  assert.equal(host.snapshot().entries.at(-1).representativeMessageId, 2);
  assert.equal(host.pending(), undefined);
  messages.push({ message_id: 3, role: 'user', message: '真正未获回复的新输入' });
  host.readTimelineUserText = (m: any) => m.message;
  assert.equal(host.pending().latestMessageId, 3);
});

test('重答视图锁不会继承开始前的未获回复提示', () => {
  const host: any = {
    getStageEntries: () => [],
    getPendingInput: () => undefined,
    getRerollLock: () => ({ hostMessageId: 0, pendingInput: { messageIds: [1], text: '旧提示' } }),
    getHostStageId: () => 2,
    nativeInputCollapsed: true,
    activeInteraction: { mode: 'story' },
    STORY_INTERACTION: { mode: 'story' },
  };
  vm.runInNewContext(controllerDeclarations(['makeView']) + '\nglobalThis.view = makeView;', host);
  assert.equal(host.view().pendingInput, undefined);
  assert.equal(host.view().hostMessageId, 2);
});

test('替换前端仅收到繁忙心跳时也显示进行中，空闲心跳可解除接管的生成锁', async () => {
  const h = harness();
  try {
    h.receive({ type: 'ready', busy: true, requestId: 'adopted-reroll', operation: 'reroll' });
    assert.equal(h.store.isGenerating, true);
    assert.equal(h.store.canStop, true);
    h.receive({ type: 'ready', busy: false });
    await vue.nextTick();
    assert.equal(h.store.isGenerating, false);
    assert.equal(h.store.activeRequestId, '');
  } finally {
    h.close();
  }
});

test('可见宿主换到另一楼层时接管生成回执，重放当前状态', () => {
  const source = { postMessage: () => {} };
  const originalSource = { postMessage: () => {} };
  const replayed: any[] = [];
  const host: any = {
    isPseudoLayerRequest: () => true,
    asReplyTarget: (s: any) => s,
    rememberSourceProtocolVersion: () => {},
    getSourceMessageId: (s: any) => (s === source ? 2 : 0),
    registrations: new Map(),
    generationReceipts: new Map(),
    selectedHistoryKind: null,
    browsingHistory: false,
    activeGeneration: { source: originalSource, baseMessageId: 2, requestId: 'moving-frame' },
    getHostStageId: () => 2,
    deletingMessageId: null,
    updatingMessageId: null,
    send: () => {},
    replayGeneration: (_: any, s: any) => replayed.push(s),
    window: timers(),
    broadcastView: () => {},
    scheduleViewRefresh: () => {},
    FRAME_CANDIDATE_BATCH_MS: 32,
  };
  vm.runInNewContext(controllerDeclarations(['handleMessage']) + '\nglobalThis.receive = handleMessage;', host);
  host.receive({ data: { type: 'hello', messageId: 2 }, source });
  assert.equal(host.activeGeneration.source, source);
  assert.deepEqual(replayed, [source]);
});

test('预设固定句只在有合法原文记录时还原，原生新编辑不被旧记录覆盖', () => {
  const message = {
    role: 'user',
    message: '固定续写句',
    extra: {
      izumi_advice: {
        version: 1,
        text: '添柴后靠着供桌休息',
        assistantId: 0,
        revision: 1,
        replacementText: '固定续写句',
      },
    },
  };
  assert.equal(playerInput.readPlayerInput(message), '添柴后靠着供桌休息');
  assert.equal(playerInput.readPlayerInput({ ...message, message: '改成先喝一口热茶' }), '改成先喝一口热茶');
  assert.equal(playerInput.readPlayerInput({ ...message, extra: {} }), '固定续写句');
  assert.equal(
    playerInput.readPlayerInput({ ...message, extra: { izumi_advice: { ...message.extra.izumi_advice, version: 2 } } }),
    '固定续写句',
  );
  const legacy = {
    ...message,
    message: '按照advice继续吧。',
    extra: { izumi_advice: { version: 1, text: '旧版原文', assistantId: 0 } },
  };
  assert.equal(playerInput.readPlayerInput(legacy), '旧版原文');
});

test('前端直接读取楼层时，行动栏和改写草稿取得预设保存的原文', () => {
  const h = harness();
  try {
    h.messages.set(1, {
      message_id: 1,
      role: 'user',
      message: '固定句',
      extra: { izumi_advice: { version: 1, text: '添柴后饮茶', assistantId: 0, replacementText: '固定句' } },
    });
    h.messages.set(2, { message_id: 2, role: 'assistant', message: '回应', extra: {} });
    h.receive({
      type: 'view',
      view: { ...h.view, selectedMessageId: 2, latestMessageId: 2, latestStoryMessageId: 2, revision: 3 },
    });
    assert.equal(h.store.storyFloorUserMessage, '添柴后饮茶');
    assert.equal(h.store.floorUserMessage, '添柴后饮茶');
  } finally {
    h.close();
  }
});

test('改写通过原生编辑事件交还预设：原文、advice 与固定句保持同步，普通输入不触发兼容分支', async () => {
  for (const compatibility of [true, false]) {
    const user: any = {
      message_id: 1,
      role: 'user',
      message: compatibility ? '固定句' : '原行动',
      extra: {
        keep: '保留',
        ...(compatibility
          ? { izumi_advice: { version: 1, text: '原行动', assistantId: 0, revision: 1, replacementText: '固定句' } }
          : {}),
      },
    };
    const assistant: any = { message_id: 2, role: 'assistant', message: '回复', extra: {} };
    let advice = '原行动';
    const events: any[] = [];
    const responses: any[] = [];
    const host: any = {
      activeGeneration: null,
      deletingMessageId: null,
      updatingMessageId: null,
      viewRevision: 0,
      getStageSnapshot: () => ({
        entries: [{ messageIds: [2] }],
        messages: [user, assistant],
        messagesById: new Map([
          [1, user],
          [2, assistant],
        ]),
        previousMessages: new Map([[2, user]]),
      }),
      resolveAssistantInteractionMetadata: () => null,
      getCurrentChatId: () => 'chat',
      readAdviceInput: playerInput.readAdviceInput,
      setChatMessages: async (updates: any[]) => {
        for (const update of updates) Object.assign(update.message_id === 1 ? user : assistant, update);
      },
      eventEmit: async (type: string, id: number) => {
        events.push([type, id]);
        // The preset owns transfer/edit synchronization; the controller must not replace that logic.
        advice = user.message;
        user.extra.izumi_advice = { ...user.extra.izumi_advice, text: advice, revision: 2 };
        user.message = '固定句';
      },
      tavern_events: { MESSAGE_EDITED: 'message_edited' },
      invalidateStageSnapshot: () => {},
      broadcastView: () => {},
      scheduleViewRefresh: () => {},
      send: (_: any, response: any) => responses.push(response),
    };
    vm.runInNewContext(
      controllerDeclarations(['updateUserMessageContent']) + '\nglobalThis.update=updateUserMessageContent;',
      host,
    );
    await host.update({ requestId: 'edit', messageId: 2, userMessageId: 1, content: '添柴后先饮茶' }, {});
    assert.equal(responses.at(-1).type, 'message_updated');
    assert.equal(playerInput.readPlayerInput(user), '添柴后先饮茶');
    assert.equal(user.extra.keep, '保留');
    assert.deepEqual(events, compatibility ? [['message_edited', 1]] : []);
    if (compatibility) {
      assert.equal(advice, '添柴后先饮茶');
      assert.equal(user.message, '固定句');
    }
  }
});

test('握手完成后每轮心跳只发送一个版本', async () => {
  const h = harness();
  try {
    await h.clock.advance(4000);
    const heartbeats = h.sent.filter(message => message.type === 'hello');
    assert.equal(heartbeats.length, 1);
    assert.equal(heartbeats[0].version, protocol.PSEUDO_LAYER_VERSION);
  } finally {
    h.close();
  }
});

test('隐藏的历史 iframe 接收视图时不请求和解析时间线', () => {
  const h = harness();
  try {
    h.receive({ type: 'view', view: { ...h.view, hostMessageId: 8, revision: 20, latestMessageId: 8 } });
    assert.equal(h.sent.filter(message => message.type === 'timeline_page').length, 0);
    assert.equal(h.store.view.hostMessageId, 8);
  } finally {
    h.close();
  }
});

test('一千回历史只解析请求页的正文；缓存复用且附属交谈保留', () => {
  const messages: any[] = [];
  const entries: any[] = [];
  for (let i = 0; i < 1000; i += 1) {
    messages.push({ message_id: i * 2, role: 'user', message: `输入${i}` });
    messages.push({ message_id: i * 2 + 1, role: 'assistant', message: `<content>正文${i}</content>` });
    entries.push({ representativeMessageId: i * 2 + 1, messageIds: [i * 2 + 1], stage: { kind: 'story' } });
  }
  const metadata = { kind: 'dialogue', sessionId: 's', targetName: '甲', canonicalName: '甲', channel: 'present' };
  messages.push({ message_id: 2000, role: 'user', message: '你好', metadata });
  messages.push({ message_id: 2001, role: 'assistant', message: '<正文>对话</正文>', metadata });
  entries.push({
    representativeMessageId: 2001,
    messageIds: [2001],
    stage: {
      ...metadata,
      turnCount: 1,
      anchorStoryMessageId: 1999,
    },
  });
  const snapshot: any = {
    entries,
    messages,
    messagesById: new Map(messages.map(m => [m.message_id, m])),
    previousMessages: new Map(messages.slice(1).map((m, i) => [m.message_id, messages[i]])),
  };
  let parsed = 0;
  const sent: any[] = [];
  const host: any = {
    _: require('lodash'),
    getStageSnapshot: () => snapshot,
    viewRevision: 1,
    readInteractionMetadata: (m: any) => m?.metadata ?? null,
    extractDialogueContent: content.extractDialogueContent,
    readTimelineReasoning: () => {
      parsed += 1;
      return { reasoning: '', reasoningDuration: null };
    },
    readMessageResponseDuration: () => undefined,
    readMessageTokenCount: () => undefined,
    readTimelineUserText: (m: any) => m?.message ?? '',
    GENERATION_NOTICE_KEY: 'notice',
    send: (_: any, response: any) => sent.push(response),
  };
  vm.runInNewContext(
    controllerDeclarations([
      'hydrateStageTurns',
      'hydrateTimelineEntries',
      'hydrateTimelinePageEntry',
      'findTimelineEntryIndex',
      'sendTimelinePage',
      'buildDialogueCarryoverPrompt',
    ]) + '\nglobalThis.page = sendTimelinePage;',
    host,
  );
  host.page({}, { requestId: 'tail', limit: 8, direction: 'around', anchorMessageId: 1999 });
  assert.equal(parsed, 9);
  assert.equal(sent[0].entries.length, 8);
  assert.equal(sent[0].entries.at(-1).turns[0].assistantText, '<content>正文999</content>');
  assert.equal(sent[0].entries.at(-1).dialogueThreads[0].turns[0].assistantMessageId, 2001);
  host.page({}, { requestId: 'again', limit: 8, direction: 'around', anchorMessageId: 1999 });
  assert.equal(parsed, 9);
  host.page({}, { requestId: 'older', limit: 8, direction: 'older', anchorMessageId: 1985 });
  assert.equal(parsed, 17);
  vm.runInNewContext('globalThis.carryover = buildDialogueCarryoverPrompt(1999);', host);
  assert.ok(host.carryover.includes('你好'));
  assert.ok(host.carryover.includes('对话'));
});

test('删除宿主楼层或虚拟化移除 DOM 后仍复用已挂载的舞台', () => {
  const source = {};
  const frame = {};
  const keeper = { dataset: { messageId: '12' }, classList: { contains: () => true }, querySelector: () => frame };
  const host: any = {
    FRAME_KEEPER_CLASS: 'keeper',
    ACTIVE_KEEPER_CLASS: 'active',
    getStageRoot: () => ({ querySelectorAll: () => [keeper] }),
    getMessageElement: () => null,
    hasMountedPseudoApp: (f: any) => f === frame,
    getLiveRegistration: () => source,
    activeGeneration: null,
    getRegisteredAssistantIds: () => [],
  };
  vm.runInNewContext(
    controllerDeclarations(['getParkedMessageId', 'getHostStageId']) + '\nglobalThis.hostId = getHostStageId;',
    host,
  );
  assert.equal(host.hostId(), 12);
});

test('只识别灯火舞台，预设的思考卡片和其他 app 不占用舞台', () => {
  const element = {};
  const frame = (isStage: boolean) => ({
    contentDocument: {
      querySelector: (selector: string) =>
        selector === '#app' ? { childElementCount: 1 } : isStage && selector === '#app > .cultivation-status' ? element : null,
    },
  });
  const host: any = {};
  vm.runInNewContext(controllerDeclarations(['hasMountedPseudoApp']) + '\nglobalThis.isStage = hasMountedPseudoApp;', host);
  assert.equal(host.isStage(frame(false)), false);
  assert.equal(host.isStage(frame(true)), true);
  assert.equal(host.isStage(null), false);

  let keeperAccesses = 0;
  const cat = { dataset: {}, getAttribute: (name: string) => (name === 'src' ? 'blob:preset-thought' : null) };
  const parkHost: any = {
    hasMountedPseudoApp: () => false,
    getMessageElement: () => ({ getAttribute: () => 'false' }),
    getFrameKeeper: () => { keeperAccesses += 1; return null; },
  };
  vm.runInNewContext(controllerDeclarations(['parkFrame']) + '\nglobalThis.park = parkFrame;', parkHost);
  assert.equal(parkHost.park(12, cat), false);
  assert.equal(keeperAccesses, 0);
});

test('思考卡片排在前面时仍选中真正舞台，延迟挂载后可以再次选取', () => {
  const cat = {};
  const stage = {};
  const choices = {};
  const selected: any[] = [];
  let mounted = false;
  const host: any = {
    latestStoryStageId: () => 12,
    getMessageElement: () => ({ querySelector: () => cat, querySelectorAll: () => [cat, stage, choices] }),
    hasMountedPseudoApp: (frame: any) => mounted && frame === stage,
    parkCandidateFrame: (frame: any) => selected.push(frame),
  };
  vm.runInNewContext(controllerDeclarations(['parkLatestStageFrame']) + '\nglobalThis.park = parkLatestStageFrame;', host);
  host.park();
  assert.equal(selected.length, 0);
  mounted = true;
  host.park();
  assert.deepEqual(selected, [stage]);
});

test('慢速启动期间重复候选通知不会反复销毁 iframe', () => {
  let removed = 0;
  const kept = {
    contentWindow: {},
    remove: () => {
      removed += 1;
    },
  };
  const host: any = {
    STAGE_ROOT_ID: 'stage',
    FRAME_LOAD_GRACE_MS: 30000,
    getMessageElement: () => ({ getAttribute: () => 'false' }),
    getFrameKeeper: () => ({ querySelector: () => kept }),
    asReplyTarget: (source: any) => source,
    hasMountedPseudoApp: (frame: any) => frame !== kept,
    registrations: new Map(),
    frameLoadStartedAt: new WeakMap([[kept, Date.now()]]),
  };
  vm.runInNewContext(controllerDeclarations(['parkFrame']) + '\nglobalThis.park = parkFrame;', host);
  for (let i = 0; i < 20; i += 1) {
    assert.equal(
      host.park(12, { dataset: {}, getAttribute: (name: string) => (name === 'src' ? 'blob:pending' : null) }),
      false,
    );
  }
  assert.equal(removed, 0);
  assert.equal(host.park(12, { dataset: {}, getAttribute: () => null }), false);
});

test('舞台接管后卸载原生楼层应用，关闭控制器时恢复，重复通知不重复挂载', () => {
  let active = false;
  let mounted = 0;
  let released = 0;
  let observe: () => void = () => {};
  let pagehide: () => void = () => {};
  const host: any = {
    exports: {},
    console: { info: () => {} },
    $: (fn: () => void) => fn(),
    window: {
      frameElement: { dataset: {} },
      parent: { document: { body: { classList: { contains: () => active } } } },
      addEventListener: (_: string, fn: () => void) => {
        pagehide = fn;
      },
    },
    MutationObserver: class {
      constructor(fn: () => void) {
        observe = fn;
      }
      observe() {}
      disconnect() {}
    },
    require: (id: string) => {
      if (id === 'pinia')
        return {
          createPinia: () => ({}),
          disposePinia: () => {
            released += 1;
          },
        };
      if (id === 'vue')
        return {
          createApp: () => ({
            use: () => {},
            mount: () => {
              mounted += 1;
            },
            unmount: () => {
              mounted -= 1;
            },
          }),
        };
      if (id === './app.vue') return {};
      if (id === './components/UpdateVariableDisplayGuard')
        return { bootstrapUpdateVariableDisplayGuard: () => () => {} };
      throw Error(`Unexpected dependency: ${id}`);
    },
  };
  vm.runInNewContext(compile('src/灯火通明/index.ts'), host);
  assert.equal(mounted, 1);
  active = true;
  for (let i = 0; i < 10; i += 1) observe();
  assert.equal(mounted, 0);
  assert.equal(released, 1);
  active = false;
  observe();
  observe();
  assert.equal(mounted, 1);
  pagehide();
  observe();
  assert.equal(mounted, 0);
  assert.equal(released, 2);

  active = true;
  host.window.frameElement.dataset.dhlControllerOwned = 'true';
  vm.runInNewContext(compile('src/灯火通明/index.ts'), { ...host });
  observe();
  assert.equal(mounted, 1);
  pagehide();
});

async function main() {
  for (const { name, run } of cases) {
    await run();
    console.log(`PASS ${name}`);
  }
  console.log(`${cases.length} generation lifecycle regressions passed.`);
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
