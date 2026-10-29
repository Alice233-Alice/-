import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {extractEmbeddedModelCatalog,nativeCoreVersion,nativeBaselineSlug} from '../src/native-models.ts';

const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function prepareNativeModels(engineDirectory){
  const root=path.resolve(engineDirectory),manifestFile=path.join(root,'manifest.json');
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  if(manifest.version!==nativeCoreVersion||!Array.isArray(manifest.files))throw Error('Native model preparation requires the pinned, verified CLI manifest.');
  const relative='windows-x86_64/codex.exe',entry=manifest.files.find(file=>file.path===relative);
  if(!entry)throw Error('The CLI executable is not listed in the independent engine manifest.');
  const binary=fs.readFileSync(path.join(root,relative)),binaryHash=hash(binary);
  if(binaryHash!==entry.sha256)throw Error('The CLI executable no longer matches its recorded checksum.');
  const embedded=extractEmbeddedModelCatalog(binary),model=embedded.catalog.models.find(model=>model.slug===nativeBaselineSlug);
  const document={
    version:1,coreVersion:nativeCoreVersion,baselineSlug:nativeBaselineSlug,
    source:{kind:'embedded-cli-catalog',binary:relative,binarySha256:binaryHash,offset:embedded.offset,length:embedded.length,catalogSha256:embedded.sha256,modelCount:embedded.catalog.models.length},
    license:'OpenAI Codex CLI; see CODEX_LICENSE.txt and CODEX_NOTICE.txt distributed alongside this file.',
    model,
  };
  const filename='native-model-baseline.json',bytes=Buffer.from(JSON.stringify(document,null,2)+'\n');
  fs.writeFileSync(path.join(root,filename),bytes);
  const updated={path:filename,sha256:hash(bytes)};
  manifest.files=[...manifest.files.filter(file=>file.path!==filename),updated];
  const temporary=manifestFile+'.native-models.tmp';fs.writeFileSync(temporary,JSON.stringify(manifest,null,2)+'\n');fs.renameSync(temporary,manifestFile);
  console.log(`Retained native model baseline ${nativeBaselineSlug}: ${model.model_messages.instructions_template.length} instruction characters, ${Object.keys(model.model_messages).length} native message groups.`);
  return document;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareNativeModels(process.argv[2]||path.resolve('engine'));
