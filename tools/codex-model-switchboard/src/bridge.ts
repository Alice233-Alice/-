import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {Readable,Transform,pipeline} from 'node:stream';
import {WebSocket,WebSocketServer} from 'ws';
import type {Json,Settings,Provider} from './config.ts';
import {readSettings,dataRoot,resolveModel,modelInfos} from './config.ts';
import {request,websocketOptions} from './network.ts';
import {VertexAuth,providerKey} from './auth.ts';
import {SignatureStore} from './conversion.ts';
import {runAdapter} from './adapters.ts';
import path from 'node:path';
import {usageAttempt,usageSse,saveQuotas,saveProviderQuota} from './usage.ts';
import {recordVertexDiagnostic} from './diagnostics.ts';
import {CompactionCodec,isCompaction,runCompaction} from './compaction.ts';

export interface BridgeOptions {root?:string; launcher:string; upstream?:string; fetcher?:typeof request; vertexAuth?:VertexAuth; getKey?:(p:Provider)=>string; catalog?:Json;}
function upstreamHeaders(input:http.IncomingHttpHeaders):Record<string,string>{
  const result:Record<string,string>={};
  for(const [key,value] of Object.entries(input))if(value!=null && !['host','connection','upgrade','content-length','accept-encoding','sec-websocket-key','sec-websocket-version','sec-websocket-extensions','sec-websocket-protocol'].includes(key))result[key]=Array.isArray(value)?value.join(','):value;
  return result;
}
function failure(send:(e:Json)=>void,message:string){send({type:'error',status:400,error:{type:'invalid_request_error',code:'third_party_error',message}});}
export async function createBridge(options:BridgeOptions):Promise<{url:string;close:()=>Promise<void>}> {
  const root=options.root || dataRoot(), nonce=crypto.randomBytes(24).toString('hex');
  // A gateway base URL must not look like the first-party backend route: otherwise
  // workspace routing discovery may replace the local route or reject a fixture.
  const prefix=`/${nonce}/v1`;
  const upstream=(options.upstream || 'https://chatgpt.com/backend-api/codex').replace(/\/$/,'');
  const fetcher=options.fetcher || request;
  const compactions=new CompactionCodec(options.launcher);
  const run=(provider:Provider,model:string,body:Json,send:(e:Json)=>void,signal:AbortSignal)=>isCompaction(body)?runCompaction(provider,model,body,send,signal,meteredDeps(body.model),compactions):runAdapter(provider,model,body,send,signal,meteredDeps(body.model));
  const resolve=(model:string)=>model.startsWith('thirdparty/') ? resolveModel(model,readSettings(root)) : null;
  const deps={fetcher,vertexAuth:options.vertexAuth || new VertexAuth(fetcher),getKey:options.getKey || ((p:Provider)=>providerKey(p,options.launcher)),signatures:new SignatureStore(path.join(root,'vertex-signatures')),onDiagnostic:(record:Parameters<typeof recordVertexDiagnostic>[0])=>recordVertexDiagnostic(record,root)};
  const meteredDeps=(model:string)=>({...deps,fetcher:async(...args:Parameters<typeof request>)=>{const response=await fetcher(...args);saveProviderQuota(model,response.headers,root);return response;}});
  const server=http.createServer();
  const wss=new WebSocketServer({noServer:true,maxPayload:64*1024*1024});
  const controllers=new Set<AbortController>();
  server.on('request',async(req,res)=>{
    if(!req.url?.startsWith(prefix+'/') || !['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')){res.writeHead(404).end();return;}
    const suffix=req.url.slice(prefix.length);
    const controller=new AbortController();controllers.add(controller);
    let meter:ReturnType<typeof usageAttempt>|undefined;
    res.on('close',()=>{meter?.finish('interrupted');controller.abort();controllers.delete(controller);});
    try{
      const headers=upstreamHeaders(req.headers);
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>64*1024*1024)throw new Error('模型请求过大。');chunks.push(chunk);}
      let raw=Buffer.concat(chunks);
      if(req.headers['content-encoding']==='gzip')raw=zlib.gunzipSync(raw);
      if(req.headers['content-encoding']==='br')raw=zlib.brotliDecompressSync(raw);
      if(req.headers['content-encoding']==='deflate')raw=zlib.inflateSync(raw);
      if(req.headers['content-encoding']==='zstd')raw=zlib.zstdDecompressSync(raw);
      if(raw.length)delete headers['content-encoding'];
      if(suffix.startsWith('/responses') && raw.length){
        let body=JSON.parse(raw.toString());
        const inference=/^\/responses\/?(?:\?|$)/.test(suffix)&&body.generate!==false&&typeof body.model==='string';
        const resolved=resolve(body.model || '');
        try{
          const expanded=compactions.expand(body,!!resolved);
          if(expanded!==body){body=expanded;delete body.previous_response_id;raw=Buffer.from(JSON.stringify(body));}
        }catch(error){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{type:'invalid_request_error',code:'third_party_error',message:(error as Error).message}}));return;}
        if(resolved){
          // Always HTTP 200 + response.failed for third-party auth errors: the OpenAI
          // auth manager must never mistake a Google/API-key failure for a bad GPT login.
          if(!/^\/responses\/?(?:\?|$)/.test(suffix)){
            res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{type:'invalid_request_error',code:'third_party_error',message:'该第三方模型暂不支持此专属端点（包括自动压缩）。可切回 GPT 官网处理；历史记录和登录未更改。'}}));return;
          }
          if(inference)meter=usageAttempt(body.model,root);
          const prologue:Json[]=[];
          const writeEvent=(event:Json)=>res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
          await run(resolved.provider,resolved.model,body,event=>{
            meter?.observe(event);
            if(res.writableEnded)return;
            if(!res.headersSent && ['response.created','response.in_progress'].includes(event.type)){prologue.push(event);return;}
            if(event.type==='response.failed' && !res.headersSent){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:{...event.response.error,type:'invalid_request_error'}}));return;}
            if(!res.headersSent){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});for(const initial of prologue)writeEvent(initial);}
            // Once streaming has begun, use Codex's terminal request-error code rather
            // than a retryable generic failure; the original provider error is retained.
            if(event.type==='response.failed')event.response.error={...event.response.error,provider_error_code:event.response.error.code,code:'invalid_prompt',type:'invalid_request_error'};
            writeEvent(event);
          },controller.signal);
          if(!res.writableEnded)res.end();return;
        }
        if(inference)meter=usageAttempt(body.model,root);
      }
      const response=options.catalog && suffix.startsWith('/models') ? {ok:true,status:200,headers:new Map(),json:async()=>options.catalog} : await fetcher(upstream+suffix,{method:req.method,headers,body:['GET','HEAD'].includes(req.method!) ? undefined : raw.length ? raw : undefined,signal:controller.signal});
      if(suffix.startsWith('/models') && response.ok){
        const catalog=await response.json();
        let settings:Settings={version:1,providers:[]};try{settings=readSettings(root);}catch{}
        catalog.models=[...(catalog.models || []),...modelInfos(settings,catalog.models?.[0])];
        res.writeHead(200,{'content-type':'application/json','cache-control':'no-cache'});res.end(JSON.stringify(catalog));return;
      }
      res.statusCode=response.status;
      if(!response.ok)meter?.finish('failed');
      for(const [key,value]of response.headers)if(!['content-length','content-encoding','transfer-encoding','connection'].includes(key))res.setHeader(key,value);
      if(response.body){
        const stream=Readable.fromWeb(response.body as any);
        if(meter){const observe=usageSse(meter);pipeline(stream,new Transform({transform(chunk,_encoding,callback){observe(chunk);callback(null,chunk);}}),res,error=>{if(error)meter?.finish('failed');});}
        else pipeline(stream,res,()=>{});
      }else res.end();
    }catch(error){
      if(controller.signal.aborted)return;
      meter?.finish('failed');
      // Router/config/network faults are not authentication failures.
      if(!res.headersSent)res.writeHead(502,{'content-type':'application/json'});
      res.end(JSON.stringify({error:{code:'switchboard_error',message:error instanceof Error ? error.message : '本机模型适配失败，GPT 登录未更改。'}}));
    }
  });
  server.on('upgrade',(req,socket,head)=>{
    if(!req.url?.startsWith(prefix+'/responses') || !['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')){socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>{
      let official:WebSocket|undefined;
      let queue=Promise.resolve();
      let currentInput:Json[]=[], currentModel='', currentTools:Json[]=[];
      const history=new Map<string,Json>();
      let pendingOfficial:Json|undefined;
      let officialPending=false;
      let meter:ReturnType<typeof usageAttempt>|undefined;
      const active=new Set<AbortController>();
      const send=(event:Json)=>{
        meter?.observe(event);
        if(['codex.rate_limits','rate_limits.updated'].includes(event.type))saveQuotas(event.rate_limits || event.rateLimits,root);
        if(event.type==='response.completed' && event.response?.id){
          if(pendingOfficial)officialPending=false;
          const requestBody=pendingOfficial || {model:currentModel,input:currentInput,tools:currentTools};
          const output=event.response.output||[];
          history.set(event.response.id,{...requestBody,input:output.some((i:Json)=>i.type==='compaction')?output:[...(requestBody.input || []),...output]});
          if(history.size>16)history.delete(history.keys().next().value!);
        }
        if(ws.readyState===WebSocket.OPEN){
          if(event.type==='response.failed' && event.response?.error?.code==='third_party_error')ws.send(JSON.stringify({type:'error',status:400,error:{...event.response.error,type:'invalid_request_error'}}));
          else ws.send(JSON.stringify(event));
        }
      };
      const connectOfficial=()=>new Promise<WebSocket>((resolve,reject)=>{
        if(official?.readyState===WebSocket.OPEN){resolve(official);return;}
        const url=(upstream+'/responses').replace(/^http/,'ws');
        official=new WebSocket(url,websocketOptions(url,upstreamHeaders(req.headers)));
        official.on('open',()=>resolve(official!));
        official.on('message',data=>{try{send(JSON.parse(data.toString()));}catch{failure(send,'GPT 上游返回了无效消息。');}});
        official.on('error',()=>{if(officialPending)failure(send,'GPT 官网网络连接中断。登录凭证未更改。');officialPending=false;reject(new Error('无法连接 GPT 官网模型服务。登录凭证未更改。'));});
        official.on('close',()=>{if(officialPending)failure(send,'GPT 官网网络连接已关闭。登录凭证未更改。');officialPending=false;official=undefined;});
        official.on('unexpected-response',(_request,response)=>{
          // Preserve genuine OpenAI errors for its existing refresh/recovery path.
          failure(send,`GPT 官网连接返回 HTTP ${response.statusCode}，请检查网络或官网服务。`);
          response.resume();official?.terminate();reject(new Error('GPT 官网连接未建立。'));
        });
      });
      ws.on('message',data=>{
        try{const control=JSON.parse(data.toString());if(['response.cancel','response.interrupt'].includes(control.type)){for(const c of active)c.abort();official?.close();ws.close();return;}}catch{}
        queue=queue.then(async()=>{
          let body:Json;
          try{body=JSON.parse(data.toString());}catch{failure(send,'模型请求格式错误。');return;}
          if(body.type==='response.cancel'){for(const c of active)c.abort();if(official?.readyState===WebSocket.OPEN)official.send(data.toString());return;}
          if(body.type!=='response.create'){failure(send,'暂不支持该模型流消息。');return;}
          const model=body.model || currentModel;
          const resolved=resolve(model);
          const previous=body.previous_response_id ? history.get(body.previous_response_id) : undefined;
          const replayInput=[...(previous?.input || []),...(body.input || [])];
          const tools=body.tools || previous?.tools || currentTools;
          const replayBody={...body,model,input:replayInput,tools};
          const expanded=compactions.expand(replayBody,!!resolved);
          if(resolved){
            if(body.generate!==false){meter?.finish('interrupted');meter=usageAttempt(model,root);}
            pendingOfficial=undefined;currentInput=replayInput;currentModel=model;currentTools=tools;
            if(body.generate===false){send({type:'response.created',response:{id:'resp_sb_warmup',status:'in_progress',output:[]}});send({type:'response.completed',response:{id:'resp_sb_warmup',object:'response',created_at:Math.floor(Date.now()/1000),status:'completed',output:[],model}});return;}
            if(body.previous_response_id && !previous)throw new Error('第三方模型的增量上下文已失效，请在当前窗口重新打开此对话。历史记录未更改。');
            const controller=new AbortController();active.add(controller);controllers.add(controller);
            try{await run(resolved.provider,resolved.model,expanded,send,controller.signal);}finally{active.delete(controller);controllers.delete(controller);}
          }else{
            if(body.generate!==false){meter?.finish('interrupted');meter=usageAttempt(model,root);}
            const outgoing={...body};
            if(body.previous_response_id && (String(body.previous_response_id).startsWith('resp_sb_') || currentModel!==model)){
              if(!previous)throw new Error('跨模型上下文已失效，请重新打开此对话。历史记录未更改。');
              delete outgoing.previous_response_id;outgoing.input=replayInput;outgoing.tools=tools;
            }
            if(expanded!==replayBody){delete outgoing.previous_response_id;outgoing.input=expanded.input;outgoing.tools=tools;}
            currentModel=model;currentInput=replayInput;currentTools=tools;
            pendingOfficial={...outgoing,input:replayInput,tools};
            const connection=await connectOfficial();officialPending=true;connection.send(JSON.stringify(outgoing));
          }
        }).catch(error=>failure(send,error instanceof Error ? error.message : '模型渠道请求失败。'));
      });
      ws.on('close',()=>{meter?.finish('interrupted');for(const c of active)c.abort();official?.close();});
      ws.on('error',()=>{meter?.finish('failed');for(const c of active)c.abort();official?.terminate();});
    });
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address || typeof address==='string')throw new Error('本机适配服务启动失败。');
  return {url:`http://127.0.0.1:${address.port}${prefix}`,close:async()=>{for(const c of controllers)c.abort();for(const c of wss.clients)c.terminate();wss.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
