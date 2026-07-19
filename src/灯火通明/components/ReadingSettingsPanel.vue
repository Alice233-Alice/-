<template>
  <Transition name="settings-fade">
    <div v-if="visible" class="settings-scrim" @click="$emit('close')">
      <section class="settings-panel" role="dialog" aria-modal="true" aria-label="外观设置" @click.stop>
        <header>
          <div>
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span><strong>外观设置</strong><small>{{ appearance.currentTheme.name }}</small></span>
          </div>
          <button type="button" title="关闭" @click="$emit('close')"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <div class="theme-setting">
          <div class="setting-heading">
            <span>界面主题</span>
            <small>四境随心，一念换景</small>
          </div>
          <div class="theme-grid">
            <button
              v-for="theme in appearance.availableThemes"
              :key="theme.id"
              type="button"
              class="theme-card"
              :class="{ active: appearance.currentThemeId === theme.id, light: theme.mode === 'light' }"
              :style="{
                '--preview-bg': theme.preview.background,
                '--preview-surface': theme.preview.surface,
                '--preview-accent': theme.preview.accent,
              }"
              @click="appearance.selectTheme(theme.id)"
            >
              <span class="theme-preview" aria-hidden="true">
                <i :class="theme.glyph"></i>
                <span class="preview-window"></span>
                <span class="preview-rail"></span>
              </span>
              <span class="theme-copy">
                <strong>{{ theme.name }}</strong>
                <small>{{ theme.description }}</small>
              </span>
              <i v-if="appearance.currentThemeId === theme.id" class="theme-check fa-solid fa-check"></i>
            </button>
          </div>
        </div>

        <div class="reading-settings">
          <div class="setting-heading">
            <span>阅读排版</span>
            <small>只影响正文阅读席</small>
          </div>

          <label class="range-setting">
            <span>正文字号 <output>{{ appearance.preferences.fontSize }}px</output></span>
            <input
              :value="appearance.preferences.fontSize"
              type="range"
              min="14"
              max="20"
              step="1"
              @input="updateNumber('fontSize', $event)"
            />
          </label>

          <label class="range-setting">
            <span>正文行距 <output>{{ appearance.preferences.lineHeight.toFixed(2) }}</output></span>
            <input
              :value="appearance.preferences.lineHeight"
              type="range"
              min="1.7"
              max="2.2"
              step="0.05"
              @input="updateNumber('lineHeight', $event)"
            />
          </label>

          <div class="setting-group">
            <span>阅读宽度</span>
            <div class="segmented-control">
              <button
                v-for="item in measures"
                :key="item.value"
                type="button"
                :class="{ active: appearance.preferences.measure === item.value }"
                @click="appearance.updatePreferences({ measure: item.value })"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <label class="toggle-setting">
            <span><strong>在场立绘</strong><small>正文旁显示当前角色</small></span>
            <input
              :checked="appearance.preferences.showPortraitRail"
              type="checkbox"
              @change="updateBoolean('showPortraitRail', $event)"
            />
          </label>
          <label class="toggle-setting">
            <span><strong>减少动效</strong><small>关闭灯影、雾气与星轨动画</small></span>
            <input
              :checked="appearance.preferences.reduceMotion"
              type="checkbox"
              @change="updateBoolean('reduceMotion', $event)"
            />
          </label>
        </div>

        <footer>
          <button type="button" @click="appearance.resetPreferences">
            <i class="fa-solid fa-rotate-left"></i> 恢复阅读默认值
          </button>
        </footer>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useThemeStore } from '../store';
import type { ReadingMeasure, ReadingPreferences } from '../stores/theme-store';

defineProps<{ visible: boolean }>();
defineEmits<{ (event: 'close'): void }>();
const appearance = useThemeStore();
const measures: Array<{ value: ReadingMeasure; label: string }> = [
  { value: 'narrow', label: '窄' },
  { value: 'standard', label: '标准' },
  { value: 'wide', label: '宽' },
];

const updateNumber = (key: 'fontSize' | 'lineHeight', event: Event) => {
  appearance.updatePreferences({ [key]: Number((event.target as HTMLInputElement).value) });
};
const updateBoolean = (key: keyof Pick<ReadingPreferences, 'showPortraitRail' | 'reduceMotion'>, event: Event) => {
  appearance.updatePreferences({ [key]: (event.target as HTMLInputElement).checked });
};
</script>

<style lang="scss" scoped>
.settings-scrim {
  position: fixed;
  inset: 0;
  z-index: 9000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(2, 7, 10, 0.74);
  backdrop-filter: blur(8px);
}

