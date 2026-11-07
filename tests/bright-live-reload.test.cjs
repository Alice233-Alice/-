/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');
require('ts-node').register({ project: 'tsconfig.schema-test.json', transpileOnly: true, files: true });
const { getFrontendRevision } = require('../src/灯火通明-测试版/frontend-revision');

test('编译代码与样式决定版本，普通运行态样式保持独立', () => {
  const styles = [{ textContent: '.cultivation-status { color: red; }' }, { textContent: '.runtime { color: blue; }' }];
  const modules = [{ textContent: '__webpack_require__("app")' }];
  const doc = { querySelectorAll: selector => (selector === 'style' ? styles : modules) };
  const first = getFrontendRevision(doc);
  styles[1].textContent = '.runtime { color: green; }';
  assert.equal(getFrontendRevision(doc), first);
  styles[0].textContent = '.cultivation-status { color: blue; }';
  const second = getFrontendRevision(doc);
  assert.notEqual(second, first);
  modules[0].textContent = '__webpack_require__("new-app")';
  assert.notEqual(getFrontendRevision(doc), second);
});

const file = 'src/灯火通明-伪同层控制器/index.ts';
const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const declaration = source.statements.find(
  node =>
    ts.isVariableStatement(node) &&
    node.declarationList.declarations.some(item => item.name.text === 'refreshParkedFrontend'),
);
const compiled = ts.transpileModule(declaration.getText(source), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(revision = 'old') {
  const kept = {
    dataset: { dhlFrontendRevision: revision },
    src: 'blob:old',
    attrs: {},
    addEventListener() {},
    removeAttribute(name) {
      delete this.attrs[name];
    },
  };
  const candidate = {
    dataset: { dhlFrontendRevision: 'new' },
    attrs: { src: 'blob:new' },
    getAttribute(name) {
      return this.attrs[name];
    },
  };
  const queued = [];
  const host = {
    console: { info() {} },
    activeGeneration: null,
    deletingMessageId: null,
    updatingMessageId: null,
    getParkedMessageId: () => 1,
    getFrameKeeper: () => ({ querySelector: () => kept }),
    frameLoadStartedAt: new WeakMap(),
    queueFrameCandidate: (frame, delay) => queued.push({ frame, delay }),
    scheduleViewRefresh() {},
    Date,
  };
  vm.runInNewContext(compiled + '\nglobalThis.refresh = refreshParkedFrontend;', host);
  return { kept, candidate, queued, host };
}

test('新编译版本原位重载舞台，同版本的楼层重绘保持原位', () => {
  const h = harness();
  const kept = h.kept;
  assert.equal(h.host.refresh(h.candidate), true);
  assert.equal(h.kept, kept);
  assert.equal(h.kept.src, 'blob:new');
  assert.equal(h.kept.dataset.dhlFrontendRevision, 'new');
  h.candidate.attrs.src = 'blob:another-render';
  assert.equal(h.host.refresh(h.candidate), false);
  assert.equal(h.kept.src, 'blob:new');
});

test('旧版本舞台也能接收首次带版本标识的加载器', () => {
  const h = harness(undefined);
  delete h.kept.dataset.dhlFrontendRevision;
  assert.equal(h.host.refresh(h.candidate), true);
  assert.equal(h.kept.src, 'blob:new');
});

test('生成、删除和编辑期间延后，空闲后自动应用', () => {
  for (const field of ['activeGeneration', 'deletingMessageId', 'updatingMessageId']) {
    const h = harness();
    h.host[field] = field === 'activeGeneration' ? {} : 2;
    assert.equal(h.host.refresh(h.candidate), true);
    assert.equal(h.kept.src, 'blob:old');
    assert.equal(h.queued[0].delay, 500);
    h.host[field] = null;
    assert.equal(h.host.refresh(h.candidate), true);
    assert.equal(h.kept.src, 'blob:new');
  }
});

test('普通 iframe 和尚未提供源的加载器不改变舞台', () => {
  const h = harness();
  delete h.candidate.dataset.dhlFrontendRevision;
  assert.equal(h.host.refresh(h.candidate), false);
  h.candidate.dataset.dhlFrontendRevision = 'new';
  h.candidate.attrs.src = 'about:blank';
  assert.equal(h.host.refresh(h.candidate), false);
  assert.equal(h.kept.src, 'blob:old');
});

test('srcdoc 与 blob 模板可以连续切换', () => {
  const h = harness();
  h.candidate.attrs.srcdoc = '<body>new frontend</body>';
  assert.equal(h.host.refresh(h.candidate), true);
  assert.equal(h.kept.srcdoc, '<body>new frontend</body>');
  delete h.candidate.attrs.srcdoc;
  h.candidate.dataset.dhlFrontendRevision = 'newer';
  assert.equal(h.host.refresh(h.candidate), true);
  assert.equal(h.kept.src, 'blob:new');
});

const startupNames = ['isPseudoFrontendLoader', 'eagerLoadFrontendFrame', 'parkCandidateFrame', 'parkLatestStageFrame'];
const startupSource = source.statements.filter(
  node =>
    ts.isVariableStatement(node) && node.declarationList.declarations.some(item => startupNames.includes(item.name.text)),
);
assert.equal(startupSource.length, startupNames.length);
const startupCompiled = ts.transpileModule(startupSource.map(node => node.getText(source)).join('\n'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function startupHarness() {
  const frames = [];
  const attempted = [];
  const host = {
    detachedMode: false,
    controllerDisposed: false,
    activeGeneration: null,
    latestStoryStageId: () => 0,
    rememberFrame() {},
    getFrameMessageId: frame => frame.messageId,
    refreshParkedFrontend: () => false,
    getParkedMessageId: () => undefined,
    getFrameKeeper: () => undefined,
    getLiveRegistration: () => undefined,
    hasMountedPseudoApp: frame => frame.mounted,
    getMessageElement: () => ({ querySelectorAll: () => frames }),
    parkFrame: (_, frame) => {
      attempted.push(frame);
      return frame.mounted;
    },
    scheduleViewRefresh() {},
  };
  vm.runInNewContext(
    startupCompiled + '\nglobalThis.scan = parkLatestStageFrame; globalThis.candidate = parkCandidateFrame;',
    host,
  );
  const addFrame = (code, messageId = 0) => {
    const frame = {
      dataset: {},
      loading: 'lazy',
      mounted: false,
      messageId,
      closest: () => ({ querySelector: () => ({ textContent: code }) }),
    };
    frames.push(frame);
    return frame;
  };
  return { host, frames, attempted, addFrame };
}

test('长索引页首次进卡，尚未挂载的界面加载器立即脱离懒加载等待', () => {
  const h = startupHarness();
  const frame = h.addFrame("<body><script>$('body').load('http://127.0.0.1:5502/dist/灯火通明-测试版/index.html?_=' + Date.now())</script></body>");
  h.host.scan();
  assert.equal(frame.loading, 'eager');
  assert.deepEqual(h.attempted, [frame]);
  assert.equal(frame.mounted, false, '加载不依赖前端已经挂载，也不伪造挂载状态');
});

test('正式版、旧版及中文被 URL 编码的本项目加载器同样立即加载', () => {
  for (const name of ['灯火通明', '灯火阑珊', encodeURIComponent('灯火通明-测试版')]) {
    const h = startupHarness();
    const frame = h.addFrame(`jQuery('body').load('https://example.invalid/dist/${name}/index.html')`);
    h.host.scan();
    assert.equal(frame.loading, 'eager', name);
  }
});

test('其他 iframe、历史楼层及待命状态保留原加载方式', () => {
  const h = startupHarness();
  const unrelated = h.addFrame("$('body').load('https://example.invalid/thinking/index.html')");
  const historical = h.addFrame("$('body').load('/dist/灯火通明/index.html')", 1);
  h.host.candidate(unrelated, 0);
  h.host.candidate(historical, 0);
  assert.equal(unrelated.loading, 'lazy');
  assert.equal(historical.loading, 'lazy');
  const dormant = h.addFrame("$('body').load('/dist/灯火通明/index.html')");
  h.host.detachedMode = true;
  h.host.scan();
  assert.equal(dormant.loading, 'lazy');
});

test('已确认加载器可在原生前端挂载前创建舞台，启动中重复通知保留同一实例', () => {
  const h = startupHarness();
  let loader = "$('body').load('/dist/灯火通明-测试版/index.html')";
  const frame = h.addFrame(loader);
  let owned;
  let clones = 0;
  const keeper = { querySelector: () => owned, append: value => { owned = value; } };
  frame.getAttribute = name => name === 'src' ? 'blob:frontend-loader' : null;
  frame.closest = selector => selector === '.TH-render' ? {
    querySelector: () => ({ textContent: loader }),
    classList: { add() {} },
  } : null;
  frame.cloneNode = () => {
    clones++;
    return {
      dataset: {},
      loading: 'lazy',
      contentWindow: {},
      removeAttribute(name) { if (name === 'loading') this.loading = 'auto'; },
      addEventListener() {},
    };
  };
  Object.assign(h.host, {
    getMessageElement: () => ({ getAttribute: () => 'false', classList: { add() {} } }),
    getFrameKeeper: () => keeper,
    STAGE_ROOT_ID: 'dhl-pseudo-stage-root',
    NATIVE_STAGE_CLASS: 'dhl-pseudo-native-stage',
    PARKED_FRAME_CLASS: 'dhl-pseudo-frame-parked',
    FRAME_LOAD_GRACE_MS: 30000,
    frameLoadStartedAt: new WeakMap(),
    registrations: new Map(),
    asReplyTarget: value => value,
  });
  const declaration = source.statements.find(node =>
    ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.text === 'parkFrame'),
  );
  const parkCompiled = ts.transpileModule(declaration.getText(source), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(parkCompiled + '\nglobalThis.park = parkFrame;', h.host);
  assert.equal(h.host.park(0, frame), true);
  assert.equal(frame.mounted, false);
  assert.equal(owned.dataset.dhlControllerOwned, 'true');
  assert.equal(owned.loading, 'auto');
  assert.equal(h.host.park(0, frame), false);
  assert.equal(clones, 1, '启动中的舞台不会因重复 DOM 通知而反复销毁');
  h.host.candidate(frame, 0);
  assert.equal(frame.loading, 'lazy', '已有舞台正在启动时保留原生加载器的懒加载');
  assert.equal(clones, 1);
  owned = undefined;
  loader = "$('body').load('/thinking/index.html')";
  assert.equal(h.host.park(0, frame), false);
  assert.equal(clones, 1, '其他加载器不会在挂载前被接管');
});
