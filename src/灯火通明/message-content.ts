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
  const completeBody = text.match(/<正文(?=[\s/>])[^>]*>([\s\S]*?)<\/正文\s*>/i)?.[1];
  const streamingBody = text.match(/<正文(?=[\s/>])[^>]*>([\s\S]*)$/i)?.[1];
  return stripStructuredBlocks(completeBody ?? streamingBody ?? text)
    .replace(/<\/?正文(?=[\s/>])[^>]*>/gi, '')
    .trim();
};

export const extractDialogueContent = (text: string) => {
  const hasReactionTag = /<反应(?=[\s/>])/i.test(text);
  const hasBodyTag = /<正文(?=[\s/>])/i.test(text);
  const reaction = hasReactionTag
    ? stripStructuredBlocks(readBoundedTaggedContent(text, '反应', ['正文', '会话状态']))
    : '';
  const dialogue = hasBodyTag
    ? readBoundedTaggedContent(text, '正文', ['反应', '会话状态'], true)
    : hasReactionTag
      ? ''
      : extractNarrative(text);
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
