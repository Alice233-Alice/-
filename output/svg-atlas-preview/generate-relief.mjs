import fs from 'node:fs';
import { readPreviewShell } from './preview-shell.mjs';
import { optimizeAtlasSvg } from './optimize-svg.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capitals, capitalDefinitions, capitalMap, capitalStudy } from './capitals.mjs';
import { arrayTiers, transportNodes, transportEdges, transportDefinitions, transportMap, transportStyle } from './transport.mjs';
import { regionOutlines } from './region-outlines.mjs';
import { sectArtwork, sectStyles } from './sects.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(dir, 'atlas-data.json'), 'utf8'));
data.capitals=capitals;
data.arrayTiers=arrayTiers;
data.arrays=transportNodes;
data.arrayEdges=transportEdges;
const capitalDefs=capitalDefinitions();
const arrayArtwork=transportMap();
const sectArt=sectArtwork('surface');
data.sects=sectArt.entries;
let seed=278119;
const rnd=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const between=(a,b)=>a+rnd()*(b-a);
const f=v=>+v.toFixed(2);
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const line=p=>p.map(([x,y],i)=>`${i?'L':'M'}${f(x)},${f(y)}`).join('');
const smooth=p=>p.reduce((d,[x,y],i)=>i?d+`Q${f(p[i-1][0])},${f(p[i-1][1])} ${f((x+p[i-1][0])/2)},${f((y+p[i-1][1])/2)}`:`M${f(x)},${f(y)}`,'')+`L${p.at(-1).map(f).join(',')}`;
const hash=(x,y)=>{let k=Math.imul(x,374761393)+Math.imul(y,668265263);k=Math.imul(k^(k>>>13),1274126177);return((k^(k>>>16))>>>0)/4294967295;};
function noise(x,y){const i=Math.floor(x),j=Math.floor(y),a=x-i,b=y-j,u=a*a*(3-2*a),v=b*b*(3-2*b);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v);}
function fbm(x,y){return noise(x,y)*.56+noise(x*2.07+42,y*2.07+8)*.26+noise(x*4.17+9,y*4.17)*.12+noise(x*8.31,y*8.31+37)*.06;}
function rgb(hex){return hex.match(/\w\w/g).map(c=>parseInt(c,16));}
function color(a,b,t){return'#'+rgb(a).map((v,i)=>Math.round(mix(v,rgb(b)[i],t)).toString(16).padStart(2,'0')).join('');}
function distanceToPath(x,y,points){let min=Infinity;for(let i=1;i<points.length;i++){const[a,b]=[points[i-1],points[i]],dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);min=Math.min(min,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));}return min;}

