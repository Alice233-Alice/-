() => {
    const hostDocument = window.document;
    const document = hostDocument.implementation.createHTMLDocument('正文提示检查');
    const NodeFilter = window.NodeFilter;
    const messageId = Number(Array.from(hostDocument.querySelectorAll('#chat .mes[mesid]')).at(-1)?.getAttribute('mesid') || 0);
    const formatAsDisplayedMessage = (text, options) => window.TavernHelper.formatAsDisplayedMessage(text, options);
    const typography = { exports: {} };
((exports) => { "use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segmentNarrativeDialogueText = void 0;
const DIALOGUE_QUOTE_PAIRS = [
    ['“', '”'],
    ['「', '」'],
    ['『', '』'],
];
const OPEN_TO_CLOSE = new Map(DIALOGUE_QUOTE_PAIRS);
const segmentNarrativeDialogueText = (text, quoteStack) => {
    const segments = [];
    const append = (character, dialogue) => {
        const previous = segments.at(-1);
        if (previous?.dialogue === dialogue) {
            previous.text += character;
            return;
        }
        segments.push({ text: character, dialogue });
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
exports.segmentNarrativeDialogueText = segmentNarrativeDialogueText;
 })(typography.exports);
const content = { exports: {} };
((exports, require) => { "use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasInlineReasoningPresetDisclosure = exports.isRichPresetHtml = exports.formatNarrativeHtml = exports.formatMessageHtml = exports.parseMessageContent = exports.extractDialogueContent = exports.extractNarrative = exports.stripStructuredBlocks = exports.summarizeVariableDiagnostics = exports.extractVariableUpdateDiagnostics = exports.stripAuxiliaryPresentation = exports.extractInlineReasoning = exports.mergeReasoningText = exports.extractBranchChoices = exports.formatReasoningHtml = exports.selectReasoningText = exports.sanitizeReasoningText = exports.hasReasoningFrontendBootstrap = void 0;
const narrative_typography_1 = require("./narrative-typography");
const PRIMARY_BODY_TAGS = [
    'content',
    '正文',
    'narrative',
    'story',
    'main_text',
    'text_output',
    'response',
    'answer',
    'final',
];
const CHOICE_BLOCK_TAGS = [
    'branches',
    'branch_options',
    'choices',
    'choice_list',
    'options',
    'option_list',
    'actions',
    'action_options',
    'select_options',
    '分支',
    '选项',
    '行动选项',
];
const STRUCTURAL_TAGS = [
    'visual_cards',
    ...CHOICE_BLOCK_TAGS,
    'aftertalk',
    'afterword',
    'twin_aftertalk',
    'ooc',
    'tucao',
    'current_event',
    'progress',
    'advice',
    'metadata',
    'meta_info',
    'memory',
    'state',
    'status',
    'status_block',
    'world_state',
    'pseudo_layer',
    'UpdateVariable',
    'update_variables',
    'variable_update',
    'state_update',
    'JSONPatch',
    'StatusPlaceHolderImpl',
    '反应',
    '会话状态',
];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const openTagPattern = (tag) => `<${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`;
const closeTagPattern = (tag) => `<\\/${escapeRegExp(tag)}\\s*>`;
// Keep offsets intact while excluding Markdown examples from structural tag searches.
const maskMarkdownCode = (text) => text.replace(/(`+)[\s\S]*?\1(?!`)/g, block => block.replace(/[^\r\n]/g, ' '));
const DIALOGUE_REACTION_TAGS = ['反应', 'reaction', 'emotion', 'stage_direction'];
const DIALOGUE_BODY_TAGS = ['正文', 'dialogue', 'reply', 'speech', 'response'];
const DIALOGUE_STATE_TAGS = ['会话状态', 'dialogue_state', 'conversation_state'];
const DIALOGUE_TAGS = [...DIALOGUE_REACTION_TAGS, ...DIALOGUE_BODY_TAGS, ...DIALOGUE_STATE_TAGS];
const REASONING_TAG_NAME_SOURCE = 'think(?:ing)?|planning|konatan_planning~?|reasoning|thought|reflection|inner[_-]?monologue|internal[_-]?monologue|chain[_-]?of[_-]?thought|scratchpad|cot|think_?fox~?|思考|思维链|推理';
const REASONING_OPEN_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>`, 'gi');
const REASONING_CLOSE_PATTERN = new RegExp(`<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>`, 'gi');
const REASONING_BLOCK_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>|$)`, 'gi');
const REASONING_CLOSED_BLOCK_PATTERN = new RegExp(`<(?:${REASONING_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>[\\s\\S]*?<\\/(?:${REASONING_TAG_NAME_SOURCE})\\s*>`, 'gi');
const BODY_TAG_NAME_SOURCE = PRIMARY_BODY_TAGS.map(escapeRegExp).join('|');
const STRUCTURAL_TAG_NAME_SOURCE = STRUCTURAL_TAGS.map(escapeRegExp).join('|');
const REASONING_FALLBACK_BOUNDARY = new RegExp(`<(?:${BODY_TAG_NAME_SOURCE}|${STRUCTURAL_TAG_NAME_SOURCE})(?=[\\s/>])`, 'i');
const REASONING_LABEL_SOURCE = 'subtext[\\s_-]*think|think(?:ing)?|reasoning|thoughts?|analysis|reflection|inner[\\s_-]*monologue|chain[\\s_-]*of[\\s_-]*thought|思考|思维链|推理|分析';
const REASONING_COMMENT_OPEN_PATTERN = new RegExp(`<!--\\s*(?:(?:begin|start)[\\s_-]*(?:of[\\s_-]*)?(?:${REASONING_LABEL_SOURCE})|(?:${REASONING_LABEL_SOURCE})[\\s_-]*(?:begin|start)|(?:${REASONING_LABEL_SOURCE}))\\s*-->`, 'gi');
const REASONING_COMMENT_CLOSE_PATTERN = new RegExp(`<!--\\s*(?:(?:end|stop)[\\s_-]*(?:of[\\s_-]*)?(?:${REASONING_LABEL_SOURCE})|(?:${REASONING_LABEL_SOURCE})[\\s_-]*(?:end|stop)|\\/\\s*(?:${REASONING_LABEL_SOURCE}))\\s*-->`, 'gi');
const REASONING_COMMENT_PATTERN = new RegExp(`(${REASONING_COMMENT_OPEN_PATTERN.source})([\\s\\S]*?)(${REASONING_COMMENT_CLOSE_PATTERN.source}|$)`, 'gi');
const REASONING_COMMENT_CLOSED_PATTERN = new RegExp(`${REASONING_COMMENT_OPEN_PATTERN.source}[\\s\\S]*?${REASONING_COMMENT_CLOSE_PATTERN.source}`, 'gi');
const REASONING_BRACKET_PATTERN = /^\s*((?:【|\[)\s*(?:思考|思维链|推理|分析|think(?:ing)?|reasoning|thoughts?|analysis)(?:开始|start)?\s*(?:】|\]))([\s\S]*?)((?:【|\[)\s*(?:思考|思维链|推理|分析|think(?:ing)?|reasoning|thoughts?|analysis)(?:结束|end)\s*(?:】|\])|$)/i;
const REASONING_FENCE_PATTERN = /```(?:think(?:ing)?|reasoning|thoughts?|analysis|reflection|思考|推理)\s*\r?\n([\s\S]*?)(```|$)/gi;
const REASONING_FENCE_CLOSED_PATTERN = /```(?:think(?:ing)?|reasoning|thoughts?|analysis|reflection|思考|推理)\s*\r?\n[\s\S]*?```/gi;
const REASONING_ANALYSIS_PREFIX_PATTERN = /^\s*(<analysis(?=[\s>])[^>]*>)([\s\S]*?)(<\/analysis\s*>|$)/i;
const REASONING_MARKER_PATTERN = new RegExp(`${REASONING_COMMENT_OPEN_PATTERN.source}|${REASONING_COMMENT_CLOSE_PATTERN.source}`, 'gi');
const REASONING_ORPHAN_PREFIX_CUE = new RegExp(`^\\s*(?:【开始思考】|\\[OS\\]|${REASONING_COMMENT_OPEN_PATTERN.source})`, 'i');
const REASONING_BODY_AFTER_CLOSE_PATTERN = new RegExp(`^\\s*(?:#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*)?${REASONING_FALLBACK_BOUNDARY.source}`, 'i');
// Some presets end an untagged reasoning prefix with a handoff sentence.
// Only accept it immediately before the real body (or at the live stream's end).
const findReasoningHandoff = (text) => {
    const searchable = maskMarkdownCode(text);
    const pattern = /您好[，,]\s*(?:这是约定的|这里是)稿件[，,]\s*请查收[：:]?/g;
    for (const match of searchable.matchAll(pattern)) {
        const end = match.index + match[0].length;
        const prefix = searchable.slice(0, match.index);
        const suffix = searchable.slice(end);
        if (new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])`, 'i').test(prefix))
            continue;
        if (!suffix.trim() || REASONING_BODY_AFTER_CLOSE_PATTERN.test(suffix)) {
            return { start: match.index, end };
        }
    }
    return null;
};
// Strip reasoning before Tavern display regexes can expand it into embedded UI markup.
const stripReasoningPrefix = (text) => {
    const handoff = findReasoningHandoff(text);
    if (handoff)
        return text.slice(handoff.end);
    let delimitedPrefixEnd = -1;
    REASONING_COMMENT_OPEN_PATTERN.lastIndex = 0;
    const commentOpening = REASONING_COMMENT_OPEN_PATTERN.exec(text);
    REASONING_COMMENT_OPEN_PATTERN.lastIndex = 0;
    if (commentOpening?.index !== undefined && !text.slice(0, commentOpening.index).trim()) {
        REASONING_COMMENT_CLOSE_PATTERN.lastIndex = commentOpening.index + commentOpening[0].length;
        const commentClosing = REASONING_COMMENT_CLOSE_PATTERN.exec(text);
        REASONING_COMMENT_CLOSE_PATTERN.lastIndex = 0;
        if (commentClosing)
            delimitedPrefixEnd = commentClosing.index + commentClosing[0].length;
    }
    const bracketPrefix = REASONING_BRACKET_PATTERN.exec(text);
    if (bracketPrefix?.[3])
        delimitedPrefixEnd = Math.max(delimitedPrefixEnd, bracketPrefix[0].length);
    REASONING_FENCE_PATTERN.lastIndex = 0;
    const fencePrefix = REASONING_FENCE_PATTERN.exec(text);
    REASONING_FENCE_PATTERN.lastIndex = 0;
    if (fencePrefix?.index !== undefined && !text.slice(0, fencePrefix.index).trim() && fencePrefix[2]) {
        delimitedPrefixEnd = Math.max(delimitedPrefixEnd, fencePrefix.index + fencePrefix[0].length);
    }
    const analysisPrefix = REASONING_ANALYSIS_PREFIX_PATTERN.exec(text);
    if (analysisPrefix?.[3])
        delimitedPrefixEnd = Math.max(delimitedPrefixEnd, analysisPrefix[0].length);
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
    const closingPrefixContainsBody = lastClosingStart >= 0 &&
        new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, 'im').test(maskMarkdownCode(closingPrefix));
    const closingActsAsPrefix = lastClosingEnd >= 0 &&
        (!closingPrefixContainsBody ||
            REASONING_ORPHAN_PREFIX_CUE.test(closingPrefix) ||
            REASONING_BODY_AFTER_CLOSE_PATTERN.test(closingSuffix));
    const completedPrefixEnd = Math.max(delimitedPrefixEnd, closingActsAsPrefix ? lastClosingEnd : -1);
    if (completedPrefixEnd >= 0)
        return text.slice(completedPrefixEnd);
    REASONING_OPEN_PATTERN.lastIndex = Math.max(0, lastClosingEnd);
    const unfinishedOpening = REASONING_OPEN_PATTERN.exec(text);
    REASONING_OPEN_PATTERN.lastIndex = 0;
    let opening = unfinishedOpening?.index === undefined ? null : { index: unfinishedOpening.index, marker: unfinishedOpening[0] };
    if (!opening && commentOpening?.index !== undefined && !text.slice(0, commentOpening.index).trim()) {
        opening = { index: commentOpening.index, marker: commentOpening[0] };
    }
    else if (!opening && bracketPrefix?.[1] && !bracketPrefix[3]) {
        opening = { index: 0, marker: bracketPrefix[1] };
    }
    else if (!opening && fencePrefix?.index !== undefined && !fencePrefix[2]) {
        opening = {
            index: fencePrefix.index,
            marker: fencePrefix[0].slice(0, fencePrefix[0].indexOf('\n') + 1),
        };
    }
    else if (!opening && analysisPrefix?.[1] && !analysisPrefix[3]) {
        opening = { index: 0, marker: analysisPrefix[1] };
    }
    if (!opening)
        return text;
    const remainder = text.slice(opening.index + opening.marker.length);
    const bodyBoundary = maskMarkdownCode(remainder).search(REASONING_FALLBACK_BOUNDARY);
    return bodyBoundary >= 0 ? remainder.slice(bodyBoundary) : text.slice(0, opening.index);
};
const findEmbeddedDocumentStart = (lowerText) => {
    const doctypeIndex = lowerText.indexOf('<!doctype html');
    const htmlIndex = lowerText.search(/<html(?=[\s>])/);
    if (doctypeIndex < 0)
        return htmlIndex;
    if (htmlIndex < 0)
        return doctypeIndex;
    return Math.min(doctypeIndex, htmlIndex);
};
const stripEmbeddedHtmlDocuments = (text) => {
    let result = text;
    for (let pass = 0; pass < 4; pass += 1) {
        const lowerText = result.toLowerCase();
        const documentStart = findEmbeddedDocumentStart(lowerText);
        if (documentStart < 0)
            break;
        const fencePrefix = result.slice(Math.max(0, documentStart - 16), documentStart);
        const fenceMatch = /```(?:html)?\s*$/i.exec(fencePrefix);
        const removeStart = fenceMatch
            ? documentStart - (fencePrefix.length - (fenceMatch.index ?? fencePrefix.length))
            : documentStart;
        const closingIndex = lowerText.indexOf('</html>', documentStart);
        if (closingIndex < 0)
            return result.slice(0, removeStart).trimEnd();
        let removeEnd = closingIndex + '</html>'.length;
        const trailingFence = /^\s*```/.exec(result.slice(removeEnd));
        if (trailingFence)
            removeEnd += trailingFence[0].length;
        result = `${result.slice(0, removeStart)}${result.slice(removeEnd)}`;
    }
    return result;
};
const REASONING_FRONTEND_BOOTSTRAP_PATTERN = /(?:\$\s*\(\s*['"]body['"]\s*\)\s*\.\s*load\s*\(|cdn\.jsdelivr\.net\/gh\/[^\s'"<>]+\/(?:灯火通明\/)?index\.html)/i;
const REASONING_PLACEHOLDER_LINE_PATTERN = /^\s*(?:\[\s*(?:story\s*text|narrative|正文|故事文本)\s*\]\s*)+\s*$/i;
const REASONING_SCAFFOLD_LINE_PATTERN = /^\s*(?:let(?:'|’)s\s+(?:write|produce|craft|compose|answer|respond|generate|begin|start)\b|(?:we|i)\s+(?:now\s+)?(?:need|should|must|will)\s+(?:to\s+)?(?:write|produce|craft|compose|answer|respond|output|generate)\b|need\s+to\s+(?:write|produce|craft|compose|answer|respond|output|generate)\b)/i;
const REASONING_CHINESE_SCAFFOLD_LINE_PATTERN = /^\s*(?:让我们|我们(?:现在)?需要|现在(?:让我们)?)\s*(?:开始)?(?:写作|生成|产出|回答|回复|输出|构思)/;
const hasReasoningFrontendBootstrap = (text) => REASONING_FRONTEND_BOOTSTRAP_PATTERN.test(text);
exports.hasReasoningFrontendBootstrap = hasReasoningFrontendBootstrap;
const stripReasoningFrontendBootstrap = (text) => {
    if (!(0, exports.hasReasoningFrontendBootstrap)(text))
        return text;
    let result = text.replace(/<body(?=[\s>])[^>]*>[\s\S]*?<\/body\s*>/gi, block => (0, exports.hasReasoningFrontendBootstrap)(block) ? '' : block);
    result = result.replace(/<script(?=[\s>])[^>]*>[\s\S]*?<\/script\s*>/gi, block => (0, exports.hasReasoningFrontendBootstrap)(block) ? '' : block);
    // Streaming may expose the loader before its closing tags arrive. In that
    // short window the whole unfinished bootstrap tail is presentation plumbing,
    // not reasoning that should be shown to the player.
    const unfinishedBody = result.search(/<body(?=[\s>])/i);
    if (unfinishedBody >= 0 && (0, exports.hasReasoningFrontendBootstrap)(result.slice(unfinishedBody))) {
        result = result.slice(0, unfinishedBody);
    }
    const unfinishedScript = result.search(/<script(?=[\s>])/i);
    if (unfinishedScript >= 0 && (0, exports.hasReasoningFrontendBootstrap)(result.slice(unfinishedScript))) {
        result = result.slice(0, unfinishedScript);
    }
    return result.replace(/<\/?body(?=[\s>])[^>]*>/gi, '');
};
const sanitizeReasoningText = (text) => {
    const withoutPresentation = stripReasoningFrontendBootstrap(stripEmbeddedHtmlDocuments(String(text ?? '')))
        .replace(REASONING_MARKER_PATTERN, '')
        .replace(REASONING_OPEN_PATTERN, '')
        .replace(REASONING_CLOSE_PATTERN, '')
        .replace(/\r\n?/g, '\n');
    return withoutPresentation
        .split('\n')
        .filter(line => !REASONING_PLACEHOLDER_LINE_PATTERN.test(line) &&
        !REASONING_SCAFFOLD_LINE_PATTERN.test(line) &&
        !REASONING_CHINESE_SCAFFOLD_LINE_PATTERN.test(line))
        .join('\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};
exports.sanitizeReasoningText = sanitizeReasoningText;
// Native SillyTavern reasoning is authoritative. Inline tags are only a
// compatibility fallback for presets that do not populate `extra.reasoning`.
const selectReasoningText = (nativeText, inlineFallback) => (0, exports.sanitizeReasoningText)(nativeText) || (0, exports.sanitizeReasoningText)(inlineFallback);
exports.selectReasoningText = selectReasoningText;
const escapeReasoningHtml = (text) => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
// Reasoning can contain prompt fragments or HTML-looking model output. Keep it
// text-only so a stray loader/script cannot execute through the Tavern formatter.
const formatReasoningHtml = (text) => {
    const value = (0, exports.sanitizeReasoningText)(text);
    if (!value)
        return '';
    return value
        .split(/\n{2,}/)
        .map(paragraph => `<p>${escapeReasoningHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
};
exports.formatReasoningHtml = formatReasoningHtml;
const CHOICE_TAG_NAME_SOURCE = CHOICE_BLOCK_TAGS.map(escapeRegExp).join('|');
const CHOICE_BLOCK_PATTERN = new RegExp(`<(${CHOICE_TAG_NAME_SOURCE})(?=[\\s>])[^>]*>([\\s\\S]*?)(?:<\\/\\1\\s*>|$)`, 'gi');
const CHOICE_DETAILS_PATTERN = /<details(?=[\s>])[^>]*>\s*<summary(?=[\s>])[^>]*>[\s\S]*?(?:select|choice|option|选择|选项|分支)[\s\S]*?<\/summary\s*>([\s\S]*?)(?:<\/details\s*>|$)/gi;
const CHOICE_SECTION_HEADING_PATTERN = /^(?:#{1,6}\s*)?(?:make\s+your\s+choice|choices?|options?|branches|选择|选项|分支|行动选项)\s*[:：]?\s*$/im;
const BRANCH_CHOICE_LINE_PATTERN = /^\s*(?:[-*•]\s*)?[（(【[]?\s*([A-Za-z]|\d{1,2}|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*[）)】\]]?\s*(?:[.．、,，:：—-]\s*|\s+)(.+?\S)\s*$/;
const BULLET_CHOICE_LINE_PATTERN = /^\s*[-*•]\s+(.+?\S)\s*$/;
const STATIC_CHOICE_ELEMENT_PATTERN = /<(button|option|li|a)(?=[\s>])([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const cleanChoiceText = (value) => value
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const normalizeChoiceKey = (value, fallbackIndex) => {
    const key = value.trim();
    if (/^[a-z]$/i.test(key))
        return key.toUpperCase();
    if (key)
        return key;
    return fallbackIndex < 26 ? String.fromCharCode(65 + fallbackIndex) : String(fallbackIndex + 1);
};
// Some presets render `<branches>` through a complete HTML iframe. Keep its
// generated choices as data instead: this preserves the action itself without
// moving host DOM or executing the preset's arbitrary iframe script.
const extractBranchChoices = (text) => {
    const blocks = [];
    CHOICE_BLOCK_PATTERN.lastIndex = 0;
    let match;
    while ((match = CHOICE_BLOCK_PATTERN.exec(text)) !== null) {
        blocks.push(match[2]);
        if (!new RegExp(`<\\/${escapeRegExp(match[1])}\\s*>`, 'i').test(match[0]))
            break;
    }
    CHOICE_BLOCK_PATTERN.lastIndex = 0;
    CHOICE_DETAILS_PATTERN.lastIndex = 0;
    while ((match = CHOICE_DETAILS_PATTERN.exec(text)) !== null)
        blocks.push(match[1]);
    CHOICE_DETAILS_PATTERN.lastIndex = 0;
    const heading = CHOICE_SECTION_HEADING_PATTERN.exec(text);
    if (heading?.index !== undefined) {
        const remainder = text.slice(heading.index + heading[0].length);
        const nextHeading = remainder.search(/^#{1,6}\s+\S+/m);
        blocks.push(remainder.slice(0, nextHeading >= 0 ? nextHeading : undefined));
    }
    if (!blocks.length)
        return [];
    const choices = [];
    const seenKeys = new Set();
    const seenTexts = new Set();
    const addChoice = (rawKey, rawText) => {
        const choiceText = cleanChoiceText(rawText);
        if (!choiceText || /^(?:select|make your choice|选择|选项)$/i.test(choiceText))
            return;
        const letter = normalizeChoiceKey(rawKey, choices.length);
        if (seenKeys.has(letter) || seenTexts.has(choiceText))
            return;
        seenKeys.add(letter);
        seenTexts.add(choiceText);
        choices.push({ letter, text: choiceText });
    };
    for (const block of blocks) {
        const jsonSource = block
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '');
        if (jsonSource.startsWith('[') || jsonSource.startsWith('{')) {
            try {
                const parsed = JSON.parse(jsonSource);
                const items = Array.isArray(parsed)
                    ? parsed
                    : parsed && typeof parsed === 'object'
                        ? Object.entries(parsed).map(([key, value]) => typeof value === 'object' && value !== null
                            ? { key, ...value }
                            : { key, text: value })
                        : [];
                items.forEach((item, index) => {
                    if (typeof item === 'string') {
                        addChoice('', item);
                        return;
                    }
                    if (!item || typeof item !== 'object')
                        return;
                    const record = item;
                    const label = String(record.label ?? '').trim();
                    const labelIsKey = /^[A-Za-z]$|^\d{1,2}$|^[①②③④⑤⑥⑦⑧⑨⑩]$/.test(label);
                    addChoice(String(record.letter ?? record.key ?? record.id ?? (labelIsKey ? label : index + 1)), String(record.text ??
                        record.content ??
                        record.prompt ??
                        record.value ??
                        record.title ??
                        (labelIsKey ? '' : label)));
                });
            }
            catch {
                // Non-JSON blocks continue through the markup/line parser below.
            }
        }
        STATIC_CHOICE_ELEMENT_PATTERN.lastIndex = 0;
        while ((match = STATIC_CHOICE_ELEMENT_PATTERN.exec(block)) !== null) {
            const key = /(?:data-(?:choice|option|key|id)|value)\s*=\s*["']?([^"'\s>]+)/i.exec(match[2])?.[1] ?? '';
            const elementText = cleanChoiceText(match[3]);
            const labelledElement = BRANCH_CHOICE_LINE_PATTERN.exec(elementText);
            if (labelledElement)
                addChoice(key || labelledElement[1], labelledElement[2]);
            else
                addChoice(key, elementText);
        }
        STATIC_CHOICE_ELEMENT_PATTERN.lastIndex = 0;
        const lines = block
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<\/?(?:details|summary|p|div|li|button|option|a)[^>]*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .split(/\r?\n/);
        for (const line of lines) {
            const choice = BRANCH_CHOICE_LINE_PATTERN.exec(line);
            if (choice) {
                addChoice(choice[1], choice[2]);
                continue;
            }
            const bulletChoice = BULLET_CHOICE_LINE_PATTERN.exec(line);
            if (bulletChoice)
                addChoice('', bulletChoice[1]);
        }
    }
    return choices;
};
exports.extractBranchChoices = extractBranchChoices;
const extractOrphanClosingReasoning = (text) => {
    REASONING_CLOSE_PATTERN.lastIndex = 0;
    const closingMatch = REASONING_CLOSE_PATTERN.exec(text);
    REASONING_CLOSE_PATTERN.lastIndex = 0;
    if (!closingMatch || closingMatch.index <= 0)
        return null;
    const prefix = text.slice(0, closingMatch.index);
    const suffix = text.slice(closingMatch.index + closingMatch[0].length);
    const prefixAlreadyContainsBody = new RegExp(`<(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])|^#{1,6}\\s*(?:正文|content|narrative|story|response|answer|final)\\s*$`, 'im').test(maskMarkdownCode(prefix));
    if (!REASONING_ORPHAN_PREFIX_CUE.test(prefix) &&
        !REASONING_BODY_AFTER_CLOSE_PATTERN.test(suffix) &&
        prefixAlreadyContainsBody) {
        return null;
    }
    const cleaned = (0, exports.sanitizeReasoningText)(prefix.replace(REASONING_ORPHAN_PREFIX_CUE, ''));
    return cleaned
        ? {
            text: cleaned,
            source: `${prefix}${closingMatch[0]}`.trim(),
            isComplete: true,
        }
        : null;
};
const mergeReasoningText = (primary, secondary) => {
    return (0, exports.selectReasoningText)(primary, secondary);
};
exports.mergeReasoningText = mergeReasoningText;
// Some presets keep their visible thought trace inside the assistant message
// instead of SillyTavern's `extra.reasoning`. Read the raw tag content here so
// the pseudo layer can render it without running the preset's embedded UI.
const extractInlineReasoning = (text) => {
    const handoff = findReasoningHandoff(text);
    if (handoff && text.slice(0, handoff.start).trim()) {
        return {
            text: (0, exports.sanitizeReasoningText)(text.slice(0, handoff.start)),
            source: text.slice(0, handoff.end).trim(),
            isComplete: true,
        };
    }
    const fragments = [];
    const addFragment = (fragment) => {
        if (!fragment.text)
            return;
        if (fragments.some(current => current.start <= fragment.start && current.end >= fragment.end))
            return;
        for (let index = fragments.length - 1; index >= 0; index -= 1) {
            const current = fragments[index];
            if (fragment.start <= current.start && fragment.end >= current.end)
                fragments.splice(index, 1);
        }
        fragments.push(fragment);
    };
    const cleanReasoningText = (value) => (0, exports.sanitizeReasoningText)(value);
    REASONING_BLOCK_PATTERN.lastIndex = 0;
    let match;
    while ((match = REASONING_BLOCK_PATTERN.exec(text)) !== null) {
        const closingTag = match[2];
        let content = match[1];
        if (!closingTag) {
            const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
            if (boundary >= 0)
                content = content.slice(0, boundary);
        }
        addFragment({
            text: cleanReasoningText(content),
            source: match[0].trim(),
            isComplete: Boolean(closingTag),
            start: match.index,
            end: match.index + match[0].length,
        });
        if (!closingTag)
            break;
    }
    REASONING_BLOCK_PATTERN.lastIndex = 0;
    REASONING_COMMENT_PATTERN.lastIndex = 0;
    while ((match = REASONING_COMMENT_PATTERN.exec(text)) !== null) {
        const closingMarker = match[3];
        let content = match[2];
        if (!closingMarker) {
            const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
            if (boundary >= 0)
                content = content.slice(0, boundary);
        }
        let end = match.index + match[0].length;
        const trailingReasoningClose = /^\s*<\/(?:think(?:ing)?|reasoning|thought)\s*>/i.exec(text.slice(end));
        if (trailingReasoningClose)
            end += trailingReasoningClose[0].length;
        addFragment({
            text: cleanReasoningText(content),
            source: text.slice(match.index, end).trim(),
            isComplete: Boolean(closingMarker),
            start: match.index,
            end,
        });
        if (!closingMarker)
            break;
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
            end: bracketMatch.index + bracketMatch[0].length,
        });
    }
    REASONING_FENCE_PATTERN.lastIndex = 0;
    while ((match = REASONING_FENCE_PATTERN.exec(text)) !== null) {
        let content = match[1];
        if (!match[2]) {
            const boundary = maskMarkdownCode(content).search(REASONING_FALLBACK_BOUNDARY);
            if (boundary >= 0)
                content = content.slice(0, boundary);
        }
        addFragment({
            text: cleanReasoningText(content),
            source: match[0].trim(),
            isComplete: Boolean(match[2]),
            start: match.index,
            end: match.index + match[0].length,
        });
        if (!match[2])
            break;
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
            end: analysisMatch.index + analysisMatch[0].length,
        });
    }
    if (!fragments.length)
        return extractOrphanClosingReasoning(text);
    fragments.sort((left, right) => left.start - right.start);
    return {
        text: fragments
            .map(fragment => fragment.text)
            .join('\n\n')
            .trim(),
        source: fragments
            .map(fragment => fragment.source)
            .join('\n\n')
            .trim(),
        isComplete: fragments.every(fragment => fragment.isComplete),
    };
};
exports.extractInlineReasoning = extractInlineReasoning;
const stripAuxiliaryPresentation = (text) => stripEmbeddedHtmlDocuments(stripReasoningPrefix(text)
    .replace(REASONING_CLOSED_BLOCK_PATTERN, '')
    .replace(REASONING_COMMENT_CLOSED_PATTERN, '')
    .replace(REASONING_FENCE_CLOSED_PATTERN, '')
    .replace(REASONING_CLOSE_PATTERN, '')).trim();
exports.stripAuxiliaryPresentation = stripAuxiliaryPresentation;
const stripDialogueTagFragments = (text) => DIALOGUE_TAGS.reduce((value, tag) => value.replace(new RegExp(`<\\/?${escapeRegExp(tag)}(?=[\\s/>])[^>]*>`, 'gi'), ''), text)
    .replace(/<[^>]*$/g, '')
    .trim();
const readBoundedTaggedContent = (text, tag, stopTags, preferLast = false) => {
    const searchable = maskMarkdownCode(text);
    const matches = [...searchable.matchAll(new RegExp(openTagPattern(tag), 'gi'))];
    const match = preferLast ? matches.at(-1) : matches[0];
    if (!match || match.index === undefined)
        return '';
    const start = match.index + match[0].length;
    const remainder = text.slice(start);
    const searchableRemainder = searchable.slice(start);
    const boundaries = [
        searchableRemainder.search(new RegExp(closeTagPattern(tag), 'i')),
        ...stopTags.map(stopTag => searchableRemainder.search(new RegExp(openTagPattern(stopTag), 'i'))),
    ].filter(index => index >= 0);
    const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
    return stripDialogueTagFragments(remainder.slice(0, end));
};
const readFirstTaggedContent = (text, tags, stopTags, preferLast = false) => {
    for (const tag of tags) {
        if (!new RegExp(openTagPattern(tag), 'i').test(maskMarkdownCode(text)))
            continue;
        return {
            found: true,
            tag,
            content: readBoundedTaggedContent(text, tag, stopTags, preferLast),
        };
    }
    return { found: false, tag: '', content: '' };
};
const readNarrativeHeadingContent = (text) => {
    const heading = /^(?:#{1,6}\s*(?:正文|content|narrative|story|response|answer|final)|【(?:正文|内容|叙事|回复)】|\[(?:content|narrative|story|response|answer|final)\])\s*[:：]?\s*$/im.exec(text);
    if (!heading || heading.index === undefined)
        return '';
    const remainder = text.slice(heading.index + heading[0].length);
    const nextSection = remainder.search(/^(?:#{1,6}\s*)?(?:make\s+your\s+choice|choices?|options?|branches|选择|选项|分支|行动选项|aftertalk|afterword|状态|变量更新)\s*[:：]?\s*$/im);
    const structuralBoundary = remainder.search(new RegExp(`<(?:${STRUCTURAL_TAG_NAME_SOURCE})(?=[\\s/>])`, 'i'));
    const boundaries = [nextSection, structuralBoundary].filter(index => index >= 0);
    return remainder.slice(0, boundaries.length ? Math.min(...boundaries) : undefined).trim();
};
const unwrapDialogueQuotes = (text) => {
    const pairs = [
        ['“', '”'],
        ['「', '」'],
        ['『', '』'],
        ['"', '"'],
        ["'", "'"],
    ];
    let value = text.trim();
    for (let pass = 0; pass < 3; pass += 1) {
        const pair = pairs.find(([open, close]) => value.startsWith(open) && value.endsWith(close));
        if (!pair || value.length <= pair[0].length + pair[1].length)
            break;
        value = value.slice(pair[0].length, -pair[1].length).trim();
    }
    return value;
};
const readLooseTaggedContent = (text, tag, stopTags = []) => {
    const openMatch = new RegExp(openTagPattern(tag), 'i').exec(text);
    if (!openMatch || openMatch.index === undefined) {
        return { content: '', isClosed: false };
    }
    const start = openMatch.index + openMatch[0].length;
    const remainder = text.slice(start);
    const closeIndex = remainder.search(new RegExp(closeTagPattern(tag), 'i'));
    const stopIndexes = stopTags
        .map(stopTag => remainder.search(new RegExp(openTagPattern(stopTag), 'i')))
        .filter(index => index >= 0);
    const boundaries = [closeIndex, ...stopIndexes].filter(index => index >= 0);
    const end = boundaries.length > 0 ? Math.min(...boundaries) : remainder.length;
    return {
        content: remainder.slice(0, end).trim(),
        isClosed: closeIndex >= 0 && closeIndex === end,
    };
};
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const extractVariableUpdateDiagnostics = (text) => {
    const updateOpen = /<(update(?:[_-]?variables?)?|variable[_-]?update|state[_-]?update)(?=[\s/>])[^>]*>/i.exec(text);
    if (!updateOpen || updateOpen.index === undefined)
        return null;
    const updateStart = updateOpen.index + updateOpen[0].length;
    const updateRemainder = text.slice(updateStart);
    const updateCloseIndex = updateRemainder.search(new RegExp(`<\\/${escapeRegExp(updateOpen[1])}\\s*>`, 'i'));
    const updateBody = updateRemainder.slice(0, updateCloseIndex >= 0 ? updateCloseIndex : undefined);
    // MVU 将格式化输出的 analysis 转成 <Analyze>，普通消息常用 <Analysis>。
    const analysisTag = /<(Analysis|Analyze|reasoning|summary)(?=[\s/>])/i.exec(updateBody)?.[1] ?? '';
    const patchTag = /<(JSONPatch|json_patch|patch)(?=[\s/>])/i.exec(updateBody)?.[1] ?? '';
    if (!analysisTag && !patchTag)
        return null;
    const analysisBlock = analysisTag
        ? readLooseTaggedContent(updateBody, analysisTag, patchTag ? [patchTag] : [])
        : { content: '', isClosed: false };
    const patchBlock = patchTag ? readLooseTaggedContent(updateBody, patchTag) : { content: '', isClosed: false };
    const isComplete = updateCloseIndex >= 0;
    const result = {
        analysis: analysisBlock.content,
        operations: [],
        rawPatch: patchBlock.content,
        isComplete,
        parseError: '',
    };
    if (!patchBlock.content) {
        if (isComplete || updateCloseIndex >= 0)
            result.parseError = '未找到 JSONPatch 更新清单';
        return result;
    }
    try {
        const parsed = JSON.parse(patchBlock.content);
        if (!Array.isArray(parsed)) {
            result.parseError = 'JSONPatch 应为数组';
            return result;
        }
        const invalidCount = parsed.filter(item => !isRecord(item)).length;
        result.operations = parsed.filter(isRecord).map(item => ({
            ...item,
            op: String(item.op ?? '').trim(),
            path: String(item.path ?? '').trim(),
        }));
        if (invalidCount > 0) {
            result.parseError = `有 ${invalidCount} 项不是有效的补丁对象`;
        }
    }
    catch (error) {
        if (isComplete) {
            result.parseError = error instanceof Error ? `JSONPatch 解析失败：${error.message}` : 'JSONPatch 解析失败';
        }
    }
    return result;
};
exports.extractVariableUpdateDiagnostics = extractVariableUpdateDiagnostics;
const summarizeVariableDiagnostics = (diagnostics, maxPills = 3) => {
    if (!diagnostics || !diagnostics.operations.length)
        return [];
    const decodeSeg = (seg) => seg.replace(/~1/g, '/').replace(/~0/g, '~');
    const formatDelta = (val) => {
        const num = Number(val);
        if (!Number.isFinite(num))
            return String(val ?? '');
        return `${num >= 0 ? '+' : ''}${num}`;
    };
    const scored = [];
    for (const operation of diagnostics.operations) {
        const op = String(operation.op ?? '')
            .trim()
            .toLowerCase();
        const segments = String(operation.path ?? '')
            .replaceAll('／', '/')
            .split('/')
            .filter(Boolean)
            .map(decodeSeg);
        if (!segments.length || segments.some(seg => seg.startsWith('_')))
            continue;
        const [root, sub, third] = segments;
        const val = operation.value;
        if (root === '本尊' && sub === '修为') {
            scored.push({
                score: 100,
                label: op === 'delta' ? `修为 ${formatDelta(val)}` : `修为 ${String(val ?? '')}`,
            });
            continue;
        }
        if (root === '本尊' && sub === '等级') {
            scored.push({
                score: 98,
                label: op === 'delta' ? `境界 ${formatDelta(val)}` : `境界 Lv.${String(val ?? '')}`,
            });
            continue;
        }
        if (root === '红颜' && sub && third === '好感度') {
            scored.push({
                score: 95,
                label: `${sub}好感 ${op === 'delta' ? formatDelta(val) : String(val ?? '')}`,
            });
            continue;
        }
        if (root === '红颜' && sub && third === '关系' && typeof val === 'string' && val.trim()) {
            scored.push({ score: 90, label: `${sub}·${val.trim().slice(0, 6)}` });
            continue;
        }
        if ((root === '本尊' && sub === '灵石') || (root === '红颜' && third === '灵石')) {
            const prefix = root === '红颜' ? `${sub}·` : '';
            const grade = segments[root === '红颜' ? 3 : 2];
            if (val && typeof val === 'object' && !Array.isArray(val)) {
                for (const [name, amount] of Object.entries(val)) {
                    if (/^(下品|中品|上品|极品)灵石$/u.test(name)) {
                        scored.push({ score: 88, label: `${prefix}${name} ${String(amount ?? 0)}` });
                    }
                }
            }
            else {
                const name = /^(下品|中品|上品|极品)灵石$/u.test(grade ?? '') ? grade : '下品灵石';
                scored.push({
                    score: 88,
                    label: `${prefix}${name} ${op === 'delta' ? formatDelta(val) : op === 'remove' ? '0' : String(val ?? '')}`,
                });
            }
            continue;
        }
        if (root === '本尊' && sub === '行踪' && third === '当前区域' && typeof val === 'string' && val.trim()) {
            scored.push({ score: 85, label: `行至·${val.trim().slice(0, 8)}` });
            continue;
        }
        if (root === '本尊' && (sub === '法宝' || sub === '背包' || sub === '神通列表') && third) {
            const actionWord = op === 'remove' ? '失去' : sub === '神通列表' ? '神通' : '所得';
            scored.push({ score: 82, label: `${actionWord}·${third.slice(0, 8)}` });
            continue;
        }
        if (root === '本尊' && sub === '战斗状态' && third === '负荷' && segments[3] && typeof val === 'string') {
            scored.push({ score: 78, label: `${segments[3]}·${val.trim().slice(0, 4)}` });
            continue;
        }
        if (root === '任务列表' && sub) {
            const cleanTask = sub.replace(/^(?:[A-Za-z0-9_.-]+)_?/u, '').trim() || '任务';
            scored.push({ score: 75, label: `任务·${cleanTask.slice(0, 7)}` });
            continue;
        }
        if (root === '世界时钟' && sub === '时辰' && typeof val === 'string' && val.trim()) {
            scored.push({ score: 65, label: `时辰·${val.trim().slice(0, 6)}` });
            continue;
        }
        if (root === '$可参与机遇' || root === '当前处境')
            continue;
        const leaf = segments.at(-1) ?? root;
        if (op === 'delta' && Number.isFinite(Number(val))) {
            scored.push({ score: 60, label: `${leaf} ${formatDelta(val)}` });
        }
        else if (typeof val === 'string' && val.trim().length > 0 && val.trim().length <= 8) {
            scored.push({ score: 55, label: `${leaf}·${val.trim()}` });
        }
    }
    scored.sort((a, b) => b.score - a.score);
    const unique = [];
    for (const item of scored) {
        if (!item.label || unique.includes(item.label))
            continue;
        unique.push(item.label);
        if (unique.length >= maxPills)
            break;
    }
    return unique;
};
exports.summarizeVariableDiagnostics = summarizeVariableDiagnostics;
const stripStructuredBlocks = (text) => {
    let result = stripEmbeddedHtmlDocuments(text);
    STRUCTURAL_TAGS.forEach(tag => {
        const open = openTagPattern(tag);
        const close = closeTagPattern(tag);
        result = result
            .replace(new RegExp(`${open}[\\s\\S]*?${close}`, 'gi'), '')
            .replace(new RegExp(`${open}[\\s\\S]*$`, 'gi'), '')
            .replace(new RegExp(`<${escapeRegExp(tag)}(?=[\\s/>])[^>]*/>`, 'gi'), '');
    });
    result = result.replace(CHOICE_DETAILS_PATTERN, '');
    const choiceHeading = CHOICE_SECTION_HEADING_PATTERN.exec(result);
    if (choiceHeading?.index !== undefined)
        result = result.slice(0, choiceHeading.index);
    return result
        .replace(/<(script|iframe|object)(?=[\s>])[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
        .replace(/<embed(?=[\s/>])[^>]*\/?>/gi, '')
        .trim();
};
exports.stripStructuredBlocks = stripStructuredBlocks;
const extractNarrative = (text) => {
    const source = (0, exports.stripAuxiliaryPresentation)(text);
    const taggedBody = readFirstTaggedContent(source, PRIMARY_BODY_TAGS, STRUCTURAL_TAGS);
    const headingBody = taggedBody.found ? '' : readNarrativeHeadingContent(source);
    const body = taggedBody.found ? taggedBody.content : headingBody || source;
    return (0, exports.stripStructuredBlocks)(body)
        .replace(new RegExp(`<\\/?(?:${BODY_TAG_NAME_SOURCE})(?=[\\s/>])[^>]*>`, 'gi'), '')
        .trim();
};
exports.extractNarrative = extractNarrative;
const extractDialogueContent = (text) => {
    const source = (0, exports.stripAuxiliaryPresentation)(text);
    const reactionBlock = readFirstTaggedContent(source, DIALOGUE_REACTION_TAGS, [
        ...DIALOGUE_BODY_TAGS,
        ...DIALOGUE_STATE_TAGS,
    ]);
    const dialogueBlock = readFirstTaggedContent(source, DIALOGUE_BODY_TAGS, [...DIALOGUE_REACTION_TAGS, ...DIALOGUE_STATE_TAGS], true);
    const reaction = reactionBlock.found ? (0, exports.stripStructuredBlocks)(reactionBlock.content) : '';
    const dialogue = dialogueBlock.found ? dialogueBlock.content : reactionBlock.found ? '' : (0, exports.extractNarrative)(source);
    return {
        reaction: stripDialogueTagFragments(reaction),
        dialogue: unwrapDialogueQuotes(stripDialogueTagFragments((0, exports.stripStructuredBlocks)(dialogue))),
    };
};
exports.extractDialogueContent = extractDialogueContent;
const parsedMessageCache = new Map();
const PARSED_MESSAGE_CACHE_LIMIT = 24;
// All pseudo-layer surfaces consume the same semantic result. The small LRU-like
// cache also avoids rescanning a long message once for prose, thought and choices.
const parseMessageContent = (text) => {
    const cached = parsedMessageCache.get(text);
    if (cached) {
        parsedMessageCache.delete(text);
        parsedMessageCache.set(text, cached);
        return cached;
    }
    const parsed = {
        reasoning: (0, exports.extractInlineReasoning)(text),
        narrative: (0, exports.extractNarrative)(text),
        choices: (0, exports.extractBranchChoices)(text),
        dialogue: (0, exports.extractDialogueContent)(text),
    };
    parsedMessageCache.set(text, parsed);
    if (parsedMessageCache.size > PARSED_MESSAGE_CACHE_LIMIT) {
        const oldest = parsedMessageCache.keys().next().value;
        if (typeof oldest === 'string')
            parsedMessageCache.delete(oldest);
    }
    return parsed;
};
exports.parseMessageContent = parseMessageContent;
const formatMessageHtml = (text, messageId) => {
    const value = text.trim();
    if (!value)
        return '';
    try {
        return formatAsDisplayedMessage(value, { message_id: messageId });
    }
    catch (error) {
        console.warn('[灯火阑珊·伪同层] 消息格式化失败', error);
        return $('<div>').text(value).html().replace(/\n/g, '<br>');
    }
};
exports.formatMessageHtml = formatMessageHtml;
const STORY_DIALOGUE_CLASS = 'dhl-story-dialogue';
const STORY_NOTICE_CLASS = 'dhl-story-notice';
const STORY_DIALOGUE_SKIP_SELECTOR = [
    'code',
    'pre',
    'script',
    'style',
    'textarea',
    'kbd',
    'samp',
    'button',
    'select',
    'option',
    `.${STORY_DIALOGUE_CLASS}`,
    `.${STORY_NOTICE_CLASS}`,
].join(', ');
const decorateNarrativeDialogueHtml = (html) => {
    if (!html || typeof document === 'undefined')
        return html;
    const template = document.createElement('template');
    template.innerHTML = html;
    const quoteStack = [];
    const textNodes = [];
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement?.closest(STORY_DIALOGUE_SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }
    textNodes.forEach(textNode => {
        const segments = (0, narrative_typography_1.segmentNarrativeDialogueText)(textNode.data, quoteStack);
        if (!segments.some(segment => segment.dialogue))
            return;
        const replacement = document.createDocumentFragment();
        segments.forEach(segment => {
            if (!segment.dialogue) {
                replacement.append(document.createTextNode(segment.text));
                return;
            }
            const dialogue = document.createElement('span');
            dialogue.className = STORY_DIALOGUE_CLASS;
            dialogue.textContent = segment.text;
            replacement.append(dialogue);
        });
        textNode.replaceWith(replacement);
    });
    return template.innerHTML;
};
const decorateNarrativeNoticesHtml = (html) => {
    if (!html || typeof document === 'undefined')
        return html;
    const template = document.createElement('template');
    template.innerHTML = html;
    let changed = false;
    template.content.querySelectorAll('p').forEach(paragraph => {
        // 只接管独立的纯文本提示，引用、代码及富内容继续由原有阅读器呈现。
        if (paragraph.closest(`blockquote, q, pre, code, .${STORY_NOTICE_CLASS}`) ||
            paragraph.querySelector('code, pre, br, a, button, input, select, textarea, img, iframe, script, style')) {
            return;
        }
        const match = paragraph.textContent?.trim().match(/^【(新线索|任务进展)[：:]\s*([^【】\r\n]+?)\s*】$/u);
        if (!match || !match[2].trim())
            return;
        // 对话着色已保留跨段引语状态，首个文字所在的位置可判定本段是否仍在人物发言中。
        const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
            acceptNode: node => (node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
        });
        const firstText = walker.nextNode();
        if (firstText?.parentElement?.closest(`.${STORY_DIALOGUE_CLASS}, q`))
            return;
        const notice = document.createElement('aside');
        notice.className = STORY_NOTICE_CLASS;
        notice.dataset.kind = match[1] === '新线索' ? 'clue' : 'progress';
        notice.setAttribute('role', 'note');
        notice.setAttribute('aria-label', match[1]);
        const heading = document.createElement('div');
        heading.className = `${STORY_NOTICE_CLASS}__heading`;
        const mark = document.createElement('span');
        mark.className = `${STORY_NOTICE_CLASS}__mark`;
        mark.setAttribute('aria-hidden', 'true');
        mark.textContent = match[1] === '新线索' ? '✦' : '◇';
        const label = document.createElement('span');
        label.textContent = match[1];
        heading.append(mark, label);
        const body = document.createElement('div');
        body.className = `${STORY_NOTICE_CLASS}__body`;
        body.textContent = match[2].trim();
        notice.append(heading, body);
        paragraph.replaceWith(notice);
        changed = true;
    });
    return changed ? template.innerHTML : html;
};
const formatNarrativeHtml = (text, messageId) => decorateNarrativeNoticesHtml(decorateNarrativeDialogueHtml((0, exports.formatMessageHtml)(text, messageId)));
exports.formatNarrativeHtml = formatNarrativeHtml;
const BASIC_FORMAT_CLASS_PATTERN = /^(?:custom-html|custom-language-html|language-\S+|hljs(?:-\S+)?|markdown|md|code|prettyprint|spoiler)$/i;
const isRichPresetHtml = (html) => {
    if (!html.trim())
        return false;
    const template = document.createElement('template');
    template.innerHTML = html;
    if (template.content.querySelector('style, details, summary, button, svg, img, picture, canvas, audio, video, table, iframe, [style]')) {
        return true;
    }
    return [...template.content.querySelectorAll('[class]')].some(element => [...element.classList].some(className => !BASIC_FORMAT_CLASS_PATTERN.test(className)));
};
exports.isRichPresetHtml = isRichPresetHtml;
// A preset that brings its own <details> is already a complete thought-chain
// entrance. Callers can render it directly instead of placing a second
// pseudo-layer disclosure around it.
const hasInlineReasoningPresetDisclosure = (rawMessage, messageId) => {
    const inline = (0, exports.extractInlineReasoning)(rawMessage);
    if (!inline?.source || !inline.isComplete)
        return false;
    const template = document.createElement('template');
    template.innerHTML = (0, exports.formatMessageHtml)(inline.source, messageId);
    return Boolean(template.content.querySelector('details > summary'));
};
exports.hasInlineReasoningPresetDisclosure = hasInlineReasoningPresetDisclosure;
 })(content.exports, () => typography.exports);
    const samples = [{"name":"日常相处","count":0,"message":"雨声渐疏，她将温好的茶推近些。\n\n“今日山路湿滑，晚些再走也好。”\n\n窗外竹叶垂着水珠，案上的旧书又翻过一页。"},{"name":"新线索","count":1,"message":"掌柜将药盒逐一摆开。同批入库的枯荣丹，封口却分朱、青两色。问及缘由，他翻过两页账簿，指尖停了下来。\n\n【新线索：同批枯荣丹出现两种封蜡，进货来源值得分别核实。】\n\n案边还压着半张货单，纸角留有未干透的青色蜡痕。"},{"name":"阶段进展","count":1,"message":"两名证人分别说完当夜经过，时辰、车马与停靠的铺面皆能相互印证。\n\n【任务进展：两份证词已核对一致，商队账目成为目前尚缺的一环。】\n\n掌柜收好笔录，望向街口尚未开门的账房。"}];
    return samples.map(sample => {
      const parsed = content.exports.parseMessageContent(sample.message);
      const html = content.exports.formatNarrativeHtml(parsed.narrative, messageId);
      const host = document.createElement('div'); host.innerHTML = html;
      return { name: sample.name, expected: sample.count, actual: host.querySelectorAll('.dhl-story-notice').length, text: host.textContent };
    });
  }