<template>
  <section class="story-reader" :class="{ streaming: isStoryGenerating }">
    <div v-if="userPrompt || reasoningText || variableDiagnostics" class="turn-context-bar">
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

      <button
        v-if="variableDiagnostics"
        type="button"
        class="variable-trigger"
        :class="{ 'has-error': variableDiagnostics.parseError }"
        :aria-expanded="contextPanel === 'variable'"
        title="查看本回变量更新诊断"
        @click="toggleContext('variable')"
      >
        <i class="fa-solid fa-code-branch"></i>
        <span class="variable-label">天道推演</span>
        <span class="variable-count">{{ variableStatusLabel }}</span>
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
    <section
      v-if="contextPanel"
      class="context-popover"
      :class="{ 'variable-popover': contextPanel === 'variable' }"
      role="dialog"
      :aria-label="contextTitle"
    >
      <header class="context-popover-header">
        <span>
          <i :class="contextIcon"></i>
          {{ contextTitle }}
        </span>
        <span v-if="contextPanel === 'reasoning' && reasoningTime" class="context-popover-time">
          {{ reasoningTime }}
        </span>
        <button type="button" title="关闭" aria-label="关闭" @click="contextPanel = null">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </header>
      <div v-if="contextPanel === 'variable' && variableDiagnostics" class="variable-diagnostics">
        <section v-if="analysisSegments.length" class="variable-analysis">
          <h3>推演摘要</h3>
          <div class="analysis-segments">
            <span v-for="(segment, index) in analysisSegments" :key="`${index}-${segment}`">
              {{ segment }}
            </span>
          </div>
        </section>

        <div class="variable-overview">
          <span>
            <i class="fa-solid fa-list-check"></i>
            变量更新清单
          </span>
          <strong>{{ variableDiagnostics.operations.length }} 项</strong>
          <span v-if="!variableDiagnostics.isComplete" class="diagnostic-state receiving">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            接收中
          </span>
          <span v-else-if="variableDiagnostics.parseError" class="diagnostic-state invalid">
            <i class="fa-solid fa-triangle-exclamation"></i>
            结构异常
          </span>
          <span v-else class="diagnostic-state valid">
            <i class="fa-solid fa-circle-check"></i>
            结构正常
          </span>
        </div>

        <ol v-if="variableDiagnostics.operations.length" class="variable-operation-list">
          <li
            v-for="(operation, index) in variableDiagnostics.operations"
            :key="`${index}-${operation.op}-${operation.path}`"
            class="variable-operation"
          >
            <div class="operation-heading">
              <span class="operation-index">{{ index + 1 }}</span>
              <span class="operation-kind" :class="`op-${normalizeOperation(operation.op)}`">
                {{ operationLabel(operation.op) }}
              </span>
              <code>{{ formatPatchPath(operation.path) }}</code>
            </div>
            <pre v-if="hasOperationValue(operation)">{{ formatPatchValue(operation.value) }}</pre>
            <p v-else-if="operation.from" class="operation-from">
              来源：{{ formatPatchPath(operation.from) }}
            </p>
            <p v-else class="operation-empty">该路径不携带新值</p>
          </li>
        </ol>

        <div v-else-if="variableDiagnostics.isComplete && !variableDiagnostics.parseError" class="variable-empty">
          本回未提交变量变更。
        </div>

        <div v-if="variableDiagnostics.parseError" class="diagnostic-error" role="alert">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>{{ variableDiagnostics.parseError }}</span>
        </div>

        <details v-if="variableDiagnostics.rawPatch" class="raw-patch">
          <summary>原始 JSONPatch</summary>
          <pre>{{ variableDiagnostics.rawPatch }}</pre>
        </details>
      </div>
      <template v-else>
        <!-- 酒馆格式化接口已完成与原生楼层相同的 HTML 处理。 -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="context-popover-copy" v-html="contextHtml"></div>
      </template>
    </section>

    <div class="story-layout" :class="{ 'with-portrait': showPortrait }">
      <ScenePortraitRail v-if="showPortrait" class="story-portrait" />

      <div class="story-scroll-shell">
        <div
          ref="scrollRef"
          class="story-scroll"
          @scroll="handleStreamScroll"
          @wheel.passive="handleStreamWheel"
          @touchstart.passive="handleStoryTouchStart"
          @touchmove.passive="handleStreamTouchMove"
          @touchend.passive="handleStreamTouchEnd"
          @touchcancel.passive="handleStreamTouchEnd"
          @pointerdown.passive="handleStoryPointerDown"
          @pointerup.passive="handleStreamPointerUp"
          @pointercancel.passive="handleStreamPointerUp"
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
import type { VariablePatchOperation } from '../message-content';
import {
  extractNarrative,
  extractVariableUpdateDiagnostics,
  formatMessageHtml,
  stripStructuredBlocks,
} from '../message-content';
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
  isUserInteracting: isInteractingWithStory,
  handleScroll: handleStreamScroll,
  handleWheel: handleStreamWheel,
  handleTouchStart: handleStreamTouchStart,
  handleTouchMove: handleStreamTouchMove,
  handleTouchEnd: handleStreamTouchEnd,
  handlePointerDown: handleStreamPointerDown,
  handlePointerUp: handleStreamPointerUp,
  queueFollow: queueStreamFollow,
  resumeFollowing: resumeStreamFollow,
} = useStreamFollow(scrollRef);
type ContextPanel = 'prompt' | 'reasoning' | 'variable';

