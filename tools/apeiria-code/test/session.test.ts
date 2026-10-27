import test from 'node:test';
import assert from 'node:assert/strict';
import {reduceEvent,transcript} from '../src/session.ts';
import {beforeFromDiff} from '../src/diff.ts';
import type {ChatItem} from '../src/types.ts';
test('streamed item content survives empty completed payload and command deltas',()=>{
 const items:ChatItem[]=[];
 reduceEvent(items,'item/started',{item:{id:'a',type:'agentMessage',text:''}});
 reduceEvent(items,'item/agentMessage/delta',{itemId:'a',delta:'你好'});
 reduceEvent(items,'item/completed',{item:{id:'a',type:'agentMessage',text:''}});
 reduceEvent(items,'item/commandExecution/outputDelta',{itemId:'c',delta:'terminal output'});
 assert.equal(items[0].text,'你好');assert.equal(items[1].type,'commandExecution');assert.match(transcript(items),/terminal output/);
});
test('unified patch recovers before text without changing the workspace',()=>{
 assert.equal(beforeFromDiff('a\nc\nd\n','@@ -1,3 +1,3 @@\n a\n-b\n+c\n d\n'),'a\nb\nd\n');
 assert.equal(beforeFromDiff('a\nb\nx\n','@@ -2,0 +3,1 @@\n+x\n'),'a\nb\n');
 assert.equal(beforeFromDiff('abc','unparseable'),null);
});
