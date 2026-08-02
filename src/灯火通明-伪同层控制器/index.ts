import {
  DialogueContext,
  DialogueEngineKind,
  PSEUDO_LAYER_CHANNEL,
  PSEUDO_LAYER_VERSION,
  PseudoLayerGenerationOperation,
  PseudoLayerGenerationState,
  PseudoLayerHistoryKind,
  PseudoLayerHistoryState,
  PseudoLayerInteraction,
  PseudoLayerInteractionMetadata,
  PseudoLayerReasoningState,
  PseudoLayerRequest,
  PseudoLayerResponse,
  PseudoLayerStage,
  PseudoLayerTimelineEntry,
  PseudoLayerTimelineTurn,
  PseudoLayerView,
  isPseudoLayerRequest,
} from '../灯火通明/pseudo-layer-protocol';
import { extractDialogueContent, extractInlineReasoning, mergeReasoningText } from '../灯火通明/message-content';
import { ParsedDialogueGeneration, generateDialogueReply, parseDialogueGeneration } from './dialogue-engine';

type ReplyTarget = MessageEventSource & Pick<Window, 'postMessage'>;
type WithoutEnvelope<T> = T extends unknown ? Omit<T, 'channel' | 'version'> : never;
type ResponsePayload = WithoutEnvelope<PseudoLayerResponse>;
type ChatRefreshMode = 'none' | 'affected' | 'all';

type NativeSwipeMessage = {
  mes?: string;
  send_date?: unknown;
  gen_started?: unknown;
  gen_finished?: unknown;
  extra?: Record<string, unknown>;
  swipe_id?: number;
  swipes?: unknown[];
  swipe_info?: Array<
    | {
        send_date?: unknown;
        gen_started?: unknown;
        gen_finished?: unknown;
        extra?: Record<string, unknown>;
      }
    | undefined
  >;
};

type GenerationReasoning = {
  messageId: number;
  text: string;
  duration: number | null;
  state: PseudoLayerReasoningState;
};

type NativeReasoningHandler = {
  state?: unknown;
  reasoning?: unknown;
  reasoningDisplayText?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  initialTime?: unknown;
  getDuration?: () => unknown;
};

type NativeStreamingProcessor = {
  messageId?: unknown;
  reasoningHandler?: NativeReasoningHandler;
};

type TavernRuntimeWindow = Window & {
  SillyTavern?: {
    getContext?: () => {
      streamingProcessor?: NativeStreamingProcessor | null;
    };
  };
};

type ActiveGeneration = {
  requestId: string;
  source: ReplyTarget;
  operation: PseudoLayerGenerationOperation;
  state: Exclude<PseudoLayerGenerationState, 'idle'>;
  baseMessageId: number;
  interaction: PseudoLayerInteraction;
  rawUserText: string;
  engine: DialogueEngineKind;
  generationId?: string;
  operationId?: string;
  chatId?: string;
  baselineLastMessageId?: number;
  cancelled?: boolean;
  userMessageId?: number;
  sent: boolean;
  received: boolean;
  streamText: string;
  streamReaction: string;
  reasoning?: GenerationReasoning;
  lockedView?: PseudoLayerView;
  rerollOriginal?: {
    messageId: number;
    name: string;
    role: 'system' | 'assistant' | 'user';
    isHidden: boolean;
    message: string;
    data: Record<string, any>;
    extra: Record<string, any>;
    swipeId?: number;
    swipes?: string[];
    swipesData?: Record<string, any>[];
    swipesInfo?: Record<string, any>[];
  };
  nativeSwipeOriginal?: NativeSwipeMessage;
  rerollRollback?: Promise<boolean>;
  rerollFailure?: Promise<void>;
};

type StageEntry = {
  representativeMessageId: number;
  messageIds: number[];
  stage: PseudoLayerStage;
};

type StageSnapshot = {
  assistantIds: Set<number>;
  entries: StageEntry[];
  messages: ChatMessage[];
  messagesById: Map<number, ChatMessage>;
  previousMessages: Map<number, ChatMessage>;
  timelineEntries?: PseudoLayerTimelineEntry[];
};

type ControllerLease = {
  instanceId: string;
  dispose: () => void;
};

type ControllerHostWindow = Window & {
  __dhlPseudoLayerControllerLease__?: ControllerLease;
};

const STYLE_ID = 'dhl-pseudo-layer-controller-style';
const INPUT_STORAGE_KEY = 'denghuolanshan:pseudo-layer:native-input-collapsed';
const PENDING_NATIVE_REROLL_STORAGE_KEY = 'denghuolanshan:pseudo-layer:pending-native-rerolls-v1';
const MOBILE_INPUT_DEFAULT_APPLIED_KEY = 'denghuolanshan:pseudo-layer:mobile-native-input-default-v1';
const MOBILE_VIEWPORT_QUERY = '(max-width: 760px)';
const INTERACTION_KEY = 'dhl_pseudo_interaction';
const STAGE_CLASS = 'dhl-pseudo-stage';
const SELECTED_CLASS = 'dhl-pseudo-selected';
const PARKED_FRAME_CLASS = 'dhl-pseudo-frame-parked';
const FRAME_KEEPER_CLASS = 'dhl-pseudo-frame-keeper';
const ACTIVE_KEEPER_CLASS = 'dhl-pseudo-frame-active';
const STAGE_ROOT_ID = 'dhl-pseudo-stage-root';
const ROOT_ACTIVE_CLASS = 'dhl-pseudo-stage-root-active';
const STREAM_DISPATCH_INTERVAL_MS = window.matchMedia?.('(pointer: coarse)').matches ? 240 : 160;
const FRAME_CANDIDATE_BATCH_MS = 32;
const STORY_INTERACTION = { mode: 'story' } as const;
const tavernWindow = window.parent;
const tavernDocument = tavernWindow.document;
const controllerHost = tavernWindow as ControllerHostWindow;
const controllerFrame = window.frameElement as HTMLIFrameElement | null;
const controllerInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const registrations = new Map<number, ReplyTarget>();
const controllerEventStops: EventOnReturn[] = [];
const duplicatePruneTimers: number[] = [];
let sourceProtocolVersions = new WeakMap<ReplyTarget, number>();
let sourceFrameCache = new WeakMap<ReplyTarget, HTMLIFrameElement>();
const frameMessageIdCache = new WeakMap<HTMLIFrameElement, number>();
const pendingFrameCandidates = new Set<HTMLIFrameElement>();

// Heavy presets emit dense DOM and message-event bursts, so stage work stays cached and coalesced.
let activeGeneration: ActiveGeneration | null = null;
let activeInteraction: PseudoLayerInteraction = STORY_INTERACTION;
let selectedMessageId: number | null = null;
const selectedHistoryMessageIds: Record<PseudoLayerHistoryKind, number | null> = {
  story: null,
  dialogue: null,
};
let selectedHistoryKind: PseudoLayerHistoryKind | null = null;
let browsingHistory = false;
let deletingMessageId: number | null = null;
let updatingMessageId: number | null = null;
const nativeInputMedia = tavernWindow.matchMedia(MOBILE_VIEWPORT_QUERY);
const shouldApplyMobileInputDefault =
  nativeInputMedia.matches && localStorage.getItem(MOBILE_INPUT_DEFAULT_APPLIED_KEY) === null;
let nativeInputFollowsViewport = shouldApplyMobileInputDefault || localStorage.getItem(INPUT_STORAGE_KEY) === null;
let nativeInputCollapsed = shouldApplyMobileInputDefault
  ? true
  : nativeInputFollowsViewport
    ? nativeInputMedia.matches
    : localStorage.getItem(INPUT_STORAGE_KEY) === 'true';
if (shouldApplyMobileInputDefault) {
  localStorage.setItem(MOBILE_INPUT_DEFAULT_APPLIED_KEY, 'true');
  localStorage.setItem(INPUT_STORAGE_KEY, 'true');
}
let viewRevision = 0;
let frameObserver: MutationObserver | null = null;
let duplicateControllerObserver: MutationObserver | null = null;
let frameCandidateTimer: number | null = null;
let viewRefreshTimer: number | null = null;
let viewRefreshDeadline = 0;
let mobileStageAlignFrame: number | null = null;
let stageSnapshotCache: StageSnapshot | null = null;
let stageSnapshotLastMessageId = Number.NaN;
let streamDispatchTimer: number | null = null;
let pendingStreamDispatch: {
  requestId: string;
  source: ReplyTarget;
  text: string;
  reaction?: string;
  reasoning?: GenerationReasoning;
} | null = null;
let controllerDisposed = false;

const rememberSourceProtocolVersion = (source: ReplyTarget, version: number) => {
  const previous = sourceProtocolVersions.get(source) ?? 0;
  if (version > previous) sourceProtocolVersions.set(source, version);
};

const send = (source: ReplyTarget | undefined, message: ResponsePayload) => {
  source?.postMessage(
    {
      channel: PSEUDO_LAYER_CHANNEL,
      version: (source && sourceProtocolVersions.get(source)) ?? PSEUDO_LAYER_VERSION,
      ...message,
    } as PseudoLayerResponse,
    '*',
  );
};

const flushQueuedStream = (generation?: ActiveGeneration | null) => {
  if (streamDispatchTimer !== null) {
    window.clearTimeout(streamDispatchTimer);
    streamDispatchTimer = null;
  }
  const pending = pendingStreamDispatch;
  pendingStreamDispatch = null;
  if (!pending || (generation && pending.requestId !== generation.requestId)) return;
  if (!generation && activeGeneration?.requestId !== pending.requestId) return;
  send(pending.source, {
    type: 'stream',
    requestId: pending.requestId,
    text: pending.text,
    ...(pending.reaction ? { reaction: pending.reaction } : {}),
  });
  if (pending.reasoning) {
    send(pending.source, {
      type: 'reasoning',
      requestId: pending.requestId,
      ...pending.reasoning,
    });
  }
};

const queueStream = (
  generation: ActiveGeneration,
  text: string,
  reaction = '',
  reasoning?: GenerationReasoning,
) => {
  const queuedReasoning =
    reasoning ??
    (pendingStreamDispatch?.requestId === generation.requestId ? pendingStreamDispatch.reasoning : undefined);
  pendingStreamDispatch = {
    requestId: generation.requestId,
    source: generation.source,
    text,
    ...(reaction ? { reaction } : {}),
    ...(queuedReasoning ? { reasoning: queuedReasoning } : {}),
  };
  if (streamDispatchTimer !== null) return;
  streamDispatchTimer = window.setTimeout(() => {
    streamDispatchTimer = null;
    flushQueuedStream();
  }, STREAM_DISPATCH_INTERVAL_MS);
};

const discardQueuedStream = () => {
  if (streamDispatchTimer !== null) window.clearTimeout(streamDispatchTimer);
  streamDispatchTimer = null;
  pendingStreamDispatch = null;
};

const sendGenerationState = (
  generation: ActiveGeneration,
  state: Exclude<PseudoLayerGenerationState, 'idle'>,
  source = generation.source,
) => {
  generation.state = state;
  send(source, {
    type: 'state',
    requestId: generation.requestId,
    state,
    operation: generation.operation,
    ...(generation.rawUserText ? { userText: generation.rawUserText } : {}),
  });
};

const replayGeneration = (generation: ActiveGeneration, source: ReplyTarget) => {
  sendGenerationState(generation, generation.state, source);
  if (generation.streamText) {
    send(source, {
      type: 'stream',
      requestId: generation.requestId,
      text: generation.streamText,
      ...(generation.streamReaction ? { reaction: generation.streamReaction } : {}),
    });
  }
  if (generation.reasoning) {
    send(source, {
      type: 'reasoning',
      requestId: generation.requestId,
      ...generation.reasoning,
    });
  }
};

const asReplyTarget = (source: MessageEventSource | null): ReplyTarget | null => {
  if (!source || typeof (source as Window).postMessage !== 'function') return null;
  return source as ReplyTarget;
};

const normalizeDialogueContext = (value: unknown): DialogueContext | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DialogueContext>;
  if (candidate.mode !== 'dialogue' || (candidate.channel !== 'present' && candidate.channel !== 'transmission')) {
    return null;
  }
  const sessionId = String(candidate.sessionId ?? '').trim();
  const targetName = String(candidate.targetName ?? '').trim();
  const canonicalName = String(candidate.canonicalName ?? '').trim();
  if (!sessionId || !targetName || !canonicalName) return null;
  return { mode: 'dialogue', sessionId, targetName, canonicalName, channel: candidate.channel };
};

const isSameInteraction = (left: PseudoLayerInteraction, right: PseudoLayerInteraction) =>
  left.mode === right.mode &&
  (left.mode === 'story' ||
    (right.mode === 'dialogue' &&
      left.sessionId === right.sessionId &&
      left.targetName === right.targetName &&
      left.canonicalName === right.canonicalName &&
      left.channel === right.channel));

const setActiveInteraction = (interaction: PseudoLayerInteraction) => {
  const next =
    interaction.mode === 'dialogue' ? (normalizeDialogueContext(interaction) ?? STORY_INTERACTION) : STORY_INTERACTION;
  if (isSameInteraction(activeInteraction, next)) return;
  activeInteraction = next;
};

const getMessageElement = (messageId: number) =>
  tavernDocument.querySelector<HTMLElement>(`#chat > .mes[mesid='${messageId}']`);

const getStageRoot = (create = true) => {
  let root = tavernDocument.getElementById(STAGE_ROOT_ID);
  if (!root && create) {
    const chat = tavernDocument.querySelector<HTMLElement>('#chat');
    if (!chat) return null;
    root = tavernDocument.createElement('div');
    root.id = STAGE_ROOT_ID;
    chat.append(root);
  }
  return root;
};

