import {
  REALM_NAMES,
  REALM_STAGES,
  RealmTransitionSchema,
  Schema,
  describeRealmByLevel,
  getRealmThreshold,
  normalizeRealmLevel,
  unwrapOpportunityPatchPayload,
  type SchemaType,
} from '../灯火阑珊/schema';
import { COMPANION_CANONICAL_NAMES } from './companion-aliases';

const GUARD_INSTALLED_KEY = '__灯火阑珊_authoritative_mvu_guard_installed__';
const READONLY_ENTITY_FIELDS = new Set(['突破阈值', '寿元上限', '境界描述', '寿元状态', '状态', '进度', '战力值']);
const MVU_ROOT_KEYS = [
  '世界时钟',
  '世界地图',
  '世界图志',
  '宗门势力库',
  '功法库',
  '法宝库',
  '地点库',
  '$宗门推断',
  '灵根库',
  '体质库',
  '本尊',
  '红颜角色库',
  '红颜',
  'NPC图鉴',
  '任务列表',
  '声望系统',
  '难度系统',
  '$可参与机遇',
  '当前处境',
  '_系统设置',
  '_好感度快照',
] as const;
const TRADITIONAL_PATH_ALIASES: Record<string, string> = {
  世界時鐘: '世界时钟',
  世界地圖: '世界地图',
  世界圖志: '世界图志',
  宗門勢力庫: '宗门势力库',
  功法庫: '功法库',
  法寶庫: '法宝库',
  地點庫: '地点库',
  靈根庫: '灵根库',
  體質庫: '体质库',
  紅顏角色庫: '红颜角色库',
  紅顏: '红颜',
  聲望系統: '声望系统',
  難度系統: '难度系统',
  危險度: '危险度',
  當前區域: '当前区域',
  所屬層級: '所属层级',
  當前處境: '当前处境',
  可參與機遇: '可参与机遇',
  任務列表: '任务列表',
};
const EMPTY_REALM_TRANSITION = {
  类型: '无' as const,
  目标等级: 0,
  依据: '',
};
const REALM_TEXT_PATTERN = new RegExp(`(${REALM_NAMES.join('|')})(${REALM_STAGES.join('|')})`, 'gu');

type GuardMutableCommand = {
  type: 'set' | 'insert' | 'delete' | 'add';
  full_match?: string;
  args: unknown[];
  reason?: string;
};

type CultivatorData = {
  等级?: unknown;
  修为?: unknown;
  尝试突破?: unknown;
  修炼状态?: Record<string, any>;
};

export type GuardRepairResult = {
  data: SchemaType | null;
  warnings: string[];
  repaired: boolean;
};

const pendingExplicitLevels = new Map<string, number>();
let lastValidStatData: SchemaType | null = null;
let pendingNarrativeText = '';

function normalizeCommandPath(rawPath: string): string {
  let path = String(rawPath || '').trim();
  if (!path) return path;

  if (path.startsWith('./')) path = path.slice(1);
  if (path.startsWith('/')) {
    path = path.replace(/^\/+/, '').replaceAll('/', '.');
  }

  path = path.replaceAll('：', ':').replaceAll('。', '.').replace(/\s+/gu, '').replace(/\.\.+/gu, '.');
  for (const [from, to] of Object.entries(TRADITIONAL_PATH_ALIASES)) {
    path = path.replaceAll(from, to);
  }
  path = path
    .replace(/^stat_data\.可参与机遇(?=\.|$)/u, 'stat_data.$可参与机遇')
    .replace(/^可参与机遇(?=\.|$)/u, '$可参与机遇');

  if (
    !path.startsWith('stat_data.') &&
    MVU_ROOT_KEYS.some(rootKey => path === rootKey || path.startsWith(`${rootKey}.`))
  ) {
    path = `stat_data.${path}`;
  }

  // 兼容旧版把灵石建模成分级对象的更新路径。当前权威 Schema 中本尊.灵石是标量，
  // 因而旧式 delta /本尊/灵石/下品灵石 必须在 MVU 执行加减前落到标量字段。
  path = path.replace(/^stat_data\.本尊\.灵石\.(?:下品灵石|灵石)$/u, 'stat_data.本尊.灵石');

  return path;
}

