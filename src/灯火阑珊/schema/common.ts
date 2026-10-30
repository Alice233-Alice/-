// ============================================================================
// 灯火阑珊 - 共享 Schema（物品、神通、品阶映射）
// ============================================================================

import { z } from 'zod';
import {
  CULTIVATION_THRESHOLDS_BY_VERSION,
  CURRENT_CULTIVATION_VERSION,
  REALM_LIFESPANS,
  REALM_NAMES,
  REALM_STAGES,
  REALM_THRESHOLDS,
} from './constants';

export function finiteNumber(fallback = 0) {
  return z.coerce.number().catch(fallback);
}

export const NormalizedStringListSchema = z
  .union([z.array(z.string()), z.string().transform(value => (value ? [value] : []))])
  .prefault([])
  .transform(values => _.uniq(values.map(value => value.trim()).filter(Boolean)));

// 品阶容错映射
export const 品阶映射: Record<string, string> = {
  凡: '凡',
  凡阶: '凡',
  凡级: '凡',
  凡品: '凡',
  黄: '黄',
  黄阶: '黄',
  黄级: '黄',
  黄品: '黄',
  玄: '玄',
  玄阶: '玄',
  玄级: '玄',
  玄品: '玄',
  地: '地',
  地阶: '地',
  地级: '地',
  地品: '地',
  天: '天',
  天阶: '天',
  天级: '天',
  天品: '天',
  仙: '仙',
  仙阶: '仙',
  仙级: '仙',
  仙品: '仙',
  圣: '圣',
  圣阶: '圣',
  圣级: '圣',
  圣品: '圣',
  先天: '先天',
  先天阶: '先天',
  先天级: '先天',
};

// 熟练度容错映射
export const 熟练度映射: Record<string, string> = {
  入门: '入门',
  初级: '入门',
  初学: '入门',
  新手: '入门',
  熟练: '熟练',
  中级: '熟练',
  娴熟: '熟练',
  小成: '熟练',
  精通: '精通',
  高级: '精通',
  精湛: '精通',
  大成: '大成',
  大师: '大成',
  宗师: '大成',
  圆满: '圆满',
  完美: '圆满',
  极致: '圆满',
  化境: '化境',
  化神: '化境',
  返璞归真: '化境',
  出神入化: '化境',
};

function normalizeSkillProficiency(raw: unknown): string {
  const value = String(raw ?? '')
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
  if (熟练度映射[value]) return 熟练度映射[value];
  if (value.includes('小成')) return '熟练';
  if (value.includes('中成')) return '精通';
  if (value.includes('大圆满')) return '圆满';
  return '入门';
}

// 物品 Schema
export const ItemSchema = z.object({
  名称: z
    .string()
    .transform(value => value.trim())
    .prefault(''),
  描述: z
    .string()
    .transform(value => value.trim())
    .prefault(''),
  品阶: z
    .string()
    .transform(value => value.trim())
    .prefault(''),
  数量: finiteNumber(0)
    .transform(v => Math.max(0, Math.floor(v)))
    .prefault(1),
});

const 灵石货币别名 = new Set(['灵石', '下品灵石']);

function normalizeSpiritStoneCurrencyName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '');
}

export function isSpiritStoneCurrencyItem(key: unknown, item?: { 名称?: unknown } | null): boolean {
  const candidates = [normalizeSpiritStoneCurrencyName(key), normalizeSpiritStoneCurrencyName(item?.名称)].filter(
    Boolean,
  );

  return candidates.some(candidate => 灵石货币别名.has(candidate));
}

export function extractSpiritStoneFromInventory<T extends { 名称?: unknown; 数量?: unknown }>(
  inventory: Record<string, T> | undefined,
): { inventory: Record<string, T>; spiritStone: number } {
  const nextInventory: Record<string, T> = {};
  let spiritStone = 0;

  for (const [key, item] of Object.entries(inventory ?? {})) {
    if (!item) continue;

    if (isSpiritStoneCurrencyItem(key, item)) {
      const amount = Number(item.数量);
      if (Number.isFinite(amount) && amount > 0) {
        spiritStone += amount;
      }
      continue;
    }

    nextInventory[key] = item;
  }

  return { inventory: nextInventory, spiritStone };
}

/**
 * 把现行标量与旧版 `{ 下品灵石: number }` 账本统一为当前使用的灵石数值。
 * 这里只识别同义的“灵石/下品灵石”，不擅自换算中品、上品等不同币值。
 */
