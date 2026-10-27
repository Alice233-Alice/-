import crypto from 'node:crypto';
import {alias,modelInfos,readSettings,writeSettings,validateSettings} from './config.ts';
import type {Provider,Settings,Json} from './config.ts';
import type {ProviderDraft,ProviderView,ModelView,ModelMetadata} from './types.ts';
import type {ReasoningPreset} from './reasoning.ts';
import {reasoningProfile} from './reasoning.ts';
import {parseServiceAccount,VertexAuth} from './auth.ts';
import type {ServiceAccount} from './auth.ts';
import {request} from './network.ts';

export interface SecretStorage {get(key:string):Promise<string|undefined>;store(key:string,value:string):Promise<void>;delete(key:string):Promise<void>;}
export interface ProviderCredentials {apiKey?:string;serviceAccountJson?:string;headers:Record<string,string>;}
const noSecrets=():ProviderCredentials=>({headers:{}});
function headerName(name:string):string {
  const value=name.trim().toLowerCase();
  if(!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(value)||['host','content-length','transfer-encoding','connection','upgrade','proxy-authorization','cookie','set-cookie'].includes(value))throw Error('请求头名称无效或由连接层管理。');
  return value;
}
function headerValue(value:string):string {if(typeof value!=='string'||/[\r\n\0]/.test(value)||value.length>16384)throw Error('请求头值无效或过长。');return value;}
export class ProviderStore {
  private cache=new Map<string,ProviderCredentials>();
  private knownSecrets=new Set<string>();
  private queue:Promise<unknown>=Promise.resolve();
  constructor(readonly root:string,private secrets:SecretStorage,private fetcher:typeof request=request){}
  read():Settings {return readSettings(this.root);}
  private serial<T>(operation:()=>Promise<T>):Promise<T>{const next=this.queue.then(operation,operation);this.queue=next.catch(()=>{});return next;}
  private remember(c:ProviderCredentials):ProviderCredentials {
    for(const value of [c.apiKey,c.serviceAccountJson,...Object.values(c.headers)])if(value){this.knownSecrets.add(value);if(c.serviceAccountJson)try{const a=JSON.parse(c.serviceAccountJson);for(const s of [a.private_key,a.client_email])if(typeof s==='string'&&s)this.knownSecrets.add(s);}catch{}}
    return c;
  }
  safeError(error:unknown):string {
    let text=error instanceof Error?error.message:'渠道请求失败。';
    for(const value of [...this.knownSecrets].sort((a,b)=>b.length-a.length))text=text.split(value).join('[已隐藏]');
    return text.replace(/Bearer\s+[^\s"',;]+/gi,'Bearer [已隐藏]').slice(0,4000);
  }
  async credentials(p:Provider):Promise<ProviderCredentials>{
    if(!p.secretRef)return noSecrets();
    if(!this.cache.has(p.secretRef)){
      const raw=await this.secrets.get(p.secretRef);if(!raw)throw Error('该渠道的凭证不可用，请重新保存配置。');
      let c:ProviderCredentials;try{c=JSON.parse(raw);if(!c||typeof c!=='object'||!c.headers||typeof c.headers!=='object'||Array.isArray(c.headers))throw Error();for(const [n,v] of Object.entries(c.headers)){headerName(n);headerValue(v);}}catch{throw Error('该渠道的凭证格式无效，请重新保存配置。');}
      if(c.apiKey!==undefined&&typeof c.apiKey!=='string'||c.serviceAccountJson!==undefined&&typeof c.serviceAccountJson!=='string')throw Error('该渠道的凭证格式无效。');
      this.cache.set(p.secretRef,this.remember(c));
    }
    return structuredClone(this.cache.get(p.secretRef)!);
  }
  async views():Promise<ProviderView[]> {
    return Promise.all(this.read().providers.map(async p=>{
      const c=await this.credentials(p);return {id:p.id,label:p.label,type:p.type,models:p.models,enabled:p.enabled!==false,baseUrl:p.baseUrl,project:p.project,location:p.location,modelMetadata:p.modelMetadata,reasoning:p.reasoning,hasKey:!!c.apiKey,hasCredentials:!!c.serviceAccountJson,headerNames:Object.keys(c.headers)};
    }));
  }
  models():ModelView[]{return this.read().providers.filter(p=>p.enabled!==false).flatMap(p=>p.models.map(m=>({id:alias(p,m),label:`${p.label} · ${p.modelMetadata?.[m]?.displayName||m}`,providerId:p.id,efforts:reasoningProfile(p,m).levels,imageInput:p.modelMetadata?.[m]?.imageInput===true})));}
  catalog():Json {return {models:modelInfos(this.read())};}
  private async prepare(draft:ProviderDraft):Promise<{provider:Provider;credentials:ProviderCredentials;previous?:Provider}> {
    if(!draft||typeof draft!=='object')throw Error('渠道配置格式无效。');
    const settings=this.read(),previous=draft.id?settings.providers.find(p=>p.id===draft.id):undefined;
    const id=draft.id||`provider-${crypto.randomUUID().slice(0,8)}`;
    const c=previous?await this.credentials(previous):noSecrets();
    if(draft.clearKey)c.apiKey=undefined;
    if(draft.apiKey!==undefined&&draft.apiKey!==''){if(typeof draft.apiKey!=='string'||/[\r\n\0]/.test(draft.apiKey)||draft.apiKey.length>16384)throw Error('API 密钥格式无效。');c.apiKey=draft.apiKey;}
    let account:ServiceAccount|undefined;
    if(draft.serviceAccountJson!==undefined&&draft.serviceAccountJson!==''){account=parseServiceAccount(draft.serviceAccountJson);c.serviceAccountJson=JSON.stringify(account);}
    if(draft.type==='vertex'){if(!c.serviceAccountJson)throw Error('请粘贴或导入 Google 服务账号 JSON。');account||=parseServiceAccount(c.serviceAccountJson);}
    if(draft.headers!==undefined){if(!Array.isArray(draft.headers))throw Error('请求头配置无效。');for(const h of draft.headers){const name=headerName(h.name);if(h.remove)delete c.headers[name];else if(h.value!==undefined)c.headers[name]=headerValue(h.value);}}
    const metadata:Record<string,ModelMetadata>={};for(const [m,meta] of Object.entries(draft.modelMetadata||{}))metadata[m]={...(meta.displayName!==undefined?{displayName:meta.displayName}:{}),...(meta.contextWindow!==undefined?{contextWindow:meta.contextWindow}:{}),...(meta.maxOutputTokens!==undefined?{maxOutputTokens:meta.maxOutputTokens}:{}),...(meta.imageInput!==undefined?{imageInput:meta.imageInput}:{})};
    const provider:Provider={id,label:typeof draft.label==='string'?draft.label.trim():'',type:draft.type,models:Array.isArray(draft.models)?draft.models.map(m=>typeof m==='string'?m.trim():m):draft.models,enabled:previous?.enabled!==false,modelMetadata:metadata,reasoning:{...draft.reasoning} as Record<string,ReasoningPreset>,...(draft.type==='vertex'?{project:draft.project?.trim()||account!.project_id,location:draft.location?.trim()||'global'}:{baseUrl:draft.baseUrl?.trim().replace(/\/$/,'')})};
    validateSettings({version:1,providers:[provider]});this.remember(c);return {provider,credentials:c,previous};
  }
  async save(draft:ProviderDraft):Promise<string> {return this.serial(async()=>{
    const {provider,credentials,previous}=await this.prepare(draft),settings=this.read(),secretRef=`apeiriaCode.provider.${crypto.randomUUID()}`;
    provider.secretRef=secretRef;await this.secrets.store(secretRef,JSON.stringify(credentials));
    try{const index=settings.providers.findIndex(p=>p.id===provider.id);if(index<0)settings.providers.push(provider);else settings.providers[index]=provider;writeSettings(settings,this.root);}catch(error){await this.secrets.delete(secretRef).catch(()=>{});throw error;}
    this.cache.set(secretRef,credentials);if(previous?.secretRef){this.cache.delete(previous.secretRef);await this.secrets.delete(previous.secretRef).catch(()=>{});}return provider.id;
  });}
  async remove(id:string):Promise<void>{return this.serial(async()=>{const s=this.read(),p=s.providers.find(p=>p.id===id);s.providers=s.providers.filter(p=>p.id!==id);writeSettings(s,this.root);if(p?.secretRef){this.cache.delete(p.secretRef);await this.secrets.delete(p.secretRef);}});}
  async toggle(id:string):Promise<void>{return this.serial(async()=>{const s=this.read(),p=s.providers.find(p=>p.id===id);if(!p)throw Error('渠道不存在。');p.enabled=p.enabled===false;writeSettings(s,this.root);});}
  async test(draft:ProviderDraft):Promise<string>{
    try{const {provider,credentials:c}=await this.prepare(draft);
      if(provider.type==='vertex'){const auth=new VertexAuth(this.fetcher,undefined,async()=>parseServiceAccount(c.serviceAccountJson!));await auth.getToken(provider);return 'Google OAuth 认证成功；尚未验证模型生成权限。';}
      const headers:Record<string,string>={};if(c.apiKey)headers.authorization=`Bearer ${c.apiKey}`;Object.assign(headers,c.headers);
      const response=await this.fetcher(provider.baseUrl!+'/models',{method:'GET',headers,signal:AbortSignal.timeout(30000)});
      await response.body?.cancel?.();if(!response.ok)throw Error(`模型目录检查失败（HTTP ${response.status}）。`);
      return '模型目录连接成功；尚未验证模型生成权限。';
    }catch(error){throw Error(this.safeError(error));}
  }
}
