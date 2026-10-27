import type {Json,Provider} from './config.ts';
import {VertexAuth} from './auth.ts';
import {request} from './network.ts';
import {sseEvents} from './sse.ts';
import {ResponseEmitter,SignatureStore,toGemini} from './conversion.ts';
import {applyReasoning} from './reasoning.ts';
import {VertexFailure,googleFailure,readGoogleFailure,retryDelay,networkFailure,abortableDelay} from './vertex-errors.ts';

export interface VertexDiagnostic {model:string;attempt:number;status:number;googleStatus:string;retryInMs:number|null;fields:string[];detail:string;partial:boolean;}
export interface VertexDependencies {
  fetcher?:typeof request;vertexAuth?:VertexAuth;signatures:SignatureStore;
  sleep?:(ms:number,signal:AbortSignal)=>Promise<void>;random?:()=>number;
  headerTimeoutMs?:number;idleTimeoutMs?:number;
  requireComplete?:boolean;
  persistTurn?:boolean;
  onDiagnostic?:(diagnostic:VertexDiagnostic)=>void;
}
export function vertexUrl(provider:Provider,model:string):string{
  const location=provider.location||'global',host=location==='global'?'aiplatform.googleapis.com':`${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${encodeURIComponent(provider.project!)}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
}
export function vertexScope(provider:Provider,model:string){return `${provider.id}/${provider.project}/${provider.location||'global'}/${model}`;}
export async function runVertex(provider:Provider,model:string,body:Json,emitter:ResponseEmitter,signal:AbortSignal,deps:VertexDependencies){
  const limit=provider.modelMetadata?.[model]?.maxOutputTokens;
  const scope=vertexScope(provider,model),converted=toGemini(limit?{...body,max_output_tokens:Math.min(body.max_output_tokens||limit,limit)}:body,deps.signatures,scope);
  applyReasoning(provider,model,body,converted.request);
  const fetcher=deps.fetcher||request,auth=deps.vertexAuth||new VertexAuth(fetcher),sleep=deps.sleep||abortableDelay;
  const payload=JSON.stringify(converted.request);
  let retries=0,attempts=0,refreshed=false;
  while(true){
    signal.throwIfAborted();attempts++;
    const controller=new AbortController(),linked=AbortSignal.any([signal,controller.signal]);
    let timer:ReturnType<typeof setTimeout>|undefined,partial=false,token='';
    const watch=(ms:number)=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new DOMException('Vertex response timeout','TimeoutError')),ms);timer.unref();};
    try{
      watch(deps.headerTimeoutMs??300000);
      token=await auth.getToken(provider,linked);
      const response=await fetcher(vertexUrl(provider,model),{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:payload,signal:linked});
      if(!response.ok){
        // Keep the watchdog active while reading bounded error bodies.
        const failure=await readGoogleFailure(response,[token,provider.project||'']);
        if(failure.status===401&&!refreshed){auth.invalidate(provider);refreshed=true;continue;}
        throw failure;
      }
      // Thinking may delay the first byte after HTTP headers. Heartbeats count
      // as activity too; use a shorter idle deadline only after bytes arrive.
      watch(deps.headerTimeoutMs??300000);
      let usage:Json|undefined,received=false,finished=false;
      const parts:Json[]=[];
      const monitored={async *[Symbol.asyncIterator](){for await(const chunk of response.body){watch(deps.idleTimeoutMs??120000);yield chunk;}}};
      for await(const event of sseEvents(monitored)){
        if(event.error)throw googleFailure(event,Number(event.error.code)||500,undefined,[token,provider.project||'']);
        if(event.promptFeedback?.blockReason)throw new VertexFailure(400,'PROMPT_BLOCKED',String(event.promptFeedback.blockReason));
        const candidate=event.candidates?.[0];
        for(const part of candidate?.content?.parts||[]){
          // Once any model content arrives (including thinking), never replay the
          // generation automatically: it may already be billed or expose a tool.
          partial=true;parts.push(part);
          if(typeof part.text==='string'&&part.thought&&part.text)emitter.reasoning(part.text);
          if(typeof part.text==='string'&&!part.thought&&part.text){emitter.text(part.text);received=true;}
          if(part.functionCall){const binding=converted.tools.find(t=>t.wireName===part.functionCall.name);if(!binding)throw new VertexFailure(400,'UNKNOWN_TOOL','Google 返回了未声明的工具名称。');emitter.tool(binding,part.functionCall.args||{},deps.signatures,part,scope);received=true;}
        }
        if(candidate?.finishReason){
          if(deps.requireComplete&&candidate.finishReason==='MAX_TOKENS')throw new VertexFailure(400,'SUMMARY_TRUNCATED','摘要达到输出上限，未替换原会话。');
          if(!['STOP','MAX_TOKENS','FINISH_REASON_UNSPECIFIED'].includes(candidate.finishReason))throw new VertexFailure(400,String(candidate.finishReason),'Google 提前停止生成。');
          finished=candidate.finishReason!=='FINISH_REASON_UNSPECIFIED';
        }
        if(event.usageMetadata)usage={input_tokens:event.usageMetadata.promptTokenCount||0,output_tokens:(event.usageMetadata.candidatesTokenCount||0)+(event.usageMetadata.thoughtsTokenCount||0),total_tokens:event.usageMetadata.totalTokenCount||0,input_tokens_details:{cached_tokens:event.usageMetadata.cachedContentTokenCount||0},output_tokens_details:{reasoning_tokens:event.usageMetadata.thoughtsTokenCount||0}};
      }
      if(!finished)throw new VertexFailure(503,'STREAM_INCOMPLETE','Google 流未正常结束，已收到的内容不会自动重放。');
      if(!received)throw new VertexFailure(503,'EMPTY_RESPONSE','Google 没有返回文本或工具调用。');
      if(deps.persistTurn!==false)deps.signatures.setTurn(emitter.id,scope,parts,emitter.output);
      emitter.finish(usage);return;
    }catch(error){
      if(signal.aborted)throw signal.reason;
      const failure=error instanceof VertexFailure?error:error instanceof SyntaxError?new VertexFailure(503,'INVALID_STREAM','Google 返回了不完整的流数据。'):networkFailure(controller.signal.aborted?controller.signal.reason:error);
      if(!failure)throw error;
      const delay=retryDelay(retries,failure,deps.random?.()??Math.random());
      const retry=failure.retryable&&!partial&&retries<2&&delay<=30000;
      try{deps.onDiagnostic?.({model:body.model,attempt:attempts,status:failure.status,googleStatus:failure.googleStatus,fields:failure.fields,detail:failure.detail,retryInMs:retry?delay:null,partial});}catch{}
      if(!retry)throw new Error(failure.display(attempts));
      retries++;
      clearTimeout(timer);controller.abort();
      await sleep(delay,signal);
    }finally{clearTimeout(timer);controller.abort();}
  }
}

