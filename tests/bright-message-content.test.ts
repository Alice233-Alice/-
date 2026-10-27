/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const {
  extractInlineReasoning,
  extractVariableUpdateDiagnostics,
  formatReasoningHtml,
  hasReasoningFrontendBootstrap,
  parseMessageContent,
  sanitizeReasoningText,
  selectReasoningText,
} = require('../src/灯火通明/message-content');

type TestCase = { name: string; run: () => void };
const tests: TestCase[] = [];
const test = (name: string, run: () => void) => tests.push({ name, run });

const frontendLoader = `<body>
<script>
$('body').load('https://cdn.jsdelivr.net/gh/Alice233-Alice/Apeiria@main/灯火通明/index.html')
</script>
</body>`;

test('清除正文占位、前端加载器和模型写作脚手架', () => {
  const cleaned = sanitizeReasoningText(`[story text] [故事文本]

${frontendLoader}
Let's write. 让我们开始写作吧。

We might keep the scene focused on the established characters.

Let's produce. 让我们开始生成吧。`);
  assert.equal(cleaned, 'We might keep the scene focused on the established characters.');
  assert.equal(hasReasoningFrontendBootstrap(frontendLoader), true);
});

test('原生 reasoning 优先，内联 reasoning 只作为缺省回退', () => {
  assert.equal(selectReasoningText('原生推演', '内联推演'), '原生推演');
  assert.equal(selectReasoningText(frontendLoader, '可用的内联推演'), '可用的内联推演');
});

test('流式内联 reasoning 在未闭合时也会清理加载器', () => {
  const inline = extractInlineReasoning(`<think>
[story text]
${frontendLoader}
保留这一段真正的推演。
`);
  assert.ok(inline);
  assert.equal(inline.text, '保留这一段真正的推演。');
  assert.equal(inline.isComplete, false);
});

test('思维链使用纯文本安全格式，不执行模型输出中的 HTML', () => {
  const html = formatReasoningHtml('<script>alert("x")</script>\n\n第二段');
  assert.equal(html, '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</p><p>第二段</p>');
});

test('预设交稿标记前的代码示例不会吞掉实际正文', () => {
  const handoff = '您好，这是约定的稿件，请查收：';
  const planning = [
    `格式要求：以“${handoff}”开头，将故事放在 \`<content>\` 标签内。`,
    '排版示例：',
    `\`${handoff}\``,
    '`<content>`',
    '...',
    '`</content>`',
  ].join('\n');
  const body = '暖室之内灯火微明。\n\n他收回搭在腕上的手，询问来路。';
  const parsed = parseMessageContent(
    `${planning}${handoff}\n<content>\n${body}\n</content>\n<visual_cards>[]</visual_cards>`,
  );
  assert.equal(parsed.narrative, body);
  assert.equal(parsed.reasoning?.text, planning);
  assert.equal(parsed.reasoning?.source, `${planning}${handoff}`);
  assert.equal(parsed.reasoning?.isComplete, true);
});

test('没有交稿标记时也跳过行内和代码块中的正文标签示例', () => {
  const parsed = parseMessageContent(
    [
      '格式为 `<content>`，而不是正文。',
      '```xml\n<content>示例正文</content>\n```',
      '<content>真正的正文。</content>',
    ].join('\n'),
  );
  assert.equal(parsed.narrative, '真正的正文。');
});

test('孤立 think 结束标签后的交稿标记保留在美化源中，防止草稿漏到折叠外', () => {
  const handoff = '您好，这是约定的稿件，请查收：';
  const draft = `格式要求：以“${handoff}”开始。\n草稿：她推开门。\n故事在警告中结束。`;
  const parsed = parseMessageContent(`${draft}\n</think>\n${handoff}\n<content>正式正文。</content>`);
  assert.equal(parsed.narrative, '正式正文。');
  assert.equal(parsed.reasoning?.text, draft);
  assert.equal(parsed.reasoning?.source, `${draft}\n</think>\n${handoff}`);
});

test('planning 标签及缺失开标签的 planning 均能与正文分离', () => {
  for (const opening of ['<planning>', '']) {
    const parsed = parseMessageContent(`${opening}安排下一幕。</planning>\n<content>她推开门。</content>`);
    assert.equal(parsed.narrative, '她推开门。');
    assert.equal(parsed.reasoning?.text, '安排下一幕。');
  }
});

test('konatan 预设的思考标签及缺失开标签均能折叠，保留无标签正文', () => {
  const body = '她收起信笺，推开临街的窗。\n\n“天亮了，我们走吧。”';
  for (const tag of ['konatan_planning~', 'konatan_planning']) {
    for (const opening of [`<${tag}>`, '']) {
      const parsed = parseMessageContent(`${opening}核对场景，安排下一幕。</${tag}>\n${body}`);
      assert.equal(parsed.narrative, body);
      assert.equal(parsed.dialogue.dialogue, body);
      assert.equal(parsed.reasoning?.text, '核对场景，安排下一幕。');
      assert.equal(parsed.reasoning?.source, `${opening}核对场景，安排下一幕。</${tag}>`);
      assert.equal(parsed.reasoning?.isComplete, true);
    }
  }
});

