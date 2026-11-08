/* Run only through an isolated VS Code --extensionTestsPath instance. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ID='ayanami-local.apeiria-code';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

exports.run=async function(){
  const vscode=require('vscode');
  const reportPath=process.env.APEIRIA_VSCODE_SMOKE_REPORT||path.resolve(__dirname,'../test-output/native-vscode/report.json');
  const report={passed:false,checks:[],errors:[]};
  const check=(name,value)=>{assert.ok(value,name);report.checks.push(name);};
  try{
    report.extensionIds=vscode.extensions.all.map(extension=>extension.id);
    const official=vscode.extensions.getExtension('openai.chatgpt');
    if(process.env.APEIRIA_NATIVE_SMOKE_COEXIST==='1'){
      check('official client is present in isolated test profile',!!official);
      await official.activate();
    }
    const beforeEnvironment={CODEX_HOME:process.env.CODEX_HOME,CODEX_SQLITE_HOME:process.env.CODEX_SQLITE_HOME,OPENAI_API_KEY:process.env.OPENAI_API_KEY};
    const extension=vscode.extensions.getExtension(ID);check('independent extension is installed',!!extension);
    report.extensionPath=extension.extensionPath;
    if(process.env.APEIRIA_NATIVE_SMOKE_INSTALLED==='1')check('target runs from the isolated installed extension directory',extension.extensionPath.toLowerCase().includes(path.join('native-vscode','extensions',ID+'-').toLowerCase()));
    await extension.activate();check('independent extension activates',extension.isActive);
    check('extension has no dependency on the official ID',!extension.packageJSON.extensionDependencies?.includes('openai.chatgpt'));
    const views=extension.packageJSON.contributes.views.apeiriaCode||[];
    check('left sidebar contributes original native view IDs',views.length>=1&&views.every(view=>view.id.startsWith('apeiriaCode.native.')));
    check('the prototype custom chat view is absent',!views.some(view=>view.id==='apeiriaCode.chat'));
    const commands=await vscode.commands.getCommands(true);
    for(const name of ['openSidebar','newChat','addToThread','addFileToThread','openCommandMenu'])check('native command registered: '+name,commands.includes('apeiriaCode.native.'+name));
    check('provider manager command is separate',commands.includes('apeiriaCode.settings'));
    const declared=extension.packageJSON.contributes.commands||[];
    check('manifest command IDs never overwrite official commands',declared.every(command=>!command.command.startsWith('chatgpt.')));
    if(!official)check('no official command registration was leaked by the native copy',!commands.some(command=>command.startsWith('chatgpt.')));
    else if(process.env.APEIRIA_NATIVE_SMOKE_COEXIST==='1')check('official commands remain alongside private native commands',commands.includes('chatgpt.openSidebar')&&commands.includes('apeiriaCode.native.openSidebar'));
    await vscode.commands.executeCommand('apeiriaCode.native.openSidebar');
    report.checks.push('original native sidebar open command completed');
    await delay(1500);
    await vscode.commands.executeCommand('apeiriaCode.settings');
    await delay(600);
    const tabs=vscode.window.tabGroups.all.flatMap(group=>group.tabs);
    check('provider management is a distinct panel',tabs.some(tab=>tab.label.includes('模型提供商')));
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await vscode.commands.executeCommand('apeiriaCode.native.openSidebar');
    check('native source bundle is present',fs.existsSync(path.join(extension.extensionPath,'native','out','extension.js')));
    check('native webview assets are present',fs.existsSync(path.join(extension.extensionPath,'native','webview','index.html')));
    assert.deepEqual({CODEX_HOME:process.env.CODEX_HOME,CODEX_SQLITE_HOME:process.env.CODEX_SQLITE_HOME,OPENAI_API_KEY:process.env.OPENAI_API_KEY},beforeEnvironment);
    report.checks.push('shared extension host environment is unchanged');
    report.nativeVersion=JSON.parse(fs.readFileSync(path.join(extension.extensionPath,'native','package.json'),'utf8')).version;
    report.extensionVersion=extension.packageJSON.version;
    report.officialCoexistence=!!official;
    report.nativeCommands=commands.filter(command=>command.startsWith('apeiriaCode.native.'));
    report.isUnderDevelopment=extension.isUnderDevelopment;
    report.passed=true;
    const hold=Number(process.env.APEIRIA_NATIVE_SMOKE_HOLD_MS||0);
    if(hold>0){fs.writeFileSync(path.join(path.dirname(reportPath),'render-ready.json'),JSON.stringify({ready:true,hold,at:new Date().toISOString()}));console.log('NATIVE_UI_READY');const deadline=Date.now()+Math.min(hold,180000);while(Date.now()<deadline&&!fs.existsSync(path.join(path.dirname(reportPath),'render-finish.json')))await delay(400);}
  }catch(error){report.errors.push(error.stack||String(error));throw error;}
  finally{fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log('Apeiria native VS Code smoke:',JSON.stringify(report));}
};

/** Reproducible local runner; its editor profile and child environment are separate. */
if(require.main===module)(async()=>{
  const {spawn}=require('node:child_process');
  const root=path.resolve(__dirname,'..'),testRoot=path.join(root,'test-output','native-vscode');
  for(const name of ['user-data','extensions','workspace','codex-home'])fs.mkdirSync(path.join(testRoot,name),{recursive:true});
  const profileDirectory=path.join(testRoot,process.argv.includes('--empty')||process.argv.includes('--legacy-fixture')?'user-data-empty-'+Date.now():'user-data');fs.mkdirSync(profileDirectory,{recursive:true});
  for(const name of ['render-ready.json','render-finish.json']){const file=path.join(testRoot,name);if(fs.existsSync(file))fs.unlinkSync(file);}
  const installed=process.argv.includes('--installed'),coexist=process.argv.includes('--coexist'),noProposals=process.argv.includes('--no-proposals');
  const reportName=coexist?'report-coexist.json':installed?(noProposals?'report-installed-no-proposals.json':'report-installed.json'):(noProposals?'report-no-proposals.json':'report.json');
  const previousReport=path.join(testRoot,reportName);if(fs.existsSync(previousReport))fs.unlinkSync(previousReport);
  const env={...process.env,CODEX_HOME:path.join(testRoot,'codex-home'),APEIRIA_VSCODE_SMOKE_REPORT:path.join(testRoot,reportName)};
  if(installed)env.APEIRIA_NATIVE_SMOKE_INSTALLED='1';
  if(coexist)env.APEIRIA_NATIVE_SMOKE_COEXIST='1';
  if(process.argv.includes('--render'))env.APEIRIA_NATIVE_SMOKE_HOLD_MS='180000';
  for(const key of Object.keys(env))if(/^(OPENAI|CHATGPT)_/.test(key)||['CODEX_API_KEY','CODEX_ACCESS_TOKEN','ACCESS_TOKEN','ID_TOKEN','REFRESH_TOKEN','GOOGLE_APPLICATION_CREDENTIALS','ELECTRON_RUN_AS_NODE','NODE_OPTIONS','VSCODE_IPC_HOOK_CLI'].includes(key))delete env[key];
  const userDirectory=path.join(profileDirectory,'User');fs.mkdirSync(userDirectory,{recursive:true});fs.writeFileSync(path.join(userDirectory,'settings.json'),JSON.stringify({'extensions.autoUpdate':false,'extensions.autoCheckUpdates':false,'telemetry.telemetryLevel':'off','workbench.startupEditor':'none','update.mode':'none'}));
  fs.writeFileSync(path.join(testRoot,'profile.json'),JSON.stringify({profileDirectory,installed,coexist,noProposals}));
  let fixtureServer;
  if(process.argv.includes('--fixture')){
    const http=require('node:http');
    const compiled=require('esbuild').buildSync({entryPoints:[path.join(root,'src','conversion.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
    const fixtureModule={exports:{}};new Function('require','module','exports',compiled)(require,fixtureModule,fixtureModule.exports);
    const {ResponseEmitter}=fixtureModule.exports;
    const requests=[];
    const writeRequests=()=>fs.writeFileSync(path.join(testRoot,'fixture-requests.json'),JSON.stringify(requests,null,2));
    fixtureServer=http.createServer(async(req,res)=>{
      try{
        if(req.method==='GET'&&req.url==='/v1/models'){res.setHeader('content-type','application/json');res.end(JSON.stringify({object:'list',data:['fixture-native-a','fixture-native-b'].map(id=>({id,object:'model'}))}));return;}
        if(req.method!=='POST'||req.url!=='/v1/responses'){res.writeHead(404);res.end();return;}
        let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8000000)throw Error('Fixture request too large.');}
        const body=JSON.parse(raw);
        const lastUser=body.input?.filter(item=>item.role==='user').at(-1),lastUserText=JSON.stringify(lastUser?.content||'');
        assert.ok(['fixture-native-a','fixture-native-b'].includes(body.model),'known fixture model');
        assert.equal(req.headers.authorization,undefined,'no official or local bridge authorization reaches fixture upstream');
        requests.push({model:body.model,inputItems:body.input?.length,instructionLength:body.instructions?.length||0,tools:body.tools?.length||0,toolTypes:(body.tools||[]).map(tool=>({type:tool.type,name:tool.name,tools:tool.tools?.map(item=>({type:item.type,name:item.name}))})),authorizationPresent:!!req.headers.authorization,...(process.argv.includes('--legacy-fixture')?{lastUserText}:{} )});writeRequests();
        if(process.argv.includes('--legacy-fixture')&&lastUserText.includes('HISTORY_NETWORK_FAILURE')){res.writeHead(503,{'content-type':'application/json'});res.end('{"error":{"message":"Simulated history network interruption"}}');return;}
        res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});
        const emitter=new ResponseEmitter(body.model,event=>res.write('event: '+event.type+'\ndata: '+JSON.stringify(event)+'\n\n'));
        emitter.start();emitter.text('Apeiria native UI fixture reply');emitter.finish({input_tokens:42,output_tokens:8,total_tokens:50});res.end();
      }catch(error){requests.push({error:error.message});writeRequests();if(!res.headersSent)res.writeHead(500,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:error.message}}));}
    });
    await new Promise((resolve,reject)=>{fixtureServer.once('error',reject);fixtureServer.listen(0,'127.0.0.1',resolve);});
    const providerDirectory=path.join(userDirectory,'globalStorage',ID);fs.mkdirSync(providerDirectory,{recursive:true});
    const fixtureHome=path.join(providerDirectory,'engine-home');fs.mkdirSync(fixtureHome,{recursive:true});
    // Only the isolated text-only fixture skips the first-use Windows sandbox setup.
    // Its upstream cannot emit tools and never reaches any real model service.
    fs.writeFileSync(path.join(fixtureHome,'config.toml'),'sandbox_mode = "danger-full-access"\napproval_policy = "on-request"\n');
    const fixtureProvider={id:'native-smoke',label:'Native Fixture',type:'responses',enabled:true,baseUrl:'http://127.0.0.1:'+fixtureServer.address().port+'/v1',models:['fixture-native-a','fixture-native-b'],modelMetadata:{'fixture-native-a':{displayName:'Fixture Native A',contextWindow:64000,maxOutputTokens:4096,imageInput:true},'fixture-native-b':{displayName:'Fixture Native B',contextWindow:64000,maxOutputTokens:4096,imageInput:true}},reasoning:{'fixture-native-a':'default','fixture-native-b':'default'}};
    fs.writeFileSync(path.join(testRoot,'fixture-config.json'),JSON.stringify(fixtureProvider));
    fs.writeFileSync(path.join(providerDirectory,'providers.json'),JSON.stringify({version:1,providers:process.argv.includes('--empty')?[]:[fixtureProvider]}));
    if(process.argv.includes('--legacy-fixture')){
      const seedSource=require('esbuild').buildSync({entryPoints:[path.join(root,'scripts/native-history-ui-seed.ts')],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
      const seedModule={exports:{}};new Function('require','module','exports',seedSource)(require,seedModule,seedModule.exports);
      const seeded=await seedModule.exports.seedLegacyUi(root,providerDirectory,path.join(testRoot,'workspace'));
      fs.writeFileSync(path.join(testRoot,'history-fixture.json'),JSON.stringify(seeded));
    }
    writeRequests();console.log('Local native fixture listening on loopback.');
  }else if(process.argv.includes('--empty')){
    const providerFile=path.join(userDirectory,'globalStorage',ID,'providers.json');
    if(fs.existsSync(providerFile)){
      const saved=JSON.parse(fs.readFileSync(providerFile,'utf8'));
      if(saved.providers?.some(p=>p.id!=='native-smoke'))throw Error('Refusing to remove unexpected isolated test provider.');
      fs.writeFileSync(providerFile,JSON.stringify({version:1,providers:[]}));
    }
  }
  const junction=(destination,target)=>{if(fs.existsSync(destination)){if(path.resolve(fs.realpathSync(destination))!==path.resolve(fs.realpathSync(target)))throw Error('Unexpected test junction: '+destination);}else fs.symlinkSync(target,destination,'junction');};
  let developmentPath=root,officialDevelopmentPath;
  if(installed){
    const own=path.join(testRoot,'extensions',ID+'-0.2.0');fs.mkdirSync(own,{recursive:true});fs.copyFileSync(path.join(root,'package.json'),path.join(own,'package.json'));
    const dist=path.join(own,'dist');if(fs.existsSync(dist)&&fs.lstatSync(dist).isSymbolicLink()){if(path.resolve(fs.realpathSync(dist))!==path.resolve(path.join(root,'dist')))throw Error('Unexpected installed test bundle target.');fs.unlinkSync(dist);}
    fs.cpSync(path.join(root,'dist'),dist,{recursive:true});for(const folder of ['engine','native','media'])junction(path.join(own,folder),path.join(root,folder));
    developmentPath=path.join(testRoot,'runner-extension');fs.mkdirSync(developmentPath,{recursive:true});
    fs.writeFileSync(path.join(developmentPath,'package.json'),JSON.stringify({name:'native-test-runner',publisher:'ayanami-test',version:'0.0.1',engines:{vscode:'^1.96.2'},main:'index.cjs'}));fs.writeFileSync(path.join(developmentPath,'index.cjs'),'exports.activate=()=>{};');
  }
  if(coexist){
    const original='C:\\Users\\ayanami\\.vscode\\extensions\\openai.chatgpt-26.1021.22027-win32-x64',copy=path.join(testRoot,'extensions','openai.chatgpt-26.1021.22027-win32-x64');
    officialDevelopmentPath=copy;
    const previousCopy=path.join(testRoot,'extensions','openai.chatgpt-26.1021.22027');if(fs.existsSync(previousCopy)&&!fs.existsSync(copy))fs.renameSync(previousCopy,copy);
    fs.mkdirSync(path.join(copy,'out'),{recursive:true});fs.copyFileSync(path.join(original,'package.json'),path.join(copy,'package.json'));
    // The isolated official test copy uses its own pipe; installed original files are only read.
    const source=fs.readFileSync(path.join(original,'out','extension.js'),'utf8');fs.writeFileSync(path.join(copy,'out','extension.js'),source.replaceAll('codex-ipc','codex-ipc-isolated-smoke'));
    for(const folder of ['bin','webview','resources','syntaxes'])junction(path.join(copy,folder),path.join(original,folder));
  }
  if(installed||coexist){
    // A preceding development run may mark the duplicate test package obsolete.
    // Both files belong exclusively to this isolated extension inventory.
    fs.writeFileSync(path.join(testRoot,'extensions','.obsolete'),'{}');
    const inventory=path.join(testRoot,'extensions','extensions.json');if(fs.existsSync(inventory))fs.unlinkSync(inventory);
  }
  const args=['--new-window','--extensionTestsPath='+__filename,'--user-data-dir='+profileDirectory,'--extensions-dir='+path.join(testRoot,'extensions'),'--skip-welcome','--skip-release-notes','--disable-workspace-trust','--disable-gpu',path.join(testRoot,'workspace')];
  args.unshift('--extensionDevelopmentPath='+developmentPath);
  if(officialDevelopmentPath)args.unshift('--extensionDevelopmentPath='+officialDevelopmentPath);
  if(!coexist)args.unshift('--disable-extension','openai.chatgpt');
  if(!noProposals)args.unshift('--enable-proposed-api',ID);
  if(process.argv.includes('--render'))args.unshift('--remote-debugging-address=127.0.0.1','--remote-debugging-port=19378');
  const out=fs.openSync(path.join(testRoot,'stdout.log'),'w'),err=fs.openSync(path.join(testRoot,'stderr.log'),'w');
  const child=spawn(process.env.APEIRIA_SMOKE_CODE||'D:\\Microsoft VS Code\\Code.exe',args,{cwd:root,env,windowsHide:true,stdio:['ignore',out,err]});
  let timer=setTimeout(()=>{console.error('Isolated VS Code smoke timed out.');if(child.pid)spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});process.exitCode=1;},process.argv.includes('--render')?240000:90000);
  child.once('error',error=>{clearTimeout(timer);fixtureServer?.close();console.error(error.message);process.exitCode=1;});
  child.once('exit',code=>{clearTimeout(timer);fixtureServer?.close();fs.closeSync(out);fs.closeSync(err);let report;try{report=JSON.parse(fs.readFileSync(env.APEIRIA_VSCODE_SMOKE_REPORT,'utf8'));}catch{}if(report)console.log(JSON.stringify(report,null,2));else console.log(fs.readFileSync(path.join(testRoot,'stderr.log'),'utf8').slice(-6000));process.exitCode=report?.passed?0:code||1;});
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
