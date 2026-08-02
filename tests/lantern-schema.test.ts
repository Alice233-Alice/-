/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { cwd(): string; exitCode?: number };

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lodash = require('lodash');
const YAML = require('yaml');

(globalThis as any)._ = lodash;

const {
  REALM_NAMES,
  REALM_STAGES,
  REALM_THRESHOLDS,
  Schema,
  describeRealmByLevel,
  getRealmThreshold,
} = require('../src/灯火阑珊/schema');
const BrightSchemaModule = require('../src/灯火通明/schema.ts');
const {
  applyRealmTransitionGuards,
  correctProtagonistRealmText,
  repairStatDataWithFallback,
} = require('../src/灯火阑珊-变量结构/guard');

type TestCase = {
  name: string;
  run: () => void;
};

const tests: TestCase[] = [];

function test(name: string, run: () => void): void {
  tests.push({ name, run });
}

function clone<T>(value: T): T {
  return lodash.cloneDeep(value);
}

function parse(input: unknown = {}): any {
  return Schema.parse(input);
}

function makeCultivator(level: number): any {
  return parse({
    本尊: {
      等级: level,
      修为: getRealmThreshold(level),
      修炼状态: {
        阶段: '突破中',
        上次结果: '无',
      },
      尝试突破: true,
    },
  });
}

test('默认值采用盛法时代与 v2 变量结构', () => {
  const data = parse();
  assert.equal(data.世界时钟.纪元, '盛法时代');
  assert.equal(data._系统设置.变量结构版本, 2);
  assert.equal(data._系统设置.修炼系统版本, 3);
});

test('灯火通明与灯火阑珊引用同一 Schema 实例', () => {
  assert.equal(BrightSchemaModule.Schema, Schema);
});

test('旧存档缺失版本与境界变动时可迁移且保持幂等', () => {
  const migrated = parse({
    本尊: {
      等级: 4,
      修为: 200,
      修炼状态: { 阶段: '修炼中' },
    },
    _系统设置: { 修炼系统版本: 1 },
  });
  assert.deepEqual(migrated, parse(migrated));
  assert.deepEqual(migrated.本尊.修炼状态.境界变动, {
    类型: '无',
    目标等级: 0,
    依据: '',
  });
  assert.equal(migrated._系统设置.变量结构版本, 2);
});

test('1～48 级境界、阈值及整数边界映射正确', () => {
  for (let level = 1; level <= 48; level += 1) {
    const major = REALM_NAMES[Math.floor((level - 1) / 4)];
    const minor = REALM_STAGES[(level - 1) % 4];
    assert.equal(describeRealmByLevel(level), `${major}${minor}`);
    assert.equal(getRealmThreshold(level), REALM_THRESHOLDS[level - 1]);
  }

  assert.equal(parse({ 本尊: { 等级: 4.9 } }).本尊.等级, 4);
  assert.equal(parse({ 本尊: { 等级: 999 } }).本尊.等级, 48);
  assert.equal(parse({ 本尊: { 等级: -9 } }).本尊.等级, 1);
});

test('NaN、无穷值、负数量和重复行动可保守归一化', () => {
  const data = parse({
    世界时钟: { 年份: Number.POSITIVE_INFINITY, 月份: Number.NaN, 日期: 99 },
    本尊: {
      等级: Number.NaN,
      修为: Number.POSITIVE_INFINITY,
      灵石: Number.NEGATIVE_INFINITY,
      背包: {
        空瓶: { 数量: -3 },
        丹药: { 数量: 2.8 },
      },
    },
    可参与机遇: [
      { 行动: '查看石门', 类型: '探索' },
      { 行动: ' 查看石门 ', 类型: '探索' },
      { 行动: '', 类型: '探索' },
    ],
  });

  assert.equal(data.世界时钟.年份, 1);
  assert.equal(data.世界时钟.月份, 1);
  assert.equal(data.世界时钟.日期, 30);
  assert.equal(data.本尊.等级, 1);
  assert.equal(data.本尊.修为, 0);
  assert.equal(data.本尊.灵石, 0);
  assert.equal(data.本尊.背包.空瓶, undefined);
  assert.equal(data.本尊.背包.丹药.数量, 2);
  assert.equal(data.可参与机遇.length, 1);
});

test('双重嵌套的行动 patch 可恢复为行动列表', () => {
  const data = parse({
    可参与机遇: [
      {
        op: 'replace',
        path: '/可参与机遇',
        value: [
          { 行动: '闭目调息，将新悟真意化入气海。', 类型: '修炼', 提示: '稳固进境' },
          { 行动: '追上师尊请教不争之意。', 类型: '交涉' },
        ],
      },
    ],
  });

  assert.equal(data.可参与机遇.length, 2);
  assert.equal(data.可参与机遇[0].行动, '闭目调息，将新悟真意化入气海。');
  assert.equal(data.可参与机遇[1].类型, '交涉');
  assert.deepEqual(parse(data), data);
});

