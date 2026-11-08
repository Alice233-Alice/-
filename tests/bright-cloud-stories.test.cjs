/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vue = require('vue');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
const stories = require('../src/灯火通明-测试版/cloud-stories');
const { useCloudStoryEditor } = require('../src/灯火通明-测试版/cloud-story-editor');
const { blueprintFile, ...metadata } = require('../examples/cloud-stories/sample.json');
const sample = { ...metadata, blueprint: fs.readFileSync('examples/cloud-stories/' + blueprintFile, 'utf8').trim() };
const library = { formatVersion: 1, stories: [sample] };
const json = body => new Response(JSON.stringify(body), { status: 200 });
const file = (value = library, sha = 'original-sha') =>
  json({ sha, encoding: 'base64', content: stories.encodeStoryFile(JSON.stringify(value)) });

test('故事库校验中文、唯一ID、版本、字段及UTF8大小', () => {
  const text = stories.serializeStoryLibrary(library);
  assert.deepEqual(stories.parseStoryLibrary('\uFEFF' + text), library);
  assert.throws(() => stories.parseStoryLibrary('半段文稿'), /JSON/);
  assert.throws(() => stories.serializeStoryLibrary({ formatVersion: 2, stories: [] }), /检查/);
  assert.throws(() => stories.serializeStoryLibrary({ formatVersion: 1, stories: [sample, sample] }), /检查/);
  assert.throws(
    () =>
      stories.serializeStoryLibrary({
        formatVersion: 1,
        stories: [{ ...sample, blueprint: '字'.repeat(340000) }],
      }),
    /1 MB/,
  );
  assert.equal((sample.blueprint.match(/^## [一二三四]：/gm) || []).length, 4);
  assert.match(sample.blueprint, /送归：/);
  assert.match(sample.blueprint, /断灯：/);
});

test('公开读取免凭证，网络和格式失败可重试', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify(library));
  };
  assert.deepEqual(await stories.loadPublicStories(undefined, fetcher), library);
  assert.equal(requests[0].url, stories.STORY_LIBRARY_URL);
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.headers, undefined);
  await assert.rejects(
    stories.loadPublicStories(undefined, async () => {
      throw new Error('internal');
    }),
    /连接失败/,
  );
  await assert.rejects(
    stories.loadPublicStories(undefined, async () => new Response('', { status: 404 })),
    /尚未发布/,
  );
  await assert.rejects(
    stories.loadPublicStories(undefined, async () => new Response('invalid')),
    /JSON/,
  );
});

test('作者读取验证公开仓库，正确解码文稿，仓库缺失不可视为空库', async () => {
  const fetcher = async url => (url.includes('/contents/') ? file() : json({ private: false }));
  assert.deepEqual(await stories.loadEditableStories('test-token', undefined, fetcher), {
    library,
    sha: 'original-sha',
  });
  const empty = await stories.loadEditableStories('test-token', undefined, async url =>
    url.includes('/contents/') ? new Response('', { status: 404 }) : json({ private: false }),
  );
  assert.deepEqual(empty, { library: { formatVersion: 1, stories: [] }, sha: null });
  await assert.rejects(
    stories.loadEditableStories('test-token', undefined, async () => new Response('', { status: 404 })),
    /仓库/,
  );
  await assert.rejects(
    stories.loadEditableStories('test-token', undefined, async () => json({ private: true })),
    /公开/,
  );
});

test('发布携带原SHA并保持中文完整，初建文件不发送SHA', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return json({ content: { sha: 'new-sha' }, commit: { html_url: stories.STORY_REPOSITORY_URL + '/commit/test' } });
  };
  const result = await stories.publishStoryLibrary(library, 'original-sha', 'test-token', undefined, fetcher);
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.sha, 'original-sha');
  assert.deepEqual(JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')), library);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token');
  assert.equal(result.sha, 'new-sha');
  await stories.publishStoryLibrary(library, null, 'test-token', undefined, fetcher);
  assert.equal('sha' in JSON.parse(requests[1].options.body), false);
});

