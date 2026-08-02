/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { cwd(): string; exitCode?: number };

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const { executeUpdateVariable, getByPointer } = require('./lantern-mvu-harness');

type ReplayScenario = {
  名称: string;
  旧变量?: unknown;
  更新: string;
  语义?: Record<string, unknown>;
  期望: {
    通过: boolean;
    值?: Record<string, unknown>;
    不存在?: string[];
    包含警告?: string[];
    错误包含?: string[];
    命令守卫介入?: boolean;
    Schema修复?: boolean;
  };
};

const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'lantern-mvu-replay.yaml');
const fixture = YAML.parse(fs.readFileSync(fixturePath, 'utf8')) as { 场景: ReplayScenario[] };
let passed = 0;

for (const scenario of fixture.场景) {
  let result: any = null;
  let thrown: unknown = null;
  try {
    result = executeUpdateVariable(scenario.旧变量 ?? {}, scenario.更新, scenario.语义 ?? {});
  } catch (error) {
    thrown = error;
  }

  try {
    const errorText = [thrown ? String(thrown) : '', ...(result?.errors ?? [])].filter(Boolean).join('\n');
    if (scenario.期望.通过) {
      assert.equal(thrown, null, errorText);
      assert.deepEqual(result.errors, [], errorText);
      assert.equal(result.fullRollback, false, '不应恢复整份旧快照');

      for (const [pointer, expectedValue] of Object.entries(scenario.期望.值 ?? {})) {
        assert.deepEqual(getByPointer(result.finalData, pointer), expectedValue, pointer);
      }
      for (const pointer of scenario.期望.不存在 ?? []) {
        assert.equal(getByPointer(result.finalData, pointer), undefined, pointer);
      }
      for (const warningFragment of scenario.期望.包含警告 ?? []) {
        assert.ok(
          result.warnings.some((warning: string) => warning.includes(warningFragment)),
          warningFragment,
        );
      }
      if (typeof scenario.期望.命令守卫介入 === 'boolean') {
        assert.equal(result.commandGuardIntervened, scenario.期望.命令守卫介入);
      }
      if (typeof scenario.期望.Schema修复 === 'boolean') {
        assert.equal(result.schemaRepairIntervened, scenario.期望.Schema修复);
      }
    } else {
      assert.ok(thrown || (result?.errors?.length ?? 0) > 0, '预期失败，但更新通过了全部检查');
      for (const errorFragment of scenario.期望.错误包含 ?? []) {
        assert.ok(errorText.includes(errorFragment), `${errorFragment}\n实际错误：${errorText}`);
      }
    }

    passed += 1;
    console.info(`✓ ${scenario.名称}`);
  } catch (error) {
    console.error(`✗ ${scenario.名称}`);
    console.error(error);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.info(`灯火阑珊 MVU 回放通过：${passed}/${fixture.场景.length}`);
}