// Height field drives continuous terrain. No repeated mountain symbols.
const spines=[
 {p:[[464,306],[540,271],[628,231],[704,226],[788,192],[857,227],[949,253],[1028,293]],w:28,h:.91},
 {p:[[570,331],[645,298],[719,278],[761,287],[824,261],[891,295],[932,327]],w:21,h:.62},
 {p:[[416,338],[467,361],[509,390],[485,431],[446,463],[423,505],[468,566],[532,594],[588,576]],w:34,h:.91},
 {p:[[361,391],[397,423],[383,475],[416,546],[439,584]],w:18,h:.62},
 {p:[[1112,270],[1148,316],[1096,362],[1162,422],[1138,481],[1187,542],[1118,584],[1071,618]],w:30,h:.58},
 {p:[[1000,303],[979,345],[1010,397],[967,433]],w:17,h:.37},
 {p:[[478,654],[542,668],[612,645],[685,663],[739,673],[818,665],[875,707],[850,776],[779,811],[705,791],[628,770]],w:31,h:.60},
 {p:[[614,453],[667,421],[692,378]],w:16,h:.27},
];
function height(x,y){
 const wx=x+(fbm(x/74,y/74)-.5)*42,wy=y+(fbm((x+123)/69,(y+488)/69)-.5)*38;
 let h=.055+fbm(x/91,y/91)*.105;
 for(const s of spines){const d=distanceToPath(wx,wy,s.p);h+=Math.exp(-(d*d)/(s.w*s.w))*s.h;}
 h*=.65+fbm(x/23,y/23)*.6;
 h+=fbm(x/17,y/17)*.055;
 const d=Math.hypot((x-753)*1.05,y-687);
 h+=Math.exp(-((d-32)**2)/290)*.63-Math.exp(-(d*d)/330)*.22;
 return Math.max(.015,h);
}
const X0=265,Y0=90,STEP=3.8,NX=280,NY=217;
const elevations=new Float32Array(NX*NY);
for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)elevations[y*NX+x]=(x===0||y===0||x===NX-1||y===NY-1)?-1:height(X0+x*STEP,Y0+y*STEP);
function contours(level){
 const nodes=new Map();const edges=[];
 const add=(a,b)=>{const ai=`${f(a[0])},${f(a[1])}`,bi=`${f(b[0])},${f(b[1])}`;if(ai===bi)return;const index=edges.length;edges.push([ai,bi]);for(const[k,p]of[[ai,a],[bi,b]]){if(!nodes.has(k))nodes.set(k,{p,edges:[]});nodes.get(k).edges.push(index);}};
 for(let y=0;y<NY-1;y++)for(let x=0;x<NX-1;x++){
  const vs=[elevations[y*NX+x],elevations[y*NX+x+1],elevations[(y+1)*NX+x+1],elevations[(y+1)*NX+x]];
  const bits=vs.reduce((r,v,i)=>r|(v>=level?1<<i:0),0);if(bits===0||bits===15)continue;
  const ps=[[X0+x*STEP,Y0+y*STEP],[X0+(x+1)*STEP,Y0+y*STEP],[X0+(x+1)*STEP,Y0+(y+1)*STEP],[X0+x*STEP,Y0+(y+1)*STEP]];
  const crossing=[];
  for(let e=0;e<4;e++){const j=(e+1)%4;if((vs[e]>=level)===(vs[j]>=level))continue;const t=(level-vs[e])/(vs[j]-vs[e]);crossing.push([mix(ps[e][0],ps[j][0],t),mix(ps[e][1],ps[j][1],t)]);}
  if(crossing.length===2)add(...crossing);else if(crossing.length===4){if(vs.reduce((a,b)=>a+b,0)/4>level){add(crossing[0],crossing[3]);add(crossing[1],crossing[2]);}else{add(crossing[0],crossing[1]);add(crossing[2],crossing[3]);}}
 }
 const used=new Set();let d='';
 for(let k=0;k<edges.length;k++){
  if(used.has(k))continue;const start=edges[k][0];let key=start;let idx=k;const pts=[];
  while(idx!==undefined&&!used.has(idx)){used.add(idx);pts.push(nodes.get(key).p);const e=edges[idx];key=e[0]===key?e[1]:e[0];idx=nodes.get(key).edges.find(i=>!used.has(i));if(key===start)break;}
  if(pts.length<4)continue;
  d+=line(pts)+(key===start?'Z':'');
 }
 return d;
}
const levels=Array.from({length:33},(_,i)=>.155+i*.0305);
const contourPaths=levels.map(contours);

