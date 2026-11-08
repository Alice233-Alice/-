// All marks are deterministic SVG geometry. No bitmap textures, filters or frame loops.
export const f = n => +n.toFixed(2);
let state = 20260920;
export const rnd = () => { state = Math.imul(state ^ state >>> 15, 1 | state); state ^= state + Math.imul(state ^ state >>> 7, 61 | state); return ((state ^ state >>> 14) >>> 0) / 4294967296; };
const range = (a,b) => a + rnd() * (b-a);
export const line = (d,c='#a6b7b0',w=.6,o=1) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" opacity="${o}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const path = p => p.map((q,i)=>`${i?'L':'M'}${f(q[0])},${f(q[1])}`).join('');
export const poly = (p,fill='#33454b',c='#94aba7',w=.55,o=1) => `<path d="${path(p)}Z" fill="${fill}" stroke="${c}" stroke-width="${w}" opacity="${o}" stroke-linejoin="round"/>`;
const ellipse = (x,y,rx,ry,fill,c,w=.5,o=1) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
export const group = (x,y,s,art,rotate=0) => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s})">${art}</g>`;
const project=(x,y,z=0)=>[f((x-y)*.86),f((x+y)*.34-z)];
const rect=(x,y,w,d,z=0)=>[[x,y],[x+w,y],[x+w,y+d],[x,y+d]].map(([a,b])=>project(a,b,z));

export const defs = `<defs>
  <linearGradient id="sky-ground" x2=".8" y2="1"><stop stop-color="#060e19"/><stop offset=".48" stop-color="#101e2b"/><stop offset="1" stop-color="#102b34"/></linearGradient>
  <radialGradient id="sky-halo"><stop stop-color="#648f94" stop-opacity=".15"/><stop offset="1" stop-color="#152432" stop-opacity="0"/></radialGradient>
  <radialGradient id="gold-halo"><stop stop-color="#c5a775" stop-opacity=".10"/><stop offset="1" stop-color="#c5a775" stop-opacity="0"/></radialGradient>
  <linearGradient id="rock-face" x2=".3" y2="1"><stop stop-color="#455858"/><stop offset=".6" stop-color="#293c43"/><stop offset="1" stop-color="#14242f"/></linearGradient>
  <linearGradient id="burnt-face" x2=".5" y2="1"><stop stop-color="#544b43"/><stop offset=".5" stop-color="#393734"/><stop offset="1" stop-color="#20272d"/></linearGradient>
  <linearGradient id="law-edge"><stop stop-color="#a3916d" stop-opacity=".2"/><stop offset=".55" stop-color="#f0d497"/><stop offset="1" stop-color="#bfa978" stop-opacity=".3"/></linearGradient>
  <radialGradient id="silent-hole"><stop offset=".65" stop-color="#030811"/><stop offset=".96" stop-color="#030811"/><stop offset="1" stop-color="#688593" stop-opacity=".18"/></radialGradient>
</defs>`;

export function atmosphere(height=1680) {
  let out = `<rect width="1800" height="${height}" fill="url(#sky-ground)"/><ellipse cx="930" cy="1190" rx="880" ry="440" fill="url(#sky-halo)"/><ellipse cx="1320" cy="245" rx="510" ry="270" fill="url(#gold-halo)"/>`;
  for(let i=0;i<910;i++){
    const x=range(160,1720),y=range(95,height-75),r=range(.22,.9),o=range(.07,.35);
    out+=ellipse(x,y,r,r,'#c8ccbb','none',0,f(o));
    if(i%73===0)out+=line(`M${f(x-4)} ${f(y)}h8M${f(x)} ${f(y-4)}v8`,'#baad8f',.45,.27);
  }
  // Thin parallel flow lines: wind below, extremely sparse curvature in upper void.
  for(let band=0;band<5;band++)for(let j=0;j<22;j++){
    const y=785+band*143+j*3;
    out+=line(`M155 ${y}C410 ${y-170} 690 ${y+85} 1002 ${y-112}S1400 ${y-211} 1690 ${y-139}`,'#749495',.36,.035+j%5*.006);
  }
  for(let i=0;i<15;i++)out+=line(`M${430+i*7} 1325C${280+i*9} 1130 ${431+i*9} 982 ${240+i*12} 946`,'#96b8b4',.5,.10);
  return out;
}

