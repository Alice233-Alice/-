<template>
  <div ref="inventoryRoot" class="panel inventory-panel">
    <section class="inventory-section">
      <div class="section-header">
        <div class="section-title"><i class="fa-solid fa-gem"></i> 法宝</div>
        <span class="spirit-stone-tag" title="当前随身灵石">
          <i class="fa-solid fa-gem"></i> 灵石 {{ formatNumber(store.本尊.灵石) }}
        </span>
      </div>
      <div v-if="treasureItems.length > 0" class="items-list">
        <div
          v-for="item in treasureItems"
          :key="item.uid"
          class="item-strip"
          :data-item-name="item.name"
          tabindex="-1"
          :class="`tier-${item.tier}`"
        >
          <div class="item-topline">
            <div class="item-title-group">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-rank">{{ item.rankLabel }}</span>
            </div>
            <span v-if="item.count > 1" class="item-count">×{{ item.count }}</span>
          </div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </div>
      <div v-else class="empty-hint">空空如也</div>
    </section>

    <section class="inventory-section">
      <div class="section-header">
        <div class="section-title"><i class="fa-solid fa-ring"></i> 储物戒</div>
      </div>
      <div v-if="ringItems.length > 0" class="items-list">
        <div
          v-for="item in ringItems"
          :key="item.uid"
          class="item-strip"
          :data-item-name="item.name"
          tabindex="-1"
          :class="`tier-${item.tier}`"
        >
          <div class="item-topline">
            <div class="item-title-group">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-rank">{{ item.rankLabel }}</span>
            </div>
            <span class="item-count">×{{ item.count }}</span>
          </div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </div>
      <div v-else class="empty-hint">空空如也</div>
    </section>

    <section class="inventory-section">
      <div class="section-header">
        <div class="section-title"><i class="fa-solid fa-bag-shopping"></i> 杂物袋</div>
      </div>
      <div v-if="miscItems.length > 0" class="items-list">
        <div
          v-for="item in miscItems"
          :key="item.uid"
          class="item-strip"
          :data-item-name="item.name"
          tabindex="-1"
          :class="`tier-${item.tier}`"
        >
          <div class="item-topline">
            <div class="item-title-group">
              <span class="item-name">{{ item.name }}</span>
              <span class="item-rank">{{ item.rankLabel }}</span>
            </div>
            <span class="item-count">×{{ item.count }}</span>
          </div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </div>
      <div v-else class="empty-hint">空空如也</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useDataStore } from '../store';
import { focusStageElement } from '../affairs';

const props = defineProps<{ focusName?: string; focusNonce?: number }>();
const inventoryRoot = ref<HTMLElement>();

type ItemTier = 'heaven' | 'earth' | 'mystic' | 'yellow' | 'mortal';

interface ParsedInventoryItem {
  uid: string;
  name: string;
  description: string;
  rankLabel: string;
  count: number;
  tier: ItemTier;
}

const store = useDataStore();

function resolveItemTier(rankRaw: string, isTreasure: boolean): ItemTier {
  const text = rankRaw.trim();
  if (/道器|圣|仙|天|先天|神|帝|至尊|极品/u.test(text)) return 'heaven';
  if (/灵宝|法宝|地|上品|珍/u.test(text)) return 'earth';
  if (/灵器|玄|中品/u.test(text)) return 'mystic';
  if (/法器|黄|下品/u.test(text)) return 'yellow';
  return isTreasure ? 'mystic' : 'mortal';
}

function extractSectionItems(
  record: Record<string, any> | undefined,
  category: 'treasure' | 'ring' | 'misc',
): ParsedInventoryItem[] {
  if (!record) return [];
  return Object.entries(record)
    .filter(([key]) => Boolean(key && String(key).trim()))
    .map(([key, raw]) => {
      const name = String(raw?.名称 || key).trim();
      const description = String(raw?.描述 || '暂无描述').trim();
      const rankRaw = String(raw?.品阶 || '凡').trim();
      const count = Math.max(1, Number(raw?.数量 ?? 1) || 1);
      return {
        uid: `${category}:${key}`,
        name,
        description,
        rankLabel: rankRaw || '凡',
        count,
        tier: resolveItemTier(rankRaw, category === 'treasure'),
      };
    });
}

const treasureItems = computed(() => extractSectionItems(store.本尊.法宝, 'treasure'));
const ringItems = computed(() => extractSectionItems(store.本尊.背包, 'ring'));
const miscItems = computed(() => extractSectionItems(store.本尊.杂物袋, 'misc'));
watch(
  [() => props.focusName, () => props.focusNonce],
  async () => {
    if (!props.focusName) return;
    await nextTick();
    focusStageElement(
      Array.from(inventoryRoot.value?.querySelectorAll<HTMLElement>('[data-item-name]') ?? []).find(
        element => element.dataset.itemName === props.focusName,
      ),
    );
  },
  { immediate: true, flush: 'post' },
);

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
}
</script>

<style lang="scss" scoped>
.inventory-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
  color: var(--text-primary);
}

.inventory-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);

  i {
    color: var(--gold);
  }
}

.spirit-stone-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border: 1px solid color-mix(in srgb, var(--gold) 28%, transparent);
  border-radius: 999px;
  color: var(--gold);
  font-size: 12px;
  font-variant-numeric: tabular-nums;

  i {
    font-size: 11px;
  }
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-strip {
  --tier-color: var(--text-secondary);

  padding: 11px 14px;
  border: 1px solid color-mix(in srgb, var(--line-subtle) 55%, transparent);
  border-left: 2px solid color-mix(in srgb, var(--tier-color) 48%, transparent);
  border-radius: 5px;
  background:
    linear-gradient(100deg, color-mix(in srgb, var(--tier-color) 4%, transparent), transparent 44%),
    linear-gradient(90deg, color-mix(in srgb, var(--surface-inset) 24%, transparent), transparent);
  &:focus {
    outline: 1px solid var(--gold);
    outline-offset: 3px;
  }

  &.tier-heaven {
    --tier-color: var(--gold);
  }
  &.tier-earth {
    --tier-color: var(--jade);
  }
  &.tier-mystic {
    --tier-color: var(--semantic-info);
  }
  &.tier-yellow {
    --tier-color: var(--semantic-warning);
  }
  &.tier-mortal {
    --tier-color: var(--text-secondary);
  }
}

.item-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.item-title-group {
  min-width: 0;
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.item-rank {
  padding: 0 5px;
  border-radius: 3px;
  font-size: 11px;
  color: var(--tier-color);
  background: color-mix(in srgb, var(--tier-color) 8%, transparent);
}

.item-count {
  flex: none;
  font-size: 12px;
  color: var(--gold-soft);
  font-variant-numeric: tabular-nums;
}

.item-desc {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.empty-hint {
  padding: 16px 0;
  text-align: center;
  font-size: 12px;
  font-style: italic;
  color: var(--text-secondary);
  opacity: 0.65;
}

@media screen and (max-width: 480px) {
  .inventory-panel {
    gap: 18px;
  }

  .item-strip {
    padding: 9px 12px;
  }

  .item-name {
    font-size: 13px;
  }

  .item-desc {
    font-size: 11.5px;
  }
}
</style>
