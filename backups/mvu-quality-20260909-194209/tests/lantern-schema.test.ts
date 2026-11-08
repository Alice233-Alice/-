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
  compareRealmStanding,
  describeRealmByLevel,
  getRealmThreshold,
  resolveBattleMomentum,
} = require('../src/灯火阑珊/schema');
const BrightSchemaModule = require('../src/灯火通明/schema.ts');
const { resolveMapAnchor } = require('../src/灯火阑珊/map-system');
const { inferLayerFromTrack } = require('../src/灯火阑珊/region-utils');
const { getBurdenTone } = require('../src/灯火通明/components/combat-utils');
const { buildFallbackActions, resolveActionFeed } = require('../src/灯火通明/action-feed');
const { preservesRelationshipContinuity } = require('../src/灯火通明/narrative-continuity');
const { getWorldEventEntries, selectWorldEventsForDisplay } = require('../src/灯火通明/world-events');
const { parseWorldEventPatchOperation, restoreWorldEventLedger } = require('../src/灯火通明/world-event-patch-guard');
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

test('默认值采用盛法时代与 v5 变量结构', () => {
  const data = parse();
  assert.equal(data.世界时钟.纪元, '盛法时代');
  assert.equal(data._系统设置.变量结构版本, 5);
  assert.equal(data._系统设置.修炼系统版本, 3);
  assert.deepEqual(data.本尊.战斗状态, {
    正在战斗: false,
    阶段: '平静',
    交锋轮次: 0,
    战局: {
      态势: '相持',
      我方目的: '',
      敌方目的: '',
      战场要素: [],
      态势依据: [],
      战机: [],
      危机: [],
      已显手段: { 我方: [], 敌方: [] },
      最近转折: '',
    },
    负荷: { 真元: '充盈', 神识: '澄明', 肉身: '无恙' },
    最近战果: { 结果: '无', 对手: [], 达成: '', 代价: [], 后患: [] },
  });
  assert.deepEqual(data.本尊.当前敌人, {});
});

test('灯火通明与灯火阑珊引用同一 Schema 实例', () => {
  assert.equal(BrightSchemaModule.Schema, Schema);
});

test('独立海域与地图锚点可由 initvar 保留且保持幂等', () => {
  const seaDomains = ['潮音海', '龙眠海', '蓬莱幻海', '北冥冰海', '无尽洋', '天泣洋', '永夜海域', '雷暴海'];
  const 地点库 = Object.fromEntries(
    seaDomains.map((域, index) => [`海域${index + 1}`, { 域, 类: '地形', 危: 30, 特: `${域}航标`, 资: [] }]),
  );
  const data = parse({
    地点库,
    $地图锚点: { 栖溟浮岛: '龙眠海峡' },
  });

  seaDomains.forEach((域, index) => assert.equal(data.地点库[`海域${index + 1}`].域, 域));
  assert.deepEqual(data.$地图锚点, { 栖溟浮岛: '龙眠海峡' });
  assert.deepEqual(parse(data), data);
});

test('地图锚点优先于泛层级，并可从旧地点描述兼容推断', () => {
  const sharedInput = {
    currentRegion: '栖溟浮岛',
    currentDomain: '天层',
    locationLib: {
      栖溟浮岛: { 域: '天层', 特: '悬于龙眠海峡之上的太古浮空仙岛' },
    },
    worldMap: {
      栖溟浮岛: { layer: '天层', desc: '龙眠海峡万丈九霄之上的隐修道场', connections: ['龙眠海峡'] },
    },
  };

  assert.equal(resolveMapAnchor({ ...sharedInput, anchors: { 栖溟浮岛: '龙眠海峡' } }), '龙眠海峡');
  assert.equal(resolveMapAnchor(sharedInput), '龙眠海峡');
  assert.equal(
    inferLayerFromTrack('栖溟浮岛', '天层', '云海茫茫', sharedInput.locationLib, sharedInput.worldMap, '神州'),
    '天层',
  );
});

test('优化版地理地图均已登记到三张伪同层舆图', () => {
  const mapDirectory = path.join(process.cwd(), 'src', '灯火阑珊', '灯火阑珊-世界书', '优化版地图');
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), 'src', '灯火通明', 'components', 'WorldMapCanvas.vue'),
    'utf8',
  );
  const mapNames = fs
    .readdirSync(mapDirectory)
    .filter((name: string) => name.startsWith('[地图] ') && name.endsWith('.yaml'))
    .map((name: string) => name.slice('[地图] '.length, -'.yaml'.length))
    .filter((name: string) => !['世界空间结构', '九野通衢·寰宇阵枢', '异变感应网', '宗门势力关系网'].includes(name));

  mapNames.forEach((name: string) => assert.ok(componentSource.includes(name), `伪同层舆图缺少地图条目：${name}`));
});

