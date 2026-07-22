const STRUCTURAL_TAGS = [
  'visual_cards',
  'pseudo_layer',
  'UpdateVariable',
  'JSONPatch',
  'StatusPlaceHolderImpl',
  '反应',
  '会话状态',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const openTagPattern = (tag: string) => `<${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`;
const closeTagPattern = (tag: string) => `<\\/${escapeRegExp(tag)}\\s*>`;

const DIALOGUE_TAGS = ['反应', '正文', '会话状态'] as const;

const REASONING_TAG_NAME_SOURCE = 'think(?:ing)?|reasoning|thought|think_?fox~?';
const REASONING_OPEN_PATTERN = /<(?:think(?:ing)?|reasoning|thought|think_?fox~?)(?=[\s>])[^>]*>/gi;
const REASONING_CLOSE_PATTERN = /<\/(?:think(?:ing)?|reasoning|thought|think_?fox~?)\s*>/gi;
const REASONING_BLOCK_PATTERN = new RegExp(
  `<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>|$)`,
  'gi',
);
const REASONING_FALLBACK_BOUNDARY = new RegExp(
  `<(?:正文|visual_cards|pseudo_layer|UpdateVariable|JSONPatch)(?=[\\s/>])`,
  'i',
);

// Strip reasoning before Tavern display regexes can expand it into embedded UI markup.
const stripReasoningPrefix = (text: string) => {
  REASONING_CLOSE_PATTERN.lastIndex = 0;
  let lastClosingEnd = -1;
  let closingMatch: RegExpExecArray | null;
  while ((closingMatch = REASONING_CLOSE_PATTERN.exec(text)) !== null) {
    lastClosingEnd = closingMatch.index + closingMatch[0].length;
  }
  REASONING_CLOSE_PATTERN.lastIndex = 0;

  if (lastClosingEnd >= 0) return text.slice(lastClosingEnd);

  REASONING_OPEN_PATTERN.lastIndex = 0;
  const unfinishedOpening = REASONING_OPEN_PATTERN.exec(text);
  REASONING_OPEN_PATTERN.lastIndex = 0;
  if (unfinishedOpening?.index === undefined) return text;

  const remainder = text.slice(unfinishedOpening.index + unfinishedOpening[0].length);
  const bodyBoundary = remainder.search(REASONING_FALLBACK_BOUNDARY);
  return bodyBoundary >= 0 ? remainder.slice(bodyBoundary) : text.slice(0, unfinishedOpening.index);
};

const findEmbeddedDocumentStart = (lowerText: string) => {
  const doctypeIndex = lowerText.indexOf('<!doctype html');
  const htmlIndex = lowerText.search(/<html(?=[\s>])/);
  if (doctypeIndex < 0) return htmlIndex;
  if (htmlIndex < 0) return doctypeIndex;
  return Math.min(doctypeIndex, htmlIndex);
};

const stripEmbeddedHtmlDocuments = (text: string) => {
  let result = text;
  for (let pass = 0; pass < 4; pass += 1) {
    const lowerText = result.toLowerCase();
    const documentStart = findEmbeddedDocumentStart(lowerText);
    if (documentStart < 0) break;

    const fencePrefix = result.slice(Math.max(0, documentStart - 16), documentStart);
    const fenceMatch = /```(?:html)?\s*$/i.exec(fencePrefix);
    const removeStart = fenceMatch
      ? documentStart - (fencePrefix.length - (fenceMatch.index ?? fencePrefix.length))
      : documentStart;
    const closingIndex = lowerText.indexOf('</html>', documentStart);
    if (closingIndex < 0) return result.slice(0, removeStart).trimEnd();

    let removeEnd = closingIndex + '</html>'.length;
    const trailingFence = /^\s*```/.exec(result.slice(removeEnd));
    if (trailingFence) removeEnd += trailingFence[0].length;
    result = `${result.slice(0, removeStart)}${result.slice(removeEnd)}`;
  }
  return result;
};

export type InlineReasoning = {
  text: string;
  isComplete: boolean;
};

export const mergeReasoningText = (primary: string, secondary: string) => {
  const first = primary.trim();
  const second = secondary.trim();
  if (!first) return second;
  if (!second || first.includes(second)) return first;
  if (second.includes(first)) return second;
  return `${first}\n\n${second}`;
};

// Some presets keep their visible thought trace inside the assistant message
// instead of SillyTavern's `extra.reasoning`. Read the raw tag content here so
// the pseudo layer can render it without running the preset's embedded UI.
export const extractInlineReasoning = (text: string): InlineReasoning | null => {
  REASONING_BLOCK_PATTERN.lastIndex = 0;
  const blocks: string[] = [];
  let found = false;
  let isComplete = true;
  let match: RegExpExecArray | null;

  while ((match = REASONING_BLOCK_PATTERN.exec(text)) !== null) {
    found = true;
    const closingTag = match[2];
    let content = match[1];
    if (!closingTag) {
      isComplete = false;
      const boundary = content.search(REASONING_FALLBACK_BOUNDARY);
      if (boundary >= 0) content = content.slice(0, boundary);
    }

    const cleaned = stripEmbeddedHtmlDocuments(content)
      .replace(REASONING_OPEN_PATTERN, '')
      .replace(REASONING_CLOSE_PATTERN, '')
      .trim();
    if (cleaned) blocks.push(cleaned);

    if (!closingTag) break;
  }
  REASONING_BLOCK_PATTERN.lastIndex = 0;

  if (!found) return null;
  return { text: blocks.join('\n\n').trim(), isComplete };
};

export const stripAuxiliaryPresentation = (text: string) =>
  stripEmbeddedHtmlDocuments(stripReasoningPrefix(text)).trim();

export type VariablePatchOperation = {
  op: string;
  path: string;
  value?: unknown;
  from?: string;
  [key: string]: unknown;
};

export type VariableUpdateDiagnostics = {
  analysis: string;
  operations: VariablePatchOperation[];
  rawPatch: string;
  isComplete: boolean;
  parseError: string;
};

const stripDialogueTagFragments = (text: string) =>
  DIALOGUE_TAGS.reduce(
    (value, tag) => value.replace(new RegExp(`<\\/?${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`, 'gi'), ''),
    text,
  )
    .replace(/<[^>]*$/g, '')
    .trim();

const readBoundedTaggedContent = (
  text: string,
  tag: string,
  stopTags: readonly string[],
  preferLast = false,
) => {
  const matches = [...text.matchAll(new RegExp(openTagPattern(tag), 'gi'))];
  const match = preferLast ? matches.at(-1) : matches[0];
  if (!match || match.index === undefined) return '';

  const start = match.index + match[0].length;
  const remainder = text.slice(start);
  const boundaries = [
    remainder.search(new RegExp(closeTagPattern(tag), 'i')),
    ...stopTags.map(stopTag => remainder.search(new RegExp(openTagPattern(stopTag), 'i'))),
  ].filter(index => index >= 0);
  const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
  return stripDialogueTagFragments(remainder.slice(0, end));
};

const unwrapDialogueQuotes = (text: string) => {
  const pairs: Array<[string, string]> = [
    ['“', '”'],
    ['「', '」'],
    ['『', '』'],
    ['"', '"'],
    ["'", "'"],
  ];
  let value = text.trim();
  for (let pass = 0; pass < 3; pass += 1) {
    const pair = pairs.find(([open, close]) => value.startsWith(open) && value.endsWith(close));
    if (!pair || value.length <= pair[0].length + pair[1].length) break;
    value = value.slice(pair[0].length, -pair[1].length).trim();
  }
  return value;
};

const readLooseTaggedContent = (text: string, tag: string, stopTags: readonly string[] = []) => {
  const openMatch = new RegExp(openTagPattern(tag), 'i').exec(text);
  if (!openMatch || openMatch.index === undefined) {
    return { content: '', isClosed: false };
  }

  const start = openMatch.index + openMatch[0].length;
  const remainder = text.slice(start);
  const closeIndex = remainder.search(new RegExp(closeTagPattern(tag), 'i'));
  const stopIndexes = stopTags
    .map(stopTag => remainder.search(new RegExp(openTagPattern(stopTag), 'i')))
    .filter(index => index >= 0);
  const boundaries = [closeIndex, ...stopIndexes].filter(index => index >= 0);
  const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;

  return {
    content: remainder.slice(0, end).trim(),
    isClosed: closeIndex >= 0 && closeIndex === end,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extractVariableUpdateDiagnostics = (text: string): VariableUpdateDiagnostics | null => {
  const updateOpen = /<update(?:variable)?(?=[\s/>])[^>]*>/i.exec(text);
  if (!updateOpen || updateOpen.index === undefined) return null;

  const updateStart = updateOpen.index + updateOpen[0].length;
  const updateRemainder = text.slice(updateStart);
  const updateCloseIndex = updateRemainder.search(/<\/update(?:variable)?\s*>/i);
  const updateBody = updateRemainder.slice(0, updateCloseIndex >= 0 ? updateCloseIndex : undefined);
  if (!/<(?:Analysis|JSONPatch)(?=[\s/>])/i.test(updateBody)) return null;

  const analysisBlock = readLooseTaggedContent(updateBody, 'Analysis', ['JSONPatch']);
  const patchBlock = readLooseTaggedContent(updateBody, 'JSONPatch');
  const isComplete = updateCloseIndex >= 0;
  const result: VariableUpdateDiagnostics = {
    analysis: analysisBlock.content,
    operations: [],
    rawPatch: patchBlock.content,
    isComplete,
    parseError: '',
  };

  if (!patchBlock.content) {
    if (isComplete || updateCloseIndex >= 0) result.parseError = '未找到 JSONPatch 更新清单';
    return result;
  }

  try {
    const parsed = JSON.parse(patchBlock.content) as unknown;
    if (!Array.isArray(parsed)) {
      result.parseError = 'JSONPatch 应为数组';
      return result;
    }

    const invalidCount = parsed.filter(item => !isRecord(item)).length;
    result.operations = parsed.filter(isRecord).map(item => ({
      ...item,
      op: String(item.op ?? '').trim(),
      path: String(item.path ?? '').trim(),
    }));
    if (invalidCount > 0) {
      result.parseError = `有 ${invalidCount} 项不是有效的补丁对象`;
    }
  } catch (error) {
    if (isComplete) {
      result.parseError = error instanceof Error ? `JSONPatch 解析失败：${error.message}` : 'JSONPatch 解析失败';
    }
  }

  return result;
};

export const stripStructuredBlocks = (text: string) => {
  let result = text;
  STRUCTURAL_TAGS.forEach(tag => {
    const open = openTagPattern(tag);
    const close = closeTagPattern(tag);
    result = result
      .replace(new RegExp(`${open}[\\s\\S]*?${close}`, 'gi'), '')
      .replace(new RegExp(`${open}[\\s\\S]*$`, 'gi'), '')
      .replace(new RegExp(`<${escapeRegExp(tag)}(?=[\\s/>])[^>]*/>`, 'gi'), '');
  });
  return result.trim();
};

export const extractNarrative = (text: string) => {
  const source = stripAuxiliaryPresentation(text);
  const completeBody = source.match(/<正文(?=[\s/>])[^>]*>([\s\S]*?)<\/正文\s*>/i)?.[1];
  const streamingBody = source.match(/<正文(?=[\s/>])[^>]*>([\s\S]*)$/i)?.[1];
  return stripStructuredBlocks(completeBody ?? streamingBody ?? source)
    .replace(/<\/?正文(?=[\s/>])[^>]*>/gi, '')
    .trim();
};

export const extractDialogueContent = (text: string) => {
  const source = stripAuxiliaryPresentation(text);
  const hasReactionTag = /<反应(?=[\s/>])/i.test(source);
  const hasBodyTag = /<正文(?=[\s/>])/i.test(source);
  const reaction = hasReactionTag
    ? stripStructuredBlocks(readBoundedTaggedContent(source, '反应', ['正文', '会话状态']))
    : '';
  const dialogue = hasBodyTag
    ? readBoundedTaggedContent(source, '正文', ['反应', '会话状态'], true)
    : hasReactionTag
      ? ''
      : extractNarrative(source);
  return {
    reaction: stripDialogueTagFragments(reaction),
    dialogue: unwrapDialogueQuotes(stripDialogueTagFragments(stripStructuredBlocks(dialogue))),
  };
};

export const formatMessageHtml = (text: string, messageId: number) => {
  const value = text.trim();
  if (!value) return '';
  try {
    return formatAsDisplayedMessage(value, { message_id: messageId });
  } catch (error) {
    console.warn('[灯火阑珊·伪同层] 消息格式化失败', error);
    return $('<div>').text(value).html().replace(/\n/g, '<br>');
  }
};
