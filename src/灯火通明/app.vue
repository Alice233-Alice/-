<template>
  <div
    class="cultivation-status"
    :data-theme="themeStore.currentThemeId"
    :data-view="activeView"
    :class="{
      immersive: isImmersive,
      'map-expanded': activeView === 'map',
      'reduce-motion': themeStore.preferences.reduceMotion,
      'light-theme': themeStore.currentTheme.mode === 'light',
    }"
    :style="themeStyles"
  >
    <div class="stage-backdrop"></div>
    <div class="pattern-overlay"></div>
    <div class="ambient-overlay"></div>
    <div class="frame-overlay"></div>

    <StageHeader
      :active-view="activeView"
      :immersive="isImmersive"
      :parent-region="parentRegion"
      :danger-color="dangerColor"
      @open-map="openView('map')"
      @open-preset="openView('preset')"
      @open-settings="showReadingSettings = true"
      @toggle-immersive="toggleImmersive"
    />

    <main class="stage-main">
      <div
        ref="modeViewport"
        class="stage-viewport"
        :class="{ 'reading-mode': activeView === 'story' || activeView === 'dialogue' }"
        @scroll="rememberScroll"
      >
        <PseudoStoryReader v-if="activeView === 'story'" :immersive="isImmersive" />
        <DialogueStage v-else-if="activeView === 'dialogue'" />
        <PresetPanel v-else-if="activeView === 'preset'" />
        <CultivationPanel v-else-if="activeView === 'cultivation'" />
        <SkillsPanel v-else-if="activeView === 'skills'" />
        <InventoryPanel v-else-if="activeView === 'inventory'" />
        <CompanionsPanel v-else-if="activeView === 'companions'" />
        <MapPanel v-else-if="activeView === 'trace'" />
        <div v-else-if="activeView === 'map'" class="panel full-map-panel">
          <WorldMapCanvas
            :current-location="store.本尊.行踪.当前区域"
            :current-domain="parentRegion"
            :current-danger="store.本尊.行踪.危险度 ?? 10"
            :available-connections="store.本尊.行踪.可用通道 || []"
          />
        </div>
        <div v-else-if="activeView === 'tribulation'" class="panel tribulation-panel">
          <CombatPanel
            :combat-state="store.本尊.战斗状态"
            :current-enemies="store.本尊.当前敌人"
            :tribulation-state="store.本尊.渡劫状态"
            :player-combat-power="(store.本尊 as any).战力值 ?? 0"
          />
        </div>
        <GalleryPanel v-else-if="activeView === 'gallery'" />
        <ActionMenuPanel v-else-if="activeView === 'actions'" />
      </div>
    </main>

    <TabNav v-if="!isImmersive" v-model:active-tab="activeView" :tabs="tabs" />
    <FooterSection v-if="!isImmersive" @open-actions="openView('actions')" />
    <PseudoCommandDock :active-view="activeView" @open-view="openView" />

    <ReadingSettingsPanel :visible="showReadingSettings" @close="showReadingSettings = false" />
    <GalleryPreviewDialog />
  </div>
</template>

<script setup lang="ts">
import ActionMenuPanel from './components/ActionMenuPanel.vue';
import CombatPanel from './components/CombatPanel.vue';
import CompanionsPanel from './components/CompanionsPanel.vue';
import CultivationPanel from './components/CultivationPanel.vue';
import DialogueStage from './components/DialogueStage.vue';
import FooterSection from './components/FooterSection.vue';
import GalleryPanel from './components/GalleryPanel.vue';
import GalleryPreviewDialog from './components/GalleryPreviewDialog.vue';
import InventoryPanel from './components/InventoryPanel.vue';
import MapPanel from './components/MapPanel.vue';
import PresetPanel from './components/PresetPanel.vue';
import PseudoCommandDock from './components/PseudoCommandDock.vue';
import PseudoStoryReader from './components/PseudoStoryReader.vue';
import ReadingSettingsPanel from './components/ReadingSettingsPanel.vue';
import SkillsPanel from './components/SkillsPanel.vue';
import StageHeader from './components/StageHeader.vue';
import TabNav from './components/TabNav.vue';
import WorldMapCanvas from './components/WorldMapCanvas.vue';
import duskInkArt from './assets/dusk-ink-landscape.svg?url';
import lanternArt from './assets/lantern-water-town.svg?url';
import shanhaiArt from './assets/shanhai-scroll.svg?url';
import starAltarArt from './assets/star-altar-chart.svg?url';
import { inferLayerFromTrack } from './region-utils';
import { getDangerColor } from './schema';
import { useDataStore, usePseudoLayerStore, useThemeStore } from './store';

