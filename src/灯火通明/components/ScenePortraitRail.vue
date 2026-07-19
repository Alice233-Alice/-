<template>
  <aside v-if="card" class="portrait-rail" aria-label="当前在场角色">
    <nav v-if="data.galleryCards.length > 1" class="portrait-tabs">
      <button
        v-for="(item, index) in data.galleryCards"
        :key="`${item.name}-${index}`"
        type="button"
        :class="{ active: selectedIndex === index }"
        @click="selectedIndex = index"
      >
        {{ item.frontName || item.name }}
      </button>
    </nav>

    <button class="portrait-stage" type="button" title="翻转角色立绘" @click="toggleFlip">
      <Transition name="portrait-shift" mode="out-in">
        <img :key="visibleImage" :src="visibleImage" :alt="displayName" />
      </Transition>
      <span class="portrait-caption">
        <small>{{ card.isFlipped ? '心中所念' : '此刻在场' }}</small>
        <strong>{{ displayName }}</strong>
      </span>
    </button>

    <div class="portrait-controls">
      <button
        type="button"
        class="talk-control"
        :title="`与${displayName}交谈`"
        :disabled="!pseudo.isStoryHistoryLatest || pseudo.isGenerating"
        @click="startDialogue"
      >
        <i class="fa-solid fa-comment-dots"></i>
      </button>
      <template v-if="visibleCandidates.length > 1">
        <button type="button" title="上一张立绘" @click="browse(-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" title="随机更换立绘" @click="browse('random')"><i class="fa-solid fa-shuffle"></i></button>
        <button type="button" title="下一张立绘" @click="browse(1)"><i class="fa-solid fa-chevron-right"></i></button>
      </template>
      <button type="button" title="翻转角色立绘" @click="toggleFlip">
        <i class="fa-solid fa-rotate"></i>
      </button>
      <button type="button" title="查看大图" @click="galleryUi.openPreview(selectedIndex)">
        <i class="fa-solid fa-expand"></i>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useDataStore, useGalleryUiStore, usePseudoLayerStore } from '../store';
import type { GalleryBrowseDirection } from '../stores/gallery-ui-store';

const data = useDataStore();
const galleryUi = useGalleryUiStore();
const pseudo = usePseudoLayerStore();
const selectedIndex = ref(0);
const card = computed(() => data.galleryCards[selectedIndex.value] ?? data.galleryCards[0] ?? null);
const visibleImage = computed(() => {
  const value = card.value;
  if (!value) return '';
  return value.isFlipped ? value.back : value.front;
});
const displayName = computed(() => {
  const value = card.value;
  if (!value) return '';
  return value.isFlipped ? value.backName || value.name : value.frontName || value.name;
});
const visibleCandidates = computed(() => {
  const value = card.value;
  if (!value) return [];
  return value.isFlipped ? value.backCandidates : value.frontCandidates;
});

const browse = (direction: GalleryBrowseDirection) => {
  void data.changeGalleryCardImage(selectedIndex.value, direction);
};
const toggleFlip = () => data.toggleCardFlip(selectedIndex.value);
const startDialogue = () => {
  const value = card.value;
  const targetName = displayName.value.trim();
  if (!value || !targetName) return;
  const canonicalName = ['虞汐', '虞颜', '虞汐颜'].includes(value.name) ? '虞汐颜' : value.name;
  pseudo.beginDialogue({ targetName, canonicalName, channel: 'present' });
};

watch(
  [() => pseudo.messageId, () => data.galleryCards.length],
  () => {
    if (!data.galleryCards[selectedIndex.value]) selectedIndex.value = 0;
  },
);
</script>

<style lang="scss" scoped>
.portrait-rail {
  position: relative;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 10px;
  padding: 18px;
  border-left: 1px solid var(--line-subtle);
  background: var(--portrait-material), color-mix(in srgb, var(--surface) 82%, transparent);
  box-shadow: inset 14px 0 30px color-mix(in srgb, var(--stage-shadow) 16%, transparent);
}

.portrait-rail::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid color-mix(in srgb, var(--line-subtle) 55%, transparent);
  border-radius: 6px;
  pointer-events: none;
  opacity: 0.55;
}
.portrait-rail > * { position: relative; z-index: 1; }

.portrait-tabs {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  button {
    flex-shrink: 0;
    padding: 5px 9px;
    border: 0;
    border-bottom: 1px solid transparent;
    color: var(--text-secondary);
    background: transparent;
    font-size: 11px;
    cursor: pointer;

    &.active { border-color: var(--gold); color: var(--gold); }
  }
}

.portrait-stage {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: var(--surface-inset);
  box-shadow: 0 12px 34px color-mix(in srgb, var(--stage-shadow) 74%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--gold) 8%, transparent);
  cursor: pointer;

  img { width: 100%; height: 100%; display: block; object-fit: contain; }
}

.portrait-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 44px 14px 12px;
  color: #f4eee5;
  background: linear-gradient(to top, color-mix(in srgb, var(--surface-inset) 96%, black), transparent);
  text-align: left;

  small { color: #e6bd76; font-size: 9px; }
  strong { font-family: 'Songti SC', 'STSong', serif; font-size: 18px; }
}

.portrait-controls {
  display: flex;
  justify-content: center;
  gap: 3px;

  button {
    width: 30px;
    height: 28px;
    display: grid;
    place-items: center;
    border: 1px solid var(--line-subtle);
    border-radius: 5px;
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--surface-inset) 86%, transparent);
    cursor: pointer;

    &:hover { border-color: var(--line-strong); color: var(--gold); }
    &:disabled { opacity: 0.32; cursor: not-allowed; }
  }

  .talk-control { color: var(--jade); }
}

.portrait-shift-enter-active, .portrait-shift-leave-active { transition: opacity 0.16s ease; }
.portrait-shift-enter-from, .portrait-shift-leave-to { opacity: 0; }

@media screen and (max-width: 760px) {
  .portrait-rail {
    height: 176px;
    grid-template-columns: 128px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line-subtle);
    border-left: 0;
  }

  .portrait-tabs { grid-column: 2; grid-row: 1; align-content: start; flex-wrap: wrap; }
  .portrait-stage { grid-column: 1; grid-row: 1 / 3; }
  .portrait-controls { grid-column: 2; grid-row: 2; justify-content: flex-start; }
  .portrait-caption { padding: 34px 9px 8px; }
  .portrait-caption strong { font-size: 14px; }
}
</style>
