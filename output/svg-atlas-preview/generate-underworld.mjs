import fs from 'node:fs';
import { readPreviewShell } from './preview-shell.mjs';
import { optimizeAtlasSvg } from './optimize-svg.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { underworldData as data, addSite } from './underworld-data.mjs';
import { capitalDefinitions } from './capitals.mjs';
import { sectArtwork, sectStyles } from './sects.mjs';
import { plate, place, cartography, mapStyles } from './underworld-layout.mjs';
import { bedrock, floorEtching, mineralAccents, ancientBridge, ancientGate, ancientTerrace } from './underworld-etching.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
let seed=937106;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const between=(a,b)=>a+(b-a)*rand(),f=v=>+v.toFixed(2),lerp=(a,b,t)=>a+(b-a)*t;
const line=pts=>pts.map(([x,y],i)=>`${i?'L':'M'}${f(x)},${f(y)}`).join('');
const poly=(pts,fill,stroke='none',width=.5,opacity=1)=>`<path d="${line(pts)}Z" fill="${fill}" stroke="${stroke}" stroke-width="${width}" opacity="${opacity}"/>`;
const stroke=(d,color,width=.6,opacity=1,extra='')=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" ${extra}/>`;
const color=(a,b,t)=>'#'+a.match(/\w\w/g).map((v,i)=>Math.round(lerp(parseInt(v,16),parseInt(b.match(/\w\w/g)[i],16),t)).toString(16).padStart(2,'0')).join('');
const text=(s,x,y,size=10,fill='#b7b19d',extra='')=>`<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" ${extra}>${s}</text>`;
const chambers=[
 {id:'归墟',key:'water',x:810,y:290,rx:198,ry:112,phase:.3,rock:'#657174',floor:'#08111c',accent:'#9ec5d0'},
 {id:'碎金渊',key:'metal',x:402,y:448,rx:185,ry:157,phase:2.1,rock:'#777567',floor:'#1a2223',accent:'#ccc0a0'},
 {id:'神木枯冢',key:'wood',x:1240,y:431,rx:205,ry:164,phase:4.4,rock:'#606e59',floor:'#141e1c',accent:'#9fac85'},
 {id:'黄泉古迹',key:'earth',x:763,y:533,rx:215,ry:119,phase:1.2,rock:'#77705a',floor:'#222622',accent:'#c8b27d'},
 {id:'无尽炎渊',key:'fire',x:1050,y:714,rx:224,ry:99,phase:3.3,rock:'#796251',floor:'#20191c',accent:'#d19869'},
];
function point(c,a,t=1){
 const rough=c.key==='wood'?2.7:c.key==='metal'?2.4:c.key==='earth'?1.8:1;
 const r=1+rough*(.043*Math.sin(a*3+c.phase)+.033*Math.sin(a*7-c.phase*2))+.027*Math.cos(a*13+c.phase)+.013*Math.sin(a*37+t*2)+.005*Math.cos(a*109);
 const rx=c.key==='metal'?c.rx*(.78+.12*Math.cos(a*4)):c.rx;
 const shear=c.key==='metal'?Math.sin(a)*30:c.key==='earth'?Math.sin(a)*-32:0;
 const depth=c.key==='wood'?48:c.key==='metal'?36:18;
 return[c.x+Math.cos(a)*rx*t*r+shear*t+Math.sin(a*2+c.phase)*10*(1-t),c.y+Math.sin(a)*c.ry*t*r+(1-t)*depth];
}
const ring=(c,t)=>line(Array.from({length:400},(_,i)=>point(c,i/400*Math.PI*2,t)))+'Z';
const cliffs={lines:0,roots:0,swords:0};
// 倒悬天墟的镜像建筑只引用帝都，不携带其他四域主城的完整绘图。
const defs=`<defs>
 <radialGradient id="under-bg"><stop stop-color="#273030"/><stop offset=".7" stop-color="#131e23"/><stop offset="1" stop-color="#080f18"/></radialGradient>
 <radialGradient id="water-light"><stop stop-color="#8acee1" stop-opacity=".36"/><stop offset=".32" stop-color="#5286ad" stop-opacity=".14"/><stop offset="1" stop-color="#050916" stop-opacity="0"/></radialGradient>
 <radialGradient id="fire-light"><stop stop-color="#fff0bb" stop-opacity=".32"/><stop offset=".42" stop-color="#d07646" stop-opacity=".19"/><stop offset="1" stop-color="#5d2625" stop-opacity="0"/></radialGradient>
 <radialGradient id="seal-light"><stop stop-color="#bcddd3" stop-opacity=".25"/><stop offset="1" stop-color="#375346" stop-opacity="0"/></radialGradient>
 <linearGradient id="reverse-rock" x2=".15" y2="1"><stop stop-color="#74878d"/><stop offset=".35" stop-color="#40515d"/><stop offset="1" stop-color="#101922"/></linearGradient>
 <pattern id="dust" width="31" height="29" patternUnits="userSpaceOnUse"><path d="M1 4h.5m8 13h.8m11-8h.6M26 26h.7M4 24h.5" stroke="#d2c8ac" stroke-width=".5" opacity=".15"/><path d="M4 14l1-.5M19 21l2-.7M12 2l1.5 .6" stroke="#080d13" stroke-width=".8" opacity=".4"/></pattern>
 <g id="abyss-entry" fill="none" stroke="currentColor"><circle r="8" stroke-width=".6"/><path d="M0-5L4 0 0 5-4 0ZM-11 0h-3m25 0h3M0-11v-3m0 25v3" stroke-width=".8"/><circle r="11" stroke-dasharray="1 3" stroke-width=".5"/></g>
 <g id="inverse-spring" fill="none" stroke="currentColor"><path d="M0-8L7 0 0 8-7 0ZM-10-3L0 9 10-3M0 8v8m-3-3 3 3 3-3" stroke-width=".65"/></g>
 ${chambers.map(c=>`<clipPath id="clip-${c.key}"><path d="${ring(c,.925)}"/></clipPath>`).join('')}
 ${capitalDefinitions(['imperial'])}
</defs>`;

