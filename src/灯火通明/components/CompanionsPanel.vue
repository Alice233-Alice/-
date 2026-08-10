<template>
  <div class="panel companions-panel">
    <div v-if="companionNames.length > 0" class="companions-shell">
      <aside class="companion-roster" aria-label="红颜名册">
        <header class="roster-heading">
          <div>
            <span class="roster-kicker">红尘有记</span>
            <strong>情谱名册</strong>
          </div>
          <span class="roster-count">{{ companionNames.length }}</span>
        </header>

        <div class="roster-list" role="listbox" aria-label="选择红颜">
          <button
            v-for="name in companionNames"
            :key="name"
            type="button"
            class="roster-entry"
            :class="{ active: selectedName === name }"
            :aria-selected="selectedName === name"
            role="option"
            @click="selectedName = name"
          >
            <span class="roster-portrait" aria-hidden="true">
              <img v-if="getPortrait(name)" :src="getPortrait(name)" :alt="name" />
              <span v-else>{{ name.slice(0, 1) }}</span>
            </span>
            <span class="roster-copy">
              <span class="roster-name">{{ name }}</span>
              <span class="roster-meta">
                {{ getCompanion(name)?.关系 || '缘分未明' }}
                <template v-if="getCompanion(name)?.关系上下文?.当前情绪">
                  · {{ getCompanion(name)?.关系上下文?.当前情绪 }}
                </template>
              </span>
            </span>
            <span
              class="roster-favor"
              :class="getFavorTone(getCompanion(name)?.好感度)"
              :title="`好感 ${normalizeFavor(getCompanion(name)?.好感度)}`"
            >
              <i class="fa-solid fa-heart"></i>
              {{ normalizeFavor(getCompanion(name)?.好感度) }}
            </span>
          </button>
        </div>
      </aside>

      <article v-if="selectedCompanion" class="companion-dossier">
        <header class="dossier-hero">
          <div class="hero-portrait-wrap">
            <div class="hero-portrait">
              <img v-if="selectedPortrait" :src="selectedPortrait" :alt="`${selectedName}立绘`" />
              <div v-else class="portrait-monogram" aria-hidden="true">{{ selectedName.slice(0, 1) }}</div>
              <div class="portrait-vignette"></div>
              <span class="portrait-seal">情谱</span>
            </div>
          </div>

          <div class="hero-copy">
            <div class="hero-eyebrow">
              <span><i class="fa-solid fa-feather-pointed"></i> 红尘人物志</span>
              <span class="hero-realm" :style="{ color: getRealmColor(selectedCompanion.等级) }">
                {{ getRealmDescription(selectedCompanion.等级, selectedCompanion.境界描述) }}
              </span>
            </div>

            <div class="hero-title-row">
              <div>
                <h2>{{ selectedName }}</h2>
                <p>{{ selectedCompanion.关系上下文?.当前情绪 || '心湖未起波澜' }}</p>
              </div>
              <span class="relation-badge">{{ selectedCompanion.关系 || '缘分未明' }}</span>
            </div>

            <div class="affinity-card">
              <div class="affinity-heading">
                <span><i class="fa-solid fa-heart-pulse"></i> 当前好感</span>
                <strong :class="getFavorTone(selectedCompanion.好感度)">
                  {{ formatFavor(selectedCompanion.好感度) }}
                </strong>
              </div>
              <div
                class="affinity-track"
                role="progressbar"
                aria-label="好感度"
                aria-valuemin="-200"
                aria-valuemax="200"
                :aria-valuenow="normalizeFavor(selectedCompanion.好感度)"
              >
                <span class="affinity-center"></span>
                <span
                  class="affinity-fill"
                  :class="getFavorTone(selectedCompanion.好感度)"
                  :style="getFavorStyle(selectedCompanion.好感度)"
                ></span>
              </div>
              <div class="affinity-scale" aria-hidden="true"><span>-200</span><span>0</span><span>200</span></div>
            </div>

            <div class="dialogue-entry" :class="{ unavailable: interactionDisabled }">
              <div class="dialogue-entry-copy">
                <span class="dialogue-entry-kicker">
                  <i class="fa-solid" :class="dialogueEntry.icon"></i>
                  {{ interactionStatus || dialogueEntry.kicker }}
                </span>
                <strong>{{ dialogueEntry.title }}</strong>
              </div>
              <div class="dialogue-entry-actions">
                <button
                  v-for="target in dialogueTargets"
                  :key="`${target.channel}-${target.targetName}`"
                  type="button"
                  class="dialogue-start"
                  :disabled="interactionDisabled"
                  :title="interactionStatus || (target.channel === 'present' ? '开始当面交谈' : '向她传讯')"
                  @click="startDialogue(target)"
                >
                  <strong>{{ getDialogueButtonLabel(target) }}</strong>
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        <section v-if="hasRelationshipProfile" class="dossier-section heart-section">
          <article v-if="relationshipProfile.impression" class="relationship-impression">
            <span><i class="fa-solid fa-heart"></i> 她眼中的你</span>
            <p :title="relationshipProfile.impression">{{ relationshipProfile.impression }}</p>
          </article>

          <div v-if="relationshipProfile.desire || relationshipProfile.taboo" class="relationship-notes">
            <article v-if="relationshipProfile.desire" class="relationship-note desire-note">
              <span>心愿</span>
              <p :title="relationshipProfile.desire">{{ relationshipProfile.desire }}</p>
            </article>
            <article v-if="relationshipProfile.taboo" class="relationship-note taboo-note">
              <span>避讳</span>
              <p :title="relationshipProfile.taboo">{{ relationshipProfile.taboo }}</p>
            </article>
          </div>

          <article v-if="relationshipProfile.promise" class="relationship-promise">
            <span><i class="fa-solid fa-bookmark"></i> 未竟</span>
            <p :title="relationshipProfile.promise">{{ relationshipProfile.promise }}</p>
          </article>
        </section>

        <section class="dossier-section chronicle-section">
          <div class="section-heading">
            <div>
              <span class="section-kicker">行过方知情重</span>
              <h3><i class="fa-solid fa-book-open"></i> 羁绊纪事</h3>
            </div>
            <span v-if="chronicleEntries.length" class="chronicle-count">近 {{ chronicleEntries.length }} 记</span>
          </div>

          <div v-if="chronicleEntries.length" class="chronicle-timeline">
            <article
              v-for="(entry, index) in chronicleEntries"
              :key="entry.title"
              class="chronicle-entry"
              :class="{ latest: index === 0 }"
            >
              <div class="chronicle-mark" :data-type="entry.type">
                <i class="fa-solid" :class="getChronicleIcon(entry.type)"></i>
              </div>
              <div class="chronicle-copy">
                <header>
                  <div>
                    <span class="chronicle-type">{{ entry.type }}</span>
                    <strong>{{ entry.title }}</strong>
                  </div>
                  <time v-if="entry.timePlace">{{ entry.timePlace }}</time>
                </header>
                <p>{{ entry.summary || '此段往事尚待补记。' }}</p>
              </div>
            </article>
          </div>
          <div v-else class="chronicle-empty">
            <i class="fa-regular fa-bookmark"></i>
            <div>
              <strong>旧页尚白</strong>
              <p>真正改变彼此的相识、护道、承诺与离别，会在此留下痕迹。</p>
            </div>
          </div>
        </section>

        <details class="dossier-archive cultivation-archive">
          <summary>
            <span><i class="fa-solid fa-yin-yang"></i> 修行档案</span>
            <small>{{ getRealmDescription(selectedCompanion.等级, selectedCompanion.境界描述) }}</small>
            <i class="fa-solid fa-chevron-down summary-chevron"></i>
          </summary>
          <div class="archive-content">
            <div class="cultivation-progress">
              <div>
                <span>{{ selectedCompanion.修炼状态?.阶段 || '修炼中' }}</span>
                <strong>{{ selectedCompanion.修为 }} / {{ selectedCompanion.突破阈值 || '—' }}</strong>
              </div>
              <div class="cultivation-track">
                <span :style="{ width: `${getCultivationProgress(selectedCompanion)}%` }"></span>
              </div>
              <p v-if="selectedCompanion.修炼状态?.瓶颈原因">{{ selectedCompanion.修炼状态.瓶颈原因 }}</p>
            </div>

            <dl class="cultivation-grid">
              <div>
                <dt>灵根</dt>
                <dd>{{ selectedCompanion.灵根 || '未知' }}</dd>
              </div>
              <div>
                <dt>体质</dt>
                <dd>{{ selectedCompanion.体质 || '未知' }}</dd>
              </div>
              <div>
                <dt>功法</dt>
                <dd>{{ selectedCompanion.功法 || '无' }}</dd>
              </div>
              <div>
                <dt>本命兵器</dt>
                <dd>{{ selectedCompanion.本命兵器 || '无' }}</dd>
              </div>
            </dl>

            <div class="skill-record">
              <span>神通</span>
              <div v-if="skillNames.length" class="skill-tags">
                <span v-for="skill in skillNames" :key="skill">{{ skill }}</span>
              </div>
              <p v-else>尚无已记录神通</p>
            </div>
          </div>
        </details>

        <details v-if="isCustomCompanion(selectedName)" class="dossier-archive portrait-archive">
          <summary>
            <span><i class="fa-solid fa-image-portrait"></i> 自定义立绘</span>
            <small>正面与背面</small>
            <i class="fa-solid fa-chevron-down summary-chevron"></i>
          </summary>
          <div class="archive-content portrait-settings">
            <p class="portrait-hint">上传的图片只用于此自定义红颜；未设置背面时，图鉴会优先沿用正面图。</p>
            <div class="portrait-grid">
              <div v-for="side in portraitSides" :key="side.key" class="portrait-slot">
                <div class="portrait-preview">
                  <img
                    v-if="getCustomPortrait(selectedName)[side.field]"
                    :src="getCustomPortrait(selectedName)[side.field]"
                    :alt="`${selectedName}${side.label}立绘`"
                  />
                  <span v-else>未上传</span>
                </div>
                <div class="portrait-slot-copy">
                  <strong>{{ side.label }}立绘</strong>
                  <div class="portrait-actions">
                    <label class="portrait-button" :for="`portrait-${side.key}-${selectedName}`">
                      {{ isUploading(selectedName, side.side) ? '上传中…' : `上传${side.label}` }}
                    </label>
                    <button
                      v-if="getCustomPortrait(selectedName)[side.field]"
                      type="button"
                      class="portrait-button ghost"
                      @click="clearPortrait(selectedName, side.side)"
                    >
                      清除
                    </button>
                  </div>
                </div>
                <input
                  :id="`portrait-${side.key}-${selectedName}`"
                  class="portrait-input"
                  type="file"
                  accept="image/*"
                  @change="onPortraitSelected(selectedName, side.side, $event)"
                />
              </div>
            </div>
          </div>
        </details>
      </article>
    </div>

    <div v-else class="companions-empty">
      <span class="empty-moon"><i class="fa-regular fa-heart"></i></span>
      <strong>红尘情谱尚无一页</strong>
      <p>待与谁真正相识，她的名字、心绪与同行往事便会在这里落笔。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCharacterImageCandidates } from '../character-assets';