export type StageView =
  | 'story'
  | 'dialogue'
  | 'preset'
  | 'cultivation'
  | 'skills'
  | 'inventory'
  | 'companions'
  | 'trace'
  | 'map'
  | 'tribulation'
  | 'gallery'
  | 'actions';

const store = useDataStore();
const pseudoLayerStore = usePseudoLayerStore();
const themeStore = useThemeStore();
const activeView = ref<StageView>('story');
const isImmersive = ref(false);
const showReadingSettings = ref(false);
const modeViewport = ref<HTMLElement>();
const scrollPositions = new Map<StageView, number>();
const hasEnteredStreaming = ref(false);
const parentViewportHeight = ref(window.parent.innerHeight);
const appViewportWidth = ref(window.innerWidth);

const tabs: Array<{ id: StageView; label: string; icon: string }> = [
  { id: 'story', label: '正文', icon: 'fa-solid fa-book-open' },
  { id: 'dialogue', label: '交谈', icon: 'fa-solid fa-comments' },
  { id: 'cultivation', label: '修炼', icon: 'fa-solid fa-yin-yang' },
  { id: 'skills', label: '神通', icon: 'fa-solid fa-hand-sparkles' },
  { id: 'inventory', label: '储物', icon: 'fa-solid fa-box-open' },
  { id: 'companions', label: '红颜', icon: 'fa-solid fa-heart' },
  { id: 'trace', label: '行踪', icon: 'fa-solid fa-shoe-prints' },
  { id: 'map', label: '地图', icon: 'fa-solid fa-map-location-dot' },
  { id: 'tribulation', label: '历劫', icon: 'fa-solid fa-bolt' },
  { id: 'gallery', label: '图鉴', icon: 'fa-solid fa-images' },
  { id: 'actions', label: '行动', icon: 'fa-solid fa-compass' },
];

const measureMap = { narrow: '58ch', standard: '72ch', wide: '86ch' } as const;
const themeArtMap = {
  lantern: lanternArt,
  duskInk: duskInkArt,
  shanhai: shanhaiArt,
  starAltar: starAltarArt,
} as const;
const updateViewport = () => {
  parentViewportHeight.value = window.parent.innerHeight;
  appViewportWidth.value = window.innerWidth;
};

const stageHeight = computed(() => {
  const mobile = appViewportWidth.value <= 760;
  const defaultHeight = _.clamp(parentViewportHeight.value - 132, mobile ? 560 : 640, mobile ? 760 : 900);
  if (activeView.value !== 'map') return Math.round(defaultHeight);

  const expandedHeight = _.clamp(
    parentViewportHeight.value * 1.12,
    mobile ? 700 : 840,
    mobile ? 900 : 1120,
  );
  return Math.round(Math.max(defaultHeight, expandedHeight));
});

const themeStyles = computed(() => {
  const theme = themeStore.currentTheme;
  const colors = theme.colors;
  return {
    '--stage-height': `${stageHeight.value}px`,
    '--bg-primary': colors.bgPrimary,
    '--bg-secondary': colors.bgSecondary,
    '--border-color': colors.border,
    '--border-active': colors.borderActive,
    '--text-primary': colors.textPrimary,
    '--text-secondary': colors.textSecondary,
    '--text-accent': colors.textAccent,
    '--accent-color': colors.accent,
    '--accent-glow': colors.accentGlow,
    '--button-bg': colors.buttonBg,
    '--button-hover': colors.buttonHover,
    '--button-active': colors.buttonActive,
    '--progress-bg': colors.progressBg,
    '--header-bg': colors.headerBg,
    '--tab-bg': colors.tabBg,
    '--tab-active': colors.tabActive,
    '--footer-bg': colors.footerBg,
    '--stage-canvas': colors.canvas,
    '--surface': colors.surface,
    '--surface-raised': colors.surfaceRaised,
    '--surface-inset': colors.surfaceInset,
    '--reading-surface': colors.readingSurface,
    '--line-subtle': colors.lineSubtle,
    '--line-strong': colors.lineStrong,
    '--gold': colors.gold,
    '--gold-soft': colors.goldSoft,
    '--jade': colors.jade,
    '--jade-soft': colors.jadeSoft,
    '--crimson': colors.crimson,
    '--semantic-danger': colors.danger,
    '--semantic-success': colors.success,
    '--semantic-warning': colors.warning,
    '--semantic-info': colors.info,
    '--semantic-relation': colors.relation,
    '--stage-shadow': colors.shadow,
    '--focus-ring': colors.focusRing,
    '--stage-material': theme.materials.stage,
    '--ambient-material': theme.materials.ambient,
    '--frame-material': theme.materials.frame,
    '--reading-material': theme.materials.reading,
    '--portrait-material': theme.materials.portrait,
    '--grain-material': theme.materials.grain,
    '--theme-art': `url("${themeArtMap[theme.id]}")`,
    '--reading-font-size': `${themeStore.preferences.fontSize}px`,
    '--reading-line-height': String(themeStore.preferences.lineHeight),
    '--reading-measure': measureMap[themeStore.preferences.measure],
  };
});

