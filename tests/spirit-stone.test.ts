/* eslint-disable import-x/no-nodejs-modules */
export {};
declare const require: (id: string) => any;

const assert = require('node:assert/strict');
const lodash = require('lodash');
(globalThis as any)._ = lodash;
const {
  Schema,
  SpiritStoneLedgerSchema,
  normalizeSpiritStoneLedger,
  getSpiritStoneTotal,
} = require('../src/灯火阑珊/schema');
const { guardParsedCommands } = require('../src/灯火阑珊-变量结构/guard');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');
const zero = { 下品灵石: 0, 中品灵石: 0, 上品灵石: 0, 极品灵石: 0 };
let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.info(`✓ ${name}`);
}
function replay(old: unknown, patch: unknown[]) {
  const result = executeUpdateVariable(old, makeUpdateVariable('按实际品级结算灵石。', patch));
  assert.deepEqual(result.errors, []);
  return result.finalData;
}

test('旧余额与上品库存完整归并，二次解析及JSON往返保持资产', () => {
  const source = { 本尊: { 灵石: 200, 背包: { 上品灵石: { 数量: 18, 品阶: '玄' } } } };
  const old = lodash.cloneDeep(source);
  const data = Schema.parse(source);
  assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 200, 上品灵石: 18 });
  assert.equal(getSpiritStoneTotal(data.本尊.灵石), 180200);
  assert.deepEqual(data.本尊.背包, {});
  assert.deepEqual(Schema.parse(data), data);
  assert.deepEqual(Schema.parse(JSON.parse(JSON.stringify(data))), data);
  assert.deepEqual(source, old);
});

test('三种容器统一归账，币值品级与器物品阶各自独立', () => {
  const data = Schema.parse({
    本尊: {
      灵石: { 下品灵石: 200, 上品灵石: 18 },
      背包: {
        灵石: { 数量: 3, 品阶: '中品' },
        上品灵石: { 数量: 2, 品阶: '玄' },
        灵石原矿: { 数量: 7 },
        火灵石: { 数量: 5 },
        灵石兑换券: { 数量: 1 },
      },
      法宝: { 极品灵石: { 数量: 1 }, 灵石法剑: { 数量: 1 } },
      杂物袋: { 灵石: { 数量: 11, 品阶: '天' } },
    },
  });
  assert.deepEqual(data.本尊.灵石, { 下品灵石: 211, 中品灵石: 3, 上品灵石: 20, 极品灵石: 1 });
  assert.deepEqual(Object.keys(data.本尊.背包), ['灵石原矿', '火灵石', '灵石兑换券']);
  assert.equal(data.本尊.法宝.灵石法剑.数量, 1);
  assert.deepEqual(data.本尊.杂物袋, {});
  assert.deepEqual(Schema.parse(data), data);
});

test('四品默认、旧包装、非法枚数与实际持有数量均规范化', () => {
  assert.deepEqual(SpiritStoneLedgerSchema.parse(undefined), zero);
  assert.deepEqual(
    normalizeSpiritStoneLedger({ 下品灵石: { 数量: '80' }, 中品灵石: '12.9', 上品灵石: -1, 极品灵石: Infinity }),
    { ...zero, 下品灵石: 80, 中品灵石: 12 },
  );
  const data = Schema.parse({ 本尊: { 灵石: 20000 }, 红颜: { 白清弦: { 灵石: 500 } } });
  assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 20000 });
  assert.deepEqual(data.红颜.白清弦.灵石, { ...zero, 下品灵石: 500 });
});

test('红颜别名逐品取较大值，合并后不重复增加资产', () => {
  const data = Schema.parse({
    红颜: {
      婵织烟: { 灵石: { 下品灵石: 12, 中品灵石: 8, 上品灵石: 2 } },
      浮玉殿主: { 灵石: { 下品灵石: 20, 中品灵石: 3, 极品灵石: 1 } },
    },
  });
  assert.deepEqual(data.红颜.婵织烟.灵石, { 下品灵石: 20, 中品灵石: 8, 上品灵石: 2, 极品灵石: 1 });
  assert.equal(data.红颜.浮玉殿主, undefined);
  assert.deepEqual(Schema.parse(data), data);
});

test('分品收支、旧标量消费和旧标量replace保留其他币种', () => {
  let data = replay({ 本尊: { 灵石: { 下品灵石: 200, 上品灵石: 18, 极品灵石: 1 } } }, [
    { op: 'delta', path: '/本尊/灵石/上品灵石', value: -3 },
  ]);
  data = replay(data, [{ op: 'delta', path: '/本尊/灵石', value: -20 }]);
  assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 180, 上品灵石: 15, 极品灵石: 1 });
  data = replay(data, [{ op: 'replace', path: '/本尊/灵石', value: 100 }]);
  assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 100, 上品灵石: 15, 极品灵石: 1 });
});

test('赠与同品守恒，兑换在两种实际币种之间结算', () => {
  const source = { 本尊: { 灵石: { 上品灵石: 18 } }, 红颜: { 白清弦: { 灵石: { 上品灵石: 3 } } } };
  let data = replay(source, [
    { op: 'delta', path: '/本尊/灵石/上品灵石', value: -2 },
    { op: 'delta', path: '/红颜/白清弦/灵石/上品灵石', value: 2 },
  ]);
  assert.equal(data.本尊.灵石.上品灵石, 16);
  assert.equal(data.红颜.白清弦.灵石.上品灵石, 5);
  data = replay(data, [
    { op: 'delta', path: '/本尊/灵石/上品灵石', value: -1 },
    { op: 'delta', path: '/本尊/灵石/中品灵石', value: 100 },
  ]);
  assert.equal(data.本尊.灵石.上品灵石, 15);
  assert.equal(data.本尊.灵石.中品灵石, 100);
  assert.equal(getSpiritStoneTotal(data.本尊.灵石), 160000);
  data = replay(data, [{ op: 'delta', path: '/红颜/白清弦/灵石', value: 20 }]);
  assert.equal(data.红颜.白清弦.灵石.下品灵石, 20);
  assert.equal(data.红颜.白清弦.灵石.上品灵石, 5);
});