function normalizeCompanionAliasPath(path: string): string {
  const match = path.match(/^stat_data\.(红颜|红颜角色库|_好感度快照)\.([^./]+)(?=\.|$)/u);
  if (!match) return path;

  const [, section, companionName] = match;
  const canonicalName = COMPANION_CANONICAL_NAMES[companionName];
  return canonicalName
    ? path.replace(`stat_data.${section}.${companionName}`, `stat_data.${section}.${canonicalName}`)
    : path;
}

function getCommandValueArgIndex(command: GuardMutableCommand): number | null {
  switch (command.type) {
    case 'set':
    case 'insert':
      return command.args.length >= 3 ? 2 : command.args.length >= 2 ? 1 : null;
    case 'add':
      return command.args.length >= 2 ? 1 : null;
    default:
      return null;
  }
}

function coerceByPath(path: string, value: unknown): unknown {
  if (path === 'stat_data.$可参与机遇') {
    const unwrapped = unwrapOpportunityPatchPayload(value);
    if (Array.isArray(unwrapped)) {
      return typeof value === 'string' ? JSON.stringify(unwrapped) : unwrapped;
    }
  }

  if (path.endsWith('熟练度') && typeof value === 'string') {
    const normalized = value.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/gu, '');
    if (normalized.includes('小成')) return '熟练';
    if (normalized.includes('中成')) return '精通';
    if (normalized.includes('大圆满')) return '圆满';
  }
  return value;
}

function isReadonlyDerivedStatPath(path: string): boolean {
  const entityFieldMatch = path.match(/^stat_data\.(?:本尊|红颜\.[^./]+)\.([^./]+)$/u);
  if (entityFieldMatch && READONLY_ENTITY_FIELDS.has(entityFieldMatch[1])) return true;

  return (
    /^stat_data\.(?:本尊|红颜\.[^./]+)\.修炼状态\.突破目标$/u.test(path) ||
    /^stat_data\.(?:本尊|红颜\.[^./]+)\.神通列表\.[^./]+\.威力等级$/u.test(path) ||
    /^stat_data\.法宝库\.[^./]+\.特$/u.test(path) ||
    /^stat_data\.灵根库\.[^./]+\.(?:速|特)$/u.test(path) ||
    /^stat_data\.体质库\.[^./]+\.优$/u.test(path) ||
    /^stat_data\._系统设置\.(?:修炼系统版本|变量结构版本)$/u.test(path)
  );
}

function getReadonlyDerivedPathValue(path: string, variables: Mvu.MvuData): unknown {
  const parsed = Schema.safeParse(_.get(variables, 'stat_data'));
  if (parsed.success) {
    return _.get({ stat_data: parsed.data }, path);
  }
  return _.get(variables, path);
}

function rewriteReadonlyDerivedCommand(command: GuardMutableCommand, path: string, variables: Mvu.MvuData): boolean {
  if (!isReadonlyDerivedStatPath(path)) return false;

  const currentValue = getReadonlyDerivedPathValue(path, variables);
  if (typeof currentValue === 'undefined') return false;

  command.type = 'set';
  command.args = [path, JSON.stringify(currentValue)];
  command.reason = '只读派生字段被权威变量守卫改写为 no-op';
  return true;
}

function rememberExplicitLevel(
  command: GuardMutableCommand,
  path: string,
  value: unknown,
  variables: Mvu.MvuData,
): void {
  if (!/^stat_data\.(?:本尊|红颜\.[^./]+)\.等级$/u.test(path)) return;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return;
  const absoluteLevel = command.type === 'add' ? Number(_.get(variables, path, 1)) + numericValue : numericValue;
  pendingExplicitLevels.set(path, normalizeRealmLevel(absoluteLevel));
}

function applyPendingExplicitLevels(newVariables: Mvu.MvuData): void {
  for (const [path, level] of pendingExplicitLevels.entries()) {
    if (_.has(newVariables, path.replace(/^stat_data\./u, 'stat_data.'))) {
      _.set(newVariables, path, level);
    }
  }
}

