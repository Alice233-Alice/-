import type {PanelState,PublicProvider} from './panel-types.ts';
import type {Price} from './usage.ts';
import type {ReasoningPreset} from './reasoning.ts';
import {reasoningProfile} from './reasoning.ts';
declare function acquireVsCodeApi():{postMessage(message:unknown):void};
const vscode=acquireVsCodeApi();
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>$<HTMLInputElement>(id);
const value=(id:string)=>input(id).value.trim();
const send=(action:string,data:Record<string,unknown>={})=>vscode.postMessage({action,...data});
let state:PanelState|undefined,editing='',pricingSelection='',pricingSignature='';
let reasoning:Record<string,ReasoningPreset>={};
function renderReasoning(){
  const container=$('reasoningProfiles'),vertex=value('providerType')==='vertex';container.replaceChildren();
  const models=[...new Set(value('models').split(/[,，\r\n]/).map(m=>m.trim()).filter(Boolean))];
  const presets:[ReasoningPreset,string][]=[['auto','自动识别'],['default','服务商默认'],['low-medium-high','低 / 中 / 高'],['minimal-low-medium-high','极低 / 低 / 中 / 高'],...(vertex?[['gemini-budget','低 / 中 / 高（Gemini 2.5 Token 预算）'] as [ReasoningPreset,string]]:[['low-medium-high-xhigh','低 / 中 / 高 / 极高'] as [ReasoningPreset,string]])];
  for(const model of models){
    const provider={id:'preview',label:'',models:[model],type:value('providerType') as PublicProvider['type']},known=reasoningProfile(provider,model);
    const allowed=presets.filter(([preset])=>{if(!vertex || known.mode==='default' || preset==='auto' || preset==='default')return true;const profile=reasoningProfile({...provider,reasoning:{[model]:preset}},model);return profile.mode===known.mode && profile.levels.every(e=>known.levels.includes(e));});
    const label=node('label',model),select=node('select');select.setAttribute('aria-label',`${model} 支持的思考档位`);for(const [preset,text] of allowed){const option=node('option',text);option.value=preset;select.append(option);}select.value=allowed.some(([p])=>p===reasoning[model])?reasoning[model]!:'auto';reasoning[model]=select.value as ReasoningPreset;select.addEventListener('change',()=>reasoning[model]=select.value as ReasoningPreset);label.append(select);container.append(label);
  }
}
function notice(message:string,error=false){const el=$('notice');el.textContent=message;el.className=error?'error':'';el.hidden=!message;if(error)el.scrollIntoView({block:'nearest'});}
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,className?:string){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function button(text:string,action:()=>void,style='text'){const el=node('button',text,style);el.type='button';el.addEventListener('click',action);return el;}
function setPage(page:string){const usage=page==='usage';$('channelsPage').hidden=usage;$('usagePage').hidden=!usage;$('channelsTab').setAttribute('aria-selected',String(!usage));$('usageTab').setAttribute('aria-selected',String(usage));$('channelsTab').tabIndex=usage?-1:0;$('usageTab').tabIndex=usage?0:-1;if(usage)send('refreshUsage',{period:value('usagePeriod')});}
function setKind(){const vertex=value('providerType')==='vertex';$('vertexFields').hidden=!vertex;$('apiFields').hidden=vertex;input('project').required=vertex;input('baseUrl').required=!vertex;input('baseUrl').disabled=vertex;input('apiKey').disabled=vertex;}
function resetForm(type='vertex'){
  $<HTMLFormElement>('providerForm').reset();editing='';reasoning={};input('providerType').value=type;input('label').value=type==='vertex'?'Vertex':'第三方 API';input('models').value=type==='vertex'?'gemini-4-argon':'';$('editorTitle').textContent='添加渠道';$('cancelEdit').hidden=true;$('keyHint').textContent='密钥在本机加密保存。';input('apiKey').placeholder='填写渠道密钥';setKind();renderReasoning();
}
function edit(p:PublicProvider){
  resetForm(p.type);editing=p.id;$('editorTitle').textContent='编辑渠道';$('cancelEdit').hidden=false;
  for(const key of ['label','project','location','credentialsFile','baseUrl'])input(key).value=String((p as unknown as Record<string,unknown>)[key]||'');
  input('models').value=p.models.join('\n');reasoning={...p.reasoning};renderReasoning();input('apiKey').placeholder=p.hasKey?'已保存密钥，留空保持不变':'填写渠道密钥';$('keyHint').textContent=p.hasKey?'已保存的密钥不会回传到面板。':'密钥在本机加密保存。';$('editor').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderProviders(){
  const list=$('providers');list.replaceChildren();
  if(!state?.providers.length){list.append(node('p','还没有第三方渠道。选择下面的 JSON 文件即可开始。','empty'));return;}
  for(const p of state.providers){
    const card=node('article',undefined,'card provider'),row=node('div',undefined,'row');row.append(node('h3',p.label),node('span',p.enabled===false?'已停用':'已启用','badge'));card.append(row,node('p',p.models.join(' · '),'models'),node('p',p.type==='vertex'?`${p.project} / ${p.location}`:p.baseUrl,'help'));
    const actions=node('div',undefined,'actions');actions.append(button('编辑',()=>edit(p)),button(p.enabled===false?'启用':'停用',()=>send('toggleProvider',{id:p.id})));
    if(p.type==='vertex')actions.append(button('Google 账单 ↗',()=>send('billing',{id:p.id})),button('项目配额 ↗',()=>send('quotas',{id:p.id})));
    let confirming=false;const remove=button('移除',()=>{if(confirming){send('removeProvider',{id:p.id});return;}confirming=true;remove.textContent='确认移除';setTimeout(()=>{confirming=false;remove.textContent='移除';},5000);},'text danger');actions.append(remove);card.append(actions);list.append(card);
  }
}
const format=(n:number)=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0}).format(n);
const money=(n:number,currency:string)=>new Intl.NumberFormat('zh-CN',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:6}).format(n);
function displayModel(model:string){if(!model.startsWith('thirdparty/'))return `GPT 官方 · ${model}`;for(const p of state?.providers||[])for(const m of p.models)if(model===`thirdparty/${p.id}/${m}`)return `${p.label} · ${m}`;return model;}
function loadPrice(){
  pricingSelection=value('pricingModel');const p=state?.usage.prices[pricingSelection];input('currency').value=p?.currency||'USD';input('inputRate').value=p?String(p.input):'';input('outputRate').value=p?String(p.output):'';input('cachedRate').value=p?.cachedInput===undefined?'':String(p.cachedInput);input('monthlyBudget').value=p?.monthlyBudget===undefined?'':String(p.monthlyBudget);
}
function renderUsage(){
  if(!state)return;const usage=state.usage;
  const summary=$('usageSummary');summary.replaceChildren();
  for(const [label,n] of [['请求次数',usage.rows.reduce((n,r)=>n+r.requests,0)],['输入 Token',usage.rows.reduce((n,r)=>n+r.input,0)],['输出 Token',usage.rows.reduce((n,r)=>n+r.output,0)]] as const){const el=node('div',undefined,'metric'),number=node('strong',n>=100000?new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:2}).format(n):format(n));number.title=format(n);el.append(number,node('span',label));summary.append(el);}
  const quotas=$('quotaCards');quotas.replaceChildren();
  if(!usage.quotas.length)quotas.append(node('p','套餐额度与限流：等待服务商返回数据。','help'));
  for(const q of usage.quotas){const card=node('article',undefined,'card');card.append(node('h2',q.name.startsWith('thirdparty/')?displayModel(q.name):q.name));for(const w of q.windows){
    const hours=w.minutes===null?'':w.minutes>=1440?`${+(w.minutes/1440).toFixed(1)} 天`:w.minutes>=60?`${+(w.minutes/60).toFixed(1)} 小时`:`${w.minutes} 分钟`;
    card.append(node('p',`${hours||w.label} · 剩余 ${+(100-w.usedPercent).toFixed(1)}%`));const progress=node('progress');progress.max=100;progress.value=100-w.usedPercent;progress.setAttribute('aria-label',`${q.name} ${w.label}剩余额度`);card.append(progress);
    if(w.resetsAt)card.append(node('p',`重置：${new Date(w.resetsAt*1000).toLocaleString('zh-CN')}`,'help'));
  }
  if(q.remainingRequests!==undefined)card.append(node('p',`限流窗口剩余请求：${format(q.remainingRequests)}${q.resetRequests?` · 重置间隔 ${q.resetRequests}`:''}`));
  if(q.remainingTokens!==undefined)card.append(node('p',`限流窗口剩余 Token：${format(q.remainingTokens)}${q.resetTokens?` · 重置间隔 ${q.resetTokens}`:''}`));
  card.append(node('p',`最近服务商数据：${new Date(q.at).toLocaleString('zh-CN')}。额度可能由多个模型共享，刷新本页不会主动查询。`,'help'));quotas.append(card);}
  const rows=$('usageRows');rows.replaceChildren();if(!usage.rows.length)rows.append(node('p','暂无记录。启用适配器后的模型请求会自动计入。','empty'));
  for(const r of usage.rows){
    const card=node('article',undefined,'card'),title=node('div',undefined,'row');title.append(node('h2',displayModel(r.model),'usage-model'),node('span',`${r.requests} 次请求`,'badge'));card.append(title);
    const details=node('div',undefined,'usage-details');
    for(const [label,text] of [['输入',`${format(r.input)} Token`],['输出（含推理）',`${format(r.output)} Token`],['其中缓存输入',`${format(r.cached)} Token`],['失败或中断',`${r.failed} 次`],['已知用量估算',r.cost===null?'未设置单价':r.unknownUsage===r.requests?'暂无计费用量':money(r.cost,r.currency!)],['本月预算剩余（估算）',r.budgetRemaining===null?'未设置或用量不完整':money(r.budgetRemaining,r.currency!)]]){const pair=node('div');pair.append(node('span',label+'：'),document.createTextNode(text));details.append(pair);}card.append(details);
    if(r.unknownUsage)card.append(node('p',`${r.unknownUsage} 次请求未返回完整用量，Token 和费用可能低于实际值。`,'help'));
    const actions=node('div',undefined,'actions');actions.append(button('设置单价 / 预算',()=>{input('pricingModel').value=r.model;loadPrice();$('pricingForm').scrollIntoView({behavior:'smooth',block:'start'});}));
    const p=state.providers.find(p=>p.type==='vertex' && r.model.startsWith(`thirdparty/${p.id}/`));if(p)actions.append(button('查看 Google 账单 ↗',()=>send('billing',{id:p.id})));card.append(actions);rows.append(card);
  }
  const models=[...new Set([...state.providers.flatMap(p=>p.models.map(m=>`thirdparty/${p.id}/${m}`)),...usage.rows.map(r=>r.model)])];
  const signature=JSON.stringify(models.map(m=>[m,displayModel(m)]));
  if(signature!==pricingSignature){const select=$<HTMLSelectElement>('pricingModel');select.replaceChildren();for(const model of models){const option=node('option',displayModel(model));option.value=model;select.append(option);}if(models.includes(pricingSelection))select.value=pricingSelection;pricingSignature=signature;loadPrice();}
  for(const el of $('pricingForm').querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement>('input,button,select'))el.disabled=!models.length;
}
function render(){if(!state)return;
  $('setup').hidden=state.enabled&&!state.reloadRequired;
  $('adapterTitle').textContent=state.reloadRequired?'等待重载窗口':state.enabled?'模型渠道已启用':'连接模型渠道';
  $('adapterHint').textContent=state.reloadRequired?'点击重载使设置生效，GPT 登录和历史继续保留。':state.enabled?'在聊天输入框原有模型菜单中切换，无需重载。':'首次启用后可在原有模型菜单中切换。';
  $('enable').hidden=state.enabled;$('reload').hidden=!state.reloadRequired;$('disable').hidden=!state.enabled;renderProviders();renderUsage();
}
window.addEventListener('message',({data})=>{
  if(data?.type==='state'){state=data.state;render();}
  else if(data?.type==='navigate'){setPage(data.page);if(!editing && data.providerType)resetForm(data.providerType);}
  else if(data?.type==='result'){
    if(data.action==='saveProvider')$<HTMLButtonElement>('save').disabled=false;
    if(data.message)notice(data.message,!data.ok);
    if(data.ok && data.action==='chooseJson' && data.data){input('credentialsFile').value=data.data.credentialsFile;input('project').value=data.data.project;}
    if(data.ok && data.action==='saveProvider')resetForm();
  }
});
$('channelsTab').addEventListener('click',()=>setPage('channels'));$('usageTab').addEventListener('click',()=>setPage('usage'));
for(const id of ['channelsTab','usageTab'])$(id).addEventListener('keydown',event=>{if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();const usage=id==='channelsTab';setPage(usage?'usage':'channels');$(usage?'usageTab':'channelsTab').focus();}});
$('newProvider').addEventListener('click',()=>{resetForm();$('editor').scrollIntoView({behavior:'smooth',block:'start'});});$('cancelEdit').addEventListener('click',()=>resetForm());
$('providerType').addEventListener('change',()=>{setKind();if(!editing){input('label').value=value('providerType')==='vertex'?'Vertex':'第三方 API';input('models').value=value('providerType')==='vertex'?'gemini-4-argon':'';}renderReasoning();});
$('models').addEventListener('change',renderReasoning);
$('chooseJson').addEventListener('click',()=>send('chooseJson'));
for(const id of ['enable','disable','reload','openChat','diagnostics'])$(id).addEventListener('click',()=>send(id));
$('providerForm').addEventListener('submit',event=>{event.preventDefault();renderReasoning();$<HTMLButtonElement>('save').disabled=true;const models=value('models').split(/[,，\r\n]/).map(m=>m.trim()).filter(Boolean);send('saveProvider',{form:{id:editing,type:value('providerType'),label:value('label'),credentialsFile:value('credentialsFile'),project:value('project'),location:value('location'),baseUrl:value('baseUrl'),apiKey:value('apiKey'),models:value('models'),reasoning:Object.fromEntries(models.filter(m=>reasoning[m]&&reasoning[m]!=='auto').map(m=>[m,reasoning[m]]))}});input('apiKey').value='';});
$('usagePeriod').addEventListener('change',()=>send('refreshUsage',{period:value('usagePeriod')}));$('refreshUsage').addEventListener('click',()=>send('refreshUsage',{period:value('usagePeriod')}));$('pricingModel').addEventListener('change',loadPrice);
$('pricingForm').addEventListener('submit',event=>{event.preventDefault();const price:Price={currency:value('currency') as Price['currency'],input:Number(value('inputRate')),output:Number(value('outputRate'))};if(value('cachedRate'))price.cachedInput=Number(value('cachedRate'));if(value('monthlyBudget'))price.monthlyBudget=Number(value('monthlyBudget'));send('savePrice',{model:value('pricingModel'),price});});
setKind();renderReasoning();send('ready');
