import fs from 'node:fs';
import path from 'node:path';
import {Engine} from '../src/engine.ts';
import {ProviderStore} from '../src/providers.ts';
import {createBridge} from '../src/bridge.ts';
import {applyNativeModelBaseline} from '../src/native-models.ts';

export async function seedLegacyUi(root:string,data:string,workspace:string){
  const secrets=new Map<string,string>(),store=new ProviderStore(data,{get:async key=>secrets.get(key),store:async(key,value)=>{secrets.set(key,value);},delete:async key=>{secrets.delete(key);}});
  const bridge=await createBridge({root:data,store}),catalog=applyNativeModelBaseline(store.catalog(),JSON.parse(fs.readFileSync(path.join(root,'engine/native-model-baseline.json'),'utf8'))),model=catalog.models[1].slug;
  let completed=0;
  const engine=new Engine({cliPath:path.join(root,'engine/windows-x86_64/codex.exe'),manifestPath:path.join(root,'engine/manifest.json'),home:path.join(data,'engine-home'),workspace,bridgeUrl:bridge.url,backendUrl:bridge.backendUrl,token:bridge.token,catalog,onEvent(method){if(method==='turn/completed')completed++;},onRequest(){throw Error('The history fixture must not execute tools.');}});
  try{
    await engine.start();const thread=await engine.rpc('thread/start',{model,modelProvider:'apeiria',cwd:workspace,historyMode:'legacy'});
    await engine.rpc('thread/name/set',{threadId:thread.thread.id,name:'Legacy history fixture'});
    for(const text of ['Keep this earlier history','HISTORY_NETWORK_FAILURE','Continue after network failure']){
      const next=completed+1;await engine.rpc('turn/start',{threadId:thread.thread.id,model,input:[{type:'text',text}]});
      const deadline=Date.now()+15000;while(completed<next&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));if(completed!==next)throw Error('Could not seed the failed legacy turn.');
    }
    return {threadId:thread.thread.id};
  }finally{await engine.dispose();await bridge.close();}
}
