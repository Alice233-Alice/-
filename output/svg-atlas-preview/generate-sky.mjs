import fs from 'node:fs';
import { readPreviewShell } from './preview-shell.mjs';
import { optimizeAtlasSvg } from './optimize-svg.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { skyData as data } from './sky-data.mjs';
import { line, poly, group, defs, atmosphere, palace, ship, terrace, dragon, phoenix, lawFractures, ripple, debris } from './sky-engraving.mjs';
import { tianyuanRift, starCemetery, fallenBones, windBarrier, coreRupture, inversePoint } from './sky-rift.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const text=(x,y,value,size=12,color='#b4bba9',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${value}</text>`;
const diamond=(x,y,r=5,c='#d4c190')=>poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]],'#142630',c,.8);
const layer=(key,art)=>`<g data-stratum="${key}" class="sky-stratum">${art}</g>`;

let lower=windBarrier()+tianyuanRift()+starCemetery()+fallenBones()+coreRupture();
// The ruins orbit the main wound. Only architectural components hang underneath them.
lower+=`<g id="rift-orbiting-ruins">`;
lower+=debris(650,1045,176,53,63);
lower+=group(650,1045,1.07,palace(true),-9);
lower+=group(421,1180,.88,ship(),-27);
lower+=group(1396,1147,.94,terrace(),-15);
lower+=group(1190,1431,.59,palace(true),18);
lower+=group(785,1392,.42,ship(),23);
lower+=debris(1396,1147,98,49,32);
lower+='</g>';
lower+=ripple(1270,908,36,13,'#aec8c5',11);
lower+=line('M1233 908Q1273 892 1306 908Q1270 923 1233 908','#dbd7b7',.55,.85);

let middle='';
middle+=debris(794,631,257,103,103);
middle+=debris(1416,656,189,128,83,true);
middle+=dragon()+phoenix();
// Empty center stays clear of debris. The black opening is not a usable array symbol.
middle+=`<ellipse cx="1116" cy="620" rx="64" ry="44" fill="url(#silent-hole)"/>`;
for(let j=0;j<9;j++)middle+=line(`M${1051-j*3} 616C${1054-j*3} ${574-j} ${1163+j*3} ${566-j} ${1181+j*3} 618`,'#7c9fae',.4,.10+j*.012);
middle+=line('M1060 641C1083 666 1151 667 1177 636','#829f9f',.5,.4);

const routes=`<g id="routes">
  <path class="sky-route conditional-route" data-route="朔日" d="M1264 891C1285 830 1162 776 1075 729"/>
  <path class="sky-route direct-route" data-route="直通上霄" d="M1135 573C1176 479 1274 468 1320 369"/>
  ${text(1230,825,'朔日逆霄',10,'#a5c2bd','letter-spacing="2"')}
  ${text(1250,435,'直通上霄',10,'#c5b492','letter-spacing="3"')}
</g>`;

let labels='<g id="labels">';
for(const r of data.regions){
  labels+=layer(r.key,`<g class="region" data-region="${r.id}" role="button" tabindex="0" aria-label="${r.id}，${r.sub}">
    <rect class="label-hit" x="${r.x-18}" y="${r.y-(r.fontSize||35)-25}" width="${r.id.length*(r.fontSize||35)+65}" height="${(r.fontSize||35)+72}" fill="transparent"/>
    ${text(r.x,r.y-(r.fontSize||35)-8,r.kicker,10,'#aeb79f','class="region-kicker" letter-spacing="4"')}
    ${text(r.x,r.y,r.id,r.fontSize||35,'#e3d1a5',`class="region-name" data-base-size="${r.fontSize||35}" letter-spacing="8"`)}
    ${line(`M${r.x} ${r.y+15}h42m12 0h75`,'#b9b18b',.55,.55)}
    ${text(r.x,r.y+35,r.sub,10,'#9bafa9','class="region-sub" letter-spacing="2"')}
  </g>`);
}
labels+='</g>';