const macro=[[607,174],[648,157],[706,160],[748,142],[790,155],[825,130],[870,155],[928,165],[955,195],[1012,216],[1050,244],[1091,223],[1120,246],[1178,261],[1193,304],[1232,324],[1210,355],[1232,389],[1217,415],[1252,443],[1226,470],[1231,501],[1201,523],[1211,548],[1173,565],[1184,594],[1141,612],[1127,642],[1089,650],[1068,681],[1027,665],[1035,629],[998,610],[1007,578],[976,564],[982,538],[958,518],[935,541],[944,575],[928,599],[950,628],[924,661],[948,701],[923,726],[939,755],[903,773],[905,801],[866,806],[849,834],[812,818],[787,845],[749,831],[714,849],[695,818],[650,831],[635,797],[594,791],[584,767],[547,755],[534,727],[498,725],[483,690],[448,694],[436,661],[398,658],[400,624],[365,615],[376,587],[344,576],[357,544],[328,522],[349,493],[326,466],[344,434],[330,407],[361,386],[348,362],[380,344],[378,315],[408,303],[422,276],[460,283],[485,247],[520,248],[536,219],[570,216],[581,191]];
function roughSegment(a,b,depth,amp){if(!depth)return[a];const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),m=[(a[0]+b[0])/2-dy/len*between(-amp,amp),(a[1]+b[1])/2+dx/len*between(-amp,amp)];return[...roughSegment(a,m,depth-1,amp*.52),...roughSegment(m,b,depth-1,amp*.52)];}
const coastline=macro.flatMap((p,i)=>roughSegment(p,macro[(i+1)%macro.length],4,6));
const coast=line(coastline)+'Z';
const outlines=regionOutlines(coastline);
const biomePaths={
 north:'M289 99H1330V280Q1137 315 970 352Q878 367 786 342Q675 355 597 346Q484 357 343 396Z',
 west:'M260 270Q446 228 587 332Q654 399 625 483Q663 554 594 608Q518 624 512 716H260Z',
 east:'M1032 181H1360V769L1048 718Q982 650 988 568Q918 514 939 436Q937 332 1032 181Z',
 south:'M354 679Q422 622 516 624Q604 585 679 626Q788 608 855 622Q924 654 1000 663V905H352Z',
};
const palettes={north:['bdc9b4','e3e1c8'],west:['a39d76','c8b991'],east:['456959','9da280'],south:['8d7760','c1a785'],central:['929c79','c4bd91']};
let defs=`<defs><path id="coast" d="${coast}"/><clipPath id="landClip"><use href="#coast"/></clipPath><filter id="biomeBlend" x="-.1" y="-.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation="27"/></filter><linearGradient id="sea" x2=".8" y2="1"><stop stop-color="#17353b"/><stop offset=".5" stop-color="#122f35"/><stop offset="1" stop-color="#0b222d"/></linearGradient><radialGradient id="vignette"><stop offset=".68" stop-opacity="0"/><stop offset="1" stop-color="#071d25" stop-opacity=".6"/></radialGradient><pattern id="stipple" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.2" cy="1.7" r=".35" fill="#dad4af" opacity=".23"/><circle cx="6.5" cy="4.8" r=".4" fill="#1b3d35" opacity=".16"/><path d="M4 8h.8" stroke="#f1dfb2" stroke-width=".35" opacity=".24"/></pattern>`;
defs+=Object.entries(biomePaths).map(([k,p])=>`<clipPath id="${k}Clip"><path d="${p}"/></clipPath>`).join('');
defs+=Object.entries(biomePaths).map(([k,p])=>`<mask id="${k}Mask" maskUnits="userSpaceOnUse" x="200" y="60" width="1190" height="880"><path d="${p}" fill="white" filter="url(#biomeBlend)"/></mask>`).join('');
defs+=contourPaths.map((d,i)=>`<path id="elevation-${i}" d="${d}"/>`).join('');
defs+=`<g id="gateway"><circle r="5.3" fill="#123a3c" stroke="#d1bf90" stroke-width=".8"/><path d="M0-3 3 0 0 3-3 0Z" fill="none" stroke="#d1bf90" stroke-width=".55"/><circle r="8.5" fill="none" stroke="#bcba97" stroke-width=".5" stroke-dasharray="2 2"/></g></defs>`;
defs=defs.replace('</defs>',capitalDefs+transportDefinitions()+outlines.defs+sectArt.definitions+'</defs>');
let background=`<rect width="1600" height="1000" fill="url(#sea)"/>`;
// Irregular bathymetry and fine engraved sea currents.
let oceanLines='';
for(let i=0;i<102;i++){
 const yy=70+i*8.7,p=[];
 for(let x=60;x<1550;x+=9){const warp=fbm(x/145,yy/130)*40;const whirl=Math.sin(x/87+yy/128)*7;p.push([x,yy+warp+whirl]);}
 oceanLines+=`<path d="${smooth(p)}"/>`;
}
background+=`<g fill="none" stroke="#88a493" stroke-opacity=".105" stroke-width=".55">${oceanLines}</g>`;
background+=`<g fill="none" stroke="#b4b88e" stroke-opacity=".1" stroke-width=".45"><ellipse cx="789" cy="491" rx="676" ry="419"/><ellipse cx="789" cy="491" rx="719" ry="462"/>${Array.from({length:24},(_,i)=>`<path d="M1373 163l${f(Math.cos(i*Math.PI/12)*1800)} ${f(Math.sin(i*Math.PI/12)*1800)}"/>`).join('')}</g>`;
for(const [width,op] of [[27,.045],[18,.08],[10,.12],[4,.23]])background+=`<use href="#coast" fill="none" stroke="#c0c39b" stroke-width="${width}" opacity="${op}"/>`;

let relief=`<use href="#coast" fill="#929c79" stroke="#0d2d2c" stroke-width="3"/><g clip-path="url(#landClip)">`;
function contourFills(palette){return contourPaths.map((_,i)=>`<use href="#elevation-${i}" fill="${color(palette[0],palette[1],i/(levels.length-1))}" fill-rule="evenodd"/>`).join('');}
relief+=contourFills(palettes.central);
// Soft lowland color transitions; high-altitude contour bands retain drawn edges.
relief+=`<g filter="url(#biomeBlend)">${Object.entries(biomePaths).map(([k,d])=>`<path d="${d}" fill="#${palettes[k][0]}"/>`).join('')}</g>`;
for(const k of Object.keys(biomePaths))relief+=`<g mask="url(#${k}Mask)">${contourFills(palettes[k])}</g>`;
relief+=`<g fill="none" stroke="#3c5546" stroke-width=".42" stroke-opacity=".31">${contourPaths.map((_,i)=>`<use href="#elevation-${i}"/>`).join('')}</g>`;

