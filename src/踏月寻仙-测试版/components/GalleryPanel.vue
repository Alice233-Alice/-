<template>
  <div class="panel gallery-panel">
    <button
      v-if="store.hasGalleryCards"
      type="button"
      class="panel-zoom-trigger"
      :aria-label="`放大查看${activeCardDisplayName}`"
      @click="openPreview(activeCard ?? store.galleryCards[0])"
    >
      <i class="fa-solid fa-magnifying-glass-plus"></i>
      <span>查看大图</span>
    </button>

    <div v-if="store.hasGalleryCards" class="gallery-container">
      <div
        v-for="(card, index) in store.galleryCards"
        :key="index"
        class="gallery-card"
        :class="{ flipped: card.isFlipped }"
        @mouseenter="setActiveCard(index)"
        @click="
          setActiveCard(index);
          store.toggleCardFlip(index);
        "
      >
        <div class="card-inner">
          <!-- 正面 -->
          <div class="card-face card-front">
            <img :src="card.front" :alt="card.frontName || card.name" />
            <div class="card-name-bar">{{ card.frontName || card.name }}</div>
          </div>
          <!-- 背面 -->
          <div class="card-face card-back">
            <div class="back-content">
              <img :src="card.back" :alt="card.backName || card.name" class="back-image" />
              <div class="back-info-panel">
                <div class="back-name">{{ card.backName || card.name }}</div>
                <div class="back-text">「{{ card.backText }}」</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-hint">当前场景暂无角色卡片</div>

    <Transition name="preview-fade">
      <div v-if="previewState" class="preview-overlay" role="dialog" aria-modal="true" @click="closePreview">
        <div class="preview-stage" @click.stop>
          <button type="button" class="preview-close" aria-label="关闭大图预览" @click="closePreview">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <div class="preview-name">
            <span>{{ previewState.title }}</span>
            <small>{{ previewState.hint }}</small>
          </div>
          <img :src="previewState.image" :alt="previewState.title" class="preview-image" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from '../store';

const store = useDataStore();

type PreviewState = {
  image: string;
  title: string;
  hint: string;
};

const previewState = ref<PreviewState | null>(null);
const activeCardIndex = ref(0);

const getCardDisplayName = (card: (typeof store.galleryCards)[number]) => {
  return card.isFlipped ? card.backName || card.name : card.frontName || card.name;
};

const activeCard = computed(() => {
  const cards = store.galleryCards;
  if (cards.length === 0) return null;
  const index = Math.max(0, Math.min(activeCardIndex.value, cards.length - 1));
  return cards[index] ?? null;
});

const activeCardDisplayName = computed(() => {
  return activeCard.value ? getCardDisplayName(activeCard.value) : '当前图鉴';
});

const setActiveCard = (index: number) => {
  activeCardIndex.value = index;
};

const openPreview = (card: (typeof store.galleryCards)[number]) => {
  const isBack = card.isFlipped;
  previewState.value = {
    image: isBack ? card.back : card.front,
    title: isBack ? card.backName || card.name : card.frontName || card.name,
    hint: isBack ? '背面立绘' : '正面立绘',
  };
};

const closePreview = () => {
  previewState.value = null;
};

const onWindowKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    closePreview();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown);
});

