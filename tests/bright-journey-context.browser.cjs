// Execute this function through DevTools on the local preview produced by bright-journeys-preview.cjs.
module.exports = async function verifyJourneyContextPicker() {
  const state = window.journeyPreview;
  const checks = [];
  const assert = (condition, name) => {
    if (!condition) throw new Error(name);
    checks.push(name);
  };
  const tick = () => window.Vue.nextTick();
  const findButton = label =>
    [...document.querySelectorAll('button')].find(button => button.textContent.trim() === label);
  const fill = (label, value) => {
    const input = document.querySelector(`input[aria-label="${label}"]`);
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  assert(Boolean(state), '本地预览已挂载测试版组件');
  for (const [index, text] of ['观月台晨课未完', '黄泉古迹出口暂封', '渡口旧碑与残木舟纹'].entries()) {
    document.querySelectorAll('[aria-label="剧情参考样稿"] button')[index].click();
    await tick();
    document.querySelector('.reference-details').open = true;
    assert(state.selectedMessageIds.length === 3, `样稿${index + 1}默认全部选中`);
    assert(
      document.querySelector('.history-content summary').textContent.includes(text),
      `样稿${index + 1}显示对应剧情`,
    );
  }
  state.historyRows = Array.from({ length: 45 }, (_, id) => ({
    id,
    role: id % 2 ? 'user' : 'assistant',
    name: '样稿人物',
    kind: '正文',
    hidden: false,
    defaultSelected: true,
    content: `第${id}楼的完整分页样稿。${'这段正文保持原有的叙事内容。'.repeat(20)}末尾核对标记${id}`,
  }));
  state.historyLastMessageId = 44;
  state.selectAllHistory();
  await tick();
  assert(document.querySelectorAll('.history-row').length === 20, '每页只呈现20条楼层');
  assert(document.querySelector('.history-pages').textContent.includes('1 / 3'), '45楼分为3页');
  fill('寻途开始楼层', 10);
  fill('寻途结束楼层', 30);
  findButton('应用区间').click();
  await tick();
  assert(state.selectedMessageIds.length === 21 && state.selectedMessageIds[0] === 10, '起止输入批选10至30楼');
  document.querySelector('input[aria-label="载入第18楼"]').click();
  await tick();
  assert(!state.selectedMessageIds.includes(18), '可以取消区间内的18楼');
  findButton('下一页').click();
  await tick();
  assert(document.querySelectorAll('.history-row').length === 20, '翻页保持每页20条');
  document.querySelector('input[aria-label="载入第25楼"]').click();
  await tick();
  findButton('上一页').click();
  await tick();
  assert(!document.querySelector('input[aria-label="载入第18楼"]').checked, '返回上一页仍保留取消状态');
  document.querySelector('input[aria-label="载入第5楼"]').click();
  await tick();
  assert(state.selectedMessageIds.includes(5), '可以补选区间外的5楼');
  findButton('下一页').click();
  await tick();
  assert(!document.querySelector('input[aria-label="载入第25楼"]').checked, '跨页取舍不会重置');
  const content = document.querySelector('.history-content');
  content.open = true;
  assert(content.querySelector('p').textContent.endsWith('末尾核对标记20'), '展开内容保留长正文末尾');
  findButton('全部历史').click();
  await tick();
  assert(state.selectedMessageIds.length === 45, '全部历史恢复45楼选中');
  const fold = [...document.querySelectorAll('button')].find(button => button.textContent.includes('收起寻途'));
  fold.click();
  await tick();
  const unfold = [...document.querySelectorAll('button')].find(button => button.textContent.includes('寻一段远途'));
  unfold.click();
  await tick();
  assert(state.selectedMessageIds.length === 45, '同聊天收起重开保留选择');
  state.selectedMessageIds = [];
  await tick();
  assert(findButton('看看远方').disabled, '空选择禁止开始寻途');
  window.selectJourneyScene(0);
  await tick();
  document.querySelector('.reference-details').open = true;
  return { checks, passed: checks.length, viewport: { width: innerWidth, height: innerHeight } };
};
