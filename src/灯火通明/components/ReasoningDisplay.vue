<template>
  <div
    class="reasoning-presentation"
    :class="{ 'is-streaming': streaming }"
    :data-presentation="presentationKind"
  >
    <template v-if="presentationKind === 'preset'">
      <!-- `.mes_text` keeps preset regex CSS such as `.mes_text .custom-*` working inside the iframe. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div ref="presetHost" class="reasoning-preset-host mes_text" v-html="presetHtml"></div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="supplementalHtml" class="reasoning-supplement" v-html="supplementalHtml"></div>
    </template>

    <article v-else-if="presentationKind === 'theme'" class="reasoning-theme-card">
      <div class="reasoning-theme-orbit" aria-hidden="true"></div>
      <header class="reasoning-theme-heading">
        <span class="reasoning-theme-glyph"><i class="fa-solid fa-fire-flame-curved"></i></span>
        <span>
          <small>灵台微明</small>
          <strong>心灯推演</strong>
        </span>
        <span v-if="streaming" class="reasoning-theme-live">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
          推演中
        </span>
        <i class="fa-solid fa-feather-pointed reasoning-theme-mark" aria-hidden="true"></i>
      </header>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="reasoning-theme-copy" v-html="plainHtml"></div>
      <span v-if="streaming" class="reasoning-stream-caret" aria-hidden="true"></span>
    </article>

    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-else class="reasoning-plain-copy" v-html="plainHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { extractInlineReasoning, formatMessageHtml, isRichPresetHtml } from '../message-content';
import { useThemeStore } from '../store';

const props = withDefaults(
  defineProps<{
    text: string;
    rawMessage?: string;
    messageId: number;
    openPresetDisclosure?: boolean;
    streaming?: boolean;
  }>(),
  {
    rawMessage: '',
    openPresetDisclosure: true,
    streaming: false,
  },
);

const appearance = useThemeStore();
const presetHost = ref<HTMLElement | null>(null);
const presetDisclosureOpened = ref(false);
const inlineReasoning = computed(() => extractInlineReasoning(props.rawMessage));
const plainHtml = computed(() => formatMessageHtml(props.text, props.messageId));
const presetHtml = computed(() => {
  const inline = inlineReasoning.value;
  if (!inline?.source || !inline.isComplete) return '';
  return formatMessageHtml(inline.source, props.messageId);
});

const hasPresetPresentation = computed(() => {
  const inline = inlineReasoning.value;
  if (!inline?.source || /<!doctype\s+html|<html(?=[\s>])/i.test(inline.source)) return false;
  return isRichPresetHtml(presetHtml.value);
});

const supplementalText = computed(() => {
  const inlineText = inlineReasoning.value?.text.trim() ?? '';
  const fullText = props.text.trim();
  if (!inlineText || !fullText || inlineText === fullText || inlineText.includes(fullText)) return '';
  if (fullText.includes(inlineText)) return fullText.replace(inlineText, '').trim();
  return fullText;
});
const supplementalHtml = computed(() =>
  hasPresetPresentation.value && supplementalText.value
    ? formatMessageHtml(supplementalText.value, props.messageId)
    : '',
);

const presentationKind = computed<'preset' | 'theme' | 'plain'>(() => {
  const mode = appearance.preferences.reasoningAppearance;
  if (mode === 'theme') return 'theme';
  if (mode === 'preset') return hasPresetPresentation.value ? 'preset' : 'plain';
  return hasPresetPresentation.value ? 'preset' : 'theme';
});

const openPrimaryPresetDisclosure = async () => {
  if (!props.openPresetDisclosure || presentationKind.value !== 'preset' || presetDisclosureOpened.value) return;
  await nextTick();

  // The pseudo layer already has its own "灵台观照" entrance. Open only the
  // preset's first independent disclosure so reading does not require a second
  // click, while any task/log details inside it retain their original state.
  const disclosure = [...(presetHost.value?.querySelectorAll<HTMLDetailsElement>('details') ?? [])].find(
    (item) => !item.parentElement?.closest('details'),
  );
  if (!disclosure) return;
  disclosure.open = true;
  presetDisclosureOpened.value = true;
};

watch(
  presentationKind,
  (kind) => {
    if (kind !== 'preset') {
      presetDisclosureOpened.value = false;
      return;
    }
    void openPrimaryPresetDisclosure();
  },
  { immediate: true, flush: 'post' },
);
</script>

<style lang="scss" scoped>
.reasoning-presentation {
  min-width: 0;
  max-width: 100%;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.reasoning-preset-host {
  min-width: 0;
  max-width: 100%;
}

.reasoning-preset-host :deep(img),
.reasoning-preset-host :deep(video),
.reasoning-preset-host :deep(canvas),
.reasoning-preset-host :deep(svg) {
  max-width: 100%;
}

.reasoning-preset-host :deep(details),
.reasoning-preset-host :deep([class]) {
  max-width: 100%;
  box-sizing: border-box;
}

.reasoning-supplement {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line-subtle);
  color: var(--text-secondary);
  font-size: 0.92em;
}

