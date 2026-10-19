import { useDataStore } from './data-store';
export const useGalleryUiStore = defineStore('gallery-ui', () => {
    const data = useDataStore();
    const previewCardIndex = ref(null);
    const previewCard = computed(() => {
        if (previewCardIndex.value === null)
            return null;
        return data.galleryCards[previewCardIndex.value] ?? null;
    });
    const openPreview = (index) => {
        if (data.galleryCards[index])
            previewCardIndex.value = index;
    };
    const closePreview = () => {
        previewCardIndex.value = null;
    };
    const selectPreviewCard = (index) => {
        if (data.galleryCards[index])
            previewCardIndex.value = index;
    };
    const browsePreview = (direction) => {
        if (previewCardIndex.value === null)
            return;
        void data.changeGalleryCardImage(previewCardIndex.value, direction);
    };
    const togglePreviewFlip = () => {
        if (previewCardIndex.value === null)
            return;
        data.toggleCardFlip(previewCardIndex.value);
    };
    watch(() => data.galleryCards.length, length => {
        if (length <= 0 || (previewCardIndex.value !== null && previewCardIndex.value >= length))
            closePreview();
    });
    return {
        previewCardIndex,
        previewCard,
        openPreview,
        closePreview,
        selectPreviewCard,
        browsePreview,
        togglePreviewFlip,
    };
});
