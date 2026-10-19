import { getDefaultTheme, getThemeById, isThemeId, themes } from '../themes';
const PREFERENCES_STORAGE_KEY = 'dhl-reading-preferences-v1';
const THEME_STORAGE_KEY = 'dhl-theme-id-v2';
const READING_MODE_STORAGE_KEYS = {
    desktop: 'denghuolanshan:pseudo-layer:reading-mode:desktop',
    mobile: 'denghuolanshan:pseudo-layer:reading-mode:mobile',
};
const LEGACY_THEME_KEYS = ['ui_theme_id', 'dhl-theme-id-v1'];
const DEFAULT_PREFERENCES = {
    fontSize: 16,
    lineHeight: 1.95,
    measure: 'standard',
    measureWidth: 76,
    dialogueColors: {},
    reasoningAppearance: 'auto',
    showPortraitRail: true,
    reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
};
const DEFAULT_READING_MODES = {
    desktop: 'paged',
    mobile: 'scroll',
};
const LEGACY_MEASURE_WIDTH = {
    narrow: 58,
    standard: 76,
    wide: 100,
};
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const sanitizeDialogueColors = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return {};
    return Object.fromEntries(Object.entries(value).filter((entry) => isThemeId(entry[0]) && HEX_COLOR_PATTERN.test(String(entry[1]))));
};
const readStoredReadingMode = (viewport) => {
    try {
        const stored = localStorage.getItem(READING_MODE_STORAGE_KEYS[viewport]);
        if (stored === 'paged' || stored === 'scroll')
            return stored;
    }
    catch (error) {
        console.warn('[灯火阑珊·阅读] 阅读模式读取失败，使用设备默认值', error);
    }
    return DEFAULT_READING_MODES[viewport];
};
const clampPreferences = (value) => {
    const measure = ['narrow', 'standard', 'wide'].includes(String(value.measure))
        ? value.measure
        : DEFAULT_PREFERENCES.measure;
    const storedMeasureWidth = Number(value.measureWidth);
    return {
        fontSize: _.clamp(Number(value.fontSize) || DEFAULT_PREFERENCES.fontSize, 14, 20),
        lineHeight: _.clamp(Number(value.lineHeight) || DEFAULT_PREFERENCES.lineHeight, 1.7, 2.2),
        measure,
        measureWidth: _.clamp(Number.isFinite(storedMeasureWidth) && storedMeasureWidth > 0
            ? storedMeasureWidth
            : LEGACY_MEASURE_WIDTH[measure], 50, 100),
        dialogueColors: sanitizeDialogueColors(value.dialogueColors),
        reasoningAppearance: ['auto', 'preset', 'theme'].includes(String(value.reasoningAppearance))
            ? value.reasoningAppearance
            : DEFAULT_PREFERENCES.reasoningAppearance,
        showPortraitRail: typeof value.showPortraitRail === 'boolean' ? value.showPortraitRail : DEFAULT_PREFERENCES.showPortraitRail,
        reduceMotion: typeof value.reduceMotion === 'boolean' ? value.reduceMotion : DEFAULT_PREFERENCES.reduceMotion,
    };
};
const readStoredTheme = () => {
    try {
        const current = localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemeId(current))
            return current;
        for (const key of LEGACY_THEME_KEYS) {
            const legacy = localStorage.getItem(key);
            if (isThemeId(legacy))
                return legacy;
            if (legacy === 'red')
                return getDefaultTheme().id;
        }
    }
    catch (error) {
        console.warn('[灯火阑珊·外观] 主题设置读取失败，使用默认主题', error);
    }
    return getDefaultTheme().id;
};
export const useThemeStore = defineStore('appearance', () => {
    const currentThemeId = ref(readStoredTheme());
    const currentTheme = computed(() => getThemeById(currentThemeId.value));
    const availableThemes = themes;
    const preferences = ref({ ...DEFAULT_PREFERENCES });
    const readingModes = ref({
        desktop: readStoredReadingMode('desktop'),
        mobile: readStoredReadingMode('mobile'),
    });
    try {
        const saved = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        if (saved)
            preferences.value = clampPreferences(JSON.parse(saved));
    }
    catch (error) {
        console.warn('[灯火阑珊·外观] 阅读设置读取失败，使用默认值', error);
    }
    const savePreferences = () => {
        try {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences.value));
        }
        catch (error) {
            console.warn('[灯火阑珊·外观] 阅读设置保存失败', error);
        }
    };
    const selectTheme = (themeId) => {
        currentThemeId.value = isThemeId(themeId) ? themeId : getDefaultTheme().id;
        try {
            localStorage.setItem(THEME_STORAGE_KEY, currentThemeId.value);
        }
        catch (error) {
            console.warn('[灯火阑珊·外观] 主题设置保存失败', error);
        }
    };
    const updatePreferences = (next) => {
        preferences.value = clampPreferences({ ...preferences.value, ...next });
        savePreferences();
    };
    const currentDialogueColor = computed(() => preferences.value.dialogueColors[currentThemeId.value] ?? currentTheme.value.colors.dialogueText);
    const hasCustomDialogueColor = computed(() => currentThemeId.value in preferences.value.dialogueColors);
    const setDialogueColor = (color) => {
        if (!HEX_COLOR_PATTERN.test(color))
            return;
        updatePreferences({
            dialogueColors: {
                ...preferences.value.dialogueColors,
                [currentThemeId.value]: color.toLowerCase(),
            },
        });
    };
    const resetDialogueColor = () => {
        const dialogueColors = { ...preferences.value.dialogueColors };
        delete dialogueColors[currentThemeId.value];
        updatePreferences({ dialogueColors });
    };
    const resetPreferences = () => {
        preferences.value = { ...DEFAULT_PREFERENCES, dialogueColors: {} };
        savePreferences();
    };
    const setReadingMode = (viewport, mode) => {
        readingModes.value = { ...readingModes.value, [viewport]: mode };
        try {
            localStorage.setItem(READING_MODE_STORAGE_KEYS[viewport], mode);
        }
        catch (error) {
            console.warn('[灯火阑珊·阅读] 阅读模式保存失败', error);
        }
    };
    const resetReadingMode = (viewport) => {
        setReadingMode(viewport, DEFAULT_READING_MODES[viewport]);
    };
    return {
        currentThemeId,
        currentTheme,
        currentDialogueColor,
        hasCustomDialogueColor,
        availableThemes,
        preferences,
        readingModes,
        selectTheme,
        updatePreferences,
        setDialogueColor,
        resetDialogueColor,
        resetPreferences,
        setReadingMode,
        resetReadingMode,
    };
});
