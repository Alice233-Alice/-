/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { argv: string[]; exitCode?: number };

const assert = require('node:assert/strict');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');
const { getRealmThreshold } = require('../src/灯火阑珊/schema.ts');

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function readNumberArgument(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const inline = process.argv.find(argument => argument.startsWith(prefix));
  if (inline) return Number(inline.slice(prefix.length)) || fallback;
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? Number(process.argv[index + 1]) || fallback : fallback;
}

const seed = readNumberArgument('seed', 20260730);
const runs = readNumberArgument('runs', 500);
const random = new SeededRandom(seed);
const stats = {
  accepted: 0,
  rejectedAsExpected: 0,
  commandGuardInterventions: 0,
  schemaRepairs: 0,
  warningRuns: 0,
};

for (let index = 0; index < runs; index += 1) {
  const variant = index % 13;
  const level = random.int(1, 47);
  let oldData: any = {
    本尊: {
      等级: level,
      修为: getRealmThreshold(level),
    },
  };
  let update = '';
  let expectReject = false;

  switch (variant) {
    case 0: {
      const target = level + 1;
      update = makeUpdateVariable('普通突破', [
        { op: 'replace', path: '/本尊/等级', value: target },
        { op: 'replace', path: '/本尊/修为', value: 0 },
        { op: 'replace', path: '/本尊/修炼状态/阶段', value: '稳固中' },
        { op: 'replace', path: '/本尊/修炼状态/上次结果', value: '成功' },
        {
          op: 'replace',
          path: '/本尊/修炼状态/境界变动',
          value: { 类型: '突破', 目标等级: target, 依据: '' },
        },
        { op: 'replace', path: '/本尊/尝试突破', value: false },
      ]);
      break;
    }
    case 1: {
      const target = Math.min(48, level + random.int(2, 5));
      update = makeUpdateVariable('无依据跨级污染', [
        { op: 'replace', path: '/本尊/等级', value: target },
        { op: 'replace', path: '/本尊/修为', value: 0 },
        {
          op: 'replace',
          path: '/本尊/修炼状态/境界变动',
          value: { 类型: '跨级突破', 目标等级: target, 依据: '' },
        },
      ]);
      break;
    }
    case 2: {
      const oldLevel = random.int(2, 48);
      oldData = { 本尊: { 等级: oldLevel, 修为: getRealmThreshold(oldLevel) } };
      const target = random.int(1, oldLevel - 1);
      update = makeUpdateVariable('无依据跌境污染', [
        { op: 'replace', path: '/本尊/等级', value: target },
        {
          op: 'replace',
          path: '/本尊/修炼状态/境界变动',
          value: { 类型: '跌境', 目标等级: target, 依据: '' },
        },
      ]);
      break;
    }
    case 3:
      update = makeUpdateVariable('派生字段污染', [{ op: 'replace', path: '/本尊/境界描述', value: '错误境界' }]);
      break;
    case 4:
      update = makeUpdateVariable('非法世界库污染', [{ op: 'insert', path: `/地点库/破损地点${index}`, value: null }]);
      break;
    case 5:
      update = makeUpdateVariable('库存数量污染', [
        {
          op: 'insert',
          path: `/本尊/背包/测试物品${index}`,
          value: { 名称: `测试物品${index}`, 数量: random.int(-5, 5), 描述: '随机测试' },
        },
      ]);
      break;
    case 6:
      update = makeUpdateVariable('建立随机任务', [
        {
          op: 'insert',
          path: `/任务列表/测试任务${index}`,
          value: { 名称: `测试任务${index}`, 类型: '支线', 目标: '完成随机回放检查。', 状态: '进行中' },
        },
      ]);
      break;
    case 7:
      oldData = {
        本尊: { 等级: level },
        红颜: { 虞汐颜: { 等级: 1, 好感度: 10, 关系: '初识' } },
        _好感度快照: { 虞汐颜: 10 },
      };
      update = makeUpdateVariable('繁体别名污染', [
        { op: 'delta', path: '/紅顏/虞汐/好感度', value: random.int(1, 4) },
      ]);
      break;
    case 8:
      update = makeUpdateVariable('父子路径冲突', [
        { op: 'replace', path: '/本尊/身份', value: { 姓名: '甲', 宗门: '散修', 出身: '凡人' } },
        { op: 'replace', path: '/本尊/身份/姓名', value: '乙' },
      ]);
      expectReject = true;
      break;
    case 9:
      update = makeUpdateVariable('越界等级污染', [
        { op: 'replace', path: '/本尊/等级', value: random.next() > 0.5 ? 999 : -999 },
      ]);
      break;
    case 10:
      update = makeUpdateVariable('重复行动污染', [
        {
          op: 'replace',
          path: '/$可参与机遇',
          value: [
            { 行动: '查看石门', 类型: '探索' },
            { 行动: ' 查看石门 ', 类型: '探索' },
            { 行动: '', 类型: '探索' },
          ],
        },
      ]);
      break;
    case 11:
      update = makeUpdateVariable('非法任务污染', [{ op: 'insert', path: `/任务列表/损坏任务${index}`, value: null }]);
      break;
    case 12:
      update = makeUpdateVariable('负修为污染', [{ op: 'replace', path: '/本尊/修为', value: -random.int(1, 10000) }]);
      break;
  }

  try {
    const result = executeUpdateVariable(oldData, update);
    if (expectReject) {
      throw new Error(`第 ${index} 轮预期拒绝，但更新被接受`);
    }
    assert.deepEqual(result.errors, [], `第 ${index} 轮不变量失败`);
    assert.equal(result.fullRollback, false, `第 ${index} 轮触发整份快照恢复`);
    stats.accepted += 1;
    if (result.commandGuardIntervened) stats.commandGuardInterventions += 1;
    if (result.schemaRepairIntervened) stats.schemaRepairs += 1;
    if (result.warnings.length > 0) stats.warningRuns += 1;
  } catch (error) {
    if (expectReject && String(error).includes('路径冲突')) {
      stats.rejectedAsExpected += 1;
      continue;
    }
    console.error(`Fuzz 失败：seed=${seed} run=${index} variant=${variant}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (!process.exitCode) {
  console.info(
    [
      `灯火阑珊 MVU fuzz 通过：seed=${seed} runs=${runs}`,
      `接受=${stats.accepted}`,
      `按预期拒绝=${stats.rejectedAsExpected}`,
      `命令守卫介入=${stats.commandGuardInterventions}`,
      `Schema局部修复=${stats.schemaRepairs}`,
      `产生警告=${stats.warningRuns}`,
    ].join(' | '),
  );
}
