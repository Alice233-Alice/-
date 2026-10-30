/* eslint-disable import-x/no-nodejs-modules -- 此文件只在 Node 测试进程中运行。 */
declare const require: (id: string) => any;
const assert = require('node:assert/strict');
import {
  EXTRA_ANALYSIS_REQUIREMENTS,
  prepareExtraAnalysisRequest,
  SUMMARY_DESCRIPTION,
  type ExtraAnalysisRequest,
} from '../src/灯火阑珊-变量结构/extra-analysis-prompt';

const englishDescription =
  'Write in ENGLISH. Compactly summarize the variable update decision without revealing variable contents.';
const mvuPrompt = `<must>紧急变量更新任务</must> Return exactly one JSON object: ${JSON.stringify({
  properties: { analysis: { type: 'string', description: englishDescription }, json_patch: { type: 'array' } },
})}`;

// v4 模式使用系统消息中的 schema；保留 JSON 模式、模型参数、正文和变量快照。
const v4: ExtraAnalysisRequest = {
  model: 'test-model',
  temperature: 1,
  max_tokens: 4096,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: '变量快照：背包为空。' },
    { role: 'assistant', content: '榆溯将灰白圆片收入怀中，随晚棠离开石室。' },
    { role: 'system', content: mvuPrompt },
    { role: 'user', content: '遵循<must>指令' },
  ],
};
const original = structuredClone(v4);
assert.equal(prepareExtraAnalysisRequest(v4, false), false);
assert.deepEqual(v4, original, '非额外解析期间不得修改请求');
assert.equal(prepareExtraAnalysisRequest(v4, true), true);
assert.deepEqual(v4.messages!.slice(0, 2), original.messages!.slice(0, 2));
assert.equal(String(v4.messages![2].content).includes('Write in ENGLISH'), false);
assert.equal(String(v4.messages![2].content).includes(SUMMARY_DESCRIPTION), true);
assert.deepEqual(v4.messages!.at(-1), { role: 'system', content: EXTRA_ANALYSIS_REQUIREMENTS });
assert.deepEqual({ ...v4, messages: undefined }, { ...original, messages: undefined }, '保持模型参数和输出编码不变');
const prepared = structuredClone(v4);
assert.equal(prepareExtraAnalysisRequest(v4, true), false);
assert.deepEqual(v4, prepared, '重复监听或重复处理不得累加提示词');

// 即使同时存在 MVU 请求，其他生成请求也不能受到影响。
const unrelated: ExtraAnalysisRequest = {
  messages: [{ role: 'system', content: 'Write in ENGLISH. 请分析这张图片。' }],
  json_schema: { name: 'other_analysis', value: { properties: { analysis: { description: englishDescription } } } },
};
const untouched = structuredClone(unrelated);
assert.equal(prepareExtraAnalysisRequest(unrelated, true), false);
assert.deepEqual(unrelated, untouched);

// 原生格式化输出修改 schema 副本，避免污染框架复用的 schema。
const schema = Object.freeze({
  name: 'mvu_json_patch',
  strict: false,
  value: Object.freeze({
    type: 'object',
    properties: Object.freeze({
      analysis: Object.freeze({ type: 'string', description: englishDescription }),
      json_patch: Object.freeze({ type: 'array', items: { type: 'object' } }),
    }),
    required: ['analysis', 'json_patch'],
  }),
});
const structured: ExtraAnalysisRequest = { messages: [], json_schema: schema };
assert.equal(prepareExtraAnalysisRequest(structured, true), true);
assert.equal((structured.json_schema as typeof schema).value.properties.analysis.description, SUMMARY_DESCRIPTION);
assert.equal(schema.value.properties.analysis.description, englishDescription);
assert.deepEqual(
  (structured.json_schema as typeof schema).value.properties.json_patch,
  schema.value.properties.json_patch,
);
assert.equal(prepareExtraAnalysisRequest(structured, true), false);

