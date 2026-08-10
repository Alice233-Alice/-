declare const require: (id: string) => any;

const lodash = require('lodash');
(globalThis as any)._ = lodash;

const { Schema, describeRealmByLevel, getRealmThreshold } = require('../src/灯火阑珊/schema.ts');
const {
  applyRealmTransitionGuards,
  correctProtagonistRealmText,
  guardParsedCommands,
  repairStatDataWithFallback,
} = require('../src/灯火阑珊-变量结构/guard.ts');

export type PatchOperation = {
  op: 'replace' | 'delta' | 'insert' | 'remove';
  path: string;
  value?: unknown;
};

export type SemanticExpectation = {
  应创建任务?: boolean;
  应接续任务?: boolean;
  应推进任务?: string;
  禁止新任务?: boolean;
  必须记录库存?: string[];
};

export type ParsedUpdateVariable = {
  analysis: string;
  patch: PatchOperation[];
};

export type ReplayResult = {
  analysis: string;
  patch: PatchOperation[];
  commands: Array<{ type: string; args: unknown[]; reason?: string }>;
  finalData: any;
  warnings: string[];
  errors: string[];
  commandGuardIntervened: boolean;
  schemaRepairIntervened: boolean;
  fullRollback: boolean;
};

const SUPPORTED_OPS = new Set(['replace', 'delta', 'insert', 'remove']);

export function decodeJsonPointer(path: string): string[] {
  if (!path.startsWith('/') || path === '/') {
    throw new Error(`非法 JSON Pointer：${path || '(空)'}`);
  }
  return path
    .slice(1)
    .split('/')
    .map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
}

export function getByPointer(data: unknown, path: string): unknown {
  return lodash.get(data, decodeJsonPointer(path));
}

function hasByPointer(data: unknown, path: string): boolean {
  return lodash.has(data, decodeJsonPointer(path));
}

