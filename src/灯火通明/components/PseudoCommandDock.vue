<template>
  <section class="command-dock" :class="{ expanded: isExpanded, historical: !isWorkspaceLatest }">
    <div v-if="isWorkspaceLatest" class="command-shell">
      <div v-if="isDialogueWorkspace && pseudo.activeDialogue" class="selected-intent dialogue-intent">
        <i
          class="fa-solid"
          :class="pseudo.activeDialogue.channel === 'transmission' ? 'fa-feather-pointed' : 'fa-comment-dots'"
        ></i>
        <strong>
          {{ pseudo.activeDialogue.channel === 'transmission' ? '传讯' : '当面交谈' }} ·
          {{ pseudo.activeDialogue.targetName }}
        </strong>
        <button type="button" title="更换交谈对象" :disabled="pseudo.isGenerating" @click="showTargetPicker = true">
          <i class="fa-solid fa-user-group"></i>
        </button>
        <button type="button" title="结束交谈" :disabled="pseudo.isGenerating" @click="pseudo.endDialogue">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div v-else-if="isDialogueWorkspace && pseudo.dialogueContext" class="selected-intent dialogue-intent paused">
        <i class="fa-solid fa-clock-rotate-left"></i>
        <strong>最近交谈 · {{ pseudo.dialogueContext.targetName }}</strong>
        <button type="button" title="继续这段交谈" :disabled="pseudo.isGenerating" @click="pseudo.continueDialogue">
          <i class="fa-solid fa-comment-dots"></i>
        </button>
        <button type="button" title="保留旧记录，另开一段交谈" :disabled="pseudo.isGenerating" @click="pseudo.resetDialogue">
          <i class="fa-solid fa-comment-medical"></i>
        </button>
      </div>
      <div v-else-if="!isDialogueWorkspace && pseudo.selectedTitle" class="selected-intent">
        <i class="fa-solid fa-compass"></i>
        <strong>{{ pseudo.selectedTitle }}</strong>
        <button type="button" title="清除所选行动" :disabled="pseudo.isGenerating" @click="pseudo.clearDraft">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="command-row">
        <div class="interaction-segments" role="group" aria-label="交互模式">
          <button
            type="button"
            :class="{ active: !isDialogueWorkspace }"
            :disabled="pseudo.isGenerating"
            title="普通剧情推演"
            @click="chooseStory"
          >
            <i class="fa-solid fa-feather"></i><span>推演</span>
          </button>
          <button
            type="button"
            :class="{ active: isDialogueWorkspace }"
            :disabled="pseudo.isGenerating"
            title="与角色直接交谈"
            @click="chooseDialogue"
          >
            <i class="fa-solid fa-comments"></i><span>交谈</span>
          </button>
        </div>
        <span class="connection-dot" :class="pseudo.controllerReady ? 'connected' : 'disconnected'" :title="connectionLabel">
          <i class="fa-solid" :class="pseudo.controllerReady ? 'fa-link' : 'fa-link-slash'"></i>
        </span>
        <textarea
          ref="textareaRef"
          v-model="pseudo.draftPrompt"
          rows="1"
          :disabled="pseudo.isGenerating || (isDialogueWorkspace && !pseudo.isDialogueActive)"
          :placeholder="inputPlaceholder"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @keydown.ctrl.enter.prevent="submitCurrent"
        ></textarea>
        <span v-if="pseudo.isGenerating" class="generation-label">
          <i class="fa-solid fa-circle-notch fa-spin"></i>{{ generationLabel }}
        </span>
        <button
          type="button"
          class="native-input-command"
          :title="pseudo.view.nativeInputCollapsed ? '显示酒馆输入区' : '收起酒馆输入区'"
          @click="pseudo.toggleNativeInput"
        >
          <i class="fa-solid" :class="pseudo.view.nativeInputCollapsed ? 'fa-eye' : 'fa-eye-slash'"></i>
        </button>
        <button v-if="pseudo.isGenerating" type="button" class="primary-command stop" title="停止生成" @click="pseudo.stop">
          <i class="fa-solid fa-stop"></i><span>停止</span>
        </button>
        <button
          v-else
          type="button"
          class="primary-command"
          :title="primaryTitle"
          :disabled="primaryDisabled"
          @click="runPrimaryAction"
        >
          <i class="fa-solid" :class="primaryIcon"></i>
          <span>{{ primaryLabel }}</span>
        </button>
      </div>

      <div v-if="pseudo.generationError" class="command-error">
        <i class="fa-solid fa-triangle-exclamation"></i><span>{{ pseudo.generationError }}</span>
      </div>
    </div>

    <div v-else class="history-command">
      <span><i class="fa-solid fa-clock-rotate-left"></i> {{ historyLabel }}</span>
      <button type="button" @click="pseudo.returnHistoryLatest(historyKind)">
        <i class="fa-solid fa-forward-step"></i> {{ returnLatestLabel }}
      </button>
    </div>

    <DialogueTargetPicker :visible="showTargetPicker" @close="showTargetPicker = false" />
  </section>
