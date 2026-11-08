import { capitals } from './capitals.mjs';

export const arrayTiers={
 star:{name:'域间星枢',color:'#ecd29c',time:'瞬息跨域',cost:'上品灵石、虚空晶石',rule:'受大宗门与仙朝严控，出入受身份与势力盘查。',risk:'天渊潮汐、天道脉动可使星枢紊乱；属性潮汐可使对应阵枢过载闭锁。'},
 official:{name:'境道官阵',color:'#aed6c6',time:'半个时辰内',cost:'通行须验关牒或势力声望',rule:'设于四海要冲与边境四道，联通本域各郡及宗门。',risk:'边关查验、声望限制及局部异变可能封锁阵路。'},
 hidden:{name:'隐界暗桩',color:'#c1acd8',time:'随虚空乱流而定',cost:'代价昂贵，稳定性较差',rule:'散见于黑市与荒墟，常用于潜渡或规避盘查。',risk:'残阵可能失稳或偏坠；图中位置为示意，不代表已探明的固定落点。'},
};
export const transportNodes=[
 ...capitals.map(c=>({id:c.hubId,name:c.hubId,tier:'star',x:c.hub[0],y:c.hub[1],city:c.id,domain:c.domain,desc:`设于${c.domain}${c.id}的巨型域间星枢，属于贯穿五域中枢的地脉灵轨网络。`,placement:'主城附属阵枢，绘于城侧以便辨认。'})),
 {id:'潮音陨铁渡',name:'潮音陨铁渡',tier:'official',x:327,y:546,domain:'潮音海',desc:'四海要冲的境道官阵之一，沟通潮音海渡口与本域郡宗。'},
 {id:'蓬莱幻海市',name:'蓬莱幻海市',tier:'official',x:1233,y:821,domain:'蓬莱幻海',desc:'幻海市设境道官阵，航路受蜃气与海市所在影响。'},
 {id:'龙眠海峡使节站',name:'水族使节站',tier:'official',x:1271,y:565,domain:'龙眠海峡',desc:'龙眠海峡水族使节站，兼具海界要冲与边境官阵职能。'},
 {id:'苍茫古径官阵',name:'苍茫古径',tier:'official',x:965,y:483,domain:'苍茫古径',desc:'边境四道的境道官阵，设于神州、东苍之间的古径关隘。'},
 {id:'赤金走廊官阵',name:'赤金走廊',tier:'official',x:578,y:644,domain:'赤金走廊',desc:'边境四道的境道官阵，连通西庚、南炎与神州边陲。'},
 {id:'雪线官阵',name:'雪线前哨',tier:'official',x:690,y:345,domain:'雪线',desc:'雪线前哨的境道官阵，衔接神州北境与北冥冰原。'},
 {id:'千机诡市暗门',name:'千机诡市暗门',tier:'hidden',x:565,y:536,domain:'黑市暗桩',desc:'千机诡市掌控的微型隐界阵，常供黑道潜渡。世界书未固定其地理坐标，此处仅作布点示意。',placement:'位置示意，非固定坐标。'},
 {id:'万象森罗坊黑渡',name:'森罗坊黑渡',tier:'hidden',x:319,y:650,domain:'黑渡暗桩',desc:'万象森罗坊黑渡中的隐界暗桩。世界书未固定其地理坐标，此处仅示意黑渡与官道外通路。',placement:'位置示意，非固定坐标。'},
 {id:'荒墟残阵示意',name:'荒墟残阵',tier:'hidden',x:1004,y:641,domain:'荒墟秘境',desc:'用于表现世界书中“散见荒墟秘境”的微型残阵类别，具体遗址与航路须在剧情中探明。',placement:'类别示意，不新增固定世界书地点。'},
];

const edges=[
 ['帝都星枢','金秤星枢','star',-38],['帝都星枢','青帝星枢','star',-43],['帝都星枢','冰雪星枢','star',-50],['帝都星枢','琉璃星枢','star',-38],
 ['金秤星枢','潮音陨铁渡','official',18],['金秤星枢','赤金走廊官阵','official',22],['琉璃星枢','赤金走廊官阵','official',-23],['帝都星枢','雪线官阵','official',-25],['冰雪星枢','雪线官阵','official',-26],['帝都星枢','苍茫古径官阵','official',16],['青帝星枢','苍茫古径官阵','official',-18],['青帝星枢','龙眠海峡使节站','official',-28],['龙眠海峡使节站','蓬莱幻海市','official',-33],
 ['千机诡市暗门','万象森罗坊黑渡','hidden',32],['千机诡市暗门','荒墟残阵示意','hidden',43],
];
export const transportEdges=edges.map(([from,to,tier,bend],index)=>({id:`array-line-${index}`,from,to,tier,bend}));

