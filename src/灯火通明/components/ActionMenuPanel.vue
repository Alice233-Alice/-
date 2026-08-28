<template>
  <div class="action-menu-panel">
    <section v-if="store.当前处境" class="situation-section">
      <div class="section-title">
        <div class="title-left">
          <i class="fa-solid fa-compass"></i>
          <span>当前处境</span>
        </div>
        <span v-if="situationBadgeText" class="section-badge" :class="`mode-${situationRefreshState}`">
          {{ situationBadgeText }}
        </span>
      </div>
      <p class="situation-content">{{ store.当前处境 }}</p>
    </section>

    <section class="actions-section">
      <div class="section-title action-heading">
        <div class="title-left">
          <i class="fa-solid fa-list-check"></i>
          <span>可选行动</span>
        </div>

        <div class="title-right">
          <span
            class="controller-dot"
            :class="{ connected: pseudo.controllerReady }"
            :title="pseudo.controllerConnectionDescription"
          >
            <i class="fa-solid fa-circle"></i>
            伪同层
          </span>

          <button
            type="button"
            class="toggle-btn"
            :class="{ active: store.启用行动提示 }"
            :title="store.启用行动提示 ? '关闭动态行动生成' : '开启动态行动生成'"
            @click="store.toggleActionPrompt"
          >
            <i class="fa-solid" :class="store.启用行动提示 ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
            <span>{{ store.启用行动提示 ? '已开启' : '已关闭' }}</span>
          </button>

          <button
            v-if="store.启用行动提示"
            type="button"
            class="refresh-btn"
            title="重新解析本轮行动"
            :disabled="isRefreshing"
            @click="refreshActions"
          >
            <i class="fa-solid fa-rotate-right" :class="{ 'fa-spin': isRefreshing }"></i>
          </button>
        </div>
      </div>

      <div class="action-toolbar">
        <span v-if="store.启用行动提示" class="action-count">{{ actionSummaryLabel }}</span>
        <span v-else class="action-count muted">动态选项已停用，快捷行动仍可使用</span>

        <div class="toolbar-controls">
          <button
            type="button"
            class="inline-display-toggle"
            :class="{ active: inlineActionsEnabled }"
            role="switch"
            :aria-checked="inlineActionsEnabled"
            :title="inlineActionsEnabled ? '不再把选项附在最新正文末尾' : '把选项附在最新正文末尾'"
            @click="toggleInlineActions"
          >
            <i class="fa-solid fa-book-open"></i>
            <span>正文末尾</span>
            <span class="mini-switch" aria-hidden="true"><i></i></span>
          </button>

          <div class="submit-mode" role="group" aria-label="行动提交模式">
            <button
              type="button"
              :class="{ active: submitMode === 'confirm' }"
              :disabled="pseudo.isGenerating"
              title="先填入草稿，确认后再推演"
              @click="setSubmitMode('confirm')"
            >
              <i class="fa-solid fa-pen-to-square"></i>
              确认
            </button>
            <button
              type="button"
              :class="{ active: submitMode === 'direct' }"
              :disabled="pseudo.isGenerating"
              title="点击行动后立即推演"
              @click="setSubmitMode('direct')"
            >
              <i class="fa-solid fa-paper-plane"></i>
              直发
            </button>
          </div>
        </div>
      </div>

      <template v-if="store.启用行动提示">
        <div v-if="actionFeedMode === 'partial'" class="status-banner warn">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>本轮只刷新了部分选项</strong>
            <span>已隐藏 {{ hiddenInheritedActionCount }} 项上一轮残留内容。</span>
          </div>
        </div>

        <div v-else-if="actionFeedMode === 'none'" class="status-banner info">
          <i class="fa-solid fa-sparkles"></i>
          <div>
            <strong>本轮没有新的行动更新</strong>
            <span>旧选项不会沿用，可使用下方快捷行动继续。</span>
          </div>
        </div>

        <div v-else-if="actionFeedMode === 'cleared'" class="status-banner info">
          <i class="fa-solid fa-broom"></i>
          <div>
            <strong>本轮行动已清空</strong>
            <span>当前没有可信的新方向，可继续、随机或自行输入。</span>
          </div>
        </div>

        <div v-if="freshActions.length > 0" class="action-list">
          <button
            v-for="(action, index) in freshActions"
            :key="getActionKey(action, index)"
            type="button"
            class="action-row"
            :class="`type-${action.类型}`"
            :disabled="pseudo.isGenerating"
            @click="selectAction(action)"
          >
            <span class="action-icon" aria-hidden="true">
              <i :class="getActionIcon(action.类型)"></i>
            </span>
            <span class="action-copy">
              <span class="action-text">{{ action.行动 }}</span>
              <span v-if="action.提示" class="action-hint">
                <i class="fa-solid fa-circle-info"></i>
                {{ action.提示 }}
              </span>
            </span>
            <span class="action-type">{{ action.类型 }}</span>
            <i
              class="action-affordance fa-solid"
              :class="submitMode === 'direct' ? 'fa-paper-plane' : 'fa-chevron-right'"
            ></i>
          </button>
        </div>

        <div v-else class="no-actions">
          <i class="fa-solid fa-hourglass-half"></i>
          <p>这一轮暂无可信的新行动</p>
        </div>
      </template>

      <div class="quick-actions">
        <span class="quick-label">快捷行动</span>
        <div class="quick-list">
          <button
            v-for="action in quickActions"
            :key="action.id"
            type="button"
            class="quick-action"
            :disabled="pseudo.isGenerating"
            @click="selectQuickAction(action)"
          >
            <i :class="action.icon"></i>
            <span>{{ action.label }}</span>
          </button>
          <button type="button" class="quick-action custom" :disabled="pseudo.isGenerating" @click="selectCustomAction">
            <i class="fa-solid fa-pen-nib"></i>
            <span>自定</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  containsInitVar,
  extractJsonPatch,
  getActionIcon,
  getActionKey,
  resolveActionFeed,
  type ActionFeedMode,
  type JsonPatchOperation,
  type OpportunityAction,
} from '../action-feed';
import { useActionPreferences } from '../action-preferences';
import { useDataStore, usePseudoLayerStore } from '../store';