function tryParseLiteralObject(input: unknown): Record<string, unknown> | null {
  if (typeof input !== 'string') return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getExistingCompanionSource(path: string, variables: Mvu.MvuData): Record<string, unknown> | null {
  const currentValue = _.get(variables, path);
  if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
    return _.cloneDeep(currentValue);
  }

  try {
    const snapshotValue = _.get(lastValidStatData, path.replace(/^stat_data\./u, ''));
    return snapshotValue && typeof snapshotValue === 'object' && !Array.isArray(snapshotValue)
      ? _.cloneDeep(snapshotValue)
      : null;
  } catch {
    return null;
  }
}

function rewriteDuplicateCompanionInsert(
  command: GuardMutableCommand,
  path: string,
  variables: Mvu.MvuData,
): GuardMutableCommand[] {
  if (command.type !== 'insert' || !/^stat_data\.红颜\.[^./]+$/u.test(path)) return [];

  const existing = getExistingCompanionSource(path, variables);
  const valueArgIndex = getCommandValueArgIndex(command);
  const incoming = valueArgIndex === null ? null : tryParseLiteralObject(command.args[valueArgIndex]);
  if (!existing || !incoming) return [];

  const companionName = path.split('.').at(-1) ?? '未知角色';
  const appendedCommands: GuardMutableCommand[] = [];
  if (_.has(incoming, '好感度')) {
    const oldFavor = Number(_.get(existing, '好感度', 0));
    const newFavor = Number(_.get(incoming, '好感度', oldFavor));
    if (Number.isFinite(oldFavor) && Number.isFinite(newFavor) && oldFavor !== newFavor) {
      appendedCommands.push({
        type: 'add',
        full_match: `guard:add:${companionName}:好感度`,
        args: [`${path}.好感度`, String(newFavor - oldFavor)],
        reason: '已存在红颜的重复 insert 已改写为好感增量',
      });
    }
  }

  const incomingChronicle = _.get(incoming, '羁绊纪事');
  if (incomingChronicle && typeof incomingChronicle === 'object' && !Array.isArray(incomingChronicle)) {
    for (const [title, entry] of Object.entries(incomingChronicle)) {
      const existingEntry = _.get(existing, ['羁绊纪事', title]);
      if (!title.trim() || _.isEqual(existingEntry, entry)) continue;
      appendedCommands.push({
        type: existingEntry === undefined ? 'insert' : 'set',
        full_match: `guard:${existingEntry === undefined ? 'insert' : 'set'}:${companionName}:羁绊纪事:${title}`,
        args: [`${path}.羁绊纪事.${title}`, JSON.stringify(entry)],
        reason: '已存在红颜的重复 insert 已改写为羁绊纪事更新',
      });
    }
  }

  const replaceableKeys = [
    '关系',
    '关系上下文',
    '灵根',
    '体质',
    '功法',
    '本命兵器',
    '等级',
    '修为',
    '灵石',
    '已活岁月',
    '尝试突破',
    '修炼状态',
    '神通列表',
  ] as const;
  for (const key of replaceableKeys) {
    if (!_.has(incoming, key) || _.isEqual(_.get(incoming, key), _.get(existing, key))) continue;
    appendedCommands.push({
      type: 'set',
      full_match: `guard:set:${companionName}:${key}`,
      args: [`${path}.${key}`, JSON.stringify(_.get(incoming, key))],
      reason: '已存在红颜的重复 insert 已改写为字段更新',
    });
  }

  command.type = 'set';
  command.args = [path, JSON.stringify(existing)];
  command.reason = '已存在红颜的重复 insert 原命令已改写为 no-op';
  return appendedCommands;
}

function normalizeTransition(raw: unknown) {
  return RealmTransitionSchema.parse(raw ?? EMPTY_REALM_TRANSITION);
}

