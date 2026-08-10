import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_jsonrepair_esm_703c329d__ from "https://testingcf.jsdelivr.net/npm/jsonrepair/+esm";

var __webpack_modules__ = {
  "./src/灯火通明-伪同层控制器/dialogue-engine.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      generateDialogueReply: () => generateDialogueReply,
      parseDialogueGeneration: () => parseDialogueGeneration
    });
    var jsonrepair__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jsonrepair */ "jsonrepair");
    var _message_content__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火通明/message-content */ "./src/灯火通明/message-content.ts");
    const INTERACTION_KEY = "dhl_pseudo_interaction";
    const MAX_VISIBLE_CHARACTERS = 160;
    const MAX_REACTION_CHARACTERS = 32;
    const MAX_CONTEXT_TEXT = 720;
    const MAX_COMPLETION_TOKENS = 1536;
    const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const compactText = (value, maxLength = MAX_CONTEXT_TEXT) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
    const truncateAtSentence = (value, maxLength) => {
      const text = value.trim();
      if (text.length <= maxLength) return text;
      const candidate = text.slice(0, maxLength);
      const boundary = Math.max(candidate.lastIndexOf("。"), candidate.lastIndexOf("！"), candidate.lastIndexOf("？"), candidate.lastIndexOf("…"), candidate.lastIndexOf("；"));
      return (boundary >= Math.floor(maxLength * .55) ? candidate.slice(0, boundary + 1) : candidate).trim();
    };
    const readMetadata = message => {
      const value = message?.extra?.[INTERACTION_KEY] ?? message?.extra?.extra?.[INTERACTION_KEY];
      if (!value || value.version !== 1 && value.version !== 2 || value.kind !== "dialogue" || value.channel !== "present" && value.channel !== "transmission") {
        return null;
      }
      const sessionId = compactText(value.sessionId, 120);
      const targetName = compactText(value.targetName, 80);
      const canonicalName = compactText(value.canonicalName, 80);
      if (!sessionId || !targetName || !canonicalName) return null;
      return {
        ...value,
        version: value.version,
        kind: "dialogue",
        sessionId,
        targetName,
        canonicalName,
        channel: value.channel
      };
    };
    const findPreviousUser = (messages, beforeMessageId) => [ ...messages ].reverse().find(message => message.role === "user" && message.message_id < beforeMessageId);
    const findPreviousMessage = (messages, beforeMessageId) => [ ...messages ].reverse().find(message => message.message_id < beforeMessageId);
    const resolveAssistantMetadata = (message, messages) => {
      const direct = readMetadata(message);
      if (direct || message.role !== "assistant") return direct;
      const previous = findPreviousMessage(messages, message.message_id);
      return previous?.role === "user" ? readMetadata(previous) : null;
    };
    const rawUserText = message => {
      const metadata = readMetadata(message);
      return compactText(metadata?.rawUserText ?? String(message?.message ?? "").replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, ""), 360);
    };
    const getStatData = mvuData => {
      const statData = _.get(mvuData, "stat_data");
      return isRecord(statData) ? statData : mvuData;
    };
    const buildSceneSummary = (context, mvuData, latestState, memories = []) => {
      const statData = getStatData(mvuData);
      const companion = _.get(statData, [ "红颜", context.canonicalName ], {});
      const relationContext = _.get(companion, "关系上下文", {});
      const track = _.get(statData, "本尊.行踪", {});
      const location = compactText(_.get(track, "当前区域", "未知之地"), 100);
      const environment = compactText(_.get(track, "环境描述", ""), 220);
      const situation = compactText(_.get(statData, "当前处境", ""), 360);
      const relationship = compactText(_.get(companion, "关系", ""), 100);
      const favor = Number(_.get(companion, "好感度"));
      const relationLines = [ [ "关系", relationship ], [ "好感", Number.isFinite(favor) ? String(favor) : "" ], [ "当前情绪", compactText(_.get(relationContext, "当前情绪", ""), 120) ], [ "态度缘由", compactText(_.get(relationContext, "态度缘由", ""), 180) ], [ "关系诉求", compactText(_.get(relationContext, "关系诉求", ""), 180) ], [ "相处禁忌", compactText(_.get(relationContext, "相处禁忌", ""), 180) ], [ "未了约定", compactText(_.get(relationContext, "未了约定", ""), 180) ] ].filter(([, value]) => value).map(([label, value]) => `${label}：${value}`).join("\n");
      const sessionLines = latestState ? [ latestState.emotion && `会话情绪：${compactText(latestState.emotion, 120)}`, latestState.topic && `当前话题：${compactText(latestState.topic, 160)}`, latestState.subtext && `当前潜台词：${compactText(latestState.subtext, 180)}`, latestState.unresolvedThreads?.length && `未解线索：${latestState.unresolvedThreads.map(item => compactText(item, 100)).join("；")}` ].filter(Boolean).join("\n") : "";
      const memoryLines = memories.length ? `尚未解决的重要记忆：\n${memories.map(item => `- [${item.kind}] ${compactText(item.summary, 160)}`).join("\n")}` : "";
      return [ `目标角色：${context.targetName}（规范角色名：${context.canonicalName}）`, `交流方式：${context.channel === "present" ? "当面交谈" : "远程传讯"}`, `地点：${location}`, environment && `环境：${environment}`, situation && `当前处境：${situation}`, relationLines, sessionLines, memoryLines ].filter(Boolean).join("\n");
    };
    const collectSessionState = (messages, context, baseMessageId) => {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.message_id > baseMessageId || message.role !== "assistant") continue;
        const metadata = resolveAssistantMetadata(message, messages);
        if (metadata?.sessionId === context.sessionId && metadata.sessionState) return metadata.sessionState;
      }
      return undefined;
    };
    const collectOpenMemories = (messages, context, baseMessageId) => {
      const projection = new Map;
      messages.forEach(message => {
        if (message.message_id > baseMessageId || message.role !== "assistant") return;
        const metadata = resolveAssistantMetadata(message, messages);
        if (!metadata || metadata.targetName !== context.targetName) return;
        (metadata.memoryEvents ?? []).forEach(event => {
          (event.resolves ?? []).forEach(id => projection.delete(id));
          if (event.status === "resolved") projection.delete(event.id); else projection.set(event.id, event);
        });
      });
      return [ ...projection.values() ].slice(-8);
    };
    const buildHistoryPrompts = (messages, context, baseMessageId, sceneSummary) => {
      const prompts = [ {
        role: "system",
        content: `【本轮对话资料】\n${sceneSummary}`
      } ];
      const storyAssistant = [ ...messages ].reverse().find(message => message.role === "assistant" && message.message_id <= baseMessageId && !resolveAssistantMetadata(message, messages));
      if (storyAssistant) {
        const storyUser = findPreviousUser(messages, storyAssistant.message_id);
        const userAnchor = compactText(storyUser?.message, 360);
        const assistantAnchor = compactText((0, _message_content__WEBPACK_IMPORTED_MODULE_1__.extractNarrative)(storyAssistant.message), MAX_CONTEXT_TEXT);
        prompts.push({
          role: "system",
          content: [ "【最近正文锚点，仅用于理解现场，不要续写成长篇剧情】", userAnchor && `用户：${userAnchor}`, assistantAnchor && `剧情：${assistantAnchor}` ].filter(Boolean).join("\n")
        });
      }
      const sessionTurns = messages.filter(message => message.role === "assistant" && message.message_id <= baseMessageId).flatMap(message => {
        const metadata = resolveAssistantMetadata(message, messages);
        if (!metadata || metadata.sessionId !== context.sessionId) return [];
        const linkedUser = Number.isFinite(metadata.userMessageId) ? messages.find(candidate => candidate.message_id === metadata.userMessageId) : findPreviousUser(messages, message.message_id);
        const visible = (0, _message_content__WEBPACK_IMPORTED_MODULE_1__.extractDialogueContent)(message.message);
        return [ {
          user: rawUserText(linkedUser),
          assistant: [ visible.reaction && `（${visible.reaction}）`, visible.dialogue ].filter(Boolean).join(" ")
        } ];
      }).slice(-8);
      sessionTurns.forEach(turn => {
        if (turn.user) prompts.push({
          role: "user",
          content: turn.user
        });
        if (turn.assistant) prompts.push({
          role: "assistant",
          content: compactText(turn.assistant, 320)
        });
      });
      return prompts;
    };
    const buildEngineContext = input => {
      const latestState = collectSessionState(input.messages, input.context, input.baseMessageId);
      const memories = collectOpenMemories(input.messages, input.context, input.baseMessageId);
      const sceneSummary = buildSceneSummary(input.context, input.mvuData, latestState, memories);
      return {
        sceneSummary,
        historyPrompts: buildHistoryPrompts(input.messages, input.context, input.baseMessageId, sceneSummary)
      };
    };
    const buildDialogueContract = context => `\n【灯火阑珊·红颜专用短对话引擎】\n你现在只扮演「${context.targetName}」（规范角色名：${context.canonicalName}）直接回应用户。\n这是${context.channel === "present" ? "当面交谈" : "远程传讯"}，不是剧情续写任务。\n\n角色表现：\n- 必须遵守现有角色人设、关系阶段与世界事实，但允许回避、不同意、设立边界、反问或主动追问。\n- 回复除回答内容外，至少自然体现一种私人向量：个人立场、欲望、边界、具体记忆或言外之意。\n- 不要固定套用“回答后反问”的模板；角色没有必要每次都提问。\n- 不得替用户决定言行，不得无请求地跳时间、换地点、开启任务或推进成长篇剧情。\n\n可见内容：\n- 严格按 <反应>、<正文>、<会话状态> 的顺序输出，除此之外不得输出任何文字或 Markdown 代码块。\n- <反应> 最多 32 个汉字，只写一个短动作、停顿或神态，可以为空。${context.channel === "transmission" ? "本轮为远程传讯，<反应>必须为空，不能描写用户看不见的远端动作。" : ""}\n- <正文> 只写「${context.targetName}」亲口说出或传回的话，不写说话人标签，不用引号包裹整段。\n- 普通回应通常 30 至 70 字；复杂问答或明显情绪冲突可以更长，但 <反应> 与 <正文> 合计不得超过 160 字。\n- 禁止输出 visual_cards、UpdateVariable、JSONPatch、状态栏、旁白续写或其他结构块。\n\n隐藏状态：\n<会话状态> 内输出一行严格 JSON，不得用代码围栏：\n{"emotion":"当前情绪","topic":"当前话题","subtext":"潜台词","unresolvedThreads":["未解线索"],"memoryEvents":[{"kind":"promise|boundary|conflict|disclosure","summary":"仅记录真正重要且以后应记住的事件","status":"open|resolved","resolves":[]}],"relationEvents":[]}\n- 没有重要记忆或关系事件时对应数组必须为空，不要把日常寒暄记为事件。\n- relationEvents 仅作候选记录，本阶段不会自动修改好感或关系。\n`.trim();
    const readCompleteTag = (text, tag) => text.match(new RegExp(`<${tag}(?=[\\s/>])[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "i"))?.[1]?.trim() ?? "";
    const stripDialogueTags = text => text.replace(/<\/?(?:反应|正文|会话状态)(?=[\s/>])[^>]*>/gi, "").trim();
    const readBoundedTag = (text, tag, stopTags) => {
      const open = new RegExp(`<${tag}(?=[\\s/>])[^>]*>`, "i").exec(text);
      if (!open) return "";
      const remainder = text.slice(open.index + open[0].length);
      const close = new RegExp(`<\\/${tag}\\s*>`, "i").exec(remainder);
      let end = close?.index ?? remainder.length;
      stopTags.forEach(stopTag => {
        const stop = new RegExp(`<${stopTag}(?=[\\s/>])[^>]*>`, "i").exec(remainder);
        if (stop && stop.index < end) end = stop.index;
      });
      return stripDialogueTags(remainder.slice(0, end));
    };
    const parseStateJson = text => {
      const raw = readCompleteTag(text, "会话状态").replace(/^```(?:json)?\s*|\s*```$/gi, "").trim();
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse((0, jsonrepair__WEBPACK_IMPORTED_MODULE_0__.jsonrepair)(raw));
        return isRecord(parsed) ? parsed : undefined;
      } catch (error) {
        console.warn("[灯火阑珊·短对话] 会话状态解析失败，已保留可见对白", error);
        return undefined;
      }
    };
    const normalizeSessionState = value => {
      if (!isRecord(value)) return undefined;
      const unresolvedThreads = Array.isArray(value.unresolvedThreads) ? value.unresolvedThreads.map(item => compactText(item, 120)).filter(Boolean).slice(0, 8) : [];
      const state = {
        emotion: compactText(value.emotion, 100) || undefined,
        topic: compactText(value.topic, 140) || undefined,
        subtext: compactText(value.subtext, 180) || undefined,
        unresolvedThreads: unresolvedThreads.length ? unresolvedThreads : undefined
      };
      return Object.values(state).some(Boolean) ? state : undefined;
    };
    const normalizeMemoryEvents = (value, operationId) => {
      if (!Array.isArray(value)) return [];
      const kinds = new Set([ "promise", "boundary", "conflict", "disclosure" ]);
      const statuses = new Set([ "open", "resolved" ]);
      return value.flatMap((candidate, index) => {
        if (!isRecord(candidate) || !kinds.has(candidate.kind) || !statuses.has(candidate.status)) return [];
        const summary = compactText(candidate.summary, 180);
        if (!summary) return [];
        const resolves = Array.isArray(candidate.resolves) ? candidate.resolves.map(item => compactText(item, 120)).filter(Boolean).slice(0, 8) : [];
        return [ {
          id: `${operationId}:memory:${index}`,
          kind: candidate.kind,
          summary,
          status: candidate.status,
          ...resolves.length ? {
            resolves
          } : {}
        } ];
      }).slice(0, 4);
    };
    const normalizeRelationEvents = (value, operationId) => {
      if (!Array.isArray(value)) return [];
      const kinds = new Set([ "positive", "negative", "promise", "boundary", "attitude" ]);
      return value.flatMap((candidate, index) => {
        if (!isRecord(candidate) || !kinds.has(candidate.kind)) return [];
        const summary = compactText(candidate.summary, 180);
        if (!summary) return [];
        const rawDelta = Number(candidate.favorDelta);
        const favorDelta = rawDelta === -1 || rawDelta === 0 || rawDelta === 1 ? rawDelta : undefined;
        return [ {
          id: `${operationId}:relation:${index}`,
          kind: candidate.kind,
          summary,
          ...favorDelta !== undefined ? {
            favorDelta
          } : {},
          applied: false
        } ];
      }).slice(0, 2);
    };
    const parseDialogueGeneration = (raw, context, operationId) => {
      const visible = (0, _message_content__WEBPACK_IMPORTED_MODULE_1__.extractDialogueContent)(raw);
      const boundedReaction = readBoundedTag(raw, "反应", [ "正文", "会话状态" ]);
      const boundedDialogue = readBoundedTag(raw, "正文", [ "会话状态" ]);
      const reaction = context.channel === "transmission" ? "" : truncateAtSentence(compactText(stripDialogueTags(boundedReaction || visible.reaction), MAX_REACTION_CHARACTERS), MAX_REACTION_CHARACTERS);
      const dialogueLimit = Math.max(48, MAX_VISIBLE_CHARACTERS - reaction.length);
      const dialogue = truncateAtSentence(compactText(stripDialogueTags(boundedDialogue || visible.dialogue), dialogueLimit), dialogueLimit);
      const state = parseStateJson(raw);
      return {
        raw,
        reaction,
        dialogue,
        sessionState: normalizeSessionState(state),
        memoryEvents: normalizeMemoryEvents(state?.memoryEvents, operationId),
        relationEvents: normalizeRelationEvents(state?.relationEvents, operationId)
      };
    };
    const generateDialogueReply = async input => {
      const engineContext = buildEngineContext(input);
      const decoratedInput = input.context.channel === "present" ? `（对${input.context.targetName}说）${input.prompt.trim()}` : `（向${input.context.targetName}传讯）${input.prompt.trim()}`;
      const result = await generateRaw({
        generation_id: input.generationId,
        user_input: decoratedInput,
        should_stream: true,
        should_silence: true,
        max_chat_history: 0,
        custom_api: {
          max_tokens: MAX_COMPLETION_TOKENS
        },
        ordered_prompts: [ "world_info_before", "persona_description", "char_description", "char_personality", "scenario", "world_info_after", ...engineContext.historyPrompts, {
          role: "system",
          content: buildDialogueContract(input.context)
        }, "user_input" ]
      });
      if (typeof result !== "string") throw new Error("短对话模型返回了工具调用，未得到可见对白。");
      const parsed = parseDialogueGeneration(result, input.context, input.operationId);
      if (!parsed.dialogue) throw new Error("角色没有返回可供显示的对白，请重试。");
      return parsed;
    };
  },
  "./src/灯火通明/message-content.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      extractBranchChoices: () => extractBranchChoices,
      extractDialogueContent: () => extractDialogueContent,
      extractInlineReasoning: () => extractInlineReasoning,
      extractNarrative: () => extractNarrative,
      extractVariableUpdateDiagnostics: () => extractVariableUpdateDiagnostics,
      formatMessageHtml: () => formatMessageHtml,
      formatNarrativeHtml: () => formatNarrativeHtml,
      hasInlineReasoningPresetDisclosure: () => hasInlineReasoningPresetDisclosure,
      isRichPresetHtml: () => isRichPresetHtml,
      mergeReasoningText: () => mergeReasoningText,
      parseMessageContent: () => parseMessageContent,
      stripAuxiliaryPresentation: () => stripAuxiliaryPresentation,
      stripStructuredBlocks: () => stripStructuredBlocks
    });
    var _narrative_typography__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./narrative-typography */ "./src/灯火通明/narrative-typography.ts");
    const PRIMARY_BODY_TAGS = [ "content", "正文", "narrative", "story", "main_text", "text_output", "response", "answer", "final" ];
    const CHOICE_BLOCK_TAGS = [ "branches", "branch_options", "choices", "choice_list", "options", "option_list", "actions", "action_options", "select_options", "分支", "选项", "行动选项" ];
    const STRUCTURAL_TAGS = [ "visual_cards", ...CHOICE_BLOCK_TAGS, "aftertalk", "afterword", "twin_aftertalk", "ooc", "metadata", "meta_info", "memory", "state", "status", "status_block", "world_state", "pseudo_layer", "UpdateVariable", "update_variables", "variable_update", "state_update", "JSONPatch", "StatusPlaceHolderImpl", "反应", "会话状态" ];
    const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const openTagPattern = tag => `<${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`;
    const closeTagPattern = tag => `<\\/${escapeRegExp(tag)}\\s*>`;
    const DIALOGUE_REACTION_TAGS = [ "反应", "reaction", "emotion", "stage_direction" ];
    const DIALOGUE_BODY_TAGS = [ "正文", "dialogue", "reply", "speech", "response" ];
    const DIALOGUE_STATE_TAGS = [ "会话状态", "dialogue_state", "conversation_state" ];
    const DIALOGUE_TAGS = [ ...DIALOGUE_REACTION_TAGS, ...DIALOGUE_BODY_TAGS, ...DIALOGUE_STATE_TAGS ];
    const REASONING_TAG_NAME_SOURCE = "think(?:ing)?|reasoning|thought|reflection|inner[_-]?monologue|internal[_-]?monologue|chain[_-]?of[_-]?thought|scratchpad|cot|think_?fox~?|思考|思维链|推理";
    const REASONING_OPEN_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>`, "gi");
    const REASONING_CLOSE_PATTERN = new RegExp(`<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>`, "gi");
    const REASONING_BLOCK_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>|$)`, "gi");
    const REASONING_CLOSED_BLOCK_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>[\\s\\S]*?<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>`, "gi");
    const BODY_TAG_NAME_SOURCE = PRIMARY_BODY_TAGS.map(escapeRegExp).join("|");
    const STRUCTURAL_TAG_NAME_SOURCE = STRUCTURAL_TAGS.map(escapeRegExp).join("|");
    const REASONING_FALLBACK_BOUNDARY = new RegExp(`<(?:${BODY_TAG_NAME_SOURCE}|${STRUCTURAL_TAG_NAME_SOURCE})(?=[\\s/>])`, "i");
    const REASONING_LABEL_SOURCE = "subtext[\\s_-]*think|think(?:ing)?|reasoning|thoughts?|analysis|reflection|inner[\\s_-]*monologue|chain[\\s_-]*of[\\s_-]*thought|思考|思维链|推理|分析";
    const REASONING_COMMENT_OPEN_PATTERN = new RegExp(`\x3c!--\\s*(?:(?:begin|start)[\\s_-]*(?:of[\\s_-]*)?(?:${REASONING_LABEL_SOURCE})|(?:${REASONING_LABEL_SOURCE})[\\s_-]*(?:begin|start)|(?:${REASONING_LABEL_SOURCE}))\\s*--\x3e`, "gi");
    const REASONING_COMMENT_CLOSE_PATTERN = new RegExp(`\x3c!--\\s*(?:(?:end|stop)[\\s_-]*(?:of[\\s_-]*)?(?:${REASONING_LABEL_SOURCE})|(?:${REASONING_LABEL_SOURCE})[\\s_-]*(?:end|stop)|\\/\\s*(?:${REASONING_LABEL_SOURCE}))\\s*--\x3e`, "gi");
    const REASONING_COMMENT_PATTERN = new RegExp(`(${REASONING_COMMENT_OPEN_PATTERN.source})([\\s\\S]*?)(${REASONING_COMMENT_CLOSE_PATTERN.source}|$)`, "gi");
    const REASONING_COMMENT_CLOSED_PATTERN = new RegExp(`${REASONING_COMMENT_OPEN_PATTERN.source}[\\s\\S]*?${REASONING_COMMENT_CLOSE_PATTERN.source}`, "gi");
    const REASONING_BRACKET_PATTERN = /^\s*((?:【|\[)\s*(?:思考|思维链|推理|分析|think(?:ing)?|reasoning|thoughts?|analysis)(?:开始|start)?\s*(?:】|\]))([\s\S]*?)((?:【|\[)\s*(?:思考|思维链|推理|分析|think(?:ing)?|reasoning|thoughts?|analysis)(?:结束|end)\s*(?:】|\])|$)/i;
    const REASONING_FENCE_PATTERN = /```(?:think(?:ing)?|reasoning|thoughts?|analysis|reflection|思考|推理)\s*\r?\n([\s\S]*?)(```|$)/gi;
    const REASONING_FENCE_CLOSED_PATTERN = /```(?:think(?:ing)?|reasoning|thoughts?|analysis|reflection|思考|推理)\s*\r?\n[\s\S]*?```/gi;
    const REASONING_ANALYSIS_PREFIX_PATTERN = /^\s*(<analysis(?=[\s>])[^>]*>)([\s\S]*?)(<\/analysis\s*>|$)/i;
    const REASONING_MARKER_PATTERN = new RegExp(`${REASONING_COMMENT_OPEN_PATTERN.source}|${REASONING_COMMENT_CLOSE_PATTERN.source}`, "gi");
    const REASONING_ORPHAN_PREFIX_CUE = new RegExp(`^\\s*(?:【开始思考】|\\[OS\\]|${REASONING_COMMENT_OPEN_PATTERN.source})`, "i");
    const REASONING_BODY_AFTER_CLOSE_PATTERN = new RegExp(`^\\s*(?:#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*)?${REASONING_FALLBACK_BOUNDARY.source}`, "i");
    const stripReasoningPrefix = text => {
      let delimitedPrefixEnd = -1;
      REASONING_COMMENT_OPEN_PATTERN.lastIndex = 0;
      const commentOpening = REASONING_COMMENT_OPEN_PATTERN.exec(text);
      REASONING_COMMENT_OPEN_PATTERN.lastIndex = 0;
      if (commentOpening?.index !== undefined && !text.slice(0, commentOpening.index).trim()) {
        REASONING_COMMENT_CLOSE_PATTERN.lastIndex = commentOpening.index + commentOpening[0].length;
        const commentClosing = REASONING_COMMENT_CLOSE_PATTERN.exec(text);
        REASONING_COMMENT_CLOSE_PATTERN.lastIndex = 0;
        if (commentClosing) delimitedPrefixEnd = commentClosing.index + commentClosing[0].length;
      }
      const bracketPrefix = REASONING_BRACKET_PATTERN.exec(text);
      if (bracketPrefix?.[3]) delimitedPrefixEnd = Math.max(delimitedPrefixEnd, bracketPrefix[0].length);
      REASONING_FENCE_PATTERN.lastIndex = 0;
      const fencePrefix = REASONING_FENCE_PATTERN.exec(text);
      REASONING_FENCE_PATTERN.lastIndex = 0;
      if (fencePrefix?.index !== undefined && !text.slice(0, fencePrefix.index).trim() && fencePrefix[2]) {
        delimitedPrefixEnd = Math.max(delimitedPrefixEnd, fencePrefix.index + fencePrefix[0].length);
      }
      const analysisPrefix = REASONING_ANALYSIS_PREFIX_PATTERN.exec(text);
      if (analysisPrefix?.[3]) delimitedPrefixEnd = Math.max(delimitedPrefixEnd, analysisPrefix[0].length);
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      let lastClosingEnd = -1;
      let lastClosingStart = -1;
      let closingMatch;
      while ((closingMatch = REASONING_CLOSE_PATTERN.exec(text)) !== null) {
        lastClosingStart = closingMatch.index;
        lastClosingEnd = closingMatch.index + closingMatch[0].length;
      }
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      const closingPrefix = text.slice(0, Math.max(0, lastClosingStart));
      const closingSuffix = text.slice(lastClosingEnd >= 0 ? lastClosingEnd : text.length);
      const closingPrefixContainsBody = lastClosingStart >= 0 && new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, "im").test(closingPrefix);
      const closingActsAsPrefix = lastClosingEnd >= 0 && (!closingPrefixContainsBody || REASONING_ORPHAN_PREFIX_CUE.test(closingPrefix) || REASONING_BODY_AFTER_CLOSE_PATTERN.test(closingSuffix));
      const completedPrefixEnd = Math.max(delimitedPrefixEnd, closingActsAsPrefix ? lastClosingEnd : -1);
      if (completedPrefixEnd >= 0) return text.slice(completedPrefixEnd);
      REASONING_OPEN_PATTERN.lastIndex = Math.max(0, lastClosingEnd);
      const unfinishedOpening = REASONING_OPEN_PATTERN.exec(text);
      REASONING_OPEN_PATTERN.lastIndex = 0;
      let opening = unfinishedOpening?.index === undefined ? null : {
        index: unfinishedOpening.index,
        marker: unfinishedOpening[0]
      };
      if (!opening && commentOpening?.index !== undefined && !text.slice(0, commentOpening.index).trim()) {
        opening = {
          index: commentOpening.index,
          marker: commentOpening[0]
        };
      } else if (!opening && bracketPrefix?.[1] && !bracketPrefix[3]) {
        opening = {
          index: 0,
          marker: bracketPrefix[1]
        };
      } else if (!opening && fencePrefix?.index !== undefined && !fencePrefix[2]) {
        opening = {
          index: fencePrefix.index,
          marker: fencePrefix[0].slice(0, fencePrefix[0].indexOf("\n") + 1)
        };
      } else if (!opening && analysisPrefix?.[1] && !analysisPrefix[3]) {
        opening = {
          index: 0,
          marker: analysisPrefix[1]
        };
      }
      if (!opening) return text;
      const remainder = text.slice(opening.index + opening.marker.length);
      const bodyBoundary = remainder.search(REASONING_FALLBACK_BOUNDARY);
      return bodyBoundary >= 0 ? remainder.slice(bodyBoundary) : text.slice(0, opening.index);
    };
    const findEmbeddedDocumentStart = lowerText => {
      const doctypeIndex = lowerText.indexOf("<!doctype html");
      const htmlIndex = lowerText.search(/<html(?=[\s>])/);
      if (doctypeIndex < 0) return htmlIndex;
      if (htmlIndex < 0) return doctypeIndex;
      return Math.min(doctypeIndex, htmlIndex);
    };
    const stripEmbeddedHtmlDocuments = text => {
      let result = text;
      for (let pass = 0; pass < 4; pass += 1) {
        const lowerText = result.toLowerCase();
        const documentStart = findEmbeddedDocumentStart(lowerText);
        if (documentStart < 0) break;
        const fencePrefix = result.slice(Math.max(0, documentStart - 16), documentStart);
        const fenceMatch = /```(?:html)?\s*$/i.exec(fencePrefix);
        const removeStart = fenceMatch ? documentStart - (fencePrefix.length - (fenceMatch.index ?? fencePrefix.length)) : documentStart;
        const closingIndex = lowerText.indexOf("</html>", documentStart);
        if (closingIndex < 0) return result.slice(0, removeStart).trimEnd();
        let removeEnd = closingIndex + "</html>".length;
        const trailingFence = /^\s*```/.exec(result.slice(removeEnd));
        if (trailingFence) removeEnd += trailingFence[0].length;
        result = `${result.slice(0, removeStart)}${result.slice(removeEnd)}`;
      }
      return result;
    };
    const CHOICE_TAG_NAME_SOURCE = CHOICE_BLOCK_TAGS.map(escapeRegExp).join("|");
    const CHOICE_BLOCK_PATTERN = new RegExp(`<(${CHOICE_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(?:<\\/\\1\\s*>|$)`, "gi");
    const CHOICE_DETAILS_PATTERN = /<details(?=[\s>])[^>]*>\s*<summary(?=[\s>])[^>]*>[\s\S]*?(?:select|choice|option|选择|选项|分支)[\s\S]*?<\/summary\s*>([\s\S]*?)(?:<\/details\s*>|$)/gi;
    const CHOICE_SECTION_HEADING_PATTERN = /^(?:#{1,6}\s*)?(?:make\s+your\s+choice|choices?|options?|branches|选择|选项|分支|行动选项)\s*[:：]?\s*$/im;
    const BRANCH_CHOICE_LINE_PATTERN = /^\s*(?:[-*•]\s*)?[（(【[]?\s*([A-Za-z]|\d{1,2}|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*[）)】\]]?\s*(?:[.．、,，:：—-]\s*|\s+)(.+?\S)\s*$/;
    const BULLET_CHOICE_LINE_PATTERN = /^\s*[-*•]\s+(.+?\S)\s*$/;
    const STATIC_CHOICE_ELEMENT_PATTERN = /<(button|option|li|a)(?=[\s>])([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
    const cleanChoiceText = value => value.replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/[*_`]+/g, "").replace(/\s+/g, " ").trim();
    const normalizeChoiceKey = (value, fallbackIndex) => {
      const key = value.trim();
      if (/^[a-z]$/i.test(key)) return key.toUpperCase();
      if (key) return key;
      return fallbackIndex < 26 ? String.fromCharCode(65 + fallbackIndex) : String(fallbackIndex + 1);
    };
    const extractBranchChoices = text => {
      const blocks = [];
      CHOICE_BLOCK_PATTERN.lastIndex = 0;
      let match;
      while ((match = CHOICE_BLOCK_PATTERN.exec(text)) !== null) {
        blocks.push(match[2]);
        if (!new RegExp(`<\\/${escapeRegExp(match[1])}\\s*>`, "i").test(match[0])) break;
      }
      CHOICE_BLOCK_PATTERN.lastIndex = 0;
      CHOICE_DETAILS_PATTERN.lastIndex = 0;
      while ((match = CHOICE_DETAILS_PATTERN.exec(text)) !== null) blocks.push(match[1]);
      CHOICE_DETAILS_PATTERN.lastIndex = 0;
      const heading = CHOICE_SECTION_HEADING_PATTERN.exec(text);
      if (heading?.index !== undefined) {
        const remainder = text.slice(heading.index + heading[0].length);
        const nextHeading = remainder.search(/^#{1,6}\s+\S+/m);
        blocks.push(remainder.slice(0, nextHeading >= 0 ? nextHeading : undefined));
      }
      if (!blocks.length) return [];
      const choices = [];
      const seenKeys = new Set;
      const seenTexts = new Set;
      const addChoice = (rawKey, rawText) => {
        const choiceText = cleanChoiceText(rawText);
        if (!choiceText || /^(?:select|make your choice|选择|选项)$/i.test(choiceText)) return;
        const letter = normalizeChoiceKey(rawKey, choices.length);
        if (seenKeys.has(letter) || seenTexts.has(choiceText)) return;
        seenKeys.add(letter);
        seenTexts.add(choiceText);
        choices.push({
          letter,
          text: choiceText
        });
      };
      for (const block of blocks) {
        const jsonSource = block.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        if (jsonSource.startsWith("[") || jsonSource.startsWith("{")) {
          try {
            const parsed = JSON.parse(jsonSource);
            const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? Object.entries(parsed).map(([key, value]) => typeof value === "object" && value !== null ? {
              key,
              ...value
            } : {
              key,
              text: value
            }) : [];
            items.forEach((item, index) => {
              if (typeof item === "string") {
                addChoice("", item);
                return;
              }
              if (!item || typeof item !== "object") return;
              const record = item;
              const label = String(record.label ?? "").trim();
              const labelIsKey = /^[A-Za-z]$|^\d{1,2}$|^[①②③④⑤⑥⑦⑧⑨⑩]$/.test(label);
              addChoice(String(record.letter ?? record.key ?? record.id ?? (labelIsKey ? label : index + 1)), String(record.text ?? record.content ?? record.prompt ?? record.value ?? record.title ?? (labelIsKey ? "" : label)));
            });
          } catch {}
        }
        STATIC_CHOICE_ELEMENT_PATTERN.lastIndex = 0;
        while ((match = STATIC_CHOICE_ELEMENT_PATTERN.exec(block)) !== null) {
          const key = /(?:data-(?:choice|option|key|id)|value)\s*=\s*["']?([^"'\s>]+)/i.exec(match[2])?.[1] ?? "";
          const elementText = cleanChoiceText(match[3]);
          const labelledElement = BRANCH_CHOICE_LINE_PATTERN.exec(elementText);
          if (labelledElement) addChoice(key || labelledElement[1], labelledElement[2]); else addChoice(key, elementText);
        }
        STATIC_CHOICE_ELEMENT_PATTERN.lastIndex = 0;
        const lines = block.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/?(?:details|summary|p|div|li|button|option|a)[^>]*>/gi, "\n").replace(/<[^>]+>/g, "").split(/\r?\n/);
        for (const line of lines) {
          const choice = BRANCH_CHOICE_LINE_PATTERN.exec(line);
          if (choice) {
            addChoice(choice[1], choice[2]);
            continue;
          }
          const bulletChoice = BULLET_CHOICE_LINE_PATTERN.exec(line);
          if (bulletChoice) addChoice("", bulletChoice[1]);
        }
      }
      return choices;
    };
    const extractOrphanClosingReasoning = text => {
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      const closingMatch = REASONING_CLOSE_PATTERN.exec(text);
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      if (!closingMatch || closingMatch.index <= 0) return null;
      const prefix = text.slice(0, closingMatch.index);
      const suffix = text.slice(closingMatch.index + closingMatch[0].length);
      const prefixAlreadyContainsBody = new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, "im").test(prefix);
      if (!REASONING_ORPHAN_PREFIX_CUE.test(prefix) && !REASONING_BODY_AFTER_CLOSE_PATTERN.test(suffix) && prefixAlreadyContainsBody) {
        return null;
      }
      const cleaned = stripEmbeddedHtmlDocuments(prefix).replace(REASONING_ORPHAN_PREFIX_CUE, "").replace(REASONING_MARKER_PATTERN, "").replace(REASONING_OPEN_PATTERN, "").replace(REASONING_CLOSE_PATTERN, "").trim();
      return cleaned ? {
        text: cleaned,
        source: `${prefix}${closingMatch[0]}`.trim(),
        isComplete: true
      } : null;
    };
    const mergeReasoningText = (primary, secondary) => {
      const first = primary.trim();
      const second = secondary.trim();
      if (!first) return second;
      if (!second || first.includes(second)) return first;
      if (second.includes(first)) return second;
      return `${first}\n\n${second}`;
    };
    const extractInlineReasoning = text => {
      const fragments = [];
      const addFragment = fragment => {
        if (!fragment.text) return;
        if (fragments.some(current => current.start <= fragment.start && current.end >= fragment.end)) return;
        for (let index = fragments.length - 1; index >= 0; index -= 1) {
          const current = fragments[index];
          if (fragment.start <= current.start && fragment.end >= current.end) fragments.splice(index, 1);
        }
        fragments.push(fragment);
      };
      const cleanReasoningText = value => stripEmbeddedHtmlDocuments(value).replace(REASONING_MARKER_PATTERN, "").replace(REASONING_OPEN_PATTERN, "").replace(REASONING_CLOSE_PATTERN, "").trim();
      REASONING_BLOCK_PATTERN.lastIndex = 0;
      let match;
      while ((match = REASONING_BLOCK_PATTERN.exec(text)) !== null) {
        const closingTag = match[2];
        let content = match[1];
        if (!closingTag) {
          const boundary = content.search(REASONING_FALLBACK_BOUNDARY);
          if (boundary >= 0) content = content.slice(0, boundary);
        }
        addFragment({
          text: cleanReasoningText(content),
          source: match[0].trim(),
          isComplete: Boolean(closingTag),
          start: match.index,
          end: match.index + match[0].length
        });
        if (!closingTag) break;
      }
      REASONING_BLOCK_PATTERN.lastIndex = 0;
      REASONING_COMMENT_PATTERN.lastIndex = 0;
      while ((match = REASONING_COMMENT_PATTERN.exec(text)) !== null) {
        const closingMarker = match[3];
        let content = match[2];
        if (!closingMarker) {
          const boundary = content.search(REASONING_FALLBACK_BOUNDARY);
          if (boundary >= 0) content = content.slice(0, boundary);
        }
        let end = match.index + match[0].length;
        const trailingReasoningClose = /^\s*<\/(?:think(?:ing)?|reasoning|thought)\s*>/i.exec(text.slice(end));
        if (trailingReasoningClose) end += trailingReasoningClose[0].length;
        addFragment({
          text: cleanReasoningText(content),
          source: text.slice(match.index, end).trim(),
          isComplete: Boolean(closingMarker),
          start: match.index,
          end
        });
        if (!closingMarker) break;
      }
      REASONING_COMMENT_PATTERN.lastIndex = 0;
      const bracketMatch = REASONING_BRACKET_PATTERN.exec(text);
      if (bracketMatch) {
        const boundary = bracketMatch[3] ? -1 : bracketMatch[2].search(REASONING_FALLBACK_BOUNDARY);
        const content = boundary >= 0 ? bracketMatch[2].slice(0, boundary) : bracketMatch[2];
        addFragment({
          text: cleanReasoningText(content),
          source: bracketMatch[0].trim(),
          isComplete: Boolean(bracketMatch[3]),
          start: bracketMatch.index,
          end: bracketMatch.index + bracketMatch[0].length
        });
      }
      REASONING_FENCE_PATTERN.lastIndex = 0;
      while ((match = REASONING_FENCE_PATTERN.exec(text)) !== null) {
        let content = match[1];
        if (!match[2]) {
          const boundary = content.search(REASONING_FALLBACK_BOUNDARY);
          if (boundary >= 0) content = content.slice(0, boundary);
        }
        addFragment({
          text: cleanReasoningText(content),
          source: match[0].trim(),
          isComplete: Boolean(match[2]),
          start: match.index,
          end: match.index + match[0].length
        });
        if (!match[2]) break;
      }
      REASONING_FENCE_PATTERN.lastIndex = 0;
      const analysisMatch = REASONING_ANALYSIS_PREFIX_PATTERN.exec(text);
      if (analysisMatch) {
        const boundary = analysisMatch[3] ? -1 : analysisMatch[2].search(REASONING_FALLBACK_BOUNDARY);
        const content = boundary >= 0 ? analysisMatch[2].slice(0, boundary) : analysisMatch[2];
        addFragment({
          text: cleanReasoningText(content),
          source: analysisMatch[0].trim(),
          isComplete: Boolean(analysisMatch[3]),
          start: analysisMatch.index,
          end: analysisMatch.index + analysisMatch[0].length
        });
      }
      if (!fragments.length) return extractOrphanClosingReasoning(text);
      fragments.sort((left, right) => left.start - right.start);
      return {
        text: fragments.map(fragment => fragment.text).join("\n\n").trim(),
        source: fragments.map(fragment => fragment.source).join("\n\n").trim(),
        isComplete: fragments.every(fragment => fragment.isComplete)
      };
    };
    const stripAuxiliaryPresentation = text => stripEmbeddedHtmlDocuments(stripReasoningPrefix(text).replace(REASONING_CLOSED_BLOCK_PATTERN, "").replace(REASONING_COMMENT_CLOSED_PATTERN, "").replace(REASONING_FENCE_CLOSED_PATTERN, "").replace(REASONING_CLOSE_PATTERN, "")).trim();
    const stripDialogueTagFragments = text => DIALOGUE_TAGS.reduce((value, tag) => value.replace(new RegExp(`<\\/?${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`, "gi"), ""), text).replace(/<[^>]*$/g, "").trim();
    const readBoundedTaggedContent = (text, tag, stopTags, preferLast = false) => {
      const matches = [ ...text.matchAll(new RegExp(openTagPattern(tag), "gi")) ];
      const match = preferLast ? matches.at(-1) : matches[0];
      if (!match || match.index === undefined) return "";
      const start = match.index + match[0].length;
      const remainder = text.slice(start);
      const boundaries = [ remainder.search(new RegExp(closeTagPattern(tag), "i")), ...stopTags.map(stopTag => remainder.search(new RegExp(openTagPattern(stopTag), "i"))) ].filter(index => index >= 0);
      const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
      return stripDialogueTagFragments(remainder.slice(0, end));
    };
    const readFirstTaggedContent = (text, tags, stopTags, preferLast = false) => {
      for (const tag of tags) {
        if (!new RegExp(openTagPattern(tag), "i").test(text)) continue;
        return {
          found: true,
          tag,
          content: readBoundedTaggedContent(text, tag, stopTags, preferLast)
        };
      }
      return {
        found: false,
        tag: "",
        content: ""
      };
    };
    const readNarrativeHeadingContent = text => {
      const heading = /^(?:#{1,6}\s*(?:正文|content|narrative|story|response|answer|final)|【(?:正文|内容|叙事|回复)】|\[(?:content|narrative|story|response|answer|final)\])\s*[:：]?\s*$/im.exec(text);
      if (!heading || heading.index === undefined) return "";
      const remainder = text.slice(heading.index + heading[0].length);
      const nextSection = remainder.search(/^(?:#{1,6}\s*)?(?:make\s+your\s+choice|choices?|options?|branches|选择|选项|分支|行动选项|aftertalk|afterword|状态|变量更新)\s*[:：]?\s*$/im);
      const structuralBoundary = remainder.search(new RegExp(`<(?:${STRUCTURAL_TAG_NAME_SOURCE})(?=[\\s/>])`, "i"));
      const boundaries = [ nextSection, structuralBoundary ].filter(index => index >= 0);
      return remainder.slice(0, boundaries.length ? Math.min(...boundaries) : undefined).trim();
    };
    const unwrapDialogueQuotes = text => {
      const pairs = [ [ "“", "”" ], [ "「", "」" ], [ "『", "』" ], [ '"', '"' ], [ "'", "'" ] ];
      let value = text.trim();
      for (let pass = 0; pass < 3; pass += 1) {
        const pair = pairs.find(([open, close]) => value.startsWith(open) && value.endsWith(close));
        if (!pair || value.length <= pair[0].length + pair[1].length) break;
        value = value.slice(pair[0].length, -pair[1].length).trim();
      }
      return value;
    };
    const readLooseTaggedContent = (text, tag, stopTags = []) => {
      const openMatch = new RegExp(openTagPattern(tag), "i").exec(text);
      if (!openMatch || openMatch.index === undefined) {
        return {
          content: "",
          isClosed: false
        };
      }
      const start = openMatch.index + openMatch[0].length;
      const remainder = text.slice(start);
      const closeIndex = remainder.search(new RegExp(closeTagPattern(tag), "i"));
      const stopIndexes = stopTags.map(stopTag => remainder.search(new RegExp(openTagPattern(stopTag), "i"))).filter(index => index >= 0);
      const boundaries = [ closeIndex, ...stopIndexes ].filter(index => index >= 0);
      const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
      return {
        content: remainder.slice(0, end).trim(),
        isClosed: closeIndex >= 0 && closeIndex === end
      };
    };
    const isRecord = value => typeof value === "object" && value !== null && !Array.isArray(value);
    const extractVariableUpdateDiagnostics = text => {
      const updateOpen = /<(update(?:[_-]?variables?)?|variable[_-]?update|state[_-]?update)(?=[\s/>])[^>]*>/i.exec(text);
      if (!updateOpen || updateOpen.index === undefined) return null;
      const updateStart = updateOpen.index + updateOpen[0].length;
      const updateRemainder = text.slice(updateStart);
      const updateCloseIndex = updateRemainder.search(new RegExp(`<\\/${escapeRegExp(updateOpen[1])}\\s*>`, "i"));
      const updateBody = updateRemainder.slice(0, updateCloseIndex >= 0 ? updateCloseIndex : undefined);
      const analysisTag = /<(Analysis|reasoning|summary)(?=[\s/>])/i.exec(updateBody)?.[1] ?? "";
      const patchTag = /<(JSONPatch|json_patch|patch)(?=[\s/>])/i.exec(updateBody)?.[1] ?? "";
      if (!analysisTag && !patchTag) return null;
      const analysisBlock = analysisTag ? readLooseTaggedContent(updateBody, analysisTag, patchTag ? [ patchTag ] : []) : {
        content: "",
        isClosed: false
      };
      const patchBlock = patchTag ? readLooseTaggedContent(updateBody, patchTag) : {
        content: "",
        isClosed: false
      };
      const isComplete = updateCloseIndex >= 0;
      const result = {
        analysis: analysisBlock.content,
        operations: [],
        rawPatch: patchBlock.content,
        isComplete,
        parseError: ""
      };
      if (!patchBlock.content) {
        if (isComplete || updateCloseIndex >= 0) result.parseError = "未找到 JSONPatch 更新清单";
        return result;
      }
      try {
        const parsed = JSON.parse(patchBlock.content);
        if (!Array.isArray(parsed)) {
          result.parseError = "JSONPatch 应为数组";
          return result;
        }
        const invalidCount = parsed.filter(item => !isRecord(item)).length;
        result.operations = parsed.filter(isRecord).map(item => ({
          ...item,
          op: String(item.op ?? "").trim(),
          path: String(item.path ?? "").trim()
        }));
        if (invalidCount > 0) {
          result.parseError = `有 ${invalidCount} 项不是有效的补丁对象`;
        }
      } catch (error) {
        if (isComplete) {
          result.parseError = error instanceof Error ? `JSONPatch 解析失败：${error.message}` : "JSONPatch 解析失败";
        }
      }
      return result;
    };
    const stripStructuredBlocks = text => {
      let result = stripEmbeddedHtmlDocuments(text);
      STRUCTURAL_TAGS.forEach(tag => {
        const open = openTagPattern(tag);
        const close = closeTagPattern(tag);
        result = result.replace(new RegExp(`${open}[\\s\\S]*?${close}`, "gi"), "").replace(new RegExp(`${open}[\\s\\S]*$`, "gi"), "").replace(new RegExp(`<${escapeRegExp(tag)}(?=[\\s/>])[^>]*/>`, "gi"), "");
      });
      result = result.replace(CHOICE_DETAILS_PATTERN, "");
      const choiceHeading = CHOICE_SECTION_HEADING_PATTERN.exec(result);
      if (choiceHeading?.index !== undefined) result = result.slice(0, choiceHeading.index);
      return result.replace(/<(script|iframe|object)(?=[\s>])[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<embed(?=[\s/>])[^>]*\/?>/gi, "").trim();
    };
    const extractNarrative = text => {
      const source = stripAuxiliaryPresentation(text);
      const taggedBody = readFirstTaggedContent(source, PRIMARY_BODY_TAGS, STRUCTURAL_TAGS);
      const headingBody = taggedBody.found ? "" : readNarrativeHeadingContent(source);
      const body = taggedBody.found ? taggedBody.content : headingBody || source;
      return stripStructuredBlocks(body).replace(new RegExp(`<\\/?(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])[^>]*>`, "gi"), "").trim();
    };
    const extractDialogueContent = text => {
      const source = stripAuxiliaryPresentation(text);
      const reactionBlock = readFirstTaggedContent(source, DIALOGUE_REACTION_TAGS, [ ...DIALOGUE_BODY_TAGS, ...DIALOGUE_STATE_TAGS ]);
      const dialogueBlock = readFirstTaggedContent(source, DIALOGUE_BODY_TAGS, [ ...DIALOGUE_REACTION_TAGS, ...DIALOGUE_STATE_TAGS ], true);
      const reaction = reactionBlock.found ? stripStructuredBlocks(reactionBlock.content) : "";
      const dialogue = dialogueBlock.found ? dialogueBlock.content : reactionBlock.found ? "" : extractNarrative(source);
      return {
        reaction: stripDialogueTagFragments(reaction),
        dialogue: unwrapDialogueQuotes(stripDialogueTagFragments(stripStructuredBlocks(dialogue)))
      };
    };
    const parsedMessageCache = new Map;
    const PARSED_MESSAGE_CACHE_LIMIT = 24;
    const parseMessageContent = text => {
      const cached = parsedMessageCache.get(text);
      if (cached) {
        parsedMessageCache.delete(text);
        parsedMessageCache.set(text, cached);
        return cached;
      }
      const parsed = {
        reasoning: extractInlineReasoning(text),
        narrative: extractNarrative(text),
        choices: extractBranchChoices(text),
        dialogue: extractDialogueContent(text)
      };
      parsedMessageCache.set(text, parsed);
      if (parsedMessageCache.size > PARSED_MESSAGE_CACHE_LIMIT) {
        const oldest = parsedMessageCache.keys().next().value;
        if (typeof oldest === "string") parsedMessageCache.delete(oldest);
      }
      return parsed;
    };
    const formatMessageHtml = (text, messageId) => {
      const value = text.trim();
      if (!value) return "";
      try {
        return formatAsDisplayedMessage(value, {
          message_id: messageId
        });
      } catch (error) {
        console.warn("[灯火阑珊·伪同层] 消息格式化失败", error);
        return $("<div>").text(value).html().replace(/\n/g, "<br>");
      }
    };
    const STORY_DIALOGUE_CLASS = "dhl-story-dialogue";
    const STORY_DIALOGUE_SKIP_SELECTOR = [ "code", "pre", "script", "style", "textarea", "kbd", "samp", "button", "select", "option", `.${STORY_DIALOGUE_CLASS}` ].join(", ");
    const decorateNarrativeDialogueHtml = html => {
      if (!html || typeof document === "undefined") return html;
      const template = document.createElement("template");
      template.innerHTML = html;
      const quoteStack = [];
      const textNodes = [];
      const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement?.closest(STORY_DIALOGUE_SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      let currentNode = walker.nextNode();
      while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
      }
      textNodes.forEach(textNode => {
        const segments = (0, _narrative_typography__WEBPACK_IMPORTED_MODULE_0__.segmentNarrativeDialogueText)(textNode.data, quoteStack);
        if (!segments.some(segment => segment.dialogue)) return;
        const replacement = document.createDocumentFragment();
        segments.forEach(segment => {
          if (!segment.dialogue) {
            replacement.append(document.createTextNode(segment.text));
            return;
          }
          const dialogue = document.createElement("span");
          dialogue.className = STORY_DIALOGUE_CLASS;
          dialogue.textContent = segment.text;
          replacement.append(dialogue);
        });
        textNode.replaceWith(replacement);
      });
      return template.innerHTML;
    };
    const formatNarrativeHtml = (text, messageId) => decorateNarrativeDialogueHtml(formatMessageHtml(text, messageId));
    const BASIC_FORMAT_CLASS_PATTERN = /^(?:custom-html|custom-language-html|language-\S+|hljs(?:-\S+)?|markdown|md|code|prettyprint|spoiler)$/i;
    const isRichPresetHtml = html => {
      if (!html.trim()) return false;
      const template = document.createElement("template");
      template.innerHTML = html;
      if (template.content.querySelector("style, details, summary, button, svg, img, picture, canvas, audio, video, table, iframe, [style]")) {
        return true;
      }
      return [ ...template.content.querySelectorAll("[class]") ].some(element => [ ...element.classList ].some(className => !BASIC_FORMAT_CLASS_PATTERN.test(className)));
    };
    const hasInlineReasoningPresetDisclosure = (rawMessage, messageId) => {
      const inline = extractInlineReasoning(rawMessage);
      if (!inline?.source || !inline.isComplete) return false;
      const template = document.createElement("template");
      template.innerHTML = formatMessageHtml(inline.source, messageId);
      return Boolean(template.content.querySelector("details > summary"));
    };
  },
  "./src/灯火通明/narrative-typography.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      segmentNarrativeDialogueText: () => segmentNarrativeDialogueText
    });
    const DIALOGUE_QUOTE_PAIRS = [ [ "“", "”" ], [ "「", "」" ], [ "『", "』" ] ];
    const OPEN_TO_CLOSE = new Map(DIALOGUE_QUOTE_PAIRS);
    const segmentNarrativeDialogueText = (text, quoteStack) => {
      const segments = [];
      const append = (character, dialogue) => {
        const previous = segments.at(-1);
        if (previous?.dialogue === dialogue) {
          previous.text += character;
          return;
        }
        segments.push({
          text: character,
          dialogue
        });
      };
      for (const character of text) {
        const closingQuote = OPEN_TO_CLOSE.get(character);
        if (closingQuote) {
          quoteStack.push(closingQuote);
          append(character, true);
          continue;
        }
        if (quoteStack.at(-1) === character) {
          append(character, true);
          quoteStack.pop();
          continue;
        }
        append(character, quoteStack.length > 0);
      }
      return segments;
    };
  },
  "./src/灯火通明/pseudo-layer-protocol.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      PSEUDO_LAYER_CHANNEL: () => PSEUDO_LAYER_CHANNEL,
      PSEUDO_LAYER_MESSAGE_EDITING_VERSION: () => PSEUDO_LAYER_MESSAGE_EDITING_VERSION,
      PSEUDO_LAYER_MIN_COMPATIBLE_VERSION: () => PSEUDO_LAYER_MIN_COMPATIBLE_VERSION,
      PSEUDO_LAYER_SUPPORTED_VERSIONS: () => PSEUDO_LAYER_SUPPORTED_VERSIONS,
      PSEUDO_LAYER_TIMELINE_PAGING_VERSION: () => PSEUDO_LAYER_TIMELINE_PAGING_VERSION,
      PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION: () => PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION,
      PSEUDO_LAYER_VERSION: () => PSEUDO_LAYER_VERSION,
      isPseudoLayerRequest: () => isPseudoLayerRequest,
      isPseudoLayerResponse: () => isPseudoLayerResponse,
      isSupportedPseudoLayerVersion: () => isSupportedPseudoLayerVersion
    });
    const PSEUDO_LAYER_CHANNEL = "denghuolanshan:pseudo-layer";
    const PSEUDO_LAYER_VERSION = 10;
    const PSEUDO_LAYER_MIN_COMPATIBLE_VERSION = 4;
    const PSEUDO_LAYER_SUPPORTED_VERSIONS = Array.from({
      length: PSEUDO_LAYER_VERSION - PSEUDO_LAYER_MIN_COMPATIBLE_VERSION + 1
    }, (_, index) => PSEUDO_LAYER_VERSION - index);
    const PSEUDO_LAYER_MESSAGE_EDITING_VERSION = 8;
    const PSEUDO_LAYER_TIMELINE_PAGING_VERSION = 9;
    const PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION = 10;
    const isSupportedPseudoLayerVersion = value => typeof value === "number" && Number.isInteger(value) && value >= PSEUDO_LAYER_MIN_COMPATIBLE_VERSION && value <= PSEUDO_LAYER_VERSION;
    const hasEnvelope = value => {
      if (!value || typeof value !== "object") return false;
      const message = value;
      return message.channel === PSEUDO_LAYER_CHANNEL && isSupportedPseudoLayerVersion(message.version);
    };
    const REQUEST_TYPES = new Set([ "hello", "goodbye", "generate", "stop", "reroll", "delete_message", "update_message", "update_user_message", "navigate", "timeline_page", "select_entry", "select_history", "return_latest", "set_interaction", "end_interaction", "toggle_native_input" ]);
    const RESPONSE_TYPES = new Set([ "ready", "view", "state", "stream", "reasoning", "complete", "deleted", "message_updated", "timeline_page", "error" ]);
    const isPseudoLayerRequest = value => hasEnvelope(value) && REQUEST_TYPES.has(String(value.type));
    const isPseudoLayerResponse = value => hasEnvelope(value) && RESPONSE_TYPES.has(String(value.type));
  },
  jsonrepair(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_jsonrepair_esm_703c329d__;
  }
};

const __webpack_module_cache__ = {};

function __webpack_require__(moduleId) {
  const cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  const module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  if (!(moduleId in __webpack_modules__)) {
    delete __webpack_module_cache__[moduleId];
    const e = new Error("Cannot find module '" + moduleId + "'");
    e.code = "MODULE_NOT_FOUND";
    throw e;
  }
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

(() => {
  __webpack_require__.d = (exports, definition) => {
    if (Array.isArray(definition)) {
      var i = 0;
      while (i < definition.length) {
        var key = definition[i++];
        var binding = definition[i++];
        if (!__webpack_require__.o(exports, key)) {
          if (binding === 0) {
            Object.defineProperty(exports, key, {
              enumerable: true,
              value: definition[i++]
            });
          } else {
            Object.defineProperty(exports, key, {
              enumerable: true,
              get: binding
            });
          }
        } else if (binding === 0) {
          i++;
        }
      }
    } else {
      for (var key in definition) {
        if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
          Object.defineProperty(exports, key, {
            enumerable: true,
            get: definition[key]
          });
        }
      }
    }
  };
})();

(() => {
  __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
})();

(() => {
  __webpack_require__.r = exports => {
    if (Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: "Module"
      });
    }
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
  };
})();

let __webpack_exports__ = {};

(() => {
  /*!**********************************!*\
  !*** ./src/灯火通明-伪同层控制器/index.ts ***!
  \**********************************/
  __webpack_require__.r(__webpack_exports__);
  var _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../灯火通明/pseudo-layer-protocol */ "./src/灯火通明/pseudo-layer-protocol.ts");
  var _message_content__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火通明/message-content */ "./src/灯火通明/message-content.ts");
  var _dialogue_engine__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./dialogue-engine */ "./src/灯火通明-伪同层控制器/dialogue-engine.ts");
  const STYLE_ID = "dhl-pseudo-layer-controller-style";
  const INPUT_STORAGE_KEY = "denghuolanshan:pseudo-layer:native-input-collapsed";
  const PENDING_NATIVE_REROLL_STORAGE_KEY = "denghuolanshan:pseudo-layer:pending-native-rerolls-v1";
  const MOBILE_INPUT_DEFAULT_APPLIED_KEY = "denghuolanshan:pseudo-layer:mobile-native-input-default-v1";
  const MOBILE_VIEWPORT_QUERY = "(max-width: 760px)";
  const INTERACTION_KEY = "dhl_pseudo_interaction";
  const STAGE_CLASS = "dhl-pseudo-stage";
  const SELECTED_CLASS = "dhl-pseudo-selected";
  const PARKED_FRAME_CLASS = "dhl-pseudo-frame-parked";
  const FRAME_KEEPER_CLASS = "dhl-pseudo-frame-keeper";
  const ACTIVE_KEEPER_CLASS = "dhl-pseudo-frame-active";
  const STAGE_ROOT_ID = "dhl-pseudo-stage-root";
  const ROOT_ACTIVE_CLASS = "dhl-pseudo-stage-root-active";
  const STREAM_DISPATCH_INTERVAL_MS = window.matchMedia?.("(pointer: coarse)").matches ? 240 : 160;
  const FRAME_CANDIDATE_BATCH_MS = 32;
  const STORY_INTERACTION = {
    mode: "story"
  };
  const tavernWindow = window.parent;
  const tavernDocument = tavernWindow.document;
  const controllerHost = tavernWindow;
  const controllerFrame = window.frameElement;
  const controllerInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const registrations = new Map;
  const controllerEventStops = [];
  const duplicatePruneTimers = [];
  let sourceProtocolVersions = new WeakMap;
  let sourceFrameCache = new WeakMap;
  const frameMessageIdCache = new WeakMap;
  const pendingFrameCandidates = new Set;
  let activeGeneration = null;
  let activeInteraction = STORY_INTERACTION;
  let selectedMessageId = null;
  const selectedHistoryMessageIds = {
    story: null,
    dialogue: null
  };
  let selectedHistoryKind = null;
  let browsingHistory = false;
  let deletingMessageId = null;
  let updatingMessageId = null;
  const nativeInputMedia = tavernWindow.matchMedia(MOBILE_VIEWPORT_QUERY);
  const shouldApplyMobileInputDefault = nativeInputMedia.matches && localStorage.getItem(MOBILE_INPUT_DEFAULT_APPLIED_KEY) === null;
  let nativeInputFollowsViewport = shouldApplyMobileInputDefault || localStorage.getItem(INPUT_STORAGE_KEY) === null;
  let nativeInputCollapsed = shouldApplyMobileInputDefault ? true : nativeInputFollowsViewport ? nativeInputMedia.matches : localStorage.getItem(INPUT_STORAGE_KEY) === "true";
  if (shouldApplyMobileInputDefault) {
    localStorage.setItem(MOBILE_INPUT_DEFAULT_APPLIED_KEY, "true");
    localStorage.setItem(INPUT_STORAGE_KEY, "true");
  }
  let viewRevision = 0;
  let frameObserver = null;
  let duplicateControllerObserver = null;
  let frameCandidateTimer = null;
  let viewRefreshTimer = null;
  let viewRefreshDeadline = 0;
  let mobileStageAlignFrame = null;
  let stageSnapshotCache = null;
  let stageSnapshotLastMessageId = Number.NaN;
  let streamDispatchTimer = null;
  let pendingStreamDispatch = null;
  let controllerDisposed = false;
  const rememberSourceProtocolVersion = (source, version) => {
    const previous = sourceProtocolVersions.get(source) ?? 0;
    if (version > previous) sourceProtocolVersions.set(source, version);
  };
  const send = (source, message) => {
    source?.postMessage({
      channel: _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_CHANNEL,
      version: (source && sourceProtocolVersions.get(source)) ?? _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION,
      ...message
    }, "*");
  };
  const flushQueuedStream = generation => {
    if (streamDispatchTimer !== null) {
      window.clearTimeout(streamDispatchTimer);
      streamDispatchTimer = null;
    }
    const pending = pendingStreamDispatch;
    pendingStreamDispatch = null;
    if (!pending || generation && pending.requestId !== generation.requestId) return;
    if (!generation && activeGeneration?.requestId !== pending.requestId) return;
    send(pending.source, {
      type: "stream",
      requestId: pending.requestId,
      text: pending.text,
      ...pending.reaction ? {
        reaction: pending.reaction
      } : {}
    });
    if (pending.reasoning) {
      send(pending.source, {
        type: "reasoning",
        requestId: pending.requestId,
        ...pending.reasoning
      });
    }
  };
  const queueStream = (generation, text, reaction = "", reasoning) => {
    const queuedReasoning = reasoning ?? (pendingStreamDispatch?.requestId === generation.requestId ? pendingStreamDispatch.reasoning : undefined);
    pendingStreamDispatch = {
      requestId: generation.requestId,
      source: generation.source,
      text,
      ...reaction ? {
        reaction
      } : {},
      ...queuedReasoning ? {
        reasoning: queuedReasoning
      } : {}
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
  const sendGenerationState = (generation, state, source = generation.source) => {
    generation.state = state;
    send(source, {
      type: "state",
      requestId: generation.requestId,
      state,
      operation: generation.operation,
      ...generation.rawUserText ? {
        userText: generation.rawUserText
      } : {}
    });
  };
  const replayGeneration = (generation, source) => {
    sendGenerationState(generation, generation.state, source);
    if (generation.streamText) {
      send(source, {
        type: "stream",
        requestId: generation.requestId,
        text: generation.streamText,
        ...generation.streamReaction ? {
          reaction: generation.streamReaction
        } : {}
      });
    }
    if (generation.reasoning) {
      send(source, {
        type: "reasoning",
        requestId: generation.requestId,
        ...generation.reasoning
      });
    }
  };
  const asReplyTarget = source => {
    if (!source || typeof source.postMessage !== "function") return null;
    return source;
  };
  const normalizeDialogueContext = value => {
    if (!value || typeof value !== "object") return null;
    const candidate = value;
    if (candidate.mode !== "dialogue" || candidate.channel !== "present" && candidate.channel !== "transmission") {
      return null;
    }
    const sessionId = String(candidate.sessionId ?? "").trim();
    const targetName = String(candidate.targetName ?? "").trim();
    const canonicalName = String(candidate.canonicalName ?? "").trim();
    if (!sessionId || !targetName || !canonicalName) return null;
    return {
      mode: "dialogue",
      sessionId,
      targetName,
      canonicalName,
      channel: candidate.channel
    };
  };
  const isSameInteraction = (left, right) => left.mode === right.mode && (left.mode === "story" || right.mode === "dialogue" && left.sessionId === right.sessionId && left.targetName === right.targetName && left.canonicalName === right.canonicalName && left.channel === right.channel);
  const setActiveInteraction = interaction => {
    const next = interaction.mode === "dialogue" ? normalizeDialogueContext(interaction) ?? STORY_INTERACTION : STORY_INTERACTION;
    if (isSameInteraction(activeInteraction, next)) return;
    activeInteraction = next;
  };
  const getMessageElement = messageId => tavernDocument.querySelector(`#chat > .mes[mesid='${messageId}']`);
  const getStageRoot = (create = true) => {
    let root = tavernDocument.getElementById(STAGE_ROOT_ID);
    if (!root && create) {
      const chat = tavernDocument.querySelector("#chat");
      if (!chat) return null;
      root = tavernDocument.createElement("div");
      root.id = STAGE_ROOT_ID;
      chat.append(root);
    }
    return root;
  };
  const getFrameKeeper = (messageId, create = true) => {
    const root = getStageRoot(create);
    if (!root) return null;
    let keeper = root.querySelector(`:scope > .${FRAME_KEEPER_CLASS}[data-message-id='${messageId}']`);
    if (!keeper && create) {
      keeper = tavernDocument.createElement("div");
      keeper.className = FRAME_KEEPER_CLASS;
      keeper.dataset.messageId = String(messageId);
      root.append(keeper);
    }
    return keeper ?? null;
  };
  const getFrameMessageId = frame => {
    const rawMessageId = frame.dataset.dhlMessageId ?? frame.closest(".mes")?.getAttribute("mesid");
    if (rawMessageId === undefined || rawMessageId === null || rawMessageId.trim() === "") {
      return frameMessageIdCache.get(frame);
    }
    const messageId = Number(rawMessageId);
    if (Number.isFinite(messageId)) {
      frameMessageIdCache.set(frame, messageId);
      return messageId;
    }
    return frameMessageIdCache.get(frame);
  };
  const rememberFrame = frame => {
    const source = asReplyTarget(frame.contentWindow);
    if (source) sourceFrameCache.set(source, frame);
    getFrameMessageId(frame);
  };
  const getFrameForSource = source => {
    const cached = sourceFrameCache.get(source);
    if (cached?.isConnected && cached.contentWindow === source) return cached;
    sourceFrameCache.delete(source);
    const frame = [ ...tavernDocument.querySelectorAll(`#chat > .mes .TH-render iframe, #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe`) ].find(candidate => candidate.contentWindow === source);
    if (frame) rememberFrame(frame);
    return frame;
  };
  const hasMountedPseudoApp = frame => {
    try {
      return Boolean(frame?.contentDocument?.querySelector("#app")?.childElementCount);
    } catch {
      return false;
    }
  };
  const parkFrame = (messageId, frame) => {
    const message = getMessageElement(messageId);
    if (!message || message.getAttribute("is_user") === "true") return false;
    const keeper = getFrameKeeper(messageId);
    if (!keeper) return false;
    const keptFrame = keeper.querySelector(":scope > iframe");
    if (keptFrame === frame) return true;
    if (keptFrame) {
      const keptSource = asReplyTarget(keptFrame.contentWindow);
      const keptIsLive = hasMountedPseudoApp(keptFrame) || keptSource !== null && registrations.get(messageId) === keptSource;
      if (keptIsLive) return false;
      keptFrame.remove();
    }
    if (frame.dataset.dhlControllerOwned === "true") {
      frame.dataset.dhlMessageId = String(messageId);
      keeper.append(frame);
      rememberFrame(frame);
      return true;
    }
    const ownedFrame = frame.cloneNode(false);
    ownedFrame.removeAttribute("id");
    ownedFrame.removeAttribute("loading");
    ownedFrame.dataset.dhlControllerOwned = "true";
    ownedFrame.dataset.dhlMessageId = String(messageId);
    keeper.append(ownedFrame);
    rememberFrame(ownedFrame);
    message.classList.add(PARKED_FRAME_CLASS);
    return true;
  };
  const parkSourceFrame = (messageId, source) => {
    const frame = getFrameForSource(source);
    return frame ? parkFrame(messageId, frame) : false;
  };
  const getParkedMessageId = () => {
    const keepers = [ ...getStageRoot(false)?.querySelectorAll(`:scope > .${FRAME_KEEPER_CLASS}`) ?? [] ];
    const isMounted = keeper => hasMountedPseudoApp(keeper.querySelector(":scope > iframe"));
    const active = keepers.find(keeper => keeper.classList.contains(ACTIVE_KEEPER_CLASS) && isMounted(keeper));
    const keeper = active ?? keepers.filter(isMounted).at(-1);
    const messageId = Number(keeper?.dataset.messageId);
    return Number.isFinite(messageId) ? messageId : undefined;
  };
  const syncParkedStage = hostMessageId => {
    const root = getStageRoot(false);
    let hasActiveFrame = false;
    root?.querySelectorAll(`:scope > .${FRAME_KEEPER_CLASS}`).forEach(keeper => {
      const active = Number(keeper.dataset.messageId) === hostMessageId && hasMountedPseudoApp(keeper.querySelector(":scope > iframe"));
      keeper.classList.toggle(ACTIVE_KEEPER_CLASS, active);
      if (active) hasActiveFrame = true;
    });
    tavernDocument.body.classList.toggle(ROOT_ACTIVE_CLASS, hasActiveFrame);
  };
  const releaseParkedFrames = () => {
    const root = getStageRoot(false);
    root?.querySelectorAll(`:scope > .${FRAME_KEEPER_CLASS}`).forEach(keeper => {
      const messageId = Number(keeper.dataset.messageId);
      if (Number.isFinite(messageId)) getMessageElement(messageId)?.classList.remove(PARKED_FRAME_CLASS);
    });
    root?.remove();
    tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
  };
  const getAllMessages = () => {
    const lastMessageId = getLastMessageId();
    if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return [];
    return getChatMessages(`0-${lastMessageId}`);
  };
  const getAdjacentMessages = messageId => {
    if (!Number.isFinite(messageId) || messageId < 0) return [];
    const normalizedMessageId = Math.trunc(messageId);
    return getChatMessages(`${Math.max(0, normalizedMessageId - 1)}-${normalizedMessageId}`);
  };
  const invalidateStageSnapshot = () => {
    stageSnapshotCache = null;
    stageSnapshotLastMessageId = Number.NaN;
  };
  const readInteractionMetadata = message => {
    if (!message) return null;
    const direct = message.extra?.[INTERACTION_KEY];
    const nested = message.extra?.extra?.[INTERACTION_KEY];
    const value = direct ?? nested;
    if (!value || value.version !== 1 && value.version !== 2 || value.kind !== "dialogue") return null;
    const context = normalizeDialogueContext({
      mode: "dialogue",
      ...value
    });
    if (!context) return null;
    const userMessageId = Number(value.userMessageId);
    return {
      ...value,
      version: value.version,
      kind: "dialogue",
      ...context,
      ...typeof value.rawUserText === "string" ? {
        rawUserText: value.rawUserText
      } : {},
      ...Number.isFinite(userMessageId) ? {
        userMessageId
      } : {}
    };
  };
  const toDialogueContext = metadata => ({
    mode: "dialogue",
    sessionId: metadata.sessionId,
    targetName: metadata.targetName,
    canonicalName: metadata.canonicalName,
    channel: metadata.channel
  });
  const findPreviousUserMessage = (messages, messageId) => [ ...messages ].reverse().find(message => message.role === "user" && message.message_id < messageId);
  const findPreviousMessage = (messages, messageId) => [ ...messages ].reverse().find(message => message.message_id < messageId);
  const resolveAssistantInteractionMetadata = (message, messages) => {
    const direct = readInteractionMetadata(message);
    if (direct || !message || message.role !== "assistant") return direct;
    const userMessage = findPreviousMessage(messages, message.message_id);
    if (userMessage?.role !== "user") return null;
    const userMetadata = readInteractionMetadata(userMessage);
    if (!userMetadata) return null;
    return {
      ...userMetadata,
      userMessageId: userMessage.message_id
    };
  };
  const getAssistantMessagesFromDom = () => [ ...tavernDocument.querySelectorAll("#chat > .mes") ].filter(element => element.getAttribute("is_user") === "false" && element.getAttribute("is_system") === "false").map(element => ({
    message_id: Number(element.getAttribute("mesid")),
    name: "",
    role: "assistant",
    is_hidden: false,
    message: "",
    data: {},
    extra: {}
  })).filter(message => Number.isFinite(message.message_id));
  const buildStageEntries = (assistantMessages, previousMessages) => {
    const entries = [];
    assistantMessages.forEach(message => {
      const directMetadata = readInteractionMetadata(message);
      const previousMessage = previousMessages.get(message.message_id);
      const inheritedMetadata = !directMetadata && previousMessage?.role === "user" ? readInteractionMetadata(previousMessage) : null;
      const metadata = directMetadata ?? (inheritedMetadata ? {
        ...inheritedMetadata,
        userMessageId: previousMessage.message_id
      } : null);
      const previous = entries.at(-1);
      if (metadata && previous?.stage.kind === "dialogue" && previous.stage.sessionId === metadata.sessionId) {
        previous.messageIds.push(message.message_id);
        previous.representativeMessageId = message.message_id;
        previous.stage.turnCount += 1;
        previous.stage.engine = metadata.engine ?? previous.stage.engine;
        return;
      }
      entries.push({
        representativeMessageId: message.message_id,
        messageIds: [ message.message_id ],
        stage: metadata ? {
          kind: "dialogue",
          sessionId: metadata.sessionId,
          targetName: metadata.targetName,
          canonicalName: metadata.canonicalName,
          channel: metadata.channel,
          turnCount: 1,
          engine: metadata.engine
        } : {
          kind: "story"
        }
      });
    });
    return entries;
  };
  const getStageSnapshot = () => {
    const lastMessageId = getLastMessageId();
    if (stageSnapshotCache && stageSnapshotLastMessageId === lastMessageId) return stageSnapshotCache;
    let messages;
    let assistantMessages;
    try {
      messages = [ ...getAllMessages() ].sort((left, right) => left.message_id - right.message_id);
      assistantMessages = messages.filter(message => message.role === "assistant");
    } catch (error) {
      console.warn("[灯火阑珊·伪同层] 读取完整聊天楼层失败，暂时使用页面楼层", error);
      assistantMessages = getAssistantMessagesFromDom().sort((left, right) => left.message_id - right.message_id);
      messages = assistantMessages;
    }
    const previousMessages = new Map;
    const messagesById = new Map;
    let previousMessage;
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
      previousMessages
    };
    stageSnapshotLastMessageId = lastMessageId;
    return stageSnapshotCache;
  };
  const readTimelineReasoning = message => {
    const direct = message?.extra ?? {};
    const nested = direct.extra && typeof direct.extra === "object" ? direct.extra : {};
    const inlineReasoning = (0, _message_content__WEBPACK_IMPORTED_MODULE_1__.extractInlineReasoning)(String(message?.message ?? ""));
    const reasoning = (0, _message_content__WEBPACK_IMPORTED_MODULE_1__.mergeReasoningText)(String(direct.reasoning ?? nested.reasoning ?? "").trim(), inlineReasoning?.text ?? "");
    const rawDuration = Number(direct.reasoning_duration ?? nested.reasoning_duration);
    return {
      reasoning,
      reasoningDuration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null
    };
  };
  const isReasoningState = value => value === "none" || value === "thinking" || value === "done" || value === "hidden";
  const toReasoningTimestamp = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value !== "string" && typeof value !== "number") return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  };
  const readNativeLiveReasoning = generation => {
    let processor;
    try {
      processor = tavernWindow.SillyTavern?.getContext?.().streamingProcessor;
    } catch {
      processor = null;
    }
    const handler = processor?.reasoningHandler;
    const runtimeReasoning = typeof handler?.reasoningDisplayText === "string" && handler.reasoningDisplayText.trim() ? handler.reasoningDisplayText : typeof handler?.reasoning === "string" ? handler.reasoning : "";
    let text = runtimeReasoning.trim();
    let messageId = Number(processor?.messageId);
    let rawState = handler?.state;
    let duration = null;
    try {
      const reportedDuration = Number(handler?.getDuration?.());
      if (Number.isFinite(reportedDuration) && reportedDuration >= 0) duration = reportedDuration;
    } catch {}
    if (duration === null && text) {
      const startedAt = toReasoningTimestamp(handler?.startTime) ?? toReasoningTimestamp(handler?.initialTime);
      const endedAt = toReasoningTimestamp(handler?.endTime);
      if (startedAt !== null) duration = Math.max(0, (endedAt ?? Date.now()) - startedAt);
    }
    const domMessage = (Number.isInteger(messageId) && messageId >= 0 ? getMessageElement(messageId) : null) ?? [ ...tavernDocument.querySelectorAll("#chat > .mes") ].reverse().find(element => element.dataset.reasoningState === "thinking" || element.classList.contains("last_mes"));
    if (domMessage) {
      const domMessageId = Number(domMessage.getAttribute("mesid"));
      if (!Number.isInteger(messageId) || messageId < 0) messageId = domMessageId;
      if (!text) text = (domMessage.querySelector(".mes_reasoning")?.innerText ?? "").trim();
      rawState ??= domMessage.dataset.reasoningState ?? domMessage.querySelector(".mes_reasoning_details")?.dataset.state;
      if (duration === null) {
        const domDuration = Number(domMessage.querySelector(".mes_reasoning_header_title")?.dataset.duration ?? domMessage.querySelector(".mes_reasoning_details")?.dataset.duration);
        if (Number.isFinite(domDuration) && domDuration > 0) {
          duration = domDuration * 1e3;
        }
      }
    }
    if (!text) return null;
    if (!Number.isInteger(messageId) || messageId < 0) messageId = getLastMessageId();
    if (!Number.isInteger(messageId) || messageId < 0) messageId = generation.baseMessageId;
    const state = isReasoningState(rawState) && rawState !== "none" ? rawState : "thinking";
    return {
      messageId,
      text,
      duration,
      state
    };
  };
  const updateGenerationReasoning = (generation, reasoning) => {
    if (!reasoning) return undefined;
    const previous = generation.reasoning;
    generation.reasoning = reasoning;
    if (previous?.messageId === reasoning.messageId && previous.text === reasoning.text && previous.duration === reasoning.duration && previous.state === reasoning.state) {
      return undefined;
    }
    return reasoning;
  };
  const readMessageTokenCount = message => {
    const direct = message?.extra ?? {};
    const nested = direct.extra && typeof direct.extra === "object" ? direct.extra : {};
    const value = Number(direct.token_count ?? nested.token_count);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
  };
  const readTimelineUserText = (message, metadata) => {
    if (!message) return "";
    if (metadata?.rawUserText) return metadata.rawUserText.trim();
    return String(message.message ?? "").replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, "").trim();
  };
  const hydrateTimelineEntries = snapshot => {
    if (snapshot.timelineEntries) return snapshot.timelineEntries;
    const historyIndexes = {
      story: 0,
      dialogue: 0
    };
    const timelineEntries = snapshot.entries.map((entry, index) => {
      const history = entry.stage.kind;
      historyIndexes[history] += 1;
      const turns = entry.messageIds.flatMap(assistantMessageId => {
        const assistant = snapshot.messagesById.get(assistantMessageId);
        if (!assistant) return [];
        const metadata = resolveAssistantInteractionMetadata(assistant, snapshot.messages);
        const previous = snapshot.previousMessages.get(assistantMessageId);
        const linkedUser = (metadata?.userMessageId !== undefined ? snapshot.messagesById.get(metadata.userMessageId) : undefined) ?? (previous?.role === "user" ? previous : undefined);
        const visibleDialogue = metadata ? (0, _message_content__WEBPACK_IMPORTED_MODULE_1__.extractDialogueContent)(String(assistant.message ?? "")) : null;
        const reasoning = readTimelineReasoning(assistant);
        const tokenCount = readMessageTokenCount(assistant);
        return [ {
          assistantMessageId,
          ...linkedUser ? {
            userMessageId: linkedUser.message_id
          } : {},
          userText: readTimelineUserText(linkedUser, metadata),
          assistantText: String(assistant.message ?? ""),
          ...metadata ? {
            reaction: String(metadata.reaction ?? visibleDialogue?.reaction ?? "").replace(/<\/?(?:反应|正文|会话状态)(?=[\s/>])[^>]*>/gi, "").trim() || undefined
          } : {},
          ...reasoning,
          ...tokenCount !== undefined ? {
            tokenCount
          } : {}
        } ];
      });
      return {
        representativeMessageId: entry.representativeMessageId,
        messageIds: [ ...entry.messageIds ],
        index: index + 1,
        historyIndex: historyIndexes[history],
        stage: {
          ...entry.stage
        },
        turns
      };
    });
    snapshot.timelineEntries = timelineEntries;
    return timelineEntries;
  };
  const findTimelineEntryIndex = (entries, messageId) => {
    if (!Number.isFinite(messageId)) return entries.length - 1;
    const normalized = Math.trunc(messageId);
    const exact = entries.findIndex(entry => entry.representativeMessageId === normalized || entry.messageIds.includes(normalized));
    return exact >= 0 ? exact : entries.length - 1;
  };
  const sendTimelinePage = (source, request) => {
    const snapshot = getStageSnapshot();
    const entries = hydrateTimelineEntries(snapshot);
    const limit = _.clamp(Math.trunc(Number(request.limit) || 8), 1, 20);
    const anchorIndex = findTimelineEntryIndex(entries, request.anchorMessageId);
    let start;
    let end;
    if (request.direction === "older") {
      end = Math.max(0, anchorIndex);
      start = Math.max(0, end - limit);
    } else if (request.direction === "newer") {
      start = Math.min(entries.length, anchorIndex + 1);
      end = Math.min(entries.length, start + limit);
    } else {
      start = _.clamp(anchorIndex - Math.floor((limit - 1) / 2), 0, Math.max(0, entries.length - limit));
      end = Math.min(entries.length, start + limit);
    }
    send(source, {
      type: "timeline_page",
      requestId: request.requestId,
      revision: viewRevision,
      entries: entries.slice(start, end),
      hasOlder: start > 0,
      hasNewer: end < entries.length
    });
  };
  const getStageEntries = () => getStageSnapshot().entries;
  const latestStageId = () => getStageEntries().at(-1)?.representativeMessageId;
  const getHistoryEntries = (entries, history) => entries.filter(entry => entry.stage.kind === history);
  const getHistoryLatestMessageId = (history, entries = getStageEntries()) => getHistoryEntries(entries, history).at(-1)?.representativeMessageId;
  const getGenerationAnchor = (history, entries = getStageEntries()) => getHistoryLatestMessageId(history, entries) ?? entries.at(-1)?.representativeMessageId;
  const resolveHistorySelection = (entries, history) => {
    const historyEntries = getHistoryEntries(entries, history);
    if (historyEntries.length === 0) {
      selectedHistoryMessageIds[history] = null;
      return null;
    }
    const remembered = selectedHistoryMessageIds[history];
    const selectedEntry = historyEntries.find(entry => entry.representativeMessageId === remembered || remembered !== null && entry.messageIds.includes(remembered));
    const selected = selectedEntry ?? historyEntries.at(-1);
    selectedHistoryMessageIds[history] = selected.representativeMessageId;
    return selected.representativeMessageId;
  };
  const makeHistoryState = (entries, history) => {
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
      isLatest: selected === latestMessageId
    };
  };
  const rememberStageSelection = (messageId, entries = getStageEntries()) => {
    const entry = entries.find(candidate => candidate.representativeMessageId === messageId || candidate.messageIds.includes(messageId));
    if (!entry) return;
    selectedHistoryMessageIds[entry.stage.kind] = entry.representativeMessageId;
  };
  const parkCandidateFrame = (frame, latestMessageId = latestStageId()) => {
    rememberFrame(frame);
    const messageId = getFrameMessageId(frame);
    if (messageId === undefined) return;
    const shouldPark = messageId === latestMessageId || activeGeneration?.operation === "reroll" && messageId === activeGeneration.baseMessageId;
    if (!shouldPark) return;
    if (parkFrame(messageId, frame)) scheduleViewRefresh(0);
  };
  const flushFrameCandidates = () => {
    frameCandidateTimer = null;
    if (controllerDisposed || pendingFrameCandidates.size === 0) return;
    const frames = [ ...pendingFrameCandidates ];
    pendingFrameCandidates.clear();
    const latestMessageId = latestStageId();
    frames.forEach(frame => {
      if (frame.isConnected) parkCandidateFrame(frame, latestMessageId);
    });
  };
  const queueFrameCandidate = frame => {
    rememberFrame(frame);
    pendingFrameCandidates.add(frame);
    if (frameCandidateTimer !== null) return;
    frameCandidateTimer = window.setTimeout(flushFrameCandidates, FRAME_CANDIDATE_BATCH_MS);
  };
  const inspectAddedFrameNode = node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node;
    if (element.tagName === "IFRAME") {
      queueFrameCandidate(element);
      return;
    }
    const containsRelevantFrames = element.matches(".mes, .TH-render") || element.closest(".TH-render") !== null || element.id === STAGE_ROOT_ID || element.classList.contains(FRAME_KEEPER_CLASS);
    if (!containsRelevantFrames) return;
    element.querySelectorAll("iframe").forEach(queueFrameCandidate);
  };
  const installFrameObserver = () => {
    frameObserver?.disconnect();
    const chat = tavernDocument.querySelector("#chat");
    if (!chat) return;
    frameObserver = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(inspectAddedFrameNode));
    });
    frameObserver.observe(chat, {
      childList: true,
      subtree: true
    });
  };
  const parkLatestStageFrame = () => {
    const messageId = latestStageId();
    if (messageId === undefined) return;
    const frame = getMessageElement(messageId)?.querySelector(".TH-render iframe");
    if (frame) parkCandidateFrame(frame);
  };
  const getSourceMessageId = source => {
    const frame = getFrameForSource(source);
    return frame ? getFrameMessageId(frame) : undefined;
  };
  const getLiveRegistration = messageId => {
    const source = registrations.get(messageId);
    if (!source) return undefined;
    if (getSourceMessageId(source) === messageId) return source;
    registrations.delete(messageId);
    return undefined;
  };
  const getRegisteredAssistantIds = () => [ ...registrations.keys() ].filter(messageId => getLiveRegistration(messageId) !== undefined).sort((left, right) => left - right);
  const getRerollLock = () => activeGeneration?.operation === "reroll" ? activeGeneration.lockedView : undefined;
  const getHostStageId = () => {
    if (activeGeneration?.operation === "reroll" && getMessageElement(activeGeneration.baseMessageId)) {
      return activeGeneration.baseMessageId;
    }
    return getRegisteredAssistantIds().at(-1) ?? getParkedMessageId();
  };
  const makeView = (entries = getStageEntries()) => {
    const lockedView = getRerollLock();
    if (lockedView) {
      return {
        ...lockedView,
        hostMessageId: getHostStageId() ?? lockedView.hostMessageId,
        nativeInputCollapsed,
        activeInteraction: activeInteraction.mode === "dialogue" ? {
          ...activeInteraction
        } : STORY_INTERACTION
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
      ...tokenCount !== undefined ? {
        tokenCount
      } : {},
      stage: selectedEntry?.stage ?? {
        kind: "story"
      },
      histories: {
        story: makeHistoryState(entries, "story"),
        dialogue: makeHistoryState(entries, "dialogue")
      },
      activeInteraction: activeInteraction.mode === "dialogue" ? {
        ...activeInteraction
      } : STORY_INTERACTION
    };
  };
  const applyNativeInputState = () => {
    tavernDocument.body.classList.toggle("dhl-native-input-collapsed", nativeInputCollapsed);
    const chat = tavernDocument.querySelector("#chat");
    if (!chat) return;
    chat.scrollTop = 0;
    if (mobileStageAlignFrame !== null) tavernWindow.cancelAnimationFrame(mobileStageAlignFrame);
    mobileStageAlignFrame = tavernWindow.requestAnimationFrame(() => {
      mobileStageAlignFrame = null;
      if (!controllerDisposed && chat.isConnected) chat.scrollTop = 0;
    });
  };
  const restoreNativeChatPosition = () => {
    const chat = tavernDocument.querySelector("#chat");
    if (!chat) return;
    const scrollToLatest = () => {
      const activeLease = controllerHost.__dhlPseudoLayerControllerLease__;
      if (!chat.isConnected || activeLease && activeLease.instanceId !== controllerInstanceId) return;
      chat.scrollTop = chat.scrollHeight;
    };
    tavernWindow.requestAnimationFrame(() => {
      scrollToLatest();
      tavernWindow.requestAnimationFrame(scrollToLatest);
    });
  };
  const handleNativeInputViewportChange = event => {
    if (!nativeInputFollowsViewport) return;
    nativeInputCollapsed = event.matches;
    broadcastView();
  };
  const applyStageVisibility = (snapshot = getStageSnapshot()) => {
    const entries = snapshot.entries;
    const ids = entries.map(entry => entry.representativeMessageId);
    if (!getRerollLock()) {
      const scopedIds = selectedHistoryKind ? getHistoryEntries(entries, selectedHistoryKind).map(entry => entry.representativeMessageId) : ids;
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
    tavernDocument.querySelectorAll("#chat > .mes").forEach(element => {
      const id = Number(element.getAttribute("mesid"));
      element.classList.toggle(STAGE_CLASS, assistantIds.has(id));
      element.classList.toggle(SELECTED_CLASS, id === hostMessageId);
    });
    syncParkedStage(hostMessageId);
    tavernDocument.body.classList.toggle("dhl-pseudo-layer-active", hostMessageId !== undefined);
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
    registeredIds.forEach(messageId => send(registrations.get(messageId), {
      type: "view",
      view
    }));
  };
  const scheduleViewRefresh = (delay = 0, invalidateSnapshot = false) => {
    if (invalidateSnapshot) invalidateStageSnapshot();
    const deadline = Date.now() + Math.max(0, delay);
    if (viewRefreshTimer !== null && viewRefreshDeadline <= deadline) return;
    if (viewRefreshTimer !== null) window.clearTimeout(viewRefreshTimer);
    viewRefreshDeadline = deadline;
    viewRefreshTimer = window.setTimeout(() => {
      viewRefreshTimer = null;
      viewRefreshDeadline = 0;
      if (!controllerDisposed) broadcastView();
    }, Math.max(0, deadline - Date.now()));
  };
  const installStyle = () => {
    if (tavernDocument.getElementById(STYLE_ID)) return;
    const style = tavernDocument.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `\n    body.dhl-pseudo-layer-active #show_more_messages { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} {\n      display: flex !important;\n      width: 100% !important;\n      max-width: none !important;\n      padding: 0 !important;\n      margin: 0 !important;\n    }\n    #${STAGE_ROOT_ID} { display: none !important; }\n    body.${ROOT_ACTIVE_CLASS} #chat > .mes.${SELECTED_CLASS} { display: none !important; }\n    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} {\n      display: block !important;\n      width: 100% !important;\n      max-width: none !important;\n      min-width: 0 !important;\n      padding: 0 !important;\n      margin: 0 !important;\n    }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} { display: none !important; }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS} {\n      display: block !important;\n      width: 100% !important;\n      min-width: 0 !important;\n    }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe {\n      display: block !important;\n      width: 100% !important;\n      border: 0 !important;\n    }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .for_checkbox,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .del_checkbox,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .mesAvatarWrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipe_left,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipeRightBlock,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .ch_name,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_reasoning_details,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_media_wrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_file_wrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_bias { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_block,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { width: 100% !important; max-width: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { padding: 0 !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text > :not(.TH-render) { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render > iframe { width: 100% !important; }\n    body.dhl-native-input-collapsed #form_sheld { display: none !important; }\n    body.dhl-pseudo-layer-active.dhl-native-input-collapsed {\n      --bottomFormBlockSize: 0px !important;\n    }\n    body.dhl-pseudo-layer-active.dhl-native-input-collapsed #chat {\n      height: 100% !important;\n      max-height: 100% !important;\n    }\n    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID},\n    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS},\n    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS} > iframe {\n      height: 100% !important;\n      min-height: 0 !important;\n      max-height: 100% !important;\n    }\n    body.dhl-pseudo-layer-active #chat {\n      overflow: hidden !important;\n      overflow-anchor: none !important;\n      overscroll-behavior: none !important;\n      scrollbar-width: none !important;\n    }\n    body.dhl-pseudo-layer-active #chat::-webkit-scrollbar { display: none !important; }\n  `;
    tavernDocument.head.append(style);
  };
  const buildMessage = reply => {
    const text = reply.trim();
    if (/<visual_cards>[\s\S]*?<\/visual_cards>/i.test(text) || /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(text)) {
      return text;
    }
    return `${text}\n\n<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
  };
  const buildEditedMessage = content => {
    if (/<visual_cards>[\s\S]*?<\/visual_cards>/i.test(content) || /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(content)) {
      return content;
    }
    const separator = content.length === 0 ? "" : content.endsWith("\n") ? "\n" : "\n\n";
    return `${content}${separator}<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
  };
  const ensurePseudoMarker = async (messageId, refresh = "affected") => {
    const message = getChatMessages(messageId)[0];
    if (!message || message.role !== "assistant") return;
    const content = String(message.message ?? "");
    const nextContent = buildMessage(content);
    if (nextContent === content.trim()) return;
    await setChatMessages([ {
      message_id: messageId,
      message: nextContent
    } ], {
      refresh
    });
  };
  const writeInteractionMetadata = async (messageId, context, options = {}) => {
    const message = getChatMessages(messageId)[0];
    if (!message) return;
    const existing = readInteractionMetadata(message);
    const metadata = {
      ...existing,
      version: 2,
      kind: "dialogue",
      ...context,
      engine: existing?.engine ?? "native",
      ...options.rawUserText ? {
        rawUserText: options.rawUserText
      } : {},
      ...Number.isFinite(options.userMessageId) ? {
        userMessageId: options.userMessageId
      } : {}
    };
    await setChatMessages([ {
      message_id: messageId,
      extra: {
        ...message.extra ?? {},
        [INTERACTION_KEY]: metadata
      }
    } ], {
      refresh: "none"
    });
  };
  const decorateDialogueInput = (text, context) => {
    const value = text.trim();
    const prefix = context.channel === "present" ? `（对${context.targetName}说）` : `（向${context.targetName}传讯）`;
    return value.startsWith(prefix) ? value : `${prefix}${value}`;
  };
  const triggerNativeSend = prompt => {
    const textarea = tavernDocument.querySelector("#send_textarea");
    const sendButton = tavernDocument.querySelector("#send_but");
    if (!textarea || !sendButton) throw new Error("没有找到酒馆原生输入区。");
    textarea.value = prompt;
    textarea.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    textarea.dispatchEvent(new Event("change", {
      bubbles: true
    }));
    sendButton.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    }));
  };
  const triggerNativeReroll = async messageId => {
    const context = tavernWindow.SillyTavern?.getContext?.();
    const swipeRight = context?.swipe?.right;
    if (typeof swipeRight !== "function") throw new Error("当前酒馆版本没有提供原生重生成接口。");
    const nativeButton = getMessageElement(messageId)?.querySelector(".swipe_right");
    const nativeMessage = context?.chat?.[messageId];
    if (!nativeMessage) throw new Error(`没有找到第 ${messageId} 楼的原生消息。`);
    repairNativeSwipeState(messageId, nativeMessage);
    await swipeRight.call(nativeButton ?? context?.swipe, null, {
      source: "dhl-pseudo-layer",
      message: nativeMessage
    });
  };
  const getNativeSwipeMessage = messageId => {
    const context = tavernWindow.SillyTavern?.getContext?.();
    return context?.chat?.[messageId];
  };
  const stripNativeSwipeMarker = value => String(value ?? "").replace(/<pseudo_layer>[\s\S]*?<\/pseudo_layer>/gi, "").trim();
  const isNativeSwipePlaceholder = value => stripNativeSwipeMarker(value) === "...";
  const isUsableNativeSwipeCandidate = value => {
    const visible = stripNativeSwipeMarker(value);
    return visible.length > 0 && !isNativeSwipePlaceholder(value);
  };
  const isNativeSwipeCandidateIncomplete = (message, index) => {
    const swipeInfo = message.swipe_info?.[index];
    if (swipeInfo?.gen_started != null) return swipeInfo.gen_finished == null;
    if (message.swipe_id === index && message.gen_started != null) return message.gen_finished == null;
    return false;
  };
  const repairNativeSwipeState = (messageId, message) => {
    if (!Array.isArray(message.swipes) || message.swipes.length === 0) return;
    const swipeId = message.swipe_id;
    const isValid = Number.isInteger(swipeId) && swipeId >= 0 && swipeId < message.swipes.length && isUsableNativeSwipeCandidate(message.swipes[swipeId]) && !isNativeSwipeCandidateIncomplete(message, swipeId) && isUsableNativeSwipeCandidate(message.mes);
    if (isValid) return false;
    const fallbackSwipeId = message.swipes.findLastIndex((candidate, index) => isUsableNativeSwipeCandidate(candidate) && !isNativeSwipeCandidateIncomplete(message, index));
    if (fallbackSwipeId < 0) throw new Error(`第 ${messageId} 楼没有可恢复的重生成候选。`);
    if (message.swipes.length > fallbackSwipeId + 1) {
      message.swipes.splice(fallbackSwipeId + 1);
    }
    if (Array.isArray(message.swipe_info) && message.swipe_info.length > fallbackSwipeId + 1) {
      message.swipe_info.splice(fallbackSwipeId + 1);
    }
    message.swipe_id = fallbackSwipeId;
    message.mes = message.swipes[fallbackSwipeId];
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
  const isNativeSwipeMaterialized = (messageId, generation = activeGeneration) => {
    const message = getNativeSwipeMessage(messageId);
    if (!message) return false;
    if (!isUsableNativeSwipeCandidate(message.mes)) return false;
    if (!Number.isInteger(message.swipe_id) || !Array.isArray(message.swipes)) {
      return generation?.operation !== "reroll" || message.mes !== generation.nativeSwipeOriginal?.mes;
    }
    const swipeId = message.swipe_id;
    if (swipeId < 0 || swipeId >= message.swipes.length || !isUsableNativeSwipeCandidate(message.swipes[swipeId]) || isNativeSwipeCandidateIncomplete(message, swipeId)) {
      return false;
    }
    if (generation?.operation !== "reroll" || !generation.nativeSwipeOriginal) return true;
    const original = generation.nativeSwipeOriginal;
    return swipeId !== original.swipe_id || message.swipes.length !== (original.swipes?.length ?? 0) || String(message.swipes[swipeId] ?? "") !== String(original.mes ?? "");
  };
  const waitForNativeSwipeMaterialized = async (messageId, timeout = 5e3, generation = activeGeneration) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (isNativeSwipeMaterialized(messageId, generation)) return true;
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
    return isNativeSwipeMaterialized(messageId, generation);
  };
  const getCurrentChatId = () => String(tavernWindow.SillyTavern?.getCurrentChatId?.() ?? "");
  const captureNativeRerollOriginal = message => {
    const swipeSnapshot = getChatMessages(message.message_id, {
      include_swipes: true
    })[0];
    return {
      messageId: message.message_id,
      name: String(message.name ?? ""),
      role: message.role,
      isHidden: Boolean(message.is_hidden),
      message: String(message.message ?? ""),
      data: _.cloneDeep(message.data ?? {}),
      extra: _.cloneDeep(message.extra ?? {}),
      ...swipeSnapshot ? {
        swipeId: swipeSnapshot.swipe_id,
        swipes: _.cloneDeep(swipeSnapshot.swipes ?? []),
        swipesData: _.cloneDeep(swipeSnapshot.swipes_data ?? []),
        swipesInfo: _.cloneDeep(swipeSnapshot.swipes_info ?? [])
      } : {}
    };
  };
  const readPendingNativeRerolls = () => {
    try {
      const parsed = JSON.parse(tavernWindow.sessionStorage.getItem(PENDING_NATIVE_REROLL_STORAGE_KEY) ?? "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(record => record?.version === 1 && typeof record.chatId === "string" && Number.isInteger(record.original?.messageId) && record.original?.role === "assistant");
    } catch (error) {
      console.warn("[灯火阑珊·伪同层] 无法读取重答恢复快照", error);
      return [];
    }
  };
  const writePendingNativeRerolls = records => {
    try {
      if (records.length === 0) tavernWindow.sessionStorage.removeItem(PENDING_NATIVE_REROLL_STORAGE_KEY); else tavernWindow.sessionStorage.setItem(PENDING_NATIVE_REROLL_STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.warn("[灯火阑珊·伪同层] 无法保存重答恢复快照，将仅使用本次运行内存回滚", error);
    }
  };
  const persistPendingNativeReroll = generation => {
    if (generation.operation !== "reroll" || generation.engine !== "native" || !generation.chatId || !generation.rerollOriginal || !generation.nativeSwipeOriginal) {
      return;
    }
    const next = readPendingNativeRerolls().filter(record => record.chatId !== generation.chatId || record.original.messageId !== generation.rerollOriginal?.messageId);
    next.push({
      version: 1,
      chatId: generation.chatId,
      requestId: generation.requestId,
      createdAt: Date.now(),
      original: _.cloneDeep(generation.rerollOriginal),
      nativeSwipeOriginal: _.cloneDeep(generation.nativeSwipeOriginal)
    });
    writePendingNativeRerolls(next);
  };
  const clearPendingNativeReroll = (chatId, messageId) => {
    if (!chatId || !Number.isInteger(messageId)) return;
    writePendingNativeRerolls(readPendingNativeRerolls().filter(record => record.chatId !== chatId || record.original.messageId !== messageId));
  };
  const restoreNativeSwipeSnapshot = (message, snapshot) => {
    const restore = key => {
      if (snapshot[key] === undefined) delete message[key]; else message[key] = _.cloneDeep(snapshot[key]);
    };
    restore("mes");
    restore("send_date");
    restore("gen_started");
    restore("gen_finished");
    restore("extra");
    restore("swipe_id");
    restore("swipes");
    restore("swipe_info");
  };
  const restoreNativeRerollRecord = async (chatId, original, nativeSwipeOriginal) => {
    if (getCurrentChatId() !== chatId) return false;
    let current = getChatMessages(original.messageId)[0];
    if (!current) {
      if (getLastMessageId() !== original.messageId - 1) {
        throw new Error(`第 ${original.messageId} 楼已不存在，且聊天记录发生了其他变化，未贸然插回原回复。`);
      }
      await createChatMessages([ {
        name: original.name,
        role: original.role,
        is_hidden: original.isHidden,
        message: original.message,
        data: _.cloneDeep(original.data),
        extra: _.cloneDeep(original.extra)
      } ], {
        insert_before: "end",
        refresh: "affected"
      });
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
      ...original.swipes ? {
        swipe_id: original.swipeId ?? 0,
        swipes: _.cloneDeep(original.swipes),
        swipes_data: _.cloneDeep(original.swipesData ?? []),
        swipes_info: _.cloneDeep(original.swipesInfo ?? [])
      } : {}
    };
    await setChatMessages([ restorePayload ], {
      refresh: "affected"
    });
    const nativeMessage = getNativeSwipeMessage(original.messageId);
    if (nativeMessage) restoreNativeSwipeSnapshot(nativeMessage, nativeSwipeOriginal);
    const restored = getChatMessages(original.messageId)[0];
    if (!restored || String(restored.message ?? "") !== original.message) {
      throw new Error(`第 ${original.messageId} 楼原回复校验失败。`);
    }
    return true;
  };
  const rollbackNativeReroll = generation => {
    if (generation.rerollRollback) return generation.rerollRollback;
    if (generation.operation !== "reroll" || generation.engine !== "native" || !generation.rerollOriginal || !generation.nativeSwipeOriginal || !generation.chatId) {
      return Promise.resolve(false);
    }
    const task = (async () => {
      const original = generation.rerollOriginal;
      const restored = await restoreNativeRerollRecord(generation.chatId, original, generation.nativeSwipeOriginal);
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
  const isNativeRerollBackAtOriginal = generation => {
    const current = getNativeSwipeMessage(generation.baseMessageId);
    const original = generation.nativeSwipeOriginal;
    if (!current || !original) return false;
    const currentSwipeId = Number(current.swipe_id);
    const originalSwipeId = Number(original.swipe_id);
    return Number.isInteger(currentSwipeId) && Number.isInteger(originalSwipeId) && currentSwipeId === originalSwipeId && String(current.mes ?? "") === String(original.mes ?? "") && (current.swipes?.length ?? 0) === (original.swipes?.length ?? 0);
  };
  const waitForNativeRerollToSettle = async (generation, timeout = 1800) => {
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
  const schedulePostRerollRecoverySync = generation => {
    const messageId = generation.rerollOriginal?.messageId;
    const chatId = generation.chatId;
    if (!Number.isInteger(messageId) || !chatId) return;
    [ 120, 480, 1200, 2600 ].forEach(delay => {
      window.setTimeout(() => {
        if (controllerDisposed || getCurrentChatId() !== chatId || activeGeneration) return;
        invalidateStageSnapshot();
        const entries = getStageEntries();
        const ids = entries.map(entry => entry.representativeMessageId);
        if (!browsingHistory && ids.includes(messageId)) {
          selectedMessageId = messageId;
          selectedHistoryKind = generation.interaction.mode;
          rememberStageSelection(messageId, entries);
        }
        viewRevision += 1;
        broadcastView();
      }, delay);
    });
  };
  const failNativeReroll = (generation, error) => {
    if (generation.rerollFailure) return generation.rerollFailure;
    generation.cancelled = true;
    const task = (async () => {
      await waitForNativeRerollToSettle(generation);
      let restored = false;
      try {
        restored = await rollbackNativeReroll(generation);
      } catch (rollbackError) {
        console.error("[灯火阑珊·伪同层] 原生重生成回滚失败", rollbackError);
      }
      if (activeGeneration !== generation) return;
      discardQueuedStream();
      send(generation.source, {
        type: "error",
        requestId: generation.requestId,
        message: `${error instanceof Error ? error.message : String(error)}${restored ? "；原回复已恢复，可以重新重答。" : "；原回复恢复尚未完成，控制器重载后会继续尝试恢复。"}`
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
    const recoveredIds = [];
    try {
      const currentChatId = getCurrentChatId();
      const pendingRecords = readPendingNativeRerolls().filter(record => record.chatId === currentChatId);
      for (const record of pendingRecords) {
        try {
          if (!await restoreNativeRerollRecord(record.chatId, record.original, record.nativeSwipeOriginal)) continue;
          clearPendingNativeReroll(record.chatId, record.original.messageId);
          recoveredIds.push(record.original.messageId);
        } catch (error) {
          console.warn(`[灯火阑珊·伪同层] 第 ${record.original.messageId} 楼的事务快照恢复失败`, error);
        }
      }
      for (const message of getAllMessages()) {
        if (message.role !== "assistant") continue;
        const nativeMessage = getNativeSwipeMessage(message.message_id);
        if (!nativeMessage) continue;
        try {
          if (!repairNativeSwipeState(message.message_id, nativeMessage)) continue;
          const restored = buildMessage(String(nativeMessage.mes ?? ""));
          await setChatMessages([ {
            message_id: message.message_id,
            message: restored,
            extra: _.cloneDeep(nativeMessage.extra ?? message.extra ?? {})
          } ], {
            refresh: "affected"
          });
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
        console.info(`[灯火阑珊·伪同层] 已恢复失败重答楼层：${recoveredIds.join(", ")}`);
      }
    } finally {
      recoveringNativeSwipeState = false;
    }
  };
  const getDialogueMvuSnapshot = messageId => {
    let snapshot;
    try {
      if (typeof Mvu !== "undefined") {
        snapshot = Mvu.getMvuData({
          type: "message",
          message_id: messageId
        });
      }
    } catch (error) {
      console.warn("[灯火阑珊·短对话] 读取 MVU 快照失败，改用楼层数据", error);
    }
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      snapshot = getChatMessages(messageId)[0]?.data ?? {};
    }
    return _.cloneDeep(snapshot);
  };
  const stripDialogueStructureTags = text => text.replace(/<\/?(?:反应|正文|会话状态|visual_cards|pseudo_layer|UpdateVariable|JSONPatch)(?=[\s/>])[^>]*>/gi, "").trim();
  const buildDedicatedDialogueMessage = result => {
    const reaction = stripDialogueStructureTags(result.reaction);
    const dialogue = stripDialogueStructureTags(result.dialogue);
    return [ `<反应>${reaction}</反应>`, `<正文>${dialogue}</正文>`, "<pseudo_layer>", "灯火阑珊", "</pseudo_layer>" ].join("\n");
  };
  const buildDedicatedMetadata = (generation, context, userMessageId, result) => {
    const reaction = result ? stripDialogueStructureTags(result.reaction) : "";
    return {
      version: 2,
      kind: "dialogue",
      ...context,
      engine: "dedicated",
      operationId: generation.operationId,
      rawUserText: generation.rawUserText,
      userMessageId,
      ...reaction ? {
        reaction
      } : {},
      ...result?.sessionState ? {
        sessionState: result.sessionState
      } : {},
      ...result?.memoryEvents.length ? {
        memoryEvents: result.memoryEvents
      } : {},
      ...result?.relationEvents.length ? {
        relationEvents: result.relationEvents
      } : {}
    };
  };
  const getDialogueOperationMessages = operationId => getAllMessages().filter(message => readInteractionMetadata(message)?.operationId === operationId);
  const rollbackDialogueOperation = async generation => {
    if (!generation.operationId || getCurrentChatId() !== generation.chatId) return;
    if (generation.operation === "reroll" && generation.rerollOriginal) {
      const original = generation.rerollOriginal;
      await setChatMessages([ {
        message_id: original.messageId,
        message: original.message,
        data: _.cloneDeep(original.data),
        extra: _.cloneDeep(original.extra)
      } ], {
        refresh: "affected"
      });
      return;
    }
    const ids = getDialogueOperationMessages(generation.operationId).map(message => message.message_id);
    if (ids.length === 0) return;
    const previousDeletingMessageId = deletingMessageId;
    deletingMessageId = Math.max(...ids);
    try {
      await deleteChatMessages(ids, {
        refresh: "affected"
      });
    } finally {
      deletingMessageId = previousDeletingMessageId;
    }
  };
  const commitDedicatedDialogue = async (generation, context, result, mvuSnapshot) => {
    const baseline = generation.baselineLastMessageId;
    if (baseline === undefined || generation.cancelled || getCurrentChatId() !== generation.chatId || getLastMessageId() !== baseline) {
      throw new Error("生成期间聊天记录已经变化，本轮短对话未写入。");
    }
    const userMessageId = baseline + 1;
    const assistantMessageId = baseline + 2;
    const userMetadata = buildDedicatedMetadata(generation, context, userMessageId);
    const assistantMetadata = buildDedicatedMetadata(generation, context, userMessageId, result);
    await createChatMessages([ {
      role: "user",
      message: decorateDialogueInput(generation.rawUserText, context),
      data: _.cloneDeep(mvuSnapshot),
      extra: {
        [INTERACTION_KEY]: userMetadata
      }
    }, {
      role: "assistant",
      message: buildDedicatedDialogueMessage(result),
      data: _.cloneDeep(mvuSnapshot),
      extra: {
        [INTERACTION_KEY]: assistantMetadata
      }
    } ], {
      refresh: "affected"
    });
    const created = getDialogueOperationMessages(generation.operationId ?? "");
    const user = created.find(message => message.role === "user");
    const assistant = created.find(message => message.role === "assistant");
    if (generation.cancelled || getCurrentChatId() !== generation.chatId || getLastMessageId() !== assistantMessageId || user?.message_id !== userMessageId || assistant?.message_id !== assistantMessageId) {
      throw new Error("写入短对话时聊天记录发生并发变化，已撤销本轮写入。");
    }
    return assistantMessageId;
  };
  const commitDedicatedDialogueReroll = async (generation, context, result, mvuSnapshot) => {
    const baseline = generation.baselineLastMessageId;
    const userMessageId = generation.userMessageId;
    const targetMessageId = generation.baseMessageId;
    if (baseline === undefined || userMessageId === undefined || generation.cancelled || getCurrentChatId() !== generation.chatId || getLastMessageId() !== baseline) {
      throw new Error("生成期间聊天记录已经变化，本次重答未写入。");
    }
    const current = getChatMessages(targetMessageId)[0];
    if (!current || current.role !== "assistant") throw new Error("没有找到需要重答的角色回复。");
    const metadata = buildDedicatedMetadata(generation, context, userMessageId, result);
    await setChatMessages([ {
      message_id: targetMessageId,
      message: buildDedicatedDialogueMessage(result),
      data: _.cloneDeep(mvuSnapshot),
      extra: {
        ...current.extra ?? {},
        [INTERACTION_KEY]: metadata
      }
    } ], {
      refresh: "affected"
    });
    const updated = getChatMessages(targetMessageId)[0];
    if (generation.cancelled || getCurrentChatId() !== generation.chatId || getLastMessageId() !== baseline || readInteractionMetadata(updated)?.operationId !== generation.operationId) {
      throw new Error("写入重答时聊天记录发生并发变化，已恢复原回复。");
    }
    return targetMessageId;
  };
  const finishDedicatedGeneration = (generation, messageId) => {
    invalidateStageSnapshot();
    selectedMessageId = messageId;
    selectedHistoryKind = "dialogue";
    rememberStageSelection(messageId);
    browsingHistory = false;
    viewRevision += 1;
    flushQueuedStream(generation);
    send(generation.source, {
      type: "complete",
      requestId: generation.requestId,
      messageId
    });
    if (activeGeneration === generation) activeGeneration = null;
    broadcastView();
  };
  const runDedicatedDialogueGeneration = async (generation, context, messages, mvuSnapshot) => {
    try {
      generation.sent = true;
      sendGenerationState(generation, "generating");
      const result = await (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_2__.generateDialogueReply)({
        generationId: generation.generationId,
        operationId: generation.operationId,
        baseMessageId: generation.operation === "reroll" && generation.userMessageId !== undefined ? generation.userMessageId : generation.baseMessageId,
        prompt: generation.rawUserText,
        context,
        messages,
        mvuData: mvuSnapshot
      });
      if (activeGeneration !== generation) return;
      if (generation.cancelled) throw new Error("本轮短对话已停止。");
      sendGenerationState(generation, "saving");
      const messageId = generation.operation === "reroll" ? await commitDedicatedDialogueReroll(generation, context, result, mvuSnapshot) : await commitDedicatedDialogue(generation, context, result, mvuSnapshot);
      if (activeGeneration !== generation) return;
      finishDedicatedGeneration(generation, messageId);
    } catch (error) {
      try {
        await rollbackDialogueOperation(generation);
      } catch (rollbackError) {
        console.error("[灯火阑珊·短对话] 回滚未完成，请检查本轮 operationId", rollbackError);
      }
      if (activeGeneration !== generation) return;
      discardQueuedStream();
      if (generation.cancelled) {
        send(generation.source, {
          type: "complete",
          requestId: generation.requestId,
          messageId: generation.baseMessageId
        });
      } else {
        send(generation.source, {
          type: "error",
          requestId: generation.requestId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
      activeGeneration = null;
      broadcastView();
    }
  };
  const beginGeneration = (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "已有一场生成正在进行。"
      });
      return;
    }
    const prompt = request.prompt.trim();
    const entries = getStageEntries();
    const requestedHistory = request.interaction.mode;
    const anchor = getGenerationAnchor(requestedHistory, entries);
    if (!prompt) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "输入内容不能为空。"
      });
      return;
    }
    if (anchor === undefined || request.messageId !== anchor) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: requestedHistory === "dialogue" ? "这不是最新一段交谈，请先返回最新交谈。" : "这不是最新正文，请先返回最新正文。"
      });
      return;
    }
    const dialogue = request.interaction.mode === "dialogue" ? normalizeDialogueContext(request.interaction) : null;
    const interaction = dialogue ?? STORY_INTERACTION;
    setActiveInteraction(interaction);
    if (dialogue) {
      try {
        const baselineLastMessageId = getLastMessageId();
        const baseMessageId = latestStageId() ?? request.messageId;
        const messages = getAllMessages();
        const mvuSnapshot = getDialogueMvuSnapshot(baseMessageId);
        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const generation = {
          requestId: request.requestId,
          source,
          operation: "generate",
          state: "preparing",
          baseMessageId,
          interaction: dialogue,
          rawUserText: prompt,
          engine: "dedicated",
          generationId: `dhl-dialogue-${nonce}`,
          operationId: `dhl-dialogue-write-${nonce}`,
          chatId: getCurrentChatId(),
          baselineLastMessageId,
          sent: false,
          received: false,
          streamText: "",
          streamReaction: ""
        };
        activeGeneration = generation;
        selectedHistoryKind = "dialogue";
        browsingHistory = false;
        sendGenerationState(generation, "preparing");
        applyStageVisibility();
        void runDedicatedDialogueGeneration(generation, dialogue, messages, mvuSnapshot);
      } catch (error) {
        send(source, {
          type: "error",
          requestId: request.requestId,
          message: error instanceof Error ? error.message : String(error)
        });
        activeGeneration = null;
        broadcastView();
      }
      return;
    }
    activeGeneration = {
      requestId: request.requestId,
      source,
      operation: "generate",
      state: "preparing",
      baseMessageId: request.messageId,
      interaction,
      rawUserText: prompt,
      engine: "native",
      sent: false,
      received: false,
      streamText: "",
      streamReaction: ""
    };
    selectedHistoryKind = "story";
    browsingHistory = false;
    sendGenerationState(activeGeneration, "preparing");
    applyStageVisibility();
    try {
      triggerNativeSend(prompt);
      window.setTimeout(() => {
        if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
        send(source, {
          type: "error",
          requestId: request.requestId,
          message: "酒馆没有开始生成，请检查连接和发送按钮状态。"
        });
        activeGeneration = null;
        broadcastView();
      }, 1800);
    } catch (error) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
      activeGeneration = null;
      broadcastView();
    }
  };
  const routeNativeDialoguePrompt = prompt => {
    if (activeInteraction.mode !== "dialogue") return false;
    const source = getActiveSource();
    const anchor = getGenerationAnchor("dialogue");
    if (!source || anchor === undefined) return false;
    const requestId = `native-dialogue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    beginGeneration({
      channel: _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_CHANNEL,
      version: _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION,
      type: "generate",
      requestId,
      messageId: anchor,
      prompt,
      interaction: {
        ...activeInteraction
      }
    }, source);
    return activeGeneration?.requestId === requestId;
  };
  const interceptNativeDialogueSend = event => {
    if (activeInteraction.mode !== "dialogue") return;
    const textarea = tavernDocument.querySelector("#send_textarea");
    const prompt = textarea?.value.trim() ?? "";
    if (!prompt || prompt.startsWith("/")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null || browsingHistory) {
      toastr.warning(browsingHistory ? "请先返回最新回合再继续交谈。" : "当前仍有操作正在进行。");
      return;
    }
    if (!routeNativeDialoguePrompt(prompt) || !textarea) {
      toastr.error("伪同层尚未就绪，未发送本轮交谈。");
      return;
    }
    textarea.value = "";
    textarea.dispatchEvent(new Event("input", {
      bubbles: true
    }));
    textarea.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  };
  const handleNativeSendClick = event => {
    const target = event.target;
    if (typeof target?.closest !== "function" || !target.closest("#send_but")) return;
    interceptNativeDialogueSend(event);
  };
  const handleNativeSendSubmit = event => {
    const target = event.target;
    if (typeof target?.closest !== "function" || !target.closest("#form_sheld")) return;
    interceptNativeDialogueSend(event);
  };
  const handleNativeSendKeydown = event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    const target = event.target;
    if (typeof target?.matches !== "function" || !target.matches("#send_textarea")) return;
    if (!event.ctrlKey && !event.metaKey) return;
    interceptNativeDialogueSend(event);
  };
  const installNativeDialogueBridge = () => {
    tavernDocument.addEventListener("click", handleNativeSendClick, true);
    tavernDocument.addEventListener("submit", handleNativeSendSubmit, true);
    tavernDocument.addEventListener("keydown", handleNativeSendKeydown, true);
  };
  const removeNativeDialogueBridge = () => {
    tavernDocument.removeEventListener("click", handleNativeSendClick, true);
    tavernDocument.removeEventListener("submit", handleNativeSendSubmit, true);
    tavernDocument.removeEventListener("keydown", handleNativeSendKeydown, true);
  };
  const beginReroll = (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "已有一场生成正在进行。"
      });
      return;
    }
    const messages = getAllMessages();
    const message = messages.find(item => item.message_id === request.messageId);
    const metadata = resolveAssistantInteractionMetadata(message, messages);
    const latest = latestStageId();
    if (request.messageId !== latest) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "只能重答时间线中的最新回复，请先返回最新。"
      });
      return;
    }
    if (metadata) {
      try {
        if (!message || message.role !== "assistant") throw new Error("没有找到需要重答的角色回复。");
        const context = toDialogueContext(metadata);
        const linkedUser = (metadata.userMessageId !== undefined ? messages.find(item => item.role === "user" && item.message_id === metadata.userMessageId) : undefined) ?? findPreviousUserMessage(messages, request.messageId);
        if (!linkedUser) throw new Error("没有找到这条角色回复对应的玩家发言。");
        const rerollUserText = (metadata.rawUserText ?? String(linkedUser.message ?? "").replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, "")).trim();
        if (!rerollUserText) throw new Error("这轮交谈没有可用于重答的玩家发言。");
        const mvuSnapshot = getDialogueMvuSnapshot(linkedUser.message_id);
        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        setActiveInteraction(context);
        const lockedView = makeView();
        const generation = {
          requestId: request.requestId,
          source,
          operation: "reroll",
          state: "preparing",
          baseMessageId: request.messageId,
          interaction: context,
          rawUserText: rerollUserText,
          engine: "dedicated",
          generationId: `dhl-dialogue-reroll-${nonce}`,
          operationId: `dhl-dialogue-reroll-write-${nonce}`,
          chatId: getCurrentChatId(),
          baselineLastMessageId: getLastMessageId(),
          userMessageId: linkedUser.message_id,
          sent: false,
          received: false,
          streamText: "",
          streamReaction: "",
          lockedView,
          rerollOriginal: captureNativeRerollOriginal(message)
        };
        activeGeneration = generation;
        parkSourceFrame(request.messageId, source);
        selectedHistoryKind = "dialogue";
        browsingHistory = false;
        sendGenerationState(generation, "preparing");
        applyStageVisibility();
        void runDedicatedDialogueGeneration(generation, context, messages, mvuSnapshot);
      } catch (error) {
        send(source, {
          type: "error",
          requestId: request.requestId,
          message: error instanceof Error ? error.message : String(error)
        });
        activeGeneration = null;
        broadcastView();
      }
      return;
    }
    const previousUser = findPreviousUserMessage(messages, request.messageId);
    if (!message || message.role !== "assistant") {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到需要重答的正文。"
      });
      return;
    }
    if (!previousUser) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到这条正文对应的玩家发言。"
      });
      return;
    }
    const rerollUserText = String(previousUser?.message ?? "").replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, "").trim();
    if (!rerollUserText) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "这轮正文没有可用于重答的玩家发言。"
      });
      return;
    }
    const nativeSwipeMessage = getNativeSwipeMessage(request.messageId);
    if (!nativeSwipeMessage) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到酒馆原生重生成数据。"
      });
      return;
    }
    try {
      repairNativeSwipeState(request.messageId, nativeSwipeMessage);
    } catch (error) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
      return;
    }
    const interaction = STORY_INTERACTION;
    setActiveInteraction(interaction);
    const lockedView = makeView();
    const generation = {
      requestId: request.requestId,
      source,
      operation: "reroll",
      state: "preparing",
      baseMessageId: request.messageId,
      interaction,
      rawUserText: rerollUserText,
      engine: "native",
      userMessageId: previousUser?.message_id,
      chatId: getCurrentChatId(),
      sent: false,
      received: false,
      streamText: "",
      streamReaction: "",
      lockedView,
      rerollOriginal: captureNativeRerollOriginal(message),
      nativeSwipeOriginal: _.cloneDeep(nativeSwipeMessage)
    };
    activeGeneration = generation;
    persistPendingNativeReroll(generation);
    parkSourceFrame(request.messageId, source);
    selectedHistoryKind = "story";
    browsingHistory = false;
    sendGenerationState(generation, "preparing");
    applyStageVisibility();
    void triggerNativeReroll(request.messageId).catch(async error => {
      const generation = activeGeneration;
      if (!generation || generation.requestId !== request.requestId) return;
      const materialized = await waitForNativeSwipeMaterialized(request.messageId, 3e3, generation);
      if (materialized) {
        console.warn("[灯火阑珊·伪同层] 酒馆在重生成完成后报告 swipe 收尾异常，已保留新回复", error);
        void finishMessage(request.messageId);
        return;
      }
      console.error("[灯火阑珊·伪同层] 原生重生成失败", error);
      await failNativeReroll(generation, error);
    });
    window.setTimeout(() => {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
      void failNativeReroll(activeGeneration, new Error("酒馆没有开始重生成，请检查连接状态。"));
    }, 1e4);
    window.setTimeout(() => {
      const stalledGeneration = activeGeneration;
      if (!stalledGeneration || stalledGeneration.requestId !== request.requestId || stalledGeneration.operation !== "reroll" || stalledGeneration.engine !== "native") {
        return;
      }
      void failNativeReroll(stalledGeneration, new Error("重答长时间未能完整结束"));
    }, 15 * 60 * 1e3);
  };
  const finishingMessages = new Map;
  const recentlyFinishedMessages = new Map;
  const FINISH_DEDUP_WINDOW_MS = 2500;
  const finishMessageInternal = async messageId => {
    const generation = activeGeneration;
    if (generation?.engine === "native" && generation.operation === "reroll" && (generation.cancelled || messageId !== generation.baseMessageId)) {
      return false;
    }
    if (generation) {
      generation.received = true;
      sendGenerationState(generation, "saving");
    }
    try {
      if (generation?.engine === "native" && generation.operation === "reroll") {
        if (!await waitForNativeSwipeMaterialized(messageId, 5e3, generation)) {
          throw new Error("酒馆尚未完成重生成候选的写入，请稍后再试。");
        }
        await new Promise(resolve => window.setTimeout(resolve, 320));
        if (activeGeneration !== generation || generation.cancelled) {
          throw new Error("重答在完成前被终止");
        }
      }
      if (generation?.interaction.mode === "dialogue") {
        await writeInteractionMetadata(messageId, generation.interaction, {
          rawUserText: generation.rawUserText,
          userMessageId: generation.userMessageId
        });
      } else if (!generation) {
        const messages = getAdjacentMessages(messageId);
        const message = messages.find(item => item.message_id === messageId);
        const metadata = resolveAssistantInteractionMetadata(message, messages);
        if (metadata) {
          await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
            rawUserText: metadata.rawUserText,
            userMessageId: metadata.userMessageId
          });
        }
      }
      await ensurePseudoMarker(messageId, generation?.engine === "native" ? "none" : "affected");
      if (generation?.engine === "native" && generation.operation === "reroll") {
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
        send(generation.source, {
          type: "complete",
          requestId: generation.requestId,
          messageId
        });
      }
      activeGeneration = null;
      broadcastView();
      return true;
    } catch (error) {
      console.error("[灯火阑珊·伪同层] 回复收尾失败", error);
      if (generation) {
        if (generation.engine === "native" && generation.operation === "reroll") {
          await failNativeReroll(generation, error);
          return false;
        }
        send(generation.source, {
          type: "error",
          requestId: generation.requestId,
          message: error instanceof Error ? error.message : String(error)
        });
      }
      activeGeneration = null;
      broadcastView();
      return false;
    }
  };
  const finishMessage = messageId => {
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
    const task = finishMessageInternal(messageId).then(finished => {
      if (finished) recentlyFinishedMessages.set(messageId, Date.now());
    }).finally(() => {
      finishingMessages.delete(messageId);
    });
    finishingMessages.set(messageId, task);
    return task;
  };
  const repairDialogueMetadata = async messageId => {
    const messages = getAdjacentMessages(messageId);
    const message = messages.find(item => item.message_id === messageId);
    if (!message || readInteractionMetadata(message)) return;
    const metadata = resolveAssistantInteractionMetadata(message, messages);
    if (!metadata) return;
    await writeInteractionMetadata(messageId, toDialogueContext(metadata), {
      rawUserText: metadata.rawUserText,
      userMessageId: metadata.userMessageId
    });
    invalidateStageSnapshot();
    viewRevision += 1;
    broadcastView();
  };
  const selectStage = (target, history) => {
    const entries = getStageEntries();
    selectedMessageId = target;
    selectedHistoryKind = history ?? null;
    if (history) selectedHistoryMessageIds[history] = target; else rememberStageSelection(target, entries);
    const scopedEntries = history ? getHistoryEntries(entries, history) : entries;
    browsingHistory = target !== scopedEntries.at(-1)?.representativeMessageId;
    viewRevision += 1;
    broadcastView();
    getMessageElement(getHostStageId() ?? target)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  const navigate = request => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
    const entries = getStageEntries();
    const historyEntries = request.history ? getHistoryEntries(entries, request.history) : entries;
    const ids = historyEntries.map(entry => entry.representativeMessageId);
    const selected = request.history ? resolveHistorySelection(entries, request.history) : request.messageId;
    const position = selected === null ? -1 : ids.indexOf(selected);
    if (position < 0) return;
    const target = request.direction === "previous" ? ids[position - 1] : ids[position + 1];
    if (target === undefined) return;
    selectStage(target, request.history);
  };
  const selectHistory = history => {
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
  const deleteLatestTurn = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行。"
      });
      return;
    }
    const entries = getStageEntries();
    const latest = entries.at(-1);
    if (!latest || request.messageId !== latest.representativeMessageId) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "只能删除最新回合，请先返回最新。"
      });
      return;
    }
    if (entries.length === 1 && (latest.stage.kind !== "dialogue" || latest.stage.turnCount <= 1)) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "至少需要保留一个伪同层回合。"
      });
      return;
    }
    const messages = getAllMessages();
    const assistant = messages.find(message => message.role === "assistant" && message.message_id === latest.representativeMessageId);
    if (!assistant) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到要删除的回复。"
      });
      return;
    }
    const metadata = resolveAssistantInteractionMetadata(assistant, messages);
    const explicitUser = Number.isFinite(metadata?.userMessageId) ? messages.find(message => message.role === "user" && message.message_id === metadata?.userMessageId) : undefined;
    const previousUser = findPreviousUserMessage(messages, assistant.message_id);
    const linkedUser = explicitUser ?? (previousUser?.message_id === assistant.message_id - 1 ? previousUser : undefined);
    const messageIds = [ assistant.message_id, ...linkedUser ? [ linkedUser.message_id ] : [] ].sort((left, right) => left - right);
    deletingMessageId = assistant.message_id;
    try {
      await deleteChatMessages(messageIds, {
        refresh: "affected"
      });
      invalidateStageSnapshot();
      selectedMessageId = latestStageId() ?? null;
      selectedHistoryKind = null;
      if (selectedMessageId !== null) rememberStageSelection(selectedMessageId);
      browsingHistory = false;
      viewRevision += 1;
      send(source, {
        type: "deleted",
        requestId: request.requestId,
        deletedMessageId: assistant.message_id
      });
    } catch (error) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      deletingMessageId = null;
      scheduleViewRefresh(120, true);
    }
  };
  const updateMessageContent = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行。"
      });
      return;
    }
    const messageId = Math.trunc(request.messageId);
    const entry = getStageEntries().find(candidate => candidate.representativeMessageId === messageId || candidate.messageIds.includes(messageId));
    if (!Number.isFinite(messageId) || !entry) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前回合已经变化，请重新打开原文编辑器。"
      });
      return;
    }
    const message = getChatMessages(messageId)[0];
    if (!message || message.role !== "assistant") {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到需要编辑的角色回复。"
      });
      return;
    }
    const chatId = getCurrentChatId();
    updatingMessageId = messageId;
    try {
      await setChatMessages([ {
        message_id: messageId,
        message: buildEditedMessage(String(request.content ?? ""))
      } ], {
        refresh: "affected"
      });
      if (getCurrentChatId() !== chatId) throw new Error("保存期间聊天已经切换，本次编辑未完成。");
      invalidateStageSnapshot();
      if (entry.representativeMessageId === messageId) {
        selectedMessageId = messageId;
        rememberStageSelection(messageId);
      }
      viewRevision += 1;
      send(source, {
        type: "message_updated",
        requestId: request.requestId,
        messageId
      });
      broadcastView();
    } catch (error) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      updatingMessageId = null;
      scheduleViewRefresh(120, true);
    }
  };
  const updateUserMessageContent = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行。"
      });
      return;
    }
    const messageId = Math.trunc(request.messageId);
    const userMessageId = Math.trunc(request.userMessageId);
    const content = String(request.content ?? "").trim();
    const snapshot = getStageSnapshot();
    const entry = snapshot.entries.find(candidate => candidate.messageIds.includes(messageId));
    const assistant = snapshot.messagesById.get(messageId);
    const metadata = resolveAssistantInteractionMetadata(assistant, snapshot.messages);
    const previous = snapshot.previousMessages.get(messageId);
    const linkedUser = (metadata?.userMessageId !== undefined ? snapshot.messagesById.get(metadata.userMessageId) : undefined) ?? (previous?.role === "user" ? previous : undefined);
    if (!Number.isFinite(messageId) || !Number.isFinite(userMessageId) || !entry || assistant?.role !== "assistant") {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前回合已经变化，请重新打开输入编辑器。"
      });
      return;
    }
    if (!linkedUser || linkedUser.role !== "user" || linkedUser.message_id !== userMessageId) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到这条回复对应的玩家输入。"
      });
      return;
    }
    if (!content) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "玩家输入不能为空。"
      });
      return;
    }
    const chatId = getCurrentChatId();
    updatingMessageId = userMessageId;
    try {
      const updates = [ {
        message_id: userMessageId,
        message: content
      } ];
      if (metadata) {
        const context = toDialogueContext(metadata);
        const existingUserMetadata = readInteractionMetadata(linkedUser);
        const userMetadata = {
          ...existingUserMetadata,
          version: 2,
          kind: "dialogue",
          ...context,
          engine: existingUserMetadata?.engine ?? metadata.engine ?? "native",
          ...existingUserMetadata?.operationId ?? metadata.operationId ? {
            operationId: existingUserMetadata?.operationId ?? metadata.operationId
          } : {},
          rawUserText: content,
          userMessageId
        };
        const assistantMetadata = {
          ...metadata,
          version: 2,
          kind: "dialogue",
          ...context,
          rawUserText: content,
          userMessageId
        };
        updates[0] = {
          message_id: userMessageId,
          message: decorateDialogueInput(content, context),
          extra: {
            ...linkedUser.extra ?? {},
            [INTERACTION_KEY]: userMetadata
          }
        };
        updates.push({
          message_id: messageId,
          extra: {
            ...assistant.extra ?? {},
            [INTERACTION_KEY]: assistantMetadata
          }
        });
      }
      await setChatMessages(updates, {
        refresh: "affected"
      });
      if (getCurrentChatId() !== chatId) throw new Error("保存期间聊天已经切换，本次编辑未完成。");
      invalidateStageSnapshot();
      viewRevision += 1;
      send(source, {
        type: "message_updated",
        requestId: request.requestId,
        messageId,
        userMessageId
      });
      broadcastView();
    } catch (error) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      updatingMessageId = null;
      scheduleViewRefresh(120, true);
    }
  };
  const handleMessage = event => {
    if (!(0, _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.isPseudoLayerRequest)(event.data)) return;
    const request = event.data;
    const source = asReplyTarget(event.source);
    if (!source) return;
    rememberSourceProtocolVersion(source, request.version);
    if (request.type === "hello") {
      const messageId = getSourceMessageId(source) ?? request.messageId;
      const isHeartbeat = registrations.get(messageId) === source && getSourceMessageId(source) === messageId;
      const previousSource = registrations.get(messageId);
      if (previousSource && previousSource !== source) {
        const previousFrame = getFrameForSource(previousSource);
        if (previousFrame?.closest(`#${STAGE_ROOT_ID}`) && hasMountedPseudoApp(previousFrame)) {
          send(source, {
            type: "ready",
            busy: activeGeneration !== null || deletingMessageId !== null || updatingMessageId !== null,
            requestId: activeGeneration?.requestId,
            operation: activeGeneration?.operation
          });
          return;
        }
      }
      registrations.set(messageId, source);
      if (selectedHistoryKind === null && !browsingHistory && !activeGeneration) {
        selectedMessageId = latestStageId() ?? messageId;
      }
      if (activeGeneration?.operation === "reroll" && messageId === activeGeneration.baseMessageId) {
        activeGeneration.source = source;
      }
      send(source, {
        type: "ready",
        busy: activeGeneration !== null || deletingMessageId !== null || updatingMessageId !== null,
        requestId: activeGeneration?.requestId,
        operation: activeGeneration?.operation
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
    if (request.type === "goodbye") {
      const messageId = getSourceMessageId(source) ?? request.messageId;
      if (registrations.get(messageId) === source) registrations.delete(messageId);
      sourceProtocolVersions.delete(source);
      broadcastView();
      return;
    }
    if (request.type === "generate") {
      beginGeneration(request, source);
      return;
    }
    if (request.type === "reroll") {
      beginReroll(request, source);
      return;
    }
    if (request.type === "delete_message") {
      void deleteLatestTurn(request, source);
      return;
    }
    if (request.type === "update_message") {
      void updateMessageContent(request, source);
      return;
    }
    if (request.type === "update_user_message") {
      void updateUserMessageContent(request, source);
      return;
    }
    if (request.type === "stop") {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId) return;
      const generation = activeGeneration;
      generation.cancelled = true;
      sendGenerationState(generation, "stopping", source);
      if (generation.engine === "dedicated") {
        if (generation.generationId) stopGenerationById(generation.generationId);
        window.setTimeout(() => {
          if (activeGeneration !== generation || !generation.cancelled) return;
          discardQueuedStream();
          send(generation.source, {
            type: "complete",
            requestId: generation.requestId,
            messageId: generation.baseMessageId
          });
          activeGeneration = null;
          broadcastView();
        }, 3e3);
      } else {
        SillyTavern.stopGeneration();
        if (generation.operation === "reroll") {
          void failNativeReroll(generation, new Error("重答已被终止"));
        }
      }
      return;
    }
    if (request.type === "navigate") {
      if (getSourceMessageId(source) === undefined) return;
      navigate(request);
      return;
    }
    if (request.type === "timeline_page") {
      if (getSourceMessageId(source) === undefined) return;
      sendTimelinePage(source, request);
      return;
    }
    if (request.type === "select_entry") {
      if (getSourceMessageId(source) === undefined || activeGeneration) return;
      const entry = getStageEntries().find(candidate => candidate.representativeMessageId === request.messageId || candidate.messageIds.includes(request.messageId));
      if (entry) selectStage(entry.representativeMessageId, entry.stage.kind);
      return;
    }
    if (request.type === "select_history") {
      if (getSourceMessageId(source) === undefined) return;
      selectHistory(request.history);
      return;
    }
    if (request.type === "return_latest") {
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
    if (request.type === "set_interaction") {
      if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) return;
      const interaction = normalizeDialogueContext(request.interaction);
      if (!interaction) {
        send(source, {
          type: "error",
          message: "交谈目标无效，请重新选择。"
        });
        return;
      }
      setActiveInteraction(interaction);
      viewRevision += 1;
      broadcastView();
      return;
    }
    if (request.type === "end_interaction") {
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
  const handleMessageSent = async messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    const source = getActiveSource();
    if (!source) return;
    const message = getChatMessages(messageId)[0];
    if (!activeGeneration) {
      const interaction = activeInteraction.mode === "dialogue" ? {
        ...activeInteraction
      } : STORY_INTERACTION;
      activeGeneration = {
        requestId: `native-${Date.now()}`,
        source,
        operation: "generate",
        state: "generating",
        baseMessageId: latestStageId() ?? messageId - 1,
        interaction,
        rawUserText: String(message?.message ?? "").trim(),
        engine: "native",
        userMessageId: messageId,
        sent: true,
        received: false,
        streamText: "",
        streamReaction: ""
      };
    } else {
      activeGeneration.sent = true;
      activeGeneration.userMessageId = messageId;
    }
    if (activeGeneration.interaction.mode === "dialogue" && message) {
      const rawUserText = activeGeneration.rawUserText || String(message.message ?? "").trim();
      activeGeneration.rawUserText = rawUserText;
      const decorated = decorateDialogueInput(rawUserText, activeGeneration.interaction);
      await setChatMessages([ {
        message_id: messageId,
        message: decorated,
        extra: {
          ...message.extra ?? {},
          [INTERACTION_KEY]: {
            version: 2,
            kind: "dialogue",
            ...activeGeneration.interaction,
            engine: "native",
            rawUserText
          }
        }
      } ], {
        refresh: "none"
      });
    }
    invalidateStageSnapshot();
    sendGenerationState(activeGeneration, "generating", source);
    applyStageVisibility();
  };
  const isControllerLoaderFrame = frame => {
    if (frame === controllerFrame) return false;
    try {
      const loaderSource = frame.contentDocument?.body?.textContent?.trim().replace(/\\/g, "/") ?? "";
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
    getControllerObservationRoot()?.querySelectorAll("iframe").forEach(frame => {
      if (!isControllerLoaderFrame(frame)) return;
      console.warn("[灯火阑珊·伪同层] 已卸载重复控制器");
      frame.remove();
    });
  };
  const scheduleDuplicateControllerPrune = frame => {
    if (frame === controllerFrame) return;
    const pruneFrame = () => {
      if (controllerDisposed || !frame.isConnected || !isControllerLoaderFrame(frame)) return;
      console.warn("[灯火阑珊·伪同层] 已卸载延迟载入的重复控制器");
      frame.remove();
    };
    frame.addEventListener("load", pruneFrame, {
      once: true
    });
    duplicatePruneTimers.push(window.setTimeout(pruneFrame, 0));
  };
  const inspectAddedControllerNode = node => {
    if (node.nodeType !== 1) return;
    const element = node;
    if (element.tagName === "IFRAME") {
      scheduleDuplicateControllerPrune(element);
      return;
    }
    element.querySelectorAll(":scope > iframe, :scope > * > iframe").forEach(scheduleDuplicateControllerPrune);
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
      subtree: true
    });
  };
  const disposeController = () => {
    if (controllerDisposed) return;
    const disposingGeneration = activeGeneration;
    controllerDisposed = true;
    if (disposingGeneration?.engine === "dedicated") {
      disposingGeneration.cancelled = true;
      if (disposingGeneration.generationId) stopGenerationById(disposingGeneration.generationId);
    } else if (disposingGeneration?.engine === "native" && disposingGeneration.operation === "reroll") {
      disposingGeneration.cancelled = true;
      try {
        SillyTavern.stopGeneration();
      } catch (error) {
        console.warn("[灯火阑珊·伪同层] 控制器卸载时停止重答失败，将继续恢复旧回复", error);
      }
      void waitForNativeRerollToSettle(disposingGeneration).then(() => rollbackNativeReroll(disposingGeneration)).catch(error => {
        console.error("[灯火阑珊·伪同层] 控制器卸载时恢复旧回复失败", error);
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
    sourceFrameCache = new WeakMap;
    invalidateStageSnapshot();
    discardQueuedStream();
    tavernWindow.removeEventListener("message", handleMessage);
    nativeInputMedia.removeEventListener("change", handleNativeInputViewportChange);
    removeNativeDialogueBridge();
    releaseParkedFrames();
    tavernDocument.getElementById(STYLE_ID)?.remove();
    tavernDocument.body.classList.remove("dhl-pseudo-layer-active", "dhl-native-input-collapsed", ROOT_ACTIVE_CLASS);
    tavernDocument.querySelectorAll("#chat > .mes").forEach(element => {
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
    dispose: disposeController
  };
  installDuplicateControllerObserver();
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_SENT, messageId => {
    void handleMessageSent(Number(messageId)).catch(error => {
      console.error("[灯火阑珊·伪同层] 写入交谈楼层元数据失败", error);
    });
  }));
  controllerEventStops.push(eventOn(tavern_events.GENERATION_STARTED, () => {
    if (!activeGeneration || activeGeneration.engine !== "native") return;
    activeGeneration.sent = true;
    sendGenerationState(activeGeneration, "generating");
  }));
  controllerEventStops.push(eventOn(tavern_events.STREAM_TOKEN_RECEIVED, text => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "native" || generation.cancelled) return;
    generation.streamText = text;
    const reasoning = updateGenerationReasoning(generation, readNativeLiveReasoning(generation));
    queueStream(generation, text, "", reasoning);
  }));
  controllerEventStops.push(eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text, generationId) => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "dedicated" || generation.cancelled || generation.generationId !== generationId || generation.interaction.mode !== "dialogue") {
      return;
    }
    const parsed = (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_2__.parseDialogueGeneration)(text, generation.interaction, generation.operationId ?? generation.requestId);
    generation.streamText = parsed.dialogue;
    generation.streamReaction = parsed.reaction;
    queueStream(generation, parsed.dialogue, parsed.reaction);
  }));
  controllerEventStops.push(eventOn(tavern_events.STREAM_REASONING_DONE, (reasoning, duration, messageId, state) => {
    if (activeGeneration?.engine === "dedicated") return;
    const source = getActiveSource();
    if (!source) return;
    const generation = activeGeneration?.engine === "native" ? activeGeneration : null;
    const completedReasoning = {
      messageId,
      text: reasoning,
      duration,
      state
    };
    if (generation) {
      generation.reasoning = completedReasoning;
      if (pendingStreamDispatch?.requestId === generation.requestId) {
        pendingStreamDispatch.reasoning = completedReasoning;
        flushQueuedStream(generation);
        return;
      }
    }
    send(source, {
      type: "reasoning",
      requestId: generation?.requestId,
      ...completedReasoning
    });
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_RECEIVED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    void finishMessage(Number(messageId));
  }));
  controllerEventStops.push(eventOn(tavern_events.GENERATION_ENDED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    const targetMessageId = Number(messageId);
    const generation = activeGeneration;
    if (generation?.engine === "native" && generation.operation === "reroll" && (generation.cancelled || targetMessageId !== generation.baseMessageId)) {
      void failNativeReroll(generation, new Error("重答没有形成完整回复"));
      return;
    }
    const shouldRepairDialogueMetadata = activeGeneration?.interaction.mode === "dialogue";
    void finishMessage(targetMessageId);
    if (shouldRepairDialogueMetadata) {
      window.setTimeout(() => {
        void repairDialogueMetadata(targetMessageId).catch(error => {
          console.warn("[灯火阑珊·伪同层] 交谈楼层元数据补写失败", error);
        });
      }, 500);
    }
  }));
  controllerEventStops.push(eventOn(tavern_events.GENERATION_STOPPED, () => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "native") return;
    generation.cancelled = true;
    if (generation.operation === "reroll") {
      void failNativeReroll(generation, new Error("重答在完成前被终止"));
      return;
    }
    window.setTimeout(async () => {
      if (!activeGeneration || activeGeneration.requestId !== generation.requestId || generation.received) return;
      flushQueuedStream(generation);
      send(generation.source, {
        type: "complete",
        requestId: generation.requestId,
        messageId: generation.baseMessageId
      });
      activeGeneration = null;
      broadcastView();
    }, 3e3);
  }));
  controllerEventStops.push(eventOn(tavern_events.MORE_MESSAGES_LOADED, () => {
    scheduleViewRefresh(300, true);
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_UPDATED, () => {
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_EDITED, () => {
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_SWIPED, () => {
    if (activeGeneration?.operation === "reroll") {
      scheduleViewRefresh(200, true);
      return;
    }
    viewRevision += 1;
    scheduleViewRefresh(200, true);
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_DELETED, () => {
    if (deletingMessageId !== null) return;
    if (activeGeneration?.operation === "reroll") {
      scheduleViewRefresh(200, true);
      return;
    }
    invalidateStageSnapshot();
    selectedMessageId = latestStageId() ?? null;
    selectedHistoryKind = null;
    browsingHistory = false;
    viewRevision += 1;
    scheduleViewRefresh(200);
  }));
  void waitGlobalInitialized("Mvu").then(() => {
    if (controllerDisposed) return;
    controllerEventStops.push(eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
      viewRevision += 1;
      scheduleViewRefresh(80, true);
    }));
  }).catch(error => {
    console.warn("[灯火阑珊·伪同层] MVU 更新事件监听未启用，将使用消息更新事件刷新", error);
  });
  controllerEventStops.push(eventOn(tavern_events.CHAT_CHANGED, () => {
    if (activeGeneration?.engine === "dedicated") {
      activeGeneration.cancelled = true;
      if (activeGeneration.generationId) stopGenerationById(activeGeneration.generationId);
    }
    getStageRoot(false)?.remove();
    tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
    registrations.clear();
    sourceProtocolVersions = new WeakMap;
    sourceFrameCache = new WeakMap;
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
    tavernDocument.body.classList.remove("dhl-pseudo-layer-active");
    scheduleViewRefresh(50);
    window.setTimeout(() => {
      void recoverFailedNativeRerolls().finally(parkLatestStageFrame);
    }, 300);
  }));
  installStyle();
  applyNativeInputState();
  tavernWindow.addEventListener("message", handleMessage);
  nativeInputMedia.addEventListener("change", handleNativeInputViewportChange);
  installFrameObserver();
  installNativeDialogueBridge();
  window.setTimeout(() => {
    void recoverFailedNativeRerolls().finally(parkLatestStageFrame);
  }, 600);
  duplicatePruneTimers.push(window.setTimeout(() => {
    if (!controllerDisposed) pruneDuplicateControllerFrames();
  }, 500));
  $(window).on("pagehide", disposeController);
  console.info(`[灯火阑珊·伪同层] 原生楼层控制器已连接 v${_pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION}`);
})();