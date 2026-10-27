import type {Json,Provider} from './config.ts';

import {request} from './network.ts';
import {sseEvents} from './sse.ts';
import {ResponseEmitter,toChat} from './conversion.ts';
import {runVertex} from './vertex.ts';
import type {VertexDependencies} from './vertex.ts';
export {vertexUrl} from './vertex.ts';
import {applyReasoning} from './reasoning.ts';

export interface AdapterDependencies extends VertexDependencies {getKey?:(p:Provider)=>string;}
export async function runAdapter(provider:Provider,model:string,body:Json,send:(event:Json)=>void,signal:AbortSignal,deps:AdapterDependencies):Promise<void> {
  const emitter=new ResponseEmitter(body.model,send);
  const fetcher=deps.fetcher || request;
  if(provider.type!=='responses')emitter.start();
  try {
    if(provider.type==='vertex'){
      await runVertex(provider,model,body,emitter,signal,deps);
    } else {
      const key=deps.getKey?.(provider) || '';
      const headers:Record<string,string>={'content-type':'application/json'};
      if(key)headers.authorization=`Bearer ${key}`;
      const url=provider.baseUrl!.replace(/\/$/,'')+(provider.type==='responses'?'/responses':'/chat/completions');
      const converted=provider.type==='chat-completions'?toChat({...body,model}):null;
      const upstream=converted?.request || {...body,model,stream:true,store:false};
      applyReasoning(provider,model,body,upstream);
      delete upstream.previous_response_id;delete upstream.type;delete upstream.generate;
      const response=await fetcher(url,{method:'POST',headers,body:JSON.stringify(upstream),signal});
      if(!response.ok){await response.body?.cancel?.();throw new Error(`第三方渠道请求失败（HTTP ${response.status}）。请检查该渠道地址、密钥及模型名称。GPT 登录保持不变。`);}
      if(provider.type==='responses'){
        // This endpoint uses the native Responses wire format. Forward all item/tool events.
        let terminal=false;
        for await(const event of sseEvents(response.body)){
          if(event.type==='error' || event.type==='response.failed'){
            emitter.fail('第三方 Responses 渠道失败：'+(event.response?.error?.message || event.error?.message || '请检查该渠道配置。'));
            terminal=true;break;
          }
          if(event.response?.model)event.response.model=body.model;
          send(event);
          if(['response.completed','response.failed','response.incomplete'].includes(event.type))terminal=true;
        }
        if(!terminal)throw new Error('第三方 Responses 流未正常结束。');
      }else{
        const calls=new Map<number,Json>();let usage:Json|undefined;let finished=false;
        for await(const event of sseEvents(response.body)){
          if(event.error)throw new Error('第三方渠道返回错误，请检查渠道配置。');
          const choice=event.choices?.[0];
          if(choice?.delta?.content)emitter.text(choice.delta.content);
          for(const call of choice?.delta?.tool_calls || []){
            const existing=calls.get(call.index)||{name:'',arguments:''};
            if(call.function?.name)existing.name+=call.function.name;
            if(call.function?.arguments)existing.arguments+=call.function.arguments;
            calls.set(call.index,existing);
          }
          if(choice?.finish_reason){if(deps.requireComplete&&choice.finish_reason!=='stop')throw Error('摘要未完整生成，原会话保留。');finished=true;}
          if(event.usage)usage={input_tokens:event.usage.prompt_tokens||0,output_tokens:event.usage.completion_tokens||0,total_tokens:event.usage.total_tokens||0,input_tokens_details:{cached_tokens:event.usage.prompt_tokens_details?.cached_tokens||0},output_tokens_details:{reasoning_tokens:event.usage.completion_tokens_details?.reasoning_tokens||0}};
        }
        for(const call of calls.values()){
          const binding=converted!.tools.find(t=>t.wireName===call.name);
          if(!binding)throw new Error('第三方模型返回了未声明的工具名称。');
          emitter.tool(binding,JSON.parse(call.arguments || '{}'));
        }
        if(!finished)throw new Error('第三方聊天流未正常结束。');
        emitter.finish(usage);
      }
    }
  }catch(error){
    if(signal.aborted)return;
    // Third-party failures are response failures, never OpenAI HTTP 401 or account RPCs.
    emitter.fail(error instanceof Error ? error.message : '第三方渠道请求失败。');
  }
}
