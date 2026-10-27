import readline from 'node:readline';
const output=message=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',...message})+'\n');
let callId;
readline.createInterface({input:process.stdin}).on('line',line=>{
  let message;try{message=JSON.parse(line);}catch{return;}
  if(message.id===700 && message.result) {
    output({id:callId,result:{content:[{type:'text',text:JSON.stringify({echo:message.result.content?.label,officialKeyPresent:!!process.env.OPENAI_API_KEY})}]}});
    return;
  }
  if(message.id===undefined)return;
  switch(message.method) {
    case 'initialize':output({id:message.id,result:{protocolVersion:message.params.protocolVersion,capabilities:{tools:{}},serverInfo:{name:'apeiria-local-fixture',version:'1.0.0'}}});break;
    case 'tools/list':output({id:message.id,result:{tools:[{name:'echo',description:'Local MCP smoke fixture',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false}}]}});break;
    case 'resources/list':output({id:message.id,result:{resources:[]}});break;
    case 'prompts/list':output({id:message.id,result:{prompts:[]}});break;
    case 'tools/call':
      callId=message.id;
      output({id:700,method:'elicitation/create',params:{mode:'form',message:'Local test form',requestedSchema:{type:'object',properties:{label:{type:'string'}},required:['label']}}});break;
    case 'ping':output({id:message.id,result:{}});break;
    default:output({id:message.id,error:{code:-32601,message:'Unsupported fixture method'}});
  }
});