function normalizeEvidenceText(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function extractNarrativeText(messageContent: unknown): string {
  return normalizeEvidenceText(
    String(messageContent ?? '')
      .replace(/<update(?:variable)?>[\s\S]*?<\/update(?:variable)?>/giu, '')
      .replace(/<analysis>[\s\S]*?<\/analysis>/giu, '')
      .replace(/<jsonpatch>[\s\S]*?<\/jsonpatch>/giu, ''),
  );
}

function getLastMentionedRealmLevel(text: unknown): number | null {
  const pattern = new RegExp(`(${REALM_NAMES.join('|')})(${REALM_STAGES.join('|')})`, 'gu');
  let level: number | null = null;

  for (const match of String(text ?? '').matchAll(pattern)) {
    const majorIndex = REALM_NAMES.indexOf(match[1] as (typeof REALM_NAMES)[number]);
    const stageIndex = REALM_STAGES.indexOf(match[2] as (typeof REALM_STAGES)[number]);
    if (majorIndex >= 0 && stageIndex >= 0) {
      level = majorIndex * REALM_STAGES.length + stageIndex + 1;
    }
  }

  return level;
}

function hasGroundedRealmTransitionEvidence(
  transition: ReturnType<typeof normalizeTransition>,
  requestedLevel: number,
  narrativeText: string,
): boolean {
  const evidence = normalizeEvidenceText(transition.依据);
  if (transition.目标等级 !== requestedLevel || evidence.length < 4) return false;

  // “依据”必须自己写出最终境界，防止额外模型用一段泛化理由为错误等级背书。
  if (getLastMentionedRealmLevel(evidence) !== requestedLevel) return false;

  // 能取得正文时，“依据”必须是正文原句，而不是额外模型事后编造的解释。
  const normalizedNarrative = normalizeEvidenceText(narrativeText);
  return !normalizedNarrative || normalizedNarrative.includes(evidence);
}

function getEffectiveTransition(nextState: Record<string, any>, oldState: Record<string, any>) {
  const nextTransition = normalizeTransition(nextState.境界变动);
  if (nextTransition.类型 !== '无') return nextTransition;

  const oldTransition = normalizeTransition(oldState.境界变动);
  return oldState.阶段 === '突破中' && oldTransition.类型 !== '无' ? oldTransition : nextTransition;
}

function setRealmTransitionSettled(cultivator: CultivatorData, level: number, result: '成功' | '失败'): void {
  cultivator.等级 = level;
  cultivator.尝试突破 = false;
  const state = (cultivator.修炼状态 ??= {});
  state.阶段 = '稳固中';
  state.瓶颈原因 = '';
  state.突破目标 = '';
  state.上次结果 = result;
  state.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
}

function applyCultivatorRealmTransition(
  nextCultivator: CultivatorData,
  oldCultivator: CultivatorData,
  label: string,
  warnings: string[],
  narrativeText: string = '',
): boolean {
  const oldLevel = normalizeRealmLevel(oldCultivator.等级);
  const requestedLevel = normalizeRealmLevel(nextCultivator.等级);
  const nextState = (nextCultivator.修炼状态 ??= {});
  const oldState = oldCultivator.修炼状态 ?? {};
  const transition = getEffectiveTransition(nextState, oldState);
  let finalLevel = requestedLevel;

  if (requestedLevel > oldLevel) {
    if (requestedLevel > oldLevel + 1) {
      const hasValidCrossLevelEvidence =
        transition.类型 === '跨级突破' &&
        hasGroundedRealmTransitionEvidence(transition, requestedLevel, narrativeText);
      if (!hasValidCrossLevelEvidence) {
        finalLevel = Math.min(oldLevel + 1, 48);
        warnings.push(`${label}缺少有效跨级依据，等级 ${requestedLevel} 已收敛为 ${finalLevel}`);
      }
    }

    nextCultivator.修为 = 0;
    setRealmTransitionSettled(nextCultivator, finalLevel, '成功');
    return finalLevel !== oldLevel;
  }

  if (requestedLevel < oldLevel) {
    const hasValidRealmLossEvidence =
      transition.类型 === '跌境' && hasGroundedRealmTransitionEvidence(transition, requestedLevel, narrativeText);
    if (!hasValidRealmLossEvidence) {
      nextCultivator.等级 = oldLevel;
      nextState.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
      warnings.push(`${label}缺少有效跌境依据，等级 ${requestedLevel} 已恢复为 ${oldLevel}`);
      return false;
    }

    const threshold = getRealmThreshold(requestedLevel);
    const cultivation = Number(nextCultivator.修为);
    nextCultivator.修为 = Number.isFinite(cultivation) ? _.clamp(cultivation, 0, Math.max(0, threshold - 1)) : 0;
    setRealmTransitionSettled(nextCultivator, requestedLevel, '失败');
    return true;
  }

  const targetLevel = normalizeRealmLevel(transition.目标等级);
  const reportsSuccessfulSettlement =
    nextState.阶段 === '稳固中' && nextState.上次结果 === '成功' && transition.类型 !== '无';
  if (reportsSuccessfulSettlement && targetLevel > oldLevel) {
    const isNormalBreakthrough = transition.类型 === '突破' && targetLevel === oldLevel + 1;
    const isValidCrossLevel =
      transition.类型 === '跨级突破' &&
      targetLevel > oldLevel + 1 &&
      hasGroundedRealmTransitionEvidence(transition, targetLevel, narrativeText);
    finalLevel = isNormalBreakthrough || isValidCrossLevel ? targetLevel : Math.min(oldLevel + 1, 48);
    if (!isNormalBreakthrough && !isValidCrossLevel) {
      warnings.push(`${label}的成功结算缺少有效跨级依据，目标已收敛为 ${finalLevel}`);
    }
    nextCultivator.修为 = 0;
    setRealmTransitionSettled(nextCultivator, finalLevel, '成功');
    return finalLevel !== oldLevel;
  }

  if (nextState.阶段 !== '突破中' && transition.类型 !== '无') {
    nextCultivator.尝试突破 = false;
    nextState.境界变动 = _.cloneDeep(EMPTY_REALM_TRANSITION);
  }
  return false;
}

export function applyRealmTransitionGuards(
  nextStatData: Record<string, any>,
  oldStatData: Record<string, any>,
  options: { protagonistNarrativeText?: string } = {},
): { data: Record<string, any>; warnings: string[]; protagonistLevelChanged: boolean } {
  const data = _.cloneDeep(nextStatData);
  const warnings: string[] = [];
  const protagonistLevelChanged = applyCultivatorRealmTransition(
    data.本尊 ?? (data.本尊 = {}),
    oldStatData.本尊 ?? {},
    '本尊',
    warnings,
    options.protagonistNarrativeText ?? '',
  );

  for (const [name, companion] of Object.entries(data.红颜 ?? {}) as Array<[string, CultivatorData]>) {
    const oldCompanion = _.get(oldStatData, ['红颜', name]);
    if (!oldCompanion) continue;
    applyCultivatorRealmTransition(companion, oldCompanion, `红颜·${name}`, warnings);
  }

  return { data, warnings, protagonistLevelChanged };
}

export function correctProtagonistRealmText(text: unknown, level: number, companionNames: string[] = []): string {
  const source = String(text ?? '');
  if (!source) return source;
  const correctRealm = describeRealmByLevel(level);

  return source.replace(
    /((?:已|成功)?(?:突破|晋升|破境)(?:至|到|为)\s*)((?:练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫|真仙|仙王|仙帝)(?:初期|中期|后期|大圆满))/gu,
    (fullMatch, actionPrefix: string, realm: string, offset: number) => {
      if (realm === correctRealm || !REALM_TEXT_PATTERN.test(realm)) {
        REALM_TEXT_PATTERN.lastIndex = 0;
        return fullMatch;
      }
      REALM_TEXT_PATTERN.lastIndex = 0;

      const subjectPrefix = source.slice(Math.max(0, offset - 12), offset).trimEnd();
      const explicitlyOther =
        /(?:她|他)$/u.test(subjectPrefix) || companionNames.some(name => subjectPrefix.endsWith(name));
      const explicitlyProtagonist = /(?:你|本尊|\{\{user\}\})$/u.test(subjectPrefix);
      if (explicitlyOther && !explicitlyProtagonist) return fullMatch;
      return `${actionPrefix}${correctRealm}`;
    },
  );
}

function uniqueIssuePaths(issues: Array<{ path: PropertyKey[] }>): PropertyKey[][] {
  const seen = new Set<string>();
  const paths: PropertyKey[][] = [];
  for (const issue of issues) {
    const key = JSON.stringify(issue.path);
    if (seen.has(key)) continue;
    seen.add(key);
    paths.push(issue.path);
  }
  return paths;
}

const BATTLE_COST_BURDEN_FIELDS = [
  { field: '真元', pattern: /真元/u },
  { field: '神识', pattern: /神识|识海|神魂/u },
  { field: '肉身', pattern: /肉身/u },
] as const;

function synchronizeBurdenFromNewBattleResult(candidate: unknown, oldData: unknown): string[] {
  const nextResult = _.get(candidate, '本尊.战斗状态.最近战果');
  const oldResult = _.get(oldData, '本尊.战斗状态.最近战果');
  if (!_.isPlainObject(nextResult) || _.isEqual(nextResult, oldResult) || _.get(nextResult, '结果') === '无') return [];

  const rawCosts: unknown = _.get(nextResult, '代价');
  const costs = Array.isArray(rawCosts) ? rawCosts.map(value => String(value).trim()).filter(Boolean) : [];
  const warnings: string[] = [];

  for (const { field, pattern } of BATTLE_COST_BURDEN_FIELDS) {
    const burdenPath = `本尊.战斗状态.负荷.${field}`;
    if (!_.isEqual(_.get(candidate, burdenPath), _.get(oldData, burdenPath))) continue;

    const matchingCost = costs.find(cost => pattern.test(cost));
    pattern.lastIndex = 0;
    if (!matchingCost) continue;

    _.set(candidate as object, burdenPath, matchingCost);
    warnings.push(`最近战果代价“${matchingCost}”已同步至${burdenPath}`);
  }

  return warnings;
}

export function repairStatDataWithFallback(nextStatData: unknown, oldStatData: unknown): GuardRepairResult {
  const candidate = _.cloneDeep(nextStatData);
  const oldData = oldStatData && typeof oldStatData === 'object' ? _.cloneDeep(oldStatData) : {};
  const warnings = synchronizeBurdenFromNewBattleResult(candidate, oldData);
  let repaired = warnings.length > 0;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const parsed = Schema.safeParse(candidate);
    if (parsed.success) {
      return { data: _.cloneDeep(parsed.data), warnings, repaired };
    }

    const issuePaths = uniqueIssuePaths(parsed.error.issues);
    let changed = false;
    for (const path of issuePaths) {
      if (path.length === 0) continue;
      if (_.has(oldData, path)) {
        _.set(candidate as object, path, _.cloneDeep(_.get(oldData, path)));
        warnings.push(`非法字段 ${path.map(String).join('.')} 已恢复旧值`);
        changed = true;
        repaired = true;
      } else if (_.has(candidate as object, path)) {
        _.unset(candidate as object, path);
        warnings.push(`非法新增字段 ${path.map(String).join('.')} 已移除`);
        changed = true;
        repaired = true;
      }
    }
    if (!changed) break;
  }

  const parsedOldData = Schema.safeParse(oldData);
  if (parsedOldData.success) {
    warnings.push('局部修复后仍无法解析，已恢复整份旧的有效变量');
    return { data: _.cloneDeep(parsedOldData.data), warnings, repaired: true };
  }

  warnings.push('新旧变量均无法通过 Schema 校验，本轮未执行自动覆盖');
  return { data: null, warnings, repaired };
}

