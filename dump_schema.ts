/* eslint-disable */
// @ts-nocheck
const _ = require('lodash');
const fs = require('node:fs');
const path = require('node:path');
const z = require('zod');

const requestedSchemaFiles = process.argv.slice(2);
const schemaFiles = requestedSchemaFiles.length > 0 ? requestedSchemaFiles : fs.globSync('src/**/schema.ts');

for (const schema_file of schemaFiles) {
  try {
    globalThis._ = _;
    globalThis.z = z;
    const module = require(path.resolve(process.cwd(), schema_file));
    if (_.has(module, 'Schema')) {
      let schema = _.get(module, 'Schema');
      if (_.isFunction(schema)) {
        schema = schema();
      }
      fs.writeFileSync(
        path.join(path.dirname(schema_file), 'schema.json'),
        JSON.stringify(z.toJSONSchema(schema, { io: 'input', reused: 'ref' }), null, 2),
      );
    }
  } catch (e) {
    console.error(`生成 '${schema_file}' 对应的 schema.json 失败: ${e}`);
  }
}
