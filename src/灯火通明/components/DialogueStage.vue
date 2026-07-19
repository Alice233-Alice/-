<template>
  <section class="dialogue-stage" :class="{ historical: !pseudo.isDialogueHistoryLatest, transmitting: context?.channel === 'transmission' }">
    <header class="dialogue-header">
      <div class="speaker-heading">
        <span class="channel-mark">
          <i class="fa-solid" :class="context?.channel === 'transmission' ? 'fa-feather-pointed' : 'fa-comments'"></i>
        </span>
        <span class="speaker-copy">
          <small>{{ dialogueKicker }}</small>
          <strong>{{ context?.targetName || '尚未择定' }}</strong>
        </span>
        <span v-if="relationLabel" class="relation-label">{{ relationLabel }}</span>
      </div>

      <div v-if="pseudo.isDialogueHistoryLatest" class="dialogue-actions">
        <button type="button" title="更换交谈对象" :disabled="pseudo.isGenerating" @click="showPicker = true">
          <i class="fa-solid fa-user-group"></i><span>换人</span>
        </button>
        <button
          v-if="!pseudo.isDialogueActive && context"
          type="button"
          class="continue-button"
          :disabled="pseudo.isGenerating"
          @click="pseudo.continueDialogue"
        >
          <i class="fa-solid fa-comment-dots"></i><span>继续交谈</span>
        </button>
        <button
          v-if="context"
          type="button"
          class="reset-button"
          title="保留旧记录，用同一角色开启一段新交谈"
          :disabled="pseudo.isGenerating"
          @click="pseudo.resetDialogue"
        >
          <i class="fa-solid fa-arrow-rotate-left"></i><span>重置</span>
        </button>
        <button
          v-if="pseudo.isDialogueActive"
          type="button"
          class="end-button"
          :disabled="pseudo.isGenerating"
          @click="pseudo.endDialogue"
        >
          <i class="fa-solid fa-door-open"></i><span>结束交谈</span>
        </button>
      </div>
      <button
        v-else-if="context"
        type="button"
        class="history-resume-button"
        :disabled="pseudo.isGenerating"
        @click="pseudo.continueDialogue"
      >
        <i class="fa-solid fa-forward-step"></i><span>返回最新并继续</span>
      </button>
      <span v-else class="history-badge"><i class="fa-solid fa-lock"></i> 历史对话</span>
    </header>

    <div class="dialogue-layout" :class="{ 'with-portrait': Boolean(portraitUrl) }">
      <div class="dialogue-scroll-shell">
        <div
          ref="scrollRef"
          class="dialogue-scroll"
          @scroll="handleStreamScroll"
          @wheel.passive="handleStreamWheel"
          @touchstart.passive="handleStreamTouchStart"
          @touchmove.passive="handleStreamTouchMove"
        >
          <div v-if="visibleTurns.length === 0 && !pseudo.isGenerating" class="dialogue-empty">
            <i class="fa-solid" :class="context?.channel === 'transmission' ? 'fa-paper-plane' : 'fa-comment-dots'"></i>
            <strong>{{ context?.targetName ? `与${context.targetName}的交谈尚未开始` : '请选择交谈对象' }}</strong>
            <span>{{ pseudo.isDialogueHistoryLatest ? '在下方写下想说的话。' : '此历史节点没有可显示的交谈记录。' }}</span>
            <button
              v-if="pseudo.isDialogueHistoryLatest && !context"
              type="button"
              class="choose-speaker-button"
              @click="showPicker = true"
            >
              <i class="fa-solid fa-user-group"></i><span>选择角色</span>
            </button>
          </div>

          <template v-for="turn in visibleTurns" :key="turn.assistantMessageId">
            <article v-if="turn.userText" class="dialogue-turn user-turn">
              <span class="bubble-speaker">你</span>
              <div class="dialogue-bubble">{{ turn.userText }}</div>
            </article>

            <article class="dialogue-turn character-turn">
              <div class="bubble-heading">
                <span>{{ context?.targetName }}</span>
                <button
                  v-if="turn.reasoning"
                  type="button"
                  :title="expandedReasoningId === turn.assistantMessageId ? '收起推演思绪' : '查看推演思绪'"
                  @click="toggleReasoning(turn.assistantMessageId)"
                >
                  <i class="fa-solid fa-brain"></i>
                  <span v-if="turn.reasoningDuration">{{ formatDuration(turn.reasoningDuration) }}</span>
                </button>
              </div>
              <p v-if="turn.reaction" class="dialogue-reaction">{{ turn.reaction }}</p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="dialogue-bubble formatted" v-html="formatReply(turn.replyText, turn.assistantMessageId)"></div>
              <div v-if="expandedReasoningId === turn.assistantMessageId" class="turn-reasoning">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div v-html="formatReasoning(turn.reasoning, turn.assistantMessageId)"></div>
              </div>
            </article>
          </template>

          <article v-if="pseudo.isGenerating && pendingUserText" class="dialogue-turn user-turn pending">
            <span class="bubble-speaker">你</span>
            <div class="dialogue-bubble">{{ pendingUserText }}</div>
          </article>

          <article v-if="pseudo.isGenerating" class="dialogue-turn character-turn live-turn">
            <div class="bubble-heading">
              <span>{{ context?.targetName }}</span>
              <span class="live-status"><i class="fa-solid fa-circle-notch fa-spin"></i>{{ liveStatus }}</span>
            </div>
            <p v-if="pseudo.streamReaction" class="dialogue-reaction live">{{ pseudo.streamReaction }}</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="liveReplyHtml" class="dialogue-bubble formatted" v-html="liveReplyHtml"></div>
            <div v-else class="dialogue-bubble waiting-dots" aria-label="等待回应"><i></i><i></i><i></i></div>
            <details v-if="pseudo.liveReasoning" class="live-reasoning">
              <summary><i class="fa-solid fa-brain"></i> 推演思绪</summary>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="formatReasoning(pseudo.liveReasoning, pseudo.view.selectedMessageId)"></div>
            </details>
          </article>
        </div>

        <button
          v-if="pseudo.isGenerating && !isFollowingStream"
          type="button"
          class="resume-stream-follow"
          title="回到最新对话"
          @click="resumeStreamFollow(!appearance.preferences.reduceMotion)"
        >
          <i class="fa-solid fa-arrow-down"></i>
          <span>跟随最新</span>
        </button>
      </div>

      <aside v-if="portraitUrl" class="dialogue-portrait" aria-label="交谈对象立绘">
        <div class="portrait-frame">
          <img :src="portraitUrl" :alt="context?.targetName || ''" />
          <span>
            <small>{{ context?.channel === 'transmission' ? '传讯彼端' : '此刻在场' }}</small>
            <strong>{{ context?.targetName }}</strong>
          </span>
        </div>
        <dl v-if="relation || emotion">
          <div v-if="relation"><dt>关系</dt><dd>{{ relation }}</dd></div>
          <div v-if="emotion"><dt>心绪</dt><dd>{{ emotion }}</dd></div>
        </dl>
      </aside>
    </div>

    <DialogueTargetPicker :visible="showPicker" @close="showPicker = false" />
  </section>