export function normalizeSpiritStoneAmount(value: unknown): number {
  const candidates: unknown[] = [value];
  if (_.isPlainObject(value)) {
    const legacyLedger = value as Record<string, unknown>;
    candidates.unshift(legacyLedger.下品灵石, legacyLedger.灵石, legacyLedger.数量);
  }

  for (const candidate of candidates) {
    const amountSource = _.isPlainObject(candidate) ? (candidate as Record<string, unknown>).数量 : candidate;
    if (amountSource == null || (typeof amountSource === 'string' && !amountSource.trim())) continue;
    const amount = Number(amountSource);
    if (Number.isFinite(amount)) return Math.max(0, amount);
  }

  return 0;
}

export function normalizeSpiritStoneState<T extends { 名称?: unknown; 数量?: unknown }>(
  spiritStone: unknown,
  ...inventories: Array<Record<string, T> | undefined>
): { spiritStone: number; inventories: Array<Record<string, T>> } {
  let nextSpiritStone = normalizeSpiritStoneAmount(spiritStone);

  const normalizedInventories = inventories.map(inventory => {
    const normalized = extractSpiritStoneFromInventory(inventory);
    nextSpiritStone += normalized.spiritStone;
    return normalized.inventory;
  });

  return {
    spiritStone: nextSpiritStone,
    inventories: normalizedInventories,
  };
}

const 修炼阶段映射: Record<string, '修炼中' | '瓶颈中' | '突破中' | '稳固中' | '压境中'> = {
  修炼中: '修炼中',
  闭关: '修炼中',
  打坐: '修炼中',
  调息: '修炼中',
  瓶颈中: '瓶颈中',
  瓶颈期: '瓶颈中',
  卡关: '瓶颈中',
  受阻: '瓶颈中',
  突破中: '突破中',
  冲关: '突破中',
  破境: '突破中',
  尝试突破: '突破中',
  稳固中: '稳固中',
  巩固中: '稳固中',
  根基未稳: '稳固中',
  压境中: '压境中',
  压制境界: '压境中',
  藏锋养境: '压境中',
};

const 突破结果映射: Record<string, '无' | '成功' | '失败' | '中断'> = {
  无: '无',
  '': '无',
  未突破: '无',
  成功: '成功',
  破境成功: '成功',
  渡过: '成功',
  失败: '失败',
  破境失败: '失败',
  冲关失败: '失败',
  中断: '中断',
  取消: '中断',
  放弃: '中断',
};

const 境界变动类型映射: Record<string, '无' | '突破' | '跨级突破' | '跌境'> = {
  无: '无',
  '': '无',
  突破: '突破',
  正常突破: '突破',
  晋升: '突破',
  跨级突破: '跨级突破',
  连续突破: '跨级突破',
  连破: '跨级突破',
  跌境: '跌境',
  境界跌落: '跌境',
  境界倒退: '跌境',
};

export function normalizeRealmLevel(value: unknown): number {
  const level = Number(value);
  if (!Number.isFinite(level)) return 1;
  return _.clamp(Math.floor(level), 1, REALM_THRESHOLDS.length);
}

export const BreakthroughRecordSchema = z
  .object({
    类型: z
      .string()
      .transform(value => 境界变动类型映射[String(value).trim()] || '无')
      .prefault('无'),
    原等级: finiteNumber(0)
      .transform(value => _.clamp(Math.floor(value), 0, REALM_THRESHOLDS.length))
      .prefault(0),
    目标等级: finiteNumber(0)
      .transform(value => (Number.isFinite(value) ? _.clamp(Math.floor(value), 0, REALM_THRESHOLDS.length) : 0))
      .prefault(0),
    消耗修为: finiteNumber(0)
      .transform(value => Math.max(0, value))
      .prefault(0),
    依据: z.coerce
      .string()
      .transform(value => String(value).replace(/\s+/gu, ' ').trim())
      .prefault(''),
    时地: z.string().prefault(''),
  })
  .prefault({});

// 旧脚本仍可导入该名称；记录只承载事实，不参与等级裁决或修为扣除。
export const RealmTransitionSchema = BreakthroughRecordSchema;

function migrateCultivationStateInput(value: unknown): unknown {
  if (typeof value === 'string') return { 阶段: value };
  if (!_.isPlainObject(value)) return value;
  const state = { ...(value as Record<string, unknown>) };
  if (state.最近突破 == null && state.境界变动 != null) state.最近突破 = state.境界变动;
  delete state.境界变动;
  return state;
}

