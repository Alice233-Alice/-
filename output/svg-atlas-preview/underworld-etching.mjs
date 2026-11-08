// Fine details are geometry, not raster noise or a repeated terrain icon.
let seed=741902;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const r=(a,b)=>a+(b-a)*random(),f=x=>+x.toFixed(2);
const path=points=>points.map(([x,y],i)=>`${i?'L':'M'}${f(x)},${f(y)}`).join('');
const ink=(d,c='#a9a88d',w=.3,o=1)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
const face=(points,fill,stroke='#8d9680',w=.35)=>`<path d="${path(points)}Z" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const noise=(x,y)=>Math.sin(x*.051+y*.071)*.45+Math.sin(x*.119-y*.047)*.22+Math.cos(x*.27+y*.17)*.14+Math.sin(x*.65-y*.24)*.07;
const curve=points=>points.reduce((d,p,i)=>i?d+`Q${f(points[i-1][0])} ${f(points[i-1][1])} ${f((p[0]+points[i-1][0])/2)} ${f((p[1]+points[i-1][1])/2)}`:`M${p.map(f).join(' ')}`,'')+`L${points.at(-1).map(f).join(' ')}`;

export function bedrock(){
 let out='<rect width="1800" height="1200" fill="url(#under-bg)"/>';
 // Subtle folded strata continue across the plate and leave the labels in quiet margins.
 for(let row=0;row<110;row++){
  const pts=[];for(let x=150;x<1730;x+=10){const y=227+row*6.4+noise(x,row*4)*13+Math.sin(x*.005+row*.12)*24;pts.push([x,y]);}
  out+=ink(path(pts),row%5===0?'#6a7774':'#3e5050',row%5===0?.4:.28,row%5===0?.085:.065);
 }
 let dust='';for(let i=0;i<7500;i++){const x=r(130,1730),y=r(210,1000);dust+=`M${f(x)} ${f(y)}h${f(r(.2,.7))}`;}
 return out+ink(dust,'#b3ad95',.25,.13);
}

export function floorEtching(c){
 let out='',dark='',light='';
 const hue=c.key==='fire'?'#9e6b50':c.key==='water'?'#69929e':c.key==='wood'?'#799172':'#a49b7b';
 for(let row=0;row<48;row++){
  const pts=[];for(let col=0;col<85;col++){
   const x=c.x-c.rx*.83+col/84*c.rx*1.66,y=c.y-c.ry*.7+row/47*c.ry*1.45+noise(x,row*4+3)*4;
   pts.push([x,y]);
  }
  if(c.key!=='water')out+=ink(path(pts),hue,.24,.13);
 }
 for(let i=0;i<2200;i++){
  const x=c.x+r(-c.rx*.88,c.rx*.88),y=c.y+r(-c.ry*.78,c.ry*.85),q=((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2;
  if(q>.8)continue;const a=noise(x,y)*2,s=r(.3,2.1),dx=Math.cos(a)*s,dy=Math.sin(a)*s*.45;
  dark+=`M${f(x)} ${f(y)}l${f(dx)} ${f(dy)}`;
  if(i%2===0)light+=`M${f(x)} ${f(y-.5)}l${f(dx)} ${f(dy)}`;
 }
 out+=ink(dark,'#060f15',.48,.45)+ink(light,hue,.28,.37);
 if(c.key==='wood'){
  for(let i=0;i<180;i++){
   const x=r(1110,1380),y=r(342,542),w=r(1.2,4),h=w*.65;
   out+=ink(`M${f(x)} ${f(y)}q-1-5 ${f(w*.3)} -7`,'#617958',.4,.7);
   out+=`<path d="M${f(x-w)} ${f(y-h)}q${f(w)} ${f(-h*2)} ${f(w*2)} 0q${f(-w)} ${f(h)} ${f(-w*2)} 0Z" fill="#4e6954" stroke="#9aab83" stroke-width=".3"/>`;
   for(let j=0;j<5;j++)out+=ink(`M${f(x)} ${f(y)}L${f(x-w+j*w*.5)} ${f(y-h)}`,'#8e9f79',.23,.7);
  }
 }
 if(c.key==='earth'){
  for(let i=0;i<45;i++){
   const x=r(618,905),y=r(460,603),l=r(5,12),a=r(-.7,.7);
   out+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(a*90)})">${face([[0,0],[l,-1],[l+1,2],[1,3]],'#737c64','#9da185',.3)}${ink(`M2 1h${f(l-3)}M${f(l*.5)} -1l-1 1 2 2`,'#394d40',.4)}</g>`;
  }
 }
 return out;
}