export function floatingRock(x,y,rx,ry,depth,{warm=false,rubble=65}={}) {
  const col=warm?'#ab9980':'#a7b8ae',N=64,top=[];
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2,r=1+Math.sin(a*7+rx)*.07+Math.sin(a*17+ry)*.045+range(-.025,.025);
    top.push([Math.cos(a)*rx*r,Math.sin(a)*ry*r]);
  }
  let out='';
  // Front fractured faces are independent facets with a ragged, hanging lower edge.
  const lower=top.slice(0,N/2+1).map(([a,b],i)=>[a*.78+Math.sin(i*1.4)*rx*.05,b+depth*(.28+Math.sin(i/32*Math.PI)*.6+range(-.08,.12))]);
  for(let i=0;i<N/2;i++){
    const p=[top[i],top[i+1],lower[i+1],lower[i]];
    out+=poly(p,warm?'url(#burnt-face)':'url(#rock-face)',col,.27);
    for(let j=0;j<5;j++){
      const t=(j+1)/6,a=[top[i][0]*(1-t)+top[i+1][0]*t,top[i][1]*(1-t)+top[i+1][1]*t];
      const b=[lower[i][0]*(1-t)+lower[i+1][0]*t,lower[i][1]*(1-t)+lower[i+1][1]*t];
      out+=line(`${path([a,[a[0]*.55+b[0]*.45+range(-2,2),a[1]*.55+b[1]*.45],b])}`,col,.32,range(.18,.5));
    }
    for(let j=1;j<7;j++){
      const t=j/7;
      out+=line(path([[top[i][0]*(1-t)+lower[i][0]*t,top[i][1]*(1-t)+lower[i][1]*t],[top[i+1][0]*(1-t)+lower[i+1][0]*t,top[i+1][1]*(1-t)+lower[i+1][1]*t]]),col,.22,.20);
    }
    for(let j=0;j<32;j++){
      const u=range(.1,.9),v=range(.04,.89),a=[top[i][0]*(1-u)+top[i+1][0]*u,top[i][1]*(1-u)+top[i+1][1]*u],b=[lower[i][0]*(1-u)+lower[i+1][0]*u,lower[i][1]*(1-u)+lower[i+1][1]*u];
      const xx=a[0]*(1-v)+b[0]*v,yy=a[1]*(1-v)+b[1]*v;
      out+=line(`M${f(xx)} ${f(yy)}l${f(range(-2.5,2.5))} ${f(range(1,5))} ${f(range(-1.3,1.3))} ${f(range(1,4))}`,j%3?col:'#102b31',.26,j%3?.34:.85);
    }
  }
  out+=poly(top,warm?'#46443d':'#405453',col,.75);
  // Nested irregular contours continue across the surface.
  for(let j=0;j<16;j++){
    const r=1-j*.041;
    out+=line(path(top.map(([a,b],i)=>[a*r+Math.sin(i*.61+j*.27)*1.4,b*r+Math.cos(i*.38+j*.41)*1.2]))+'Z',col,.28,.18);
  }
  for(let i=0;i<rubble;i++){
    const a=range(0,Math.PI*2),r=Math.sqrt(rnd())*.86,xx=Math.cos(a)*rx*r,yy=Math.sin(a)*ry*r,ww=range(1.1,4.5);
    out+=poly([[xx-ww,yy],[xx-ww*.4,yy-ww*.9],[xx+ww*.6,yy-ww*.6],[xx+ww,yy],[xx,yy+ww*.4]],warm?'#555148':'#536760',col,.28,.72);
    out+=line(`M${f(xx-ww*.4)} ${f(yy-ww*.9)}l${f(ww*.45)} ${f(ww*.9)} ${f(ww*.9)} 0`,col,.25,.55);
  }
  for(let j=0;j<8;j++){
    const xx=range(-rx*.78,rx*.78),yy=range(-ry*.4,ry*.7);
    out+=line(`M${f(xx)} ${f(yy)}l8 -3 6 1 4 -4 8 0 6 -3`,warm?'#211f23':'#172c34',.65,.85);
  }
  return group(x,y,1,out);
}

function block(x,y,w,d,h,z=0) {
  const b=rect(x,y,w,d,z),t=rect(x,y,w,d,z+h);
  let out=poly([b[1],b[2],t[2],t[1]],'#4b5a55','#a7b7a7',.4)+poly([b[2],b[3],t[3],t[2]],'#7a8673','#c3c2a2',.45)+poly(t,'#a1a78a','#ddd0a6',.45);
  for(let j=2;j<h;j+=2.3){
    out+=line(path([project(x,y+d,z+j),project(x+w,y+d,z+j)]),'#3b504b',.35,.8);
    for(let k=j%4;k<w;k+=5.7)out+=line(path([project(x+k,y+d,z+j),project(x+k,y+d,z+Math.min(j+2.3,h))]),'#354d49',.35,.7);
  }
  return out;
}

