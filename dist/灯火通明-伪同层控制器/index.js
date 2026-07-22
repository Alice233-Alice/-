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
      extractDialogueContent: () => extractDialogueContent,
      extractNarrative: () => extractNarrative,
      extractVariableUpdateDiagnostics: () => extractVariableUpdateDiagnostics,
      formatMessageHtml: () => formatMessageHtml,
      stripAuxiliaryPresentation: () => stripAuxiliaryPresentation,
      stripStructuredBlocks: () => stripStructuredBlocks
    });
    const STRUCTURAL_TAGS = [ "visual_cards", "pseudo_layer", "UpdateVariable", "JSONPatch", "StatusPlaceHolderImpl", "反应", "会话状态" ];
    const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const openTagPattern = tag => `<${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`;
    const closeTagPattern = tag => `<\\/${escapeRegExp(tag)}\\s*>`;
    const DIALOGUE_TAGS = [ "反应", "正文", "会话状态" ];
    const REASONING_OPEN_PATTERN = /<(?:think(?:ing)?|reasoning|thought|think_?fox~?)(?=[\s>])[^>]*>/gi;
    const REASONING_CLOSE_PATTERN = /<\/(?:think(?:ing)?|reasoning|thought|think_?fox~?)\s*>/gi;
    const stripReasoningPrefix = text => {
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      let lastClosingEnd = -1;
      let closingMatch;
      while ((closingMatch = REASONING_CLOSE_PATTERN.exec(text)) !== null) {
        lastClosingEnd = closingMatch.index + closingMatch[0].length;
      }
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      if (lastClosingEnd >= 0) return text.slice(lastClosingEnd);
      REASONING_OPEN_PATTERN.lastIndex = 0;
      const unfinishedOpening = REASONING_OPEN_PATTERN.exec(text);
      REASONING_OPEN_PATTERN.lastIndex = 0;
      return unfinishedOpening?.index === undefined ? text : text.slice(0, unfinishedOpening.index);
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
    const stripAuxiliaryPresentation = text => stripEmbeddedHtmlDocuments(stripReasoningPrefix(text)).trim();
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
      const updateOpen = /<update(?:variable)?(?=[\s/>])[^>]*>/i.exec(text);
      if (!updateOpen || updateOpen.index === undefined) return null;
      const updateStart = updateOpen.index + updateOpen[0].length;
      const updateRemainder = text.slice(updateStart);
      const updateCloseIndex = updateRemainder.search(/<\/update(?:variable)?\s*>/i);
      const updateBody = updateRemainder.slice(0, updateCloseIndex >= 0 ? updateCloseIndex : undefined);
      if (!/<(?:Analysis|JSONPatch)(?=[\s/>])/i.test(updateBody)) return null;
      const analysisBlock = readLooseTaggedContent(updateBody, "Analysis", [ "JSONPatch" ]);
      const patchBlock = readLooseTaggedContent(updateBody, "JSONPatch");
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
      let result = text;
      STRUCTURAL_TAGS.forEach(tag => {
        const open = openTagPattern(tag);
        const close = closeTagPattern(tag);
        result = result.replace(new RegExp(`${open}[\\s\\S]*?${close}`, "gi"), "").replace(new RegExp(`${open}[\\s\\S]*$`, "gi"), "").replace(new RegExp(`<${escapeRegExp(tag)}(?=[\\s/>])[^>]*/>`, "gi"), "");
      });
      return result.trim();
    };
    const extractNarrative = text => {
      const source = stripAuxiliaryPresentation(text);
      const completeBody = source.match(/<正文(?=[\s/>])[^>]*>([\s\S]*?)<\/正文\s*>/i)?.[1];
      const streamingBody = source.match(/<正文(?=[\s/>])[^>]*>([\s\S]*)$/i)?.[1];
      return stripStructuredBlocks(completeBody ?? streamingBody ?? source).replace(/<\/?正文(?=[\s/>])[^>]*>/gi, "").trim();
    };
    const extractDialogueContent = text => {
      const source = stripAuxiliaryPresentation(text);
      const hasReactionTag = /<反应(?=[\s/>])/i.test(source);
      const hasBodyTag = /<正文(?=[\s/>])/i.test(source);
      const reaction = hasReactionTag ? stripStructuredBlocks(readBoundedTaggedContent(source, "反应", [ "正文", "会话状态" ])) : "";
      const dialogue = hasBodyTag ? readBoundedTaggedContent(source, "正文", [ "反应", "会话状态" ], true) : hasReactionTag ? "" : extractNarrative(source);
      return {
        reaction: stripDialogueTagFragments(reaction),
        dialogue: unwrapDialogueQuotes(stripDialogueTagFragments(stripStructuredBlocks(dialogue)))
      };
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
  },
  "./src/灯火通明/pseudo-layer-protocol.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      PSEUDO_LAYER_CHANNEL: () => PSEUDO_LAYER_CHANNEL,
      PSEUDO_LAYER_VERSION: () => PSEUDO_LAYER_VERSION,
      isPseudoLayerRequest: () => isPseudoLayerRequest,
      isPseudoLayerResponse: () => isPseudoLayerResponse
    });
    const PSEUDO_LAYER_CHANNEL = "denghuolanshan:pseudo-layer";
    const PSEUDO_LAYER_VERSION = 7;
    const hasEnvelope = value => {
      if (!value || typeof value !== "object") return false;
      const message = value;
      return message.channel === PSEUDO_LAYER_CHANNEL && message.version === PSEUDO_LAYER_VERSION;
    };
    const REQUEST_TYPES = new Set([ "hello", "goodbye", "generate", "stop", "reroll", "delete_message", "navigate", "select_history", "return_latest", "set_interaction", "end_interaction", "toggle_native_input" ]);
    const RESPONSE_TYPES = new Set([ "ready", "view", "state", "stream", "reasoning", "complete", "deleted", "error" ]);
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
  var _dialogue_engine__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./dialogue-engine */ "./src/灯火通明-伪同层控制器/dialogue-engine.ts");
  const STYLE_ID = "dhl-pseudo-layer-controller-style";
  const INPUT_STORAGE_KEY = "denghuolanshan:pseudo-layer:native-input-collapsed";
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
  let nativeInputCollapsed = localStorage.getItem(INPUT_STORAGE_KEY) === "true";
  let viewRevision = 0;
  let frameObserver = null;
  let duplicateControllerObserver = null;
  let frameCandidateTimer = null;
  let viewRefreshTimer = null;
  let viewRefreshDeadline = 0;
  let stageSnapshotCache = null;
  let stageSnapshotLastMessageId = Number.NaN;
  let streamDispatchTimer = null;
  let pendingStreamDispatch = null;
  let controllerDisposed = false;
  const send = (source, message) => {
    source?.postMessage({
      channel: _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_CHANNEL,
      version: _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION,
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
  };
  const queueStream = (generation, text, reaction = "") => {
    pendingStreamDispatch = {
      requestId: generation.requestId,
      source: generation.source,
      text,
      ...reaction ? {
        reaction
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
    let messages = [];
    let assistantMessages;
    try {
      messages = [ ...getAllMessages() ].sort((left, right) => left.message_id - right.message_id);
      assistantMessages = messages.filter(message => message.role === "assistant");
    } catch (error) {
      console.warn("[灯火阑珊·伪同层] 读取完整聊天楼层失败，暂时使用页面楼层", error);
      assistantMessages = getAssistantMessagesFromDom().sort((left, right) => left.message_id - right.message_id);
    }
    const previousMessages = new Map;
    let previousMessage;
    messages.forEach(message => {
      if (previousMessage) previousMessages.set(message.message_id, previousMessage);
      previousMessage = message;
    });
    stageSnapshotCache = {
      assistantIds: new Set(assistantMessages.map(message => message.message_id)),
      entries: buildStageEntries(assistantMessages, previousMessages)
    };
    stageSnapshotLastMessageId = lastMessageId;
    return stageSnapshotCache;
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
      stage: entries[position]?.stage ?? {
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
    style.textContent = `\n    body.dhl-pseudo-layer-active #chat > .mes { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} {\n      display: flex !important;\n      width: 100% !important;\n      max-width: none !important;\n      padding: 0 !important;\n      margin: 0 !important;\n    }\n    #${STAGE_ROOT_ID} { display: none !important; }\n    body.${ROOT_ACTIVE_CLASS} #chat > .mes.${SELECTED_CLASS} { display: none !important; }\n    body.${ROOT_ACTIVE_CLASS} #${STAGE_ROOT_ID} {\n      display: block !important;\n      width: 100% !important;\n      max-width: none !important;\n      min-width: 0 !important;\n      padding: 0 !important;\n      margin: 0 !important;\n    }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} { display: none !important; }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS}.${ACTIVE_KEEPER_CLASS} {\n      display: block !important;\n      width: 100% !important;\n      min-width: 0 !important;\n    }\n    #${STAGE_ROOT_ID} > .${FRAME_KEEPER_CLASS} > iframe {\n      display: block !important;\n      width: 100% !important;\n      border: 0 !important;\n    }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .for_checkbox,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .del_checkbox,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .mesAvatarWrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipe_left,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} > .swipeRightBlock,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .ch_name,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_reasoning_details,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_media_wrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_file_wrapper,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_bias { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_block,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { width: 100% !important; max-width: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text { padding: 0 !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .mes_text > :not(.TH-render) { display: none !important; }\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render,\n    body.dhl-pseudo-layer-active #chat > .mes.${SELECTED_CLASS} .TH-render > iframe { width: 100% !important; }\n    body.dhl-native-input-collapsed #form_sheld { display: none !important; }\n  `;
    tavernDocument.head.append(style);
  };
  const buildMessage = reply => {
    const text = reply.trim();
    if (/<visual_cards>[\s\S]*?<\/visual_cards>/i.test(text) || /<pseudo_layer>[\s\S]*?<\/pseudo_layer>/i.test(text)) {
      return text;
    }
    return `${text}\n\n<pseudo_layer>\n灯火阑珊\n</pseudo_layer>`;
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
  const isNativeSwipePlaceholder = value => typeof value === "string" && value.trim() === "...";
  const repairNativeSwipeState = (messageId, message) => {
    if (!Array.isArray(message.swipes) || message.swipes.length === 0) return;
    const swipeId = message.swipe_id;
    const isValid = Number.isInteger(swipeId) && swipeId >= 0 && swipeId < message.swipes.length && typeof message.swipes[swipeId] === "string";
    if (isValid) return;
    const hasFailedTrailingCandidate = message.swipes.length > 1 && isNativeSwipePlaceholder(message.mes) && isNativeSwipePlaceholder(message.swipes.at(-1));
    if (hasFailedTrailingCandidate) {
      message.swipes.pop();
      if (Array.isArray(message.swipe_info) && message.swipe_info.length > message.swipes.length) {
        message.swipe_info.splice(message.swipes.length);
      }
    }
    const fallbackSwipeId = message.swipes.findLastIndex(value => typeof value === "string");
    if (fallbackSwipeId < 0) throw new Error(`第 ${messageId} 楼没有可恢复的重生成候选。`);
    message.swipe_id = fallbackSwipeId;
    message.mes = message.swipes[fallbackSwipeId];
    const swipeInfo = message.swipe_info?.[fallbackSwipeId];
    if (swipeInfo) {
      message.send_date = swipeInfo.send_date ?? message.send_date;
      message.gen_started = swipeInfo.gen_started;
      message.gen_finished = swipeInfo.gen_finished;
      message.extra = _.cloneDeep(swipeInfo.extra ?? message.extra ?? {});
    }
    console.warn(`[灯火阑珊·伪同层] 已修复第 ${messageId} 楼越界的 swipe_id：${String(swipeId)} -> ${fallbackSwipeId}`);
  };
  const isNativeSwipeMaterialized = messageId => {
    const message = getNativeSwipeMessage(messageId);
    if (!message) return false;
    if (!Number.isInteger(message.swipe_id) || !Array.isArray(message.swipes)) return true;
    return typeof message.swipes[message.swipe_id] === "string";
  };
  const waitForNativeSwipeMaterialized = async (messageId, timeout = 5e3) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (isNativeSwipeMaterialized(messageId)) return true;
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
    return isNativeSwipeMaterialized(messageId);
  };
  const getCurrentChatId = () => String(tavernWindow.SillyTavern?.getCurrentChatId?.() ?? "");
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
      const result = await (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_1__.generateDialogueReply)({
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
    if (activeGeneration || deletingMessageId !== null) {
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
    if (anchor === undefined || request.messageId !== anchor || selectedMessageId !== anchor) {
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
    if (activeGeneration || deletingMessageId !== null || browsingHistory) {
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
    if (activeGeneration || deletingMessageId !== null) {
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
    const historyKind = metadata ? "dialogue" : "story";
    const latest = getGenerationAnchor(historyKind);
    if (request.messageId !== latest || selectedMessageId !== latest) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: historyKind === "dialogue" ? "这不是最新一段交谈，请先返回最新交谈。" : "这不是最新正文，请先返回最新正文。"
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
          rerollOriginal: {
            messageId: message.message_id,
            message: String(message.message ?? ""),
            data: _.cloneDeep(message.data ?? {}),
            extra: _.cloneDeep(message.extra ?? {})
          }
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
    const rerollUserText = String(previousUser?.message ?? "").replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, "").trim();
    const interaction = STORY_INTERACTION;
    setActiveInteraction(interaction);
    const lockedView = makeView();
    activeGeneration = {
      requestId: request.requestId,
      source,
      operation: "reroll",
      state: "preparing",
      baseMessageId: request.messageId,
      interaction,
      rawUserText: rerollUserText,
      engine: "native",
      userMessageId: previousUser?.message_id,
      sent: false,
      received: false,
      streamText: "",
      streamReaction: "",
      lockedView
    };
    parkSourceFrame(request.messageId, source);
    selectedHistoryKind = "story";
    browsingHistory = false;
    sendGenerationState(activeGeneration, "preparing");
    applyStageVisibility();
    void triggerNativeReroll(request.messageId).catch(async error => {
      const materialized = await waitForNativeSwipeMaterialized(request.messageId, 1500);
      const generation = activeGeneration;
      if (!generation || generation.requestId !== request.requestId) return;
      if (generation.received || generation.streamText.trim() || materialized) {
        console.warn("[灯火阑珊·伪同层] 酒馆在重生成完成后报告 swipe 收尾异常，已保留新回复", error);
        if (materialized && !generation.received) void finishMessage(request.messageId);
        return;
      }
      console.error("[灯火阑珊·伪同层] 原生重生成失败", error);
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: error instanceof Error ? error.message : String(error)
      });
      activeGeneration = null;
      broadcastView();
    });
    window.setTimeout(() => {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "酒馆没有开始重生成，请检查连接状态。"
      });
      activeGeneration = null;
      broadcastView();
    }, 1800);
  };
  const finishingMessages = new Map;
  const recentlyFinishedMessages = new Map;
  const FINISH_DEDUP_WINDOW_MS = 2500;
  const finishMessageInternal = async messageId => {
    const generation = activeGeneration;
    if (generation) {
      generation.received = true;
      sendGenerationState(generation, "saving");
    }
    try {
      if (generation?.engine === "native" && generation.operation === "reroll" && !await waitForNativeSwipeMaterialized(messageId)) {
        throw new Error("酒馆尚未完成重生成候选的写入，请稍后再试。");
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
    } catch (error) {
      console.error("[灯火阑珊·伪同层] 回复收尾失败", error);
      if (generation) {
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
    const task = finishMessageInternal(messageId).finally(() => {
      finishingMessages.delete(messageId);
      recentlyFinishedMessages.set(messageId, Date.now());
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
    if (activeGeneration || deletingMessageId !== null) return;
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
    if (activeGeneration || deletingMessageId !== null) return;
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
    if (activeGeneration || deletingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行。"
      });
      return;
    }
    const entries = getStageEntries();
    const latest = entries.at(-1);
    if (!latest || request.messageId !== latest.representativeMessageId || selectedMessageId !== latest.representativeMessageId) {
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
  const handleMessage = event => {
    if (!(0, _pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.isPseudoLayerRequest)(event.data)) return;
    const request = event.data;
    const source = asReplyTarget(event.source);
    if (!source) return;
    if (request.type === "hello") {
      const messageId = getSourceMessageId(source) ?? request.messageId;
      const isHeartbeat = registrations.get(messageId) === source && getSourceMessageId(source) === messageId;
      const previousSource = registrations.get(messageId);
      if (previousSource && previousSource !== source) {
        const previousFrame = getFrameForSource(previousSource);
        if (previousFrame?.closest(`#${STAGE_ROOT_ID}`) && hasMountedPseudoApp(previousFrame)) {
          send(source, {
            type: "ready",
            busy: activeGeneration !== null || deletingMessageId !== null,
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
        busy: activeGeneration !== null || deletingMessageId !== null,
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
    if (request.type === "stop") {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId) return;
      const generation = activeGeneration;
      sendGenerationState(generation, "stopping", source);
      if (generation.engine === "dedicated") {
        generation.cancelled = true;
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
      }
      return;
    }
    if (request.type === "navigate") {
      if (getSourceMessageId(source) === undefined) return;
      navigate(request);
      return;
    }
    if (request.type === "select_history") {
      if (getSourceMessageId(source) === undefined) return;
      selectHistory(request.history);
      return;
    }
    if (request.type === "return_latest") {
      if (activeGeneration || deletingMessageId !== null) return;
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
      if (activeGeneration || deletingMessageId !== null) return;
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
    controllerDisposed = true;
    if (activeGeneration?.engine === "dedicated") {
      activeGeneration.cancelled = true;
      if (activeGeneration.generationId) stopGenerationById(activeGeneration.generationId);
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
    sourceFrameCache = new WeakMap;
    invalidateStageSnapshot();
    discardQueuedStream();
    tavernWindow.removeEventListener("message", handleMessage);
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
    if (!activeGeneration || activeGeneration.engine !== "native") return;
    activeGeneration.streamText = text;
    queueStream(activeGeneration, text);
  }));
  controllerEventStops.push(eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, (text, generationId) => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "dedicated" || generation.cancelled || generation.generationId !== generationId || generation.interaction.mode !== "dialogue") {
      return;
    }
    const parsed = (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_1__.parseDialogueGeneration)(text, generation.interaction, generation.operationId ?? generation.requestId);
    generation.streamText = parsed.dialogue;
    generation.streamReaction = parsed.reaction;
    queueStream(generation, parsed.dialogue, parsed.reaction);
  }));
  controllerEventStops.push(eventOn(tavern_events.STREAM_REASONING_DONE, (reasoning, duration, messageId, state) => {
    if (activeGeneration?.engine === "dedicated") return;
    const source = getActiveSource();
    if (!source) return;
    if (activeGeneration?.engine === "native") {
      activeGeneration.reasoning = {
        messageId,
        text: reasoning,
        duration,
        state
      };
    }
    send(source, {
      type: "reasoning",
      requestId: activeGeneration?.requestId,
      messageId,
      text: reasoning,
      duration,
      state
    });
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_RECEIVED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    void finishMessage(Number(messageId));
  }));
  controllerEventStops.push(eventOn(tavern_events.GENERATION_ENDED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    const targetMessageId = Number(messageId);
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
    window.setTimeout(() => {
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
  controllerEventStops.push(eventOn(tavern_events.CHAT_CHANGED, () => {
    if (activeGeneration?.engine === "dedicated") {
      activeGeneration.cancelled = true;
      if (activeGeneration.generationId) stopGenerationById(activeGeneration.generationId);
    }
    getStageRoot(false)?.remove();
    tavernDocument.body.classList.remove(ROOT_ACTIVE_CLASS);
    registrations.clear();
    sourceFrameCache = new WeakMap;
    pendingFrameCandidates.clear();
    finishingMessages.clear();
    recentlyFinishedMessages.clear();
    invalidateStageSnapshot();
    discardQueuedStream();
    activeGeneration = null;
    deletingMessageId = null;
    activeInteraction = STORY_INTERACTION;
    selectedMessageId = null;
    selectedHistoryKind = null;
    selectedHistoryMessageIds.story = null;
    selectedHistoryMessageIds.dialogue = null;
    browsingHistory = false;
    viewRevision += 1;
    tavernDocument.body.classList.remove("dhl-pseudo-layer-active");
    scheduleViewRefresh(50);
    window.setTimeout(parkLatestStageFrame, 300);
  }));
  installStyle();
  applyNativeInputState();
  tavernWindow.addEventListener("message", handleMessage);
  installFrameObserver();
  installNativeDialogueBridge();
  window.setTimeout(parkLatestStageFrame, 0);
  duplicatePruneTimers.push(window.setTimeout(() => {
    if (!controllerDisposed) pruneDuplicateControllerFrames();
  }, 500));
  $(window).on("pagehide", disposeController);
  console.info(`[灯火阑珊·伪同层] 原生楼层控制器已连接 v${_pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION}`);
})();