test('嵌套的逐下标行动 patch 可按顺序恢复', () => {
  const data = parse({
    可参与机遇: [
      {
        op: 'replace',
        path: '/可参与机遇/0',
        value: { 行动: '借琴音稳固不争雷网。', 类型: '修炼', 提示: '师尊在侧' },
      },
      {
        op: 'replace',
        path: '/可参与机遇/1',
        value: { 行动: '主动迎接剑指考校。', 类型: '战斗' },
      },
      {
        op: 'replace',
        path: '/可参与机遇/2',
        value: { 行动: '请教自然与蛰藏的关联。', 类型: '交涉' },
      },
    ],
  });

  assert.deepEqual(
    data.可参与机遇.map((item: { 行动: string }) => item.行动),
    ['借琴音稳固不争雷网。', '主动迎接剑指考校。', '请教自然与蛰藏的关联。'],
  );
  assert.deepEqual(parse(data), data);
});

test('神通威力和标准声望称谓只从事实字段重新派生', () => {
  const data = parse({
    本尊: {
      神通列表: {
        青冥剑诀: {
          名称: '青冥剑诀',
          品阶: '天',
          熟练度: '大圆满',
          威力等级: 999,
        },
      },
    },
    声望系统: {
      青云宗: { 值: 70, 关系: '友好' },
      自定义势力: { 值: 70, 关系: '座上宾' },
    },
  });

  assert.equal(data.本尊.神通列表.青冥剑诀.威力等级, 55);
  assert.notEqual(data.声望系统.青云宗.关系, '友好');
  assert.equal(data.声望系统.自定义势力.关系, '座上宾');
});

test('普通突破 4→5 原子结算并清理临时凭证', () => {
  const oldData = makeCultivator(4);
  const nextData = clone(oldData);
  nextData.本尊.等级 = 5;
  nextData.本尊.修为 = 400;
  nextData.本尊.修炼状态.境界变动 = {
    类型: '突破',
    目标等级: 5,
    依据: '',
  };

  const guarded = applyRealmTransitionGuards(nextData, oldData);
  const parsed = parse(guarded.data);
  assert.equal(parsed.本尊.等级, 5);
  assert.equal(parsed.本尊.境界描述, '筑基初期');
  assert.equal(parsed.本尊.修为, 0);
  assert.equal(parsed.本尊.修炼状态.阶段, '稳固中');
  assert.equal(parsed.本尊.修炼状态.上次结果, '成功');
  assert.equal(parsed.本尊.尝试突破, false);
  assert.equal(parsed.本尊.修炼状态.境界变动.类型, '无');
});

test('跨级突破有依据时生效，无依据时收敛为 +1', () => {
  const oldData = makeCultivator(4);
  const validNext = clone(oldData);
  validNext.本尊.等级 = 7;
  validNext.本尊.修炼状态.境界变动 = {
    类型: '跨级突破',
    目标等级: 7,
    依据: '完整炼化上古真君传承',
  };
  assert.equal(applyRealmTransitionGuards(validNext, oldData).data.本尊.等级, 7);

  const invalidNext = clone(validNext);
  invalidNext.本尊.修炼状态.境界变动.依据 = '';
  const guarded = applyRealmTransitionGuards(invalidNext, oldData);
  assert.equal(guarded.data.本尊.等级, 5);
  assert.ok(guarded.warnings.some((warning: string) => warning.includes('跨级依据')));
});

test('跌境有依据时生效，无依据时回退旧等级', () => {
  const oldData = makeCultivator(5);
  const validNext = clone(oldData);
  validNext.本尊.等级 = 4;
  validNext.本尊.修炼状态.境界变动 = {
    类型: '跌境',
    目标等级: 4,
    依据: '护道失败导致根基崩毁',
  };
  const valid = applyRealmTransitionGuards(validNext, oldData);
  assert.equal(valid.data.本尊.等级, 4);
  assert.equal(valid.data.本尊.修炼状态.上次结果, '失败');

  const invalidNext = clone(validNext);
  invalidNext.本尊.修炼状态.境界变动.依据 = '';
  const invalid = applyRealmTransitionGuards(invalidNext, oldData);
  assert.equal(invalid.data.本尊.等级, 5);
  assert.ok(invalid.warnings.some((warning: string) => warning.includes('跌境依据')));
});

