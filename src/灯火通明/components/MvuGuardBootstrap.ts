import { Schema } from '../schema';

const GUARD_INSTALLED_KEY = '__踏月寻仙_ui_mvu_guard_installed__';
const LAST_VALID_STAT_DATA_KEY = '__踏月寻仙_last_valid_stat_data';
const READONLY_DERIVED_FIELDS = new Set(['突破阈值', '寿元上限', '境界描述', '寿元状态', '状态', '进度']);
const COMPANION_CANONICAL_NAMES: Record<string, string> = {
  虞汐: '虞汐颜',
  虞颜: '虞汐颜',
  阿鸢: '朔璃鸢',
  血手飞鸢: '朔璃鸢',
};
const pendingCompanionLevels = new Map<string, number>();
const pendingCompanionLibraryLevels = new Map<string, number>();

type GuardMutableCommand = {
  type: 'set' | 'insert' | 'delete' | 'add';
  full_match: string;
  args: unknown[];
  reason: string;
};

function normalizeCommandPath(rawPath: string): string {
  let path = String(rawPath || '').trim();
  if (!path) return path;

  if (path.startsWith('./')) {
    path = path.slice(1);
  }
  if (path.startsWith('/')) {
    path = path.replace(/^\/+/, '').replaceAll('/', '.');
  }

  path = path.replaceAll('：', ':').replaceAll('。', '.').replace(/\s+/g, '').replace(/\.\.+/g, '.');

  if (!path.startsWith('stat_data.')) {
    const topLevelKeys = [
      '本尊',
      '世界地图',
      '世界图志',
      '任务列表',
      '红颜',
      '地点库',
      '可参与机遇',
      '当前处境',
      '难度系统',
      '_系统设置',
    ];
    if (topLevelKeys.some(key => path === key || path.startsWith(`${key}.`))) {
      path = `stat_data.${path}`;
    }
  }

  return path;
}

function normalizeCompanionAliasPath(path: string): string {
  const match = path.match(/^stat_data\.(红颜|红颜角色库|_好感度快照)\.([^./]+)(?=\.|$)/);
  if (!match) return path;

  const [, section, companionName] = match;
  const canonicalName = COMPANION_CANONICAL_NAMES[companionName];
  if (!canonicalName) {
    return path;
  }

  return path.replace(`stat_data.${section}.${companionName}`, `stat_data.${section}.${canonicalName}`);
}

function coerceByPath(path: string, value: unknown): unknown {
  if (path.endsWith('熟练度') && typeof value === 'string') {
    const v = value.trim();
    const unquoted = v.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');

    if (unquoted.includes('小成')) return '熟练';
    if (unquoted.includes('中成')) return '精通';
    if (unquoted.includes('大圆满')) return '圆满';
  }

  return value;
}

function isReadonlyDerivedStatPath(path: string): boolean {
  const match = path.match(/^stat_data\.(?:本尊|红颜\.[^./]+|NPC图鉴\.[^./]+)\.([^./]+)$/);
  return !!match && READONLY_DERIVED_FIELDS.has(match[1]);
}

function getReadonlyDerivedPathValue(path: string, variables: Mvu.MvuData): unknown {
  const directValue = _.get(variables, path);
  if (typeof directValue !== 'undefined') {
    return _.cloneDeep(directValue);
  }

  const parsed = Schema.safeParse(_.get(variables, 'stat_data'));
  if (!parsed.success) {
    return undefined;
  }

  return _.get({ stat_data: parsed.data }, path);
}

function rewriteReadonlyDerivedCommand(command: GuardMutableCommand, path: string, variables: Mvu.MvuData): boolean {
  if (!isReadonlyDerivedStatPath(path)) {
    return false;
  }

  const currentValue = getReadonlyDerivedPathValue(path, variables);
  if (typeof currentValue === 'undefined') {
    return false;
  }

  command.type = 'set';
  command.args = [path, JSON.stringify(currentValue)];
  command.reason = '只读派生字段被守卫改写为no-op';
  return true;
}

function rememberCompanionLevel(path: string, value: unknown): void {
  const level = Number(value);
  if (!Number.isFinite(level) || level < 1) return;
  const normalizedLevel = Math.floor(level);

  const companionMatch = path.match(/^stat_data\.红颜\.([^./]+)\.等级$/);
  if (companionMatch) {
    pendingCompanionLevels.set(companionMatch[1], normalizedLevel);
    return;
  }

  const libraryMatch = path.match(/^stat_data\.红颜角色库\.([^./]+)\.级$/);
  if (libraryMatch) {
    pendingCompanionLibraryLevels.set(libraryMatch[1], normalizedLevel);
  }
}

function applyPendingCompanionLevels(newVariables: Mvu.MvuData): void {
  for (const [name, level] of pendingCompanionLevels.entries()) {
    if (_.has(newVariables, `stat_data.红颜.${name}`)) {
      _.set(newVariables, `stat_data.红颜.${name}.等级`, level);
    }
  }

  for (const [name, level] of pendingCompanionLibraryLevels.entries()) {
    if (_.has(newVariables, `stat_data.红颜角色库.${name}`)) {
      _.set(newVariables, `stat_data.红颜角色库.${name}.级`, level);
    }
  }
}

function tryParseLiteralObject(input: unknown): Record<string, unknown> | null {
  if (typeof input !== 'string') return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getExistingCompanionSource(
  path: string,
  variables: Mvu.MvuData,
): { value: Record<string, unknown>; source: 'current' | 'snapshot' } | null {
  const currentValue = _.get(variables, path);
  if (currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)) {
    return { value: _.cloneDeep(currentValue), source: 'current' };
  }

  try {
    const chatVariables = getVariables({ type: 'chat' });
    const snapshotValue = _.get(chatVariables, `${LAST_VALID_STAT_DATA_KEY}.${path.replace(/^stat_data\./, '')}`);
    if (snapshotValue && typeof snapshotValue === 'object' && !Array.isArray(snapshotValue)) {
      return { value: _.cloneDeep(snapshotValue), source: 'snapshot' };
    }
  } catch (e) {
    console.warn('[踏月寻仙] 读取聊天快照中的红颜数据失败', e);
  }

  return null;
}