</template>

<script setup lang="ts">
import { getCharacterImageCandidates } from '../character-assets';
import { useStreamFollow } from '../composables/use-stream-follow';
import { formatMessageHtml } from '../message-content';
import { useDataStore, usePseudoLayerStore, useThemeStore } from '../store';
import type { DialogueTurn } from '../store';
import DialogueTargetPicker from './DialogueTargetPicker.vue';

const pseudo = usePseudoLayerStore();
const data = useDataStore();
const appearance = useThemeStore();
const scrollRef = ref<HTMLElement>();
const {
  isFollowing: isFollowingStream,
  handleScroll: handleStreamScroll,
  handleWheel: handleStreamWheel,
  handleTouchStart: handleStreamTouchStart,
  handleTouchMove: handleStreamTouchMove,
  queueFollow: queueStreamFollow,
  resumeFollowing: resumeStreamFollow,
} = useStreamFollow(scrollRef);
const expandedReasoningId = ref<number | null>(null);
const showPicker = ref(false);

const context = computed(() => pseudo.dialogueContext);
const companion = computed(() => {
  const canonicalName = context.value?.canonicalName;
  return canonicalName ? (data.红颜 as Record<string, any>)[canonicalName] : undefined;
});
const relation = computed(() => String(companion.value?.关系 ?? '').trim());
const emotion = computed(() => String(companion.value?.关系上下文?.当前情绪 ?? '').trim());
const relationLabel = computed(() => [relation.value, emotion.value].filter(Boolean).join(' · '));
const dialogueKicker = computed(() => {
  if (!pseudo.isDialogueActive) return pseudo.isDialogueHistoryLatest ? '最近交谈' : '历史对话';
  return context.value?.channel === 'transmission' ? '传讯往来' : '此刻相谈';
});

