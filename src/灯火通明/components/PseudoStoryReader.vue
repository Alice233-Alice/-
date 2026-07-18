<template>
  <section class="story-reader" :class="{ streaming: isStoryGenerating }">
    <div v-if="userPrompt || reasoningText" class="turn-context-bar">
      <button
        v-if="userPrompt"
        type="button"
        class="turn-prompt-trigger"
        :aria-expanded="contextPanel === 'prompt'"
        title="查看本回完整起念"
        @click="toggleContext('prompt')"
      >
        <i class="fa-solid fa-feather-pointed"></i>
        <span class="turn-context-label">本回起念</span>
        <span class="turn-prompt-preview">{{ userPromptPreview }}</span>
      </button>

      <button
        v-if="reasoningText"
        type="button"
        class="reasoning-trigger"
        :aria-expanded="contextPanel === 'reasoning'"
        title="查看推演思绪"
        @click="toggleContext('reasoning')"
      >
        <i class="fa-solid fa-brain"></i>
        <span class="reasoning-label">推演思绪</span>
        <span v-if="reasoningTime" class="reasoning-time">{{ reasoningTime }}</span>
        <i class="fa-solid fa-chevron-down context-chevron"></i>
      </button>
    </div>

    <button
      v-if="contextPanel"
      type="button"
      class="context-scrim"
      aria-label="关闭回合脉络"
      @click="contextPanel = null"
    ></button>
    <section v-if="contextPanel" class="context-popover" role="dialog" :aria-label="contextTitle">
      <header class="context-popover-header">
        <span>
          <i :class="contextPanel === 'prompt' ? 'fa-solid fa-feather-pointed' : 'fa-solid fa-brain'"></i>
          {{ contextTitle }}
        </span>
        <span v-if="contextPanel === 'reasoning' && reasoningTime" class="context-popover-time">
          {{ reasoningTime }}
        </span>
        <button type="button" title="关闭" aria-label="关闭" @click="contextPanel = null">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>
      <!-- 酒馆格式化接口已完成与原生楼层相同的 HTML 处理。 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="context-popover-copy" v-html="contextHtml"></div>
    </section>

    <div class="story-layout" :class="{ 'with-portrait': showPortrait }">
      <ScenePortraitRail v-if="showPortrait" class="story-portrait" />

      <div class="story-scroll-shell">
        <div
          ref="scrollRef"
          class="story-scroll"
          @scroll="handleStreamScroll"
          @wheel.passive="handleStreamWheel"
          @touchstart.passive="handleStreamTouchStart"
          @touchmove.passive="handleStreamTouchMove"
        >
          <div v-if="isStoryGenerating && !pseudo.streamText" class="story-waiting">
            <i class="fa-solid fa-feather-pointed"></i>
            <span>气机正在汇聚，等待第一缕回响……</span>
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <article v-else-if="storyHtml" class="story-copy" v-html="storyHtml"></article>
          <div v-else class="story-empty">此回尚无可供阅读的正文。</div>
        </div>
        <button
          v-if="isStoryGenerating && !isFollowingStream"
          type="button"
          class="resume-stream-follow"
          title="回到最新生成内容"
          @click="resumeStreamFollow(!appearance.preferences.reduceMotion)"
        >
          <i class="fa-solid fa-arrow-down"></i>
          <span>跟随最新</span>
        </button>
      </div>
    </div>

    <div v-if="isStoryGenerating" class="stream-status">
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      <span>{{ generationLabel }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { extractNarrative, formatMessageHtml, stripStructuredBlocks } from '../message-content';
import { useDataStore, usePseudoLayerStore, useThemeStore } from '../store';
import { useStreamFollow } from '../composables/use-stream-follow';
import ScenePortraitRail from './ScenePortraitRail.vue';

const props = defineProps<{ immersive?: boolean }>();
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
const contextPanel = ref<'prompt' | 'reasoning' | null>(null);
const showPortrait = computed(
  () => !props.immersive && appearance.preferences.showPortraitRail && data.hasGalleryCards,
);

const storyMessageId = computed(() =>
  pseudo.storyFloorMessageId >= 0 ? pseudo.storyFloorMessageId : pseudo.view.selectedMessageId,
);
const isStoryGenerating = computed(() => pseudo.isGenerating && !pseudo.activeDialogue);
const formatText = (text: string, messageId = storyMessageId.value) => {
  return formatMessageHtml(text, messageId);
};

const currentRawMessage = computed(() =>
  isStoryGenerating.value && pseudo.streamText ? pseudo.streamText : pseudo.storyFloorMessage,
);
const storyHtml = computed(() => formatText(extractNarrative(currentRawMessage.value)));
const userPrompt = computed(() =>
  (isStoryGenerating.value ? pseudo.turnUserMessage : pseudo.storyFloorUserMessage).trim(),
);
const userPromptPreview = computed(() =>
  stripStructuredBlocks(userPrompt.value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),
);
const userPromptHtml = computed(() => formatText(stripStructuredBlocks(userPrompt.value)));
const reasoningText = computed(() =>
  isStoryGenerating.value
    ? pseudo.liveReasoning || pseudo.storyFloorReasoning
    : pseudo.storyFloorReasoning,
);
const reasoningHtml = computed(() => formatText(reasoningText.value));
const reasoningTime = computed(() => {
  const duration = isStoryGenerating.value
    ? pseudo.reasoningDuration ?? pseudo.storyFloorReasoningDuration
    : pseudo.storyFloorReasoningDuration;
  if (!duration) return '';
  return `${Math.max(1, Math.round(duration / 1000))} 秒`;
});
const contextTitle = computed(() => (contextPanel.value === 'prompt' ? '本回起念' : '推演思绪'));
const contextHtml = computed(() => (contextPanel.value === 'prompt' ? userPromptHtml.value : reasoningHtml.value));

const toggleContext = (panel: 'prompt' | 'reasoning') => {
  contextPanel.value = contextPanel.value === panel ? null : panel;
};

const closeContextOnEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') contextPanel.value = null;
};