function validatePathConflicts(patch: PatchOperation[]): void {
  const paths = patch.map(item => item.path);
  for (let leftIndex = 0; leftIndex < paths.length; leftIndex += 1) {
    const left = paths[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < paths.length; rightIndex += 1) {
      const right = paths[rightIndex];
      if (left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`)) {
        throw new Error(`JSONPatch 路径冲突：${left} ↔ ${right}`);
      }
    }
  }
}

export function parseUpdateVariable(source: string): ParsedUpdateVariable {
  const blocks = [...String(source).matchAll(/<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/giu)];
  if (blocks.length !== 1) {
    throw new Error(`必须且只能有一个 <UpdateVariable>，实际为 ${blocks.length}`);
  }

  const trailingText = String(source)
    .slice((blocks[0].index ?? 0) + blocks[0][0].length)
    .trim();
  if (trailingText) {
    throw new Error('</UpdateVariable> 后存在额外文本');
  }

  const inner = blocks[0][1];
  const analysisBlocks = [...inner.matchAll(/<Analysis>([\s\S]*?)<\/Analysis>/giu)];
  const patchBlocks = [...inner.matchAll(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/giu)];
  if (analysisBlocks.length !== 1 || patchBlocks.length !== 1) {
    throw new Error('UpdateVariable 内必须各有一个 Analysis 与 JSONPatch');
  }

  const analysis = analysisBlocks[0][1].trim();
  if (analysis.length > 80) {
    throw new Error(`Analysis 超过 80 字：${analysis.length}`);
  }

  let rawPatch: unknown;
  try {
    rawPatch = JSON.parse(patchBlocks[0][1].trim());
  } catch (error) {
    throw new Error(`JSONPatch 不是合法 JSON：${String(error)}`, { cause: error });
  }
  if (!Array.isArray(rawPatch)) {
    throw new Error('JSONPatch 必须是数组');
  }

  const patch = rawPatch.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
      throw new Error(`JSONPatch[${index}] 必须是对象`);
    }
    const item = rawItem as Record<string, unknown>;
    const op = String(item.op ?? '');
    const path = String(item.path ?? '');
    if (!SUPPORTED_OPS.has(op)) {
      throw new Error(`JSONPatch[${index}] 使用了非法 op：${op}`);
    }
    decodeJsonPointer(path);
    if (op === 'remove') {
      if (Object.hasOwn(item, 'value')) {
        throw new Error(`remove 不得携带 value：${path}`);
      }
    } else if (!Object.hasOwn(item, 'value')) {
      throw new Error(`${op} 缺少 value：${path}`);
    }
    if (op === 'delta' && (typeof item.value !== 'number' || !Number.isFinite(item.value))) {
      throw new Error(`delta 必须是有限数值：${path}`);
    }
    return {
      op: op as PatchOperation['op'],
      path,
      ...(Object.hasOwn(item, 'value') ? { value: item.value } : {}),
    };
  });

  validatePathConflicts(patch);
  return { analysis, patch };
}

function encodeCommandValue(value: unknown): string {
  return JSON.stringify(value);
}

function patchToCommands(patch: PatchOperation[]): Array<{ type: string; args: unknown[] }> {
  const commandTypes = {
    replace: 'set',
    delta: 'add',
    insert: 'insert',
    remove: 'delete',
  } as const;

  return patch.map(item => ({
    type: commandTypes[item.op],
    args: item.op === 'remove' ? [item.path] : [item.path, encodeCommandValue(item.value)],
  }));
}

function normalizeCommandPathsOnly(commands: Array<{ type: string; args: unknown[] }>) {
  return commands.map(command => {
    const next = lodash.cloneDeep(command);
    const rawPath = String(next.args[0] ?? '');
    next.args[0] = rawPath.startsWith('/') ? `stat_data.${decodeJsonPointer(rawPath).join('.')}` : rawPath;
    return next;
  });
}

function decodeCommandValue(rawValue: unknown): unknown {
  if (typeof rawValue !== 'string') return lodash.cloneDeep(rawValue);
  try {
    return JSON.parse(rawValue);
  } catch {
    return rawValue;
  }
}

function commandPathToSegments(rawPath: unknown): string[] {
  const normalized = String(rawPath ?? '').replace(/^stat_data\./u, '');
  if (!normalized || normalized === 'stat_data') {
    throw new Error(`非法命令路径：${String(rawPath)}`);
  }
  return normalized.split('.').filter(Boolean);
}

function applyGuardedCommands(oldData: any, commands: Array<{ type: string; args: unknown[]; reason?: string }>): any {
  const candidate = lodash.cloneDeep(oldData);
  for (const command of commands) {
    const path = commandPathToSegments(command.args[0]);
    const printablePath = `/${path.join('/')}`;
    switch (command.type) {
      case 'set': {
        if (!lodash.has(candidate, path)) {
          throw new Error(`replace 目标不存在：${printablePath}`);
        }
        lodash.set(candidate, path, decodeCommandValue(command.args.at(-1)));
        break;
      }
      case 'insert': {
        if (lodash.has(candidate, path)) {
          throw new Error(`insert 目标已存在：${printablePath}`);
        }
        lodash.set(candidate, path, decodeCommandValue(command.args.at(-1)));
        break;
      }
      case 'add': {
        const oldValue = Number(lodash.get(candidate, path));
        const delta = Number(decodeCommandValue(command.args.at(-1)));
        if (!Number.isFinite(oldValue) || !Number.isFinite(delta)) {
          throw new Error(`delta 目标或增量不是有限数值：${printablePath}`);
        }
        lodash.set(candidate, path, oldValue + delta);
        break;
      }
      case 'delete': {
        if (!lodash.has(candidate, path)) {
          throw new Error(`remove 目标不存在：${printablePath}`);
        }
        lodash.unset(candidate, path);
        break;
      }
      default:
        throw new Error(`变量守卫产生了未知命令：${command.type}`);
    }
  }
  return candidate;
}

function checkFiniteNumbers(value: unknown, path: string, errors: string[]): void {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    errors.push(`${path} 不是有限数值`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkFiniteNumbers(item, `${path}[${index}]`, errors));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      checkFiniteNumbers(child, `${path}.${key}`, errors);
    }
  }
}

function checkCultivator(cultivator: any, label: string, errors: string[]): void {
  const level = Number(cultivator?.等级);
  if (!Number.isInteger(level) || level < 1 || level > 48) {
    errors.push(`${label}.等级 超出 1~48 整数范围`);
    return;
  }
  if (cultivator.境界描述 !== describeRealmByLevel(level)) {
    errors.push(`${label}.境界描述 与等级不一致`);
  }
  if (cultivator.突破阈值 !== getRealmThreshold(level)) {
    errors.push(`${label}.突破阈值 与等级不一致`);
  }
  if (cultivator.修炼状态?.阶段 !== '突破中' && cultivator.修炼状态?.境界变动?.类型 !== '无') {
    errors.push(`${label}.境界变动 在非突破中阶段未清理`);
  }
}

export function collectInvariantErrors(data: any): string[] {
  const errors: string[] = [];
  const reparsed = Schema.parse(data);
  if (!lodash.isEqual(data, reparsed)) {
    errors.push('Schema 二次解析不幂等');
  }
  checkFiniteNumbers(data, 'stat_data', errors);
  checkCultivator(data.本尊, '本尊', errors);
  for (const [name, companion] of Object.entries(data.红颜 ?? {})) {
    checkCultivator(companion, `红颜.${name}`, errors);
  }

  for (const containerName of ['背包', '法宝', '杂物袋']) {
    for (const [name, item] of Object.entries(data.本尊?.[containerName] ?? {}) as Array<
      [string, { 数量?: unknown }]
    >) {
      if (!name.trim() || !Number.isInteger(item.数量) || Number(item.数量) <= 0) {
        errors.push(`本尊.${containerName}.${name || '(空)'} 数量非法`);
      }
    }
  }

  for (const [taskId, task] of Object.entries(data.任务列表 ?? {}) as Array<
    [string, { 名称?: unknown; 目标?: unknown; 状态?: unknown }]
  >) {
    if (!taskId.trim() || !String(task.名称 ?? '').trim() || !String(task.目标 ?? '').trim()) {
      errors.push(`任务列表.${taskId || '(空)'} 缺少名称或目标`);
    }
    if (task.状态 !== '进行中') {
      errors.push(`任务列表.${taskId}.状态 不是进行中`);
    }
  }

  const actions = (data.$可参与机遇 ?? []).map((item: { 行动?: unknown }) => String(item.行动 ?? ''));
  if (new Set(actions).size !== actions.length) {
    errors.push('可参与机遇存在重复行动');
  }
  if (data._系统设置?.变量结构版本 !== 4 || data._系统设置?.修炼系统版本 !== 3) {
    errors.push('变量结构版本或修炼系统版本不正确');
  }
  return errors;
}

function collectSemanticErrors(
  oldData: any,
  finalData: any,
  patch: PatchOperation[],
  expectation: SemanticExpectation,
): string[] {
  const errors: string[] = [];
  const taskInserts = patch.filter(item => item.op === 'insert' && item.path.startsWith('/任务列表/'));
  const taskRemoves = patch.filter(item => item.op === 'remove' && item.path.startsWith('/任务列表/'));
  const oldTaskCount = Object.keys(oldData.任务列表 ?? {}).length;
  const finalTaskCount = Object.keys(finalData.任务列表 ?? {}).length;

  if (expectation.应创建任务 && (taskInserts.length === 0 || finalTaskCount <= oldTaskCount)) {
    errors.push('语义预期要求创建任务，但更新未建立新任务');
  }
  if (expectation.应接续任务 && (taskRemoves.length === 0 || taskInserts.length === 0 || finalTaskCount === 0)) {
    errors.push('语义预期要求任务接续，但未同时 remove 旧任务并 insert 新任务');
  }
  if (
    expectation.应推进任务 &&
    !patch.some(item => item.op === 'replace' && item.path === `/任务列表/${expectation.应推进任务}/目标`)
  ) {
    errors.push(`语义预期要求推进任务：${expectation.应推进任务}`);
  }
  if (expectation.禁止新任务 && taskInserts.length > 0) {
    errors.push('语义预期禁止创建任务，但更新插入了任务');
  }
  for (const itemName of expectation.必须记录库存 ?? []) {
    const exists = ['背包', '法宝', '杂物袋'].some(container => lodash.has(finalData, ['本尊', container, itemName]));
    if (!exists) {
      errors.push(`语义预期要求记录库存：${itemName}`);
    }
  }
  return errors;
}

export function executeUpdateVariable(
  oldStatData: unknown,
  updateSource: string,
  semanticExpectation: SemanticExpectation = {},
): ReplayResult {
  const oldData = Schema.parse(oldStatData);
  const parsedUpdate = parseUpdateVariable(updateSource);
  const commands = patchToCommands(parsedUpdate.patch);
  const commandsAfterPathNormalization = normalizeCommandPathsOnly(commands);
  guardParsedCommands({ stat_data: lodash.cloneDeep(oldData) } as any, commands as any);
  const commandGuardIntervened = !lodash.isEqual(commandsAfterPathNormalization, commands);
  const candidate = applyGuardedCommands(oldData, commands);

  const transitionResult = applyRealmTransitionGuards(candidate, oldData);
  if (transitionResult.protagonistLevelChanged) {
    transitionResult.data.当前处境 = correctProtagonistRealmText(
      transitionResult.data.当前处境,
      transitionResult.data.本尊?.等级,
      Object.keys(transitionResult.data.红颜 ?? {}),
    );
  }
  const repairResult = repairStatDataWithFallback(transitionResult.data, oldData);
  if (!repairResult.data) {
    throw new Error('变量守卫无法获得有效的新旧快照');
  }

  const finalData = Schema.parse(repairResult.data);
  const warnings = [...transitionResult.warnings, ...repairResult.warnings];
  const errors = [
    ...collectInvariantErrors(finalData),
    ...collectSemanticErrors(oldData, finalData, parsedUpdate.patch, semanticExpectation),
  ];
  return {
    analysis: parsedUpdate.analysis,
    patch: parsedUpdate.patch,
    commands,
    finalData,
    warnings,
    errors,
    commandGuardIntervened,
    schemaRepairIntervened: repairResult.repaired,
    fullRollback: warnings.some(warning => warning.includes('整份旧的有效变量')),
  };
}

export function makeUpdateVariable(analysis: string, patch: PatchOperation[]): string {
  return [
    '<UpdateVariable>',
    `<Analysis>${analysis}</Analysis>`,
    `<JSONPatch>${JSON.stringify(patch)}</JSONPatch>`,
    '</UpdateVariable>',
  ].join('\n');
}