const portraitUrl = computed(() => {
  const value = context.value;
  if (!value) return '';
  const currentCard = data.galleryCards.find(card => {
    const canonical = card.name === '虞汐' || card.name === '虞颜' ? '虞汐颜' : card.name;
    return canonical === value.canonicalName;
  });
  if (currentCard) {
    if (currentCard.frontName === value.targetName) return currentCard.front;
    if (currentCard.backName === value.targetName) return currentCard.back;
    return currentCard.front;
  }
  const custom = (data.红颜角色库 as Record<string, any>)[value.canonicalName]?.自定义立绘?.正面;
  return (
    String(custom ?? '').trim() ||
    String(getCharacterImageCandidates(value.targetName, 'front', value.targetName)[0] ?? '')
  );
});

const visibleTurns = computed<DialogueTurn[]>(() => {
  const sessionId = context.value?.sessionId;
  if (!sessionId) return [];
  return pseudo.isRerolling ? pseudo.dialogueTurns.slice(0, -1) : pseudo.dialogueTurns;
});
const pendingUserText = computed(() => pseudo.generationUserMessage.trim() || pseudo.draftPrompt.trim());
const liveReplyHtml = computed(() =>
  formatMessageHtml(pseudo.streamText, pseudo.view.selectedMessageId),
);
const liveStatus = computed(() => {
  if (pseudo.generationState === 'preparing') return context.value?.channel === 'transmission' ? '传讯送出' : '静候回应';
  if (pseudo.generationState === 'saving') return '落定记录';
  if (pseudo.generationState === 'stopping') return '收束回应';
  return context.value?.channel === 'transmission' ? '回信中' : '回应中';
});

const formatReply = (text: string, messageId: number) => formatMessageHtml(text, messageId);
const formatReasoning = (text: string, messageId: number) => formatMessageHtml(text, messageId);
const formatDuration = (duration: number) => `${Math.max(1, Math.round(duration / 1000))} 秒`;
const toggleReasoning = (messageId: number) => {
  expandedReasoningId.value = expandedReasoningId.value === messageId ? null : messageId;
};

watch([() => pseudo.streamText, () => pseudo.streamReaction, () => pseudo.dialogueTurns.length], queueStreamFollow);
watch(
  () => context.value?.sessionId,
  () => resumeStreamFollow(false),
);
watch(
  () => pseudo.generationState,
  (next, previous) => {
    if (previous === 'idle' && next !== 'idle') resumeStreamFollow(false);
  },
);
watch(
  () => pseudo.view.selectedMessageId,
  () => {
    expandedReasoningId.value = null;
    resumeStreamFollow(false);
  },
);
</script>

<style lang="scss" scoped>
.dialogue-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  background: var(--reading-surface);
  isolation: isolate;
}
.dialogue-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--reading-material);
  opacity: 0.76;
  pointer-events: none;
}
.dialogue-stage > * { position: relative; z-index: 1; }

.choose-speaker-button {
  min-height: 34px;
  margin-top: 8px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  color: var(--gold);
  background: var(--button-bg);
  cursor: pointer;
}
.choose-speaker-button:hover { background: var(--button-hover); }