test('本尊档案独立于可更新身份并保持幂等', () => {
  const data = parse({
    本尊: {
      身份: {
        姓名: '苓沅',
        宗门: '太仪剑尊遗脉',
        出身: '太仪一脉抱剑客',
      },
      _档案: '太仪一脉孤身行世。\r\n惯于抱剑独行，不涉宗阀。',
    },
  });

  assert.equal(data.本尊.身份.出身, '太仪一脉抱剑客');
  assert.equal(data.本尊._档案, '太仪一脉孤身行世。\n惯于抱剑独行，不涉宗阀。');
  assert.deepEqual(parse(data), data);
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
  assert.equal(migrated._系统设置.变量结构版本, 5);
});

test('旧红颜数据迁移后补齐空羁绊纪事并保持幂等', () => {
  const migrated = parse({
    红颜: {
      许听雨: {
        好感度: 18,
        关系: '灯会同行',
        关系上下文: { 当前情绪: '微生好奇' },
      },
    },
    _系统设置: { 变量结构版本: 2 },
  });

  assert.deepEqual(migrated.红颜.许听雨.羁绊纪事, {});
  assert.equal(migrated._系统设置.变量结构版本, 5);
  assert.deepEqual(parse(migrated), migrated);
});

test('羁绊纪事修复缺省类型并只保留最近八条', () => {
  const chronicle = Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => [
      `纪事${index + 1}`,
      {
        ...(index === 8 ? { 类型: '不合法类型' } : { 类型: '交心' }),
        摘要: `共同经历${index + 1}`,
        时地: `盛法1年·地点${index + 1}`,
      },
    ]),
  );
  const data = parse({ 红颜: { 许听雨: { 羁绊纪事: chronicle } } });

  assert.deepEqual(Object.keys(data.红颜.许听雨.羁绊纪事), [
    '纪事2',
    '纪事3',
    '纪事4',
    '纪事5',
    '纪事6',
    '纪事7',
    '纪事8',
    '纪事9',
  ]);
  assert.equal(data.红颜.许听雨.羁绊纪事.纪事9.类型, '其他');
  assert.deepEqual(parse(data), data);
});

test('红颜别名合并时合并羁绊纪事且不覆盖旧记录', () => {
  const data = parse({
    红颜: {
      虞汐颜: {
        羁绊纪事: {
          双鱼初醒: { 类型: '相识', 摘要: '双魂初次苏醒。', 时地: '盛法1年·白鹭镇' },
        },
      },
      虞汐: {
        羁绊纪事: {
          月下交心: { 类型: '交心', 摘要: '虞汐坦露心中忧惧。', 时地: '盛法1年·月下' },
        },
      },
    },
  });

  assert.equal(data.红颜.虞汐, undefined);
  assert.deepEqual(Object.keys(data.红颜.虞汐颜.羁绊纪事), ['双鱼初醒', '月下交心']);
  assert.deepEqual(parse(data), data);
});

test('乘黄身份称谓归一为梦杳泠且保持幂等', () => {
  const data = parse({
    红颜: {
      梦杳泠: { 好感度: 1, 关系: '初识' },
      乘黄少女: {
        好感度: 3,
        关系上下文: { 当前情绪: '吃饱后放松下来' },
        羁绊纪事: {
          初尝灵果: { 类型: '相识', 摘要: '接受你的喂食后蜷在怀中入睡。', 时地: '盛法1年·青石桥' },
        },
      },
    },
    _好感度快照: { 梦杳泠: 1, 乘黄少女: 3 },
  });

  assert.equal(data.红颜.乘黄少女, undefined);
  assert.equal(data.红颜.梦杳泠.好感度, 3);
  assert.equal(data.红颜.梦杳泠.关系上下文.当前情绪, '吃饱后放松下来');
  assert.equal(data.红颜.梦杳泠.羁绊纪事.初尝灵果.类型, '相识');
  assert.equal(data._好感度快照.乘黄少女, undefined);
  assert.equal(data._好感度快照.梦杳泠, 3);
  assert.deepEqual(parse(data), data);
});

