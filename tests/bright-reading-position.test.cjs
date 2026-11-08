/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const vue = require('vue');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
const positions = require('../src/灯火通明-测试版/reading-position');

function readingDocument() {
  let prefix = 0;
  const element = {
    scrollTop: 730,
    scrollHeight: 2400,
    clientHeight: 400,
    dataset: { following: 'false' },
    getBoundingClientRect: () => ({ top: 100 }),
    querySelector: () => scope,
  };
  const blocks = ['首段', '正在阅读的段落', '后续段落'].map((text, index) => ({
    textContent: text,
    getBoundingClientRect: () => ({
      top: 100 + prefix + index * 500 - element.scrollTop,
      bottom: 500 + prefix + index * 500 - element.scrollTop,
      height: 400,
    }),
  }));
  const scope = {
    dataset: { timelineId: '2' },
    textContent: '整层正文',
    querySelectorAll: () => blocks,
    getBoundingClientRect: () => ({ top: 100 - element.scrollTop, bottom: 2500 - element.scrollTop }),
  };
  element.querySelectorAll = () => [scope];
  const doc = {
    querySelector: selector => (selector === '.cultivation-status' ? { getAttribute: () => 'timeline' } : element),
  };
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
  };
  const frame = { contentDocument: doc, dataset: {}, ownerDocument: { defaultView: { sessionStorage: storage } } };
  return {
    element,
    frame,
    values,
    setPrefix: value => {
      prefix = value;
    },
  };
}

test('重载恢复到原段落，前文布局变高后仍保持段落在屏幕上的位置', () => {
  const h = readingDocument();
  const saved = positions.captureReadingPosition(h.frame.contentDocument);
  assert.equal(saved.messageId, 2);
  assert.equal(saved.text, '正在阅读的段落');
  assert.equal(saved.following, false);
  h.element.scrollTop = 0;
  h.setPrefix(100);
  assert.equal(positions.restoreReadingPosition(h.element, saved), true);
  assert.equal(h.element.scrollTop, 830);
});

test('控制器重建通过同一聊天的会话存储接续阅读，其他聊天保持独立', () => {
  const h = readingDocument();
  const saved = positions.saveReadingPosition(h.frame, 'chat-a');
  const replacement = { dataset: {}, ownerDocument: h.frame.ownerDocument };
  assert.deepEqual(positions.loadReadingPosition(replacement, 'chat-a'), saved);
  assert.equal(positions.loadReadingPosition(replacement, 'chat-b'), null);
  assert.deepEqual(positions.loadReadingPosition(h.frame, 'chat-a'), saved);
  h.element.clientHeight = 0;
  assert.equal(positions.saveReadingPosition(h.frame, 'chat-a'), null);
  assert.deepEqual(positions.loadReadingPosition(replacement, 'chat-a'), saved);
});

test('空缺或损坏的阅读记录不改变初始定位', () => {
  for (const value of [null, '', 'invalid', '{}', 'null', '{"version":1,"view":"timeline","top":-1}']) {
    assert.equal(positions.parseReadingPosition(value), null);
  }
});

test('手动开启前端清除上次历史位置，空聊天标识不读取共享记录', () => {
  const h = readingDocument();
  positions.saveReadingPosition(h.frame, 'chat-a');
  positions.clearReadingPosition(h.frame.ownerDocument.defaultView, 'chat-a');
  const replacement = { dataset: {}, ownerDocument: h.frame.ownerDocument };
  assert.equal(positions.loadReadingPosition(replacement, 'chat-a'), null);
  positions.saveReadingPosition(h.frame, '');
  assert.equal(positions.loadReadingPosition(replacement, ''), null);
});

