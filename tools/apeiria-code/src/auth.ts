import crypto from 'node:crypto';
import type {Provider} from './config.ts';
import {request} from './network.ts';

export interface ServiceAccount {type:string;project_id:string;client_email:string;private_key:string;}
export function parseServiceAccount(text:string):ServiceAccount {
  let value:ServiceAccount;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('服务账号 JSON 格式无效。');}
  if(!value||value.type!=='service_account'||typeof value.project_id!=='string'||!/^[a-zA-Z0-9:_-]+$/.test(value.project_id)||typeof value.client_email!=='string'||!value.client_email.includes('@')||typeof value.private_key!=='string'||!value.private_key.includes('PRIVATE KEY'))throw Error('请提供完整的 Google 服务账号 JSON。');
  try{crypto.createPrivateKey(value.private_key);}catch{throw Error('Google 服务账号私钥无效。');}
  return {type:'service_account',project_id:value.project_id,client_email:value.client_email,private_key:value.private_key};
}
interface Token {value:string;expires:number;}
export class VertexAuth {
  private tokens=new Map<string,Token>();
  private pending=new Map<string,Promise<string>>();
  constructor(private fetcher:typeof request=request,private tokenUrl='https://oauth2.googleapis.com/token',private getAccount:(provider:Provider)=>Promise<ServiceAccount>=async()=>{throw Error('Vertex 服务账号尚未配置。');}){}
  async getToken(provider:Provider,signal?:AbortSignal):Promise<string> {
    signal?.throwIfAborted();
    const account=await this.getAccount(provider),key=crypto.createHash('sha256').update(JSON.stringify(account)).digest('hex'),cached=this.tokens.get(key);
    if(cached&&cached.expires>Date.now()+120000)return cached.value;
    let promise=this.pending.get(key);
    if(!promise){promise=this.exchange(account,key,AbortSignal.timeout(30000)).finally(()=>this.pending.delete(key));this.pending.set(key,promise);}
    if(!signal)return promise;
    signal.throwIfAborted();
    return new Promise<string>((resolve,reject)=>{
      const cancel=()=>{signal.removeEventListener('abort',cancel);reject(signal.reason);};signal.addEventListener('abort',cancel,{once:true});
      promise!.then(v=>{signal.removeEventListener('abort',cancel);resolve(v);},e=>{signal.removeEventListener('abort',cancel);reject(e);});
    });
  }
  private async exchange(account:ServiceAccount,key:string,signal:AbortSignal):Promise<string> {
    const now=Math.floor(Date.now()/1000),encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
    const unsigned=`${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:this.tokenUrl,iat:now,exp:now+3600})}`;
    const signature=crypto.sign('RSA-SHA256',Buffer.from(unsigned),account.private_key).toString('base64url');
    const response=await this.fetcher(this.tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${signature}`}).toString(),signal});
    if(!response.ok){await response.body?.cancel?.();throw Error(`Vertex 服务账号认证失败（HTTP ${response.status}）。请检查 JSON、项目权限及本机时间。`);}
    let token:any;try{token=await response.json();}catch{throw Error('Google 认证服务返回了无效令牌。');}
    if(typeof token.access_token!=='string'||!token.access_token||!Number.isFinite(token.expires_in)||token.expires_in<=0)throw Error('Google 认证服务返回了无效令牌。');
    this.tokens.set(key,{value:token.access_token,expires:Date.now()+token.expires_in*1000});return token.access_token;
  }
  invalidate(_provider:Provider):void {this.tokens.clear();}
}