function createCompanionPatchCommands(
  path: string,
  valueLiteral: unknown,
  existingCompanion: Record<string, unknown>,
): GuardMutableCommand[] {
  const match = path.match(/^stat_data\.红颜\.([^./]+)$/);
  if (!match) return [];

  const companionName = match[1];
  const incoming = tryParseLiteralObject(valueLiteral);
  if (!incoming) return [];

  const commands: GuardMutableCommand[] = [];

  if (_.has(incoming, '好感度')) {
    const currentFavor = Number(_.get(existingCompanion, '好感度', 0));
    const nextFavor = Number(_.get(incoming, '好感度', currentFavor));
    if (Number.isFinite(currentFavor) && Number.isFinite(nextFavor) && nextFavor !== currentFavor) {
      commands.push({
        type: 'add',
        full_match: `guard:add:${companionName}:好感度`,
        args: [`${path}.好感度`, String(nextFavor - currentFavor)],
        reason: '已存在红颜被误写为insert，守卫自动改写为delta',
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
    if (!_.has(incoming, key)) continue;
    const incomingValue = _.get(incoming, key);
    if (_.isEqual(incomingValue, _.get(existingCompanion, key))) continue;
    commands.push({
      type: 'set',
      full_match: `guard:set:${companionName}:${key}`,
      args: [`${path}.${key}`, JSON.stringify(incomingValue ?? '')],
      reason: '已存在红颜被误写为insert，守卫自动改写为replace',
    });
  }

  return commands;
}

export function bootstrapMvuGuard() {
  const globalRef = window as unknown as Record<string, unknown>;
  if (globalRef[GUARD_INSTALLED_KEY]) return () => undefined;
  globalRef[GUARD_INSTALLED_KEY] = true;
  const eventStops: Array<() => void> = [];
  let disposed = false;

  const isActiveStageFrame = () => {
    try {
      const frame = window.frameElement;
      if (!frame) return true;
      const keeper = frame.parentElement;
      if (keeper?.classList.contains('dhl-pseudo-frame-keeper')) {
        return keeper.classList.contains('dhl-pseudo-frame-active');
      }
      const rect = frame.getBoundingClientRect();
      return frame.isConnected && rect.width > 1 && rect.height > 1;
    } catch {
      return true;
    }
  };

  waitGlobalInitialized('Mvu')
    .then(() => {
      if (disposed) return;
      eventStops.push(eventOn(Mvu.events.COMMAND_PARSED, (variables: Mvu.MvuData, commands: Mvu.CommandInfo[]) => {
        if (!isActiveStageFrame()) return;
        const normalizedCommands = commands as unknown as GuardMutableCommand[];
        const appendedCommands: GuardMutableCommand[] = [];

        for (const command of normalizedCommands) {
          if (!Array.isArray(command.args) || command.args.length === 0) continue;

          const rawPath = String(command.args[0] ?? '');
          const path = normalizeCompanionAliasPath(normalizeCommandPath(rawPath));
          if (path && path !== rawPath) {
            command.args[0] = path;
          }

          if (path && rewriteReadonlyDerivedCommand(command, path, variables)) {
            continue;
          }

          if (command.type === 'insert' && path.startsWith('stat_data.红颜.')) {
            const existingCompanion = getExistingCompanionSource(path, variables);
            if (existingCompanion) {
              const rewrittenCommands = createCompanionPatchCommands(
                path,
                command.args[command.args.length - 1],
                existingCompanion.value,
              );
              appendedCommands.push(...rewrittenCommands);
              if (existingCompanion.source === 'current') {
                command.type = 'set';
                command.args = [path, JSON.stringify(existingCompanion.value)];
                command.reason = '已存在红颜被误写为insert，原命令已由守卫改写为no-op';
              } else {
                command.args[command.args.length - 1] = JSON.stringify(existingCompanion.value);
                command.reason = '当前楼层缺少红颜对象，守卫已用聊天快照补全基底再应用更新';
              }
              continue;
            }
          }

          if (command.args.length >= 2 && path) {
            command.args[1] = coerceByPath(path, command.args[1]);
            rememberCompanionLevel(path, command.args[1]);
          }
        }

        if (appendedCommands.length > 0) {
          normalizedCommands.push(...appendedCommands);
        }
      }).stop);

      eventStops.push(eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (newVariables: Mvu.MvuData) => {
        if (!isActiveStageFrame()) return;
        applyPendingCompanionLevels(newVariables);
        const statData = _.get(newVariables, 'stat_data');
        const parsed = Schema.safeParse(statData);
        pendingCompanionLevels.clear();
        pendingCompanionLibraryLevels.clear();
        if (!parsed.success) return;
        if (!_.isEqual(statData, parsed.data)) {
          _.set(newVariables, 'stat_data', parsed.data);
        }
      }).stop);

      console.info('[踏月寻仙] UI MVU 纠错守卫已启用');
    })
    .catch(e => {
      if (disposed) return;
      console.warn('[踏月寻仙] UI MVU 纠错守卫启用失败', e);
    });

  return () => {
    if (disposed) return;
    disposed = true;
    eventStops.splice(0).forEach(stop => {
      try {
        stop();
      } catch {
        // iframe 卸载期间忽略父页事件总线的清理竞态。
      }
    });
    delete globalRef[GUARD_INSTALLED_KEY];
  };
}
