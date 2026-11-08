/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;

const assert = require('node:assert/strict');
const lodash = require('lodash');
(globalThis as any)._ = lodash;

const { Schema } = require('../src/灯火阑珊/schema');
const { installMvuCommandCompatibility } = require('../src/灯火阑珊-变量结构/guard');

const subscriptions: Array<{ event: string; callback: (...args: any[]) => void; stopped: boolean }> = [];
(globalThis as any).Mvu = {
  events: {
    COMMAND_PARSED: 'command_parsed',
    VARIABLE_UPDATE_STARTED: 'variable_update_started',
    VARIABLE_UPDATE_ENDED: 'variable_update_ended',
  },
};
(globalThis as any).eventOn = (event: string, callback: (...args: any[]) => void) => {
  const subscription = { event, callback, stopped: false };
  subscriptions.push(subscription);
  return { stop: () => (subscription.stopped = true) };
};
(globalThis as any).getVariables = () => {
  throw new Error('命令兼容不应读取聊天快照');
};

const firstFrame: Record<string, unknown> = {};
(globalThis as any).window = firstFrame;
const stopFirst = installMvuCommandCompatibility();
const stopDuplicate = installMvuCommandCompatibility();
assert.equal(subscriptions.length, 2, '同一 iframe 重复安装只保留命令兼容与好感结算各一份监听');

(globalThis as any).window = {};
const stopSecond = installMvuCommandCompatibility();
assert.deepEqual(
  subscriptions.map(subscription => subscription.event),
  ['command_parsed', 'variable_update_ended', 'command_parsed', 'variable_update_ended'],
  '每个 iframe 分别注册命令兼容与好感结算',
);

const variables = {
  stat_data: Schema.parse({
    本尊: { 等级: 10, 修为: 400 },
    红颜: { 白清弦: { 等级: 34, 修为: 200 } },
    _系统设置: { 修炼系统版本: 3, 变量结构版本: 5 },
  }),
};
const originalVariables = lodash.cloneDeep(variables);
const commands = [
  { type: 'add', args: ['stat_data.本尊.修为', '800'] },
  { type: 'set', args: ['stat_data.本尊.等级', '13'] },
  { type: 'set', args: ['stat_data.红颜.白清弦.等级', '30'] },
  { type: 'add', args: ['stat_data.红颜.白清弦.修为', '-40'] },
];
const originalCommands = lodash.cloneDeep(commands);
const commandSubscriptions = subscriptions.filter(subscription => subscription.event === 'command_parsed');
for (const subscription of commandSubscriptions) subscription.callback(variables, commands, '');
assert.deepEqual(variables, originalVariables, '命令兼容不得写回变量或读取旧快照覆盖新结果');
assert.deepEqual(commands, originalCommands, '重复运行不得篡改正常修为增量、跨级或跌境命令');

const result = lodash.cloneDeep(variables);
for (const command of commands) {
  const [path, literal] = command.args;
  const value = JSON.parse(literal);
  lodash.set(result, path, command.type === 'add' ? lodash.get(result, path) + value : value);
}
const parsed = Schema.parse(result.stat_data);
assert.equal(parsed.本尊.等级, 13);
assert.equal(parsed.本尊.修为, 1200, '等级上升也应保留当轮明确写入的修为');
assert.equal(parsed.红颜.白清弦.等级, 30);
assert.equal(parsed.红颜.白清弦.修为, 160);
assert.deepEqual(Schema.parse(parsed), parsed);

const legacyCommands = [{ type: 'add', args: ['/本尊/灵石/下品灵石', '20'] }];
commandSubscriptions[0].callback(variables, legacyCommands, '');
const compatibleCommands = lodash.cloneDeep(legacyCommands);
commandSubscriptions[1].callback(variables, legacyCommands, '');
assert.equal(legacyCommands[0].args[0], 'stat_data.本尊.灵石.下品灵石');
assert.deepEqual(legacyCommands, compatibleCommands, '旧字段兼容经过两遍后结果相同');
assert.deepEqual(variables, originalVariables);

stopDuplicate();
assert.equal(subscriptions[0].stopped, false);
stopFirst();
stopSecond();
assert.ok(subscriptions.every(subscription => subscription.stopped));
assert.deepEqual(firstFrame, {});

console.info('命令兼容回归通过：重复安装、增量、跨级、跌境、快照隔离与清理');
