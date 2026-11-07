<template>
  <div ref="inventoryRoot" class="panel inventory-panel">
    <section v-for="section in sections" :key="section.key" class="inventory-section">
      <div class="section-header">
        <div class="section-title"><i :class="section.icon"></i> {{ section.title }}</div>
      </div>
      <div v-if="section.items.length" class="items-list">
        <div
          v-for="item in section.items"
          :key="item.uid"
          class="item-strip"
          :data-item-name="item.name"
          tabindex="-1"
          :class="`tier-${item.tier}`"
        >
          <div class="item-topline">
            <div class="item-title-group">
              <span class="item-name">{{ item.name }}</span
              ><span class="item-rank">{{ item.rankLabel }}</span>
            </div>
            <span v-if="section.key !== 'treasure' || item.count > 1" class="item-count">×{{ item.count }}</span>
          </div>
          <div class="item-desc">{{ item.description }}</div>
        </div>
      </div>
      <div v-else class="empty-hint">空空如也</div>
    </section>
    <section class="inventory-section" data-item-name="灵石" tabindex="-1">
      <div class="section-header">
        <div class="section-title"><i class="fa-solid fa-coins"></i> 灵石</div>
        <span class="spirit-stone-tag">折合下品 {{ formatNumber(getSpiritStoneTotal(store.本尊.灵石)) }}</span>
      </div>
      <div class="spirit-stone-grid">
        <div
          v-for="grade in SPIRIT_STONE_GRADES"
          :key="grade"
          class="spirit-stone-balance"
          :data-item-name="grade"
          tabindex="-1"
        >
          <span class="spirit-stone-name">{{ grade }}</span>
          <span class="spirit-stone-count">{{ formatNumber(store.本尊.灵石[grade]) }}<small> 枚</small></span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useDataStore } from '../store';
import { getSpiritStoneTotal, SPIRIT_STONE_GRADES } from '../schema';
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

const sections = computed(() => [
  { key: 'treasure', title: '法宝', icon: 'fa-solid fa-gem', items: extractSectionItems(store.本尊.法宝, 'treasure') },
  { key: 'ring', title: '储物戒', icon: 'fa-solid fa-ring', items: extractSectionItems(store.本尊.背包, 'ring') },
  {
    key: 'misc',
    title: '杂物袋',
    icon: 'fa-solid fa-bag-shopping',
    items: extractSectionItems(store.本尊.杂物袋, 'misc'),
  },
]);
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

.spirit-stone-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.spirit-stone-balance {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 12px;
  border: 1px solid color-mix(in srgb, var(--gold) 22%, transparent);
  border-radius: 5px;

  &:focus {
    outline: 1px solid var(--gold);
    outline-offset: 3px;
  }
}

.spirit-stone-name {
  color: var(--text-secondary);
  font-size: 12px;
}

.spirit-stone-count {
  color: var(--gold);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;

  small {
    color: var(--text-secondary);
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
  .spirit-stone-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
