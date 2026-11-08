import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_jsonrepair_esm_703c329d__ from "https://testingcf.jsdelivr.net/npm/jsonrepair/+esm";

var __webpack_modules__ = {
  "./src/灯火通明-伪同层控制器/dialogue-engine.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      generateDialogueReply: () => generateDialogueReply,
      parseDialogueGeneration: () => parseDialogueGeneration
    });
    var jsonrepair__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jsonrepair */ "jsonrepair");
    var _player_input__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火通明/player-input */ "./src/灯火通明/player-input.ts");
    var _message_content__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../灯火通明/message-content */ "./src/灯火通明/message-content.ts");
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
      if (!value || value.version !== 1 && value.version !== 2 && value.version !== 3 || value.kind !== "dialogue" || value.channel !== "present" && value.channel !== "transmission") {
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
      return compactText((0, _player_input__WEBPACK_IMPORTED_MODULE_1__.readPlayerInput)(message, metadata?.rawUserText), 360);
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
        const assistantAnchor = compactText((0, _message_content__WEBPACK_IMPORTED_MODULE_2__.extractNarrative)(storyAssistant.message), MAX_CONTEXT_TEXT);
        prompts.push({
          role: "system",
          content: [ "【最近正文锚点，仅用于理解现场，不要续写成长篇剧情】", userAnchor && `用户：${userAnchor}`, assistantAnchor && `剧情：${assistantAnchor}` ].filter(Boolean).join("\n")
        });
      }
      const sessionTurns = messages.filter(message => message.role === "assistant" && message.message_id <= baseMessageId).flatMap(message => {
        const metadata = resolveAssistantMetadata(message, messages);
        if (!metadata || metadata.sessionId !== context.sessionId) return [];
        const linkedUser = Number.isFinite(metadata.userMessageId) ? messages.find(candidate => candidate.message_id === metadata.userMessageId) : findPreviousUser(messages, message.message_id);
        const visible = (0, _message_content__WEBPACK_IMPORTED_MODULE_2__.extractDialogueContent)(message.message);
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
    const buildDialogueContract = context => `\n【灯火阑珊·红颜专用短对话引擎】\n你现在只扮演「${context.targetName}」（规范角色名：${context.canonicalName}）直接回应用户。\n这是${context.channel === "present" ? "当面交谈" : "远程传讯"}，不是剧情续写任务。\n\n角色表现：\n- 必须遵守现有角色人设、关系阶段与世界事实，但允许回避、不同意、设立边界、反问或主动追问。\n- 回复除回答内容外，至少自然体现一种私人向量：个人立场、欲望、边界、具体记忆或言外之意。\n- 不要固定套用“回答后反问”的模板；角色没有必要每次都提问。\n- 不得替用户决定言行，不得无请求地跳时间、换地点、开启任务或推进成长篇剧情。\n\n输出结构：\n- 严格按 <反应>、<正文>、<会话状态>、<visual_cards>、<UpdateVariable> 的顺序输出，除此之外不得输出任何文字或 Markdown 代码块。\n- <反应> 最多 32 个汉字，只写一个短动作、停顿或神态，可以为空。${context.channel === "transmission" ? "本轮为远程传讯，<反应>必须为空，不能描写用户看不见的远端动作。" : ""}\n- <正文> 只写「${context.targetName}」亲口说出或传回的话，不写说话人标签，不用引号包裹整段。\n- 普通回应通常 30 至 70 字；复杂问答或明显情绪冲突可以更长，但 <反应> 与 <正文> 合计不得超过 160 字。\n- 不得输出旁白续写或其他结构块。\n\n立绘卡：\n- 每轮必须输出一张且只能一张「${context.targetName}」的 visual card；远程传讯也必须输出。\n- 格式为 <visual_cards>[{"name":"${context.targetName}","img_code":"normal","back_text":"即时心声"}]</visual_cards>。\n- img_code 仅限 normal、smile、shy、angry、sad、surprise；拿不准用 normal。back_text 要短且符合当前角色。\n\n受限变量：\n- 每轮必须输出标准 <UpdateVariable><Analysis>...</Analysis><JSONPatch>[...]</JSONPatch></UpdateVariable>；没有重要变化时 JSONPatch 输出 []。\n- 只能修改 /红颜/${context.canonicalName}/好感度、/关系、/关系上下文/当前情绪|态度缘由|关系诉求|相处禁忌|未了约定、/羁绊纪事/事件名。\n- 普通寒暄不得改变好感；只有明确交心、承诺、冲突或边界事件才可对好感 delta -1 或 1。\n- 关系仅在实际跨阶段时 replace；关系上下文单轮最多两项；羁绊纪事只记录以后确实需要记住的重要事件。\n- 禁止修改时间、地点、任务、物品、灵石、修炼、战斗、其他角色或任何未列出的字段。\n\n隐藏状态：\n<会话状态> 内输出一行严格 JSON，不得用代码围栏：\n{"emotion":"当前情绪","topic":"当前话题","subtext":"潜台词","unresolvedThreads":["未解线索"],"memoryEvents":[{"kind":"promise|boundary|conflict|disclosure","summary":"仅记录真正重要且以后应记住的事件","status":"open|resolved","resolves":[]}],"relationEvents":[]}\n- 没有重要记忆或关系事件时对应数组必须为空，不要把日常寒暄记为事件。\n- relationEvents 应与 UpdateVariable 中的实际变化一致；没有重要变化时必须为空。\n`.trim();
    const readCompleteTag = (text, tag) => text.match(new RegExp(`<${tag}(?=[\\s/>])[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "i"))?.[1]?.trim() ?? "";
    const stripDialogueTags = text => text.replace(/<\/?(?:反应|正文|会话状态|visual_cards|UpdateVariable|Analysis|JSONPatch)(?=[\s/>])[^>]*>/gi, "").trim();
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
    const normalizeVisualCard = (raw, context) => {
      const fallback = {
        name: context.targetName,
        img_code: "normal",
        back_text: ""
      };
      const body = readCompleteTag(raw, "visual_cards");
      if (!body) return fallback;
      try {
        const parsed = JSON.parse((0, jsonrepair__WEBPACK_IMPORTED_MODULE_0__.jsonrepair)(body));
        const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
        if (!isRecord(candidate)) return fallback;
        const allowedExpressions = new Set([ "normal", "smile", "shy", "angry", "sad", "surprise" ]);
        const imgCode = compactText(candidate.img_code, 24);
        return {
          name: context.targetName,
          img_code: allowedExpressions.has(imgCode) ? imgCode : "normal",
          back_text: compactText(candidate.back_text, 80)
        };
      } catch (error) {
        console.warn("[灯火阑珊·短对话] visual_cards 解析失败，已补用默认立绘卡", error);
        return fallback;
      }
    };
    const decodeJsonPointer = path => path.split("/").slice(1).map(segment => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
    const normalizeDialogueVariablePatches = (raw, context) => {
      const updateBody = readCompleteTag(raw, "UpdateVariable");
      const patchBody = readCompleteTag(updateBody || raw, "JSONPatch");
      if (!patchBody) return {
        patches: [],
        effects: {}
      };
      let candidates;
      try {
        candidates = JSON.parse((0, jsonrepair__WEBPACK_IMPORTED_MODULE_0__.jsonrepair)(patchBody));
      } catch (error) {
        console.warn("[灯火阑珊·短对话] JSONPatch 解析失败，本轮对白仍会保存但不更新变量", error);
        return {
          patches: [],
          effects: {}
        };
      }
      if (!Array.isArray(candidates)) return {
        patches: [],
        effects: {}
      };
      const patches = [];
      const effects = {};
      const relationContextFields = new Set([ "当前情绪", "态度缘由", "关系诉求", "相处禁忌", "未了约定" ]);
      let relationContextCount = 0;
      let chronicleCount = 0;
      let favorCount = 0;
      let relationshipCount = 0;
      candidates.forEach(candidate => {
        if (!isRecord(candidate) || typeof candidate.path !== "string") return;
        const segments = decodeJsonPointer(candidate.path);
        if (segments[0] !== "红颜" || segments[1] !== context.canonicalName) return;
        if (segments.length === 3 && segments[2] === "好感度" && candidate.op === "delta" && favorCount < 1) {
          const delta = Number(candidate.value);
          if (delta !== -1 && delta !== 1) return;
          patches.push({
            op: "delta",
            path: candidate.path,
            value: delta
          });
          favorCount += 1;
          effects.favor = true;
          return;
        }
        if (segments.length === 3 && segments[2] === "关系" && candidate.op === "replace" && relationshipCount < 1) {
          const value = compactText(candidate.value, 80);
          if (!value) return;
          patches.push({
            op: "replace",
            path: candidate.path,
            value
          });
          relationshipCount += 1;
          effects.relationship = true;
          return;
        }
        if (segments.length === 4 && segments[2] === "关系上下文" && relationContextFields.has(segments[3]) && candidate.op === "replace" && relationContextCount < 2) {
          const value = compactText(candidate.value, 180);
          if (!value) return;
          patches.push({
            op: "replace",
            path: candidate.path,
            value
          });
          relationContextCount += 1;
          effects.relationContext = true;
          return;
        }
        if (segments.length === 4 && segments[2] === "羁绊纪事" && (candidate.op === "insert" || candidate.op === "replace") && chronicleCount < 1 && isRecord(candidate.value)) {
          const summary = compactText(candidate.value.摘要, 180);
          if (!segments[3] || !summary) return;
          patches.push({
            op: candidate.op,
            path: candidate.path,
            value: {
              类型: compactText(candidate.value.类型, 20) || "其他",
              摘要: summary,
              时地: compactText(candidate.value.时地, 100)
            }
          });
          chronicleCount += 1;
          effects.chronicle = true;
        }
      });
      return {
        patches,
        effects
      };
    };
    const buildVariableUpdateBlock = patches => {
      if (patches.length === 0) return "";
      const labels = patches.map(patch => decodeJsonPointer(patch.path).slice(2).join("·"));
      return [ "<UpdateVariable>", `<Analysis>幕间交谈：${[ ...new Set(labels) ].join("、")}</Analysis>`, `<JSONPatch>${JSON.stringify(patches)}</JSONPatch>`, "</UpdateVariable>" ].join("\n");
    };
    const parseDialogueGeneration = (raw, context, operationId) => {
      const visible = (0, _message_content__WEBPACK_IMPORTED_MODULE_2__.extractDialogueContent)(raw);
      const boundedReaction = readBoundedTag(raw, "反应", [ "正文", "会话状态", "visual_cards", "UpdateVariable" ]);
      const boundedDialogue = readBoundedTag(raw, "正文", [ "会话状态", "visual_cards", "UpdateVariable" ]);
      const reaction = context.channel === "transmission" ? "" : truncateAtSentence(compactText(stripDialogueTags(boundedReaction || visible.reaction), MAX_REACTION_CHARACTERS), MAX_REACTION_CHARACTERS);
      const dialogueLimit = Math.max(48, MAX_VISIBLE_CHARACTERS - reaction.length);
      const dialogue = truncateAtSentence(compactText(stripDialogueTags(boundedDialogue || visible.dialogue), dialogueLimit), dialogueLimit);
      const state = parseStateJson(raw);
      const memoryEvents = normalizeMemoryEvents(state?.memoryEvents, operationId);
      const relationEvents = normalizeRelationEvents(state?.relationEvents, operationId);
      const visualCard = normalizeVisualCard(raw, context);
      const variableUpdate = normalizeDialogueVariablePatches(raw, context);
      if (relationEvents.length === 0 && memoryEvents.length === 0 && variableUpdate.effects.favor) {
        variableUpdate.patches = variableUpdate.patches.filter(patch => decodeJsonPointer(patch.path)[2] !== "好感度");
        delete variableUpdate.effects.favor;
      }
      if (relationEvents.length === 0 && variableUpdate.effects.relationship) {
        variableUpdate.patches = variableUpdate.patches.filter(patch => decodeJsonPointer(patch.path)[2] !== "关系");
        delete variableUpdate.effects.relationship;
      }
      if (memoryEvents.length === 0 && variableUpdate.effects.chronicle) {
        variableUpdate.patches = variableUpdate.patches.filter(patch => decodeJsonPointer(patch.path)[2] !== "羁绊纪事");
        delete variableUpdate.effects.chronicle;
      }
      return {
        raw,
        reaction,
        dialogue,
        sessionState: normalizeSessionState(state),
        memoryEvents,
        relationEvents,
        visualCard,
        variableUpdateBlock: buildVariableUpdateBlock(variableUpdate.patches),
        variableEffects: variableUpdate.effects
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
      if (!parsed.dialogue) {
        const streamed = input.getStreamFallback?.();
        const reaction = input.context.channel === "transmission" ? "" : truncateAtSentence(compactText(stripDialogueTags(streamed?.reaction ?? ""), MAX_REACTION_CHARACTERS), MAX_REACTION_CHARACTERS);
        const dialogueLimit = Math.max(48, MAX_VISIBLE_CHARACTERS - reaction.length);
        const dialogue = truncateAtSentence(compactText(stripDialogueTags(streamed?.dialogue ?? ""), dialogueLimit), dialogueLimit);
        if (dialogue) {
          console.warn("[灯火阑珊·短对话] 最终返回值缺少可见对白，已采用最后一份有效的流式对白");
          return {
            ...parsed,
            reaction,
            dialogue
          };
        }
      }
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
      formatReasoningHtml: () => formatReasoningHtml,
      hasInlineReasoningPresetDisclosure: () => hasInlineReasoningPresetDisclosure,
      hasReasoningFrontendBootstrap: () => hasReasoningFrontendBootstrap,
      isRichPresetHtml: () => isRichPresetHtml,
      mergeReasoningText: () => mergeReasoningText,
      parseMessageContent: () => parseMessageContent,
      sanitizeReasoningText: () => sanitizeReasoningText,
      selectReasoningText: () => selectReasoningText,
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
    const maskMarkdownCode = text => text.replace(/(`+)[\s\S]*?\1(?!`)/g, block => block.replace(/[^\r\n]/g, " "));
    const DIALOGUE_REACTION_TAGS = [ "反应", "reaction", "emotion", "stage_direction" ];
    const DIALOGUE_BODY_TAGS = [ "正文", "dialogue", "reply", "speech", "response" ];
    const DIALOGUE_STATE_TAGS = [ "会话状态", "dialogue_state", "conversation_state" ];
    const DIALOGUE_TAGS = [ ...DIALOGUE_REACTION_TAGS, ...DIALOGUE_BODY_TAGS, ...DIALOGUE_STATE_TAGS ];
    const PRESET_REASONING_TAG_NAME_SOURCE = "konatan_planning~?";
    const PRESET_REASONING_CLOSE_PATTERN = new RegExp(`^<\\/(?:${PRESET_REASONING_TAG_NAME_SOURCE})\\s*>$`, "i");
    const REASONING_TAG_NAME_SOURCE = `think(?:ing)?|planning|${PRESET_REASONING_TAG_NAME_SOURCE}|reasoning|thought|reflection|inner[_-]?monologue|internal[_-]?monologue|chain[_-]?of[_-]?thought|scratchpad|cot|think_?fox~?|思考|思维链|推理`;
    const REASONING_OPEN_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>`, "gi");
    const REASONING_CLOSE_PATTERN = new RegExp(`<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>`, "gi");
    const REASONING_BLOCK_PATTERN = new RegExp(`<(${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(<\\/\\1\\s*>|$)`, "gi");
    const REASONING_CLOSED_BLOCK_PATTERN = new RegExp(`<(${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>[\\s\\S]*?<\\/\\1\\s*>`, "gi");
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
    const findReasoningHandoff = text => {
      const searchable = maskMarkdownCode(text);
      const pattern = /您好[，,]\s*(?:这是约定的|这里是)稿件[，,]\s*请查收[：:]?/g;
      for (const match of searchable.matchAll(pattern)) {
        const end = match.index + match[0].length;
        const prefix = searchable.slice(0, match.index);
        const suffix = searchable.slice(end);
        if (new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])`, "i").test(prefix)) continue;
        if (!suffix.trim() || REASONING_BODY_AFTER_CLOSE_PATTERN.test(suffix)) {
          return {
            start: match.index,
            end
          };
        }
      }
      return null;
    };
    const stripReasoningPrefix = text => {
      const handoff = findReasoningHandoff(text);
      if (handoff) return text.slice(handoff.end);
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
      let lastClosingIsPreset = false;
      let closingMatch;
      const searchable = maskMarkdownCode(text);
      while ((closingMatch = REASONING_CLOSE_PATTERN.exec(searchable)) !== null) {
        lastClosingStart = closingMatch.index;
        lastClosingEnd = closingMatch.index + closingMatch[0].length;
        lastClosingIsPreset = PRESET_REASONING_CLOSE_PATTERN.test(closingMatch[0]);
      }
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      const closingPrefix = text.slice(0, Math.max(0, lastClosingStart));
      const closingSuffix = text.slice(lastClosingEnd >= 0 ? lastClosingEnd : text.length);
      const closingPrefixContainsBody = lastClosingStart >= 0 && new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, "im").test(maskMarkdownCode(closingPrefix));
      const closingActsAsPrefix = lastClosingEnd >= 0 && (lastClosingIsPreset || !closingPrefixContainsBody || REASONING_ORPHAN_PREFIX_CUE.test(closingPrefix) || REASONING_BODY_AFTER_CLOSE_PATTERN.test(closingSuffix));
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
      const bodyBoundary = maskMarkdownCode(remainder).search(REASONING_FALLBACK_BOUNDARY);
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
    const REASONING_FRONTEND_BOOTSTRAP_PATTERN = /(?:\$\s*\(\s*['"]body['"]\s*\)\s*\.\s*load\s*\(|cdn\.jsdelivr\.net\/gh\/[^\s'"<>]+\/(?:灯火通明\/)?index\.html)/i;
    const REASONING_PLACEHOLDER_LINE_PATTERN = /^\s*(?:\[\s*(?:story\s*text|narrative|正文|故事文本)\s*\]\s*)+\s*$/i;
    const REASONING_SCAFFOLD_LINE_PATTERN = /^\s*(?:let(?:'|’)s\s+(?:write|produce|craft|compose|answer|respond|generate|begin|start)\b|(?:we|i)\s+(?:now\s+)?(?:need|should|must|will)\s+(?:to\s+)?(?:write|produce|craft|compose|answer|respond|output|generate)\b|need\s+to\s+(?:write|produce|craft|compose|answer|respond|output|generate)\b)/i;
    const REASONING_CHINESE_SCAFFOLD_LINE_PATTERN = /^\s*(?:让我们|我们(?:现在)?需要|现在(?:让我们)?)\s*(?:开始)?(?:写作|生成|产出|回答|回复|输出|构思)/;
    const hasReasoningFrontendBootstrap = text => REASONING_FRONTEND_BOOTSTRAP_PATTERN.test(text);
    const stripReasoningFrontendBootstrap = text => {
      if (!hasReasoningFrontendBootstrap(text)) return text;
      let result = text.replace(/<body(?=[\s>])[^>]*>[\s\S]*?<\/body\s*>/gi, block => hasReasoningFrontendBootstrap(block) ? "" : block);
      result = result.replace(/<script(?=[\s>])[^>]*>[\s\S]*?<\/script\s*>/gi, block => hasReasoningFrontendBootstrap(block) ? "" : block);
      const unfinishedBody = result.search(/<body(?=[\s>])/i);
      if (unfinishedBody >= 0 && hasReasoningFrontendBootstrap(result.slice(unfinishedBody))) {
        result = result.slice(0, unfinishedBody);
      }
      const unfinishedScript = result.search(/<script(?=[\s>])/i);
      if (unfinishedScript >= 0 && hasReasoningFrontendBootstrap(result.slice(unfinishedScript))) {
        result = result.slice(0, unfinishedScript);
      }
      return result.replace(/<\/?body(?=[\s>])[^>]*>/gi, "");
    };
    const sanitizeReasoningText = text => {
      const withoutPresentation = stripReasoningFrontendBootstrap(stripEmbeddedHtmlDocuments(String(text ?? ""))).replace(REASONING_MARKER_PATTERN, "").replace(REASONING_OPEN_PATTERN, "").replace(REASONING_CLOSE_PATTERN, "").replace(/\r\n?/g, "\n");
      return withoutPresentation.split("\n").filter(line => !REASONING_PLACEHOLDER_LINE_PATTERN.test(line) && !REASONING_SCAFFOLD_LINE_PATTERN.test(line) && !REASONING_CHINESE_SCAFFOLD_LINE_PATTERN.test(line)).join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    };
    const selectReasoningText = (nativeText, inlineFallback) => sanitizeReasoningText(nativeText) || sanitizeReasoningText(inlineFallback);
    const escapeReasoningHtml = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const formatReasoningHtml = text => {
      const value = sanitizeReasoningText(text);
      if (!value) return "";
      return value.split(/\n{2,}/).map(paragraph => `<p>${escapeReasoningHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
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
      const closingMatch = REASONING_CLOSE_PATTERN.exec(maskMarkdownCode(text));
      REASONING_CLOSE_PATTERN.lastIndex = 0;
      if (!closingMatch || closingMatch.index <= 0) return null;
      const prefix = text.slice(0, closingMatch.index);
      const suffix = text.slice(closingMatch.index + closingMatch[0].length);
      const prefixAlreadyContainsBody = new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, "im").test(maskMarkdownCode(prefix));
      if (!PRESET_REASONING_CLOSE_PATTERN.test(closingMatch[0]) && !REASONING_ORPHAN_PREFIX_CUE.test(prefix) && !REASONING_BODY_AFTER_CLOSE_PATTERN.test(suffix) && prefixAlreadyContainsBody) {
        return null;
      }
      const cleaned = sanitizeReasoningText(prefix.replace(REASONING_ORPHAN_PREFIX_CUE, ""));
      return cleaned ? {
        text: cleaned,
        source: `${prefix}${closingMatch[0]}`.trim(),
        isComplete: true
      } : null;
    };
    const mergeReasoningText = (primary, secondary) => selectReasoningText(primary, secondary);
    const extractInlineReasoning = text => {
      const handoff = findReasoningHandoff(text);
      if (handoff && text.slice(0, handoff.start).trim()) {
        return {
          text: sanitizeReasoningText(text.slice(0, handoff.start)),
          source: text.slice(0, handoff.end).trim(),
          isComplete: true
        };
      }
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
      const cleanReasoningText = value => sanitizeReasoningText(value);
      REASONING_BLOCK_PATTERN.lastIndex = 0;
      let match;
      while ((match = REASONING_BLOCK_PATTERN.exec(text)) !== null) {
        const closingTag = match[3];
        let content = match[2];
        if (!closingTag) {
          const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
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
          const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
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
        const boundary = bracketMatch[3] ? -1 : maskMarkdownCode(bracketMatch[2]).search(REASONING_FALLBACK_BOUNDARY);
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
          const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
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
        const boundary = analysisMatch[3] ? -1 : maskMarkdownCode(analysisMatch[2]).search(REASONING_FALLBACK_BOUNDARY);
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
      const searchable = maskMarkdownCode(text);
      const matches = [ ...searchable.matchAll(new RegExp(openTagPattern(tag), "gi")) ];
      const match = preferLast ? matches.at(-1) : matches[0];
      if (!match || match.index === undefined) return "";
      const start = match.index + match[0].length;
      const remainder = text.slice(start);
      const searchableRemainder = searchable.slice(start);
      const boundaries = [ searchableRemainder.search(new RegExp(closeTagPattern(tag), "i")), ...stopTags.map(stopTag => searchableRemainder.search(new RegExp(openTagPattern(stopTag), "i"))) ].filter(index => index >= 0);
      const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
      return stripDialogueTagFragments(remainder.slice(0, end));
    };
    const readFirstTaggedContent = (text, tags, stopTags, preferLast = false) => {
      for (const tag of tags) {
        if (!new RegExp(openTagPattern(tag), "i").test(maskMarkdownCode(text))) continue;
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
      const analysisTag = /<(Analysis|Analyze|reasoning|summary)(?=[\s/>])/i.exec(updateBody)?.[1] ?? "";
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
        choices: extractBranchChoices(stripAuxiliaryPresentation(text)),
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
  "./src/灯火通明/player-input.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      readAdviceInput: () => readAdviceInput,
      readPlayerInput: () => readPlayerInput
    });
    const readAdviceInput = message => {
      if (message?.role !== "user") return null;
      const meta = message.extra?.izumi_advice;
      if (!meta || typeof meta !== "object" || Array.isArray(meta) || meta.version !== 1 || typeof meta.text !== "string" || !Number.isInteger(meta.assistantId) || meta.assistantId < 0 || meta.revision !== undefined && (!Number.isInteger(meta.revision) || meta.revision < 0)) return null;
      const replacement = Object.prototype.hasOwnProperty.call(meta, "replacementText") ? meta.replacementText : "按照advice继续吧。";
      if (typeof replacement !== "string" || !replacement.trim()) return null;
      return {
        text: meta.text,
        replacementText: replacement
      };
    };
    const readPlayerInput = (message, dialogueText) => {
      if (!message) return "";
      const advice = readAdviceInput(message);
      if (advice && message.message === advice.replacementText) return advice.text.trim();
      return (dialogueText || String(message.message ?? "")).replace(/^（(?:对[^）]+说|向[^）]+传讯)）\s*/, "").trim();
    };
  },
  "./src/灯火通明/pseudo-layer-protocol.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      PSEUDO_LAYER_CHANNEL: () => PSEUDO_LAYER_CHANNEL,
      PSEUDO_LAYER_DIALOGUE_DRAWER_VERSION: () => PSEUDO_LAYER_DIALOGUE_DRAWER_VERSION,
      PSEUDO_LAYER_MESSAGE_EDITING_VERSION: () => PSEUDO_LAYER_MESSAGE_EDITING_VERSION,
      PSEUDO_LAYER_MIN_COMPATIBLE_VERSION: () => PSEUDO_LAYER_MIN_COMPATIBLE_VERSION,
      PSEUDO_LAYER_PENDING_INPUT_RECOVERY_VERSION: () => PSEUDO_LAYER_PENDING_INPUT_RECOVERY_VERSION,
      PSEUDO_LAYER_REASONING_EDITING_VERSION: () => PSEUDO_LAYER_REASONING_EDITING_VERSION,
      PSEUDO_LAYER_REASONING_ISOLATION_VERSION: () => PSEUDO_LAYER_REASONING_ISOLATION_VERSION,
      PSEUDO_LAYER_SUPPORTED_VERSIONS: () => PSEUDO_LAYER_SUPPORTED_VERSIONS,
      PSEUDO_LAYER_TIMELINE_PAGING_VERSION: () => PSEUDO_LAYER_TIMELINE_PAGING_VERSION,
      PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION: () => PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION,
      PSEUDO_LAYER_VERSION: () => PSEUDO_LAYER_VERSION,
      isPseudoLayerRequest: () => isPseudoLayerRequest,
      isPseudoLayerResponse: () => isPseudoLayerResponse,
      isSupportedPseudoLayerVersion: () => isSupportedPseudoLayerVersion
    });
    const PSEUDO_LAYER_CHANNEL = "denghuolanshan:pseudo-layer";
    const PSEUDO_LAYER_VERSION = 14;
    const PSEUDO_LAYER_MIN_COMPATIBLE_VERSION = 4;
    const PSEUDO_LAYER_SUPPORTED_VERSIONS = Array.from({
      length: PSEUDO_LAYER_VERSION - PSEUDO_LAYER_MIN_COMPATIBLE_VERSION + 1
    }, (_, index) => PSEUDO_LAYER_VERSION - index);
    const PSEUDO_LAYER_MESSAGE_EDITING_VERSION = 8;
    const PSEUDO_LAYER_TIMELINE_PAGING_VERSION = 9;
    const PSEUDO_LAYER_USER_MESSAGE_EDITING_VERSION = 10;
    const PSEUDO_LAYER_REASONING_ISOLATION_VERSION = 11;
    const PSEUDO_LAYER_PENDING_INPUT_RECOVERY_VERSION = 12;
    const PSEUDO_LAYER_REASONING_EDITING_VERSION = 13;
    const PSEUDO_LAYER_DIALOGUE_DRAWER_VERSION = 14;
    const isSupportedPseudoLayerVersion = value => typeof value === "number" && Number.isInteger(value) && value >= PSEUDO_LAYER_MIN_COMPATIBLE_VERSION && value <= PSEUDO_LAYER_VERSION;
    const hasEnvelope = value => {
      if (!value || typeof value !== "object") return false;
      const message = value;
      return message.channel === PSEUDO_LAYER_CHANNEL && isSupportedPseudoLayerVersion(message.version);
    };
    const REQUEST_TYPES = new Set([ "hello", "goodbye", "generate", "stop", "reroll", "delete_message", "update_message", "update_user_message", "update_reasoning", "recover_pending_input", "navigate", "timeline_page", "select_entry", "select_history", "return_latest", "set_interaction", "end_interaction", "toggle_native_input" ]);
    const RESPONSE_TYPES = new Set([ "ready", "view", "state", "stream", "reasoning", "complete", "deleted", "message_updated", "pending_input_recovered", "timeline_page", "error" ]);
    const isPseudoLayerRequest = value => hasEnvelope(value) && REQUEST_TYPES.has(String(value.type));
    const isPseudoLayerResponse = value => hasEnvelope(value) && RESPONSE_TYPES.has(String(value.type));
  },
  "./src/灯火通明/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      COMPANION_BOND_EVENT_TYPES: () => _schema__WEBPACK_IMPORTED_MODULE_0__.COMPANION_BOND_EVENT_TYPES,
      CONFIG: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CONFIG,
      CharacterLibEntrySchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CharacterLibEntrySchema,
      CompanionBondChronicleEntrySchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CompanionBondChronicleEntrySchema,
      CompanionBondChronicleSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CompanionBondChronicleSchema,
      CompanionRelationContextSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CompanionRelationContextSchema,
      CompanionSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CompanionSchema,
      CultivationStateSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CultivationStateSchema,
      CustomPortraitSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.CustomPortraitSchema,
      DEFAULT_CHARACTER_LIB: () => _schema__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_CHARACTER_LIB,
      DEFAULT_FACTIONS: () => _schema__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_FACTIONS,
      DEFAULT_LOCATIONS: () => _schema__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_LOCATIONS,
      DEFAULT_TREASURES: () => _schema__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_TREASURES,
      DifficultySystemSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.DifficultySystemSchema,
      FactionSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.FactionSchema,
      InventorySchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.InventorySchema,
      ItemSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.ItemSchema,
      LocationSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.LocationSchema,
      NormalizedStringListSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.NormalizedStringListSchema,
      NpcSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.NpcSchema,
      OpportunitySchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.OpportunitySchema,
      PhysiqueSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.PhysiqueSchema,
      ProtagonistSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.ProtagonistSchema,
      QuestSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.QuestSchema,
      REALM_LIFESPANS: () => _schema__WEBPACK_IMPORTED_MODULE_0__.REALM_LIFESPANS,
      REALM_NAMES: () => _schema__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES,
      REALM_STAGES: () => _schema__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES,
      REALM_THRESHOLDS: () => _schema__WEBPACK_IMPORTED_MODULE_0__.REALM_THRESHOLDS,
      RealmTransitionSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.RealmTransitionSchema,
      ReputationEntrySchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.ReputationEntrySchema,
      ReputationSystemSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.ReputationSystemSchema,
      Schema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.Schema,
      SkillListSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.SkillListSchema,
      SkillSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.SkillSchema,
      SpiritRootSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.SpiritRootSchema,
      SystemSettingsSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.SystemSettingsSchema,
      TechniqueSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.TechniqueSchema,
      TreasureSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.TreasureSchema,
      WORLD_EVENT_ACTIVE_LIMIT: () => _schema__WEBPACK_IMPORTED_MODULE_0__.WORLD_EVENT_ACTIVE_LIMIT,
      WORLD_EVENT_HISTORY_LIMIT: () => _schema__WEBPACK_IMPORTED_MODULE_0__.WORLD_EVENT_HISTORY_LIMIT,
      WORLD_EVENT_LEDGER_LIMIT: () => _schema__WEBPACK_IMPORTED_MODULE_0__.WORLD_EVENT_LEDGER_LIMIT,
      WorldEventLedgerSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.WorldEventLedgerSchema,
      WorldEventSchema: () => _schema__WEBPACK_IMPORTED_MODULE_0__.WorldEventSchema,
      compactWorldEventLedger: () => _schema__WEBPACK_IMPORTED_MODULE_0__.compactWorldEventLedger,
      compareRealmStanding: () => _schema__WEBPACK_IMPORTED_MODULE_0__.compareRealmStanding,
      compareWorldEventTimeDescending: () => _schema__WEBPACK_IMPORTED_MODULE_0__.compareWorldEventTimeDescending,
      computeRealmInfo: () => _schema__WEBPACK_IMPORTED_MODULE_0__.computeRealmInfo,
      describeRealmByLevel: () => _schema__WEBPACK_IMPORTED_MODULE_0__.describeRealmByLevel,
      extractSpiritStoneFromInventory: () => _schema__WEBPACK_IMPORTED_MODULE_0__.extractSpiritStoneFromInventory,
      finiteNumber: () => _schema__WEBPACK_IMPORTED_MODULE_0__.finiteNumber,
      getCultivationStatusLabel: () => _schema__WEBPACK_IMPORTED_MODULE_0__.getCultivationStatusLabel,
      getDangerColor: () => _schema__WEBPACK_IMPORTED_MODULE_0__.getDangerColor,
      getRealmColor: () => _schema__WEBPACK_IMPORTED_MODULE_0__.getRealmColor,
      getRealmThreshold: () => _schema__WEBPACK_IMPORTED_MODULE_0__.getRealmThreshold,
      getRootColor: () => _schema__WEBPACK_IMPORTED_MODULE_0__.getRootColor,
      isSpiritStoneCurrencyItem: () => _schema__WEBPACK_IMPORTED_MODULE_0__.isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => _schema__WEBPACK_IMPORTED_MODULE_0__.migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => _schema__WEBPACK_IMPORTED_MODULE_0__.migrateLegacyCultivationProgress,
      normalizeCultivationState: () => _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeCultivationState,
      normalizeRealmLevel: () => _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeRealmLevel,
      normalizeSpiritStoneAmount: () => _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeSpiritStoneAmount,
      normalizeSpiritStoneState: () => _schema__WEBPACK_IMPORTED_MODULE_0__.normalizeSpiritStoneState,
      parseRealmToLevel: () => _schema__WEBPACK_IMPORTED_MODULE_0__.parseRealmToLevel,
      resolveBattleMomentum: () => _schema__WEBPACK_IMPORTED_MODULE_0__.resolveBattleMomentum,
      unwrapOpportunityPatchPayload: () => _schema__WEBPACK_IMPORTED_MODULE_0__.unwrapOpportunityPatchPayload,
      品阶映射: () => _schema__WEBPACK_IMPORTED_MODULE_0__["品阶映射"],
      熟练度映射: () => _schema__WEBPACK_IMPORTED_MODULE_0__["熟练度映射"]
    });
    var _schema__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../灯火阑珊/schema */ "./src/灯火阑珊/schema.ts");
  },
  "./src/灯火阑珊-变量结构/companion-aliases.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      COMPANION_ALIASES_BY_CANONICAL: () => COMPANION_ALIASES_BY_CANONICAL,
      COMPANION_ALIAS_GROUPS: () => COMPANION_ALIAS_GROUPS,
      COMPANION_CANONICAL_NAMES: () => COMPANION_CANONICAL_NAMES
    });
    const COMPANION_ALIAS_GROUPS = [ {
      canonical: "虞汐颜",
      aliases: [ "虞汐", "虞颜" ]
    }, {
      canonical: "朔璃鸢",
      aliases: [ "阿鸢", "血手飞鸢" ]
    }, {
      canonical: "朔望舒",
      aliases: [ "赤月女帝", "幽影宗主" ]
    }, {
      canonical: "安迟迟",
      aliases: [ "念迟迟", "蘅之", "拈韵居士", "掌籍师姐" ]
    }, {
      canonical: "梦杳泠",
      aliases: [ "泠泠", "乘黄少女", "乘黄幼崽", "末代乘黄" ]
    }, {
      canonical: "羽岚",
      aliases: [ "羽岚烟", "岚烟" ]
    }, {
      canonical: "沈倩宁",
      aliases: [ "倩宁", "赤血狂刃" ]
    } ];
    const COMPANION_CANONICAL_NAMES = Object.fromEntries(COMPANION_ALIAS_GROUPS.flatMap(({canonical, aliases}) => aliases.map(alias => [ alias, canonical ])));
    const COMPANION_ALIASES_BY_CANONICAL = Object.fromEntries(COMPANION_ALIAS_GROUPS.map(({canonical, aliases}) => [ canonical, aliases ]));
  },
  "./src/灯火阑珊/map-system.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ABYSS_MAP_DOMAINS: () => ABYSS_MAP_DOMAINS,
      BORDER_MAP_DOMAINS: () => BORDER_MAP_DOMAINS,
      CELESTIAL_MAP_DOMAINS: () => CELESTIAL_MAP_DOMAINS,
      GENERIC_MAP_LAYERS: () => GENERIC_MAP_LAYERS,
      LAND_MAP_DOMAINS: () => LAND_MAP_DOMAINS,
      LOCATION_DOMAIN_VALUES: () => LOCATION_DOMAIN_VALUES,
      MAP_ANCHOR_ALIASES: () => MAP_ANCHOR_ALIASES,
      SEA_MAP_DOMAINS: () => SEA_MAP_DOMAINS,
      SPECIAL_MAP_DOMAINS: () => SPECIAL_MAP_DOMAINS,
      SPECIFIC_MAP_DOMAINS: () => SPECIFIC_MAP_DOMAINS,
      isGenericMapLayer: () => isGenericMapLayer,
      isSpecificMapDomain: () => isSpecificMapDomain,
      normalizeMapAnchor: () => normalizeMapAnchor,
      resolveMapAnchor: () => resolveMapAnchor
    });
    const GENERIC_MAP_LAYERS = [ "天层", "地层", "下层" ];
    const LAND_MAP_DOMAINS = [ "神州", "东苍", "南炎", "西庚", "北冥" ];
    const SEA_MAP_DOMAINS = [ "四海", "潮音海", "龙眠海", "蓬莱幻海", "北冥冰海", "无尽洋", "天泣洋", "永夜海域", "雷暴海" ];
    const BORDER_MAP_DOMAINS = [ "苍茫古径", "赤金走廊", "雪线", "龙眠海峡" ];
    const CELESTIAL_MAP_DOMAINS = [ "天渊", "星陨废墟", "太古战场", "天道裂隙" ];
    const ABYSS_MAP_DOMAINS = [ "归墟", "碎金渊", "黄泉古迹", "无尽炎渊", "神木枯冢" ];
    const SPECIAL_MAP_DOMAINS = [ "倒悬天墟" ];
    const SPECIFIC_MAP_DOMAINS = [ ...LAND_MAP_DOMAINS, ...SEA_MAP_DOMAINS, ...BORDER_MAP_DOMAINS, ...CELESTIAL_MAP_DOMAINS, ...ABYSS_MAP_DOMAINS, ...SPECIAL_MAP_DOMAINS ];
    const LOCATION_DOMAIN_VALUES = [ ...GENERIC_MAP_LAYERS, ...SPECIFIC_MAP_DOMAINS ];
    const MAP_ANCHOR_ALIASES = {
      中州: "神州",
      中原: "神州",
      东荒: "东苍",
      南疆: "南炎",
      西漠: "西庚",
      北域: "北冥",
      外海: "四海",
      归墟之海: "永夜海域",
      万剑冢: "碎金渊",
      碎金渊·万剑冢: "碎金渊",
      下霄: "星陨废墟",
      "星陨废墟（下霄）": "星陨废墟",
      中霄: "太古战场",
      九天遗迹: "太古战场",
      "太古战场·九天遗迹（中霄）": "太古战场",
      上霄: "天道裂隙",
      "天道裂隙（上霄）": "天道裂隙",
      "九霄天界（上中下霄）": "九霄",
      九霄天界: "九霄",
      倒悬天墟·五行逆反界: "倒悬天墟"
    };
    const mapDomainSet = new Set(SPECIFIC_MAP_DOMAINS);
    const genericLayerSet = new Set(GENERIC_MAP_LAYERS);
    const searchableAnchors = [ ...SPECIFIC_MAP_DOMAINS ].sort((left, right) => right.length - left.length);
    const searchableAliases = Object.entries(MAP_ANCHOR_ALIASES).sort(([left], [right]) => right.length - left.length);
    const text = value => String(value ?? "").trim();
    const isSpecificMapDomain = value => mapDomainSet.has(text(value));
    const isGenericMapLayer = value => genericLayerSet.has(text(value));
    const normalizeMapAnchor = value => {
      const normalized = text(value);
      if (!normalized) return "";
      if (mapDomainSet.has(normalized)) return normalized;
      if (MAP_ANCHOR_ALIASES[normalized]) return MAP_ANCHOR_ALIASES[normalized];
      for (const anchor of searchableAnchors) {
        if (normalized.includes(anchor)) return anchor;
      }
      for (const [alias, anchor] of searchableAliases) {
        if (normalized.includes(alias)) return anchor;
      }
      return "";
    };
    const findRecordValue = (record, region) => {
      if (!record || !region) return undefined;
      if (record[region]) return record[region];
      const normalizedRegion = region.replace(/[\s·•\-—_：:／/|]/g, "");
      return Object.entries(record).find(([name]) => {
        const normalizedName = text(name).replace(/[\s·•\-—_：:／/|]/g, "");
        return normalizedName && (normalizedRegion.includes(normalizedName) || normalizedName.includes(normalizedRegion));
      })?.[1];
    };
    const resolveMapAnchor = ({currentRegion, currentDomain = "", environmentDesc = "", anchors, locationLib, worldMap}) => {
      const region = text(currentRegion);
      const explicitAnchor = normalizeMapAnchor(anchors?.[region]);
      if (explicitAnchor) return explicitAnchor;
      const directRegion = normalizeMapAnchor(region);
      if (directRegion) return directRegion;
      const location = findRecordValue(locationLib, region);
      const locationDomain = normalizeMapAnchor(location?.域);
      if (locationDomain) return locationDomain;
      const mapEntry = findRecordValue(worldMap, region);
      const descriptiveAnchor = normalizeMapAnchor([ location?.特, mapEntry?.desc, ...mapEntry?.connections ?? [], environmentDesc ].filter(Boolean).join(" "));
      if (descriptiveAnchor) return descriptiveAnchor;
      return normalizeMapAnchor(currentDomain);
    };
  },
  "./src/灯火阑珊/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      COMPANION_BOND_EVENT_TYPES: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.COMPANION_BOND_EVENT_TYPES,
      CONFIG: () => _schema_constants__WEBPACK_IMPORTED_MODULE_7__.CONFIG,
      CharacterLibEntrySchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CharacterLibEntrySchema,
      CompanionBondChronicleEntrySchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionBondChronicleEntrySchema,
      CompanionBondChronicleSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionBondChronicleSchema,
      CompanionRelationContextSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionRelationContextSchema,
      CompanionSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionSchema,
      CultivationStateSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.CultivationStateSchema,
      CustomPortraitSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CustomPortraitSchema,
      DEFAULT_CHARACTER_LIB: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_CHARACTER_LIB,
      DEFAULT_FACTIONS: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_FACTIONS,
      DEFAULT_LOCATIONS: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_LOCATIONS,
      DEFAULT_TREASURES: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_TREASURES,
      DifficultySystemSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.DifficultySystemSchema,
      FactionSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.FactionSchema,
      InventorySchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.InventorySchema,
      ItemSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.ItemSchema,
      LocationSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.LocationSchema,
      NormalizedStringListSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.NormalizedStringListSchema,
      NpcSchema: () => _schema_characters__WEBPACK_IMPORTED_MODULE_2__.NpcSchema,
      OpportunitySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.OpportunitySchema,
      PhysiqueSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.PhysiqueSchema,
      ProtagonistSchema: () => _schema_protagonist__WEBPACK_IMPORTED_MODULE_4__.ProtagonistSchema,
      QuestSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.QuestSchema,
      REALM_LIFESPANS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_7__.REALM_LIFESPANS,
      REALM_NAMES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_7__.REALM_NAMES,
      REALM_STAGES: () => _schema_constants__WEBPACK_IMPORTED_MODULE_7__.REALM_STAGES,
      REALM_THRESHOLDS: () => _schema_constants__WEBPACK_IMPORTED_MODULE_7__.REALM_THRESHOLDS,
      RealmTransitionSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.RealmTransitionSchema,
      ReputationEntrySchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.ReputationEntrySchema,
      ReputationSystemSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.ReputationSystemSchema,
      Schema: () => Schema,
      SkillListSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.SkillListSchema,
      SkillSchema: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.SkillSchema,
      SpiritRootSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.SpiritRootSchema,
      SystemSettingsSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.SystemSettingsSchema,
      TechniqueSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.TechniqueSchema,
      TreasureSchema: () => _schema_world__WEBPACK_IMPORTED_MODULE_6__.TreasureSchema,
      WORLD_EVENT_ACTIVE_LIMIT: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WORLD_EVENT_ACTIVE_LIMIT,
      WORLD_EVENT_HISTORY_LIMIT: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WORLD_EVENT_HISTORY_LIMIT,
      WORLD_EVENT_LEDGER_LIMIT: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WORLD_EVENT_LEDGER_LIMIT,
      WorldEventLedgerSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WorldEventLedgerSchema,
      WorldEventSchema: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WorldEventSchema,
      compactWorldEventLedger: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.compactWorldEventLedger,
      compareRealmStanding: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.compareRealmStanding,
      compareWorldEventTimeDescending: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.compareWorldEventTimeDescending,
      computeRealmInfo: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.computeRealmInfo,
      describeRealmByLevel: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.describeRealmByLevel,
      extractSpiritStoneFromInventory: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.extractSpiritStoneFromInventory,
      finiteNumber: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber,
      getCultivationStatusLabel: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.getCultivationStatusLabel,
      getDangerColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.getDangerColor,
      getRealmColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.getRealmColor,
      getRealmThreshold: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.getRealmThreshold,
      getRootColor: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.getRootColor,
      isSpiritStoneCurrencyItem: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.migrateLegacyCultivationProgress,
      normalizeCultivationState: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeCultivationState,
      normalizeRealmLevel: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeRealmLevel,
      normalizeSpiritStoneAmount: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeSpiritStoneAmount,
      normalizeSpiritStoneState: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeSpiritStoneState,
      parseRealmToLevel: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.parseRealmToLevel,
      resolveBattleMomentum: () => _schema_utils__WEBPACK_IMPORTED_MODULE_8__.resolveBattleMomentum,
      unwrapOpportunityPatchPayload: () => _schema_systems__WEBPACK_IMPORTED_MODULE_5__.unwrapOpportunityPatchPayload,
      品阶映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__["品阶映射"],
      熟练度映射: () => _schema_common__WEBPACK_IMPORTED_MODULE_3__["熟练度映射"]
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _companion_aliases__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火阑珊-变量结构/companion-aliases */ "./src/灯火阑珊-变量结构/companion-aliases.ts");
    var _schema_characters__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./schema/characters */ "./src/灯火阑珊/schema/characters.ts");
    var _schema_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./schema/common */ "./src/灯火阑珊/schema/common.ts");
    var _schema_protagonist__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./schema/protagonist */ "./src/灯火阑珊/schema/protagonist.ts");
    var _schema_systems__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./schema/systems */ "./src/灯火阑珊/schema/systems.ts");
    var _schema_world__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./schema/world */ "./src/灯火阑珊/schema/world.ts");
    var _schema_constants__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./schema/constants */ "./src/灯火阑珊/schema/constants.ts");
    var _schema_utils__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./schema/utils */ "./src/灯火阑珊/schema/utils.ts");
    const LATEST_CULTIVATION_SYSTEM_VERSION = 3;
    const LATEST_SCHEMA_VERSION = 5;
    const DEFAULT_COMPANION = _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionSchema.parse({});
    const CJK_TEXT_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
    const MAX_OPPORTUNITIES = 4;
    const ACTION_TITLE_LIMIT = 24;
    const ACTION_TEXT_LIMIT = 220;
    const ACTION_HINT_LIMIT = 28;
    const ACTION_EVENT_LIMIT = 72;
    const ACTION_EVENT_ID_LIMIT = 48;
    const SITUATION_TEXT_LIMIT = 64;
    function normalizePromptText(value, maxLength) {
      return Array.from(String(value ?? "").replace(/\s+/gu, " ").trim()).slice(0, maxLength).join("");
    }
    function migrateHiddenOpportunityField(value) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return value;
      const input = {
        ...value
      };
      if (!Object.hasOwn(input, "$可参与机遇") && Object.hasOwn(input, "可参与机遇")) {
        input.$可参与机遇 = input.可参与机遇;
      }
      delete input.可参与机遇;
      return input;
    }
    function preferNonDefaultString(incoming, current, fallback) {
      const normalizedIncoming = String(incoming ?? "").trim();
      if (normalizedIncoming && normalizedIncoming !== fallback) {
        return normalizedIncoming;
      }
      return current;
    }
    function extractChineseQuestLabel(input) {
      const raw = String(input ?? "").trim();
      if (!raw) {
        return "";
      }
      const strippedPrefix = raw.replace(/^(?:[A-Za-z][A-Za-z0-9]*)(?:[._:\-/\\\s]+[A-Za-z0-9]+)*[._:\-/\\\s]*/u, "").trim();
      const candidate = strippedPrefix || raw;
      const firstCjkIndex = candidate.search(CJK_TEXT_PATTERN);
      if (firstCjkIndex < 0) {
        return "";
      }
      return candidate.slice(firstCjkIndex).trim();
    }
    function getQuestFallbackLabel(type) {
      const normalizedType = String(type ?? "").trim();
      const fallbackByType = {
        主线: "主线任务",
        支线: "支线任务",
        每日: "每日任务",
        临危受命: "临危受命",
        秘境探索: "秘境探索"
      };
      return fallbackByType[normalizedType] || "未命名任务";
    }
    function mergeCompanionData(base, incoming) {
      if (!base) {
        return _.cloneDeep(incoming);
      }
      const merged = _.cloneDeep(base);
      const fallbackRelationContext = _.cloneDeep(DEFAULT_COMPANION.关系上下文);
      merged.等级 = Math.max(Number(base.等级 ?? DEFAULT_COMPANION.等级), Number(incoming.等级 ?? DEFAULT_COMPANION.等级));
      merged.修为 = Math.max(Number(base.修为 ?? DEFAULT_COMPANION.修为), Number(incoming.修为 ?? DEFAULT_COMPANION.修为));
      merged.灵石 = Math.max(Number(base.灵石 ?? DEFAULT_COMPANION.灵石), Number(incoming.灵石 ?? DEFAULT_COMPANION.灵石));
      merged.已活岁月 = Math.max(Number(base.已活岁月 ?? DEFAULT_COMPANION.已活岁月), Number(incoming.已活岁月 ?? DEFAULT_COMPANION.已活岁月));
      merged.尝试突破 = Boolean(base.尝试突破 || incoming.尝试突破);
      const fallbackCultivationState = _.cloneDeep(DEFAULT_COMPANION.修炼状态);
      merged.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeCultivationState)({
        阶段: preferNonDefaultString(incoming.修炼状态?.阶段, String(base.修炼状态?.阶段 ?? fallbackCultivationState.阶段), fallbackCultivationState.阶段),
        瓶颈原因: preferNonDefaultString(incoming.修炼状态?.瓶颈原因, String(base.修炼状态?.瓶颈原因 ?? fallbackCultivationState.瓶颈原因), fallbackCultivationState.瓶颈原因),
        突破目标: preferNonDefaultString(incoming.修炼状态?.突破目标, String(base.修炼状态?.突破目标 ?? fallbackCultivationState.突破目标), fallbackCultivationState.突破目标),
        上次结果: preferNonDefaultString(incoming.修炼状态?.上次结果, String(base.修炼状态?.上次结果 ?? fallbackCultivationState.上次结果), fallbackCultivationState.上次结果),
        境界变动: incoming.修炼状态?.境界变动?.类型 !== "无" ? incoming.修炼状态.境界变动 : base.修炼状态?.境界变动
      }, {
        legacyAttemptBreakthrough: merged.尝试突破,
        level: merged.等级,
        cultivation: merged.修为
      });
      merged.好感度 = Number.isFinite(Number(incoming.好感度)) ? Number(incoming.好感度) : Number(base.好感度 ?? DEFAULT_COMPANION.好感度);
      merged.关系 = preferNonDefaultString(incoming.关系, String(base.关系 ?? DEFAULT_COMPANION.关系), DEFAULT_COMPANION.关系);
      merged.关系上下文 = {
        当前情绪: preferNonDefaultString(incoming.关系上下文?.当前情绪, String(base.关系上下文?.当前情绪 ?? fallbackRelationContext.当前情绪), fallbackRelationContext.当前情绪),
        态度缘由: preferNonDefaultString(incoming.关系上下文?.态度缘由, String(base.关系上下文?.态度缘由 ?? fallbackRelationContext.态度缘由), fallbackRelationContext.态度缘由),
        关系诉求: preferNonDefaultString(incoming.关系上下文?.关系诉求, String(base.关系上下文?.关系诉求 ?? fallbackRelationContext.关系诉求), fallbackRelationContext.关系诉求),
        相处禁忌: preferNonDefaultString(incoming.关系上下文?.相处禁忌, String(base.关系上下文?.相处禁忌 ?? fallbackRelationContext.相处禁忌), fallbackRelationContext.相处禁忌),
        未了约定: preferNonDefaultString(incoming.关系上下文?.未了约定, String(base.关系上下文?.未了约定 ?? fallbackRelationContext.未了约定), fallbackRelationContext.未了约定)
      };
      merged.羁绊纪事 = _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionBondChronicleSchema.parse({
        ...base.羁绊纪事 ?? {},
        ...incoming.羁绊纪事 ?? {}
      });
      if (String(base.灵根 ?? DEFAULT_COMPANION.灵根) === DEFAULT_COMPANION.灵根 && String(incoming.灵根 ?? "").trim()) {
        merged.灵根 = incoming.灵根;
      }
      if (String(base.体质 ?? DEFAULT_COMPANION.体质) === DEFAULT_COMPANION.体质 && String(incoming.体质 ?? "").trim()) {
        merged.体质 = incoming.体质;
      }
      if (String(base.功法 ?? DEFAULT_COMPANION.功法) === DEFAULT_COMPANION.功法 && String(incoming.功法 ?? "").trim()) {
        merged.功法 = incoming.功法;
      }
      if (String(base.本命兵器 ?? DEFAULT_COMPANION.本命兵器) === DEFAULT_COMPANION.本命兵器 && String(incoming.本命兵器 ?? "").trim()) {
        merged.本命兵器 = incoming.本命兵器;
      }
      merged.神通列表 = {
        ...base.神通列表 ?? {},
        ...incoming.神通列表 ?? {}
      };
      return merged;
    }
    function mergeCharacterLibEntry(base, incoming) {
      if (!base) {
        return _.cloneDeep(incoming);
      }
      return {
        级: Math.max(Number(base.级 ?? 1), Number(incoming.级 ?? 1)),
        根: preferNonDefaultString(incoming.根, String(base.根 ?? ""), ""),
        质: preferNonDefaultString(incoming.质, String(base.质 ?? ""), ""),
        龄: preferNonDefaultString(incoming.龄, String(base.龄 ?? ""), ""),
        属: preferNonDefaultString(incoming.属, String(base.属 ?? ""), ""),
        法: preferNonDefaultString(incoming.法, String(base.法 ?? ""), ""),
        器: preferNonDefaultString(incoming.器, String(base.器 ?? ""), ""),
        通: Array.from(new Set([ ...base.通 ?? [], ...incoming.通 ?? [] ].map(value => String(value).trim()).filter(Boolean))),
        自定义立绘: {
          正面: String(incoming.自定义立绘?.正面 ?? "").trim() || String(base.自定义立绘?.正面 ?? "").trim(),
          背面: String(incoming.自定义立绘?.背面 ?? "").trim() || String(base.自定义立绘?.背面 ?? "").trim()
        }
      };
    }
    function normalizeCharacterLibraryAliases(library) {
      const normalizedLibrary = _.cloneDeep(library ?? {});
      for (const {canonical, aliases} of _companion_aliases__WEBPACK_IMPORTED_MODULE_1__.COMPANION_ALIAS_GROUPS) {
        let canonicalEntry = normalizedLibrary[canonical] ? _.cloneDeep(normalizedLibrary[canonical]) : undefined;
        for (const alias of aliases) {
          const aliasEntry = normalizedLibrary[alias];
          if (!aliasEntry) continue;
          canonicalEntry = mergeCharacterLibEntry(canonicalEntry, aliasEntry);
          delete normalizedLibrary[alias];
        }
        if (canonicalEntry) {
          normalizedLibrary[canonical] = canonicalEntry;
        }
      }
      return normalizedLibrary;
    }
    function normalizeCompanionAliases(companions, snapshot) {
      const normalizedCompanions = _.cloneDeep(companions ?? {});
      const normalizedSnapshot = _.cloneDeep(snapshot ?? {});
      for (const {canonical, aliases} of _companion_aliases__WEBPACK_IMPORTED_MODULE_1__.COMPANION_ALIAS_GROUPS) {
        let canonicalCompanion = normalizedCompanions[canonical] ? _.cloneDeep(normalizedCompanions[canonical]) : undefined;
        for (const alias of aliases) {
          const aliasCompanion = normalizedCompanions[alias];
          if (!aliasCompanion) continue;
          canonicalCompanion = mergeCompanionData(canonicalCompanion, aliasCompanion);
          delete normalizedCompanions[alias];
        }
        if (canonicalCompanion) {
          normalizedCompanions[canonical] = canonicalCompanion;
        }
        const snapshotCandidates = [ normalizedSnapshot[canonical], ...aliases.map(alias => normalizedSnapshot[alias]) ].map(value => Number(value)).filter(value => Number.isFinite(value));
        for (const alias of aliases) {
          delete normalizedSnapshot[alias];
        }
        if (snapshotCandidates.length > 0) {
          normalizedSnapshot[canonical] = snapshotCandidates[snapshotCandidates.length - 1];
        }
      }
      return {
        companions: normalizedCompanions,
        snapshot: normalizedSnapshot
      };
    }
    function getFavorDeltaLimitByValue(favor) {
      const normalizedFavor = Math.max(0, Number.isFinite(favor) ? favor : 0);
      if (normalizedFavor <= 20) return 6;
      if (normalizedFavor <= 60) return 4;
      if (normalizedFavor <= 120) return 3;
      return 2;
    }
    function normalizeProtagonistCultivation(protagonist, currentCultivationVersion) {
      if (currentCultivationVersion < LATEST_CULTIVATION_SYSTEM_VERSION) {
        protagonist.修为 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.migrateCultivationProgress)(protagonist.等级, protagonist.修为, currentCultivationVersion, LATEST_CULTIVATION_SYSTEM_VERSION);
      }
      protagonist.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeCultivationState)(protagonist.修炼状态, {
        legacyAttemptBreakthrough: protagonist.尝试突破,
        level: protagonist.等级,
        cultivation: protagonist.修为
      });
      protagonist.尝试突破 = protagonist.修炼状态.阶段 === "突破中";
      Object.assign(protagonist, (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.computeRealmInfo)(protagonist));
    }
    function normalizeCompanionCultivation(companion, currentCultivationVersion) {
      if (currentCultivationVersion < LATEST_CULTIVATION_SYSTEM_VERSION) {
        companion.修为 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.migrateCultivationProgress)(companion.等级, companion.修为, currentCultivationVersion, LATEST_CULTIVATION_SYSTEM_VERSION);
      }
      companion.修炼状态 = (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.normalizeCultivationState)(companion.修炼状态, {
        legacyAttemptBreakthrough: companion.尝试突破,
        level: companion.等级,
        cultivation: companion.修为
      });
      companion.尝试突破 = companion.修炼状态.阶段 === "突破中";
      Object.assign(companion, (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.computeRealmInfo)(companion));
    }
    const Schema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(migrateHiddenOpportunityField, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      世界时钟: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        纪元: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("盛法时代"),
        年份: (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber)(1).transform(v => Math.max(1, Math.floor(v))).prefault(1),
        月份: (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber)(1).transform(v => _.clamp(Math.floor(v), 1, 12)).prefault(1),
        日期: (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber)(1).transform(v => _.clamp(Math.floor(v), 1, 30)).prefault(1),
        时辰: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("子时")
      }).prefault({
        纪元: "盛法时代",
        年份: 1,
        月份: 1,
        日期: 1,
        时辰: "子时"
      }),
      世界地图: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("区域名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        layer: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "天层", "地层", "下层" ]).prefault("地层"),
        danger: (0, _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber)(0).transform(v => _.clamp(v, 0, 100)),
        desc: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        connections: _schema_common__WEBPACK_IMPORTED_MODULE_3__.NormalizedStringListSchema
      })).prefault({}),
      世界图志: _schema_systems__WEBPACK_IMPORTED_MODULE_5__.WorldEventLedgerSchema,
      宗门势力库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("宗门名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.FactionSchema).prefault({}),
      功法库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("功法名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.TechniqueSchema).prefault({}),
      法宝库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("法宝名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.TreasureSchema).prefault(_schema_world__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_TREASURES),
      地点库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("地点名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.LocationSchema).prefault(_schema_world__WEBPACK_IMPORTED_MODULE_6__.DEFAULT_LOCATIONS),
      $地图锚点: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("地点名"), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("地图地域名")).prefault({}),
      $宗门推断: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        当前域: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
        当前主势力: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
      }).prefault({
        当前域: "",
        当前主势力: ""
      }),
      灵根库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("灵根名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.SpiritRootSchema).prefault({}),
      体质库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("体质名"), _schema_world__WEBPACK_IMPORTED_MODULE_6__.PhysiqueSchema).prefault({}),
      本尊: _schema_protagonist__WEBPACK_IMPORTED_MODULE_4__.ProtagonistSchema,
      红颜角色库: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("角色名"), _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CharacterLibEntrySchema).prefault(_schema_characters__WEBPACK_IMPORTED_MODULE_2__.DEFAULT_CHARACTER_LIB),
      红颜: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("红颜名"), _schema_characters__WEBPACK_IMPORTED_MODULE_2__.CompanionSchema).prefault({}),
      NPC图鉴: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("NPC名"), _schema_characters__WEBPACK_IMPORTED_MODULE_2__.NpcSchema).prefault({}),
      任务列表: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("任务ID"), _schema_systems__WEBPACK_IMPORTED_MODULE_5__.QuestSchema).prefault({}).transform(v => _(v).pickBy((task, taskId) => !!task && !!String(taskId).trim()).mapValues((task, taskId) => ({
        ...task,
        名称: extractChineseQuestLabel(task.名称) || extractChineseQuestLabel(taskId) || getQuestFallbackLabel(task.类型)
      })).pickBy(task => task.状态 === "进行中").value()),
      声望系统: _schema_systems__WEBPACK_IMPORTED_MODULE_5__.ReputationSystemSchema,
      难度系统: _schema_systems__WEBPACK_IMPORTED_MODULE_5__.DifficultySystemSchema,
      $可参与机遇: zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(_schema_systems__WEBPACK_IMPORTED_MODULE_5__.unwrapOpportunityPatchPayload, zod__WEBPACK_IMPORTED_MODULE_0__.z.array(_schema_systems__WEBPACK_IMPORTED_MODULE_5__.OpportunitySchema).prefault([]).transform(list => {
        const seen = new Set;
        return list.flatMap(item => {
          const action = normalizePromptText(item.行动, ACTION_TEXT_LIMIT);
          if (!action || seen.has(action)) {
            return [];
          }
          seen.add(action);
          const hint = normalizePromptText(item.提示, ACTION_HINT_LIMIT);
          const title = normalizePromptText(item.标题, ACTION_TITLE_LIMIT);
          const event = normalizePromptText(item.事件, ACTION_EVENT_LIMIT);
          const eventId = normalizePromptText(item.关联事件ID, ACTION_EVENT_ID_LIMIT);
          return [ {
            ...title ? {
              标题: title
            } : {},
            行动: action,
            类型: item.类型,
            叙事类型: item.叙事类型,
            事件性质: item.事件性质,
            ...event ? {
              事件: event
            } : {},
            ...eventId ? {
              关联事件ID: eventId
            } : {},
            ...hint ? {
              提示: hint
            } : {}
          } ];
        }).slice(0, MAX_OPPORTUNITIES);
      })),
      当前处境: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("").transform(value => normalizePromptText(value, SITUATION_TEXT_LIMIT)),
      _系统设置: _schema_systems__WEBPACK_IMPORTED_MODULE_5__.SystemSettingsSchema,
      _好感度快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("红颜名"), (0, 
      _schema_common__WEBPACK_IMPORTED_MODULE_3__.finiteNumber)(0).transform(v => _.clamp(v, -200, 200))).prefault({})
    }).transform(data => {
      data.红颜角色库 = normalizeCharacterLibraryAliases(data.红颜角色库 ?? {});
      const normalizedCompanionData = normalizeCompanionAliases(data.红颜 ?? {}, data._好感度快照 ?? {});
      data.红颜 = normalizedCompanionData.companions;
      data._好感度快照 = normalizedCompanionData.snapshot;
      const currentCultivationVersion = Math.max(1, Math.floor(Number(data._系统设置?.修炼系统版本 ?? 1) || 1));
      normalizeProtagonistCultivation(data.本尊, currentCultivationVersion);
      for (const companion of Object.values(data.红颜 ?? {})) {
        normalizeCompanionCultivation(companion, currentCultivationVersion);
      }
      data._系统设置 = {
        ...data._系统设置 ?? {},
        修炼系统版本: LATEST_CULTIVATION_SYSTEM_VERSION,
        变量结构版本: LATEST_SCHEMA_VERSION,
        _临时状态手动覆盖签名: String(data._系统设置?._临时状态手动覆盖签名 ?? "")
      };
      const snapshot = _.cloneDeep(data._好感度快照 ?? {});
      for (const [name, companion] of Object.entries(data.红颜 ?? {})) {
        const currentFavor = Number(companion?.好感度);
        if (!Number.isFinite(currentFavor)) {
          continue;
        }
        const prevFavor = Number(snapshot[name]);
        if (Number.isFinite(prevFavor)) {
          const favorDeltaLimit = getFavorDeltaLimitByValue(prevFavor);
          companion.好感度 = _.clamp(currentFavor, prevFavor - favorDeltaLimit, prevFavor + favorDeltaLimit);
        } else {
          companion.好感度 = _.clamp(currentFavor, -200, 200);
        }
        snapshot[name] = companion.好感度;
      }
      data._好感度快照 = _.pickBy(snapshot, (_value, name) => _.has(data.红颜, name));
      return data;
    }));
  },
  "./src/灯火阑珊/schema/characters.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      COMPANION_BOND_EVENT_TYPES: () => COMPANION_BOND_EVENT_TYPES,
      CharacterLibEntrySchema: () => CharacterLibEntrySchema,
      CompanionBondChronicleEntrySchema: () => CompanionBondChronicleEntrySchema,
      CompanionBondChronicleSchema: () => CompanionBondChronicleSchema,
      CompanionRelationContextSchema: () => CompanionRelationContextSchema,
      CompanionSchema: () => CompanionSchema,
      CustomPortraitSchema: () => CustomPortraitSchema,
      DEFAULT_CHARACTER_LIB: () => DEFAULT_CHARACTER_LIB,
      NpcSchema: () => NpcSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const CustomPortraitSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      背面: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const CharacterLibEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      龄: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      属: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("无"),
      器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("无"),
      通: zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()).prefault([]).transform(values => _.uniq(values.map(value => value.trim()).filter(Boolean))),
      自定义立绘: CustomPortraitSchema
    }).prefault({});
    const DEFAULT_CHARACTER_LIB = {
      许听雨: {
        级: 33,
        根: "水本源天",
        质: "归墟神体",
        龄: "外26实12000",
        属: "归墟之主",
        法: "万水归源先天",
        器: "沧海遗珠先天",
        通: [ "归墟歌", "逆流虚妄", "寂灭海域", "万水同源" ]
      },
      虞汐颜: {
        级: 12,
        根: "水阴阳异",
        质: "双鱼体",
        龄: "化形0年",
        属: "{{user}}玉佩",
        法: "双生天极/阴阳",
        器: "双鱼佩本体",
        通: [ "枯木春", "夺命妆", "双鱼梦" ]
      },
      白清弦: {
        级: 29,
        根: "金天根",
        质: "剑体",
        龄: "外30实1000+",
        属: "散修剑宗师",
        法: "剑意仙/天音天",
        器: "清弦琴剑灵宝",
        通: [ "琴剑杀", "剑意歌", "万剑心" ]
      },
      南宫云裳: {
        级: 16,
        根: "火天根",
        质: "神凰道体",
        龄: "外10实118",
        属: "大夏栖凤宫主",
        法: "九转涅槃仙",
        器: "栖梧簪灵宝",
        通: [ "南明离火", "凰威镇世", "羽化虚空" ]
      },
      梦杳泠: {
        级: 23,
        根: "瑞兽异根",
        质: "乘黄圣体",
        龄: "外8实万年+",
        属: "无(末代乘黄)",
        法: "乘黄本源天",
        器: "无",
        通: [ "瑞光庇佑", "灵觉通明", "本源爆发" ]
      },
      羽岚: {
        级: 9,
        根: "虚灵根",
        质: "天渊之鸟血脉/当代圣羽",
        龄: "实历三百/化形二十",
        属: "妖族·青羽云雀/渊缘行者",
        法: "青羽族传（功职同源）",
        器: "青翎（化符成刃）",
        通: [ "鸣啭", "一步缩地", "折叠藏物", "渊域展翼" ]
      },
      阮忘忧: {
        级: 44,
        根: "因果大道本源",
        质: "万法不侵之体",
        龄: "二八芳华/历劫万载",
        属: "仙界仙王（凡界伪装）",
        法: "因果大道",
        器: "无（万物皆兵）",
        通: [ "概念抹除", "因果篡改", "仙王威压", "重塑纪元" ]
      },
      晚棠: {
        级: 15,
        根: "幽冥灵根",
        质: "噬魂之体",
        龄: "未知",
        属: "散修",
        法: "幽冥归魂经天",
        器: "引魂铃灵宝",
        通: [ "冥河指引", "冥莲沉梦", "归魂摆舟" ]
      },
      朔璃鸢: {
        级: 4,
        根: "异变风灵根",
        质: "桂魄玲珑体",
        龄: "外16实16",
        属: "西庚琼轮垂曜宫离宗千金",
        法: "碎星幽影诀残篇",
        器: "碎星双刃",
        通: [ "燕回闪" ]
      },
      朔望舒: {
        级: 32,
        根: "皓月异灵根",
        质: "皓月幽微体",
        龄: "外20实2000+",
        属: "西庚琼轮垂曜宫宫主",
        法: "赤渊镇世血月诀",
        器: "霜魄极品灵宝",
        通: [ "月映千机", "赤月昭心", "月华封禁", "血月镇魂", "万影归宗" ]
      },
      安迟迟: {
        级: 9,
        根: "木属天灵根",
        质: "墨海灵心",
        龄: "外23实23",
        属: "东苍浮云朝露阁藏卷阁掌籍弟子",
        法: "书画载道",
        器: "青琅玕笔",
        通: [ "神魂镇海", "书墨化形", "丹青赋灵", "过目成诵" ]
      },
      沈倩宁: {
        级: 8,
        根: "赤雷血灵根",
        质: "赤雷真血神体",
        龄: "实历二十三载",
        属: "雷暴海·赤霄阁嫡传",
        法: "血雷通玄/重剑法门",
        器: "赤血重刃",
        通: [ "真血化雷", "雷遁", "护刃磁场" ]
      }
    };
    const CompanionRelationContextSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      当前情绪: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      态度缘由: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      关系诉求: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      相处禁忌: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      未了约定: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const COMPANION_BOND_EVENT_TYPES = [ "相识", "共患难", "交心", "护道", "承诺", "分歧", "定情", "离别", "重逢", "其他" ];
    const CompanionBondEventTypeSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(value => COMPANION_BOND_EVENT_TYPES.includes(String(value)) ? value : "其他", zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(COMPANION_BOND_EVENT_TYPES));
    const CompanionBondChronicleEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      类型: CompanionBondEventTypeSchema.prefault("其他"),
      摘要: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      时地: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const CompanionBondChronicleSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("纪事名"), CompanionBondChronicleEntrySchema).prefault({}).transform(entries => Object.fromEntries(_(entries).entries().takeRight(8).value()));
    const CompanionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      修为: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: _common__WEBPACK_IMPORTED_MODULE_1__.SkillListSchema,
      灵石: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      已活岁月: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      尝试突破: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      修炼状态: _common__WEBPACK_IMPORTED_MODULE_1__.CultivationStateSchema,
      好感度: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, -200, 200)).prefault(0),
      关系: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("陌生人"),
      关系上下文: CompanionRelationContextSchema,
      羁绊纪事: CompanionBondChronicleSchema
    }).prefault({
      等级: 1,
      修为: 0,
      灵根: "五行杂灵根",
      体质: "凡体",
      功法: "无",
      本命兵器: "无",
      神通列表: {},
      灵石: 0,
      已活岁月: 0,
      尝试突破: false,
      修炼状态: {
        阶段: "修炼中",
        瓶颈原因: "",
        突破目标: "",
        上次结果: "无",
        境界变动: {
          类型: "无",
          目标等级: 0,
          依据: ""
        }
      },
      好感度: 0,
      关系: "陌生人",
      关系上下文: {},
      羁绊纪事: {}
    }).transform(data => {
      data.修炼状态 = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeCultivationState)(data.修炼状态, {
        legacyAttemptBreakthrough: data.尝试突破,
        level: data.等级,
        cultivation: data.修为
      });
      data.尝试突破 = data.修炼状态.阶段 === "突破中";
      const realmInfo = (0, _common__WEBPACK_IMPORTED_MODULE_1__.computeRealmInfo)(data);
      return {
        ...data,
        ...realmInfo
      };
    });
    const NpcSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      所在宗门: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("散修"),
      备注: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    });
  },
  "./src/灯火阑珊/schema/common.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CultivationStateSchema: () => CultivationStateSchema,
      InventorySchema: () => InventorySchema,
      ItemSchema: () => ItemSchema,
      NormalizedStringListSchema: () => NormalizedStringListSchema,
      RealmTransitionSchema: () => RealmTransitionSchema,
      SkillListSchema: () => SkillListSchema,
      SkillSchema: () => SkillSchema,
      computeRealmInfo: () => computeRealmInfo,
      describeRealmByLevel: () => describeRealmByLevel,
      extractSpiritStoneFromInventory: () => extractSpiritStoneFromInventory,
      finiteNumber: () => finiteNumber,
      getCultivationStatusLabel: () => getCultivationStatusLabel,
      getRealmThreshold: () => getRealmThreshold,
      isSpiritStoneCurrencyItem: () => isSpiritStoneCurrencyItem,
      migrateCultivationProgress: () => migrateCultivationProgress,
      migrateLegacyCultivationProgress: () => migrateLegacyCultivationProgress,
      normalizeCultivationState: () => normalizeCultivationState,
      normalizeRealmLevel: () => normalizeRealmLevel,
      normalizeSpiritStoneAmount: () => normalizeSpiritStoneAmount,
      normalizeSpiritStoneState: () => normalizeSpiritStoneState,
      品阶映射: () => 品阶映射,
      熟练度映射: () => 熟练度映射
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./src/灯火阑珊/schema/constants.ts");
    function finiteNumber(fallback = 0) {
      return zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().catch(fallback);
    }
    const NormalizedStringListSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ zod__WEBPACK_IMPORTED_MODULE_0__.z.array(zod__WEBPACK_IMPORTED_MODULE_0__.z.string()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value ? [ value ] : []) ]).prefault([]).transform(values => _.uniq(values.map(value => value.trim()).filter(Boolean)));
    const 品阶映射 = {
      凡: "凡",
      凡阶: "凡",
      凡级: "凡",
      凡品: "凡",
      黄: "黄",
      黄阶: "黄",
      黄级: "黄",
      黄品: "黄",
      玄: "玄",
      玄阶: "玄",
      玄级: "玄",
      玄品: "玄",
      地: "地",
      地阶: "地",
      地级: "地",
      地品: "地",
      天: "天",
      天阶: "天",
      天级: "天",
      天品: "天",
      仙: "仙",
      仙阶: "仙",
      仙级: "仙",
      仙品: "仙",
      圣: "圣",
      圣阶: "圣",
      圣级: "圣",
      圣品: "圣",
      先天: "先天",
      先天阶: "先天",
      先天级: "先天"
    };
    const 熟练度映射 = {
      入门: "入门",
      初级: "入门",
      初学: "入门",
      新手: "入门",
      熟练: "熟练",
      中级: "熟练",
      娴熟: "熟练",
      小成: "熟练",
      精通: "精通",
      高级: "精通",
      精湛: "精通",
      大成: "大成",
      大师: "大成",
      宗师: "大成",
      圆满: "圆满",
      完美: "圆满",
      极致: "圆满",
      化境: "化境",
      化神: "化境",
      返璞归真: "化境",
      出神入化: "化境"
    };
    function normalizeSkillProficiency(raw) {
      const value = String(raw ?? "").trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
      if (熟练度映射[value]) return 熟练度映射[value];
      if (value.includes("小成")) return "熟练";
      if (value.includes("中成")) return "精通";
      if (value.includes("大圆满")) return "圆满";
      return "入门";
    }
    const ItemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      数量: finiteNumber(0).transform(v => Math.max(0, Math.floor(v))).prefault(1)
    });
    const 灵石货币别名 = new Set([ "灵石", "下品灵石" ]);
    function normalizeSpiritStoneCurrencyName(value) {
      return String(value ?? "").trim().replace(/\s+/g, "");
    }
    function isSpiritStoneCurrencyItem(key, item) {
      const candidates = [ normalizeSpiritStoneCurrencyName(key), normalizeSpiritStoneCurrencyName(item?.名称) ].filter(Boolean);
      return candidates.some(candidate => 灵石货币别名.has(candidate));
    }
    function extractSpiritStoneFromInventory(inventory) {
      const nextInventory = {};
      let spiritStone = 0;
      for (const [key, item] of Object.entries(inventory ?? {})) {
        if (!item) continue;
        if (isSpiritStoneCurrencyItem(key, item)) {
          const amount = Number(item.数量);
          if (Number.isFinite(amount) && amount > 0) {
            spiritStone += amount;
          }
          continue;
        }
        nextInventory[key] = item;
      }
      return {
        inventory: nextInventory,
        spiritStone
      };
    }
    function normalizeSpiritStoneAmount(value) {
      const candidates = [ value ];
      if (_.isPlainObject(value)) {
        const legacyLedger = value;
        candidates.unshift(legacyLedger.下品灵石, legacyLedger.灵石, legacyLedger.数量);
      }
      for (const candidate of candidates) {
        const amountSource = _.isPlainObject(candidate) ? candidate.数量 : candidate;
        if (amountSource == null || typeof amountSource === "string" && !amountSource.trim()) continue;
        const amount = Number(amountSource);
        if (Number.isFinite(amount)) return Math.max(0, amount);
      }
      return 0;
    }
    function normalizeSpiritStoneState(spiritStone, ...inventories) {
      let nextSpiritStone = normalizeSpiritStoneAmount(spiritStone);
      const normalizedInventories = inventories.map(inventory => {
        const normalized = extractSpiritStoneFromInventory(inventory);
        nextSpiritStone += normalized.spiritStone;
        return normalized.inventory;
      });
      return {
        spiritStone: nextSpiritStone,
        inventories: normalizedInventories
      };
    }
    const 修炼阶段映射 = {
      修炼中: "修炼中",
      闭关: "修炼中",
      打坐: "修炼中",
      调息: "修炼中",
      瓶颈中: "瓶颈中",
      瓶颈期: "瓶颈中",
      卡关: "瓶颈中",
      受阻: "瓶颈中",
      突破中: "突破中",
      冲关: "突破中",
      破境: "突破中",
      尝试突破: "突破中",
      稳固中: "稳固中",
      巩固中: "稳固中",
      根基未稳: "稳固中",
      压境中: "压境中",
      压制境界: "压境中",
      藏锋养境: "压境中"
    };
    const 突破结果映射 = {
      无: "无",
      "": "无",
      未突破: "无",
      成功: "成功",
      破境成功: "成功",
      渡过: "成功",
      失败: "失败",
      破境失败: "失败",
      冲关失败: "失败"
    };
    const 境界变动类型映射 = {
      无: "无",
      "": "无",
      突破: "突破",
      正常突破: "突破",
      晋升: "突破",
      跨级突破: "跨级突破",
      连续突破: "跨级突破",
      连破: "跨级突破",
      跌境: "跌境",
      境界跌落: "跌境",
      境界倒退: "跌境"
    };
    function normalizeRealmLevel(value) {
      const level = Number(value);
      if (!Number.isFinite(level)) return 1;
      return _.clamp(Math.floor(level), 1, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length);
    }
    const RealmTransitionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => 境界变动类型映射[String(value).trim()] || "无").prefault("无"),
      目标等级: finiteNumber(0).transform(value => Number.isFinite(value) ? _.clamp(Math.floor(value), 0, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length) : 0).prefault(0),
      依据: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(value => String(value).replace(/\s+/gu, " ").trim()).prefault("")
    }).prefault({
      类型: "无",
      目标等级: 0,
      依据: ""
    });
    const CultivationStateSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 修炼阶段映射[String(v).trim()] || "修炼中").prefault("修炼中"),
      瓶颈原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      突破目标: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(v => String(v).trim()).prefault(""),
      上次结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 突破结果映射[String(v).trim()] || "无").prefault("无"),
      境界变动: RealmTransitionSchema
    }).prefault({
      阶段: "修炼中",
      瓶颈原因: "",
      突破目标: "",
      上次结果: "无",
      境界变动: {
        类型: "无",
        目标等级: 0,
        依据: ""
      }
    });
    function describeRealmByLevel(level) {
      const normalizedLevel = normalizeRealmLevel(level);
      const majorIdx = Math.floor((normalizedLevel - 1) / 4);
      const minorIdx = (normalizedLevel - 1) % 4;
      return `${_constants__WEBPACK_IMPORTED_MODULE_1__.REALM_NAMES[majorIdx] ?? "练气"}${_constants__WEBPACK_IMPORTED_MODULE_1__.REALM_STAGES[minorIdx] ?? "初期"}`;
    }
    function resolveRealmThresholds(versionOrLegacyFlag = 3) {
      if (versionOrLegacyFlag === true) {
        return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[1];
      }
      if (versionOrLegacyFlag === false) {
        return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[3];
      }
      const normalizedVersion = Math.max(1, Math.floor(Number(versionOrLegacyFlag) || 3));
      return _constants__WEBPACK_IMPORTED_MODULE_1__.CULTIVATION_THRESHOLDS_BY_VERSION[normalizedVersion] ?? _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS;
    }
    function getRealmThreshold(level, versionOrLegacyFlag = 3) {
      const thresholds = resolveRealmThresholds(versionOrLegacyFlag);
      const normalizedLevel = _.clamp(Math.floor(Number(level) || 1), 1, thresholds.length);
      return thresholds[normalizedLevel - 1] ?? thresholds[0] ?? 100;
    }
    function migrateCultivationProgress(level, cultivation, fromVersion = 1, toVersion = 3) {
      const normalizedCultivation = Number(cultivation);
      if (!Number.isFinite(normalizedCultivation) || normalizedCultivation <= 0) {
        return 0;
      }
      const previousThreshold = getRealmThreshold(level, fromVersion);
      const nextThreshold = getRealmThreshold(level, toVersion);
      if (previousThreshold <= 0 || previousThreshold === nextThreshold) {
        return Math.round(normalizedCultivation);
      }
      const progressRatio = normalizedCultivation / previousThreshold;
      const migrated = Math.round(progressRatio * nextThreshold);
      return Math.max(0, migrated);
    }
    function migrateLegacyCultivationProgress(level, cultivation) {
      return migrateCultivationProgress(level, cultivation, 1, 3);
    }
    function normalizeCultivationState(rawState, options) {
      const parsedState = CultivationStateSchema.parse(rawState ?? {});
      const level = normalizeRealmLevel(options.level);
      const threshold = getRealmThreshold(level);
      let phase = parsedState.阶段;
      if (options.legacyAttemptBreakthrough || phase === "突破中") {
        phase = "突破中";
      } else if (phase === "修炼中" && options.cultivation >= threshold) {
        phase = "瓶颈中";
      }
      const transition = _.cloneDeep(parsedState.境界变动);
      if (transition.类型 === "无") {
        transition.目标等级 = 0;
        transition.依据 = "";
      }
      const configuredTarget = transition.类型 !== "无" && transition.类型 !== "跌境" && transition.目标等级 > level ? transition.目标等级 : Math.min(level + 1, _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length);
      const nextRealmTarget = level < _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_THRESHOLDS.length ? describeRealmByLevel(configuredTarget) : "";
      const shouldHaveBreakthroughTarget = [ "瓶颈中", "突破中", "压境中" ].includes(phase);
      return {
        阶段: phase,
        瓶颈原因: shouldHaveBreakthroughTarget ? parsedState.瓶颈原因 : "",
        突破目标: shouldHaveBreakthroughTarget ? nextRealmTarget : "",
        上次结果: parsedState.上次结果,
        境界变动: transition
      };
    }
    function getCultivationStatusLabel(state, cultivation, threshold) {
      const phase = state?.阶段 || "修炼中";
      if (phase === "突破中") return "突破中";
      if (phase === "稳固中") return "稳固中";
      if (phase === "压境中") return "压境中";
      if (phase === "瓶颈中" || cultivation >= threshold) return "瓶颈期";
      return "修炼中";
    }
    const SkillSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(value => typeof value === "string" ? {
      描述: value
    } : value, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "功法", "神通", "秘术" ]).prefault("神通"),
      品阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 品阶映射[v] || "凡").catch("凡"),
      熟练度: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => normalizeSkillProficiency(v)).catch("入门"),
      领悟时间: finiteNumber(Date.now()).prefault(() => Date.now())
    }));
    const SkillListSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("神通名"), SkillSchema).prefault({}).transform(skills => _(skills).entries().map(([rawName, skill]) => {
      const name = String(rawName).trim();
      return [ name, {
        ...skill,
        名称: skill.名称 || name
      } ];
    }).filter(([name]) => !!name).fromPairs().value());
    const InventorySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("物品名"), ItemSchema).prefault({}).transform(data => _(data).entries().map(([rawName, item]) => {
      const name = String(rawName).trim();
      return [ name, {
        ...item,
        名称: item.名称 || name
      } ];
    }).filter(([name, item]) => !!name && item.数量 > 0).fromPairs().value());
    function computeRealmInfo(data) {
      const level = data.等级;
      const 突破阈值 = getRealmThreshold(level);
      const 寿元上限 = _constants__WEBPACK_IMPORTED_MODULE_1__.REALM_LIFESPANS[level - 1] ?? 100;
      const 境界描述 = describeRealmByLevel(level);
      const 寿元状态 = `${data.已活岁月}/${寿元上限}`;
      const 状态 = getCultivationStatusLabel(data.修炼状态, data.修为, 突破阈值);
      const progressRatio = 突破阈值 > 0 ? _.clamp(data.修为 / 突破阈值, 0, 1) : 0;
      const 进度 = `${(progressRatio * 100).toFixed(1)}%`;
      return {
        突破阈值,
        寿元上限,
        境界描述,
        寿元状态,
        状态,
        进度
      };
    }
  },
  "./src/灯火阑珊/schema/constants.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      CONFIG: () => CONFIG,
      CULTIVATION_THRESHOLDS_BY_VERSION: () => CULTIVATION_THRESHOLDS_BY_VERSION,
      LEGACY_REALM_THRESHOLDS: () => LEGACY_REALM_THRESHOLDS,
      REALM_LIFESPANS: () => REALM_LIFESPANS,
      REALM_NAMES: () => REALM_NAMES,
      REALM_STAGES: () => REALM_STAGES,
      REALM_THRESHOLDS: () => REALM_THRESHOLDS,
      REALM_THRESHOLDS_V2: () => REALM_THRESHOLDS_V2
    });
    const REALM_STAGES = [ "初期", "中期", "后期", "大圆满" ];
    const REALM_NAMES = [ "练气", "筑基", "金丹", "元婴", "化神", "炼虚", "合体", "大乘", "渡劫", "真仙", "仙王", "仙帝" ];
    const LEGACY_REALM_THRESHOLDS = [ 100, 200, 300, 400, 500, 600, 700, 800, 900, 1e3, 1100, 1200, 2400, 2400, 2400, 2400, 4800, 4800, 4800, 4800, 9600, 9600, 9600, 9600, 19200, 19200, 19200, 19200, 38400, 38400, 38400, 38400, 76800, 76800, 76800, 76800, 153600, 153600, 153600, 153600, 307200, 307200, 307200, 307200, 614400, 614400, 614400, 614400 ];
    const V2_REALM_MAJOR_BASES = [ 100, 160, 260, 420, 680, 1100, 1780, 2880, 4660, 7540, 12200, 19740 ];
    const V2_REALM_MINOR_MULTIPLIERS = [ 1, 1.18, 1.38, 1.6 ];
    const REALM_THRESHOLDS_V2 = V2_REALM_MAJOR_BASES.flatMap(base => V2_REALM_MINOR_MULTIPLIERS.map(multiplier => Math.round(base * multiplier)));
    const REALM_THRESHOLDS = [ 100, 200, 300, 400, 500, 600, 700, 800, 900, 1e3, 1100, 1200, 2400, 2880, 3360, 3840, 4800, 5760, 6720, 7680, 9600, 11520, 13440, 15360, 19200, 23040, 26880, 30720, 38400, 46080, 53760, 61440, 76800, 92160, 107520, 122880, 153600, 184320, 215040, 245760, 307200, 368640, 430080, 491520, 614400, 737280, 860160, 983040 ];
    const CULTIVATION_THRESHOLDS_BY_VERSION = {
      1: LEGACY_REALM_THRESHOLDS,
      2: REALM_THRESHOLDS_V2,
      3: REALM_THRESHOLDS
    };
    const REALM_LIFESPANS = [ 100, 100, 100, 100, 200, 200, 200, 200, 500, 500, 500, 500, 1e3, 1e3, 1e3, 1e3, 2e3, 2e3, 2e3, 2e3, 5e3, 5e3, 5e3, 5e3, 1e4, 1e4, 1e4, 1e4, 5e4, 5e4, 5e4, 5e4, 1e5, 1e5, 1e5, 1e5, 5e5, 5e5, 5e5, 5e5, 2e6, 2e6, 2e6, 2e6, 1e7, 1e7, 1e7, 1e7 ];
    const CONFIG = {
      REALMS: {
        MAJOR: REALM_NAMES,
        MINOR: REALM_STAGES
      },
      ELEMENTS: {
        火: {
          effect: "灼烧",
          visual: "烈焰",
          nature: "爆裂",
          color: "#ff4444"
        },
        水: {
          effect: "缠绕",
          visual: "激流",
          nature: "柔韧",
          color: "#4488ff"
        },
        冰: {
          effect: "冻结",
          visual: "寒霜",
          nature: "极寒",
          color: "#88ddff"
        },
        雷: {
          effect: "麻痹",
          visual: "紫电",
          nature: "狂暴",
          color: "#aa44ff"
        },
        风: {
          effect: "切割",
          visual: "罡风",
          nature: "无形",
          color: "#88ff88"
        },
        土: {
          effect: "镇压",
          visual: "岩铠",
          nature: "厚重",
          color: "#aa8844"
        },
        木: {
          effect: "寄生",
          visual: "藤蔓",
          nature: "生生不息",
          color: "#44aa44"
        },
        金: {
          effect: "穿透",
          visual: "锐金",
          nature: "锋利",
          color: "#ffdd44"
        },
        暗: {
          effect: "腐蚀",
          visual: "黑雾",
          nature: "诡谲",
          color: "#442244"
        },
        光: {
          effect: "净化",
          visual: "圣辉",
          nature: "神圣",
          color: "#ffffaa"
        },
        混沌: {
          effect: "湮灭",
          visual: "灰光",
          nature: "虚无",
          color: "#888888"
        }
      }
    };
  },
  "./src/灯火阑珊/schema/protagonist.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ProtagonistSchema: () => ProtagonistSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./utils */ "./src/灯火阑珊/schema/utils.ts");
    const 战斗阶段映射 = {
      平静: "平静",
      非战斗: "平静",
      和平: "平静",
      安全: "平静",
      对峙: "对峙",
      警戒: "对峙",
      僵持: "对峙",
      试探: "试探",
      交锋: "交锋",
      激战: "交锋",
      战斗: "交锋",
      交战: "交锋",
      厮杀: "交锋",
      决胜: "决胜",
      重伤: "决胜",
      濒死: "决胜",
      脱战: "脱战",
      余波: "余波"
    };
    const 战局态势映射 = {
      敌方压制: "敌方压制",
      绝望: "敌方压制",
      敌方占先: "敌方占先",
      劣势: "敌方占先",
      相持: "相持",
      势均力敌: "相持",
      敌我相当: "相持",
      我方占先: "我方占先",
      优势: "我方占先",
      我方压制: "我方压制",
      碾压: "我方压制"
    };
    const 敌人状态映射 = {
      全盛: "全盛",
      完好: "全盛",
      无伤: "全盛",
      健康: "全盛",
      受制: "受制",
      压制: "受制",
      轻伤: "负伤",
      小伤: "负伤",
      微伤: "负伤",
      负伤: "负伤",
      重伤: "重创",
      伤重: "重创",
      大伤: "重创",
      重创: "重创",
      濒死: "失能",
      将死: "失能",
      垂危: "失能",
      失能: "失能",
      退走: "退走",
      逃离: "退走",
      被擒: "被擒",
      俘虏: "被擒",
      败亡: "败亡",
      已死: "败亡",
      死亡: "败亡",
      击杀: "败亡",
      阵亡: "败亡"
    };
    const limitedStringList = limit => _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema.transform(values => values.slice(-limit));
    const burdenDescription = fallback => zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim() || fallback).catch(fallback).prefault(fallback);
    function migrateLegacyCombatStatus(value) {
      if (!_.isPlainObject(value)) return {};
      const raw = {
        ...value
      };
      if ("战局" in raw || "负荷" in raw || "交锋轮次" in raw || "阶段" in raw) return raw;
      const active = raw.正在战斗 === true;
      const injury = String(raw.伤势等级 ?? "无伤");
      const usedCards = Array.isArray(raw.已用底牌) ? raw.已用底牌 : [];
      const spirit = _.clamp(Number(raw.灵力值 ?? 100) || 0, 0, 100);
      const phase = active ? 战斗阶段映射[String(raw.当前状态 ?? "交锋")] || "交锋" : injury !== "无伤" || spirit < 100 || usedCards.length > 0 ? "余波" : "平静";
      return {
        正在战斗: active,
        阶段: phase,
        交锋轮次: raw.战斗回合 ?? 0,
        战局: {
          态势: "相持",
          已显手段: {
            我方: usedCards,
            敌方: []
          }
        },
        负荷: {
          真元: spirit >= 70 ? "充盈" : spirit >= 40 ? "尚足" : spirit >= 10 ? "吃紧" : "枯竭",
          神识: "澄明",
          肉身: injury === "濒死" || injury === "将死" || injury === "垂危" ? "濒危" : injury === "重伤" || injury === "伤重" || injury === "大伤" ? "重创" : injury === "轻伤" || injury === "小伤" || injury === "微伤" ? "轻创" : "无恙"
        }
      };
    }
    function migrateLegacyEnemies(value) {
      if (!Array.isArray(value)) return value ?? {};
      const enemies = {};
      value.forEach((entry, index) => {
        const raw = _.isPlainObject(entry) ? entry : {};
        const baseName = String(raw.名称 ?? `未知敌人${index + 1}`).trim() || `未知敌人${index + 1}`;
        let name = baseName;
        let suffix = 2;
        while (_.has(enemies, name)) {
          name = `${baseName}·${suffix}`;
          suffix += 1;
        }
        enemies[name] = raw;
      });
      return enemies;
    }
    function protectProtagonistFromLethalResult(value) {
      if (!_.isPlainObject(value)) return value;
      const raw = {
        ...value
      };
      const result = String(raw.结果 ?? "无").trim();
      if (![ "死亡", "败亡", "身死", "殒命", "魂飞魄散" ].includes(result)) return raw;
      const achieved = String(raw.达成 ?? "");
      raw.结果 = /脱|逃|救|传送|遁/u.test(achieved) ? "脱身" : "负";
      const costs = Array.isArray(raw.代价) ? raw.代价.map(String).filter(Boolean) : [];
      raw.代价 = costs.length > 0 ? costs : [ "死劫反噬未消" ];
      return raw;
    }
    const 劫种映射 = {
      无: "无",
      "": "无",
      无劫: "无",
      雷劫: "雷劫",
      天雷: "雷劫",
      雷: "雷劫",
      心劫: "心劫",
      心魔: "心劫",
      魔劫: "心劫",
      天劫: "天劫",
      大劫: "天劫",
      情劫: "情劫",
      情关: "情劫",
      因果劫: "因果劫",
      因果: "因果劫",
      红尘劫: "红尘劫",
      红尘: "红尘劫",
      轮回劫: "轮回劫",
      轮回: "轮回劫"
    };
    const 劫难等级映射 = {
      无: "无",
      无劫: "无",
      小劫: "小劫",
      小: "小劫",
      初级: "小劫",
      中劫: "中劫",
      中: "中劫",
      中级: "中劫",
      大劫: "大劫",
      大: "大劫",
      高级: "大劫",
      天罚: "天罚",
      天: "天罚",
      极: "天罚",
      天道: "天罚"
    };
    const 渡劫结果映射 = {
      无: "无",
      "": "无",
      未渡劫: "无",
      成功: "成功",
      通过: "成功",
      渡过: "成功",
      失败: "失败",
      未过: "失败",
      失: "失败"
    };
    const BattleSceneSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      态势: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 战局态势映射[String(v).trim()] || "相持").prefault("相持"),
      我方目的: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v.trim()).prefault(""),
      敌方目的: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v.trim()).prefault(""),
      战场要素: limitedStringList(4),
      态势依据: limitedStringList(4),
      战机: limitedStringList(3),
      危机: limitedStringList(3),
      已显手段: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        我方: limitedStringList(6),
        敌方: limitedStringList(6)
      }).prefault({
        我方: [],
        敌方: []
      }),
      最近转折: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v.trim()).prefault("")
    }).prefault({
      态势: "相持",
      我方目的: "",
      敌方目的: "",
      战场要素: [],
      态势依据: [],
      战机: [],
      危机: [],
      已显手段: {
        我方: [],
        敌方: []
      },
      最近转折: ""
    });
    const BattleBurdenSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      真元: burdenDescription("充盈"),
      神识: burdenDescription("澄明"),
      肉身: burdenDescription("无恙")
    }).prefault({
      真元: "充盈",
      神识: "澄明",
      肉身: "无恙"
    });
    const LastBattleResultSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(protectProtagonistFromLethalResult, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "无", "胜", "负", "脱身", "议和", "中止" ]).catch("无").prefault("无"),
      对手: limitedStringList(8),
      达成: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v.trim()).prefault(""),
      代价: limitedStringList(6),
      后患: limitedStringList(6)
    }).prefault({
      结果: "无",
      对手: [],
      达成: "",
      代价: [],
      后患: []
    }));
    const CombatStatusSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(migrateLegacyCombatStatus, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正在战斗: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 战斗阶段映射[String(v).trim()] || "平静").prefault("平静"),
      交锋轮次: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, Math.floor(v))).prefault(0),
      战局: BattleSceneSchema,
      负荷: BattleBurdenSchema,
      最近战果: LastBattleResultSchema
    }).prefault({
      正在战斗: false,
      阶段: "平静",
      交锋轮次: 0,
      战局: {},
      负荷: {},
      最近战果: {}
    }));
    const EnemySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(value => {
      const raw = _.isPlainObject(value) ? {
        ...value
      } : {};
      if (raw.等级 == null) raw.等级 = (0, _utils__WEBPACK_IMPORTED_MODULE_2__.parseRealmToLevel)(String(raw.境界 ?? ""));
      if (raw.威胁手段 == null && raw.特点 != null) raw.威胁手段 = [ String(raw.特点) ];
      raw.状态 = 敌人状态映射[String(raw.状态 ?? "全盛")] || "全盛";
      return raw;
    }, zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "全盛", "受制", "负伤", "重创", "失能", "退走", "被擒", "败亡" ]).catch("全盛").prefault("全盛"),
      目的: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => v.trim()).prefault(""),
      威胁手段: limitedStringList(4),
      已暴露破绽: limitedStringList(3)
    }).transform(enemy => ({
      ...enemy,
      境界描述: (0, _common__WEBPACK_IMPORTED_MODULE_1__.describeRealmByLevel)(enemy.等级)
    })));
    const CurrentEnemiesSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(migrateLegacyEnemies, zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("敌人名"), EnemySchema).prefault({}).transform(enemies => _(enemies).entries().map(([rawName, enemy]) => [ String(rawName).trim(), enemy ]).filter(([name]) => !!name).fromPairs().value()));
    const TribulationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      正在渡劫: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      劫种: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 劫种映射[v] || "无").prefault("无"),
      劫难等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 劫难等级映射[v] || "无").prefault("无"),
      当前阶段: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, 0, 9)).prefault(0),
      总阶段数: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => _.clamp(v, 0, 9)).prefault(0),
      劫力承受: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(100).transform(v => _.clamp(v, 0, 100)).prefault(100),
      已用护道: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
      劫难描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      触发原因: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      上次渡劫结果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 渡劫结果映射[v] || "无").prefault("无"),
      渡劫冷却: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      失败惩罚记录: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({
      正在渡劫: false,
      劫种: "无",
      劫难等级: "无",
      当前阶段: 0,
      总阶段数: 0,
      劫力承受: 100,
      已用护道: [],
      劫难描述: "",
      触发原因: "",
      上次渡劫结果: "无",
      渡劫冷却: 0,
      失败惩罚记录: ""
    }).transform(data => {
      if (data.正在渡劫) {
        return {
          ...data,
          劫难等级: data.劫难等级 === "无" ? "小劫" : data.劫难等级,
          当前阶段: _.clamp(data.当前阶段, 0, 9),
          总阶段数: _.clamp(Math.max(data.总阶段数 || 3, data.当前阶段, 1), 1, 9)
        };
      }
      return {
        ...data,
        劫种: "无",
        劫难等级: "无",
        当前阶段: 0,
        总阶段数: 0,
        劫难描述: "",
        触发原因: ""
      };
    });
    const LocationTrackSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      当前区域: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("未知之地"),
      所属层级: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("地层"),
      环境描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      危险度: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(10).transform(v => _.clamp(v, 0, 100)).prefault(10),
      可用通道: _common__WEBPACK_IMPORTED_MODULE_1__.NormalizedStringListSchema,
      导航信息: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({
      当前区域: "未知之地",
      所属层级: "地层",
      环境描述: "",
      危险度: 10,
      可用通道: [],
      导航信息: ""
    });
    const IdentitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      姓名: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无名氏"),
      宗门: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("散修"),
      出身: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡人")
    }).prefault({
      姓名: "无名氏",
      宗门: "散修",
      出身: "凡人"
    });
    const ProtagonistSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      等级: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(1).transform(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeRealmLevel).prefault(1),
      修为: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      灵根: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("五行杂灵根"),
      体质: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("凡体"),
      功法: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      本命兵器: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("无"),
      神通列表: _common__WEBPACK_IMPORTED_MODULE_1__.SkillListSchema,
      灵石: zod__WEBPACK_IMPORTED_MODULE_0__.z.preprocess(_common__WEBPACK_IMPORTED_MODULE_1__.normalizeSpiritStoneAmount, (0, 
      _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v))).prefault(0),
      已活岁月: (0, _common__WEBPACK_IMPORTED_MODULE_1__.finiteNumber)(0).transform(v => Math.max(0, v)).prefault(0),
      尝试突破: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(false),
      修炼状态: _common__WEBPACK_IMPORTED_MODULE_1__.CultivationStateSchema,
      行踪: LocationTrackSchema,
      身份: IdentitySchema,
      _档案: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.replace(/\r\n?/gu, "\n").trim()).prefault(""),
      背包: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      法宝: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      杂物袋: _common__WEBPACK_IMPORTED_MODULE_1__.InventorySchema,
      战斗状态: CombatStatusSchema,
      当前敌人: CurrentEnemiesSchema,
      渡劫状态: TribulationSchema
    }).prefault({
      等级: 1,
      修为: 0,
      灵根: "五行杂灵根",
      体质: "凡体",
      功法: "无",
      本命兵器: "无",
      神通列表: {},
      灵石: 0,
      已活岁月: 0,
      尝试突破: false,
      修炼状态: {
        阶段: "修炼中",
        瓶颈原因: "",
        突破目标: "",
        上次结果: "无",
        境界变动: {
          类型: "无",
          目标等级: 0,
          依据: ""
        }
      },
      行踪: {
        当前区域: "未知之地",
        所属层级: "地层",
        环境描述: "",
        危险度: 10,
        可用通道: [],
        导航信息: ""
      },
      身份: {
        姓名: "无名氏",
        宗门: "散修",
        出身: "凡人"
      },
      _档案: "",
      背包: {},
      法宝: {},
      杂物袋: {},
      战斗状态: {
        正在战斗: false,
        阶段: "平静",
        交锋轮次: 0,
        战局: {
          态势: "相持",
          我方目的: "",
          敌方目的: "",
          战场要素: [],
          态势依据: [],
          战机: [],
          危机: [],
          已显手段: {
            我方: [],
            敌方: []
          },
          最近转折: ""
        },
        负荷: {
          真元: "充盈",
          神识: "澄明",
          肉身: "无恙"
        },
        最近战果: {
          结果: "无",
          对手: [],
          达成: "",
          代价: [],
          后患: []
        }
      },
      当前敌人: {},
      渡劫状态: {
        正在渡劫: false,
        劫种: "无",
        劫难等级: "无",
        当前阶段: 0,
        总阶段数: 0,
        劫力承受: 100,
        已用护道: [],
        劫难描述: "",
        触发原因: "",
        上次渡劫结果: "无",
        渡劫冷却: 0,
        失败惩罚记录: ""
      }
    }).transform(data => {
      const spiritStoneNormalization = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeSpiritStoneState)(data.灵石, data.背包, data.杂物袋);
      const [normalizedBackpack, normalizedMiscBag] = spiritStoneNormalization.inventories;
      data.灵石 = spiritStoneNormalization.spiritStone;
      data.背包 = normalizedBackpack ?? {};
      data.杂物袋 = normalizedMiscBag ?? {};
      data.修炼状态 = (0, _common__WEBPACK_IMPORTED_MODULE_1__.normalizeCultivationState)(data.修炼状态, {
        legacyAttemptBreakthrough: data.尝试突破,
        level: data.等级,
        cultivation: data.修为
      });
      data.尝试突破 = data.修炼状态.阶段 === "突破中";
      const realmInfo = (0, _common__WEBPACK_IMPORTED_MODULE_1__.computeRealmInfo)(data);
      return {
        ...data,
        ...realmInfo
      };
    });
  },
  "./src/灯火阑珊/schema/systems.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      ActionSystemSettingsSchema: () => ActionSystemSettingsSchema,
      DifficultySystemSchema: () => DifficultySystemSchema,
      OpportunitySchema: () => OpportunitySchema,
      QuestSchema: () => QuestSchema,
      ReputationEntrySchema: () => ReputationEntrySchema,
      ReputationSystemSchema: () => ReputationSystemSchema,
      SystemSettingsSchema: () => SystemSettingsSchema,
      WORLD_EVENT_ACTIVE_LIMIT: () => WORLD_EVENT_ACTIVE_LIMIT,
      WORLD_EVENT_HISTORY_LIMIT: () => WORLD_EVENT_HISTORY_LIMIT,
      WORLD_EVENT_LEDGER_LIMIT: () => WORLD_EVENT_LEDGER_LIMIT,
      WorldEventLedgerSchema: () => WorldEventLedgerSchema,
      WorldEventSchema: () => WorldEventSchema,
      compactWorldEventLedger: () => compactWorldEventLedger,
      compareWorldEventTimeDescending: () => compareWorldEventTimeDescending,
      unwrapOpportunityPatchPayload: () => unwrapOpportunityPatchPayload
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _map_system__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../map-system */ "./src/灯火阑珊/map-system.ts");
    var _common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const 任务状态映射 = {
      进行中: "进行中",
      进行: "进行中",
      处理中: "进行中",
      未完成: "进行中",
      待完成: "进行中",
      未开始: "进行中",
      已接取: "进行中",
      接取: "进行中",
      active: "进行中",
      已完成: "已完成",
      完成: "已完成",
      完成了: "已完成",
      已达成: "已完成",
      达成: "已完成",
      已结束: "已完成",
      结束: "已完成",
      done: "已完成",
      complete: "已完成",
      completed: "已完成",
      已失败: "已失败",
      失败: "已失败",
      失敗: "已失败",
      失败了: "已失败",
      中止: "已失败",
      终止: "已失败",
      放弃: "已失败",
      超时失败: "已失败",
      failed: "已失败",
      fail: "已失败"
    };
    const 任务类型映射 = {
      主线: "主线",
      主任务: "主线",
      主线任务: "主线",
      main: "主线",
      支线: "支线",
      支线任务: "支线",
      side: "支线",
      sidequest: "支线",
      每日: "每日",
      日常: "每日",
      每日任务: "每日",
      daily: "每日",
      临危受命: "临危受命",
      紧急: "临危受命",
      紧急任务: "临危受命",
      urgent: "临危受命",
      秘境探索: "秘境探索",
      秘境: "秘境探索",
      探索: "秘境探索",
      秘境任务: "秘境探索",
      dungeon: "秘境探索",
      修炼: "支线",
      修炼任务: "支线"
    };
    const QuestSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 任务类型映射[String(v).trim()] || "支线").prefault("主线"),
      目标: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      进度: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      下一步: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault(""),
      状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 任务状态映射[String(v).trim()] || "进行中").prefault("进行中"),
      秘境信息: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        域: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(_map_system__WEBPACK_IMPORTED_MODULE_1__.LOCATION_DOMAIN_VALUES).optional(),
        危: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).transform(v => _.clamp(v, 0, 100)).optional(),
        特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional(),
        奖: _common__WEBPACK_IMPORTED_MODULE_2__.NormalizedStringListSchema,
        限: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().optional()
      }).optional(),
      创建时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(Date.now()), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(() => Date.now()) ]).prefault(() => Date.now())
    });
    const ReputationEntrySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      值: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).transform(v => _.clamp(v, -100, 100)).prefault(0),
      关系: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("陌生"),
      更新时间: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(Date.now()).prefault(() => Date.now())
    });
    const ReputationSystemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("势力名"), ReputationEntrySchema).prefault({}).transform(factions => {
      const autoRelationLabels = new Set([ "陌生", "盟友", "友善", "友好", "中立偏好", "中立", "中立偏恶", "敌对", "仇恨", "不死不休" ]);
      return _(factions).mapValues(faction => {
        const value = faction.值;
        let 自动关系;
        if (value >= 80) {
          自动关系 = "盟友";
        } else if (value >= 60) {
          自动关系 = "友善";
        } else if (value >= 30) {
          自动关系 = "友好";
        } else if (value >= 10) {
          自动关系 = "中立偏好";
        } else if (value >= -10) {
          自动关系 = "中立";
        } else if (value >= -30) {
          自动关系 = "中立偏恶";
        } else if (value >= -60) {
          自动关系 = "敌对";
        } else if (value >= -80) {
          自动关系 = "仇恨";
        } else {
          自动关系 = "不死不休";
        }
        const 最终关系 = faction.关系 && !autoRelationLabels.has(faction.关系) ? faction.关系 : 自动关系;
        return {
          ...faction,
          关系: 最终关系
        };
      }).value();
    });
    const 叙事类型映射 = {
      平淡: "平淡延续",
      平淡延续: "平淡延续",
      继续: "当前行动",
      当前行动: "当前行动",
      行动: "当前行动",
      事件: "事件行动",
      事件行动: "事件行动",
      回应: "回应事件",
      回应事件: "回应事件",
      大纲: "场景大纲",
      场景大纲: "场景大纲",
      时间跳转: "时间推进",
      时间推进: "时间推进",
      calm: "平淡延续",
      action: "当前行动",
      event: "事件行动",
      response: "回应事件",
      outline: "场景大纲",
      timeskip: "时间推进"
    };
    const 事件性质映射 = {
      无: "无事件",
      无事件: "无事件",
      候选: "选中后成立",
      候选事件: "选中后成立",
      选中后成立: "选中后成立",
      已发生: "回应已发生事件",
      回应已发生事件: "回应已发生事件",
      none: "无事件",
      candidate: "选中后成立",
      existing: "回应已发生事件"
    };
    const 机遇类型映射 = {
      探索: "探索",
      行动: "探索",
      冒险: "探索",
      机缘: "探索",
      机遇: "探索",
      奇遇: "探索",
      秘境: "探索",
      寻宝: "探索",
      交涉: "交涉",
      结交: "交涉",
      交谈: "交涉",
      社交: "交涉",
      互动: "交涉",
      邀约: "交涉",
      邂逅: "交涉",
      战斗: "战斗",
      争夺: "战斗",
      挑战: "战斗",
      修炼: "修炼",
      整备: "整备",
      交易: "整备",
      采购: "整备",
      易物: "整备",
      买卖: "整备",
      红颜: "亲密",
      双修: "亲密",
      亲密: "亲密",
      调情: "亲密",
      explore: "探索",
      exploration: "探索",
      adventure: "探索",
      negotiate: "交涉",
      negotiation: "交涉",
      social: "交涉",
      interaction: "交涉",
      battle: "战斗",
      combat: "战斗",
      fight: "战斗",
      cultivate: "修炼",
      cultivation: "修炼",
      training: "修炼",
      prepare: "整备",
      preparation: "整备",
      supply: "整备",
      trade: "整备",
      intimate: "亲密",
      intimacy: "亲密",
      romance: "亲密"
    };
    const 机遇类型推断规则 = [ {
      type: "亲密",
      pattern: /红颜|佳人|道侣|双修|温情|独处|相拥|相守|调情|缠绵|共寝|同眠|亲吻|亲密|忘忧|听雨|清弦|晚棠|云裳|梦杳泠|羽岚|羽岚烟|岚烟|朔璃鸢|阿鸢|血手飞鸢|朔望舒|赤月女帝|幽影宗主|虞汐|虞颜|虞汐颜|沈倩宁|倩宁|赤血狂刃/
    }, {
      type: "修炼",
      pattern: /修炼|闭关|打坐|吐纳|调息|冲关|破境|突破|压境|稳固|悟道|渡劫|根基|炼化|参悟/
    }, {
      type: "整备",
      pattern: /整备|修复|炼器|疗伤|丹药|灵阵|阵纹|坊市|易物|交易|买卖|采购|拍卖|商会|补给|售卖|收购|置换/
    }, {
      type: "战斗",
      pattern: /战斗|争夺|夺取|抢夺|截杀|斗法|厮杀|围攻|追杀|迎战|强敌|魔修|冲突|守擂|比斗/
    }, {
      type: "交涉",
      pattern: /交涉|交谈|结交|拜访|邀约|会面|结识|拉拢|试探|求见|访友|赴宴|询问|劝说|谈判|论道|同游/
    }, {
      type: "探索",
      pattern: /探索|探查|调查|追查|搜寻|寻找|寻路|赶路|潜入|护送|营救|赴约|秘境|线索|遗迹|洞穴/
    } ];
    function normalizeOpportunityText(value) {
      return String(value ?? "").trim();
    }
    function normalizeNarrativeKind(value, eventNature) {
      const mapped = 叙事类型映射[normalizeOpportunityText(value).toLowerCase()];
      if (mapped) return mapped;
      if (eventNature === "回应已发生事件") return "回应事件";
      if (eventNature === "选中后成立") return "事件行动";
      return "当前行动";
    }
    function normalizeProposalEventNature(value, event, eventId) {
      const mapped = 事件性质映射[normalizeOpportunityText(value).toLowerCase()];
      if (mapped) return mapped;
      if (eventId) return "回应已发生事件";
      if (event) return "选中后成立";
      return "无事件";
    }
    function inferOpportunityType(rawType, payload) {
      const mappedType = 机遇类型映射[normalizeOpportunityText(rawType).toLowerCase()];
      if (mappedType) return mappedType;
      const text = Object.values(payload).map(value => normalizeOpportunityText(value)).filter(Boolean).join("｜");
      for (const rule of 机遇类型推断规则) {
        if (rule.pattern.test(text)) return rule.type;
      }
      return "探索";
    }
    function buildLegacyOpportunityHint(timeLimit, risk) {
      const parts = [ /^(?:无|无时限|不限)$/u.test(timeLimit) ? "" : timeLimit, /^(?:无|无风险)$/u.test(risk) ? "" : risk ].filter(Boolean);
      return _.uniq(parts).join(" · ");
    }
    function getOpportunityPatchIndex(value) {
      if (!value || typeof value !== "object" || Array.isArray(value) || "行动" in value || "action" in value) {
        return undefined;
      }
      const wrapper = value;
      if (![ "replace", "insert" ].includes(String(wrapper.op ?? "")) || !Object.hasOwn(wrapper, "value")) {
        return undefined;
      }
      const normalizedPath = String(wrapper.path ?? "").trim().replace(/^\/+/u, "").replace(/^stat_data[./]/u, "").replaceAll("/", ".");
      if (normalizedPath === "$可参与机遇" || normalizedPath === "可参与机遇") return null;
      const indexMatch = /^\$?可参与机遇\.(\d+)$/u.exec(normalizedPath);
      return indexMatch ? Number(indexMatch[1]) : undefined;
    }
    function unwrapOpportunityPatchLayer(value) {
      const directIndex = getOpportunityPatchIndex(value);
      if (directIndex === null) {
        return {
          changed: true,
          value: value.value
        };
      }
      if (!Array.isArray(value) || value.length === 0) {
        return {
          changed: false,
          value
        };
      }
      if (value.length === 1 && getOpportunityPatchIndex(value[0]) === null) {
        return {
          changed: true,
          value: value[0].value
        };
      }
      const indexedEntries = value.map(item => ({
        index: getOpportunityPatchIndex(item),
        value: item?.value
      }));
      if (indexedEntries.some(entry => typeof entry.index !== "number")) {
        return {
          changed: false,
          value
        };
      }
      return {
        changed: true,
        value: _(indexedEntries).sortBy("index").map("value").value()
      };
    }
    function collectEmbeddedOpportunityItems(value, depth = 0) {
      if (depth > 6) return [];
      if (Array.isArray(value)) {
        return value.flatMap(item => collectEmbeddedOpportunityItems(item, depth + 1));
      }
      if (!value || typeof value !== "object") return [];
      const item = value;
      if (Object.hasOwn(item, "行动") || Object.hasOwn(item, "action") || Object.hasOwn(item, "名称") || Object.hasOwn(item, "描述")) {
        return [ item ];
      }
      if (Object.hasOwn(item, "value") && (Object.hasOwn(item, "op") || Object.hasOwn(item, "path"))) {
        return collectEmbeddedOpportunityItems(item.value, depth + 1);
      }
      return [];
    }
    function unwrapOpportunityPatchPayload(value) {
      let current = value;
      if (typeof current === "string" && current.trimStart().startsWith("[")) {
        try {
          current = JSON.parse(current);
        } catch {
          return value;
        }
      }
      for (let depth = 0; depth < 4; depth += 1) {
        const layer = unwrapOpportunityPatchLayer(current);
        if (!layer.changed) break;
        current = layer.value;
      }
      const recoveredItems = collectEmbeddedOpportunityItems(current);
      return recoveredItems.length > 0 ? recoveredItems : current;
    }
    const CompactOpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      标题: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      行动: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("探索"),
      叙事类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      事件性质: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      关联事件ID: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional()
    });
    const EnglishOpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      title: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      action: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText),
      type: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("探索"),
      narrativeKind: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      eventNature: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      event: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      eventId: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      hint: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional()
    });
    const LegacyOpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      名称: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      类型: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("探索"),
      描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      回报预期: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      风险评估: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      时限: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      关联事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      优先级: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).optional()
    });
    const OpportunitySchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.union([ CompactOpportunitySchema, EnglishOpportunitySchema, LegacyOpportunitySchema ]).transform(item => {
      if ("行动" in item) {
        const title = normalizeOpportunityText(item.标题);
        const hint = normalizeOpportunityText(item.提示);
        const event = normalizeOpportunityText(item.事件);
        const eventId = normalizeOpportunityText(item.关联事件ID);
        const eventNature = normalizeProposalEventNature(item.事件性质, event, eventId);
        return {
          ...title ? {
            标题: title
          } : {},
          行动: item.行动,
          类型: inferOpportunityType(item.类型, {
            行动: item.行动,
            提示: hint
          }),
          叙事类型: normalizeNarrativeKind(item.叙事类型, eventNature),
          事件性质: eventNature,
          ...event ? {
            事件: event
          } : {},
          ...eventId ? {
            关联事件ID: eventId
          } : {},
          ...hint ? {
            提示: hint
          } : {}
        };
      }
      if ("action" in item) {
        const title = normalizeOpportunityText(item.title);
        const hint = normalizeOpportunityText(item.hint);
        const event = normalizeOpportunityText(item.event);
        const eventId = normalizeOpportunityText(item.eventId);
        const eventNature = normalizeProposalEventNature(item.eventNature, event, eventId);
        return {
          ...title ? {
            标题: title
          } : {},
          行动: item.action,
          类型: inferOpportunityType(item.type, {
            action: item.action,
            hint
          }),
          叙事类型: normalizeNarrativeKind(item.narrativeKind, eventNature),
          事件性质: eventNature,
          ...event ? {
            事件: event
          } : {},
          ...eventId ? {
            关联事件ID: eventId
          } : {},
          ...hint ? {
            提示: hint
          } : {}
        };
      }
      const action = item.描述 || item.名称;
      const hint = buildLegacyOpportunityHint(item.时限 ?? "", item.风险评估);
      const title = normalizeOpportunityText(item.名称);
      const event = normalizeOpportunityText(item.描述);
      const eventId = normalizeOpportunityText(item.关联事件);
      const eventNature = normalizeProposalEventNature("", event, eventId);
      return {
        ...title ? {
          标题: title
        } : {},
        行动: action,
        类型: inferOpportunityType(item.类型, {
          名称: item.名称,
          来源: item.来源,
          描述: item.描述,
          回报预期: item.回报预期,
          风险评估: item.风险评估,
          时限: item.时限 ?? "",
          关联事件: item.关联事件 ?? ""
        }),
        叙事类型: normalizeNarrativeKind("", eventNature),
        事件性质: eventNature,
        ...event ? {
          事件: event
        } : {},
        ...eventId ? {
          关联事件ID: eventId
        } : {},
        ...hint ? {
          提示: hint
        } : {}
      };
    });
    const WORLD_EVENT_ACTIVE_LIMIT = 3;
    const WORLD_EVENT_HISTORY_LIMIT = 5;
    const WORLD_EVENT_LEDGER_LIMIT = WORLD_EVENT_ACTIVE_LIMIT + WORLD_EVENT_HISTORY_LIMIT;
    const earthlyBranchRank = new Map([ "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥" ].map((branch, index) => [ branch, index ]));
    const parseWorldEventTime = value => {
      const normalized = String(value ?? "").trim();
      const match = normalized.match(/^(.*?)(-?\d+)年(\d+)月(\d+)日(?:[·\s]*([子丑寅卯辰巳午未申酉戌亥])时)?/u);
      if (!match) return null;
      return {
        era: match[1].trim(),
        year: Number(match[2]),
        month: Number(match[3]),
        day: Number(match[4]),
        hour: earthlyBranchRank.get(match[5] ?? "") ?? -1
      };
    };
    const compareWorldEventTimeDescending = (left, right) => {
      const leftTime = parseWorldEventTime(left);
      const rightTime = parseWorldEventTime(right);
      if (leftTime && rightTime && leftTime.era === rightTime.era) {
        for (const field of [ "year", "month", "day", "hour" ]) {
          const difference = rightTime[field] - leftTime[field];
          if (difference !== 0) return difference;
        }
        return 0;
      }
      if (leftTime && !rightTime) return -1;
      if (!leftTime && rightTime) return 1;
      return String(right ?? "").localeCompare(String(left ?? ""), "zh-CN");
    };
    const 世界事件状态映射 = {
      活跃: "活跃",
      进行中: "活跃",
      正在发生: "活跃",
      征兆: "活跃",
      发展: "活跃",
      可介入: "活跃",
      余波: "活跃",
      已平息: "已平息",
      平息: "已平息",
      已解决: "已平息",
      解决: "已平息",
      已完成: "已平息",
      完成: "已平息",
      结束: "已平息",
      落幕: "已平息",
      已错过: "已错过",
      错过: "已错过",
      失效: "已错过",
      active: "活跃",
      resolved: "已平息",
      missed: "已错过"
    };
    const 世界事件阶段映射 = {
      征兆: "征兆",
      潜伏: "征兆",
      发展: "发展",
      发酵: "发展",
      介入: "可介入",
      可介入: "可介入",
      余波: "余波",
      结果: "余波",
      落幕: "落幕",
      结束: "落幕",
      omen: "征兆",
      developing: "发展",
      actionable: "可介入",
      aftermath: "余波",
      closed: "落幕"
    };
    const 世界事件参与映射 = {
      未介入: "未介入",
      未参与: "未介入",
      旁观: "旁观",
      关注: "旁观",
      介入: "介入",
      参与: "介入",
      主导: "主导",
      none: "未介入",
      observed: "旁观",
      involved: "介入",
      led: "主导"
    };
    const 世界事件影响映射 = {
      微澜: "微澜",
      轻微: "微澜",
      平和: "微澜",
      轻变: "轻变",
      温和: "轻变",
      中等: "轻变",
      显著: "显著",
      严重: "显著",
      灾难: "显著",
      minor: "微澜",
      mild: "轻变",
      notable: "显著",
      severe: "显著"
    };
    const WorldEventInputSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      状态: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault("活跃"),
      阶段: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      事件: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).prefault(""),
      地点: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      最近变化: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      可见影响: _common__WEBPACK_IMPORTED_MODULE_2__.NormalizedStringListSchema,
      参与情况: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      影响等级: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional(),
      更新时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.string().transform(normalizeOpportunityText).optional()
    });
    const WorldEventSchema = WorldEventInputSchema.transform(item => {
      const rawStatus = normalizeOpportunityText(item.状态);
      const rawStage = normalizeOpportunityText(item.阶段) || rawStatus;
      const status = 世界事件状态映射[rawStatus.toLowerCase()] ?? "活跃";
      const stage = 世界事件阶段映射[rawStage.toLowerCase()] ?? (status === "活跃" ? "征兆" : "落幕");
      const place = normalizeOpportunityText(item.地点);
      const latestChange = normalizeOpportunityText(item.最近变化);
      const participation = 世界事件参与映射[normalizeOpportunityText(item.参与情况).toLowerCase()] ?? "未介入";
      const impact = 世界事件影响映射[normalizeOpportunityText(item.影响等级).toLowerCase()] ?? "微澜";
      const updatedAt = normalizeOpportunityText(item.更新时间);
      return {
        状态: status,
        阶段: stage,
        事件: item.事件,
        ...place ? {
          地点: place
        } : {},
        ...latestChange ? {
          最近变化: latestChange
        } : {},
        可见影响: item.可见影响,
        参与情况: participation,
        影响等级: impact,
        ...updatedAt ? {
          更新时间: updatedAt
        } : {}
      };
    });
    const compactWorldEventLedger = source => {
      const entries = Object.entries(source).map(([id, event], sourceIndex) => ({
        id,
        event,
        sourceIndex
      }));
      const retainedActiveIds = new Set(entries.filter(entry => entry.event.状态 === "活跃").slice(0, WORLD_EVENT_ACTIVE_LIMIT).map(entry => entry.id));
      const retainedHistoryIds = new Set(entries.filter(entry => entry.event.状态 !== "活跃").sort((left, right) => compareWorldEventTimeDescending(left.event.更新时间, right.event.更新时间) || right.sourceIndex - left.sourceIndex).slice(0, WORLD_EVENT_HISTORY_LIMIT).map(entry => entry.id));
      return Object.fromEntries(entries.filter(entry => retainedActiveIds.has(entry.id) || retainedHistoryIds.has(entry.id)).map(entry => [ entry.id, entry.event ]));
    };
    const WorldEventLedgerSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe("事件名或稳定事件ID"), WorldEventSchema).transform(compactWorldEventLedger).prefault({});
    const SystemSettingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      启用行动提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(true),
      修炼系统版本: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(3).transform(value => Math.max(1, Math.floor(value))).prefault(3),
      变量结构版本: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(5).transform(value => Math.max(1, Math.floor(value))).prefault(5),
      _临时状态手动覆盖签名: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("")
    }).prefault({});
    const ActionSystemSettingsSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      启用行动提示: zod__WEBPACK_IMPORTED_MODULE_0__.z.boolean().prefault(true)
    }).prefault({});
    const 天道感应映射 = {
      顺遂: "顺遂",
      受挫: "受挫",
      平稳: "平稳",
      顺利: "顺遂",
      受阻: "受挫",
      正常: "平稳"
    };
    const DifficultySystemSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      天道感应: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => 天道感应映射[String(v).trim()] || "平稳").prefault("平稳"),
      环境高压警告: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().prefault("天道运转如常，万物循理。"),
      _难度系统内部数据: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
        版本号: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).transform(value => Math.max(1, Math.floor(value))).prefault(1),
        平衡保护: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          连续受挫计数: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).prefault(0),
          触发阈值: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(3).prefault(3),
          生效剩余回合: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).prefault(0),
          冷却剩余回合: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(0).prefault(0)
        }).prefault({}),
        动态策略: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          单回合改变量上限: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(.15).prefault(.15),
          自然回落速度: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(.03).prefault(.03),
          增长冷却回合: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(2).prefault(2)
        }).prefault({}),
        难度结算快照: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
          回合基线系数: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).prefault(1),
          本回合最终系数: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).prefault(1),
          分层来源: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
            世界叙事层: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).prefault(1),
            玩家偏好层: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).prefault(1),
            短期状态层: (0, _common__WEBPACK_IMPORTED_MODULE_2__.finiteNumber)(1).prefault(1)
          }).prefault({})
        }).prefault({})
      }).prefault({})
    }).prefault({});
  },
  "./src/灯火阑珊/schema/utils.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      compareRealmStanding: () => compareRealmStanding,
      getDangerColor: () => getDangerColor,
      getRealmColor: () => getRealmColor,
      getRootColor: () => getRootColor,
      parseRealmToLevel: () => parseRealmToLevel,
      resolveBattleMomentum: () => resolveBattleMomentum
    });
    var _constants__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./constants */ "./src/灯火阑珊/schema/constants.ts");
    function getRootColor(root) {
      for (const [elem, data] of Object.entries(_constants__WEBPACK_IMPORTED_MODULE_0__.CONFIG.ELEMENTS)) {
        if (root.includes(elem)) {
          return data.color;
        }
      }
      return "#cc99ff";
    }
    function getRealmColor(level) {
      const majorIdx = Math.floor((level - 1) / 4);
      const colors = [ "#888888", "#44aa44", "#4488ff", "#aa44ff", "#ff4444", "#ffaa00", "#ffdd44", "#ffffff", "#ff88ff", "#66e0ff", "#c7a6ff", "#ffd166" ];
      return colors[majorIdx] || "#888888";
    }
    function getDangerColor(danger) {
      if (danger >= 90) return "#ff0000";
      if (danger >= 70) return "#ff4400";
      if (danger >= 50) return "#ff8800";
      if (danger >= 30) return "#ffcc00";
      return "#44aa44";
    }
    function parseRealmToLevel(realm) {
      let majorIdx = -1;
      for (let i = 0; i < _constants__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES.length; i++) {
        if (realm.includes(_constants__WEBPACK_IMPORTED_MODULE_0__.REALM_NAMES[i])) {
          majorIdx = i;
          break;
        }
      }
      if (majorIdx === -1) return 1;
      let minorIdx = 0;
      for (let i = 0; i < _constants__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES.length; i++) {
        if (realm.includes(_constants__WEBPACK_IMPORTED_MODULE_0__.REALM_STAGES[i])) {
          minorIdx = i;
          break;
        }
      }
      return majorIdx * 4 + minorIdx + 1;
    }
    const BATTLE_MOMENTUM = [ "敌方压制", "敌方占先", "相持", "我方占先", "我方压制" ];
    function compareRealmStanding(myLevel, enemyLevel) {
      const normalizedMine = _.clamp(Math.floor(Number(myLevel) || 1), 1, 48);
      const normalizedEnemy = _.clamp(Math.floor(Number(enemyLevel) || 1), 1, 48);
      const majorDelta = Math.floor((normalizedMine - 1) / 4) - Math.floor((normalizedEnemy - 1) / 4);
      if (majorDelta > 0) return "我方位格压制";
      if (majorDelta < 0) return "敌方位格压制";
      const minorDelta = normalizedMine - normalizedEnemy;
      if (minorDelta >= 3) return "我方近乎碾压";
      if (minorDelta === 2) return "我方强压";
      if (minorDelta === 1) return "我方境界占优";
      if (minorDelta === 0) return "同阶";
      if (minorDelta === -1) return "敌方境界占优";
      if (minorDelta === -2) return "敌方强压";
      return "敌方近乎碾压";
    }
    function resolveBattleMomentum(current, requestedShift, basis) {
      const currentIndex = Math.max(0, BATTLE_MOMENTUM.indexOf(current));
      const direction = Math.sign(Number(requestedShift) || 0);
      if (direction === 0) return BATTLE_MOMENTUM[currentIndex];
      const movingForPlayer = direction > 0;
      const blockedByRealm = movingForPlayer && basis.realmStanding === "敌方位格压制" || !movingForPlayer && basis.realmStanding === "我方位格压制";
      if (blockedByRealm && !(basis.matchingExternalStanding && basis.significantCost)) {
        return BATTLE_MOMENTUM[currentIndex];
      }
      const hasDecisiveBasis = basis.establishedConditions || basis.explicitCounter || basis.fieldAdvantage || basis.significantCost;
      if (!hasDecisiveBasis) return BATTLE_MOMENTUM[currentIndex];
      const allowsTwoSteps = basis.establishedConditions && basis.explicitCounter && basis.significantCost;
      const magnitude = Math.min(Math.abs(Math.trunc(requestedShift)), allowsTwoSteps ? 2 : 1);
      return BATTLE_MOMENTUM[_.clamp(currentIndex + direction * magnitude, 0, BATTLE_MOMENTUM.length - 1)];
    }
  },
  "./src/灯火阑珊/schema/world.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      DEFAULT_FACTIONS: () => DEFAULT_FACTIONS,
      DEFAULT_LOCATIONS: () => DEFAULT_LOCATIONS,
      DEFAULT_TREASURES: () => DEFAULT_TREASURES,
      FactionSchema: () => FactionSchema,
      LocationSchema: () => LocationSchema,
      PhysiqueSchema: () => PhysiqueSchema,
      SpiritRootSchema: () => SpiritRootSchema,
      TechniqueSchema: () => TechniqueSchema,
      TreasureSchema: () => TreasureSchema
    });
    var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ "zod");
    var zod__WEBPACK_IMPORTED_MODULE_0___default = __webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);
    var _map_system__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../map-system */ "./src/灯火阑珊/map-system.ts");
    var _common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./common */ "./src/灯火阑珊/schema/common.ts");
    const FactionSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      地: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      力: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      营: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "正", "魔", "中" ]).catch("中").prefault("中"),
      模: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "超大", "大", "小", "微", "特" ]).catch("小").prefault("小")
    }).prefault({});
    const TechniqueSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(v => _common__WEBPACK_IMPORTED_MODULE_2__["品阶映射"][v] || "凡").catch("凡").prefault("凡"),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      效: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录")
    }).prefault({});
    const TreasureSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      阶: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡器", "法器", "灵器", "法宝", "灵宝", "仙器", "圣器", "道器", "本命" ]).catch("凡器").prefault("凡器"),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      本命特性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).optional(),
      器灵: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).optional()
    }).prefault({}).transform(data => ({
      ...data,
      特: data.阶 === "本命" ? "至尊" : data.阶 === "道器" ? "超凡" : data.阶 === "圣器" ? "极品" : data.阶 === "仙器" ? "顶级" : data.阶 === "灵宝" ? "强" : data.阶 === "法宝" ? "中" : "普通"
    }));
    const LocationSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      域: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(_map_system__WEBPACK_IMPORTED_MODULE_1__.LOCATION_DOMAIN_VALUES).catch("神州").prefault("神州"),
      类: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "秘境", "城镇", "宗门", "禁地", "遗迹", "地形" ]).catch("地形").prefault("地形"),
      危: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)).catch(10).prefault(10),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      资: _common__WEBPACK_IMPORTED_MODULE_2__.NormalizedStringListSchema
    }).prefault({});
    const SpiritRootSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "劣", "下", "中", "上", "极", "天", "异" ]).catch("中").prefault("中"),
      性: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未知"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ]).catch("常").prefault("常")
    }).prefault({}).transform(data => {
      const 速度映射 = {
        劣: "0.3倍",
        下: "0.5倍",
        中: "1倍",
        上: "2倍",
        极: "3倍",
        天: "5倍",
        异: "4倍"
      };
      return {
        ...data,
        速: 速度映射[data.质] || "1倍",
        特: data.质 === "天" ? "单系顶级" : data.质 === "异" ? "变异稀有" : data.质 === "极" ? "双系优秀" : "常规"
      };
    });
    const PhysiqueSchema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({
      质: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "凡", "灵", "道", "圣", "神" ]).catch("凡").prefault("凡"),
      特: zod__WEBPACK_IMPORTED_MODULE_0__.z.string().transform(value => value.trim()).prefault("未记录"),
      稀: zod__WEBPACK_IMPORTED_MODULE_0__.z.enum([ "常", "少", "罕", "稀", "传" ]).catch("常").prefault("常")
    }).prefault({}).transform(data => ({
      ...data,
      优: data.质 === "神" ? "至高" : data.质 === "圣" ? "极强" : data.质 === "道" ? "强" : data.质 === "灵" ? "中" : "无"
    }));
    const DEFAULT_FACTIONS = {
      剑阁: {
        地: "神州剑门关",
        特: "剑道源头",
        力: "渡劫后期",
        营: "正",
        模: "超大"
      },
      万法宗: {
        地: "神州问道峰",
        特: "万法本源",
        力: "渡劫初期",
        营: "正",
        模: "超大"
      },
      金刚寺: {
        地: "西天佛山",
        特: "佛修炼体",
        力: "大乘中期",
        营: "正",
        模: "大"
      },
      药王谷: {
        地: "神农架",
        特: "医炼丹药",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      儒门: {
        地: "文圣山",
        特: "浩然正气",
        力: "大乘中期",
        营: "正",
        模: "大"
      },
      青龙殿: {
        地: "东苍青龙山",
        特: "守护青帝",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      玄武宗: {
        地: "北冥玄冰山",
        特: "镇守归墟",
        力: "大乘后期",
        营: "正",
        模: "大"
      },
      青云门: {
        地: "神州青云山",
        特: "水脉一系",
        力: "大乘初期",
        营: "正",
        模: "大"
      },
      建木宗: {
        地: "东苍建木树",
        特: "木系道法",
        力: "合体中期",
        营: "正",
        模: "小"
      },
      百花谷: {
        地: "百花秘境",
        特: "女修花道",
        力: "合体后期",
        营: "正",
        模: "小"
      },
      血神教: {
        地: "血魔渊",
        特: "血道炼法",
        力: "渡劫中期",
        营: "魔",
        模: "超大"
      },
      天魔宗: {
        地: "天魔山",
        特: "天魔大道",
        力: "大乘中期",
        营: "魔",
        模: "大"
      },
      妖盟: {
        地: "万妖森林",
        特: "妖族联盟",
        力: "渡劫中期",
        营: "中",
        模: "超大"
      },
      大夏王朝: {
        地: "中州皇城",
        特: "世俗统治",
        力: "大乘初期",
        营: "中",
        模: "大"
      },
      九州商会: {
        地: "九大主城",
        特: "商业联盟",
        力: "大乘初期",
        营: "中",
        模: "大"
      },
      离火宫: {
        地: "南炎火山",
        特: "朱雀供奉",
        力: "合体圆满",
        营: "中",
        模: "小"
      },
      铸剑山庄: {
        地: "南炎地火",
        特: "炼器第一",
        力: "合体后期",
        营: "中",
        模: "小"
      }
    };
    const DEFAULT_TREASURES = {
      镇渊剑: {
        阶: "仙器",
        类: "剑"
      },
      双鱼佩: {
        阶: "本命",
        类: "玉佩",
        本命特性: "源血契约、阴阳双生、器灵化形、与主共修、生死相依、锁血护主",
        器灵: "虞汐颜"
      }
    };
    const DEFAULT_LOCATIONS = {
      天渊: {
        域: "天层",
        类: "禁地",
        危: 95,
        特: "星辰裂隙",
        资: [ "星辰碎片", "陨铁" ]
      },
      罡风带: {
        域: "天层",
        类: "禁地",
        危: 90,
        特: "罡风屏障",
        资: [ "罡风精华" ]
      },
      问道峰: {
        域: "神州",
        类: "宗门",
        危: 10,
        特: "万法宗",
        资: [ "功法", "灵药" ]
      },
      剑门关: {
        域: "神州",
        类: "宗门",
        危: 15,
        特: "剑阁",
        资: [ "剑意", "飞剑" ]
      },
      藏书阁: {
        域: "神州",
        类: "宗门",
        危: 5,
        特: "古籍",
        资: [ "功法", "秘术" ]
      },
      酆都城: {
        域: "神州",
        类: "城镇",
        危: 30,
        特: "鬼市",
        资: [ "幽冥材料" ]
      },
      龙门瀑: {
        域: "神州",
        类: "秘境",
        危: 40,
        特: "化龙",
        资: [ "龙气" ]
      },
      建木林: {
        域: "东苍",
        类: "地形",
        危: 50,
        特: "古树精",
        资: [ "灵木", "妖丹" ]
      },
      青帝陵: {
        域: "东苍",
        类: "遗迹",
        危: 85,
        特: "青帝传承",
        资: [ "青帝传承" ]
      },
      百花境: {
        域: "东苍",
        类: "秘境",
        危: 20,
        特: "花海",
        资: [ "灵花" ]
      },
      不灭火山: {
        域: "南炎",
        类: "地形",
        危: 80,
        特: "朱雀涅槃",
        资: [ "朱雀火" ]
      },
      涅槃台: {
        域: "南炎",
        类: "遗迹",
        危: 70,
        特: "涅槃",
        资: [ "涅槃感悟" ]
      },
      万剑冢: {
        域: "西庚",
        类: "禁地",
        危: 85,
        特: "剑意",
        资: [ "剑意", "古剑" ]
      },
      玄冰山: {
        域: "北冥",
        类: "宗门",
        危: 50,
        特: "玄武宗",
        资: [ "玄冰" ]
      },
      归墟眼: {
        域: "北冥",
        类: "禁地",
        危: 99,
        特: "归墟",
        资: [ "归墟感悟" ]
      },
      黄泉迹: {
        域: "下层",
        类: "遗迹",
        危: 90,
        特: "幽冥",
        资: [ "黄泉水" ]
      },
      炎渊: {
        域: "下层",
        类: "禁地",
        危: 95,
        特: "地心火",
        资: [ "地心火" ]
      }
    };
  },
  jsonrepair(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_npm_jsonrepair_esm_703c329d__;
  },
  zod(module) {
    module.exports = z;
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
  __webpack_require__.n = module => {
    const getter = module && module.__esModule ? () => module["default"] : () => module;
    __webpack_require__.d(getter, {
      a: getter
    });
    return getter;
  };
})();

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
  var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../灯火通明/schema */ "./src/灯火通明/schema.ts");
  var _player_input__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../灯火通明/player-input */ "./src/灯火通明/player-input.ts");
  var _message_content__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../灯火通明/message-content */ "./src/灯火通明/message-content.ts");
  var _dialogue_engine__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./dialogue-engine */ "./src/灯火通明-伪同层控制器/dialogue-engine.ts");
  const STYLE_ID = "dhl-pseudo-layer-controller-style";
  const INPUT_STORAGE_KEY = "denghuolanshan:pseudo-layer:native-input-collapsed";
  const PENDING_NATIVE_REROLL_STORAGE_KEY = "denghuolanshan:pseudo-layer:pending-native-rerolls-v1";
  const MOBILE_INPUT_DEFAULT_APPLIED_KEY = "denghuolanshan:pseudo-layer:mobile-native-input-default-v1";
  const MOBILE_VIEWPORT_QUERY = "(max-width: 760px)";
  const DIALOGUE_CARRYOVER_PROMPT_ID = "denghuolanshan:dialogue-carryover";
  const INTERACTION_KEY = "dhl_pseudo_interaction";
  const GENERATION_NOTICE_KEY = "dhl_pseudo_generation_notice";
  const STAGE_CLASS = "dhl-pseudo-stage";
  const SELECTED_CLASS = "dhl-pseudo-selected";
  const PARKED_FRAME_CLASS = "dhl-pseudo-frame-parked";
  const FRAME_KEEPER_CLASS = "dhl-pseudo-frame-keeper";
  const ACTIVE_KEEPER_CLASS = "dhl-pseudo-frame-active";
  const STAGE_ROOT_ID = "dhl-pseudo-stage-root";
  const ROOT_ACTIVE_CLASS = "dhl-pseudo-stage-root-active";
  const STREAM_DISPATCH_INTERVAL_MS = window.matchMedia?.("(pointer: coarse)").matches ? 240 : 160;
  const FRAME_CANDIDATE_BATCH_MS = 32;
  const FRAME_LOAD_GRACE_MS = 3e4;
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
  const frameLoadStartedAt = new WeakMap;
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
  let observedChat = null;
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
  let generationHealthTimer = null;
  const generationReceipts = new Map;
  const rememberSourceProtocolVersion = (source, version) => {
    const previous = sourceProtocolVersions.get(source) ?? 0;
    if (version > previous) sourceProtocolVersions.set(source, version);
  };
  const send = (source, message) => {
    if (activeGeneration && (message.type === "complete" || message.type === "error") && message.requestId === activeGeneration?.requestId) {
      generationReceipts.set(message.requestId, {
        chatId: activeGeneration.chatId,
        payload: message
      });
      if (generationReceipts.size > 8) generationReceipts.delete(generationReceipts.keys().next().value);
    }
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
    if (generation.cancelled && state !== "stopping" && state !== "saving") return;
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
    const anchorStoryMessageId = Number(candidate.anchorStoryMessageId);
    return {
      mode: "dialogue",
      sessionId,
      targetName,
      canonicalName,
      channel: candidate.channel,
      ...Number.isInteger(anchorStoryMessageId) && anchorStoryMessageId >= 0 ? {
        anchorStoryMessageId
      } : {}
    };
  };
  const isSameInteraction = (left, right) => left.mode === right.mode && (left.mode === "story" || right.mode === "dialogue" && left.sessionId === right.sessionId && left.targetName === right.targetName && left.canonicalName === right.canonicalName && left.channel === right.channel && left.anchorStoryMessageId === right.anchorStoryMessageId);
  const setActiveInteraction = interaction => {
    const normalized = interaction.mode === "dialogue" ? normalizeDialogueContext(interaction) ?? STORY_INTERACTION : STORY_INTERACTION;
    const next = normalized.mode === "dialogue" && normalized.anchorStoryMessageId === undefined ? {
      ...normalized,
      anchorStoryMessageId: latestStoryStageId()
    } : normalized;
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
    if (frame.dataset.dhlControllerOwned === "true" && frame.closest(`#${STAGE_ROOT_ID}`)) return false;
    const sourceUrl = frame.getAttribute("src")?.trim();
    if (!frame.getAttribute("srcdoc")?.trim() && (!sourceUrl || sourceUrl === "about:blank")) return false;
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
      const startedAt = frameLoadStartedAt.get(keptFrame);
      if (startedAt !== undefined && Date.now() - startedAt < FRAME_LOAD_GRACE_MS) return false;
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
    frameLoadStartedAt.set(ownedFrame, Date.now());
    ownedFrame.addEventListener("load", () => scheduleViewRefresh(0), {
      once: true
    });
    keeper.append(ownedFrame);
    rememberFrame(ownedFrame);
    message.classList.add(PARKED_FRAME_CLASS);
    return true;
  };
  const parkSourceFrame = source => {
    const frame = getFrameForSource(source);
    const messageId = frame ? getFrameMessageId(frame) : undefined;
    return frame && messageId !== undefined ? parkFrame(messageId, frame) : false;
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
    if (hasActiveFrame) {
      root?.querySelectorAll(`:scope > .${FRAME_KEEPER_CLASS}`).forEach(keeper => {
        if (keeper.classList.contains(ACTIVE_KEEPER_CLASS)) return;
        const frame = keeper.querySelector(":scope > iframe");
        const id = Number(keeper.dataset.messageId);
        if (frame?.contentWindow === registrations.get(id)) registrations.delete(id);
        keeper.remove();
      });
    }
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
  const migrateLegacyDialogueMessages = async () => {
    const messages = [ ...getAllMessages() ].sort((left, right) => left.message_id - right.message_id);
    const updates = [];
    let latestStoryMessageId;
    messages.forEach(message => {
      const metadata = readInteractionMetadata(message);
      if (message.role === "assistant" && !metadata) {
        latestStoryMessageId = message.message_id;
        return;
      }
      if (!metadata || latestStoryMessageId === undefined) return;
      const nextMetadata = {
        ...metadata,
        version: 3,
        anchorStoryMessageId: metadata.anchorStoryMessageId ?? latestStoryMessageId
      };
      if (message.is_hidden && metadata.version === 3 && metadata.anchorStoryMessageId !== undefined) return;
      updates.push({
        message_id: message.message_id,
        is_hidden: true,
        extra: {
          ...message.extra ?? {},
          [INTERACTION_KEY]: nextMetadata
        }
      });
    });
    if (updates.length === 0) return;
    await setChatMessages(updates, {
      refresh: "affected"
    });
    invalidateStageSnapshot();
    viewRevision += 1;
    console.info(`[灯火阑珊·幕间交谈] 已归档 ${updates.length} 条旧交谈楼层`);
  };
  const readInteractionMetadata = message => {
    if (!message) return null;
    const direct = message.extra?.[INTERACTION_KEY];
    const nested = message.extra?.extra?.[INTERACTION_KEY];
    const value = direct ?? nested;
    if (!value || value.version !== 1 && value.version !== 2 && value.version !== 3 || value.kind !== "dialogue") {
      return null;
    }
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
    channel: metadata.channel,
    ...Number.isInteger(metadata.anchorStoryMessageId) ? {
      anchorStoryMessageId: metadata.anchorStoryMessageId
    } : {}
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
    let latestStoryMessageId;
    assistantMessages.forEach(message => {
      const directMetadata = readInteractionMetadata(message);
      const previousMessage = previousMessages.get(message.message_id);
      const inheritedMetadata = !directMetadata && previousMessage?.role === "user" ? readInteractionMetadata(previousMessage) : null;
      const metadata = directMetadata ?? (inheritedMetadata ? {
        ...inheritedMetadata,
        userMessageId: previousMessage.message_id
      } : null);
      const anchorStoryMessageId = metadata?.anchorStoryMessageId ?? latestStoryMessageId;
      const previous = entries.at(-1);
      if (metadata && previous?.stage.kind === "dialogue" && previous.stage.sessionId === metadata.sessionId && previous.stage.anchorStoryMessageId === anchorStoryMessageId) {
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
          engine: metadata.engine,
          ...anchorStoryMessageId !== undefined ? {
            anchorStoryMessageId
          } : {}
        } : {
          kind: "story"
        }
      });
      if (!metadata) latestStoryMessageId = message.message_id;
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
    const inlineReasoning = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.extractInlineReasoning)(String(message?.message ?? ""));
    const nativeReasoning = String(direct.reasoning ?? nested.reasoning ?? "").trim();
    const reasoning = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.selectReasoningText)(nativeReasoning, inlineReasoning?.text ?? "");
    const rawDuration = Number(direct.reasoning_duration ?? nested.reasoning_duration);
    return {
      reasoning,
      reasoningDuration: Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null,
      reasoningEditable: Boolean(nativeReasoning)
    };
  };
  const isReasoningState = value => value === "none" || value === "thinking" || value === "done" || value === "hidden";
  const toReasoningTimestamp = value => {
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    if (typeof value !== "string" && typeof value !== "number") return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  };
  const readMessageResponseDuration = message => {
    const direct = message?.extra ?? {};
    const nested = direct.extra && typeof direct.extra === "object" ? direct.extra : {};
    const startedAt = toReasoningTimestamp(direct.gen_started ?? nested.gen_started);
    const finishedAt = toReasoningTimestamp(direct.gen_finished ?? nested.gen_finished);
    if (startedAt === null || finishedAt === null || finishedAt < startedAt) return undefined;
    return Math.round(finishedAt - startedAt);
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
    let text = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.sanitizeReasoningText)(runtimeReasoning);
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
    const belongsToGeneration = candidateId => {
      if (!Number.isInteger(candidateId) || candidateId < 0) return false;
      if (generation.operation === "reroll") return candidateId === generation.baseMessageId;
      if (Number.isInteger(generation.userMessageId)) return candidateId > Number(generation.userMessageId);
      return candidateId > generation.baseMessageId;
    };
    const domMessage = (belongsToGeneration(messageId) ? getMessageElement(messageId) : null) ?? [ ...tavernDocument.querySelectorAll('#chat > .mes[data-reasoning-state="thinking"]') ].reverse().find(element => belongsToGeneration(Number(element.getAttribute("mesid"))));
    if (domMessage) {
      const domMessageId = Number(domMessage.getAttribute("mesid"));
      if (!Number.isInteger(messageId) || messageId < 0) messageId = domMessageId;
      if (!text) {
        text = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.sanitizeReasoningText)(domMessage.querySelector(".mes_reasoning")?.innerText ?? "");
      }
      rawState ??= domMessage.dataset.reasoningState ?? domMessage.querySelector(".mes_reasoning_details")?.dataset.state;
      if (duration === null) {
        const domDuration = Number(domMessage.querySelector(".mes_reasoning_header_title")?.dataset.duration ?? domMessage.querySelector(".mes_reasoning_details")?.dataset.duration);
        if (Number.isFinite(domDuration) && domDuration > 0) {
          duration = domDuration * 1e3;
        }
      }
    }
    if (!text || !belongsToGeneration(messageId)) return null;
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
  const readTimelineUserText = (message, metadata) => (0, _player_input__WEBPACK_IMPORTED_MODULE_2__.readPlayerInput)(message, metadata?.rawUserText);
  const hydrateStageTurns = (snapshot, entry) => {
    const cache = snapshot.timelineTurns ??= new Map;
    const cached = cache.get(entry.representativeMessageId);
    if (cached) return cached;
    const turns = entry.messageIds.flatMap(assistantMessageId => {
      const assistant = snapshot.messagesById.get(assistantMessageId);
      if (!assistant) return [];
      const previous = snapshot.previousMessages.get(assistantMessageId);
      const inherited = previous?.role === "user" ? readInteractionMetadata(previous) : null;
      const metadata = readInteractionMetadata(assistant) ?? (inherited ? {
        ...inherited,
        userMessageId: previous.message_id
      } : null);
      const linkedUser = (metadata?.userMessageId !== undefined ? snapshot.messagesById.get(metadata.userMessageId) : undefined) ?? (previous?.role === "user" ? previous : undefined);
      const visibleDialogue = metadata ? (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.extractDialogueContent)(String(assistant.message ?? "")) : null;
      const reasoning = readTimelineReasoning(assistant);
      const responseDuration = readMessageResponseDuration(assistant);
      const tokenCount = readMessageTokenCount(assistant);
      return [ {
        assistantMessageId,
        ...linkedUser ? {
          userMessageId: linkedUser.message_id
        } : {},
        userText: readTimelineUserText(linkedUser, metadata),
        assistantText: String(assistant.message ?? ""),
        generationNotice: String(assistant.extra?.[GENERATION_NOTICE_KEY] ?? assistant.extra?.extra?.[GENERATION_NOTICE_KEY] ?? ""),
        ...metadata ? {
          reaction: String(metadata.reaction ?? visibleDialogue?.reaction ?? "").replace(/<\/?(?:反应|正文|会话状态)(?=[\s/>])[^>]*>/gi, "").trim() || undefined,
          ...metadata.visualCard ? {
            visualCard: {
              ...metadata.visualCard
            }
          } : {},
          ...metadata.variableEffects ? {
            variableEffects: {
              ...metadata.variableEffects
            }
          } : {}
        } : {},
        ...reasoning,
        ...responseDuration !== undefined ? {
          responseDuration
        } : {},
        ...tokenCount !== undefined ? {
          tokenCount
        } : {}
      } ];
    });
    cache.set(entry.representativeMessageId, turns);
    return turns;
  };
  const hydrateTimelineEntries = snapshot => {
    if (snapshot.timelineEntries) return snapshot.timelineEntries;
    const historyIndexes = {
      story: 0,
      dialogue: 0
    };
    const hydratedEntries = snapshot.entries.map(entry => {
      const history = entry.stage.kind;
      historyIndexes[history] += 1;
      return {
        representativeMessageId: entry.representativeMessageId,
        messageIds: [ ...entry.messageIds ],
        index: historyIndexes[history],
        historyIndex: historyIndexes[history],
        stage: {
          ...entry.stage
        },
        turns: []
      };
    });
    const storyEntries = hydratedEntries.filter(entry => entry.stage.kind === "story");
    const storiesById = new Map(storyEntries.map(entry => [ entry.representativeMessageId, entry ]));
    let previousStory;
    hydratedEntries.forEach(dialogueEntry => {
      if (dialogueEntry.stage.kind !== "dialogue") {
        previousStory = dialogueEntry;
        return;
      }
      const requestedAnchor = dialogueEntry.stage.anchorStoryMessageId;
      const anchor = (requestedAnchor !== undefined ? storiesById.get(requestedAnchor) : undefined) ?? previousStory;
      if (!anchor) return;
      const thread = {
        sessionId: dialogueEntry.stage.sessionId,
        anchorStoryMessageId: anchor.representativeMessageId,
        representativeMessageId: dialogueEntry.representativeMessageId,
        messageIds: [ ...dialogueEntry.messageIds ],
        targetName: dialogueEntry.stage.targetName,
        canonicalName: dialogueEntry.stage.canonicalName,
        channel: dialogueEntry.stage.channel,
        turnCount: dialogueEntry.stage.turnCount,
        engine: dialogueEntry.stage.engine,
        turns: dialogueEntry.turns
      };
      (anchor.dialogueThreads ??= []).push(thread);
    });
    storyEntries.forEach((entry, index) => {
      entry.index = index + 1;
      entry.historyIndex = index + 1;
    });
    snapshot.timelineEntries = storyEntries;
    return storyEntries;
  };
  const hydrateTimelinePageEntry = (snapshot, entry) => ({
    ...entry,
    turns: hydrateStageTurns(snapshot, entry),
    ...entry.dialogueThreads ? {
      dialogueThreads: entry.dialogueThreads.map(thread => ({
        ...thread,
        turns: hydrateStageTurns(snapshot, thread)
      }))
    } : {}
  });
  const findTimelineEntryIndex = (entries, messageId) => {
    if (!Number.isFinite(messageId)) return entries.length - 1;
    const normalized = Math.trunc(messageId);
    const exact = entries.findIndex(entry => entry.representativeMessageId === normalized || entry.messageIds.includes(normalized) || entry.dialogueThreads?.some(thread => thread.representativeMessageId === normalized || thread.messageIds.includes(normalized)));
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
      entries: entries.slice(start, end).map(entry => hydrateTimelinePageEntry(snapshot, entry)),
      hasOlder: start > 0,
      hasNewer: end < entries.length
    });
  };
  const getStageEntries = () => getStageSnapshot().entries;
  const latestStageId = () => getStageEntries().at(-1)?.representativeMessageId;
  const latestStoryStageId = (entries = getStageEntries()) => getHistoryEntries(entries, "story").at(-1)?.representativeMessageId;
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
  const parkCandidateFrame = (frame, latestMessageId = latestStoryStageId()) => {
    rememberFrame(frame);
    if (frame.dataset.dhlControllerOwned === "true") return;
    const messageId = getFrameMessageId(frame);
    if (messageId === undefined) return;
    const parkedMessageId = getParkedMessageId();
    if (parkedMessageId !== undefined && parkedMessageId !== messageId && getLiveRegistration(parkedMessageId)) return;
    const shouldPark = messageId === latestMessageId || activeGeneration?.operation === "reroll" && messageId === activeGeneration.baseMessageId;
    if (!shouldPark) return;
    if (parkFrame(messageId, frame)) scheduleViewRefresh(0);
  };
  const flushFrameCandidates = () => {
    frameCandidateTimer = null;
    if (controllerDisposed || pendingFrameCandidates.size === 0) return;
    const frames = [ ...pendingFrameCandidates ];
    pendingFrameCandidates.clear();
    const latestMessageId = latestStoryStageId();
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
    const chat = tavernDocument.querySelector("#chat");
    if (chat === observedChat && frameObserver) return;
    frameObserver?.disconnect();
    observedChat = chat;
    if (!chat) return;
    frameObserver = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === "attributes") {
          const frame = record.target;
          if (frame.tagName === "IFRAME" && frame.closest(".TH-render")) queueFrameCandidate(frame);
        } else {
          record.addedNodes.forEach(inspectAddedFrameNode);
        }
      });
    });
    frameObserver.observe(chat, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [ "src", "srcdoc" ]
    });
  };
  const parkLatestStageFrame = () => {
    const messageId = latestStoryStageId();
    if (messageId === undefined) return;
    const frame = getMessageElement(messageId)?.querySelector(".TH-render iframe");
    if (frame) parkCandidateFrame(frame);
  };
  const reconcileStageFrame = () => {
    if (controllerDisposed) return;
    installFrameObserver();
    const parkedId = getParkedMessageId();
    if (parkedId !== undefined && getLiveRegistration(parkedId)) {
      if (!tavernDocument.body.classList.contains(ROOT_ACTIVE_CLASS)) scheduleViewRefresh(0);
      return;
    }
    invalidateStageSnapshot();
    parkLatestStageFrame();
    scheduleViewRefresh(FRAME_CANDIDATE_BATCH_MS);
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
    const parkedMessageId = getParkedMessageId();
    if (parkedMessageId !== undefined && getLiveRegistration(parkedMessageId)) return parkedMessageId;
    if (activeGeneration?.operation === "reroll" && getMessageElement(activeGeneration.baseMessageId)) {
      return activeGeneration.baseMessageId;
    }
    return getRegisteredAssistantIds().filter(messageId => getMessageElement(messageId)).at(-1) ?? parkedMessageId;
  };
  const makeView = (entries = getStageEntries()) => {
    const pendingInput = getPendingInput();
    const lockedView = getRerollLock();
    if (lockedView) {
      return {
        ...lockedView,
        hostMessageId: getHostStageId() ?? lockedView.hostMessageId,
        nativeInputCollapsed,
        pendingInput,
        activeInteraction: activeInteraction.mode === "dialogue" ? {
          ...activeInteraction
        } : STORY_INTERACTION
      };
    }
    const storyEntries = getHistoryEntries(entries, "story");
    const ids = storyEntries.map(entry => entry.representativeMessageId);
    const latestMessageId = ids.at(-1) ?? -1;
    const selected = selectedMessageId !== null && ids.includes(selectedMessageId) ? selectedMessageId : latestMessageId;
    const position = ids.indexOf(selected);
    const selectedEntry = storyEntries[position];
    const selectedAssistantMessageId = selectedEntry?.messageIds.at(-1) ?? selected;
    const tokenCount = readMessageTokenCount(getStageSnapshot().messagesById.get(selectedAssistantMessageId));
    return {
      hostMessageId: getHostStageId() ?? -1,
      revision: viewRevision,
      selectedMessageId: selected,
      latestMessageId,
      latestStoryMessageId: latestMessageId,
      latestStateMessageId: latestStageId() ?? latestMessageId,
      index: position >= 0 ? position + 1 : 0,
      total: ids.length,
      previousMessageId: position > 0 ? ids[position - 1] : undefined,
      nextMessageId: position >= 0 && position < ids.length - 1 ? ids[position + 1] : undefined,
      isLatest: selected === latestMessageId,
      nativeInputCollapsed,
      ...pendingInput ? {
        pendingInput
      } : {},
      ...tokenCount !== undefined ? {
        tokenCount
      } : {},
      stage: selectedEntry?.stage ?? {
        kind: "story"
      },
      dialogueThreads: hydrateTimelineEntries(getStageSnapshot()).find(entry => entry.representativeMessageId === selected)?.dialogueThreads?.map(thread => ({
        ...thread,
        turns: hydrateStageTurns(getStageSnapshot(), thread)
      })) ?? [],
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
    const active = tavernDocument.body.classList.contains("dhl-pseudo-layer-active");
    tavernDocument.body.classList.toggle("dhl-native-input-collapsed", active && nativeInputCollapsed);
    const chat = tavernDocument.querySelector("#chat");
    if (!chat || !active || chat.scrollTop === 0) return;
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
    const hostMessageId = entries.length > 0 ? getHostStageId() : undefined;
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
      version: 3,
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
  const setDialogueCarryoverPrompt = async (content = "") => {
    const context = tavernWindow.SillyTavern?.getContext?.();
    if (typeof context?.setExtensionPrompt !== "function") return;
    await context.setExtensionPrompt(DIALOGUE_CARRYOVER_PROMPT_ID, content, content ? 1 : -1, 1, false, 0);
  };
  const buildDialogueCarryoverPrompt = anchorStoryMessageId => {
    const snapshot = getStageSnapshot();
    const storyIndexEntry = hydrateTimelineEntries(snapshot).find(entry => entry.representativeMessageId === anchorStoryMessageId);
    const storyEntry = storyIndexEntry ? hydrateTimelinePageEntry(snapshot, storyIndexEntry) : undefined;
    const threads = storyEntry?.dialogueThreads ?? [];
    if (threads.length === 0) return "";
    const significantLines = [];
    const recentTurns = threads.flatMap(thread => thread.turns.map(turn => ({
      ...turn,
      targetName: thread.targetName
    }))).sort((left, right) => left.assistantMessageId - right.assistantMessageId);
    recentTurns.forEach(turn => {
      const metadata = readInteractionMetadata(snapshot.messagesById.get(turn.assistantMessageId));
      metadata?.memoryEvents?.forEach(event => {
        if (event.status === "open") significantLines.push(`${metadata.targetName}记住：${event.summary}`);
      });
      metadata?.relationEvents?.forEach(event => {
        if (event.applied) significantLines.push(`${metadata.targetName}关系变化：${event.summary}`);
      });
      if (metadata?.sessionState?.unresolvedThreads?.length) {
        significantLines.push(`${metadata.targetName}未了话题：${metadata.sessionState.unresolvedThreads.join("；")}`);
      }
    });
    const quoteLines = recentTurns.slice(-4).flatMap(turn => {
      const visible = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.extractDialogueContent)(turn.assistantText);
      return [ turn.userText && `{{user}}：${turn.userText}`, visible.dialogue && `${turn.targetName}：${visible.dialogue}` ].filter(Boolean);
    });
    const content = [ "【刚刚发生的幕间交谈】", "以下交谈已经发生，是本轮正文的既成事实。自然承接其关系、承诺和情绪，不要机械复述整段对白。", ...[ ...new Set(significantLines) ].slice(-8), quoteLines.length ? "【近期原话】" : "", ...quoteLines ].filter(Boolean).join("\n");
    return content.slice(0, 1200);
  };
  const prepareDialogueCarryoverPrompt = async anchorStoryMessageId => {
    await setDialogueCarryoverPrompt(buildDialogueCarryoverPrompt(anchorStoryMessageId));
  };
  const clearDialogueCarryoverPrompt = () => {
    void setDialogueCarryoverPrompt().catch(error => {
      console.warn("[灯火阑珊·幕间交谈] 清理正文承接提示失败", error);
    });
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
  function getPendingInput() {
    if (activeGeneration) return undefined;
    const messages = getAllMessages();
    const latestAssistantId = messages.filter(message => message.role === "assistant" && isUsableNativeSwipeCandidate(message.message)).at(-1)?.message_id;
    const pendingUsers = messages.filter(message => message.role === "user" && message.message_id > (latestAssistantId ?? -1) && String(message.message ?? "").trim().length > 0);
    const latest = pendingUsers.at(-1);
    if (!latest) return undefined;
    return {
      messageIds: pendingUsers.map(message => message.message_id),
      latestMessageId: latest.message_id,
      text: readTimelineUserText(latest, readInteractionMetadata(latest)),
      count: pendingUsers.length
    };
  }
  const resolveNativeGenerationUserMessage = generation => {
    if (Number.isInteger(generation.userMessageId)) {
      const explicit = getChatMessages(Number(generation.userMessageId))[0];
      if (explicit?.role === "user") return explicit;
    }
    const baseline = Number(generation.baselineLastMessageId ?? generation.baseMessageId);
    const expectedText = generation.rawUserText.trim();
    const inferred = getAllMessages().find(message => {
      if (message.role !== "user" || message.message_id <= baseline) return false;
      if (!expectedText) return true;
      return String(message.message ?? "").trim() === expectedText;
    });
    if (inferred) generation.userMessageId = inferred.message_id;
    return inferred;
  };
  const isNativeGenerationAssistant = (generation, messageId) => {
    if (generation.engine !== "native" || generation.operation !== "generate") return false;
    const message = getChatMessages(messageId)[0];
    if (message?.role !== "assistant" || !isUsableNativeSwipeCandidate(message.message)) return false;
    const userMessage = resolveNativeGenerationUserMessage(generation);
    const boundary = userMessage?.message_id ?? generation.baselineLastMessageId ?? generation.baseMessageId;
    return message.message_id > boundary;
  };
  const findNativeGenerationAssistant = generation => {
    const userMessage = resolveNativeGenerationUserMessage(generation);
    const boundary = userMessage?.message_id ?? generation.baselineLastMessageId ?? generation.baseMessageId;
    return getAllMessages().find(message => message.role === "assistant" && message.message_id > boundary && isUsableNativeSwipeCandidate(message.message));
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
      clearDialogueCarryoverPrompt();
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
  const rollbackNativeGenerationInput = async generation => {
    if (generation.engine !== "native" || generation.operation !== "generate") return false;
    if (generation.chatId && getCurrentChatId() !== generation.chatId) return false;
    if (findNativeGenerationAssistant(generation)) return false;
    const userMessage = resolveNativeGenerationUserMessage(generation);
    if (!userMessage) return false;
    const baseline = Number(generation.baselineLastMessageId ?? generation.baseMessageId);
    if (userMessage.message_id <= baseline) return false;
    const transactionMessageIds = getAllMessages().filter(message => message.message_id >= userMessage.message_id && (message.message_id === userMessage.message_id || message.role === "assistant" && !isUsableNativeSwipeCandidate(message.message))).map(message => message.message_id);
    if (!transactionMessageIds.includes(userMessage.message_id)) return false;
    const previousDeletingMessageId = deletingMessageId;
    deletingMessageId = Math.max(...transactionMessageIds);
    try {
      await deleteChatMessages(transactionMessageIds, {
        refresh: "affected"
      });
    } finally {
      deletingMessageId = previousDeletingMessageId;
    }
    invalidateStageSnapshot();
    const fallbackMessageId = latestStageId() ?? generation.baseMessageId;
    selectedMessageId = fallbackMessageId;
    selectedHistoryKind = generation.interaction.mode;
    rememberStageSelection(fallbackMessageId);
    browsingHistory = false;
    viewRevision += 1;
    return true;
  };
  const failNativeGeneration = (generation, error) => {
    if (generation.generationFailure) return generation.generationFailure;
    generation.cancelled = true;
    const task = (async () => {
      let rolledBack = false;
      try {
        rolledBack = await rollbackNativeGenerationInput(generation);
      } catch (rollbackError) {
        console.error("[灯火阑珊·伪同层] 失败推演的临时输入回滚失败", rollbackError);
      }
      if (activeGeneration !== generation) return;
      clearDialogueCarryoverPrompt();
      if (!rolledBack) {
        const lateAssistant = findNativeGenerationAssistant(generation);
        if (lateAssistant) {
          await finishMessage(lateAssistant.message_id);
          return;
        }
      }
      discardQueuedStream();
      const reason = error instanceof Error ? error.message : String(error);
      const cleanupNotice = rolledBack ? "本轮临时输入已撤销，原文仍保留在输入框中，可以直接重试。" : Number.isInteger(generation.userMessageId) ? "未能安全撤销本轮输入，请展开酒馆原生聊天检查是否残留孤立楼层。" : "本轮尚未写入聊天记录，原文仍保留在输入框中。";
      send(generation.source, {
        type: "error",
        requestId: generation.requestId,
        message: `${reason}；${cleanupNotice}`
      });
      activeGeneration = null;
      broadcastView();
    })();
    generation.generationFailure = task;
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
    return [ `<反应>${reaction}</反应>`, `<正文>${dialogue}</正文>`, `<visual_cards>${JSON.stringify([ result.visualCard ])}</visual_cards>`, result.variableUpdateBlock, "<pseudo_layer>", "灯火阑珊", "</pseudo_layer>" ].filter(Boolean).join("\n");
  };
  const applyDialogueVariableUpdate = async (result, mvuSnapshot) => {
    const baseline = _.cloneDeep(mvuSnapshot);
    if (!result.variableUpdateBlock) return baseline;
    try {
      await waitGlobalInitialized("Mvu");
      const updated = await Mvu.parseMessage(result.variableUpdateBlock, baseline);
      const statData = _.get(updated, "stat_data");
      if (statData && typeof statData === "object") {
        _.set(updated, "stat_data", _schema__WEBPACK_IMPORTED_MODULE_1__.Schema.parse(statData));
      }
      return updated;
    } catch (error) {
      console.warn("[灯火阑珊·短对话] 受限变量更新未能通过 MVU/Schema 校验，已保留对白并沿用旧快照", error);
      result.variableEffects = {};
      result.variableUpdateBlock = "";
      return baseline;
    }
  };
  const buildDedicatedMetadata = (generation, context, userMessageId, result) => {
    const reaction = result ? stripDialogueStructureTags(result.reaction) : "";
    return {
      version: 3,
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
        relationEvents: result.relationEvents.map(event => ({
          ...event,
          applied: Object.values(result.variableEffects).some(Boolean)
        }))
      } : {},
      ...result?.visualCard ? {
        visualCard: {
          ...result.visualCard
        }
      } : {},
      ...result && Object.values(result.variableEffects).some(Boolean) ? {
        variableEffects: {
          ...result.variableEffects
        }
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
  const commitDedicatedDialogue = async (generation, context, result, mvuSnapshot, updatedMvuData) => {
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
      is_hidden: true,
      message: decorateDialogueInput(generation.rawUserText, context),
      data: _.cloneDeep(mvuSnapshot),
      extra: {
        [INTERACTION_KEY]: userMetadata
      }
    }, {
      role: "assistant",
      is_hidden: true,
      message: buildDedicatedDialogueMessage(result),
      data: _.cloneDeep(updatedMvuData),
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
  const commitDedicatedDialogueReroll = async (generation, context, result, updatedMvuData) => {
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
      is_hidden: true,
      message: buildDedicatedDialogueMessage(result),
      data: _.cloneDeep(updatedMvuData),
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
    selectedMessageId = generation.interaction.mode === "dialogue" ? generation.interaction.anchorStoryMessageId ?? latestStoryStageId() ?? messageId : messageId;
    selectedHistoryKind = "story";
    if (selectedMessageId !== null) rememberStageSelection(selectedMessageId);
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
      const result = await (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_4__.generateDialogueReply)({
        generationId: generation.generationId,
        operationId: generation.operationId,
        baseMessageId: generation.operation === "reroll" && generation.userMessageId !== undefined ? generation.userMessageId : generation.baseMessageId,
        prompt: generation.rawUserText,
        context,
        messages,
        mvuData: mvuSnapshot,
        getStreamFallback: () => ({
          reaction: generation.streamReaction,
          dialogue: generation.streamText
        })
      });
      if (activeGeneration !== generation) return;
      if (generation.cancelled) throw new Error("本轮短对话已停止。");
      sendGenerationState(generation, "saving");
      const updatedMvuData = await applyDialogueVariableUpdate(result, mvuSnapshot);
      const messageId = generation.operation === "reroll" ? await commitDedicatedDialogueReroll(generation, context, result, updatedMvuData) : await commitDedicatedDialogue(generation, context, result, mvuSnapshot, updatedMvuData);
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
          type: "error",
          requestId: generation.requestId,
          message: "交谈已停止，输入已保留，可以修改后重试。"
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
    const normalizedDialogue = request.interaction.mode === "dialogue" ? normalizeDialogueContext(request.interaction) : null;
    const dialogue = normalizedDialogue && normalizedDialogue.anchorStoryMessageId === undefined ? {
      ...normalizedDialogue,
      anchorStoryMessageId: latestStoryStageId(entries)
    } : normalizedDialogue;
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
      chatId: getCurrentChatId(),
      baselineLastMessageId: getLastMessageId(),
      sent: false,
      received: false,
      streamText: "",
      streamReaction: ""
    };
    selectedHistoryKind = "story";
    browsingHistory = false;
    sendGenerationState(activeGeneration, "preparing");
    applyStageVisibility();
    const generation = activeGeneration;
    void prepareDialogueCarryoverPrompt(request.messageId).then(() => {
      if (activeGeneration !== generation || generation.cancelled) return;
      triggerNativeSend(prompt);
      window.setTimeout(() => {
        if (!activeGeneration || activeGeneration.requestId !== request.requestId || activeGeneration.sent) return;
        void failNativeGeneration(activeGeneration, new Error("酒馆没有开始生成，请检查连接和发送按钮状态"));
      }, 1e4);
    }).catch(error => {
      if (activeGeneration === generation) void failNativeGeneration(generation, error);
    });
  };
  const beginReroll = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "已有一场生成正在进行。"
      });
      return;
    }
    let messages = getAllMessages();
    let message = messages.find(item => item.message_id === request.messageId);
    let metadata = resolveAssistantInteractionMetadata(message, messages);
    const entries = getStageEntries();
    const latest = latestStageId();
    const latestStory = latestStoryStageId(entries);
    if (metadata && request.messageId !== latest || !metadata && request.messageId !== latestStory) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: metadata ? "只能重答最新一轮幕间回复。" : "只能重推最新正文。"
      });
      return;
    }
    if (!metadata) {
      const dependentEntries = entries.filter(entry => entry.stage.kind === "dialogue" && entry.stage.anchorStoryMessageId === request.messageId);
      const dependentIds = dependentEntries.flatMap(entry => entry.messageIds.flatMap(assistantMessageId => {
        const dialogueAssistant = messages.find(candidate => candidate.message_id === assistantMessageId);
        const dialogueMetadata = resolveAssistantInteractionMetadata(dialogueAssistant, messages);
        const dialogueUser = Number.isFinite(dialogueMetadata?.userMessageId) ? messages.find(candidate => candidate.message_id === dialogueMetadata?.userMessageId) : findPreviousUserMessage(messages, assistantMessageId);
        return [ assistantMessageId, ...dialogueUser ? [ dialogueUser.message_id ] : [] ];
      }));
      if (dependentIds.length > 0) {
        deletingMessageId = Math.max(...dependentIds);
        try {
          await deleteChatMessages([ ...new Set(dependentIds) ].sort((left, right) => left - right), {
            refresh: "affected"
          });
        } catch (error) {
          send(source, {
            type: "error",
            requestId: request.requestId,
            message: `移除依赖幕间交谈失败：${error instanceof Error ? error.message : String(error)}`
          });
          return;
        } finally {
          deletingMessageId = null;
        }
        invalidateStageSnapshot();
        messages = getAllMessages();
        message = messages.find(item => item.message_id === request.messageId);
        metadata = resolveAssistantInteractionMetadata(message, messages);
      }
    }
    if (metadata) {
      try {
        if (!message || message.role !== "assistant") throw new Error("没有找到需要重答的角色回复。");
        const context = toDialogueContext(metadata);
        const linkedUser = (metadata.userMessageId !== undefined ? messages.find(item => item.role === "user" && item.message_id === metadata.userMessageId) : undefined) ?? findPreviousUserMessage(messages, request.messageId);
        if (!linkedUser) throw new Error("没有找到这条角色回复对应的玩家发言。");
        const rerollUserText = readTimelineUserText(linkedUser, metadata);
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
        parkSourceFrame(source);
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
    const rerollUserText = readTimelineUserText(previousUser, null);
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
    parkSourceFrame(source);
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
    const targetMessage = getChatMessages(messageId)[0];
    if (!targetMessage || targetMessage.role !== "assistant") {
      if (generation?.engine === "native" && generation.operation === "generate") {
        await failNativeGeneration(generation, new Error("生成结束但没有形成有效的 AI 回复"));
      }
      return false;
    }
    if (generation?.engine === "native" && generation.operation === "generate" && !isNativeGenerationAssistant(generation, messageId)) {
      await failNativeGeneration(generation, new Error("生成结束但回复楼层与本轮输入不匹配"));
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
      if (generation?.engine === "native") clearDialogueCarryoverPrompt();
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
      const processor = tavernWindow.SillyTavern?.getContext?.().streamingProcessor;
      const savedMessage = getChatMessages(messageId)[0];
      const hasNarrative = Boolean((0, _message_content__WEBPACK_IMPORTED_MODULE_3__.parseMessageContent)(String(savedMessage?.message ?? "")).narrative.trim());
      const notice = generation?.cancelled || generation?.engine === "native" && processor?.isStopped ? "本回回复已中断，已保留输入和收到的内容。可以重新生成，或删除本回。" : !hasNarrative ? "本回没有形成可显示的正文。输入与回复原文已保留，可以重新生成或删除本回。" : "";
      if (savedMessage && (notice || savedMessage.extra?.[GENERATION_NOTICE_KEY])) {
        await setChatMessages([ {
          message_id: messageId,
          extra: {
            ...savedMessage.extra,
            [GENERATION_NOTICE_KEY]: notice
          }
        } ], {
          refresh: "none"
        });
      }
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
          messageId,
          notice
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
      invalidateStageSnapshot();
      selectedMessageId = latestStoryStageId() ?? null;
      selectedHistoryKind = "story";
      if (selectedMessageId !== null) rememberStageSelection(selectedMessageId);
      browsingHistory = false;
      viewRevision += 1;
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
  const settleNativeGeneration = (generation, candidateMessageId, failureMessage, delayMs) => {
    window.setTimeout(() => {
      if (activeGeneration !== generation || generation.received || generation.generationFailure) return;
      const processor = tavernWindow.SillyTavern?.getContext?.().streamingProcessor;
      if (!generation.cancelled && processor?.isFinished === false && !processor.isStopped) {
        settleNativeGeneration(generation, candidateMessageId, failureMessage, 1e3);
        return;
      }
      if (isNativeGenerationAssistant(generation, candidateMessageId)) {
        void finishMessage(candidateMessageId);
        return;
      }
      const assistant = findNativeGenerationAssistant(generation);
      if (assistant) {
        void finishMessage(assistant.message_id);
        return;
      }
      void failNativeGeneration(generation, new Error(failureMessage));
    }, delayMs);
  };
  const settleStoppedNativeGeneration = generation => {
    if (activeGeneration !== generation || generation.engine !== "native") return;
    generation.cancelled = true;
    if (generation.operation === "reroll") {
      void failNativeReroll(generation, new Error("重答在完成前被终止"));
      return;
    }
    if (generation.stopSettlementScheduled) return;
    generation.stopSettlementScheduled = true;
    settleNativeGeneration(generation, Number.NaN, "生成在有效回复写入前停止", 3e3);
  };
  const reconcileNativeGeneration = () => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "native" || !generation.sent || generation.received) return;
    if (generation.generationFailure || generation.rerollFailure) return;
    const processor = tavernWindow.SillyTavern?.getContext?.().streamingProcessor;
    const stopButton = tavernDocument.querySelector("#mes_stop");
    const nativeBusy = stopButton && tavernWindow.getComputedStyle(stopButton).display !== "none";
    if (nativeBusy || processor?.isFinished === false && !processor.isStopped) {
      generation.inactiveSince = undefined;
      return;
    }
    if (!stopButton && !processor) return;
    generation.inactiveSince ??= Date.now();
    if (Date.now() - generation.inactiveSince < 4e3) return;
    if (generation.operation === "reroll") {
      if (processor?.isStopped || generation.cancelled) {
        void failNativeReroll(generation, new Error("本次重生成中断"));
      } else {
        void finishMessage(generation.baseMessageId);
      }
    } else {
      settleNativeGeneration(generation, Number.NaN, "本次回复中断，模型未返回正文", 0);
    }
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
    const target = entries.find(entry => entry.representativeMessageId === request.messageId);
    const latest = entries.at(-1);
    const latestStory = getHistoryEntries(entries, "story").at(-1);
    const isLatestDialogue = target?.stage.kind === "dialogue" && target === latest;
    const isLatestStory = target?.stage.kind === "story" && target === latestStory;
    if (!target || !isLatestDialogue && !isLatestStory) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "只能删除最新正文或最新一轮幕间交谈。"
      });
      return;
    }
    if (target.stage.kind === "story" && getHistoryEntries(entries, "story").length <= 1) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "至少需要保留一个伪同层回合。"
      });
      return;
    }
    const messages = getAllMessages();
    const assistant = messages.find(message => message.role === "assistant" && message.message_id === target.representativeMessageId);
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
    const messageIds = new Set([ assistant.message_id, ...linkedUser ? [ linkedUser.message_id ] : [] ]);
    if (target.stage.kind === "story") {
      entries.filter(entry => entry.stage.kind === "dialogue" && entry.stage.anchorStoryMessageId === target.representativeMessageId).forEach(entry => {
        entry.messageIds.forEach(assistantMessageId => {
          messageIds.add(assistantMessageId);
          const dialogueAssistant = messages.find(message => message.message_id === assistantMessageId);
          const dialogueMetadata = resolveAssistantInteractionMetadata(dialogueAssistant, messages);
          const dialogueUser = Number.isFinite(dialogueMetadata?.userMessageId) ? messages.find(message => message.message_id === dialogueMetadata?.userMessageId) : findPreviousUserMessage(messages, assistantMessageId);
          if (dialogueUser) messageIds.add(dialogueUser.message_id);
        });
      });
    }
    const sortedMessageIds = [ ...messageIds ].sort((left, right) => left - right);
    deletingMessageId = Math.max(...sortedMessageIds);
    try {
      await deleteChatMessages(sortedMessageIds, {
        refresh: "affected"
      });
      invalidateStageSnapshot();
      selectedMessageId = latestStoryStageId() ?? null;
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
  const recoverPendingInput = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行，暂不能撤回残留输入。"
      });
      return;
    }
    const pending = getPendingInput();
    if (!pending || pending.latestMessageId !== Math.trunc(request.latestMessageId)) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "这组残留输入已经变化，请稍后重试。"
      });
      return;
    }
    const pendingIds = new Set(pending.messageIds);
    const firstPendingId = Math.min(...pending.messageIds);
    const messages = getAllMessages();
    const hasCompletedReply = messages.some(message => message.message_id > firstPendingId && message.role === "assistant" && isUsableNativeSwipeCandidate(message.message));
    if (hasCompletedReply) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "残留输入之后已经出现有效回复，未执行撤回。"
      });
      return;
    }
    const removableIds = messages.filter(message => pendingIds.has(message.message_id) || message.message_id >= firstPendingId && message.role === "assistant" && !isUsableNativeSwipeCandidate(message.message)).map(message => message.message_id);
    if (removableIds.length === 0) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "没有找到可撤回的残留输入。"
      });
      return;
    }
    const chatId = getCurrentChatId();
    deletingMessageId = Math.max(...removableIds);
    try {
      await deleteChatMessages(removableIds, {
        refresh: "affected"
      });
      if (getCurrentChatId() !== chatId) throw new Error("撤回期间聊天已经切换。");
      invalidateStageSnapshot();
      selectedMessageId = latestStageId() ?? null;
      selectedHistoryKind = null;
      browsingHistory = false;
      viewRevision += 1;
      send(source, {
        type: "pending_input_recovered",
        requestId: request.requestId,
        userText: pending.text,
        removedCount: pending.count
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
  const updateMessageReasoning = async (request, source) => {
    if (activeGeneration || deletingMessageId !== null || updatingMessageId !== null) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前仍有操作正在进行。"
      });
      return;
    }
    const messageId = Math.trunc(request.messageId);
    const content = String(request.content ?? "").trim();
    const entry = getStageEntries().find(candidate => candidate.messageIds.includes(messageId));
    const message = getChatMessages(messageId)[0];
    if (!Number.isFinite(messageId) || !entry || !message || message.role !== "assistant") {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "当前回合已经变化，请重新打开思维链编辑器。"
      });
      return;
    }
    if (!content) {
      send(source, {
        type: "error",
        requestId: request.requestId,
        message: "思维链内容不能为空。"
      });
      return;
    }
    const extra = _.cloneDeep(message.extra ?? {});
    if (extra.extra && typeof extra.extra === "object") {
      extra.extra = {
        ...extra.extra,
        reasoning: content
      };
    } else {
      extra.reasoning = content;
    }
    const chatId = getCurrentChatId();
    updatingMessageId = messageId;
    try {
      await setChatMessages([ {
        message_id: messageId,
        extra
      } ], {
        refresh: "affected"
      });
      if (getCurrentChatId() !== chatId) throw new Error("保存期间聊天已经切换，本次编辑未完成。");
      await eventEmit(tavern_events.MESSAGE_REASONING_EDITED, messageId);
      invalidateStageSnapshot();
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
          version: 3,
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
          version: 3,
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
      if ((0, _player_input__WEBPACK_IMPORTED_MODULE_2__.readAdviceInput)(linkedUser)) {
        await eventEmit(tavern_events.MESSAGE_EDITED, userMessageId);
        if (getCurrentChatId() !== chatId) throw new Error("保存期间聊天已经切换，本次编辑未完成。");
      }
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
      const receipt = request.requestId ? generationReceipts.get(request.requestId) : undefined;
      if (receipt && receipt.chatId === getCurrentChatId()) send(source, receipt.payload);
      if (selectedHistoryKind === null && !browsingHistory && !activeGeneration) {
        selectedMessageId = latestStageId() ?? messageId;
      }
      if (activeGeneration && (messageId === getHostStageId() || messageId === (getSourceMessageId(activeGeneration.source) ?? activeGeneration.lockedView?.hostMessageId ?? activeGeneration.baseMessageId))) {
        activeGeneration.source = source;
      }
      send(source, {
        type: "ready",
        busy: activeGeneration !== null || deletingMessageId !== null || updatingMessageId !== null,
        requestId: activeGeneration?.requestId,
        operation: activeGeneration?.operation
      });
      if (activeGeneration?.source === source) replayGeneration(activeGeneration, source);
      if (!activeGeneration && request.requestId) scheduleViewRefresh(0, true);
      if (isHeartbeat) return;
      window.setTimeout(() => {
        const frame = getFrameForSource(source);
        if (frame && getSourceMessageId(source) === messageId) parkCandidateFrame(frame);
      }, 0);
      scheduleViewRefresh(FRAME_CANDIDATE_BATCH_MS);
      return;
    }
    if (request.type === "goodbye") {
      const messageId = getSourceMessageId(source) ?? request.messageId;
      if (registrations.get(messageId) === source) registrations.delete(messageId);
      sourceProtocolVersions.delete(source);
      scheduleViewRefresh(FRAME_CANDIDATE_BATCH_MS);
      return;
    }
    if (request.type === "generate") {
      beginGeneration(request, source);
      return;
    }
    if (request.type === "reroll") {
      void beginReroll(request, source);
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
    if (request.type === "update_reasoning") {
      void updateMessageReasoning(request, source);
      return;
    }
    if (request.type === "recover_pending_input") {
      void recoverPendingInput(request, source);
      return;
    }
    if (request.type === "stop") {
      if (!activeGeneration || activeGeneration.requestId !== request.requestId) return;
      const generation = activeGeneration;
      if (generation.cancelled || generation.state === "saving") return;
      generation.cancelled = true;
      sendGenerationState(generation, "stopping", source);
      if (generation.engine === "dedicated") {
        if (generation.generationId) stopGenerationById(generation.generationId);
        window.setTimeout(() => {
          if (activeGeneration !== generation || !generation.cancelled) return;
          discardQueuedStream();
          send(generation.source, {
            type: "error",
            requestId: generation.requestId,
            message: "交谈已停止，输入已保留，可以修改后重试。"
          });
          activeGeneration = null;
          broadcastView();
        }, 3e3);
      } else {
        try {
          SillyTavern.stopGeneration();
        } catch (error) {
          console.warn("[灯火阑珊·伪同层] 酒馆停止生成接口抛出异常，转入本地收尾", error);
        }
        settleStoppedNativeGeneration(generation);
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
        rawUserText: readTimelineUserText(message, readInteractionMetadata(message)),
        engine: "native",
        chatId: getCurrentChatId(),
        baselineLastMessageId: messageId - 1,
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
            version: 3,
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
    if (generationHealthTimer !== null) window.clearInterval(generationHealthTimer);
    generationHealthTimer = null;
    clearDialogueCarryoverPrompt();
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
    observedChat = null;
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
  controllerEventStops.push(eventOn(tavern_events.GENERATION_STARTED, (type, _options, dryRun) => {
    if (dryRun || type === "quiet" || type === "impersonate") return;
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
    const parsed = (0, _dialogue_engine__WEBPACK_IMPORTED_MODULE_4__.parseDialogueGeneration)(text, generation.interaction, generation.operationId ?? generation.requestId);
    generation.streamText = parsed.dialogue;
    generation.streamReaction = parsed.reaction;
    queueStream(generation, parsed.dialogue, parsed.reaction);
  }));
  controllerEventStops.push(eventOn(tavern_events.STREAM_REASONING_DONE, (reasoning, duration, messageId, state) => {
    const generation = activeGeneration;
    if (!generation || generation.engine !== "native" || generation.cancelled) return;
    const targetMessageId = Number(messageId);
    const belongsToGeneration = generation.operation === "reroll" ? targetMessageId === generation.baseMessageId : Number.isInteger(generation.userMessageId) ? targetMessageId > Number(generation.userMessageId) : targetMessageId > generation.baseMessageId;
    const text = (0, _message_content__WEBPACK_IMPORTED_MODULE_3__.sanitizeReasoningText)(reasoning);
    if (!belongsToGeneration || !text) return;
    const completedReasoning = {
      messageId: targetMessageId,
      text,
      duration,
      state
    };
    generation.reasoning = completedReasoning;
    if (pendingStreamDispatch?.requestId === generation.requestId) {
      pendingStreamDispatch.reasoning = completedReasoning;
      flushQueuedStream(generation);
      return;
    }
    send(generation.source, {
      type: "reasoning",
      requestId: generation.requestId,
      ...completedReasoning
    });
  }));
  controllerEventStops.push(eventOn(tavern_events.MESSAGE_RECEIVED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    if (activeGeneration?.engine === "native") {
      const targetId = Number(messageId);
      if (activeGeneration.operation === "reroll" && targetId !== activeGeneration.baseMessageId) return;
      if (activeGeneration.operation === "generate" && !isNativeGenerationAssistant(activeGeneration, targetId)) return;
    }
    void finishMessage(Number(messageId));
  }));
  controllerEventStops.push(eventOn(tavern_events.GENERATION_ENDED, messageId => {
    if (activeGeneration?.engine === "dedicated") return;
    const generation = activeGeneration;
    if (generation?.engine === "native" && generation.operation === "reroll") {
      if (!generation.cancelled) void finishMessage(generation.baseMessageId);
      return;
    }
    const reportedMessageId = Number(messageId);
    if (generation?.engine === "native" && generation.operation === "generate") {
      settleNativeGeneration(generation, reportedMessageId, "生成结束但模型没有返回有效回复", 800);
      return;
    }
    const lastMessageId = getLastMessageId();
    const targetMessageId = reportedMessageId === lastMessageId + 1 ? lastMessageId : reportedMessageId;
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
    settleStoppedNativeGeneration(generation);
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
    clearDialogueCarryoverPrompt();
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
      void migrateLegacyDialogueMessages().catch(error => console.warn("[灯火阑珊·幕间交谈] 旧交谈归档失败", error)).finally(() => recoverFailedNativeRerolls().finally(parkLatestStageFrame));
    }, 300);
  }));
  installStyle();
  generationHealthTimer = window.setInterval(() => {
    reconcileNativeGeneration();
    reconcileStageFrame();
  }, 2e3);
  applyNativeInputState();
  tavernWindow.addEventListener("message", handleMessage);
  nativeInputMedia.addEventListener("change", handleNativeInputViewportChange);
  installFrameObserver();
  window.setTimeout(reconcileStageFrame, 0);
  window.setTimeout(() => {
    void migrateLegacyDialogueMessages().catch(error => console.warn("[灯火阑珊·幕间交谈] 旧交谈归档失败", error)).finally(() => recoverFailedNativeRerolls().finally(parkLatestStageFrame));
  }, 600);
  duplicatePruneTimers.push(window.setTimeout(() => {
    if (!controllerDisposed) pruneDuplicateControllerFrames();
  }, 500));
  $(window).on("pagehide", disposeController);
  console.info(`[灯火阑珊·伪同层] 原生楼层控制器已连接 v${_pseudo_layer_protocol__WEBPACK_IMPORTED_MODULE_0__.PSEUDO_LAYER_VERSION}`);
})();