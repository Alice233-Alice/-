import type {ChatItem,Json} from './types.ts';

export function itemText(item:Json):string{
  if(typeof item.text==='string')return item.text;
  if(typeof item.content==='string')return item.content;
  const content=Array.isArray(item.content)?item.content:[];
  if(item.type==='reasoning')return [...(item.summary||[]),...(item.content||[])].map((p:any)=>typeof p==='string'?p:p.text||'').join('\n');
  return content.map((p:Json)=>p.text||p.path&&`[附件：${p.path}]`||'').filter(Boolean).join('\n');
}
export function chatItem(item:Json):ChatItem{
  return {id:String(item.id),type:item.type,role:item.type==='userMessage'?'user':item.type==='agentMessage'?'assistant':undefined,text:itemText(item)||item.aggregatedOutput||item.output||'',status:item.status,command:item.command,cwd:item.cwd,changes:item.changes,raw:item};
}
export function upsertItem(items:ChatItem[],raw:Json):ChatItem{
  const next=chatItem(raw),existing=items.find(i=>i.id===next.id);
  if(existing){Object.assign(existing,next,{text:next.text||existing.text});return existing;}
  items.push(next);return next;
}
export function reduceEvent(items:ChatItem[],method:string,params:Json):void{
  if(method==='item/started'||method==='item/completed'){if(params.item)upsertItem(items,params.item);return;}
  if(method.endsWith('/summaryPartAdded')){const item=items.find(i=>i.id===String(params.itemId));if(item&&item.text)item.text+='\n';return;}
  if(method.endsWith('/delta')||method.endsWith('/outputDelta')||method.endsWith('/summaryTextDelta')||method.endsWith('/textDelta')){
    const id=String(params.itemId||params.item_id||'');if(!id)return;
    let item=items.find(i=>i.id===id);
    if(!item){item={id,type:method.includes('reasoning')?'reasoning':method.includes('commandExecution')?'commandExecution':'agentMessage',text:'',role:method.includes('agentMessage')?'assistant':undefined};items.push(item);}
    item.text=(item.text||'')+String(params.delta||'');
  }
}
export function transcript(items:ChatItem[]):string{
  return items.map(i=>`## ${i.role==='user'?'用户':i.role==='assistant'?'助手':i.type}\n\n${i.text||i.command||''}${i.changes?'\n\n'+i.changes.map(c=>`${c.path}\n${c.diff||''}`).join('\n'):''}`).join('\n\n');
}