import { REALM_NAMES, REALM_STAGES, getRealmColor } from '../schema';
import { useDataStore, usePseudoLayerStore } from '../store';
import type { DialogueTarget } from '../store';

type CompanionRecord = Record<string, any>;

const emit = defineEmits<{ (event: 'open-dialogue'): void }>();
const store = useDataStore();
const pseudo = usePseudoLayerStore();
const selectedName = ref('');
const uploadStates = ref<Record<string, { 正面: boolean; 背面: boolean }>>({});

const portraitSides = [
  { key: 'front', field: 'front' as const, side: '正面' as const, label: '正面' },
  { key: 'back', field: 'back' as const, side: '背面' as const, label: '背面' },
] as const;

const CHRONICLE_ICONS: Record<string, string> = {
  相识: 'fa-seedling',
  共患难: 'fa-shield-heart',
  交心: 'fa-comments',
  护道: 'fa-hands-holding-circle',
  承诺: 'fa-knot',
  分歧: 'fa-code-branch',
  定情: 'fa-heart',
  离别: 'fa-person-walking-arrow-right',
  重逢: 'fa-people-arrows-left-right',
  其他: 'fa-feather',
};

const companionNames = computed(() => Object.keys(store.红颜 as Record<string, CompanionRecord>));
const selectedCompanion = computed<CompanionRecord | null>(() => getCompanion(selectedName.value));
const selectedPortrait = computed(() => getPortrait(selectedName.value));
const relationshipProfile = computed(() => {
  const context = selectedCompanion.value?.关系上下文 ?? {};
  return {
    impression: String(context.态度缘由 ?? '').trim(),
    desire: String(context.关系诉求 ?? '').trim(),
    taboo: String(context.相处禁忌 ?? '').trim(),
    promise: String(context.未了约定 ?? '').trim(),
  };
});
const hasRelationshipProfile = computed(() => Object.values(relationshipProfile.value).some(Boolean));
const chronicleEntries = computed(() => {
  const chronicle = selectedCompanion.value?.羁绊纪事 ?? {};
  return Object.entries(chronicle)
    .map(([title, raw]) => {
      const entry = raw as Record<string, unknown>;
      return {
        title,
        type: String(entry?.类型 ?? '其他'),
        summary: String(entry?.摘要 ?? '').trim(),
        timePlace: String(entry?.时地 ?? '').trim(),
      };
    })
    .reverse();
});
const skillNames = computed(() => {
  const skills = selectedCompanion.value?.神通列表 ?? {};
  return Object.entries(skills).map(([name, raw]) => String((raw as Record<string, unknown>)?.名称 ?? name));
});