export function guardParsedCommands(
  variables: Mvu.MvuData,
  commands: Mvu.CommandInfo[],
  messageContent: string = '',
): void {
  pendingNarrativeText = extractNarrativeText(messageContent);
  const mutableCommands = commands as unknown as GuardMutableCommand[];
  const appendedCommands: GuardMutableCommand[] = [];

  for (const command of mutableCommands) {
    if (!Array.isArray(command.args) || command.args.length === 0) continue;
    const rawPath = String(command.args[0] ?? '');
    const path = normalizeCompanionAliasPath(normalizeCommandPath(rawPath));
    if (path && path !== rawPath) command.args[0] = path;
    if (path && rewriteReadonlyDerivedCommand(command, path, variables)) continue;

    appendedCommands.push(...rewriteDuplicateCompanionInsert(command, path, variables));
    const valueArgIndex = getCommandValueArgIndex(command);
    if (valueArgIndex === null || !path) continue;

    const rawValue = command.args[valueArgIndex];
    const normalizedValue = coerceByPath(path, rawValue);
    command.args[valueArgIndex] = normalizedValue;
    if (!_.isEqual(normalizedValue, rawValue) && !command.reason) {
      command.reason =
        path === 'stat_data.$可参与机遇'
          ? '嵌套的行动列表 patch 已由权威变量守卫自动拆包'
          : '变量值已由权威变量守卫归一化';
    }
    rememberExplicitLevel(command, path, normalizedValue, variables);
  }

  mutableCommands.push(...appendedCommands);
}