// Copperplate hachures follow the gradient downhill; shadow-facing slopes get denser ink.
const hatchLayers=Array.from({length:5},()=>[]);let highlights=[];
for(let y=162;y<837;y+=4.7)for(let x=337;x<1248;x+=4.7){
 const xx=x+between(-1.3,1.3),yy=y+between(-1.3,1.3),h=height(xx,yy);
 if(h<.235)continue;
 const gx=(height(xx+1.5,yy)-height(xx-1.5,yy))/3,gy=(height(xx,yy+1.5)-height(xx,yy-1.5))/3,m=Math.hypot(gx,gy);
 if(m<.0024)continue;
 const shade=clamp((gx*.7+gy*.7)/m*.5+.5,0,1),p=[[xx,yy]];
 let px=xx,py=yy;
 const length=clamp(m*540,2.5,8.3);
 for(let j=0;j<4;j++){const dx=height(px+1,py)-height(px-1,py),dy=height(px,py+1)-height(px,py-1),d=Math.hypot(dx,dy)||1;px-=dx/d*length/4;py-=dy/d*length/4;p.push([px,py]);}
 hatchLayers[Math.min(4,Math.floor(shade*5))].push(smooth(p));
 if(shade<.19&&rnd()>.35)highlights.push(smooth(p));
}
relief+=hatchLayers.map((paths,i)=>`<path d="${paths.join('')}" fill="none" stroke="#1c3b32" stroke-width="${.3+i*.07}" stroke-opacity="${.11+i*.085}" stroke-linecap="round"/>`).join('');
relief+=`<path d="${highlights.join('')}" fill="none" stroke="#efdfb6" stroke-width=".5" opacity=".52"/>`;

// Narrow tributaries and river deltas form a hierarchy of watercourses.
const river='M790 248C818 265 787 284 806 305S765 327 785 350S823 371 795 394S750 426 781 450S828 477 792 499S760 527 789 554S833 582 816 608';
const branches=[
 'M573 373C590 383 576 401 604 413S641 428 661 426S717 446 769 446',
 'M507 454C549 433 563 458 588 460S644 459 673 473S733 495 784 494',
 'M847 298C859 319 828 338 839 352S834 385 803 388',
 'M716 304C693 324 720 340 709 356S741 388 788 394',
 'M938 362C917 388 926 411 905 423S858 433 815 446',
 'M809 454C857 474 875 436 914 464S973 468 1004 492S1025 540 1084 540S1154 535 1211 528',
 'M1130 407C1100 432 1053 420 1048 445S1032 480 1004 492',
 'M1190 493C1150 504 1170 529 1149 535',
 'M919 580C891 558 863 584 826 587',
 'M658 615C683 598 693 562 728 551S757 548 779 548',
];
let tinyStreams='';
for(let i=0;i<39;i++){
 const left=i%2===0,x=left?between(520,706):between(874,1119),y=between(320,602),dx=left?between(12,32):-between(12,32);
 tinyStreams+=`<path d="M${f(x)} ${f(y)}q${f(dx*.4)} 5 ${f(dx*.25)} 14t${f(dx)} 19"/>`;
}
relief+=`<g fill="none" stroke-linecap="round"><g stroke="#e1d2a8" stroke-width="3.5">${branches.map(d=>`<path d="${d}"/>`).join('')}<path d="${river}" stroke-width="6"/></g><g stroke="#366e70" stroke-width="1.7">${branches.map(d=>`<path d="${d}"/>`).join('')}<path d="${river}" stroke-width="3.4"/></g><g stroke="#9db7a4" stroke-width=".65">${branches.map(d=>`<path d="${d}"/>`).join('')}<path d="${river}" stroke-width=".85"/></g><g stroke="#407777" stroke-width=".65" opacity=".62">${tinyStreams}</g></g>`;
relief+=`<path d="M849 244q12-18 30-8t-3 25q-14 11-27-17Z" fill="#6b9993" stroke="#d8dbc0" stroke-width="1.4"/>`;

// Fine irregular forest crowns merge into woodland, instead of isolated tree icons.
let forest='';
for(let y=287;y<640;y+=4.3)for(let x=966;x<1223;x+=4.5){
 if(fbm(x/36,y/36)<.42||height(x,y)>.79||rnd()<.13)continue;
 if(Math.hypot(x-1089,(y-486)*1.55)<72)continue;
 const xx=x+between(-2,2),yy=y+between(-2,2),r=between(1.7,3.5),p=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,v=between(.7,1.15);return[xx+Math.cos(a)*r*v,yy+Math.sin(a)*r*v*.77]});
 forest+=`<path d="${line(p)}Z" fill="${color('274d3e','809575',rnd()*.65)}" stroke="#233f35" stroke-width=".35"/><path d="M${f(xx-r*.65)} ${f(yy)}q${f(-r*.2)} ${f(-r*.9)} ${f(r*1.15)} ${f(-r*.5)}" fill="none" stroke="#b4ba87" stroke-width=".4" opacity=".55"/>`;
}
relief+=`<g clip-path="url(#eastClip)" opacity=".73">${forest}</g>`;