const interactionDisabled = computed(() => pseudo.isGenerating || !pseudo.isStoryHistoryLatest);
const interactionStatus = computed(() => {
  if (pseudo.isGenerating) return '推演尚未结束';
  if (!pseudo.isStoryHistoryLatest) return '阅览旧章时不可交谈';
  return '';
});

const dialogueTargets = computed<DialogueTarget[]>(() => {
  const canonicalName = selectedName.value;
  if (!canonicalName) return [];
  const sceneCard = getSceneCard(canonicalName);
  if (canonicalName === '虞汐颜') {
    const names = sceneCard ? [sceneCard.frontName || '虞汐', sceneCard.backName || '虞颜'] : ['虞汐', '虞颜'];
    return [...new Set(names)].map(targetName => ({
      targetName,
      canonicalName,
      channel: sceneCard ? 'present' : 'transmission',
    }));
  }

  return [
    {
      targetName: sceneCard?.frontName || canonicalName,
      canonicalName,
      channel: sceneCard ? 'present' : 'transmission',
    },
  ];
});

const dialogueEntry = computed(() => {
  const targets = dialogueTargets.value;
  const hasPresentTarget = targets.some(target => target.channel === 'present');
  const hasSplitTargets = targets.length > 1;

  if (hasSplitTargets) {
    return hasPresentTarget
      ? {
          kicker: '此刻在场 · 双魂',
          title: selectedName.value,
          icon: 'fa-comments',
        }
      : {
          kicker: '此刻不在场 · 双魂',
          title: selectedName.value,
          icon: 'fa-feather-pointed',
        };
  }

  return hasPresentTarget
    ? {
        kicker: '此刻在场',
        title: selectedName.value,
        icon: 'fa-comment-dots',
      }
    : {
        kicker: '此刻不在场',
        title: selectedName.value,
        icon: 'fa-feather-pointed',
      };
});

