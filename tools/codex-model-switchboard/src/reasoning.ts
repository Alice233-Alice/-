import type {Provider,Json} from './config.ts';
export type Effort='none'|'minimal'|'low'|'medium'|'high'|'xhigh';
export type ReasoningPreset='auto'|'default'|'low-medium-high'|'low-medium-high-xhigh'|'minimal-low-medium-high'|'gemini-budget';
export const reasoningPresets:ReasoningPreset[]=['auto','default','low-medium-high','low-medium-high-xhigh','minimal-low-medium-high','gemini-budget'];
interface Profile {mode:'default'|'effort'|'gemini-level'|'gemini-budget';levels:Effort[];defaultEffort:Effort;}
export function reasoningProfile(provider:Provider,model:string):Profile{
  const preset=provider.reasoning?.[model]||'auto';
  const direct=(levels:Effort[],defaultEffort:Effort='medium'):Profile=>({mode:provider.type==='vertex'?'gemini-level':'effort',levels,defaultEffort});
  if(preset==='default')return {mode:'default',levels:['medium'],defaultEffort:'medium'};
  if(preset==='low-medium-high')return direct(['low','medium','high']);
  if(preset==='minimal-low-medium-high')return direct(['minimal','low','medium','high']);
  if(preset==='low-medium-high-xhigh')return direct(['low','medium','high','xhigh']);
  if(preset==='gemini-budget')return {mode:'gemini-budget',levels:['low','medium','high'],defaultEffort:'medium'};
  if(provider.type==='vertex'){
    if(/^gemini-4-argon(?:-|$)/.test(model))return direct(['low','medium','high'],model.includes('cyber-permissive')?'high':'medium');
    if(/^gemini-3\.[78]-flash(?:-|$)/.test(model))return direct(['low','medium','high']);
    if(/^gemini-3\.1-pro(?:-|$)/.test(model))return direct(['low','medium','high'],'high');
    if(/^gemini-3-pro(?:-|$)/.test(model))return direct(['low','high'],'high');
    if(/^gemini-3(?:\.[156])?-flash(?:-lite)?(?:-|$)/.test(model))return direct(['minimal','low','medium','high'],/^gemini-3\.[15]-flash-lite(?:-|$)/.test(model)?'minimal':'medium');
    if(/^gemini-2\.5-(?:pro|flash)(?:-|$)/.test(model))return {mode:'gemini-budget',levels:['low','medium','high'],defaultEffort:'medium'};
  }
  return {mode:'default',levels:['medium'],defaultEffort:'medium'};
}
export function applyReasoning(provider:Provider,model:string,body:Json,request:Json){
  const profile=reasoningProfile(provider,model),effort=body.reasoning?.effort??profile.defaultEffort;
  if(profile.mode==='default'){if(provider.type==='responses')delete request.reasoning;return;}
  if(!profile.levels.includes(effort))throw new Error(`该模型不支持思考强度 ${effort}，可选：${profile.levels.join(', ')}。`);
  if(provider.type==='vertex'){
    if(profile.mode==='gemini-budget'){
      const budgets={low:1024,medium:8192,high:24576};request.generationConfig.thinkingConfig={thinkingBudget:budgets[effort as keyof typeof budgets]};
    }else request.generationConfig.thinkingConfig={thinkingLevel:String(effort).toUpperCase()};
  }else if(provider.type==='chat-completions')request.reasoning_effort=effort;
  else request.reasoning={...body.reasoning,effort};
}