test('羽岚进入默认角色库且旧名、昵称归一', () => {
  const data = parse({
    红颜: {
      羽岚烟: {
        等级: 9,
        好感度: 4,
        关系: '初识',
        关系上下文: { 当前情绪: '愿与你谈论天渊潮汐' },
      },
    },
    _好感度快照: { 岚烟: 4 },
  });

  assert.deepEqual(data.红颜角色库.羽岚, {
    级: 9,
    根: '虚灵根',
    质: '天渊之鸟血脉/当代圣羽',
    龄: '实历三百/化形二十',
    属: '妖族·青羽云雀/渊缘行者',
    法: '青羽族传（功职同源）',
    器: '青翎（化符成刃）',
    通: ['鸣啭', '一步缩地', '折叠藏物', '渊域展翼'],
    自定义立绘: { 正面: '', 背面: '' },
  });
  assert.equal(data.红颜.羽岚烟, undefined);
  assert.equal(data.红颜.岚烟, undefined);
  assert.equal(data.红颜.羽岚.好感度, 4);
  assert.equal(data.红颜.羽岚.境界描述, '金丹初期');
  assert.equal(data._好感度快照.岚烟, undefined);
  assert.equal(data._好感度快照.羽岚, 4);
  assert.deepEqual(parse(data), data);
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
  assert.equal(data.$可参与机遇.length, 1);
  assert.equal(Object.hasOwn(data, '可参与机遇'), false);
  assert.deepEqual(parse(data), data);
});

test('旧式分级灵石账本迁移为标量且保持幂等', () => {
  const directLedger = parse({ 本尊: { 灵石: { 下品灵石: 120 } } });
  const itemLedger = parse({ 本尊: { 灵石: { 下品灵石: { 数量: '80' } } } });

  assert.equal(directLedger.本尊.灵石, 120);
  assert.equal(itemLedger.本尊.灵石, 80);
  assert.deepEqual(parse(directLedger), directLedger);
  assert.deepEqual(parse(itemLedger), itemLedger);
});

test('叙事提案在 220 字上限内完整保留并继续限制提示长度', () => {
  const targetLengthAction = '探'.repeat(70);
  const overLimitAction = '行'.repeat(221);
  const data = parse({
    $可参与机遇: [
      { 行动: targetLengthAction, 类型: '探索', 提示: '险'.repeat(29) },
      { 行动: overLimitAction, 类型: '交涉' },
    ],
  });

  assert.equal(data.$可参与机遇[0].行动, targetLengthAction);
  assert.equal(Array.from(data.$可参与机遇[0].行动).length, 70);
  assert.equal(Array.from(data.$可参与机遇[0].提示 ?? '').length, 28);
  assert.equal(Array.from(data.$可参与机遇[1].行动).length, 220);
  assert.equal(data.$可参与机遇[1].行动, '行'.repeat(220));
  assert.deepEqual(parse(data), data);
});

test('英文键名与英文类型的行动 patch 可归一为界面结构', () => {
  const data = parse({
    可参与机遇: [
      {
        op: 'replace',
        path: '/$可参与机遇',
        value: [
          { action: '放下茶盏，握住她的手。', type: '亲密' },
          { action: '起身探索冰蛟草生长之处。', type: 'exploration' },
          { action: '借洞中灵气运转周天。', type: 'cultivation', hint: '稳固当前境界' },
        ],
      },
    ],
  });

  assert.deepEqual(data.$可参与机遇, [
    { 行动: '放下茶盏，握住她的手。', 类型: '亲密', 叙事类型: '当前行动', 事件性质: '无事件' },
    { 行动: '起身探索冰蛟草生长之处。', 类型: '探索', 叙事类型: '当前行动', 事件性质: '无事件' },
    {
      行动: '借洞中灵气运转周天。',
      类型: '修炼',
      叙事类型: '当前行动',
      事件性质: '无事件',
      提示: '稳固当前境界',
    },
  ]);
  assert.deepEqual(parse(data), data);
});

test('候选事件提案与已发生事件回应保持不同事实语义', () => {
  const data = parse({
    $可参与机遇: [
      {
        标题: '檐下陌生灵羽',
        行动: '檐角忽然落下一枚带着淡金水汽的陌生灵羽；先以神识隔空查验，再询问掌柜今晨可曾见过异鸟。',
        类型: '探索',
        叙事类型: '事件行动',
        事件性质: '选中后成立',
        事件: '客栈檐角落下一枚来历不明的淡金灵羽',
      },
      {
        标题: '再访潮生渡口',
        行动: '前往潮生渡口查看潮痕与失踪渡船的新动向，先听取船工说法，不贸然下水。',
        类型: '探索',
        叙事类型: '回应事件',
        事件性质: '回应已发生事件',
        关联事件ID: '潮生渡口失舟',
      },
    ],
  });

  assert.equal(data.$可参与机遇[0].事件性质, '选中后成立');
  assert.equal(data.$可参与机遇[0].事件, '客栈檐角落下一枚来历不明的淡金灵羽');
  assert.equal(data.$可参与机遇[1].事件性质, '回应已发生事件');
  assert.equal(data.$可参与机遇[1].关联事件ID, '潮生渡口失舟');
  assert.deepEqual(parse(data), data);
});