// Terraced fields are fine surveyed parcels, not decorative stamps.
let farms='';
for(let i=0;i<155;i++){
 const x=between(637,924),y=between(387,626);if(height(x,y)>.25||Math.hypot(x-784,(y-494)*1.5)<55)continue;
 const w=between(3,10),h=between(2,7),s=between(-2,2);
 farms+=`M${f(x)},${f(y)}l${f(w)},${f(s)} ${f(s)},${f(h)}-${f(w)},${f(-s)}Z`;
}
relief+=`<path d="${farms}" fill="none" stroke="#5f7252" stroke-width=".4" opacity=".55"/>`;
// Lowland stippling and scree beds establish detail between ridges.
let dots='';
for(let i=0;i<4800;i++){
 const x=between(336,1223),y=between(160,841);if(height(x,y)<.22&&rnd()<.65)continue;
 dots+=`M${f(x)},${f(y)}h${f(between(.2,.7))}`;
}
relief+=`<path d="${dots}" fill="none" stroke="#273f30" stroke-width=".4" opacity=".25"/><rect width="1600" height="1000" fill="url(#stipple)"/>`;
relief+='</g><use href="#coast" fill="none" stroke="#c9c29c" stroke-width=".8"/>';

function islet(cx,cy,rx,ry){const p=Array.from({length:17},(_,i)=>{const a=i/17*Math.PI*2,r=between(.65,1.2);return[cx+Math.cos(a)*rx*r,cy+Math.sin(a)*ry*r]});const d=line(p)+'Z';let out=`<path d="${d}" fill="none" stroke="#94b4a0" stroke-width="4" opacity=".11"/><path d="${d}" fill="#83927a" stroke="#c7c49e" stroke-width=".7"/>`;for(let i=0;i<3;i++)out+=`<path d="${line(p.map(([x,y])=>[mix(cx,x,.72-i*.19),mix(cy,y,.72-i*.19)]))}Z" fill="none" stroke="#2a5348" stroke-width=".45" opacity=".6"/>`;return out;}
let islands='';
for(let i=0;i<48;i++)islands+=islet(1274+Math.sin(i*.64)*38+between(-25,25),320+i*9.7,between(2,12),between(1.5,7));
for(let i=0;i<30;i++)islands+=islet(between(1104,1360),between(756,859),between(3,13),between(2,6));
for(let i=0;i<24;i++)islands+=islet(between(240,320),between(380,714),between(2,9),between(1.4,5));

// Miniature walled towns: actual streets, courtyards, roofs and towers.
function city(cx,cy,s=1){let out=`<g transform="translate(${cx} ${cy}) scale(${s})" stroke-linejoin="round"><path d="M-43-17L25-30 44-9 37 22-30 29-45 9Z" fill="#929c7c" stroke="#1f453b" stroke-width="2.2"/><path d="M-41-15L24-27 41-8 35 19-29 26-42 8Z" fill="none" stroke="#dfcfaa" stroke-width=".65"/><path d="M-4-25L1 24M-41 2L41-4M-30-16L-21 23M22-24L24 21M-39 13L35 7" fill="none" stroke="#d6c79f" stroke-width="1.4"/>`;
 for(let i=0;i<65;i++){const x=between(-33,30),y=between(-17,18),w=between(2,5),h=between(2,4);if(Math.abs(x)<5||Math.abs(y+1)<3)continue;out+=`<path d="M${f(x)} ${f(y)}l${f(w)} -1 1 ${f(h)}-${f(w)} 1Z" fill="#bec0a0" stroke="#3c5140" stroke-width=".5"/><path d="M${f(x-.8)} ${f(y)}l${f(w*.45)} -3 ${f(w*.75+1)} 1-${f(w*.45)} 2Z" fill="#486355" stroke="#2c473b" stroke-width=".4"/>`;}
 out+=`<path d="M-12-9h24v18h-24Z" fill="#b6b799" stroke="#29463b" stroke-width=".6"/><path d="M-16-8q10 0 16-12 6 12 16 12L12-4h-24Z" fill="#3a5b4c" stroke="#d5c59d" stroke-width=".55"/><path d="M-2-14v15M-9-2v7M9-2v7" stroke="#d2c49d" stroke-width=".8"/><path d="M-7 27v-7h12v6" fill="#2a493b" stroke="#d4c39b" stroke-width=".6"/>`;
 for(const[x,y]of[[-43,-17],[25,-30],[44,-9],[37,22],[-30,29],[-45,9]])out+=`<path d="M${x-2} ${y-3}h5v6h-5Z" fill="#c5bf99" stroke="#2d493b" stroke-width=".7"/>`;
 return out+'</g>';}
