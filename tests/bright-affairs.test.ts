/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;
declare const process: { exitCode?: number };
const assert = require('node:assert/strict');
const fs = require('node:fs');
const lodash = require('lodash');
(globalThis as any)._ = lodash;
const { Schema } = require('../src/灯火通明-测试版/schema');
const { Schema: formalSchema } = require('../src/灯火通明/schema');
const { chooseTrackedTask, prioritizeAffairsActions, describeAffairsChanges, inferTaskReferences } = require('../src/灯火通明-测试版/affairs');
const { buildFallbackActions, resolveActionFeed } = require('../src/灯火通明-测试版/action-feed');
const { copyQuestForPreset } = require('../src/灯火通明-测试版/quest-preset');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');
const { parse, compileScript, compileTemplate } = require('vue/compiler-sfc');
const tests: Array<[string, () => void]> = [];
const test = (name: string, fn: () => void) => tests.push([name, fn]);
const quest = (name: string, extra: any = {}) => ({ 名称: name, 目标: '查明线索的来处。', 创建时间: 0, ...extra });

test('旧任务和正式版共用结构兼容，结果归档幂等且不结算资产', () => {
  assert.equal(Schema, formalSchema);
  const old = Schema.parse({ 任务列表: { 旧约: quest('旧约') }, 本尊: { 灵石: 15 } });
  assert.equal(old.任务列表.旧约.关联人物, undefined);
  assert.deepEqual(old._近期任务结果, {});
  const tasks: any = { 旧约: old.任务列表.旧约 };
  for (let i = 0; i < 8; i++) tasks[`往事${i}`] = quest(`往事${i}`, { 状态: i === 7 ? '放弃' : i === 6 ? '已失败' : '已完成', 结果: `留下结果${i}` });
  const data = Schema.parse({ ...old, 任务列表: tasks });
  assert.deepEqual(Object.keys(data.任务列表), ['旧约']);
  assert.deepEqual(Object.keys(data._近期任务结果), ['往事3', '往事4', '往事5', '往事6', '往事7']);
  assert.equal(data._近期任务结果.往事7.状态, '已放弃');
  assert.equal(data.本尊.灵石, 15);
  assert.deepEqual(Schema.parse(data), data);
});

test('抱雪峰任务经过实际命令守卫更新节点、关联信息并归档终局', () => {
  const before = Schema.parse({ 本尊: { 灵石: 15 }, 任务列表: { 拜入抱雪峰: quest('拜入抱雪峰', { 类型: '主线', 下一步: '拔毒并重续气海。' }), 断剑重续: quest('断剑重续', { 类型: '支线' }) } });
  const updated = executeUpdateVariable(before, makeUpdateVariable('已拔毒，卯时赴泉铸剑。', [
    { op: 'replace', path: '/任务列表/拜入抱雪峰/进度', value: '已拜师并拔毒，气海裂痕续接七成。' },
    { op: 'replace', path: '/任务列表/拜入抱雪峰/下一步', value: '歇息后，卯时随白清弦赴寒髓泉铸剑。' },
    { op: 'insert', path: '/任务列表/拜入抱雪峰/关联人物', value: ['白清弦'] },
    { op: 'insert', path: '/任务列表/拜入抱雪峰/关联地点', value: ['寒髓泉'] },
    { op: 'insert', path: '/任务列表/拜入抱雪峰/关联物品', value: ['半截凡铁断剑'] },
  ]));
  assert.deepEqual(updated.errors, []);
  assert.equal(updated.fullRollback, false);
  const fallback = buildFallbackActions(updated.finalData.任务列表, '', {});
  assert.match(fallback[0].行动, /卯时.*寒髓泉/u);
  assert.doesNotMatch(fallback[0].行动, /拔毒/u);
  assert.equal(fallback[0].关联任务ID, '拜入抱雪峰');
  const ended = executeUpdateVariable(updated.finalData, makeUpdateVariable('调理阶段结束。', [
    { op: 'insert', path: '/任务列表/断剑重续/结果', value: '调理阶段完成，已约定铸剑。' },
    { op: 'replace', path: '/任务列表/断剑重续/状态', value: '已完成' },
  ]));
  assert.deepEqual(ended.errors, []);
  assert.equal(ended.finalData.任务列表.断剑重续, undefined);
  assert.equal(ended.finalData._近期任务结果.断剑重续.结果, '调理阶段完成，已约定铸剑。');
  assert.equal(ended.finalData.本尊.灵石, 15);
  assert.ok(describeAffairsChanges(updated.finalData, ended.finalData).some((change: any) => change.kind === 'result' && change.id === '断剑重续'));
});

