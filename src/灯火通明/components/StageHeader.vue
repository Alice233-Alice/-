<template>
  <header class="stage-header">
    <div class="turn-cluster">
      <img class="crane-mark" src="https://pub-4d14ab94aa29488b977bc5be9f2a06ef.r2.dev/picgo/仙鹤.png" alt="" />
      <div class="turn-copy">
        <span>灯火阑珊</span>
        <strong :title="stageTitle">{{ stageTitle }}</strong>
      </div>
      <div class="turn-navigation">
        <button
          type="button"
          :disabled="pseudo.view.previousMessageId === undefined || pseudo.isGenerating"
          title="上一回"
          @click="pseudo.navigate('previous')"
        >
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <span>{{ pseudo.view.index || 1 }} / {{ pseudo.view.total || 1 }}</span>
        <button
          type="button"
          :disabled="pseudo.view.nextMessageId === undefined || pseudo.isGenerating"
          title="下一回"
          @click="pseudo.navigate('next')"
        >
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button v-if="!pseudo.isLatest" type="button" title="返回最新回合" @click="pseudo.returnLatest">
          <i class="fa-solid fa-forward-step"></i>
        </button>
      </div>
    </div>

    <button class="scene-location" type="button" title="打开行踪地图" @click="$emit('open-map')">
      <span class="scene-kicker">此刻所在</span>
      <strong>
        <i class="fa-solid fa-location-dot"></i>
        <template v-if="showParent"><span>{{ parentRegion }}</span><b>·</b></template>
        {{ data.本尊.行踪.当前区域 }}
      </strong>
    </button>

    <div class="stage-utilities">
      <span class="danger-badge" :style="{ '--danger-color': dangerColor }">险 {{ data.本尊.行踪.危险度 ?? 10 }}</span>
      <button
        class="delete-button"
        type="button"
        :title="pseudo.canDelete ? deleteButtonTitle : '至少保留一个回合，且只能删除最新回合'"
        :disabled="!pseudo.canDelete"
        @click="deleteDialogOpen = true"
      >
        <i class="fa-solid fa-trash-can"></i>
      </button>
      <button
        class="reroll-button"
        type="button"
        :title="pseudo.view.stage.kind === 'dialogue' ? '重生成本次回应' : '重生成本回正文'"
        :disabled="!pseudo.canReroll"
        @click="pseudo.reroll"
      >
        <i class="fa-solid fa-rotate-right"></i>
      </button>
      <button class="preset-button" type="button" title="开局预设" @click="$emit('open-preset')"><i class="fa-solid fa-sliders"></i></button>
      <button class="map-button" type="button" title="打开地图" @click="$emit('open-map')"><i class="fa-solid fa-map-location-dot"></i></button>
      <button type="button" title="外观设置" @click="$emit('open-settings')"><i class="fa-solid fa-font"></i></button>
      <button type="button" :title="immersive ? '退出沉浸阅读' : '进入沉浸阅读'" @click="$emit('toggle-immersive')">
        <i class="fa-solid" :class="immersive ? 'fa-compress' : 'fa-expand'"></i>
      </button>
    </div>
  </header>

  <div
    v-if="deleteDialogOpen"
    class="delete-dialog-backdrop"
    role="presentation"
    @click.self="deleteDialogOpen = false"
  >
    <section class="delete-dialog" role="alertdialog" aria-modal="true" :aria-labelledby="deleteDialogTitleId">
      <span class="delete-dialog-mark"><i class="fa-solid fa-trash-can"></i></span>
      <div class="delete-dialog-copy">
        <h2 :id="deleteDialogTitleId">{{ deleteDialogTitle }}</h2>
        <p>{{ deleteDialogDescription }}</p>
      </div>
      <div class="delete-dialog-actions">
        <button type="button" class="cancel-delete" :disabled="pseudo.isDeleting" @click="deleteDialogOpen = false">
          取消
        </button>
        <button type="button" class="confirm-delete" :disabled="pseudo.isDeleting" @click="confirmDelete">
          <i class="fa-solid" :class="pseudo.isDeleting ? 'fa-circle-notch fa-spin' : 'fa-trash-can'"></i>
          {{ pseudo.isDeleting ? '正在删除' : '确认删除' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useDataStore, usePseudoLayerStore } from '../store';

const props = defineProps<{ activeView: string; immersive: boolean; parentRegion: string; dangerColor: string }>();
defineEmits<{
  (event: 'open-map'): void;
  (event: 'open-preset'): void;
  (event: 'open-settings'): void;
  (event: 'toggle-immersive'): void;
}>();

const data = useDataStore();
const pseudo = usePseudoLayerStore();
const deleteDialogOpen = ref(false);
const deleteDialogTitleId = `delete-stage-${Math.random().toString(36).slice(2, 8)}`;
const stageTitle = computed(() => {
  if (props.activeView === 'story' && pseudo.view.stage.kind === 'dialogue') return '正文回顾';
  if (props.activeView === 'dialogue') {
    const dialogue = pseudo.activeDialogue ?? pseudo.selectedDialogue;
    if (!dialogue) return '交谈';
    const turnCount = pseudo.view.stage.kind === 'dialogue' ? ` · ${pseudo.view.stage.turnCount}轮` : '';
    return `与${dialogue.targetName}${turnCount}`;
  }
  return pseudo.view.stage.kind === 'dialogue'
    ? `与${pseudo.view.stage.targetName} · ${pseudo.view.stage.turnCount}轮`
    : `第 ${pseudo.view.index || 1} 回`;
});
const deleteButtonTitle = computed(() =>
  pseudo.view.stage.kind === 'dialogue' ? '删除最后一轮交谈' : '删除本回正文',
);
const deleteDialogTitle = computed(() =>
  pseudo.view.stage.kind === 'dialogue' ? '删除最后一轮交谈？' : '删除本回剧情？',
);
const deleteDialogDescription = computed(() =>
  pseudo.view.stage.kind === 'dialogue'
    ? '将同时删除最后一条用户发言与角色回应；会话中的其余轮次会保留。此操作无法恢复。'
    : '将同时删除本回起念与正文，避免留下无法看见的用户楼层。此操作无法恢复。',
);
const confirmDelete = () => {
  if (!pseudo.canDelete) return;
  pseudo.deleteCurrent();
};

watch(
  () => pseudo.canDelete,
  canDelete => {
    if (!canDelete && !pseudo.isDeleting) deleteDialogOpen.value = false;
  },
);
const showParent = computed(() => {
  const parent = props.parentRegion.trim();
  const current = String(data.本尊.行踪.当前区域 || '').trim();
  return Boolean(parent && current && parent !== current && !current.startsWith(`${parent}·`));
});
</script>

<style lang="scss" scoped>
.stage-header {
  position: relative;
  min-height: 66px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(260px, 1.1fr) minmax(260px, 1fr);
  align-items: center;
  gap: 18px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--line-strong);
  background: var(--header-bg);
  box-shadow: inset 0 -1px 0 color-mix(in srgb, var(--gold) 12%, transparent), 0 8px 26px color-mix(in srgb, var(--stage-shadow) 54%, transparent);
  overflow: hidden;
}

