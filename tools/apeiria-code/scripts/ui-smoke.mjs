/** Exercises only the local mock in a new headless Chrome profile. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-output', 'ui');
const profile = path.join(output, `headless-profile-${Date.now()}-${process.pid}`);
const chromePath = process.env.APEIRIA_SMOKE_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const baseUrl = 'http://127.0.0.1:19377/ui/preview.html';
const results = [];
const runtimeErrors = [];
let previewProcess;
let chromeProcess;
let page;
let browser;
let chromeLog = '';
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.events = new Map();
    socket.on('message', raw => {
      const message = JSON.parse(String(raw));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      } else this.events.get(message.method)?.forEach(callback => callback(message.params));
    });
    socket.on('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(Error('Headless browser closed.'));
      }
      this.pending.clear();
    });
  }
  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.once('open', resolve);
      socket.once('error', reject);
    });
    return new Cdp(socket);
  }
  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, callback) {
    if (!this.events.has(method)) this.events.set(method, []);
    this.events.get(method).push(callback);
  }
  close() {
    this.socket.close();
  }
}

async function evaluate(fn, ...args) {
  const result = await page.send('Runtime.evaluate', {
    expression: `(${fn.toString()})(...${JSON.stringify(args)})`,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(fn, description = 'UI condition') {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(fn)) return;
    } catch (error) {
      if (!/context|navigation/i.test(error.message)) throw error;
    }
    await delay(40);
  }
  throw Error(`Timeout: ${description}`);
}

async function click(label, index = 0) {
  await evaluate(
    (label, index) => {
      const elements = Array.from(document.querySelectorAll('button')).filter(
        button => button.getAttribute('aria-label') === label || button.textContent.trim() === label,
      );
      const button = elements[index];
      if (!button) throw Error(`Missing button: ${label} (${index})`);
      if (button.disabled) throw Error(`Disabled button: ${label}`);
      button.click();
    },
    label,
    index,
  );
  await delay(60);
}

async function fillField(label, value) {
  await evaluate(
    (label, value) => {
      const wrapper = Array.from(document.querySelectorAll('label.field')).find(
        element => element.querySelector('.field-label')?.textContent.trim() === label,
      );
      const input = wrapper?.querySelector('input,select,textarea');
      if (!input) throw Error(`Missing field: ${label}`);
      const prototype =
        input instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    },
    label,
    value,
  );
  await delay(30);
}

async function fillLabel(label, value) {
  await evaluate(
    (label, value) => {
      const input = document.querySelector(`[aria-label="${label}"]`);
      if (!input) throw Error(`Missing control: ${label}`);
      const prototype =
        input instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    },
    label,
    value,
  );
  await delay(40);
}

async function press(key, modifiers = 0) {
  const values = { Enter: 13, Tab: 9, Escape: 27 };
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key,
    code: key,
    windowsVirtualKeyCode: values[key],
    modifiers,
    ...(key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {}),
  });
  await page.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code: key,
    windowsVirtualKeyCode: values[key],
    modifiers,
  });
  await delay(50);
}

async function screenshot(name) {
  await delay(80);
  const image = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await fs.writeFile(path.join(output, `${name}.png`), Buffer.from(image.data, 'base64'));
}

async function noOverflow() {
  assert.equal(
    await evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'Viewport must not scroll horizontally.',
  );
  assert.equal(
    await evaluate(() => {
      const button = document.querySelector('.send-button');
      return !button || button.scrollHeight <= button.clientHeight + 1;
    }),
    true,
    'Send/stop button content must fit inside its circular control.',
  );
}

async function step(name, run) {
  const started = Date.now();
  await run();
  results.push({ name, passed: true, elapsedMs: Date.now() - started });
  console.log(`PASS ${name}`);
}

try {
  await fs.mkdir(output, { recursive: true });
  await fs.access(chromePath);
  try {
    await fetch(baseUrl, { signal: AbortSignal.timeout(1500) });
  } catch {
    previewProcess = spawn(process.execPath, ['scripts/preview.mjs'], {
      cwd: root,
      windowsHide: true,
      stdio: 'ignore',
    });
    const deadline = Date.now() + 10000;
    while (true) {
      try {
        await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
        break;
      } catch {
        if (Date.now() > deadline) throw Error('Local UI preview failed to start.');
        await delay(80);
      }
    }
  }
  await fs.mkdir(profile, { recursive: true });
  chromeProcess = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-extensions',
      '--no-pings',
      '--metrics-recording-only',
      '--safebrowsing-disable-auto-update',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  chromeProcess.stderr.on('data', chunk => {
    chromeLog += String(chunk);
  });
  chromeProcess.on('error', error => {
    chromeLog += error.message;
  });
  let port;
  let browserPath;
  const deadline = Date.now() + 20000;
  while (!port) {
    try {
      const data = (await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
      port = data[0];
      browserPath = data[1];
    } catch {
      if (Date.now() > deadline) throw Error(`Headless Chrome startup timeout: ${chromeLog.slice(-2000)}`);
      await delay(100);
    }
  }
  browser = await Cdp.connect(`ws://127.0.0.1:${port}${browserPath}`);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  page = await Cdp.connect(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  page.on('Runtime.exceptionThrown', params =>
    runtimeErrors.push(params.exceptionDetails.exception?.description || params.exceptionDetails.text),
  );
  page.on('Runtime.consoleAPICalled', params => {
    if (params.type === 'error') runtimeErrors.push(params.args.map(arg => arg.value || arg.description).join(' '));
  });
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 360,
    height: 860,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send('Page.navigate', { url: `${baseUrl}?empty` });
  await waitFor(() => !!window.apeiriaPreview && !!document.querySelector('.empty-chat'), 'initial empty chat');

  await step('360px empty state and disabled composer', async () => {
    assert.equal(await evaluate(() => document.querySelector('[aria-label="发送消息"]').disabled), true);
    assert.equal(await evaluate(() => document.querySelector('[aria-label="消息"]').disabled), true);
    await noOverflow();
    await screenshot('empty-360');
  });

  await step('gear opens provider settings; keyboard focus is usable', async () => {
    await click('模型与设置');
    assert.equal(await evaluate(() => document.querySelector('h1').textContent), '设置');
    await click('添加');
    assert.equal(await evaluate(() => document.activeElement.id), 'provider-label');
    await press('Tab');
    assert.equal(
      await evaluate(() => document.activeElement.closest('label')?.querySelector('.field-label')?.textContent),
      '渠道 ID',
    );
    await noOverflow();
    await screenshot('provider-openai-360');
  });

  await step('OpenAI Chat Completions save and credential masking', async () => {
    await fillField('渠道名称', 'UI 验收渠道');
    await fillField('渠道 ID', 'smoke-chat');
    await fillField('基础 URL', 'http://127.0.0.1:9999/v1');
    await fillField('API Key', 'fake-ui-smoke-key');
    await fillField('模型 ID', 'fixture-model');
    await fillField('显示名称', 'Fixture Model');
    await fillField('上下文容量', '200000');
    await fillField('输出上限', '16000');
    await fillLabel('模型 1 思考预设', 'low-medium-high');
    await click('保存渠道');
    await waitFor(
      () => window.apeiriaPreview.state.providers.length === 1 && !document.querySelector('.provider-editor'),
      'provider saved',
    );
    assert.equal(await evaluate(() => window.apeiriaPreview.state.providers[0].type), 'chat-completions');
    await click('编辑');
    assert.equal(
      await evaluate(
        () =>
          Array.from(document.querySelectorAll('label.field'))
            .find(label => label.querySelector('.field-label').textContent === 'API Key')
            .querySelector('input').value,
      ),
      '',
    );
    assert.equal(
      await evaluate(() =>
        Array.from(document.querySelectorAll('label.field'))
          .find(label => label.querySelector('.field-label').textContent === 'API Key')
          .querySelector('input')
          .placeholder.includes('已安全保存'),
      ),
      true,
    );
    assert.equal(
      await evaluate(() => document.querySelector('[aria-label="模型 1 思考预设"]').value),
      'low-medium-high',
    );
    assert.equal(await evaluate(() => !!window.apeiriaPreview.state.providers[0].apiKey), false);
  });

  await step('Responses protocol, request headers, and manual connection test', async () => {
    await fillField('接口协议', 'responses');
    await evaluate(() => {
      document.querySelector('.advanced-settings').open = true;
    });
    await click('添加请求头');
    await fillLabel('请求头 1 名称', 'x-fixture');
    await fillLabel('请求头 1 值', 'fake-ui-smoke-header');
    await click('测试连接');
    await waitFor(
      () => document.querySelector('.notice')?.textContent.includes('模拟连接测试通过'),
      'manual connection result',
    );
    await click('保存渠道');
    await waitFor(() => !document.querySelector('.provider-editor'), 'Responses saved');
    assert.equal(await evaluate(() => window.apeiriaPreview.state.providers[0].type), 'responses');
    await click('编辑');
    await evaluate(() => {
      document.querySelector('.advanced-settings').open = true;
    });
    assert.equal(await evaluate(() => document.querySelector('[aria-label="请求头 1 值"]').value), '');
    assert.equal(await evaluate(() => document.querySelector('[aria-label="请求头 1 名称"]').value), 'x-fixture');
    await evaluate(() => {
      const container = document.querySelector('.settings-page');
      container.scrollTop = container.scrollHeight;
    });
    await noOverflow();
    await screenshot('provider-responses-360');
    await click('取消');
  });

  await step('Vertex JSON import, defaults, model capabilities, and masking', async () => {
    await click('添加');
    await fillField('渠道名称', 'Vertex UI 验收');
    await fillField('渠道 ID', 'smoke-vertex');
    await fillField('提供商类型', 'vertex');
    assert.equal(
      await evaluate(
        () =>
          Array.from(document.querySelectorAll('label.checkbox'))
            .find(label => label.textContent.includes('支持图片输入'))
            .querySelector('input').checked,
      ),
      true,
    );
    await click('导入文件');
    await waitFor(
      () => document.querySelector('[aria-label="服务账号 JSON"]').value.includes('client_email'),
      'Vertex imported JSON',
    );
    assert.equal(
      await evaluate(
        () =>
          Array.from(document.querySelectorAll('label.field'))
            .find(label => label.querySelector('.field-label').textContent === 'Google Cloud 项目 ID')
            .querySelector('input').value,
      ),
      'example-project',
    );
    assert.equal(
      await evaluate(
        () =>
          Array.from(document.querySelectorAll('label.field'))
            .find(label => label.querySelector('.field-label').textContent === 'Vertex AI 地区')
            .querySelector('input').value,
      ),
      'global',
    );
    await fillField('模型 ID', 'gemini-ui-fixture');
    await fillField('显示名称', 'Gemini UI');
    await noOverflow();
    await screenshot('provider-vertex-360');
    await evaluate(() => {
      const container = document.querySelector('.settings-page');
      container.scrollTop = container.scrollHeight;
    });
    await screenshot('provider-vertex-models-360');
    await click('保存渠道');
    await waitFor(
      () => window.apeiriaPreview.state.providers.length === 2 && !document.querySelector('.provider-editor'),
      'Vertex saved',
    );
    await click('编辑', 1);
    assert.equal(await evaluate(() => document.querySelector('[aria-label="服务账号 JSON"]').value), '');
    assert.equal(
      await evaluate(() => document.querySelector('[aria-label="服务账号 JSON"]').placeholder.includes('已安全保存')),
      true,
    );
    await screenshot('provider-vertex-masked-360');
    await click('返回聊天');
  });

  await step('model and effort selection; attachment add and removal', async () => {
    const model = 'thirdparty/smoke-vertex/gemini-ui-fixture';
    await fillLabel('选择模型', model);
    await waitFor(() => window.apeiriaPreview.state.model.includes('smoke-vertex'), 'model selected');
    await fillLabel('思考档位', 'high');
    assert.equal(await evaluate(() => window.apeiriaPreview.state.effort), 'high');
    await click('引用编辑器选区');
    await click('附加文件或图片');
    assert.equal(await evaluate(() => document.querySelectorAll('.attachment').length), 2);
    await click('移除 example.ts');
    assert.equal(await evaluate(() => document.querySelectorAll('.attachment').length), 1);
    await noOverflow();
  });

  await step('Enter submits and busy state locks model and new conversation', async () => {
    await evaluate(() => document.querySelector('[aria-label="消息"]').focus());
    await page.send('Input.insertText', { text: '请检查 UI 键盘交互。' });
    await press('Enter');
    await waitFor(() => window.apeiriaPreview.state.busy, 'mock generation started');
    assert.equal(await evaluate(() => document.querySelector('[aria-label="选择模型"]').disabled), true);
    assert.equal(await evaluate(() => document.querySelector('[aria-label="新建对话"]').disabled), true);
    assert.equal(await evaluate(() => !!document.querySelector('[aria-label="停止生成"]')), true);
    await screenshot('generation-360');
    await waitFor(() => !window.apeiriaPreview.state.busy, 'mock generation ended');
    assert.equal(
      await evaluate(() =>
        window.apeiriaPreview.state.items.some(item => item.role === 'user' && item.text === '请检查 UI 键盘交互。'),
      ),
      true,
    );
  });

  await step('mock streaming deltas and safe message markup', async () => {
    await evaluate(() => {
      const preview = window.apeiriaPreview;
      preview.state.busy = true;
      preview.state.items.push({
        id: 'stream-ui-fixture',
        type: 'agentMessage',
        role: 'assistant',
        text: '流式第一段',
      });
      preview.update();
    });
    await waitFor(() => document.querySelector('.messages').textContent.includes('流式第一段'), 'first streamed chunk');
    await evaluate(() => {
      const preview = window.apeiriaPreview;
      preview.state.items.find(item => item.id === 'stream-ui-fixture').text +=
        '，随后补齐第二段。\n\n```ts\nconst safe = "<img src=x>";';
      preview.update();
    });
    await waitFor(
      () => document.querySelector('.messages').textContent.includes('随后补齐第二段'),
      'second streamed chunk',
    );
    assert.equal(await evaluate(() => document.querySelectorAll('#app img').length), 0);
    assert.equal(await evaluate(() => document.querySelectorAll('.code-block').length > 0), true);
    await screenshot('streaming-360');
    await click('停止生成');
    await waitFor(() => !window.apeiriaPreview.state.busy, 'stop generation');
  });

  await step('command approval and user question submission', async () => {
    await evaluate(() => window.apeiriaPreview.approval());
    await waitFor(() => !!document.querySelector('.approval-card'), 'command approval');
    await noOverflow();
    await screenshot('approval-360');
    await click('本会话允许');
    await waitFor(() => window.apeiriaPreview.state.pending.length === 0, 'command approval resolved');
    await evaluate(() => window.apeiriaPreview.question());
    await waitFor(() => !!document.querySelector('.approval-question'), 'user question');
    await evaluate(() => document.querySelector('.question-options > button').click());
    await click('提交回答');
    await waitFor(() => window.apeiriaPreview.state.pending.length === 0, 'question resolved');
  });

  await step('wide and narrow chat screenshots with tool output and file differences', async () => {
    await page.send('Page.navigate', { url: baseUrl });
    await waitFor(() => !!document.querySelector('.change-row'), 'fixture chat loaded');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 1000,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await noOverflow();
    await screenshot('chat-1000');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 860,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await noOverflow();
    await screenshot('chat-360');
    await click('查看差异');
    await waitFor(() => document.querySelector('.notice')?.textContent.includes('openDiff'), 'file difference action');
  });

  await step('history search, rename, archive, and resume', async () => {
    await click('对话历史');
    await waitFor(() => document.querySelectorAll('.thread-card').length === 2, 'history list');
    await fillLabel('搜索对话', '梳理');
    assert.equal(await evaluate(() => document.querySelectorAll('.thread-card').length), 1);
    await fillLabel('搜索对话', '');
    await click('重命名', 0);
    await fillLabel('对话名称', 'UI 验收历史');
    await click('保存名称');
    await waitFor(() => document.querySelector('.thread-open strong').textContent === 'UI 验收历史', 'thread renamed');
    await click('归档对话', 1);
    await waitFor(() => document.querySelectorAll('.thread-card').length === 1, 'thread archived');
    await noOverflow();
    await screenshot('history-360');
    await evaluate(() => document.querySelector('.thread-open').click());
    await waitFor(() => !!document.querySelector('.chat-page'), 'thread resumed');
  });

  await step('tool settings, permissions, usage, and independent management actions', async () => {
    await click('模型与设置');
    await click('工具与权限');
    await fillField('默认权限', 'read-only');
    assert.equal(await evaluate(() => window.apeiriaPreview.state.permissions), 'read-only');
    await click('打开配置');
    await waitFor(() => document.querySelector('.notice')?.textContent.includes('openMcp'), 'MCP management action');
    await click('管理技能');
    await waitFor(() => document.querySelector('.notice')?.textContent.includes('openSkills'), 'skills action');
    assert.equal(await evaluate(() => !!document.querySelector('.usage-card pre')), true);
    await noOverflow();
    await screenshot('tools-360');
  });

  assert.deepEqual(runtimeErrors, [], 'Headless UI must not emit runtime exceptions or console errors.');
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      {
        passed: true,
        browser: await browser.send('Browser.getVersion'),
        viewport: '360x860 and 1000x900',
        tests: results,
        runtimeErrors,
      },
      null,
      2,
    ),
  );
  console.log(`UI smoke passed ${results.length} scenarios. Screenshots and report: ${output}`);
} catch (error) {
  if (page) await screenshot('failure').catch(() => {});
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(
    path.join(output, 'report.json'),
    JSON.stringify(
      { passed: false, tests: results, error: error.stack, runtimeErrors, chromeLog: chromeLog.slice(-4000) },
      null,
      2,
    ),
  );
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  if (browser) await browser.send('Browser.close').catch(() => {});
  page?.close();
  browser?.close();
  if (chromeProcess && chromeProcess.exitCode === null) {
    await Promise.race([new Promise(resolve => chromeProcess.once('exit', resolve)), delay(3000)]);
    if (chromeProcess.exitCode === null) chromeProcess.kill();
  }
  previewProcess?.kill();
  const resolvedProfile = path.resolve(profile);
  if (
    resolvedProfile.startsWith(path.resolve(output) + path.sep) &&
    path.basename(resolvedProfile).startsWith('headless-profile-')
  ) {
    await fs
      .rm(resolvedProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      .catch(error => console.warn(`Temporary profile cleanup: ${error.message}`));
  }
}