const getFrameKeeper = (messageId: number, create = true) => {
  const root = getStageRoot(create);
  if (!root) return null;
  let keeper = root.querySelector<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}[data-message-id='${messageId}']`);
  if (!keeper && create) {
    keeper = tavernDocument.createElement('div');
    keeper.className = FRAME_KEEPER_CLASS;
    keeper.dataset.messageId = String(messageId);
    root.append(keeper);
  }
  return keeper ?? null;
};

const getFrameMessageId = (frame: HTMLIFrameElement) => {
  const rawMessageId = frame.dataset.dhlMessageId ?? frame.closest<HTMLElement>('.mes')?.getAttribute('mesid');
  if (rawMessageId === undefined || rawMessageId === null || rawMessageId.trim() === '') {
    return frameMessageIdCache.get(frame);
  }
  const messageId = Number(rawMessageId);
  if (Number.isFinite(messageId)) {
    frameMessageIdCache.set(frame, messageId);
    return messageId;
  }
  return frameMessageIdCache.get(frame);
};

const rememberFrame = (frame: HTMLIFrameElement) => {
  const source = asReplyTarget(frame.contentWindow);
  if (source) sourceFrameCache.set(source, frame);
  getFrameMessageId(frame);
};

const getFrameForSource = (source: ReplyTarget) => {
  const cached = sourceFrameCache.get(source);
  if (cached?.isConnected && cached.contentWindow === source) return cached;
  sourceFrameCache.delete(source);

  const frame = [
    ...tavernDocument.querySelectorAll<HTMLIFrameElement>(
      `#chat > .mes .TH-render iframe, #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe`,
    ),
  ].find(candidate => candidate.contentWindow === source);
  if (frame) rememberFrame(frame);
  return frame;
};

const hasMountedPseudoApp = (frame: HTMLIFrameElement | null | undefined) => {
  try {
    return Boolean(frame?.contentDocument?.querySelector('#app')?.childElementCount);
  } catch {
    return false;
  }
};

/**
 * 酒馆切换 swipe 时会清空 `.mes_text`，连同其中的 TH-render 一起销毁。
 * 原 iframe 受酒馆助手虚拟 DOM 管理，移动后仍会被删除；因此创建一个控制器自有
 * 的同源实例。原节点继续留给酒馆刷新，自有实例挂载完成后接管可见舞台。
 */
const parkFrame = (messageId: number, frame: HTMLIFrameElement) => {
  const message = getMessageElement(messageId);
  if (!message || message.getAttribute('is_user') === 'true') return false;
  const keeper = getFrameKeeper(messageId);
  if (!keeper) return false;

  const keptFrame = keeper.querySelector<HTMLIFrameElement>(':scope > iframe');
  if (keptFrame === frame) return true;
  if (keptFrame) {
    const keptSource = asReplyTarget(keptFrame.contentWindow);
    const keptIsLive =
      hasMountedPseudoApp(keptFrame) || (keptSource !== null && registrations.get(messageId) === keptSource);
    if (keptIsLive) return false;
    keptFrame.remove();
  }

  if (frame.dataset.dhlControllerOwned === 'true') {
    frame.dataset.dhlMessageId = String(messageId);
    keeper.append(frame);
    rememberFrame(frame);
    return true;
  }

  const ownedFrame = frame.cloneNode(false) as HTMLIFrameElement;
  ownedFrame.removeAttribute('id');
  ownedFrame.removeAttribute('loading');
  ownedFrame.dataset.dhlControllerOwned = 'true';
  ownedFrame.dataset.dhlMessageId = String(messageId);
  keeper.append(ownedFrame);
  rememberFrame(ownedFrame);
  message.classList.add(PARKED_FRAME_CLASS);
  return true;
};

const parkSourceFrame = (messageId: number, source: ReplyTarget) => {
  const frame = getFrameForSource(source);
  return frame ? parkFrame(messageId, frame) : false;
};

const getParkedMessageId = () => {
  const keepers = [...(getStageRoot(false)?.querySelectorAll<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}`) ?? [])];
  const isMounted = (keeper: HTMLElement) =>
    hasMountedPseudoApp(keeper.querySelector<HTMLIFrameElement>(':scope > iframe'));
  const active = keepers.find(keeper => keeper.classList.contains(ACTIVE_KEEPER_CLASS) && isMounted(keeper));
  const keeper = active ?? keepers.filter(isMounted).at(-1);
  const messageId = Number(keeper?.dataset.messageId);
  return Number.isFinite(messageId) ? messageId : undefined;
};

const syncParkedStage = (hostMessageId: number | undefined) => {
  const root = getStageRoot(false);
  let hasActiveFrame = false;
  root?.querySelectorAll<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}`).forEach(keeper => {
    const active =
      Number(keeper.dataset.messageId) === hostMessageId &&
      hasMountedPseudoApp(keeper.querySelector<HTMLIFrameElement>(':scope > iframe'));
    keeper.classList.toggle(ACTIVE_KEEPER_CLASS, active);
    if (active) hasActiveFrame = true;
  });
  tavernDocument.body.classList.toggle(ROOT_ACTIVE_CLASS, hasActiveFrame);
};

