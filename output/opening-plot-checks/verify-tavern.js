() => {
  if(window.__openingPlotCheck?.running) return {running:true};
  window.__openingPlotCheck={running:true,started:Date.now()};
  void (async()=>{
    const frame=document.querySelector('#dhl-pseudo-stage-root iframe');
    if(!frame?.contentWindow.Mvu)throw Error('测试版舞台尚未就绪');
    const w=frame.contentWindow;
    const zod={z:w.z};
    const schema={exports:{}};
    ((exports,require)=>{"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpeningPlotCacheSchema = void 0;
const zod_1 = require("zod");
exports.OpeningPlotCacheSchema = zod_1.z
    .object({
    开场标识: zod_1.z.string().prefault(''),
    底稿指纹: zod_1.z.string().prefault(''),
    构思: zod_1.z.string().prefault(''),
})
    .prefault({});
})(schema.exports,()=>zod);
    const getCharWorldbookNames=()=>({primary:'独立校验世界'});
    const getWorldbook=async()=>[{enabled:true,name:'世界观',content:'独立虚构的山中书院，师徒通过日常相处与查证旧事建立信任。'}];
    let requests=0;
    let submitted;
    const generateRaw=async options=>{requests++;submitted=options;return '来信确实出于求助，旧友没有背叛老师。先让玩家从整理旧册中察觉牵挂，再由老师根据相处决定是否谈起求助。旧约可以通过查证或交涉处理，玩家也能先专心晨读，过程和结局留待实际选择。'};
    const core={exports:{}};
    ((exports,require)=>{"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpeningPlotCancelledError = exports.OPENING_PLOT_PLANNING_PROMPT = exports.OPENING_PLOT_GENERATION_PREFIX = exports.OPENING_PLOT_PROMPT_ID = void 0;
exports.openingPlotFingerprint = openingPlotFingerprint;
exports.collectOpeningPlotDrafts = collectOpeningPlotDrafts;
exports.resolveOpeningPlotDraft = resolveOpeningPlotDraft;
exports.readOpeningPlotCache = readOpeningPlotCache;
exports.buildOpeningPlotContext = buildOpeningPlotContext;
exports.generateOpeningPlot = generateOpeningPlot;
exports.createOpeningPlotPlanner = createOpeningPlotPlanner;
const opening_plot_1 = require("../\u706F\u706B\u9611\u73CA/schema/opening-plot");
exports.OPENING_PLOT_PROMPT_ID = 'dhl-authored-opening';
exports.OPENING_PLOT_GENERATION_PREFIX = 'dhl-opening-plot-';
function openingPlotFingerprint(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++)
        hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return `${text.length}-${(hash >>> 0).toString(16)}`;
}
function collectOpeningPlotDrafts(files) {
    const result = new Map();
    for (const [filename, raw] of Object.entries(files)) {
        const name = filename.replace(/^\.\//u, '').replace(/\.md$/iu, '').normalize('NFC').trim();
        if (!/\.md$/iu.test(filename) || name.startsWith('_') || /^readme$/iu.test(name))
            continue;
        const content = raw
            .replace(/^\uFEFF/u, '')
            .replace(/\r\n?/gu, '\n')
            .trim();
        if (!content)
            continue;
        if (result.has(name))
            throw new Error(`开场剧情底稿重名：${name}`);
        result.set(name, { openingId: name, content, fingerprint: openingPlotFingerprint(content) });
    }
    return result;
}
function resolveOpeningPlotDraft(openingMessage, drafts) {
    const firstLine = openingMessage
        .replace(/^\uFEFF/u, '')
        .trimStart()
        .split('\n')[0]
        .trim();
    const title = firstLine.match(/^(?:【([^】]+)】|\[([^\]]+)\])/u);
    return drafts.get((title?.[1] ?? title?.[2] ?? '').normalize('NFC').trim());
}
function readOpeningPlotCache(value, draft) {
    const result = opening_plot_1.OpeningPlotCacheSchema.safeParse(value);
    if (result.success &&
        result.data.开场标识 === draft.openingId &&
        result.data.底稿指纹 === draft.fingerprint &&
        result.data.构思.trim()) {
        return result.data;
    }
    return undefined;
}
function buildOpeningPlotContext(draft, cached) {
    const cache = readOpeningPlotCache(cached, draft);
    return `[作者开场剧情：${draft.openingId}]
作者底稿：
${draft.content}

本局幕后构思（尚未发生的发展可能）：
${cache?.构思 || '本局构思暂未备妥，直接依据作者底稿与实际处境铺陈。'}

作者写定的秘密、因果与人物动机持续成立。结合已有人设与实际正文承接；已经确认的经历优先，新增底稿只影响后续铺陈。
构思中的场景、线索与结局均保留待发生性质，人物所知须有来源，幕后信息逐渐显露。
本轮回应玩家的实际输入，依当前地点、修为与关系安排可参与的契机；玩家可以日常、暂离、改道或另寻解法。
作者剧情与玩家主动寻途可以共同发展，避免反复把玩家拉回同一入口，阶段成果与终局依实际选择形成。
已经发生的重要发现可使用现有正文短提示，并在正常变量结算中维护任务、世闻与手札。`;
}
exports.OPENING_PLOT_PLANNING_PROMPT = `围绕作者提供的特定开场剧情底稿，为本局酝酿一份简明的幕后构思，约500至800字。
保留作者写定的事实、秘密、人物动机和核心因果。已有角色设定与本局已经确认的经历持续成立，冲突处承接已确认事实。
根据当前修为、地点、关系和玩家起念，安排近期可接触的入口、各方各自的行动、可逐渐显露的线索、阶段成果与几种收束可能。
作者提出的可变情景容纳取舍；过程随玩家回应调整，避免固定回合表、强迫抵达、指定玩家情绪或无穷套谜。
使用自然语言，区分已成立依据与未来构想；仅返回幕后构思。实际正文、变量命令、聊天楼层和新事实留待正常游玩产生。`;
async function generateOpeningPlot(request, isCurrent) {
    const primary = getCharWorldbookNames('current').primary;
    const people = Object.keys(request.statData.红颜 ?? {});
    const world = primary
        ? (await getWorldbook(primary))
            .filter(entry => entry.enabled &&
            (/世界观|空间结构|修仙法则|大能约束|宗门势力概览/u.test(entry.name) ||
                people.some(name => entry.name === name || entry.name === `${name}人设`)))
            .map(entry => `${entry.name}\n${entry.content}`)
            .join('\n\n')
        : '';
    if (!isCurrent())
        throw new OpeningPlotCancelledError();
    const knownState = Object.fromEntries(['世界时钟', '当前处境', '本尊', '红颜', 'NPC图鉴', '任务列表', '世界图志', '行旅'].map(key => [
        key,
        request.statData[key],
    ]));
    return generateRaw({
        generation_id: request.generationId,
        should_stream: false,
        should_silence: true,
        max_chat_history: 0,
        overrides: { chat_history: { prompts: [], with_depth_entries: false } },
        ordered_prompts: [
            { role: 'system', content: `${exports.OPENING_PLOT_PLANNING_PROMPT}\n\n世界与人物依据：\n${world}` },
            {
                role: 'user',
                content: `开场正文：\n${request.openingMessage}\n\n作者底稿：\n${request.draft.content}\n\n当前实际状态：\n${JSON.stringify(knownState)}\n\n玩家本次起念：\n${request.userInput}`,
            },
        ],
    });
}
class OpeningPlotCancelledError extends Error {
    constructor() {
        super('开篇准备已停止或场景已经变化，输入已保留。');
        this.name = 'OpeningPlotCancelledError';
    }
}
exports.OpeningPlotCancelledError = OpeningPlotCancelledError;
function createOpeningPlotPlanner(host) {
    let pending;
    const current = () => {
        const scope = host.scope();
        const draft = scope && resolveOpeningPlotDraft(scope.openingMessage, host.drafts);
        return scope && draft ? { scope, draft } : undefined;
    };
    const keyOf = ({ scope, draft }) => JSON.stringify([scope.chatId, scope.messageId, scope.openingMessage, draft.openingId, draft.fingerprint]);
    const prepare = async (userInput) => {
        const context = current();
        if (!context)
            return;
        const variables = host.read(context.scope.messageId);
        const cached = readOpeningPlotCache(variables.stat_data.$开场剧情, context.draft);
        if (cached)
            return cached;
        const key = keyOf(context);
        if (pending?.key === key)
            return pending.promise;
        pending?.cancel();
        const generationId = `${exports.OPENING_PLOT_GENERATION_PREFIX}${crypto.randomUUID()}`;
        let cancelled = false;
        let rejectCancellation;
        const cancellation = new Promise((_resolve, reject) => {
            rejectCancellation = reject;
        });
        const isCurrent = () => {
            const next = current();
            return !cancelled && !!next && keyOf(next) === key;
        };
        const job = {
            key,
            promise: undefined,
            cancel: () => {
                if (cancelled)
                    return;
                cancelled = true;
                rejectCancellation(new OpeningPlotCancelledError());
                host.stop(generationId);
            },
        };
        pending = job;
        job.promise = (async () => {
            try {
                const response = await Promise.race([
                    host.generate({
                        generationId,
                        draft: context.draft,
                        openingMessage: context.scope.openingMessage,
                        statData: variables.stat_data,
                        userInput,
                    }, isCurrent),
                    cancellation,
                ]);
                if (!isCurrent())
                    throw new OpeningPlotCancelledError();
                if (typeof response !== 'string' || !response.trim())
                    throw new Error('开篇构思未返回完整文字。');
                const cache = {
                    开场标识: context.draft.openingId,
                    底稿指纹: context.draft.fingerprint,
                    构思: response.trim(),
                };
                const latest = host.read(context.scope.messageId);
                await host.write(context.scope.messageId, {
                    ...latest,
                    stat_data: { ...latest.stat_data, $开场剧情: cache },
                });
                if (!isCurrent())
                    throw new OpeningPlotCancelledError();
                return cache;
            }
            catch (error) {
                if (!isCurrent())
                    throw new OpeningPlotCancelledError();
                throw error;
            }
            finally {
                if (pending === job)
                    pending = undefined;
            }
        })();
        return job.promise;
    };
    return { prepare, cancel: () => pending?.cancel() };
}
})(core.exports,()=>schema.exports);
    const original=w.Mvu.getMvuData({type:'message',message_id:0});
    const before=JSON.stringify(original.stat_data), beforeMessages=SillyTavern.getContext().chat.length;
    const drafts=core.exports.collectOpeningPlotDrafts({'./校验开场-山中书院.md':'独立校验素材：老师收到旧友的求助信。来信确实出于求助，旧友没有背叛老师。这两个事实固定。想讲师徒如何逐渐建立信任。可从旧册、避雨来客和整理书架引出可查证的线索，玩家可以先学习或外出，解决方式和结局留给实际选择。'});
    let variables={initialized_lorebooks:{},stat_data:{当前处境:'独立校验：山中书院晨读。',本尊:{等级:1,身份:'书院学生',行踪:{当前区域:'山中书院'}},红颜:{},任务列表:{},行旅:{当前追踪:'',旅程:{}}}};
    const planner=core.exports.createOpeningPlotPlanner({
      drafts,scope:()=>({chatId:'隔离校验',messageId:0,openingMessage:'【校验开场-山中书院】\n老师在晨读后把一封信收进书册。'}),
      read:()=>structuredClone(variables),write:async(_id,value)=>{variables=structuredClone(value)},
      generate:core.exports.generateOpeningPlot,stop:()=>{}
    });
    const cache=await planner.prepare('先整理书架，看看老师是否愿意谈起旧友。');
    await planner.prepare('再次准备，应复用同一份构思');
    const shadow=w._.cloneDeep(original);
    shadow.stat_data.$开场剧情=cache;
    const parsed=await w.Mvu.parseMessage('<UpdateVariable><Analysis>独立副本中的缓存保护校验。</Analysis><JSONPatch>[{"op":"remove","path":"/$开场剧情"}]</JSONPatch></UpdateVariable>',shadow);
    return {mode:'local-only',requests,cacheReady:!!cache.构思,cacheProtected:JSON.stringify(parsed.stat_data.$开场剧情)===JSON.stringify(cache),
      promptChecked:submitted.ordered_prompts.some(p=>p.content.includes('旧友没有背叛老师')),noChatHistory:submitted.max_chat_history===0,
      liveSaveUnchanged:JSON.stringify(w.Mvu.getMvuData({type:'message',message_id:0}).stat_data)===before,
      chatUnchanged:SillyTavern.getContext().chat.length===beforeMessages,
      plan:cache.构思,elapsedMs:Date.now()-window.__openingPlotCheck.started};
  })().then(report=>window.__openingPlotCheck={running:false,...report},error=>window.__openingPlotCheck={running:false,error:String(error)});
  return {started:true};
}