function column(x,y,z,h,r=2) {
  const [xx,yy]=project(x,y,z);let out='';
  out+=poly([[xx-r,yy],[xx-r,yy-h],[xx-r*.3,yy-h-1.5],[xx+r,yy-h+.5],[xx+r,yy]],'#acb298','#d4d0aa',.4);
  out+=line(`M${xx} ${yy}v-${h}`,'#4a6057',.45,.8);
  out+=ellipse(xx,yy,r+1,.9,'#9ba68f','#d5cca3',.35);
  out+=line(`M${xx-r} ${yy-h+2}h${r*2}M${xx-r-1} ${yy-2}h${r*2+2}`,'#ded2a4',.5);
  return out;
}

function roof(x,y,w,d,z,broken=false) {
  const a=project(x-3,y-3,z),b=project(x+w+3,y-3,z),c=project(x+w+3,y+d+3,z),e=project(x-3,y+d+3,z);
  const r1=project(x+w*.15,y+d*.5,z+9),r2=project(x+w*.85,y+d*.5,z+9);
  let out=poly([a,r1,r2,b],'#647a70','#bac8ad',.45)+poly([e,r1,r2,c],'#2d5253','#dbc999',.7)+poly([b,r2,c],'#47665f','#aaa984',.4);
  for(let j=0;j<37;j++){
    const t=j/36,u=[e[0]*(1-t)+c[0]*t,e[1]*(1-t)+c[1]*t],v=[r1[0]*(1-t)+r2[0]*t,r1[1]*(1-t)+r2[1]*t];
    if(broken&&t>.62&&t<.85)continue;
    out+=line(path([u,v]),'#a6b696',.32,.7);
    for(let k=1;k<6;k++){const s=k/6;out+=line(`M${f(u[0]*(1-s)+v[0]*s)} ${f(u[1]*(1-s)+v[1]*s)}l1.7 .4`,'#d9cda6',.4,.64);}
  }
  out+=line(path([r1,r2]),'#e0c68e',1.1);
  for(const [q,sign]of[[e,-1],[c,1]])out+=line(`M${q}q${sign*4} -1 ${sign*6} -6`,'#e3cea0',.9);
  if(broken)out+=poly([project(x+w*.64,y+d*.64,z+2),project(x+w*.78,y+d*.58,z+3),project(x+w*.76,y+d*.92,z),project(x+w*.93,y+d*.95,z-2),project(x+w*.86,y+d+3,z),project(x+w*.60,y+d+3,z)],'#152c32','#b8b791',.55);
  return out;
}

function ruinHall(x,y,w,d,h,{broken=false}={}) {
  let out=block(x-3,y-3,w+6,d+6,4);
  for(let j=0;j<4;j++)out+=block(x+w*.3,y+d+3+j*3,w*.4,3,3-j*.65);
  out+=block(x+1,y+1,w-2,d-2,h*.45,4);
  for(let k=0;k<=w;k+=w/6)out+=column(x+k,y+d,4,broken&&k>w*.65?h*.45:h,1.7);
  for(let k=0;k<d;k+=d/4)out+=column(x+w,y+k,4,h,1.5);
  for(let j=1;j<6;j++){
    const xx=x+j*w/6;
    out+=line(path([project(xx,y+d,8),project(xx,y+d,h)]),'#344d49',1.6);
    for(let k=0;k<4;k++)out+=line(path([project(xx-1.5,y+d,9+k*2),project(xx+1.5,y+d,11+k*2)]),'#dad0a7',.32,.8);
  }
  if(!broken)out+=roof(x,y,w,d,h+4)+block(x+6,y+4,w-12,d-8,3,h+5)+roof(x+5,y+3,w-10,d-6,h+10);
  else out+=roof(x,y,w,d,h+3,true);
  return out;
}