watch(
  companionNames,
  names => {
    if (names.length === 0) {
      selectedName.value = '';
      return;
    }
    if (!names.includes(selectedName.value)) selectedName.value = names[0] ?? '';
  },
  { immediate: true },
);

function getCompanion(name: string): CompanionRecord | null {
  return ((store.红颜 as Record<string, CompanionRecord>)?.[name] as CompanionRecord | undefined) ?? null;
}

function canonicalize(name: string): string {
  if (name === '虞汐' || name === '虞颜') return '虞汐颜';
  return name;
}

function getSceneCard(name: string) {
  const canonicalName = canonicalize(name);
  return store.galleryCards.find(card => canonicalize(card.name) === canonicalName);
}

function getPortrait(name: string): string {
  if (!name) return '';
  const sceneCard = getSceneCard(name);
  if (sceneCard?.front) return sceneCard.front;

  const custom = getCustomPortrait(name).front;
  if (custom) return custom;

  const preferredSoul = canonicalize(name) === '虞汐颜' ? '虞汐' : undefined;
  return String(getCharacterImageCandidates(canonicalize(name), 'front', preferredSoul)[0] ?? '');
}

function getRealmDescription(levelRaw: unknown, fallbackRaw: unknown): string {
  const fallback = String(fallbackRaw ?? '').trim();
  const level = Number(levelRaw);
  const maxLevel = REALM_NAMES.length * REALM_STAGES.length;
  if (!Number.isFinite(level) || level < 1) return fallback || '练气初期';

  const normalizedLevel = Math.min(Math.floor(level), maxLevel);
  const major = REALM_NAMES[Math.floor((normalizedLevel - 1) / REALM_STAGES.length)];
  const minor = REALM_STAGES[(normalizedLevel - 1) % REALM_STAGES.length];
  return major && minor ? `${major}${minor}` : fallback || '练气初期';
}

function normalizeFavor(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? _.clamp(number, -200, 200) : 0;
}

function formatFavor(value: unknown): string {
  const favor = normalizeFavor(value);
  return favor > 0 ? `+${favor}` : String(favor);
}

function getFavorTone(value: unknown): 'positive' | 'negative' | 'neutral' {
  const favor = normalizeFavor(value);
  return favor > 0 ? 'positive' : favor < 0 ? 'negative' : 'neutral';
}

function getFavorStyle(value: unknown) {
  const favor = normalizeFavor(value);
  const width = Math.abs(favor) / 4;
  return {
    width: `${width}%`,
    left: favor >= 0 ? '50%' : `${50 - width}%`,
  };
}

function getChronicleIcon(type: string): string {
  return CHRONICLE_ICONS[type] ?? CHRONICLE_ICONS.其他;
}

function getCultivationProgress(companion: CompanionRecord): number {
  const cultivation = Number(companion?.修为);
  const threshold = Number(companion?.突破阈值);
  if (!Number.isFinite(cultivation) || !Number.isFinite(threshold) || threshold <= 0) return 0;
  return _.clamp((cultivation / threshold) * 100, 0, 100);
}

function startDialogue(target: DialogueTarget): void {
  if (interactionDisabled.value) return;
  pseudo.beginDialogue(target);
  emit('open-dialogue');
}

function getDialogueButtonLabel(target: DialogueTarget): string {
  if (dialogueTargets.value.length > 1) {
    return target.channel === 'present' ? `与${target.targetName}交谈` : `传讯给${target.targetName}`;
  }
  return target.channel === 'present' ? '与她交谈' : '传讯给她';
}

function isCustomCompanion(name: string): boolean {
  return !!name && !store.isBuiltinCompanionName(name);
}

function getCustomPortrait(name: string): { front: string; back: string } {
  const portraitConfig = (store.红颜角色库 as Record<string, any>)?.[name]?.自定义立绘 ?? {};
  return {
    front: String(portraitConfig?.正面 ?? '').trim(),
    back: String(portraitConfig?.背面 ?? '').trim(),
  };
}

function ensureUploadState(name: string) {
  if (!uploadStates.value[name]) uploadStates.value[name] = { 正面: false, 背面: false };
  return uploadStates.value[name];
}

function isUploading(name: string, side: '正面' | '背面'): boolean {
  return ensureUploadState(name)[side];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

async function onPortraitSelected(name: string, side: '正面' | '背面', event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) return;

  const uploadState = ensureUploadState(name);
  uploadState[side] = true;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const saved = await store.updateCustomCompanionPortrait(name, side, dataUrl);
    if (saved) toastr.success(`${name}的${side}立绘已保存`, '自定义立绘');
  } catch (error) {
    console.error('[踏月寻仙] 读取自定义立绘失败', error);
    toastr.error(`读取${side}立绘失败`, '自定义立绘');
  } finally {
    uploadState[side] = false;
    if (input) input.value = '';
  }
}