let civilization='';
for(let i=0;i<20;i++){const x=between(599,913),y=between(402,641);if(height(x,y)>.28||Math.hypot(x-784,y-494)<80)continue;civilization+=city(f(x),f(y),.1+between(0,.05));}

// Sacred tree as a delicate spreading crown with visible branching, never a giant pictogram.
let sacred='';
function branch(x,y,angle,length,depth){if(depth===0)return;const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;sacred+=`<path d="M${f(x)} ${f(y)}Q${f(x+Math.cos(angle+.2)*length*.5)} ${f(y+Math.sin(angle+.2)*length*.5)} ${f(ex)} ${f(ey)}" fill="none" stroke="${depth>3?'#8f9a76':'#758c68'}" stroke-width="${f(depth*.24)}"/>`;branch(ex,ey,angle-between(.3,.7),length*.69,depth-1);branch(ex,ey,angle+between(.3,.7),length*.73,depth-1);}
branch(1107,376,-Math.PI/2,18,6);
for(let i=0;i<270;i++){const a=between(0,Math.PI*2),r=Math.sqrt(rnd()),x=1106+Math.cos(a)*r*38,y=341+Math.sin(a)*r*22; sacred+=`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(between(.5,2.2))}" ry="${f(between(.5,1.5))}" fill="${color('315443','acb083',rnd()*.85)}" stroke="#234538" stroke-width=".25"/>`;}
civilization+=`<g>${sacred}</g>`;

const trade=['M461 572Q566 587 646 563T762 571','M762 571Q868 570 971 484T1102 423','M762 571Q706 405 764 338T845 231','M762 571Q682 616 712 677T840 797','M558 568Q541 631 602 671T712 677','M1102 423Q1280 444 1278 576T1230 811'];
let routes=`<g id="routes" fill="none" stroke="#b9bca0" stroke-width=".8" stroke-dasharray="1 5" opacity=".55">${trade.map(d=>`<path d="${d}"/>`).join('')}</g>`;
const labelPositions={'神州':[784,491],'西庚':[483,487],'东苍':[1090,507],'北冥':[790,297],'南炎':[719,738],'潮音海':[225,473],'龙眠海':[1373,404],'蓬莱幻海':[1280,761],'北冥冰海':[812,99],'雷暴海':[1016,711]};
let labels=`<g id="labels">`;
for(const r of data.regions){const[x,y]=labelPositions[r.id];labels+=`<g class="region ${r.kind}" data-region="${r.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="查看${r.id}"><title>${r.id} · ${r.sub}</title><rect class="label-hit" x="-85" y="-36" width="170" height="72" rx="2"/><text class="region-name" text-anchor="middle">${r.id}</text><path class="name-line" d="M-36 15h25m22 0h25M-4 15l4-3 4 3-4 3Z"/><text class="region-sub" text-anchor="middle" y="33">${r.sub}</text></g>`;}
const smallLabels=[['建木神树',1148,351],['问道峰',653,441],['白虎天堑',461,411],['九曲天河',775,371],['赤霞花海',607,737],['汤谷灵泉',832,662],['苍茫古径',923,490],['赤金走廊',559,663],['雪线',658,354],['龙眠海峡',1242,588]];
labels+=smallLabels.map(([text,x,y])=>`<text class="minor-label" x="${x}" y="${y}" text-anchor="middle">${text}</text>`).join('');
labels+=`<g class="cartography-annotation"><text class="sea-note" x="112" y="759" transform="rotate(-90 112 759)">天 泣 洋 · 极 西 永 雨</text><text class="sea-note" x="1468" y="592" transform="rotate(90 1468 592)">无 尽 洋 · 海 图 之 外</text><text class="sea-note" x="1042" y="79">永 夜 海 域</text></g></g>`;

let portals=`<g id="portals">${data.portals.map(p=>`<g class="portal" data-portal="${p.id}" transform="translate(${p.x} ${p.y})" tabindex="0" role="button" aria-label="查看${p.label}"><circle r="18" fill="transparent"/><use href="#gateway"/><text x="0" y="21" text-anchor="middle">${p.label}</text></g>`).join('')}</g>`;