test('世界图志迁移事件阶段并将过重影响收敛为可控档位', () => {
  const data = parse({
    世界图志: {
      潮生渡口失舟: {
        状态: '发展',
        事件: '两艘渡船未按时返航，岸边留下逆潮水痕。',
        地点: '潮生渡口',
        最近变化: '船工在下游发现一段完好的系舟绳。',
        可见影响: ['夜航暂缓', '茶棚里多了寻船传闻'],
        参与情况: '关注',
        影响等级: '灾难',
        更新时间: '盛法1年1月2日·辰时',
      },
    },
  });

  assert.equal(data.世界图志.潮生渡口失舟.状态, '活跃');
  assert.equal(data.世界图志.潮生渡口失舟.阶段, '发展');
  assert.equal(data.世界图志.潮生渡口失舟.参与情况, '旁观');
  assert.equal(data.世界图志.潮生渡口失舟.影响等级, '显著');
  assert.deepEqual(parse(data), data);
});

test('世界事件守卫恢复被旧版 MVU 裁掉的完整事件字段', () => {
  const insertOperation = parseWorldEventPatchOperation(
    JSON.stringify({
      op: 'insert',
      path: '/世界图志/青石古井魂引',
      value: {
        状态: '已平息',
        阶段: '落幕',
        事件: '古井残魂已经归乡。',
        地点: '青石镇古井巷',
        可见影响: ['井中地煞余气暂熄'],
        参与情况: '主导',
        影响等级: '轻变',
        更新时间: '盛法1年1月1日·卯时',
      },
    }),
  );
  assert.ok(insertOperation);

  const restored = restoreWorldEventLedger(
    {
      敛骨荒坞大醮平息: {
        状态: '已平息',
        阶段: '落幕',
        事件: '荒坞大醮已经平息。',
        地点: '敛骨古庙',
        可见影响: ['阴风减弱'],
        参与情况: '主导',
        影响等级: '显著',
        更新时间: '盛法1年1月1日·寅时',
      },
    },
    {
      敛骨荒坞大醮平息: { 状态: '已平息', 事件: '荒坞大醮已经平息。' },
      青石古井魂引: { 状态: '已平息', 事件: '古井残魂已经归乡。' },
    },
    [insertOperation],
  );
  const parsed = parse({ 世界图志: restored });

  assert.equal(parsed.世界图志.敛骨荒坞大醮平息.地点, '敛骨古庙');
  assert.equal(parsed.世界图志.敛骨荒坞大醮平息.参与情况, '主导');
  assert.deepEqual(parsed.世界图志.青石古井魂引.可见影响, ['井中地煞余气暂熄']);
  assert.equal(parsed.世界图志.青石古井魂引.更新时间, '盛法1年1月1日·卯时');
});

test('已落幕世闻在缺少更新时间时按后插入者优先并最多展示三条', () => {
  const events = getWorldEventEntries({
    敛骨荒坞大醮平息: { 状态: '已平息', 事件: '荒坞大醮已经平息。' },
    青石古井魂引: { 状态: '已平息', 事件: '古井残魂已经归乡。' },
  });
  const displayed = selectWorldEventsForDisplay(events);

  assert.deepEqual(
    events.map((event: { id: string }) => event.id),
    ['青石古井魂引', '敛骨荒坞大醮平息'],
  );
  assert.equal(displayed.length, 2);
});

test('中文时辰按实际先后排序而非按文字排序', () => {
  const events = getWorldEventEntries({
    敛骨荒坞大醮平息: {
      状态: '已平息',
      阶段: '落幕',
      事件: '荒坞大醮已经平息。',
      更新时间: '盛法1年1月1日·寅时',
    },
    青石古井魂引: {
      状态: '已平息',
      阶段: '落幕',
      事件: '古井残魂已经归乡。',
      更新时间: '盛法1年1月1日·卯时',
    },
  });

  assert.deepEqual(
    events.map((event: { id: string }) => event.id),
    ['青石古井魂引', '敛骨荒坞大醮平息'],
  );
});

