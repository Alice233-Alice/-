/* eslint-disable import-x/no-nodejs-modules, import-x/no-dynamic-require */

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
  Schema,
  CURRENT_CULTIVATION_VERSION,
  CURRENT_SCHEMA_VERSION,
  getRealmThreshold,
  getBreakthroughCost,
  previewCultivationBreakthrough,
  migrateCultivationProgress,
} = require('../src/灯火阑珊/schema');
const { executeUpdateVariable, makeUpdateVariable } = require('./lantern-mvu-harness');

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.info(`PASS ${name}`);
}
function parse(protagonist: unknown, companions: unknown = {}) {
  return Schema.parse({ 本尊: protagonist, 红颜: companions });
}
function replay(oldData: unknown, patch: unknown[]) {
  const result = executeUpdateVariable(oldData, makeUpdateVariable('按实际修炼经过完成结算。', patch));
  assert.deepEqual(result.errors, []);
  assert.equal(result.fullRollback, false);
  assert.deepEqual(Schema.parse(result.finalData), result.finalData);
  return result.finalData;
}

test('白清弦默认资料及三份JSON结构与渡劫中期人设一致', () => {
  const white = Schema.parse({}).红颜角色库.白清弦;
  assert.equal(white.级, 34);
  assert.equal(white.根, '天金灵根');
  assert.equal(white.质, '先天剑骨');
  assert.equal(white.器, '戮天剑');
  for (const frontend of ['灯火阑珊', '灯火通明', '灯火通明-测试版']) {
    const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', frontend, 'schema.json'), 'utf8'));
    assert.deepEqual(
      json.properties.红颜角色库.default.白清弦,
      require('../src/灯火阑珊/schema').DEFAULT_CHARACTER_LIB.白清弦,
    );
  }
});

test('满修为与超额积累保持等级和每一种明确选择的阶段', () => {
  for (const 阶段 of ['修炼中', '瓶颈中', '突破中', '稳固中', '压境中']) {
    const data = parse({ 等级: 6, 修为: 660, 修炼状态: { 阶段 } });
    assert.equal(data.本尊.等级, 6);
    assert.equal(data.本尊.修为, 660);
    assert.equal(data.本尊.修炼状态.阶段, 阶段);
    assert.equal(data.本尊.尝试突破, 阶段 === '突破中');
    assert.equal(data.本尊.积累已足, true);
    assert.equal(data.本尊.盈余修为, 60);
    assert.equal(data.本尊.进度, '100.0%');
    assert.deepEqual(Schema.parse(data), data);
  }
});

test('旧尝试突破标记只在阶段缺失时迁移', () => {
  for (const 阶段 of ['修炼中', '稳固中', '压境中']) {
    const data = parse({ 等级: 6, 修为: 660, 尝试突破: true, 修炼状态: { 阶段 } });
    assert.equal(data.本尊.修炼状态.阶段, 阶段);
    assert.equal(data.本尊.尝试突破, false);
  }
  const legacy = parse({ 等级: 6, 修为: 660, 尝试突破: true });
  assert.equal(legacy.本尊.修炼状态.阶段, '突破中');
  assert.deepEqual(Schema.parse(legacy), legacy);
});

test('旧字段升级为最近突破记录且不触发重复结算', () => {
  const data = parse({
    等级: 7,
    修为: 60,
    修炼状态: { 阶段: '修炼中', 上次结果: '成功', 境界变动: { 类型: '突破', 目标等级: 7, 依据: '昨日冲关已成。' } },
  });
  assert.equal(data.本尊.修炼状态.最近突破.依据, '昨日冲关已成。');
  assert.equal(data.本尊.修炼状态.最近突破.目标等级, 7);
  assert.equal(data.本尊.修为, 60);
  assert.equal(data.本尊.等级, 7);
  assert.deepEqual(Schema.parse(Schema.parse(data)), data);
});

test('修炼计划、时间与明确瓶颈在反复解析中完整保留', () => {
  const data = parse({
    等级: 6,
    修为: 660,
    修炼状态: {
      阶段: '压境中',
      方式: '温养经脉',
      地点: '听月水榭',
      计划年数: '0.5',
      已修炼年数: 0.25,
      瓶颈原因: '等待护道人归来',
    },
  });
  assert.equal(data.本尊.修炼状态.计划年数, 0.5);
  assert.equal(data.本尊.修炼状态.已修炼年数, 0.25);
  assert.equal(data.本尊.修炼状态.瓶颈原因, '等待护道人归来');
  assert.deepEqual(Schema.parse(data), data);
});

