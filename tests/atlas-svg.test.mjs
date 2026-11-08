/* eslint-disable import-x/no-nodejs-modules */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { optimize } from 'svgo';
import { capitalDefinitions } from '../output/svg-atlas-preview/capitals.mjs';
import { optimizeAtlasSvg } from '../output/svg-atlas-preview/optimize-svg.mjs';
import { parseFactionOverview } from '../output/svg-atlas-preview/faction-overview.mjs';
import { prepareAtlasSymbols } from '../output/svg-atlas-preview/prepare-symbols.mjs';

test('宗门概览兼容新旧标点和括号别称，拒绝无法识别的内容', () => {
  const lore = parseFactionOverview(
    `content: |-\n  - 旧宗：【剑道】旧式说明。\n  - 新宗【商道】：新版说明。\n  - 古族(别称)【异族】：古族说明。\n  - 宗门生态：不是宗门条目。`,
  );
  assert.deepEqual([...lore.keys()], ['旧宗', '新宗', '古族']);
  assert.deepEqual(lore.get('新宗'), { sub: '商道', desc: '新版说明。' });
  assert.deepEqual(lore.get('旧宗'), { sub: '剑道', desc: '旧式说明。' });
  assert.throws(() => parseFactionOverview('content: 未提供宗门条目'), /No factions/);
  assert.throws(() => parseFactionOverview('- 同名【甲】：甲\n- 同名【乙】：乙'), /Duplicate faction/);
});

test('当前宗门概览中的条目全部进入地图，已移除的条目不再生成', async () => {
  const source = fs.readFileSync(new URL('../src/灯火阑珊/灯火阑珊-世界书/宗门势力概览.yaml', import.meta.url), 'utf8');
  const expected = parseFactionOverview(source);
  const { sects } = await import('../output/svg-atlas-preview/sects-data.mjs');
  assert.deepEqual(sects.map(sect => sect.id).sort(), [...expected.keys()].sort());
  for (const sect of sects) assert.equal(sect.desc, expected.get(sect.id).desc);
});

function elements(svg) {
  const result = [];
  optimize(svg, {
    plugins: [
      {
        name: 'inspect',
        fn: () => ({
          element: {
            enter: node => {
              result.push({ name: node.name, attributes: { ...node.attributes } });
            },
          },
        }),
      },
    ],
  });
  return result;
}

test('路径精简保留运行时使用的定义、交互属性与绘制顺序', () => {
  const original = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="group" aria-labelledby="title">
    <title id="title">建筑细部</title>
    <defs><g id="runtime-only"><path d="M10,10L10,20L20,20L20,10Z"/></g></defs>
    <style>.sect:hover{opacity:.5}</style>
    <g class="sect" data-sect="宗门" role="button" tabindex="0" transform="scale(.5)">
      <path fill="none" stroke="gold" stroke-linecap="round" d="M10 10L10 10"/>
      <path opacity=".2" d="M10,10L10,20L20,20L20,10Z"/>
      <path opacity=".2" d="M10,10L10,20L20,20L20,10Z"/>
    </g>
  </svg>`;
  const optimized = optimizeAtlasSvg(original);
  const structure = source =>
    elements(source).map(({ name, attributes: { d, ...attributes } }) => ({ name, attributes }));
  assert.deepEqual(structure(optimized), structure(original));
  assert.match(optimized, /建筑细部/);
  assert.match(optimized, /\.sect:hover\{opacity:\.5\}/);
  const dot = elements(optimized).find(node => node.attributes['stroke-linecap'] === 'round');
  assert.match(dot.attributes.d, /[lhv]/i, '零长度描边仍保留线段，避免圆形端点消失');
  assert.ok(optimized.length < original.length);
});

test('数值精简只影响绘图属性，保留数字形态的定位 ID 和元数据', () => {
  const svg = optimizeAtlasSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><path id="00007" d="M1 1L9 9"/></defs>
    <use href="#00007" data-site="00007" aria-label="00007" opacity="0.39999999999999997" stroke-width="0.30000000000000004"/>
    <circle cx="1.23456789" r=".175" fill-opacity=".125"/>
  </svg>`);
  const nodes = elements(svg);
  assert.equal(nodes.find(node => node.name === 'path').attributes.id, '00007');
  const use = nodes.find(node => node.name === 'use').attributes;
  assert.equal(use.href, '#00007');
  assert.equal(use['data-site'], '00007');
  assert.equal(use['aria-label'], '00007');
  assert.equal(Number(use.opacity), 0.4);
  assert.equal(Number(use['stroke-width']), 0.3);
  const circle = nodes.find(node => node.name === 'circle').attributes;
  assert.equal(Number(circle.r), 0.175, '细小圆点不能被路径精度压成零');
  assert.equal(Number(circle['fill-opacity']), 0.125);
});

