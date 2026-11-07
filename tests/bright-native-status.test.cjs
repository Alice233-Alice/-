/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const vue = require('vue');
const pinia = require('pinia');
require('ts-node').register({ project: 'tsconfig.schema-test.json', transpileOnly: true, files: true });
const protocol = require('../src/灯火通明-测试版/pseudo-layer-protocol');
const content = require('../src/灯火通明-测试版/message-content');
const playerInput = require('../src/灯火通明-测试版/player-input');
const compile = source =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
const compiledStore = compile(fs.readFileSync('src/灯火通明-测试版/stores/pseudo-layer-store.ts', 'utf8'));

function harness(floor = 2, stage = false) {
  const sent = [],
    notices = [],
    inputEvents = [],
    listeners = new Map(),
    timers = new Map();
  let receive,
    timerId = 0,
    clicks = 0,
    focused = false,
    busy = false;
  const records = new Map(
    [0, 1, 2].map(id => [
      id,
      {
        message_id: id,
        role: id % 2 ? 'user' : 'assistant',
        message: '<content>山中访友</content>',
        extra: {},
      },
    ]),
  );
  const input = {
    value: '',
    disabled: false,
    dispatchEvent: event => {
      inputEvents.push(event.type);
    },
    focus: () => {
      focused = true;
    },
  };
  const frame = {
    dataset: {},
    closest: selector =>
      selector === '.mes'
        ? { getAttribute: () => String(floor) }
        : selector === '#dhl-pseudo-stage-root' && stage
          ? {}
          : null,
  };
  const host = {
    ...vue,
    defineStore: pinia.defineStore,
    console,
    exports: {},
    Event,
    _: require('lodash'),
    MutationObserver: class {
      observe() {}
      disconnect() {}
    },
    getCurrentMessageId: () => floor,
    getLastMessageId: () => Math.max(...records.keys()),
    getChatMessages: id =>
      typeof id === 'number' ? (records.has(id) ? [records.get(id)] : []) : [...records.values()],
    tavern_events: {
      MESSAGE_SENT: 'sent',
      MESSAGE_RECEIVED: 'received',
      MESSAGE_DELETED: 'deleted',
      MESSAGE_SWIPED: 'swiped',
      MORE_MESSAGES_LOADED: 'more',
    },
    eventOn: (event, fn) => {
      const entries = listeners.get(event) ?? new Set();
      listeners.set(event, entries);
      entries.add(fn);
      return { stop: () => entries.delete(fn) };
    },
    toastr: Object.fromEntries(
      ['info', 'success', 'warning'].map(level => [level, message => notices.push({ level, message })]),
    ),
    window: {
      frameElement: frame,
      parent: {
        postMessage: message => sent.push(message),
        document: {
          body: {},
          querySelector: selector =>
            selector === '#send_textarea'
              ? input
              : selector === '#send_but'
                ? {
                    disabled: false,
                    click: () => {
                      clicks++;
                    },
                  }
                : selector === '#mes_stop'
                  ? { getClientRects: () => (busy ? [{}] : []) }
                  : null,
        },
      },
      addEventListener: (_, fn) => {
        receive = fn;
      },
      removeEventListener() {},
      queueMicrotask,
      setTimeout: (fn, ms) => {
        timers.set(++timerId, { fn, ms });
        return timerId;
      },
      setInterval: (fn, ms) => {
        timers.set(++timerId, { fn, ms });
        return timerId;
      },
      clearTimeout: id => timers.delete(id),
      clearInterval: id => timers.delete(id),
    },
    require: id =>
      ({ '../pseudo-layer-protocol': protocol, '../message-content': content, '../player-input': playerInput })[id],
  };
  vm.runInNewContext(compiledStore, host);
  const owner = pinia.createPinia();
  const store = host.exports.usePseudoLayerStore(owner);
  store.start();
  return {
    store,
    sent,
    input,
    inputEvents,
    notices,
    records,
    timers,
    get clicks() {
      return clicks;
    },
    get focused() {
      return focused;
    },
    set busy(value) {
      busy = value;
    },
    receive: response =>
      receive({
        data: { channel: protocol.PSEUDO_LAYER_CHANNEL, version: protocol.PSEUDO_LAYER_VERSION, ...response },
      }),
    emit: event => listeners.get(event)?.forEach(fn => fn()),
    close() {
      store.dispose();
      pinia.disposePinia(owner);
    },
  };
}

