import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import zlib from 'node:zlib';
import type {Json} from './config.ts';
import {resolveModel} from './config.ts';
import type {ProviderStore} from './providers.ts';
import {request} from './network.ts';
import {VertexAuth,parseServiceAccount} from './auth.ts';
import {SignatureStore} from './conversion.ts';
import {runAdapter} from './adapters.ts';
import {usageAttempt,saveProviderQuota} from './usage.ts';
import {CompactionCodec,isCompaction,runCompaction} from './compaction.ts';

export interface BridgeOptions {root:string;store:ProviderStore;fetcher?:typeof request;vertexAuth?:VertexAuth;}
export interface Bridge {url:string;backendUrl:string;token:string;close():Promise<void>;}
const maxBody=64*1024*1024;
function authorized(input:string|undefined,token:string):boolean {
  if(!input)return false;const expected=Buffer.from(`Bearer ${token}`),actual=Buffer.from(input);
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
}
function json(res:http.ServerResponse,status:number,value:Json):void {res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));}
export async function createBridge(options:BridgeOptions):Promise<Bridge> {
  const {root,store}=options,fetcher=options.fetcher||request,token=crypto.randomBytes(32).toString('hex'),prefix=`/${crypto.randomBytes(24).toString('hex')}/v1`;
  const codec=new CompactionCodec(root),signatures=new SignatureStore(path.join(root,'vertex-signatures'));
  const auth=options.vertexAuth||new VertexAuth(fetcher,undefined,async p=>{const c=await store.credentials(p);if(!c.serviceAccountJson)throw Error('该 Vertex 渠道尚未配置服务账号。');return parseServiceAccount(c.serviceAccountJson);});
  const controllers=new Set<AbortController>(),history=new Map<string,Json>();
  const server=http.createServer(async(req,res)=>{
    if(!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'')||!req.url?.startsWith(prefix+'/')){json(res,404,{error:{code:'local_only',message:'该后台端点已停用。'}});return;}
    if(!authorized(req.headers.authorization,token)){json(res,401,{error:{code:'bridge_auth',message:'本机适配层认证失败。'}});return;}
    const suffix=req.url.slice(prefix.length).split('?')[0];
    if(req.method==='GET'&&suffix==='/models'){
      try{json(res,200,store.catalog());}catch(error){json(res,400,{error:{code:'invalid_configuration',message:store.safeError(error)}});}return;
    }
    if(req.method!=='POST'||suffix!=='/responses'){json(res,404,{error:{code:'unsupported_endpoint',message:'独立适配层仅支持已配置的第三方模型。'}});return;}
    const controller=new AbortController();controllers.add(controller);let meter:ReturnType<typeof usageAttempt>|undefined;
    res.on('close',()=>{meter?.finish('interrupted');controller.abort();controllers.delete(controller);});
    try{
      const chunks:Buffer[]=[];let size=0;
      for await(const chunk of req){size+=chunk.length;if(size>maxBody)throw Error('模型请求超过 64 MB。');chunks.push(chunk);}
      let raw=Buffer.concat(chunks);const encoding=req.headers['content-encoding'];
      if(encoding==='gzip')raw=zlib.gunzipSync(raw,{maxOutputLength:maxBody});
      else if(encoding==='br')raw=zlib.brotliDecompressSync(raw,{maxOutputLength:maxBody});
      else if(encoding==='deflate')raw=zlib.inflateSync(raw,{maxOutputLength:maxBody});
      else if(encoding==='zstd'&&'zstdDecompressSync'in zlib)raw=(zlib as any).zstdDecompressSync(raw,{maxOutputLength:maxBody});
      else if(encoding&&encoding!=='identity')throw Error('模型请求使用了不支持的压缩格式。');
      if(raw.length>maxBody)throw Error('模型请求超过 64 MB。');
      let body:Json;try{body=JSON.parse(raw.toString('utf8'));}catch{throw Error('模型请求 JSON 无效。');}
      if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.model!=='string')throw Error('模型请求缺少有效的模型 ID。');
      const resolved=resolveModel(body.model,store.read());
      await store.credentials(resolved.provider);
      if(body.previous_response_id){
        const previous=history.get(body.previous_response_id);if(!previous)throw Error('增量上下文已失效，请重新打开此对话。历史记录保持。');
        body={...body,input:[...(previous.input||[]),...(body.input||[])],tools:body.tools||previous.tools};delete body.previous_response_id;
      }
      body=codec.expand(body,true);
      const hasImage=Array.isArray(body.input)&&body.input.some((item:Json)=>Array.isArray(item.content)&&item.content.some((part:Json)=>part.type==='input_image'));
      if(!resolved.provider.modelMetadata?.[resolved.model]?.imageInput&&hasImage)throw Error('该模型尚未启用图片输入能力，请在模型配置中启用或移除图片。');
      // Cross-provider reasoning ciphertext and transport state never leave this process.
      if(Array.isArray(body.input))body={...body,input:body.input.filter((i:Json)=>i.type!=='reasoning')};
      const deps={fetcher:async(...args:Parameters<typeof request>)=>{const response=await fetcher(...args);saveProviderQuota(body.model,response.headers,root);return response;},vertexAuth:auth,signatures,getKey:async(p:typeof resolved.provider)=>(await store.credentials(p)).apiKey||'',getHeaders:async(p:typeof resolved.provider)=>(await store.credentials(p)).headers,safeError:(error:unknown)=>store.safeError(error)};
      if(body.generate!==false)meter=usageAttempt(body.model,root);
      res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','x-accel-buffering':'no'});
      const send=(event:Json)=>{
        if(controller.signal.aborted||res.writableEnded)return;
        if(event.response?.error?.message)event={...event,response:{...event.response,error:{...event.response.error,message:store.safeError(Error(event.response.error.message))}}};
        if(event.type==='response.failed'&&event.response?.error)event={...event,response:{...event.response,error:{...event.response.error,provider_error_code:event.response.error.code,code:'invalid_prompt',type:'invalid_request_error'}}};
        meter?.observe(event);
        if(event.type==='response.completed'&&event.response?.id){
          const output=event.response.output||[],input=output.some((i:Json)=>i.type==='compaction')?output:[...(Array.isArray(body.input)?body.input:[]),...output];
          history.set(event.response.id,{input,tools:body.tools});if(history.size>32)history.delete(history.keys().next().value!);
        }
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      };
      if(body.generate===false){const response={id:'resp_ap_warmup_'+crypto.randomUUID(),object:'response',created_at:Math.floor(Date.now()/1000),status:'completed',model:body.model,output:[],error:null};send({type:'response.created',response:{...response,status:'in_progress'}});send({type:'response.completed',response});}
      else if(isCompaction(body))await runCompaction(resolved.provider,resolved.model,body,send,controller.signal,deps,codec);
      else await runAdapter(resolved.provider,resolved.model,body,send,controller.signal,deps);
      if(!res.writableEnded)res.end();
    }catch(error){
      meter?.finish('failed');if(controller.signal.aborted)return;
      const message=store.safeError(error);
      if(!res.headersSent)json(res,400,{error:{type:'invalid_request_error',code:'invalid_prompt',message}});
      else res.end(`event: error\ndata: ${JSON.stringify({type:'error',error:{code:'invalid_prompt',message}})}\n\n`);
    }finally{controllers.delete(controller);}
  });
  server.headersTimeout=30000;server.requestTimeout=120000;
  server.on('upgrade',(_req,socket)=>socket.end('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n'));
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string')throw Error('本机适配服务启动失败。');
  const origin=`http://127.0.0.1:${address.port}`;
  return {url:origin+prefix,backendUrl:origin+'/blocked',token,close:async()=>{for(const c of controllers)c.abort();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