/** 仅在旧存档缺少阶段时读取尝试突破；已有阶段始终优先。 */
export function migrateCultivatorInput(value: unknown): unknown {
  if (!_.isPlainObject(value)) return value;
  const cultivator = { ...(value as Record<string, unknown>) };
  const originalState = migrateCultivationStateInput(cultivator.修炼状态);
  const state = _.isPlainObject(originalState) ? { ...(originalState as Record<string, unknown>) } : {};
  if ((state.阶段 == null || String(state.阶段).trim() === '') && cultivator.尝试突破 === true) {
    state.阶段 = '突破中';
  }
  cultivator.修炼状态 = state;
  return cultivator;
}

export const CultivationStateSchema = z.preprocess(
  migrateCultivationStateInput,
  z
    .object({
      阶段: z
        .string()
        .transform(v => 修炼阶段映射[String(v).trim()] || '修炼中')
        .prefault('修炼中'),
      方式: z.string().prefault(''),
      地点: z.string().prefault(''),
      根基描述: z.string().prefault(''),
      计划年数: finiteNumber(0)
        .transform(value => Math.max(0, value))
        .prefault(0),
      已修炼年数: finiteNumber(0)
        .transform(value => Math.max(0, value))
        .prefault(0),
      瓶颈原因: z.coerce
        .string()
        .transform(v => String(v).trim())
        .prefault(''),
      上次结果: z
        .string()
        .transform(v => 突破结果映射[String(v).trim()] || '无')
        .prefault('无'),
      最近突破: BreakthroughRecordSchema,
    })
    .prefault({}),
);

export function describeRealmByLevel(level: number): string {
  const normalizedLevel = normalizeRealmLevel(level);
  const majorIdx = Math.floor((normalizedLevel - 1) / 4);
  const minorIdx = (normalizedLevel - 1) % 4;
  return `${REALM_NAMES[majorIdx] ?? '练气'}${REALM_STAGES[minorIdx] ?? '初期'}`;
}

function resolveRealmThresholds(
  versionOrLegacyFlag: number | boolean = CURRENT_CULTIVATION_VERSION,
): readonly number[] {
  if (versionOrLegacyFlag === true) {
    return CULTIVATION_THRESHOLDS_BY_VERSION[1];
  }

  if (versionOrLegacyFlag === false) {
    return CULTIVATION_THRESHOLDS_BY_VERSION[3];
  }

  const normalizedVersion = Math.max(1, Math.floor(Number(versionOrLegacyFlag) || 3));
  return (
    CULTIVATION_THRESHOLDS_BY_VERSION[normalizedVersion as keyof typeof CULTIVATION_THRESHOLDS_BY_VERSION] ??
    REALM_THRESHOLDS
  );
}

export function getRealmThreshold(
  level: number,
  versionOrLegacyFlag: number | boolean = CURRENT_CULTIVATION_VERSION,
): number {
  const thresholds = resolveRealmThresholds(versionOrLegacyFlag);
  const normalizedLevel = _.clamp(Math.floor(Number(level) || 1), 1, thresholds.length);
  return thresholds[normalizedLevel - 1] ?? thresholds[0] ?? 100;
}

/** 逐阶累计突破消耗，覆盖同一轮中明确发生的连续突破。 */
export function getBreakthroughCost(fromLevel: number, targetLevel: number): number {
  const from = normalizeRealmLevel(fromLevel);
  const target = normalizeRealmLevel(targetLevel);
  let cost = 0;
  for (let level = from; level < target; level += 1) cost += getRealmThreshold(level);
  return cost;
}

/** 只提供结算数值预览；调用本函数不会修改角色等级或修为。 */
export function previewCultivationBreakthrough(level: number, cultivation: number, targetLevel = level + 1) {
  const from = normalizeRealmLevel(level);
  const target = normalizeRealmLevel(targetLevel);
  const amount = Number.isFinite(cultivation) ? Math.max(0, cultivation) : 0;
  const hasTarget = target > from;
  const cost = hasTarget ? getBreakthroughCost(from, target) : 0;
  return {
    目标等级: hasTarget ? target : 0,
    所需修为: cost,
    剩余修为: hasTarget ? Math.max(0, amount - cost) : amount,
    积累已足: hasTarget && amount >= cost,
  };
}

export function migrateCultivationProgress(
  level: number,
  cultivation: unknown,
  fromVersion: number | boolean = 1,
  toVersion: number | boolean = CURRENT_CULTIVATION_VERSION,
): number {
  const normalizedCultivation = Number(cultivation);
  if (!Number.isFinite(normalizedCultivation) || normalizedCultivation <= 0) {
    return 0;
  }

  const previousThreshold = getRealmThreshold(level, fromVersion);
  const nextThreshold = getRealmThreshold(level, toVersion);
  if (previousThreshold <= 0 || previousThreshold === nextThreshold) return normalizedCultivation;

  const progressRatio = normalizedCultivation / previousThreshold;
  const migrated = Math.round(progressRatio * nextThreshold);
  return Math.max(0, migrated);
}

