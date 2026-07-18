export const PSEUDO_LAYER_CHANNEL = 'denghuolanshan:pseudo-layer';
export const PSEUDO_LAYER_VERSION = 4;

export type InteractionMode = 'story' | 'dialogue';
export type PseudoLayerHistoryKind = InteractionMode;
export type DialogueChannel = 'present' | 'transmission';

export type DialogueContext = {
  mode: 'dialogue';
  sessionId: string;
  targetName: string;
  canonicalName: string;
  channel: DialogueChannel;
};

export type StoryInteraction = { mode: 'story' };
export type PseudoLayerInteraction = StoryInteraction | DialogueContext;

export type PseudoLayerStoryStage = { kind: 'story' };
export type PseudoLayerDialogueStage = {
  kind: 'dialogue';
  sessionId: string;
  targetName: string;
  canonicalName: string;
  channel: DialogueChannel;
  turnCount: number;
};
export type PseudoLayerStage = PseudoLayerStoryStage | PseudoLayerDialogueStage;

export type PseudoLayerHistoryState = {
  selectedMessageId: number;
  latestMessageId: number;
  index: number;
  total: number;
  previousMessageId?: number;
  nextMessageId?: number;
  isLatest: boolean;
};

export type PseudoLayerInteractionMetadata = {
  version: 1;
  kind: 'dialogue';
  sessionId: string;
  targetName: string;
  canonicalName: string;
  channel: DialogueChannel;
  rawUserText?: string;
  userMessageId?: number;
};

export type PseudoLayerGenerationState = 'idle' | 'preparing' | 'generating' | 'saving' | 'stopping';
export type PseudoLayerGenerationOperation = 'generate' | 'reroll';
export type PseudoLayerReasoningState = 'none' | 'thinking' | 'done' | 'hidden';

export type PseudoLayerView = {
  hostMessageId: number;
  revision: number;
  selectedMessageId: number;
  latestMessageId: number;
  index: number;
  total: number;
  previousMessageId?: number;
  nextMessageId?: number;
  isLatest: boolean;
  nativeInputCollapsed: boolean;
  stage: PseudoLayerStage;
  histories: Record<PseudoLayerHistoryKind, PseudoLayerHistoryState>;
  activeInteraction: PseudoLayerInteraction;
};

export type PseudoLayerRequest =
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'hello'; messageId: number }
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'goodbye'; messageId: number }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'generate';
      requestId: string;
      messageId: number;
      prompt: string;
      interaction: PseudoLayerInteraction;
    }
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'stop'; requestId: string }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'reroll';
      requestId: string;
      messageId: number;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'delete_message';
      requestId: string;
      messageId: number;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'navigate';
      messageId: number;
      direction: 'previous' | 'next';
      history?: PseudoLayerHistoryKind;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'select_history';
      history: PseudoLayerHistoryKind;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'return_latest';
      history?: PseudoLayerHistoryKind;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'set_interaction';
      interaction: DialogueContext;
    }
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'end_interaction' }
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'toggle_native_input' };

export type PseudoLayerResponse =
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'ready';
      busy: boolean;
      requestId?: string;
      operation?: PseudoLayerGenerationOperation;
    }
  | { channel: typeof PSEUDO_LAYER_CHANNEL; version: number; type: 'view'; view: PseudoLayerView }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'state';
      requestId: string;
      state: Exclude<PseudoLayerGenerationState, 'idle'>;
      operation: PseudoLayerGenerationOperation;
      userText?: string;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'stream';
      requestId: string;
      text: string;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'reasoning';
      requestId?: string;
      messageId: number;
      text: string;
      duration: number | null;
      state: PseudoLayerReasoningState;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'complete';
      requestId: string;
      messageId: number;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'deleted';
      requestId: string;
      deletedMessageId: number;
    }
  | {
      channel: typeof PSEUDO_LAYER_CHANNEL;
      version: number;
      type: 'error';
      requestId?: string;
      message: string;
    };

const hasEnvelope = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return message.channel === PSEUDO_LAYER_CHANNEL && message.version === PSEUDO_LAYER_VERSION;
};

const REQUEST_TYPES = new Set([
  'hello',
  'goodbye',
  'generate',
  'stop',
  'reroll',
  'delete_message',
  'navigate',
  'select_history',
  'return_latest',
  'set_interaction',
  'end_interaction',
  'toggle_native_input',
]);
const RESPONSE_TYPES = new Set(['ready', 'view', 'state', 'stream', 'reasoning', 'complete', 'deleted', 'error']);

export const isPseudoLayerRequest = (value: unknown): value is PseudoLayerRequest =>
  hasEnvelope(value) && REQUEST_TYPES.has(String(value.type));

export const isPseudoLayerResponse = (value: unknown): value is PseudoLayerResponse =>
  hasEnvelope(value) && RESPONSE_TYPES.has(String(value.type));