const releaseParkedFrames = () => {
  const root = getStageRoot(false);
  root?.querySelectorAll<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}`).forEach(keeper => {
    const messageId = Number(keeper.dataset.messageId);
    if (Number.isFinite(messageId)) getMessageElement(messageId)?.classList.remove(PARKED_FRAME_CLASS);
  });
  root?.remove();
  tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
};

const getAllMessages = (): ChatMessage[] => {
  const lastMessageId = getLastMessageId();
  if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return [];
  return getChatMessages(`0-${lastMessageId}`);
};

const getAdjacentMessages = (messageId: number): ChatMessage[] => {
  if (!Number.isFinite(messageId) || messageId < 0) return [];
  const normalizedMessageId = Math.trunc(messageId);
  return getChatMessages(`${Math.max(0, normalizedMessageId - 1)}-${normalizedMessageId}`);
};

const invalidateStageSnapshot = () => {
  stageSnapshotCache = null;
  stageSnapshotLastMessageId = Number.NaN;
};

const readInteractionMetadata = (message: ChatMessage | undefined): PseudoLayerInteractionMetadata | null => {
  if (!message) return null;
  const direct = message.extra?.[INTERACTION_KEY];
  const nested = message.extra?.extra?.[INTERACTION_KEY];
  const value = (direct ?? nested) as Partial<PseudoLayerInteractionMetadata> | undefined;
  if (!value || (value.version !== 1 && value.version !== 2) || value.kind !== 'dialogue') return null;
  const context = normalizeDialogueContext({ mode: 'dialogue', ...value });
  if (!context) return null;
  const userMessageId = Number(value.userMessageId);
  return {
    ...value,
    version: value.version,
    kind: 'dialogue',
    ...context,
    ...(typeof value.rawUserText === 'string' ? { rawUserText: value.rawUserText } : {}),
    ...(Number.isFinite(userMessageId) ? { userMessageId } : {}),
  } as PseudoLayerInteractionMetadata;
};

const toDialogueContext = (metadata: PseudoLayerInteractionMetadata): DialogueContext => ({
  mode: 'dialogue',
  sessionId: metadata.sessionId,
  targetName: metadata.targetName,
  canonicalName: metadata.canonicalName,
  channel: metadata.channel,
});

const findPreviousUserMessage = (messages: ChatMessage[], messageId: number) =>
  [...messages].reverse().find(message => message.role === 'user' && message.message_id < messageId);

const findPreviousMessage = (messages: ChatMessage[], messageId: number) =>
  [...messages].reverse().find(message => message.message_id < messageId);

const resolveAssistantInteractionMetadata = (
  message: ChatMessage | undefined,
  messages: ChatMessage[],
): PseudoLayerInteractionMetadata | null => {
  const direct = readInteractionMetadata(message);
  if (direct || !message || message.role !== 'assistant') return direct;

  const userMessage = findPreviousMessage(messages, message.message_id);
  if (userMessage?.role !== 'user') return null;
  const userMetadata = readInteractionMetadata(userMessage);
  if (!userMetadata) return null;
  return {
    ...userMetadata,
    userMessageId: userMessage.message_id,
  };
};

const getAssistantMessagesFromDom = (): ChatMessage[] =>
  [...tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes')]
    .filter(element => element.getAttribute('is_user') === 'false' && element.getAttribute('is_system') === 'false')
    .map(element => ({
      message_id: Number(element.getAttribute('mesid')),
      name: '',
      role: 'assistant' as const,
      is_hidden: false,
      message: '',
      data: {},
      extra: {},
    }))
    .filter(message => Number.isFinite(message.message_id));

const buildStageEntries = (
  assistantMessages: ChatMessage[],
  previousMessages: Map<number, ChatMessage>,
): StageEntry[] => {
  const entries: StageEntry[] = [];
  assistantMessages.forEach(message => {
    const directMetadata = readInteractionMetadata(message);
    const previousMessage = previousMessages.get(message.message_id);
    const inheritedMetadata =
      !directMetadata && previousMessage?.role === 'user' ? readInteractionMetadata(previousMessage) : null;
    const metadata =
      directMetadata ??
      (inheritedMetadata ? { ...inheritedMetadata, userMessageId: previousMessage!.message_id } : null);
    const previous = entries.at(-1);
    if (metadata && previous?.stage.kind === 'dialogue' && previous.stage.sessionId === metadata.sessionId) {
      previous.messageIds.push(message.message_id);
      previous.representativeMessageId = message.message_id;
      previous.stage.turnCount += 1;
      previous.stage.engine = metadata.engine ?? previous.stage.engine;
      return;
    }

    entries.push({
      representativeMessageId: message.message_id,
      messageIds: [message.message_id],
      stage: metadata
        ? {
            kind: 'dialogue',
            sessionId: metadata.sessionId,
            targetName: metadata.targetName,
            canonicalName: metadata.canonicalName,
            channel: metadata.channel,
            turnCount: 1,
            engine: metadata.engine,
          }
        : { kind: 'story' },
    });
  });
  return entries;
};

const getStageSnapshot = (): StageSnapshot => {
  const lastMessageId = getLastMessageId();
  if (stageSnapshotCache && stageSnapshotLastMessageId === lastMessageId) return stageSnapshotCache;

  let messages: ChatMessage[];
  let assistantMessages: ChatMessage[];
  try {
    messages = [...getAllMessages()].sort((left, right) => left.message_id - right.message_id);
    assistantMessages = messages.filter(message => message.role === 'assistant');
  } catch (error) {
    console.warn('[灯火阑珊·伪同层] 读取完整聊天楼层失败，暂时使用页面楼层', error);
    assistantMessages = getAssistantMessagesFromDom().sort((left, right) => left.message_id - right.message_id);
    messages = assistantMessages;
  }

  const previousMessages = new Map<number, ChatMessage>();
  const messagesById = new Map<number, ChatMessage>();
  let previousMessage: ChatMessage | undefined;
  messages.forEach(message => {
    messagesById.set(message.message_id, message);
    if (previousMessage) previousMessages.set(message.message_id, previousMessage);
    previousMessage = message;
  });

  stageSnapshotCache = {
    assistantIds: new Set(assistantMessages.map(message => message.message_id)),
    entries: buildStageEntries(assistantMessages, previousMessages),
    messages,
    messagesById,
    previousMessages,
  };
  stageSnapshotLastMessageId = lastMessageId;
  return stageSnapshotCache;
};

const readTimelineReasoning = (message: ChatMessage | undefined) => {
  const direct = (message?.extra ?? {}) as Record<string, any>;
  const nested =
    direct.extra && typeof direct.extra === 'object' ? (direct.extra as Record<string, any>) : ({} as Record<string, any>);
  const inlineReasoning = extractInlineReasoning(String(message?.message ?? ''));
  const reasoning = mergeReasoningText(
    String(direct.reasoning ?? nested.reasoning ?? '').trim(),
    inlineReasoning?.text ?? '',
  );
  const rawDuration = Number(direct.reasoning_duration ?? nested.reasoning_duration);
  return {
    reasoning,
    reasoningDuration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null,
  };
};

const isReasoningState = (value: unknown): value is PseudoLayerReasoningState =>
  value === 'none' || value === 'thinking' || value === 'done' || value === 'hidden';

const toReasoningTimestamp = (value: unknown) => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const readNativeLiveReasoning = (generation: ActiveGeneration): GenerationReasoning | null => {
  let processor: NativeStreamingProcessor | null | undefined;
  try {
    processor = (tavernWindow as TavernRuntimeWindow).SillyTavern?.getContext?.().streamingProcessor;
  } catch {
    processor = null;
  }

  const handler = processor?.reasoningHandler;
  const runtimeReasoning =
    typeof handler?.reasoningDisplayText === 'string' && handler.reasoningDisplayText.trim()
      ? handler.reasoningDisplayText
      : typeof handler?.reasoning === 'string'
        ? handler.reasoning
        : '';
  let text = runtimeReasoning.trim();
  let messageId = Number(processor?.messageId);
  let rawState: unknown = handler?.state;
  let duration: number | null = null;

  try {
    const reportedDuration = Number(handler?.getDuration?.());
    if (Number.isFinite(reportedDuration) && reportedDuration >= 0) duration = reportedDuration;
  } catch {
    // Older SillyTavern versions may expose the handler without getDuration().
  }

  if (duration === null && text) {
    const startedAt = toReasoningTimestamp(handler?.startTime) ?? toReasoningTimestamp(handler?.initialTime);
    const endedAt = toReasoningTimestamp(handler?.endTime);
    if (startedAt !== null) duration = Math.max(0, (endedAt ?? Date.now()) - startedAt);
  }

  const domMessage =
    (Number.isInteger(messageId) && messageId >= 0 ? getMessageElement(messageId) : null) ??
    [...tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes')]
      .reverse()
      .find(element => element.dataset.reasoningState === 'thinking' || element.classList.contains('last_mes'));
  if (domMessage) {
    const domMessageId = Number(domMessage.getAttribute('mesid'));
    if (!Number.isInteger(messageId) || messageId < 0) messageId = domMessageId;
    if (!text) text = (domMessage.querySelector<HTMLElement>('.mes_reasoning')?.innerText ?? '').trim();
    rawState ??=
      domMessage.dataset.reasoningState ??
      domMessage.querySelector<HTMLDetailsElement>('.mes_reasoning_details')?.dataset.state;
    if (duration === null) {
      const domDuration = Number(
        domMessage.querySelector<HTMLElement>('.mes_reasoning_header_title')?.dataset.duration ??
          domMessage.querySelector<HTMLDetailsElement>('.mes_reasoning_details')?.dataset.duration,
      );
      if (Number.isFinite(domDuration) && domDuration > 0) {
        // The header exposes seconds while message extras and the pseudo layer use milliseconds.
        duration = domDuration * 1000;
      }
    }
  }

  if (!text) return null;
  if (!Number.isInteger(messageId) || messageId < 0) messageId = getLastMessageId();
  if (!Number.isInteger(messageId) || messageId < 0) messageId = generation.baseMessageId;
  const state = isReasoningState(rawState) && rawState !== 'none' ? rawState : 'thinking';
  return { messageId, text, duration, state };
};

const updateGenerationReasoning = (
  generation: ActiveGeneration,
  reasoning: GenerationReasoning | null,
): GenerationReasoning | undefined => {
  if (!reasoning) return undefined;
  const previous = generation.reasoning;
  generation.reasoning = reasoning;
  if (
    previous?.messageId === reasoning.messageId &&
    previous.text === reasoning.text &&
    previous.duration === reasoning.duration &&
    previous.state === reasoning.state
  ) {
    return undefined;
  }
  return reasoning;
};

const readMessageTokenCount = (message: ChatMessage | undefined) => {
  const direct = (message?.extra ?? {}) as Record<string, any>;
  const nested =
    direct.extra && typeof direct.extra === 'object' ? (direct.extra as Record<string, any>) : ({} as Record<string, any>);
  const value = Number(direct.token_count ?? nested.token_count);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
};

const readTimelineUserText = (
  message: ChatMessage | undefined,
  metadata: PseudoLayerInteractionMetadata | null,
) => {
  if (!message) return '';
  if (metadata?.rawUserText) return metadata.rawUserText.trim();
  return String(message.message ?? '')
    .replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, '')
    .trim();
};

const hydrateTimelineEntries = (snapshot: StageSnapshot): PseudoLayerTimelineEntry[] => {
  if (snapshot.timelineEntries) return snapshot.timelineEntries;
  const historyIndexes: Record<PseudoLayerHistoryKind, number> = { story: 0, dialogue: 0 };

  const timelineEntries = snapshot.entries.map((entry, index) => {
    const history = entry.stage.kind;
    historyIndexes[history] += 1;
    const turns = entry.messageIds.flatMap<PseudoLayerTimelineTurn>(assistantMessageId => {
      const assistant = snapshot.messagesById.get(assistantMessageId);
      if (!assistant) return [];
      const metadata = resolveAssistantInteractionMetadata(assistant, snapshot.messages);
      const previous = snapshot.previousMessages.get(assistantMessageId);
      const linkedUser =
        (metadata?.userMessageId !== undefined ? snapshot.messagesById.get(metadata.userMessageId) : undefined) ??
        (previous?.role === 'user' ? previous : undefined);
      const visibleDialogue = metadata ? extractDialogueContent(String(assistant.message ?? '')) : null;
      const reasoning = readTimelineReasoning(assistant);
      const tokenCount = readMessageTokenCount(assistant);
      return [
        {
          assistantMessageId,
          ...(linkedUser ? { userMessageId: linkedUser.message_id } : {}),
          userText: readTimelineUserText(linkedUser, metadata),
          assistantText: String(assistant.message ?? ''),
          ...(metadata
            ? {
                reaction:
                  String(metadata.reaction ?? visibleDialogue?.reaction ?? '')
                    .replace(/<\/?(?:反应|正文|会话状态)(?=[\s/>])[^>]*>/gi, '')
                    .trim() || undefined,
              }
            : {}),
          ...reasoning,
          ...(tokenCount !== undefined ? { tokenCount } : {}),
        },
      ];
    });

    return {
      representativeMessageId: entry.representativeMessageId,
      messageIds: [...entry.messageIds],
      index: index + 1,
      historyIndex: historyIndexes[history],
      stage: { ...entry.stage },
      turns,
    };
  });
  snapshot.timelineEntries = timelineEntries;
  return timelineEntries;
};

const findTimelineEntryIndex = (entries: PseudoLayerTimelineEntry[], messageId: number | undefined) => {
  if (!Number.isFinite(messageId)) return entries.length - 1;
  const normalized = Math.trunc(messageId!);
  const exact = entries.findIndex(
    entry => entry.representativeMessageId === normalized || entry.messageIds.includes(normalized),
  );
  return exact >= 0 ? exact : entries.length - 1;
};

const sendTimelinePage = (
  source: ReplyTarget,
  request: Extract<PseudoLayerRequest, { type: 'timeline_page' }>,
) => {
  const snapshot = getStageSnapshot();
  const entries = hydrateTimelineEntries(snapshot);
  const limit = _.clamp(Math.trunc(Number(request.limit) || 8), 1, 20);
  const anchorIndex = findTimelineEntryIndex(entries, request.anchorMessageId);
  let start: number;
  let end: number;

  if (request.direction === 'older') {
    end = Math.max(0, anchorIndex);
    start = Math.max(0, end - limit);
  } else if (request.direction === 'newer') {
    start = Math.min(entries.length, anchorIndex + 1);
    end = Math.min(entries.length, start + limit);
  } else {
    start = _.clamp(anchorIndex - Math.floor((limit - 1) / 2), 0, Math.max(0, entries.length - limit));
    end = Math.min(entries.length, start + limit);
  }

  send(source, {
    type: 'timeline_page',
    requestId: request.requestId,
    revision: viewRevision,
    entries: entries.slice(start, end),
    hasOlder: start > 0,
    hasNewer: end < entries.length,
  });
};

const getStageEntries = () => getStageSnapshot().entries;

const latestStageId = () => getStageEntries().at(-1)?.representativeMessageId;

const getHistoryEntries = (entries: StageEntry[], history: PseudoLayerHistoryKind) =>
  entries.filter(entry => entry.stage.kind === history);

const getHistoryLatestMessageId = (history: PseudoLayerHistoryKind, entries = getStageEntries()) =>
  getHistoryEntries(entries, history).at(-1)?.representativeMessageId;

const getGenerationAnchor = (history: PseudoLayerHistoryKind, entries = getStageEntries()) =>
  getHistoryLatestMessageId(history, entries) ?? entries.at(-1)?.representativeMessageId;

const resolveHistorySelection = (entries: StageEntry[], history: PseudoLayerHistoryKind): number | null => {
  const historyEntries = getHistoryEntries(entries, history);
  if (historyEntries.length === 0) {
    selectedHistoryMessageIds[history] = null;
    return null;
  }

  const remembered = selectedHistoryMessageIds[history];
  const selectedEntry = historyEntries.find(
    entry =>
      entry.representativeMessageId === remembered || (remembered !== null && entry.messageIds.includes(remembered)),
  );
  const selected = selectedEntry ?? historyEntries.at(-1)!;
  selectedHistoryMessageIds[history] = selected.representativeMessageId;
  return selected.representativeMessageId;
};

const makeHistoryState = (entries: StageEntry[], history: PseudoLayerHistoryKind): PseudoLayerHistoryState => {
  const historyEntries = getHistoryEntries(entries, history);
  const ids = historyEntries.map(entry => entry.representativeMessageId);
  const selected = resolveHistorySelection(entries, history) ?? -1;
  const position = ids.indexOf(selected);
  const latestMessageId = ids.at(-1) ?? -1;
  return {
    selectedMessageId: selected,
    latestMessageId,
    index: position >= 0 ? position + 1 : 0,
    total: ids.length,
    previousMessageId: position > 0 ? ids[position - 1] : undefined,
    nextMessageId: position >= 0 && position < ids.length - 1 ? ids[position + 1] : undefined,
    isLatest: selected === latestMessageId,
  };
};

const rememberStageSelection = (messageId: number, entries = getStageEntries()) => {
  const entry = entries.find(
    candidate => candidate.representativeMessageId === messageId || candidate.messageIds.includes(messageId),
  );
  if (!entry) return;
  selectedHistoryMessageIds[entry.stage.kind] = entry.representativeMessageId;
};

const parkCandidateFrame = (frame: HTMLIFrameElement, latestMessageId = latestStageId()) => {
  rememberFrame(frame);
  const messageId = getFrameMessageId(frame);
  if (messageId === undefined) return;
  const shouldPark =
    messageId === latestMessageId ||
    (activeGeneration?.operation === 'reroll' && messageId === activeGeneration.baseMessageId);
  if (!shouldPark) return;
  if (parkFrame(messageId, frame)) scheduleViewRefresh(0);
};

const flushFrameCandidates = () => {
  frameCandidateTimer = null;
  if (controllerDisposed || pendingFrameCandidates.size === 0) return;
  const frames = [...pendingFrameCandidates];
  pendingFrameCandidates.clear();
  const latestMessageId = latestStageId();
  frames.forEach(frame => {
    if (frame.isConnected) parkCandidateFrame(frame, latestMessageId);
  });
};

const queueFrameCandidate = (frame: HTMLIFrameElement) => {
  rememberFrame(frame);
  pendingFrameCandidates.add(frame);
  if (frameCandidateTimer !== null) return;
  frameCandidateTimer = window.setTimeout(flushFrameCandidates, FRAME_CANDIDATE_BATCH_MS);
};

const inspectAddedFrameNode = (node: Node) => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as Element;
  if (element.tagName === 'IFRAME') {
    queueFrameCandidate(element as HTMLIFrameElement);
    return;
  }

  const containsRelevantFrames =
    element.matches('.mes, .TH-render') ||
    element.closest('.TH-render') !== null ||
    element.id === STAGE_ROOT_ID ||
    element.classList.contains(FRAME_KEEPER_CLASS);
  if (!containsRelevantFrames) return;
  element.querySelectorAll<HTMLIFrameElement>('iframe').forEach(queueFrameCandidate);
};

const installFrameObserver = () => {
  frameObserver?.disconnect();
  const chat = tavernDocument.querySelector<HTMLElement>('#chat');
  if (!chat) return;
  frameObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(inspectAddedFrameNode));
  });
  frameObserver.observe(chat, { childList: true, subtree: true });
};

const parkLatestStageFrame = () => {
  const messageId = latestStageId();
  if (messageId === undefined) return;
  const frame = getMessageElement(messageId)?.querySelector<HTMLIFrameElement>('.TH-render iframe');
  if (frame) parkCandidateFrame(frame);
};

const getSourceMessageId = (source: ReplyTarget) => {
  const frame = getFrameForSource(source);
  return frame ? getFrameMessageId(frame) : undefined;
};

const getLiveRegistration = (messageId: number) => {
  const source = registrations.get(messageId);
  if (!source) return undefined;
  if (getSourceMessageId(source) === messageId) return source;
  registrations.delete(messageId);
  return undefined;
};

const getRegisteredAssistantIds = () =>
  [...registrations.keys()]
    .filter(messageId => getLiveRegistration(messageId) !== undefined)
    .sort((left, right) => left - right);

const getRerollLock = () => (activeGeneration?.operation === 'reroll' ? activeGeneration.lockedView : undefined);

const getHostStageId = () => {
  if (activeGeneration?.operation === 'reroll' && getMessageElement(activeGeneration.baseMessageId)) {
    return activeGeneration.baseMessageId;
  }
  return getRegisteredAssistantIds().at(-1) ?? getParkedMessageId();
};

const makeView = (entries = getStageEntries()): PseudoLayerView => {
  const lockedView = getRerollLock();
  if (lockedView) {
    return {
      ...lockedView,
      hostMessageId: getHostStageId() ?? lockedView.hostMessageId,
      nativeInputCollapsed,
      activeInteraction: activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION,
    };
  }

  const ids = entries.map(entry => entry.representativeMessageId);
  const latestMessageId = ids.at(-1) ?? -1;
  const selected = selectedMessageId !== null && ids.includes(selectedMessageId) ? selectedMessageId : latestMessageId;
  const position = ids.indexOf(selected);
  const selectedEntry = entries[position];
  const selectedAssistantMessageId = selectedEntry?.messageIds.at(-1) ?? selected;
  const tokenCount = readMessageTokenCount(getStageSnapshot().messagesById.get(selectedAssistantMessageId));
  return {
    hostMessageId: getHostStageId() ?? -1,
    revision: viewRevision,
    selectedMessageId: selected,
    latestMessageId,
    index: position >= 0 ? position + 1 : 0,
    total: ids.length,
    previousMessageId: position > 0 ? ids[position - 1] : undefined,
    nextMessageId: position >= 0 && position < ids.length - 1 ? ids[position + 1] : undefined,
    isLatest: selected === latestMessageId,
    nativeInputCollapsed,
    ...(tokenCount !== undefined ? { tokenCount } : {}),
    stage: selectedEntry?.stage ?? { kind: 'story' },
    histories: {
      story: makeHistoryState(entries, 'story'),
      dialogue: makeHistoryState(entries, 'dialogue'),
    },
    activeInteraction: activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION,
  };
};

const applyNativeInputState = () => {
  tavernDocument.body.classList.toggle('dhl-native-input-collapsed', nativeInputCollapsed);

  const chat = tavernDocument.querySelector<HTMLElement>('#chat');
  if (!chat) return;
  chat.scrollTop = 0;
  if (mobileStageAlignFrame !== null) tavernWindow.cancelAnimationFrame(mobileStageAlignFrame);
  mobileStageAlignFrame = tavernWindow.requestAnimationFrame(() => {
    mobileStageAlignFrame = null;
    if (!controllerDisposed && chat.isConnected) chat.scrollTop = 0;
  });
};

const restoreNativeChatPosition = () => {
  const chat = tavernDocument.querySelector<HTMLElement>('#chat');
  if (!chat) return;

  const scrollToLatest = () => {
    const activeLease = controllerHost.__dhlPseudoLayerControllerLease__;
    if (!chat.isConnected || (activeLease && activeLease.instanceId !== controllerInstanceId)) return;
    chat.scrollTop = chat.scrollHeight;
  };

  // 停放的 iframe 恢复后高度可能连续变化两帧，因此在原生布局稳定前持续校正到底部。
  tavernWindow.requestAnimationFrame(() => {
    scrollToLatest();
    tavernWindow.requestAnimationFrame(scrollToLatest);
  });
};

const handleNativeInputViewportChange = (event: MediaQueryListEvent) => {
  if (!nativeInputFollowsViewport) return;
  nativeInputCollapsed = event.matches;
  broadcastView();
};

const applyStageVisibility = (snapshot = getStageSnapshot()) => {
  const entries = snapshot.entries;
  const ids = entries.map(entry => entry.representativeMessageId);
  if (!getRerollLock()) {
    const scopedIds = selectedHistoryKind
      ? getHistoryEntries(entries, selectedHistoryKind).map(entry => entry.representativeMessageId)
      : ids;
    if (!activeGeneration) {
      if (selectedHistoryKind) {
        if (selectedMessageId === null || !scopedIds.includes(selectedMessageId)) {
          selectedMessageId = scopedIds.at(-1) ?? ids.at(-1) ?? null;
        }
      } else if (!browsingHistory) {
        selectedMessageId = ids.at(-1) ?? null;
      }
    }
    if (selectedMessageId !== null && !ids.includes(selectedMessageId)) {
      selectedMessageId = scopedIds.at(-1) ?? ids.at(-1) ?? null;
    }
  }
  const hostMessageId = getHostStageId();
  const assistantIds = snapshot.assistantIds;

  tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes').forEach(element => {
    const id = Number(element.getAttribute('mesid'));
    element.classList.toggle(STAGE_CLASS, assistantIds.has(id));
    element.classList.toggle(SELECTED_CLASS, id === hostMessageId);
  });
  syncParkedStage(hostMessageId);
  tavernDocument.body.classList.toggle('dhl-pseudo-layer-active', hostMessageId !== undefined);
  applyNativeInputState();
};

const broadcastView = () => {
  if (viewRefreshTimer !== null) {
    window.clearTimeout(viewRefreshTimer);
    viewRefreshTimer = null;
    viewRefreshDeadline = 0;
  }
  const snapshot = getStageSnapshot();
  applyStageVisibility(snapshot);
  const view = makeView(snapshot.entries);
  const registeredIds = getRegisteredAssistantIds();
  registeredIds.forEach(messageId => send(registrations.get(messageId), { type: 'view', view }));
};

const scheduleViewRefresh = (delay = 0, invalidateSnapshot = false) => {
  if (invalidateSnapshot) invalidateStageSnapshot();
  const deadline = Date.now() + Math.max(0, delay);
  if (viewRefreshTimer !== null && viewRefreshDeadline <= deadline) return;
  if (viewRefreshTimer !== null) window.clearTimeout(viewRefreshTimer);
  viewRefreshDeadline = deadline;
  viewRefreshTimer = window.setTimeout(
    () => {
      viewRefreshTimer = null;
      viewRefreshDeadline = 0;
      if (!controllerDisposed) broadcastView();
    },
    Math.max(0, deadline - Date.now()),
  );
};

const installStyle = () => {
  if (tavernDocument.getElementById(STYLE_ID)) return;
  const style = tavernDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    body.dhl-pseudo-layer-active #show_more_messages { display: none !important; }
    body.dhl-pseudo-layer-active #chat > .mes { display: none !important; }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} {
      display: flex !important;
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #${STAGE_ROOT_ID} { display: none !important; }
    body.${ROOT_ACTIVE_CLASS} #chat > .mes.${SELECTED_CLASS} { display: none !important; }
    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} { display: none !important; }
    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS} {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
    }
    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe {
      display: block !important;
      width: 100% !important;
      border: 0 !important;
    }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .for_checkbox,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .del_checkbox,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .mesAvatarWrapper,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipe_left,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipeRightBlock,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .ch_name,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_reasoning_details,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_media_wrapper,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_file_wrapper,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_bias { display: none !important; }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_block,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { width: 100% !important; max-width: none !important; }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { padding: 0 !important; }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text > :not(.TH-render) { display: none !important; }
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render,
    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render > iframe { width: 100% !important; }
    body.dhl-native-input-collapsed #form_sheld { display: none !important; }
    body.dhl-pseudo-layer-active.dhl-native-input-collapsed {
      --bottomFormBlockSize: 0px !important;
    }
    body.dhl-pseudo-layer-active.dhl-native-input-collapsed #chat {
      height: 100% !important;
      max-height: 100% !important;
    }
    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID},
    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS},
    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS} > iframe {
      height: 100% !important;
      min-height: 0 !important;
      max-height: 100% !important;
    }
    body.dhl-pseudo-layer-active #chat {
      overflow: hidden !important;
      overflow-anchor: none !important;
      overscroll-behavior: none !important;
      scrollbar-width: none !important;
    }
    body.dhl-pseudo-layer-active #chat::-webkit-scrollbar { display: none !important; }
  `;
  tavernDocument.head.append(style);
};

