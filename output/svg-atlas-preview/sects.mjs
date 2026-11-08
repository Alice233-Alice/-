import { sects } from './sects-data.mjs';
import { project, polygon, line, palettes, block, hall, pagoda, tree, bridge } from './capitals.mjs';

const stroke = (d, color, width = .6, opacity = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
function engraving(s) {
  const p = palettes[({ 神州:'imperial',西庚:'metal',东苍:'wood',南炎:'fire',雷暴海:'ice',北冥冰海:'ice',黄泉古迹:'metal' })[s.domain]];
  let out = '<g stroke-linecap="round" stroke-linejoin="round">';
  // Hatching and contours tie each miniature to the etched terrain beneath it.
  for (let i=0;i<5;i++) out += `<ellipse cx="0" cy="${9+i*2}" rx="${39+i*3}" ry="${12+i*2}" fill="none" stroke="${p.ridge}" stroke-width=".45" opacity="${.48-i*.06}"/>`;
  if (['boat','lantern'].includes(s.form)) {
    out += polygon([[-35,3],[-16,12],[30,3],[18,15],[-18,20]],p.roof,p.ridge,.8);
    out += stroke('M-8 8V-40M-6-38Q24-35 20-7L-6-3M-7-27H15M-7-16H19',p.wall,.9);
    out += hall(-14,-5,15,9,4,p);
    for(let i=0;i<3;i++) out += stroke(`M-51 ${20+i*4}q30 10 62-1t31 0`,p.ridge,.55,.55);
    if(s.form==='lantern')for(const x of [-32,30])out+=stroke(`M${x} 2V-25h7v5`,p.ridge,.8)+`<ellipse cx="${x+7}" cy="-16" rx="3" ry="5" fill="#d3b77e" stroke="${p.wall}" stroke-width=".6"/>`;
  } else if (['forest','birds'].includes(s.form)) {
    for(const [x,y,r,h] of [[-20,-11,13,28],[16,-12,15,34],[-7,15,17,38]])out+=tree(x,y,r,p,h);
    if(s.form==='forest')for(let i=0;i<6;i++)out+=stroke(`M${-35+i*9}-28Q0 ${18+i*2} ${27-i*2}-31`,p.ridge,.4,.65);
    else for(let i=0;i<9;i++) {const x=-40+i*10,y=-41-Math.sin(i*.7)*12;out+=stroke(`M${x-5} ${y}q3-5 5 0q3-5 6-1`,'#b3cfc5',.85);}
    if(s.form==='forest')out += hall(-4,6,8,7,4,p);
  } else if(s.form==='volcano') {
    out+=polygon([[-43,15],[-23,-10],[-13,-26],[3,-17],[20,-29],[39,13],[12,29]],p.shade,p.ridge,.7);
    for(let i=0;i<9;i++)out+=stroke(`M${-35+i*8} 13l${i%2?9:-4} -19 4-11`,'#d3a578',.55,.7);
    out+='<ellipse cy="-22" rx="15" ry="5" fill="#39342e" stroke="#cf986d" stroke-width=".7"/>';
    if(s.id==='蚀月血海宗')out+=hall(-12,-1,24,14,6,{...p,roof:'#604541'}, {z:2,tiers:2});
    else for(let i=0;i<7;i++)out+=stroke(`M${-24+i*8} 12q8-12 2-22q13 13 3 21`,p.ridge,.7);
  } else {
    const floating=['island','mirage','lightning'].includes(s.form);
    const water=['sea','shrine','inn'].includes(s.form);
    const high=['mountain','sword','moon','tower','grove'].includes(s.form);
    if(floating||high) {
      out+=polygon([[-48,9],[-33,-10],[10,-18],[43,3],[31,19],[-8,27]],p.stone,p.ridge,.6);
      out+=polygon([[-48,9],[-8,27],[31,19],[12,49],[-6,59],[-30,33]],p.shade,p.ridge,.5);
      for(let i=0;i<16;i++)out+=stroke(`M${-41+i*5} ${13+Math.sin(i)*3}l${i%3-1} ${18+Math.sin(i*1.7)*12}`,p.ridge,.35,.65);
    } else out+=block(-27,-22,54,45,2,p);
    if(water)for(let i=0;i<5;i++)out+=stroke(`M-55 ${19+i*3}q23-8 43-1t59-3`,p.ridge,.5,.55);
    if(s.form==='herb')for(let y=4;y<=26;y+=6)for(let x=-34;x<=24;x+=8){out+=polygon([[x,y],[x+6,y+2],[x+10,y-1],[x+4,y-3]],'#728a64',p.ridge,.35);out+=stroke(`M${x+4} ${y}v-3m-2 1 2 1 3-2`,p.wall,.4);}
    if(s.form==='market') {
      for(let y=-22;y<=16;y+=13)for(let x=-24;x<=17;x+=14)out+=hall(x,y,10,8,4+(x===4?2:0),p);
      out+=bridge(-2,24,6,12,p,2);
    } else if(s.form==='forge') {
      for(const [x,y,w]of[[-22,-12,17],[7,-15,16],[-2,11,15]]){out+=block(x,y,w,w,8,p)+pagoda(x+3,y+3,w-6,2,p,8);const q=project(x+w/2,y+w/2,31);out+=stroke(`M${q[0]} ${q[1]}q-4-5 1-10t0-9`,p.ridge,.7,.65);}
    } else if(s.form==='tower'||s.form==='soul') {
      out+=pagoda(-9,-12,18,s.form==='tower'?6:4,p);
      for(const x of [-25,19])out+=hall(x,4,9,10,5,p);
      for(const x of [-29,30])out+=stroke(`M${x} 1v-24l8 3-4 10-4-3`,p.wall,.75);
    } else if(s.form==='grove') {
      out+=tree(-18,-10,18,p,25)+tree(15,-4,16,p,33);
      out+=hall(-9,-9,18,14,6,p,{z:22,tiers:2})+bridge(-24,10,40,3,p,14);
    } else if(s.form==='tomb'||s.form==='battle') {
      for(let i=0;i<12;i++){const x=-34+(i%6)*12,y=-8+Math.floor(i/6)*20;out+=block(x,y,3,2,6+i%3,p);}
      out+=hall(-13,-20,26,12,6,p,{tiers:2});
      if(s.form==='battle')for(const x of [-28,29])out+=stroke(`M${x} 13v-41l10 4-10 4`,p.ridge,.8);
    } else if(s.form==='sea') {
      out+=hall(-19,-13,38,18,9,p,{tiers:2});
      for(const x of [-30,24])out+=pagoda(x,-6,8,4,p);
      for(let i=0;i<7;i++)out+=stroke(`M${-40+i*13} 20q-8-8-3-14q5-8 0-16`,p.ridge,.55,.65);
    } else {
      out+=hall(-16,-19,32,18,['mountain','moon'].includes(s.form)?11:7,p,{tiers:s.form==='sword'?1:2});
      for(const x of [-28,19])out+=hall(x,4,10,17,4,p);
      out+=hall(-6,24,12,7,6,p);
    }
    // Approach stairs, stone lanterns and courtyards stay small in world units.
    for(let i=0;i<13;i++)out+=line([project(-4,30+i*1.5,-i*.2),project(4,30+i*1.5,-i*.2)],p.ridge,.45,.8);
    for(const x of [-12,12])for(const y of [8,24])out+=block(x,y,1.4,1.4,4,p);
    if(s.form==='moon'){out+='<path d="M16-67a23 23 0 10-24 31A23 23 0 0116-67Z" fill="none" stroke="#c8ced1" stroke-width=".85"/>';}
    if(s.form==='wheel')for(let i=0;i<3;i++)out+=`<ellipse cy="-19" rx="${33+i*4}" ry="${16+i*3}" fill="none" stroke="${p.ridge}" stroke-width=".55"/>`;
    if(s.form==='lightning')out+=stroke('M-40-40l-8 21h9l-8 23M35-48l-7 21h10l-8 26','#d3d2b5',1);
    if(floating)for(let i=0;i<3;i++)out+=stroke(`M-62 ${37+i*5}q19-12 38-2t48-1q18-7 32-2`,p.ridge,.5,.6);
    if(s.form==='mine')for(const x of [-38,39])out+=polygon([[x,7],[x+7,-7],[x+11,12],[x+2,16]],p.shade,p.ridge,.7);
    if(s.form==='sword')for(const x of [-33,32])out+=stroke(`M${x} 2v-35m-5 27h10`,p.ridge,.9);
  }
  return out+'</g>';
}

export function sectArtwork(realm) {
  const entries=sects.filter(s=>s.realm===realm);
  return {
    entries,
    definitions:entries.map(s=>`<g id="${s.key}" data-sect-art="true">${engraving(s)}</g>`).join(''),
    markup:`<g id="sects">${entries.map(s=>`<g class="sect" data-sect="${s.id}" data-form="${s.form}" transform="translate(${s.x} ${s.y})" role="button" tabindex="0" aria-label="查看${s.id}"><title>${s.id} · ${s.habitat} · 位置示意</title><ellipse class="sect-hit" rx="14" ry="12"/><path class="sect-mark" d="M0-3L3 0 0 3-3 0Z"/><use class="sect-art" href="#${s.key}" transform="scale(${s.scale})"/><g class="sect-label"><path class="sect-leader" d="M0 9v8h9"/><text x="11" y="20">${s.id}</text></g></g>`).join('')}</g>`,
  };
}
export const sectStyles=`
  .sect{cursor:pointer;outline:none}.sect-hit{fill:transparent;stroke:none}.sect-mark{fill:#234a42;stroke:#e2c990;stroke-width:.8}
  .sect-art{pointer-events:none}.sect-label text{pointer-events:bounding-box;font-family:'Microsoft YaHei',sans-serif;font-size:8px;fill:#ecddb6;stroke:#183830;stroke-width:2.3;paint-order:stroke;letter-spacing:.7px}
  .sect[data-form="court"] .sect-art{display:none}
  .sect-leader{pointer-events:none;fill:none;stroke:#bdae85;stroke-width:.55;opacity:.8}
  .sect.selected .sect-hit,.sect:hover .sect-hit,.sect:focus-visible .sect-hit{fill:#eddbac;fill-opacity:.08;stroke:#e0c592;stroke-width:.6;stroke-dasharray:2 3}
  #atlas[data-sect-level="0"] .sect{display:none}
  #atlas[data-sect-level="1"] .sect-art{display:none}
  #atlas[data-sect-level="2"] .sect-mark{display:none}
  #atlas[data-sect-level="2"] .sect[data-form="court"] .sect-mark{display:inline}
  #atlas[data-sect-level] .sect-label{display:none}
  #atlas[data-sect-level] .sect-label.label-visible{display:inline}
  #atlas.hide-sects .sect,#atlas.hide-place-labels .sect-label{display:none}
`;
