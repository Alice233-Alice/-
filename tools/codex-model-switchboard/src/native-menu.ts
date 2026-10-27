// Compiled into a small module-local helper in the installed Codex webview.
// React, the model picker and its permission-aware selection callback stay native.
const components=new WeakMap<object,any>();
export function composer(jsx:any,Button:any,picker:unknown){
  return jsx.jsxs('span',{className:'inline-flex min-w-0 items-center gap-1','data-codex-model-controls':true,children:[picker,jsx.jsx(Button,{type:'button',size:'composerAuxiliary',color:'ghost',className:'shrink-0 text-secondary','aria-label':'模型配置',title:'模型配置：JSON、项目和模型',onClick:()=>(window as any).__codexSwitchboardOpen?.('settings'),children:'模型配置'})]});
}
export function modelExtras(jsx:any,react:any,context:{model:string;effort:string;options:{reasoningEffort:string;description?:string}[];disabled:boolean;needsUpdate?:boolean;onChange:(effort:string)=>unknown}){
  const labels:Record<string,string>={none:'关闭',minimal:'极低',low:'低',medium:'中',high:'高',xhigh:'极高',max:'最高',ultra:'超高',persistent:'持续'};
  const options=context.options||[];
  const choices=options.map(option=>jsx.jsx('button',{
    type:'button',role:'menuitemradio','aria-checked':option.reasoningEffort===context.effort,disabled:context.disabled,
    title:option.description||labels[option.reasoningEffort]||option.reasoningEffort,className:'rounded-md px-2 py-1 text-xs',
    style:{background:option.reasoningEffort===context.effort?'var(--vscode-list-activeSelectionBackground, #333)':'transparent',color:'inherit',opacity:context.disabled ? 0.5 : 1},
    onClick:(event:any)=>{event.preventDefault();if(!context.disabled&&option.reasoningEffort!==context.effort)void context.onChange(option.reasoningEffort);},
    children:labels[option.reasoningEffort]||option.reasoningEffort
  },option.reasoningEffort));
  const update=context.needsUpdate?jsx.jsxs('div',{className:'px-2 py-2',children:[
    jsx.jsx('button',{type:'button',className:'text-secondary text-xs underline',title:'重启扩展宿主一次以加载新版后台。请在当前回复结束后点击，GPT 登录与历史保留。',onClick:()=>(window as any).__codexSwitchboardOpen?.('update'),children:'加载适配器更新'}),
    jsx.jsx('div',{className:'text-secondary mt-1 text-xs',children:'旧后台仍在运行，0.5.0 压缩修复尚未生效。点击上方按钮加载。'})
  ]}):jsx.jsx('div',{className:'text-secondary px-2 text-xs',children:(window as any).__codexSwitchboardBackendVersion==='0.5.0'?'后台 0.5.0 · 压缩适配已加载':''});
  return jsx.jsxs('div',{'data-codex-switchboard-controls':true,children:[
    jsx.jsxs('div',{className:'border-token-border mt-1 border-t px-2 py-2',children:[jsx.jsx('div',{className:'text-secondary mb-1 text-xs',children:'思考强度'}),
      options.length>1?jsx.jsx('div',{role:'group','aria-label':'思考强度',className:'flex flex-wrap gap-1',children:choices}):jsx.jsx('div',{className:'text-secondary text-xs',children:'当前模型使用服务商默认设置'})]}),
    update,footer(jsx,react,null)
  ]});
}
export function footer(jsx:any,react:any,existing:unknown){
  let Component=components.get(jsx);
  if(!Component){Component=function NativeFooter({existing}:{existing:unknown}){
    const [expanded,setExpanded]=react.useState(false);
    const [usage,setUsage]=react.useState((window as any).__codexSwitchboardUsage);
    react.useEffect(()=>{const update=(event:CustomEvent)=>setUsage(event.detail);window.addEventListener('codex-switchboard-usage',update as EventListener);return()=>window.removeEventListener('codex-switchboard-usage',update as EventListener);},[]);
    const open=(page:string)=>(window as any).__codexSwitchboardOpen?.(page);
    const compact=(n:number)=>new Intl.NumberFormat('zh-CN',{notation:'compact',maximumFractionDigits:1}).format(n);
    const button=(label:string,onClick:()=>void)=>jsx.jsx('button',{type:'button',className:'text-secondary hover:text-token-foreground rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-1',onClick,children:label});
    const quotas=(usage?.quotas||[]).map((q:any)=>jsx.jsxs('div',{className:'mb-2',children:[jsx.jsx('div',{className:'text-secondary text-xs',children:q.name}),...(q.windows||[]).map((w:any)=>jsx.jsx('div',{className:'text-secondary text-xs',children:`${w.minutes===300?'5 小时':w.minutes===10080?'7 天':w.label}剩余 ${Math.max(0,100-w.usedPercent)}%${w.resetsAt?' · '+new Date(w.resetsAt*1000).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):''}`}))]}));
    const rows=(usage?.rows||[]).slice(0,8).map((r:any)=>{
      const model=String(r.model).startsWith('thirdparty/')?String(r.model).split('/').slice(2).join('/'):r.model;
      const cost=r.cost===null?'未设单价':r.unknownUsage===r.requests?'费用未知':new Intl.NumberFormat('zh-CN',{style:'currency',currency:r.currency||'USD',maximumFractionDigits:4}).format(r.cost);
      return jsx.jsxs('div',{className:'flex items-start justify-between gap-3 py-1 text-xs',children:[jsx.jsxs('div',{className:'min-w-0',children:[jsx.jsx('div',{className:'truncate',children:model}),jsx.jsx('div',{className:'text-secondary',children:`输入 ${compact(r.input)} · 输出 ${compact(r.output)}${r.unknownUsage?' · 部分用量缺失':''}`})]}),jsx.jsx('span',{className:'shrink-0 text-secondary',children:cost})]});
    });
    return jsx.jsxs('div',{className:'border-token-border mt-1 border-t pt-1','data-codex-switchboard-menu':true,children:[existing,jsx.jsxs('div',{className:'flex items-center justify-between gap-2',children:[button('管理渠道',()=>open('settings')),button(expanded?'收起用量':'用量与费用',()=>usage?setExpanded((v:boolean)=>!v):open('usage'))]}),expanded?jsx.jsxs('div',{className:'max-h-64 overflow-y-auto px-2 py-2',children:[...quotas,...rows,jsx.jsx('div',{className:'text-secondary mt-1 text-xs',children:'本月本机记录 · 费用为估算'}),button('详细用量 / 计费设置',()=>open('usage'))]}):null]});
  };components.set(jsx,Component);}
  return jsx.jsx(Component,{existing});
}
