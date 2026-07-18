const STRUCTURAL_TAGS = [
  'visual_cards',
  'pseudo_layer',
  'UpdateVariable',
  'JSONPatch',
  'StatusPlaceHolderImpl',
];

export const stripStructuredBlocks = (text: string) => {
  let result = text;
  STRUCTURAL_TAGS.forEach(tag => {
    result = result
      .replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '')
      .replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*$`, 'gi'), '')
      .replace(new RegExp(`<${tag}\\b[^>]*/>`, 'gi'), '');
  });
  return result.trim();
};

export const extractNarrative = (text: string) => {
  const completeBody = text.match(/<正文\b[^>]*>([\s\S]*?)<\/正文>/i)?.[1];
  const streamingBody = text.match(/<正文\b[^>]*>([\s\S]*)$/i)?.[1];
  return stripStructuredBlocks(completeBody ?? streamingBody ?? text).replace(/<\/?正文\b[^>]*>/gi, '').trim();
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