export function palace(ruined=false) {
  let out='';
  out+=block(-76,-22,148,49,5);
  // Inscribed courts, drains and mosaics, all projected onto the same plane.
  for(let x=-69;x<64;x+=6)for(let y=-17;y<22;y+=5)out+=line(path(rect(x,y,5.2,4.3,5))+'Z','#667d6e',.3,.55);
  for(let x=-67;x<64;x+=10){out+=column(x,24,5,range(4,17),1.5);out+=column(x,-20,5,range(7,18),1.4);}
  if(ruined){
    out+=group(-50,-16,1,ruinHall(-17,-11,34,22,20,{broken:true}));
    for(let x=-5;x<=55;x+=12)for(let y=-14;y<14;y+=13)out+=column(x,y,5,range(9,40),2);
    out+=group(17,-27,1,roof(-30,-15,60,30,0,true),33);
    out+=group(42,1,1,block(-22,0,45,7,5),-16);
  }else{
    out+=group(-68,-35,1,ruinHall(-17,-11,34,22,20,{broken:true}));
    out+=group(12,-37,1,ruinHall(-26,-16,52,32,23));
    out+=group(84,-9,.9,ruinHall(-18,-10,36,20,21,{broken:true}));
  }
  for(let i=0;i<38;i++){
    const x=range(-58,66),y=range(4,21),h=range(1,4);
    out+=block(x,y,range(1.5,4),range(2,5),h,5);
  }
  // Severed architrave and a leaning pillar in the near court.
  out+=group(-35,18,1,column(0,0,3,32,2.3),65);
  out+=group(50,27,1,block(-22,0,45,4,4),-9);
  for(let i=0;i<17;i++)out+=line(`M${-105+i*12} 34l-2 5 4 3 -3 4`,'#708779',.45,.6);
  return out;
}

export function ship() {
  let out=poly([[-135,-5],[-112,23],[-67,42],[15,47],[92,25],[131,-24],[77,-6],[-31,8]],'#314d53','#c2b997',.8);
  out+=line('M-133 -6Q-79 49 17 39Q79 34 132 -25','#e0c996',1.3);
  out+=line('M-126 5Q-48 67 65 34','#536a65',2.5);
  for(let i=0;i<32;i++){
    const x=-112+i*6.8,y=17+Math.sin((x+110)/220*Math.PI)*27;
    out+=line(`M${x} ${f(y)}Q${x-8} ${f(y-9)} ${x+3} ${f(y-33)}`,'#b2b698',1,.88);
    out+=line(`M${x+1.8} ${f(y)}Q${x-6.2} ${f(y-9)} ${x+4.8} ${f(y-33)}`,'#435c59',.5);
    for(let j=0;j<3;j++)out+=ellipse(x-1+j,y-j*9,.6,.7,'#e4c89c','none');
  }
  for(let j=0;j<10;j++)out+=line(`M-116 ${j*2}Q-25 ${29+j*1.9} 110 ${-14+j*1.2}`,'#a6b19b',.33,.54);
  // Most decking has fallen away, leaving frames and exposed cargo bulkheads.
  for(let i=0;i<13;i++){
    const x=-82+i*13;
    if(i%4!==0)out+=poly([[x,-2],[x+8,-5],[x+22,8],[x+13,12]],'#5d7466','#c0b99a',.45);
    out+=line(`M${x} -2l-4 -15 13 -5 11 15`,'#c5c4a3',1.1,.8);
    out+=line(`M${x+3} -3l-4 -10 7 -4`,'#657b71',.6);
  }
  out+=group(54,-20,.57,ruinHall(-15,-9,30,18,22,{broken:true}));
  out+=line('M-37 12L-44 -91M-34 11L-41 -93','#c8c6a7',1.5);
  out+=line('M-42 -64L-91 -45M-42 -66L17 -85','#9ea997',2);
  out+=poly([[-41,-62],[-15,-70],[-8,-59],[5,-64],[1,-45],[-13,-37],[-18,-43],[-39,-30]],'#6d7e70','#c1bd9c',.5,.65);
  for(let j=0;j<8;j++)out+=line(`M-40 ${-59+j*3.5}l${f(22+j*.9)} -7`,'#aeb397',.33,.6);
  out+=line('M-43 -90L-93 6M-43 -87L42 19M54 -48L107 -5M-78 -47L-109 9','#aab89e',.4,.85);
  out+=line('M-109 9q-13 23 -27 28m259 -58q17 14 12 31','#c4b58d',.75,.7);
  // Detached fragments keep the ruin from becoming a tidy intact boat icon.
  out+=poly([[143,-28],[161,-49],[163,-35],[153,-16]],'#5a6d60','#c8bc93',.6);
  out+=poly([[-146,-1],[-168,-10],[-153,10]],'#5c7368','#aeb699',.45);
  return out;
}

