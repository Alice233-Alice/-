import { formatNarrativeHtml, parseMessageContent } from '../src/灯火通明-测试版/message-content';

export const inlineNoticeSamples = [
  {
    name: '日常相处',
    count: 0,
    message:
      '雨声渐疏，她将温好的茶推近些。\n\n“今日山路湿滑，晚些再走也好。”\n\n窗外竹叶垂着水珠，案上的旧书又翻过一页。',
  },
  {
    name: '新线索',
    count: 1,
    message:
      '掌柜将药盒逐一摆开。同批入库的枯荣丹，封口却分朱、青两色。问及缘由，他翻过两页账簿，指尖停了下来。\n\n【新线索：同批枯荣丹出现两种封蜡，进货来源值得分别核实。】\n\n案边还压着半张货单，纸角留有未干透的青色蜡痕。',
  },
  {
    name: '阶段进展',
    count: 1,
    message:
      '两名证人分别说完当夜经过，时辰、车马与停靠的铺面皆能相互印证。\n\n【任务进展：两份证词已核对一致，商队账目成为目前尚缺的一环。】\n\n掌柜收好笔录，望向街口尚未开门的账房。',
  },
];

/** 在浏览器中执行，使用真实 DOM 检验测试版共用格式化入口。 */
export function checkBrightInlineNotices() {
  const checks: string[] = [];
  const originalFormatter = globalThis.formatAsDisplayedMessage;
  let formatted = '';
  let receivedText = '';
  let receivedId: number | undefined;
  globalThis.formatAsDisplayedMessage = (text, options) => {
    receivedText = text;
    receivedId = options?.message_id;
    return formatted;
  };
  const assert = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
  };
  const read = (html: string) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content;
  };
  const render = (html: string, text = '正文') => {
    formatted = html;
    return read(formatNarrativeHtml(text, 7));
  };
  const plain = (name: string, html: string) => {
    const result = render(html);
    assert(result.querySelectorAll('.dhl-story-notice').length === 0, name);
    assert(result.textContent === read(html).textContent, `${name}：保留原文`);
    checks.push(name);
  };

  try {
    const clue = render('<p>此前的正文。</p><p>【新线索：三封家书都经停云驿转递。】</p><p>后续正文。</p>', '本轮正文');
    const note = clue.querySelector<HTMLElement>('.dhl-story-notice')!;
    assert(clue.children.length === 3 && clue.children[1] === note, '提示保留在对应段落位置');
    assert(note?.dataset.kind === 'clue', '新线索类型');
    assert(note.getAttribute('role') === 'note' && note.getAttribute('aria-label') === '新线索', '可读的提示语义');
    assert(note.querySelector('.dhl-story-notice__body')?.textContent === '三封家书都经停云驿转递。', '提示正文');
    assert(note.querySelector('.dhl-story-notice__mark')?.getAttribute('aria-hidden') === 'true', '装饰标记不重复朗读');
    assert(receivedText === '本轮正文' && receivedId === 7, '沿用酒馆格式化入口及楼层参数');
    checks.push('完整提示、位置、语义与楼层参数');

    const progress = render('<p>【任务进展： 两份证词已核对。 】</p>').querySelector<HTMLElement>('.dhl-story-notice');
    assert(progress?.dataset.kind === 'progress', '任务进展类型');
    assert(progress.querySelector('.dhl-story-notice__body')?.textContent === '两份证词已核对。', '去掉内容边缘空白');
    checks.push('任务进展');

    plain('未知类型', '<p>【奖励到账：灵石十枚。】</p>');
    plain('空提示', '<p>【新线索： 】</p>');
    plain('行内提及', '<p>她看见【新线索：旧驿。】这几个字。</p>');
    plain('提示后的同段正文', '<p>【新线索：旧驿。】他将旧图收好。</p>');
    plain('同段多个标记', '<p>【新线索：旧驿。】【任务进展：已查图。】</p>');
    plain('代码块', '<pre><code>【新线索：代码示例。】</code></pre>');
    plain('段内代码', '<p><code>【新线索：代码示例。】</code></p>');
    plain('引用块', '<blockquote><p>【新线索：他人的引文。】</p></blockquote>');
    plain('人物引语', '<p>“【新线索：人物说出的格式示例。】”</p>');
    plain('HTML 引语', '<p><q>【新线索：人物引用的格式示例。】</q></p>');
    plain('跨段人物引语', '<p>她展开信纸，说：“</p><p>【新线索：信中引用。】</p><p>这只是示例。”</p>');
    plain('富内容段落', '<p>【新线索：<a href="#old">旧驿</a>。】</p>');

    const quotedName = render('<p>【新线索：落款为“霜河天舟”，来处待查。】</p>');
    assert(quotedName.querySelectorAll('.dhl-story-notice').length === 1, '提示内正常引用名称仍可识别');
    assert(!quotedName.querySelector('.dhl-story-notice .dhl-story-dialogue'), '提示文字沿用统一阅读颜色');
    checks.push('提示中的引号');

    const escaped = render('<p>【新线索：纸上写着 &lt;img src=x onerror=alert(1)&gt;。】</p>');
    assert(!escaped.querySelector('img'), '提示内容仍为文字');
    assert(escaped.querySelector('.dhl-story-notice__body')?.textContent?.includes('<img'), '保留特殊字符');
    checks.push('特殊字符按文字呈现');

    const stream = '【新线索：旧驿成为共同来处。】';
    for (let length = 1; length <= stream.length; length += 1) {
      const prefix = stream.slice(0, length);
      const result = render(`<p>${prefix}</p>`);
      assert(
        result.querySelectorAll('.dhl-story-notice').length === Number(length === stream.length),
        `流式片段 ${length}`,
      );
      if (length < stream.length) assert(result.textContent === prefix, '流式未闭合内容原样可读');
    }
    checks.push('逐字流式与中断片段');

    plain('旧正文及原有对话着色', '<p>雨落檐前。</p><p>“明日再来。”她收好旧图。</p>');
    const serialized = document.createElement('div');
    serialized.append(clue.cloneNode(true));
    const reread = render(serialized.innerHTML);
    assert(reread.querySelectorAll('.dhl-story-notice').length === 1, '重复阅读保持单份提示');
    checks.push('重复阅读');

    const body = '她翻开旧图。\n\n【新线索：旧驿的位置已在图上找到。】';
    const patch =
      '<UpdateVariable><JSONPatch>[{"op":"replace","path":"/当前处境","value":"正在查阅旧图"}]</JSONPatch></UpdateVariable>';
    const parsed = parseMessageContent(
      `<think>【新线索：思考中的示例。】</think><content>${body}</content><visual_cards>[]</visual_cards>${patch}`,
    );
    assert(parsed.narrative === body, '提示保留在正文，思考与变量块继续隔离');
    assert(parsed.reasoning?.text.includes('思考中的示例'), '原有思考解析仍可用');
    checks.push('正文、思考、视觉卡与 MVU 块的原有分流');
    return checks;
  } finally {
    globalThis.formatAsDisplayedMessage = originalFormatter;
  }
}