.settings-panel {
  width: min(94vw, 720px);
  max-height: min(90dvh, 820px);
  overflow: auto;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-raised);
  box-shadow: 0 28px 70px var(--stage-shadow);
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}

.settings-panel > header {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: 58px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line-subtle);
  background: var(--header-bg);
  backdrop-filter: blur(12px);
}

.settings-panel > header > div { display: flex; align-items: center; gap: 10px; color: var(--gold); }
.settings-panel > header > div > span { display: grid; gap: 2px; }
.settings-panel > header small { color: var(--text-secondary); font-size: 10px; font-weight: 400; }
.settings-panel header button { width: 32px; height: 32px; border: 1px solid var(--line-subtle); border-radius: 5px; color: var(--text-secondary); background: var(--surface-inset); cursor: pointer; }

.theme-setting, .reading-settings { padding: 16px 18px; border-bottom: 1px solid var(--line-subtle); }
.setting-heading { margin-bottom: 12px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.setting-heading > span { color: var(--text-accent); font-weight: 700; }
.setting-heading small { color: var(--text-secondary); font-size: 10px; }

.theme-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.theme-card {
  position: relative;
  min-width: 0;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 9px;
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  border-radius: 7px;
  color: var(--text-primary);
  background: var(--surface-inset);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}
.theme-card:hover { transform: translateY(-1px); border-color: var(--line-strong); }
.theme-card.active { border-color: var(--preview-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--preview-accent) 25%, transparent), 0 8px 24px var(--stage-shadow); }
.theme-preview { position: relative; height: 66px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--preview-accent) 45%, transparent); border-radius: 5px; background: var(--preview-bg); }
.theme-preview > i { position: absolute; top: 8px; left: 9px; z-index: 2; color: var(--preview-accent); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--preview-accent) 45%, transparent)); }
.preview-window { position: absolute; inset: 20px 30px 8px 8px; border: 1px solid color-mix(in srgb, var(--preview-accent) 45%, transparent); background: var(--preview-surface); }
.preview-rail { position: absolute; top: 20px; right: 8px; bottom: 8px; width: 17px; border: 1px solid color-mix(in srgb, var(--preview-accent) 38%, transparent); background: color-mix(in srgb, var(--preview-surface) 88%, transparent); }
.theme-copy { min-width: 0; display: grid; gap: 4px; }
.theme-copy strong { color: var(--text-accent); }
.theme-copy small { display: -webkit-box; overflow: hidden; color: var(--text-secondary); font-size: 10px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
.theme-check { position: absolute; top: 8px; right: 8px; color: var(--preview-accent); font-size: 10px; }

.reading-settings { padding-bottom: 4px; }
.range-setting, .setting-group, .toggle-setting { padding: 12px 0; border-bottom: 1px solid var(--line-subtle); }
.range-setting { display: grid; gap: 9px; }
.range-setting > span { display: flex; justify-content: space-between; color: var(--text-accent); }
.range-setting output { color: var(--gold); font-variant-numeric: tabular-nums; }
.range-setting input { width: 100%; accent-color: var(--gold); }
.setting-group { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--text-accent); }
.segmented-control { display: flex; padding: 2px; border: 1px solid var(--line-subtle); border-radius: 6px; background: var(--surface-inset); }
.segmented-control button { min-width: 48px; padding: 6px 10px; border: 0; border-radius: 4px; color: var(--text-secondary); background: transparent; cursor: pointer; }
.segmented-control button.active { color: var(--gold); background: var(--button-active); }
.toggle-setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; cursor: pointer; }
.toggle-setting > span { display: grid; gap: 2px; }
.toggle-setting small { color: var(--text-secondary); }
.toggle-setting input { width: 18px; height: 18px; accent-color: var(--jade); }
.settings-panel footer { padding: 12px 18px; display: flex; justify-content: flex-end; }
.settings-panel footer button { padding: 7px 10px; border: 1px solid var(--line-subtle); border-radius: 5px; color: var(--text-secondary); background: var(--surface-inset); cursor: pointer; }
.settings-fade-enter-active, .settings-fade-leave-active { transition: opacity 0.18s ease; }
.settings-fade-enter-from, .settings-fade-leave-to { opacity: 0; }

@media screen and (max-width: 620px) {
  .settings-scrim { padding: 8px; }
  .settings-panel { width: calc(100vw - 16px); max-height: calc(100dvh - 16px); }
  .theme-setting, .reading-settings { padding: 14px 12px; }
  .theme-grid { grid-template-columns: 1fr; }
  .theme-card { grid-template-columns: 82px minmax(0, 1fr); }
}
</style>