const generationLabel = computed(() => {
  const labels = {
    idle: '',
    preparing: '正在整理前因',
    generating: '正文正在落笔',
    saving: '正在落定新回合',
    stopping: '正在收束推演',
  };
  return labels[pseudo.generationState];
});

watch(
  () => pseudo.streamText,
  () => {
    if (isStoryGenerating.value) queueStreamFollow();
  },
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
    contextPanel.value = null;
  },
);

onMounted(() => window.addEventListener('keydown', closeContextOnEscape));
onBeforeUnmount(() => window.removeEventListener('keydown', closeContextOnEscape));

defineExpose({ scrollElement: scrollRef });
</script>

<style lang="scss" scoped>
.story-reader {
  position: relative;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  isolation: isolate;
  background: var(--reading-surface);
  box-shadow: inset 0 0 70px color-mix(in srgb, var(--stage-shadow) 18%, transparent);
}

.story-reader::before,
.story-reader::after {
  content: '';
  position: absolute;
  z-index: 0;
  pointer-events: none;
}
.story-reader::before { inset: 0; background: var(--reading-material); opacity: 0.9; }
.story-reader::after {
  top: 18px;
  bottom: 18px;
  left: 14px;
  width: 1px;
  background: linear-gradient(transparent, var(--line-strong) 18%, var(--line-subtle) 82%, transparent);
  opacity: 0.46;
}
.story-reader > * { position: relative; z-index: 1; }

.turn-context-bar {
  flex-shrink: 0;
  min-width: 0;
  min-height: 36px;
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--line-subtle);
  background: color-mix(in srgb, var(--surface-inset) 68%, transparent);
}

.turn-prompt-trigger,
.reasoning-trigger {
  min-width: 0;
  min-height: 36px;
  border: 0;
  border-radius: 0;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
}

.turn-prompt-trigger {
  flex: 1;
  padding: 7px 14px 7px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.turn-prompt-trigger > i { flex: none; color: var(--jade); }
.turn-context-label { flex: none; color: var(--text-accent); }
.turn-prompt-preview {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reasoning-trigger {
  flex: none;
  padding: 7px 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-left: 1px solid var(--line-subtle);
}

.reasoning-trigger > i:first-child { color: var(--jade); }
.turn-prompt-trigger:hover,
.reasoning-trigger:hover,
.turn-prompt-trigger[aria-expanded='true'],
.reasoning-trigger[aria-expanded='true'] {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--button-hover) 74%, transparent);
}

