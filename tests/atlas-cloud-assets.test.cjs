/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { gzipSync } = require('node:zlib');
const { test } = require('node:test');
const ts = require('typescript');
const manifest = require('../assets/atlas/manifest.json');
const source = fs.readFileSync('src/灯火通明/atlas/assets.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

function harness() {
  const calls = [];
  const timers = new Map();
  const idle = new Map();
  let id = 0;
  let decodes = 0;
  let failure = null;
  let invalid = false;
  const host = {
    exports: {},
    AbortController,
    AbortSignal,
    Response,
    DecompressionStream: class extends DecompressionStream {
      constructor(format) {
        super(format);
        decodes++;
      }
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (failure) {
        const current = failure;
        failure = null;
        throw current;
      }
      const realm = url.match(/\/(surface|underworld|sky)\./)[1];
      return new Response(gzipSync(JSON.stringify({ markup: '<svg/>', data: { realm: invalid ? 'wrong' : realm } })));
    },
    window: {
      setTimeout: fn => {
        timers.set(++id, fn);
        return id;
      },
      clearTimeout: key => timers.delete(key),
      requestIdleCallback: fn => {
        idle.set(++id, fn);
        return id;
      },
      cancelIdleCallback: key => idle.delete(key),
    },
    require: name => {
      if (name.endsWith('manifest.json')) return manifest;
      if (name === './generated/release') return 'release-commit';
      throw new Error('Unexpected import: ' + name);
    },
  };
  vm.runInNewContext(compiled, host);
  const flush = tasks => {
    const next = [...tasks.values()];
    tasks.clear();
    next.forEach(run => run());
  };
  return {
    api: host.exports,
    calls,
    timers,
    idle,
    get decodes() {
      return decodes;
    },
    fail: error => {
      failure = error;
    },
    invalidate: () => {
      invalid = true;
    },
    flushTimers: () => flush(timers),
    flushIdle: () => flush(idle),
  };
}

test('三界按需读取固定发布版本，交给浏览器缓存并验证完整性', async () => {
  const h = harness();
  for (const realm of ['surface', 'underworld', 'sky']) {
    const asset = await h.api.loadAtlas(realm);
    assert.equal(asset.data.realm, realm);
    const { url, options } = h.calls.at(-1);
    assert.equal(
      url,
      `https://cdn.jsdelivr.net/gh/${manifest.repository}@release-commit/assets/atlas/${manifest.realms[realm].file}`,
    );
    assert.equal(options.cache, 'force-cache');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.integrity, manifest.realms[realm].integrity);
  }
});

test('重复展开从浏览器缓存读取压缩文件，加载器不常驻旧的解压数据', async () => {
  const h = harness();
  const previous = await h.api.loadAtlas('surface');
  previous.data.unrelated = true;
  await h.api.loadAtlas('underworld');
  const current = await h.api.loadAtlas('surface');
  assert.notEqual(previous, current);
  assert.equal(current.data.unrelated, undefined);
  assert.equal(h.decodes, 3);
});

test('网络失败后可以重试，错误不会留在加载器缓存中', async () => {
  const h = harness();
  h.fail(new TypeError('network unavailable'));
  await assert.rejects(h.api.loadAtlas('sky'), /network unavailable/);
  assert.equal((await h.api.loadAtlas('sky')).data.realm, 'sky');
});

test('失效请求和界域不匹配的数据不能交给地图控制器', async () => {
  const h = harness();
  const abort = new AbortController();
  abort.abort();
  await assert.rejects(h.api.loadAtlas('surface', abort.signal), { name: 'AbortError' });
  h.invalidate();
  await assert.rejects(h.api.loadAtlas('surface'), /invalid/);
});

test('空闲预取只下载压缩资源，取消预取会释放排队任务', async () => {
  const h = harness();
  const cancel = h.api.scheduleAtlasPrefetch('underworld');
  assert.equal(h.calls.length, 0);
  h.flushTimers();
  assert.equal(h.calls.length, 0);
  h.flushIdle();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.length, 1);
  assert.equal(h.decodes, 0);
  cancel();
  assert.equal(h.calls[0].options.signal.aborted, true);
  const cancelBeforeIdle = h.api.scheduleAtlasPrefetch('sky');
  cancelBeforeIdle();
  h.flushTimers();
  h.flushIdle();
  assert.equal(h.calls.length, 1);
});
