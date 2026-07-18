import {
  DialogueContext,
  PSEUDO_LAYER_CHANNEL,
  PSEUDO_LAYER_VERSION,
  PseudoLayerGenerationOperation,
  PseudoLayerGenerationState,
  PseudoLayerInteraction,
  PseudoLayerInteractionMetadata,
  PseudoLayerReasoningState,
  PseudoLayerRequest,
  PseudoLayerResponse,
  PseudoLayerStage,
  PseudoLayerView,
  isPseudoLayerRequest,
} from '../灯火通明/pseudo-layer-protocol';

type ReplyTarget = MessageEventSource & Pick<Window, 'postMessage'>;
type WithoutEnvelope<T> = T extends unknown ? Omit<T, 'channel' | 'version'> : never;
type ResponsePayload = WithoutEnvelope<PseudoLayerResponse>;

type ActiveGeneration = {
  requestId: string;
  source: ReplyTarget;
  operation: PseudoLayerGenerationOperation;
  state: Exclude<PseudoLayerGenerationState, 'idle'>;
  baseMessageId: number;
  interaction: PseudoLayerInteraction;
  rawUserText: string;
  userMessageId?: number;
  sent: boolean;
  received: boolean;
  streamText: string;
  reasoning?: {
    messageId: number;
    text: string;
    duration: number | null;
    state: PseudoLayerReasoningState;
  };
  lockedView?: PseudoLayerView;
};

type StageEntry = {
  representativeMessageId: number;
  messageIds: number[];
  stage: PseudoLayerStage;
};

const STYLE_ID = 'dhl-pseudo-layer-controller-style';
const INPUT_STORAGE_KEY = 'denghuolanshan:pseudo-layer:native-input-collapsed';
const INTERACTION_KEY = 'dhl_pseudo_interaction';
const DIALOGUE_PROMPT_ID = 'dhl-pseudo-dialogue-contract';
const STAGE_CLASS = 'dhl-pseudo-stage';
const SELECTED_CLASS = 'dhl-pseudo-selected';
const PARKED_FRAME_CLASS = 'dhl-pseudo-frame-parked';
const FRAME_KEEPER_CLASS = 'dhl-pseudo-frame-keeper';
const ACTIVE_KEEPER_CLASS = 'dhl-pseudo-frame-active';
const STAGE_ROOT_ID = 'dhl-pseudo-stage-root';
const ROOT_ACTIVE_CLASS = 'dhl-pseudo-stage-root-active';
const STORY_INTERACTION = { mode: 'story' } as const;
const tavernWindow = window.parent;
const tavernDocument = tavernWindow.document;
const registrations = new Map<number, ReplyTarget>();

let activeGeneration: ActiveGeneration | null = null;
let activeInteraction: PseudoLayerInteraction = STORY_INTERACTION;
let selectedMessageId: number | null = null;
let browsingHistory = false;
let deletingMessageId: number | null = null;
let nativeInputCollapsed = localStorage.getItem(INPUT_STORAGE_KEY) === 'true';
let viewRevision = 0;
let dialoguePromptHandle: { uninject: () => void } | null = null;
let frameObserver: MutationObserver | null = null;