test('原生只在切换时定位最新正文，两帧结束后允许自由向上阅读', () => {
  const filename = 'src/灯火通明-伪同层控制器/index.ts';
  const ast = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = ast.statements.find(
    node =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(item => item.name.getText(ast) === 'restoreNativeChatPosition'),
  );
  const frames = [];
  const chat = {
    isConnected: true,
    scrollTop: 0,
    getBoundingClientRect: () => ({ top: 100 }),
    querySelectorAll: () => [
      { querySelector: () => ({ getBoundingClientRect: () => ({ top: 1700 - chat.scrollTop }) }) },
    ],
  };
  const host = {
    tavernDocument: { querySelector: () => chat },
    tavernWindow: { requestAnimationFrame: fn => frames.push(fn) },
    controllerHost: {},
    controllerInstanceId: 'current',
  };
  const compiled = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled + '\nglobalThis.restore = restoreNativeChatPosition;', host);
  host.restore();
  frames.shift()();
  frames.shift()();
  assert.equal(chat.scrollTop, 1600);
  assert.equal(frames.length, 0);
  chat.scrollTop = 1200;
  assert.equal(chat.scrollTop, 1200);
});

function timelineHarness(anchor = 0, saved = null) {
  const filename = 'src/灯火通明-测试版/components/TimelineReader.vue';
  const descriptor = require('vue/compiler-sfc').parse(fs.readFileSync(filename, 'utf8'), { filename }).descriptor;
  const ast = ts.createSourceFile('reader.ts', descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true);
  const names = [
    'initialPositioned',
    'pendingInitialPosition',
    'positionTarget',
    'initialSettleTimers',
    'requestInitialPage',
    'positionInitialAnchor',
    'handleScroll',
    'returnLatest',
  ];
  const statements = ast.statements.filter(
    node =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(item => names.includes(item.name.getText(ast))),
  );
  assert.equal(statements.length, names.length);
  const resets = [];
  const following = vue.ref(false);
  const element = { scrollTop: 0, scrollHeight: 2400, clientHeight: 400, querySelector: () => ({ offsetTop: 0 }) };
  const host = {
    props: { active: true, anchorMessageId: anchor, initialPosition: saved },
    pseudo: {
      controllerReady: true,
      timelineLoading: false,
      timelineEntries: [{}],
      timelineHasNewer: true,
      view: { latestMessageId: 4 },
      resetTimeline: id => resets.push(id),
    },
    scrollRef: { value: element },
    nextTick: vue.nextTick,
    isFollowing: following,
    resumeFollowing: () => {
      following.value = true;
      element.scrollTop = 2000;
    },
    pauseFollowing: () => {
      following.value = false;
    },
    restoreReadingPosition: (_, position) => {
      element.scrollTop = position.top;
      return true;
    },
    handleStreamScroll() {},
    loadOlder: () => assert.fail('初始化时不能加载旧页'),
    loadNewer() {},
    activeEntryFrame: null,
    updateActiveEntry() {},
    appearance: { preferences: { reduceMotion: true } },
    window: { setTimeout: () => 1, requestAnimationFrame: () => 1 },
  };
  const compiled = ts.transpileModule(statements.map(node => node.getText(ast)).join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(
    compiled + '\nglobalThis.api = { requestInitialPage, positionInitialAnchor, handleScroll, returnLatest };',
    host,
  );
  return { host, resets, following, element };
}

test('时间线初始化不在零高度过渡阶段加载旧页，未指定锚点时直接跟随最新', async () => {
  const h = timelineHarness(-1);
  h.host.api.handleScroll();
  h.host.api.positionInitialAnchor();
  await vue.nextTick();
  assert.equal(h.following.value, true);
  assert.equal(h.element.scrollTop, 2000);
});

test('跟随最新覆盖原先的历史锚点，分页回执抵达后停在底部', async () => {
  const h = timelineHarness(0);
  h.host.api.positionInitialAnchor();
  await vue.nextTick();
  assert.equal(h.following.value, false);
  h.host.api.returnLatest();
  assert.deepEqual(h.resets, [4]);
  h.host.api.positionInitialAnchor();
  await vue.nextTick();
  assert.equal(h.following.value, true);
  assert.equal(h.element.scrollTop, 2000);
});

test('重载历史正文时恢复原位置并保持暂停跟随', async () => {
  const h = timelineHarness(0, { view: 'timeline', top: 760, following: false });
  h.host.api.positionInitialAnchor();
  await vue.nextTick();
  assert.equal(h.element.scrollTop, 760);
  assert.equal(h.following.value, false);
});