.stage-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, transparent 0 5%, color-mix(in srgb, var(--gold) 7%, transparent) 18%, transparent 34% 66%, color-mix(in srgb, var(--jade) 6%, transparent) 82%, transparent 95%),
    var(--grain-material);
  pointer-events: none;
}

.stage-header::after {
  content: '';
  position: absolute;
  right: 50%;
  bottom: -1px;
  width: 76px;
  height: 2px;
  transform: translateX(50%);
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
  opacity: 0.62;
}

.stage-header > * { position: relative; z-index: 1; }

.turn-cluster, .turn-navigation, .stage-utilities { display: flex; align-items: center; }
.turn-cluster { min-width: 0; gap: 9px; }
.crane-mark { width: 34px; height: 34px; flex-shrink: 0; object-fit: contain; filter: drop-shadow(0 3px 8px var(--stage-shadow)) sepia(0.16); }
.turn-copy { min-width: 74px; display: grid; gap: 1px; }
.turn-copy span { color: var(--gold-soft); font-family: 'Songti SC', 'STSong', serif; font-size: 10px; }
.turn-copy strong { max-width: 150px; overflow: hidden; color: var(--text-primary); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.turn-navigation { gap: 3px; }
.turn-navigation span { min-width: 36px; color: var(--text-secondary); font-size: 10px; text-align: center; font-variant-numeric: tabular-nums; }

.turn-navigation button, .stage-utilities button {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-subtle);
  border-radius: 5px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-inset) 72%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent);
  cursor: pointer;

  &:hover:not(:disabled) { border-color: var(--line-strong); color: var(--gold); background: var(--button-hover); }
  &:disabled { opacity: 0.28; cursor: not-allowed; }
}