watch(
  () => store.galleryCards.length,
  length => {
    if (length <= 0) {
      activeCardIndex.value = 0;
      return;
    }
    activeCardIndex.value = Math.max(0, Math.min(activeCardIndex.value, length - 1));
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.gallery-panel {
  padding: 16px !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;

  .panel-zoom-trigger {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    border: 1px solid rgba(241, 184, 165, 0.38);
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(108, 42, 40, 0.96) 0%, rgba(77, 29, 29, 0.98) 100%);
    color: #f7d3c1;
    font-size: 12px;
    line-height: 1;
    box-shadow:
      0 8px 20px rgba(0, 0, 0, 0.28),
      0 0 0 1px rgba(255, 220, 205, 0.08) inset;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      color 0.2s ease;

    i {
      font-size: 12px;
    }

    &:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 214, 193, 0.62);
      color: #fff1ea;
      box-shadow:
        0 12px 24px rgba(0, 0, 0, 0.34),
        0 0 20px rgba(240, 170, 145, 0.15);
    }
  }

  .gallery-container {
    display: inline-flex;
    flex-direction: row;
    gap: 20px;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 16px 0 10px;
    max-width: 100%;

    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: var(--bg-secondary);
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--button-bg);
      border-radius: 4px;

      &:hover {
        background: var(--button-hover);
      }
    }
  }

  .gallery-card {
    flex-shrink: 0;
    width: 280px;
    aspect-ratio: 2 / 3;
    perspective: 1000px;
    position: relative;
    cursor: pointer;
  }

  .card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s ease;
    transform-style: preserve-3d;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }

  .gallery-card.flipped .card-inner {
    transform: rotateY(180deg);
  }

  .card-face {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 12px;
    overflow: hidden;
    border: 2px solid var(--border-color);
  }

  .card-front {
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .card-name-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      text-align: center;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
    }
  }

  .card-back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);

    .back-content {
      width: 100%;
      height: 100%;
      position: relative;

      .back-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .back-info-panel {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 20px 16px;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%);
        text-align: center;

        .back-name {
          font-size: 18px;
          font-weight: bold;
          color: #a0c0ff;
          margin-bottom: 8px;
          text-shadow:
            0 0 15px rgba(100, 150, 255, 0.6),
            0 2px 4px rgba(0, 0, 0, 0.8);
        }

        .back-text {
          font-size: 14px;
          color: #d0e0f0;
          line-height: 1.6;
          font-style: italic;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }
      }
    }
  }

  .gallery-card::after {
    content: '点击翻转';
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    background: rgba(0, 0, 0, 0.6);
    color: #a0b8d0;
    font-size: 11px;
    border-radius: 12px;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
    z-index: 10;
  }

  .gallery-card:hover::after {
    opacity: 1;
  }

  .gallery-card.flipped::after {
    content: '点击翻回';
  }

  .empty-hint {
    text-align: center;
    padding: 20px;
    color: #506070;
    font-style: italic;
  }

  .preview-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(12, 5, 7, 0.82);
    backdrop-filter: blur(8px);
  }

  .preview-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: min(92vw, 560px);
  }

  .preview-close {
    position: absolute;
    top: -12px;
    right: -12px;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255, 228, 214, 0.3);
    border-radius: 50%;
    background: rgba(52, 18, 18, 0.92);
    color: #fff2e7;
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
    transition:
      transform 0.2s ease,
      background 0.2s ease;

    &:hover {
      transform: scale(1.06);
      background: rgba(86, 29, 29, 0.98);
    }
  }

  .preview-name {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    padding: 8px 18px;
    border: 1px solid rgba(255, 226, 214, 0.18);
    border-radius: 999px;
    background: rgba(45, 18, 18, 0.84);
    color: #fff3eb;
    font-size: 18px;
    font-weight: bold;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);

    small {
      color: #d8b5a7;
      font-size: 12px;
      font-weight: normal;
    }
  }

  .preview-image {
    width: 100%;
    max-height: calc(100vh - 190px);
    object-fit: contain;
    border-radius: 18px;
    border: 1px solid rgba(255, 232, 218, 0.18);
    background: rgba(20, 10, 10, 0.92);
    box-shadow:
      0 22px 48px rgba(0, 0, 0, 0.42),
      0 0 0 1px rgba(255, 236, 224, 0.04) inset;
  }

}

.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.22s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

// 手机端适配
@media screen and (max-width: 480px) {
  .gallery-panel {
    padding: 12px !important;

    .panel-zoom-trigger {
      top: 10px;
      left: 10px;
      padding: 5px 11px;
      font-size: 11px;
    }

    .gallery-container {
      gap: 14px;
      padding-top: 12px;
    }

    .gallery-card {
      width: 200px;
    }

    .card-front {
      .card-name-bar {
        padding: 10px;
        font-size: 14px;
      }
    }

    .card-back {
      .back-content {
        .back-info-panel {
          padding: 16px 12px;

          .back-name {
            font-size: 15px;
          }

          .back-text {
            font-size: 12px;
          }
        }
      }
    }

    .gallery-card::after {
      font-size: 10px;
      padding: 3px 8px;
    }

    .preview-overlay {
      padding: 18px;
    }

    .preview-stage {
      width: min(94vw, 420px);
      gap: 12px;
    }

    .preview-close {
      top: -8px;
      right: -4px;
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    .preview-name {
      font-size: 16px;
      padding: 6px 16px;

      small {
        font-size: 11px;
      }
    }

    .preview-image {
      max-height: calc(100vh - 170px);
    }
  }
}

// 超小屏幕适配
@media screen and (max-width: 360px) {
  .gallery-panel {
    .gallery-card {
      width: 160px;
    }
  }
}
</style>
