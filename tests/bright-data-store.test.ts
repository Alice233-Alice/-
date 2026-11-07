/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const YAML = require('yaml');
const lodash = require('lodash');
const vue = require('vue');
const pinia = require('pinia');
(globalThis as any)._ = lodash;
const schema = require('../src/灯火通明/schema');
const regions = require('../src/灯火通明/region-utils');
const worldEvents = require('../src/灯火通明/world-events');
const snapshotKey = '__踏月寻仙_last_valid_stat_data';
const openingText = fs.readFileSync('src/灯火阑珊/第一条消息/开局十九-沈倩宁.yaml', 'utf8');
const opening = schema.Schema.parse(YAML.parse(openingText.match(/<initvar>([\s\S]*?)<\/initvar>/)[1]));
const state = (place: string, stones = 777) =>
  schema.Schema.parse({
    本尊: {
      灵石: stones,
      行踪: { 当前区域: place, 所属层级: '地层' },
      背包: { 古道灵茶: { 名称: '古道灵茶', 数量: 3 } },
    },
  });

// Run the actual store with real Vue, Pinia and Schema. Only the Tavern host,
// image loader and timers are simulated; no live chat or save is modified.
async function harness(
  floor: number,
  records: Map<number, any>,
  snapshot?: any,
  sourcePath = 'src/灯火通明/stores/data-store.ts',
) {
  const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const chat: any = snapshot
    ? { [snapshotKey]: lodash.cloneDeep(snapshot), __踏月寻仙_last_valid_stat_data_message_id: floor }
    : {};
  const handlers = new Map<string, Set<(...args: any[]) => void>>();
  const timers = new Map<number, () => void>();
  const writes: any[] = [];
  let timer = 0;
  const eventNames = { MESSAGE_UPDATED: 'updated', MESSAGE_DELETED: 'deleted', MESSAGE_RECEIVED: 'received' };
  const variables = (id: number) => lodash.cloneDeep(records.get(id) || {});
  const host: any = {
    exports: {},
    console: { ...console, warn: () => {} },
    _: lodash,
    ...vue,
    defineStore: pinia.defineStore,
    errorCatched: (fn: any) => fn,
    window: {
      frameElement: {
        isConnected: true,
        parentElement: null,
        closest: () => ({ getAttribute: () => String(floor) }),
        getBoundingClientRect: () => ({ width: 1000, height: 600 }),
      },
    },
    getCurrentMessageId: () => floor,
    getVariables: (o: any) => (o.type === 'chat' ? lodash.cloneDeep(chat) : variables(o.message_id)),
    replaceVariables: (value: any) => {
      Object.assign(chat, lodash.cloneDeep(value));
    },
    getChatMessages: (id: any) =>
      (typeof id === 'number' ? [id] : [...records.keys()].sort((a, b) => a - b)).map(message_id => ({
        message_id,
        message: '',
      })),
    waitGlobalInitialized: async () => {},
    tavern_events: eventNames,
    eventOn: (event: string, fn: any) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(fn);
      return { stop: () => handlers.get(event)!.delete(fn) };
    },
    setTimeout: (fn: () => void) => {
      timers.set(++timer, fn);
      return timer;
    },
    clearTimeout: (id: number) => timers.delete(id),
    Mvu: {
      events: { VARIABLE_UPDATE_ENDED: 'mvu' },
      getMvuData: (o: any) => variables(o.message_id),
      replaceMvuData: async (value: any, o: any) => {
        writes.push(o.message_id);
        records.set(o.message_id, lodash.cloneDeep(value));
      },
      parseMessage: async (_: string, value: any) => value,
    },
    require: (id: string) => {
      if (id === 'lodash') return lodash;
      if (id === '../schema') return schema;
      if (id === '../region-utils') return regions;
      if (id === '../world-events') return worldEvents;
      if (id === './gallery-cards')
        return {
          extractGalleryCardsFromContent: () => [],
          preloadGalleryCardImages: () => {},
          preloadGalleryImage: async () => {},
        };
      if (id === '@vueuse/core')
        return {
          useIntervalFn: (fn: any) => {
            host.poll = fn;
            return { pause: () => {} };
          },
        };
      throw Error(`Unexpected store dependency: ${id}`);
    },
  };
  vm.runInNewContext(compiled, host, { filename: 'data-store.js' });
  const owner = pinia.createPinia();
  const store = host.exports.useDataStore(owner);
  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vue.nextTick();
  };
  await flush();
  return {
    store,
    chat,
    writes,
    records,
    flush,
    poll: () => host.poll(),
    emit: (name: keyof typeof eventNames, id: number) => handlers.get(eventNames[name])?.forEach(fn => fn(id)),
    emitMvu: (next: any, previous: any) => handlers.get('mvu')?.forEach(fn => fn(next, previous)),
    tick: async () => {
      const tasks = [...timers.values()];
      timers.clear();
      tasks.forEach(fn => fn());
      await flush();
    },
    close: () => {
      store.dispose();
      pinia.disposePinia(owner);
    },
  };
}