const send = (source: ReplyTarget | undefined, message: ResponsePayload) => {
  source?.postMessage(
    {
      channel: PSEUDO_LAYER_CHANNEL,
      version: PSEUDO_LAYER_VERSION,
      ...message,
    } as PseudoLayerResponse,
    '*',
  );
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
  if (
    candidate.mode !== 'dialogue' ||
    (candidate.channel !== 'present' && candidate.channel !== 'transmission')
  ) {
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

const buildDialogueContract = (context: DialogueContext) => {
  const channelRules =
    context.channel === 'present'
      ? `这是当面交谈。<正文> 内只能写 ${context.targetName} 此刻亲口说出的话，不得写动作、神态、环境、语气说明或任何旁白。`
      : `这是远程传讯。<正文> 内只能写 ${context.targetName} 传回的话，不得描写远端场景、动作、神态或任何旁白，也不得仅因本轮传讯把远端角色加入 visual_cards。`;

  return `
【灯火阑珊·本轮角色交谈契约】
本轮由「${context.targetName}」（规范角色名：${context.canonicalName}）直接回应用户，交流方式为${context.channel === 'present' ? '当面交谈' : '传讯'}。
${channelRules}

本契约只覆盖本轮回复的篇幅、叙述结构与推进速度；角色人设、世界观、世界书、MVU、Visual Cards、既有安全规则和原有输出结构仍然有效。
- 本轮处于专门的短对话模式。本契约优先于“正文不少于 1000 字”“扩写完整剧情”“详细环境描写”等普通剧情要求；禁止为了满足其他篇幅要求增加文字。
- <正文> 的全部可见文字合计不得超过 50 个中文字符（标点也计入），通常只写 1 至 3 句；直接回答用户，不复述提问。
- <正文> 必须是百分之百的角色对白。禁止旁白、动作、表情、心理、环境、转述、说话人标签、Markdown 引用和括号舞台说明；不要用引号包裹整段对白。
- 本轮只允许 ${context.targetName} 回应。即使其他角色在场，也不得代答或插话。
- 不得无请求地跳时间、换地点、开启新任务、替用户决定言行，或扩展成一整段长篇剧情。
- 普通寒暄、询问和陪伴不自动增加好感，不自动推进关系。只有可见正文确实发生了实质变化时才更新 MVU；否则变量更新使用现有格式输出空 JSONPatch。
- 仅 <正文> 内的角色对白受 50 字限制；visual_cards、UpdateVariable、JSONPatch 等结构继续遵守角色卡原有格式，不计入正文字符数。模型漏写结构时也不要用解释性文字补充格式说明。
  `.trim();
};

const syncDialoguePrompt = () => {
  dialoguePromptHandle?.uninject();
  dialoguePromptHandle = null;
  if (activeInteraction.mode !== 'dialogue') return;

  const context = { ...activeInteraction };
  dialoguePromptHandle = injectPrompts([
    {
      id: DIALOGUE_PROMPT_ID,
      position: 'in_chat',
      depth: 0,
      role: 'system',
      content: buildDialogueContract(context),
      should_scan: true,
      filter: () => !browsingHistory && isSameInteraction(activeInteraction, context),
    },
  ]);
};

const setActiveInteraction = (interaction: PseudoLayerInteraction) => {
  const next =
    interaction.mode === 'dialogue' ? normalizeDialogueContext(interaction) ?? STORY_INTERACTION : STORY_INTERACTION;
  if (isSameInteraction(activeInteraction, next)) return;
  activeInteraction = next;
  syncDialoguePrompt();
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
  let keeper = [...root.querySelectorAll<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}`)].find(
    candidate => Number(candidate.dataset.messageId) === messageId,
  );
  if (!keeper && create) {
    keeper = tavernDocument.createElement('div');
    keeper.className = FRAME_KEEPER_CLASS;
    keeper.dataset.messageId = String(messageId);
    root.append(keeper);
  }
  return keeper ?? null;
};

const getFrameMessageId = (frame: HTMLIFrameElement) => {
  const messageId = Number(
    frame.dataset.dhlMessageId ?? frame.closest<HTMLElement>('.mes')?.getAttribute('mesid'),
  );
  return Number.isFinite(messageId) ? messageId : undefined;
};

const getFrameForSource = (source: ReplyTarget) =>
  [
    ...tavernDocument.querySelectorAll<HTMLIFrameElement>(
      `#chat > .mes .TH-render iframe, #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe`,
    ),
  ].find(frame => frame.contentWindow === source);

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
      hasMountedPseudoApp(keptFrame) ||
      (keptSource !== null && registrations.get(messageId) === keptSource);
    if (keptIsLive) return false;
    keptFrame.remove();
  }

  if (frame.dataset.dhlControllerOwned === 'true') {
    frame.dataset.dhlMessageId = String(messageId);
    keeper.append(frame);
    return true;
  }

  const ownedFrame = frame.cloneNode(false) as HTMLIFrameElement;
  ownedFrame.removeAttribute('id');
  ownedFrame.removeAttribute('loading');
  ownedFrame.dataset.dhlControllerOwned = 'true';
  ownedFrame.dataset.dhlMessageId = String(messageId);
  keeper.append(ownedFrame);
  message.classList.add(PARKED_FRAME_CLASS);
  return true;
};