const stageView = {
  hostMessageId: 2,
  revision: 1,
  selectedMessageId: 2,
  latestMessageId: 2,
  index: 2,
  total: 2,
  isLatest: true,
  nativeInputCollapsed: false,
  detached: false,
  stage: { kind: 'story' },
  activeInteraction: { mode: 'story' },
  histories: {
    story: { selectedMessageId: 2, latestMessageId: 2, index: 2, total: 2, isLatest: true },
    dialogue: { selectedMessageId: -1, latestMessageId: -1, index: 0, total: 0, isLatest: true },
  },
};

test('控制器关闭后，原生楼层可独立填入起念并触发宿主输入事件', () => {
  const h = harness();
  try {
    assert.equal(h.store.controllerReady, false);
    assert.equal(h.store.isDetachedMode, true);
    assert.equal(h.store.isNativeLatest, true);
    assert.equal(h.store.performAction('修持', '静坐运转周天。'), true);
    assert.equal(h.input.value, '静坐运转周天。');
    assert.deepEqual(h.inputEvents, ['input', 'change']);
    assert.equal(h.focused, true);
    assert.equal(h.clicks, 0);
    assert.ok(h.notices.some(n => n.level === 'success'));
    h.store.setDetached(false);
    assert.ok(h.notices.at(-1).message.includes('启用'));
    assert.ok(!h.sent.some(m => m.type === 'set_detached'));
  } finally {
    h.close();
  }
});

test('仅最新原生楼层允许直发，历史楼层保留输入内容并提示返回最新楼层', () => {
  const old = harness(0),
    latest = harness();
  try {
    old.input.value = '尚未送出的输入';
    assert.equal(old.store.performAction('继续', '继续当前剧情。', true), false);
    assert.equal(old.input.value, '尚未送出的输入');
    assert.equal(old.clicks, 0);
    assert.ok(old.notices.at(-1).message.includes('最新楼层'));
    assert.equal(old.store.performAction('探查', '打探世闻。'), true);
    assert.equal(old.input.value, '打探世闻。');
    assert.equal(latest.store.performAction('继续', '继续当前剧情。', true), true);
    assert.equal(latest.clicks, 1);
    latest.busy = true;
    assert.equal(latest.store.performAction('继续', '新的起念', true), false);
    assert.equal(latest.clicks, 1);
    assert.equal(latest.input.value, '继续当前剧情。');
  } finally {
    old.close();
    latest.close();
  }
});

test('原生模式交谈回退为起念，楼层新增后旧状态栏不再允许直发', () => {
  const h = harness();
  try {
    h.records.set(3, { message_id: 3, role: 'assistant', is_hidden: true, message: '幕间交谈', extra: {} });
    h.emit('received');
    assert.equal(h.store.isNativeLatest, true, '隐藏的幕间楼层不抢走原生状态栏的最新身份');
    h.store.beginDialogue({ targetName: '虞汐', canonicalName: '虞汐颜', channel: 'present' });
    assert.ok(h.input.value.includes('与虞汐交谈'));
    assert.equal(h.store.dialogueDrawerOpen, false);
    h.records.set(4, { message_id: 4, role: 'assistant', message: '新的正文', extra: {} });
    h.emit('received');
    assert.equal(h.store.isNativeLatest, false);
    assert.equal(h.store.performAction('继续', '继续。', true), false);
  } finally {
    h.close();
  }
});

test('已连接控制器的原生楼层仍绑定自身形态，待命状态不会请求时间线', () => {
  const h = harness(0);
  try {
    h.receive({ type: 'ready', busy: false, detached: true });
    h.receive({ type: 'view', view: { ...stageView, detached: true } });
    assert.equal(h.store.isDetachedMode, true);
    assert.ok(!h.sent.some(m => m.type === 'timeline_page'));
    h.store.setDetached(false);
    assert.equal(h.sent.at(-1).type, 'set_detached');
    assert.equal(h.sent.at(-1).detached, false);
    h.receive({ type: 'view', view: stageView });
    assert.equal(h.store.isDetachedMode, true, '未进入自有舞台的原生 iframe 始终保持状态栏');
  } finally {
    h.close();
  }
});

test('舞台模式沿用草稿与推演协议，脱离请求须由控制器确认', () => {
  const h = harness(2, true);
  try {
    h.receive({ type: 'ready', busy: false, detached: false });
    h.receive({ type: 'view', view: stageView });
    assert.equal(h.store.isDetachedMode, false);
    h.store.setDetached(true);
    assert.equal(h.sent.at(-1).type, 'set_detached');
    assert.equal(h.store.isDetachedMode, false);
    h.store.performAction('问路', '请问前路如何？', true);
    assert.equal(h.sent.at(-1).type, 'generate');
    assert.equal(h.sent.at(-1).prompt, '请问前路如何？');
    assert.equal(h.clicks, 0);
  } finally {
    h.close();
  }
});