const contextPanel = ref<ContextPanel | null>(null);
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

const displayedStreamText = ref('');
let pendingStreamText = '';
let streamRenderTimer: number | undefined;
let lastStreamRenderAt = 0;

const streamRenderInterval = (length: number) => {
  if (length >= 8000) return 360;
  if (length >= 2000) return 260;
  return 180;
};

const cancelStreamRender = () => {
  if (streamRenderTimer === undefined) return;
  window.clearTimeout(streamRenderTimer);
  streamRenderTimer = undefined;
};

const commitPendingStream = () => {
  streamRenderTimer = undefined;
  if (!isStoryGenerating.value || isInteractingWithStory.value) return;
  if (displayedStreamText.value === pendingStreamText) return;
  displayedStreamText.value = pendingStreamText;
  lastStreamRenderAt = performance.now();
  queueStreamFollow();
};

const scheduleStreamRender = (immediate = false) => {
  if (!isStoryGenerating.value || isInteractingWithStory.value) return;
  if (displayedStreamText.value === pendingStreamText) return;
  if (immediate) {
    cancelStreamRender();
    commitPendingStream();
    return;
  }
  if (streamRenderTimer !== undefined) return;
  const interval = streamRenderInterval(pendingStreamText.length);
  const elapsed = performance.now() - lastStreamRenderAt;
  streamRenderTimer = window.setTimeout(commitPendingStream, Math.max(0, interval - elapsed));
};

const handleStoryTouchStart = (event: TouchEvent) => {
  cancelStreamRender();
  handleStreamTouchStart(event);
};

const handleStoryPointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') cancelStreamRender();
  handleStreamPointerDown(event);
};

const currentRawMessage = computed(() =>
  isStoryGenerating.value && displayedStreamText.value
    ? displayedStreamText.value
    : pseudo.storyFloorMessage,
);
const storyHtml = computed(() => formatText(extractNarrative(currentRawMessage.value)));
const variableDiagnostics = computed(() => extractVariableUpdateDiagnostics(currentRawMessage.value));
const analysisSegments = computed(() =>
  (variableDiagnostics.value?.analysis ?? '')
    .split(/\s*\|\s*/)
    .map(segment => segment.trim())
    .filter(Boolean),
);
const variableStatusLabel = computed(() => {
  const diagnostics = variableDiagnostics.value;
  if (!diagnostics) return '';
  if (!diagnostics.isComplete) return '接收中';
  if (diagnostics.parseError) return '需检错';
  return `${diagnostics.operations.length} 项`;
});
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
const contextTitle = computed(() => {
  if (contextPanel.value === 'prompt') return '本回起念';
  if (contextPanel.value === 'variable') return '天道推演';
  return '推演思绪';
});
const contextIcon = computed(() => {
  if (contextPanel.value === 'prompt') return 'fa-solid fa-feather-pointed';
  if (contextPanel.value === 'variable') return 'fa-solid fa-code-branch';
  return 'fa-solid fa-brain';
});
const contextHtml = computed(() => (contextPanel.value === 'prompt' ? userPromptHtml.value : reasoningHtml.value));