test('失败突破和最高等级不会留下过期临时状态', () => {
  const failedOld = makeCultivator(4);
  const failedNext = clone(failedOld);
  failedNext.本尊.修炼状态.阶段 = '稳固中';
  failedNext.本尊.修炼状态.上次结果 = '失败';
  failedNext.本尊.修炼状态.境界变动 = {
    类型: '突破',
    目标等级: 5,
    依据: '',
  };
  const failed = applyRealmTransitionGuards(failedNext, failedOld).data;
  assert.equal(failed.本尊.修炼状态.境界变动.类型, '无');
  assert.equal(failed.本尊.尝试突破, false);

  const cancelledNext = clone(failedOld);
  cancelledNext.本尊.修炼状态.阶段 = '修炼中';
  cancelledNext.本尊.修炼状态.上次结果 = '无';
  cancelledNext.本尊.修炼状态.境界变动 = {
    类型: '突破',
    目标等级: 5,
    依据: '',
  };
  const cancelled = applyRealmTransitionGuards(cancelledNext, failedOld).data;
  assert.equal(cancelled.本尊.修炼状态.境界变动.类型, '无');
  assert.equal(cancelled.本尊.尝试突破, false);

  const highest = parse({
    本尊: {
      等级: 48,
      修为: REALM_THRESHOLDS[47],
      修炼状态: { 阶段: '瓶颈中' },
    },
  });
  assert.equal(highest.本尊.境界描述, '仙帝大圆满');
  assert.equal(highest.本尊.修炼状态.突破目标, '');
});

test('截图场景中变量与本尊处境统一为筑基初期且不误改他人', () => {
  const text = '虞汐颜已突破至练气大圆满，本尊已突破至练气大圆满。';
  const corrected = correctProtagonistRealmText(text, 5, ['虞汐颜']);
  assert.equal(corrected, '虞汐颜已突破至练气大圆满，本尊已突破至筑基初期。');
});

test('非法局部条目被移除，旧合法任务与库存不会丢失', () => {
  const oldData = parse({
    任务列表: {
      寻找灵药: {
        名称: '寻找灵药',
        类型: '支线',
        目标: '找到一株灵药',
        状态: '进行中',
      },
    },
    本尊: {
      背包: {
        青玉丹: { 名称: '青玉丹', 数量: 2, 描述: '稳固灵力' },
      },
    },
  });
  const nextData = clone(oldData);
  nextData.任务列表.非法任务 = null;
  nextData.本尊.背包.非法物品 = null;
  nextData.地点库.非法地点 = null;

  const repaired = repairStatDataWithFallback(nextData, oldData);
  assert.ok(repaired.data);
  assert.ok(repaired.data.任务列表.寻找灵药);
  assert.equal(repaired.data.本尊.背包.青玉丹.数量, 2);
  assert.equal(repaired.data.任务列表.非法任务, undefined);
  assert.equal(repaired.data.本尊.背包.非法物品, undefined);
  assert.equal(repaired.data.地点库.非法地点, undefined);
});

test('现有语法有效的 initvar 均可迁移并幂等', () => {
  const firstMessageDirectory = path.join(process.cwd(), 'src', '灯火阑珊', '第一条消息');
  const files = fs
    .readdirSync(firstMessageDirectory, { recursive: true })
    .map((file: string) => path.join(firstMessageDirectory, file))
    .filter((file: string) => file.endsWith('.yaml') && fs.statSync(file).isFile());
  let parsedCount = 0;
  let invalidYamlCount = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const blocks = [...source.matchAll(/<initvar>\s*([\s\S]*?)\s*<\/initvar>/gu)].map(match => match[1]);
    if (path.basename(file) === '开局initvar.yaml') blocks.push(source);

    for (const block of blocks) {
      let rawData: unknown;
      try {
        rawData = YAML.parse(block);
      } catch {
        invalidYamlCount += 1;
        continue;
      }
      const data = parse(rawData);
      assert.deepEqual(data, parse(data), file);
      parsedCount += 1;
    }
  }

  assert.ok(parsedCount >= 10, `实际只校验了 ${parsedCount} 份 initvar`);
  console.info(`  已校验 ${parsedCount} 份有效 initvar，另有 ${invalidYamlCount} 份原文件 YAML 语法无效并跳过`);
});

test('变量规则与输出格式 YAML 可解析', () => {
  const protocolDirectory = path.join(process.cwd(), 'src', '灯火阑珊', '灯火阑珊-世界书', '变量更新规则&变量输出格式');
  const updateRuleText = fs.readFileSync(path.join(protocolDirectory, '[mvu_update]变量更新规则.yaml'), 'utf8');
  const outputFormatText = fs.readFileSync(path.join(protocolDirectory, '[mvu_update]变量输出格式.yaml'), 'utf8');
  assert.doesNotThrow(() => YAML.parse(updateRuleText));
  assert.doesNotThrow(() => YAML.parse(outputFormatText));
  assert.match(updateRuleText, /每轮先做“任务审计”/u);
  assert.match(updateRuleText, /同一 JSONPatch 必须 insert 接续任务/u);
  assert.match(outputFormatText, /任务生命周期示例/u);
});

let passed = 0;
for (const current of tests) {
  try {
    current.run();
    passed += 1;
    console.info(`✓ ${current.name}`);
  } catch (error) {
    console.error(`✗ ${current.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.info(`灯火阑珊 Schema 专项校验通过：${passed}/${tests.length}`);
}