test('误写库存的新增和数量增减归入相应账册，物品列表保持清洁', () => {
  const data = replay({ 本尊: { 灵石: { 下品灵石: 200, 上品灵石: 18 } } }, [
    { op: 'delta', path: '/本尊/背包/上品灵石/数量', value: -3 },
    { op: 'insert', path: '/本尊/法宝/极品灵石', value: { 名称: '极品灵石', 数量: 1 } },
    { op: 'insert', path: '/本尊/杂物袋/灵石', value: { 名称: '灵石', 品阶: '中品', 数量: 7 } },
  ]);
  assert.deepEqual(data.本尊.灵石, { 下品灵石: 200, 中品灵石: 7, 上品灵石: 15, 极品灵石: 1 });
  assert.deepEqual(data.本尊.背包, {});
  assert.deepEqual(data.本尊.法宝, {});
  assert.deepEqual(data.本尊.杂物袋, {});
});

function rawCommands(source: any, inputCommands: any[]) {
  const variables = { stat_data: lodash.cloneDeep(source) };
  const original = lodash.cloneDeep(variables);
  const commands = lodash.cloneDeep(inputCommands);
  guardParsedCommands(variables, commands);
  assert.deepEqual(variables, original, '命令兼容保持输入变量不变');
  const once = lodash.cloneDeep(commands);
  guardParsedCommands(variables, commands);
  assert.deepEqual(commands, once, '重复经过兼容层不重复迁移或改变命令');
  for (const command of commands) {
    const path = command.args[0];
    const literal = command.args.at(-1);
    const value = command.type === 'delete' ? undefined : JSON.parse(literal);
    if (command.type === 'delete') lodash.unset(variables, path);
    else if (command.type === 'add') {
      assert.equal(typeof lodash.get(variables, path), 'number', path);
      lodash.set(variables, path, lodash.get(variables, path) + value);
    } else lodash.set(variables, path, value);
  }
  return Schema.parse(variables.stat_data);
}

for (const [name, command, upper] of [
  ['旧库存delta', { type: 'add', args: ['/本尊/背包/上品灵石/数量', '-3'] }, 15],
  ['旧库存绝对数量', { type: 'set', args: ['/本尊/背包/上品灵石/数量', '12'] }, 12],
  ['旧库存整项replace', { type: 'set', args: ['/本尊/背包/上品灵石', '{"名称":"上品灵石","数量":11}'] }, 11],
  ['旧库存remove', { type: 'delete', args: ['/本尊/背包/上品灵石'] }, 0],
  ['旧账与新品级命令', { type: 'add', args: ['/本尊/灵石/上品灵石', '-3'] }, 15],
] as const) {
  test(`${name}在未迁移快照上按数量差额结算且兼容两遍`, () => {
    const data = rawCommands({ 本尊: { 灵石: 200, 背包: { 上品灵石: { 名称: '上品灵石', 数量: 18 } } } }, [command]);
    assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 200, 上品灵石: upper });
    assert.deepEqual(data.本尊.背包, {});
  });
}

test('未迁移红颜标量收支与整账删除均有确定结果', () => {
  const data = rawCommands({ 红颜: { 白清弦: { 灵石: 500 } }, 本尊: { 灵石: { 上品灵石: 18 } } }, [
    { type: 'add', args: ['/红颜/白清弦/灵石', '-20'] },
    { type: 'delete', args: ['/本尊/灵石'] },
  ]);
  assert.deepEqual(data.红颜.白清弦.灵石, { ...zero, 下品灵石: 480 });
  assert.deepEqual(data.本尊.灵石, zero);
});

test('旧库存以通用名称与明确上品标记记录时，数量消费沿用上品', () => {
  const data = rawCommands(
    {
      本尊: {
        灵石: 200,
        杂物袋: { 灵石: { 名称: '灵石', 品阶: '上品', 数量: 18 } },
      },
    },
    [{ type: 'add', args: ['/本尊/杂物袋/灵石/数量', '-3'] }],
  );
  assert.deepEqual(data.本尊.灵石, { ...zero, 下品灵石: 200, 上品灵石: 15 });
  assert.deepEqual(data.本尊.杂物袋, {});
});

for (const frontend of ['灯火通明', '灯火通明-测试版']) {
  test(`${frontend}资产提示标注币种并支持红颜与整账更新`, () => {
    const { summarizeVariableDiagnostics } = require(`../src/${frontend}/message-content`);
    const pills = summarizeVariableDiagnostics(
      {
        operations: [
          { op: 'delta', path: '/本尊/灵石/上品灵石', value: 18 },
          { op: 'delta', path: '/红颜/白清弦/灵石/极品灵石', value: -1 },
          { op: 'replace', path: '/本尊/灵石', value: { 下品灵石: 200, 中品灵石: 3 } },
        ],
      },
      5,
    );
    assert.deepEqual(pills, ['上品灵石 +18', '白清弦·极品灵石 -1', '下品灵石 200', '中品灵石 3']);
    assert.ok(pills.every((pill: string) => !pill.includes('[object Object]')));
  });
}
console.info(`${passed} spirit stone regressions passed.`);
