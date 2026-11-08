import fs from 'node:fs';
import ts from 'typescript';

export function readPreviewShell() {
  const compiled = ['encoder', 'artwork', 'camera'].map(name => {
    const source = fs.readFileSync(new URL(`../../src/灯火通明/atlas/${name}.ts`, import.meta.url), 'utf8');
    return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
      .replace(/^import .*;\r?\n/gm, '').replace(/export (?=function)/g, '').replace(/export \{\};?/g, '');
  }).join('\n');
  return fs.readFileSync(new URL('./preview-shell.html', import.meta.url), 'utf8').replace('/* ATLAS_CAMERA */', compiled);
}
