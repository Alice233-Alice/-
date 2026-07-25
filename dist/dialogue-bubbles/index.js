var __webpack_modules__ = {
  "./src/dialogue-bubbles/parser.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    __webpack_require__.r(__webpack_exports__);
    __webpack_require__.d(__webpack_exports__, {
      parseBubbleSegments: () => parseBubbleSegments,
      parseDialogueMarkupRoot: () => parseDialogueMarkupRoot,
      parseDialogueParagraph: () => parseDialogueParagraph
    });
    const quotePairs = [ [ "「", "」" ], [ "“", "”" ], [ '"', '"' ] ];
    const userAliasSeed = [ "{{user}}", "<user>", "user", "玩家", "主角" ];
    const charAliasSeed = [ "{{char}}", "<char>", "char", "character" ];
    const protocolUserTargets = [ "user", "self", "player", "protagonist" ];
    const protocolCharTargets = [ "char", "assistant", "character", "npc" ];
    const strictSpeakerPattern = /^[\p{L}\p{N}_\-·・]{1,16}$/u;
    const reportingVerbPattern = /(?:说|道|问|答|喊|叫|笑|叹|骂|低语|呢喃|嘀咕|开口|表示|回应|提醒|补充|解释|命令|宣布)$/u;
    function normalizeSpeakerToken(value) {
      return value.replace(/[【】[\]（）()「」“”"'`<>《》]/g, "").replace(/\s+/g, "").trim().toLowerCase();
    }
    function detectFixedSpeakerCategory(name) {
      const normalized = normalizeSpeakerToken(name);
      if (!normalized) {
        return null;
      }
      if (normalized === normalizeSpeakerToken("时夏")) {
        return "shixia";
      }
      if (normalized === normalizeSpeakerToken("栗原")) {
        return "kurihara";
      }
      return null;
    }
    function buildSpeakerContext(input) {
      const charName = input.currentCharName?.trim() || input.name?.trim() || substitudeMacros("{{char}}").trim() || "角色";
      const userName = input.userName?.trim() || substitudeMacros("{{user}}").trim() || "User";
      return {
        charName,
        userName,
        currentCharCategory: detectFixedSpeakerCategory(charName) ?? "other",
        charAliases: new Set([ charName, input.name ?? "", ...charAliasSeed ].map(normalizeSpeakerToken).filter(Boolean)),
        userAliases: new Set([ userName, ...userAliasSeed ].map(normalizeSpeakerToken).filter(Boolean))
      };
    }
    function classifySpeaker(rawSpeaker, context) {
      const normalized = normalizeSpeakerToken(rawSpeaker);
      if (!normalized) {
        return context.currentCharCategory;
      }
      if (context.userAliases.has(normalized)) {
        return "user";
      }
      const fixedCategory = detectFixedSpeakerCategory(rawSpeaker);
      if (fixedCategory) {
        return fixedCategory;
      }
      if (context.charAliases.has(normalized)) {
        return context.currentCharCategory;
      }
      return "other";
    }
    function getSpeakerName(rawSpeaker, category, context) {
      if (category === "user") {
        return context.userName;
      }
      if (rawSpeaker.trim()) {
        return rawSpeaker.trim();
      }
      return context.charName;
    }
    function stripOuterQuotes(text) {
      let current = text.trim();
      let changed = true;
      while (changed) {
        changed = false;
        for (const [open, close] of quotePairs) {
          if (current.startsWith(open) && current.endsWith(close) && current.length > open.length + close.length) {
            current = current.slice(open.length, current.length - close.length).trim();
            changed = true;
          }
        }
      }
      return current;
    }
    function createHtml(messageId, text) {
      return formatAsDisplayedMessage(text.trim(), {
        message_id: messageId
      });
    }
    function createNarrationSegment(messageId, content) {
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return null;
      }
      return {
        type: "narration",
        html: createHtml(messageId, trimmedContent)
      };
    }
    function speakerLooksStrict(rawSpeaker, context) {
      const trimmed = rawSpeaker.trim();
      if (!trimmed) {
        return false;
      }
      const normalized = normalizeSpeakerToken(trimmed);
      if (!normalized) {
        return false;
      }
      if (context.userAliases.has(normalized) || context.charAliases.has(normalized)) {
        return true;
      }
      if (detectFixedSpeakerCategory(trimmed)) {
        return true;
      }
      if (!strictSpeakerPattern.test(trimmed)) {
        return false;
      }
      return !reportingVerbPattern.test(trimmed);
    }
    function createBubbleSpec(content, rawSpeaker, context) {
      const trimmedContent = stripOuterQuotes(content);
      if (!trimmedContent) {
        return null;
      }
      const speakerCategory = classifySpeaker(rawSpeaker, context);
      const speakerName = getSpeakerName(rawSpeaker, speakerCategory, context);
      return {
        side: speakerCategory === "user" ? "right" : "left",
        speakerName,
        speakerCategory,
        content: trimmedContent
      };
    }
    function resolveProtocolSpeaker(target, explicitName, context) {
      const preferredName = explicitName?.trim();
      if (preferredName) {
        return preferredName;
      }
      const trimmedTarget = target.trim();
      if (!trimmedTarget) {
        return null;
      }
      const normalizedTarget = normalizeSpeakerToken(trimmedTarget);
      if (!normalizedTarget) {
        return null;
      }
      if (protocolUserTargets.some(alias => normalizedTarget === normalizeSpeakerToken(alias))) {
        return context.userName;
      }
      if (protocolCharTargets.some(alias => normalizedTarget === normalizeSpeakerToken(alias))) {
        return context.charName;
      }
      if (normalizedTarget === normalizeSpeakerToken("时夏")) {
        return "时夏";
      }
      if (normalizedTarget === normalizeSpeakerToken("栗原")) {
        return "栗原";
      }
      const otherMatch = trimmedTarget.match(/^(?:other|npc)[:：](.+)$/i);
      if (otherMatch?.[1]?.trim()) {
        return otherMatch[1].trim();
      }
      return speakerLooksStrict(trimmedTarget, context) ? trimmedTarget : null;
    }
    function parseProtocolLine(line, messageId, context) {
      const trimmed = line.trim();
      if (!trimmed) {
        return null;
      }
      const bracketNarrationMatch = trimmed.match(/^\[nar\]\s*([\s\S]*)$/i);
      if (bracketNarrationMatch) {
        return createNarrationSegment(messageId, bracketNarrationMatch[1] ?? "");
      }
      const xmlNarrationMatch = trimmed.match(/^<nar>\s*([\s\S]*?)\s*<\/nar>$/i);
      if (xmlNarrationMatch) {
        return createNarrationSegment(messageId, xmlNarrationMatch[1] ?? "");
      }
      const bracketDialogueMatch = trimmed.match(/^\[dia\|([^\]\n]+)\]\s*([\s\S]*)$/i);
      if (bracketDialogueMatch) {
        const rawSpeaker = resolveProtocolSpeaker(bracketDialogueMatch[1] ?? "", null, context);
        if (!rawSpeaker) {
          return null;
        }
        const bubble = createBubbleSpec(bracketDialogueMatch[2] ?? "", rawSpeaker, context);
        return bubble ? {
          type: "bubble",
          bubble
        } : null;
      }
      const xmlDialogueMatch = trimmed.match(/^<dia\b([^>]*)>\s*([\s\S]*?)\s*<\/dia>$/i);
      if (xmlDialogueMatch) {
        const rawAttributes = xmlDialogueMatch[1] ?? "";
        const content = xmlDialogueMatch[2] ?? "";
        const whoMatch = rawAttributes.match(/\bwho=(['"])(.*?)\1/i);
        const nameMatch = rawAttributes.match(/\bname=(['"])(.*?)\1/i);
        const rawSpeaker = resolveProtocolSpeaker(whoMatch?.[2] ?? "", nameMatch?.[2] ?? null, context);
        if (!rawSpeaker) {
          return null;
        }
        const bubble = createBubbleSpec(content, rawSpeaker, context);
        return bubble ? {
          type: "bubble",
          bubble
        } : null;
      }
      return null;
    }
    function createBubbleSegment(bubble) {
      return {
        type: "bubble",
        bubble
      };
    }
    function parseExplicitProtocolParagraph(paragraph, messageId, context) {
      const segment = parseProtocolLine(paragraph, messageId, context);
      if (!segment) {
        return {
          kind: "none"
        };
      }
      return {
        kind: "segments",
        segments: [ segment ]
      };
    }
    function getFirstNonEmptyAttribute(element, names) {
      for (const name of names) {
        const value = element.getAttribute(name)?.trim();
        if (value) {
          return value;
        }
      }
      return null;
    }
    function isMarkupRoot(element) {
      const tagName = element.tagName.toLowerCase();
      return tagName === "dialogue-bubbles" || element.matches('[data-dialogue-bubbles="true"], .dialogue-bubbles');
    }
    function isBubbleMarkupElement(element) {
      const tagName = element.tagName.toLowerCase();
      return tagName === "bubble" || tagName === "dia" || element.matches("[data-dialogue-bubble], [data-dia]");
    }
    function isNarrationMarkupElement(element) {
      const tagName = element.tagName.toLowerCase();
      return tagName === "nar" || tagName === "narration" || element.matches("[data-dialogue-narration], [data-nar]");
    }
    function resolveMarkupSpeaker(element, context) {
      const explicitName = getFirstNonEmptyAttribute(element, [ "name", "speaker", "data-name", "data-speaker" ]);
      const target = getFirstNonEmptyAttribute(element, [ "who", "data-who" ]) ?? "";
      return resolveProtocolSpeaker(target, explicitName, context);
    }
    function createSegmentFromMarkupElement(element, messageId, context) {
      if (isNarrationMarkupElement(element)) {
        return createNarrationSegment(messageId, element.textContent ?? "");
      }
      if (!isBubbleMarkupElement(element)) {
        return createNarrationSegment(messageId, element.textContent ?? "");
      }
      const rawSpeaker = resolveMarkupSpeaker(element, context);
      if (!rawSpeaker) {
        return null;
      }
      const bubble = createBubbleSpec(element.textContent ?? "", rawSpeaker, context);
      return bubble ? createBubbleSegment(bubble) : null;
    }
    function parseDialogueMarkupRoot(input) {
      if (!isMarkupRoot(input.root)) {
        return {
          kind: "none"
        };
      }
      const context = buildSpeakerContext(input);
      const segments = [];
      Array.from(input.root.children).forEach(child => {
        const segment = createSegmentFromMarkupElement(child, input.messageId, context);
        if (segment) {
          segments.push(segment);
        }
      });
      return segments.length > 0 ? {
        kind: "segments",
        segments
      } : {
        kind: "none"
      };
    }
    function splitParagraphs(message) {
      return message.replace(/\r/g, "").split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
    }
    function pushNarrationSegment(segments, narrationBlocks, messageId, keyRef) {
      const narrationText = narrationBlocks.join("\n\n").trim();
      if (!narrationText) {
        narrationBlocks.length = 0;
        return;
      }
      segments.push({
        key: `narration-${keyRef.value++}`,
        type: "narration",
        html: createHtml(messageId, narrationText)
      });
      narrationBlocks.length = 0;
    }
    function pushBubbleSegments(segments, messageId, bubbles, keyRef) {
      bubbles.forEach(bubble => {
        segments.push({
          key: `bubble-${keyRef.value++}`,
          type: "bubble",
          side: bubble.side,
          speakerName: bubble.speakerName,
          speakerCategory: bubble.speakerCategory,
          html: createHtml(messageId, bubble.content)
        });
      });
    }
    function parseDialogueParagraph(input) {
      const context = buildSpeakerContext(input);
      const paragraph = input.paragraph.trim();
      if (!paragraph) {
        return {
          kind: "none"
        };
      }
      if (input.role === "user") {
        const bubble = createBubbleSpec(paragraph, context.userName, context);
        return bubble ? {
          kind: "segments",
          segments: [ createBubbleSegment(bubble) ]
        } : {
          kind: "none"
        };
      }
      return parseExplicitProtocolParagraph(paragraph, input.messageId, context);
    }
    function parseBubbleSegments(input) {
      const segments = [];
      const narrationBlocks = [];
      const keyRef = {
        value: 0
      };
      const paragraphs = splitParagraphs(input.message);
      if (paragraphs.length === 0) {
        return segments;
      }
      for (const paragraph of paragraphs) {
        const parsed = parseDialogueParagraph({
          ...input,
          paragraph
        });
        if (parsed.kind === "none") {
          narrationBlocks.push(paragraph);
          continue;
        }
        pushNarrationSegment(segments, narrationBlocks, input.messageId, keyRef);
        parsed.segments.forEach(segment => {
          if (segment.type === "narration") {
            segments.push({
              key: `narration-${keyRef.value++}`,
              type: "narration",
              html: segment.html
            });
            return;
          }
          pushBubbleSegments(segments, input.messageId, [ segment.bubble ], keyRef);
        });
      }
      pushNarrationSegment(segments, narrationBlocks, input.messageId, keyRef);
      return segments;
    }
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
  /*!***************************************!*\
  !*** ./src/dialogue-bubbles/index.ts ***!
  \***************************************/
  __webpack_require__.r(__webpack_exports__);
  var _parser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parser */ "./src/dialogue-bubbles/parser.ts");
  const STYLE_ATTRIBUTE = "data-dialogue-bubble-style";
  const RENDERED_ATTRIBUTE = "data-dialogue-bubble-rendered";
  const SOURCE_ATTRIBUTE = "data-dialogue-bubble-source";
  const SOURCE_HIDDEN_CLASS = "DialogueBubble__source-hidden";
  const MESSAGE_SELECTOR = '#chat > .mes[is_system="false"]';
  const MARKUP_ROOT_SELECTOR = 'dialogue-bubbles, [data-dialogue-bubbles="true"], .dialogue-bubbles';
  const EXCLUDED_DIALOGUE_SELECTOR = [ ".TH-streaming", MARKUP_ROOT_SELECTOR, '[data-dialogue-bubble-rendered="true"]', '[data-dialogue-bubble-source="true"]', "details", "summary", "pre", "code", "table", "script", "style", "textarea", "[script_id]" ].join(", ");
  const SHIXIA_SMILE_AVATAR = "https://raw.githubusercontent.com/atr1official/atri_official/main/%E6%97%B6%E5%A4%8F%26%E6%A0%97%E5%8E%9F/%E6%97%B6%E5%A4%8Fsmile.png";
  const SHIXIA_SAD_AVATAR = "https://raw.githubusercontent.com/atr1official/atri_official/main/%E6%97%B6%E5%A4%8F%26%E6%A0%97%E5%8E%9F/%E6%97%B6%E5%A4%8Fsad.png";
  const KURIHARA_SMILE_AVATAR = "https://raw.githubusercontent.com/atr1official/atri_official/main/%E6%97%B6%E5%A4%8F%26%E6%A0%97%E5%8E%9F/%E6%A0%97%E5%8E%9Fsmile.png";
  const KURIHARA_SAD_AVATAR = "https://raw.githubusercontent.com/atr1official/atri_official/main/%E6%97%B6%E5%A4%8F%26%E6%A0%97%E5%8E%9F/%E6%A0%97%E5%8E%9Fsad.png";
  const CUSTOM_SPEAKER_PROFILES = [ {
    aliases: [ "白清弦" ],
    displayName: "白清弦",
    avatarUrl: "",
    tone: "purple"
  }, {
    aliases: [ "虞颜" ],
    displayName: "虞颜",
    avatarUrl: "",
    tone: "purple"
  } ];
  const STYLE_TEXT = `\n.${SOURCE_HIDDEN_CLASS} {\n  display: none !important;\n}\n\n.DialogueBubble {\n  width: 100%;\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n  padding: 0.1rem 0 0.45rem;\n  animation: dialogue-bubble-enter 0.24s ease-out both;\n}\n\n.DialogueBubble__row {\n  display: flex;\n  align-items: flex-end;\n  gap: 1rem;\n  width: 100%;\n}\n\n.DialogueBubble__row.is-right {\n  flex-direction: row-reverse;\n}\n\n.DialogueBubble__avatar {\n  width: 4.2rem;\n  height: 4.2rem;\n  flex: 0 0 4.2rem;\n  border-radius: 999px;\n  display: grid;\n  place-items: center;\n  overflow: hidden;\n  font-size: 1rem;\n  font-weight: 700;\n  color: rgba(255, 255, 255, 0.96);\n  background:\n    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.42), transparent 38%),\n    linear-gradient(145deg, rgba(129, 116, 230, 0.95), rgba(92, 80, 194, 0.92));\n  box-shadow:\n    0 18px 38px rgba(12, 18, 32, 0.22),\n    inset 0 1px 1px rgba(255, 255, 255, 0.42);\n  border: 2px solid rgba(255, 255, 255, 0.72);\n}\n\n.DialogueBubble__avatar.is-shixia {\n  background:\n    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.42), transparent 38%),\n    linear-gradient(145deg, rgba(147, 210, 255, 0.95), rgba(107, 177, 245, 0.92));\n}\n\n.DialogueBubble__avatar.is-kurihara {\n  background:\n    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.44), transparent 38%),\n    linear-gradient(145deg, rgba(255, 228, 134, 0.95), rgba(244, 196, 82, 0.92));\n}\n\n.DialogueBubble__avatarImage {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n  display: block;\n}\n\n.DialogueBubble__avatarText {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 100%;\n  height: 100%;\n  padding: 0.45rem;\n  text-align: center;\n  line-height: 1.1;\n  font-size: 0.96rem;\n  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);\n}\n\n.DialogueBubble__main {\n  display: flex;\n  flex-direction: column;\n  gap: 0.38rem;\n  width: fit-content;\n  max-width: min(52%, 42rem);\n}\n\n.DialogueBubble__row.is-right .DialogueBubble__main {\n  align-items: flex-end;\n}\n\n.DialogueBubble__name {\n  font-size: 0.95rem;\n  font-weight: 700;\n  color: color-mix(in srgb, var(--SmartThemeBodyColor, #d7deea) 82%, white 18%);\n  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.16);\n  padding: 0 0.4rem;\n}\n\n.DialogueBubble__bubble {\n  position: relative;\n  border-radius: 1.7rem;\n  padding: 1rem 1.22rem;\n  color: #1d2736;\n  box-shadow:\n    0 18px 42px rgba(7, 12, 24, 0.16),\n    inset 0 1px 1px rgba(255, 255, 255, 0.62);\n  line-height: 1.78;\n  overflow-wrap: anywhere;\n  border: 1px solid rgba(255, 255, 255, 0.82);\n  min-width: min(20rem, 48vw);\n}\n\n.DialogueBubble__bubble::after {\n  content: '';\n  position: absolute;\n  bottom: 1.02rem;\n  width: 1rem;\n  height: 1rem;\n  border-radius: 0.2rem;\n  transform: rotate(45deg);\n  border-right: 1px solid rgba(255, 255, 255, 0.72);\n  border-bottom: 1px solid rgba(255, 255, 255, 0.72);\n}\n\n.DialogueBubble__bubble.is-left::after {\n  left: -0.42rem;\n}\n\n.DialogueBubble__bubble.is-right::after {\n  right: -0.42rem;\n}\n\n.DialogueBubble__bubble.tone-shixia {\n  background:\n    linear-gradient(145deg, rgba(214, 237, 255, 0.96), rgba(181, 220, 255, 0.94)),\n    linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));\n}\n\n.DialogueBubble__bubble.tone-shixia::after {\n  background: rgba(188, 223, 255, 0.96);\n}\n\n.DialogueBubble__bubble.tone-kurihara {\n  background:\n    linear-gradient(145deg, rgba(255, 241, 178, 0.97), rgba(255, 222, 120, 0.94)),\n    linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));\n}\n\n.DialogueBubble__bubble.tone-kurihara::after {\n  background: rgba(255, 228, 143, 0.96);\n}\n\n.DialogueBubble__bubble.tone-purple {\n  background:\n    linear-gradient(145deg, rgba(236, 223, 255, 0.97), rgba(215, 192, 255, 0.94)),\n    linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));\n}\n\n.DialogueBubble__bubble.tone-purple::after {\n  background: rgba(222, 203, 255, 0.96);\n}\n\n.DialogueBubble__bubbleContent {\n  font-size: 1.06rem;\n}\n\n.DialogueBubble__bubbleContent p,\n.DialogueBubble__bubbleContent blockquote,\n.DialogueBubble__bubbleContent ul,\n.DialogueBubble__bubbleContent ol,\n.DialogueBubble__bubbleContent pre {\n  margin: 0;\n}\n\n.DialogueBubble__bubbleContent p + p,\n.DialogueBubble__bubbleContent blockquote + p,\n.DialogueBubble__bubbleContent p + blockquote,\n.DialogueBubble__bubbleContent ul + p,\n.DialogueBubble__bubbleContent ol + p {\n  margin-top: 0.55rem;\n}\n\n.DialogueBubble__narration {\n  width: 100%;\n  animation: dialogue-bubble-enter 0.2s ease-out both;\n}\n\n.DialogueBubble__narrationContent {\n  width: 100%;\n  color: inherit;\n  text-align: left;\n  line-height: inherit;\n  font-style: normal;\n  text-shadow: none;\n}\n\n.DialogueBubble__narrationContent p,\n.DialogueBubble__narrationContent blockquote,\n.DialogueBubble__narrationContent ul,\n.DialogueBubble__narrationContent ol,\n.DialogueBubble__narrationContent pre {\n  margin: 0;\n}\n\n.DialogueBubble__narrationContent p + p,\n.DialogueBubble__narrationContent blockquote + p,\n.DialogueBubble__narrationContent p + blockquote,\n.DialogueBubble__narrationContent ul + p,\n.DialogueBubble__narrationContent ol + p {\n  margin-top: 0.55rem;\n}\n\n@keyframes dialogue-bubble-enter {\n  from {\n    opacity: 0;\n    transform: translateY(8px);\n  }\n\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n@media (max-width: 720px) {\n  .DialogueBubble__row {\n    gap: 0.75rem;\n  }\n\n  .DialogueBubble__avatar {\n    width: 3.35rem;\n    height: 3.35rem;\n    flex-basis: 3.35rem;\n  }\n\n  .DialogueBubble__main {\n    max-width: min(82%, 100%);\n  }\n\n  .DialogueBubble__bubble {\n    min-width: 0;\n    padding: 0.92rem 1.05rem;\n  }\n}\n`;
  function ensureStyle() {
    const selector = `head > style[script_id="${getScriptId()}"][${STYLE_ATTRIBUTE}="true"]`;
    if ($(selector).length > 0) {
      return;
    }
    $("<style>").attr("script_id", getScriptId()).attr(STYLE_ATTRIBUTE, "true").text(STYLE_TEXT).appendTo("head");
  }
  function removeStyle() {
    $(`head > style[script_id="${getScriptId()}"][${STYLE_ATTRIBUTE}="true"]`).remove();
  }
  function getUserName() {
    try {
      return String(SillyTavern.name1 || substitudeMacros("{{user}}") || "User").trim() || "User";
    } catch (_error) {
      return substitudeMacros("{{user}}").trim() || "User";
    }
  }
  function getCurrentCharacterName(messageName) {
    try {
      return String(messageName || SillyTavern.name2 || substitudeMacros("{{char}}") || "角色").trim() || "角色";
    } catch (_error) {
      return String(messageName || substitudeMacros("{{char}}") || "角色").trim() || "角色";
    }
  }
  function normalizeBool(value) {
    if (value === true) {
      return true;
    }
    if (typeof value === "number") {
      return value === 1;
    }
    if (typeof value === "string") {
      return [ "true", "1", "yes", "on" ].includes(value.trim().toLowerCase());
    }
    return false;
  }
  function normalizeSpeakerKey(value) {
    return value.replace(/[【】[\]（）()「」“”"'`<>《》]/g, "").replace(/\s+/g, "").trim().toLowerCase();
  }
  function normalizeOptionalText(value) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
  function findCustomSpeakerProfile(speakerName) {
    const normalizedSpeakerName = normalizeSpeakerKey(speakerName);
    if (!normalizedSpeakerName) {
      return null;
    }
    return CUSTOM_SPEAKER_PROFILES.find(profile => profile.aliases.some(alias => normalizeSpeakerKey(alias) === normalizedSpeakerName)) ?? null;
  }
  function findBooleanByKey(root, targetKey) {
    const visited = new Set;
    const stack = [ root ];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== "object") {
        continue;
      }
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      if (Array.isArray(current)) {
        current.forEach(item => stack.push(item));
        continue;
      }
      for (const [key, value] of Object.entries(current)) {
        if (key === targetKey && normalizeBool(value)) {
          return true;
        }
        stack.push(value);
      }
    }
    return false;
  }
  function getDialogueChoiceFlags() {
    const chatVariables = getVariables({
      type: "chat"
    });
    return {
      shixiaSelected: findBooleanByKey(chatVariables, "时夏"),
      kuriharaSelected: findBooleanByKey(chatVariables, "栗原")
    };
  }
  function extractUrlFromBackgroundImage(value) {
    if (!value || value === "none") {
      return null;
    }
    const matched = value.match(/url\((['"]?)(.+?)\1\)/);
    return matched?.[2] ?? null;
  }
  function resolveUserAvatarUrl() {
    const $userMessages = $('#chat > .mes[is_user="true"]');
    const $lastUserMessage = $userMessages.last();
    const roots = [ $lastUserMessage, $userMessages.first() ].filter($root => $root.length > 0);
    const selectors = [ ".avatar img", ".mesAvatar img", "img.avatar", "img" ];
    for (const $root of roots) {
      for (const selector of selectors) {
        const imageElement = $root.find(selector).get(0);
        const source = imageElement?.src?.trim();
        if (source) {
          return source;
        }
      }
      const avatarElement = $root.find(".avatar, .mesAvatar").get(0);
      const backgroundImage = avatarElement ? getComputedStyle(avatarElement).backgroundImage : null;
      const url = extractUrlFromBackgroundImage(backgroundImage);
      if (url) {
        return url;
      }
    }
    return null;
  }
  function toAvatarText(name) {
    const normalized = name.trim();
    if (!normalized) {
      return "?";
    }
    const glyphs = Array.from(normalized);
    return glyphs.slice(0, Math.min(glyphs.length, 3)).join("");
  }
  function createAppearance(bubble, flags, userAvatarUrl) {
    const customProfile = findCustomSpeakerProfile(bubble.speakerName);
    const displayName = customProfile?.displayName?.trim() || bubble.speakerName;
    const customAvatarUrl = normalizeOptionalText(customProfile?.avatarUrl);
    const customAvatarText = customProfile?.avatarText?.trim() || toAvatarText(displayName);
    const customTone = customProfile?.tone;
    switch (bubble.speakerCategory) {
     case "shixia":
      return {
        displayName,
        tone: customTone ?? "shixia",
        avatarUrl: customAvatarUrl ?? (flags.kuriharaSelected ? SHIXIA_SAD_AVATAR : SHIXIA_SMILE_AVATAR),
        avatarText: customProfile?.avatarText?.trim() || "时夏"
      };

     case "kurihara":
      return {
        displayName,
        tone: customTone ?? "kurihara",
        avatarUrl: customAvatarUrl ?? (flags.shixiaSelected ? KURIHARA_SAD_AVATAR : KURIHARA_SMILE_AVATAR),
        avatarText: customProfile?.avatarText?.trim() || "栗原"
      };

     case "user":
      return {
        displayName,
        tone: customTone ?? "purple",
        avatarUrl: customAvatarUrl ?? userAvatarUrl,
        avatarText: customAvatarText
      };

     default:
      return {
        displayName,
        tone: customTone ?? "purple",
        avatarUrl: customAvatarUrl,
        avatarText: customAvatarText
      };
    }
  }
  function getParagraphText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("br").forEach(lineBreak => {
      lineBreak.replaceWith(document.createTextNode("\n"));
    });
    return clone.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
  }
  function createBubbleContentHtml(messageId, content) {
    return formatAsDisplayedMessage(content.trim(), {
      message_id: messageId
    });
  }
  function createBubbleRow(messageId, bubble, appearance) {
    const row = document.createElement("div");
    row.className = `DialogueBubble__row ${bubble.side === "right" ? "is-right" : "is-left"}`;
    const avatar = document.createElement("div");
    avatar.className = `DialogueBubble__avatar is-${appearance.tone}`;
    if (appearance.avatarUrl) {
      const image = document.createElement("img");
      image.className = "DialogueBubble__avatarImage";
      image.src = appearance.avatarUrl;
      image.alt = bubble.speakerName;
      avatar.appendChild(image);
    } else {
      const text = document.createElement("span");
      text.className = "DialogueBubble__avatarText";
      text.textContent = appearance.avatarText;
      avatar.appendChild(text);
    }
    const main = document.createElement("div");
    main.className = "DialogueBubble__main";
    const name = document.createElement("div");
    name.className = "DialogueBubble__name";
    name.textContent = appearance.displayName;
    const bubbleElement = document.createElement("div");
    bubbleElement.className = `DialogueBubble__bubble ${bubble.side === "right" ? "is-right" : "is-left"} tone-${appearance.tone}`;
    const bubbleContent = document.createElement("div");
    bubbleContent.className = "DialogueBubble__bubbleContent";
    bubbleContent.innerHTML = createBubbleContentHtml(messageId, bubble.content);
    bubbleElement.appendChild(bubbleContent);
    main.append(name, bubbleElement);
    row.append(avatar, main);
    return row;
  }
  function cleanupMessage(messageId) {
    const $messageElement = $(`#chat > .mes[mesid='${messageId}']`);
    $messageElement.find(`[${RENDERED_ATTRIBUTE}="true"]`).remove();
    $messageElement.find(`[${SOURCE_ATTRIBUTE}="true"]`).each((_index, element) => {
      element.removeAttribute(SOURCE_ATTRIBUTE);
      element.classList.remove(SOURCE_HIDDEN_CLASS);
    });
  }
  function cleanupAllMessages() {
    $(MESSAGE_SELECTOR).each((_index, element) => {
      const messageId = Number($(element).attr("mesid") ?? "NaN");
      if (!Number.isNaN(messageId)) {
        cleanupMessage(messageId);
      }
    });
  }
  function isParagraphInSafeRange(paragraph, root) {
    const nearestBlockedAncestor = paragraph.parentElement?.closest(EXCLUDED_DIALOGUE_SELECTOR);
    if (nearestBlockedAncestor && root.contains(nearestBlockedAncestor)) {
      return false;
    }
    const blockedSelf = paragraph.matches(EXCLUDED_DIALOGUE_SELECTOR);
    if (blockedSelf) {
      return false;
    }
    return paragraph.closest(".mes_text") === root || root.contains(paragraph);
  }
  function collectCandidateParagraphs(root) {
    const directParagraphs = Array.from(root.children).filter(node => node instanceof HTMLParagraphElement && isParagraphInSafeRange(node, root));
    if (directParagraphs.length > 0) {
      return directParagraphs;
    }
    return Array.from(root.querySelectorAll("p")).filter(paragraph => isParagraphInSafeRange(paragraph, root));
  }
  function collectMarkupRoots(root) {
    const roots = Array.from(root.querySelectorAll(MARKUP_ROOT_SELECTOR)).filter(node => node instanceof HTMLElement);
    if (root.matches(MARKUP_ROOT_SELECTOR)) {
      return [ root, ...roots.filter(node => node !== root) ];
    }
    return roots;
  }
  function createRenderedBlock(messageId, parsed, flags, userAvatarUrl) {
    const rendered = document.createElement("div");
    rendered.setAttribute(RENDERED_ATTRIBUTE, "true");
    rendered.className = "DialogueBubble";
    parsed.segments.forEach(segment => {
      if (segment.type === "narration") {
        const narration = document.createElement("div");
        narration.className = "DialogueBubble__narration";
        const narrationContent = document.createElement("div");
        narrationContent.className = "DialogueBubble__narrationContent";
        narrationContent.innerHTML = segment.html;
        narration.appendChild(narrationContent);
        rendered.appendChild(narration);
        return;
      }
      const appearance = createAppearance(segment.bubble, flags, userAvatarUrl);
      rendered.appendChild(createBubbleRow(messageId, segment.bubble, appearance));
    });
    return rendered;
  }
  function renderMessage(messageId) {
    cleanupMessage(messageId);
    const message = getChatMessages(messageId)[0];
    if (!message) {
      return;
    }
    const $messageElement = $(`#chat > .mes[mesid='${messageId}']`);
    const messageElement = $messageElement.get(0);
    if (!messageElement || $messageElement.attr("is_system") === "true") {
      return;
    }
    const messageTextElement = retrieveDisplayedMessage(messageId).get(0) || $messageElement.find(".mes_text").get(0);
    if (!messageTextElement) {
      return;
    }
    const flags = getDialogueChoiceFlags();
    const userAvatarUrl = resolveUserAvatarUrl();
    const role = message.role ?? ($messageElement.attr("is_user") === "true" ? "user" : "assistant");
    const currentCharName = getCurrentCharacterName(message.name);
    const userName = getUserName();
    const markupRoots = collectMarkupRoots(messageTextElement);
    markupRoots.forEach(root => {
      const parsed = (0, _parser__WEBPACK_IMPORTED_MODULE_0__.parseDialogueMarkupRoot)({
        messageId,
        message: message.message ?? "",
        root,
        role,
        name: message.name ?? "",
        currentCharName,
        userName
      });
      if (parsed.kind === "none") {
        return;
      }
      root.setAttribute(SOURCE_ATTRIBUTE, "true");
      root.classList.add(SOURCE_HIDDEN_CLASS);
      root.insertAdjacentElement("afterend", createRenderedBlock(messageId, parsed, flags, userAvatarUrl));
    });
    const candidateParagraphs = collectCandidateParagraphs(messageTextElement);
    candidateParagraphs.forEach(paragraph => {
      const paragraphText = getParagraphText(paragraph);
      if (!paragraphText) {
        return;
      }
      const parsed = (0, _parser__WEBPACK_IMPORTED_MODULE_0__.parseDialogueParagraph)({
        messageId,
        message: message.message ?? "",
        paragraph: paragraphText,
        role,
        name: message.name ?? "",
        currentCharName,
        userName
      });
      if (parsed.kind === "none") {
        return;
      }
      paragraph.setAttribute(SOURCE_ATTRIBUTE, "true");
      paragraph.classList.add(SOURCE_HIDDEN_CLASS);
      paragraph.insertAdjacentElement("afterend", createRenderedBlock(messageId, parsed, flags, userAvatarUrl));
    });
  }
  function renderAllMessages() {
    cleanupAllMessages();
    $(MESSAGE_SELECTOR).each((_index, element) => {
      const messageId = Number($(element).attr("mesid") ?? "NaN");
      if (!Number.isNaN(messageId)) {
        renderMessage(messageId);
      }
    });
  }
  function renderLatestMessage() {
    const messageId = Number($("#chat").children(".mes.last_mes").attr("mesid") ?? "NaN");
    if (!Number.isNaN(messageId)) {
      renderMessage(messageId);
    }
  }
  function stopOnPagehide(stopList) {
    $(window).on("pagehide", () => {
      cleanupAllMessages();
      removeStyle();
      stopList.forEach(stop => stop());
    });
  }
  function init() {
    console.info("[对白气泡渲染] 开始挂载对白气泡渲染脚本");
    ensureStyle();
    renderAllMessages();
    setTimeout(errorCatched(renderAllMessages), 120);
    setTimeout(errorCatched(renderAllMessages), 480);
    const stopList = [];
    const scopedEventOn = (event, listener) => {
      stopList.push(eventOn(event, errorCatched(listener)).stop);
    };
    scopedEventOn(tavern_events.CHAT_CHANGED, () => setTimeout(errorCatched(renderAllMessages), 60));
    scopedEventOn(tavern_events.CHARACTER_MESSAGE_RENDERED, messageId => setTimeout(() => renderMessage(messageId), 30));
    scopedEventOn(tavern_events.MESSAGE_UPDATED, messageId => setTimeout(() => renderMessage(messageId), 30));
    scopedEventOn(tavern_events.MESSAGE_SWIPED, messageId => setTimeout(() => renderMessage(messageId), 30));
    scopedEventOn(tavern_events.MESSAGE_DELETED, () => setTimeout(errorCatched(renderAllMessages), 120));
    scopedEventOn(tavern_events.MESSAGE_SENT, () => setTimeout(errorCatched(renderLatestMessage), 50));
    scopedEventOn(tavern_events.MESSAGE_RECEIVED, () => setTimeout(errorCatched(renderLatestMessage), 50));
    scopedEventOn(tavern_events.STREAM_TOKEN_RECEIVED, () => renderLatestMessage());
    stopOnPagehide(stopList);
  }
  $(() => {
    errorCatched(init)();
  });
})();