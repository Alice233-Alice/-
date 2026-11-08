import { klona } from 'klona';

export const SUMMARY_DESCRIPTION =
  '仅用简体中文概括本轮实际写入的变量变化与正文依据，80字以内；人名沿用中文原名。不得输出英文句子、中英夹杂、格式讨论、思考过程或未写入的变化。';

export const EXTRA_ANALYSIS_REQUIREMENTS = `【灯火阑珊·变量结算要求】
先核对更新前变量与最新一轮正文，逐类检查行踪与环境、物品收支、任务进展、战斗与修炼、出场人物关系、时间与世界事件。正文已经发生且旧变量尚未体现的变化，必须写入对应字段；没有变化的字段保留旧值。
进入或离开地点须更新行踪；收下、收入怀中或装入储物空间的物品须入库；共同目标、承诺、线索推进和互动造成的关系变化须按规则结算。不要求正文出现“更新变量”、数值提示或任务完成弹窗，也不因本轮没有升级、战斗而省略其他更新。数值变化须有依据，禁止补造消耗、奖励或好感。
先完成这些事实变量的结算，最后更新当前处境与可参与机遇。若准备只输出后两项，必须复核是否漏记本轮移动、物品、任务或关系变化；摘要中写“获得物品”不能代替入库。
推演摘要是给玩家看的更新概括：${SUMMARY_DESCRIPTION}
输出容器遵循本次请求的格式：格式化输出只返回含 analysis 与 json_patch 的 JSON 对象；工具调用使用规定工具；普通聊天输出使用 UpdateVariable、Analysis、JSONPatch 标签。容器中的英文键名、操作名与标签保留原样，自然语言摘要和描述使用简体中文。每项操作只含 op、path 和必要的 value，禁止空键。`;

type PromptMessage = { role?: string; content?: unknown };
export type ExtraAnalysisRequest = {
  messages?: PromptMessage[];
  json_schema?: unknown;
  tools?: unknown[];
  [key: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isMvuPrompt(message: PromptMessage): boolean {
  return (
    message.role === 'system' &&
    typeof message.content === 'string' &&
    (message.content.includes(EXTRA_ANALYSIS_REQUIREMENTS.split('\n')[0]) ||
      (message.content.includes('<must>') && message.content.includes('紧急变量更新任务')))
  );
}

function localizeAnalysisSchema(schema: Record<string, unknown>): boolean {
  const analysis = asRecord(asRecord(schema.properties)?.analysis);
  if (!analysis || analysis.description === SUMMARY_DESCRIPTION) return false;
  analysis.description = SUMMARY_DESCRIPTION;
  return true;
}

/** 只处理 MVU 额外解析请求；不改变正文请求、模型参数、聊天或变量快照。 */
export function prepareExtraAnalysisRequest(request: ExtraAnalysisRequest, duringExtraAnalysis: boolean): boolean {
  if (!duringExtraAnalysis || !Array.isArray(request.messages)) return false;

  const schema = asRecord(request.json_schema);
  const mvuTools = (request.tools ?? []).filter(tool => {
    const fn = asRecord(asRecord(tool)?.function);
    return typeof fn?.name === 'string' && fn.name.startsWith('mvu_VariableUpdate_');
  });
  if (schema?.name !== 'mvu_json_patch' && !mvuTools.length && !request.messages.some(isMvuPrompt)) return false;

  let changed = false;
  if (schema?.name === 'mvu_json_patch') {
    const copy = klona(schema);
    const value = asRecord(copy.value);
    if (value && localizeAnalysisSchema(value)) {
      request.json_schema = copy;
      changed = true;
    }
  }

  if (mvuTools.length) {
    request.tools = request.tools!.map(tool => {
      if (!mvuTools.includes(tool)) return tool;
      const copy = klona(tool);
      const parameters = asRecord(asRecord(asRecord(copy)?.function)?.parameters);
      if (parameters && localizeAnalysisSchema(parameters)) changed = true;
      return copy;
    });
  }

  // v4 兼容模式将格式 schema 序列化进 <must> 系统消息，而不是传 json_schema 参数。
  for (const message of request.messages) {
    if (!isMvuPrompt(message) || typeof message.content !== 'string') continue;
    const content = message.content.replaceAll(
      'Write in ENGLISH. Compactly summarize the variable update decision without revealing variable contents.',
      SUMMARY_DESCRIPTION,
    );
    if (content !== message.content) {
      message.content = content;
      changed = true;
    }
  }

  const marker = EXTRA_ANALYSIS_REQUIREMENTS.split('\n')[0];
  const existing = request.messages.find(
    message => typeof message.content === 'string' && message.content.startsWith(marker),
  );
  if (existing) {
    if (existing.content !== EXTRA_ANALYSIS_REQUIREMENTS) {
      existing.content = EXTRA_ANALYSIS_REQUIREMENTS;
      changed = true;
    }
  } else {
    request.messages.push({ role: 'system', content: EXTRA_ANALYSIS_REQUIREMENTS });
    changed = true;
  }
  return changed;
}

export function installExtraAnalysisPromptGuard(): () => void {
  const listener = eventMakeLast(tavern_events.CHAT_COMPLETION_SETTINGS_READY, request => {
    if (prepareExtraAnalysisRequest(request, Mvu.isDuringExtraAnalysis())) {
      console.info('[灯火阑珊] 额外变量解析已应用中文摘要与逐类结算要求');
    }
  });
  return () => listener.stop();
}
