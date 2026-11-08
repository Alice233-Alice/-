// The lower sky is a tear in empty space, not a canyon cut into land.
import { f, rnd, line, path, poly, group } from './sky-engraving.mjs';
const between=(a,b)=>a+rnd()*(b-a);
const center=t=>[310+1270*t,1300-320*t+Math.sin(t*Math.PI*2)*38];
const point=(t,offset=0)=>{
  const [x,y]=center(t),dy=-320+Math.cos(t*Math.PI*2)*38*Math.PI*2,m=Math.hypot(1270,dy);
  return [x-dy/m*offset,y+1270/m*offset];
};
const breadth=t=>Math.pow(Math.max(0,Math.sin(t*Math.PI)),.7)*(59+Math.sin(t*17)*9)+2;
const rim=(side,extra=0)=>Array.from({length:321},(_,i)=>{
  const t=i/320,jag=(Math.sin(i*1.93)*3+Math.sin(i*.83)*4+Math.sin(i*.27)*3)*Math.sin(t*Math.PI);
  return point(t,side*(breadth(t)+extra*Math.sin(t*Math.PI)+jag));
});

function starShard(x,y,s,rotation=0,warm=false){
  const edge=warm?'#c6b17f':'#a1bebd';
  let out=poly([[-s,-s*.1],[-s*.25,-s*.6],[s*.8,-s*.35],[s,s*.2],[s*.18,s*.65],[-s*.7,s*.38]],warm?'#4c5046':'#3c535d',edge,.35,.86);
  out+=poly([[-s*.25,-s*.6],[s*.8,-s*.35],[s*.18,s*.65],[-s*.1,s*.05]],warm?'#2b3d3f':'#1c3441',edge,.24,.7);
  for(let j=0;j<7;j++)out+=line(`M${f(-s*.7+j*s*.18)} ${f(-s*.08+j*s*.03)}l${f(s*.45)} ${f(-s*.25)}`,edge,.22,.6);
  return group(x,y,1,out,rotation);
}

export function tianyuanRift(){
  let out=`<g id="tianyuan-rift" data-region="天渊" role="button" tabindex="0" aria-label="天渊，下霄引力主轴，长三万里、宽逾百里">
  <defs><linearGradient id="rift-ink" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#0a2430"/><stop offset=".3" stop-color="#010710"/><stop offset=".7" stop-color="#030a15"/><stop offset="1" stop-color="#172d37"/></linearGradient></defs>`;
  // Layered atmospheric rims supply depth without any rock faces or cliff bases.
  for(let i=8;i>=1;i--)out+=poly([...rim(-1,i*10),...rim(1,i*10).reverse()],'#80b4bf','none',0,.012);
  out+=poly([...rim(-1),...rim(1).reverse()],'url(#rift-ink)','#8bb7c2',.8);
  for(const side of [-1,1]){
    for(let i=0;i<31;i++){
      const pts=Array.from({length:167},(_,j)=>{
        const t=j/166,offset=breadth(t)+3+i*2.4+Math.sin(t*27+i*.3)*3;
        return point(t,side*offset*Math.pow(Math.sin(t*Math.PI),.13));
      });
      out+=line(path(pts),i%9===0?'#d1c99f':'#80aebb',i%9===0?.65:.28,.32-i*.006);
    }
    // Fine sheared field lines end irregularly instead of creating a solid surface.
    for(let j=0;j<560;j++){
      const t=between(.025,.97),w=breadth(t),a=point(t,side*(w+between(1,17))),b=point(t+between(-.013,.019),side*(w+between(19,52))),c=point(Math.min(.99,t+between(-.01,.034)),side*(w+between(53,88)));
      out+=line(path([a,b,c]),j%7===0?'#d0c398':'#80a9b7',.25,between(.14,.4));
    }
    for(let i=0;i<20;i++){
      const t=.07+i*.043,a=point(t,side*breadth(t)),b=point(t+.01,side*(breadth(t)+15)),c=point(t+.032,side*(breadth(t)+19));
      out+=line(path([a,b,c]),'#c7d5ca',.55,.48);
    }
  }
  for(let i=0;i<29;i++){
    const pts=[];for(let j=0;j<110;j++){const t=.05+j/110*.9;pts.push(point(t,Math.sin(t*14+i*.25)*breadth(t)*.37+i*.54-8));}
    out+=line(path(pts),'#638796',.28,.09);
  }
  // Glancing stars gather on the gravitational rim; its deep center remains empty.
  for(let i=0;i<252;i++){
    const t=between(.025,.975),side=i%2?1:-1,[x,y]=point(t,side*(breadth(t)+between(28,106)));
    out+=starShard(x,y,between(.7,4.5),between(-30,30),i%6===0);
  }
  for(let i=0;i<22;i++){
    const t=between(.15,.85),[x,y]=point(t,-breadth(t)-between(43,109));
    out+=line(`M${f(x-22)} ${f(y-14)}q14 9 25 13`,'#b5d4cf',.55,.38);
    out+=`<circle cx="${f(x+3)}" cy="${f(y-1)}" r="1" fill="#dcd4b2" opacity=".8"/>`;
  }
  return out+'</g>';
}