.dialogue-header {
  min-height: 48px;
  flex: none;
  padding: 6px 12px 6px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--line-subtle);
  background: color-mix(in srgb, var(--surface-inset) 72%, transparent);
}
.speaker-heading { min-width: 0; display: flex; align-items: center; gap: 9px; }
.channel-mark {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-subtle);
  border-radius: 50%;
  color: var(--jade);
  background: color-mix(in srgb, var(--jade) 8%, var(--surface-inset));
}
.transmitting .channel-mark { color: var(--gold); background: color-mix(in srgb, var(--gold) 8%, var(--surface-inset)); }
.speaker-copy { min-width: 0; display: grid; gap: 1px; }
.speaker-copy small { color: var(--text-secondary); font-size: 9px; }
.speaker-copy strong { overflow: hidden; color: var(--text-accent); font-family: 'Songti SC', 'STSong', serif; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.relation-label, .history-badge {
  flex: none;
  padding: 3px 7px;
  border: 1px solid var(--line-subtle);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 9px;
}
.dialogue-actions { display: flex; gap: 5px; }
.dialogue-actions button,
.history-resume-button {
  min-height: 30px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--line-subtle);
  border-radius: 5px;
  color: var(--text-secondary);
  background: var(--surface-inset);
  cursor: pointer;
}
.dialogue-actions button:hover:not(:disabled),
.history-resume-button:hover:not(:disabled) { border-color: var(--line-strong); color: var(--gold); }
.dialogue-actions button:disabled,
.history-resume-button:disabled { opacity: 0.4; cursor: not-allowed; }
.dialogue-actions .continue-button { color: var(--jade); }
.dialogue-actions .end-button { color: var(--gold-soft); }
.history-resume-button { flex: none; color: var(--jade); }

.dialogue-layout {
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.dialogue-layout.with-portrait { grid-template-columns: minmax(0, 1fr) clamp(210px, 21vw, 310px); }
.dialogue-scroll-shell { position: relative; min-width: 0; min-height: 0; }
.dialogue-scroll {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(22px, 4vh, 42px) clamp(18px, 5vw, 64px) 46px;
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}
.resume-stream-follow {
  position: absolute;
  right: 16px;
  bottom: 12px;
  z-index: 2;
  min-height: 32px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-accent);
  background: color-mix(in srgb, var(--surface-raised) 94%, transparent);
  box-shadow: 0 10px 28px var(--stage-shadow);
  cursor: pointer;
}
.resume-stream-follow:hover { color: var(--gold); background: var(--button-hover); }
.dialogue-empty {
  height: 100%;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 9px;
  color: var(--text-secondary);
  text-align: center;
}
.dialogue-empty i { color: var(--jade); font-size: 22px; }
.dialogue-empty strong { color: var(--text-accent); font-family: 'Songti SC', 'STSong', serif; }
.dialogue-empty span { font-size: 11px; }