const ground=bedrock();
function cavity(c){
 let out=stroke(ring(c,1.05),'#080e14',9,.25);
 for(let i=0;i<40;i++){
  const t=1.065-i*.0104,z=i/39,fill=color(c.rock,c.floor,Math.min(1,z*.95+.05));
  out+=`<path d="${ring(c,t)}" fill="${fill}" stroke="${i%5===0?c.accent:'#192323'}" stroke-opacity="${i%5===0?.25:.6}" stroke-width="${i%5===0?.55:.32}"/>`;
 }
 for(let i=0;i<170;i++){
  const a=i/170*Math.PI*2,t=between(.68,.84),j=between(.009,.025),ridge=point(c,a,1.02),foot=point(c,a+.012,t);
  out+=poly([point(c,a-j,1.02),ridge,foot,point(c,a-j,t+.025)],c.rock,'none',0,.16);
  out+=poly([ridge,point(c,a+j,1.02),point(c,a+j,t+.015),foot],'#050f16','none',0,.18);
 }
 let shadow='',highlight='';
 for(let i=0;i<1100;i++){
  const a=i/1100*Math.PI*2,t=between(.72,.96),len=between(.05,.24),pts=[];
  for(let j=0;j<7;j++)pts.push(point(c,a+Math.sin(j*.9+a*24)*.006,Math.min(1.045,t+j/6*len)));
  shadow+=line(pts);if(i%3===0)highlight+=line(pts.map(([x,y])=>[x-.55,y-.7]));cliffs.lines++;
 }
 out+=stroke(shadow,'#0b1519',.38,.57)+stroke(highlight,c.accent,.3,.37);
 for(let i=0;i<300;i++){
  const a=between(0,Math.PI*2),t=between(.68,1.04),[x,y]=point(c,a,t),s=between(.7,3.5);
  out+=poly([[x-s,y],[x-s*.3,y-s],[x+s,y-s*.3],[x+s*.4,y+s*.5]],i%3===0?c.rock:'#26302c','#101c1d',.28,.65);
 }
 return out;
}
const geology=chambers.map(c=>place(c,cavity(c),'rim')).join('');