let extra='';
// Etched cloud banks and storm filaments; all strokes remain vector paths.
for(let i=0;i<9;i++){
 const p=[];for(let j=0;j<90;j++){const a=j/89*Math.PI*2.3,r=11+j*.29;p.push([1030+Math.cos(a)*r*1.5,663+Math.sin(a)*r*.53+i*3]);}
 extra+=`<path d="${smooth(p)}" fill="none" stroke="#a0a7af" stroke-opacity=".13" stroke-width=".5"/>`;
}
extra+=`<path d="M1030 630l-11 23 9-2-17 26 33-33-13 5 10-23" fill="none" stroke="#bfb1c0" stroke-width=".85" opacity=".7"/>`;
for(let i=0;i<4;i++)extra+=`<path d="M1129 ${807+i*4}q29-17 53-4t50-1q28-17 70-4" fill="none" stroke="#d1d2af" stroke-width=".55" opacity=".26"/>`;
function ship(x,y,s=1){return`<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#b4ba99" stroke-width=".65"><path d="M-15 0q16 10 31-2l-5 7h-19Z" fill="#2b4c48"/><path d="M-3-25v25M5-20v22M-4-24q-10 5-9 17l10 2M6-19q11 5 9 15L6-2"/><path d="M-5-17h-7M-4-11h-9M7-12h8M7-7h8" opacity=".6"/><path d="M-20 9q20 6 42-2m-31 6q12 3 25-1" opacity=".4"/></g>`;}
extra+=ship(207,599,.83)+ship(1365,551,.7)+ship(1152,879,.61);

let frame=`<g class="cartography-annotation"><rect width="1600" height="1000" fill="url(#vignette)"/>
<g transform="translate(95 88)"><rect x="-22" y="-22" width="44" height="47" fill="none" stroke="#b18668" stroke-width=".85"/><rect x="-18" y="-18" width="36" height="39" fill="none" stroke="#b18668" stroke-width=".4"/><text text-anchor="middle" y="-1" fill="#c09c7c" font-size="15" letter-spacing="2">山海</text><text text-anchor="middle" y="17" fill="#c09c7c" font-size="15" letter-spacing="2">藏图</text></g>
<text x="141" y="96" fill="#d9c9a6" font-size="34" letter-spacing="7">九野山海舆图</text><text x="144" y="125" fill="#90a398" font-size="10" letter-spacing="4">地 界 卷 · 五 域 四 海</text><path d="M73 150H434M73 155H231" fill="none" stroke="#b9ac85" stroke-opacity=".35" stroke-width=".6"/>
<text x="89" y="195" fill="#95a697" font-size="12" letter-spacing="6" style="writing-mode:vertical-rl">山河有界，道途无涯。</text>
<g transform="translate(1373 163)" fill="none" stroke="#b3b694" stroke-width=".6"><circle r="44" opacity=".6"/><circle r="49" opacity=".25"/>${Array.from({length:32},(_,i)=>{const a=i*Math.PI/16;return`<path d="M${f(Math.cos(a)*44)} ${f(Math.sin(a)*44)}L${f(Math.cos(a)*(i%4?40:36))} ${f(Math.sin(a)*(i%4?40:36))}" opacity=".6"/>`;}).join('')}<path d="M0-38L5-6 0 0-5-6Z" fill="#c5bd94"/><path d="M38 0L6 5 0 0 6-5ZM0 38L-5 6 0 0 5 6ZM-38 0L-6-5 0 0-6 5Z" fill="#30504b"/><circle r="3" fill="#c5bd94"/><g fill="#c2bd9d" stroke="none" font-size="10" text-anchor="middle"><text y="-59">北</text><text y="68">南</text><text x="63" y="4">东</text><text x="-63" y="4">西</text></g></g>
<g transform="translate(78 875)" fill="#a2b0a0" font-size="10"><text font-size="12" letter-spacing="4">九 野 通 衢 · 阵 阶</text><path d="M0 15H290" stroke="#b6b28a" stroke-opacity=".4" stroke-width=".5"/><g color="#efd49b"><use href="#array-star" transform="translate(8 37) scale(.7)"/></g><text x="27" y="41">域间星枢</text><g color="#aed6c6"><use href="#array-official" transform="translate(161 37) scale(.8)"/></g><text x="181" y="41">境道官阵</text><g color="#c1acd8"><use href="#array-hidden" transform="translate(8 65) scale(.85)"/></g><text x="27" y="69">隐界暗桩 · 位置示意</text><use href="#gateway" transform="translate(161 65) scale(.8)"/><text x="181" y="69">天地渊途</text></g>
<g transform="translate(633 919)" stroke="#9cac91" stroke-width=".6" fill="none"><path d="M0 0H325M0-4v8M81-3v6M162-4v8M243-3v6M325-4v8"/><text x="162" y="25" text-anchor="middle" stroke="none" fill="#8fa293" font-size="10" letter-spacing="3">山海形势示意 · 不作里程量度</text></g>
<rect x="25" y="25" width="1550" height="950" fill="none" stroke="#c0ae83" stroke-width=".7" opacity=".46"/><rect x="31" y="31" width="1538" height="938" fill="none" stroke="#c0ae83" stroke-width=".4" opacity=".22"/>
${[[25,25,1,1],[1575,25,-1,1],[25,975,1,-1],[1575,975,-1,-1]].map(([x,y,sx,sy])=>`<path d="M0 36V0H36M5 26V5H26M10 18V10H18" transform="translate(${x} ${y}) scale(${sx} ${sy})" fill="none" stroke="#c9b68b" stroke-width="1"/>`).join('')}
</g>`;

