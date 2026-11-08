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

console.info('额外解析请求检查通过：v4/原生格式化/工具调用、普通请求隔离、参数保留与重复处理。');
