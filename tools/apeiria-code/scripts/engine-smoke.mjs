import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('..',import.meta.url));
const child=spawn(process.execPath,['--experimental-transform-types','--test','test/engine-live.test.ts'],{
  cwd:directory,env:{...process.env,APEIRIA_ENGINE_SMOKE:'1'},stdio:'inherit',windowsHide:true,
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('close',code=>{process.exitCode=code??1;});
