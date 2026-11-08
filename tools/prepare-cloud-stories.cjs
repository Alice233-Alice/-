/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ project: 'tsconfig.schema-test.json', files: true, transpileOnly: true });
const { serializeStoryLibrary } = require('../src/灯火通明-测试版/cloud-stories');
const folder = path.resolve('examples/cloud-stories');
const { blueprintFile, ...metadata } = JSON.parse(fs.readFileSync(path.join(folder, 'sample.json'), 'utf8'));
const blueprint = fs.readFileSync(path.join(folder, blueprintFile), 'utf8');
const output = path.resolve('output/cloud-stories');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(
  path.join(output, 'library.json'),
  serializeStoryLibrary({
    formatVersion: 1,
    stories: [{ ...metadata, blueprint }],
  }),
);
console.log('Prepared output/cloud-stories/library.json');
