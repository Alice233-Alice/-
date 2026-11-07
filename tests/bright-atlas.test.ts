/* eslint-disable import-x/no-nodejs-modules */
declare const require: (id: string) => any;
const assert = require('node:assert/strict');
import { parseAtlasLink, resolveAtlasLocation } from '../src/灯火通明/atlas/location';
import { fitAtlasCamera } from '../src/灯火通明/atlas/camera';
import { atlasArea, insideAtlasArea } from '../src/灯火通明/atlas/placement';
import catalog from '../src/灯火通明/atlas/generated/catalog';
import type { AtlasAnchor } from '../src/灯火通明/atlas/types';

const location = (currentLocation: string, currentDomain = '', currentLayer = '') =>
  resolveAtlasLocation({ currentLocation, currentDomain, currentLayer });
assert.equal(location('归墟客栈', '神州', '地层').realm, 'surface');
assert.equal(location('听风救助所', '神州').precise, false);
assert.equal(location('听风救助所', '神州').anchor?.id, '听风救助所');
assert.equal(location('听风救助所', '神州').estimated, true);
assert.equal(location('归墟之海').domain, '永夜海域');
assert.equal(location('北冥冰海').domain, '北冥冰海');
assert.equal(location('神州·大夏帝都', '神州').precise, true);
assert.equal(location('大夏帝都', '东苍').precise, false);
assert.equal(location('归墟', '', '下层').realm, 'underworld');
assert.equal(location('镜中荒原', '倒悬天墟·五行逆反界').domain, '倒悬天墟');
assert.equal(location('星辰冢', '天渊').anchor?.id, '星辰冢');
assert.equal(location('星辰冢', '天渊').precise, true);
assert.equal(location('某地', '', '下霄').domain, '天渊');
assert.equal(location('某地', '', '中霄').domain, '太古战场');
assert.equal(location('未知虚空', '', '天层').realm, 'sky');
assert.equal(location('未知虚空', '', '天层').anchor, undefined);
assert.equal(location('陌生水域', '无尽洋').domain, '无尽洋');
assert.equal(location('雪线关隘', '雪线').domain, '雪线');

// Unknown names produce repeatable, distinct map positions, without gaining false precision.
const point = (result: ReturnType<typeof location>) => [result.anchor?.x, result.anchor?.y];
// Faction locations must respect the drawn land boundaries, without inventing
// measured coordinates. Offshore and underworld placements keep their own realm.
const sects = (catalog as AtlasAnchor[]).filter(item => item.kind === 'sect');
assert.equal(sects.length, 30);
assert.equal(sects.filter(item => item.realm === 'surface').length, 26);
for (const sect of sects) {
  const pin = location(sect.id, sect.domain);
  assert.equal(pin.referenceId, sect.id);
  assert(pin.estimated && !pin.precise, `${sect.id} must remain a schematic placement`);
  assert.deepEqual(point(pin), [sect.x, sect.y]);
  if (['神州', '西庚', '南炎', '东苍'].includes(sect.domain!)) {
    const region = (catalog as AtlasAnchor[]).find(item => item.kind === 'region' && item.id === sect.domain)!;
    assert(insideAtlasArea([sect.x, sect.y], atlasArea(region)), `${sect.id} outside ${sect.domain}`);
  }
}
assert.equal(location('赤霄阁').domain, '雷暴海');
assert.equal(location('坐忘冥海阁').domain, '北冥冰海');
assert.equal(location('浮云朝露阁').realm, 'surface');
assert.equal(location('忘川风月楼').realm, 'underworld');
assert.equal(location('浮云朝露阁·山门外').referenceId, '浮云朝露阁');
assert.deepEqual(point(location('听风救助所', '神州')), point(location('听风救助所', '神州')));
assert.deepEqual(point(location('听风救助所', '神州')), point(location('神州 / 听风救助所', '中州')));
assert.notDeepEqual(point(location('听风救助所', '神州')), point(location('流云客栈', '神州')));
assert.equal(location('神州', '神州').estimated, false);
assert.equal(location('', '神州').estimated, false);
assert.equal(location('行踪未明', '神州').precise, false);
assert.equal(location('流云客栈').anchor, undefined);
assert.equal(location('大夏帝都', '', '天层').anchor, undefined);
assert.equal(location('问道峰', '神州').precise, true);
assert.equal(location('白虎天堑', '西庚').precise, true);
assert.equal(location('神州·大夏帝都·流云客栈', '神州').precise, false);
assert.equal(location('神州·大夏帝都·流云客栈', '神州').referenceId, '大夏帝都');
const city = location('大夏帝都', '神州').anchor!;
const east = location('大夏帝都东门外客栈', '神州').anchor!;
const west = location('大夏帝都西门外客栈', '神州').anchor!;
assert(east.x > city.x && west.x < city.x);
assert(Math.hypot(east.x - city.x, east.y - city.y) < 75);
const northern = location('东北部荒谷', '神州').anchor!;
const southern = location('西南部荒谷', '神州').anchor!;
assert(northern.x > southern.x && northern.y < southern.y);
assert(!location('南宫别院', '神州').basis.includes('南侧'));
const nearDescription = resolveAtlasLocation({
  currentLocation: '流云客栈',
  currentDomain: '神州',
  locationDescription: '坐落于大夏帝都的东北郊外。',
});
assert.equal(nearDescription.referenceId, '大夏帝都');
assert(nearDescription.anchor!.x > city.x && nearDescription.anchor!.y < city.y);
const ordinary = { currentLocation: '听风救助所', currentDomain: '神州' };
assert.deepEqual(
  point(resolveAtlasLocation(ordinary)),
  point(resolveAtlasLocation({ ...ordinary, locationDescription: '夜幕低垂，风雨渐息。' })),
);
assert.notEqual(
  resolveAtlasLocation({ ...ordinary, locationDescription: '明日将前往问道峰修行。' }).referenceId,
  '问道峰',
);
assert.deepEqual(ordinary, { currentLocation: '听风救助所', currentDomain: '神州' });