.reasoning-theme-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background:
    radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--jade) 13%, transparent), transparent 32%),
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--surface-raised) 92%, transparent),
      color-mix(in srgb, var(--surface-inset) 88%, transparent)
    );
  box-shadow:
    0 14px 34px color-mix(in srgb, var(--stage-shadow) 54%, transparent),
    inset 0 0 0 1px color-mix(in srgb, var(--gold) 8%, transparent);
  isolation: isolate;
}

.reasoning-theme-card::before,
.reasoning-theme-card::after {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
}

.reasoning-theme-card::before {
  inset: 0;
  background:
    repeating-linear-gradient(
      90deg,
      transparent 0 44px,
      color-mix(in srgb, var(--gold) 4%, transparent) 45px,
      transparent 46px
    ),
    var(--grain-material);
  opacity: 0.72;
}

.reasoning-theme-card::after {
  right: -36px;
  bottom: -52px;
  width: 156px;
  height: 156px;
  border: 1px solid color-mix(in srgb, var(--jade) 16%, transparent);
  border-radius: 50%;
  box-shadow:
    0 0 0 18px color-mix(in srgb, var(--gold) 4%, transparent),
    0 0 0 38px color-mix(in srgb, var(--jade) 3%, transparent);
}

.reasoning-theme-orbit {
  position: absolute;
  top: 15px;
  right: 18px;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--jade) 28%, transparent);
  border-radius: 50%;
  opacity: 0.7;
  animation: reasoning-orbit 12s linear infinite;
  pointer-events: none;
}

.reasoning-theme-orbit::before {
  content: '';
  position: absolute;
  top: -2px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 9px var(--accent-glow);
}

.reasoning-theme-heading {
  min-height: 52px;
  padding: 10px 54px 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--line-subtle);
  background: linear-gradient(90deg, color-mix(in srgb, var(--button-bg) 76%, transparent), transparent 72%);
}

.reasoning-theme-glyph {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--jade) 42%, transparent);
  border-radius: 50%;
  color: var(--jade);
  background: color-mix(in srgb, var(--surface-inset) 72%, transparent);
  box-shadow: 0 0 16px color-mix(in srgb, var(--jade) 8%, transparent);
}

.reasoning-theme-heading > span:nth-child(2) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.reasoning-theme-heading small {
  color: var(--text-secondary);
  font-size: 9px;
  letter-spacing: 0.2em;
}

.reasoning-theme-heading strong {
  color: var(--text-accent);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.reasoning-theme-mark {
  color: var(--gold-soft);
  opacity: 0.58;
  transform: rotate(-18deg);
}

.reasoning-theme-live {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--jade);
  font-size: 10px;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.reasoning-theme-copy {
  position: relative;
  padding: 16px 18px 18px;
  color: var(--text-primary);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, serif;
  font-size: 13px;
  line-height: 1.85;
}

.reasoning-theme-copy::before {
  content: '';
  position: absolute;
  top: 15px;
  bottom: 17px;
  left: 8px;
  width: 2px;
  border-radius: 999px;
  background: linear-gradient(transparent, var(--jade), var(--gold-soft), transparent);
  opacity: 0.52;
}

.reasoning-theme-copy :deep(p) {
  margin: 0 0 0.9em;
}

.reasoning-theme-copy :deep(p:last-child) {
  margin-bottom: 0;
}

.reasoning-theme-copy :deep(ul),
.reasoning-theme-copy :deep(ol) {
  padding-left: 1.5em;
}

.reasoning-stream-caret {
  position: absolute;
  right: 14px;
  bottom: 13px;
  width: 6px;
  height: 14px;
  border-radius: 2px;
  background: var(--jade);
  box-shadow: 0 0 10px color-mix(in srgb, var(--jade) 50%, transparent);
  animation: reasoning-caret 0.9s steps(1, end) infinite;
}

.reasoning-plain-copy {
  color: var(--text-primary);
  line-height: 1.85;
}

.reasoning-plain-copy :deep(p:first-child) {
  margin-top: 0;
}

.reasoning-plain-copy :deep(p:last-child) {
  margin-bottom: 0;
}

@keyframes reasoning-orbit {
  to {
    transform: rotate(360deg);
  }
}

@keyframes reasoning-caret {
  50% {
    opacity: 0.18;
  }
}

@media screen and (max-width: 760px) {
  .reasoning-theme-card {
    border-radius: 6px;
  }

  .reasoning-theme-heading {
    min-height: 46px;
    padding: 8px 46px 8px 10px;
  }

  .reasoning-theme-glyph {
    width: 28px;
    height: 28px;
  }

  .reasoning-theme-copy {
    padding: 13px 14px 15px;
    font-size: 12px;
    line-height: 1.78;
  }
}
</style>