function handleVariableUpdateEnded(newVariables: Mvu.MvuData, oldVariables: Mvu.MvuData): void {
  try {
    applyPendingExplicitLevels(newVariables);
    const nextStatData = _.get(newVariables, 'stat_data');
    const rawOldStatData = _.get(oldVariables, 'stat_data', {});
    if (!nextStatData || typeof nextStatData !== 'object') return;

    const parsedOldStatData = Schema.safeParse(rawOldStatData);
    const oldStatData = parsedOldStatData.success ? parsedOldStatData.data : (lastValidStatData ?? rawOldStatData);
    const transitionResult = applyRealmTransitionGuards(nextStatData, oldStatData, {
      protagonistNarrativeText: pendingNarrativeText,
    });
    if (transitionResult.protagonistLevelChanged) {
      transitionResult.data.当前处境 = correctProtagonistRealmText(
        transitionResult.data.当前处境,
        transitionResult.data.本尊?.等级,
        Object.keys(transitionResult.data.红颜 ?? {}),
      );
    }

    const repairResult = repairStatDataWithFallback(transitionResult.data, oldStatData);
    const warnings = [...transitionResult.warnings, ...repairResult.warnings];
    if (repairResult.data) {
      _.set(newVariables, 'stat_data', repairResult.data);
      lastValidStatData = _.cloneDeep(repairResult.data);
    }
    if (warnings.length > 0) {
      console.warn('[灯火阑珊] 变量守卫完成确定性修复', warnings);
    }
  } catch (error) {
    console.warn('[灯火阑珊] 变量守卫结算失败，保留 MVU 原始结果', error);
  } finally {
    pendingExplicitLevels.clear();
    pendingNarrativeText = '';
  }
}

export function installAuthoritativeMvuGuard(): () => void {
  const globalRef = window as unknown as Record<string, unknown>;
  if (globalRef[GUARD_INSTALLED_KEY]) return () => undefined;
  globalRef[GUARD_INSTALLED_KEY] = true;
  try {
    const currentStatData = _.get(getVariables({ type: 'chat' }), 'stat_data');
    const parsedCurrentStatData = Schema.safeParse(currentStatData);
    lastValidStatData = parsedCurrentStatData.success ? _.cloneDeep(parsedCurrentStatData.data) : null;
  } catch {
    lastValidStatData = null;
  }

  const eventStops = [
    eventOn(Mvu.events.COMMAND_PARSED, guardParsedCommands).stop,
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, handleVariableUpdateEnded).stop,
  ];
  console.info('[灯火阑珊] 权威 MVU 变量守卫已启用');

  return () => {
    eventStops.forEach(stop => {
      try {
        stop();
      } catch {
        // iframe 卸载时忽略事件总线清理竞态。
      }
    });
    pendingExplicitLevels.clear();
    pendingNarrativeText = '';
    lastValidStatData = null;
    delete globalRef[GUARD_INSTALLED_KEY];
  };
}