let sites='<g id="sky-sites">';
for(const s of data.sites){
  sites+=layer(s.key,`<g class="site" data-site="${s.id}" data-priority="30" role="button" tabindex="0" aria-label="${s.id}">
    <circle cx="${s.x}" cy="${s.y}" r="17" fill="transparent"/>
    <circle class="site-dot" cx="${s.x}" cy="${s.y}" r="2.4" fill="#c2c5a8" stroke="#15303a" stroke-width="1"/>
    <g class="site-label label-visible">${line(`M${s.x} ${s.y}L${s.lx} ${s.ly-10}h${s.lx<s.x?-13:13}`,'#b2b9a4',.5,.75)}
    ${text(s.lx,s.ly+8,s.id,12,'#d0c7a8','text-anchor="middle" letter-spacing="1.5"')}</g>
  </g>`);
}
sites+='</g>';

let portals='<g id="portals">';
for(const p of data.portals){
  portals+=layer(p.key,`<g class="portal" data-portal="${p.id}" role="button" tabindex="0" aria-label="${p.id}，${p.from}">
    <circle cx="${p.x}" cy="${p.y}" r="19" fill="transparent"/>
    ${diamond(p.x,p.y,6,p.href?.startsWith('underworld')?'#b0a5c6':'#c9bb90')}
    <circle cx="${p.x}" cy="${p.y}" r="12" fill="none" stroke="#aab9ae" stroke-width=".5" stroke-dasharray="2 4"/>
    ${line(`M${p.x} ${p.y+14}L${p.lx} ${p.ly-18}`,'#a0b3ae',.5,.55).replace('<path ',`<path class="portal-leader" data-start-x="${p.x}" data-start-y="${p.y+14}" `)}
    ${text(p.lx,p.ly,p.label,11,'#d8cca4',`class="portal-caption" data-base-y="${p.ly}" data-full-label="${p.label}" data-short-label="${p.shortLabel||p.id}" text-anchor="middle" letter-spacing="1.7"`)}
  </g>`);
}
portals+='</g>';

let frame=`<g id="sky-frame" pointer-events="none">
  <path d="M38 200V38H580M1220 38H1762V295M38 1440v202h400M1300 1642h462v-224" fill="none" stroke="#9e9675" stroke-width=".6" opacity=".45"/>
  <path d="M45 67V45h22M1733 45h22v22M45 1613v22h22M1733 1635h22v-22" fill="none" stroke="#c5b88e" stroke-width="1.6" opacity=".8"/>
  ${text(95,106,'九霄悬天长卷',39,'#e3d0a3','letter-spacing="10"')}
  ${text(98,137,'山 海 藏 图  /  天 界 卷',10,'#8fa7a2','letter-spacing="3"')}
  ${line('M97 160H494M97 165H262','#9eaa91',.5,.5)}
  ${text(98,199,'仰观天阙，星骨犹悬。',12,'#adb59f','letter-spacing="3"')}
  ${text(104,248,'去地高度',10,'#b4b491','text-anchor="middle" letter-spacing="3"')}
  ${line('M105 280V1484','#849d9b',.6,.52)}
  ${text(135,316,'八至九万丈',11,'#c7b58b','letter-spacing="1"')}
  ${text(135,657,'五至八万丈',11,'#a4b8b0','letter-spacing="1"')}
  ${text(135,1175,'三至五万丈',11,'#a4b8b0','letter-spacing="1"')}
  ${text(135,1472,'九天罡风雷海',10,'#9fae9c','letter-spacing="2"')}
  ${text(107,1525,'高 度 示 意',9,'#78918e','text-anchor="middle"')}
  ${text(1432,1517,'横空三万里 · 裂逾百里宽',17,'#d1c6a4','text-anchor="middle" letter-spacing="3"')}
  ${text(1432,1549,'天渊为轴 · 星骸环聚',11,'#91b0ac','text-anchor="middle" letter-spacing="3"')}
  ${line('M1294 1567H1570','#8b9d91',.5,.45)}
  ${text(1432,1594,'九霄属凡界 · 仙界在三界之外',10,'#9fad98','text-anchor="middle" letter-spacing="2"')}
  ${text(985,1626,'九霄无泥石陆基  ·  位置与远近为意绘  ·  虚线通路有时机限制',10,'#77938f','text-anchor="middle" letter-spacing="2"')}
</g>`;
for(let y=280;y<1484;y+=16)frame+=line(`M${y%64===24?97:101} ${y}h${y%64===24?16:8}`,'#8da6a0',.5,.38);
for(const y of [311,652,1170])frame+=diamond(105,y,4,'#b7b393');