</template>

<script setup lang="ts">
import type { PseudoLayerHistoryKind } from '../pseudo-layer-protocol';
import { usePseudoLayerStore } from '../store';
import DialogueTargetPicker from './DialogueTargetPicker.vue';

const props = defineProps<{ activeView: string }>();
const emit = defineEmits<{ (event: 'open-view', view: 'story' | 'dialogue'): void }>();
const pseudo = usePseudoLayerStore();
const textareaRef = ref<HTMLTextAreaElement>();
const isFocused = ref(false);
const showTargetPicker = ref(false);
const historyKind = computed<PseudoLayerHistoryKind>(() => {
  if (props.activeView === 'story' || props.activeView === 'dialogue') return props.activeView;
  return pseudo.view.stage.kind;
});
const isDialogueWorkspace = computed(() => historyKind.value === 'dialogue');
const workspaceHistory = computed(() => pseudo.view.histories[historyKind.value]);
const isWorkspaceLatest = computed(() => workspaceHistory.value.total === 0 || workspaceHistory.value.isLatest);
const isExpanded = computed(
  () =>
    isFocused.value ||
    isDialogueWorkspace.value ||
    Boolean(pseudo.draftPrompt.trim() || pseudo.selectedTitle || pseudo.generationError),
);
const connectionLabel = computed(() => (pseudo.controllerReady ? '伪同层已连接' : '等待控制脚本'));
const inputPlaceholder = computed(() => {
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) {
    return pseudo.dialogueContext ? '先继续这段交谈，或另开一段……' : '先选择一位交谈对象……';
  }
  if (!isDialogueWorkspace.value) return '写下此刻想做的事……';
  const dialogue = pseudo.activeDialogue;
  if (!dialogue) return '先选择一位交谈对象……';
  return dialogue.channel === 'transmission'
    ? `向${dialogue.targetName}传讯……`
    : `对${dialogue.targetName}说……`;
});
const primaryLabel = computed(() => {
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) {
    return pseudo.dialogueContext ? '继续' : '择人';
  }
  if (!isDialogueWorkspace.value) return '推演';
  const dialogue = pseudo.activeDialogue;
  if (!dialogue) return '择人';
  return dialogue.channel === 'transmission' ? '传讯' : '交谈';
});
const primaryTitle = computed(() => {
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) {
    return pseudo.dialogueContext ? `继续与${pseudo.dialogueContext.targetName}交谈` : '选择交谈对象';
  }
  if (!isDialogueWorkspace.value) return '开始推演';
  const dialogue = pseudo.activeDialogue;
  if (!dialogue) return '选择交谈对象';
  return dialogue.channel === 'transmission' ? `向${dialogue.targetName}传讯` : `请${dialogue.targetName}回应`;
});
const generationLabel = computed(() => {
  if (isDialogueWorkspace.value && pseudo.activeDialogue) {
    const dialogueLabels = {
      idle: '',
      preparing: pseudo.activeDialogue.channel === 'transmission' ? '送出传讯' : '静候回应',
      generating: pseudo.activeDialogue.channel === 'transmission' ? '回信中' : '回应中',
      saving: '记录交谈',
      stopping: '收束回应',
    };
    return dialogueLabels[pseudo.generationState];
  }
  const labels = { idle: '', preparing: '整理前因', generating: '落笔中', saving: '保存中', stopping: '收束中' };
  return labels[pseudo.generationState];
});

const primaryIcon = computed(() => {
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) {
    return pseudo.dialogueContext ? 'fa-comment-dots' : 'fa-user-group';
  }
  return pseudo.activeDialogue?.channel === 'transmission' && isDialogueWorkspace.value
    ? 'fa-feather-pointed'
    : 'fa-paper-plane';
});
const primaryDisabled = computed(() => {
  if (pseudo.isGenerating) return true;
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) return false;
  return isDialogueWorkspace.value ? !pseudo.canSubmitDialogue : !pseudo.canSubmitStory;
});
const historyLabel = computed(() =>
  historyKind.value === 'dialogue' ? '正在阅览旧交谈' : '正在阅览旧正文',
);
const returnLatestLabel = computed(() =>
  historyKind.value === 'dialogue' ? '返回最新交谈' : '返回最新正文',
);

