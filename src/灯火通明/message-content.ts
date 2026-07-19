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

const readTaggedContent = (text: string, tag: string) => {
  const open = openTagPattern(tag);
  const close = closeTagPattern(tag);
  const complete = text.match(new RegExp(`${open}([\\s\\S]*?)${close}`, 'i'))?.[1];
  const streaming = text.match(new RegExp(`${open}([\\s\\S]*)$`, 'i'))?.[1];
  return (complete ?? streaming ?? '')
    .replace(new RegExp(`<\\/?${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`, 'gi'), '')
    .trim();
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
  const reaction = hasReactionTag ? stripStructuredBlocks(readTaggedContent(text, '反应')) : '';
  const dialogue = hasBodyTag
    ? readTaggedContent(text, '正文')
    : hasReactionTag
      ? ''
      : extractNarrative(text);
  return {
    reaction: reaction.replace(/<[^>]*$/g, '').trim(),
    dialogue: unwrapDialogueQuotes(stripStructuredBlocks(dialogue).replace(/<[^>]*$/g, '').trim()),
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