const n=x=>+x.toFixed(2);
function radialTicks(count,r1,r2){return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2;return`M${n(Math.cos(a)*r1)} ${n(Math.sin(a)*r1)}L${n(Math.cos(a)*r2)} ${n(Math.sin(a)*r2)}`;}).join('');}
function starPolygon(count,outer,inner){return Array.from({length:count*2},(_,i)=>{const a=i/count*Math.PI-Math.PI/2,r=i%2?inner:outer;return`${i?'L':'M'}${n(Math.cos(a)*r)} ${n(Math.sin(a)*r)}`;}).join('')+'Z';}
export function transportDefinitions(){return `
<g id="array-star" fill="none" stroke="currentColor" stroke-linejoin="round">
 <circle r="13.5" stroke-width=".35" opacity=".55"/><circle r="11.4" stroke-width=".8"/><circle r="8.7" stroke-width=".4"/>
 <path d="${radialTicks(24,11.6,13.2)}" stroke-width=".5"/><path d="${starPolygon(8,8.6,5.8)}" stroke-width=".48"/>
 <path d="M0-8.5 7.36 4.25H-7.36ZM0 8.5-7.36-4.25H7.36Z" stroke-width=".42" opacity=".8"/><circle r="3.4" stroke-width=".8"/><circle r="1.4" fill="currentColor" stroke="none"/>
 ${Array.from({length:8},(_,i)=>`<path d="M-1-15v-2h2v2" transform="rotate(${i*45})" stroke-width=".48"/>`).join('')}
</g>
<g id="array-official" fill="none" stroke="currentColor"><path d="${starPolygon(4,9.4,7.5)}" stroke-width=".8"/><circle r="5.8" stroke-width=".45"/><path d="M-4 0H4M0-4V4M-10-2v4M10-2v4M-2-10h4M-2 10h4" stroke-width=".6"/><circle r="1.4" fill="currentColor" stroke="none"/></g>
<g id="array-hidden" fill="none" stroke="currentColor"><circle r="8" stroke-width=".65" stroke-dasharray="12 4 6 3"/><path d="M0-5 5 0 0 5-5 0ZM-1-8l3 4-3 3 2 3-3 6" stroke-width=".6"/><path d="M-11-3l-2 2 3 3M9-7l3 1-1 3" stroke-width=".5" opacity=".75"/></g>`;}

export function transportMap(){
 let paths='',nodes='';
 for(const edge of transportEdges){const a=transportNodes.find(n=>n.id===edge.from),b=transportNodes.find(n=>n.id===edge.to),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),mx=(a.x+b.x)/2-dy/length*edge.bend,my=(a.y+b.y)/2+dx/length*edge.bend;const d=`M${a.x} ${a.y}Q${n(mx)} ${n(my)} ${b.x} ${b.y}`;
 paths+=`<g class="array-edge tier-${edge.tier}" data-from="${edge.from}" data-to="${edge.to}" data-tier="${edge.tier}"><path class="edge-shadow" d="${d}"/><path class="edge-thread" d="${d}"/></g>`;}
 for(const node of transportNodes){nodes+=`<g class="array-node tier-${node.tier}" data-array="${node.id}" data-tier="${node.tier}" transform="translate(${node.x} ${node.y})" role="button" tabindex="0" aria-label="查看${node.name}传送阵"><title>${node.name} · ${arrayTiers[node.tier].name}</title><circle class="node-hit" r="19"/><circle class="array-ground" r="${node.tier==='star'?12:8}"/><use href="#array-${node.tier}"/><text class="node-label" x="0" y="${node.tier==='star'?26:21}" text-anchor="middle">${node.name}</text></g>`;}
 return {lines:`<g id="array-lines">${paths}</g>`,nodes:`<g id="array-nodes">${nodes}</g>`};
}
export const transportStyle=`
.array-node{cursor:pointer;outline:none}.tier-star{color:#efd49b}.tier-official{color:#acdac9}.tier-hidden{color:#c9b0dd}
.array-edge{pointer-events:none;transition:opacity .18s}.edge-shadow{fill:none;stroke:#163b36;stroke-width:2.8;opacity:.4}.edge-thread{fill:none;stroke:currentColor;stroke-width:.95;stroke-dasharray:2 3;opacity:.65}.tier-star .edge-thread{stroke-dasharray:none;stroke-width:1.15;opacity:.76}.tier-hidden .edge-thread{stroke-dasharray:1 6;opacity:.56}
.node-hit{fill:transparent}.array-ground{fill:#183b39;fill-opacity:.82;stroke:#b6b991;stroke-width:.25}.node-label{font:8px 'Microsoft YaHei',sans-serif;letter-spacing:.7px;fill:currentColor;paint-order:stroke;stroke:#163732;stroke-width:2.2;opacity:0;pointer-events:none}
.detailed .node-label,.array-node:hover .node-label,.array-node:focus-visible .node-label,.array-node.selected .node-label{opacity:1}.array-node:hover .array-ground,.array-node:focus-visible .array-ground,.array-node.selected .array-ground{fill:#426350;stroke:#fff0bf;stroke-width:.8}
.has-array-focus .array-edge{opacity:.13}.has-array-focus .array-edge.related{opacity:1}.has-array-focus .array-edge.related .edge-thread{stroke-width:1.7;opacity:1}.has-array-focus .array-node{opacity:.45}.has-array-focus .array-node.related,.has-array-focus .array-node.selected{opacity:1}
.hide-arrays #array-lines,.hide-arrays #array-nodes,.hide-star .tier-star,.hide-official .tier-official,.hide-hidden .tier-hidden{display:none}
`;
