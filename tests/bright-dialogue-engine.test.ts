/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const { parseDialogueGeneration } = require('../src/灯火通明-伪同层控制器/dialogue-engine');

const context = {
  mode: 'dialogue' as const,
  sessionId: 'test-session',
  targetName: '虞颜',
  canonicalName: '虞汐颜',
  channel: 'present' as const,
  anchorStoryMessageId: 8,
};

const parsePatches = (block: string) => {
  const body = block.match(/<JSONPatch>([\s\S]*?)<\/JSONPatch>/)?.[1] ?? '[]';
  return JSON.parse(body);
};

const restricted = parseDialogueGeneration(
  `<反应>她看了你一眼。</反应>
<正文>这件事，我会记住。</正文>
<会话状态>{"emotion":"克制","memoryEvents":[],"relationEvents":[{"kind":"positive","summary":"接受了一项重要承诺","favorDelta":1}]}</会话状态>
<visual_cards>[{"name":"未知人物","img_code":"forbidden","back_text":"不可失信。"}]</visual_cards>
<UpdateVariable><Analysis>测试</Analysis><JSONPatch>[
  {"op":"delta","path":"/红颜/虞汐颜/好感度","value":2},
  {"op":"delta","path":"/红颜/虞汐颜/好感度","value":1},
  {"op":"replace","path":"/红颜/虞汐颜/关系上下文/当前情绪","value":"克制"},
  {"op":"replace","path":"/红颜/虞汐颜/关系上下文/态度缘由","value":"记住了承诺"},
  {"op":"replace","path":"/红颜/虞汐颜/关系上下文/关系诉求","value":"第三项应被过滤"},
  {"op":"replace","path":"/本尊/行踪/当前位置","value":"越权地点"},
  {"op":"replace","path":"/红颜/白清弦/关系","value":"越权角色"}
]</JSONPatch></UpdateVariable>`,
  context,
  'test-operation',
);

assert.deepEqual(restricted.visualCard, {
  name: '虞颜',
  img_code: 'normal',
  back_text: '不可失信。',
});
assert.deepEqual(restricted.variableEffects, { favor: true, relationContext: true });
assert.equal(parsePatches(restricted.variableUpdateBlock).length, 3);
assert.deepEqual(
  parsePatches(restricted.variableUpdateBlock).map((patch: { path: string }) => patch.path),
  [
    '/红颜/虞汐颜/好感度',
    '/红颜/虞汐颜/关系上下文/当前情绪',
    '/红颜/虞汐颜/关系上下文/态度缘由',
  ],
);

const fallback = parseDialogueGeneration(
  `<反应></反应><正文>只是闲聊，不必多想。</正文><会话状态>{}</会话状态>
<visual_cards>坏掉的卡片</visual_cards>
<UpdateVariable><Analysis>无变化</Analysis><JSONPatch>[]</JSONPatch></UpdateVariable>`,
  { ...context, channel: 'transmission' },
  'fallback-operation',
);
assert.deepEqual(fallback.visualCard, { name: '虞颜', img_code: 'normal', back_text: '' });
assert.equal(fallback.reaction, '');
assert.equal(fallback.variableUpdateBlock, '');
assert.deepEqual(fallback.variableEffects, {});

const ordinaryGreeting = parseDialogueGeneration(
  `<反应>她轻轻颔首。</反应><正文>嗯，今日也安好。</正文>
<会话状态>{"memoryEvents":[],"relationEvents":[]}</会话状态>
<visual_cards>[{"name":"虞颜","img_code":"normal","back_text":"只是寻常问候。"}]</visual_cards>
<UpdateVariable><Analysis>不应因寒暄涨好感</Analysis><JSONPatch>[
  {"op":"delta","path":"/红颜/虞汐颜/好感度","value":1}
]</JSONPatch></UpdateVariable>`,
  context,
  'ordinary-operation',
);
assert.equal(ordinaryGreeting.variableUpdateBlock, '');
assert.deepEqual(ordinaryGreeting.variableEffects, {});

if (!process.exitCode) console.info('灯火通明幕间对话协议专项校验通过');
