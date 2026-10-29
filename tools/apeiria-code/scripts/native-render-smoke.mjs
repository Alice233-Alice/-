/** Inspect only the separately launched, isolated VS Code test instance on port 19378. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const endpoint = 'http://127.0.0.1:19378';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-output', 'native-vscode');
const configureFixtureMode = process.argv.includes('--configure-fixture');
const resaveFixtureMode = process.argv.includes('--resave-fixture');
const requireNoStatsigErrors = process.argv.includes('--no-statsig-errors');
const fixtureMode = process.argv.includes('--fixture') || configureFixtureMode || resaveFixtureMode;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const report = { passed: false, endpoint, fixtureMode, configureFixtureMode, resaveFixtureMode, startedAt: new Date().toISOString(), checks: [], errors: [], runtimeErrors: [], consoleErrors: [], targets: [], documents: [], interactions: [] };
let cdp;

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.on('message', raw => {
      const message = JSON.parse(String(raw));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
      } else for (const listener of this.listeners.get(message.method) || []) listener(message.params, message.sessionId);
    });
    socket.on('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(Error('Isolated VS Code debugging socket closed.'));
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
  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(listener);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(Error(`CDP timeout: ${method}`));
      }, 7000);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
}

const sessions = new Map();
const initializing = new Set();
async function registerSession(sessionId, targetInfo) {
  if (sessions.has(sessionId) || sessionsHasTarget(targetInfo.targetId)) return;
  const session = { sessionId, targetInfo, contexts: new Map(), errors: [] };
  sessions.set(sessionId, session);
  const work = Promise.allSettled([
    cdp.send('Runtime.enable', {}, sessionId),
    ...(['page', 'iframe', 'webview'].includes(targetInfo.type) ? [cdp.send('Page.enable', {}, sessionId)] : []),
    cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true }, sessionId),
  ]).then(results => {
    for (const result of results) if (result.status === 'rejected') session.errors.push(result.reason.message);
  });
  initializing.add(work);
  await work;
  initializing.delete(work);
}

async function evaluate(session, expression, contextId) {
  const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, ...(contextId ? { contextId } : {}) }, session.sessionId);
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

function inspectDocument() {
  if (typeof document === 'undefined') return null;
  const visible = element => !!(element.getBoundingClientRect().width && element.getBoundingClientRect().height) && getComputedStyle(element).visibility !== 'hidden';
  const label = element => [element.getAttribute('aria-label'), element.getAttribute('title'), element.getAttribute('data-testid'), element.textContent?.trim()].filter(Boolean).join(' | ').slice(0, 500);
  const controls = [...document.querySelectorAll('button,[role="button"],[role="combobox"],[role="menuitem"],[role="menuitemradio"],[role="option"],select,input,textarea,[contenteditable="true"]')].filter(visible).map(element => ({ tag: element.tagName, role: element.getAttribute('role'), label: label(element), className: element.className?.baseVal ?? element.className, contenteditable: element.getAttribute('contenteditable'), placeholder: element.getAttribute('placeholder'), selected: element.getAttribute('aria-selected') ?? element.getAttribute('aria-checked') ?? element.getAttribute('data-state'), html: element.outerHTML.slice(0, 1000) }));
  return { url: location.href, title: document.title, mode: document.documentElement.dataset.apeiriaMode, readyState: document.readyState, bodyClass: document.body?.className, performance: { timeOrigin: performance.timeOrigin, observedMs: Math.round(performance.now()), navigation: performance.getEntriesByType('navigation').map(entry => ({ domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd), loadMs: Math.round(entry.loadEventEnd) })) }, text: document.body?.innerText?.slice(0, 30000) || '', oldVueShell: !!document.querySelector('.app-shell,.chat-page'), rootChildren: document.querySelector('#root')?.childElementCount || 0, controls, menus: [...document.querySelectorAll('[role="menu"],[role="listbox"],[role="dialog"],[data-radix-popper-content-wrapper]')].filter(visible).map(element => ({ role: element.getAttribute('role'), text: element.innerText?.slice(0, 12000) })), iframes: [...document.querySelectorAll('iframe')].map(element => ({ src: element.src, title: element.title, className: element.className })), scripts: [...document.scripts].map(element => element.src).filter(Boolean).slice(0, 20) };
}

async function discover() {
  const { targetInfos } = await cdp.send('Target.getTargets');
  report.targets = targetInfos.map(({ targetId, type, title, url, attached }) => ({ targetId, type, title, url, attached }));
  for (const info of targetInfos.filter(info => ['page', 'iframe', 'webview'].includes(info.type))) {
    if (sessionsHasTarget(info.targetId)) continue;
    try {
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: info.targetId, flatten: true });
      await registerSession(sessionId, info);
    } catch (error) { report.errors.push(`Attach ${info.type}: ${error.message}`); }
  }
  await Promise.allSettled([...initializing]);
}

function sessionsHasTarget(targetId) {
  return [...sessions.values()].some(session => session.targetInfo.targetId === targetId);
}

function isApeiriaDocument(document) {
  return /[?&]extensionId=ayanami-local\.apeiria-code(?:&|$)/i.test(document.url) || /[?&]extensionId=ayanami-local\.apeiria-code(?:&|$)/i.test(sessions.get(document.sessionId)?.targetInfo.url || '');
}

async function readDocuments() {
  const documents = [];
  for (const session of sessions.values()) {
    if (!['page', 'iframe', 'webview'].includes(session.targetInfo.type)) continue;
    const defaults = [...session.contexts.values()].filter(context => context.auxData?.isDefault);
    for (const context of defaults.length ? defaults : [{ id: undefined }]) {
      try {
        const document = await evaluate(session, `(${inspectDocument.toString()})()`, context.id);
        if (!document?.url) continue;
        documents.push({ sessionId: session.sessionId, targetId: session.targetInfo.targetId, contextId: context.id, ...document });
      } catch (error) {
        if (!/context|target|session|closed|destroyed/i.test(error.message)) report.errors.push(`Read document: ${error.message}`);
      }
    }
  }
  report.documents = documents;
  return documents;
}

const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); };
const sessionOf = document => sessions.get(document.sessionId);
async function clickControl(document, kind) {
  const result = await evaluate(sessionOf(document), `(${function (kind) {
    const visible = element => !!(element.getBoundingClientRect().width && element.getBoundingClientRect().height);
    const elements = [...document.querySelectorAll('button,[role="button"],[role="combobox"]')].filter(visible);
    const describe = element => [element.getAttribute('aria-label'), element.getAttribute('title'), element.getAttribute('data-testid'), element.textContent].filter(Boolean).join(' ');
    const expression = kind === 'settings' ? /settings|设置|設定|gear/i : /select.*model|model.*select|模型|gpt-|claude|gemini|模型目录|model|fixture.native/i;
    const element = elements.find(element => expression.test(describe(element))) || (kind === 'settings' ? elements.find(element => !describe(element).trim() && element.querySelector('svg path[d^="M9.99944 7.24939"]')) : undefined);
    if (!element) return { clicked: false, available: elements.map(describe) };
    element.click();
    return { clicked: true, label: describe(element) };
  }.toString()})(${JSON.stringify(kind)})`, document.contextId);
  report.interactions.push({ action: `click ${kind}`, ...result });
  await delay(400);
  if (kind === 'settings') {
    const current = await refreshDocument(document);
    if (!current?.menus.length) {
      const pointer = await evaluate(sessionOf(document), `(${function () {
        const element = [...document.querySelectorAll('button')].find(element => element.getBoundingClientRect().width && element.querySelector('svg path[d^="M9.99944 7.24939"]'));
        if (!element) return false;
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 }));
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
        return true;
      }.toString()})()`, document.contextId);
      report.interactions.push({ action: 'open native settings with pointer events', dispatched: pointer });
      await delay(400);
    }
  }
  return result;
}

async function escape(document) {
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, document.sessionId);
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, document.sessionId);
  await delay(150);
}

async function refreshDocument(document) {
  return (await readDocuments()).find(candidate => candidate.sessionId === document.sessionId && candidate.contextId === document.contextId);
}

async function saveWorkbenchScreenshot(name) {
  const workbench = [...sessions.values()].find(session => /workbench.*\.html/i.test(session.targetInfo.url));
  const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, workbench.sessionId);
  await fs.writeFile(path.join(output, name), Buffer.from(screenshot.data, 'base64'));
  return name;
}

async function clickText(document, text) {
  const result = await evaluate(sessionOf(document), `(${function (text) {
    const elements = [...document.querySelectorAll('button,[role="button"],[role="menuitem"]')].filter(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    const describe = element => [element.getAttribute('aria-label'), element.textContent].filter(Boolean).join(' ').trim();
    const element = elements.filter(element => describe(element).includes(text)).sort((a, b) => describe(a).length - describe(b).length)[0];
    if (!element) return { clicked: false, available: elements.map(describe) };
    element.click();
    return { clicked: true, label: describe(element) };
  }.toString()})(${JSON.stringify(text)})`, document.contextId);
  report.interactions.push({ action: `click ${text}`, ...result });
  await delay(300);
  return result;
}

async function configureFixture(native) {
  const source = JSON.parse(await fs.readFile(path.join(output, 'fixture-config.json'), 'utf8'));
  const config = { ...source, models: source.models.map(model => typeof model === 'string' ? { id: model, ...source.modelMetadata?.[model] } : model) };
  check('configuration fixture uses a local service only', ['127.0.0.1', 'localhost'].includes(new URL(config.baseUrl).hostname));
  check('configuration fixture supplies two distinct native models', Array.isArray(config.models) && config.models.length === 2 && config.models[0].id !== config.models[1].id);
  report.requestsBeforeConfiguration = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length;
  check('empty profile has sent no fixture model request', report.requestsBeforeConfiguration === 0);
  const emptyControl = await clickControl(native, 'model');
  report.emptyModelMenu = await refreshDocument(native);
  check('empty profile exposes no selectable models or placeholder model', !report.emptyModelMenu.controls.some(control => control.role === 'menuitemradio') && !/apeiria-no-models-configured|Fixture Native [AB]/.test(report.emptyModelMenu.text));
  report.emptyModelControlHidden = !emptyControl.clicked;
  report.emptyScreenshot = await saveWorkbenchScreenshot('native-empty.png');
  await escape(native);
  check('native gear opens before configuring providers', (await clickControl(native, 'settings')).clicked);
  report.emptySettingsMenu = await refreshDocument(native);
  check('native gear exposes model providers from an empty profile', /模型提供商/.test(report.emptySettingsMenu.text));
  check('model providers can be opened through the native gear', (await clickText(native, '模型提供商')).clicked);
  let provider;
  for (let attempt = 0; attempt < 35; attempt++) {
    await discover();
    provider = (await readDocuments()).find(document => document.mode === 'providers' && /模型提供商/.test(document.text));
    if (provider) break;
    await delay(200);
  }
  check('separate provider manager visibly opens from the native gear', !!provider);
  report.providerInitial = provider;
  check('provider manager initially shows an empty provider list', /添加第一个模型渠道/.test(provider.text));
  check('provider manager can add its first provider', (await clickText(provider, '添加模型提供商')).clicked);
  const fill = await evaluate(sessionOf(provider), `(${function (config) {
    const setValue = (element, value) => {
      if (!element) throw Error('Missing provider form field');
      const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, String(value));
      element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    };
    const byLabel = text => [...document.querySelectorAll('label.field')].find(element => element.querySelector('.field-label')?.textContent.trim() === text)?.querySelector('input,select');
    setValue(byLabel('渠道名称'), config.label || 'Native Fixture');
    setValue(byLabel('渠道 ID'), config.id || 'native-smoke');
    setValue(document.querySelector('[aria-label="接口协议"]'), 'responses');
    setValue(byLabel('基础 URL'), config.baseUrl);
    return true;
  }.toString()})(${JSON.stringify(config)})`, provider.contextId);
  check('provider connection fields can be filled through the form', fill);
  check('provider manager can add a second model row', (await clickText(provider, '添加模型')).clicked);
  await evaluate(sessionOf(provider), `(${function (models) {
    const setValue = (element, value) => {
      if (!element) throw Error('Missing model form field');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
      element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const rows = [...document.querySelectorAll('.model-editor')];
    models.forEach((model, index) => {
      const row = rows[index];
      setValue(row.querySelector('input[placeholder="提供商的模型 ID"]'), model.id);
      setValue(row.querySelector('input[placeholder="可选，显示于模型菜单"]'), model.displayName || model.name || model.id);
      if (model.contextWindow) setValue(row.querySelectorAll('input[type="number"]')[0], model.contextWindow);
      if (model.maxOutputTokens) setValue(row.querySelectorAll('input[type="number"]')[1], model.maxOutputTokens);
      const reasoning = row.querySelector('select');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(reasoning, 'default');
      reasoning.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }.toString()})(${JSON.stringify(config.models)})`, provider.contextId);
  report.providerFilled = await refreshDocument(provider);
  report.requestsBeforeSave = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length;
  check('filling the provider form sends no generation request', report.requestsBeforeSave === 0);
  check('provider can be saved through its form', (await clickText(provider, '保存渠道')).clicked);
  let saved;
  for (let attempt = 0; attempt < 45; attempt++) {
    saved = await refreshDocument(provider);
    if (/渠道已保存/.test(saved?.text || '')) break;
    await delay(200);
  }
  check('provider form visibly confirms a successful save', /渠道已保存/.test(saved?.text || ''));
  report.providerSaved = saved;
  report.requestsAfterSave = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length;
  check('saving the provider sends no generation request', report.requestsAfterSave === 0);
  report.providerScreenshot = await saveWorkbenchScreenshot('native-provider-saved.png');
  check('provider manager returns to the native chat', (await clickText(provider, '返回聊天')).clicked);
  await delay(500);
  const refreshed = await refreshDocument(native);
  check('provider save preserves the original native sidebar instance', !!refreshed && refreshed.targetId === native.targetId && refreshed.contextId === native.contextId);
  report.configuredThroughUi = true;
  return refreshed;
}

async function chooseFixtureB(document) {
  check('fixture catalogue exposes both configured native models', /Fixture Native A/.test(document.text) && /Fixture Native B/.test(document.text));
  for (const name of ['Fixture Native A', 'Fixture Native B']) {
    const selection = await evaluate(sessionOf(document), `(${function (name) {
      const elements = [...document.querySelectorAll('button,[role="option"],[role="menuitem"],[role="menuitemradio"]')].filter(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
      const describe = element => [element.getAttribute('aria-label'), element.textContent].filter(Boolean).join(' ').trim();
      const options = elements.filter(element => describe(element).includes(name)).sort((a, b) => describe(a).length - describe(b).length);
      const option = options[0];
      if (!option) return { clicked: false, available: elements.map(describe) };
      option.click();
      return { clicked: true, label: describe(option) };
    }.toString()})(${JSON.stringify(name)})`, document.contextId);
    report.interactions.push({ action: `select ${name}`, ...selection });
    check(`${name} can be selected in the native model menu`, selection.clicked);
    await delay(300);
    let selected = await refreshDocument(document);
    if (!selected?.controls.some(control => control.role === 'menuitemradio')) {
      check(`native model menu reopens after selecting ${name}`, (await clickControl(document, 'model')).clicked);
      selected = await refreshDocument(document);
    }
    check(`native model menu confirms selected model ${name}`, selected?.controls.some(control => control.role === 'menuitemradio' && control.selected === 'true' && control.label.includes(name)));
    report.fixtureSelectedModel = selected.controls.find(control => control.role === 'menuitemradio' && control.selected === 'true' && control.label.includes(name));
    document = selected;
  }
}

async function resaveFixture(native) {
  const before = await refreshDocument(native);
  check('existing conversation is visible before provider resave', before.text.includes('Apeiria native UI smoke test') && before.text.includes('Apeiria native UI fixture reply'));
  const requestsBefore = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length;
  check('native settings opens from the existing conversation', (await clickControl(native, 'settings')).clicked);
  check('existing conversation opens its provider manager', (await clickText(native, '模型提供商')).clicked);
  let provider;
  for (let attempt = 0; attempt < 40; attempt++) {
    await discover();
    provider = (await readDocuments()).find(document => document.mode === 'providers' && /Native Fixture/.test(document.text));
    if (provider) break;
    await delay(200);
  }
  check('saved provider can be edited from the conversation', !!provider && (await clickText(provider, '编辑')).clicked);
  await evaluate(sessionOf(provider), `(${function () {
    const input = document.querySelector('#provider-label');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Native Fixture Updated');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }.toString()})()`, provider.contextId);
  check('updated provider label can be saved', (await clickText(provider, '保存渠道')).clicked);
  let saved;
  for (let attempt = 0; attempt < 70; attempt++) {
    saved = await refreshDocument(provider);
    if (/渠道已保存/.test(saved?.text || '') && /Native Fixture Updated/.test(saved.text)) break;
    await delay(200);
  }
  check('provider resave visibly completes after restarting its backend', /渠道已保存/.test(saved?.text || '') && /Native Fixture Updated/.test(saved.text));
  report.providerResaved = saved;
  report.resaveScreenshot = await saveWorkbenchScreenshot('native-provider-resaved.png');
  check('resaving the provider sends no generation request', JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length === requestsBefore);
  check('provider resave can return to the existing native chat', (await clickText(provider, '返回聊天')).clicked);
  const after = await refreshDocument(native);
  check('original thread and its first reply survive provider resave', after?.text.includes('Apeiria native UI smoke test') && after.text.includes('Apeiria native UI fixture reply') && after.title === before.title);
  report.retainedConversation = after;
  return after;
}

async function sendFixture(document, prompt = 'Apeiria native UI smoke test') {
  const expectedReply = 'Apeiria native UI fixture reply';
  const beforeText = (await refreshDocument(document)).text;
  const repliesBefore = beforeText.split(expectedReply).length - 1;
  const requestsBefore = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8')).length;
  await escape(document);
  const focused = await evaluate(sessionOf(document), `(${function () {
    const composer = [...document.querySelectorAll('[contenteditable="true"],textarea')].find(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height);
    if (!composer) return false;
    composer.focus();
    return document.activeElement === composer || composer.contains(document.activeElement);
  }.toString()})()`, document.contextId);
  check('native fixture composer accepts focus', focused);
  await cdp.send('Input.insertText', { text: prompt }, document.sessionId);
  await delay(200);
  const entered = await evaluate(sessionOf(document), `(${function () {
    return [...document.querySelectorAll('[contenteditable="true"],textarea')].filter(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height).map(element => element.value ?? element.innerText).join('\n');
  }.toString()})()`, document.contextId);
  check('fixture prompt is entered through the real native composer', entered.includes(prompt));
  report.fixturePrompt = prompt;
  const send = await evaluate(sessionOf(document), `(${function () {
    const elements = [...document.querySelectorAll('button,[role="button"]')].filter(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    const describe = element => [element.getAttribute('aria-label'), element.getAttribute('title'), element.getAttribute('data-testid'), element.textContent].filter(Boolean).join(' ');
    const button = elements.find(element => /send|submit|发送|發送|送出/i.test(describe(element)) || element.getAttribute('type') === 'submit');
    if (!button) return { clicked: false, available: elements.map(describe) };
    button.click();
    return { clicked: true, label: describe(button) };
  }.toString()})()`, document.contextId);
  report.interactions.push({ action: 'send local fixture prompt', ...send });
  if (!send.clicked) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, document.sessionId);
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, document.sessionId);
    report.interactions.push({ action: 'submit local fixture prompt with Enter' });
  }
  for (let attempt = 0; attempt < 90; attempt++) {
    const current = await refreshDocument(document);
    if (current?.text.includes(expectedReply) && current.text.split(expectedReply).length - 1 > repliesBefore) {
      const requests = JSON.parse(await fs.readFile(path.join(output, 'fixture-requests.json'), 'utf8'));
      if (requests.length <= requestsBefore) { await delay(350); continue; }
      report.fixtureConversation = current;
      report.fixtureUpstreamRequest = requests.at(-1);
      check('native send reaches the local fixture with the selected model B', requests.at(-1)?.model === 'fixture-native-b');
      check('no account authorization reaches the local fixture upstream', requests.at(-1)?.authorizationPresent === false);
      check('native conversation visibly renders the local fixture reply', true);
      check('native conversation visibly retains the submitted user prompt', current.text.includes(prompt));
      if (resaveFixtureMode) check('second reply retains the original conversation and first user prompt', current.text.includes('Apeiria native UI smoke test') && current.text.split(expectedReply).length - 1 >= 2);
      return;
    }
    await delay(350);
  }
  throw Error(`Native UI did not display the local fixture reply: ${expectedReply}`);
}

try {
  await fs.mkdir(output, { recursive: true });
  if (resaveFixtureMode) {
    const previous = JSON.parse(await fs.readFile(path.join(output, 'native-render-report.json'), 'utf8'));
    check('initial empty-profile UI configuration already passed', previous.passed && previous.configuredThroughUi);
    await fs.copyFile(path.join(output, 'native-render-report.json'), path.join(output, 'native-render-configure-report.json'));
    await fs.copyFile(path.join(output, 'native-sidebar.png'), path.join(output, 'native-configure-sidebar.png'));
    report.initialConfigurationReport = 'native-render-configure-report.json';
  }
  let version;
  const deadline = Date.now() + Number(process.env.APEIRIA_RENDER_WAIT_MS || 90000);
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${endpoint}/json/version`, { signal: AbortSignal.timeout(1500) });
      version = await response.json();
      if (version.webSocketDebuggerUrl) break;
    } catch {}
    await delay(300);
  }
  check('isolated debugging endpoint is available', !!version?.webSocketDebuggerUrl);
  check('debugging endpoint remains loopback on the dedicated test port', /^ws:\/\/(127\.0\.0\.1|localhost):19378\//.test(version.webSocketDebuggerUrl));
  report.browser = version.Browser;
  cdp = await Cdp.connect(version.webSocketDebuggerUrl);
  cdp.on('Runtime.executionContextCreated', ({ context }, sessionId) => sessions.get(sessionId)?.contexts.set(context.id, context));
  cdp.on('Runtime.executionContextDestroyed', ({ executionContextId }, sessionId) => sessions.get(sessionId)?.contexts.delete(executionContextId));
  cdp.on('Runtime.executionContextsCleared', (_, sessionId) => sessions.get(sessionId)?.contexts.clear());
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }, sessionId) => report.runtimeErrors.push({ sessionId, text: exceptionDetails.text, description: exceptionDetails.exception?.description, url: exceptionDetails.url, lineNumber: exceptionDetails.lineNumber }));
  cdp.on('Runtime.consoleAPICalled', ({ type, args }, sessionId) => {
    if (type === 'error') report.consoleErrors.push({ sessionId, text: args.map(arg => arg.value ?? arg.description).join(' ').slice(0, 3000) });
  });
  cdp.on('Target.attachedToTarget', ({ sessionId, targetInfo }) => { registerSession(sessionId, targetInfo).catch(error => report.errors.push(error.message)); });
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  await discover();
  check('connected target is the real VS Code workbench', report.targets.some(target => /workbench.*\.html/i.test(target.url)));
  let native;
  for (let attempt = 0; attempt < 160; attempt++) {
    await discover();
    const documents = await readDocuments();
    const loadFailure = documents.find(document => isApeiriaDocument(document) && (/An error occurred while loading view:\s*apeiriaCode\.native\./.test(document.text) || /Codex could not start/.test(document.title)));
    if (loadFailure) {
      report.nativeLoadFailure = loadFailure;
      throw Error(loadFailure.text);
    }
    native = documents.find(document => isApeiriaDocument(document) && document.controls.some(control => control.contenteditable === 'true' || control.tag === 'TEXTAREA') && !document.oldVueShell);
    if (native) break;
    await delay(350);
  }
  check('native Codex webview has a visible composer', !!native);
  report.nativeDocument = native;
  report.timings = { driverUntilComposerMs: Date.now() - Date.parse(report.startedAt), nativeFrameObservedMs: native.performance.observedMs, nativeNavigation: native.performance.navigation };
  try { report.runnerReady = JSON.parse(await fs.readFile(path.join(output, 'render-ready.json'), 'utf8')); } catch {}
  check('native sidebar has no prototype Vue shell', !native.oldVueShell);
  check('native webview loads bundled React assets', native.scripts.some(src => /assets\/.*\.js/.test(src)) || native.rootChildren > 0);
  if (fixtureMode && !resaveFixtureMode && native.text.includes('Apeiria native UI fixture reply')) {
    check('previous fixture conversation can be left through New chat', (await clickText(native, 'New chat')).clicked);
    native = await refreshDocument(native);
    check('fixture starts with no previous fixture reply visible', !native.text.includes('Apeiria native UI fixture reply'));
  }
  if (configureFixtureMode) native = await configureFixture(native);
  if (resaveFixtureMode) native = await resaveFixture(native);
  const model = native.controls.find(control => /model|模型|gpt-|claude|gemini|fixture.native/i.test(control.label));
  check('native composer exposes a model control', !!model);
  report.modelControl = model;
  const modelClick = await clickControl(native, 'model');
  check('native model menu can be opened', modelClick.clicked);
  const modelDocuments = await readDocuments();
  const modelDocument = modelDocuments.find(document => document.sessionId === native.sessionId && document.contextId === native.contextId) || native;
  report.modelMenu = modelDocument;
  check('native model menu renders visible options or its empty catalogue', modelDocument.menus.length > native.menus.length || modelDocument.text !== native.text || modelDocument.controls.length > native.controls.length);
  if (fixtureMode) await chooseFixtureB(modelDocument);
  await escape(native);
  const settings = await clickControl(native, 'settings');
  check('native settings gear can be opened', settings.clicked);
  let documents = await readDocuments();
  const settingsDocument = documents.find(document => document.sessionId === native.sessionId && document.contextId === native.contextId) || native;
  report.settingsMenu = settingsDocument;
  check('native settings menu includes the independent model providers entry', /模型提供商/.test(settingsDocument.text));
  check('original native settings entries remain visible', /Settings|设置|設定|Keyboard|键盘|鍵盤|MCP|Documentation|文档|文件|Feedback|反馈|回饋|Theme|主题|主題|CLI|config\.toml/i.test(settingsDocument.text.replace('模型提供商', '')));
  const workbench = [...sessions.values()].find(session => /workbench.*\.html/i.test(session.targetInfo.url));
  let screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, workbench?.sessionId || native.sessionId);
  if (fixtureMode) {
    await fs.writeFile(path.join(output, 'native-settings.png'), Buffer.from(screenshot.data, 'base64'));
    report.settingsScreenshot = 'native-settings.png';
    await sendFixture(native, resaveFixtureMode ? 'Apeiria native UI smoke test after provider resave' : undefined);
    screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, workbench?.sessionId || native.sessionId);
  }
  await fs.writeFile(path.join(output, 'native-sidebar.png'), Buffer.from(screenshot.data, 'base64'));
  report.screenshot = 'native-sidebar.png';
  await delay(300);
  check('native webview has no uncaught runtime exception', !report.runtimeErrors.some(error => error.sessionId === native.sessionId));
  report.nativeConsoleErrors = report.consoleErrors.filter(error => error.sessionId === native.sessionId);
  if (requireNoStatsigErrors) check('native webview has no Statsig console error', !report.nativeConsoleErrors.some(error => /Statsig|ab\.chatgpt\.com/i.test(error.text)));
  report.passed = true;
} catch (error) {
  report.errors.push(error.stack || String(error));
  process.exitCode = 1;
  if (cdp) {
    try {
      await readDocuments();
      const workbench = [...sessions.values()].find(session => /workbench.*\.html/i.test(session.targetInfo.url));
      if (workbench) {
        const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, workbench.sessionId);
        await fs.writeFile(path.join(output, 'native-sidebar.png'), Buffer.from(screenshot.data, 'base64'));
        report.screenshot = 'native-sidebar.png';
      }
    } catch (captureError) { report.errors.push(`Failure evidence: ${captureError.message}`); }
  }
} finally {
  report.completedAt = new Date().toISOString();
  report.sessions = [...sessions.values()].map(({ sessionId, targetInfo, contexts, errors }) => ({ sessionId, targetInfo, contexts: [...contexts.values()], errors }));
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'native-render-report.json'), JSON.stringify(report, null, 2));
  cdp?.socket.close();
  console.log(`Apeiria native render: ${report.passed ? 'PASS' : 'FAIL'} (${report.checks.length} checks), ${path.join(output, 'native-render-report.json')}`);
}
