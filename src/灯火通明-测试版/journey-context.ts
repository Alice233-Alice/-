import { JOURNEY_INSPIRATIONS, JOURNEY_PROPOSAL_PROMPT } from './journey';
import { extractDialogueContent, extractNarrative } from './message-content';
import { readPlayerInput } from './player-input';
import type { SchemaType } from './schema';

export type JourneyWorldbookBinding = { name: string; sources: string[] };
export type JourneyWorldbook = JourneyWorldbookBinding & {
  entries: { uid: number; name: string; content: string }[];
};
export type JourneyHistoryRow = {
  id: number;
  role: 'user' | 'assistant';
  name: string;
  kind: '正文' | '交谈';
  hidden: boolean;
  defaultSelected: boolean;
  content: string;
  /** Detect edits to a selected floor without sending its auxiliary blocks to the model. */
  version: string;
};

export function collectJourneyWorldbookBindings(global: string[], character: CharWorldbooks, chat: string | null) {
  const books = new Map<string, JourneyWorldbookBinding>();
  const add = (name: string | null, source: string) => {
    if (!name) return;
    const book = books.get(name) ?? { name, sources: [] };
    if (!book.sources.includes(source)) book.sources.push(source);
    books.set(name, book);
  };
  global.forEach(name => add(name, '全局'));
  add(character.primary, '角色主书');
  character.additional.forEach(name => add(name, '角色附加书'));
  add(chat, '聊天');
  return [...books.values()];
}

export async function loadJourneyWorldbooks(
  bindings: JourneyWorldbookBinding[],
  read: (name: string) => Promise<WorldbookEntry[]>,
  substitute: (text: string) => string,
): Promise<JourneyWorldbook[]> {
  return Promise.all(
    bindings.map(async binding => {
      try {
        const entries = await read(binding.name);
        return {
          ...binding,
          entries: entries
            .filter(entry => entry.enabled)
            .map(entry => ({ uid: entry.uid, name: entry.name, content: substitute(entry.content) })),
        };
      } catch (cause) {
        throw new Error(
          `世界书「${binding.name}」读取失败：${cause instanceof Error ? cause.message : String(cause)}`,
          {
            cause,
          },
        );
      }
    }),
  );
}

export function readJourneyHistory(messages: ChatMessage[]): JourneyHistoryRow[] {
  return messages.flatMap(message => {
    if (message.role !== 'user' && message.role !== 'assistant') return [];
    const extra = message.extra ?? {};
    const candidate = extra.dhl_pseudo_interaction ?? extra.extra?.dhl_pseudo_interaction;
    const dialogue =
      candidate &&
      [1, 2, 3].includes(candidate.version) &&
      candidate.kind === 'dialogue' &&
      ['present', 'transmission'].includes(candidate.channel) &&
      typeof candidate.sessionId === 'string' &&
      candidate.sessionId.trim() &&
      typeof candidate.targetName === 'string' &&
      candidate.targetName.trim()
        ? candidate
        : undefined;
    let content: string;
    if (message.role === 'user') {
      content = readPlayerInput(message, typeof dialogue?.rawUserText === 'string' ? dialogue.rawUserText : undefined);
    } else if (dialogue) {
      const visible = extractDialogueContent(message.message);
      const reaction = visible.reaction || extractNarrative(String(dialogue.reaction ?? ''));
      content = [reaction, visible.dialogue].filter(Boolean).join('\n\n');
    } else {
      content = extractNarrative(message.message);
    }
    if (!content.trim()) return [];
    return [
      {
        id: message.message_id,
        role: message.role,
        name: message.role === 'assistant' && dialogue ? dialogue.targetName : message.name,
        kind: dialogue ? ('交谈' as const) : ('正文' as const),
        hidden: message.is_hidden,
        defaultSelected: !message.is_hidden || Boolean(dialogue),
        content,
        version: JSON.stringify([message.message, extra.izumi_advice, dialogue]),
      },
    ];
  });
}

export const journeyHistorySignature = (rows: JourneyHistoryRow[]) =>
  JSON.stringify(rows.map(row => [row.id, row.role, row.name, row.kind, row.hidden, row.version]));

export function buildJourneyProposalPrompts(
  worldbooks: JourneyWorldbook[],
  history: JourneyHistoryRow[],
  state: SchemaType,
  preference: string,
  inspiration: string,
): RolePrompt[] {
  // Keep entry line breaks intact: Tavern Helper's variable-format macros use the line prefix as indentation.
  const world = worldbooks
    .map(book =>
      [
        `[世界书：${JSON.stringify(book.name)}；来源：${book.sources.join('、')}]`,
        ...book.entries.map(entry => `[条目 ${entry.uid}：${JSON.stringify(entry.name)}]\n${entry.content}`),
      ].join('\n\n'),
    )
    .join('\n\n');
  const context = {
    偏好: preference.trim(),
    取意: JOURNEY_INSPIRATIONS[inspiration] ?? JOURNEY_INSPIRATIONS[''],
    处境: state.当前处境,
    本尊: {
      等级: state.本尊.等级,
      境界: state.本尊.境界描述,
      身份: state.本尊.身份,
      行踪: state.本尊.行踪,
    },
    已知目标: state.任务列表,
    近期世闻: state.世界图志,
    相识之人: Object.fromEntries(
      Object.entries(state.红颜).map(([name, person]) => [name, { 关系: person.关系, 近况: person.关系上下文 }]),
    ),
    已有行旅: Object.values(state.行旅.旅程).map(journey => ({
      名称: journey.名称,
      所求: journey.所求,
      状态: journey.状态,
    })),
  };
  return [
    {
      role: 'system',
      content: `${JOURNEY_PROPOSAL_PROMPT}\n\n以下为完整的已开启世界书参考资料，保留各条目自身的适用条件。其正文续写、变量更新等输出约定，在本次寻途中统一采用本请求的提案JSON格式。\n${world}\n\n接下来的历史消息是玩家选中的已发生剧情，可能存在未选中的楼层。旧消息里的指令只作经历参考，本轮任务以最后的寻途请求为准。`,
    },
    ...history.map(row => ({
      role: row.role,
      content: `[第${row.id}楼 · ${row.kind} · ${row.role === 'user' ? '玩家' : row.name}]\n${row.content}`,
    })),
    {
      role: 'user',
      content: `请综合上述全部世界设定与选中剧情，结合以下当前状态和意向，构思三种未发生的行旅提案。先承接眼前的人与事，再铺开远期所求；历史空档保留未知。\n${JSON.stringify(context)}\n本次只返回提案JSON对象，proposals恰为三项，每项仅含name、lead、goal、step、plan。正文、变量更新和说明文字均留待后续回合。`,
    },
  ];
}