test('幽界只生成需要的帝都图形，地界仍保留全部五座主城', () => {
  const all = capitalDefinitions();
  const subset = capitalDefinitions(['imperial']);
  const ids = svg => [...svg.matchAll(/id="(capital-[^"]+)"/g)].map(match => match[1]);
  assert.equal(ids(all).length, 5);
  assert.deepEqual(ids(subset), ['capital-imperial']);
  assert.ok(all.includes(subset), '选取定义不改变城郭本身');
});

for (const [realm, filename] of [
  ['surface', 'shanhai-atlas.svg'],
  ['underworld', 'underworld-atlas.svg'],
  ['sky', 'sky-atlas.svg'],
]) {
  test(`${realm} 导出资源可解压，静态引用和详情面板的动态图形完整`, () => {
    const svg = fs.readFileSync(new URL(`../output/svg-atlas-preview/${filename}`, import.meta.url), 'utf8');
    const manifest = JSON.parse(fs.readFileSync(new URL('../assets/atlas/manifest.json', import.meta.url), 'utf8'));
    const resource = manifest.realms[realm];
    const packed = fs.readFileSync(new URL(`../assets/atlas/${resource.file}`, import.meta.url));
    assert.equal('sha256-' + createHash('sha256').update(packed).digest('base64'), resource.integrity);
    const { markup, data } = JSON.parse(gunzipSync(packed).toString('utf8'));
    const prepared = prepareAtlasSymbols(svg);
    assert.ok(markup.includes(prepared.markup), '前端打包的是本次生成的交互 SVG');
    assert.deepEqual(data.symbols, prepared.symbols, '延后解码的城池、宗门完整打包');
    const embedded = elements(prepared.markup);
    const restored = embedded.flatMap(node => [
      node,
      ...(data.symbols[node.attributes.id] ? elements(`<svg>${data.symbols[node.attributes.id]}</svg>`).slice(1) : []),
    ]);
    assert.deepEqual(restored, elements(svg), '分离图形保留全部节点、坐标、顺序和引用');
    assert.equal(data.realm, realm);
    const nodes = elements(svg);
    const ids = new Set(nodes.map(node => node.attributes.id).filter(Boolean));
    for (const { attributes } of nodes) {
      for (const [name, value] of Object.entries(attributes)) {
        if (['href', 'xlink:href'].includes(name) && value.startsWith('#')) {
          assert.ok(ids.has(value.slice(1)), `缺少 use 定义 ${value}`);
        }
        for (const [, id] of value.matchAll(/url\(#([^\s)]+)\)/g)) {
          assert.ok(ids.has(id), `缺少渐变、纹理或裁剪定义 ${id}`);
        }
      }
    }
    for (const city of data.capitals ?? []) assert.ok(ids.has(`capital-${city.key}`), city.id);
    for (const sect of data.sects ?? [])
      assert.ok(ids.has(sect.form === 'court' ? 'capital-imperial' : sect.key), sect.id);
    for (const array of data.arrays ?? []) assert.ok(ids.has(`array-${array.tier}`), array.id);
    if (realm === 'underworld')
      assert.deepEqual(
        [...ids].filter(id => id.startsWith('capital-')),
        ['capital-imperial'],
      );
  });
}
