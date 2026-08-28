/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const {
  extractInlineReasoning,
  formatReasoningHtml,
  hasReasoningFrontendBootstrap,
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