function bark(points,width){
 let out=ink(curve(points),'#071a18',width+2,.8)+ink(curve(points),'#63755a',width,.92);
 for(let strand=0;strand<9;strand++){
  const offset=(strand/8-.5)*width*.8,ps=points.map(([x,y],j)=>[x+offset*(1-j/(points.length+2)),y+Math.sin(j*1.8+strand)*.7]);
  out+=ink(curve(ps),strand%3===0?'#b7b38d':'#304e37',.3,strand%3===0?.63:.8);
 }
 for(let i=1;i<points.length-1;i++){
  const[x,y]=points[i];out+=`<ellipse cx="${x}" cy="${y}" rx="${f(width*.23)}" ry="${f(width*.4)}" fill="none" stroke="#a0a181" stroke-width=".3"/>`;
  out+=ink(`M${x} ${y-3}q3 3 0 6q-3-3 0-6`,'#1d382c',.5,.8);
 }
 return out;
}
export function mineralAccents(c){
 let out='';
 if(c.key==='wood'){
  const roots=[[[1310,280],[1300,318],[1278,337],[1271,379],[1248,419],[1209,452]],[[1130,371],[1185,378],[1212,402],[1250,411],[1280,435],[1331,444]],[[1376,387],[1329,407],[1332,440],[1296,475],[1237,485],[1190,510]]];
  roots.forEach((ps,i)=>out+=bark(ps,5.5-i*.6));
  for(let i=0;i<26;i++){
   const t=i/26,ps=[];
   for(let j=0;j<90;j++){const a=j/89*Math.PI*2,rx=39-t*31,ry=22-t*17,warp=1+Math.sin(a*5+i*.17)*.09+Math.cos(a*11)*.06;ps.push([1245+Math.cos(a)*rx*warp,477+Math.sin(a)*ry*warp]);}
   out+=ink(path(ps)+'Z',i%4===0?'#b2b88a':'#5a7a56',.35,.5);
  }
  for(let i=0;i<15;i++){const x=r(1120,1360),y=r(395,531);out+=ink(`M${f(x)} ${f(y)}q-9 5-8 15t6 12m-8-25q8 1 8 7m-6 2q-8-3-8-7`,'#a58b7e',.33,.55);}
 }else if(c.key==='water'){
  for(let i=0;i<140;i++){
   const a=r(0,Math.PI*2),radius=r(.52,.88),x=810+Math.cos(a)*198*radius,y=295+Math.sin(a)*112*radius,s=r(1,4);
   out+=face([[x-s,y],[x-s*.2,y-s],[x+s*.8,y-s*.7],[x+s,y],[x,y+s*.4]],'#405e6c','#9bb3ba',.28);
   out+=ink(`M${f(x-s)} ${f(y)}l${f(s*.8)} ${f(-s)} ${f(s*.2)} ${f(s*1.4)}`,'#bbc5c2',.25,.65);
  }
  for(let i=0;i<60;i++){
   const a=r(0,Math.PI*2),q=r(.4,.82),ps=[];
   for(let j=0;j<27;j++){const u=a+j*.008;ps.push([810+Math.cos(u)*(198*q+j*.16),302+Math.sin(u)*(85*q+j*.08)]);}
   out+=ink(path(ps),i%3===0?'#adcbcc':'#52879b',.4,.48);
  }
 }else if(c.key==='metal'){
  for(let i=0;i<25;i++){
   const x=r(302,483),y=r(362,524),h=r(7,18),w=r(1.5,3);
   out+=`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(r(-25,25))})">${face([[-w,0],[-w,-h],[0,-h-2],[w,-h*.9],[w,0]],'#74806f','#afb295',.4)}${ink(`M0-1v${f(-h+2)}`,'#d2c9a6',.3,.8)}${Array.from({length:5},(_,j)=>ink(`M${f(-w*.5)} ${f(-2-j*h*.14)}l${f(w)} -.5`,'#2b4439',.35)).join('')}</g>`;
  }
 }else if(c.key==='fire'){
  for(let k=0;k<22;k++){
   const a=k/22*Math.PI*2,ps=[];
   for(let j=0;j<18;j++){const q=.5+j*.02+Math.sin(j*1.7+k)*.012;ps.push([1050+Math.cos(a+Math.sin(j*.6)*.03)*224*q,719+Math.sin(a+Math.sin(j*.6)*.03)*99*q]);}
   out+=ink(path(ps),'#bd6544',2.5,.16)+ink(path(ps),'#ddb785',.55,.85);
   const[x,y]=ps[9];out+=ink(`M${f(x)} ${f(y)}l${f(Math.cos(a+1)*11)} ${f(Math.sin(a+1)*5)}`,'#c28b63',.45,.72);
  }
  for(let i=0;i<100;i++){
   const a=r(0,Math.PI*2),q=r(.64,.85),x=1050+Math.cos(a)*224*q,y=719+Math.sin(a)*99*q,w=r(1.5,4),h=r(2,5);
   out+=face([[x-w,y],[x-w,y-h],[x,y-h-1],[x+w,y-h*.8],[x+w,y],[x,y+1]],'#303e3c','#8c8870',.3);
   out+=ink(`M${f(x)} ${f(y-h-1)}v${f(h+2)}M${f(x-w)} ${f(y-h*.5)}l${f(w)} 1 ${f(w)} -1`,'#b8a785',.24,.7);
  }
 }
 return out;
}