test('世界图志滚动保留三条活跃事件与五条近期结果', () => {
  const 世界图志: Record<string, unknown> = {
    活跃甲: { 状态: '活跃', 阶段: '征兆', 事件: '甲事件。' },
    活跃乙: { 状态: '活跃', 阶段: '发展', 事件: '乙事件。' },
    活跃丙: { 状态: '活跃', 阶段: '可介入', 事件: '丙事件。' },
    越限新事件: { 状态: '活跃', 阶段: '征兆', 事件: '不应顶掉既有活跃事件。' },
  };
  for (let day = 1; day <= 7; day += 1) {
    世界图志[`结果${day}`] = {
      状态: day % 2 === 0 ? '已错过' : '已平息',
      阶段: '落幕',
      事件: `第 ${day} 条结果。`,
      更新时间: `盛法1年1月${day}日·卯时`,
    };
  }

  const data = parse({ 世界图志 });
  assert.deepEqual(Object.keys(data.世界图志), [
    '活跃甲',
    '活跃乙',
    '活跃丙',
    '结果3',
    '结果4',
    '结果5',
    '结果6',
    '结果7',
  ]);
  assert.equal(Object.keys(data.世界图志).length, 8);
  assert.deepEqual(parse(data), data);
});

test('活跃世界事件可生成不抢夺玩家决定权的兜底提案', () => {
  const actions = buildFallbackActions({}, '', {
    潮生渡口失舟: {
      状态: '活跃',
      阶段: '可介入',
      事件: '两艘渡船未按时返航，岸边留下逆潮水痕。',
      地点: '潮生渡口',
      可见影响: ['夜航暂缓'],
      参与情况: '未介入',
      影响等级: '轻变',
    },
  });

  assert.equal(actions.length, 1);
  assert.equal(actions[0].事件性质, '回应已发生事件');
  assert.equal(actions[0].关联事件ID, '潮生渡口失舟');
  assert.match(actions[0].行动, /了解.*最新变化.*再决定是否介入/u);
});

test('不存在的事件引用会降级为当前行动，真实事件引用保持回应语义', () => {
  const operations = [
    {
      op: 'replace',
      path: '/$可参与机遇',
      value: [
        {
          标题: '暗红血印之谜',
          行动: '暂不出手，先辨认茧体表面残缺的符文，为同伴指出真正阵眼。',
          类型: '探索',
          叙事类型: '回应事件',
          事件性质: '回应已发生事件',
          关联事件ID: '地煞封喉·逆阴钟鸣',
        },
      ],
    },
  ];

  const missingReference = resolveActionFeed({
    operations,
    storedActions: [],
    tasks: {},
    situation: '',
    worldEvents: {},
  });
  assert.equal(missingReference.actions[0].叙事类型, '当前行动');
  assert.equal(missingReference.actions[0].事件性质, '无事件');
  assert.equal(missingReference.actions[0].关联事件ID, undefined);

  const existingReference = resolveActionFeed({
    operations,
    storedActions: [],
    tasks: {},
    situation: '',
    worldEvents: {
      '地煞封喉·逆阴钟鸣': {
        状态: '活跃',
        阶段: '发展',
        事件: '血茧与逆阴钟鸣仍在古庙内持续变化。',
        可见影响: ['古庙地砖持续震颤'],
        参与情况: '介入',
        影响等级: '轻变',
      },
    },
  });
  assert.equal(existingReference.actions[0].叙事类型, '回应事件');
  assert.equal(existingReference.actions[0].事件性质, '回应已发生事件');
  assert.equal(existingReference.actions[0].关联事件ID, '地煞封喉·逆阴钟鸣');
});

test('情缘连续性守卫只剔除明确越界提案并保留正常交往', () => {
  assert.equal(preservesRelationshipContinuity('晚棠与掌柜核对药材账目。', ['晚棠']), true);
  assert.equal(preservesRelationshipContinuity('晚棠与其他男修结为道侣。', ['晚棠']), false);

  const result = resolveActionFeed({
    operations: [
      {
        op: 'replace',
        path: '/$可参与机遇',
        value: [
          { 行动: '让晚棠与其他男修结为道侣，以此换取宗门支持。', 类型: '交涉' },
          { 行动: '与晚棠一同拜访药庐，核对新得丹方的药性。', 类型: '交涉' },
        ],
      },
    ],
    storedActions: [],
    tasks: {},
    situation: '',
    companionNames: ['晚棠'],
  });

  assert.equal(result.mode, 'full');
  assert.deepEqual(
    result.actions.map((action: { 行动: string }) => action.行动),
    ['与晚棠一同拜访药庐，核对新得丹方的药性。'],
  );
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

  assert.equal(data.$可参与机遇.length, 2);
  assert.equal(data.$可参与机遇[0].行动, '闭目调息，将新悟真意化入气海。');
  assert.equal(data.$可参与机遇[1].类型, '交涉');
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
    data.$可参与机遇.map((item: { 行动: string }) => item.行动),
    ['借琴音稳固不争雷网。', '主动迎接剑指考校。', '请教自然与蛰藏的关联。'],
  );
  assert.deepEqual(parse(data), data);
});

