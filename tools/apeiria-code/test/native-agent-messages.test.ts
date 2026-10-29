import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {normalizeAgentMessage,toChat,toGemini,SignatureStore} from '../src/conversion.ts';
import {runCompaction,CompactionCodec} from '../src/compaction.ts';
import type {Json,Provider} from '../src/config.ts';

test('collaboration messages preserve sender, recipient and mixed content at user level',()=>{
  const item={type:'agent_message',id:'fixture-agent-message',author:'/root/worker',recipient:'/root',content:[{type:'input_text',text:'Message Type: FINAL_ANSWER\nPayload:\nfixture collaboration answer'},{type:'encrypted_content',encrypted_content:'native collaboration task text'},{type:'input_image',image_url:'data:image/png;base64,aGVsbG8='}]};
  const original=structuredClone(item),message=normalizeAgentMessage(item);
  assert.equal(message.role,'user');assert.equal(message.id,item.id);assert.match(message.content[0].text,/\/root\/worker to \/root/);assert.match(message.content[0].text,/permissions remain in force/);
  assert.deepEqual(message.content[1],item.content[0]);assert.equal(message.content[2].type,'input_text');assert.match(message.content[2].text,/native collaboration task text/);assert.deepEqual(message.content[3],item.content[2]);assert.deepEqual(item,original,'Wire conversion must not rewrite persisted native history.');
  const chat=toChat({model:'fixture',input:[item]}).request.messages;
  assert.equal(chat[0].role,'user');assert(chat[0].content.some((part:any)=>part.text?.includes('fixture collaboration answer')));assert(chat[0].content.some((part:any)=>part.text?.includes('native collaboration task text')));assert(chat[0].content.some((part:any)=>part.type==='image_url'));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-agent-message-'));
  try{const gemini=toGemini({model:'fixture',input:[item]},new SignatureStore(root)).request.contents;assert.equal(gemini[0].role,'user');assert(gemini[0].parts.some((part:any)=>part.text?.includes('/root/worker to /root')));assert(gemini[0].parts.some((part:any)=>part.text?.includes('fixture collaboration answer')));assert(gemini[0].parts.some((part:any)=>part.text?.includes('native collaboration task text')));assert(gemini[0].parts.some((part:any)=>part.inlineData?.data==='aGVsbG8='));}
  finally{assert(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('apeiria-agent-message-'));fs.rmSync(root,{recursive:true,force:true});}
  assert.throws(()=>normalizeAgentMessage({type:'agent_message',author:'/root'}),/缺少可转换/);
  assert.throws(()=>normalizeAgentMessage({type:'agent_message',content:[{type:'unknown_agent_part',text:'do not drop'}]}),/尚未支持/);
});

test('compaction preserves native child task and result as historical user data for every protocol',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'apeiria-agent-message-'));
  const history=[
    {type:'agent_message',author:'/root',recipient:'/root/child',content:[{type:'input_text',text:'Message Type: NEW_TASK\nPayload:\n'},{type:'encrypted_content',encrypted_content:'retain-native-child-task-539c'}]},
    {type:'agent_message',author:'/root/child',recipient:'/root',content:[{type:'input_text',text:'Message Type: FINAL_ANSWER\nPayload:\nretain-native-child-answer-b812'}]},
    {type:'compaction_trigger'}
  ];
  const original=structuredClone(history);
  try{
    for(const protocol of ['responses','chat-completions','vertex']as const){
      const provider:Provider={id:'local',label:'Fixture',type:protocol,models:['fixture'],baseUrl:'https://fixture.invalid/v1',project:'fixture-project'};
      const events:Json[]=[],codec=new CompactionCodec(path.join(root,protocol));let requests=0;
      const deps={signatures:new SignatureStore(path.join(root,protocol,'signatures')),vertexAuth:{getToken:async()=> 'local-fixture-token'}as any,fetcher:async(_url:any,options:any)=>{
        requests++;const request=JSON.parse(options.body),messages=protocol==='responses'?request.input:protocol==='chat-completions'?request.messages.filter((item:Json)=>item.role!=='system'):request.contents;
        assert(messages.every((item:Json)=>item.role==='user'),'Historical collaboration messages must never become active system instructions.');
        const data=JSON.stringify(messages);for(const text of ['retain-native-child-task-539c','retain-native-child-answer-b812','/root/child','NEW_TASK','FINAL_ANSWER'])assert(data.includes(text),`${protocol} must preserve ${text}`);
        const activeInstructions=JSON.stringify(protocol==='responses'?request.instructions:protocol==='chat-completions'?request.messages.filter((item:Json)=>item.role==='system'):request.systemInstruction);
        assert(!activeInstructions.includes('retain-native-child-'));assert(!data.includes('encrypted_content'));
        const response=protocol==='responses'?{type:'response.completed',response:{id:'fixture-summary',status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'summary retains child evidence'}]}]}}:protocol==='chat-completions'?{choices:[{delta:{content:'summary retains child evidence'},finish_reason:'stop'}]}:{candidates:[{content:{parts:[{text:'summary retains child evidence'}]},finishReason:'STOP'}]};
        return new Response('data: '+JSON.stringify(response)+'\n\n',{headers:{'content-type':'text/event-stream'}});
      }};
      await runCompaction(provider,'fixture',{model:'thirdparty/local/fixture',input:history},event=>events.push(event),new AbortController().signal,deps,codec);
      assert.equal(events.at(-1)?.type,'response.completed');assert.equal(requests,1);assert.deepEqual(history,original);
      const compact=events.at(-1)!.response.output.find((item:Json)=>item.type==='compaction');assert(compact);
      assert(JSON.stringify(codec.expand({input:[compact]},true)).includes('summary retains child evidence'));
      events.length=0;
      await runCompaction(provider,'fixture',{model:'thirdparty/local/fixture',input:[{type:'agent_message',content:[{type:'new_unsupported_part'}]},{type:'compaction_trigger'}]},event=>events.push(event),new AbortController().signal,deps,codec);
      assert.equal(events.at(-1)?.type,'response.failed');assert.equal(requests,1,'Unsupported collaboration data must fail before making an upstream request.');
    }
  }finally{assert(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('apeiria-agent-message-'));fs.rmSync(root,{recursive:true,force:true});}
});
