import { OpportunitySchema, unwrapOpportunityPatchPayload } from './schema';

export type OpportunityType = '探索' | '交涉' | '战斗' | '修炼' | '整备' | '亲密';

export type OpportunityAction = {
  行动: string;
  类型: OpportunityType;
  提示?: string;
};

export type JsonPatchOperation = {
  op?: string;
  path?: string;
  value?: unknown;
};

export type ActionFeedMode = 'full' | 'partial' | 'fallback' | 'none' | 'cleared';

type TaskSnapshot = { 名称?: unknown; 类型?: unknown; 目标?: unknown };

type ResolveActionFeedOptions = {
  operations: JsonPatchOperation[];
  storedActions: unknown[];
  tasks: Record<string, TaskSnapshot>;
  situation: unknown;
  useStoredActionsWithoutPatch?: boolean;
};

export const normalizeAction = (value: unknown): OpportunityAction | null => {
  const result = OpportunitySchema.safeParse(value);
  if (!result.success || !result.data.行动) return null;
  return result.data;
};

const normalizeActionPayload = (value: unknown): OpportunityAction[] | null => {
  const payload = unwrapOpportunityPatchPayload(value);
  if (!Array.isArray(payload)) return null;
  return payload.map(normalizeAction).filter((action): action is OpportunityAction => action !== null);
};

export const buildFallbackActions = (tasks: Record<string, TaskSnapshot>, situation: unknown): OpportunityAction[] => {
  const taskActions = Object.values(tasks)
    .slice(0, 2)
    .flatMap(task => {
      const name = String(task.名称 ?? '').trim();
      const target = String(task.目标 ?? '').trim();
      if (!name || !target) return [];

      const typeByTask: Record<string, OpportunityType> = {
        每日: '修炼',
        临危受命: '战斗',
        秘境探索: '探索',
      };
      return [
        {
          行动: `继续推进「${name}」：${target}`,
          类型: typeByTask[String(task.类型 ?? '')] ?? '探索',
          提示: '依据进行中任务生成的行动',
        },
      ];
    });
  if (taskActions.length > 0) return taskActions;
  if (!String(situation ?? '').trim()) return [];

  return [
    {
      行动: '继续观察当前局势，并根据眼前变化决定下一步。',
      类型: '探索',
      提示: '依据当前处境提供的行动',
    },
  ];
};

export const extractJsonPatch = (content: string): JsonPatchOperation[] => {
  const match = content.match(/<JSONPatch>\s*([\s\S]*?)\s*<\/JSONPatch>/i);
  if (!match) return [];

  const payload = match[1]
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[行动提示] 当前楼层 JSONPatch 解析失败', error);
    return [];
  }
};

export const containsInitVar = (content: string) => /<initvar\b[^>]*>/i.test(content);

export const resolveActionFeed = ({
  operations,
  storedActions,
  tasks,
  situation,
  useStoredActionsWithoutPatch = false,
}: ResolveActionFeedOptions): { mode: ActionFeedMode; actions: OpportunityAction[] } => {
  const validOperations = operations.filter(operation => typeof operation.path === 'string');
  const replaceAll = validOperations.find(
    operation => operation.op === 'replace' && (operation.path === '/$可参与机遇' || operation.path === '/可参与机遇'),
  );

  if (replaceAll) {
    const actions =
      normalizeActionPayload(replaceAll.value) ??
      storedActions.map(normalizeAction).filter((action): action is OpportunityAction => action !== null);
    if (actions.length > 0) return { mode: 'full', actions };

    const fallbackActions = buildFallbackActions(tasks, situation);
    return fallbackActions.length > 0
      ? { mode: 'fallback', actions: fallbackActions }
      : { mode: 'cleared', actions: [] };
  }

  const clearActionList = validOperations.some(
    operation => (operation.path === '/$可参与机遇' || operation.path === '/可参与机遇') && operation.op === 'remove',
  );
  if (clearActionList) {
    const fallbackActions = buildFallbackActions(tasks, situation);
    return fallbackActions.length > 0
      ? { mode: 'fallback', actions: fallbackActions }
      : { mode: 'cleared', actions: [] };
  }

  const touchedIndices = [
    ...new Set(
      validOperations
        .map(operation => /^\/\$?可参与机遇\/(\d+)$/u.exec(String(operation.path))?.[1])
        .filter((index): index is string => index !== undefined)
        .map(Number)
        .filter(Number.isInteger),
    ),
  ];

  if (touchedIndices.length > 0) {
    const actions = touchedIndices
      .map(index => normalizeAction(storedActions[index]))
      .filter((action): action is OpportunityAction => action !== null);
    return { mode: actions.length > 0 ? 'partial' : 'none', actions };
  }

  if (useStoredActionsWithoutPatch) {
    const actions = storedActions.map(normalizeAction).filter((action): action is OpportunityAction => action !== null);
    if (actions.length > 0) return { mode: 'full', actions };
  }

  const fallbackActions = buildFallbackActions(tasks, situation);
  return fallbackActions.length > 0 ? { mode: 'fallback', actions: fallbackActions } : { mode: 'none', actions: [] };
};

export const actionIconMap: Record<OpportunityType, string> = {
  探索: 'fa-solid fa-mountain-sun',
  交涉: 'fa-solid fa-comments',
  战斗: 'fa-solid fa-swords',
  修炼: 'fa-solid fa-yin-yang',
  整备: 'fa-solid fa-toolbox',
  亲密: 'fa-solid fa-heart',
};

export const getActionIcon = (type: OpportunityType) => actionIconMap[type];
export const getActionKey = (action: OpportunityAction, index: number) =>
  `${action.类型}|${action.行动}|${action.提示 ?? ''}|${index}`;