const parentRegion = computed(() =>
  inferLayerFromTrack(
    String(store.本尊.行踪.当前区域 || '').trim(),
    String(store.本尊.行踪.所属层级 || '').trim(),
    String(store.本尊.行踪.环境描述 || ''),
    store.地点库 as Record<string, { 域?: string }>,
    store.世界地图 as Record<string, { layer?: string }>,
  ) || '',
);
const dangerColor = computed(() => getDangerColor(store.本尊.行踪.危险度 ?? 10));

const openView = (view: StageView) => {
  isImmersive.value = false;
  activeView.value = view;
};
const toggleImmersive = () => {
  if (!isImmersive.value) activeView.value = 'story';
  isImmersive.value = !isImmersive.value;
};
const rememberScroll = () => {
  if (!['story', 'dialogue'].includes(activeView.value) && modeViewport.value) {
    scrollPositions.set(activeView.value, modeViewport.value.scrollTop);
  }
};

watch(activeView, (next, previous) => {
  if (!['story', 'dialogue'].includes(previous) && modeViewport.value) {
    scrollPositions.set(previous, modeViewport.value.scrollTop);
  }
  nextTick(() => {
    if (modeViewport.value) {
      modeViewport.value.scrollTop = ['story', 'dialogue'].includes(next) ? 0 : scrollPositions.get(next) ?? 0;
    }
  });
  if ((next === 'story' || next === 'dialogue') && next !== previous) {
    pseudoLayerStore.selectHistory(next);
  }
});

watch(
  () => pseudoLayerStore.generationState,
  (next, previous) => {
    if (next === 'generating') {
      hasEnteredStreaming.value = true;
      activeView.value = pseudoLayerStore.activeDialogue || pseudoLayerStore.view.stage.kind === 'dialogue'
        ? 'dialogue'
        : 'story';
    }
    if (previous !== 'idle' && next === 'idle' && hasEnteredStreaming.value && pseudoLayerStore.isLatest) {
      hasEnteredStreaming.value = false;
      activeView.value = pseudoLayerStore.activeDialogue || pseudoLayerStore.view.stage.kind === 'dialogue'
        ? 'dialogue'
        : 'story';
    }
  },
);

watch(
  () => pseudoLayerStore.activeDialogue?.sessionId,
  (sessionId, previousSessionId) => {
    if (sessionId && sessionId !== previousSessionId) {
      isImmersive.value = false;
      activeView.value = 'dialogue';
      return;
    }
    if (!sessionId && previousSessionId && activeView.value === 'dialogue') activeView.value = 'story';
  },
);

watch(
  [() => pseudoLayerStore.view.selectedMessageId, () => pseudoLayerStore.view.stage.kind],
  ([messageId, kind], [previousMessageId]) => {
    if (messageId < 0 || messageId === previousMessageId) return;
    isImmersive.value = false;
    activeView.value = kind === 'dialogue' ? 'dialogue' : 'story';
  },
  { immediate: true },
);

watch(
  [
    () => pseudoLayerStore.view.hostMessageId,
    () => pseudoLayerStore.view.selectedMessageId,
    () => pseudoLayerStore.view.revision,
  ],
  ([hostMessageId, selectedMessageId]) => {
    if (hostMessageId !== pseudoLayerStore.messageId || selectedMessageId < 0) return;
    store.viewMessage(selectedMessageId);
  },
  { immediate: true },
);

onMounted(() => {
  pseudoLayerStore.start();
  window.parent.addEventListener('resize', updateViewport);
});
onBeforeUnmount(() => {
  pseudoLayerStore.dispose();
  store.dispose();
  window.parent.removeEventListener('resize', updateViewport);
});
</script>

