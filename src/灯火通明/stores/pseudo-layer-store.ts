import {
  DialogueChannel,
  DialogueContext,
  InteractionMode,
  PSEUDO_LAYER_CHANNEL,
  PSEUDO_LAYER_VERSION,
  PseudoLayerGenerationOperation,
  PseudoLayerGenerationState,
  PseudoLayerHistoryKind,
  PseudoLayerInteraction,
  PseudoLayerInteractionMetadata,
  PseudoLayerRequest,
  PseudoLayerView,
  isPseudoLayerResponse,
} from '../pseudo-layer-protocol';
import { extractDialogueContent } from '../message-content';

export type DialogueTurn = {
  assistantMessageId: number;
  userMessageId: number | null;
  userText: string;
  reaction: string;
  replyText: string;
  reasoning: string;
  reasoningDuration: number | null;
};

export type DialogueTarget = {
  targetName: string;
  canonicalName: string;
  channel: DialogueChannel;
};

const INTERACTION_KEY = 'dhl_pseudo_interaction';
const STORY_INTERACTION = { mode: 'story' } as const;
const EMPTY_HISTORY = {
  selectedMessageId: -1,
  latestMessageId: -1,
  index: 0,
  total: 0,
  isLatest: true,
} as const;
const EMPTY_VIEW: PseudoLayerView = {
  hostMessageId: -1,
  revision: 0,
  selectedMessageId: -1,
  latestMessageId: -1,
  index: 0,
  total: 0,
  isLatest: true,
  nativeInputCollapsed: false,
  stage: { kind: 'story' },
  histories: {
    story: { ...EMPTY_HISTORY },
    dialogue: { ...EMPTY_HISTORY },
  },
  activeInteraction: STORY_INTERACTION,
};

const cleanStoredReaction = (value: unknown) =>
  String(value ?? '')
    .replace(/<正文(?=[\s/>])[\s\S]*$/i, '')
    .replace(/<\/?(?:反应|正文|会话状态)(?=[\s/>])[^>]*>/gi, '')
    .replace(/<[^>]*$/g, '')
    .trim();

const readMetadata = (message: ChatMessage | undefined): PseudoLayerInteractionMetadata | null => {
  if (!message) return null;
  const value = (message.extra?.[INTERACTION_KEY] ??
    message.extra?.extra?.[INTERACTION_KEY]) as Partial<PseudoLayerInteractionMetadata> | undefined;
  if (
    !value ||
    (value.version !== 1 && value.version !== 2) ||
    value.kind !== 'dialogue' ||
    (value.channel !== 'present' && value.channel !== 'transmission')
  ) {
    return null;
  }
  const sessionId = String(value.sessionId ?? '').trim();
  const targetName = String(value.targetName ?? '').trim();
  const canonicalName = String(value.canonicalName ?? '').trim();
  if (!sessionId || !targetName || !canonicalName) return null;
  const userMessageId = Number(value.userMessageId);
  const reaction = cleanStoredReaction(value.reaction);
  return {
    ...value,
    version: value.version,
    kind: 'dialogue',
    sessionId,
    targetName,
    canonicalName,
    channel: value.channel,
    ...(typeof value.rawUserText === 'string' ? { rawUserText: value.rawUserText } : {}),
    ...(Number.isFinite(userMessageId) ? { userMessageId } : {}),
    ...(reaction ? { reaction } : {}),
  } as PseudoLayerInteractionMetadata;
};

const readReasoning = (message: ChatMessage | undefined) => {
  const direct = message?.extra ?? {};
  const nested = direct.extra && typeof direct.extra === 'object' ? direct.extra : {};
  const text = String(direct.reasoning ?? nested.reasoning ?? '');
  const rawDuration = Number(direct.reasoning_duration ?? nested.reasoning_duration);
  return {
    text,
    duration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null,
  };
};

const rawUserText = (message: ChatMessage | undefined) => {
  if (!message) return '';
  const metadata = readMetadata(message);
  if (metadata?.rawUserText) return metadata.rawUserText.trim();
  return String(message.message ?? '')
    .replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, '')
    .trim();
};