const styles=`<style>
  text{font-family:'STKaiti','KaiTi','Noto Serif CJK SC',serif}
  .hidden-layer{display:none}.sky-stratum{transition:opacity .3s}.sky-stratum.is-muted{opacity:.12;pointer-events:none}
  [data-region],[data-site],[data-portal]{cursor:pointer;outline:none}
  .region-name{paint-order:stroke;stroke:#0c202a;stroke-width:3px;stroke-linejoin:round}
  .region:hover .region-name,.region:focus-visible .region-name,.region.selected .region-name{fill:#ffdfaa}
  .site-label text,.portal-caption{paint-order:stroke;stroke:#10242e;stroke-width:3px;stroke-linejoin:round}
  .site-label{opacity:0;pointer-events:none}.label-visible{opacity:1}
  .site:hover .site-dot,.site:focus-visible .site-dot,.site.selected .site-dot{fill:#ffe0a0;stroke:#e1b778;stroke-width:2}
  .portal:hover>circle,.portal:focus-visible>circle,.portal.selected>circle{stroke:#ebd3a2;stroke-width:1.2}
  .hide-place-labels .site-label{display:none}
  .compact-sky .region-sub,.compact-sky .region-kicker{display:none}
  .sky-route{fill:none;stroke-width:.8;stroke-linecap:round}.conditional-route{stroke:#adbfaa;stroke-dasharray:4 7;opacity:.7}.direct-route{stroke:#cbb284;opacity:.65}
  @media(prefers-reduced-motion:reduce){.sky-stratum{transition:none}}
</style>`;
const svg=optimizeAtlasSvg(`<svg xmlns="http://www.w3.org/2000/svg" id="atlas" viewBox="0 0 1800 1680" role="group" aria-labelledby="map-title map-description"><title id="map-title">九霄悬天长卷</title><desc id="map-description">天渊为下霄引力主轴，长三万里、宽逾百里，星陨废墟环聚其侧。三霄皆无泥石陆基；中霄黑孔直达八至九万丈上霄。下霄朔日涟漪及两处阴界入口保留入界条件。纯 SVG 绘制。</desc>${defs}${styles}${atmosphere(1680)}${layer('lower',lower)}${layer('middle',middle)}${layer('upper',lawFractures()+inversePoint())}${routes}${labels}${sites}${portals}${frame}</svg>`);
fs.writeFileSync(path.join(dir,'sky-atlas.svg'),svg);
const shell=readPreviewShell();
fs.writeFileSync(path.join(dir,'sky.html'),shell.replace('<!-- ATLAS_SVG -->',svg).replace('/* ATLAS_DATA */',JSON.stringify(data)).replace('<title>九野山海舆图 · SVG 交互预览</title>','<title>九霄悬天长卷 · SVG 交互预览</title>'));
console.log(JSON.stringify({realm:'sky',svgKB:Math.round(Buffer.byteLength(svg)/1024),regions:data.regions.length,sites:data.sites.length,portals:data.portals.length,paths:(svg.match(/<path\b/g)||[]).length,bitmapElements:0}));