test('旧神通威力被丢弃，标准声望称谓仍从事实字段派生', () => {
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

  assert.equal(data.本尊.神通列表.青冥剑诀.威力等级, undefined);
  assert.equal(data.本尊.战力值, undefined);
  assert.notEqual(data.声望系统.青云宗.关系, '友好');
  assert.equal(data.声望系统.自定义势力.关系, '座上宾');
});

test('旧战斗存档和敌人数组迁移为 v5 且重复解析幂等', () => {
  const migrated = parse({
    本尊: {
      战斗状态: {
        正在战斗: true,
        当前状态: '激战',
        灵力值: 36,
        伤势等级: '重伤',
        战斗回合: 3,
        已用底牌: ['燃血秘术'],
        战力评估: '优势',
      },
      当前敌人: [
        { 名称: '玄煞道人', 境界: '金丹后期', 状态: '轻伤', 特点: '玄煞蚀魂' },
        { 名称: '玄煞道人', 等级: 8, 状态: '逃离' },
      ],
    },
    _系统设置: { 变量结构版本: 3 },
  });

  assert.equal(migrated._系统设置.变量结构版本, 5);
  assert.equal(migrated.本尊.战斗状态.阶段, '交锋');
  assert.equal(migrated.本尊.战斗状态.交锋轮次, 3);
  assert.equal(migrated.本尊.战斗状态.战局.态势, '相持');
  assert.deepEqual(migrated.本尊.战斗状态.战局.已显手段.我方, ['燃血秘术']);
  assert.deepEqual(migrated.本尊.战斗状态.负荷, { 真元: '吃紧', 神识: '澄明', 肉身: '重创' });
  assert.equal(migrated.本尊.当前敌人.玄煞道人.境界描述, '金丹后期');
  assert.equal(migrated.本尊.当前敌人.玄煞道人.状态, '负伤');
  assert.equal(migrated.本尊.当前敌人['玄煞道人·2'].状态, '退走');
  assert.deepEqual(parse(migrated), migrated);
});

test('开放式身心负荷描述会原样保留并推导展示严重度', () => {
  const data = parse({
    本尊: {
      战斗状态: {
        阶段: '余波',
        负荷: {
          真元: '剧耗（气海仅余一成）',
          神识: '澄明',
          肉身: '中损（虎口迸裂，气血激荡）',
        },
        最近战果: {
          结果: '胜',
          代价: ['肉身负伤', '真元剧耗'],
        },
      },
    },
  });

  assert.equal(data.本尊.战斗状态.负荷.真元, '剧耗（气海仅余一成）');
  assert.equal(data.本尊.战斗状态.负荷.肉身, '中损（虎口迸裂，气血激荡）');
  assert.equal(getBurdenTone(data.本尊.战斗状态.负荷.真元), 'strained');
  assert.equal(getBurdenTone(data.本尊.战斗状态.负荷.肉身), 'strained');
  assert.deepEqual(parse(data), data);
});

test('新战果漏写对应负荷时守卫同步代价文本且不覆盖已写描述', () => {
  const oldData = parse();
  const nextData = clone(oldData);
  nextData.本尊.战斗状态.阶段 = '余波';
  nextData.本尊.战斗状态.负荷.肉身 = '中损（虎口迸裂，气血激荡）';
  nextData.本尊.战斗状态.最近战果 = {
    结果: '胜',
    对手: ['百棺尸解仙'],
    达成: '斩破血爪，摧毁丧魂钟',
    代价: ['肉身负伤', '真元剧耗'],
    后患: ['与尸解仙结下因果'],
  };

  const repaired = repairStatDataWithFallback(nextData, oldData);
  assert.ok(repaired.data);
  assert.equal(repaired.data.本尊.战斗状态.负荷.肉身, '中损（虎口迸裂，气血激荡）');
  assert.equal(repaired.data.本尊.战斗状态.负荷.真元, '真元剧耗');
  assert.ok(repaired.warnings.some((warning: string) => warning.includes('真元剧耗')));
});

