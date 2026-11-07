/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
const core = require('../src/灯火通明-测试版/opening-plot');

test('实际编译产物按目录收集底稿，Markdown保留原文，模板不参与激活', () => {
  const filename = 'dist/灯火通明-伪同层控制器/index.js';
  const source = fs.readFileSync(filename, 'utf8');
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const statement = ast.statements.find(
    node =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some(item => item.name.getText(ast) === '__webpack_modules__'),
  );
  const initializer = statement.declarationList.declarations.find(
    item => item.name.getText(ast) === '__webpack_modules__',
  ).initializer;
  const factories = Function(`return (${initializer.getText(ast)})`)();
  const cache = new Map();
  const load = id => {
    if (id === './src/灯火通明-测试版/opening-plot.ts') return core;
    if (cache.has(id)) return cache.get(id).exports;
    assert.ok(factories[id], `Missing bundled module: ${id}`);
    const module = { exports: {} };
    cache.set(id, module);
    factories[id](module, module.exports, load);
    return module.exports;
  };
  load.r = exports => Object.defineProperty(exports, '__esModule', { value: true });
  load.d = (exports, getters) => {
    for (const [name, get] of Object.entries(getters)) Object.defineProperty(exports, name, { enumerable: true, get });
  };
  load.o = (object, key) => Object.hasOwn(object, key);
  const directory = 'src/灯火阑珊/开场剧情';
  const expected = Object.fromEntries(
    fs
      .readdirSync(directory)
      .filter(name => /\.md$/i.test(name))
      .map(name => [`./${name}`, fs.readFileSync(path.join(directory, name), 'utf8')]),
  );
  const contextId = Object.keys(factories).find(id => id.includes('/开场剧情 sync '));
  const context = load(contextId);
  assert.deepEqual(context.keys().sort(), Object.keys(expected).sort());
  for (const [name, content] of Object.entries(expected)) assert.equal(context(name), content);
  const registry = load('./src/灯火通明-测试版/opening-plot-drafts.ts').openingPlotDrafts;
  assert.deepEqual([...registry], [...core.collectOpeningPlotDrafts(expected)]);
  assert.ok(!registry.has('_模板') && !registry.has('_写法示例') && !registry.has('README'));
});