<style lang="scss" scoped>
.cultivation-status {
  width: 100%;
  height: var(--stage-height);
  min-height: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  color: var(--text-primary);
  isolation: isolate;
  background: var(--stage-canvas);
  box-shadow: 0 20px 60px var(--stage-shadow);
  transition: height 0.22s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  font-size: 13px;
}

.cultivation-status.map-expanded { box-shadow: 0 24px 72px var(--stage-shadow); }

.stage-backdrop,
.pattern-overlay,
.ambient-overlay,
.frame-overlay {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.stage-backdrop { background: var(--stage-material); transition: background 0.28s ease; }
.pattern-overlay { background: var(--grain-material); opacity: 0.7; mix-blend-mode: soft-light; }
.ambient-overlay {
  background: var(--ambient-material);
  background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%;
  opacity: 0.8;
  animation: ambient-drift 12s ease-in-out infinite alternate;
}
.frame-overlay {
  inset: 5px;
  border: 1px solid color-mix(in srgb, var(--line-strong) 58%, transparent);
  border-radius: 5px;
  background: var(--frame-material);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--line-subtle) 48%, transparent);
}
.frame-overlay::before,
.frame-overlay::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border-color: var(--gold-soft);
  opacity: 0.44;
}
.frame-overlay::before { top: 5px; left: 5px; border-top: 1px solid; border-left: 1px solid; }
.frame-overlay::after { right: 5px; bottom: 5px; border-right: 1px solid; border-bottom: 1px solid; }

.cultivation-status > :where(.stage-header, .stage-main, .tab-nav, .footer, .command-dock) {
  position: relative;
  z-index: 1;
}
.stage-main { min-height: 0; flex: 1; display: flex; }
.stage-viewport {
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
  transition: background 0.25s ease;
}
.stage-viewport.reading-mode { overflow: hidden; }
.stage-viewport > :deep(.panel) { min-height: 100%; padding: clamp(14px, 2vw, 24px); background: transparent; }
.stage-viewport > :deep(.panel > section), .stage-viewport > :deep(.panel > div) { border-color: var(--line-subtle); }
.stage-viewport > :deep(*:not(.story-reader, .panel)) { color-scheme: dark; }
.light-theme .stage-viewport > :deep(*:not(.story-reader, .panel)) { color-scheme: light; }
.full-map-panel { height: 100%; min-height: 0; padding: 0 !important; display: flex; flex-direction: column; }
.tribulation-panel { padding: 0 !important; }

.stage-viewport :deep(.section-title),
.stage-viewport :deep(.panel-title),
.stage-viewport :deep(.section-header),
.stage-viewport :deep(.panel-header) {
  color: var(--text-accent);
  border-color: var(--line-subtle);
}
.stage-viewport :deep(.section-title i),
.stage-viewport :deep(.panel-title i),
.stage-viewport :deep(.section-header i),
.stage-viewport :deep(.panel-header i) { color: var(--gold); }
.stage-viewport :deep(.empty-hint),
.stage-viewport :deep(.empty-state),
.stage-viewport :deep(.no-data) { color: var(--text-secondary); }
.stage-viewport :deep(.progress-bar),
.stage-viewport :deep(.progress-track) { background: var(--progress-bg); }

.cultivation-status[data-view='cultivation'],
.cultivation-status[data-view='skills'] { --view-accent: var(--jade); }
.cultivation-status[data-view='dialogue'] { --view-accent: var(--jade); }
.cultivation-status[data-view='inventory'],
.cultivation-status[data-view='map'] { --view-accent: var(--gold); }
.cultivation-status[data-view='companions'],
.cultivation-status[data-view='gallery'] { --view-accent: var(--semantic-relation); }
.cultivation-status[data-view='tribulation'] { --view-accent: var(--semantic-danger); }
.cultivation-status[data-view='trace'],
.cultivation-status[data-view='actions'] { --view-accent: var(--semantic-info); }

.cultivation-status:not([data-view='story']):not([data-view='dialogue']) .stage-viewport::before {
  content: '';
  position: sticky;
  top: 0;
  z-index: 8;
  display: block;
  width: 100%;
  height: 2px;
  margin-bottom: -2px;
  background: linear-gradient(90deg, transparent, var(--view-accent, var(--gold)) 22% 78%, transparent);
  opacity: 0.38;
  pointer-events: none;
}