const toggleContext = (panel: ContextPanel) => {
  contextPanel.value = contextPanel.value === panel ? null : panel;
};

const operationLabels: Record<string, string> = {
  add: '新增',
  insert: '新增',
  replace: '覆盖',
  delta: '增减',
  remove: '移除',
  move: '移动',
  copy: '复制',
  test: '校验',
};
const normalizeOperation = (operation: string) =>
  operation.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'unknown';
const operationLabel = (operation: string) =>
  operationLabels[normalizeOperation(operation)] ?? (operation.trim() || '未知');
const decodePointerSegment = (segment: string) => segment.replace(/~1/g, '/').replace(/~0/g, '~');
const formatPatchPath = (path: string) => {
  const segments = String(path ?? '')
    .replaceAll('／', '/')
    .split('/')
    .filter(Boolean)
    .map(decodePointerSegment);
  return segments.length ? segments.join(' › ') : '根节点';
};
const hasOperationValue = (operation: VariablePatchOperation) =>
  Object.prototype.hasOwnProperty.call(operation, 'value');
const formatPatchValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? String(value);
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
  text => {
    pendingStreamText = text;
    if (isStoryGenerating.value) scheduleStreamRender(!displayedStreamText.value);
  },
);

watch(isInteractingWithStory, interacting => {
  if (interacting) {
    cancelStreamRender();
    return;
  }
  scheduleStreamRender(true);
});

watch(
  () => pseudo.generationState,
  (next, previous) => {
    if (previous === 'idle' && next !== 'idle') {
      pendingStreamText = '';
      displayedStreamText.value = '';
      lastStreamRenderAt = 0;
      resumeStreamFollow(false);
    }
    if (next === 'idle') {
      cancelStreamRender();
      pendingStreamText = '';
      displayedStreamText.value = '';
    }
  },
);

watch(
  () => pseudo.view.selectedMessageId,
  () => {
    contextPanel.value = null;
  },
);

onMounted(() => window.addEventListener('keydown', closeContextOnEscape));
onBeforeUnmount(() => {
  cancelStreamRender();
  window.removeEventListener('keydown', closeContextOnEscape);
});

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
.reasoning-trigger,
.variable-trigger {
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

.reasoning-trigger,
.variable-trigger {
  flex: none;
  padding: 7px 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-left: 1px solid var(--line-subtle);
}

.reasoning-trigger > i:first-child { color: var(--jade); }
.variable-trigger > i:first-child { color: var(--gold); }
.variable-count { color: var(--gold-soft); font-size: 10px; white-space: nowrap; }
.variable-trigger.has-error > i:first-child,
.variable-trigger.has-error .variable-count { color: var(--semantic-danger); }
.turn-prompt-trigger:hover,
.reasoning-trigger:hover,
.variable-trigger:hover,
.turn-prompt-trigger[aria-expanded='true'],
.reasoning-trigger[aria-expanded='true'],
.variable-trigger[aria-expanded='true'] {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--button-hover) 74%, transparent);
}

.context-chevron {
  color: var(--text-secondary) !important;
  font-size: 9px;
  transition: transform 0.18s ease;
}
.reasoning-trigger[aria-expanded='true'] .context-chevron,
.variable-trigger[aria-expanded='true'] .context-chevron { transform: rotate(180deg); }

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
  overscroll-behavior-y: contain;
  touch-action: pan-y pinch-zoom;
  -webkit-overflow-scrolling: touch;
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