async function main() {
  for (const sourcePath of [
    'src/灯火通明/stores/data-store.ts',
    'src/灯火通明-测试版/stores/data-store.ts',
  ]) {
    const previous = schema.Schema.parse({ 红颜: { 婵织烟: { 好感度: 24 } } });
    const next = schema.Schema.parse({ 红颜: { 婵织烟: { 好感度: 27 } } });
    const pending = await harness(4, new Map([[4, { stat_data: previous }]]), undefined, sourcePath);
    try {
      // MVU awaits this event before persisting. The listener must return
      // without reading stale floor data or blocking the upcoming write.
      pending.emitMvu({ stat_data: next }, { stat_data: previous });
      assert.equal(pending.store.红颜.婵织烟.好感度, 24);
      pending.records.set(4, { stat_data: next });
      await pending.tick();
      assert.equal(pending.store.红颜.婵织烟.好感度, 27, sourcePath);
      assert.equal(pending.chat[snapshotKey].红颜.婵织烟.好感度, 27);
      assert.equal(pending.writes.length, 0, '界面刷新不得重放命令或覆盖楼层变量');
      pending.emitMvu({ stat_data: previous }, { stat_data: next });
      await pending.tick();
      assert.equal(pending.store.红颜.婵织烟.好感度, 27, '其他楼层事件不替换当前楼层数据');
    } finally {
      pending.close();
    }
  }
  for (const previousPlace of ['月映湖', '栖溟浮岛', '绝壁石台']) {
    const h = await harness(0, new Map([[0, { stat_data: opening }]]), state(previousPlace));
    try {
      assert.equal(h.store.本尊.行踪.当前区域, '苍茫古径', `opening 19 after ${previousPlace}`);
      assert.equal(h.store.本尊.行踪.所属层级, '苍茫古径');
      assert.equal(h.chat[snapshotKey].本尊.行踪.当前区域, '苍茫古径');
      assert.deepEqual(h.records.get(0).stat_data, opening, 'Display normalization must not rewrite message variables');
    } finally {
      h.close();
    }
  }
  const saved = state('老槐驿');
  const h = await harness(
    2,
    new Map([
      [0, { stat_data: opening }],
      [1, {}],
      [2, { stat_data: saved }],
    ]),
  );
  try {
    // Re-roll clears the deleted floor; while replacement variables are pending,
    // its last valid state remains available without persisting it over that floor.
    h.records.set(2, {});
    h.emit('MESSAGE_DELETED', 2);
    assert.equal(h.store.hasData, false);
    h.emit('MESSAGE_RECEIVED', 2);
    await h.tick();
    assert.equal(h.store.本尊.行踪.当前区域, '老槐驿');
    assert.equal(h.store.本尊.灵石, 777);
    assert.equal(h.store.本尊.背包.古道灵茶.数量, 3);
    assert.deepEqual(h.records.get(2), {});
    assert.equal(h.writes.length, 0);
    // Once valid variables arrive, even a domain-level location wins over cache.
    h.records.set(2, { stat_data: opening });
    h.emit('MESSAGE_UPDATED', 2);
    await h.tick();
    assert.equal(h.store.本尊.行踪.当前区域, '苍茫古径');
    assert.equal(h.store.本尊.灵石, opening.本尊.灵石);
    h.store.viewMessage(1); // Missing historical floor falls back to floor 0.
    assert.equal(h.store.本尊.行踪.当前区域, '苍茫古径');
    h.store.viewMessage(2);
    assert.equal(h.store.本尊.行踪.当前区域, '苍茫古径');
  } finally {
    h.close();
  }
  const inherited = await harness(
    3,
    new Map([
      [0, { stat_data: opening }],
      [1, { stat_data: saved }],
      [2, {}],
      [3, {}],
    ]),
  );
  try {
    assert.equal(inherited.store.本尊.行踪.当前区域, '老槐驿');
    assert.equal(inherited.store.本尊.灵石, 777);
    assert.deepEqual(inherited.records.get(3), {});
  } finally {
    inherited.close();
  }
  console.log(
    'Data store: opening 19 after three other locations, re-roll fallback, fresh variables, history and previous-floor inheritance passed.',
  );
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
