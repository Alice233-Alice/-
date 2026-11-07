import { computed, onScopeDispose, ref } from 'vue';
import { defineStore } from 'pinia';
import { klona } from 'klona';
import { useActionPreferences } from '../action-preferences';
import {
  buildJourneyAction,
  createJourney,
  JOURNEY_GENERATION_PREFIX,
  JOURNEY_INSPIRATIONS,
  JOURNEY_PROPOSAL_PROMPT,
  parseJourneyProposals,
  type JourneyProposal,
} from '../journey';
import { JourneysSchema, type Journey } from '../../灯火阑珊/schema/journeys';
import { Schema, type SchemaType } from '../schema';
import { useDataStore } from './data-store';
import { usePseudoLayerStore } from './pseudo-layer-store';

export const useJourneyStore = defineStore('bright-test-journeys', () => {
  const data = useDataStore();
  const pseudo = usePseudoLayerStore();
  const preferences = useActionPreferences();
  const empty = JourneysSchema.parse({});
  const archive = computed(() => data.rawData?.行旅 ?? empty);
  const currentId = computed(() => archive.value.当前追踪);
  const current = computed(() => archive.value.旅程[currentId.value]);
  const seeking = ref(false);
  const saving = ref(false);
  const error = ref('');
  const preference = ref('');
  const inspiration = ref('');
  const proposals = ref<JourneyProposal[]>([]);
  const panelOpen = ref(false);
  let generationId = '';
  let proposalChatId = '';
  let proposalMessageId = -1;
  const chatId = () => String(SillyTavern.getCurrentChatId() ?? '');
  const atLatest = computed(() => (pseudo.isDetachedMode ? pseudo.isNativeLatest : pseudo.isStoryHistoryLatest));
  const disabled = computed(() => !atLatest.value || pseudo.isGenerating || seeking.value || saving.value);
  const proposalsStale = computed(
    () =>
      proposals.value.length > 0 && (proposalChatId !== chatId() || proposalMessageId !== Number(data.viewedMessageId)),
  );
  const fail = (cause: unknown) => {
    error.value = cause instanceof Error ? cause.message : String(cause);
  };

  const write = async (change: (state: SchemaType) => void) => {
    if (disabled.value) return false;
    const target = Number(data.viewedMessageId);
    const origin = chatId();
    if (!Number.isInteger(target) || target < 0) return false;
    saving.value = true;
    error.value = '';
    try {
      await waitGlobalInitialized('Mvu');
      if (chatId() !== origin || Number(data.viewedMessageId) !== target || !atLatest.value || pseudo.isGenerating) {
        throw new Error('当前场景已变化，请返回最新正文后再试。');
      }
      const variables = klona(Mvu.getMvuData({ type: 'message', message_id: target }));
      const state = Schema.parse(variables.stat_data);
      change(state);
      const next = Schema.parse(state);
      await Mvu.replaceMvuData({ ...variables, stat_data: next }, { type: 'message', message_id: target });
      if (chatId() === origin && Number(data.viewedMessageId) === target) {
        data.viewMessage(target, { preserveGallery: true });
      }
      return true;
    } catch (cause) {
      fail(cause);
      return false;
    } finally {
      saving.value = false;
    }
  };

  const seek = async () => {
    if (disabled.value || !data.rawData) return;
    const origin = chatId();
    const target = Number(data.viewedMessageId);
    const requestId = `${JOURNEY_GENERATION_PREFIX}${crypto.randomUUID()}`;
    generationId = requestId;
    seeking.value = true;
    error.value = '';
    panelOpen.value = true;
    try {
      const snapshot = Schema.parse(klona(data.rawData));
      const primary = getCharWorldbookNames('current').primary;
      const world = primary
        ? (await getWorldbook(primary))
            .filter(entry => entry.enabled && /世界观|空间结构|修仙法则|大能约束|宗门势力概览/u.test(entry.name))
            .map(entry => `${entry.name}\n${entry.content.slice(0, 5000)}`)
            .join('\n\n')
            .slice(0, 18000)
        : '';
      if (generationId !== requestId || chatId() !== origin) return;
      const context = {
        偏好: preference.value.trim(),
        取意: JOURNEY_INSPIRATIONS[inspiration.value] ?? JOURNEY_INSPIRATIONS[''],
        处境: snapshot.当前处境,
        本尊: {
          等级: snapshot.本尊.等级,
          境界: snapshot.本尊.境界描述,
          身份: snapshot.本尊.身份,
          行踪: snapshot.本尊.行踪,
        },
        已知目标: snapshot.任务列表,
        近期世闻: snapshot.世界图志,
        相识之人: Object.fromEntries(
          Object.entries(snapshot.红颜).map(([name, person]) => [name, { 关系: person.关系, 近况: person.关系上下文 }]),
        ),
        已有行旅: Object.values(snapshot.行旅.旅程).map(journey => ({
          名称: journey.名称,
          所求: journey.所求,
          状态: journey.状态,
        })),
      };
      const response = await generateRaw({
        generation_id: requestId,
        should_stream: false,
        should_silence: true,
        max_chat_history: 0,
        overrides: { chat_history: { prompts: [], with_depth_entries: false } },
        ordered_prompts: [
          { role: 'system', content: `${JOURNEY_PROPOSAL_PROMPT}\n\n世界依据：\n${world}` },
          { role: 'user', content: `请依以下当前情况构思三种未发生的行旅提案：\n${JSON.stringify(context)}` },
        ],
      });
      if (generationId !== requestId) return;
      if (chatId() !== origin || Number(data.viewedMessageId) !== target) {
        throw new Error('场景已经变化，提案未写入；请在最新正文重新寻途。');
      }
      proposals.value = parseJourneyProposals(response);
      proposalChatId = origin;
      proposalMessageId = target;
    } catch (cause) {
      if (generationId === requestId) fail(cause);
    } finally {
      if (generationId === requestId) {
        generationId = '';
        seeking.value = false;
      }
    }
  };
  const cancel = () => {
    const id = generationId;
    generationId = '';
    seeking.value = false;
    if (id) stopGenerationById(id);
  };
  const perform = (journey: Journey, guessId?: string) => {
    if (disabled.value) return false;
    return pseudo.performAction(
      `行旅 · ${journey.名称}`,
      buildJourneyAction(journey, guessId),
      preferences.submitMode.value === 'direct',
    );
  };
  const choose = async (proposal: JourneyProposal) => {
    if (proposalsStale.value) {
      error.value = '提案来自先前场景，请重寻后再选。';
      return false;
    }
    const id = `行旅_${crypto.randomUUID().replaceAll('-', '')}`;
    const journey = createJourney(proposal);
    const saved = await write(state => {
      state.行旅.旅程[id] = journey;
      state.行旅.当前追踪 = id;
      state.$行旅蓝图[id] = proposal.plan;
    });
    if (saved) {
      proposals.value = [];
      panelOpen.value = false;
      perform(journey);
    }
    return saved;
  };
  const track = (id: string) =>
    write(state => {
      if (!state.行旅.旅程[id]) throw new Error('这段行旅已经不存在。');
      state.行旅.当前追踪 = id;
    });
  const pause = () =>
    write(state => {
      const journey = state.行旅.旅程[state.行旅.当前追踪];
      if (journey && journey.状态 !== '已落幕') journey.状态 = '暂歇';
    });
  const resume = async () => {
    const id = currentId.value;
    const journey = current.value;
    if (!journey || journey.状态 === '已落幕') return false;
    const saved = await write(state => {
      const target = state.行旅.旅程[id];
      if (target.状态 === '暂歇') target.状态 = target.进展 ? '进行中' : '待启程';
    });
    if (saved && current.value && currentId.value === id) perform(current.value);
    return saved;
  };
  const untrack = () =>
    write(state => {
      state.行旅.当前追踪 = '';
    });
  const removeJourney = (id: string) =>
    write(state => {
      if (!state.行旅.旅程[id]) throw new Error('这段行旅已经不存在。');
      delete state.行旅.旅程[id];
      delete state.$行旅蓝图[id];
      if (state.行旅.当前追踪 === id) state.行旅.当前追踪 = '';
    });
  const addGuess = async (content: string, clues: string[]) => {
    const text = content.trim().slice(0, 600);
    if (!text || !current.value) return false;
    const id = currentId.value;
    return write(state => {
      const journey = state.行旅.旅程[id];
      journey.猜想[`想法_${crypto.randomUUID().replaceAll('-', '')}`] = {
        内容: text,
        关联线索: clues.filter(key => journey.线索[key]),
        状态: '待核实',
        依据: '',
      };
    });
  };
  const verifyGuess = (id: string) => (current.value ? perform(current.value, id) : false);
  onScopeDispose(cancel);
  return {
    archive,
    currentId,
    current,
    seeking,
    saving,
    error,
    preference,
    inspiration,
    proposals,
    panelOpen,
    disabled,
    proposalsStale,
    seek,
    cancel,
    choose,
    track,
    pause,
    resume,
    untrack,
    removeJourney,
    addGuess,
    verifyGuess,
  };
});
