// Five individual architectural engravings. Coordinates describe an oblique ground plane.
const n=v=>+v.toFixed(2);
const project=(x,y,z=0)=>[n((x-y)*.91),n((x+y)*.43-z)];
const path=p=>p.map((v,i)=>`${i?'L':'M'}${v.join(',')}`).join('')+'Z';
const polygon=(p,fill,stroke='#354d40',width=.5)=>`<path d="${path(p)}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
const line=(p,color='#a7ad89',width=.5,opacity=1)=>`<path d="${p.map((v,i)=>`${i?'L':'M'}${v.join(',')}`).join('')}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
const rect=(x,y,w,d,z=0)=>[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(([a,b])=>project(a,b,z));
const palettes={
 imperial:{roof:'#3b6356',ridge:'#d7bd7f',wall:'#d5c8a2',shade:'#93a089',stone:'#b2b398',accent:'#bca46b'},
 metal:{roof:'#5a6658',ridge:'#e1c68d',wall:'#c1b898',shade:'#8a907a',stone:'#a3a48b',accent:'#dfbd73'},
 wood:{roof:'#3d6955',ridge:'#b9c697',wall:'#c3c7a5',shade:'#809a7e',stone:'#889e82',accent:'#a7c798'},
 fire:{roof:'#704e42',ridge:'#e2c08d',wall:'#d4bda1',shade:'#9d8c75',stone:'#a5927a',accent:'#d5a573'},
 ice:{roof:'#799d9c',ridge:'#e5e6c7',wall:'#dce0c6',shade:'#9cb9b0',stone:'#b7cec0',accent:'#b7d9ce'},
};
function block(x,y,w,d,h,p,z=0){const base=rect(x,y,w,d,z),top=rect(x,y,w,d,z+h);return polygon([base[1],base[2],top[2],top[1]],p.shade)+polygon([base[2],base[3],top[3],top[2]],p.wall)+polygon(top,p.stone);}
function roof(x,y,w,d,z,p){
 const e=1.5,hh=Math.max(2.6,w*.15),corners=rect(x-e,y-e,w+e*2,d+e*2,z);
 const a=project(x+w*.24,y+d/2,z+hh),b=project(x+w*.76,y+d/2,z+hh);
 let out=polygon([corners[0],a,b,corners[1]],p.shade,'#314a3b',.4)+polygon([corners[1],b,corners[2]],p.roof,'#314a3b',.4)+polygon([corners[2],b,a,corners[3]],p.roof,'#314a3b',.6)+polygon([corners[3],a,corners[0]],p.shade,'#314a3b',.4);
 out+=line([a,b],p.ridge,.9)+line([corners[3],corners[2]],p.ridge,.7);
 // Close-set tile ribs and curled eave tips remain visible at large zoom.
 for(let u=.08;u<.96;u+=.07){const q=project(x+w*u,y+d/2,z+hh),r=project(x-e+(w+3)*u,y+d+e,z);out+=line([q,r],p.ridge,.3,.62);}
 for(let v=1;v<4;v++){const t=v/4;out+=line([project(x+w*.24*(1-t)-e*t,y+d/2*(1-t)+(d+e)*t,z+hh*(1-t)),project(x+w*(.76+.24*t)+e*t,y+d/2*(1-t)+(d+e)*t,z+hh*(1-t))],p.ridge,.22,.35);}
 for(const c of [corners[2],corners[3]])out+=`<path d="M${c}q${c===corners[2]?2:-2} 0 ${c===corners[2]?3:-3} -2.2" fill="none" stroke="${p.ridge}" stroke-width=".65"/>`;
 return out;
}
function hall(x,y,w,d,h,p,{z=0,tiers=1}={}){
 let out=block(x-1,y-1,w+2,d+2,1.5,p,z)+block(x,y,w,d,h,p,z+1.5);
 for(let u=1.5;u<w;u+=2.6){out+=line([project(x+u,y+d,z+2),project(x+u,y+d,z+h)],p.ridge,.38);out+=polygon(rect(x+u-.6,y+d+.12,1.2,.05,z+h*.6),p.roof,'none');}
 for(let v=1.5;v<d;v+=3)out+=line([project(x+w,y+v,z+2),project(x+w,y+v,z+h*.85)],'#385344',.4);
 out+=roof(x,y,w,d,z+h+1.5,p);
 for(let tier=1;tier<tiers;tier++){const shrink=tier*1.8;out+=block(x+shrink,y+shrink,w-shrink*2,d-shrink*2,3.1,p,z+h+1.5+(tier-1)*5);out+=roof(x+shrink,y+shrink,w-shrink*2,d-shrink*2,z+h+tier*5+1.5,p);}
 return out;
}
function pagoda(x,y,w,tiers,p,z=0){let out='';for(let i=0;i<tiers;i++){const s=w-i*.95;out+=hall(x+i*.475,y+i*.475,s,s,4,p,{z:z+i*7.2});}const a=project(x+w/2,y+w/2,z+tiers*7.2+1);out+=line([a,[a[0],a[1]-5]],p.ridge,.7)+`<circle cx="${a[0]}" cy="${a[1]-6}" r=".9" fill="${p.ridge}"/>`;return out;}
function wallSegment(a,b,z,p,height=6){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),nx=-dy/len*1.4,ny=dx/len*1.4;
 let out=polygon([project(...a,z),project(...b,z),project(...b,z+height),project(...a,z+height)],p.wall);
 out+=polygon([project(...a,z+height),project(...b,z+height),project(b[0]+nx,b[1]+ny,z+height),project(a[0]+nx,a[1]+ny,z+height)],p.stone);
 for(let row=1;row<height;row+=1.5){out+=line([project(...a,z+row),project(...b,z+row)],'#536957',.26,.65);for(let t=(row%3?1:2.4);t<len;t+=3.2){const q=t/len;out+=line([project(a[0]+dx*q,a[1]+dy*q,z+row),project(a[0]+dx*q,a[1]+dy*q,z+Math.min(height,row+1.5))],'#536957',.22,.6);}}
 for(let t=0;t<len;t+=3.7){const q=t/len;out+=polygon([project(a[0]+dx*q,a[1]+dy*q,z+height),project(a[0]+dx*q+dx/len*1.8,a[1]+dy*q+dy/len*1.8,z+height),project(a[0]+dx*q+dx/len*1.8,a[1]+dy*q+dy/len*1.8,z+height+1.8),project(a[0]+dx*q,a[1]+dy*q,z+height+1.8)],p.wall,'#36503f',.35);}
 return out;
}
function tree(x,y,r,p,height=9){
 const q=project(x,y,height),b=project(x,y),leaves=[];
 let out=line([b,q],p.wall,1.1)+line([[q[0],q[1]+4],[q[0]-r*.5,q[1]-1]],p.wall,.65);
 for(let i=0;i<24;i++){const a=i*2.399,rr=Math.sqrt((i+.5)/24)*r;leaves.push(`<ellipse cx="${n(q[0]+Math.cos(a)*rr)}" cy="${n(q[1]+Math.sin(a)*rr*.62)}" rx="${n(r*.29)}" ry="${n(r*.17)}" fill="${i%3?p.roof:p.shade}" stroke="${p.ridge}" stroke-width=".25"/>`);}
 return out+leaves.join('');
}
function streets(p){let out='';for(let k=-30;k<=30;k+=12)out+=line([project(k,-36),project(k,36)],p.wall,1.7,.75)+line([project(-36,k),project(36,k)],p.wall,1.7,.75);return out;}
function bridge(x,y,w,d,p,z=3){let out=block(x,y,w,d,z,p);for(let i=0;i<4;i++)out+=line([project(x+w*i/3,y,z+2),project(x+w*i/3,y,z)],p.ridge,.5);out+=line([project(x,y,z+2),project(x+w,y,z+2)],p.wall,.8);return out;}
function town(kind){
 const p=palettes[kind],lo=-43,hi=43;
 let out=`<g stroke-linecap="round" stroke-linejoin="round">`;
 const oct=[[-31,-47],[31,-47],[47,-31],[47,31],[31,47],[-31,47],[-47,31],[-47,-31]];
 const corners=kind==='fire'||kind==='ice'?oct:[[lo,lo],[hi,lo],[hi,hi],[lo,hi]];
 // Broad, many-lined foundation; no opaque rectangular badge behind the city.
 out+=polygon(corners.map(([x,y])=>project(x,y,-4)),p.shade,'#243f35',.6)+polygon(corners.map(([x,y])=>project(x,y)),p.stone,'#d0c49e',.65);
 for(let i=1;i<=3;i++)out+=line([...corners,corners[0]].map(([x,y])=>project(x,y,-i)),p.ridge,.28,.6);
 if(kind==='ice'||kind==='imperial')for(let i=0;i<4;i++)out+=line([...corners,corners[0]].map(([x,y])=>project(x*(1.1+i*.035),y*(1.1+i*.035),-2)),kind==='ice'?'#b5d3cd':'#819f8d',.55,.7);
 out+=streets(p);
 // Back walls and watchtowers first, then buildings sorted by ground depth.
 for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length];if((a[0]+a[1]+b[0]+b[1])/2<0)out+=wallSegment(a,b,0,p,kind==='wood'?3.5:6.5);}
 const buildings=[];const add=(x,y,draw)=>buildings.push({depth:x+y,draw});
 for(let y=-33;y<=30;y+=12)for(let x=-33;x<=30;x+=12){
  if((Math.abs(x)<17&&y<10)||(Math.abs(x)<8)||(kind==='wood'&&Math.hypot(x,y)<24))continue;
  const salt=((x+43)*73+(y+43)*29)%7;
  add(x,y,hall(x,y,6+salt*.3,5+salt*.2,3.6,p));
 }
 if(kind==='imperial'){
  for(const y of [-28,-10,8])add(-12,y,hall(-12,y,24,12,y===-28?10:6,p,{tiers:y===-28?2:1}));
  for(const x of [-26,19])for(const y of [-29,-14,1])add(x,y,hall(x,y,7,11,5,p));
  for(const x of [-24,22])add(x,-36,pagoda(x,-36,7,3,p));
  for(const y of [-17,1,22])out+=block(-4,y,8,4,1,p);
 }else if(kind==='metal'){
  const terraces=[[0,0,30],[-26,-14,17],[21,-13,17]];
  for(const[x,y,w]of terraces){out+=block(x-w/2,y-w/2,w,w,5,p);add(x,y,pagoda(x-6,y-6,12,x===0?7:4,p,5));}
  for(const x of [-32,25])add(x,21,hall(x,21,9,14,7,p,{tiers:2}));
  for(const x of [-34,-27,28,35])add(x,13,block(x,13,2.4,2.4,17,p)+roof(x-.5,12.5,3.4,3.4,17,p));
 }else if(kind==='wood'){
  for(const[x,y,r]of[[-21,-21,16],[18,-13,14],[0,8,21]]){
   add(x,y,tree(x,y,r,p,15)+hall(x-5,y-5,10,9,4,p,{z:16,tiers:2}));
  }
  out+=bridge(-20,3,40,3,p,8)+bridge(3,-24,3,51,p,8);
  for(const[x,y]of[[-31,19],[23,22],[-8,29]])add(x,y,hall(x,y,12,9,5,p,{tiers:2}));
  for(const[x,y]of[[-33,-32],[32,-28],[-31,29],[30,31]])add(x,y,tree(x,y,8,p,7));
 }else if(kind==='fire'){
  for(let i=0;i<3;i++)out+=polygon(oct.map(([x,y])=>project(x*(.55-i*.1),y*(.55-i*.1),i*2)),p.stone,p.ridge,.8);
  add(-8,-8,pagoda(-8,-8,16,6,p,6));
  for(const[x,y]of[[-28,-20],[15,-28],[-30,15],[17,17]])add(x,y,hall(x,y,13,10,6,p,{tiers:2}));
  for(const[x,y]of[[-29,29],[30,-6],[18,30]]){add(x,y,block(x,y,5,5,9,p)+polygon(rect(x+.6,y+.6,3.8,3.8,9.2),'#c69c66',p.ridge,.5));}
 }else if(kind==='ice'){
  out+=polygon(oct.map(([x,y])=>project(x*.65,y*.65,1)),'#a0bdb4',p.ridge,.6);
  for(let i=0;i<6;i++)out+=line([project(-25, -21+i*8,1.2),project(25,-21+i*8,1.2)],'#dce1c6',.35,.6);
  add(-10,-10,hall(-10,-10,20,18,12,p,{tiers:3})+pagoda(-5,-5,10,5,p,12));
  for(const[x,y]of[[-31,-23],[24,-24],[-25,22],[23,24]])add(x,y,pagoda(x,y,7,4,p));
  for(const x of [-12,9])out+=bridge(x,23,4,33,p,3);
 }
 for(const v of buildings.sort((a,b)=>a.depth-b.depth))out+=v.draw;
 for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length];if((a[0]+a[1]+b[0]+b[1])/2>=0)out+=wallSegment(a,b,0,p,kind==='wood'?3.5:6.5);}
 for(const[x,y]of corners)out+=hall(x-2.5,y-2.5,5,5,8,p,{tiers:kind==='metal'?2:1});
 // Two gate pavilions, portcullis, steps, bridges and pennants.
 for(const[x,y]of[[4,hi],[hi,4]]){
  out+=hall(x-5,y-3,10,6,8,p,{tiers:2});
  const q=project(x,y+3.1,2);out+=`<path d="M${q[0]-2},${q[1]}v-4a2 2 0 014 0v4" fill="#28483b" stroke="${p.ridge}" stroke-width=".6"/>`;
  for(let j=0;j<5;j++)out+=line([project(x-4,y+5+j,0),project(x+4,y+5+j,0)],p.wall,.7);
 }
 if(kind==='imperial'||kind==='metal')for(const[x,y]of[[-41,41],[41,41],[41,-41]]){const q=project(x,y,15);out+=line([q,[q[0],q[1]-11]],p.ridge,.6)+polygon([[q[0],q[1]-11],[q[0]+7,q[1]-9],[q[0],q[1]-6]],p.roof,p.ridge,.4);}
 return out+'</g>';
}

