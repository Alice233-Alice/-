import { nextTick, ref, type Ref } from 'vue';

const BOTTOM_THRESHOLD = 72;

export const useStreamFollow = (scrollRef: Ref<HTMLElement | undefined>) => {
  const isFollowing = ref(true);
  let touchY: number | null = null;

  const isNearBottom = () => {
    const element = scrollRef.value;
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD;
  };

  const handleScroll = () => {
    isFollowing.value = isNearBottom();
  };

  const handleWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) isFollowing.value = false;
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchY = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const nextY = event.touches[0]?.clientY ?? null;
    if (touchY !== null && nextY !== null && nextY > touchY) isFollowing.value = false;
    touchY = nextY;
  };

  const queueFollow = () => {
    if (!isFollowing.value) return;
    void nextTick(() => {
      if (!isFollowing.value) return;
      const element = scrollRef.value;
      if (element) element.scrollTop = element.scrollHeight;
    });
  };

  const resumeFollowing = (smooth = true) => {
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

  return {
    isFollowing,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    queueFollow,
    resumeFollowing,
  };
};
