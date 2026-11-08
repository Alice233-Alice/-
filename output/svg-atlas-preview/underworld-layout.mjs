// Deliberate whitespace separates terrain, labels, portals and the mirror inset.
export const plate={width:1800,height:1200};
export const positions={
 '归墟':{x:850,y:328,s:1.06,title:[850,500],entry:[850,174],spring:[1110,430],springFrom:[996,408]},
 '碎金渊':{x:350,y:457,s:.96,title:[333,684],entry:[296,244],spring:[575,588],springFrom:[484,558]},
 '神木枯冢':{x:1440,y:449,s:.89,title:[1340,238],entry:[1518,205],spring:[1692,608],springFrom:[1574,574]},
 '黄泉古迹':{x:747,y:799,s:1.01,title:[747,982],entry:[454,758],spring:[1040,830],springFrom:[944,815]},
 '无尽炎渊':{x:1335,y:819,s:1,title:[1335,978],entry:[1669,789],spring:[1642,932],springFrom:[1521,893]},
};
export const movePoint=(c,x,y)=>{const p=positions[c.id];return[p.x+(x-c.x)*p.s,p.y+(y-c.y)*p.s];};
export function place(c,art,kind='art'){const p=positions[c.id];return `<g data-cavern-${kind}="${c.id}" transform="translate(${p.x} ${p.y}) scale(${p.s}) translate(${-c.x} ${-c.y})">${art}</g>`;}
const f=v=>+v.toFixed(2);
const text=(s,x,y,size=10,fill='#c6b89b',attrs='')=>`<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" ${attrs}>${s}</text>`;
const line=(d,c='#a69879',w=.6,o=1,attrs='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" opacity="${o}" ${attrs}/>`;
const mirrorPoint=(x,y)=>[x*1.3-160,y+200];
const labelOffsets={
 '外渊':[-31,-25],'中渊':[-36,26],'内渊':[30,26],'镇无渊核':[44,-28],
 '残剑滩':[-28,-24],'断刃崖':[27,-24],'万剑渊':[-28,27],'金气本源':[33,25],
 '枯骨林':[-33,-27],'畸变藤狱':[32,-27],'岁月灰烬':[32,30],'枯荣本源':[-32,29],
 '黄泉路':[-26,24],'奈何桥 · 忘川虚影':[-28,-28],'九口轮回井':[-25,28],'望乡台':[-24,-27],'冥河滩涂':[34,26],'亘古石门':[30,-26],
 '赤焰层':[-28,-28],'白焰层':[32,-30],'青焰层':[-33,28],'黑焰层':[38,34],'虚无之火':[5,-30],
};
export function cartography(data,chambers,reflections,addSite){
 data.width=plate.width;data.height=plate.height;
 for(const region of data.regions){const c=chambers.find(c=>c.id===region.id);if(c){const p=positions[c.id],top=Math.min(p.y-c.ry*p.s*1.35,p.title[1]-40),bottom=Math.max(p.y+c.ry*p.s*1.35,p.title[1]+40);region.x=p.x;region.y=p.y;region.view={x:p.x-c.rx*p.s*1.25,y:top,w:c.rx*p.s*2.5,h:bottom-top};}else region.view={x:475,y:1007,w:1235,h:183};}
 for(const site of data.sites){const c=chambers.find(c=>c.id===site.domain);[site.x,site.y]=site.mirror?mirrorPoint(site.x,site.y):movePoint(c,site.x,site.y);site.view={x:site.x-145,y:site.y-110,w:290,h:220};}
 let labels='<g id="labels">';
 const kickers=['壹 · 万物终焉','贰 · 万剑归冢','肆 · 枯荣藤狱','叁 · 梦渡生死','伍 · 地心火狱'];
 chambers.forEach((c,i)=>{
  const [x,y]=positions[c.id].title;
  labels+=`<g class="region" data-region="${c.id}" tabindex="0" role="button" aria-label="查看${c.id}"><rect class="label-hit" x="${x-125}" y="${y-31}" width="250" height="66" rx="2"/>${text(kickers[i],x,y-16,9,c.accent,'text-anchor="middle" letter-spacing="3"')}${text(c.id,x,y+15,32,'#dcd0b4','class="region-name" text-anchor="middle" letter-spacing="6"')}${line(`M${x-58} ${y+28}h44m28 0h44`,'#b5a181',.6,.6)}</g>`;
 });
 labels+=`<g class="region" data-region="倒悬天墟" tabindex="0" role="button" aria-label="查看倒悬天墟"><rect class="label-hit" x="104" y="1043" width="324" height="72"/>${text('镜面阴界 · 五渊悬天',262,1064,10,'#a99aad','text-anchor="middle" letter-spacing="3"')}${text('倒悬天墟',262,1100,32,'#cbb9ce','text-anchor="middle" letter-spacing="7"')}</g>`;
 labels+=text('五渊极底逆泉 · 异变薄弱期或特殊秘法入界',1100,1023,11,'#a59aa9','text-anchor="middle" letter-spacing="2"');
 for(const m of reflections){const[x]=mirrorPoint(m.x,0);labels+=text(m.source+'逆像',x,1163,10,'#7c9298','class="mirror-caption" text-anchor="middle" letter-spacing="1"');}
 labels+=text('另通天渊坍缩断口',262,1136,10,'#87929c','text-anchor="middle"');
 labels+=text('沉星渊薮 · 寂灭神墟 · 逆规奇点',262,1157,9,'#75848e','text-anchor="middle"');
 labels+='</g>';
 let sites='<g id="sites">';
 for(const s of data.sites){
  const [dx,dy]=s.mirror?[0,38]:labelOffsets[s.id]||[24,-23],anchor=dx<0?'end':dx===0?'middle':'start';
  const caption=s.mirror?text(s.id,0,38,16,'#d1c3b0','class="mirror-caption" text-anchor="middle" letter-spacing="2"'):`<g class="site-label">${line(`M0 0L${dx*.7} ${dy*.7}L${dx} ${dy-3}`,'#c8b68f',.55,.8)}${text(s.id,dx+(dx<0?-4:4),dy,10,'#dbccb2',`class="site-caption" text-anchor="${anchor}"`)}</g>`;
  sites+=`<g class="site ${s.mirror?'mirror-site':''}" data-site="${s.id}" data-priority="${s.id.includes('桥')||s.id.includes('核')||s.id.includes('石门')?30:10}" tabindex="0" role="button" aria-label="查看${s.id}" transform="translate(${f(s.x)} ${f(s.y)})"><title>${s.id} · ${s.domain}</title><circle class="site-hit" r="${s.mirror?43:12}"/><path class="site-mark" d="M0-3L3 0 0 3-3 0Z"/>${caption}</g>`;
 }
 sites+='</g>';
 let portals='<g id="portals">',routes='<g id="routes">';
 for(const p of data.portals){
  const c=chambers.find(c=>c.id===p.target),pos=positions[p.target];[p.x,p.y]=pos.entry;
  const end=movePoint(c,c.x+(p.target==='黄泉古迹'?-c.rx*.6:p.target==='无尽炎渊'?c.rx*.73:0),c.y-c.ry*.61);
  routes+=line(`M${p.x} ${p.y}Q${f((p.x+end[0])/2)} ${f((p.y+end[1])/2-6)} ${f(end[0])} ${f(end[1])}`,'#ccb78e',.8,.7,'stroke-dasharray="2 5"');
  portals+=`<g class="portal" data-portal="${p.id}" tabindex="0" role="button" aria-label="查看${p.label}" transform="translate(${p.x} ${p.y})"><circle class="site-hit" r="17"/><use href="#abyss-entry"/><g class="portal-caption">${text(p.label,0,-23,12,'#dcc7a3','text-anchor="middle" letter-spacing="1"')}</g></g>`;
 }
 for(const c of chambers){
  const p=positions[c.id],id=c.id+'极底逆泉',[x,y]=p.spring,[fx,fy]=p.springFrom;
  addSite(id,c.id,x,y,c.id+'极底逆泉可潜入倒悬天墟，位置与深度为示意。',[['去向','倒悬天墟 · 五行逆反界'],['门槛','元婴境以上或至宝护体；须异变薄弱期或特殊秘法。']],{reverse:true,view:{x:475,y:1007,w:1235,h:183}});
  routes+=line(`M${fx} ${fy}L${x-18} ${y}H${x-9}`,'#9e87a7',.6,.7,'stroke-dasharray="1 4"');
  portals+=`<g class="portal spring" data-site="${id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="查看${id}"><title>${id}</title><circle class="site-hit" r="15"/><use href="#inverse-spring"/>${text('极底逆泉',0,31,10,'#b8a0c4','class="portal-caption" text-anchor="middle"')}</g>`;
 }
 portals+='</g>';routes+='</g>';
 let frame=`<g class="annotation"><rect x="26" y="25" width="1748" height="1150" fill="none" stroke="#a49579" stroke-opacity=".38" stroke-width=".6"/>`;
 for(const[x,y,sx,sy]of[[26,25,1,1],[1774,25,-1,1],[26,1175,1,-1],[1774,1175,-1,-1]])frame+=`<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${line('M0 30V0h40M5 23V5h27M10 15v-5h9','#c5b18c',1)}</g>`;
 frame+=`<g transform="translate(97 106)"><rect x="-24" y="-28" width="48" height="52" fill="none" stroke="#9e7768" stroke-width=".8"/><rect x="-20" y="-24" width="40" height="44" fill="none" stroke="#9e7768" stroke-width=".4"/>${text('九泉',0,-5,16,'#bb9178','text-anchor="middle"')}${text('藏图',0,15,16,'#bb9178','text-anchor="middle"')}</g>`;
 frame+=text('幽界五渊舆图',145,112,36,'#d9c9a6','letter-spacing="8"')+text('九 泉 沉 渊 · 三 界 阴 面',148,146,11,'#8f9b9f','letter-spacing="3"')+line('M73 168H485M73 173H228','#9b927c',.5,.5);
 frame+=text('万物沉于渊，五行归其源。',90,270,12,'#8b9692','letter-spacing="6" style="writing-mode:vertical-rl"');
 frame+=text('地表门户',1660,105,12,'#bcaa8b','text-anchor="middle"')+text('↓',1660,130,20,'#86968e','text-anchor="middle"')+text('幽界五渊',1660,152,12,'#bcaa8b','text-anchor="middle"')+text('↓ 极底逆泉',1660,177,10,'#9988a4','text-anchor="middle"')+text('镜面阴界',1660,201,12,'#b1a0b9','text-anchor="middle"');
 frame+=text('渊 途 凡 例',117,849,14,'#c7b38d','letter-spacing="4"')+line('M117 864H346','#b3a07f',.6,.5);
 frame+=`<g transform="translate(131 888)" color="#c9b48d"><use href="#abyss-entry"/></g>`+text('地界下潜门户',159,892,12,'#aaa78e');
 frame+=`<g transform="translate(131 923)" color="#b19abc"><use href="#inverse-spring"/></g>`+text('极底逆泉 · 潜入阴面',159,927,12,'#aaa0ad');
 frame+=text('放大巡览 · 点选遗址与渊域',117,964,11,'#8c9696')+text('地形与深度为意绘，不作等距里程。',117,986,10,'#6e7d82');
 frame+='</g>';
 return{labels,sites,routes,portals,frame};
}
export const mapStyles=`<style>
 text{font-family:'STKaiti','KaiTi','Noto Serif CJK SC',serif}.annotation{pointer-events:none}
 .region,.portal,.site{cursor:pointer;outline:none}.label-hit,.site-hit{fill:transparent;stroke:transparent;stroke-width:.6}
 .region:hover .label-hit,.region:focus-visible .label-hit,.region.selected .label-hit{fill:#bca585;fill-opacity:.07;stroke:#d0b897;stroke-opacity:.6}
 .region-name,.portal-caption,.site-caption,.mirror-caption{paint-order:stroke;stroke:#101b22;stroke-width:3px;stroke-linejoin:round}
 .portal{color:#cfb793}.spring{color:#ba9dca}.portal:hover,.portal:focus-visible,.portal.selected{color:#f1dcc0}
 .site-mark{fill:#d8c29f;stroke:#182a2a;stroke-width:1;opacity:.65}.site-label{opacity:0;pointer-events:none}.site-label.label-visible{opacity:1}
 .site:hover .site-hit,.site:focus-visible .site-hit,.site.selected .site-hit{stroke:#dac7a9;stroke-dasharray:2 3;fill:#d8c29f;fill-opacity:.07}
 .mirror-site .site-mark{display:none}.hide-place-labels .site-label,.hide-place-labels .mirror-caption{display:none}.hidden-layer{display:none}
 </style>`;