function controllerDeclarations(names) {
  const path = 'src/灯火通明-伪同层控制器/index.ts';
  const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const statements = source.statements.filter(
    node =>
      (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.includes(d.name.text))) ||
      (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)),
  );
  assert.equal(statements.length, names.length);
  return compile(statements.map(node => node.getText(source)).join('\n'));
}

function controllerHarness() {
  const classes = new Set(['dhl-pseudo-layer-active', 'dhl-pseudo-stage-root-active', 'dhl-native-input-collapsed']);
  const operations = [],
    persisted = new Map();
  const host = {
    console: { info() {} },
    controllerDisposed: false,
    detachedMode: false,
    activeGeneration: null,
    deletingMessageId: null,
    updatingMessageId: null,
    activeInteraction: { mode: 'story' },
    selectedMessageId: 2,
    selectedHistoryKind: null,
    browsingHistory: false,
    PSEUDO_LAYER_DETACHED_STORAGE_KEY: protocol.PSEUDO_LAYER_DETACHED_STORAGE_KEY,
    STORY_INTERACTION: { mode: 'story' },
    viewRevision: 0,
    tavernDocument: { querySelector: () => null },
    localStorage: { setItem: (key, value) => persisted.set(key, value) },
    frameObserver: { disconnect: () => operations.push('disconnect') },
    observedChat: {},
    frameCandidateTimer: null,
    mobileStageAlignFrame: null,
    pendingFrameCandidates: new Set([{}]),
    registrations: new Map([[2, {}]]),
    releaseParkedFrames: () => operations.push('release'),
    applyStageVisibility: () => {
      classes.clear();
      operations.push('visibility');
    },
    restoreNativeChatPosition: () => operations.push('scroll'),
    invalidateStageSnapshot: () => operations.push('invalidate'),
    installFrameObserver: () => operations.push('observe'),
    parkLatestStageFrame: () => operations.push('park'),
    clearDialogueCarryoverPrompt: () => operations.push('clear-prompt'),
    broadcastView: () => operations.push('view'),
    send: (_, response) => operations.push(response.type),
    toastr: { info: () => operations.push('notice') },
  };
  vm.runInNewContext(controllerDeclarations(['setDetachedMode']) + '\nglobalThis.switchMode = setDetachedMode;', host);
  return { host, operations, persisted, classes };
}

test('控制器进入待命时释放舞台、输入限制和停放任务，恢复时重新接管', () => {
  const h = controllerHarness();
  h.host.switchMode(true);
  assert.equal(h.host.detachedMode, true);
  assert.equal(h.persisted.get(protocol.PSEUDO_LAYER_DETACHED_STORAGE_KEY), 'true');
  assert.equal(h.host.registrations.size, 0);
  assert.equal(h.host.pendingFrameCandidates.size, 0);
  assert.equal(h.classes.size, 0);
  assert.ok(h.operations.includes('disconnect') && h.operations.includes('release') && h.operations.includes('scroll'));
  h.host.switchMode(false);
  assert.equal(h.host.detachedMode, false);
  assert.equal(h.persisted.get(protocol.PSEUDO_LAYER_DETACHED_STORAGE_KEY), 'false');
  assert.ok(h.operations.includes('observe') && h.operations.includes('park'));
});

test('生成或编辑进行中拒绝脱离，延迟停放任务在待命时不能重建舞台', () => {
  const h = controllerHarness();
  h.host.activeGeneration = {};
  h.host.switchMode(true, {});
  assert.equal(h.host.detachedMode, false);
  assert.equal(h.persisted.size, 0);
  assert.ok(h.operations.includes('error'));
  const host = { detachedMode: true, controllerDisposed: false };
  vm.runInNewContext(
    controllerDeclarations(['parkFrame', 'parkLatestStageFrame', 'reconcileStageFrame']) +
      '\nglobalThis.park = parkFrame; globalThis.latest = parkLatestStageFrame; globalThis.reconcile = reconcileStageFrame;',
    host,
  );
  assert.equal(host.park(2, {}), false);
  host.latest();
  host.reconcile();
});