async function clearPortrait(name: string, side: '正面' | '背面') {
  const cleared = await store.clearCustomCompanionPortrait(name, side);
  if (cleared) toastr.success(`${name}的${side}立绘已清除`, '自定义立绘');
}
</script>

<style lang="scss" scoped>
.companions-panel {
  --romance: var(--semantic-relation);
  --romance-soft: color-mix(in srgb, var(--romance) 18%, transparent);
  --romance-faint: color-mix(in srgb, var(--romance) 7%, transparent);
  --romance-line: color-mix(in srgb, var(--romance) 28%, var(--line-subtle));

  width: 100%;
  padding: 14px;
  color: var(--text-primary);
}

.companions-shell {
  display: grid;
  grid-template-columns: clamp(190px, 23%, 248px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.companion-roster,
.companion-dossier {
  min-width: 0;
  border: 1px solid var(--line-subtle);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: 0 12px 28px color-mix(in srgb, var(--stage-shadow) 24%, transparent);
}

.companion-roster {
  position: sticky;
  top: 12px;
  border-radius: 9px;
  overflow: hidden;
}

.roster-heading {
  min-height: 62px;
  padding: 11px 12px 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--romance-line);
  background:
    radial-gradient(circle at 95% 8%, var(--romance-soft), transparent 48%),
    color-mix(in srgb, var(--surface-raised) 92%, transparent);
}

.roster-heading > div {
  display: grid;
  gap: 2px;
}
.roster-kicker,
.section-kicker {
  color: var(--text-secondary);
  font-size: 9px;
  letter-spacing: 0.18em;
}
.roster-heading strong {
  color: var(--romance);
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 17px;
  letter-spacing: 0.08em;
}
.roster-count {
  min-width: 28px;
  height: 28px;
  padding: 0 7px;
  display: grid;
  place-items: center;
  border: 1px solid var(--romance-line);
  border-radius: 999px;
  color: var(--romance);
  background: var(--romance-faint);
  font-size: 11px;
}

.roster-list {
  padding: 7px;
  display: grid;
  gap: 5px;
}
.roster-entry {
  min-width: 0;
  width: 100%;
  min-height: 58px;
  padding: 6px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-primary);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}
.roster-entry:hover {
  border-color: var(--romance-line);
  background: var(--romance-faint);
  transform: translateX(2px);
}
.roster-entry.active {
  border-color: color-mix(in srgb, var(--romance) 45%, var(--line-strong));
  background: linear-gradient(90deg, var(--romance-soft), color-mix(in srgb, var(--surface-raised) 84%, transparent));
  box-shadow: inset 3px 0 0 var(--romance);
}
.roster-portrait {
  width: 42px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--romance-line);
  border-radius: 50%;
  color: var(--romance);
  background: linear-gradient(145deg, var(--romance-soft), var(--surface-inset));
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 18px;
}
.roster-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}
.roster-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.roster-name {
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roster-meta {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.roster-favor {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-secondary);
  font-size: 10px;
}
.roster-favor.positive {
  color: var(--romance);
}
.roster-favor.negative {
  color: var(--semantic-info);
}
.roster-favor i {
  font-size: 8px;
}

.companion-dossier {
  border-radius: 11px;
  overflow: hidden;
  background:
    radial-gradient(circle at 92% 2%, var(--romance-soft), transparent 26%),
    color-mix(in srgb, var(--surface) 94%, transparent);
}

.dossier-hero {
  position: relative;
  padding: 18px;
  display: grid;
  grid-template-columns: clamp(172px, 25%, 226px) minmax(0, 1fr);
  gap: 20px;
  overflow: hidden;
  border-bottom: 1px solid var(--romance-line);
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--surface-inset) 90%, transparent), transparent 66%),
    var(--romance-faint);
}
.dossier-hero::after {
  content: '';
  position: absolute;
  right: -46px;
  bottom: -68px;
  width: 180px;
  aspect-ratio: 1;
  border: 1px solid var(--romance-line);
  border-radius: 50%;
  opacity: 0.32;
  box-shadow:
    inset 0 0 0 18px transparent,
    inset 0 0 0 19px var(--romance-line);
  pointer-events: none;
}
.hero-portrait-wrap {
  min-width: 0;
}
.hero-portrait {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--romance) 46%, var(--gold));
  border-radius: 8px 8px 22px 8px;
  background: linear-gradient(155deg, var(--romance-soft), var(--surface-inset));
  box-shadow:
    0 16px 34px color-mix(in srgb, var(--stage-shadow) 48%, transparent),
    inset 0 0 0 3px color-mix(in srgb, var(--surface-raised) 55%, transparent);
}
.hero-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 18%;
}
.portrait-monogram {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: color-mix(in srgb, var(--romance) 76%, var(--gold));
  font-family: 'Songti SC', 'STSong', serif;
  font-size: clamp(44px, 8vw, 84px);
  text-shadow: 0 4px 26px var(--romance-soft);
}
.portrait-vignette {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, color-mix(in srgb, var(--surface-inset) 82%, transparent), transparent 46%);
  pointer-events: none;
}
.portrait-seal {
  position: absolute;
  right: 9px;
  bottom: 10px;
  padding: 4px 5px;
  border: 1px solid color-mix(in srgb, var(--romance) 74%, transparent);
  color: color-mix(in srgb, var(--romance) 84%, var(--text-primary));
  background: color-mix(in srgb, var(--surface-inset) 76%, transparent);
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 9px;
  letter-spacing: 0.14em;
  writing-mode: vertical-rl;
}

