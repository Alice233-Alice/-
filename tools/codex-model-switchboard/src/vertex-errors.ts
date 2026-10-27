import type {Json} from './config.ts';

export function safeGoogleText(value:unknown,secrets:string[]=[]):string{
  let text=typeof value==='string'?value:'';
  for(const secret of secrets)if(secret)text=text.split(secret).join('[redacted]');
  return text.replace(/-----BEGIN [\s\S]*?PRIVATE KEY-----[\s\S]*?-----END [\s\S]*?PRIVATE KEY-----/g,'[private key redacted]')
    .replace(/Bearer\s+[^\s,"'<>]+/gi,'Bearer [redacted]').replace(/\bya29\.[\w.-]+/g,'[token redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g,'[token redacted]').replace(/((?:access_token|private_key|api_key|assertion)\s*[":=]+\s*)[^\s,"'<>]+/gi,'$1[redacted]')
    .replace(/[\x00-\x08\x0b-\x1f\x7f]/g,' ').slice(0,1800);
}
export class VertexFailure extends Error{
  constructor(readonly status:number,readonly googleStatus:string,readonly detail:string,readonly fields:string[]=[],readonly retryAfterMs=0){super(detail);this.name='VertexFailure';}
  get retryable(){return [408,429,500,502,503,504].includes(this.status);}
  display(attempts:number){
    const hint=this.status===429?'Google 当前容量不足或触及项目配额。':this.status===400?'Google 拒绝了请求格式或参数。':this.status===403?'请检查该项目的 Vertex 权限和 API 是否启用。':this.status===401?'Google 服务账号令牌无法通过认证。':'Vertex 服务或网络暂时异常。';
    return `Vertex 请求失败（HTTP ${this.status}${this.googleStatus?' / '+this.googleStatus:''}，已尝试 ${attempts} 次）。${hint}${this.detail?'\nGoogle：'+this.detail:''}${this.fields.length?'\n字段：'+this.fields.join('；'):''}${this.retryAfterMs?'\n建议等待至少 '+Math.ceil(this.retryAfterMs/1000)+' 秒后重试。':''}`;
  }
}
const header=(headers:any,key:string)=>headers?.get?.(key)??headers?.[key];
export function googleFailure(raw:Json,status:number,headers?:any,secrets:string[]=[]):VertexFailure{
  const error=raw?.error||raw||{},details=Array.isArray(error.details)?error.details:[];
  const fields=details.flatMap((d:Json)=>(Array.isArray(d.fieldViolations)?d.fieldViolations:[]).slice(0,8).map((f:Json)=>safeGoogleText(`${f.field||''}: ${f.description||''}`,secrets))).slice(0,8);
  let wait=0;const milliseconds=Number(header(headers,'retry-after-ms')),after=header(headers,'retry-after');
  if(Number.isFinite(milliseconds)&&milliseconds>0)wait=milliseconds;
  if(after){const seconds=Number(after),date=Date.parse(after);wait=Math.max(wait,Number.isFinite(seconds)?seconds*1000:Number.isFinite(date)?date-Date.now():0);}
  for(const d of details)if(String(d['@type']).endsWith('RetryInfo')){
    const duration=d.retryDelay;
    const seconds=typeof duration==='string'?Number(duration.replace(/s$/,'')):Number(duration?.seconds||0)+Number(duration?.nanos||0)/1e9;
    if(Number.isFinite(seconds))wait=Math.max(wait,seconds*1000);
  }
  const canonical=typeof error.status==='string'&&/^[A-Z_]{1,80}$/.test(error.status)?error.status:'';
  if(status<100||status>599){const codes:Record<string,number>={INVALID_ARGUMENT:400,FAILED_PRECONDITION:400,UNAUTHENTICATED:401,PERMISSION_DENIED:403,RESOURCE_EXHAUSTED:429,INTERNAL:500,UNAVAILABLE:503,DEADLINE_EXCEEDED:504};status=codes[canonical]||500;}
  return new VertexFailure(status,canonical,safeGoogleText(error.message,secrets),fields,Math.max(0,Math.ceil(wait)));
}
export async function readGoogleFailure(response:any,secrets:string[]=[]):Promise<VertexFailure>{
  let raw:Json={};
  try{
    if(response.body?.getReader){
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)break;chunks.push(value);}if(size<=65536)raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
      finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    }else if(response.json)raw=await response.json();
    else if(response.text){const value=await response.text();if(value.length<=65536)raw=JSON.parse(value);}
  }catch{}finally{try{await response.body?.cancel?.();}catch{}}
  return googleFailure(raw,Number(response.status)||500,response.headers,secrets);
}
export function retryDelay(attempt:number,error:VertexFailure,random=Math.random()):number{
  return Math.max(error.retryAfterMs,Math.ceil(1000*2**attempt*(1+.25*Math.max(0,Math.min(1,random)))));
}
export function networkFailure(error:unknown):VertexFailure|undefined{
  const e=error as any,code=e?.cause?.code||e?.code;
  if(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET'].includes(code)||e?.name==='TimeoutError'||(e instanceof TypeError&&/fetch failed|terminated/i.test(e.message)))return new VertexFailure(503,'NETWORK_ERROR','Google 连接超时或中断。');
}
export function abortableDelay(ms:number,signal:AbortSignal):Promise<void>{
  return new Promise((resolve,reject)=>{if(signal.aborted){reject(signal.reason);return;}const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(signal.reason);};const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},ms);signal.addEventListener('abort',cancel,{once:true});});
}
