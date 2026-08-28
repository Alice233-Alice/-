/* eslint-disable import-x/no-nodejs-modules */

export {};

declare const require: (id: string) => any;
declare const process: { exitCode?: number };

const assert = require('node:assert/strict');
const { extractGalleryCardsFromContent } = require('../src/灯火阑珊/stores/gallery-cards');

const card = (name: string) => ({
  name,
  img_code: 'normal',
  back_text: '此刻心声',
});

const wrapped = (payload: string) => `<visual_cards>\n${payload}\n</visual_cards>`;

assert.deepEqual(
  extractGalleryCardsFromContent(`${wrapped('...')}<game>${wrapped(JSON.stringify([card('晚棠')]))}</game>`).map(
    (item: { name: string }) => item.name,
  ),
  ['晚棠'],
);

assert.deepEqual(
  extractGalleryCardsFromContent(
    '<output><visual_cards><json>{"cards":[' + JSON.stringify(card('羽岚')) + ']}</json></visual_cards></output>',
  ).map((item: { name: string }) => item.name),
  ['羽岚'],
);

assert.deepEqual(
  extractGalleryCardsFromContent(
    '<visual_cards>\n```json\n' + JSON.stringify([card('晚棠')]) + '\n```\n</visual_cards>',
  ).map((item: { name: string }) => item.name),
  ['晚棠'],
);

assert.deepEqual(
  extractGalleryCardsFromContent('&lt;visual_cards&gt;' + JSON.stringify([card('羽岚')]) + '&lt;/visual_cards&gt;').map(
    (item: { name: string }) => item.name,
  ),
  ['羽岚'],
);

if (!process.exitCode) console.info('lantern gallery cards tests passed');
