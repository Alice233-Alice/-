import crypto from 'node:crypto';
import type {Json} from './types.ts';

export const nativeCoreVersion='0.164.0-alpha.11.1';
export const nativeBaselineSlug='gpt-6.1-sol';
export const nativePlaceholderSlug='apeiria-unconfigured';
const sha256=(value:Uint8Array)=>crypto.createHash('sha256').update(value).digest('hex');

/** Extract the actual include_str model catalog from the verified CLI, without running it. */
export function extractEmbeddedModelCatalog(input:Uint8Array):{catalog:Json;offset:number;length:number;sha256:string}{
  const binary=Buffer.isBuffer(input)?input:Buffer.from(input.buffer,input.byteOffset,input.byteLength);
  let marker=-1;
  while((marker=binary.indexOf('"models": [',marker+1))!==-1){
    const start=binary.lastIndexOf('{',marker);if(start<0)continue;
    let quoted=false,escaped=false,depth=0,end=-1;
    for(let index=start;index<binary.length&&index-start<8*1024*1024;index++){
      const byte=binary[index];
      if(quoted){if(escaped)escaped=false;else if(byte===92)escaped=true;else if(byte===34)quoted=false;}
      else if(byte===34)quoted=true;
      else if(byte===123)depth++;
      else if(byte===125&&--depth===0){end=index+1;break;}
    }
    if(end<0)continue;
    const source=binary.subarray(start,end);let catalog:Json;
    try{catalog=JSON.parse(source.toString('utf8'));}catch{continue;}
    if(!Array.isArray(catalog.models))continue;
    const baseline=catalog.models.find((model:Json)=>model.slug===nativeBaselineSlug);
    if(typeof baseline?.model_messages?.instructions_template!=='string'||baseline.model_messages.instructions_template.length<10000)continue;
    return {catalog,offset:start,length:source.length,sha256:sha256(source)};
  }
  throw Error('固定版本内核中没有找到可校验的完整 Codex 模型目录。');
}

const providerFields=[
  'slug','display_name','description','visibility','supported_in_api','priority',
  'context_window','max_context_window','auto_compact_token_limit','effective_context_window_percent',
  'input_modalities','default_reasoning_level','supported_reasoning_levels',
  'supports_reasoning_summaries','supports_reasoning_summary_parameter','supports_reasoning_effort_updates',
] as const;

/** Keep the native local agent machinery while retaining each provider's truthful capabilities. */
export function applyNativeModelBaseline(catalog:Json,baselineDocument:Json):Json {
  const baseline=baselineDocument.model;
  if(baselineDocument.coreVersion!==nativeCoreVersion||baselineDocument.baselineSlug!==nativeBaselineSlug||baseline?.slug!==nativeBaselineSlug||
    typeof baseline.model_messages?.instructions_template!=='string'||baseline.model_messages.instructions_template.length<10000||
    !Array.isArray(catalog.models))throw Error('原生内核模型基线无效，请重新准备固定版本资源。');
  // The core requires a nonempty startup catalog. This entry is never advertised
  // by model/list and cannot resolve to any provider in the bridge.
  const configured=catalog.models.length?catalog.models:[{slug:nativePlaceholderSlug,display_name:'请先配置模型提供商',visibility:'hide',supported_in_api:false,context_window:128000,max_context_window:128000,input_modalities:['text']}];
  return {...catalog,models:configured.map((current:Json)=>{
    const result:Json=structuredClone(baseline);
    for(const field of providerFields)if(current[field]!==undefined)result[field]=structuredClone(current[field]);
    // Transport and provider access are independent of the retained native tool implementation.
    Object.assign(result,{
      prefer_websockets:false,use_responses_lite:false,
      supports_search_tool:false,supports_standalone_web_search:false,supports_experimental_context:false,
      supports_image_detail_original:false,support_verbosity:false,default_verbosity:null,
      available_in_plans:[],service_tiers:[],additional_speed_tiers:[],default_service_tier:null,
      upgrade:null,availability_nux:null,guardian:null,auto_review_model_override:null,requires_sandboxed_review:false,
    });
    // Current provider model IDs must never inherit an official service-only model override.
    delete result.base_instructions;
    return result;
  })};
}