test('日常delta跨过阈值后保留全部增长且不自动冲关', () => {
  const data = replay(parse({ 等级: 6, 修为: 590 }), [{ op: 'delta', path: '/本尊/修为', value: 100 }]);
  assert.equal(data.本尊.等级, 6);
  assert.equal(data.本尊.修为, 690);
  assert.equal(data.本尊.盈余修为, 90);
  assert.equal(data.本尊.修炼状态.阶段, '修炼中');
});

test('截图中的化神初期delta八百可以完整写入', () => {
  const data = replay(parse({ 等级: 17, 修为: 0 }), [{ op: 'delta', path: '/本尊/修为', value: 800 }]);
  assert.equal(data.本尊.修为, 800);
  assert.equal(data.本尊.突破阈值, 4800);
  assert.equal(data.本尊.积累已足, false);
});

test('成功突破按明确余额写入，后续解析不再扣除', () => {
  const oldData = parse({ 等级: 6, 修为: 660, 修炼状态: { 阶段: '突破中' } });
  const preview = previewCultivationBreakthrough(6, 660);
  assert.deepEqual(preview, { 目标等级: 7, 所需修为: 600, 剩余修为: 60, 积累已足: true });
  const data = replay(oldData, [
    { op: 'replace', path: '/本尊/等级', value: preview.目标等级 },
    { op: 'replace', path: '/本尊/修为', value: preview.剩余修为 },
    { op: 'replace', path: '/本尊/修炼状态/阶段', value: '稳固中' },
    { op: 'replace', path: '/本尊/修炼状态/上次结果', value: '成功' },
    {
      op: 'replace',
      path: '/本尊/修炼状态/最近突破',
      value: { 类型: '突破', 原等级: 6, 目标等级: 7, 消耗修为: 600, 依据: '主动冲关后晋入筑基后期。', 时地: '静室' },
    },
  ]);
  assert.equal(data.本尊.等级, 7);
  assert.equal(data.本尊.修为, 60);
  assert.equal(data.本尊.尝试突破, false);
  assert.equal(data.本尊.修炼状态.最近突破.消耗修为, 600);
});

test('失败和中断保留等级，只扣除明确损耗并退出冲关', () => {
  for (const result of ['失败', '中断']) {
    const data = replay(parse({ 等级: 6, 修为: 660, 修炼状态: { 阶段: '突破中' } }), [
      { op: 'delta', path: '/本尊/修为', value: result === '失败' ? -40 : 0 },
      { op: 'replace', path: '/本尊/修炼状态/阶段', value: '稳固中' },
      { op: 'replace', path: '/本尊/修炼状态/上次结果', value: result },
    ]);
    assert.equal(data.本尊.等级, 6);
    assert.equal(data.本尊.修为, result === '失败' ? 620 : 660);
    assert.equal(data.本尊.尝试突破, false);
    assert.equal(data.本尊.修炼状态.上次结果, result);
  }
});

test('连续突破逐阶计算消耗，并保留同轮额外增长', () => {
  assert.equal(getBreakthroughCost(6, 8), 1300);
  const preview = previewCultivationBreakthrough(6, 1500, 8);
  assert.equal(preview.剩余修为, 200);
  const data = replay(parse({ 等级: 6, 修为: 1400 }), [
    { op: 'replace', path: '/本尊/等级', value: 8 },
    { op: 'replace', path: '/本尊/修为', value: 200 },
    { op: 'replace', path: '/本尊/修炼状态/阶段', value: '稳固中' },
  ]);
  assert.equal(data.本尊.等级, 8);
  assert.equal(data.本尊.修为, 200);
});

test('红颜采用相同规则，满值可保持压境且明确跌境不会被回退', () => {
  const oldData = parse({}, { 白清弦: { 等级: 6, 修为: 660, 尝试突破: true, 修炼状态: { 阶段: '压境中' } } });
  assert.equal(oldData.红颜.白清弦.尝试突破, false);
  const data = replay(oldData, [
    { op: 'replace', path: '/红颜/白清弦/等级', value: 5 },
    { op: 'replace', path: '/红颜/白清弦/修为', value: 120 },
    { op: 'replace', path: '/红颜/白清弦/修炼状态/阶段', value: '稳固中' },
  ]);
  assert.equal(data.红颜.白清弦.等级, 5);
  assert.equal(data.红颜.白清弦.修为, 120);
});