test('道争态势只按明确因果推进且跨境常规手段无效', () => {
  const crossRealm = compareRealmStanding(4, 5);
  assert.equal(crossRealm, '敌方位格压制');
  assert.equal(resolveBattleMomentum('相持', 2, { realmStanding: crossRealm, explicitCounter: true }), '相持');
  assert.equal(resolveBattleMomentum('相持', 1, { realmStanding: '同阶', explicitCounter: true }), '我方占先');
  assert.equal(
    resolveBattleMomentum('敌方占先', 9, {
      realmStanding: '同阶',
      establishedConditions: true,
      explicitCounter: true,
      significantCost: true,
    }),
    '我方占先',
  );
  assert.equal(resolveBattleMomentum('相持', 1, { realmStanding: '同阶' }), '相持');
});

test('致命败局只能记录为负或脱身并携带重大代价', () => {
  const defeated = parse({
    本尊: {
      战斗状态: {
        正在战斗: false,
        阶段: '余波',
        负荷: { 真元: '枯竭', 神识: '受创', 肉身: '濒危' },
        最近战果: {
          结果: '死亡',
          对手: ['天外魔尊'],
          达成: '被古传送阵残片卷走，暂时脱离追杀',
          代价: ['道基开裂', '本命剑折断'],
          后患: ['魔尊留下追魂印'],
        },
      },
    },
  });

  assert.equal(defeated.本尊.战斗状态.最近战果.结果, '脱身');
  assert.ok(['濒危', '重创'].includes(defeated.本尊.战斗状态.负荷.肉身));
  assert.ok(defeated.本尊.战斗状态.最近战果.代价.length >= 2);
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
    依据: '完整炼化上古真君传承，连破至筑基后期',
  };
  assert.equal(applyRealmTransitionGuards(validNext, oldData).data.本尊.等级, 7);

  const invalidNext = clone(validNext);
  invalidNext.本尊.修炼状态.境界变动.依据 = '';
  const guarded = applyRealmTransitionGuards(invalidNext, oldData);
  assert.equal(guarded.data.本尊.等级, 5);
  assert.ok(guarded.warnings.some((warning: string) => warning.includes('跨级依据')));
});

test('金丹中期突破至后期时，额外模型错报大圆满或元婴均收敛为 11', () => {
  const oldData = makeCultivator(10);
  const narrative = '灵机贯通，本尊修为从金丹中期突破至金丹后期。';

  for (const [requestedLevel, wrongRealm] of [
    [12, '金丹大圆满'],
    [13, '元婴初期'],
  ] as const) {
    const nextData = clone(oldData);
    nextData.本尊.等级 = requestedLevel;
    nextData.本尊.修炼状态.境界变动 = {
      类型: '跨级突破',
      目标等级: requestedLevel,
      依据: `灵机贯通，本尊修为从金丹中期突破至${wrongRealm}。`,
    };

    const guarded = applyRealmTransitionGuards(nextData, oldData, { protagonistNarrativeText: narrative });
    assert.equal(guarded.data.本尊.等级, 11);
    assert.ok(guarded.warnings.some((warning: string) => warning.includes('跨级依据')));
  }
});

