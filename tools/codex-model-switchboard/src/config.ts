import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {reasoningProfile,reasoningPresets} from './reasoning.ts';
import type {ReasoningPreset} from './reasoning.ts';

export type Json = Record<string, any>;
export interface Provider {
  id: string;
  label: string;
  type: 'vertex' | 'responses' | 'chat-completions';
  models: string[];
  project?: string;
  location?: string;
  credentialsFile?: string;
  baseUrl?: string;
  encryptedKey?: string;
  envKey?: string;
  contextWindow?: number;
  enabled?: boolean;
  reasoning?:Record<string,ReasoningPreset>;
}
export interface Settings { version: 1; providers: Provider[]; }
export function dataRoot(): string {
  return process.env.CODEX_SWITCHBOARD_HOME || path.join(os.homedir(), '.codex-model-switchboard');
}
export function readSettings(root = dataRoot()): Settings {
  const file = path.join(root, 'providers.json');
  if (!fs.existsSync(file)) return {version:1, providers:[]};
  let data:Settings;
  try {data=JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));} catch {throw new Error('模型渠道配置无法读取，请在管理界面修复配置。');}
  return validateSettings(data);
}
export function validateSettings(data:Settings):Settings {
  if (data.version !== 1 || !Array.isArray(data.providers)) throw new Error('模型渠道配置格式错误。');
  const ids = new Set<string>();
  for (const p of data.providers) {
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(p.id) || ids.has(p.id)) throw new Error('模型渠道 ID 无效或重复。');
    ids.add(p.id);
    if (!['vertex','responses','chat-completions'].includes(p.type) || !Array.isArray(p.models) || !p.models.length || p.models.some((m:unknown) => typeof m !== 'string' || !m || m.length > 200 || /[\r\n\0]/.test(m))) throw new Error('模型渠道类型或模型名称无效。');
    if (p.type === 'vertex' && (!/^[a-zA-Z0-9:_-]+$/.test(p.project || '') || !/^(global|[a-z]+-[a-z]+[0-9]+)$/.test(p.location || 'global') || !path.isAbsolute(p.credentialsFile || ''))) throw new Error('Vertex 项目、地区或 JSON 文件路径无效。');
    if (p.type !== 'vertex') validateBaseUrl(p.baseUrl || '');
    if (p.contextWindow != null && (!Number.isInteger(p.contextWindow) || p.contextWindow < 4096 || p.contextWindow > 2000000)) throw new Error('上下文长度应在 4096 至 2000000 之间。');
    if(p.reasoning!=null){
      if(typeof p.reasoning!=='object' || Array.isArray(p.reasoning))throw new Error('模型思考能力配置无效。');
      for(const [model,preset] of Object.entries(p.reasoning)){
        if(!p.models.includes(model) || !reasoningPresets.includes(preset))throw new Error('模型思考能力配置无效。');
        if(p.type==='vertex' && preset==='low-medium-high-xhigh')throw new Error('Gemini 不支持 xhigh，请选择 Google 支持的档位。');
        if(p.type!=='vertex' && preset==='gemini-budget')throw new Error('Token 思考预算仅用于 Gemini。');
        if(p.type==='vertex' && preset!=='auto' && preset!=='default'){
          const known=reasoningProfile({...p,reasoning:undefined},model),selected=reasoningProfile(p,model);
          if(known.mode!=='default' && (selected.mode!==known.mode || selected.levels.some(e=>!known.levels.includes(e))))throw new Error(`${model} 不支持所选思考档位，请使用自动识别。`);
        }
      }
    }
  }
  return data;
}
export function writeSettings(settings: Settings, root = dataRoot()): void {
  validateSettings(settings);
  fs.mkdirSync(root, {recursive:true});
  const file = path.join(root, 'providers.json');
  const tmp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n', {mode:0o600});
  fs.renameSync(tmp, file);
}
export function validateBaseUrl(value: string): URL {
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || !['https:','http:'].includes(u.protocol) || (u.protocol === 'http:' && !['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('API 地址应为 HTTPS，或本机 HTTP 地址；密钥请单独填写。');
  return u;
}
export function alias(p: Provider, model: string): string { return `thirdparty/${p.id}/${model}`; }
export function resolveModel(model: string, settings: Settings): {provider:Provider; model:string} | null {
  if (!model.startsWith('thirdparty/')) return null;
  for (const p of settings.providers.filter(p => p.enabled !== false)) {
    for (const m of p.models) if (alias(p,m) === model) return {provider:p, model:m};
  }
  throw new Error('该第三方模型已移除或停用，请重新选择模型。');
}
export function modelPresets(settings: Settings): Json[] {
  return settings.providers.filter(p => p.enabled !== false).flatMap(p => p.models.map(m => ({
    id:alias(p,m), model:alias(p,m), displayName:`${p.label} · ${m}`, description:`${p.type === 'vertex' ? 'Google Vertex AI' : '第三方 API'}，独立凭证`, hidden:false,
    defaultReasoningEffort:reasoningProfile(p,m).defaultEffort, supportedReasoningEfforts:reasoningProfile(p,m).levels.map(effort=>({reasoningEffort:effort,description:reasoningProfile(p,m).mode==='default'?'服务商默认（不发送思考参数）':effort})),
    inputModalities:['text','image'], supportsPersonality:false, isDefault:false, upgrade:null, upgradeInfo:null,
    serviceTiers:[], additionalSpeedTiers:[]
  })));
}
export function modelInfos(settings: Settings, template?: Json): Json[] {
  return settings.providers.filter(p => p.enabled !== false).flatMap(p => p.models.map(m => ({
    ...(template || {}), slug:alias(p,m), display_name:`${p.label} · ${m}`, description:'第三方模型渠道',
    prefer_websockets:true, use_responses_lite:false, tool_mode:'direct', multi_agent_version:null,
    multi_agent_reasoning_effort:null, model_messages:null, minimal_client_version:'0.0.0',
    base_instructions:'You are a coding assistant working in a local workspace. Use the provided tools to inspect, edit, and verify files. Follow user and workspace instructions. Preserve unrelated changes. Use apply_patch to edit files when available.',
    default_reasoning_level:reasoningProfile(p,m).defaultEffort, supported_reasoning_levels:reasoningProfile(p,m).levels.map(effort=>({effort,description:effort})),
    supports_reasoning_summaries:false, supports_reasoning_summary_parameter:false,
    supports_reasoning_effort_updates:false, support_verbosity:false, default_verbosity:null,
    shell_type:'shell_command', apply_patch_tool_type:'freeform', web_search_tool_type:'text',
    visibility:'list', supported_in_api:true, supports_parallel_tool_calls:true,
    context_window:modelContextWindow(p,m), max_context_window:modelContextWindow(p,m),
    auto_compact_token_limit:null, effective_context_window_percent:95,
    truncation_policy:{mode:'tokens',limit:10000}, input_modalities:['text','image'],
    supports_image_detail_original:false, supports_search_tool:false, supports_experimental_context:false,
    experimental_supported_tools:[], service_tiers:[], default_service_tier:null, additional_speed_tiers:[],
    upgrade:null, availability_nux:null, available_in_plans:template?.available_in_plans || [], priority:1000,
    comp_hash:null, guardian:null, auto_review_model_override:null
  })));
}
export function modelContextWindow(provider:Provider,model:string):number{
  if(provider.contextWindow!==undefined)return provider.contextWindow;
  // Argon uses a unified input + output limit. The 95% usable window above
  // leaves more than the adapter's default 32,768 output tokens in reserve.
  if(provider.type==='vertex'&&/^gemini-4-argon(?:-|$)/.test(model))return 1048576;
  return 128000;
}