const buildMessage = (reply: string) => {
  const text = reply.trim();
  if (/<visual_cards>[\s\S]*?<\/visual_cards>/i.test(text) || /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(text)) {
    return text;
  }
  return `${text}\n\n<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
};

const buildEditedMessage = (content: string) => {
  if (
    /<visual_cards>[\s\S]*?<\/visual_cards>/i.test(content) ||
    /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(content)
  ) {
    return content;
  }
  const separator = content.length === 0 ? '' : content.endsWith('\n') ? '\n' : '\n\n';
  return `${content}${separator}<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
};

const ensurePseudoMarker = async (messageId: number, refresh: ChatRefreshMode = 'affected') => {
  const message = getChatMessages(messageId)[0];
  if (!message || message.role !== 'assistant') return;
  const content = String(message.message ?? '');
  const nextContent = buildMessage(content);
  if (nextContent === content.trim()) return;
  await setChatMessages([{ message_id: messageId, message: nextContent }], { refresh });
};

const writeInteractionMetadata = async (
  messageId: number,
  context: DialogueContext,
  options: { rawUserText?: string; userMessageId?: number } = {},
) => {
  const message = getChatMessages(messageId)[0];
  if (!message) return;
  const existing = readInteractionMetadata(message);
  const metadata: PseudoLayerInteractionMetadata = {
    ...existing,
    version: 2,
    kind: 'dialogue',
    ...context,
    engine: existing?.engine ?? 'native',
    ...(options.rawUserText ? { rawUserText: options.rawUserText } : {}),
    ...(Number.isFinite(options.userMessageId) ? { userMessageId: options.userMessageId } : {}),
  };
  await setChatMessages(
    [
      {
        message_id: messageId,
        extra: {
          ...(message.extra ?? {}),
          [INTERACTION_KEY]: metadata,
        },
      },
    ],
    { refresh: 'none' },
  );
};

const decorateDialogueInput = (text: string, context: DialogueContext) => {
  const value = text.trim();
  const prefix = context.channel === 'present' ? `（对${context.targetName}说）` : `（向${context.targetName}传讯）`;
  return value.startsWith(prefix) ? value : `${prefix}${value}`;
};

const triggerNativeSend = (prompt: string) => {
  const textarea = tavernDocument.querySelector<HTMLTextAreaElement>('#send_textarea');
  const sendButton = tavernDocument.querySelector<HTMLElement>('#send_but');
  if (!textarea || !sendButton) throw new Error('没有找到酒馆原生输入区。');
  textarea.value = prompt;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

const triggerNativeReroll = async (messageId: number) => {
  const context = (
    tavernWindow as typeof tavernWindow & {
      SillyTavern?: {
        getContext?: () => {
          chat?: NativeSwipeMessage[];
          swipe?: {
            right?: (
              event?: Event | null,
              options?: { source?: string; repeated?: boolean; message?: unknown },
            ) => Promise<void>;
          };
        };
      };
    }
  ).SillyTavern?.getContext?.();
  const swipeRight = context?.swipe?.right;
  if (typeof swipeRight !== 'function') throw new Error('当前酒馆版本没有提供原生重生成接口。');

  const nativeButton = getMessageElement(messageId)?.querySelector<HTMLElement>('.swipe_right');
  const nativeMessage = context?.chat?.[messageId];
  if (!nativeMessage) throw new Error(`没有找到第 ${messageId} 楼的原生消息。`);
  repairNativeSwipeState(messageId, nativeMessage);
  await swipeRight.call(nativeButton ?? context?.swipe, null, {
    source: 'dhl-pseudo-layer',
    message: nativeMessage,
  });
};

const getNativeSwipeMessage = (messageId: number): NativeSwipeMessage | undefined => {
  const context = (
    tavernWindow as typeof tavernWindow & {
      SillyTavern?: { getContext?: () => { chat?: NativeSwipeMessage[] } };
    }
  ).SillyTavern?.getContext?.();
  return context?.chat?.[messageId];
};

const stripNativeSwipeMarker = (value: unknown) =>
  String(value ?? '')
    .replace(/<pseudo_layer>[\s\S]*?<\/pseudo_layer>/gi, '')
    .trim();

const isNativeSwipePlaceholder = (value: unknown) => stripNativeSwipeMarker(value) === '...';

const isUsableNativeSwipeCandidate = (value: unknown) => {
  const visible = stripNativeSwipeMarker(value);
  return visible.length > 0 && !isNativeSwipePlaceholder(value);
};

const isNativeSwipeCandidateIncomplete = (message: NativeSwipeMessage, index: number) => {
  const swipeInfo = message.swipe_info?.[index];
  if (swipeInfo?.gen_started != null) return swipeInfo.gen_finished == null;
  if (message.swipe_id === index && message.gen_started != null) return message.gen_finished == null;
  return false;
};

const repairNativeSwipeState = (messageId: number, message: NativeSwipeMessage) => {
  if (!Array.isArray(message.swipes) || message.swipes.length === 0) return;

  const swipeId = message.swipe_id;
  const isValid =
    Number.isInteger(swipeId) &&
    (swipeId as number) >= 0 &&
    (swipeId as number) < message.swipes.length &&
    isUsableNativeSwipeCandidate(message.swipes[swipeId as number]) &&
    !isNativeSwipeCandidateIncomplete(message, swipeId as number) &&
    isUsableNativeSwipeCandidate(message.mes);
  if (isValid) return false;

  const fallbackSwipeId = message.swipes.findLastIndex(
    (candidate, index) =>
      isUsableNativeSwipeCandidate(candidate) && !isNativeSwipeCandidateIncomplete(message, index),
  );
  if (fallbackSwipeId < 0) throw new Error(`第 ${messageId} 楼没有可恢复的重生成候选。`);

  // fallback 之后只可能是占位符或未写完的候选。必须整段移除，否则下一次 swipe.right
  // 会优先切回这个半成品，而不会真正发起新的重答。
  if (message.swipes.length > fallbackSwipeId + 1) {
    message.swipes.splice(fallbackSwipeId + 1);
  }
  if (Array.isArray(message.swipe_info) && message.swipe_info.length > fallbackSwipeId + 1) {
    message.swipe_info.splice(fallbackSwipeId + 1);
  }

  message.swipe_id = fallbackSwipeId;
  message.mes = message.swipes[fallbackSwipeId] as string;
  const swipeInfo = message.swipe_info?.[fallbackSwipeId];
  if (swipeInfo) {
    message.send_date = swipeInfo.send_date ?? message.send_date;
    message.gen_started = swipeInfo.gen_started;
    message.gen_finished = swipeInfo.gen_finished;
    message.extra = _.cloneDeep(swipeInfo.extra ?? message.extra ?? {});
  }
  console.warn(`[灯火阑珊·伪同层] 已修复第 ${messageId} 楼失效的 swipe 候选：${String(swipeId)} -> ${fallbackSwipeId}`);
  return true;
};

const isNativeSwipeMaterialized = (messageId: number, generation = activeGeneration) => {
  const message = getNativeSwipeMessage(messageId);
  if (!message) return false;
  if (!isUsableNativeSwipeCandidate(message.mes)) return false;
  if (!Number.isInteger(message.swipe_id) || !Array.isArray(message.swipes)) {
    return generation?.operation !== 'reroll' || message.mes !== generation.nativeSwipeOriginal?.mes;
  }
  const swipeId = message.swipe_id as number;
  if (
    swipeId < 0 ||
    swipeId >= message.swipes.length ||
    !isUsableNativeSwipeCandidate(message.swipes[swipeId]) ||
    isNativeSwipeCandidateIncomplete(message, swipeId)
  ) {
    return false;
  }
  if (generation?.operation !== 'reroll' || !generation.nativeSwipeOriginal) return true;
  const original = generation.nativeSwipeOriginal;
  return (
    swipeId !== original.swipe_id ||
    message.swipes.length !== (original.swipes?.length ?? 0) ||
    String(message.swipes[swipeId] ?? '') !== String(original.mes ?? '')
  );
};

const waitForNativeSwipeMaterialized = async (
  messageId: number,
  timeout = 5000,
  generation = activeGeneration,
) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (isNativeSwipeMaterialized(messageId, generation)) return true;
    await new Promise(resolve => window.setTimeout(resolve, 50));
  }
  return isNativeSwipeMaterialized(messageId, generation);
};

const getCurrentChatId = () =>
  String(
    (
      tavernWindow as typeof tavernWindow & {
        SillyTavern?: { getCurrentChatId?: () => string };
      }
    ).SillyTavern?.getCurrentChatId?.() ?? '',
  );

type NativeRerollOriginal = NonNullable<ActiveGeneration['rerollOriginal']>;
type PendingNativeRerollRecord = {
  version: 1;
  chatId: string;
  requestId: string;
  createdAt: number;
  original: NativeRerollOriginal;
  nativeSwipeOriginal: NativeSwipeMessage;
};

const captureNativeRerollOriginal = (message: ChatMessage): NativeRerollOriginal => {
  const swipeSnapshot = getChatMessages(message.message_id, { include_swipes: true })[0];
  return {
    messageId: message.message_id,
    name: String(message.name ?? ''),
    role: message.role,
    isHidden: Boolean(message.is_hidden),
    message: String(message.message ?? ''),
    data: _.cloneDeep(message.data ?? {}),
    extra: _.cloneDeep(message.extra ?? {}),
    ...(swipeSnapshot
      ? {
          swipeId: swipeSnapshot.swipe_id,
          swipes: _.cloneDeep(swipeSnapshot.swipes ?? []),
          swipesData: _.cloneDeep(swipeSnapshot.swipes_data ?? []),
          swipesInfo: _.cloneDeep(swipeSnapshot.swipes_info ?? []),
        }
      : {}),
  };
};