const chooseStory = () => {
  if (pseudo.isGenerating) return;
  emit('open-view', 'story');
  if (pseudo.isDialogueActive) pseudo.endDialogue();
};

const chooseDialogue = () => {
  if (pseudo.isGenerating) return;
  emit('open-view', 'dialogue');
  if (pseudo.isDialogueActive) return;
  if (pseudo.dialogueContext) pseudo.continueDialogue();
  else showTargetPicker.value = true;
};

const submitCurrent = () => {
  pseudo.submit(historyKind.value);
};

const runPrimaryAction = () => {
  if (isDialogueWorkspace.value && !pseudo.isDialogueActive) {
    if (pseudo.dialogueContext) pseudo.continueDialogue();
    else showTargetPicker.value = true;
    return;
  }
  submitCurrent();
};

watch(
  () => pseudo.focusNonce,
  () => nextTick(() => textareaRef.value?.focus()),
);
</script>

<style lang="scss" scoped>
.command-dock {
  flex-shrink: 0;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--line-strong);
  background: var(--footer-bg);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--gold) 7%, transparent);
}

.command-row { min-height: 38px; display: flex; align-items: stretch; gap: 7px; }
.interaction-segments {
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(44px, 1fr));
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: var(--surface-inset);
}
.interaction-segments button {
  min-width: 0;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-right: 1px solid var(--line-subtle);
  color: var(--text-secondary);
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}
.interaction-segments button:last-child { border-right: 0; }
.interaction-segments button.active { color: var(--gold); background: var(--button-active); }
.interaction-segments button:disabled { opacity: 0.42; cursor: not-allowed; }
.connection-dot { width: 30px; display: grid; place-items: center; flex-shrink: 0; color: var(--text-secondary); }
.connection-dot.connected { color: var(--jade); }
.connection-dot.disconnected { color: var(--semantic-danger); }

textarea {
  min-width: 0;
  height: 38px;
  min-height: 38px;
  flex: 1;
  resize: none;
  padding: 8px 10px;
  overflow-y: auto;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  outline: none;
  color: var(--text-primary);
  background: var(--surface-inset);
  box-shadow: inset 0 1px 8px color-mix(in srgb, var(--stage-shadow) 24%, transparent);
  font: inherit;
  line-height: 1.55;
  transition: height 0.18s ease, border-color 0.18s ease;

  &:focus { border-color: var(--line-strong); }
}

.expanded textarea { height: 78px; }
.selected-intent { min-height: 30px; margin: 0 37px 6px; display: flex; align-items: center; gap: 8px; color: var(--text-accent); font-size: 11px; }
.selected-intent > i { color: var(--gold); }
.selected-intent strong { flex: 1; }
.selected-intent button { border: 0; color: var(--text-secondary); background: transparent; cursor: pointer; }
.dialogue-intent > i { color: var(--jade); }
.dialogue-intent button:hover:not(:disabled) { color: var(--gold); }
.dialogue-intent button:disabled { opacity: 0.35; cursor: not-allowed; }

.native-input-command, .primary-command, .history-command button {
  min-width: 38px;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--surface-inset);
  cursor: pointer;
}

.primary-command { min-width: 82px; border-color: var(--line-strong); color: var(--gold); background: var(--button-active); }
.primary-command:disabled { opacity: 0.35; cursor: not-allowed; }
.primary-command.stop { color: var(--text-primary); border-color: color-mix(in srgb, var(--semantic-danger) 55%, transparent); background: color-mix(in srgb, var(--semantic-danger) 36%, var(--surface-inset)); }
.generation-label { display: flex; align-items: center; gap: 5px; color: var(--jade); font-size: 10px; white-space: nowrap; }
.command-error { margin: 7px 37px 0; display: flex; gap: 7px; color: var(--semantic-danger); font-size: 11px; }
.history-command { min-height: 42px; display: flex; align-items: center; justify-content: space-between; color: var(--text-secondary); }
.history-command span i { margin-right: 6px; color: var(--gold-soft); }
.history-command button { padding: 0 12px; color: var(--gold); }

@media screen and (max-width: 600px) {
  .command-dock { padding: 7px 8px 8px; }
  .interaction-segments { grid-template-columns: repeat(2, 30px); }
  .interaction-segments button { padding: 0; }
  .interaction-segments button span { display: none; }
  .connection-dot { width: 24px; }
  .primary-command { min-width: 42px; }
  .primary-command span, .generation-label { display: none; }
  .selected-intent, .command-error { margin-right: 0; margin-left: 31px; }
}

@media screen and (max-width: 420px) {
  .connection-dot { display: none; }
}
</style>