function appHarness(detached = false, latest = true, viewportWidth = 1200, reloadedView = null) {
  const { parse, compileScript } = require('vue/compiler-sfc');
  const filename = 'src/灯火通明-测试版/app.vue';
  const descriptor = parse(fs.readFileSync(filename, 'utf8'), { filename }).descriptor;
  const script = compileScript(descriptor, { id: 'native-status-regression' });
  const pseudo = vue.reactive({
    messageId: 2,
    isDetachedMode: detached,
    isPseudoStage: !detached,
    isNativeLatest: latest,
    controllerReady: true,
    generationState: 'idle',
    isLatest: true,
    isStoryHistoryLatest: true,
    dialogueDrawerOpen: false,
    view: { ...stageView },
    selectHistory() {},
    selectTimelineEntry() {},
  });
  const data = {
    任务列表: {},
    世闻数: 0,
    启用行动提示: true,
    可选行动数: 0,
    setGalleryPreloadEnabled(value) {
      data.preload = value;
    },
    viewMessage(id) {
      data.viewed = id;
    },
  };
  const theme = vue.reactive({ readingModes: { desktop: 'paged', mobile: 'scroll' } });
  const host = {
    ...vue,
    exports: {},
    console,
    _: require('lodash'),
    onMounted() {},
    onBeforeUnmount() {},
    window: {
      parent: { innerWidth: viewportWidth, innerHeight: 900 },
      frameElement: { getAttribute: () => reloadedView, removeAttribute() {} },
    },
    localStorage: { getItem: () => null, setItem() {} },
    SillyTavern: { getCurrentChatId: () => 'test-chat' },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    require: id => {
      if (id === 'vue') return vue;
      if (id === './store')
        return { useDataStore: () => data, usePseudoLayerStore: () => pseudo, useThemeStore: () => theme };
      if (id === './moving-panel-fit') return { createMovingPanelFit: () => ({ sync() {}, dispose() {} }) };
      if (id === './stores/affairs-store') return { useAffairsStore: () => vue.reactive({ navigation: null }) };
      if (id === './affairs') return { readingViewForMode: mode => (mode === 'scroll' ? 'timeline' : 'story') };
      if (id === './schema') return { getDangerColor: () => '#999' };
      if (id === '../灯火阑珊/map-system') return { resolveMapAnchor: () => null };
      if (id === './region-utils') return { inferLayerFromTrack: () => ({}) };
      return {};
    },
  };
  const scope = vue.effectScope();
  vm.runInNewContext(compile(script.content), host);
  const app = scope.run(() => host.exports.default.setup({}, { expose() {} }));
  return { app, pseudo, data, close: () => scope.stop() };
}

test('伪同层进入阅读、原生默认图鉴，行事合并任务与世闻，历史楼层默认折叠', () => {
  for (const detached of [false, true]) {
    const h = appHarness(detached);
    try {
      assert.equal(h.app.activeView.value, detached ? 'gallery' : 'story');
      assert.ok(
        h.app.tabs.value.findIndex(tab => tab.id === 'gallery') <
          h.app.tabs.value.findIndex(tab => tab.id === 'affairs'),
      );
      if (detached) {
        assert.ok(h.app.tabs.value.every(tab => !['story', 'timeline'].includes(tab.id)));
        assert.equal(h.app.tabs.value[1].id, 'affairs');
        assert.equal(h.app.tabs.value[5].id, 'inventory');
        assert.equal(h.data.viewed, 2);
      }
    } finally {
      h.close();
    }
  }
  const history = appHarness(true, false);
  try {
    assert.equal(history.app.isStatusCollapsed.value, true);
    assert.equal(history.data.preload, false);
  } finally {
    history.close();
  }
  const mobile = appHarness(true, true, 390);
  try {
    assert.equal(mobile.app.viewportMode.value, 'mobile');
    assert.equal(mobile.app.isStatusCollapsed.value, false);
    assert.equal(mobile.app.isImmersive.value, false);
    mobile.app.toggleStatusCollapsed();
    assert.equal(mobile.app.isStatusCollapsed.value, true);
  } finally {
    mobile.close();
  }
});

test('生成切入正文并保持阅读，查看图鉴时切换锚点不会挤走页面', async () => {
  const h = appHarness();
  try {
    h.app.activeView.value = 'affairs';
    h.pseudo.generationState = 'generating';
    await vue.nextTick();
    assert.equal(h.app.activeView.value, 'story');
    h.app.activeView.value = 'story';
    await vue.nextTick();
    h.pseudo.generationState = 'idle';
    await vue.nextTick();
    assert.equal(h.app.activeView.value, 'story');
    h.app.activeView.value = 'gallery';
    h.pseudo.view.selectedMessageId = 0;
    await vue.nextTick();
    assert.equal(h.app.activeView.value, 'gallery');
  } finally {
    h.close();
  }
});

test('自动投射后保留行事面板，原生楼层维持图鉴入口', () => {
  for (const detached of [false, true]) {
    const h = appHarness(detached, true, 1200, 'affairs');
    try {
      assert.equal(h.app.activeView.value, detached ? 'gallery' : 'affairs');
    } finally {
      h.close();
    }
  }
});
