<template>
  <Transition name="greeting-index-fade">
    <div
      v-if="visible"
      ref="scrim"
      class="greeting-index-scrim"
      role="presentation"
      tabindex="-1"
      @click.self="$emit('close')"
      @keydown.esc="$emit('close')"
    >
      <section class="greeting-index-dialog" role="dialog" aria-modal="true" aria-labelledby="greeting-index-title">
        <header>
          <div class="dialog-heading">
            <span class="heading-mark"><i class="fa-solid fa-list-ol"></i></span>
            <span>
              <strong id="greeting-index-title">开场白索引</strong>
              <small>{{ items.length > 0 ? `${items.length} 个开局 · 点击即切换` : '读取当前角色开场白' }}</small>
            </span>
          </div>
          <button class="close-button" type="button" title="关闭" @click="$emit('close')">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <label v-if="items.length > 6" class="greeting-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input v-model.trim="query" type="search" placeholder="搜索标题或内容…" />
          <span>{{ filteredItems.length }}/{{ items.length }}</span>
        </label>

        <div v-if="filteredItems.length > 0" class="greeting-list">
          <button
            v-for="item in filteredItems"
            :key="item.index"
            type="button"
            class="greeting-row"
            :class="{ current: currentIndex === item.index, busy: selectingIndex === item.index }"
            :disabled="selectingIndex !== null"
            @click="selectItem(item)"
          >
            <span class="greeting-number">{{ item.index }}</span>
            <span class="greeting-copy">
              <span class="greeting-title">
                <strong>{{ item.title }}</strong>
                <small v-if="currentIndex === item.index">当前</small>
              </span>
              <span class="greeting-preview">{{ item.preview || '（此开场白没有可预览文本）' }}</span>
            </span>
            <i
              class="row-action fa-solid"
              :class="selectingIndex === item.index ? 'fa-circle-notch fa-spin' : 'fa-chevron-right'"
            ></i>
          </button>
        </div>

        <div v-else class="greeting-empty">
          <i :class="items.length > 0 ? 'fa-solid fa-magnifying-glass' : 'fa-regular fa-bookmark'"></i>
          <strong>{{ items.length > 0 ? '没有匹配的开场白' : '当前角色没有额外开场白' }}</strong>
          <span>{{ items.length > 0 ? '换个关键词试试' : '第一条消息不计入此处索引' }}</span>
        </div>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { readGreetingIndex, switchGreeting, type GreetingIndexItem } from '../greeting-index';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (event: 'close'): void }>();
const scrim = ref<HTMLElement | null>(null);
const query = ref('');
const items = ref<GreetingIndexItem[]>([]);
const currentIndex = ref<number | null>(null);
const selectingIndex = ref<number | null>(null);

const filteredItems = computed(() => {
  const keyword = query.value.toLocaleLowerCase();
  if (!keyword) return items.value;
  return items.value.filter(item =>
    `${item.index} ${item.title} ${item.preview}`.toLocaleLowerCase().includes(keyword),
  );
});

const refresh = () => {
  const state = readGreetingIndex();
  items.value = state.items;
  currentIndex.value = state.currentIndex;
};

const selectItem = async (item: GreetingIndexItem) => {
  if (selectingIndex.value !== null) return;
  if (currentIndex.value === item.index) {
    emit('close');
    return;
  }

  selectingIndex.value = item.index;
  try {
    const switched = await switchGreeting(item.index);
    if (switched) emit('close');
  } catch (error) {
    console.error('[灯火阑珊·开场白索引] 切换失败', error);
    toastr.error('切换开场白失败，请查看控制台错误。');
  } finally {
    selectingIndex.value = null;
  }
};

watch(
  () => props.visible,
  visible => {
    if (!visible) return;
    query.value = '';
    selectingIndex.value = null;
    refresh();
    nextTick(() => scrim.value?.focus());
  },
);
</script>

<style lang="scss" scoped>
.greeting-index-scrim {
  position: fixed;
  z-index: 9100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 14px;
  outline: 0;
  background: color-mix(in srgb, var(--stage-shadow) 78%, transparent);
  backdrop-filter: blur(7px);
}

.greeting-index-dialog {
  width: min(720px, 100%);
  max-height: calc(100% - 4px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-raised) 97%, transparent);
  box-shadow:
    0 28px 74px var(--stage-shadow),
    inset 0 0 0 1px var(--line-subtle);
}