export function migrateLegacyCultivationProgress(level: number, cultivation: unknown): number {
  return migrateCultivationProgress(level, cultivation, 1, 3);
}

export function normalizeCultivationState(
  rawState: unknown,
  options: {
    level: number;
  },
) {
  const parsedState = CultivationStateSchema.parse(rawState ?? {});
  const level = normalizeRealmLevel(options.level);
  const nextRealmTarget = level < REALM_THRESHOLDS.length ? describeRealmByLevel(level + 1) : '';
  const shouldHaveBreakthroughTarget = ['瓶颈中', '突破中', '压境中'].includes(parsedState.阶段);

  return {
    ...parsedState,
    突破目标: shouldHaveBreakthroughTarget ? nextRealmTarget : '',
  };
}

export function getCultivationStatusLabel(
  state: Pick<z.output<typeof CultivationStateSchema>, '阶段'> | undefined,
  _cultivation?: number,
  _threshold?: number,
): string {
  const phase = state?.阶段 || '修炼中';
  if (phase === '突破中') return '突破中';
  if (phase === '稳固中') return '稳固中';
  if (phase === '压境中') return '压境中';
  if (phase === '瓶颈中') return '瓶颈期';
  return '修炼中';
}

// 神通 Schema（本尊和红颜共用）
export const SkillSchema = z.preprocess(
  value =>
    typeof value === 'string'
      ? {
          描述: value,
        }
      : value,
  z.object({
    名称: z
      .string()
      .transform(value => value.trim())
      .prefault(''),
    描述: z
      .string()
      .transform(value => value.trim())
      .prefault(''),
    类型: z.enum(['功法', '神通', '秘术']).prefault('神通'),
    品阶: z
      .string()
      .transform(v => 品阶映射[v] || '凡')
      .catch('凡'),
    熟练度: z
      .string()
      .transform(v => normalizeSkillProficiency(v))
      .catch('入门'),
    领悟时间: finiteNumber(Date.now()).prefault(() => Date.now()),
  }),
);

export const SkillListSchema = z
  .record(z.string().describe('神通名'), SkillSchema)
  .prefault({})
  .transform(skills =>
    _(skills)
      .entries()
      .map(([rawName, skill]) => {
        const name = String(rawName).trim();
        return [
          name,
          {
            ...skill,
            名称: skill.名称 || name,
          },
        ] as const;
      })
      .filter(([name]) => !!name)
      .fromPairs()
      .value(),
  );

// 背包类物品 Schema（自动过滤数量<=0的物品）
export const InventorySchema = z
  .record(z.string().describe('物品名'), ItemSchema)
  .prefault({})
  .transform(data =>
    _(data)
      .entries()
      .map(([rawName, item]) => {
        const name = String(rawName).trim();
        return [
          name,
          {
            ...item,
            名称: item.名称 || name,
          },
        ] as const;
      })
      .filter(([name, item]) => !!name && item.数量 > 0)
      .fromPairs()
      .value(),
  );

// 境界计算 transform（本尊和红颜共用）
export function computeRealmInfo(data: {
  等级: number;
  修为: number;
  已活岁月: number;
  尝试突破?: boolean;
  修炼状态?: Pick<z.output<typeof CultivationStateSchema>, '阶段'>;
  神通列表?: Record<string, unknown>;
  体质?: string;
}) {
  const level = data.等级;
  const 突破阈值 = getRealmThreshold(level);
  const 寿元上限 = REALM_LIFESPANS[level - 1] ?? 100;
  const 境界描述 = describeRealmByLevel(level);
  const 寿元状态 = `${data.已活岁月}/${寿元上限}`;
  const 状态 = getCultivationStatusLabel(data.修炼状态, data.修为, 突破阈值);
  const preview = previewCultivationBreakthrough(level, data.修为);
  const 积累已足 = preview.积累已足;
  const 盈余修为 = preview.目标等级 ? preview.剩余修为 : 0;
  const 尝试突破 = data.修炼状态?.阶段 === '突破中';
  const progressRatio = 突破阈值 > 0 ? _.clamp(data.修为 / 突破阈值, 0, 1) : 0;
  const 进度 = `${(progressRatio * 100).toFixed(1)}%`;

  return { 突破阈值, 寿元上限, 境界描述, 寿元状态, 状态, 进度, 积累已足, 盈余修为, 尝试突破 };
}