.hero-copy {
  position: relative;
  z-index: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.hero-eyebrow,
.hero-title-row,
.affinity-heading,
.section-heading,
.chronicle-copy header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.hero-eyebrow {
  color: var(--text-secondary);
  font-size: 10px;
  letter-spacing: 0.08em;
}
.hero-eyebrow i {
  margin-right: 4px;
  color: var(--romance);
}
.hero-realm {
  font-size: 11px;
  letter-spacing: 0.06em;
}
.hero-title-row {
  align-items: flex-start;
}
.hero-title-row h2 {
  margin: 0;
  color: color-mix(in srgb, var(--text-primary) 76%, var(--romance));
  font-family: 'Songti SC', 'STSong', serif;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 650;
  letter-spacing: 0.14em;
  text-shadow: 0 5px 18px var(--romance-soft);
}
.hero-title-row p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.6;
}
.relation-badge {
  flex: none;
  max-width: 46%;
  padding: 6px 10px;
  border: 1px solid var(--romance-line);
  border-radius: 999px;
  color: var(--romance);
  background: linear-gradient(90deg, var(--romance-soft), transparent);
  font-size: 11px;
  text-align: center;
}

.affinity-card {
  padding: 11px 12px 9px;
  border: 1px solid var(--line-subtle);
  border-radius: 7px;
  background: color-mix(in srgb, var(--surface-inset) 68%, transparent);
}
.affinity-heading {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 10px;
}
.affinity-heading i {
  margin-right: 4px;
  color: var(--romance);
}
.affinity-heading strong {
  font-size: 15px;
}
.affinity-heading strong.positive {
  color: var(--romance);
}
.affinity-heading strong.negative {
  color: var(--semantic-info);
}
.affinity-heading strong.neutral {
  color: var(--text-secondary);
}
.affinity-track {
  position: relative;
  height: 8px;
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  border-radius: 999px;
  background: var(--progress-bg);
}
.affinity-center {
  position: absolute;
  z-index: 2;
  top: -2px;
  bottom: -2px;
  left: 50%;
  width: 1px;
  background: var(--text-secondary);
  opacity: 0.55;
}
.affinity-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  transition:
    width 0.45s ease,
    left 0.45s ease;
}
.affinity-fill.positive {
  background: linear-gradient(90deg, var(--romance), color-mix(in srgb, var(--romance) 56%, var(--gold)));
  box-shadow: 0 0 10px var(--romance-soft);
}
.affinity-fill.negative {
  background: linear-gradient(
    90deg,
    var(--semantic-info),
    color-mix(in srgb, var(--semantic-info) 55%, var(--text-primary))
  );
}
.affinity-scale {
  margin-top: 4px;
  display: flex;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 8px;
  opacity: 0.66;
}

.dialogue-entry {
  margin-top: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 42%);
  gap: 12px;
  align-items: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--gold) 24%, var(--romance-line));
  border-radius: 7px;
  background:
    linear-gradient(100deg, color-mix(in srgb, var(--romance) 10%, var(--surface-inset)), transparent 72%),
    color-mix(in srgb, var(--surface-inset) 62%, transparent);
}
.dialogue-entry.unavailable {
  opacity: 0.56;
}
.dialogue-entry-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.dialogue-entry-kicker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--romance);
  font-size: 9px;
  letter-spacing: 0.12em;
}
.dialogue-entry-copy > strong {
  overflow: hidden;
  color: var(--text-primary);
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dialogue-entry-actions {
  min-width: 0;
  display: grid;
  gap: 6px;
}
.portrait-button {
  min-height: 31px;
  padding: 6px 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--romance-line);
  border-radius: 5px;
  color: color-mix(in srgb, var(--romance) 72%, var(--text-primary));
  background: linear-gradient(180deg, var(--romance-soft), color-mix(in srgb, var(--surface-inset) 54%, transparent));
  font-size: 10px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}
.portrait-button:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--romance) 58%, var(--line-strong));
  background: color-mix(in srgb, var(--romance) 20%, var(--surface-raised));
}
.dialogue-start {
  min-width: 0;
  min-height: 42px;
  padding: 7px 9px 7px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--gold) 40%, var(--romance-line));
  border-radius: 6px;
  color: var(--text-primary);
  background: linear-gradient(135deg, color-mix(in srgb, var(--gold) 13%, var(--surface-raised)), var(--surface-inset));
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}
.dialogue-start strong {
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dialogue-start > i {
  flex: none;
  color: var(--gold);
  font-size: 9px;
  transition: transform 0.18s ease;
}
.dialogue-start:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--gold) 68%, var(--romance));
  background: color-mix(in srgb, var(--gold) 16%, var(--surface-raised));
}
.dialogue-start:hover:not(:disabled) > i {
  transform: translateX(2px);
}
.dialogue-start:disabled {
  cursor: not-allowed;
}