export const usePseudoLayerStore = defineStore('pseudo_layer', () => {
  const parkedMessageId = Number((window.frameElement as HTMLIFrameElement | null)?.dataset.dhlMessageId);
  const frameMessageId = Number(window.frameElement?.closest<HTMLElement>('.mes')?.getAttribute('mesid'));
  const rawMessageId = Number.isFinite(parkedMessageId)
    ? parkedMessageId
    : Number.isFinite(frameMessageId)
      ? frameMessageId
      : getCurrentMessageId();
  const messageId = Number(rawMessageId);
  const controllerReady = ref(false);
  const view = ref<PseudoLayerView>({ ...EMPTY_VIEW });
  const selectedTitle = ref('');
  const draftPrompt = ref('');
  const generationState = ref<PseudoLayerGenerationState>('idle');
  const generationOperation = ref<PseudoLayerGenerationOperation | null>(null);
  const streamText = ref('');
  const streamReaction = ref('');
  const liveReasoning = ref('');
  const reasoningDuration = ref<number | null>(null);
  const generationError = ref('');
  const activeRequestId = ref('');
  const deleteRequestId = ref('');
  const floorMessage = ref('');
  const floorUserMessage = ref('');
  const generationUserMessage = ref('');
  const floorReasoning = ref('');
  const floorReasoningDuration = ref<number | null>(null);
  const storyFloorMessageId = ref(-1);
  const storyFloorMessage = ref('');
  const storyFloorUserMessage = ref('');
  const storyFloorReasoning = ref('');
  const storyFloorReasoningDuration = ref<number | null>(null);
  const dialogueTurns = ref<DialogueTurn[]>([]);
  const recentDialogue = ref<DialogueContext | null>(null);
  const pendingDialogueResume = ref<DialogueContext | null>(null);
  const focusNonce = ref(0);

  let started = false;
  let helloTimer: number | null = null;
  const helloRetryTimers: number[] = [];
  let lastControllerReplyAt = 0;

  const isGenerating = computed(() => generationState.value !== 'idle');
  const isRerolling = computed(() => isGenerating.value && generationOperation.value === 'reroll');
  const isDeleting = computed(() => deleteRequestId.value !== '');
  const isSelected = computed(() => view.value.hostMessageId === messageId);
  const isLatest = computed(() => view.value.isLatest && isSelected.value);
  const isStoryHistoryLatest = computed(
    () => isSelected.value && (view.value.histories.story.total === 0 || view.value.histories.story.isLatest),
  );
  const isDialogueHistoryLatest = computed(
    () => isSelected.value && (view.value.histories.dialogue.total === 0 || view.value.histories.dialogue.isLatest),
  );
  const isCurrentHistoryLatest = computed(() =>
    view.value.stage.kind === 'dialogue' ? isDialogueHistoryLatest.value : isStoryHistoryLatest.value,
  );
  const activeDialogue = computed<DialogueContext | null>(() =>
    view.value.activeInteraction.mode === 'dialogue' ? view.value.activeInteraction : null,
  );
  const selectedDialogue = computed<DialogueContext | null>(() =>
    view.value.stage.kind === 'dialogue'
      ? {
          mode: 'dialogue',
          sessionId: view.value.stage.sessionId,
          targetName: view.value.stage.targetName,
          canonicalName: view.value.stage.canonicalName,
          channel: view.value.stage.channel,
        }
      : null,
  );
  const dialogueContext = computed(() => {
    if (!isDialogueHistoryLatest.value && selectedDialogue.value) return selectedDialogue.value;
    return activeDialogue.value ?? selectedDialogue.value ?? recentDialogue.value;
  });
  const isDialogueActive = computed(() => activeDialogue.value !== null);
  const isDialogueView = computed(
    () => isDialogueActive.value || (dialogueContext.value !== null && !isGenerating.value),
  );
  const canSubmitBase = computed(
    () => controllerReady.value && draftPrompt.value.trim().length > 0 && !isGenerating.value && !isDeleting.value,
  );
  const canSubmitStory = computed(() => canSubmitBase.value && isStoryHistoryLatest.value);
  const canSubmitDialogue = computed(
    () => canSubmitBase.value && isDialogueHistoryLatest.value && activeDialogue.value !== null,
  );
  const canSubmit = computed(() =>
    activeDialogue.value ? canSubmitDialogue.value : canSubmitStory.value,
  );
  const canReroll = computed(
    () =>
      controllerReady.value &&
      isLatest.value &&
      view.value.total > 0 &&
      view.value.stage.kind !== 'dialogue' &&
      !isGenerating.value &&
      !isDeleting.value,
  );
  const canDelete = computed(
    () =>
      controllerReady.value &&
      isLatest.value &&
      !isGenerating.value &&
      !isDeleting.value &&
      (view.value.total > 1 ||
        (view.value.stage.kind === 'dialogue' && view.value.stage.turnCount > 1)),
  );
  const turnUserMessage = computed(() =>
    isGenerating.value
      ? generationUserMessage.value || draftPrompt.value.trim() || floorUserMessage.value
      : floorUserMessage.value,
  );

  const post = (request: PseudoLayerRequest) => window.parent.postMessage(request, '*');

  const getMessageRange = (lastId: number) => {
    if (!Number.isFinite(lastId) || lastId < 0) return [];
    return getChatMessages(`0-${lastId}`);
  };

  const findPreviousUser = (targetMessageId: number) => {
    for (let candidateId = targetMessageId - 1; candidateId >= 0; candidateId -= 1) {
      const message = getChatMessages(candidateId)[0];
      if (message?.role === 'user') return message;
    }
    return undefined;
  };

  const findImmediatePreviousMessage = (messages: ChatMessage[], targetMessageId: number) =>
    messages
      .filter(message => message.message_id < targetMessageId)
      .sort((left, right) => right.message_id - left.message_id)[0];

  const findLatestUserMessage = () => {
    const lastMessageId = getLastMessageId();
    if (!Number.isFinite(lastMessageId)) return '';
    for (let candidateId = lastMessageId; candidateId >= 0; candidateId -= 1) {
      const message = getChatMessages(candidateId)[0];
      if (message?.role === 'user') return rawUserText(message);
    }
    return '';
  };

  const refreshGenerationUserMessage = () => {
    generationUserMessage.value = draftPrompt.value.trim() || findLatestUserMessage();
  };

  const refreshDialogueTurns = (targetMessageId: number, sessionId: string) => {
    const messages = getMessageRange(targetMessageId);
    const byId = new Map(messages.map(message => [message.message_id, message]));
    dialogueTurns.value = messages
      .filter(message => message.role === 'assistant')
      .flatMap(message => {
        const previousMessage = findImmediatePreviousMessage(messages, message.message_id);
        const adjacentUser = previousMessage?.role === 'user' ? previousMessage : undefined;
        const metadata = readMetadata(message) ?? readMetadata(adjacentUser);
        if (!metadata || metadata.sessionId !== sessionId) return [];
        const linkedUser =
          (metadata.userMessageId !== undefined ? byId.get(metadata.userMessageId) : undefined) ??
          adjacentUser;
        const reasoning = readReasoning(message);
        const visible = extractDialogueContent(String(message.message ?? ''));
        return [
          {
            assistantMessageId: message.message_id,
            userMessageId: linkedUser?.message_id ?? null,
            userText: rawUserText(linkedUser),
            reaction: metadata.reaction ?? visible.reaction,
            replyText: visible.dialogue,
            reasoning: reasoning.text,
            reasoningDuration: reasoning.duration,
          },
        ];
      });
  };

  const findLatestDialogue = (targetMessageId: number): DialogueContext | null => {
    const messages = getMessageRange(targetMessageId);
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const metadata = readMetadata(messages[index]);
      if (!metadata) continue;
      return {
        mode: 'dialogue',
        sessionId: metadata.sessionId,
        targetName: metadata.targetName,
        canonicalName: metadata.canonicalName,
        channel: metadata.channel,
      };
    }
    return null;
  };

  const refreshStoryFloor = (targetMessageId: number) => {
    const messages = getMessageRange(targetMessageId);
    let storyMessage: ChatMessage | undefined;
    let storyUserMessage: ChatMessage | undefined;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== 'assistant' || message.message_id > targetMessageId) continue;
      const previousMessage = findImmediatePreviousMessage(messages, message.message_id);
      const adjacentUser = previousMessage?.role === 'user' ? previousMessage : undefined;
      if (readMetadata(message) ?? readMetadata(adjacentUser)) continue;
      storyMessage = message;
      storyUserMessage = adjacentUser;
      break;
    }

    storyFloorMessageId.value = storyMessage?.message_id ?? -1;
    storyFloorMessage.value = String(storyMessage?.message ?? '');
    storyFloorUserMessage.value = rawUserText(storyUserMessage);
    const reasoning = readReasoning(storyMessage);
    storyFloorReasoning.value = reasoning.text;
    storyFloorReasoningDuration.value = reasoning.duration;
  };

  const refreshFloor = (targetMessageId = view.value.selectedMessageId) => {
    if (!Number.isFinite(targetMessageId) || targetMessageId < 0) return;
    try {
      const message = getChatMessages(targetMessageId)[0];
      const messages = getMessageRange(targetMessageId);
      const previousMessage = findImmediatePreviousMessage(messages, targetMessageId);
      floorMessage.value = String(message?.message ?? '');
      floorUserMessage.value = rawUserText(previousMessage?.role === 'user' ? previousMessage : undefined);
      const reasoning = readReasoning(message);
      floorReasoning.value = reasoning.text;
      floorReasoningDuration.value = reasoning.duration;
      refreshStoryFloor(targetMessageId);
      const archivedDialogue =
        view.value.stage.kind === 'dialogue'
          ? {
              mode: 'dialogue' as const,
              sessionId: view.value.stage.sessionId,
              targetName: view.value.stage.targetName,
              canonicalName: view.value.stage.canonicalName,
              channel: view.value.stage.channel,
            }
          : findLatestDialogue(targetMessageId);
      recentDialogue.value = archivedDialogue;
      if (archivedDialogue) {
        refreshDialogueTurns(targetMessageId, archivedDialogue.sessionId);
      } else {
        dialogueTurns.value = [];
      }
    } catch (error) {
      console.warn('[灯火阑珊·伪同层] 读取楼层正文失败', error);
    }
  };

  const sendHello = () => {
    if (!Number.isFinite(messageId)) return;
    post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'hello', messageId });
  };

  const acceptsRequest = (requestId?: string) => {
    if (!requestId) return true;
    if (!activeRequestId.value) activeRequestId.value = requestId;
    return activeRequestId.value === requestId;
  };

  const handleMessage = (event: MessageEvent<unknown>) => {
    if (!isPseudoLayerResponse(event.data)) return;
    const response = event.data;
    lastControllerReplyAt = Date.now();
    controllerReady.value = true;

    if (response.type === 'ready') {
      if (response.busy && response.requestId) {
        acceptsRequest(response.requestId);
        generationOperation.value = response.operation ?? generationOperation.value;
      }
      return;
    }

    if (response.type === 'view') {
      const shouldRefreshFloor =
        response.view.hostMessageId === messageId &&
        (view.value.selectedMessageId !== response.view.selectedMessageId ||
          view.value.revision !== response.view.revision ||
          !floorMessage.value);
      view.value = response.view;
      if (shouldRefreshFloor) refreshFloor(response.view.selectedMessageId);
      if (pendingDialogueResume.value && isDialogueHistoryLatest.value && !isGenerating.value) {
        const pending = pendingDialogueResume.value;
        pendingDialogueResume.value = null;
        window.queueMicrotask(() => beginDialogue(pending, pending.sessionId));
      }
      return;
    }

    if (response.type === 'deleted') {
      if (response.requestId !== deleteRequestId.value) return;
      deleteRequestId.value = '';
      generationError.value = '';
      return;
    }

    if (response.type === 'error' && response.requestId === deleteRequestId.value) {
      deleteRequestId.value = '';
      generationError.value = response.message;
      return;
    }

    if ('requestId' in response && !acceptsRequest(response.requestId)) return;

    if (response.type === 'state') {
      generationState.value = response.state;
      generationOperation.value = response.operation;
      if (response.userText) generationUserMessage.value = response.userText;
      generationError.value = '';
      if (response.state === 'generating' && !generationUserMessage.value) {
        refreshGenerationUserMessage();
        window.setTimeout(() => {
          if (isGenerating.value && !generationUserMessage.value) refreshGenerationUserMessage();
        }, 100);
      }
      return;
    }

    if (response.type === 'stream') {
      generationState.value = 'generating';
      if (!generationUserMessage.value) refreshGenerationUserMessage();
      streamText.value = response.text;
      streamReaction.value = response.reaction ?? '';
      return;
    }

    if (response.type === 'reasoning') {
      liveReasoning.value = response.text;
      reasoningDuration.value = response.duration;
      return;
    }

    if (response.type === 'complete') {
      if (generationOperation.value === 'reroll') refreshFloor(response.messageId);
      generationState.value = 'idle';
      generationOperation.value = null;
      activeRequestId.value = '';
      selectedTitle.value = '';
      draftPrompt.value = '';
      generationUserMessage.value = '';
      streamText.value = '';
      streamReaction.value = '';
      return;
    }

    if (response.type === 'error') {
      generationState.value = 'idle';
      generationOperation.value = null;
      activeRequestId.value = '';
      generationUserMessage.value = '';
      streamText.value = '';
      streamReaction.value = '';
      generationError.value = response.message;
    }
  };

  const start = () => {
    if (started) return;
    started = true;
    refreshFloor();
    window.addEventListener('message', handleMessage);
    sendHello();
    [250, 1000, 2500].forEach(delay => {
      helloRetryTimers.push(
        window.setTimeout(() => {
          if (started && !controllerReady.value) sendHello();
        }, delay),
      );
    });
    helloTimer = window.setInterval(() => {
      if (lastControllerReplyAt > 0 && Date.now() - lastControllerReplyAt > 8000) controllerReady.value = false;
      sendHello();
    }, 4000);
  };

  const dispose = () => {
    if (!started) return;
    started = false;
    window.removeEventListener('message', handleMessage);
    if (helloTimer !== null) window.clearInterval(helloTimer);
    helloTimer = null;
    helloRetryTimers.splice(0).forEach(timer => window.clearTimeout(timer));
    if (Number.isFinite(messageId)) {
      post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'goodbye', messageId });
    }
  };

  const selectDraft = (title: string, prompt: string) => {
    if (isGenerating.value || !isStoryHistoryLatest.value) return;
    if (view.value.activeInteraction.mode === 'dialogue') {
      view.value = { ...view.value, activeInteraction: STORY_INTERACTION };
      post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'end_interaction' });
    }
    selectedTitle.value = title;
    draftPrompt.value = prompt;
    generationError.value = '';
    focusNonce.value += 1;
  };

  const clearDraft = () => {
    if (isGenerating.value) return;
    selectedTitle.value = '';
    draftPrompt.value = '';
    generationError.value = '';
  };

  function beginDialogue(target: DialogueTarget, sessionId?: string) {
    if (!isDialogueHistoryLatest.value || isGenerating.value) return;
    const interaction: DialogueContext = {
      mode: 'dialogue',
      sessionId: sessionId ?? `dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      targetName: target.targetName.trim(),
      canonicalName: target.canonicalName.trim(),
      channel: target.channel,
    };
    if (!interaction.targetName || !interaction.canonicalName) return;
    if (dialogueContext.value?.sessionId !== interaction.sessionId) {
      refreshDialogueTurns(view.value.selectedMessageId, interaction.sessionId);
    }
    recentDialogue.value = interaction;
    view.value = { ...view.value, activeInteraction: interaction };
    generationError.value = '';
    selectedTitle.value = '';
    focusNonce.value += 1;
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'set_interaction',
      interaction,
    });
  }

  const continueDialogue = () => {
    const context = dialogueContext.value;
    if (!context) return;
    if (!isDialogueHistoryLatest.value) {
      pendingDialogueResume.value = { ...context };
      returnHistoryLatest('dialogue');
      return;
    }
    beginDialogue(context, context.sessionId);
  };

  const resetDialogue = () => {
    const context = dialogueContext.value;
    if (!context || isGenerating.value || !isDialogueHistoryLatest.value) return;
    draftPrompt.value = '';
    selectedTitle.value = '';
    generationError.value = '';
    dialogueTurns.value = [];
    beginDialogue({
      targetName: context.targetName,
      canonicalName: context.canonicalName,
      channel: context.channel,
    });
  };

  const endDialogue = () => {
    if (isGenerating.value) return;
    view.value = { ...view.value, activeInteraction: STORY_INTERACTION };
    selectedTitle.value = '';
    generationError.value = '';
    post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'end_interaction' });
  };

  const submit = (mode?: InteractionMode) => {
    const prompt = draftPrompt.value.trim();
    const requestedMode = mode ?? (activeDialogue.value ? 'dialogue' : 'story');
    const maySubmit = requestedMode === 'dialogue' ? canSubmitDialogue.value : canSubmitStory.value;
    if (!prompt || !maySubmit || !Number.isFinite(messageId)) return;
    const requestId = `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const interaction: PseudoLayerInteraction =
      requestedMode === 'dialogue' && activeDialogue.value
        ? { ...activeDialogue.value }
        : STORY_INTERACTION;
    const history = view.value.histories[requestedMode];
    const anchorMessageId = history.selectedMessageId >= 0
      ? history.selectedMessageId
      : view.value.latestMessageId;
    if (interaction.mode === 'story' && activeDialogue.value) {
      view.value = { ...view.value, activeInteraction: STORY_INTERACTION };
    }
    activeRequestId.value = requestId;
    generationState.value = 'preparing';
    generationOperation.value = 'generate';
    generationUserMessage.value = prompt;
    streamText.value = '';
    streamReaction.value = '';
    liveReasoning.value = '';
    reasoningDuration.value = null;
    generationError.value = '';
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'generate',
      requestId,
      messageId: anchorMessageId,
      prompt,
      interaction,
    });
  };

  const stop = () => {
    if (!activeRequestId.value) return;
    generationState.value = 'stopping';
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'stop',
      requestId: activeRequestId.value,
    });
  };

  const reroll = () => {
    if (!canReroll.value || !Number.isFinite(messageId)) return;
    const requestId = `reroll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeRequestId.value = requestId;
    generationState.value = 'preparing';
    generationOperation.value = 'reroll';
    generationUserMessage.value = floorUserMessage.value;
    streamText.value = '';
    streamReaction.value = '';
    liveReasoning.value = '';
    reasoningDuration.value = null;
    generationError.value = '';
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'reroll',
      requestId,
      messageId: view.value.selectedMessageId,
    });
  };

  const deleteCurrent = () => {
    if (!canDelete.value || !Number.isFinite(messageId)) return;
    const requestId = `delete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    deleteRequestId.value = requestId;
    generationError.value = '';
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'delete_message',
      requestId,
      messageId: view.value.selectedMessageId,
    });
  };

  const selectHistory = (history: PseudoLayerHistoryKind) => {
    if (!Number.isFinite(messageId) || isGenerating.value) return;
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'select_history',
      history,
    });
  };

  const navigate = (direction: 'previous' | 'next', history?: PseudoLayerHistoryKind) => {
    if (!Number.isFinite(messageId) || isGenerating.value) return;
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'navigate',
      messageId: view.value.selectedMessageId,
      direction,
      ...(history ? { history } : {}),
    });
  };

  const returnLatest = () =>
    post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'return_latest' });

  const returnHistoryLatest = (history: PseudoLayerHistoryKind) =>
    post({
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'return_latest',
      history,
    });

  const toggleNativeInput = () =>
    post({ channel: PSEUDO_LAYER_CHANNEL, version: PSEUDO_LAYER_VERSION, type: 'toggle_native_input' });

  return {
    messageId,
    controllerReady,
    view,
    selectedTitle,
    draftPrompt,
    generationState,
    generationOperation,
    streamText,
    streamReaction,
    liveReasoning,
    reasoningDuration,
    generationError,
    activeRequestId,
    deleteRequestId,
    floorMessage,
    floorUserMessage,
    generationUserMessage,
    floorReasoning,
    floorReasoningDuration,
    storyFloorMessageId,
    storyFloorMessage,
    storyFloorUserMessage,
    storyFloorReasoning,
    storyFloorReasoningDuration,
    dialogueTurns,
    recentDialogue,
    focusNonce,
    isGenerating,
    isRerolling,
    isDeleting,
    isLatest,
    isStoryHistoryLatest,
    isDialogueHistoryLatest,
    isCurrentHistoryLatest,
    isSelected,
    activeDialogue,
    selectedDialogue,
    dialogueContext,
    isDialogueActive,
    isDialogueView,
    canSubmit,
    canSubmitStory,
    canSubmitDialogue,
    canReroll,
    canDelete,
    turnUserMessage,
    start,
    dispose,
    refreshFloor,
    selectDraft,
    clearDraft,
    beginDialogue,
    continueDialogue,
    resetDialogue,
    endDialogue,
    submit,
    stop,
    reroll,
    deleteCurrent,
    selectHistory,
    navigate,
    returnLatest,
    returnHistoryLatest,
    toggleNativeInput,
  };
});
