import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {reasoningPresets,reasoningProfile} from './reasoning.ts';
import type {ReasoningPreset} from './reasoning.ts';
import type {ModelMetadata} from './types.ts';

export type Json=Record<string,any>;
export interface Provider {
  id:string;label:string;type:'vertex'|'responses'|'chat-completions';models:string[];
  enabled?:boolean;baseUrl?:string;project?:string;location?:string;secretRef?:string;
  modelMetadata?:Record<string,ModelMetadata>;reasoning?:Record<string,ReasoningPreset>;
}
export interface Settings {version:1;providers:Provider[];}
export function dataRoot():string {throw Error('Apeiria Code 需要显式指定独立数据目录。');}
export function validateBaseUrl(value:string):URL {
  let u:URL;try{u=new URL(value);}catch{throw Error('请输入有效的 API 基础地址。');}
  if(u.username||u.password||u.search||u.hash||!['https:','http:'].includes(u.protocol)||(u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('API 地址应为 HTTPS 或本机 HTTP，凭证请单独填写。');
  return u;
}
export function validateSettings(data:Settings):Settings {
  if(!data||data.version!==1||!Array.isArray(data.providers))throw Error('模型渠道配置格式错误。');
  const ids=new Set<string>();
  for(const p of data.providers){
    if(!p||!/^[a-z0-9][a-z0-9_-]{0,60}$/.test(p.id)||ids.has(p.id))throw Error('模型渠道 ID 无效或重复。');ids.add(p.id);
    if(typeof p.label!=='string'||!p.label.trim()||p.label.length>100)throw Error('渠道名称应为 1 至 100 个字符。');
    if(!['vertex','responses','chat-completions'].includes(p.type)||!Array.isArray(p.models)||!p.models.length||p.models.some(m=>typeof m!=='string'||!m.trim()||m.length>200||/[\r\n\0]/.test(m))||new Set(p.models).size!==p.models.length)throw Error('模型渠道类型或模型 ID 无效。');
    if(p.enabled!==undefined&&typeof p.enabled!=='boolean')throw Error('渠道启用状态无效。');
    if(p.secretRef!==undefined&&!/^apeiriaCode\.provider\.[a-f0-9-]{36}$/.test(p.secretRef))throw Error('渠道凭证引用无效。');
    if(p.type==='vertex'){
      if(!/^[a-zA-Z0-9:_-]+$/.test(p.project||'')||!/^(global|[a-z]+-[a-z]+[0-9]+)$/.test(p.location||'global'))throw Error('Vertex 项目或地区无效。');
    }else validateBaseUrl(p.baseUrl||'');
    if(p.modelMetadata!==undefined){
      if(!p.modelMetadata||typeof p.modelMetadata!=='object'||Array.isArray(p.modelMetadata))throw Error('模型能力配置无效。');
      for(const [model,meta] of Object.entries(p.modelMetadata)){
        if(!p.models.includes(model)||!meta||typeof meta!=='object')throw Error('模型能力配置无效。');
        if(meta.displayName!==undefined&&(typeof meta.displayName!=='string'||meta.displayName.length>100))throw Error('模型显示名称过长。');
        if(meta.contextWindow!==undefined&&(!Number.isInteger(meta.contextWindow)||meta.contextWindow<4096||meta.contextWindow>2000000))throw Error('上下文容量应在 4096 至 2000000 之间。');
        if(meta.maxOutputTokens!==undefined&&(!Number.isInteger(meta.maxOutputTokens)||meta.maxOutputTokens<1||meta.maxOutputTokens>1000000))throw Error('输出上限应在 1 至 1000000 之间。');
        if(meta.contextWindow&&meta.maxOutputTokens&&meta.maxOutputTokens>=meta.contextWindow)throw Error('输出上限应小于上下文容量。');
        if(meta.imageInput!==undefined&&typeof meta.imageInput!=='boolean')throw Error('图片输入能力配置无效。');
      }
    }
    if(p.reasoning!==undefined){
      if(!p.reasoning||typeof p.reasoning!=='object'||Array.isArray(p.reasoning))throw Error('思考档位配置无效。');
      for(const [m,preset] of Object.entries(p.reasoning)){
        if(!p.models.includes(m)||!reasoningPresets.includes(preset)||p.type==='vertex'&&preset==='low-medium-high-xhigh'||p.type!=='vertex'&&preset==='gemini-budget')throw Error('思考档位配置无效。');
        if(p.type==='vertex'&&!['auto','default'].includes(preset)){
          const known=reasoningProfile({...p,reasoning:undefined},m),chosen=reasoningProfile(p,m);
          if(known.mode!=='default'&&(chosen.mode!==known.mode||chosen.levels.some(e=>!known.levels.includes(e))))throw Error('该 Gemini 模型不支持所选思考档位。');
        }
      }
    }
  }
  return data;
}
export function readSettings(root:string):Settings {
  const file=path.join(root,'providers.json');if(!fs.existsSync(file))return {version:1,providers:[]};
  let data:Settings;try{data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));}catch{throw Error('渠道配置无法读取，请修复独立数据目录中的 providers.json。');}
  return validateSettings(data);
}
export function writeSettings(settings:Settings,root:string):void {
  validateSettings(settings);fs.mkdirSync(root,{recursive:true});const file=path.join(root,'providers.json'),tmp=file+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(tmp,JSON.stringify(settings,null,2)+'\n',{mode:0o600});fs.renameSync(tmp,file);}finally{try{fs.unlinkSync(tmp);}catch{}}
}
export function alias(p:Provider,model:string):string {return `thirdparty/${p.id}/${model}`;}
export function resolveModel(model:string,settings:Settings):{provider:Provider;model:string} {
  for(const p of settings.providers.filter(p=>p.enabled!==false))for(const m of p.models)if(alias(p,m)===model)return {provider:p,model:m};
  throw Error('该模型未配置、已移除或已停用，请重新选择模型。');
}
export function modelContextWindow(p:Provider,m:string):number {return p.modelMetadata?.[m]?.contextWindow||(p.type==='vertex'&&/^gemini-4-argon(?:-|$)/.test(m)?1048576:128000);}
export function modelInfos(settings:Settings):Json[] {
  return settings.providers.filter(p=>p.enabled!==false).flatMap(p=>p.models.map(m=>({
    slug:alias(p,m),display_name:`${p.label} · ${p.modelMetadata?.[m]?.displayName||m}`,description:'第三方模型渠道',
    prefer_websockets:false,use_responses_lite:false,tool_mode:'direct',multi_agent_version:null,multi_agent_reasoning_effort:null,model_messages:null,minimal_client_version:'0.0.0',
    base_instructions:'You are a coding assistant working in a local workspace. Use the provided tools to inspect, edit, and verify files. Follow user and workspace instructions. Preserve unrelated changes. Use apply_patch to edit files when available.',
    default_reasoning_level:reasoningProfile(p,m).defaultEffort,supported_reasoning_levels:reasoningProfile(p,m).levels.map(effort=>({effort,description:effort})),
    supports_reasoning_summaries:true,supports_reasoning_summary_parameter:false,supports_reasoning_effort_updates:false,support_verbosity:false,default_verbosity:null,
    shell_type:'shell_command',apply_patch_tool_type:'freeform',web_search_tool_type:'text',visibility:'list',supported_in_api:true,supports_parallel_tool_calls:true,
    context_window:modelContextWindow(p,m),max_context_window:modelContextWindow(p,m),auto_compact_token_limit:Math.floor(modelContextWindow(p,m)*0.85),effective_context_window_percent:95,
    truncation_policy:{mode:'tokens',limit:10000},input_modalities:p.modelMetadata?.[m]?.imageInput?['text','image']:['text'],supports_image_detail_original:false,supports_search_tool:false,
    supports_experimental_context:false,experimental_supported_tools:[],service_tiers:[],default_service_tier:null,additional_speed_tiers:[],upgrade:null,availability_nux:null,available_in_plans:[],priority:1000,
    comp_hash:null,guardian:null,auto_review_model_override:null
  })));
}
