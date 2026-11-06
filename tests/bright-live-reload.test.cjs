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
