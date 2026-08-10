/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;

const assert = require('node:assert/strict');
const { segmentNarrativeDialogueText } = require('../src/灯火通明/narrative-typography');

type Segment = { text: string; dialogue: boolean };

const compact = (segments: Segment[]) => segments.map(segment => [segment.text, segment.dialogue]);

{
  const state: string[] = [];
  assert.deepEqual(compact(segmentNarrativeDialogueText('风过长廊，“随我来。”灯影微晃。', state)), [
    ['风过长廊，', false],
    ['“随我来。”', true],
    ['灯影微晃。', false],
  ]);
  assert.deepEqual(state, []);
}

{
  const state: string[] = [];
  assert.deepEqual(compact(segmentNarrativeDialogueText('她道：「且听『山海有灵』这一句。」随后落座。', state)), [
    ['她道：', false],
    ['「且听『山海有灵』这一句。」', true],
    ['随后落座。', false],
  ]);
  assert.deepEqual(state, []);
}

{
  const state: string[] = [];
  assert.deepEqual(compact(segmentNarrativeDialogueText('旁白“跨节点', state)), [
    ['旁白', false],
    ['“跨节点', true],
  ]);
  assert.deepEqual(compact(segmentNarrativeDialogueText('强调内容', state)), [['强调内容', true]]);
  assert.deepEqual(compact(segmentNarrativeDialogueText('后半句”回到旁白', state)), [
    ['后半句”', true],
    ['回到旁白', false],
  ]);
  assert.deepEqual(state, []);
}

{
  const state: string[] = [];
  assert.deepEqual(compact(segmentNarrativeDialogueText('孤立闭引号”与 "English"、《山海经》', state)), [
    ['孤立闭引号”与 "English"、《山海经》', false],
  ]);
  assert.deepEqual(state, []);
}

{
  const state: string[] = [];
  assert.deepEqual(compact(segmentNarrativeDialogueText('流式旁白「尚未说完', state)), [
    ['流式旁白', false],
    ['「尚未说完', true],
  ]);
  assert.deepEqual(state, ['」']);
}

console.info('lantern narrative dialogue tests passed');