const parkSourceFrame = (messageId: number, source: ReplyTarget) => {
  const frame = getFrameForSource(source);
  return frame ? parkFrame(messageId, frame) : false;
};

const getParkedMessageId = () => {
  const keepers = [
    ...(getStageRoot(false)?.querySelectorAll<HTMLElement>(`:scope > .${FRAME_KEEPER_CLASS}`) ?? []),
  ];
  const isMounted = (keeper: HTMLElement) =>
    hasMountedPseudoApp(keeper.querySelector<HTMLIFrameElement>(':scope > iframe'));
  const active = keepers.find(
    keeper => keeper.classList.contains(ACTIVE_KEEPER_CLASS) && isMounted(keeper),
  );
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

const readInteractionMetadata = (message: ChatMessage | undefined): PseudoLayerInteractionMetadata | null => {
  if (!message) return null;
  const direct = message.extra?.[INTERACTION_KEY];
  const nested = message.extra?.extra?.[INTERACTION_KEY];
  const value = (direct ?? nested) as Partial<PseudoLayerInteractionMetadata> | undefined;
  if (!value || value.version !== 1 || value.kind !== 'dialogue') return null;
  const context = normalizeDialogueContext({ mode: 'dialogue', ...value });
  if (!context) return null;
  const userMessageId = Number(value.userMessageId);
  return {
    version: 1,
    kind: 'dialogue',
    ...context,
    ...(typeof value.rawUserText === 'string' ? { rawUserText: value.rawUserText } : {}),
    ...(Number.isFinite(userMessageId) ? { userMessageId } : {}),
  };
};

const toDialogueContext = (metadata: PseudoLayerInteractionMetadata): DialogueContext => ({
  mode: 'dialogue',
  sessionId: metadata.sessionId,
  targetName: metadata.targetName,
  canonicalName: metadata.canonicalName,
  channel: metadata.channel,
});

const findPreviousUserMessage = (messages: ChatMessage[], messageId: number) =>
  [...messages]
    .reverse()
    .find(message => message.role === 'user' && message.message_id < messageId);

const resolveAssistantInteractionMetadata = (
  message: ChatMessage | undefined,
  messages: ChatMessage[],
): PseudoLayerInteractionMetadata | null => {
  const direct = readInteractionMetadata(message);
  if (direct || !message || message.role !== 'assistant') return direct;

  const userMessage = findPreviousUserMessage(messages, message.message_id);
  const userMetadata = readInteractionMetadata(userMessage);
  if (!userMetadata || !userMessage) return null;
  return {
    ...userMetadata,
    userMessageId: userMessage.message_id,
  };
};

const getAssistantMessages = () => {
  try {
    return getAllMessages().filter(message => message.role === 'assistant');
  } catch (error) {
    console.warn('[灯火阑珊·伪同层] 读取完整聊天楼层失败，暂时使用页面楼层', error);
    return [...tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes')]
      .filter(
        element =>
          element.getAttribute('is_user') === 'false' && element.getAttribute('is_system') === 'false',
      )
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
  }
};

const getStageEntries = (): StageEntry[] => {
  const entries: StageEntry[] = [];
  let allMessages: ChatMessage[] = [];
  try {
    allMessages = getAllMessages();
  } catch {
    // getAssistantMessages() below retains the DOM fallback for early page startup.
  }
  const assistantMessages = allMessages.length
    ? allMessages.filter(message => message.role === 'assistant')
    : getAssistantMessages();
  assistantMessages
    .sort((left, right) => left.message_id - right.message_id)
    .forEach(message => {
      const metadata = resolveAssistantInteractionMetadata(message, allMessages);
      const previous = entries.at(-1);
      if (
        metadata &&
        previous?.stage.kind === 'dialogue' &&
        previous.stage.sessionId === metadata.sessionId
      ) {
        previous.messageIds.push(message.message_id);
        previous.representativeMessageId = message.message_id;
        previous.stage.turnCount += 1;
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
            }
          : { kind: 'story' },
      });
    });
  return entries;
};