type SituationRefreshState = 'fresh' | 'stale';

type QuickAction = {
  id: 'continue' | 'random';
  label: string;
  prompt: string;
  icon: string;
};

const store = useDataStore();
const pseudo = usePseudoLayerStore();
const { submitMode, inlineActionsEnabled, setSubmitMode, toggleInlineActions } = useActionPreferences();
const isRefreshing = ref(false);
const actionSourceMessageId = computed(() => Number(store.viewedMessageId));
const currentMessagePatchId = ref<number | null>(null);
const currentMessageContent = ref('');
const currentMessagePatch = ref<JsonPatchOperation[]>([]);
const patchListeners: Array<(() => void) | undefined> = [];
let patchPollTimer: number | null = null;

const quickActions: QuickAction[] = [
  {
    id: 'continue',
    label: '继续',
    prompt: '继续当前剧情。',
    icon: 'fa-solid fa-forward-step',
  },
  {
    id: 'random',
    label: '随机',
    prompt: '根据当前处境随机采取一个合理行动。',
    icon: 'fa-solid fa-dice',
  },
];

const syncCurrentMessagePatch = () => {
  try {
    const messageId = actionSourceMessageId.value;
    if (!Number.isFinite(messageId) || messageId < 0) {
      currentMessagePatchId.value = null;
      currentMessageContent.value = '';
      currentMessagePatch.value = [];
      return;
    }
    const messages = getChatMessages(messageId);
    const content = String(messages?.[0]?.message ?? '');
    if (messageId === currentMessagePatchId.value && content === currentMessageContent.value) return;
    currentMessagePatchId.value = messageId;
    currentMessageContent.value = content;
    currentMessagePatch.value = extractJsonPatch(content);
  } catch (error) {
    console.warn('[行动提示] 读取当前浏览楼层消息失败', error);
  }
};