// 工具模式只改 MVU 工具的 analysis 说明，保留工具名、参数结构及其他工具。
const otherTool = { type: 'function', function: { name: 'another_tool', parameters: { type: 'object' } } };
const mvuTool = {
  type: 'function',
  function: {
    name: 'mvu_VariableUpdate_test',
    parameters: {
      type: 'object',
      properties: {
        analysis: { type: 'string', description: 'Write in ENGLISH. Output Y/N for each variable.' },
        delta: { type: 'string' },
      },
      required: ['delta'],
    },
  },
};
const toolRequest: ExtraAnalysisRequest = { messages: [], tools: [otherTool, mvuTool], tool_choice: 'required' };
assert.equal(prepareExtraAnalysisRequest(toolRequest, true), true);
assert.equal(toolRequest.tools![0], otherTool);
assert.equal(
  (toolRequest.tools![1] as typeof mvuTool).function.parameters.properties.analysis.description,
  SUMMARY_DESCRIPTION,
);
assert.equal(mvuTool.function.parameters.properties.analysis.description.startsWith('Write in ENGLISH'), true);
assert.equal(toolRequest.tool_choice, 'required');
assert.equal(prepareExtraAnalysisRequest(toolRequest, true), false);

// 取自实际加载的 MVU 框架；包括退格字符、引用剧情标签的 reference 和旧 XML 格式。
const { tail: frameworkTail, must: frameworkMust } = require('./fixtures/mvu-extra-analysis-framework.json') as {
  tail: string;
  must: string;
};
const formattedInstruction = 'You are in formatted-output mode. Do not output <UpdateVariable> tags.';
const oldXmlInstruction = '$(除了<UpdateVariable>块外不输出任何内容)';

function checkIdempotent(request: ExtraAnalysisRequest): void {
  const prepared = structuredClone(request);
  assert.equal(prepareExtraAnalysisRequest(request, true), false);
  assert.deepEqual(request, prepared);
}

// 酒馆助手发出事件时，框架边界标签与尾缀可以是独立消息；正文中相同的文本必须保持原样。
const separated: ExtraAnalysisRequest = {
  model: 'another-model',
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: '<additional_information>' },
    { role: 'system', content: `世界书中的原文示例：${frameworkMust}\n${frameworkTail}` },
    { role: 'system', content: '</additional_information>' },
    { role: 'system', content: '<past_observe>' },
    { role: 'system', content: `更新前变量和正文中的原文：${frameworkMust}\n${frameworkTail}` },
    { role: 'assistant', content: frameworkTail },
    { role: 'user', content: frameworkMust },
    { role: 'system', content: '</past_observe>' },
    { role: 'system', content: `${frameworkMust}\n${formattedInstruction}` },
    { role: 'user', content: '遵循<must>指令' },
    { role: 'system', content: frameworkTail },
  ],
};
const beforeSeparated = structuredClone(separated);
assert.equal(prepareExtraAnalysisRequest(separated, false), false);
assert.deepEqual(separated, beforeSeparated);
assert.equal(prepareExtraAnalysisRequest(separated, true), true);
assert.deepEqual(separated.messages!.slice(0, 8), beforeSeparated.messages!.slice(0, 8));
assert.equal(separated.messages!.length, 11, '尾缀消息被移除，追加一条结算要求');
assert.equal(String(separated.messages![8].content).includes(oldXmlInstruction), false);
assert.equal(
  String(separated.messages![8].content).includes('只返回一个包含 analysis 与 json_patch 的 JSON 对象'),
  true,
);
assert.equal(String(separated.messages![8].content).includes('分析经过这段剧情后，变量会发生什么变化'), true);
assert.deepEqual(separated.messages![9], beforeSeparated.messages![9]);
assert.deepEqual(separated.messages!.at(-1), { role: 'system', content: EXTRA_ANALYSIS_REQUIREMENTS });
assert.deepEqual({ ...separated, messages: undefined }, { ...beforeSeparated, messages: undefined });
checkIdempotent(separated);