export function ancientBridge(x,y){
 let s='<g transform="translate('+x+' '+y+') rotate(24)">';
 s+=`<ellipse cx="2" cy="12" rx="32" ry="9" fill="#071819" opacity=".55"/>`;
 s+=`<path d="M-29 3Q0-27 29 3v13h-9Q0-11-20 16h-9Z" fill="#7e876e" stroke="#b7b28e" stroke-width=".5"/>`;
 s+=`<path d="M-29 3l6-7Q0-29 29-4v7Q0-20-29 3Z" fill="#a2a184" stroke="#d0be97" stroke-width=".4"/>`;
 for(let i=0;i<22;i++){
  const a=Math.PI+i/21*Math.PI,px=Math.cos(a)*23,py=13+Math.sin(a)*22;
  s+=ink(`M${f(px)} ${f(py)}l${f(Math.cos(a)*3.5)} ${f(Math.sin(a)*3.5)}`,'#3b5141',.4,.8);
 }
 for(let side of [-1,1])for(let row=0;row<5;row++)for(let col=0;col<3;col++){
  const px=side*23+col*1.8,py=4+row*2.1;
  s+=ink(`M${f(px)} ${f(py)}h1.5m-.6 0v1.6`,'#455a42',.3,.75);
 }
 for(let i=0;i<25;i++){
  const px=-28+i*2.3,py=-15*(1-(px/29)**2);
  s+=ink(`M${f(px)} ${f(py)}l3-4`,'#5c7056',.35);
  if(i%2===0)s+=ink(`M${f(px)} ${f(py-1)}v-5`,'#ccc2a0',.7)+`<circle cx="${f(px)}" cy="${f(py-6)}" r=".75" fill="#bdbb96"/>`;
 }
 s+=ink('M-28-3Q0-33 28-3M-28-7Q0-36 28-7','#d1c39c',.6,.85);
 s+=ink('M-26 10l2-2-1-3m48 6-2-3 2-3M-4-8l2-2-1-2','#354b3d',.4,.85);
 return s+'</g>';
}

