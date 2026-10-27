import fs from 'node:fs';
import path from 'node:path';
import {installNativePatch,supportedVersion} from '../src/native-patch.ts';
import {dataRoot} from '../src/config.ts';
const extensionRoot=process.argv[2];if(!extensionRoot || !path.isAbsolute(extensionRoot))throw new Error('请提供已验证的官方扩展绝对路径。');
const result=installNativePatch(extensionRoot,fs.readFileSync('dist/native-menu.js','utf8'),path.join(dataRoot(),'native-backups',supportedVersion));
console.log(result.changed?'Native model menu installed; originals backed up. GPT credentials and history were not accessed.':'Native model menu already installed.');