const getStageIds = () => getStageEntries().map(entry => entry.representativeMessageId);
const latestStageId = () => getStageEntries().at(-1)?.representativeMessageId;

const parkCandidateFrame = (frame: HTMLIFrameElement) => {
  const messageId = getFrameMessageId(frame);
  if (messageId === undefined) return;
  const shouldPark =
    messageId === latestStageId() ||
    (activeGeneration?.operation === 'reroll' && messageId === activeGeneration.baseMessageId);
  if (!shouldPark) return;
  if (parkFrame(messageId, frame)) window.setTimeout(applyStageVisibility, 0);
};

const inspectAddedFrameNode = (node: Node) => {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const element = node as Element;
  if (element.tagName === 'IFRAME') parkCandidateFrame(element as HTMLIFrameElement);
  element.querySelectorAll<HTMLIFrameElement>('iframe').forEach(parkCandidateFrame);
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
  getAssistantMessages()
    .map(message => message.message_id)
    .filter(messageId => getLiveRegistration(messageId) !== undefined);

const getRerollLock = () =>
  activeGeneration?.operation === 'reroll' ? activeGeneration.lockedView : undefined;

const getHostStageId = () => {
  if (activeGeneration?.operation === 'reroll' && getMessageElement(activeGeneration.baseMessageId)) {
    return activeGeneration.baseMessageId;
  }
  return getRegisteredAssistantIds().at(-1) ?? getParkedMessageId();
};

const makeView = (): PseudoLayerView => {
  const lockedView = getRerollLock();
  if (lockedView) {
    return {
      ...lockedView,
      hostMessageId: getHostStageId() ?? lockedView.hostMessageId,
      nativeInputCollapsed,
      activeInteraction:
        activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION,
    };
  }

  const entries = getStageEntries();
  const ids = entries.map(entry => entry.representativeMessageId);
  const latestMessageId = ids.at(-1) ?? -1;
  const selected = selectedMessageId !== null && ids.includes(selectedMessageId) ? selectedMessageId : latestMessageId;
  const position = ids.indexOf(selected);
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
    stage: entries[position]?.stage ?? { kind: 'story' },
    activeInteraction:
      activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION,
  };
};

const applyNativeInputState = () => {
  tavernDocument.body.classList.toggle('dhl-native-input-collapsed', nativeInputCollapsed);
};

const applyStageVisibility = () => {
  const ids = getStageIds();
  if (!getRerollLock()) {
    if (!browsingHistory && !activeGeneration) selectedMessageId = ids.at(-1) ?? null;
    if (selectedMessageId !== null && !ids.includes(selectedMessageId)) selectedMessageId = ids.at(-1) ?? null;
  }
  const hostMessageId = getHostStageId();
  const assistantIds = getAssistantMessages().map(message => message.message_id);

  tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes').forEach(element => {
    const id = Number(element.getAttribute('mesid'));
    element.classList.toggle(STAGE_CLASS, assistantIds.includes(id));
    element.classList.toggle(SELECTED_CLASS, id === hostMessageId);
  });
  syncParkedStage(hostMessageId);
  tavernDocument.body.classList.toggle('dhl-pseudo-layer-active', hostMessageId !== undefined);
  applyNativeInputState();
};

const broadcastView = () => {
  applyStageVisibility();
  const view = makeView();
  getRegisteredAssistantIds().forEach(messageId => send(registrations.get(messageId), { type: 'view', view }));
};

const installStyle = () => {
  if (tavernDocument.getElementById(STYLE_ID)) return;
  const style = tavernDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
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
  `;
  tavernDocument.head.append(style);
};

const buildMessage = (reply: string) => {
  const text = reply.trim();
  if (
    /<visual_cards>[\s\S]*?<\/visual_cards>/i.test(text) ||
    /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(text)
  ) {
    return text;
  }
  return `${text}\n\n<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
};