.cultivation-status[data-theme='lantern'] .frame-overlay {
  background:
    linear-gradient(90deg, var(--line-subtle) 1px, transparent 1px) 18px 18px / 46px 46px,
    linear-gradient(var(--line-subtle) 1px, transparent 1px) 18px 18px / 46px 46px,
    var(--frame-material);
  border: 3px double color-mix(in srgb, var(--gold) 56%, transparent);
  border-radius: 2px;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.72),
    inset 0 0 34px rgba(0, 0, 0, 0.34),
    0 0 18px color-mix(in srgb, var(--gold) 8%, transparent);
  opacity: 0.82;
}
.cultivation-status[data-theme='lantern'] .stage-backdrop {
  background:
    var(--theme-art) center / cover no-repeat,
    var(--stage-material);
}
.cultivation-status[data-theme='lantern'] { border-radius: 2px; border-color: color-mix(in srgb, var(--gold) 55%, #15262d); }
.cultivation-status[data-theme='lantern'] .stage-main {
  margin: 7px 9px 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--gold) 36%, transparent);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.36), inset 0 0 0 1px rgba(0, 0, 0, 0.52);
}
.cultivation-status[data-theme='lantern'] :deep(.stage-header) {
  margin: 8px 9px 0;
  border: 1px solid color-mix(in srgb, var(--gold) 34%, transparent);
  border-bottom-color: color-mix(in srgb, var(--gold) 58%, transparent);
  border-radius: 1px 1px 0 0;
}
.cultivation-status[data-theme='lantern'] :deep(.stage-header)::before {
  background:
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 16%, transparent) 18%, transparent 35% 65%, color-mix(in srgb, var(--gold) 14%, transparent) 82%, transparent),
    repeating-linear-gradient(90deg, transparent 0 40px, color-mix(in srgb, var(--gold) 12%, transparent) 41px, transparent 42px),
    repeating-linear-gradient(0deg, transparent 0 22px, color-mix(in srgb, var(--gold) 7%, transparent) 23px, transparent 24px),
    var(--grain-material);
}
.cultivation-status[data-theme='lantern'] :deep(.story-reader) {
  box-shadow: inset 0 0 90px rgba(0, 0, 0, 0.28), inset 0 -30px 80px rgba(8, 64, 76, 0.12);
}
.cultivation-status[data-theme='lantern'] :deep(.story-reader)::before {
  background: var(--reading-material);
  opacity: 1;
}
.cultivation-status[data-theme='lantern'] :deep(.story-scroll) {
  background:
    linear-gradient(90deg, rgba(2, 15, 23, 0.15), rgba(2, 15, 23, 0.48) 20% 80%, rgba(2, 15, 23, 0.16)),
    linear-gradient(180deg, rgba(2, 15, 23, 0.34), rgba(2, 15, 23, 0.55)),
    var(--theme-art) center bottom / cover no-repeat;
}
.cultivation-status[data-theme='lantern'] .stage-viewport { background: rgba(2, 16, 24, 0.7); }
.cultivation-status[data-theme='lantern'] :deep(.portrait-rail) {
  margin: 8px;
  border: 3px double color-mix(in srgb, var(--gold) 42%, transparent);
  background-color: rgba(2, 13, 19, 0.76);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.72), 0 12px 34px rgba(0, 0, 0, 0.38);
}
.cultivation-status[data-theme='lantern'] :deep(.portrait-stage) {
  border-radius: 1px;
  border-color: color-mix(in srgb, var(--gold) 45%, transparent);
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.58), inset 0 0 0 1px color-mix(in srgb, var(--gold) 16%, transparent);
}
.cultivation-status[data-theme='lantern'] :deep(.tab-nav),
.cultivation-status[data-theme='lantern'] :deep(.footer),
.cultivation-status[data-theme='lantern'] :deep(.command-dock) {
  margin-right: 9px;
  margin-left: 9px;
  border-right: 1px solid color-mix(in srgb, var(--gold) 24%, transparent);
  border-left: 1px solid color-mix(in srgb, var(--gold) 24%, transparent);
}
.cultivation-status[data-theme='lantern'] :deep(.command-dock) { margin-bottom: 8px; border-bottom: 1px solid color-mix(in srgb, var(--gold) 35%, transparent); }
.cultivation-status[data-theme='lantern'] :deep(.tab-btn.active) {
  border-color: color-mix(in srgb, var(--gold) 26%, transparent);
  box-shadow: inset 0 8px 20px color-mix(in srgb, var(--gold) 11%, transparent), 0 0 14px color-mix(in srgb, var(--gold) 5%, transparent);
}
.cultivation-status[data-theme='lantern'] :deep(.primary-command:not(.stop)) {
  box-shadow: inset 0 0 14px color-mix(in srgb, var(--gold) 10%, transparent), 0 0 12px color-mix(in srgb, var(--gold) 6%, transparent);
}
.cultivation-status[data-theme='duskInk'] .stage-backdrop {
  background:
    var(--theme-art) center / cover no-repeat,
    var(--stage-material);
}
.cultivation-status[data-theme='duskInk'] .frame-overlay { border-style: double; border-width: 4px; opacity: 0.82; box-shadow: inset 0 0 50px rgba(11, 24, 23, 0.24); }
.cultivation-status[data-theme='duskInk'] :deep(.story-reader)::after { left: 18px; width: 2px; opacity: 0.34; }
.cultivation-status[data-theme='duskInk'] :deep(.story-reader)::before {
  background:
    var(--reading-material),
    var(--theme-art) center bottom / 100% 100% no-repeat;
}
.cultivation-status[data-theme='duskInk'] :deep(.story-scroll) {
  background:
    radial-gradient(circle at 7% 74%, rgba(242, 183, 86, 0.36) 0 2px, transparent 24px),
    radial-gradient(circle at 93% 68%, rgba(242, 183, 86, 0.3) 0 2px, transparent 22px),
    linear-gradient(180deg, rgba(25, 49, 51, 0.25), rgba(12, 34, 38, 0.42)),
    var(--theme-art) center bottom / cover no-repeat;
}
.cultivation-status[data-theme='duskInk'] .stage-viewport { background: rgba(22, 44, 46, 0.72); }
.cultivation-status[data-theme='duskInk'] :deep(.stage-header) { box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--gold) 14%, transparent), 0 8px 26px var(--stage-shadow); }
.cultivation-status[data-theme='shanhai'] {
  border: 3px solid color-mix(in srgb, var(--jade) 82%, #132d2d);
  border-radius: 1px;
  box-shadow:
    0 18px 48px var(--stage-shadow),
    inset 0 0 0 2px color-mix(in srgb, var(--gold) 24%, transparent),
    inset 0 0 0 6px color-mix(in srgb, var(--jade) 12%, transparent);
}
.cultivation-status[data-theme='shanhai'] .stage-backdrop {
  background:
    var(--theme-art) center / cover no-repeat,
    var(--stage-material);
}
.cultivation-status[data-theme='shanhai'] .frame-overlay {
  inset: 7px;
  border: 4px double color-mix(in srgb, var(--jade) 74%, transparent);
  border-radius: 0;
  opacity: 0.74;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--gold) 20%, transparent), inset 0 0 42px rgba(35, 52, 47, 0.14);
}
.cultivation-status[data-theme='shanhai'] .frame-overlay::before,
.cultivation-status[data-theme='shanhai'] .frame-overlay::after {
  width: 42px;
  height: 42px;
  border-width: 6px;
  opacity: 0.88;
}
.cultivation-status[data-theme='shanhai'] .frame-overlay::before { border-top: 6px double; border-left: 6px double; }
.cultivation-status[data-theme='shanhai'] .frame-overlay::after { border-right: 6px double; border-bottom: 6px double; }
.cultivation-status[data-theme='shanhai'] .stage-main {
  margin: 8px 10px 0;
  overflow: hidden;
  border: 2px solid var(--line-strong);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--gold) 17%, transparent), 0 8px 20px rgba(35, 50, 46, 0.16);
}
.cultivation-status[data-theme='shanhai'] :deep(.story-copy) { text-shadow: none; }
.cultivation-status[data-theme='shanhai'] :deep(.stage-header),
.cultivation-status[data-theme='shanhai'] :deep(.tab-nav),
.cultivation-status[data-theme='shanhai'] :deep(.footer),
.cultivation-status[data-theme='shanhai'] :deep(.command-dock) { backdrop-filter: saturate(0.74) blur(3px); }
.cultivation-status[data-theme='shanhai'] :deep(.stage-header) {
  margin: 9px 10px 0;
  border: 2px solid var(--line-strong);
  border-radius: 0;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--gold) 13%, transparent), 0 5px 12px rgba(31, 48, 44, 0.16);
}
.cultivation-status[data-theme='shanhai'] :deep(.stage-header)::before {
  background:
    radial-gradient(ellipse at 6% 100%, rgba(38, 78, 72, 0.19) 0 9%, transparent 20%),
    radial-gradient(ellipse at 94% 0%, rgba(40, 76, 70, 0.14) 0 8%, transparent 18%),
    var(--grain-material);
}
.cultivation-status[data-theme='shanhai'] :deep(.story-reader) {
  box-shadow: inset 0 0 70px rgba(72, 64, 45, 0.1), inset 0 0 0 1px rgba(255, 250, 229, 0.2);
}
.cultivation-status[data-theme='shanhai'] :deep(.story-reader)::before {
  background:
    var(--reading-material),
    var(--theme-art) center bottom / cover no-repeat;
  opacity: 1;
}
.cultivation-status[data-theme='shanhai'] :deep(.story-reader)::after {
  left: 18px;
  width: 2px;
  background: linear-gradient(transparent, var(--jade) 13%, var(--line-strong) 82%, transparent);
  opacity: 0.72;
}
.cultivation-status[data-theme='shanhai'] :deep(.story-scroll) {
  background:
    repeating-linear-gradient(2deg, transparent 0 5px, rgba(57, 66, 57, 0.025) 6px),
    repeating-linear-gradient(88deg, transparent 0 7px, rgba(84, 66, 43, 0.018) 8px),
    linear-gradient(rgba(216, 206, 181, 0.46), rgba(196, 191, 170, 0.5)),
    linear-gradient(90deg, rgba(35, 79, 74, 0.07), transparent 12%, transparent 88%, rgba(35, 79, 74, 0.07)),
    var(--theme-art) center bottom / cover no-repeat;
  background-position: 0 0, 0 0, 0 0, 0 0, center bottom;
  background-repeat: repeat, repeat, no-repeat, no-repeat, no-repeat;
  background-size: auto, auto, auto, auto, 100% 68%;
}
.cultivation-status[data-theme='shanhai'] .stage-viewport { background: rgba(198, 192, 170, 0.7); }
.cultivation-status[data-theme='shanhai'] :deep(.story-scroll)::after {
  content: '';
  position: sticky;
  bottom: -48px;
  display: block;
  height: 66px;
  margin: 0 -4vw -48px;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 9% 100%, rgba(35, 76, 70, 0.28) 0 9%, transparent 10%),
    radial-gradient(ellipse at 18% 105%, rgba(48, 83, 70, 0.2) 0 12%, transparent 13%),
    radial-gradient(ellipse at 86% 108%, rgba(45, 78, 68, 0.16) 0 13%, transparent 14%);
  opacity: 0.74;
}
.cultivation-status[data-theme='shanhai'] :deep(.portrait-rail) {
  margin: 8px;
  padding: 12px;
  border: 3px double var(--line-strong);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 82%, transparent), color-mix(in srgb, var(--surface-inset) 72%, transparent)),
    var(--theme-art) 78% 50% / auto 100% no-repeat;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--gold) 12%, transparent);
}
.cultivation-status[data-theme='shanhai'] :deep(.portrait-stage) {
  border: 2px solid var(--line-strong);
  border-radius: 0;
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--gold) 13%, transparent), 0 7px 16px rgba(34, 49, 45, 0.2);
}
.cultivation-status[data-theme='shanhai'] :deep(.portrait-caption) {
  color: #f3ead7;
  background: linear-gradient(to top, rgba(24, 49, 48, 0.92), rgba(34, 64, 61, 0.28) 62%, transparent);
}
.cultivation-status[data-theme='shanhai'] :deep(.tab-nav),
.cultivation-status[data-theme='shanhai'] :deep(.footer),
.cultivation-status[data-theme='shanhai'] :deep(.command-dock) {
  margin-right: 10px;
  margin-left: 10px;
  border-right: 2px solid var(--line-strong);
  border-left: 2px solid var(--line-strong);
}
.cultivation-status[data-theme='shanhai'] :deep(.tab-nav) { border-top: 2px solid var(--line-strong); border-bottom: 2px solid var(--line-strong); }
.cultivation-status[data-theme='shanhai'] :deep(.tab-btn) { border-radius: 0; }
.cultivation-status[data-theme='shanhai'] :deep(.tab-btn.active) { border-right-color: var(--line-strong); border-left-color: var(--line-strong); box-shadow: inset 0 0 18px color-mix(in srgb, var(--jade) 9%, transparent); }
.cultivation-status[data-theme='shanhai'] :deep(.command-dock) { margin-bottom: 9px; border-bottom: 2px solid var(--line-strong); }
.cultivation-status[data-theme='shanhai'] :deep(textarea),
.cultivation-status[data-theme='shanhai'] :deep(.primary-command),
.cultivation-status[data-theme='shanhai'] :deep(.native-input-command) { border-radius: 1px; border-width: 2px; }
.cultivation-status[data-theme='shanhai'] :deep(textarea::-webkit-scrollbar-button) { display: none; }
.cultivation-status[data-theme='starAltar'] .frame-overlay {
  background:
    radial-gradient(circle at 28px 28px, transparent 0 11px, color-mix(in srgb, var(--jade) 44%, transparent) 12px 13px, transparent 14px 24px, color-mix(in srgb, var(--gold) 18%, transparent) 25px 26px, transparent 27px),
    radial-gradient(circle at calc(100% - 28px) calc(100% - 28px), transparent 0 11px, color-mix(in srgb, var(--gold) 42%, transparent) 12px 13px, transparent 14px 24px, color-mix(in srgb, var(--jade) 16%, transparent) 25px 26px, transparent 27px),
    var(--frame-material);
  border-width: 2px;
  box-shadow: inset 0 0 42px rgba(0, 5, 11, 0.42), 0 0 18px color-mix(in srgb, var(--jade) 8%, transparent);
}
.cultivation-status[data-theme='starAltar'] .stage-backdrop {
  background:
    var(--theme-art) center / cover no-repeat,
    var(--stage-material);
}
.cultivation-status[data-theme='starAltar'] :deep(.story-reader)::before {
  background: var(--reading-material);
}
.cultivation-status[data-theme='starAltar'] :deep(.story-scroll) {
  background:
    radial-gradient(circle at 82% 18%, rgba(81, 205, 190, 0.07), transparent 24%),
    linear-gradient(90deg, rgba(2, 15, 23, 0.18), rgba(2, 15, 23, 0.48) 22% 78%, rgba(2, 15, 23, 0.2)),
    linear-gradient(180deg, rgba(2, 15, 23, 0.28), rgba(1, 9, 15, 0.46)),
    var(--theme-art) center / cover no-repeat;
}
.cultivation-status[data-theme='starAltar'] .stage-viewport { background: rgba(2, 16, 24, 0.74); }
.cultivation-status[data-theme='starAltar'] :deep(.tab-btn.active i) { filter: drop-shadow(0 0 7px var(--jade)); }
.cultivation-status[data-theme='starAltar'] :deep(.stage-header)::after { width: 140px; background: linear-gradient(90deg, transparent, var(--jade), var(--gold), var(--jade), transparent); }
.cultivation-status[data-theme='starAltar'] :deep(.portrait-stage) { border-color: color-mix(in srgb, var(--jade) 28%, var(--line-subtle)); box-shadow: 0 12px 34px var(--stage-shadow), 0 0 24px color-mix(in srgb, var(--jade) 8%, transparent); }