const refreshActions = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;

  try {
    if (store.forceRefresh) {
      await store.forceRefresh();
    } else {
      store.refresh();
    }
  } catch (error) {
    console.error('[行动提示] 刷新行动列表失败', error);
    toastr.error('刷新失败', '行动提示');
  } finally {
    window.setTimeout(syncCurrentMessagePatch, 240);
    window.setTimeout(() => {
      isRefreshing.value = false;
    }, 500);
  }
};

onMounted(() => {
  syncCurrentMessagePatch();

  patchListeners.push(
    eventOn(tavern_events.MESSAGE_UPDATED, id => {
      if (Number(id) === actionSourceMessageId.value) syncCurrentMessagePatch();
    }).stop,
  );
  patchListeners.push(
    eventOn(tavern_events.MESSAGE_RECEIVED, id => {
      if (Number(id) === actionSourceMessageId.value) syncCurrentMessagePatch();
    }).stop,
  );
  patchListeners.push(
    eventOn(tavern_events.MESSAGE_DELETED, id => {
      if (Number(id) === currentMessagePatchId.value) {
        currentMessagePatchId.value = null;
        currentMessageContent.value = '';
        currentMessagePatch.value = [];
        window.setTimeout(syncCurrentMessagePatch, 160);
      }
    }).stop,
  );

  patchPollTimer = window.setInterval(syncCurrentMessagePatch, 1500);
  window.setTimeout(refreshActions, 500);
});

onBeforeUnmount(() => {
  patchListeners.forEach(dispose => {
    try {
      dispose?.();
    } catch {
      // ignore cleanup errors
    }
  });

  if (patchPollTimer !== null) window.clearInterval(patchPollTimer);
});

watch(
  actionSourceMessageId,
  () => {
    currentMessagePatchId.value = null;
    currentMessageContent.value = '';
    currentMessagePatch.value = [];
    syncCurrentMessagePatch();
  },
  { flush: 'post' },
);

const hasSituationRefresh = computed(() =>
  currentMessagePatch.value.some(operation => operation.op === 'replace' && operation.path === '/当前处境'),
);

const situationRefreshState = computed<SituationRefreshState>(() => (hasSituationRefresh.value ? 'fresh' : 'stale'));
const situationBadgeText = computed(() => {
  if (!store.当前处境) return '';
  return hasSituationRefresh.value ? '本轮更新' : '沿用参考';
});

const freshActionState = computed<{ mode: ActionFeedMode; actions: OpportunityAction[] }>(() => {
  return resolveActionFeed({
    operations: currentMessagePatch.value,
    storedActions: store.可参与机遇 as unknown[],
    tasks: store.任务列表,
    situation: store.当前处境,
    useStoredActionsWithoutPatch: containsInitVar(currentMessageContent.value),
  });
});

const actionFeedMode = computed(() => freshActionState.value.mode);
const freshActions = computed(() => freshActionState.value.actions);
const hiddenInheritedActionCount = computed(() => {
  if (actionFeedMode.value !== 'partial') return 0;
  return Math.max(store.可参与机遇.length - freshActions.value.length, 0);
});
const actionSummaryLabel = computed(() => {
  switch (actionFeedMode.value) {
    case 'full':
      return `${freshActions.value.length} 项本轮行动`;
    case 'partial':
      return `${freshActions.value.length} 项已刷新`;
    case 'cleared':
      return '本轮行动已清空';
    case 'fallback':
      return `${freshActions.value.length} 项默认行动`;
    default:
      return '等待本轮行动';
  }
});

const prepareAction = (title: string, prompt: string, allowDirect = true) => {
  if (pseudo.isGenerating) return;
  if (!pseudo.isStoryHistoryLatest) {
    toastr.warning('请先返回最新正文再选择行动', '行动提示');
    return;
  }

  pseudo.selectDraft(title, prompt);
  if (!allowDirect || submitMode.value !== 'direct') return;

  if (!pseudo.controllerReady) {
    toastr.warning('伪同层控制器尚未连接，行动已保留为草稿', '行动提示');
    return;
  }
  if (!pseudo.canSubmitStory) {
    toastr.warning('当前无法直接推演，行动已保留为草稿', '行动提示');
    return;
  }

  pseudo.submit('story');
};