const ensurePseudoMarker = async (messageId: number) => {
  const message = getChatMessages(messageId)[0];
  if (!message || message.role !== 'assistant') return;
  const content = String(message.message ?? '');
  const nextContent = buildMessage(content);
  if (nextContent === content.trim()) return;
  await setChatMessages([{ message_id: messageId, message: nextContent }], { refresh: 'affected' });
};

const writeInteractionMetadata = async (
  messageId: number,
  context: DialogueContext,
  options: { rawUserText?: string; userMessageId?: number } = {},
) => {
  const message = getChatMessages(messageId)[0];
  if (!message) return;
  const metadata: PseudoLayerInteractionMetadata = {
    version: 1,
    kind: 'dialogue',
    ...context,
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
  const prefix =
    context.channel === 'present'
      ? `（对${context.targetName}说）`
      : `（向${context.targetName}传讯）`;
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
          chat?: unknown[];
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
  const nativeMessage = context?.chat?.at(-1);
  await swipeRight.call(nativeButton ?? context?.swipe, null, {
    source: 'dhl-pseudo-layer',
    message: nativeMessage,
  });
};

const beginGeneration = (
  request: Extract<PseudoLayerRequest, { type: 'generate' }>,
  source: ReplyTarget,
) => {
  if (activeGeneration || deletingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '已有一场生成正在进行。' });
    return;
  }
  const prompt = request.prompt.trim();
  const latest = latestStageId();
  if (!prompt) {
    send(source, { type: 'error', requestId: request.requestId, message: '输入内容不能为空。' });
    return;
  }
  if (request.messageId !== latest || selectedMessageId !== latest) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '历史节点不能发起行动，请先返回最新。',
    });
    return;
  }

  const dialogue = request.interaction.mode === 'dialogue' ? normalizeDialogueContext(request.interaction) : null;
  const interaction: PseudoLayerInteraction = dialogue ?? STORY_INTERACTION;
  setActiveInteraction(interaction);
  activeGeneration = {
    requestId: request.requestId,
    source,
    operation: 'generate',
    state: 'preparing',
    baseMessageId: request.messageId,
    interaction,
    rawUserText: prompt,
    sent: false,
    received: false,
    streamText: '',
  };
  browsingHistory = false;
  sendGenerationState(activeGeneration, 'preparing');
  applyStageVisibility();

  try {
    triggerNativeSend(dialogue ? decorateDialogueInput(prompt, dialogue) : prompt);
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

const beginReroll = (
  request: Extract<PseudoLayerRequest, { type: 'reroll' }>,
  source: ReplyTarget,
) => {
  if (activeGeneration || deletingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '已有一场生成正在进行。' });
    return;
  }
  const latest = latestStageId();
  if (request.messageId !== latest || selectedMessageId !== latest) {
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '历史节点不能重生成，请先返回最新。',
    });
    return;
  }

  const messages = getAllMessages();
  const message = messages.find(item => item.message_id === request.messageId);
  const metadata = resolveAssistantInteractionMetadata(message, messages);
  const previousUser = findPreviousUserMessage(messages, request.messageId);
  const rerollUserText =
    metadata?.rawUserText ??
    String(previousUser?.message ?? '')
      .replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, '')
      .trim();
  const interaction: PseudoLayerInteraction = metadata ? toDialogueContext(metadata) : STORY_INTERACTION;
  setActiveInteraction(interaction);
  const lockedView = makeView();
  activeGeneration = {
    requestId: request.requestId,
    source,
    operation: 'reroll',
    state: 'preparing',
    baseMessageId: request.messageId,
    interaction,
    rawUserText: rerollUserText,
    userMessageId: metadata?.userMessageId ?? previousUser?.message_id,
    sent: false,
    received: false,
    streamText: '',
    lockedView,
  };
  parkSourceFrame(request.messageId, source);
  browsingHistory = false;
  sendGenerationState(activeGeneration, 'preparing');
  applyStageVisibility();

  void triggerNativeReroll(request.messageId).catch(error => {
    const generation = activeGeneration;
    if (!generation || generation.requestId !== request.requestId) return;
    if (generation.received || generation.streamText.trim()) {
      console.warn('[灯火阑珊·伪同层] 酒馆在重生成完成后报告 swipe 收尾异常，已保留新回复', error);
      return;
    }
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    activeGeneration = null;
    broadcastView();
  });

  window.setTimeout(() => {
    if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
    send(source, {
      type: 'error',
      requestId: request.requestId,
      message: '酒馆没有开始重生成，请检查连接状态。',
    });
    activeGeneration = null;
    broadcastView();
  }, 1800);
};

