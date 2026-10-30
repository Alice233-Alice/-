import { Schema, unwrapOpportunityPatchPayload } from '../灯火阑珊/schema';
import { COMPANION_CANONICAL_NAMES } from './companion-aliases';

const COMPATIBILITY_INSTALLED_KEY = '__灯火阑珊_mvu_command_compatibility_installed__';
const READONLY_ENTITY_FIELDS = new Set([
  '突破阈值',
  '寿元上限',
  '境界描述',
  '寿元状态',
  '状态',
  '进度',
  '战力值',
  '积累已足',
  '盈余修为',
  '尝试突破',
]);
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
  '_近期任务结果',
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
type GuardMutableCommand = {
  type: 'set' | 'insert' | 'delete' | 'add';
  full_match?: string;
  args: unknown[];
  reason?: string;
};

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
  path = path.replace(/^(stat_data\.(?:本尊|红颜\.[^./]+)\.修炼状态)\.境界变动(?=\.|$)/u, '$1.最近突破');

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
    /^stat_data\._近期任务结果(?:\.|$)/u.test(path) ||
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
  if (/^stat_data\._近期任务结果(?:\.|$)/u.test(path)) {
    command.type = 'set';
    command.args = ['stat_data._近期任务结果', JSON.stringify(_.get(variables, 'stat_data._近期任务结果', {}))];
    command.reason = '近期任务结果由结构归档维护';
    return true;
  }
  if (/^stat_data\._近期任务结果(?:\.|$)/u.test(path)) {
    command.type = 'set';
    command.args = ['stat_data._近期任务结果', JSON.stringify(_.get(variables, 'stat_data._近期任务结果', {}))];
    command.reason = '近期任务结果由结构归档维护';
    return true;
  }

  const currentValue = getReadonlyDerivedPathValue(path, variables);
  if (typeof currentValue === 'undefined') return false;

  command.type = 'set';
  command.args = [path, JSON.stringify(currentValue)];
  command.reason = '只读派生字段被命令兼容改写为 no-op';
  return true;
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

  return null;
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

export function guardParsedCommands(
  variables: Mvu.MvuData,
  commands: Mvu.CommandInfo[],
  _messageContent: string = '',
): void {
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
        path === 'stat_data.$可参与机遇' ? '嵌套的行动列表 patch 已由命令兼容自动拆包' : '变量值已由命令兼容归一化';
    }
  }

  mutableCommands.push(...appendedCommands);
}

/** 仅在命令执行前兼容已知路径与格式，不接管数值结算或写回变量快照。 */
export function installMvuCommandCompatibility(): () => void {
  const globalRef = window as unknown as Record<string, unknown>;
  if (globalRef[COMPATIBILITY_INSTALLED_KEY]) return () => undefined;
  globalRef[COMPATIBILITY_INSTALLED_KEY] = true;

  const listener = eventOn(Mvu.events.COMMAND_PARSED, guardParsedCommands);
  console.info('[灯火阑珊] MVU 路径与格式兼容已启用');

  return () => {
    listener.stop();
    delete globalRef[COMPATIBILITY_INSTALLED_KEY];
  };
}