const selectAction = (action: OpportunityAction) => {
  prepareAction(action.类型, action.行动);
  console.info('[行动提示] 选择行动:', action.行动, '提交模式:', submitMode.value);
};

const selectQuickAction = (action: QuickAction) => {
  prepareAction(action.label, action.prompt);
};

const selectCustomAction = () => {
  prepareAction('自定', '', false);
};
</script>

<style lang="scss" scoped>
.action-menu-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(12px, 2vw, 20px);
  color: var(--text-primary);
}

.situation-section,
.actions-section {
  border: 1px solid var(--line-subtle);
  border-radius: 12px;
  background: color-mix(in srgb, var(--reading-surface) 88%, transparent);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--stage-shadow) 25%, transparent);
}

.situation-section {
  padding: 14px 16px;
}

.actions-section {
  padding: 14px;
}

.section-title,
.title-left,
.title-right,
.action-toolbar,
.toolbar-controls,
.controller-dot,
.toggle-btn,
.inline-display-toggle,
.mini-switch,
.submit-mode,
.quick-list {
  display: flex;
  align-items: center;
}

.section-title {
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 650;
}

.title-left {
  gap: 8px;
  color: var(--text-primary);

  i {
    color: var(--gold);
  }
}

.title-right {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.section-badge,
.action-count {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.section-badge {
  padding: 3px 8px;
  border: 1px solid var(--line-subtle);
  border-radius: 999px;

  &.mode-fresh {
    color: var(--semantic-info);
    border-color: color-mix(in srgb, var(--semantic-info) 35%, transparent);
    background: color-mix(in srgb, var(--semantic-info) 10%, transparent);
  }
}

.situation-content {
  margin: 11px 0 0;
  padding: 10px 12px;
  border-left: 2px solid color-mix(in srgb, var(--gold) 58%, transparent);
  border-radius: 0 8px 8px 0;
  background: color-mix(in srgb, var(--bg-primary) 74%, transparent);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.65;
}

button {
  font: inherit;
}

.controller-dot {
  gap: 5px;
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;

  i {
    color: var(--semantic-danger);
    font-size: 6px;
  }

  &.connected i {
    color: var(--jade);
    filter: drop-shadow(0 0 4px color-mix(in srgb, var(--jade) 60%, transparent));
  }
}

.toggle-btn,
.refresh-btn,
.inline-display-toggle,
.submit-mode button,
.quick-action {
  border: 1px solid var(--line-subtle);
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-primary) 72%, transparent);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &:hover:not(:disabled) {
    color: var(--text-primary);
    border-color: color-mix(in srgb, var(--gold) 45%, var(--line-subtle));
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
  }
}

.toggle-btn {
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 11px;

  &.active {
    color: var(--jade);
    border-color: color-mix(in srgb, var(--jade) 36%, transparent);
    background: color-mix(in srgb, var(--jade) 10%, transparent);
  }
}

.refresh-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 7px;
}

.action-toolbar {
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line-subtle);
}

.toolbar-controls {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.inline-display-toggle {
  gap: 7px;
  min-height: 30px;
  padding: 5px 8px 5px 9px;
  border-radius: 8px;
  font-size: 11px;

  > i {
    color: var(--text-secondary);
    transition: color 0.18s ease;
  }

  &.active {
    color: var(--jade);
    border-color: color-mix(in srgb, var(--jade) 34%, transparent);
    background: color-mix(in srgb, var(--jade) 9%, transparent);

    > i {
      color: var(--jade);
    }
  }
}

.mini-switch {
  position: relative;
  width: 24px;
  height: 14px;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--text-secondary) 40%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-primary) 82%, transparent);

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }

  .inline-display-toggle.active & {
    border-color: color-mix(in srgb, var(--jade) 56%, transparent);
    background: color-mix(in srgb, var(--jade) 16%, transparent);

    i {
      transform: translateX(10px);
      background: var(--jade);
      box-shadow: 0 0 5px color-mix(in srgb, var(--jade) 60%, transparent);
    }
  }
}

.action-count.muted {
  color: color-mix(in srgb, var(--text-secondary) 70%, transparent);
}