const readPendingNativeRerolls = (): PendingNativeRerollRecord[] => {
  try {
    const parsed = JSON.parse(tavernWindow.sessionStorage.getItem(PENDING_NATIVE_REROLL_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (record): record is PendingNativeRerollRecord =>
        record?.version === 1 &&
        typeof record.chatId === 'string' &&
        Number.isInteger(record.original?.messageId) &&
        record.original?.role === 'assistant',
    );
  } catch (error) {
    console.warn('[灯火阑珊·伪同层] 无法读取重答恢复快照', error);
    return [];
  }
};

const writePendingNativeRerolls = (records: PendingNativeRerollRecord[]) => {
  try {
    if (records.length === 0) tavernWindow.sessionStorage.removeItem(PENDING_NATIVE_REROLL_STORAGE_KEY);
    else tavernWindow.sessionStorage.setItem(PENDING_NATIVE_REROLL_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('[灯火阑珊·伪同层] 无法保存重答恢复快照，将仅使用本次运行内存回滚', error);
  }
};

const persistPendingNativeReroll = (generation: ActiveGeneration) => {
  if (
    generation.operation !== 'reroll' ||
    generation.engine !== 'native' ||
    !generation.chatId ||
    !generation.rerollOriginal ||
    !generation.nativeSwipeOriginal
  ) {
    return;
  }
  const next = readPendingNativeRerolls().filter(
    record =>
      record.chatId !== generation.chatId || record.original.messageId !== generation.rerollOriginal?.messageId,
  );
  next.push({
    version: 1,
    chatId: generation.chatId,
    requestId: generation.requestId,
    createdAt: Date.now(),
    original: _.cloneDeep(generation.rerollOriginal),
    nativeSwipeOriginal: _.cloneDeep(generation.nativeSwipeOriginal),
  });
  writePendingNativeRerolls(next);
};

const clearPendingNativeReroll = (chatId: string | undefined, messageId: number | undefined) => {
  if (!chatId || !Number.isInteger(messageId)) return;
  writePendingNativeRerolls(
    readPendingNativeRerolls().filter(record => record.chatId !== chatId || record.original.messageId !== messageId),
  );
};

const restoreNativeSwipeSnapshot = (message: NativeSwipeMessage, snapshot: NativeSwipeMessage) => {
  const restore = <Key extends keyof NativeSwipeMessage>(key: Key) => {
    if (snapshot[key] === undefined) delete message[key];
    else message[key] = _.cloneDeep(snapshot[key]) as NativeSwipeMessage[Key];
  };
  restore('mes');
  restore('send_date');
  restore('gen_started');
  restore('gen_finished');
  restore('extra');
  restore('swipe_id');
  restore('swipes');
  restore('swipe_info');
};

const restoreNativeRerollRecord = async (
  chatId: string,
  original: NativeRerollOriginal,
  nativeSwipeOriginal: NativeSwipeMessage,
) => {
  if (getCurrentChatId() !== chatId) return false;

  let current = getChatMessages(original.messageId)[0];
  if (!current) {
    if (getLastMessageId() !== original.messageId - 1) {
      throw new Error(`第 ${original.messageId} 楼已不存在，且聊天记录发生了其他变化，未贸然插回原回复。`);
    }
    await createChatMessages(
      [
        {
          name: original.name,
          role: original.role,
          is_hidden: original.isHidden,
          message: original.message,
          data: _.cloneDeep(original.data),
          extra: _.cloneDeep(original.extra),
        },
      ],
      { insert_before: 'end', refresh: 'affected' },
    );
    current = getChatMessages(original.messageId)[0];
    if (!current) throw new Error(`第 ${original.messageId} 楼原回复重新插入失败。`);
  }

  const restorePayload = {
    message_id: original.messageId,
    name: original.name,
    role: original.role,
    is_hidden: original.isHidden,
    message: original.message,
    data: _.cloneDeep(original.data),
    extra: _.cloneDeep(original.extra),
    ...(original.swipes
      ? {
          swipe_id: original.swipeId ?? 0,
          swipes: _.cloneDeep(original.swipes),
          swipes_data: _.cloneDeep(original.swipesData ?? []),
          swipes_info: _.cloneDeep(original.swipesInfo ?? []),
        }
      : {}),
  } as Parameters<typeof setChatMessages>[0][number];
  await setChatMessages([restorePayload], { refresh: 'affected' });

  const nativeMessage = getNativeSwipeMessage(original.messageId);
  if (nativeMessage) restoreNativeSwipeSnapshot(nativeMessage, nativeSwipeOriginal);
  const restored = getChatMessages(original.messageId)[0];
  if (!restored || String(restored.message ?? '') !== original.message) {
    throw new Error(`第 ${original.messageId} 楼原回复校验失败。`);
  }
  return true;
};

const rollbackNativeReroll = (generation: ActiveGeneration): Promise<boolean> => {
  if (generation.rerollRollback) return generation.rerollRollback;
  if (
    generation.operation !== 'reroll' ||
    generation.engine !== 'native' ||
    !generation.rerollOriginal ||
    !generation.nativeSwipeOriginal ||
    !generation.chatId
  ) {
    return Promise.resolve(false);
  }

  const task = (async () => {
    const original = generation.rerollOriginal!;
    const restored = await restoreNativeRerollRecord(
      generation.chatId!,
      original,
      generation.nativeSwipeOriginal!,
    );
    if (!restored) return false;
    clearPendingNativeReroll(generation.chatId, original.messageId);
    invalidateStageSnapshot();
    selectedMessageId = original.messageId;
    selectedHistoryKind = generation.interaction.mode;
    rememberStageSelection(original.messageId);
    browsingHistory = false;
    viewRevision += 1;
    return true;
  })();
  generation.rerollRollback = task;
  return task;
};

const isNativeRerollBackAtOriginal = (generation: ActiveGeneration) => {
  const current = getNativeSwipeMessage(generation.baseMessageId);
  const original = generation.nativeSwipeOriginal;
  if (!current || !original) return false;
  const currentSwipeId = Number(current.swipe_id);
  const originalSwipeId = Number(original.swipe_id);
  return (
    Number.isInteger(currentSwipeId) &&
    Number.isInteger(originalSwipeId) &&
    currentSwipeId === originalSwipeId &&
    String(current.mes ?? '') === String(original.mes ?? '') &&
    (current.swipes?.length ?? 0) === (original.swipes?.length ?? 0)
  );
};

const waitForNativeRerollToSettle = async (generation: ActiveGeneration, timeout = 1800) => {
  // SillyTavern 收到接口错误后会先触发 STOPPED，再异步执行自身的 “Swiping back”。
  // 若此时立刻改写 swipes，会与酒馆回退互相覆盖，留下 swipe_id 指向越界候选。
  await new Promise(resolve => window.setTimeout(resolve, 360));
  const deadline = Date.now() + timeout;
  let stableChecks = 0;
  while (Date.now() < deadline) {
    if (isNativeRerollBackAtOriginal(generation)) {
      stableChecks += 1;
      if (stableChecks >= 3) return;
    } else {
      stableChecks = 0;
    }
    await new Promise(resolve => window.setTimeout(resolve, 80));
  }
};

const schedulePostRerollRecoverySync = (generation: ActiveGeneration) => {
  const messageId = generation.rerollOriginal?.messageId;
  const chatId = generation.chatId;
  if (!Number.isInteger(messageId) || !chatId) return;

  [120, 480, 1200, 2600].forEach(delay => {
    window.setTimeout(() => {
      if (controllerDisposed || getCurrentChatId() !== chatId || activeGeneration) return;
      invalidateStageSnapshot();
      const entries = getStageEntries();
      const ids = entries.map(entry => entry.representativeMessageId);
      if (!browsingHistory && ids.includes(messageId!)) {
        selectedMessageId = messageId!;
        selectedHistoryKind = generation.interaction.mode;
        rememberStageSelection(messageId!, entries);
      }
      viewRevision += 1;
      broadcastView();
    }, delay);
  });
};

const failNativeReroll = (generation: ActiveGeneration, error: unknown): Promise<void> => {
  if (generation.rerollFailure) return generation.rerollFailure;
  generation.cancelled = true;

  const task = (async () => {
    await waitForNativeRerollToSettle(generation);
    let restored = false;
    try {
      restored = await rollbackNativeReroll(generation);
    } catch (rollbackError) {
      console.error('[灯火阑珊·伪同层] 原生重生成回滚失败', rollbackError);
    }
    if (activeGeneration !== generation) return;
    discardQueuedStream();
    send(generation.source, {
      type: 'error',
      requestId: generation.requestId,
      message: `${error instanceof Error ? error.message : String(error)}${
        restored ? '；原回复已恢复，可以重新重答。' : '；原回复恢复尚未完成，控制器重载后会继续尝试恢复。'
      }`,
    });
    activeGeneration = null;
    broadcastView();
    schedulePostRerollRecoverySync(generation);
  })();
  generation.rerollFailure = task;
  return task;
};

let recoveringNativeSwipeState = false;
const recoverFailedNativeRerolls = async () => {
  if (recoveringNativeSwipeState || activeGeneration || controllerDisposed) return;
  recoveringNativeSwipeState = true;
  const recoveredIds: number[] = [];
  try {
    const currentChatId = getCurrentChatId();
    const pendingRecords = readPendingNativeRerolls().filter(record => record.chatId === currentChatId);
    for (const record of pendingRecords) {
      try {
        if (!(await restoreNativeRerollRecord(record.chatId, record.original, record.nativeSwipeOriginal))) continue;
        clearPendingNativeReroll(record.chatId, record.original.messageId);
        recoveredIds.push(record.original.messageId);
      } catch (error) {
        console.warn(`[灯火阑珊·伪同层] 第 ${record.original.messageId} 楼的事务快照恢复失败`, error);
      }
    }

    for (const message of getAllMessages()) {
      if (message.role !== 'assistant') continue;
      const nativeMessage = getNativeSwipeMessage(message.message_id);
      if (!nativeMessage) continue;
      try {
        if (!repairNativeSwipeState(message.message_id, nativeMessage)) continue;
        const restored = buildMessage(String(nativeMessage.mes ?? ''));
        await setChatMessages(
          [
            {
              message_id: message.message_id,
              message: restored,
              extra: _.cloneDeep((nativeMessage.extra ?? message.extra ?? {}) as Record<string, any>),
            },
          ],
          { refresh: 'affected' },
        );
        if (!recoveredIds.includes(message.message_id)) recoveredIds.push(message.message_id);
      } catch (error) {
        console.warn(`[灯火阑珊·伪同层] 第 ${message.message_id} 楼的失败重答无法自动恢复`, error);
      }
    }
    if (recoveredIds.length > 0) {
      invalidateStageSnapshot();
      selectedMessageId = latestStageId() ?? selectedMessageId;
      selectedHistoryKind = null;
      if (selectedMessageId !== null) rememberStageSelection(selectedMessageId);
      browsingHistory = false;
      viewRevision += 1;
      broadcastView();
      console.info(`[灯火阑珊·伪同层] 已恢复失败重答楼层：${recoveredIds.join(', ')}`);
    }
  } finally {
    recoveringNativeSwipeState = false;
  }
};

const getDialogueMvuSnapshot = (messageId: number): Record<string, any> => {
  let snapshot: unknown;
  try {
    if (typeof Mvu !== 'undefined') {
      snapshot = Mvu.getMvuData({ type: 'message', message_id: messageId });
    }
  } catch (error) {
    console.warn('[灯火阑珊·短对话] 读取 MVU 快照失败，改用楼层数据', error);
  }
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    snapshot = getChatMessages(messageId)[0]?.data ?? {};
  }
  return _.cloneDeep(snapshot as Record<string, any>);
};

const stripDialogueStructureTags = (text: string) =>
  text
    .replace(/<\/?(?:反应|正文|会话状态|visual_cards|pseudo_layer|UpdateVariable|JSONPatch)(?=[\s/>])[^>]*>/gi, '')
    .trim();

const buildDedicatedDialogueMessage = (result: ParsedDialogueGeneration) => {
  const reaction = stripDialogueStructureTags(result.reaction);
  const dialogue = stripDialogueStructureTags(result.dialogue);
  return [`<反应>${reaction}</反应>`, `<正文>${dialogue}</正文>`, '<pseudo_layer>', '灯火阑珊', '</pseudo_layer>'].join(
    '\n',
  );
};

const buildDedicatedMetadata = (
  generation: ActiveGeneration,
  context: DialogueContext,
  userMessageId: number,
  result?: ParsedDialogueGeneration,
): PseudoLayerInteractionMetadata => {
  const reaction = result ? stripDialogueStructureTags(result.reaction) : '';
  return {
    version: 2,
    kind: 'dialogue',
    ...context,
    engine: 'dedicated',
    operationId: generation.operationId,
    rawUserText: generation.rawUserText,
    userMessageId,
    ...(reaction ? { reaction } : {}),
    ...(result?.sessionState ? { sessionState: result.sessionState } : {}),
    ...(result?.memoryEvents.length ? { memoryEvents: result.memoryEvents } : {}),
    ...(result?.relationEvents.length ? { relationEvents: result.relationEvents } : {}),
  };
};

const getDialogueOperationMessages = (operationId: string) =>
  getAllMessages().filter(message => readInteractionMetadata(message)?.operationId === operationId);

const rollbackDialogueOperation = async (generation: ActiveGeneration) => {
  if (!generation.operationId || getCurrentChatId() !== generation.chatId) return;
  if (generation.operation === 'reroll' && generation.rerollOriginal) {
    const original = generation.rerollOriginal;
    await setChatMessages(
      [
        {
          message_id: original.messageId,
          message: original.message,
          data: _.cloneDeep(original.data),
          extra: _.cloneDeep(original.extra),
        },
      ],
      { refresh: 'affected' },
    );
    return;
  }
  const ids = getDialogueOperationMessages(generation.operationId).map(message => message.message_id);
  if (ids.length === 0) return;
  const previousDeletingMessageId = deletingMessageId;
  deletingMessageId = Math.max(...ids);
  try {
    await deleteChatMessages(ids, { refresh: 'affected' });
  } finally {
    deletingMessageId = previousDeletingMessageId;
  }
};

const commitDedicatedDialogue = async (
  generation: ActiveGeneration,
  context: DialogueContext,
  result: ParsedDialogueGeneration,
  mvuSnapshot: Record<string, any>,
) => {
  const baseline = generation.baselineLastMessageId;
  if (
    baseline === undefined ||
    generation.cancelled ||
    getCurrentChatId() !== generation.chatId ||
    getLastMessageId() !== baseline
  ) {
    throw new Error('生成期间聊天记录已经变化，本轮短对话未写入。');
  }

  const userMessageId = baseline + 1;
  const assistantMessageId = baseline + 2;
  const userMetadata = buildDedicatedMetadata(generation, context, userMessageId);
  const assistantMetadata = buildDedicatedMetadata(generation, context, userMessageId, result);
  await createChatMessages(
    [
      {
        role: 'user',
        message: decorateDialogueInput(generation.rawUserText, context),
        data: _.cloneDeep(mvuSnapshot),
        extra: { [INTERACTION_KEY]: userMetadata },
      },
      {
        role: 'assistant',
        message: buildDedicatedDialogueMessage(result),
        data: _.cloneDeep(mvuSnapshot),
        extra: { [INTERACTION_KEY]: assistantMetadata },
      },
    ],
    { refresh: 'affected' },
  );

  const created = getDialogueOperationMessages(generation.operationId ?? '');
  const user = created.find(message => message.role === 'user');
  const assistant = created.find(message => message.role === 'assistant');
  if (
    generation.cancelled ||
    getCurrentChatId() !== generation.chatId ||
    getLastMessageId() !== assistantMessageId ||
    user?.message_id !== userMessageId ||
    assistant?.message_id !== assistantMessageId
  ) {
    throw new Error('写入短对话时聊天记录发生并发变化，已撤销本轮写入。');
  }
  return assistantMessageId;
};

const commitDedicatedDialogueReroll = async (
  generation: ActiveGeneration,
  context: DialogueContext,
  result: ParsedDialogueGeneration,
  mvuSnapshot: Record<string, any>,
) => {
  const baseline = generation.baselineLastMessageId;
  const userMessageId = generation.userMessageId;
  const targetMessageId = generation.baseMessageId;
  if (
    baseline === undefined ||
    userMessageId === undefined ||
    generation.cancelled ||
    getCurrentChatId() !== generation.chatId ||
    getLastMessageId() !== baseline
  ) {
    throw new Error('生成期间聊天记录已经变化，本次重答未写入。');
  }

  const current = getChatMessages(targetMessageId)[0];
  if (!current || current.role !== 'assistant') throw new Error('没有找到需要重答的角色回复。');
  const metadata = buildDedicatedMetadata(generation, context, userMessageId, result);
  await setChatMessages(
    [
      {
        message_id: targetMessageId,
        message: buildDedicatedDialogueMessage(result),
        data: _.cloneDeep(mvuSnapshot),
        extra: {
          ...(current.extra ?? {}),
          [INTERACTION_KEY]: metadata,
        },
      },
    ],
    { refresh: 'affected' },
  );

  const updated = getChatMessages(targetMessageId)[0];
  if (
    generation.cancelled ||
    getCurrentChatId() !== generation.chatId ||
    getLastMessageId() !== baseline ||
    readInteractionMetadata(updated)?.operationId !== generation.operationId
  ) {
    throw new Error('写入重答时聊天记录发生并发变化，已恢复原回复。');
  }
  return targetMessageId;
};

const finishDedicatedGeneration = (generation: ActiveGeneration, messageId: number) => {
  invalidateStageSnapshot();
  selectedMessageId = messageId;
  selectedHistoryKind = 'dialogue';
  rememberStageSelection(messageId);
  browsingHistory = false;
  viewRevision += 1;
  flushQueuedStream(generation);
  send(generation.source, { type: 'complete', requestId: generation.requestId, messageId });
  if (activeGeneration === generation) activeGeneration = null;
  broadcastView();
};

const runDedicatedDialogueGeneration = async (
  generation: ActiveGeneration,
  context: DialogueContext,
  messages: ChatMessage[],
  mvuSnapshot: Record<string, any>,
) => {
  try {
    generation.sent = true;
    sendGenerationState(generation, 'generating');
    const result = await generateDialogueReply({
      generationId: generation.generationId!,
      operationId: generation.operationId!,
      baseMessageId:
        generation.operation === 'reroll' && generation.userMessageId !== undefined
          ? generation.userMessageId
          : generation.baseMessageId,
      prompt: generation.rawUserText,
      context,
      messages,
      mvuData: mvuSnapshot,
    });
    if (activeGeneration !== generation) return;
    if (generation.cancelled) throw new Error('本轮短对话已停止。');
    sendGenerationState(generation, 'saving');
    const messageId =
      generation.operation === 'reroll'
        ? await commitDedicatedDialogueReroll(generation, context, result, mvuSnapshot)
        : await commitDedicatedDialogue(generation, context, result, mvuSnapshot);
    if (activeGeneration !== generation) return;
    finishDedicatedGeneration(generation, messageId);
  } catch (error) {
    try {
      await rollbackDialogueOperation(generation);
    } catch (rollbackError) {
      console.error('[灯火阑珊·短对话] 回滚未完成，请检查本轮 operationId', rollbackError);
    }
    if (activeGeneration !== generation) return;
    discardQueuedStream();
    if (generation.cancelled) {
      send(generation.source, {
        type: 'complete',
        requestId: generation.requestId,
        messageId: generation.baseMessageId,
      });
    } else {
      send(generation.source, {
        type: 'error',
        requestId: generation.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    activeGeneration = null;
    broadcastView();
  }
};

const beginGeneration = (request: Extract<PseudoLayerRequest, { type: 'generate' }>, source: ReplyTarget) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '已有一场生成正在进行。' });
    return;
  }
  const prompt = request.prompt.trim();
  const entries = getStageEntries();
  const requestedHistory: PseudoLayerHistoryKind = request.interaction.mode;
  const anchor = getGenerationAnchor(requestedHistory, entries);
  if (!prompt) {
    send(source, { type: 'error', requestId: request.requestId, message: '输入内容不能为空。' });
    return;
  }
  if (anchor === undefined || request.messageId !== anchor) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message:
        requestedHistory === 'dialogue'
          ? '这不是最新一段交谈，请先返回最新交谈。'
          : '这不是最新正文，请先返回最新正文。',
    });
    return;
  }

  const dialogue = request.interaction.mode === 'dialogue' ? normalizeDialogueContext(request.interaction) : null;
  const interaction: PseudoLayerInteraction = dialogue ?? STORY_INTERACTION;
  setActiveInteraction(interaction);

  if (dialogue) {
    try {
      const baselineLastMessageId = getLastMessageId();
      const baseMessageId = latestStageId() ?? request.messageId;
      const messages = getAllMessages();
      const mvuSnapshot = getDialogueMvuSnapshot(baseMessageId);
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const generation: ActiveGeneration = {
        requestId: request.requestId,
        source,
        operation: 'generate',
        state: 'preparing',
        baseMessageId,
        interaction: dialogue,
        rawUserText: prompt,
        engine: 'dedicated',
        generationId: `dhl-dialogue-${nonce}`,
        operationId: `dhl-dialogue-write-${nonce}`,
        chatId: getCurrentChatId(),
        baselineLastMessageId,
        sent: false,
        received: false,
        streamText: '',
        streamReaction: '',
      };
      activeGeneration = generation;
      selectedHistoryKind = 'dialogue';
      browsingHistory = false;
      sendGenerationState(generation, 'preparing');
      applyStageVisibility();
      void runDedicatedDialogueGeneration(generation, dialogue, messages, mvuSnapshot);
    } catch (error) {
      send(source, {
        type: 'error',
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
      activeGeneration = null;
      broadcastView();
    }
    return;
  }

  activeGeneration = {
    requestId: request.requestId,
    source,
    operation: 'generate',
    state: 'preparing',
    baseMessageId: request.messageId,
    interaction,
    rawUserText: prompt,
    engine: 'native',
    sent: false,
    received: false,
    streamText: '',
    streamReaction: '',
  };
  selectedHistoryKind = 'story';
  browsingHistory = false;
  sendGenerationState(activeGeneration, 'preparing');
  applyStageVisibility();

  try {
    triggerNativeSend(prompt);
    window.setTimeout(() => {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
      send(source, {
        type: 'error',
        requestId: request.requestId,
        message: '酒馆没有开始生成，请检查连接和发送按钮状态。',
      });
      activeGeneration = null;
      broadcastView();
    }, 1800);
  } catch (error) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    activeGeneration = null;
    broadcastView();
  }
};