const finishingMessages = new Map<number, Promise<void>>();

const finishMessageInternal = async (messageId: number) => {
  const generation = activeGeneration;
  if (generation) {
    generation.received = true;
    sendGenerationState(generation, 'saving');
  }

  try {
    if (generation?.interaction.mode === 'dialogue') {
      await writeInteractionMetadata(messageId, generation.interaction, {
        rawUserText: generation.rawUserText,
        userMessageId: generation.userMessageId,
      });
    } else {
      const messages = getAllMessages();
      const message = messages.find(item => item.message_id === messageId);
      const metadata = resolveAssistantInteractionMetadata(message, messages);
      if (metadata) {
        await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
          rawUserText: metadata.rawUserText,
          userMessageId: metadata.userMessageId,
        });
      }
    }
    await ensurePseudoMarker(messageId);
    selectedMessageId = messageId;
    browsingHistory = false;
    viewRevision += 1;
    if (generation) {
      send(generation.source, { type: 'complete', requestId: generation.requestId, messageId });
    }
    activeGeneration = null;
    broadcastView();
  } catch (error) {
    if (generation) {
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

const finishMessage = (messageId: number) => {
  const existing = finishingMessages.get(messageId);
  if (existing) return existing;
  const task = finishMessageInternal(messageId).finally(() => finishingMessages.delete(messageId));
  finishingMessages.set(messageId, task);
  return task;
};

const repairDialogueMetadata = async (messageId: number) => {
  const messages = getAllMessages();
  const message = messages.find(item => item.message_id === messageId);
  if (!message || readInteractionMetadata(message)) return;
  const metadata = resolveAssistantInteractionMetadata(message, messages);
  if (!metadata) return;
  await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
    rawUserText: metadata.rawUserText,
    userMessageId: metadata.userMessageId,
  });
  viewRevision += 1;
  broadcastView();
};