test('冲突、过期授权、限额和超大文稿不给出伪成功', async () => {
  for (const [status, message] of [
    [409, /版本/],
    [422, /拒绝/],
    [401, /凭证/],
    [403, /权限/],
  ]) {
    await assert.rejects(
      stories.publishStoryLibrary(library, 'old', 'test-token', undefined, async () => new Response('', { status })),
      message,
    );
  }
  let called = false;
  await assert.rejects(
    stories.publishStoryLibrary(
      {
        formatVersion: 1,
        stories: [{ ...sample, blueprint: '字'.repeat(340000) }],
      },
      null,
      'test-token',
      undefined,
      async () => {
        called = true;
        return json({});
      },
    ),
    /1 MB/,
  );
  assert.equal(called, false);
});

test('管理会话保存、冲突保留草稿、重载核对、编辑修订与下架', async () => {
  const scope = vue.effectScope();
  let remote = library;
  let remoteSha = 'one';
  let conflict = false;
  const published = [];
  const fetcher = async (url, options) => {
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body);
      if (conflict || body.sha !== remoteSha) return new Response('', { status: 409 });
      remote = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      remoteSha += 'x';
      return json({ content: { sha: remoteSha } });
    }
    return url.includes('/contents/') ? file(remote, remoteSha) : json({ private: false });
  };
  const editor = scope.run(() => useCloudStoryEditor(next => published.push(next), fetcher));
  try {
    editor.token.value = 'session-token';
    await editor.load();
    editor.edit(sample);
    editor.draft.value.goal = '修改后的目标';
    conflict = true;
    assert.equal(await editor.publish(), false);
    assert.match(editor.error.value, /版本/);
    assert.equal(editor.draft.value.goal, '修改后的目标');
    await editor.load();
    assert.equal(editor.draft.value.goal, '修改后的目标');
    conflict = false;
    assert.equal(await editor.publish(), true);
    assert.equal(remote.stories[0].revision, 2);
    assert.equal(remote.stories[0].goal, '修改后的目标');
    assert.equal(await editor.withdraw(sample.id), false);
    editor.removalId.value = sample.id;
    assert.equal(await editor.withdraw(sample.id), true);
    assert.deepEqual(remote.stories, []);
    assert.equal(published.length, 2);
  } finally {
    scope.stop();
  }
  assert.equal(editor.token.value, '');
});

test('管理关闭会清除凭证、取消请求并忽略迟到的结果', async () => {
  const scope = vue.effectScope();
  let resolve;
  let signal;
  const editor = scope.run(() =>
    useCloudStoryEditor(
      () => assert.fail('closed session'),
      async (url, options) => {
        signal = options.signal;
        return new Promise(receive => {
          resolve = receive;
        });
      },
    ),
  );
  editor.token.value = 'never-persist-this-token';
  const pending = editor.load();
  scope.stop();
  assert.equal(editor.token.value, '');
  assert.equal(signal.aborted, true);
  resolve(json({ private: false }));
  await pending;
  assert.equal(editor.loaded.value, false);
});

test('导入只读文字，失败保留旧文稿，来源与版本可离线解析', async () => {
  const scope = vue.effectScope();
  const editor = scope.run(() => useCloudStoryEditor(() => {}));
  try {
    await editor.importManuscript({ name: '故事.md', size: 10, text: async () => ' 核心真相 ' });
    assert.equal(editor.draft.value.blueprint, '核心真相');
    await editor.importManuscript({ name: '脚本.html', size: 10, text: async () => '<script>invalid</script>' });
    assert.equal(editor.draft.value.blueprint, '核心真相');
    await editor.importManuscript({ name: '空.txt', size: 0, text: async () => '' });
    assert.equal(editor.draft.value.blueprint, '核心真相');
  } finally {
    scope.stop();
  }
  const snapshot = stories.createStorySnapshot(sample);
  assert.deepEqual(stories.readStorySnapshot(snapshot), sample);
  assert.equal(stories.readStorySnapshot('自由寻途旧蓝图'), undefined);
});