.submit-mode {
  padding: 2px;
  border: 1px solid var(--line-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-primary) 72%, transparent);

  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    font-size: 11px;

    &.active {
      color: var(--gold);
      background: color-mix(in srgb, var(--gold) 13%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 22%, transparent);
    }
  }
}

.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 9px 11px;
  border: 1px solid var(--line-subtle);
  border-radius: 9px;
  font-size: 11px;

  > i {
    margin-top: 2px;
  }

  div {
    display: grid;
    gap: 2px;
  }

  strong {
    color: var(--text-primary);
  }

  span {
    color: var(--text-secondary);
  }

  &.warn {
    border-color: color-mix(in srgb, var(--semantic-warning) 35%, transparent);
    background: color-mix(in srgb, var(--semantic-warning) 8%, transparent);

    > i {
      color: var(--semantic-warning);
    }
  }

  &.info {
    border-color: color-mix(in srgb, var(--semantic-info) 30%, transparent);
    background: color-mix(in srgb, var(--semantic-info) 7%, transparent);

    > i {
      color: var(--semantic-info);
    }
  }
}

.action-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.action-row {
  --action-color: var(--gold);

  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto 14px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--action-color) 22%, var(--line-subtle));
  border-radius: 10px;
  color: var(--text-primary);
  text-align: left;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--action-color) 8%, transparent), transparent 34%),
    color-mix(in srgb, var(--bg-primary) 78%, transparent);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--action-color) 52%, var(--line-subtle));
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--action-color) 13%, transparent), transparent 42%),
      color-mix(in srgb, var(--bg-primary) 86%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--action-color) 60%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  &.type-探索 {
    --action-color: #62c6a7;
  }

  &.type-交涉 {
    --action-color: #74aee8;
  }

  &.type-战斗 {
    --action-color: #db786e;
  }

  &.type-修炼 {
    --action-color: #8dcfd1;
  }

  &.type-整备 {
    --action-color: #d8a85b;
  }

  &.type-亲密 {
    --action-color: #d782a6;
  }
}

.action-icon {
  display: grid;
  width: 34px;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 9px;
  color: color-mix(in srgb, var(--action-color) 92%, white);
  background: color-mix(in srgb, var(--action-color) 17%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--action-color) 22%, transparent);
}

.action-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.action-text {
  overflow-wrap: anywhere;
  font-size: 13px;
  font-weight: 620;
  line-height: 1.45;
}

.action-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;

  i {
    color: var(--action-color);
    font-size: 9px;
  }
}

.action-type {
  padding: 3px 7px;
  border-radius: 999px;
  color: var(--action-color);
  background: color-mix(in srgb, var(--action-color) 11%, transparent);
  font-size: 10px;
  white-space: nowrap;
}

.action-affordance {
  color: color-mix(in srgb, var(--action-color) 72%, var(--text-secondary));
  font-size: 10px;
}

.no-actions {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 18px 12px;
  border: 1px dashed var(--line-subtle);
  border-radius: 10px;
  color: var(--text-secondary);

  i {
    color: var(--gold);
  }

  p {
    margin: 0;
    font-size: 12px;
  }
}

.quick-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line-subtle);
}

.quick-label {
  color: var(--text-secondary);
  font-size: 11px;
  white-space: nowrap;
}

.quick-list {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.quick-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;

  i {
    color: var(--gold);
  }

  &.custom i {
    color: var(--jade);
  }
}

@media (max-width: 760px) {
  .action-menu-panel {
    gap: 10px;
    padding: 10px;
  }

  .situation-section,
  .actions-section {
    padding: 11px;
    border-radius: 10px;
  }

  .action-heading,
  .action-toolbar,
  .quick-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .title-right,
  .toolbar-controls,
  .quick-list {
    width: 100%;
    justify-content: flex-start;
  }

  .action-toolbar {
    gap: 8px;
  }

  .action-row {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 8px;
    padding: 9px;
  }

  .action-type {
    grid-column: 2;
    justify-self: start;
  }

  .action-affordance {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

  .quick-action {
    flex: 1 1 84px;
    justify-content: center;
  }
}
</style>