const selectStage = (target: number) => {
  selectedMessageId = target;
  browsingHistory = target !== latestStageId();
  viewRevision += 1;
  broadcastView();
  getMessageElement(getHostStageId() ?? target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const navigate = (request: Extract<PseudoLayerRequest, { type: 'navigate' }>) => {
  if (activeGeneration || deletingMessageId !== null) return;
  const ids = getStageIds();
  const position = ids.indexOf(request.messageId);
  if (position < 0) return;
  const target = request.direction === 'previous' ? ids[position - 1] : ids[position + 1];
  if (target === undefined) return;
  selectStage(target);
};

const deleteLatestTurn = async (
  request: Extract<PseudoLayerRequest, { type: 'delete_message' }>,
  source: ReplyTarget,
) => {
  if (activeGeneration || deletingMessageId !== null) {
    send(source, { type: 'error', requestId: request.requestId, message: '当前仍有操作正在进行。' });
    return;
  }

  const entries = getStageEntries();
  const latest = entries.at(-1);
  if (
    !latest ||
    request.messageId !== latest.representativeMessageId ||
    selectedMessageId !== latest.representativeMessageId
  ) {
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
  const linkedUser = explicitUser ??
    (previousUser?.message_id === assistant.message_id - 1 ? previousUser : undefined);
  const messageIds = [assistant.message_id, ...(linkedUser ? [linkedUser.message_id] : [])].sort(
    (left, right) => left - right,
  );

  deletingMessageId = assistant.message_id;
  try {
    await deleteChatMessages(messageIds, { refresh: 'affected' });
    selectedMessageId = latestStageId() ?? null;
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
    window.setTimeout(broadcastView, 120);
  }
};

const handleMessage = (event: MessageEvent<unknown>) => {
  if (!isPseudoLayerRequest(event.data)) return;
  const request = event.data;
  const source = asReplyTarget(event.source);
  if (!source) return;

  if (request.type === 'hello') {
    const messageId = getSourceMessageId(source) ?? request.messageId;
    const isHeartbeat = registrations.get(messageId) === source && getSourceMessageId(source) === messageId;
    const previousSource = registrations.get(messageId);
    if (previousSource && previousSource !== source) {
      const previousFrame = getFrameForSource(previousSource);
      if (previousFrame?.closest(`#${STAGE_ROOT_ID}`) && hasMountedPseudoApp(previousFrame)) {
        send(source, {
          type: 'ready',
          busy: activeGeneration !== null || deletingMessageId !== null,
          requestId: activeGeneration?.requestId,
          operation: activeGeneration?.operation,
        });
        return;
      }
    }
    registrations.set(messageId, source);
    if (!browsingHistory && !activeGeneration) selectedMessageId = latestStageId() ?? messageId;
    if (activeGeneration?.operation === 'reroll' && messageId === activeGeneration.baseMessageId) {
      activeGeneration.source = source;
    }
    send(source, {
      type: 'ready',
      busy: activeGeneration !== null || deletingMessageId !== null,
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

  if (request.type === 'stop') {
    if (!activeGeneration || activeGeneration.requestId !== request.requestId) return;
    sendGenerationState(activeGeneration, 'stopping', source);
    SillyTavern.stopGeneration();
    return;
  }

  if (request.type === 'navigate') {
    if (getSourceMessageId(source) === undefined) return;
    navigate(request);
    return;
  }

  if (request.type === 'return_latest') {
    if (activeGeneration || deletingMessageId !== null) return;
    const target = latestStageId();
    if (target !== undefined) selectStage(target);
    return;
  }

  if (request.type === 'set_interaction') {
    if (activeGeneration || deletingMessageId !== null || browsingHistory) return;
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
    if (deletingMessageId !== null) return;
    setActiveInteraction(STORY_INTERACTION);
    viewRevision += 1;
    broadcastView();
    return;
  }

  nativeInputCollapsed = !nativeInputCollapsed;
  localStorage.setItem(INPUT_STORAGE_KEY, String(nativeInputCollapsed));
  broadcastView();
};

const getActiveSource = () => activeGeneration?.source ?? registrations.get(getHostStageId() ?? -1);

const handleMessageSent = async (messageId: number) => {
  const source = getActiveSource();
  if (!source) return;
  const message = getChatMessages(messageId)[0];
  if (!activeGeneration) {
    const interaction =
      activeInteraction.mode === 'dialogue' ? { ...activeInteraction } : STORY_INTERACTION;
    activeGeneration = {
      requestId: `native-${Date.now()}`,
      source,
      operation: 'generate',
      state: 'generating',
      baseMessageId: latestStageId() ?? messageId - 1,
      interaction,
      rawUserText: String(message?.message ?? '').trim(),
      userMessageId: messageId,
      sent: true,
      received: false,
      streamText: '',
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
              version: 1,
              kind: 'dialogue',
              ...activeGeneration.interaction,
              rawUserText,
            } satisfies PseudoLayerInteractionMetadata,
          },
        },
      ],
      { refresh: 'none' },
    );
  }

  sendGenerationState(activeGeneration, 'generating', source);
  applyStageVisibility();
};

eventOn(tavern_events.MESSAGE_SENT, messageId => {
  void handleMessageSent(Number(messageId)).catch(error => {
    console.error('[灯火阑珊·伪同层] 写入交谈楼层元数据失败', error);
  });
});

eventOn(tavern_events.GENERATION_STARTED, () => {
  if (!activeGeneration) return;
  activeGeneration.sent = true;
  sendGenerationState(activeGeneration, 'generating');
});

eventOn(tavern_events.STREAM_TOKEN_RECEIVED, text => {
  if (!activeGeneration) return;
  activeGeneration.streamText = text;
  send(activeGeneration.source, {
    type: 'stream',
    requestId: activeGeneration.requestId,
    text,
  });
});

eventOn(tavern_events.STREAM_REASONING_DONE, (reasoning, duration, messageId, state) => {
  const source = getActiveSource();
  if (!source) return;
  if (activeGeneration) {
    activeGeneration.reasoning = { messageId, text: reasoning, duration, state };
  }
  send(source, {
    type: 'reasoning',
    requestId: activeGeneration?.requestId,
    messageId,
    text: reasoning,
    duration,
    state,
  });
});

eventOn(tavern_events.MESSAGE_RECEIVED, messageId => {
  void finishMessage(Number(messageId));
});

eventOn(tavern_events.GENERATION_ENDED, messageId => {
  const targetMessageId = Number(messageId);
  void finishMessage(targetMessageId);
  [350, 1200].forEach(delay => {
    window.setTimeout(() => {
      void repairDialogueMetadata(targetMessageId).catch(error => {
        console.warn('[灯火阑珊·伪同层] 交谈楼层元数据补写失败', error);
      });
    }, delay);
  });
});

eventOn(tavern_events.GENERATION_STOPPED, () => {
  const generation = activeGeneration;
  if (!generation) return;
  window.setTimeout(() => {
    if (!activeGeneration || activeGeneration.requestId !== generation.requestId || generation.received) return;
    send(generation.source, {
      type: 'complete',
      requestId: generation.requestId,
      messageId: generation.baseMessageId,
    });
    activeGeneration = null;
    broadcastView();
  }, 3000);
});

eventOn(tavern_events.MORE_MESSAGES_LOADED, () => window.setTimeout(broadcastView, 300));
eventOn(tavern_events.MESSAGE_UPDATED, () => {
  viewRevision += 1;
  window.setTimeout(broadcastView, 200);
});
eventOn(tavern_events.MESSAGE_EDITED, () => {
  viewRevision += 1;
  window.setTimeout(broadcastView, 200);
});
eventOn(tavern_events.MESSAGE_SWIPED, () => {
  if (activeGeneration?.operation === 'reroll') {
    window.setTimeout(broadcastView, 200);
    return;
  }
  viewRevision += 1;
  window.setTimeout(broadcastView, 200);
});
eventOn(tavern_events.MESSAGE_DELETED, () => {
  if (deletingMessageId !== null) return;
  if (activeGeneration?.operation === 'reroll') {
    window.setTimeout(broadcastView, 200);
    return;
  }
  selectedMessageId = latestStageId() ?? null;
  browsingHistory = false;
  viewRevision += 1;
  window.setTimeout(broadcastView, 200);
});
eventOn(tavern_events.CHAT_CHANGED, () => {
  getStageRoot(false)?.remove();
  tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
  registrations.clear();
  activeGeneration = null;
  deletingMessageId = null;
  activeInteraction = STORY_INTERACTION;
  dialoguePromptHandle?.uninject();
  dialoguePromptHandle = null;
  selectedMessageId = null;
  browsingHistory = false;
  viewRevision += 1;
  applyStageVisibility();
  window.setTimeout(parkLatestStageFrame, 300);
});

installStyle();
applyNativeInputState();
tavernWindow.addEventListener('message', handleMessage);
installFrameObserver();
window.setTimeout(parkLatestStageFrame, 0);

$(window).on('pagehide', () => {
  frameObserver?.disconnect();
  frameObserver = null;
  tavernWindow.removeEventListener('message', handleMessage);
  dialoguePromptHandle?.uninject();
  dialoguePromptHandle = null;
  releaseParkedFrames();
  tavernDocument.getElementById(STYLE_ID)?.remove();
  tavernDocument.body.classList.remove(
    'dhl-pseudo-layer-active',
    'dhl-native-input-collapsed',
    ROOT_ACTIVE_CLASS,
  );
  tavernDocument.querySelectorAll<HTMLElement>('#chat > .mes').forEach(element => {
    element.classList.remove(STAGE_CLASS, SELECTED_CLASS, PARKED_FRAME_CLASS);
  });
});

console.info('[灯火阑珊·伪同层] 原生楼层控制器已连接');
