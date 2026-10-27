import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import type {Provider} from './config.ts';
import {request} from './network.ts';

export interface ServiceAccount { type:string; project_id:string; client_email:string; private_key:string; }
export function readServiceAccount(file: string): ServiceAccount {
  let value:any;
  try {value=JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));} catch {throw new Error('无法读取服务账号 JSON 文件，请检查文件路径和格式。');}
  if (value.type !== 'service_account' || !value.project_id || !value.client_email || typeof value.private_key !== 'string' || !value.private_key.includes('PRIVATE KEY')) throw new Error('请选择 Google 服务账号 JSON 文件。');
  return value;
}
interface Token { value:string; expires:number; stamp:string; }
export class VertexAuth {
  private tokens = new Map<string,Token>();
  private pending = new Map<string,Promise<string>>();
  constructor(private fetcher: typeof request = request, private tokenUrl = 'https://oauth2.googleapis.com/token') {}
  async getToken(provider: Provider, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const file = provider.credentialsFile!;
    const stat = fs.statSync(file);
    const stamp = `${stat.mtimeMs}:${stat.size}`;
    const cached = this.tokens.get(file);
    if (cached?.stamp === stamp && cached.expires > Date.now() + 120000) return cached.value;
    const key = `${file}:${stamp}`;
    let promise = this.pending.get(key);
    if (!promise) {
      // A canceled request must not cancel another caller sharing this refresh.
      promise = this.exchange(provider,stamp,AbortSignal.timeout(30000)).finally(() => this.pending.delete(key));
      this.pending.set(key,promise);
    }
    if(!signal)return promise;
    signal.throwIfAborted();
    return new Promise<string>((resolve,reject)=>{
      const cancel=()=>{signal.removeEventListener('abort',cancel);reject(signal.reason);};
      signal.addEventListener('abort',cancel,{once:true});
      promise!.then(value=>{signal.removeEventListener('abort',cancel);resolve(value);},error=>{signal.removeEventListener('abort',cancel);reject(error);});
    });
  }
  private async exchange(provider: Provider, stamp:string, signal?:AbortSignal): Promise<string> {
    const account = readServiceAccount(provider.credentialsFile!);
    const now = Math.floor(Date.now()/1000);
    const encode = (value:unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${encode({alg:'RS256',typ:'JWT'})}.${encode({iss:account.client_email,scope:'https://www.googleapis.com/auth/cloud-platform',aud:this.tokenUrl,iat:now,exp:now+3600})}`;
    const signature = crypto.sign('RSA-SHA256',Buffer.from(unsigned),account.private_key).toString('base64url');
    const response = await this.fetcher(this.tokenUrl,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${signature}`}).toString(),signal});
    if (!response.ok) throw new Error(`Vertex 服务账号认证失败（HTTP ${response.status}）。请检查 JSON、项目权限及本机时间。`);
    const token = await response.json();
    if (typeof token.access_token !== 'string' || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new Error('Google 认证服务返回了无效令牌。');
    this.tokens.set(provider.credentialsFile!,{value:token.access_token,expires:Date.now()+token.expires_in*1000,stamp});
    return token.access_token;
  }
  invalidate(provider:Provider) { this.tokens.delete(provider.credentialsFile!); }
}
export function protectSecret(value:string, launcher:string): string {
  const result = spawnSync(launcher,['--protect'],{input:value,encoding:'utf8',windowsHide:true,timeout:10000});
  if (result.status !== 0 || result.error) throw new Error('无法使用 Windows 凭证加密。');
  return result.stdout.trim();
}
export function providerKey(provider:Provider, launcher:string): string {
  if (provider.envKey) {
    const value = process.env[provider.envKey];
    if (!value) throw new Error(`缺少渠道环境变量 ${provider.envKey}。`);
    return value;
  }
  if (!provider.encryptedKey) return '';
  return unprotectSecret(provider.encryptedKey,launcher);
}
export function unprotectSecret(value:string,launcher:string):string{
  if (!path.isAbsolute(launcher)) throw new Error('凭证解密程序路径无效。');
  const result = spawnSync(launcher,['--unprotect'],{input:value,encoding:'utf8',windowsHide:true,timeout:10000});
  if (result.status !== 0 || result.error) throw new Error('无法解密渠道密钥，请在当前 Windows 账号下重新配置。');
  return result.stdout.trim();
}