test('最高等级保留积累且不生成越界突破目标', () => {
  const data = parse({ 等级: 48, 修为: getRealmThreshold(48) + 200, 修炼状态: { 阶段: '压境中' } });
  assert.equal(data.本尊.等级, 48);
  assert.equal(data.本尊.修为, getRealmThreshold(48) + 200);
  assert.equal(data.本尊.积累已足, false);
  assert.equal(data.本尊.修炼状态.突破目标, '');
  assert.equal(previewCultivationBreakthrough(48, data.本尊.修为).目标等级, 0);
});

test('v3点数与小数时长迁移保持原值，旧阈值版本仅迁移一次', () => {
  assert.equal(migrateCultivationProgress(6, 600.25, 3, CURRENT_CULTIVATION_VERSION), 600.25);
  const data = Schema.parse({ 本尊: { 等级: 6, 修为: 600.25 }, _系统设置: { 修炼系统版本: 3 } });
  assert.equal(data.本尊.修为, 600.25);
  assert.equal(data._系统设置.变量结构版本, CURRENT_SCHEMA_VERSION);
  assert.equal(data._系统设置.修炼系统版本, CURRENT_CULTIVATION_VERSION);
  assert.deepEqual(Schema.parse(data), data);
});

test('前端入口和所有同名子模块共享唯一结构定义', () => {
  assert.equal(require('../src/灯火通明/schema').Schema, Schema);
  for (const name of ['common', 'characters', 'protagonist', 'constants', 'systems', 'world', 'utils']) {
    const bright = require('../src/灯火通明/schema/' + name);
    const canonical = require('../src/灯火阑珊/schema/' + name);
    for (const key of Object.keys(canonical)) assert.equal(bright[key], canonical[key], name + '.' + key);
  }
});

test('全部已有有效开局保留等级与修为点数并可重复读取', () => {
  const directory = path.join(process.cwd(), 'src', '灯火阑珊', '第一条消息');
  const files = fs
    .readdirSync(directory, { recursive: true })
    .map((file: string) => path.join(directory, file))
    .filter((file: string) => file.endsWith('.yaml') && fs.statSync(file).isFile());
  let valid = 0;
  const invalid: string[] = [];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const blocks = [...source.matchAll(/<initvar>\s*([\s\S]*?)\s*<\/initvar>/gu)].map(match => match[1]);
    if (path.basename(file) === '开局initvar.yaml') blocks.push(source);
    for (const block of blocks) {
      let original: any;
      try {
        original = YAML.parse(block);
      } catch {
        invalid.push(path.relative(directory, file));
        continue;
      }
      const data = Schema.parse(original);
      assert.deepEqual(Schema.parse(data), data, file);
      const expectedLevel = Math.max(1, Math.min(48, Math.floor(Number(original?.本尊?.等级) || 1)));
      const version = Number(original?._系统设置?.修炼系统版本 ?? CURRENT_CULTIVATION_VERSION);
      const expectedAmount = migrateCultivationProgress(
        expectedLevel,
        original?.本尊?.修为 ?? 0,
        version,
        CURRENT_CULTIVATION_VERSION,
      );
      assert.equal(data.本尊.等级, expectedLevel, file);
      assert.equal(data.本尊.修为, expectedAmount, file);
      valid += 1;
    }
  }
  assert.ok(valid >= 10);
  console.info(JSON.stringify({ validOpeningBlocks: valid, existingInvalidYaml: invalid }));
});