.context-chevron {
  color: var(--text-secondary) !important;
  font-size: 9px;
  transition: transform 0.18s ease;
}
.reasoning-trigger[aria-expanded='true'] .context-chevron { transform: rotate(180deg); }

.context-scrim {
  position: absolute !important;
  z-index: 4 !important;
  inset: 36px 0 0;
  width: 100%;
  border: 0;
  background: color-mix(in srgb, var(--stage-shadow) 28%, transparent);
  cursor: default;
}

.context-popover {
  position: absolute !important;
  z-index: 5 !important;
  top: 46px;
  left: clamp(12px, 3vw, 36px);
  right: clamp(12px, 3vw, 36px);
  max-height: min(46vh, 360px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-raised) 96%, transparent);
  box-shadow: 0 18px 54px var(--stage-shadow), inset 0 0 0 1px var(--line-subtle);
}

.context-popover-header {
  min-height: 40px;
  flex: none;
  padding: 0 10px 0 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--line-subtle);
  color: var(--text-accent);
  font-size: 12px;
}
.context-popover-header > span:first-child { display: flex; align-items: center; gap: 7px; }
.context-popover-header > span:first-child i { color: var(--jade); }
.context-popover-time { margin-left: auto; color: var(--gold-soft); font-size: 10px; }
.context-popover-header button {
  width: 30px;
  height: 30px;
  margin-left: auto;
  border: 0;
  color: var(--text-secondary);
  background: transparent;
  cursor: pointer;
}
.context-popover-time + button { margin-left: 0; }
.context-popover-header button:hover { color: var(--text-primary); }

.context-popover-copy {
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px 18px;
  color: var(--text-primary);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: 13px;
  line-height: 1.85;
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}
.context-popover-copy :deep(p) { margin: 0 0 0.9em; }
.context-popover-copy :deep(p:last-child) { margin-bottom: 0; }

.reasoning-time { color: var(--gold-soft); font-size: 10px; }

.story-layout {
  min-width: 0;
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-areas: 'copy';
  grid-template-columns: minmax(0, 1fr);

  &.with-portrait {
    grid-template-areas: 'copy portrait';
    grid-template-columns: minmax(0, 1fr) clamp(250px, 24vw, 350px);
  }
}

.story-scroll-shell {
  grid-area: copy;
  position: relative;
  min-width: 0;
  min-height: 0;
}

.story-scroll {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(24px, 4vh, 46px) clamp(24px, 5vw, 72px) 48px;
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}

.resume-stream-follow {
  position: absolute;
  right: 18px;
  bottom: 14px;
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

.story-portrait { grid-area: portrait; }

.story-copy {
  max-width: var(--reading-measure);
  margin: 0 auto;
  color: var(--text-primary);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: var(--reading-font-size);
  line-height: var(--reading-line-height);
  text-align: justify;
  text-wrap: pretty;

  :deep(p) { margin: 0 0 1.2em; }
  text-shadow: 0 1px 1px color-mix(in srgb, var(--stage-shadow) 16%, transparent);

  :deep(q) { color: var(--text-accent); quotes: none; }
  :deep(q::before), :deep(q::after) { content: none; }
  :deep(blockquote) { margin: 20px 0; padding: 4px 0 4px 16px; border-left: 2px solid var(--gold); color: var(--text-accent); background: transparent; }
  :deep(em) { color: var(--gold-soft); }
}

.story-waiting, .story-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
}

.story-waiting i { color: var(--gold); }

.stream-status {
  min-height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-top: 1px solid var(--line-subtle);
  color: var(--jade);
  background: color-mix(in srgb, var(--surface-inset) 82%, transparent);
  font-size: 11px;
}

@media screen and (max-width: 760px) {
  .story-layout.with-portrait {
    grid-template-areas: 'portrait' 'copy';
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .story-scroll { padding: 22px 18px 36px; }
  .resume-stream-follow { right: 10px; bottom: 10px; }
  .turn-prompt-trigger { padding-inline: 10px; gap: 6px; }
  .reasoning-trigger { padding-inline: 10px; }
  .reasoning-label { display: none; }
  .context-popover { top: 42px; left: 8px; right: 8px; max-height: min(56vh, 420px); }
  .context-popover-copy { padding: 14px; font-size: 12px; }
}
</style>