test('跌境有依据时生效，无依据时回退旧等级', () => {
  const oldData = makeCultivator(5);
  const validNext = clone(oldData);
  validNext.本尊.等级 = 4;
  validNext.本尊.修炼状态.境界变动 = {
    类型: '跌境',
    目标等级: 4,
    依据: '护道失败导致根基崩毁，跌至练气大圆满',
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
  const updateRule = YAML.parse(updateRuleText);
  const outputFormat = YAML.parse(outputFormatText) as { 变量输出格式: { format: string } };
  const searchableUpdateRule = JSON.stringify(updateRule);
  const searchableOutputFormat = JSON.stringify(outputFormat);
  assert.doesNotMatch(searchableUpdateRule, /_档案/u);
  assert.match(searchableUpdateRule, /每轮先做“任务审计”/u);
  assert.match(searchableUpdateRule, /任务列表为空时[\s\S]*必须当轮 insert/u);
  assert.match(searchableUpdateRule, /同一 JSONPatch 必须 insert 接续任务/u);
  assert.match(searchableUpdateRule, /旧空项\/冗文仅在本人出场/u);
  assert.match(searchableUpdateRule, /只写当前结论/u);
  assert.match(searchableUpdateRule, /不得因未直呼姓名或角色无法说话而漏更/u);
  assert.match(searchableUpdateRule, /无法唯一判断时不猜/u);
  assert.match(searchableUpdateRule, /金丹中\/后\/大圆满、元婴初固定为 10\/11\/12\/13/u);
  assert.match(searchableUpdateRule, /依据逐字摘录含原因与最终境界的正文/u);
  assert.match(searchableUpdateRule, /负荷可写贴合正文的简短描述，不限固定措辞/u);
  assert.match(searchableUpdateRule, /最近战果\.代价涉及真元、神识或肉身时，同轮同步对应负荷/u);
  assert.match(searchableUpdateRule, /准确名称是“好感度”[\s\S]*禁止使用不存在的 \/红颜\/\{角色名\}\/好感/u);
  assert.match(searchableUpdateRule, /关系上下文必须始终为对象/u);
  assert.match(searchableUpdateRule, /禁止用字符串 replace 整个 \/关系上下文/u);
  assert.match(searchableUpdateRule, /30~120 字，上限 220 字/u);
  assert.match(searchableUpdateRule, /候选、可能发生或未选情节不得写入/u);
  assert.match(searchableUpdateRule, /征兆→发展→可介入→余波→落幕/u);
  assert.match(searchableUpdateRule, /活跃事件最多 3 条/u);
  assert.match(searchableUpdateRule, /总量上限 8/u);
  assert.match(searchableUpdateRule, /同一 JSONPatch[\s\S]*remove[\s\S]*超额结果/u);
  assert.match(searchableUpdateRule, /至少一项低压力方向/u);
  assert.match(searchableUpdateRule, /同一 JSONPatch insert \/世界图志\/\{稳定事件ID\}/u);
  assert.match(searchableUpdateRule, /连续 3 个合适回合没有事件种子/u);
  assert.match(searchableUpdateRule, /禁止引用不存在的事件ID/u);
  assert.match(searchableUpdateRule, /\$ 前缀使变量列表宏不向正文 AI 展示/u);
  assert.match(searchableUpdateRule, /其他候选不得在正文、变量结算或 NPC 反应中同步发生/u);
  assert.match(searchableOutputFormat, /字段何时变化、生命周期与事务联动由《变量更新规则》定义/u);
  assert.match(searchableOutputFormat, /只定义输出编码/u);
  assert.match(searchableOutputFormat, /只有玩家最终提交的 input 会送入正文 AI/u);
  assert.match(searchableOutputFormat, /3 条活跃事件 \+ 5 条近期结果/u);
  assert.match(searchableOutputFormat, /等级仅用 replace 写绝对整数/u);
  assert.doesNotMatch(searchableOutputFormat, /金丹初|元婴初期|境界变动\.依据须逐字/u);
  assert.match(searchableOutputFormat, /\/红颜\/\{角色名\}\/好感度/u);
  assert.match(searchableOutputFormat, /\/红颜\/\{角色名\}\/关系上下文\/态度缘由/u);
  assert.match(searchableOutputFormat, /禁止用字符串 replace 整个/u);
  assert.doesNotMatch(searchableOutputFormat, /境界事务示例|任务生命周期示例|红颜示例/u);

  const patchMatch = outputFormat.变量输出格式.format.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/u);
  if (!patchMatch) throw new Error('变量输出示例缺少可解析的 JSONPatch');
  const examplePatch = JSON.parse(patchMatch[1]) as Array<{ path?: string; value?: unknown }>;
  const worldEventPatch = examplePatch.find(operation => operation.path === '/世界图志/坊市丹香异变');
  assert.equal((worldEventPatch?.value as { 状态?: string })?.状态, '活跃');
  const opportunityPatch = examplePatch.find(operation => operation.path === '/$可参与机遇');
  if (!opportunityPatch || !Array.isArray(opportunityPatch.value)) {
    throw new Error('变量输出示例缺少可参与机遇候选数组');
  }
  const exampleActions = opportunityPatch.value as Array<{
    行动: string;
    类型: string;
    叙事类型: string;
    事件性质: string;
  }>;
  assert.equal(exampleActions.length, 3);
  assert.ok(exampleActions.some(action => action.事件性质 === '选中后成立'));
  assert.ok(exampleActions.some(action => action.事件性质 === '回应已发生事件'));
  assert.ok(exampleActions.some(action => action.叙事类型 === '平淡延续'));
  assert.ok(
    exampleActions.every(action => Array.from(action.行动).length >= 30 && Array.from(action.行动).length <= 120),
  );
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