.variable-popover { max-height: min(64vh, 520px); }
.variable-diagnostics {
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}

.variable-analysis {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--line-subtle);
  border-left: 2px solid var(--gold);
  background: color-mix(in srgb, var(--surface-inset) 72%, transparent);
}
.variable-analysis h3 {
  margin: 0 0 9px;
  color: var(--gold-soft);
  font-size: 11px;
  font-weight: 600;
}
.analysis-segments { display: flex; flex-wrap: wrap; gap: 6px; }
.analysis-segments span {
  padding: 4px 8px;
  border: 1px solid var(--line-subtle);
  border-radius: 999px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-raised) 70%, transparent);
  font-size: 11px;
  line-height: 1.45;
}

.variable-overview {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 11px;
}
.variable-overview > span:first-child { display: inline-flex; align-items: center; gap: 6px; color: var(--text-accent); }
.variable-overview > span:first-child i { color: var(--jade); }
.variable-overview strong { color: var(--gold-soft); font-weight: 600; }
.diagnostic-state {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.diagnostic-state.valid { color: var(--semantic-success); }
.diagnostic-state.receiving { color: var(--jade); }
.diagnostic-state.invalid { color: var(--semantic-danger); }

.variable-operation-list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 7px;
  list-style: none;
}
.variable-operation {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--line-subtle);
  background: color-mix(in srgb, var(--surface-inset) 58%, transparent);
}
.operation-heading { min-width: 0; display: flex; align-items: center; gap: 8px; }
.operation-index {
  width: 20px;
  height: 20px;
  flex: none;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--line-subtle);
  border-radius: 50%;
  color: var(--text-secondary);
  font-size: 9px;
}
.operation-kind {
  min-width: 34px;
  flex: none;
  color: var(--gold-soft);
  font-size: 10px;
  text-align: center;
}
.operation-kind.op-delta { color: var(--jade); }
.operation-kind.op-remove { color: var(--semantic-danger); }
.operation-kind.op-insert,
.operation-kind.op-add { color: var(--semantic-success); }
.operation-heading code {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-family: 'Microsoft YaHei UI', system-ui, sans-serif;
  font-size: 11px;
}
.variable-operation pre,
.raw-patch pre {
  margin: 8px 0 0 28px;
  padding: 8px 10px;
  overflow-x: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  border-left: 1px solid var(--line-strong);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-raised) 72%, transparent);
  font: 11px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
}
.operation-from,
.operation-empty { margin: 7px 0 0 28px; color: var(--text-secondary); font-size: 10px; }
.variable-empty { padding: 22px; color: var(--text-secondary); text-align: center; font-size: 11px; }
.diagnostic-error {
  margin-top: 10px;
  padding: 9px 11px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--semantic-danger) 55%, var(--line-subtle));
  color: var(--semantic-danger);
  background: color-mix(in srgb, var(--semantic-danger) 8%, transparent);
  font-size: 11px;
}
.raw-patch { margin-top: 10px; border-top: 1px solid var(--line-subtle); }
.raw-patch summary {
  padding: 10px 2px 0;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 10px;
}
.raw-patch pre { margin-left: 0; max-height: 220px; }

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
  .variable-trigger { padding-inline: 9px; }
  .reasoning-label,
  .variable-label { display: none; }
  .context-popover { top: 42px; left: 8px; right: 8px; max-height: min(56vh, 420px); }
  .context-popover-copy { padding: 14px; font-size: 12px; }
  .variable-popover { max-height: min(66vh, 520px); }
  .variable-diagnostics { padding: 10px; }
  .analysis-segments { gap: 5px; }
  .analysis-segments span { padding: 3px 6px; font-size: 10px; }
  .operation-heading { align-items: flex-start; }
  .variable-operation pre,
  .operation-from,
  .operation-empty { margin-left: 0; }
}
</style>