function guixu(){
 const c=chambers[0];let out=`<g clip-path="url(#clip-water)"><ellipse cx="810" cy="301" rx="160" ry="93" fill="url(#water-light)"/>`;
 for(let i=0;i<72;i++){
  const pts=[],start=between(0,Math.PI*2),r0=between(.23,.67);
  for(let j=0;j<100;j++){const t=j/99,a=start+t*3.5,r=r0+t*.45;pts.push([c.x+Math.cos(a)*c.rx*r,c.y+12+Math.sin(a)*c.ry*r*.78]);}
  out+=stroke(line(pts),i%4===0?'#a6c6c8':'#59848f',i%4===0?.48:.36,between(.12,.55));
 }
 for(let i=0;i<42;i++){
  const a=i/42*Math.PI*2,r=between(82,160),x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r*.5;
  out+=poly([[x-3,y-2],[x+4,y-3],[x+7,y+1],[x-1,y+3]],'#758383','#bfc4ac',.35,.4);
  out+=stroke(`M${f(x)} ${f(y)}q-9 5-18 3`,'#a1bac0',.4,.45);
 }
 out+=`<ellipse cx="811" cy="304" rx="49" ry="28" fill="#070c16" stroke="#96b9cb" stroke-opacity=".5" stroke-width=".7"/>`;
 for(let i=0;i<18;i++)out+=`<ellipse cx="811" cy="${f(304+i*.1)}" rx="${49-i*1.8}" ry="${28-i*.96}" fill="none" stroke="${i%3===0?'#7ab5d1':'#283e62'}" stroke-width=".45" opacity="${f(.47-i*.014)}"/>`;
 for(let i=0;i<16;i++){const a=i*Math.PI/8,x=811+Math.cos(a)*36,y=304+Math.sin(a)*19;out+=stroke(`M${f(x)} ${f(y)}L811 304`,'#7fabce',.3,.17);}
 out+=`<ellipse cx="811" cy="304" rx="12" ry="7" fill="url(#water-light)"/>`+stroke('M797 304q14-8 28 0q-14 8-28 0M811 296v16','#b0e2ec',.7,.8);
 addSite('外渊','归墟',699,278,'外渊首先剥去来者灵气。',[['层序','归墟第一层'],['危机','灵气剥夺，寂灭游魂游荡。']]);
 addSite('中渊','归墟',750,325,'中渊之中，施展的神通开始崩解。',[['层序','归墟第二层'],['危机','神通崩解，法则不稳。']]);
 addSite('内渊','归墟',857,328,'死气在内渊凝成结晶，时空次序随之错乱。');
 addSite('镇无渊核','归墟',811,304,'许听雨以先天水本源镇压「无」之牢；水蓝仙光并非安全通行的标记。',[['核心','先天水本源镇无。'],['庇护','得归墟之主庇护方可如履平地。']]);
 return out+'</g>';
}
function sword(x,y,h,angle=0){
 cliffs.swords++;const w=h*.055;
 return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">${poly([[-w,0],[-w,-h*.8],[0,-h],[w,-h*.8],[w,0]],'#65776f','#a3ac98',.23,.78)}${stroke(`M0 0V${f(-h)}M${f(-w*3)} ${f(-h*.65)}h${f(w*6)}`,'#b6b195',.45,.7)}${stroke(`M${f(w)} 0v${f(-h*.68)}`,'#1a282a',.5)}</g>`;
}
function metal(){
 const c=chambers[1];let out='<g clip-path="url(#clip-metal)">';
 for(let i=0;i<26;i++){
  const a=i*Math.PI*2/26,[x,y]=point(c,a,.89),pts=[[x,y]];
  for(let j=1;j<9;j++)pts.push(point(c,a+Math.sin(j*.7+i)*.09,.9-j*.055));
  out+=stroke(line(pts),'#0b121b',between(2,5),.64)+stroke(line(pts.map(([x,y])=>[x-1.2,y-1])),'#b7b49a',.65,.57);
 }
 const fracture=[[398,341],[388,362],[391,378],[383,391],[389,403],[399,412],[392,425],[396,433],[378,449],[382,461],[397,474],[390,495],[386,511],[381,527],[401,540],[411,546],[420,529],[419,514],[427,496],[421,480],[412,466],[419,450],[432,434],[426,421],[438,417],[426,407],[416,399],[412,375],[418,363]];
 out+=poly(fracture,'#0b151b','#788572',.5);
 for(let j=0;j<4;j++)out+=stroke(line(fracture.map(([x,y])=>[x+(x<405?-1:1)*(j*3+2),y]))+'Z','#a7a68d',.45,.3);
 for(let i=0;i<340;i++){
  const a=between(0,Math.PI*2),[x,y]=point(c,a,between(.2,.87)),h=between(1.5,5),w=between(2.5,7);
  const shape=[[x-w,y],[x-w*.9,y-h*.6],[x-w*.3,y-h],[x+w*.2,y-h*.8],[x+w*.7,y-h*.9],[x+w,y-h*.3],[x+w*.6,y+h*.2],[x-w*.2,y+h*.3]];
  out+=poly(shape,'#47584e','#829080',.3,.8)+stroke(`M${f(x-w*.6)} ${f(y-h*.25)}l${f(w*.5)} ${f(-h*.3)} ${f(w*.65)} ${f(h*.3)}`,'#a7ac95',.35,.65);
 }
 for(let i=0;i<640;i++){
  const a=between(0,Math.PI*2),r=Math.sqrt(rand())*.85,[x,y]=point(c,a,r);
  if(x>378&&x<425&&y>340&&y<534)continue;
  out+=sword(x,y,between(3.5,10.5),between(-36,36));
 }
 for(const [x,y,h,a]of[[330,431,46,-17],[481,466,37,19],[444,530,52,-12],[360,530,31,28]])out+=sword(x,y,h,a);
 let gold='';for(let i=0;i<120;i++){const x=between(385,419),y=between(433,529);gold+=`M${f(x)} ${f(y)}l${f(between(-2,2))} ${f(between(1,4))}`;}
 out+=stroke(gold,'#d7bf77',.6,.55);
 addSite('残剑滩','碎金渊',321,388,'近千年来的残剑沉积在裂隙浅层，来者须先「交一剑」求共鸣。');
 addSite('断刃崖','碎金渊',470,400,'上古剑痕遍布断崖，无形断刃在崖间游弋。');
 addSite('万剑渊','碎金渊',375,480,'万剑攻伐神识；剑修可悟道得传承，也可能剑心崩碎。');
 addSite('金气本源','碎金渊',411,525,'先天金气凝于渊底，久留者血肉化金。');
 return out+'</g>';
}
function rootBranch(x,y,a,len,depth,width,wood='#788365'){
 if(depth<=0)return'';cliffs.roots++;
 const ex=x+Math.cos(a)*len,ey=y+Math.sin(a)*len,bend=between(-.4,.4),cx=x+Math.cos(a+bend)*len*.55,cy=y+Math.sin(a+bend)*len*.55;
 const d=`M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}`;
 const nx=-Math.sin(a),ny=Math.cos(a),w=width/2,end=w*.49;
 let out=`<path d="M${f(x+nx*w)} ${f(y+ny*w)}Q${f(cx+nx*w*.7)} ${f(cy+ny*w*.7)} ${f(ex+nx*end)} ${f(ey+ny*end)}L${f(ex-nx*end)} ${f(ey-ny*end)}Q${f(cx-nx*w*.7)} ${f(cy-ny*w*.7)} ${f(x-nx*w)} ${f(y-ny*w)}Z" fill="${wood}" stroke="#152821" stroke-width=".6"/>`;
 if(width>1.7)for(let strand=0;strand<4;strand++){
  const off=(strand/3-.5)*width*.74;
  out+=stroke(`M${f(x+nx*off)} ${f(y+ny*off)}Q${f(cx+nx*off*.7)} ${f(cy+ny*off*.7)} ${f(ex+nx*off*.48)} ${f(ey+ny*off*.48)}`,strand%2?'#384c35':'#c1b490',.4,.6);
 }
 if(depth>2)for(let i=1;i<5;i++){const t=i/5,tx=(1-t)**2*x+2*(1-t)*t*cx+t*t*ex,ty=(1-t)**2*y+2*(1-t)*t*cy+t*t*ey;out+=stroke(`M${f(tx-1.7)} ${f(ty)}l${f(width*.7)} -1`,'#2d3b2d',.4,.7);}
 out+=rootBranch(ex,ey,a-between(.2,.7),len*.65,depth-1,width*.6,wood);
 out+=rootBranch(ex,ey,a+between(.18,.69),len*.68,depth-1,width*.57,wood);
 return out;
}
function wood(){
 let out='<g clip-path="url(#clip-wood)">';
 for(let i=0;i<150;i++){
  const x=between(1100,1380),y=between(345,541),r=between(1,4);
  out+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r*.43)}" fill="#526c54" stroke="#a1a480" stroke-width=".3" opacity=".5"/>`;
 }
 for(let i=0;i<36;i++){
  const a=between(0,Math.PI*2),[x,y]=point(chambers[2],a,between(.4,.85));
  out+=rootBranch(x,y,-Math.PI/2,between(8,17),3,1,'#9a9d85');
 }
 for(const [x,y,a,l,w]of[[1306,259,2.0,95,11],[1272,270,1.55,106,9],[1350,300,2.45,99,10],[1394,397,3.1,75,7],[1140,310,1.0,78,7],[1089,437,.2,81,6]])out+=rootBranch(x,y,a,l,6,w);
 out+=`<ellipse cx="1245" cy="477" rx="40" ry="27" fill="url(#seal-light)"/>`;
 addSite('枯骨林','神木枯冢',1158,373,'枯骨林中，寿元以十倍速度流逝。');
 addSite('畸变藤狱','神木枯冢',1314,391,'畸变生机让伤口生花，血肉逐渐木石化。');
 addSite('岁月灰烬','神木枯冢',1354,493,'时间错乱，岁月沉为灰烬。');
 addSite('枯荣本源','神木枯冢',1245,477,'生与死的概念在此交界，纯粹生机与沉积死气互相侵蚀。');
 return out+'</g>';
}
function ruin(x,y,w,h,angle){
 const height=between(1.5,4),project=(a,b,z=0)=>[a+b,a*-.23+b*.4-z];
 let out=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">`;
 out+=poly([project(0,0),project(w,0),project(w,h),project(0,h)],'#414e41','#828b6e',.3);
 for(let row=0;row<Math.floor(h/2);row++)out+=stroke(line([project(0,row*2),project(w,row*2)]),'#8b9377',.25,.6);
 for(let col=0;col<Math.floor(w/2.5);col++)out+=stroke(line([project(col*2.5,0),project(col*2.5,h)]),'#24362f',.35,.7);
 const wall=[[0,0,0],[w,0,0],[w,0,height*.7],[w*.8,0,height],[w*.6,0,height*.6],[w*.4,0,height],[0,0,height]].map(p=>project(...p));
 out+=poly(wall,'#879174','#a4a58a',.32);
 out+=stroke(line([project(0,0,height*.4),project(w,0,height*.4)]),'#374c3c',.35);
 for(let col=0;col<Math.floor(w/2.5);col++)out+=stroke(line([project(col*2.5,0),project(col*2.5,0,height)]),'#46593e',.3);
 if(w>6)out+=poly([project(0,h),project(w*.65,h),project(w*.65,h,height*.45),project(w*.3,h,height*.8),project(0,h,height*.6)],'#727e63','#a2a184',.3);
 return out+'</g>';
}
function yellow(){
 let out='<g clip-path="url(#clip-earth)">';
 // Broken paving, sediment and low relief occupy the cavern floor between monuments.
 let grit='',tiles='';
 for(let i=0;i<1800;i++){
  const x=between(599,927),y=between(450,616);
  grit+=`M${f(x)} ${f(y)}l${f(between(.1,1.5))} ${f(between(-.4,.4))}`;
  if(i%9===0)tiles+=`M${f(x)} ${f(y)}l3-.7 1.7 1.1-3 .7Z`;
 }
 out+=stroke(grit,'#af9f7e',.32,.27)+stroke(tiles,'#76836b',.35,.45);
 const river='M585 424C610 463 645 438 670 471S708 488 711 519S770 525 780 557S858 568 909 614';
 out+=stroke(river,'#111d21',22,.9)+stroke(river,'#ac9562',15,.65)+stroke(river,'#555b46',10,.95)+stroke(river,'#d1b780',.9,.8);
 for(let i=0;i<6;i++)out+=`<g transform="translate(${f(i*.55-1.5)} ${f(i*.7-2)})">${stroke(river,'#b7b58c',.35,.45)}</g>`;
 for(let i=0;i<135;i++){
  const x=between(608,906),y=between(462,605);if(Math.abs(x-y*1.9+300)<25)continue;
  out+=ruin(x,y,between(3,12),between(3,9),between(-8,8));
 }
 const road=[];for(let i=0;i<110;i++){const t=i/109,x=620+t*220,y=563+Math.sin(t*6)*26;road.push([x,y]);out+=poly([[x-1,y-2],[x+.7,y-2.2],[x+1.6,y+2],[x-.7,y+2.3]],'#7a8166','#b4aa88',.25,.8);}
 out+=stroke(line(road),'#c7b083',.35,.45);
 out+=ancientBridge(695,510);
 // Nine wells remain individually countable in the SVG.
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){
  const x=646+col*18-row*7,y=556+row*10+col*3;
  out+=`<g class="reincarnation-well" transform="translate(${x} ${y})"><path d="M-6 0v4q6 6 12 0V0" fill="#626854" stroke="#adab87" stroke-width=".5"/><ellipse rx="6" ry="3.5" fill="#ada98a" stroke="#d7c7a4" stroke-width=".45"/><ellipse rx="3.7" ry="2.1" fill="#0d1b22"/>${stroke('M-5 2v3m5-1v3m5-5v3M-6 2q6 7 12 0','#283c36',.4)}${Array.from({length:10},(_,i)=>{const a=i*Math.PI/5;return stroke(`M${f(Math.cos(a)*4)} ${f(Math.sin(a)*2.3)}l${f(Math.cos(a)*1.8)} ${f(Math.sin(a)*1)}`,'#5b674f',.4)}).join('')}</g>`;
 }
 out+=ancientTerrace(797,489);
 out+=ancientGate(875,557);
 for(let i=0;i<130;i++){
  const t=rand(),x=604+t*291,y=447+t*155+Math.sin(t*17)*11+between(-14,14);
  out+=stroke(`M${f(x)} ${f(y)}v-4m-2-1q2-3 4 0m-5 0q3-4 6 0`,'#ae746a',.5,.65);
 }
 for(let i=0;i<8;i++)out+=stroke(`M620 ${496+i*2}q82-30 160 7t110-10`,'#c6c1aa',.7,.07);
 addSite('黄泉路','黄泉古迹',735,554,'灰雾里的往生道路，循引魂铃声方可辨认归途。');
 addSite('奈何桥 · 忘川虚影','黄泉古迹',695,509,'奈何桥跨越忘川虚影，梦境与生死两岸在此交叠。');
 addSite('九口轮回井','黄泉古迹',664,575,'九口轮回井藏于废墟，是黄泉古迹的轮回诸景之一。');
 addSite('望乡台','黄泉古迹',801,484,'灰雾中的望乡遗台，属于晚棠梦境映世。');
 addSite('冥河滩涂','黄泉古迹',831,585,'晚棠梦游的冥河滩涂，死气之中含净世幽莲灵机。');
 addSite('亘古石门','黄泉古迹',875,549,'黄泉废墟深处的亘古石门。');
 return out+'</g>';
}
function fire(){
 const c=chambers[4];let out='<g clip-path="url(#clip-fire)"><ellipse cx="1050" cy="722" rx="180" ry="85" fill="url(#fire-light)"/>';
 const fires=[['#b96547',.83],['#e7d8b3',.64],['#77a5a0',.48],['#555979',.33],['#181924',.18]];
 for(let k=0;k<5;k++){
  const [hue,r]=fires[k];out+=`<path d="${ring(c,r)}" fill="${color(hue,'#0c101a',.78)}" stroke="${hue}" stroke-width="${k===4?.5:1.1}" stroke-opacity=".8"/>`;
  for(let j=0;j<5;j++)out+=stroke(ring(c,r-j*.011),hue,.4,.18+j*.04);
 }
 for(let i=0;i<200;i++){
  const a=between(0,Math.PI*2),r=between(.2,.88),pts=[];for(let j=0;j<7;j++)pts.push(point(c,a+Math.sin(j*1.4)*.017,r+j*.012));
  const hue=r>.67?'#c28a62':r>.5?'#e2cda1':r>.36?'#9fc3b1':'#8b9cae';
  out+=stroke(line(pts),'#100f17',2.3,.9)+stroke(line(pts),hue,.6,.72);
 }
 for(let i=0;i<180;i++){
  const a=between(0,Math.PI*2),[x,y]=point(c,a,between(.38,.91)),w=between(1,5);
  out+=poly([[x-w,y],[x-w*.5,y-w*.7],[x+w*.4,y-w],[x+w,y],[x,y+w*.4]],'#363a33','#9f7959',.35,.85);
 }
 // Lava veins branch along fractured basalt terraces; their cores remain sharp vector strokes.
 for(let k=0;k<5;k++)for(let strand=0;strand<3;strand++){
  const pts=[],r=fires[k][1];
  for(let j=0;j<110;j++){const a=(strand/3+j/110*.29)*Math.PI*2,rr=r-.016+Math.sin(j*.52+k)*.009;pts.push(point(c,a,rr));}
  const hue=fires[k][0];out+=stroke(line(pts),hue,3,.12)+stroke(line(pts),hue,.85,.8);
 }
 out+=`<ellipse cx="1050" cy="730" rx="30" ry="12" fill="#080c15" stroke="#87929e" stroke-width=".4"/>`;
 addSite('赤焰层','无尽炎渊',917,698,'地火浅层为赤焰，结丹仅能勉强涉足，仍须避火护持。');
 addSite('白焰层','无尽炎渊',1147,704,'白焰焚金融铁。');
 addSite('青焰层','无尽炎渊',984,746,'青焰熔灵化气。');
 addSite('黑焰层','无尽炎渊',1098,740,'黑焰焚虚炼神。');
 addSite('虚无之火','无尽炎渊',1050,730,'渊底的虚无之火可焚毁概念，合体修士亦须慎入。');
 return out+'</g>';
}
const painters=[guixu,metal,wood,yellow,fire];
const artwork=chambers.map((c,i)=>place(c,`<g clip-path="url(#clip-${c.key})">${floorEtching(c)}</g>`+painters[i]()+`<g clip-path="url(#clip-${c.key})">${mineralAccents(c)}</g>`)).join('');