const routeNativeDialoguePrompt = (prompt: string) => {
  if (activeInteraction.mode !== 'dialogue') return false;
  const source = getActiveSource();
  const anchor = getGenerationAnchor('dialogue');
  if (!source || anchor === undefined) return false;
  const requestId = `native-dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  beginGeneration(
    {
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      type: 'generate',
      requestId,
      messageId: anchor,
      prompt,
      interaction: { ...activeInteraction },
    },
    source,
  );
  return activeGeneration?.requestId === requestId;
};

const interceptNativeDialogueSend = (event: Event) => {
  if (activeInteraction.mode !== 'dialogue') return;
  const textarea = tavernDocument.querySelector<HTMLTextAreaElement>('#send_textarea');
  const prompt = textarea?.value.trim() ?? '';
  if (!prompt || prompt.startsWith('/')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null || browsingHistory) {
    toastr.warning(browsingHistory ? '请先返回最新回合再继续交谈。' : '当前仍有操作正在进行。');
    return;
  }
  if (!routeNativeDialoguePrompt(prompt) || !textarea) {
    toastr.error('伪同层尚未就绪，未发送本轮交谈。');
    return;
  }
  textarea.value = '';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
};

const handleNativeSendClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (typeof target?.closest !== 'function' || !target.closest('#send_but')) return;
  interceptNativeDialogueSend(event);
};

const handleNativeSendSubmit = (event: SubmitEvent) => {
  const target = event.target as HTMLElement | null;
  if (typeof target?.closest !== 'function' || !target.closest('#form_sheld')) return;
  interceptNativeDialogueSend(event);
};

const handleNativeSendKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  const target = event.target as HTMLElement | null;
  if (typeof target?.matches !== 'function' || !target.matches('#send_textarea')) return;
  if (!event.ctrlKey && !event.metaKey) return;
  interceptNativeDialogueSend(event);
};

const installNativeDialogueBridge = () => {
  tavernDocument.addEventListener('click', handleNativeSendClick, true);
  tavernDocument.addEventListener('submit', handleNativeSendSubmit, true);
  tavernDocument.addEventListener('keydown', handleNativeSendKeydown, true);
};

const removeNativeDialogueBridge = () => {
  tavernDocument.removeEventListener('click', handleNativeSendClick, true);
  tavernDocument.removeEventListener('submit', handleNativeSendSubmit, true);
  tavernDocument.removeEventListener('keydown', handleNativeSendKeydown, true);
};

const beginReroll = (request: Extract<PseudoLayerRequest, { type: 'reroll' }>, source: ReplyTarget) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '已有一场生成正在进行。' });
    return;
  }
  const messages = getAllMessages();
  const message = messages.find(item => item.message_id === request.messageId);
  const metadata = resolveAssistantInteractionMetadata(message, messages);
  const latest = latestStageId();
  if (request.messageId !== latest) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '只能重答时间线中的最新回复，请先返回最新。',
    });
    return;
  }

  if (metadata) {
    try {
      if (!message || message.role !== 'assistant') throw new Error('没有找到需要重答的角色回复。');
      const context = toDialogueContext(metadata);
      const linkedUser =
        (metadata.userMessageId !== undefined
          ? messages.find(item => item.role === 'user' && item.message_id === metadata.userMessageId)
          : undefined) ?? findPreviousUserMessage(messages, request.messageId);
      if (!linkedUser) throw new Error('没有找到这条角色回复对应的玩家发言。');
      const rerollUserText = (
        metadata.rawUserText ?? String(linkedUser.message ?? '').replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, '')
      ).trim();
      if (!rerollUserText) throw new Error('这轮交谈没有可用于重答的玩家发言。');

      const mvuSnapshot = getDialogueMvuSnapshot(linkedUser.message_id);
      const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      setActiveInteraction(context);
      const lockedView = makeView();
      const generation: ActiveGeneration = {
        requestId: request.requestId,
        source,
        operation: 'reroll',
        state: 'preparing',
        baseMessageId: request.messageId,
        interaction: context,
        rawUserText: rerollUserText,
        engine: 'dedicated',
        generationId: `dhl-dialogue-reroll-${nonce}`,
        operationId: `dhl-dialogue-reroll-write-${nonce}`,
        chatId: getCurrentChatId(),
        baselineLastMessageId: getLastMessageId(),
        userMessageId: linkedUser.message_id,
        sent: false,
        received: false,
        streamText: '',
        streamReaction: '',
        lockedView,
        rerollOriginal: captureNativeRerollOriginal(message),
      };
      activeGeneration = generation;
      parkSourceFrame(request.messageId, source);
      selectedHistoryKind = 'dialogue';
      browsingHistory = false;
      sendGenerationState(generation, 'preparing');
      applyStageVisibility();
      void runDedicatedDialogueGeneration(generation, context, messages, mvuSnapshot);
    } catch (error) {
      send(source, {
        type: 'error',
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
      activeGeneration = null;
      broadcastView();
    }
    return;
  }
  const previousUser = findPreviousUserMessage(messages, request.messageId);
  if (!message || message.role !== 'assistant') {
    send(source, { type: 'error', requestId: request.requestId, message: '没有找到需要重答的正文。' });
    return;
  }
  if (!previousUser) {
    send(source, { type: 'error', requestId: request.requestId, message: '没有找到这条正文对应的玩家发言。' });
    return;
  }
  const rerollUserText = String(previousUser?.message ?? '')
    .replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, '')
    .trim();
  if (!rerollUserText) {
    send(source, { type: 'error', requestId: request.requestId, message: '这轮正文没有可用于重答的玩家发言。' });
    return;
  }
  const nativeSwipeMessage = getNativeSwipeMessage(request.messageId);
  if (!nativeSwipeMessage) {
    send(source, { type: 'error', requestId: request.requestId, message: '没有找到酒馆原生重生成数据。' });
    return;
  }
  try {
    repairNativeSwipeState(request.messageId, nativeSwipeMessage);
  } catch (error) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  const interaction: PseudoLayerInteraction = STORY_INTERACTION;
  setActiveInteraction(interaction);
  const lockedView = makeView();
  const generation: ActiveGeneration = {
    requestId: request.requestId,
    source,
    operation: 'reroll',
    state: 'preparing',
    baseMessageId: request.messageId,
    interaction,
    rawUserText: rerollUserText,
    engine: 'native',
    userMessageId: previousUser?.message_id,
    chatId: getCurrentChatId(),
    sent: false,
    received: false,
    streamText: '',
    streamReaction: '',
    lockedView,
    rerollOriginal: captureNativeRerollOriginal(message),
    nativeSwipeOriginal: _.cloneDeep(nativeSwipeMessage),
  };
  activeGeneration = generation;
  persistPendingNativeReroll(generation);
  parkSourceFrame(request.messageId, source);
  selectedHistoryKind = 'story';
  browsingHistory = false;
  sendGenerationState(generation, 'preparing');
  applyStageVisibility();

  void triggerNativeReroll(request.messageId).catch(async error => {
    const generation = activeGeneration;
    if (!generation || generation.requestId !== request.requestId) return;
    const materialized = await waitForNativeSwipeMaterialized(request.messageId, 3000, generation);
    if (materialized) {
      console.warn('[灯火阑珊·伪同层] 酒馆在重生成完成后报告 swipe 收尾异常，已保留新回复', error);
      void finishMessage(request.messageId);
      return;
    }
    console.error('[灯火阑珊·伪同层] 原生重生成失败', error);
    await failNativeReroll(generation, error);
  });

  window.setTimeout(() => {
    if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
    void failNativeReroll(activeGeneration, new Error('酒馆没有开始重生成，请检查连接状态。'));
  }, 10_000);

  // 少数网络/接口异常不会触发酒馆的 STOPPED/ENDED 事件。事务快照不能因此永久悬挂，
  // 超时后主动恢复旧 swipe；正常生成完成后 requestId 已失效，不会触发这里。
  window.setTimeout(
    () => {
      const stalledGeneration = activeGeneration;
      if (
        !stalledGeneration ||
        stalledGeneration.requestId !== request.requestId ||
        stalledGeneration.operation !== 'reroll' ||
        stalledGeneration.engine !== 'native'
      ) {
        return;
      }
      void failNativeReroll(stalledGeneration, new Error('重答长时间未能完整结束'));
    },
    15 * 60 * 1000,
  );
};

const finishingMessages = new Map<number, Promise<void>>();
const recentlyFinishedMessages = new Map<number, number>();
const FINISH_DEDUP_WINDOW_MS = 2500;

const finishMessageInternal = async (messageId: number) => {
  const generation = activeGeneration;
  if (
    generation?.engine === 'native' &&
    generation.operation === 'reroll' &&
    (generation.cancelled || messageId !== generation.baseMessageId)
  ) {
    return false;
  }
  if (generation) {
    generation.received = true;
    sendGenerationState(generation, 'saving');
  }

  try {
    if (generation?.engine === 'native' && generation.operation === 'reroll') {
      if (!(await waitForNativeSwipeMaterialized(messageId, 5000, generation))) {
        throw new Error('酒馆尚未完成重生成候选的写入，请稍后再试。');
      }
      // STOPPED/错误事件有时会紧跟在 ENDED 后抵达。短暂让出事件循环，
      // 避免把刚被终止的半截 swipe 误判成完整回复并提交。
      await new Promise(resolve => window.setTimeout(resolve, 320));
      if (activeGeneration !== generation || generation.cancelled) {
        throw new Error('重答在完成前被终止');
      }
    }
    if (generation?.interaction.mode === 'dialogue') {
      await writeInteractionMetadata(messageId, generation.interaction, {
        rawUserText: generation.rawUserText,
        userMessageId: generation.userMessageId,
      });
    } else if (!generation) {
      const messages = getAdjacentMessages(messageId);
      const message = messages.find(item => item.message_id === messageId);
      const metadata = resolveAssistantInteractionMetadata(message, messages);
      if (metadata) {
        await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
          rawUserText: metadata.rawUserText,
          userMessageId: metadata.userMessageId,
        });
      }
    }
    await ensurePseudoMarker(messageId, generation?.engine === 'native' ? 'none' : 'affected');
    if (generation?.engine === 'native' && generation.operation === 'reroll') {
      clearPendingNativeReroll(generation.chatId, generation.rerollOriginal?.messageId);
    }
    invalidateStageSnapshot();
    selectedMessageId = messageId;
    selectedHistoryKind = generation?.interaction.mode ?? null;
    rememberStageSelection(messageId);
    browsingHistory = false;
    viewRevision += 1;
    if (generation) {
      flushQueuedStream(generation);
      send(generation.source, { type: 'complete', requestId: generation.requestId, messageId });
    }
    activeGeneration = null;
    broadcastView();
    return true;
  } catch (error) {
    console.error('[灯火阑珊·伪同层] 回复收尾失败', error);
    if (generation) {
      if (generation.engine === 'native' && generation.operation === 'reroll') {
        await failNativeReroll(generation, error);
        return false;
      }
      send(generation.source, {
        type: 'error',
        requestId: generation.requestId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
    activeGeneration = null;
    broadcastView();
    return false;
  }
};

const finishMessage = (messageId: number) => {
  const existing = finishingMessages.get(messageId);
  if (existing) return existing;

  const now = Date.now();
  recentlyFinishedMessages.forEach((finishedAt, finishedMessageId) => {
    if (now - finishedAt > FINISH_DEDUP_WINDOW_MS * 4) {
      recentlyFinishedMessages.delete(finishedMessageId);
    }
  });
  const recentlyFinishedAt = recentlyFinishedMessages.get(messageId);
  if (!activeGeneration && recentlyFinishedAt && now - recentlyFinishedAt < FINISH_DEDUP_WINDOW_MS) {
    return Promise.resolve();
  }

  const task = finishMessageInternal(messageId)
    .then(finished => {
      if (finished) recentlyFinishedMessages.set(messageId, Date.now());
    })
    .finally(() => {
      finishingMessages.delete(messageId);
    });
  finishingMessages.set(messageId, task);
  return task;
};

const repairDialogueMetadata = async (messageId: number) => {
  const messages = getAdjacentMessages(messageId);
  const message = messages.find(item => item.message_id === messageId);
  if (!message || readInteractionMetadata(message)) return;
  const metadata = resolveAssistantInteractionMetadata(message, messages);
  if (!metadata) return;
  await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
    rawUserText: metadata.rawUserText,
    userMessageId: metadata.userMessageId,
  });
  invalidateStageSnapshot();
  viewRevision += 1;
  broadcastView();
};

const selectStage = (target: number, history?: PseudoLayerHistoryKind) => {
  const entries = getStageEntries();
  selectedMessageId = target;
  selectedHistoryKind = history ?? null;
  if (history) selectedHistoryMessageIds[history] = target;
  else rememberStageSelection(target, entries);
  const scopedEntries = history ? getHistoryEntries(entries, history) : entries;
  browsingHistory = target !== scopedEntries.at(-1)?.representativeMessageId;
  viewRevision += 1;
  broadcastView();
  getMessageElement(getHostStageId() ?? target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const navigate = (request: Extract<PseudoLayerRequest, { type: 'navigate' }>) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
  const entries = getStageEntries();
  const historyEntries = request.history ? getHistoryEntries(entries, request.history) : entries;
  const ids = historyEntries.map(entry => entry.representativeMessageId);
  const selected = request.history ? resolveHistorySelection(entries, request.history) : request.messageId;
  const position = selected === null ? -1 : ids.indexOf(selected);
  if (position < 0) return;
  const target = request.direction === 'previous' ? ids[position - 1] : ids[position + 1];
  if (target === undefined) return;
  selectStage(target, request.history);
};

const selectHistory = (history: PseudoLayerHistoryKind) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
  const entries = getStageEntries();
  const target = resolveHistorySelection(entries, history);
  if (target === null) {
    selectedHistoryKind = history;
    browsingHistory = false;
    viewRevision += 1;
    broadcastView();
    return;
  }

  selectStage(target, history);
};

const deleteLatestTurn = async (
  request: Extract<PseudoLayerRequest, { type: 'delete_message' }>,
  source: ReplyTarget,
) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '当前仍有操作正在进行。' });
    return;
  }

  const entries = getStageEntries();
  const latest = entries.at(-1);
  if (!latest || request.messageId !== latest.representativeMessageId) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '只能删除最新回合，请先返回最新。',
    });
    return;
  }
  if (entries.length === 1 && (latest.stage.kind !== 'dialogue' || latest.stage.turnCount <= 1)) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '至少需要保留一个伪同层回合。',
    });
    return;
  }

  const messages = getAllMessages();
  const assistant = messages.find(
    message => message.role === 'assistant' && message.message_id === latest.representativeMessageId,
  );
  if (!assistant) {
    send(source, { type: 'error', requestId: request.requestId, message: '没有找到要删除的回复。' });
    return;
  }

  const metadata = resolveAssistantInteractionMetadata(assistant, messages);
  const explicitUser = Number.isFinite(metadata?.userMessageId)
    ? messages.find(message => message.role === 'user' && message.message_id === metadata?.userMessageId)
    : undefined;
  const previousUser = findPreviousUserMessage(messages, assistant.message_id);
  const linkedUser = explicitUser ?? (previousUser?.message_id === assistant.message_id - 1 ? previousUser : undefined);
  const messageIds = [assistant.message_id, ...(linkedUser ? [linkedUser.message_id] : [])].sort(
    (left, right) => left - right,
  );

  deletingMessageId = assistant.message_id;
  try {
    await deleteChatMessages(messageIds, { refresh: 'affected' });
    invalidateStageSnapshot();
    selectedMessageId = latestStageId() ?? null;
    selectedHistoryKind = null;
    if (selectedMessageId !== null) rememberStageSelection(selectedMessageId);
    browsingHistory = false;
    viewRevision += 1;
    send(source, {
      type: 'deleted',
      requestId: request.requestId,
      deletedMessageId: assistant.message_id,
    });
  } catch (error) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    deletingMessageId = null;
    scheduleViewRefresh(120, true);
  }
};

const updateMessageContent = async (
  request: Extract<PseudoLayerRequest, { type: 'update_message' }>,
  source: ReplyTarget,
) => {
  if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '当前仍有操作正在进行。' });
    return;
  }

  const messageId = Math.trunc(request.messageId);
  const entry = getStageEntries().find(
    candidate => candidate.representativeMessageId === messageId || candidate.messageIds.includes(messageId),
  );
  if (!Number.isFinite(messageId) || !entry) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '当前回合已经变化，请重新打开原文编辑器。',
    });
    return;
  }

  const message = getChatMessages(messageId)[0];
  if (!message || message.role !== 'assistant') {
    send(source, { type: 'error', requestId: request.requestId, message: '没有找到需要编辑的角色回复。' });
    return;
  }

  const chatId = getCurrentChatId();
  updatingMessageId = messageId;
  try {
    await setChatMessages([{ message_id: messageId, message: buildEditedMessage(String(request.content ?? '')) }], {
      refresh: 'affected',
    });
    if (getCurrentChatId() !== chatId) throw new Error('保存期间聊天已经切换，本次编辑未完成。');

    invalidateStageSnapshot();
    if (entry.representativeMessageId === messageId) {
      selectedMessageId = messageId;
      rememberStageSelection(messageId);
    }
    viewRevision += 1;
    send(source, {
      type: 'message_updated',
      requestId: request.requestId,
      messageId,
    });
    broadcastView();
  } catch (error) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    updatingMessageId = null;
    scheduleViewRefresh(120, true);
  }
};

const handleMessage = (event: MessageEvent<unknown>) => {
  if (!isPseudoLayerRequest(event.data)) return;
  const request = event.data;
  const source = asReplyTarget(event.source);
  if (!source) return;
  rememberSourceProtocolVersion(source, request.version);

  if (request.type === 'hello') {
    const messageId = getSourceMessageId(source) ?? request.messageId;
    const isHeartbeat = registrations.get(messageId) === source && getSourceMessageId(source) === messageId;
    const previousSource = registrations.get(messageId);
    if (previousSource && previousSource !== source) {
      const previousFrame = getFrameForSource(previousSource);
      if (previousFrame?.closest(`#${STAGE_ROOT_ID}`) && hasMountedPseudoApp(previousFrame)) {
        send(source, {
          type: 'ready',
          busy: activeGeneration !== null || deletingMessageId !== null || updatingMessageId !== null,
          requestId: activeGeneration?.requestId,
          operation: activeGeneration?.operation,
        });
        return;
      }
    }
    registrations.set(messageId, source);
    if (selectedHistoryKind === null && !browsingHistory && !activeGeneration) {
      selectedMessageId = latestStageId() ?? messageId;
    }
    if (activeGeneration?.operation === 'reroll' && messageId === activeGeneration.baseMessageId) {
      activeGeneration.source = source;
    }
    send(source, {
      type: 'ready',
      busy: activeGeneration !== null || deletingMessageId !== null || updatingMessageId !== null,
      requestId: activeGeneration?.requestId,
      operation: activeGeneration?.operation,
    });
    if (activeGeneration?.source === source) replayGeneration(activeGeneration, source);
    if (isHeartbeat) return;
    window.setTimeout(() => {
      const frame = getFrameForSource(source);
      if (frame && getSourceMessageId(source) === messageId) parkCandidateFrame(frame);
    }, 0);
    broadcastView();
    return;
  }

  if (request.type === 'goodbye') {
    const messageId = getSourceMessageId(source) ?? request.messageId;
    if (registrations.get(messageId) === source) registrations.delete(messageId);
    sourceProtocolVersions.delete(source);
    broadcastView();
    return;
  }

  if (request.type === 'generate') {
    beginGeneration(request, source);
    return;
  }

  if (request.type === 'reroll') {
    beginReroll(request, source);
    return;
  }

  if (request.type === 'delete_message') {
    void deleteLatestTurn(request, source);
    return;
  }

  if (request.type === 'update_message') {
    void updateMessageContent(request, source);
    return;
  }

  if (request.type === 'stop') {
    if (!activeGeneration || activeGeneration.requestId !== request.requestId) return;
    const generation = activeGeneration;
    generation.cancelled = true;
    sendGenerationState(generation, 'stopping', source);
    if (generation.engine === 'dedicated') {
      if (generation.generationId) stopGenerationById(generation.generationId);
      window.setTimeout(() => {
        if (activeGeneration !== generation || !generation.cancelled) return;
        discardQueuedStream();
        send(generation.source, {
          type: 'complete',
          requestId: generation.requestId,
          messageId: generation.baseMessageId,
        });
        activeGeneration = null;
        broadcastView();
      }, 3000);
    } else {
      SillyTavern.stopGeneration();
      if (generation.operation === 'reroll') {
        void failNativeReroll(generation, new Error('重答已被终止'));
      }
    }
    return;
  }

  if (request.type === 'navigate') {
    if (getSourceMessageId(source) === undefined) return;
    navigate(request);
    return;
  }

  if (request.type === 'timeline_page') {
    if (getSourceMessageId(source) === undefined) return;
    sendTimelinePage(source, request);
    return;
  }

  if (request.type === 'select_entry') {
    if (getSourceMessageId(source) === undefined || activeGeneration) return;
    const entry = getStageEntries().find(
      candidate =>
        candidate.representativeMessageId === request.messageId || candidate.messageIds.includes(request.messageId),
    );
    if (entry) selectStage(entry.representativeMessageId, entry.stage.kind);
    return;
  }

  if (request.type === 'select_history') {
    if (getSourceMessageId(source) === undefined) return;
    selectHistory(request.history);
    return;
  }

  if (request.type === 'return_latest') {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
    if (request.history) {
      const entries = getStageEntries();
      const target = getHistoryEntries(entries, request.history).at(-1)?.representativeMessageId;
      if (target !== undefined) selectStage(target, request.history);
      return;
    }
    const target = latestStageId();
    if (target !== undefined) selectStage(target);
    return;
  }

  if (request.type === 'set_interaction') {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
    const interaction = normalizeDialogueContext(request.interaction);
    if (!interaction) {
      send(source, { type: 'error', message: '交谈目标无效，请重新选择。' });
      return;
    }
    setActiveInteraction(interaction);
    viewRevision += 1;
    broadcastView();
    return;
  }

  if (request.type === 'end_interaction') {
    if (deletingMessageId !== null || updatingMessageId !== null) return;
    setActiveInteraction(STORY_INTERACTION);
    viewRevision += 1;
    broadcastView();
    return;
  }

  nativeInputFollowsViewport = false;
  nativeInputCollapsed = !nativeInputCollapsed;
  localStorage.setItem(INPUT_STORAGE_KEY, String(nativeInputCollapsed));
  broadcastView();
};