// Every simulated pin stays inside its own drawn domain, including at directional edges.
let simulated = 0;
for (const region of (catalog as AtlasAnchor[]).filter(item => item.kind === 'region')) {
  const area = atlasArea(region);
  for (const name of [
    '东侧荒野',
    '西侧客栈',
    '南部山谷',
    '北境溪谷',
    '东北边关',
    '西南林海',
    ...Array.from({ length: 35 }, (_, n) => `隐修地${n}`),
  ]) {
    const result = location(name, region.id);
    assert(result.estimated && !result.precise, `${region.id}/${name}`);
    assert.equal(result.realm, region.realm);
    assert(insideAtlasArea([result.anchor!.x, result.anchor!.y], area), `${region.id}/${name} outside its map region`);
    assert.deepEqual(point(result), point(location(name, region.id)));
    simulated++;
  }
}
assert.deepEqual(parseAtlasLink('sky.html#%E5%A4%A9%E6%B8%8A'), { realm: 'sky', id: '天渊' });
assert.deepEqual(parseAtlasLink('underworld.html#倒悬天墟'), { realm: 'underworld', id: '倒悬天墟' });
assert.deepEqual(parseAtlasLink('index.html#归墟'), { realm: 'surface', id: '归墟' });
assert.equal(parseAtlasLink('https://example.com/sky.html'), null);
assert.equal(parseAtlasLink('sky.html#%broken'), null);
// Full-world compositor transforms must preserve the old SVG camera's letterboxing and focal point.
assert.deepEqual(fitAtlasCamera({ x: 0, y: 0, w: 1600, h: 1000 }, 1800, 600), { scale: 0.6, x: 420, y: 0 });
assert.deepEqual(fitAtlasCamera({ x: 300, y: 200, w: 800, h: 500 }, 1600, 1000), { scale: 2, x: -600, y: -400 });
for (const [width, height] of [
  [390, 360],
  [1680, 650],
  [1920, 1080],
]) {
  const view = { x: 400, y: 950, w: 1200, h: 520 };
  const transform = fitAtlasCamera(view, width, height);
  assert.ok(Math.abs((view.x + view.w / 2) * transform.scale + transform.x - width / 2) < 0.00001);
  assert.ok(Math.abs((view.y + view.h / 2) * transform.scale + transform.y - height / 2) < 0.00001);
}
console.log(
  `Atlas: exact landmarks, stable estimates, directions, ${simulated} bounded placements, navigation and camera checks passed.`,
);