.greeting-index-dialog > header {
  min-height: 58px;
  padding: 0 14px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--line-subtle);
  background: var(--header-bg);
}

.dialog-heading,
.dialog-heading > span:last-child {
  min-width: 0;
  display: flex;
  align-items: center;
}
.dialog-heading {
  gap: 10px;
}
.dialog-heading > span:last-child {
  align-items: flex-start;
  flex-direction: column;
  gap: 2px;
}
.dialog-heading strong {
  color: var(--text-accent);
  font-size: 15px;
}
.dialog-heading small {
  color: var(--text-secondary);
  font-size: 10px;
}
.heading-mark {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--gold) 38%, var(--line-subtle));
  border-radius: 50%;
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 9%, var(--surface-inset));
}
.close-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--line-subtle);
  border-radius: 5px;
  color: var(--text-secondary);
  background: var(--surface-inset);
  cursor: pointer;
}
.close-button:hover {
  border-color: var(--line-strong);
  color: var(--gold);
}

.greeting-search {
  min-height: 38px;
  margin: 10px 12px 4px;
  padding: 0 11px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--surface-inset);
}
.greeting-search:focus-within {
  border-color: color-mix(in srgb, var(--gold) 54%, var(--line-strong));
}
.greeting-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
}
.greeting-search input::placeholder {
  color: var(--text-secondary);
}
.greeting-search span {
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.greeting-list {
  min-height: 0;
  padding: 8px 12px 12px;
  display: grid;
  gap: 6px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-color: var(--line-strong) transparent;
  scrollbar-width: thin;
}
.greeting-row {
  width: 100%;
  min-height: 62px;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-inset) 80%, transparent);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background 120ms ease,
    transform 120ms ease;
}
.greeting-row:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--button-hover);
  transform: translateX(2px);
}
.greeting-row.current {
  border-color: color-mix(in srgb, var(--jade) 46%, var(--line-strong));
  background: color-mix(in srgb, var(--jade) 8%, var(--surface-inset));
}
.greeting-row:disabled {
  cursor: wait;
}
.greeting-row:disabled:not(.busy) {
  opacity: 0.5;
}
.greeting-number {
  width: 32px;
  height: 25px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--gold) 34%, var(--line-subtle));
  border-radius: 999px;
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 8%, transparent);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.greeting-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.greeting-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
}
.greeting-title strong {
  min-width: 0;
  overflow: hidden;
  color: var(--text-accent);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.greeting-title small {
  padding: 1px 5px;
  flex: 0 0 auto;
  border-radius: 999px;
  color: var(--jade);
  background: color-mix(in srgb, var(--jade) 12%, transparent);
  font-size: 9px;
}
.greeting-preview {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-action {
  color: var(--text-secondary);
  font-size: 10px;
}
.greeting-row:hover .row-action,
.greeting-row.current .row-action {
  color: var(--gold);
}

.greeting-empty {
  min-height: 190px;
  padding: 26px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: var(--text-secondary);
  text-align: center;
}
.greeting-empty > i {
  margin-bottom: 4px;
  color: var(--gold);
  font-size: 26px;
  opacity: 0.72;
}
.greeting-empty strong {
  color: var(--text-accent);
}
.greeting-empty span {
  font-size: 10px;
}

.greeting-index-fade-enter-active,
.greeting-index-fade-leave-active {
  transition: opacity 160ms ease;
}
.greeting-index-fade-enter-from,
.greeting-index-fade-leave-to {
  opacity: 0;
}

@media screen and (max-width: 620px) {
  .greeting-index-scrim {
    padding: 8px;
  }
  .greeting-index-dialog {
    max-height: calc(100% - 2px);
  }
  .greeting-index-dialog > header {
    min-height: 52px;
    padding: 0 10px 0 12px;
  }
  .heading-mark {
    display: none;
  }
  .greeting-search {
    margin: 8px 8px 3px;
  }
  .greeting-list {
    padding: 6px 8px 8px;
    gap: 5px;
  }
  .greeting-row {
    min-height: 58px;
    grid-template-columns: 30px minmax(0, 1fr) 12px;
    gap: 8px;
    padding: 7px 8px;
  }
  .greeting-number {
    width: 29px;
  }
}
</style>