export function ancientGate(x,y){
 let s=`<g transform="translate(${x} ${y})">`;
 s+=face([[-27,12],[20,4],[30,12],[-17,20]],'#5e6b58','#9c9c7b',.5);
 for(let i=0;i<4;i++)s+=ink(`M${-25+i*2} ${13+i*2}l44-8`,'#c0b18a',.55,.8);
 for(const side of [-1,1]){
  const px=side*16;
  s+=face([[px-5,9],[px+4,7],[px+5,-35],[px-4,-36]],'#8d967a','#c1b795',.45);
  s+=face([[px+4,7],[px+8,3],[px+8,-39],[px+5,-35]],'#4c6454','#99a28a',.3);
  for(let row=0;row<15;row++){
   const yy=-31+row*2.4;s+=ink(`M${px-4} ${f(yy)}l9-1M${px+(row%2?0:3)} ${f(yy)}v2.1`,'#425e4b',.3,.7);
  }
  s+=ink(`M${px-1}-29v34M${px+2}-29v33`,'#cec4a0',.38,.65);
  for(let j=0;j<6;j++)s+=ink(`M${px-1} ${-26+j*5}q3-2 3 1t-3 2`,'#304d3c',.5,.9);
  s+=face([[px-7,-34],[px+6,-35],[px+8,-41],[px-5,-40]],'#a1a586','#d6c09a',.4);
 }
 s+=face([[-29,-41],[20,-44],[30,-39],[-19,-36]],'#b1ad8c','#dac7a0',.5);
 s+=face([[-29,-41],[-29,-48],[-8,-52],[-2,-49],[6,-54],[20,-51],[30,-45],[30,-39],[20,-44]],'#929a7a','#c6ba94',.5);
 for(let j=0;j<16;j++)s+=ink(`M${-25+j*3.1} -44q1-4 2-1t-1 2`,'#405e4a',.4,.9);
 s+=ink('M-21-49l2 3-1 4M5-52l2 4-1 4M17-46l2 2-1 2','#384b3c',.55,.9);
 for(let side of [-1,1])s+=ink(`M${side*24}-40v8q-2 3 0 3q2 0 2-3`,'#aea989',.45,.9);
 return s+'</g>';
}

export function ancientTerrace(x,y){
 let s=`<g transform="translate(${x} ${y})">`;
 for(let i=0;i<4;i++){
  const w=23-i*3.3,yy=12-i*3;
  s+=face([[-w,yy-4],[w*.65,yy-11],[w,yy-2],[-w*.65,yy+5]],'#69785d','#b7ae88',.45);
  s+=face([[-w,yy-4],[-w*.65,yy+5],[w,yy-2],[w,yy+1],[-w*.65,yy+8],[-w,yy-1]],'#52674f','#919c77',.35);
  for(let j=0;j<7;j++)s+=ink(`M${f(-w*.65+j*w*.22)} ${f(yy+5-j*.7)}v2`,'#263e31',.3);
 }
 for(const[px,py]of[[-12,-6],[5,-10],[17,-5],[-2,0]])s+=ink(`M${px} ${py}v-21`,'#b2b18b',1.4)+ink(`M${px+.5} ${py}v-21`,'#546f56',.4);
 s+=face([[-18,-26],[2,-38],[23,-28],[10,-24],[-2,-24]],'#627c5f','#c5bc93',.5);
 s+=ink('M-18-26Q-8-24 2-38Q11-25 23-28M2-38v-3','#d5c498',.65);
 for(let j=0;j<12;j++){const t=j/11;s+=ink(`M${f(-16+t*17)} ${f(-26-t*10)}l${f(11-t*3)} ${f(2+t*7)}`,'#a8b18a',.35,.8);}
 for(let j=0;j<7;j++)s+=ink(`M${-9+j*1.5} ${17+j*1.5}l16-4`,'#b3aa80',.6);
 s+=ink('M-12-17h17m-4-6v10M5-10l12 5M-12-6l10 6','#bac09a',.6,.7);
 return s+'</g>';
}