export function terrace() {
  let out='';
  for(let j=0;j<5;j++)out+=block(-42+j*3,-28+j*2,84-j*6,56-j*4,3,j*3);
  for(let i=0;i<4;i++)out+=column(i%2?29:-29,i<2?-18:18,15,range(18,33),2.3);
  // Small concentric seal on the stone surface: no teleport-network designation.
  for(let j=0;j<6;j++)out+=ellipse(0,-15,30-j*3.4,11-j*1.25,'none','#d5c897',.45,.8);
  for(let j=0;j<28;j++){
    const a=j/28*Math.PI*2;
    out+=line(path([[Math.cos(a)*26,Math.sin(a)*9.7-15],[Math.cos(a)*29,Math.sin(a)*10.8-15]]),'#e8d6a5',.65,.75);
  }
  out+=line('M-33 -28L-16 -21 -6 -25 3 -11 14 -15 35 -2','#18303a',1.3);
  return out;
}

function vertebra(x,y,size,angle,i) {
  let out='';
  out+=poly([[-6,-4],[-3,-8],[4,-7],[7,-3],[5,6],[-2,8],[-7,3]].map(([a,b])=>[a*size,b*size]),'#748d80','#b8bda1',.5);
  out+=ellipse(0,0,3.4*size,4*size,'#31484a','#abb89f',.6);
  out+=poly([[-3*size,-5*size],[-size,-18*size],[2*size,-22*size],[3*size,-5*size]],'#9ba68f','#d2c8a4',.5);
  for(const side of [-1,1]){
    const len=(23+Math.sin(i*.43)*8)*size;
    const d=`M${-4*size} ${side*4*size}C${-18*size} ${side*len*.5} ${-12*size} ${side*len*1.7} ${9*size} ${side*len*1.5}`;
    out+=line(d,'#304e4c',4.3*size,.9)+line(d,'#a1b49d',2.5*size,.92)+line(d,'#dae0b9',.4*size,.9);
    // Closely spaced cross-grain follows each rib's cubic curvature.
    const p0=[-4*size,side*4*size],p1=[-18*size,side*len*.5],p2=[-12*size,side*len*1.7],p3=[9*size,side*len*1.5];
    for(let k=2;k<34;k++){
      const t=k/35,u=1-t,xx=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],yy=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1];
      const dx=3*u*u*(p1[0]-p0[0])+6*u*t*(p2[0]-p1[0])+3*t*t*(p3[0]-p2[0]),dy=3*u*u*(p1[1]-p0[1])+6*u*t*(p2[1]-p1[1])+3*t*t*(p3[1]-p2[1]),m=Math.hypot(dx,dy),nx=-dy/m*size,ny=dx/m*size;
      out+=line(path([[xx-nx*.7,yy-ny*.7],[xx+nx,yy+ny]]),'#456359',.23,.8);
      if(k%9===i%9)out+=line(path([[xx-nx,yy-ny],[xx+nx*.7+dx/m,yy+ny*.7+dy/m]]),'#173638',.48,.9);
    }
    out+=line(`M${-6*size} ${side*8*size}q${-2*size} ${side*4*size} ${2*size} ${side*5*size}`,'#6a7d70',.5);
  }
  for(let j=0;j<6;j++)out+=line(`M${(-4+j*1.6)*size} ${-5*size}l${-1.1*size} ${4.5*size}`,'#5c7268',.3);
  return group(x,y,1,out,angle);
}