for (const frontend of ['灯火通明', '灯火通明-测试版']) {
  test(`${frontend}红颜预设可编辑境界并完整导入导出修行与羁绊`, () => {
    const vm = require('node:vm');
    const ts = require('typescript');
    const schemaModule = require('../src/灯火阑珊/schema');
    const original = parse(
      {
        等级: 6,
        修为: 660,
        修炼状态: { 阶段: '压境中', 方式: '温养经脉', 地点: '静室', 根基描述: '经脉已渐稳固', 已修炼年数: 0.25 },
      },
      {
        白清弦: {
          等级: 34,
          修为: 100,
          羁绊纪事: { 护道旧约: { 类型: '承诺', 摘要: '结伴护道。', 时地: '抱雪峰' } },
          修炼状态: {
            阶段: '稳固中',
            上次结果: '成功',
            最近突破: { 类型: '突破', 原等级: 33, 目标等级: 34, 消耗修为: getRealmThreshold(33), 依据: '闭关破境。' },
          },
        },
      },
    );
    original.红颜角色库.自定义道友 = { ...original.红颜角色库.白清弦, 级: 42, 龄: '外25实766' };
    const component = fs.readFileSync(path.join(process.cwd(), `src/${frontend}/components/PresetPanel.vue`), 'utf8');
    const script = component.match(/<script setup[^>]*>([\s\S]*?)<\/script>/u)?.[1];
    assert.ok(script);
    let exported: any;
    const host: any = {
      exports: {},
      _: lodash,
      console,
      ref: (value: unknown) => ({ value }),
      computed: (getter: () => unknown) => ({
        get value() {
          return getter();
        },
      }),
      onMounted: () => {},
      toastr: {
        success: () => {},
        error: (message: string) => {
          throw Error(message);
        },
      },
      Blob: class {
        content: string;
        constructor(parts: string[]) {
          this.content = parts.join('');
        }
      },
      URL: {
        createObjectURL: (blob: { content: string }) => {
          exported = JSON.parse(blob.content);
          return 'blob:preset-test';
        },
        revokeObjectURL: () => {},
      },
      document: { createElement: () => ({ click: () => {}, remove: () => {} }), body: { appendChild: () => {} } },
      FileReader: class {
        onload: (event: unknown) => void = () => {};
        readAsText(file: { content: string }) {
          this.onload({ target: { result: file.content } });
        }
      },
      require: (id: string) => {
        if (id === '../schema') return schemaModule;
        if (id === '../store') return { useDataStore: () => original };
        if (id === '../quest-preset') return require('../src/灯火通明/quest-preset');
        throw Error('Unexpected dependency: ' + id);
      },
    };
    const compiled = ts.transpileModule(script, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(
      compiled +
        '\nglobalThis.presetTest = { loadCurrentData, exportPreset, importPreset, convertCompanionsToMvu, formData, toggleCompanion };',
      host,
    );
    host.presetTest.loadCurrentData();
    const draft = host.presetTest.formData.value.红颜.白清弦;
    Object.assign(draft, {
      等级: 35, 修为: 12345.5, 灵根: '自定灵根', 体质: '自定道体', 功法: '自定功法',
      本命兵器: '自定神兵', 灵石: 54321, 已活岁月: 2401,
    });
    draft.修炼状态.阶段 = '压境中';
    draft.修炼状态.方式 = '温养剑骨';
    draft.修炼状态.计划年数 = 0.75;
    draft.修炼状态.已修炼年数 = 0.25;
    const expectedCompanion = JSON.parse(JSON.stringify(draft));
    host.presetTest.toggleCompanion('自定义道友');
    assert.equal(host.presetTest.formData.value.红颜.自定义道友.等级, 42);
    assert.equal(host.presetTest.formData.value.红颜.自定义道友.已活岁月, 766);
    host.presetTest.exportPreset();
    assert.deepEqual(exported.preset.基础属性.修炼状态, original.本尊.修炼状态);
    assert.deepEqual(exported.preset.红颜.白清弦, expectedCompanion);
    host.presetTest.formData.value.修炼状态 = schemaModule.ProtagonistSchema.parse({}).修炼状态;
    host.presetTest.formData.value.红颜 = {};
    host.presetTest.importPreset({ target: { files: [{ content: JSON.stringify(exported) }], value: 'preset.json' } });
    assert.equal(host.presetTest.formData.value.修炼状态.阶段, '压境中');
    assert.equal(host.presetTest.formData.value.修炼状态.根基描述, '经脉已渐稳固');
    const companion = host.presetTest.convertCompanionsToMvu().白清弦;
    assert.equal(companion.修炼状态.阶段, '压境中');
    assert.deepEqual(
      schemaModule.CompanionSchema.parse(companion),
      schemaModule.CompanionSchema.parse(expectedCompanion),
    );
    assert.equal(schemaModule.CompanionSchema.parse(companion).境界描述, '渡劫后期');
    assert.equal(companion.修炼状态.最近突破.消耗修为, getRealmThreshold(33));
  });
}

console.info(`${passed} cultivation and preset regressions passed.`);