test('konatan 辅助块与正文分离，保留思考、行动选项和变量更新数据', () => {
  const reasoning = '格式说明提到 <current_event>、<progress> 和 <visual_cards>，继续核对剧情。';
  const body = '她收起信笺，推开临街的窗。\n\n街上传来第一声叫卖。';
  const operations = [{ op: 'replace', path: '/当前处境', value: '已到街口' }];
  const raw = [
    `<konatan_planning~>${reasoning}</konatan_planning~>`,
    '<tucao>本回写作备忘。</tucao>',
    body,
    '<current_event>街口相逢。</current_event>',
    '<progress>主线继续。</progress>',
    '<visual_cards>[]</visual_cards>',
    '<advice>留意来客。</advice>',
    '<branches>A. 去街口看看\nB. 留在窗边</branches>',
    `<UpdateVariable><Analyze>位置更新。</Analyze><JSONPatch>${JSON.stringify(operations)}</JSONPatch></UpdateVariable>`,
    '<StatusPlaceHolderImpl/>',
  ].join('\n');
  const parsed = parseMessageContent(raw);
  assert.equal(parsed.narrative, body);
  assert.equal(parsed.dialogue.dialogue, body);
  assert.equal(parsed.reasoning?.text, reasoning);
  assert.deepEqual(parsed.choices, [
    { letter: 'A', text: '去街口看看' },
    { letter: 'B', text: '留在窗边' },
  ]);
  assert.deepEqual(extractVariableUpdateDiagnostics(raw)?.operations, operations);
});

test('konatan 流式思考与辅助块未闭合时保持正文干净，交接后逐步显示正文', () => {
  const opening = '<konatan_planning~>核对人物与场景。';
  const closing = '</konatan_planning~>';
  const commentary = '<tucao>本回写作备忘。';
  for (const [suffix, expected, complete] of [
    ['', '', false],
    [closing, '', true],
    [closing + commentary, '', true],
    [closing + commentary + '</tucao>她', '她', true],
    [closing + commentary + '</tucao>她推开门。<current_event>事件结算中', '她推开门。', true],
  ] as const) {
    const parsed = parseMessageContent(opening + suffix);
    assert.equal(parsed.narrative, expected);
    assert.equal(parsed.reasoning?.text, '核对人物与场景。');
    assert.equal(parsed.reasoning?.isComplete, complete);
  }
});

test('未闭合思考里的正文标签示例不会提前显示为正文', () => {
  const reasoning = '准备使用 `<content>` 标签，继续构思。';
  const parsed = parseMessageContent(`<thinking>${reasoning}`);
  assert.equal(parsed.narrative, '');
  assert.equal(parsed.reasoning?.text, reasoning);
  assert.equal(parsed.reasoning?.isComplete, false);
});

test('交稿后流式正文逐步出现且不会回到示例块', () => {
  const prefix = '格式为 `<content>`。\n您好，这是约定的稿件，请查收：';
  for (const [suffix, expected] of [
    ['', ''],
    ['\n<content>她', '她'],
    ['\n<content>她推开门。\n</content>', '她推开门。'],
  ]) {
    const parsed = parseMessageContent(prefix + suffix);
    assert.equal(parsed.narrative, expected);
    assert.equal(parsed.reasoning?.text, '格式为 `<content>`。');
  }
});

test('正文中的交稿短语不应被当作思考结束标记', () => {
  const body = '她说：“您好，这是约定的稿件，请查收：”\n递来一封信。';
  const parsed = parseMessageContent(`<content>${body}</content>`);
  assert.equal(parsed.narrative, body);
  assert.equal(parsed.reasoning, null);
});

test('MVU 普通消息与格式化输出转换后的摘要标签显示一致', () => {
  const summary = '灰白圆片入库；行踪深入石室；与晚棠约定探查石门。';
  const patch = [{ op: 'insert', path: '/本尊/背包/灰白圆片', value: { 数量: 1 } }];
  const parse = (tag: string) =>
    extractVariableUpdateDiagnostics(
      `<UpdateVariable><${tag}>${summary}</${tag}><JSONPatch>${JSON.stringify(patch)}</JSONPatch></UpdateVariable>`,
    );
  const normal = parse('Analysis');
  const formatted = parse('Analyze');
  assert.equal(formatted?.analysis, summary);
  assert.deepEqual(formatted, normal);
  assert.deepEqual(formatted?.operations, patch);
  assert.equal(formatted?.parseError, '');
  assert.equal(formatted?.isComplete, true);
});

test('未闭合的 Analyze 摘要在 JSONPatch 前停止，不吞入变量更新清单', () => {
  const parsed = extractVariableUpdateDiagnostics(
    '<UpdateVariable><analyze>行踪更新。<JSONPatch>[{"op":"replace","path":"/当前处境","value":"已进入石室"}]',
  );
  assert.equal(parsed?.analysis, '行踪更新。');
  assert.equal(parsed?.operations.length, 1);
  assert.equal(parsed?.isComplete, false);
});

test('未输出摘要时保留空摘要，不把正文或思考内容当作结算摘要', () => {
  const parsed = extractVariableUpdateDiagnostics(
    '<Analysis>正文前的思考内容</Analysis><正文>进入石室。</正文><UpdateVariable><JSONPatch>[]</JSONPatch></UpdateVariable>',
  );
  assert.equal(parsed?.analysis, '');
  assert.deepEqual(parsed?.operations, []);
  assert.equal(parsed?.isComplete, true);
});

let passed = 0;
for (const current of tests) {
  try {
    current.run();
    passed += 1;
    console.info(`✓ ${current.name}`);
  } catch (error) {
    console.error(`✗ ${current.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.info(`灯火通明消息解析专项校验通过：${passed}/${tests.length}`);