function dragonSkull() {
  let out='';
  // Chinese dragon antlers, fine grain, long maxilla, sockets and individual teeth.
  const horns=['M8 -10C21 -34 13 -42 33 -52L45 -75M25 -46L13 -69M32 -55L49 -55','M20 3C49 -12 58 -24 66 -48M47 -18L63 -15M55 -30L50 -47'];
  for(const d of horns)out+=line(d,'#4d625b',5)+line(d,'#c4c8ac',3)+line(d,'#e0d4ac',.6);
  const skull=[[-62,6],[-44,-9],[-26,-12],[-16,-25],[6,-30],[24,-20],[31,-5],[16,12],[-5,20],[-28,18],[-42,24],[-65,17]];
  out+=poly(skull,'#788f7f','#c5c9a6',.8);
  out+=poly([[-52,29],[-26,33],[-8,23],[15,18],[4,35],[-25,44],[-54,37],[-68,26]],'#536e64','#b2b99b',.65);
  out+=poly([[-62,6],[-44,-9],[-26,-12],[-16,-25],[-8,-21],[-25,-5],[-42,1],[-50,11]],'#a9b59a','none');
  out+=poly([[5,-27],[23,-19],[29,-5],[13,9],[1,11],[17,-4]],'#486860','none');
  out+=poly([[-62,17],[-31,13],[-7,15],[-28,18],[-42,24]],'#b1bba0','none');
  out+=`<defs><clipPath id="dragon-skull-clip">${poly(skull)}</clipPath></defs><g clip-path="url(#dragon-skull-clip)">`;
  for(let j=0;j<29;j++){
    out+=line(`M${-75+j*4} -30Q${-60+j*3.5} -5 ${-72+j*3.8} 25`,'#284d48',.28,.7);
    out+=line(`M${-74+j*4} -30Q${-59+j*3.5} -5 ${-71+j*3.8} 25`,'#d4d5b1',.2,.55);
  }
  for(let j=0;j<215;j++){
    const x=range(-66,30),y=range(-29,24);
    out+=line(`M${f(x)} ${f(y)}l${f(range(.3,1.6))} ${f(range(-1.5,.7))}`,'#254840',.3,range(.3,.7));
  }
  out+='</g>';
  out+=poly([[-8,-15],[5,-20],[17,-11],[9,0],[-2,1],[-13,-4]],'#1a313a','#6a8479',1.2);
  out+=poly([[-47,2],[-40,-5],[-31,-4],[-37,6]],'#233d43','#708c7b',.5);
  out+=line('M-60 12L-35 10 -20 4 -10 10 9 9M-43 -9L-29 -2 -25 -10 -19 -12M-11 -22l4 8m-16 37l10 4 13 -9','#455f55',.7);
  for(let i=0;i<11;i++){
    const x=-53+i*4.8;
    if(i%4!==1)out+=poly([[x,18],[x+3,18],[x+1,24+Math.sin(i)*2]],'#c2c5a4','#567266',.4);
    if(i<8&&i!==3)out+=poly([[x,34],[x+3,34],[x+2,28]],'#a2b098','#567266',.3);
  }
  for(let i=0;i<50;i++){
    const x=range(-31,23),y=range(-18,16);
    if(Math.hypot(x-3,y+9)<15)continue;
    out+=line(`M${f(x)} ${f(y)}l${f(range(2,6))} ${f(range(-3,2))}`,'#587265',.32,.7);
  }
  out+=line('M-64 7Q-87 -10 -92 7M-59 5Q-79 -25 -87 -17','#b8bfa1',1,.8);
  return out;
}

export function dragon() {
  let out='';
  const points=[];
  for(let i=0;i<36;i++){
    const t=i/35,x=648+t*385,y=599+Math.sin(t*Math.PI*1.75)*48+t*42;
    points.push([x,y]);
  }
  out+=line(path(points),'#a2b49c',3,.5);
  // Ribs and vertebrae become smaller along the tail, without repeating a single stamp.
  for(let i=35;i>=0;i--){
    const [x,y]=points[i],t=i/35,s=(1.15-t*.86)*(1+Math.sin(i*.7)*.10),angle=Math.atan2(Math.cos(t*Math.PI*1.75)*48*Math.PI*1.75+42,385)*180/Math.PI;
    if([9,17,26].includes(i)){
      out+=group(x-5,y+41,1,vertebra(0,0,s*.8,angle+49,i),0);
    }else out+=vertebra(x,y,s,angle,i);
  }
  for(const [x,y,s,rot] of [[750,649,1.1,24],[875,642,.9,-12]]){
    let leg=line('M0 0l-18 17 12 18 29 5','#3b5550',7)+line('M0 0l-18 17 12 18 29 5','#c4c6a9',4);
    for(let k=0;k<4;k++)leg+=line(`M21 40q${12+k*2} ${k*6-5} ${17+k*2} ${k*7+4}l-6 4`,'#c5c8ac',1.6);
    leg+=ellipse(-17,17,4,4,'#a9b69d','#dee0ba',.5);
    out+=group(x,y,s,leg,rot);
  }
  out+=group(623,600,1.1,dragonSkull(),-15);
  return out;
}

function feather(length,width,warm=true,broken=false) {
  const c=warm?'#c2a47e':'#a2b4ad';let out='';
  const end=[Math.sin(length)*5,-length];
  const outline=[[0,10]];
  for(let j=1;j<=20;j++){
    const t=j/21,w=Math.sin(t*Math.PI)*width*(broken&&j%6===0?.32:range(.78,1.03));
    outline.push([-w,-length*t]);
  }
  outline.push(end);
  for(let j=20;j>=1;j--){const t=j/21,w=Math.sin(t*Math.PI)*width*(broken&&j%7===0?.2:range(.72,1));outline.push([w,-length*t]);}
  out+=poly(outline,warm?'#393c38':'#30464a',c,.28,.8);
  out+=line(`M0 12Q-2 ${-length*.45} ${end[0]} ${end[1]}`,c,1.0,.9);
  for(let j=0;j<38;j++){
    const t=(j+1)/40,y=-t*length,w=Math.sin(t*Math.PI)*width;
    if(broken&&(j>20&&j<25||j%9===0))continue;
    for(const side of [-1,1])out+=line(`M${f(end[0]*t*.5)} ${f(y+7)}Q${f(side*w*.45)} ${f(y+2)} ${f(side*w)} ${f(y-9)}`,c,.35,.72);
  }
  return out;
}