const style=`<style>
text{font-family:'STKaiti','KaiTi','Noto Serif CJK SC','Songti SC',serif}
.cartography-annotation{pointer-events:none}.region,.portal{cursor:pointer;outline:none}.label-hit{fill:transparent;stroke:none}
.region-name{font-size:31px;letter-spacing:10px;fill:#213f35;paint-order:stroke;stroke:#c8c39c;stroke-opacity:.83;stroke-width:2.6;font-weight:700}.region-sub{font-family:'Microsoft YaHei',sans-serif;font-size:8.5px;letter-spacing:2px;fill:#294c3c;paint-order:stroke;stroke:#b4b78e;stroke-width:1.2;stroke-opacity:.7}.name-line{stroke:#435f47;fill:none;stroke-width:.65}
.sea .region-name{font-size:23px;letter-spacing:6px;fill:#bfcab4;stroke:#153237;stroke-width:3}.sea .region-sub{fill:#91a79a;stroke:#143039}.sea .name-line{stroke:#a7b59a}.minor-label{font-size:9px;fill:#284536;paint-order:stroke;stroke:#c0c09b;stroke-width:2;stroke-opacity:.85;letter-spacing:1px}.sea-note{fill:#809990;font-size:12px;letter-spacing:4px}
.portal text{font-family:'Microsoft YaHei',sans-serif;font-size:8px;letter-spacing:1px;fill:#cfc2a2;paint-order:stroke;stroke:#193836;stroke-width:2.5}.portal:hover use,.portal:focus-visible use{stroke:#fff}.hidden-layer{display:none}
.capital{cursor:pointer;outline:none}.capital-halo{fill:#213e32;fill-opacity:.1;stroke:transparent;stroke-width:.7}.capital:hover .capital-halo,.capital:focus-visible .capital-halo,.capital.selected .capital-halo{fill:#e5cf9b;fill-opacity:.14;stroke:#e6cea0;stroke-dasharray:2 3}.capital-name{font-size:10px;fill:#283f33;paint-order:stroke;stroke:#c9c6a1;stroke-width:2;letter-spacing:1.5px}.capital use{pointer-events:none}
${transportStyle}
${outlines.style}
</style>`;
const svg=optimizeAtlasSvg(`<svg xmlns="http://www.w3.org/2000/svg" id="atlas" viewBox="0 0 1600 1000" role="group" aria-labelledby="map-title map-description"><title id="map-title">九野山海舆图 · 城郭阵枢版</title><desc id="map-description">精细蚀刻地形、五域主城及三阶地脉灵轨组成的纯 SVG 地界图。主城与阵枢均可点选，地域范围、阵路与暗桩位置为示意。</desc>${defs}${style}<style>${sectStyles}</style>${background}${relief}${islands}${extra}${outlines.markup}${routes}${arrayArtwork.lines}${civilization}${labels}${capitalMap()}${sectArt.markup}${portals}${arrayArtwork.nodes}${frame}</svg>`);
fs.writeFileSync(path.join(dir,'shanhai-atlas.svg'),svg);
fs.writeFileSync(path.join(dir,'surface-geography.json'),JSON.stringify(outlines.areas));
fs.writeFileSync(path.join(dir,'capitals-study.svg'),optimizeAtlasSvg(capitalStudy(capitalDefs)));
const shell=readPreviewShell();
fs.writeFileSync(path.join(dir,'index.html'),shell.replace('<!-- ATLAS_SVG -->',svg).replace('/* ATLAS_DATA */',JSON.stringify(data)));
console.log(JSON.stringify({svgKB:Math.round(svg.length/1024),elevationContours:levels.length,hachures:hatchLayers.reduce((s,p)=>s+p.length,0),coastVertices:coastline.length,bitmapElements:0}));