// 合并为一条系统消息时，仅处理剧情块外的框架指令，尾缀之后的内容也必须保留。
const protectedText = `<additional_information>${frameworkMust}\n${frameworkTail}</additional_information>\n<past_observe>背包为空；正文引用：${frameworkTail}</past_observe>`;
const merged: ExtraAnalysisRequest = {
  messages: [
    {
      role: 'system',
      content: `${protectedText}\n${frameworkMust}\n${formattedInstruction}\n${frameworkTail}尾缀后的其他有效指令`,
    },
  ],
};
assert.equal(prepareExtraAnalysisRequest(merged, true), true);
const mergedText = String(merged.messages![0].content);
assert.equal(mergedText.startsWith(protectedText), true);
assert.equal(mergedText.slice(protectedText.length).includes('STATEMENT REJECTED'), false);
assert.equal(mergedText.slice(protectedText.length).includes(oldXmlInstruction), false);
assert.equal(mergedText.endsWith('尾缀后的其他有效指令'), true);
checkIdempotent(merged);

// 原生结构化模式和工具模式各用自己的输出要求，不改变工具的 delta 参数结构。
const nativeWithTail: ExtraAnalysisRequest = {
  json_schema: schema,
  messages: [
    { role: 'system', content: frameworkMust },
    { role: 'system', content: frameworkTail },
  ],
};
prepareExtraAnalysisRequest(nativeWithTail, true);
assert.equal(String(nativeWithTail.messages![0].content).includes(oldXmlInstruction), false);
assert.equal(String(nativeWithTail.messages![0].content).includes('JSON 对象'), true);
assert.equal(nativeWithTail.messages!.length, 2);
checkIdempotent(nativeWithTail);

const toolWithTail: ExtraAnalysisRequest = {
  tools: [mvuTool],
  tool_choice: 'required',
  messages: [
    { role: 'system', content: `${frameworkMust}\nuse mvu_VariableUpdate_test tool to update variables.` },
    { role: 'system', content: frameworkTail },
  ],
};
prepareExtraAnalysisRequest(toolWithTail, true);
assert.equal(String(toolWithTail.messages![0].content).includes(oldXmlInstruction), false);
assert.equal(String(toolWithTail.messages![0].content).includes('按工具参数结构提交更新'), true);
assert.equal(String(toolWithTail.messages![0].content).includes('use mvu_VariableUpdate_test tool'), true);
assert.deepEqual((toolWithTail.tools![0] as typeof mvuTool).function.parameters.properties.delta, { type: 'string' });
assert.equal(toolWithTail.tool_choice, 'required');
checkIdempotent(toolWithTail);

// 普通聊天仍然使用 XML；兼容 CRLF，同时不能按零散关键词删除未知提示。
for (const newline of ['\n', '\r\n']) {
  const chat: ExtraAnalysisRequest = {
    messages: [
      { role: 'system', content: frameworkMust.replaceAll('\n', newline) },
      { role: 'system', content: frameworkTail.replaceAll('\n', newline) },
      { role: 'system', content: '其他提示包含 <!-- TEST START --> 或 STATEMENT REJECTED 字样。' },
      { role: 'system', content: [{ type: 'text', text: frameworkTail }] },
    ],
  };
  const preserved = structuredClone(chat.messages!);
  prepareExtraAnalysisRequest(chat, true);
  assert.deepEqual(chat.messages![0], preserved[0]);
  assert.deepEqual(chat.messages!.slice(1, 3), preserved.slice(2));
  checkIdempotent(chat);

  const jsonWithCrLf: ExtraAnalysisRequest = {
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: `${frameworkMust}\n${frameworkTail}`.replaceAll('\n', newline) }],
  };
  prepareExtraAnalysisRequest(jsonWithCrLf, true);
  assert.equal(String(jsonWithCrLf.messages![0].content).includes(oldXmlInstruction), false);
  assert.equal(String(jsonWithCrLf.messages![0].content).includes('STATEMENT REJECTED'), false);
  checkIdempotent(jsonWithCrLf);
}

const unrelatedWithTail: ExtraAnalysisRequest = { messages: [{ role: 'system', content: frameworkTail }] };
const untouchedTail = structuredClone(unrelatedWithTail);
assert.equal(prepareExtraAnalysisRequest(unrelatedWithTail, true), false);
assert.deepEqual(unrelatedWithTail, untouchedTail);

console.info('额外解析请求检查通过：各应答模式、固定尾缀清理、剧情与变量保护、普通请求隔离、参数保留与重复处理。');