const getActiveSource = () => activeGeneration?.source ?? registrations.get(getHostStageId() ?? -1);

const handleMessageSent = async (messageId: number) => {
  if (activeGeneration?.engine === 'dedicated') return;
  const source = getActiveSource();
  if (!source) return;
  const message = getChatMessages(messageId)[0];
  if (!activeGeneration) {
    const interaction = activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION;
    activeGeneration = {
      requestId: `native-${Date.now()}`,
      source,
      operation: 'generate',
      state: 'generating',
      baseMessageId: latestStageId() ?? messageId - 1,
      interaction,
      rawUserText: String(message?.message ?? '').trim(),
      engine: 'native',
      userMessageId: messageId,
      sent: true,
      received: false,
      streamText: '',
      streamReaction: '',
    };
  } else {
    activeGeneration.sent = true;
    activeGeneration.userMessageId = messageId;
  }

  if (activeGeneration.interaction.mode === 'dialogue' && message) {
    const rawUserText = activeGeneration.rawUserText || String(message.message ?? '').trim();
    activeGeneration.rawUserText = rawUserText;
    const decorated = decorateDialogueInput(rawUserText, activeGeneration.interaction);
    await setChatMessages(
      [
        {
          message_id: messageId,
          message: decorated,
          extra: {
            ...(message.extra ?? {}),
            [INTERACTION_KEY]: {
              version: 2,
              kind: 'dialogue',
              ...activeGeneration.interaction,
              engine: 'native',
              rawUserText,
            } satisfies PseudoLayerInteractionMetadata,
          },
        },
      ],
      { refresh: 'none' },
    );
  }

  invalidateStageSnapshot();
  sendGenerationState(activeGeneration, 'generating', source);
  applyStageVisibility();
};