.dossier-section {
  padding: 18px;
  border-bottom: 1px solid var(--line-subtle);
}
.section-heading {
  margin-bottom: 14px;
}
.section-heading > div {
  display: grid;
  gap: 3px;
}
.section-heading h3 {
  margin: 0;
  color: color-mix(in srgb, var(--romance) 70%, var(--text-primary));
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 17px;
  letter-spacing: 0.08em;
}
.section-heading h3 i {
  margin-right: 7px;
  color: var(--romance);
  font-size: 12px;
}
.section-ornament {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--romance-line), transparent);
}

.heart-section {
  display: grid;
  gap: 10px;
}
.relationship-impression {
  min-width: 0;
  padding: 2px 0 12px;
  border-bottom: 1px solid var(--romance-line);
}
.relationship-impression > span,
.relationship-note > span,
.relationship-promise > span {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--romance);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: 0.08em;
}
.relationship-impression > p {
  margin: 7px 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: var(--text-primary);
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}
.relationship-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.relationship-note {
  min-width: 0;
  padding: 9px 11px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  border-left: 2px solid var(--romance-line);
  background: color-mix(in srgb, var(--surface-inset) 45%, transparent);
}
.relationship-note:only-child {
  grid-column: 1 / -1;
}
.relationship-note > span {
  padding-top: 1px;
  white-space: nowrap;
}
.relationship-note > p,
.relationship-promise > p {
  margin: 0;
  color: var(--text-primary);
  font-size: 11px;
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.taboo-note {
  border-left-color: color-mix(in srgb, var(--semantic-warning) 48%, var(--romance-line));
}
.taboo-note > span {
  color: color-mix(in srgb, var(--semantic-warning) 62%, var(--romance));
}
.relationship-promise {
  min-width: 0;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  border: 1px solid color-mix(in srgb, var(--gold) 26%, var(--line-subtle));
  border-radius: 5px;
  background: linear-gradient(
    100deg,
    color-mix(in srgb, var(--gold) 9%, var(--surface-inset)),
    color-mix(in srgb, var(--surface-inset) 48%, transparent)
  );
}
.relationship-promise > span {
  color: var(--gold-soft);
  white-space: nowrap;
}

.chronicle-count {
  padding: 4px 8px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--romance-faint);
  font-size: 9px;
}
.chronicle-timeline {
  position: relative;
  display: grid;
  gap: 0;
}
.chronicle-timeline::before {
  content: '';
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 17px;
  width: 1px;
  background: linear-gradient(var(--romance-line), var(--line-subtle));
}
.chronicle-entry {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px;
  padding-bottom: 12px;
}
.chronicle-entry:last-child {
  padding-bottom: 0;
}
.chronicle-mark {
  z-index: 1;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--romance-line);
  border-radius: 50%;
  color: var(--romance);
  background: var(--surface-raised);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--surface) 92%, transparent);
}
.chronicle-entry.latest .chronicle-mark {
  border-color: color-mix(in srgb, var(--romance) 60%, var(--gold));
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--surface) 92%, transparent),
    0 0 18px var(--romance-soft);
}
.chronicle-copy {
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-inset) 54%, transparent);
}
.chronicle-copy header {
  align-items: flex-start;
}
.chronicle-copy header > div {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.chronicle-copy strong {
  color: var(--text-primary);
  font-size: 12px;
}
.chronicle-type {
  padding: 2px 5px;
  border-radius: 3px;
  color: var(--romance);
  background: var(--romance-faint);
  font-size: 8px;
}
.chronicle-copy time {
  flex: none;
  color: var(--text-secondary);
  font-size: 9px;
}
.chronicle-copy p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.chronicle-empty {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--romance-line);
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--romance-faint);
}
.chronicle-empty > i {
  color: var(--romance);
  font-size: 20px;
}
.chronicle-empty strong {
  color: color-mix(in srgb, var(--romance) 68%, var(--text-primary));
  font-size: 12px;
}
.chronicle-empty p {
  margin: 3px 0 0;
  font-size: 10px;
  line-height: 1.6;
}