.cultivation-status.immersive :deep(.stage-header) { border-bottom-color: var(--line-subtle); }
.cultivation-status.reduce-motion, .cultivation-status.reduce-motion :deep(*) { scroll-behavior: auto !important; animation: none !important; transition-duration: 0.01ms !important; }

.cultivation-status[data-theme='lantern'] .ambient-overlay { animation-name: lantern-breathe; }
.cultivation-status[data-theme='duskInk'] .ambient-overlay { animation-name: ink-breathe; }
.cultivation-status[data-theme='shanhai'] .ambient-overlay { opacity: 0.55; animation-name: ink-breathe; }
.cultivation-status[data-theme='starAltar'] .ambient-overlay { animation-name: star-drift; }
.cultivation-status[data-view='map'] .ambient-overlay,
.cultivation-status[data-view='gallery'] .ambient-overlay { opacity: 0.28; }

@keyframes lantern-breathe {
  0% { opacity: 0.58; filter: brightness(0.94); }
  100% { opacity: 0.9; filter: brightness(1.08); }
}
@keyframes ink-breathe {
  0% { opacity: 0.5; transform: translate3d(-0.3%, 0, 0); }
  100% { opacity: 0.76; transform: translate3d(0.3%, -0.25%, 0); }
}
@keyframes star-drift {
  0% { opacity: 0.56; transform: translate3d(0, 0, 0); }
  100% { opacity: 0.88; transform: translate3d(0.2%, -0.35%, 0); }
}

:deep(button:focus-visible), :deep(input:focus-visible), :deep(textarea:focus-visible), :deep(summary:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--focus-ring);
}

@media screen and (max-width: 760px) {
  .cultivation-status { border-radius: 6px; font-size: 12px; }
}
</style>
