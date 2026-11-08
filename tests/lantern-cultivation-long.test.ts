/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const YAML = require('yaml');
const lodash = require('lodash');
(globalThis as any)._ = lodash;
const { Schema, REALM_THRESHOLDS, CURRENT_CULTIVATION_VERSION } = require('../src/灯火阑珊/schema');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');
type Ledger = { path: string; level: number; amount: number };
const actors: Ledger[] = [
  { path: '/本尊', level: 6, amount: 590 },
  { path: '/红颜/白清弦', level: 17, amount: 0 },
];
const counters = { delta: 0, losses: 0, settlements: 0, breakthroughs: 0, drops: 0, reloads: 0 };
const cost = (from: number, to: number) =>
  (REALM_THRESHOLDS as number[]).slice(from - 1, to - 1).reduce((sum, value) => sum + value, 0);
function plan(actor: Ledger, round: number): any[] {
  if (round % 17 === 0) return [];
  const path = actor.path;
  const gain = round === 1 ? 800 : (((round * 13) % 97) + 1) / 4;
  const oldLevel = actor.level;
  let phase = '压境中';
  let record: any;
  let op = 'delta';
  let value = gain;
  if (round % 203 === 0 && oldLevel > 1) {
    const loss = Math.min(actor.amount, 83.5);
    actor.amount -= loss;
    actor.level--;
    phase = '稳固中';
    op = 'replace';
    value = actor.amount;
    record = {
      类型: '跌境',
      原等级: oldLevel,
      目标等级: actor.level,
      消耗修为: loss,
      依据: '受伤跌境，按实际损耗结算。',
      时地: `第${round}回`,
    };
    counters.drops++;
  } else if (round % 37 === 0 && oldLevel < 48 && actor.amount + gain >= cost(oldLevel, oldLevel + 1)) {
    const desired = Math.min(48, oldLevel + (round % 111 === 0 ? 2 : 1));
    actor.level = actor.amount + gain >= cost(oldLevel, desired) ? desired : oldLevel + 1;
    const spent = cost(oldLevel, actor.level);
    actor.amount += gain - spent;
    phase = '稳固中';
    op = 'replace';
    value = actor.amount;
    record = {
      类型: actor.level - oldLevel > 1 ? '跨级突破' : '突破',
      原等级: oldLevel,
      目标等级: actor.level,
      消耗修为: spent,
      依据: '明确选择冲关，新增与消耗同轮结算。',
      时地: `第${round}回`,
    };
    counters.breakthroughs++;
  } else if (round % 29 === 0) {
    value = -Math.min(actor.amount, 19.75);
    actor.amount += value;
    phase = '稳固中';
    counters.losses++;
  } else if (round % 11 === 0) {
    actor.amount += gain + 23.5 - 5.25;
    op = 'replace';
    value = actor.amount;
    counters.settlements++;
  } else {
    actor.amount += gain;
    counters.delta++;
  }
  const patch: any[] = [
    { op, path: `${path}/修为`, value },
    { op: 'replace', path: `${path}/修炼状态/阶段`, value: phase },
  ];
  if (actor.level !== oldLevel) patch.push({ op: 'replace', path: `${path}/等级`, value: actor.level });
  if (record) patch.push({ op: 'replace', path: `${path}/修炼状态/最近突破`, value: record });
  if (record?.类型 !== '跌境' && record)
    patch.push({ op: 'replace', path: `${path}/修炼状态/上次结果`, value: '成功' });
  if (round % 29 === 0 && !record) patch.push({ op: 'replace', path: `${path}/修炼状态/上次结果`, value: '失败' });
  return patch;
}
let state = Schema.parse({
  本尊: { 等级: 6, 修为: 590 },
  红颜: { 白清弦: { 等级: 17, 修为: 0 } },
  _系统设置: { 修炼系统版本: 3 },
});
for (let round = 1; round <= 1000; round++) {
  const patch = actors.flatMap(actor => plan(actor, round));
  patch.push({ op: 'replace', path: '/世界时钟/日期', value: ((round - 1) % 30) + 1 });
  const replay = executeUpdateVariable(state, makeUpdateVariable('按当轮实际收支与进境结算。', patch));
  assert.deepEqual(replay.errors, [], `第${round}回`);
  assert.equal(replay.fullRollback, false);
  state = replay.finalData;
  for (const actor of actors) {
    const actual = lodash.get(state, actor.path.slice(1).split('/'));
    assert.equal(actual.等级, actor.level, `第${round}回${actor.path}等级`);
    assert.equal(actual.修为, actor.amount, `第${round}回${actor.path}余额`);
    assert.equal(actual.突破阈值, REALM_THRESHOLDS[actor.level - 1]);
  }
  const reloaded = Schema.parse(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(Schema.parse(reloaded), state, `第${round}回重复读取`);
  assert.equal(reloaded._系统设置.修炼系统版本, CURRENT_CULTIVATION_VERSION);
  state = reloaded;
  counters.reloads++;
  if (round % 250 === 0) console.info(`PASS 连续${round}回，余额与独立账本一致`);
}
assert.ok(Object.values(counters).every(value => value > 0));
for (const oldVersion of [1, 2]) {
  let migrated = Schema.parse({ 本尊: { 等级: 17, 修为: 800 }, _系统设置: { 修炼系统版本: oldVersion } });
  let expected = migrated.本尊.修为;
  for (let round = 0; round < 100; round++) {
    migrated = executeUpdateVariable(
      migrated,
      makeUpdateVariable('旧存档迁移后继续积累。', [{ op: 'delta', path: '/本尊/修为', value: 0.25 }]),
    ).finalData;
    expected += 0.25;
    assert.equal(migrated.本尊.修为, expected);
    migrated = Schema.parse(JSON.parse(JSON.stringify(migrated)));
  }
}
const samplePath = 'src/灯火阑珊/灯火阑珊-世界书/变量更新规则&变量输出格式/[mvu_update]变量输出格式.yaml';
const format = YAML.parse(fs.readFileSync(samplePath, 'utf8')).变量输出格式.format;
const sample = executeUpdateVariable({ 本尊: { 等级: 17, 修为: 100 } }, format);
assert.deepEqual(sample.errors, []);
assert.equal(sample.finalData.本尊.修为, 130);
assert.equal(sample.finalData.本尊.等级, 17);
assert.equal(sample.finalData.世界图志.坊市丹香异变.来源, '药铺近闻');
assert.equal(sample.finalData.$可参与机遇.length, 3);
for (const value of ['800', '20%', null]) {
  assert.throws(
    () =>
      executeUpdateVariable(
        state,
        makeUpdateVariable('无效增量应拒绝。', [{ op: 'delta', path: '/本尊/修为', value }]),
      ),
    /delta.*数值/u,
  );
}
assert.throws(
  () =>
    executeUpdateVariable(
      state,
      makeUpdateVariable('禁止重复结算。', [
        { op: 'delta', path: '/本尊/修为', value: 10 },
        { op: 'replace', path: '/本尊/修为', value: 20 },
      ]),
    ),
  /重复|冲突/u,
);
assert.throws(
  () =>
    executeUpdateVariable(
      state,
      makeUpdateVariable('禁止父子重叠。', [
        { op: 'replace', path: '/本尊/修炼状态', value: {} },
        { op: 'replace', path: '/本尊/修炼状态/阶段', value: '修炼中' },
      ]),
    ),
  /父子|冲突/u,
);
console.info('PASS 旧版迁移后200回增量、实际输出示例和非法增量/重叠路径检查');
console.info(JSON.stringify(counters));