const isControllerLoaderFrame = (frame: HTMLIFrameElement) => {
  if (frame === controllerFrame) return false;
  try {
    const loaderSource = frame.contentDocument?.body?.textContent?.trim().replace(/\\/g, '/') ?? '';
    return /^import\s+['"][^'"]*灯火通明-伪同层控制器\/index\.js(?:\?[^'"]*)?['"]\s*;?$/u.test(loaderSource);
  } catch {
    return false;
  }
};

const getControllerObservationRoot = () => {
  const parent = controllerFrame?.parentElement;
  if (!parent || parent === tavernDocument.body || parent === tavernDocument.documentElement) return null;
  return parent;
};

const pruneDuplicateControllerFrames = () => {
  getControllerObservationRoot()
    ?.querySelectorAll<HTMLIFrameElement>('iframe')
    .forEach(frame => {
      if (!isControllerLoaderFrame(frame)) return;
      console.warn('[灯火阑珊·伪同层] 已卸载重复控制器');
      frame.remove();
    });
};

const scheduleDuplicateControllerPrune = (frame: HTMLIFrameElement) => {
  if (frame === controllerFrame) return;
  const pruneFrame = () => {
    if (controllerDisposed || !frame.isConnected || !isControllerLoaderFrame(frame)) return;
    console.warn('[灯火阑珊·伪同层] 已卸载延迟载入的重复控制器');
    frame.remove();
  };
  frame.addEventListener('load', pruneFrame, { once: true });
  duplicatePruneTimers.push(window.setTimeout(pruneFrame, 0));
};

const inspectAddedControllerNode = (node: Node) => {
  if (node.nodeType !== 1) return;
  const element = node as Element;
  if (element.tagName === 'IFRAME') {
    scheduleDuplicateControllerPrune(element as HTMLIFrameElement);
    return;
  }
  element
    .querySelectorAll<HTMLIFrameElement>(':scope > iframe, :scope > * > iframe')
    .forEach(scheduleDuplicateControllerPrune);
};

const installDuplicateControllerObserver = () => {
  duplicateControllerObserver?.disconnect();
  const root = getControllerObservationRoot();
  if (!root) return;
  duplicateControllerObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(inspectAddedControllerNode));
  });
  duplicateControllerObserver.observe(root, {
    childList: true,
    subtree: true,
  });
};

const disposeController = () => {
  if (controllerDisposed) return;
  const disposingGeneration = activeGeneration;
  controllerDisposed = true;

  if (disposingGeneration?.engine === 'dedicated') {
    disposingGeneration.cancelled = true;
    if (disposingGeneration.generationId) stopGenerationById(disposingGeneration.generationId);
  } else if (disposingGeneration?.engine === 'native' && disposingGeneration.operation === 'reroll') {
    disposingGeneration.cancelled = true;
    try {
      SillyTavern.stopGeneration();
    } catch (error) {
      console.warn('[灯火阑珊·伪同层] 控制器卸载时停止重答失败，将继续恢复旧回复', error);
    }
    void waitForNativeRerollToSettle(disposingGeneration)
      .then(() => rollbackNativeReroll(disposingGeneration))
      .catch(error => {
        // sessionStorage 中的事务快照仍保留；下次控制器挂载时会再次恢复。
        console.error('[灯火阑珊·伪同层] 控制器卸载时恢复旧回复失败', error);
      });
  }
  controllerEventStops.splice(0).forEach(subscription => subscription.stop());
  duplicatePruneTimers.splice(0).forEach(timer => window.clearTimeout(timer));
  duplicateControllerObserver?.disconnect();
  duplicateControllerObserver = null;
  frameObserver?.disconnect();
  frameObserver = null;
  if (frameCandidateTimer !== null) window.clearTimeout(frameCandidateTimer);
  frameCandidateTimer = null;
  pendingFrameCandidates.clear();
  if (viewRefreshTimer !== null) window.clearTimeout(viewRefreshTimer);
  viewRefreshTimer = null;
  viewRefreshDeadline = 0;
  if (mobileStageAlignFrame !== null) tavernWindow.cancelAnimationFrame(mobileStageAlignFrame);
  mobileStageAlignFrame = null;
  sourceFrameCache = new WeakMap<ReplyTarget, HTMLIFrameElement>();
  invalidateStageSnapshot();
  discardQueuedStream();
  tavernWindow.removeEventListener('message', handleMessage);
  nativeInputMedia.removeEventListener('change', handleNativeInputViewportChange);
  removeNativeDialogueBridge();
  releaseParkedFrames();
  tavernDocument.getElementById(STYLE_ID)?.remove();
  tavernDocument.body.classList.remove('dhl-pseudo-layer-active', 'dhl-native-input-collapsed', ROOT_ACTIVE_CLASS);
  tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes').forEach(element => {
    element.classList.remove(STAGE_CLASS, SELECTED_CLASS, PARKED_FRAME_CLASS);
  });
  if (controllerHost.__dhlPseudoLayerControllerLease__?.instanceId === controllerInstanceId) {
    delete controllerHost.__dhlPseudoLayerControllerLease__;
  }
  restoreNativeChatPosition();
};

controllerHost.__dhlPseudoLayerControllerLease__?.dispose();
pruneDuplicateControllerFrames();
controllerHost.__dhlPseudoLayerControllerLease__ = {
  instanceId: controllerInstanceId,
  dispose: disposeController,
};
installDuplicateControllerObserver();

controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_SENT, messageId => {
    void handleMessageSent(Number(messageId)).catch(error => {
      console.error('[灯火阑珊·伪同层] 写入交谈楼层元数据失败', error);
    });
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.GENERATION_STARTED, () => {
    if (!activeGeneration || activeGeneration.engine !== 'native') return;
    activeGeneration.sent = true;
    sendGenerationState(activeGeneration, 'generating');
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.STREAM_TOKEN_RECEIVED, text => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== 'native' || generation.cancelled) return;
    generation.streamText = text;
    const reasoning = updateGenerationReasoning(generation, readNativeLiveReasoning(generation));
    queueStream(generation, text, '', reasoning);
  }),
);

controllerEventStops.push(
  eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text, generationId) => {
    const generation = activeGeneration;
    if (
      !generation ||
      generation.engine !== 'dedicated' ||
      generation.cancelled ||
      generation.generationId !== generationId ||
      generation.interaction.mode !== 'dialogue'
    ) {
      return;
    }
    const parsed = parseDialogueGeneration(
      text,
      generation.interaction,
      generation.operationId ?? generation.requestId,
    );
    generation.streamText = parsed.dialogue;
    generation.streamReaction = parsed.reaction;
    queueStream(generation, parsed.dialogue, parsed.reaction);
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.STREAM_REASONING_DONE, (reasoning, duration, messageId, state) => {
    if (activeGeneration?.engine === 'dedicated') return;
    const source = getActiveSource();
    if (!source) return;
    const generation = activeGeneration?.engine === 'native' ? activeGeneration : null;
    const completedReasoning = { messageId, text: reasoning, duration, state };
    if (generation) {
      generation.reasoning = completedReasoning;
      if (pendingStreamDispatch?.requestId === generation.requestId) {
        pendingStreamDispatch.reasoning = completedReasoning;
        flushQueuedStream(generation);
        return;
      }
    }
    send(source, {
      type: 'reasoning',
      requestId: generation?.requestId,
      ...completedReasoning,
    });
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_RECEIVED, messageId => {
    if (activeGeneration?.engine === 'dedicated') return;
    void finishMessage(Number(messageId));
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.GENERATION_ENDED, messageId => {
    if (activeGeneration?.engine === 'dedicated') return;
    const targetMessageId = Number(messageId);
    const generation = activeGeneration;
    if (
      generation?.engine === 'native' &&
      generation.operation === 'reroll' &&
      (generation.cancelled || targetMessageId !== generation.baseMessageId)
    ) {
      void failNativeReroll(generation, new Error('重答没有形成完整回复'));
      return;
    }
    const shouldRepairDialogueMetadata = activeGeneration?.interaction.mode === 'dialogue';
    void finishMessage(targetMessageId);
    if (shouldRepairDialogueMetadata) {
      window.setTimeout(() => {
        void repairDialogueMetadata(targetMessageId).catch(error => {
          console.warn('[灯火阑珊·伪同层] 交谈楼层元数据补写失败', error);
        });
      }, 500);
    }
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.GENERATION_STOPPED, () => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== 'native') return;
    generation.cancelled = true;
    if (generation.operation === 'reroll') {
      void failNativeReroll(generation, new Error('重答在完成前被终止'));
      return;
    }
    window.setTimeout(async () => {
      if (!activeGeneration || activeGeneration.requestId !== generation.requestId || generation.received) return;
      flushQueuedStream(generation);
      send(generation.source, {
        type: 'complete',
        requestId: generation.requestId,
        messageId: generation.baseMessageId,
      });
      activeGeneration = null;
      broadcastView();
    }, 3000);
  }),
);

controllerEventStops.push(
  eventOn(tavern_events.MORE_MESSAGES_LOADED, () => {
    scheduleViewRefresh(300, true);
  }),
);
controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_UPDATED, () => {
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }),
);
controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_EDITED, () => {
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }),
);
controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_SWIPED, () => {
    if (activeGeneration?.operation === 'reroll') {
      scheduleViewRefresh(200, true);
      return;
    }
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }),
);
controllerEventStops.push(
  eventOn(tavern_events.MESSAGE_DELETED, () => {
    if (deletingMessageId !== null) return;
    if (activeGeneration?.operation === 'reroll') {
      scheduleViewRefresh(200, true);
      return;
    }
    invalidateStageSnapshot();
    selectedMessageId = latestStageId() ?? null;
    selectedHistoryKind = null;
    browsingHistory = false;
    viewRevision += 1;
    scheduleViewRefresh(200);
  }),
);

void waitGlobalInitialized('Mvu')
  .then(() => {
    if (controllerDisposed) return;
    controllerEventStops.push(
      eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        viewRevision += 1;
        scheduleViewRefresh(80, true);
      }),
    );
  })
  .catch(error => {
    console.warn('[灯火阑珊·伪同层] MVU 更新事件监听未启用，将使用消息更新事件刷新', error);
  });

controllerEventStops.push(
  eventOn(tavern_events.CHAT_CHANGED, () => {
    if (activeGeneration?.engine === 'dedicated') {
      activeGeneration.cancelled = true;
      if (activeGeneration.generationId) stopGenerationById(activeGeneration.generationId);
    }
    getStageRoot(false)?.remove();
    tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
    registrations.clear();
    sourceProtocolVersions = new WeakMap<ReplyTarget, number>();
    sourceFrameCache = new WeakMap<ReplyTarget, HTMLIFrameElement>();
    pendingFrameCandidates.clear();
    finishingMessages.clear();
    recentlyFinishedMessages.clear();
    invalidateStageSnapshot();
    discardQueuedStream();
    activeGeneration = null;
    deletingMessageId = null;
    updatingMessageId = null;
    activeInteraction = STORY_INTERACTION;
    selectedMessageId = null;
    selectedHistoryKind = null;
    selectedHistoryMessageIds.story = null;
    selectedHistoryMessageIds.dialogue = null;
    browsingHistory = false;
    viewRevision += 1;
    tavernDocument.body.classList.remove('dhl-pseudo-layer-active');
    scheduleViewRefresh(50);
    window.setTimeout(() => {
      void recoverFailedNativeRerolls().finally(parkLatestStageFrame);
    }, 300);
  }),
);

installStyle();
applyNativeInputState();
tavernWindow.addEventListener('message', handleMessage);
nativeInputMedia.addEventListener('change', handleNativeInputViewportChange);
installFrameObserver();
installNativeDialogueBridge();
window.setTimeout(() => {
  void recoverFailedNativeRerolls().finally(parkLatestStageFrame);
}, 600);
duplicatePruneTimers.push(
  window.setTimeout(() => {
    if (!controllerDisposed) pruneDuplicateControllerFrames();
  }, 500),
);

$(window).on('pagehide', disposeController);

console.info(`[灯火阑珊·伪同层] 原生楼层控制器已连接 v${PSEUDO_LAYER_VERSION}`);
