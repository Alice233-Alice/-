import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {Json} from './config.ts';

export interface Binding { wireName:string; name:string; namespace?:string; custom:boolean; description?:string; parameters:Json; }
export function bindings(tools:Json[] = [], namespace?:string): Binding[] {
  return tools.flatMap(tool => {
    if (tool.type === 'namespace') return bindings(tool.tools || [],tool.name);
    if (!['function','custom'].includes(tool.type)) return [];
    const fn = tool.function || tool;
    const ns = tool.namespace || namespace;
    const name = fn.name;
    if (typeof name !== 'string') return [];
    const full = `${ns || ''}/${name}`;
    return [{wireName:`${full.replace(/[^a-zA-Z0-9_]/g,'_').slice(0,42)}_${crypto.createHash('sha256').update(full).digest('hex').slice(0,12)}`,
      name, namespace:ns, custom:tool.type === 'custom', description:fn.description,
      parameters:tool.type === 'custom' ? {type:'object',properties:{input:{type:'string',description:'Complete raw tool input. Follow the tool description and its required format.'}},required:['input']} : fn.parameters || {type:'object',properties:{}}
    }];
  });
}
export class SignatureStore {
  constructor(private root:string) {}
  private file(id:string):string { return path.join(this.root,crypto.createHash('sha256').update(id).digest('hex') + '.json'); }
  get(id:string,scope?:string):Json|undefined {
    try {const saved=JSON.parse(fs.readFileSync(this.file(id),'utf8'));if(saved.switchboardVersion===2)return scope==null||scope===saved.scope?saved.value:undefined;return scope==null?saved:undefined;} catch {return undefined;}
  }
  set(id:string, part:Json,scope?:string):void {
    fs.mkdirSync(this.root,{recursive:true});
    const file=this.file(id), tmp=file+'.'+crypto.randomUUID()+'.tmp';
    fs.writeFileSync(tmp,JSON.stringify(scope==null?part:{switchboardVersion:2,scope,value:part}),{mode:0o600});fs.renameSync(tmp,file);
  }
  setTurn(id:string,scope:string,parts:Json[],items:Json[]){
    const callIds=items.filter(i=>i.call_id).map(i=>i.call_id);
    this.set('turn:'+id,{parts,callIds},scope);
    for(const item of items)for(const key of [item.id,item.call_id].filter(Boolean))this.set(key,{turnId:id},scope);
  }
  getTurn(key:string,scope?:string):(Json&{turnId:string})|undefined{
    const reference=this.get(key,scope);if(!reference?.turnId)return;
    const turn=this.get('turn:'+reference.turnId,scope);if(turn&&Array.isArray(turn.parts)&&Array.isArray(turn.callIds))return {...turn,turnId:reference.turnId};
  }
}
export function contentText(content:any):string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return JSON.stringify(content ?? '');
  return content.map(part => part.text ?? (part.type === 'input_image' ? '[image]' : JSON.stringify(part))).join('\n');
}
function messageParts(content:any):Json[] {
  if (typeof content === 'string') return [{text:content}];
  return (Array.isArray(content) ? content : []).flatMap<Json>(part => {
    if (typeof part.text === 'string') return [{text:part.text}];
    if (part.type === 'input_image') {
      const value=typeof part.image_url === 'string' ? part.image_url : part.image_url?.url;
      const match=typeof value === 'string' ? value.match(/^data:([^;,]+);base64,([\s\S]+)$/) : null;
      if (match) return [{inlineData:{mimeType:match[1],data:match[2]}}];
      if (typeof value === 'string' && /^gs:\/\//.test(value)) return [{fileData:{mimeType:'image/png',fileUri:value}}];
      throw new Error('Gemini 图片需使用内嵌图片数据或 Google Cloud Storage 地址。');
    }
    if (part.type === 'input_file') throw new Error('此适配版本暂不支持文件附件；可让模型用工作区工具读取文本文件。');
    return [];
  });
}
export function toGemini(body:Json, store:SignatureStore,scope?:string): {request:Json; tools:Binding[]} {
  const tools=bindings(body.tools);
  const contents:Json[]=[], system:string[]=[];
  const calls=new Map<string,{name:string; native:boolean}>();
  const append=(role:string,parts:Json[])=>{if(!parts.length)return;const previous=contents.at(-1);if(previous?.role===role)previous.parts.push(...parts);else contents.push({role,parts});};
  if (body.instructions) system.push(body.instructions);
  const input=typeof body.input === 'string' ? [{type:'message',role:'user',content:body.input}] : body.input || [];
  const results=new Map<string,{item:Json;index:number}>(),callPositions=new Map<string,number>();
  input.forEach((item:Json,index:number)=>{if(['function_call_output','custom_tool_call_output'].includes(item.type))results.set(item.call_id,{item,index});if(['function_call','custom_tool_call'].includes(item.type))callPositions.set(item.call_id,index);});
  const turns=new Map<string,Json>(),references=new Map<Json,Json>();
  const loaded=new Map<string,Json|undefined>();
  for(const item of input){
    if(['function_call_output','custom_tool_call_output'].includes(item.type))continue;
    const key=item.call_id||item.id;if(!key)continue;
    if(!loaded.has(key))loaded.set(key,store.getTurn(key,scope));const turn=loaded.get(key);
    if(turn){turns.set(turn.turnId,turn);references.set(item,turn);}
  }
  const usable=new Set<string>();
  for(const [id,turn] of turns){
    const functions=turn.parts.filter((p:Json)=>p.functionCall);
    if(functions.length!==turn.callIds.length)continue;
    if(turn.callIds.length){
      if(turn.callIds.some((key:string)=>!results.has(key)||!callPositions.has(key)||results.get(key)!.index<callPositions.get(key)!))continue;
      const from=Math.min(...turn.callIds.map((key:string)=>callPositions.get(key)!)),to=Math.max(...turn.callIds.map((key:string)=>results.get(key)!.index));
      if(input.slice(from,to+1).some((item:Json)=>item.role==='user'||(item.role==='assistant'&&references.get(item)?.turnId!==id)))continue;
    }
    usable.add(id);
  }
  const replayed=new Set<string>(),consumedResults=new Set<string>();
  for (const item of input) {
    const turn=references.get(item);
    if(turn&&usable.has(turn.turnId)){
      if(!replayed.has(turn.turnId)){
        append('model',turn.parts);replayed.add(turn.turnId);
        const functions=turn.parts.filter((p:Json)=>p.functionCall);
        const responses=turn.callIds.map((key:string,index:number)=>{consumedResults.add(key);return {functionResponse:{name:functions[index].functionCall.name,response:{output:contentText(results.get(key)!.item.output)}}};});
        append('user',responses);
      }
      continue;
    }
    if(['function_call_output','custom_tool_call_output'].includes(item.type)&&consumedResults.has(item.call_id))continue;
    if (item.type === 'message' || (item.role && item.content != null)) {
      if (['system','developer'].includes(item.role)) system.push(contentText(item.content));
      else append(item.role === 'assistant' ? 'model' : 'user',messageParts(item.content));
    } else if (['function_call','custom_tool_call'].includes(item.type)) {
      const stored=store.get(item.call_id,scope),saved=stored?.functionCall?stored:undefined;
      calls.set(item.call_id,{name:saved?.functionCall?.name || item.name,native:!!saved});
      if (saved) append('model',[saved]);
      else append('model',[{text:`Previous tool call (${item.namespace ? item.namespace+'.' : ''}${item.name}):\n${item.arguments ?? item.input ?? ''}`}]);
    } else if (['function_call_output','custom_tool_call_output'].includes(item.type)) {
      const call=calls.get(item.call_id);
      if (call?.native) append('user',[{functionResponse:{name:call.name,response:{output:contentText(item.output)}}}]);
      else append('user',[{text:`Previous tool result (${call?.name || item.call_id}):\n${contentText(item.output)}`}]);
    } else if (['compaction','context_compaction'].includes(item.type) && item.content) {
      append('user',[{text:contentText(item.content)}]);
    }
    // Provider-private reasoning, encrypted items and transport metadata stay out of Google requests.
  }
  // In interrupted/mixed-provider history, never send a dangling or mismatched
  // function exchange. Preserve its content as historical text instead. Complete
  // native turns above keep every raw part/signature and response order intact.
  for(let index=0;index<contents.length;index++){
    const current=contents[index],next=contents[index+1],functions=current.parts.filter((p:Json)=>p.functionCall);
    if(!functions.length)continue;
    const responses=next?.parts.filter((p:Json)=>p.functionResponse)||[];
    const valid=next?.role==='user'&&responses.length===functions.length&&responses.length===next.parts.length&&functions.every((f:Json,i:number)=>f.functionCall.name===responses[i].functionResponse.name);
    if(!valid){current.parts=current.parts.map((p:Json)=>p.functionCall?{text:`Previous tool call ${p.functionCall.name}: ${JSON.stringify(p.functionCall.args||{})}`}:p);if(next)next.parts=next.parts.map((p:Json)=>p.functionResponse?{text:`Previous tool result ${p.functionResponse.name}: ${JSON.stringify(p.functionResponse.response)}`}:p);}
  }
  for(const content of contents)content.parts=content.parts.map((p:Json)=>p.functionResponse?{functionResponse:p.functionResponse}:p);
  if (!contents.length) contents.push({role:'user',parts:[{text:'Continue.'}]});
  const request:Json={contents,generationConfig:{maxOutputTokens:body.max_output_tokens || 32768}};
  if (system.length) request.systemInstruction={parts:[{text:system.join('\n\n')}]};
  if (tools.length) request.tools=[{functionDeclarations:tools.map(t=>({name:t.wireName,description:`${t.namespace ? t.namespace+'.' : ''}${t.name}\n${t.description || ''}`,parametersJsonSchema:t.parameters}))}];
  if (body.text?.format?.type === 'json_schema' && !tools.length) Object.assign(request.generationConfig,{responseMimeType:'application/json',responseJsonSchema:body.text.format.schema});
  if (typeof body.temperature === 'number') request.generationConfig.temperature=body.temperature;
  return {request,tools};
}
export function toChat(body:Json): {request:Json; tools:Binding[]} {
  const tools=bindings(body.tools);
  const messages:Json[]=[];
  if(body.instructions)messages.push({role:'system',content:body.instructions});
  for(const item of typeof body.input === 'string' ? [{role:'user',content:body.input}] : body.input || []) {
    if(item.type==='message' || item.role) {
      const content=typeof item.content==='string' ? item.content : (item.content || []).flatMap((p:Json)=>p.type==='input_image' ? [{type:'image_url',image_url:{url:p.image_url}}] : typeof p.text === 'string' ? [{type:'text',text:p.text}] : []);
      messages.push({role:item.role==='developer' ? 'system' : item.role,content});
    } else if(['function_call','custom_tool_call'].includes(item.type)) {
      const binding=tools.find(t=>t.name===item.name && (t.namespace || '')===(item.namespace || ''));
      if(!binding){messages.push({role:'assistant',content:`Previous tool call ${item.name}: ${item.arguments || item.input}`});continue;}
      const call={id:item.call_id,type:'function',function:{name:binding.wireName,arguments:binding.custom ? JSON.stringify({input:item.input}) : item.arguments}};
      const last=messages.at(-1);
      if(last?.role==='assistant' && last.tool_calls)last.tool_calls.push(call);else messages.push({role:'assistant',content:null,tool_calls:[call]});
    } else if(['function_call_output','custom_tool_call_output'].includes(item.type)) {
      const exists=messages.some(m=>m.tool_calls?.some((t:Json)=>t.id===item.call_id));
      messages.push(exists ? {role:'tool',tool_call_id:item.call_id,content:contentText(item.output)} : {role:'user',content:`Previous tool result: ${contentText(item.output)}`});
    }
  }
  const request:Json={model:body.model,messages,stream:true,stream_options:{include_usage:true}};
  if(typeof body.max_output_tokens==='number')request.max_tokens=body.max_output_tokens;
  if(typeof body.temperature==='number')request.temperature=body.temperature;
  if(body.text?.format?.type==='json_schema'&&!tools.length)request.response_format={type:'json_schema',json_schema:{name:body.text.format.name||'response',schema:body.text.format.schema,strict:body.text.format.strict!==false}};
  if(tools.length){request.tools=tools.map(t=>({type:'function',function:{name:t.wireName,description:t.description,parameters:t.parameters}}));request.tool_choice='auto';}
  return {request,tools};
}
export class ResponseEmitter {
  readonly id='resp_sb_'+crypto.randomUUID().replaceAll('-','');
  readonly output:Json[]=[];
  private sequence=0;
  private message:Json|undefined;
  private thinking:Json|undefined;
  private completed=false;
  constructor(readonly model:string,private send:(event:Json)=>void){}
  private emit(event:Json){this.send({...event,sequence_number:this.sequence++});}
  private response(status:string,usage?:Json):Json{return {id:this.id,object:'response',created_at:Math.floor(Date.now()/1000),status,model:this.model,output:this.output,error:null,incomplete_details:null,...(usage ? {usage} : {})};}
  start(){this.emit({type:'response.created',response:this.response('in_progress')});this.emit({type:'response.in_progress',response:this.response('in_progress')});}
  reasoning(delta:string){
    if(!delta)return;
    if(!this.thinking){
      this.thinking={id:'rs_ap_'+crypto.randomUUID().replaceAll('-',''),type:'reasoning',summary:[{type:'summary_text',text:''}]};this.output.push(this.thinking);
      this.emit({type:'response.output_item.added',output_index:this.output.length-1,item:{...this.thinking,summary:[]}});
      this.emit({type:'response.reasoning_summary_part.added',item_id:this.thinking.id,output_index:this.output.length-1,summary_index:0,part:{type:'summary_text',text:''}});
    }
    this.thinking.summary[0].text+=delta;
    this.emit({type:'response.reasoning_summary_text.delta',item_id:this.thinking.id,output_index:this.output.indexOf(this.thinking),summary_index:0,delta});
  }
  compaction(encrypted_content:string){
    const item={id:'cmp_sb_'+crypto.randomUUID().replaceAll('-',''),type:'compaction',encrypted_content};
    const index=this.output.length;this.output.push(item);
    this.emit({type:'response.output_item.added',output_index:index,item});
    this.emit({type:'response.output_item.done',output_index:index,item});
  }
  text(delta:string){
    if(!delta)return;
    if(!this.message){
      this.message={id:'msg_sb_'+crypto.randomUUID().replaceAll('-',''),type:'message',role:'assistant',status:'in_progress',content:[{type:'output_text',text:'',annotations:[]}]};
      this.output.push(this.message);
      this.emit({type:'response.output_item.added',output_index:this.output.length-1,item:{...this.message,content:[]}});
      this.emit({type:'response.content_part.added',item_id:this.message.id,output_index:this.output.length-1,content_index:0,part:{type:'output_text',text:'',annotations:[]}});
    }
    this.message.content[0].text+=delta;
    this.emit({type:'response.output_text.delta',item_id:this.message.id,output_index:this.output.indexOf(this.message),content_index:0,delta});
  }
  tool(binding:Binding,args:Json,store?:SignatureStore,raw?:Json,scope?:string){
    const callId='call_sb_'+crypto.randomUUID().replaceAll('-','');
    if(store && raw)store.set(callId,raw,scope);
    const item:Json={id:(binding.custom ? 'ctc_' : 'fc_')+crypto.randomUUID().replaceAll('-',''),type:binding.custom ? 'custom_tool_call' : 'function_call',call_id:callId,name:binding.name,status:'completed',...(binding.namespace ? {namespace:binding.namespace} : {})};
    if(binding.custom){if(typeof args.input!=='string')throw new Error('第三方模型返回的工具输入不是文本。');item.input=args.input;}else item.arguments=JSON.stringify(args);
    const index=this.output.length;this.output.push(item);
    const field=binding.custom?'input':'arguments';
    this.emit({type:'response.output_item.added',output_index:index,item:{...item,status:'in_progress',[field]:''}});
    this.emit({type:binding.custom?'response.custom_tool_call_input.delta':'response.function_call_arguments.delta',item_id:item.id,output_index:index,delta:item[field]});
    this.emit({type:binding.custom?'response.custom_tool_call_input.done':'response.function_call_arguments.done',item_id:item.id,output_index:index,[field]:item[field]});
    this.emit({type:'response.output_item.done',output_index:index,item});
  }
  finish(usage?:Json){
    if(this.completed)return;this.completed=true;
    if(this.thinking){const index=this.output.indexOf(this.thinking);this.emit({type:'response.reasoning_summary_text.done',item_id:this.thinking.id,output_index:index,summary_index:0,text:this.thinking.summary[0].text});this.emit({type:'response.reasoning_summary_part.done',item_id:this.thinking.id,output_index:index,summary_index:0,part:this.thinking.summary[0]});this.emit({type:'response.output_item.done',output_index:index,item:this.thinking});}
    if(this.message){this.message.status='completed';const index=this.output.indexOf(this.message);this.emit({type:'response.output_text.done',item_id:this.message.id,output_index:index,content_index:0,text:this.message.content[0].text});this.emit({type:'response.content_part.done',item_id:this.message.id,output_index:index,content_index:0,part:this.message.content[0]});this.emit({type:'response.output_item.done',output_index:index,item:this.message});}
    this.emit({type:'response.completed',response:this.response('completed',usage)});
  }
  fail(message:string){if(this.completed)return;this.completed=true;this.emit({type:'response.failed',response:{...this.response('failed'),error:{code:'third_party_error',message}}});}
}