export function phoenix() {
  let out='';
  // Two asymmetrical skeletal wings with broken quills and individually veined vanes.
  for(let i=0;i<17;i++){
    const t=i/16,x=1390+t*89,y=626-Math.sin(t*Math.PI)*37;
    out+=group(x,y,1,feather((93+Math.sin(t*2.6)*65)*range(.64,1.10),10+range(0,6),true,true),-64+t*94+range(-3,3));
  }
  for(let i=0;i<14;i++){
    const t=i/13,x=1415+t*92,y=666+t*10;
    out+=group(x,y,1,feather((92+Math.sin(t*3)*40)*range(.72,1.08),9+range(0,4),true,true),128-t*62);
  }
  out+=line('M1382 692Q1385 648 1405 616L1436 577L1492 551','#4f4e3d',7)+line('M1382 692Q1385 648 1405 616L1436 577L1492 551','#ccc0a0',3.7);
  out+=line('M1406 645L1461 680 1507 681','#c6b391',2.6);
  for(let i=0;i<17;i++){
    const y=630+i*3.6,x=1399-Math.sin(i*.1)*11;
    out+=ellipse(x,y,4,2.3,'#8e8f79','#d0c7a3',.35);
    if(i%2===0)out+=line(`M${f(x)} ${f(y)}q-13 -7 -14 8m14 -8q13 -8 15 7`,'#b5b297',1.3);
  }
  out+=poly([[1406,615],[1401,605],[1407,592],[1420,589],[1432,596],[1420,606],[1414,617]],'#a2a28a','#d1c09a',.65);
  out+=poly([[1421,593],[1450,594],[1430,603],[1420,603]],'#c1b291','#d3c19a',.4);
  out+=ellipse(1417,598,3.1,3.1,'#253436','#c7bd9c',.55);
  for(let i=0;i<7;i++)out+=group(1387-i*3,692+i*2,.9,feather(83+i*8,8,true,true),177+i*6);
  // Detached burned feathers and tiny ember stipples.
  for(const [x,y,l,a]of[[1316,704,44,-49],[1521,602,61,28],[1302,562,50,-25],[1564,720,36,132]])out+=group(x,y,1,feather(l,7,true,true),a);
  for(let i=0;i<130;i++){
    const a=range(0,Math.PI*2),r=range(40,170),x=1417+Math.cos(a)*r,y=652+Math.sin(a)*r*.52;
    out+=line(`M${f(x)} ${f(y)}l${f(range(-2,2))} -${f(range(1,4))}`,'#d3a475',.55,range(.2,.7));
  }
  return out;
}