// Mirror void is a distinct inset, not a network of invented safe roads between abysses.
const reflections=[
 {id:'倒悬命池',source:'归墟',x:618,color:'#8abed0',desc:'归墟的逆像。吞噬死气转为纯净水本源神液，可重塑残损肉身。'},
 {id:'倒挂冰峰',source:'无尽炎渊',x:793,color:'#a4bfd1',desc:'炎渊的逆像。暴烈黑焰化为幽蓝寂灭阴髓，滴水成焰，冻心火与元神。'},
 {id:'倒生建木',source:'神木枯冢',x:968,color:'#9bba99',desc:'神木的逆像。腐根化为穹顶倒垂的青苍神木，散发乙木清气与道果。'},
 {id:'融金柔沼',source:'碎金渊',x:1143,color:'#c7b888',desc:'碎金渊的逆像。万剑煞气消解为金液天池，养剑魂、涤剑魔。'},
 {id:'回魂天城',source:'黄泉古迹',x:1318,color:'#c8b1a4',desc:'黄泉的逆像。鬼蜮化为生者不夜幻城，溯源清溪可唤醒宿世记忆。'}
];
let mirror=`<g id="mirror-geology"><path d="M475 850H1454M475 853H1454" stroke="#8b8394" stroke-opacity=".4" stroke-width=".5"/><path d="M486 850l4 4-4 4-4-4ZM1444 850l4 4-4 4-4-4Z" fill="#b5a6ad"/>`;
for(let i=0;i<reflections.length;i++){
 const m=reflections[i],pts=[[m.x-65,867],[m.x+64,867]];
 for(let j=0;j<48;j++){const x=m.x+64-j*2.75,y=879+Math.sin(j*.27+i)*5+Math.sin(j*.87)*7+Math.sin(j*.087)*10+between(0,4);pts.push([x,y]);}
 mirror+=poly(pts,'url(#reverse-rock)',m.color,.5,.9);
 for(let j=0;j<40;j++){const x=m.x+between(-59,59),y=between(872,893);mirror+=stroke(`M${f(x)} 869l${f(between(-7,7))} ${f(y-869)}`,m.color,.35,.45);}
 if(i===0||i===3){
  for(let j=0;j<7;j++)mirror+=`<ellipse cx="${m.x}" cy="${868-j*.5}" rx="${55-j*6}" ry="${8-j*.6}" fill="${j===0?'#213941':'none'}" stroke="${m.color}" stroke-width=".5" opacity=".8"/>`;
  for(let j=0;j<12;j++){const x=m.x+between(-34,34);mirror+=stroke(`M${f(x)} 880v${f(between(6,19))}`,m.color,.55,.6);}
 }else if(i===1){
  for(let j=0;j<13;j++){const x=m.x-48+j*8,h=between(12,40);mirror+=poly([[x,873],[x+12,872],[x+9,881],[x+10,884],[x+5,873+h],[x+2,891],[x-2,888]],'#627c8b',m.color,.4)+stroke(`M${x+5} ${873+h}L${x+6} 882l-3-7`,'#b4c6c9',.35,.65);}
 }else if(i===2){mirror+=rootBranch(m.x,874,Math.PI/2,22,5,4,'#8ea383');}
 else{
  mirror+=`<use href="#capital-imperial" transform="translate(${m.x} 855) scale(.44)" opacity=".84"/>`;
  for(let j=0;j<12;j++)mirror+=stroke(`M${m.x-48+j*9} 869v-3`,'#e0c58c',.8,.7);
 }
 addSite(m.id,'倒悬天墟',m.x,895,m.desc,[['对映',m.source+'极底逆泉'],['门槛','元婴境或至宝护体；须异变薄弱期或特殊秘法。'],['法则','五行逆克，顺行威能削七成，逆行反增一倍。']],{mirror:true,view:{x:m.x-175,y:800,w:350,h:218.75}});
}
mirror+='</g>';
mirror=`<g transform="translate(-160 200) scale(1.3 1)">${mirror}</g>`;
const {labels,sites,routes,portals,frame}=cartography(data,chambers,reflections,addSite);
const sectArt=sectArtwork('underworld');
data.sects=sectArt.entries;
const styles=mapStyles+`<style>${sectStyles}</style>`;
const svg=optimizeAtlasSvg(`<svg xmlns="http://www.w3.org/2000/svg" id="atlas" viewBox="0 0 ${plate.width} ${plate.height}" role="group" aria-labelledby="map-title map-description" style="background:#0d171f"><title id="map-title">幽界五渊舆图</title><desc id="map-description">归墟、碎金渊、黄泉古迹、神木枯冢、无尽炎渊，及五渊极底逆泉通向倒悬天墟的示意。全部地形与建筑为 SVG 路径，深度不按比例。</desc>${defs.replace('</defs>',sectArt.definitions+'</defs>')}${styles}${ground}${geology}${artwork}${mirror}${routes}${labels}${sites}${portals}${sectArt.markup}${frame}</svg>`);
fs.writeFileSync(path.join(dir,'underworld-atlas.svg'),svg);
const shell=readPreviewShell();
fs.writeFileSync(path.join(dir,'underworld.html'),shell.replace('<!-- ATLAS_SVG -->',svg).replace('/* ATLAS_DATA */',JSON.stringify(data)).replace('<title>九野山海舆图 · SVG 交互预览</title>','<title>幽界五渊舆图 · SVG 交互预览</title>'));
console.log(JSON.stringify({realm:'underworld',svgKB:Math.round(Buffer.byteLength(svg)/1024),regions:data.regions.length,sites:data.sites.length,portals:data.portals.length,...cliffs,bitmapElements:0}));
