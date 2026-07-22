import { nextTick, onBeforeUnmount, ref, type Ref } from 'vue';

const BOTTOM_THRESHOLD = 72;
const TOUCH_SCROLL_SETTLE_MS = 220;

export const useStreamFollow = (scrollRef: Ref<HTMLElement | undefined>) => {
  const isFollowing = ref(true);
  const isUserInteracting = ref(false);
  let touchY: number | null = null;
  let interactionReleaseTimer: number | undefined;

  const isNearBottom = () => {
    const element = scrollRef.value;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD;
  };

  const releaseInteraction = () => {
    interactionReleaseTimer = undefined;
    isUserInteracting.value = false;
    isFollowing.value = isNearBottom();
  };

  const scheduleInteractionRelease = () => {
    if (interactionReleaseTimer !== undefined) window.clearTimeout(interactionReleaseTimer);
    interactionReleaseTimer = window.setTimeout(releaseInteraction, TOUCH_SCROLL_SETTLE_MS);
  };

  const handleScroll = () => {
    if (isUserInteracting.value && touchY === null) scheduleInteractionRelease();
    const nearBottom = isNearBottom();
    if (!nearBottom || !isUserInteracting.value) isFollowing.value = nearBottom;
  };

  const handleWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) isFollowing.value = false;
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (interactionReleaseTimer !== undefined) {
      window.clearTimeout(interactionReleaseTimer);
      interactionReleaseTimer = undefined;
    }
    isUserInteracting.value = true;
    touchY = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const nextY = event.touches[0]?.clientY ?? null;
    if (touchY !== null && nextY !== null && nextY > touchY) isFollowing.value = false;
    touchY = nextY;
  };

  const handleTouchEnd = () => {
    touchY = null;
    scheduleInteractionRelease();
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      if (interactionReleaseTimer !== undefined) {
        window.clearTimeout(interactionReleaseTimer);
        interactionReleaseTimer = undefined;
      }
      isUserInteracting.value = true;
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    touchY = null;
    scheduleInteractionRelease();
  };

  const queueFollow = () => {
    if (!isFollowing.value || isUserInteracting.value) return;
    void nextTick(() => {
      if (!isFollowing.value || isUserInteracting.value) return;
      const element = scrollRef.value;
      if (element) element.scrollTop = element.scrollHeight;
    });
  };

  const resumeFollowing = (smooth = true) => {
    if (interactionReleaseTimer !== undefined) {
      window.clearTimeout(interactionReleaseTimer);
      interactionReleaseTimer = undefined;
    }
    isUserInteracting.value = false;
    touchY = null;
    isFollowing.value = true;
    void nextTick(() => {
      const element = scrollRef.value;
      if (!element) return;
      if (!smooth) {
        element.scrollTop = element.scrollHeight;
        return;
      }

      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      const view = element.ownerDocument.defaultView;
      view?.requestAnimationFrame(() => {
        view.requestAnimationFrame(() => {
          // Firefox and embedded blob iframes can drop the smooth-scroll request.
          if (isFollowing.value && !isNearBottom()) element.scrollTop = element.scrollHeight;
        });
      });
    });
  };

  onBeforeUnmount(() => {
    if (interactionReleaseTimer !== undefined) window.clearTimeout(interactionReleaseTimer);
  });

  return {
    isFollowing,
    isUserInteracting,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePointerDown,
    handlePointerUp,
    queueFollow,
    resumeFollowing,
  };
};