export const capitals=[
 {id:'大夏帝都',key:'imperial',domain:'神州',x:762,y:571,scale:.58,hub:[823,558],sub:'中土帝阙 · 五域总枢',desc:'以重城宫阙、中轴殿庭与坊市街巷表现神州中枢。帝都星枢受大夏仙朝统御；深宫相传另藏尘封的绝天古阵。',features:'重城宫阙、三进殿庭、城门瓮城与坊市街巷',hubId:'帝都星枢'},
 {id:'金秤城',key:'metal',domain:'西庚',x:461,y:572,scale:.5,hub:[507,594],sub:'金域城枢 · 剑阁矿贸',desc:'以层台剑阁、厚重石垣和矿贸坊市表现西庚金域，城内设有跨域瞬至的域间星枢。',features:'层台剑阁、金石城垣、锻冶坊与矿贸街区',hubId:'金秤星枢'},
 {id:'青帝苑',key:'wood',domain:'东苍',x:1102,y:423,scale:.56,hub:[1151,446],sub:'木域城枢 · 林冠仙苑',desc:'以林冠台榭、连桥长廊与药圃表现东苍木域，仙苑中设有连通五域的域间星枢。',features:'林冠台榭、树上道场、悬桥长廊与灵药庭院',hubId:'青帝星枢'},
 {id:'琉璃仙城',key:'fire',domain:'南炎',x:840,y:797,scale:.51,hub:[783,824],sub:'火域城枢 · 琉璃丹阙',desc:'以多层琉璃宫阙、环台丹炉与炼器工坊表现南炎火域，昭明破阵宗督造的灵轨与城中星枢相接。',features:'琉璃重檐、层叠丹台、地火工坊与八面城垣',hubId:'琉璃星枢'},
 {id:'冰雪仙城',key:'ice',domain:'北冥',x:845,y:231,scale:.51,hub:[893,251],sub:'水域城枢 · 冰阙霜桥',desc:'以霜白重楼、冰渠与渡桥表现北冥水域，极寒商路在仙城星枢与境道节点之间汇聚。',features:'冰阙重楼、环城冰渠、四角霜塔与长桥',hubId:'冰雪星枢'},
];
// Shared engraving vocabulary; sects use smaller, individual compounds.
export { project, polygon, line, palettes, block, hall, pagoda, tree, bridge };
export function capitalDefinitions(keys=capitals.map(c=>c.key)){return capitals.filter(c=>keys.includes(c.key)).map(c=>`<g id="capital-${c.key}">${town(c.key)}</g>`).join('');}
export function capitalMap(){return `<g id="capitals">${capitals.map(c=>`<g class="capital" data-city="${c.id}" transform="translate(${c.x} ${c.y})" role="button" tabindex="0" aria-label="查看${c.id}城郭"><title>${c.id} · ${c.sub}</title><ellipse class="capital-halo" rx="${n(c.scale*89)}" ry="${n(c.scale*42)}" cy="-4"/><use href="#capital-${c.key}" transform="scale(${c.scale})"/><text class="capital-name" text-anchor="middle" y="${n(c.scale*55+10)}">${c.id}</text></g>`).join('')}</g>`;}
export function capitalStudy(defs){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 430" style="background:#102c33;width:100%;height:100vh;display:block" role="img" aria-label="五域主城建筑细部对照"><defs>${defs}</defs><rect width="1600" height="430" fill="#102c33"/><text x="800" y="48" text-anchor="middle" fill="#d8c298" font-family="KaiTi,serif" font-size="26" letter-spacing="8">五域城郭 · 九野阵枢</text><text x="800" y="76" text-anchor="middle" fill="#92a798" font-family="sans-serif" font-size="11" letter-spacing="2">纯 SVG 建筑细部 · 城郭形制为视觉设计</text>${capitals.map((c,i)=>`<g transform="translate(${160+i*320} 229)"><use href="#capital-${c.key}" transform="scale(1.65)"/><text text-anchor="middle" y="113" fill="#dfc99d" font-family="KaiTi,serif" font-size="24" letter-spacing="5">${c.id}</text><text text-anchor="middle" y="141" fill="#93ab9d" font-family="sans-serif" font-size="11">${c.sub}</text></g>`).join('')}</svg>`;}