export function lawFractures() {
  let out='';
  // Thin fractured law sheets, each with its own etched curves and empty sections.
  for(let i=0;i<7;i++){
    const x=[1020,1119,1210,1402,1498,1545,1150][i],y=[293,326,353,285,247,327,216][i],w=range(38,64),h=range(10,25);
    const sheet=[[x-w,y+h],[x-w*.4,y-h],[x+w*.7,y-h*.8],[x+w,y],[x+w*.4,y+h*.9],[x+w*.2,y+h*.4],[x-w*.5,y+h*1.3]];
    out+=poly(sheet,'#7c7855','#c6ae78',.45,.11);
    out+=`<defs><clipPath id="law-sheet-${i}">${poly(sheet)}</clipPath></defs><g clip-path="url(#law-sheet-${i})">`;
    for(let j=0;j<29;j++)out+=line(`M${x-w} ${y-h+j*1.5}Q${x} ${y-h-12+j*1.5} ${x+w} ${y-h+j*1.5}`,'#cbb782',.26,.25);
    for(let j=0;j<20;j++)out+=line(`M${x-w+j*5} ${y-h-6}q-16 22 6 51`,'#cbb782',.24,.22);
    out+='</g>';
  }
  const main=[
    [[887,347],[980,313],[1011,328],[1081,288],[1123,292],[1154,246],[1200,239]],
    [[1207,365],[1239,314],[1218,282],[1247,264]],
    [[1362,237],[1407,230],[1437,263],[1495,248],[1542,281],[1608,270]],
    [[1327,176],[1377,137],[1409,148],[1451,112]],
    [[1308,301],[1379,335],[1417,321],[1484,360],[1569,336]],
    [[1126,180],[1165,214],[1193,208]],
    [[1509,161],[1484,196],[1502,219],[1572,208]]
  ];
  for(let i=0;i<main.length;i++){
    const p=main[i];
    out+=line(path(p),'#b89863',6,.045)+line(path(p),'#c4a774',2,.22)+line(path(p),'url(#law-edge)',.9,.98);
    out+=line(path(p.map(([x,y],j)=>[x+2+j%3,y+3-j%2])),'#f0d6a1',.3,.65);
    for(let j=0;j<p.length-1;j++){
      const a=p[j],b=p[j+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(let k=0;k<len;k+=1.8){
        const t=k/len,x=a[0]*(1-t)+b[0]*t,y=a[1]*(1-t)+b[1]*t;
        out+=line(`M${f(x+range(-2,2))} ${f(y+range(-2,2))}l${f(range(-1,3))} ${f(range(1,4))}`,'#e5c58c',.27,range(.15,.65));
      }
    }
    for(let j=1;j<p.length-1;j++){
      const [x,y]=p[j],sign=(i+j)%2?1:-1;
      const branch=[[x,y],[x+range(-18,18),y+sign*range(12,27)],[x+range(-31,31),y+sign*range(28,46)]];
      out+=line(path(branch),'#d4b67d',.5,.63);
      for(let k=0;k<7;k++){
        const xx=x+range(-15,15),yy=y+range(-9,9);
        out+=line(`M${f(xx)} ${f(yy)}l${f(range(2,7))} ${f(range(-4,4))}`,'#d9c08e',.32,.47);
      }
    }
  }
  // Disconnected slivers rather than solid islands or an enclosing celestial dome.
  for(let i=0;i<100;i++){
    const x=range(936,1570),y=range(159,373);
    if(Math.hypot((x-1311)/1.18,(y-215))<82)continue;
    const w=range(2,17),h=range(2,8);
    out+=poly([[x,y],[x+w,y-h],[x+w*.68,y+h*.2],[x+w*.82,y+h],[x-w*.22,y+h*.7]],'#46483e','#c6b180',.4,range(.18,.60));
    for(let j=0;j<3;j++)out+=line(`M${f(x+w*j/4)} ${f(y+2)}l${f(w*.3)} -${f(h*.6)}`,'#d9c48f',.25,.6);
  }
  // Incomplete nested strokes stop around the core's empty space.
  for(let i=0;i<15;i++){
    const pts=[];for(let j=0;j<60;j++){const a=.32+j/60*1.12*Math.PI;pts.push([1311+Math.cos(a)*(94+i*4.8),215+Math.sin(a)*(49+i*2.2)]);}
    out+=line(path(pts),'#c7b687',.32,.07+i*.004);
  }
  return out;
}

export function ripple(x,y,rx,ry,color='#a7c4bf',count=12) {
  let out='';
  for(let j=0;j<count;j++){
    const pts=[];for(let i=0;i<88;i++){const a=i/87*Math.PI*2,r=1+Math.sin(a*5+j*.21)*.045;pts.push([x+Math.cos(a)*(rx+j*2.2)*r,y+Math.sin(a)*(ry+j*1.1)*r]);}
    out+=line(path(pts),color,j===0?.8:.4,.55-j/count*.40);
  }
  return out;
}

export function debris(cx,cy,rx,ry,n,warm=false) {
  let out='';
  for(let i=0;i<n;i++){
    const a=range(0,Math.PI*2),r=range(.45,1),x=cx+Math.cos(a)*rx*r,y=cy+Math.sin(a)*ry*r;
    const w=range(2,9),h=w*range(.4,.85);
    out+=poly([[x-w,y],[x-w*.4,y-h],[x+w*.5,y-h*.7],[x+w,y+h*.2],[x,y+h]],warm?'#575447':'#52665f',warm?'#beaa81':'#a6b8a3',.35,range(.25,.78));
    out+=line(`M${f(x-w*.4)} ${f(y-h)}l${f(w*.4)} ${f(h)} ${f(w)} ${f(h*.2)}`,warm?'#dec190':'#c0c7ad',.28,.6);
  }
  return out;
}
