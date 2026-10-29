import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
if(process.platform!=='win32')throw Error('The native launcher targets Windows x64.');
fs.mkdirSync('dist',{recursive:true});
const compiler=path.join(process.env.WINDIR||'C:/Windows','Microsoft.NET','Framework64','v4.0.30319','csc.exe');
execFileSync(compiler,['/nologo','/utf8output','/target:exe','/optimize+','/out:'+path.resolve('dist/apeiria-native-cli.exe'),path.resolve('native/NativeLauncher.cs')],{windowsHide:true,stdio:'inherit'});
fs.writeFileSync('dist/node-path.txt',process.execPath+'\n');
console.log('Built independent native CLI launcher.');