.scene-location {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 6px 10px;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
  text-shadow: 0 1px 10px var(--stage-shadow);
}
.scene-kicker { color: var(--text-secondary); font-size: 9px; }
.scene-location strong { max-width: 100%; overflow: hidden; color: var(--gold); font-family: 'Songti SC', 'STSong', serif; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.scene-location strong i { margin-right: 5px; color: var(--jade); }
.scene-location strong span { color: var(--text-accent); font-weight: 400; }
.scene-location strong b { padding: 0 5px; color: var(--text-secondary); font-weight: 400; }

.stage-utilities { min-width: 0; justify-content: flex-end; gap: 5px; }
.danger-badge { margin-right: 4px; padding: 4px 8px; border: 1px solid color-mix(in srgb, var(--danger-color) 60%, transparent); border-radius: 999px; color: var(--danger-color); background: color-mix(in srgb, var(--danger-color) 10%, transparent); font-size: 10px; white-space: nowrap; }
.delete-button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--semantic-danger) 56%, var(--line-strong)) !important; color: var(--semantic-danger) !important; }

.delete-dialog-backdrop {
  position: fixed;
  z-index: 1000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: color-mix(in srgb, var(--stage-shadow) 74%, transparent);
  backdrop-filter: blur(4px);
}
.delete-dialog {
  width: min(420px, 100%);
  padding: 20px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--semantic-danger) 42%, var(--line-strong));
  border-radius: 7px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-raised) 96%, transparent);
  box-shadow: 0 26px 80px var(--stage-shadow), inset 0 0 0 1px var(--line-subtle);
}
.delete-dialog-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--semantic-danger) 40%, transparent);
  border-radius: 50%;
  color: var(--semantic-danger);
  background: color-mix(in srgb, var(--semantic-danger) 10%, var(--surface-inset));
}
.delete-dialog-copy h2 { margin: 0 0 6px; color: var(--text-accent); font-size: 15px; }
.delete-dialog-copy p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.7; }
.delete-dialog-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.delete-dialog-actions button {
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid var(--line-subtle);
  border-radius: 5px;
  color: var(--text-secondary);
  background: var(--surface-inset);
  cursor: pointer;
}
.delete-dialog-actions button:disabled { opacity: 0.48; cursor: wait; }
.delete-dialog-actions .confirm-delete {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-color: color-mix(in srgb, var(--semantic-danger) 46%, var(--line-subtle));
  color: var(--text-primary);
  background: color-mix(in srgb, var(--semantic-danger) 18%, var(--surface-inset));
}
.delete-dialog-actions .confirm-delete:hover:not(:disabled) { color: #fff; background: var(--semantic-danger); }

@media screen and (max-width: 760px) {
  .stage-header { min-height: 58px; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 6px 8px; }
  .scene-location { display: none; }
  .crane-mark { width: 28px; height: 28px; }
  .turn-copy span { display: none; }
  .turn-copy { min-width: 46px; }
  .turn-navigation span { display: none; }
  .stage-utilities { gap: 3px; }
  .danger-badge { padding: 3px 6px; }
  .stage-utilities .map-button { display: none; }
}

@media screen and (max-width: 390px) {
  .crane-mark, .danger-badge { display: none; }
  .turn-cluster { gap: 4px; }
  .stage-utilities button { width: 28px; height: 28px; }
}
</style>