.dialogue-turn { width: min(82%, 760px); margin-bottom: 20px; display: flex; flex-direction: column; }
.user-turn { margin-left: auto; align-items: flex-end; }
.character-turn { margin-right: auto; align-items: flex-start; }
.bubble-speaker, .bubble-heading {
  margin-bottom: 5px;
  color: var(--text-secondary);
  font-size: 10px;
}
.bubble-heading { width: 100%; min-height: 21px; display: flex; align-items: center; gap: 8px; }
.bubble-heading > span:first-child { color: var(--text-accent); }
.bubble-heading button {
  min-height: 21px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 4px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-inset) 70%, transparent);
  font-size: 9px;
  cursor: pointer;
}
.bubble-heading button:hover { color: var(--jade); }
.dialogue-bubble {
  padding: 11px 14px;
  border: 1px solid var(--line-subtle);
  border-radius: 7px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-raised) 88%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--stage-shadow) 18%, transparent);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: var(--reading-font-size);
  line-height: min(var(--reading-line-height), 2);
}
.user-turn .dialogue-bubble {
  border-color: color-mix(in srgb, var(--gold) 28%, var(--line-subtle));
  background: color-mix(in srgb, var(--gold) 9%, var(--surface-inset));
}
.character-turn .dialogue-bubble {
  border-color: color-mix(in srgb, var(--jade) 24%, var(--line-subtle));
}
.dialogue-reaction {
  max-width: 92%;
  margin: 0 0 7px 3px;
  padding-left: 9px;
  border-left: 1px solid color-mix(in srgb, var(--jade) 48%, var(--line-subtle));
  color: var(--text-secondary);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: 11px;
  font-style: italic;
  line-height: 1.65;
}
.dialogue-reaction.live { color: color-mix(in srgb, var(--jade) 72%, var(--text-secondary)); }
.formatted :deep(p) { margin: 0 0 0.72em; }
.formatted :deep(p:last-child) { margin-bottom: 0; }
.formatted :deep(q) { quotes: none; }
.formatted :deep(q::before),
.formatted :deep(q::after) { content: none; }
.turn-reasoning, .live-reasoning {
  width: 100%;
  margin-top: 6px;
  padding: 9px 11px;
  border-left: 2px solid var(--jade);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-inset) 72%, transparent);
  font-size: 11px;
  line-height: 1.7;
}
.live-reasoning summary { color: var(--jade); cursor: pointer; }
.live-status { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; color: var(--jade) !important; }
.waiting-dots { min-width: 72px; display: flex; align-items: center; justify-content: center; gap: 5px; }
.waiting-dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--jade); animation: dialogue-pulse 1.1s ease-in-out infinite; }
.waiting-dots i:nth-child(2) { animation-delay: 0.14s; }
.waiting-dots i:nth-child(3) { animation-delay: 0.28s; }

.dialogue-portrait {
  min-width: 0;
  min-height: 0;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-left: 1px solid var(--line-subtle);
  background: var(--portrait-material), color-mix(in srgb, var(--surface) 84%, transparent);
}
.portrait-frame {
  min-height: 0;
  flex: 1;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: var(--surface-inset);
  box-shadow: 0 14px 36px color-mix(in srgb, var(--stage-shadow) 55%, transparent);
}
.portrait-frame img { width: 100%; height: 100%; display: block; object-fit: contain; }
.portrait-frame > span {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 42px 12px 11px;
  display: grid;
  gap: 2px;
  color: #f3eee5;
  background: linear-gradient(to top, color-mix(in srgb, var(--surface-inset) 96%, black), transparent);
}
.portrait-frame small { color: #e4bd75; font-size: 9px; }
.portrait-frame strong { font-family: 'Songti SC', 'STSong', serif; font-size: 17px; }
.dialogue-portrait dl { margin: 0; padding: 9px 10px; border-top: 1px solid var(--line-subtle); }
.dialogue-portrait dl div { display: grid; grid-template-columns: 38px 1fr; gap: 7px; padding: 3px 0; font-size: 10px; }
.dialogue-portrait dt { color: var(--gold-soft); }
.dialogue-portrait dd { margin: 0; color: var(--text-secondary); }

@keyframes dialogue-pulse {
  0%, 100% { opacity: 0.28; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

@media screen and (max-width: 760px) {
  .dialogue-header { align-items: flex-start; }
  .relation-label { display: none; }
  .dialogue-actions button span { display: none; }
  .dialogue-actions button { width: 31px; padding: 0; }
  .history-resume-button span { display: none; }
  .history-resume-button { width: 31px; padding: 0; }
  .dialogue-layout.with-portrait {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 112px minmax(0, 1fr);
  }
  .dialogue-portrait {
    grid-row: 1;
    padding: 9px 12px;
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    border-bottom: 1px solid var(--line-subtle);
    border-left: 0;
  }
  .portrait-frame { grid-row: 1; min-height: 92px; }
  .portrait-frame > span { padding: 26px 7px 6px; }
  .portrait-frame strong { font-size: 12px; }
  .dialogue-portrait dl { align-self: center; border-top: 0; }
  .dialogue-scroll-shell { grid-row: 2; }
  .dialogue-scroll { padding: 20px 13px 34px; }
  .resume-stream-follow { right: 9px; bottom: 9px; }
  .dialogue-turn { width: 92%; margin-bottom: 15px; }
  .dialogue-bubble { padding: 9px 11px; }
}

.historical .dialogue-scroll { padding-bottom: 28px; }
</style>
