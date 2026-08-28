<template>
  <section v-if="shouldShow" class="inline-action-choices" aria-label="接下来可选的行动">
    <header class="inline-action-heading">
      <span class="heading-rule" aria-hidden="true"></span>
      <span class="heading-title"><i class="fa-solid fa-compass"></i> 接下来</span>
      <span class="heading-note">
        {{ submitMode === 'direct' ? '选择后直接推演' : '选择后填入行动栏' }}
      </span>
      <span class="heading-rule" aria-hidden="true"></span>
    </header>

    <div class="inline-choice-list">
      <button
        v-for="(action, index) in actionState.actions"
        :key="getActionKey(action, index)"
        type="button"
        class="inline-choice"
        :class="`type-${action.类型}`"
        :disabled="pseudo.isGenerating"
        @click="selectAction(action)"
      >
        <span class="choice-glyph" aria-hidden="true"><i :class="getActionIcon(action.类型)"></i></span>
        <span class="choice-copy">
          <span class="choice-text">{{ action.行动 }}</span>
          <span v-if="action.提示" class="choice-hint">{{ action.提示 }}</span>
        </span>
        <span class="choice-type">{{ action.类型 }}</span>
        <i
          class="choice-affordance fa-solid"
          :class="submitMode === 'direct' ? 'fa-paper-plane' : 'fa-chevron-right'"
        ></i>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  containsInitVar,
  extractJsonPatch,
  getActionIcon,
  getActionKey,
  resolveActionFeed,
  type OpportunityAction,
} from '../action-feed';
import { useActionPreferences } from '../action-preferences';
import { useDataStore, usePseudoLayerStore } from '../store';

const props = defineProps<{ rawMessage: string }>();
const store = useDataStore();
const pseudo = usePseudoLayerStore();
const { inlineActionsEnabled, submitMode } = useActionPreferences();

const actionState = computed(() =>
  resolveActionFeed({
    operations: extractJsonPatch(props.rawMessage),
    storedActions: store.可参与机遇 as unknown[],
    tasks: store.任务列表,
    situation: store.当前处境,
    useStoredActionsWithoutPatch: containsInitVar(props.rawMessage),
  }),
);

const shouldShow = computed(
  () =>
    inlineActionsEnabled.value &&
    store.启用行动提示 &&
    pseudo.isStoryHistoryLatest &&
    !pseudo.isGenerating &&
    actionState.value.actions.length > 0,
);

const selectAction = (action: OpportunityAction) => {
  if (pseudo.isGenerating) return;
  if (!pseudo.isStoryHistoryLatest) {
    toastr.warning('请先返回最新正文再选择行动', '行动提示');
    return;
  }

  pseudo.selectDraft(action.类型, action.行动);
  if (submitMode.value !== 'direct') return;

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
</script>

<style lang="scss" scoped>
.inline-action-choices {
  --choice-color: var(--jade);

  width: min(100%, var(--reading-measure));
  margin: clamp(24px, 4vh, 38px) auto 4px;
  color: var(--text-primary);
}

.inline-action-heading {
  display: grid;
  grid-template-columns: minmax(20px, 1fr) auto auto minmax(20px, 1fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.heading-rule {
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 42%, var(--line-subtle)));

  &:last-child {
    background: linear-gradient(90deg, color-mix(in srgb, var(--gold) 42%, var(--line-subtle)), transparent);
  }
}

.heading-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: color-mix(in srgb, var(--gold) 78%, var(--text-primary));
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;

  i {
    font-size: 11px;
  }
}

.heading-note {
  color: color-mix(in srgb, var(--text-secondary) 76%, transparent);
  font-size: 10px;
}

.inline-choice-list {
  display: grid;
  gap: 7px;
}

.inline-choice {
  --choice-color: var(--gold);

  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto 12px;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 11px;
  border: 1px solid color-mix(in srgb, var(--choice-color) 20%, var(--line-subtle));
  border-radius: 9px;
  color: var(--text-primary);
  text-align: left;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--choice-color) 7%, transparent), transparent 32%),
    color-mix(in srgb, var(--reading-surface) 78%, transparent);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    transform 0.18s ease;

  &:hover:not(:disabled) {
    transform: translateX(2px);
    border-color: color-mix(in srgb, var(--choice-color) 45%, var(--line-subtle));
    background:
      linear-gradient(90deg, color-mix(in srgb, var(--choice-color) 11%, transparent), transparent 38%),
      color-mix(in srgb, var(--reading-surface) 88%, transparent);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--choice-color) 52%, transparent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }

  &.type-探索 {
    --choice-color: #62c6a7;
  }

  &.type-交涉 {
    --choice-color: #74aee8;
  }

  &.type-战斗 {
    --choice-color: #db786e;
  }

  &.type-修炼 {
    --choice-color: #8dcfd1;
  }

  &.type-整备 {
    --choice-color: #d8a85b;
  }

  &.type-亲密 {
    --choice-color: #d782a6;
  }
}

.choice-glyph {
  display: grid;
  width: 28px;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  color: color-mix(in srgb, var(--choice-color) 90%, white);
  background: color-mix(in srgb, var(--choice-color) 14%, transparent);
  font-size: 11px;
}

.choice-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.choice-text {
  overflow-wrap: anywhere;
  font-size: 12px;
  font-weight: 590;
  line-height: 1.52;
}

.choice-hint {
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.4;
}

.choice-type {
  padding: 2px 7px;
  border-radius: 999px;
  color: var(--choice-color);
  background: color-mix(in srgb, var(--choice-color) 10%, transparent);
  font-size: 10px;
  white-space: nowrap;
}

.choice-affordance {
  color: color-mix(in srgb, var(--choice-color) 72%, var(--text-secondary));
  font-size: 9px;
}

@media (max-width: 760px) {
  .inline-action-choices {
    margin-top: 24px;
  }

  .inline-action-heading {
    grid-template-columns: minmax(16px, 1fr) auto minmax(16px, 1fr);
    gap: 8px;
  }

  .heading-note {
    display: none;
  }

  .inline-choice {
    grid-template-columns: 28px minmax(0, 1fr) 12px;
    gap: 8px;
    padding: 9px;
  }

  .choice-type {
    grid-column: 2;
    justify-self: start;
  }

  .choice-affordance {
    grid-column: 3;
    grid-row: 1 / span 2;
  }
}
</style>