.dossier-archive {
  border-bottom: 1px solid var(--line-subtle);
  background: color-mix(in srgb, var(--surface-inset) 32%, transparent);
}
.dossier-archive:last-child {
  border-bottom: 0;
}
.dossier-archive summary {
  min-height: 50px;
  padding: 10px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 16px;
  gap: 10px;
  align-items: center;
  color: var(--text-primary);
  cursor: pointer;
  list-style: none;
}
.dossier-archive summary::-webkit-details-marker {
  display: none;
}
.dossier-archive summary > span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: color-mix(in srgb, var(--romance) 62%, var(--text-primary));
  font-family: 'Songti SC', 'STSong', serif;
  font-weight: 650;
}
.dossier-archive summary > span i {
  color: var(--romance);
}
.dossier-archive summary small {
  color: var(--text-secondary);
}
.summary-chevron {
  color: var(--text-secondary);
  font-size: 9px;
  transition: transform 0.2s ease;
}
.dossier-archive[open] .summary-chevron {
  transform: rotate(180deg);
}
.archive-content {
  padding: 0 18px 18px;
}
.cultivation-progress {
  padding: 11px 12px;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-inset) 58%, transparent);
}
.cultivation-progress > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 10px;
}
.cultivation-progress strong {
  color: var(--gold);
}
.cultivation-track {
  height: 5px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--progress-bg);
}
.cultivation-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--jade), var(--gold));
}
.cultivation-progress p {
  margin: 7px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
}
.cultivation-grid {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.cultivation-grid > div {
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid var(--line-subtle);
  border-radius: 5px;
  background: color-mix(in srgb, var(--surface-raised) 48%, transparent);
}
.cultivation-grid dt {
  margin-bottom: 3px;
  color: var(--text-secondary);
  font-size: 9px;
}
.cultivation-grid dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.skill-record {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
.skill-record > span {
  padding-top: 4px;
  color: var(--text-secondary);
  font-size: 9px;
}
.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.skill-tags span {
  padding: 3px 7px;
  border: 1px solid color-mix(in srgb, var(--jade) 26%, var(--line-subtle));
  border-radius: 999px;
  color: var(--jade);
  background: color-mix(in srgb, var(--jade) 6%, transparent);
  font-size: 9px;
}
.skill-record p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 10px;
}

.portrait-hint {
  margin: 0 0 10px;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.65;
}
.portrait-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.portrait-slot {
  min-width: 0;
  padding: 8px;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  border: 1px solid var(--line-subtle);
  border-radius: 6px;
  background: color-mix(in srgb, var(--surface-inset) 54%, transparent);
}
.portrait-preview {
  width: 72px;
  aspect-ratio: 2 / 3;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px dashed var(--romance-line);
  border-radius: 5px;
  color: var(--text-secondary);
  background: var(--surface-inset);
  font-size: 9px;
}
.portrait-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.portrait-slot-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}
.portrait-slot-copy strong {
  color: var(--text-primary);
  font-size: 11px;
}
.portrait-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.portrait-button {
  min-height: 28px;
  padding: 5px 7px;
  font-size: 9px;
}
.portrait-button.ghost {
  color: var(--text-secondary);
  background: transparent;
}
.portrait-input {
  display: none;
}

.companions-empty {
  min-height: 280px;
  padding: 32px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  border: 1px dashed var(--romance-line);
  border-radius: 10px;
  color: var(--text-secondary);
  background: radial-gradient(circle, var(--romance-soft), transparent 58%);
  text-align: center;
}
.empty-moon {
  width: 58px;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid var(--romance-line);
  border-radius: 50%;
  color: var(--romance);
  background: var(--romance-faint);
  font-size: 22px;
}
.companions-empty strong {
  color: color-mix(in srgb, var(--romance) 66%, var(--text-primary));
  font-family: 'Songti SC', 'STSong', serif;
  font-size: 17px;
}
.companions-empty p {
  max-width: 420px;
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
}

:global(.light-theme) .companions-panel {
  --romance-soft: color-mix(in srgb, var(--romance) 14%, transparent);
  --romance-faint: color-mix(in srgb, var(--romance) 6%, transparent);
}
:global(.light-theme) .hero-portrait {
  box-shadow:
    0 13px 28px color-mix(in srgb, var(--stage-shadow) 32%, transparent),
    inset 0 0 0 3px color-mix(in srgb, var(--surface-raised) 60%, transparent);
}
:global(.reduce-motion) .companions-panel *,
:global(.reduce-motion) .companions-panel *::before,
:global(.reduce-motion) .companions-panel *::after {
  transition-duration: 0.01ms !important;
  animation: none !important;
}

@media screen and (max-width: 760px) {
  .companions-panel {
    padding: 9px;
  }
  .companions-shell {
    grid-template-columns: 1fr;
  }
  .companion-roster {
    position: static;
  }
  .roster-heading {
    min-height: 50px;
  }
  .roster-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .roster-entry:hover {
    transform: none;
  }
  .dossier-hero {
    grid-template-columns: minmax(142px, 31%) minmax(0, 1fr);
    gap: 14px;
    padding: 14px;
  }
  .hero-title-row {
    flex-direction: column;
    gap: 8px;
  }
  .relation-badge {
    max-width: 100%;
  }
  .dialogue-entry {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 480px) {
  .roster-list {
    grid-template-columns: 1fr;
  }
  .roster-entry {
    min-height: 52px;
    grid-template-columns: 38px minmax(0, 1fr) auto;
  }
  .roster-portrait {
    width: 38px;
  }
  .dossier-hero {
    grid-template-columns: 1fr;
  }
  .hero-portrait-wrap {
    display: flex;
    justify-content: center;
  }
  .hero-portrait {
    width: min(210px, 74%);
  }
  .hero-eyebrow {
    align-items: flex-start;
  }
  .hero-title-row {
    align-items: center;
    text-align: center;
  }
  .hero-title-row h2 {
    font-size: 27px;
  }
  .dossier-section {
    padding: 14px;
  }
  .relationship-notes,
  .cultivation-grid,
  .portrait-grid {
    grid-template-columns: 1fr;
  }
  .chronicle-copy header {
    flex-direction: column;
    gap: 4px;
  }
  .dossier-archive summary {
    padding: 10px 14px;
  }
  .archive-content {
    padding: 0 14px 14px;
  }
}
</style>
