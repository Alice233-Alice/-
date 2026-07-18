import { getDefaultTheme, getThemeById, isThemeId, themes, type Theme, type ThemeId } from '../themes';

export type ReadingMeasure = 'narrow' | 'standard' | 'wide';

export interface ReadingPreferences {
  fontSize: number;
  lineHeight: number;
  measure: ReadingMeasure;
  showPortraitRail: boolean;
  reduceMotion: boolean;
}

const PREFERENCES_STORAGE_KEY = 'dhl-reading-preferences-v1';
const THEME_STORAGE_KEY = 'dhl-theme-id-v2';
const LEGACY_THEME_KEYS = ['ui_theme_id', 'dhl-theme-id-v1'];
const DEFAULT_PREFERENCES: ReadingPreferences = {
  fontSize: 16,
  lineHeight: 1.95,
  measure: 'standard',
  showPortraitRail: true,
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
};

const clampPreferences = (value: Partial<ReadingPreferences>): ReadingPreferences => ({
  fontSize: _.clamp(Number(value.fontSize) || DEFAULT_PREFERENCES.fontSize, 14, 20),
  lineHeight: _.clamp(Number(value.lineHeight) || DEFAULT_PREFERENCES.lineHeight, 1.7, 2.2),
  measure: ['narrow', 'standard', 'wide'].includes(String(value.measure))
    ? (value.measure as ReadingMeasure)
    : DEFAULT_PREFERENCES.measure,
  showPortraitRail:
    typeof value.showPortraitRail === 'boolean' ? value.showPortraitRail : DEFAULT_PREFERENCES.showPortraitRail,
  reduceMotion: typeof value.reduceMotion === 'boolean' ? value.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
});

const readStoredTheme = (): ThemeId => {
  try {
    const current = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(current)) return current;

    for (const key of LEGACY_THEME_KEYS) {
      const legacy = localStorage.getItem(key);
      if (isThemeId(legacy)) return legacy;
      if (legacy === 'red') return getDefaultTheme().id;
    }
  } catch (error) {
    console.warn('[灯火阑珊·外观] 主题设置读取失败，使用默认主题', error);
  }
  return getDefaultTheme().id;
};

export const useThemeStore = defineStore('appearance', () => {
  const currentThemeId = ref<ThemeId>(readStoredTheme());
  const currentTheme = computed<Theme>(() => getThemeById(currentThemeId.value));
  const availableThemes = themes;
  const preferences = ref<ReadingPreferences>({ ...DEFAULT_PREFERENCES });

  try {
    const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (saved) preferences.value = clampPreferences(JSON.parse(saved) as Partial<ReadingPreferences>);
  } catch (error) {
    console.warn('[灯火阑珊·外观] 阅读设置读取失败，使用默认值', error);
  }

  const savePreferences = () => {
    try {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences.value));
    } catch (error) {
      console.warn('[灯火阑珊·外观] 阅读设置保存失败', error);
    }
  };

  const selectTheme = (themeId: string) => {
    currentThemeId.value = isThemeId(themeId) ? themeId : getDefaultTheme().id;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentThemeId.value);
    } catch (error) {
      console.warn('[灯火阑珊·外观] 主题设置保存失败', error);
    }
  };

  const updatePreferences = (next: Partial<ReadingPreferences>) => {
    preferences.value = clampPreferences({ ...preferences.value, ...next });
    savePreferences();
  };

  const resetPreferences = () => {
    preferences.value = { ...DEFAULT_PREFERENCES };
    savePreferences();
  };

  return {
    currentThemeId,
    currentTheme,
    availableThemes,
    preferences,
    selectTheme,
    updatePreferences,
    resetPreferences,
  };
});