test('世闻、任务与行动同组建立关联，来源与切口经 Schema 保留', () => {
  const data = executeUpdateVariable({}, makeUpdateVariable('听闻药香异常，循闻追查。', [
    { op: 'insert', path: '/世界图志/丹香异变', value: { 状态: '活跃', 阶段: '征兆', 事件: '药铺传闻同批丹药药香有异，待查。', 来源: '药铺近闻', 地点: '青石坊市', 关联人物: ['药铺伙计'], 下一步: '核对进货单。' } },
    { op: 'insert', path: '/任务列表/寻丹源', value: quest('寻丹源', { 类型: '支线', 关联事件ID: '丹香异变', 关联地点: ['青石坊市'], 下一步: '核对进货单。' }) },
    { op: 'replace', path: '/$可参与机遇', value: [{ 标题: '核对进货单', 行动: '到药铺核对进货单。', 类型: '探索', 事件性质: '回应已发生事件', 关联事件ID: '丹香异变', 关联任务ID: '寻丹源' }] },
  ])).finalData;
  assert.equal(data.世界图志.丹香异变.来源, '药铺近闻');
  assert.equal(data.世界图志.丹香异变.下一步, '核对进货单。');
  assert.equal(data.$可参与机遇[0].关联任务ID, '寻丹源');
  const feed = resolveActionFeed({ operations: [{ op: 'replace', path: '/$可参与机遇', value: data.$可参与机遇 }], storedActions: data.$可参与机遇, tasks: data.任务列表, situation: '', worldEvents: data.世界图志 });
  assert.equal(feed.actions[0].关联事件ID, '丹香异变');
  assert.equal(feed.actions[0].关联任务ID, '寻丹源');
  const next = Schema.parse({ ...data, 世界图志: { 丹香异变: { ...data.世界图志.丹香异变, 阶段: '可介入', 最近变化: '药铺公布复验结果。' } } });
  assert.ok(describeAffairsChanges(data, next).some((change: any) => change.kind === 'event' && change.id === '丹香异变'));
});

test('近期结果拒绝模型直接覆盖和注入新条目', () => {
  const before = Schema.parse({ 任务列表: { 旧事: quest('旧事', { 状态: '已完成', 结果: '真实结果' }) } });
  for (const path of ['/_近期任务结果', '/_近期任务结果/虚构结果']) {
    const replay = executeUpdateVariable(before, makeUpdateVariable('只读归档。', [{ op: 'replace', path, value: { 名称: '虚构', 结果: '重复奖励' } }]));
    assert.deepEqual(replay.finalData._近期任务结果, before._近期任务结果);
  }
});

test('完整保留三项本轮选项，缺少选项时才补任务起念，最多三项且去重', () => {
  const tasks = { 主线: quest('主线', { 类型: '主线', 状态: '进行中' }), 支线: quest('支线', { 类型: '支线' }) };
  assert.equal(chooseTrackedTask(tasks, ''), '主线');
  assert.equal(chooseTrackedTask(tasks, '支线'), '支线');
  assert.equal(chooseTrackedTask({ 支线: tasks.支线 }, '主线'), '支线');
  const actions = ['歇息', '询问', '赴泉'].map((title, index) => ({ 标题: title, 行动: `${title}。`, 类型: '探索', 叙事类型: index === 0 ? '平淡延续' : '当前行动', 事件性质: '无事件' }));
  assert.deepEqual(prioritizeAffairsActions(actions, tasks, '主线'), actions);
  const fallback = prioritizeAffairsActions([], tasks, '主线');
  assert.equal(fallback[0].关联任务ID, '主线');
  const mixed = prioritizeAffairsActions([...actions, { ...actions[1], 关联任务ID: '支线' }, { ...actions[2], 行动: '查证新线索。', 关联任务ID: '主线' }], tasks, '主线');
  assert.equal(mixed.length, 3);
  assert.equal(mixed[0].关联任务ID, '主线');
  assert.equal(new Set(mixed.map((action: any) => action.行动)).size, 3);
});

test('任务预设往返保留关联字段且数组独立，回合回响只报告事实变化', () => {
  const data = Schema.parse({ 任务列表: { 旧约: quest('旧约', { 关联人物: ['白清弦'], 关联地点: ['抱雪峰'], 关联物品: ['断剑'], 关联事件ID: '断剑旧闻' }) } });
  const copied = copyQuestForPreset(data.任务列表.旧约);
  const restored = Schema.parse({ 任务列表: { 旧约: copyQuestForPreset(JSON.parse(JSON.stringify(copied))) } });
  assert.deepEqual(restored.任务列表.旧约, data.任务列表.旧约);
  copied.关联人物.push('其他人物');
  assert.deepEqual(data.任务列表.旧约.关联人物, ['白清弦']);
  assert.deepEqual(describeAffairsChanges(null, data), []);
  assert.deepEqual(describeAffairsChanges(data, data), []);
});

test('旧任务只从原文识别已收录完整名称，显式空关联保持原意', () => {
  const known = { people: ['白清弦', '晚棠'], places: ['抱雪峰', '寒髓泉'], items: ['断剑', '丹药'] };
  const task = { 目标: '于抱雪峰向白清弦请教。', 下一步: '携断剑赴寒髓泉。' };
  assert.deepEqual(inferTaskReferences(task, known), { people: ['白清弦'], places: ['抱雪峰', '寒髓泉'], items: ['断剑'] });
  assert.deepEqual(inferTaskReferences({ ...task, 关联人物: [] }, known).people, []);
  assert.equal((task as any).关联人物, undefined);
});

test('实际 Vue 组件的脚本及模板均可编译', () => {
  for (const name of ['app.vue', ...['AffairsActions', 'AffairsLinks', 'AffairsPanel', 'InlineActionChoices', 'InventoryPanel', 'CompanionsPanel', 'WorldMapCanvas', 'PresetPanel', 'SkillsPanel'].map(name => `components/${name}.vue`)]) {
    const filename = `src/灯火通明-测试版/${name}`;
    const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename });
    assert.deepEqual(errors, [], filename);
    const script = compileScript(descriptor, { id: 'test-affairs' });
    const template = compileTemplate({ source: descriptor.template.content, filename, id: 'test-affairs', compilerOptions: { bindingMetadata: script.bindings, expressionPlugins: ['typescript'] } });
    assert.deepEqual(template.errors, [], filename);
  }
});
for (const [name, fn] of tests) { try { fn(); console.info(`✓ ${name}`); } catch (error) { process.exitCode = 1; console.error(`✗ ${name}`, error); } }
