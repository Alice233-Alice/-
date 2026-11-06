import { z } from 'zod';
import { JourneySchema, JourneysSchema, type Journey } from '../灯火阑珊/schema/journeys';

export const JOURNEY_PROMPT_ID = 'dhl-current-journey';
export const JOURNEY_GENERATION_PREFIX = 'dhl-journey-';

const ProposalSchema = z.object({
  name: z.string().trim().min(1).max(24),
  lead: z.string().trim().min(1).max(220),
  goal: z.string().trim().min(1).max(160),
  step: z.string().trim().min(1).max(220),
  plan: z.string().trim().min(1).max(2400),
});
export const ProposalEnvelopeSchema = z.object({ proposals: z.array(ProposalSchema).length(3) });
export type JourneyProposal = z.output<typeof ProposalSchema>;

export const JOURNEY_INSPIRATIONS: Record<string, string> = {
  '': '自由原创，三个方向在所求、冲突与经历上有明显差异。',
  远游: '从眼前可核实的契机，逐渐打开远海、九霄、禁地、界外或未知地域。地域与因果由当前世界生发。',
  问道: '围绕一项值得长期追寻的道业，让修行、游历、人物立场与亲身选择相互推动，允许不同悟法。',
  立业: '从可参与的立身之地起步，各方都有真实欲求，发展人脉、资源与秩序，保留多种经营及处世路径。',
  旧愿: '从旧约或未竟之愿起步，逐渐牵出跨地域的人物与因果，让关系与选择留下长远回响。',
};

export const JOURNEY_PROPOSAL_PROMPT = `你为一个自由修仙大世界构思三种长篇行旅提案。
本次只进行创作提案，不续写当前剧情，不输出变量更新，不把任何候选写成已经发生。
可以完全原创，也可取意叙事母题。地点涵盖五域、远海、九霄、禁地与合乎世界规则的新区域，行路次序自由。
结合玩家当前修为、身份、地点、已有经历及偏好，提供当前可着手的入口，长远目标容纳成长。
每个方向须有持续发展的核心矛盾、各方自己的欲求、可取得的阶段成果及能够收束的终局；容纳调查、交涉、修行、经营等不同解法。
用具体的人与事让玩家产生追寻的理由。避免仅换名字的寻物任务、无穷套谜、强迫救世和灾难倒计时。
name为简洁中文名；lead为玩家可读的传闻或邀约，保留待证性质；goal说明值得长期追寻的东西；step为从当前处境可尝试的第一步。
plan仅供后台，用150至300字写清可承续的核心因果、人物欲求、前期发展与若干收束可能；它是尚未发生的构思，过程与后续须服从实际游玩。
仅返回JSON对象，proposals恰为三项，每项仅含name、lead、goal、step、plan。`;

export function parseJourneyProposals(response: unknown): JourneyProposal[] {
  if (typeof response !== 'string') throw new Error('寻途未返回文字提案，请重新寻途。');
  const json = response
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  let content: unknown;
  try {
    content = JSON.parse(json);
  } catch {
    throw new Error('提案文字尚未形成完整格式，请重新寻途。');
  }
  const result = ProposalEnvelopeSchema.safeParse(content);
  if (!result.success) throw new Error('提案格式不完整，请重寻一次。');
  if (new Set(result.data.proposals.map(item => item.name)).size !== 3) {
    throw new Error('三个提案名称重复，请重新寻途。');
  }
  return result.data.proposals;
}

export function createJourney(proposal: JourneyProposal): Journey {
  return JourneySchema.parse({
    名称: proposal.name,
    缘起: proposal.lead,
    所求: proposal.goal,
    下一步: proposal.step,
    状态: '待启程',
  });
}

export function buildJourneyAction(journey: Journey, guessId?: string): string {
  const guess = guessId ? journey.猜想[guessId] : undefined;
  if (guess) {
    const clues = guess.关联线索.filter(id => journey.线索[id]).map(id => `${id}：${journey.线索[id].内容}`);
    return `围绕「${journey.名称}」，我想核实这个猜想：${guess.内容}${clues.length ? `\n已有线索：${clues.join('；')}` : ''}\n先从当前能够接触的人、物或资料着手查证，区分证据与推测，再决定下一步。`;
  }
  return `我想${journey.状态 === '待启程' ? '开始' : '继续'}「${journey.名称}」这段行旅，所求是：${journey.所求}。\n${journey.进展 ? `已知进展：${journey.进展}\n` : ''}从眼前处境出发，尝试：${journey.下一步 || '梳理已有线索，寻找可行的切入点。'}`;
}

export function buildJourneyContext(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const source = value as Record<string, unknown>;
  const parsed = JourneysSchema.safeParse(source.行旅);
  if (!parsed.success) return '';
  const id = parsed.data.当前追踪;
  const journey = parsed.data.旅程[id];
  if (!journey || journey.状态 === '暂歇' || journey.状态 === '已落幕') return '';
  const plans = source.$行旅蓝图 as Record<string, string> | undefined;
  const selected = {
    ...journey,
    线索: Object.fromEntries(Object.entries(journey.线索).slice(-12)),
    纪事: Object.fromEntries(Object.entries(journey.纪事).slice(-8)),
  };
  return (
    `[当前行旅]\n旅程ID：${id}\n玩家已选方向及手札（缘起是待证入口，待启程仅表示意向，已知事实以线索、纪事及实际正文为据）：\n${JSON.stringify(selected)}\n` +
    `后台构思（未发生的可能，玩家尚未知悉的部分保留在幕后）：\n${plans?.[id] || '依已成立的因果与各方欲求继续生长。'}\n` +
    `本轮以玩家输入为先。待启程时从当前地点与已知人物建立可参与的入口；进行中时承接实际行动，让适合的节点有所发现、成果或关系变化。
玩家日常生活、临时改道和另寻解法都有空间，行旅可暂离；未发生的过程随行动调整，已成立的事实持续承接。
人物各有欲求，通过合理渠道显露动向。重要发现可在正文中给出短提示，后续做法留给玩家。
阶段结束交代实际成果与影响，核心所求已解决时允许落幕。变量阶段依据本轮事实维护行旅与相关任务、世闻，猜想保留其知情性质。`
  );
}