export function starCemetery(){
  let out='<g id="star-cemetery">';
  // A dense but separated constellation of larger star cores, never a land platform.
  for(let i=0;i<92;i++){
    const t=between(.35,.65),[x,y]=point(t,-breadth(t)-between(17,95));
    out+=starShard(x,y,between(2,10),between(-60,60),i%4===0);
    if(i%11===0){
      for(let j=0;j<3;j++)out+=line(`M${f(x-12-j*3)} ${f(y)}q${17+j*4} ${-10-j*4} ${29+j*5} -1`,'#b3c5bc',.3,.3);
    }
  }
  return out+'</g>';
}

export function fallenBones(){
  let out='<g id="rift-battle-traces" opacity=".86">';
  for(let i=0;i<12;i++){
    const x=665+i*9,y=1245+Math.sin(i*.32)*9,s=1-i*.038;
    out+=poly([[x-3,y-4],[x+3,y-3],[x+4,y+4],[x-3,y+5]],'#6f877b','#b6c2a2',.4);
    if(i%4!==0)for(const side of [-1,1]){
      const d=`M${x} ${f(y+side*3)}q-12 ${side*14} ${f(3*s)} ${f(side*26*s)}`;
      out+=line(d,'#acc0ab',1.9*s,.8)+line(d,'#e0d5ac',.3,.7);
    }
  }
  for(let i=0;i<7;i++){
    const x=812+i*10,y=1280+Math.sin(i)*13;
    out+=line(`M${x} ${y}l-17 -26`,'#c3b895',.7,.75);
    for(let j=1;j<17;j++)out+=line(`M${f(x-j*.8)} ${f(y-j*1.3)}l${f(-Math.sin(j/17*Math.PI)*8)} -6`,'#b7b091',.3,.7);
  }
  return out+'</g>';
}

export function windBarrier(){
  let out='<g id="nine-heaven-wind" pointer-events="none">';
  for(let i=0;i<100;i++){
    const y=1410+i*1.14;
    out+=line(`M220 ${f(y)}C450 ${f(y-89)} 685 ${f(y+43)} 930 ${f(y-10)}S1440 ${f(y-98)} 1645 ${f(y-32)}`,'#80b0b8',i%11===0?.75:.35,i%11===0?.26:.10);
  }
  for(let i=0;i<14;i++){
    const x=between(420,1530),y=between(1395,1506),sign=i%2?1:-1;
    const d=`M${f(x)} ${f(y)}l${sign*12} 10 -17 5 ${sign*10} 11 -5 6`;
    out+=line(d,'#8cb6c2',4,.035)+line(d,'#b8d0d0',.7,.45);
  }
  // Streams visibly fall below the lower sky toward the Earth-realm outlet.
  for(let i=0;i<34;i++){
    const x=482+i*6;
    out+=line(`M${x} 1370C${x-15} 1433 ${f(559+i*2.4)} 1472 ${f(591+i*.85)} 1553`,'#8db6be',i%6===0?.7:.28,.18);
  }
  return out+'</g>';
}

export function coreRupture(){
  const x=1130,y=1169;
  let out=poly([[x-35,y+8],[x-13,y-14],[x+24,y-26],[x+9,y-2],[x+33,y+5],[x-5,y+18]],'#00050b','#aea5bf',.6);
  for(let j=0;j<15;j++)out+=line(`M${x-42-j*2} ${y+10+j*.7}q24 -${19+j*.6} ${54+j*3} -${20+j*.4}`,'#b8a9c9',.28,.12+j*.008);
  return `<g id="rift-core">${out}</g>`;
}

export function inversePoint(){
  let out='';
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=1624+Math.cos(a)*21,y=300+Math.sin(a)*30;
    out+=line(path([[x,y],[1624+Math.cos(a+.24)*8,300+Math.sin(a+.24)*11]]),'#b9a6ce',.5,.75);
  }
  out+=poly([[1624,282],[1635,298],[1628,315],[1613,304]],'#111622','#b5a7ca',.8);
  return `<g id="upper-inverse-point">${out}</g>`;
}
