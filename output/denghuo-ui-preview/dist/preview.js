const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const paths = {
  lantern: '<path d="M9 3h6M12 3V1M7 7h10l2 5-2 5H7l-2-5 2-5ZM7 7l2-4m8 4-2-4M8 17l1 3h6l1-3M12 20v3M10 7l-1 5 1 5m4-10 1 5-1 5"/>',
  book: '<path d="M12 5v15M3 4c4-1 6-1 9 1 3-2 5-2 9-1v15c-4-1-6-1-9 1-3-2-5-2-9-1Z"/>',
  scroll: '<path d="M5 3h12a3 3 0 0 1 3 3v12H8V6a3 3 0 0 0-6 0v2h6m0 10v1a2 2 0 0 1-4 0v-1h16a2 2 0 0 1-2 3H6M11 8h6m-6 4h6"/>',
  feather: '<path d="m3 21 12-12M8 16c-3-8 3-14 13-13 1 10-5 16-13 13Zm0 0h7m-3-4h7"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  settings: '<path d="M4 5h16M4 12h16M4 19h16M8 2v6m8 1v6m-8 1v6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9 12 12 0 0 1-4-1l-5 2 1-5a9 9 0 1 1 17-5Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  shuffle: '<path d="M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 4-3 6-7s4-7 6-7h3m-4-4 4 4-4 4"/>',
  flip: '<path d="M4 9a8 8 0 0 1 14-4l3 3M21 2v6h-6M20 15a8 8 0 0 1-14 4l-3-3m0 6v-6h6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  leaf: '<path d="M19 3C7 1 1 10 7 17 14 23 23 17 21 5l-2-2ZM3 21l13-13m-7 9v-6m3 3h6"/>',
  spark: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  box: '<path d="m3 7 9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7 4.8l9 5"/>',
  list: '<path d="M10 5h11M10 12h11M10 19h11M3 4l1 1 2-2M3 11l1 1 2-2M3 18l1 1 2-2"/>',
  map: '<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3V5ZM8 2v17m8-14v17"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8L21 9h-8l1-7Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
  moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
  gem: '<path d="m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
  close: '<path d="m5 5 14 14M5 19 19 5"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 22h8m-4-5v5"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2M10 5h4"/>',
};
const icon = (name, className = '') => `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
const esc = text => String(text).replace(/[&<>"']/g, value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
const actionItems = [
  { id: 'rest', title: '静室歇息', short: '换上道袍，灯下细读剑典', type: '整备', draft: '接过素帕拭汗，换上月白内门道袍，就着灯火翻开《太清引气篇》细读，遇不解处记下待明日请教。' },
  { id: 'ask', title: '请教剑典', short: '向师尊请教行气疑难', type: '交涉', draft: '趁白清弦尚未离去，捧着竹简起身，就《太清引气篇》与《守正剑诀》行气相左之处向她请教。' },
  { id: 'sword', title: '断剑旧愿', short: '谈起旧怨与重铸命器之事', type: '交涉', draft: '收好竹简，向白清弦陈说当年遭人暗算的旧事，请她指点明日寒髓泉中重铸命器可承载几分旧愿。' },
];
const tabItems = [['story','scroll','历程'],['gallery','eye','图鉴'],['cultivation','leaf','修炼'],['skills','spark','神通'],['inventory','box','储物'],['companions','feather','红尘'],['tasks','list','任务'],['map','map','地图'],['tribulation','bolt','历劫']];
const imageList = ['assets/portrait-2.png','assets/portrait-1.png','assets/portrait-3.png'];
let imageIndex = 0;
let generationTimer = null;
let toastTimer = null;
let chapterNumber = 3;
document.body.dataset.theme = 'lantern';

$('#app').innerHTML = `
<div class="preview-app">
  <header class="preview-toolbar">
    <div class="preview-brand"><span class="preview-brand-mark">灯</span><div><strong>灯火通明</strong><small>前端交互样稿</small></div></div>
    <div class="comparison-switch" role="group" aria-label="对照方案"><button type="button" data-version="before" aria-pressed="false">原版参考</button><button type="button" data-version="after" class="selected" aria-pressed="true">升级方案<i></i></button></div>
    <div class="preview-tools"><div class="device-switch" role="group" aria-label="预览尺寸"><button type="button" data-device="desktop" class="selected" title="桌面尺寸" aria-label="桌面尺寸" aria-pressed="true">${icon('monitor')}</button><button type="button" data-device="phone" title="手机尺寸" aria-label="手机尺寸" aria-pressed="false">${icon('phone')}</button></div><select id="theme-select" aria-label="预览主题"><option value="lantern">灯火阑珊</option><option value="duskInk">暮灯丹青</option><option value="shanhai">山海丹青</option><option value="starAltar">星坛玄境</option></select></div>
  </header>
  <div class="preview-workspace" id="workspace"><div class="device" id="device"><div class="game" id="game" data-version="after">
    <header class="stage-header">
      <div class="stage-brand">${icon('lantern','brand-lantern')}<div><span>灯火阑珊</span><strong>历程 <b>·</b> 三段因缘</strong><small class="legacy-only">879t</small></div></div>
      <div class="reading-modes" role="group" aria-label="阅读模式"><button type="button" data-reading="paged" aria-label="翻页阅读" title="翻页阅读">${icon('book')}</button><button type="button" class="active" data-reading="scroll" aria-label="长卷阅读" title="长卷阅读">${icon('scroll')}</button></div>
      <button class="location-button" type="button" data-panel="map">${icon('pin')}<span><small>此刻所在</small><strong>神州 <b>·</b> 抱雪峰</strong></span>${icon('chevron','location-arrow')}</button>
      <div class="header-tools"><span class="danger-tag">险 5</span><button class="icon-button legacy-only" type="button" title="打开地图" aria-label="打开地图" data-panel="map">${icon('map')}</button><button class="icon-button header-index" type="button" title="卷册目录" aria-label="卷册目录" data-panel="catalog">${icon('list')}</button><button class="icon-button" type="button" title="阅读设置" aria-label="阅读设置" data-panel="settings">${icon('settings')}</button><button class="icon-button immersive-button" type="button" title="沉浸阅读" aria-label="沉浸阅读" id="immersive-button">${icon('expand')}</button></div>
    </header>
    <main class="stage-main" id="stage-main">
      <div class="reading-grid" id="reading-grid">
        <div class="reader-shell" id="reader-shell" data-top="true" data-bottom="false"><div class="story-scroll" id="story-scroll" tabindex="0" aria-label="剧情长卷">
          <article class="chapter" id="current-chapter">
            <header class="chapter-header"><div class="chapter-eyebrow"><span>第 三 回</span><i></i><span>879t <b>·</b> 18.6 秒</span></div><span class="chapter-current"><i></i>此回已成</span></header>
            <div class="chapter-location">${icon('pin')}抱雪峰 · 白木静室 <span>子时 · 风雪未歇</span></div>
            <details class="reasoning" id="reasoning"><summary><span class="reasoning-glyph">${icon('spark')}</span><span class="reasoning-title"><strong>灵台观照</strong><small>小猫 · 观照此间因果</small></span><span class="reasoning-complete">观照已成</span>${icon('chevron','disclosure-chevron')}</summary><div class="reasoning-content"><small>此回脉络</small><p>白清弦替苓沅疏通经络，师徒之间的信任随之加深。旧伤渐愈，断剑与寒髓泉的约定仍待续写。</p><p>可承接的行动：静室歇息、请教剑典，或谈及昔年的未了因果。</p></div></details>
            <section class="action-note"><span class="action-glyph">${icon('feather')}</span><div><small>你的行动</small><p id="user-action">依言凝神静气，配合白清弦运功，忍住疏通百脉的痛楚。</p></div><button type="button" id="edit-action" title="改写本回起念">${icon('feather')}<span>改写</span></button></section>
            <div class="story-prose" id="story-prose">
              <p>风雪落在窗外，声息细碎。静室里只余檀香一缕，灯火映着白清弦袖口的银纹，像雪夜里一线清明的月色。</p>
              <p>她抬起右臂，食指与中指并拢，隔着半尺虚空点向你的眉心与膻中。一缕清冽的金芒自她指尖渡出，顺着周身大穴没入经络。</p>
              <p>最初是冰泉漫过皮肤的微凉，紧接着，潜藏在经脉深处的淤毒翻涌起来。你的额角渐渐渗出冷汗，搭在膝上的十指收拢，呼吸却始终未乱。</p>
              <p>白清弦的目光停在你脸上。见你仍能定神，她眼底便浮起一丝极淡的嘉许。</p>
              <blockquote>“守住灵台清明，莫与这股痛楚角力，顺着为师的指引，将浊气逼向指端。”</blockquote>
              <p>你依言放缓吐纳，引着丹田内那枚白玉护脉丹化开的暖流，配合她渡入的精纯气机，涤荡过淤塞的暗伤。灵气循着新拓的经络流转，气海深处沉寂许久的生息，终于一点点复苏。</p>
              <p>窗纸被风轻轻拂动。白清弦收回手指，取来一卷青玉竹简与叠放整齐的月白道袍，放在你面前的剑案上。</p>
              <blockquote>“这卷《太清引气篇》，正好与你原先的剑诀相互印证。今夜且在偏室歇息，明日卯时，带上半截断剑，随为师去后山寒髓泉。”</blockquote>
              <p>她起身添了一寸灯芯，暖黄的光落进眼底。雪还在下，来日的路却已渐渐清晰。</p>
            </div>
            <section class="next-actions"><div class="section-caption"><span>接 下 来</span><small>择一念，续此间因缘</small></div><div class="action-cards">${actionItems.map((item,index)=>`<button type="button" data-action="${item.id}"><span>0${index+1}</span><strong>${item.title}</strong><small>${item.short}</small>${icon('chevron')}</button>`).join('')}</div></section>
            <button type="button" class="variable-summary" data-panel="variables">${icon('compass')}<span>天道推演</span><small>因果流转 · 十四项变数落定</small>${icon('chevron')}</button><div class="chapter-end"><span></span><i>◇</i><span></span></div>
          </article>
        </div><button class="follow-latest" id="follow-latest" type="button">${icon('chevron')}<span>跟随最新</span></button></div>
        <aside class="portrait-rail" id="portrait-rail" aria-label="在场人物">
          <button class="rail-collapse" id="rail-collapse" type="button" title="收起立绘" aria-label="收起立绘">${icon('chevron')}</button>
          <header class="rail-header"><span><i></i> 此刻相伴</span><small>一 人 在 场</small><button class="icon-button mobile-rail-close" type="button" title="关闭立绘" aria-label="关闭立绘" id="mobile-rail-close">${icon('close')}</button></header>
          <div class="portrait-stage"><button type="button" class="portrait-image-button" id="portrait-image-button" title="查看白清弦大图"><img id="portrait-image" src="assets/portrait-2.png" alt="白清弦立绘"></button><div class="portrait-tools">${[['previous','chevron','上一张立绘'],['random','shuffle','随机立绘'],['next','chevron','下一张立绘'],['flip','flip','镜像翻转'],['expand','expand','查看大图']].map(([action,glyph,label])=>`<button type="button" data-portrait="${action}" title="${label}" aria-label="${label}">${icon(glyph,action==='previous'?'reverse':'')}</button>`).join('')}</div><div class="portrait-caption"><div class="portrait-status"><span><i></i> 此刻在场</span><b class="after-only">渡劫中期</b></div><div class="portrait-name"><h2>白清弦</h2><span class="relation-badge after-only">师 徒</span></div><p class="portrait-emotion after-only">眼底嘉许，心绪温和</p></div></div>
          <div class="portrait-main-actions after-only"><button type="button" class="talk-primary" id="portrait-talk">${icon('chat')}<span>与白清弦交谈</span>${icon('chevron')}</button><button type="button" class="dossier-button" title="白清弦的红尘档案" aria-label="白清弦的红尘档案" data-panel="companions">${icon('user')}</button></div>
          <div class="legacy-portrait-controls legacy-only">${[['talk','chat'],['previous','chevron'],['random','shuffle'],['next','chevron'],['flip','flip'],['expand','expand']].map(([action,glyph])=>`<button type="button" data-portrait="${action}" aria-label="${action}">${icon(glyph,action==='previous'?'reverse':'')}</button>`).join('')}</div>
          <p class="rail-footnote after-only"><span></span>雪中照影，一念相知<span></span></p>
        </aside>
      </div>
      <button class="portrait-reopen" id="portrait-reopen" type="button" aria-label="展开在场立绘" title="展开在场立绘">${icon('user')}<span>在场</span></button>
      <button class="mobile-portrait-toggle" id="mobile-portrait-toggle" type="button"><img src="assets/portrait-2.png" alt=""><span>在场</span></button>
    </main>
    <nav class="tab-nav" aria-label="角色功能">${tabItems.map(([id,glyph,label])=>`<button type="button" class="${id==='story'?'active':''}" data-panel="${id}">${icon(glyph)}<span>${label}</span>${id==='tasks'?'<b>2</b>':''}</button>`).join('')}</nav>
    <footer class="dashboard"><div class="dashboard-left after-only"><button type="button" class="realm-status" data-panel="cultivation">${icon('leaf')}<strong>筑基初期</strong><span class="mini-progress"><i></i></span><small>18%</small></button><button type="button" class="spirit-stones" data-panel="inventory">${icon('gem')}<span>15</span></button><button type="button" class="tracked-quest" data-panel="tasks">${icon('list')}<span>断剑重续</span>${icon('chevron')}</button></div><button type="button" class="legacy-news legacy-only" data-open-news>${icon('compass')}世闻</button><button type="button" class="world-clock" data-panel="clock">${icon('moon')}<span class="clock-era">盛法时代 <b>·</b></span><span>一月初一 <b>·</b> 子时</span><small class="legacy-signature legacy-only">灯火阑珊</small></button><button class="difficulty" type="button" data-panel="difficulty"><span class="difficulty-pill"><i></i>平稳 <b>·</b> 常态 <small>→</small></span><span class="difficulty-quote">天道运转如常，万物循理。</span></button></footer>
    <section class="command-dock" aria-label="剧情输入"><div class="draft-selection" id="draft-selection" hidden>${icon('compass')}<strong></strong><button type="button" id="clear-draft" aria-label="清除所选行动">${icon('close')}</button></div><form class="command-row" id="command-form"><div class="command-mode">${icon('feather')}<span>推演</span></div><button type="button" class="talk-button" id="choose-talk" title="发起交谈，选择人物">${icon('chat')}<span>交谈</span></button><span class="legacy-connection legacy-only" title="已连接">${icon('spark')}</span><button type="button" class="news-button after-only" data-open-news title="世闻与行动提案">${icon('compass')}<span>世闻</span><b>3</b></button><label class="draft-label"><span class="sr-only">写下你的行动</span><textarea id="draft" rows="1" placeholder="写下此刻想做的事……"></textarea></label><button type="button" class="native-input-button" id="native-input-button" title="显示酒馆输入区" aria-label="显示酒馆输入区">${icon('eye')}</button><button type="submit" class="send-button" id="send-button" disabled><span class="send-connection after-only" title="已连接"></span>${icon('send')}<span>推演</span></button></form><div class="native-input-preview" id="native-input-preview" hidden><span>酒馆输入区</span><input aria-label="酒馆输入区示例" placeholder="在此输入原生指令……"><button type="button" id="close-native">收起</button></div></section>
  </div></div></div>
  <footer class="preview-footnote"><span><i></i>独立模拟 · 所有交互仅在本页生效</span><span id="preview-tip">试试灵台观照、收起立绘，或选择一项行动</span></footer>
</div>`;

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 2600);
}
function openDialog(id) {
  const dialog = $(id);
  if (!dialog.open) dialog.showModal();
}
function detail(title, content, kicker = '卷中一页') {
  $('#dialog-kicker').textContent = kicker;
  $('#dialog-content').innerHTML = `<h2>${title}</h2>${content}`;
  openDialog('#detail-dialog');
}
function updateDraft() {
  $('#send-button').disabled = !$('#draft').value.trim() && !generationTimer;
  $('#draft').style.height = 'auto';
  $('#draft').style.height = Math.min(92, $('#draft').scrollHeight) + 'px';
}
function selectAction(id) {
  const item = actionItems.find(action => action.id === id);
  if (!item) return;
  $('#draft').value = item.draft;
  $('#draft-selection strong').textContent = item.title;
  $('#draft-selection').hidden = false;
  $('#news-dialog').close();
  updateDraft();
  $('#draft').focus();
  toast('已将「' + item.title + '」放入行动栏');
}
function renderNews(tab = 'actions') {
  $$('[data-news-tab]').forEach(button => {const selected = button.dataset.newsTab === tab;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));});
  $('#news-content').innerHTML = tab === 'actions'
    ? `<p class="muted">选中后填入行动栏，仍可自行修改。</p><div class="news-action-list">${actionItems.map((item,index)=>`<button type="button" data-action="${item.id}"><span class="action-number">0${index+1}</span><div><small>${item.type}</small><h3>${item.title}</h3><p>${item.draft}</p></div>${icon('chevron')}</button>`).join('')}</div>`
    : `<div class="news-entry"><span class="news-tag">朔北 · 余波</span><h3>听雪城古剑坛风波已平</h3><p>剑庐阵师正连夜修补地脉禁制，城中守岁灯会如常举行。百姓相传，今夜曾有一名年轻剑修持凡铁护住了满街灯火。</p><small>一月初一 · 未介入</small></div><div class="news-entry"><span class="news-tag">忘机剑庐 · 新闻</span><h3>抱雪峰开门收徒</h3><p>剑尊白清弦带一名年轻剑修登峰，门中已有数位执事前往静室外候命。</p><small>一月初一 · 与你相关</small></div>`;
}
function openChat() {
  $('#detail-dialog').close();
  $('#stage-main').classList.remove('mobile-portrait-open');
  openDialog('#chat-dialog');
  $('#chat-input').focus();
}
const dossier = () => `<div class="dossier-hero"><img src="${imageList[imageIndex]}" alt="白清弦"><div><span class="eyebrow">忘机剑庐 · 抱雪峰</span><h3>忘机剑尊</h3><p>渡劫中期 · 天金灵根</p><span class="relation-badge">师徒 · 初识</span></div></div><div class="detail-grid"><div><small>此刻心绪</small><strong>眼底嘉许，心绪温和</strong></div><div><small>好感</small><strong>18 · 缘分初生</strong></div><div><small>相处之道</small><strong>坦诚守正，勤修剑心</strong></div><div><small>未了约定</small><strong>明日卯时，共赴寒髓泉</strong></div></div><section class="detail-note"><small>羁绊纪事 · 拔毒续脉</small><p>白清弦为你疏通百脉、拔除沉疴，气海裂痕续接七成。断剑重铸之约，亦从这一夜开始。</p></section><button type="button" class="dialog-primary" data-start-chat>${icon('chat')}与白清弦交谈</button>`;
function openPanel(id) {
  if (id === 'story') {$('#story-scroll').scrollTo({top:0,behavior:'smooth'});return;}
  const panels = {
    companions: ['白清弦 · 红尘档案', dossier(), '红尘有迹'],
    cultivation: ['本尊道基', `<p class="dialog-subtitle">苓沅 · 忘机剑庐抱雪峰亲传</p><div class="cultivation-orbit"><span>当前境界</span><strong>筑基初期</strong><small>18.0%</small></div><div class="progress-line"><i></i></div><div class="progress-label"><span>修为 90 / 500</span><span>尚需 410</span></div><div class="detail-grid"><div><small>修炼状态</small><strong>修炼中</strong></div><div><small>功法</small><strong>守正剑诀</strong></div><div><small>灵根</small><strong>金系灵根</strong></div><div><small>体质</small><strong>百炼剑魄</strong></div></div>`, '周天不息'],
    inventory: ['随身储物', `<p class="dialog-subtitle">行囊虽轻，前路渐丰。</p><div class="inventory-total">${icon('gem')}<span>灵石</span><strong>15</strong></div><div class="inventory-row"><span>太清引气篇</span><small>玄阶 · 青玉竹简</small><b>1</b></div><div class="inventory-row"><span>月白内门道袍</span><small>凡阶 · 新得</small><b>1</b></div><div class="inventory-row"><span>半截染血断剑</span><small>旧物 · 待重铸</small><b>1</b></div>`, '方寸之间'],
    tasks: ['未竟之事', `<div class="quest-card"><span class="news-tag">主线 · 进行中</span><h3>断剑重续 · 调理沉疴</h3><p>百脉淤毒已清，气海裂痕续接七成。明日卯时携断剑赴后山寒髓泉，稳固新拓经脉。</p><div class="progress-line"><i style="width:70%"></i></div><small>当前追踪</small></div><div class="quest-card"><span class="news-tag">支线 · 进行中</span><h3>灯下问剑</h3><p>细读《太清引气篇》，整理与原有剑诀行气相左之处，择机向白清弦请教。</p></div>`, '道途所向'],
    map: ['神州 · 抱雪峰', `<p class="dialog-subtitle">忘机剑庐山门之北，终岁积雪，寒髓泉藏于后山。</p><div class="mini-map"><svg viewBox="0 0 520 240" aria-label="听雪城到抱雪峰的示意地图"><path class="mountain" d="m5 220 80-110 55 60 100-145 90 120 65-70 115 145M0 225h520"/><path class="map-route" d="M90 185Q200 210 290 74T427 120"/><circle cx="90" cy="185" r="5"/><circle cx="290" cy="74" r="7"/><circle cx="427" cy="120" r="4"/><text x="45" y="215">听雪城</text><text x="260" y="50">抱雪峰</text><text x="405" y="153">寒髓泉</text></svg></div><div class="detail-grid"><div><small>此刻所在</small><strong>白木静室</strong></div><div><small>环境危险</small><strong>5 · 安定</strong></div></div>`, '山河行踪'],
    clock: ['一夜新岁', `<div class="clock-detail">${icon('moon')}<span>盛法时代 · 第一年</span><strong>一月初一 · 子时</strong><p>风雪未歇，山中灯火尚明。</p></div>`, '岁时有序'],
    difficulty: ['天道感应', `<div class="detail-note"><span class="difficulty-pill"><i></i>平稳 · 常态 →</span><h3>天道运转如常，万物循理。</h3><p>此刻身处剑庐庇护之地，周遭形势安定。旧伤初愈，宜静养凝神，为明日行功蓄势。</p></div>`, '观天察势'],
    skills: ['已习神通', `<div class="quest-card"><span class="news-tag">剑术 · 已掌握</span><h3>守正一剑</h3><p>以沉凝剑理引导气机，持身端方，进退有度。新拓经络仍需温养，行剑以养意为先。</p></div><div class="quest-card"><span class="news-tag">功法 · 待参悟</span><h3>太清引气篇</h3><p>抱雪峰筑基总纲，吐纳清气，循周天而养剑心。</p></div>`, '一剑照心'],
    tribulation: ['道争态势', `<div class="detail-note"><span class="news-tag">平静</span><h3>周遭无争，且养此心。</h3><p>当前未入战局，亦无天劫临身。肉身暗伤初愈，真元渐复，尚需调息稳固。</p></div><div class="detail-grid"><div><small>真元</small><strong>渐复</strong></div><div><small>神识</small><strong>澄明</strong></div><div><small>肉身</small><strong>初愈</strong></div><div><small>当前敌人</small><strong>无</strong></div></div>`, '风雨未至'],
    variables: ['此回变数', `<p class="dialog-subtitle">十四项变数已落定，以下为示例摘要。</p><div class="inventory-row"><span>本尊 · 修为</span><strong class="jade">+40</strong></div><div class="inventory-row"><span>白清弦 · 好感</span><strong class="jade">+3</strong></div><div class="inventory-row"><span>杂物袋</span><small>太清引气篇、月白内门道袍</small></div><div class="inventory-row"><span>下一步</span><small>明日卯时，共赴寒髓泉</small></div>`, '因果流转'],
    gallery: ['卷中照影', `<div class="gallery-grid">${imageList.map((src,index)=>`<button type="button" data-gallery-image="${index}"><img src="${src}" alt="白清弦立绘 ${index+1}"><span>白清弦 · 其${['一','二','三'][index]}</span></button>`).join('')}</div>`, '见影知人'],
    catalog: ['三段因缘', `<div class="catalog-list"><button type="button" data-catalog="1"><span>第一回</span><strong>满城灯火，凡铁问剑</strong></button><button type="button" data-catalog="2"><span>第二回</span><strong>雪夜拜师，共赴抱雪峰</strong></button><button type="button" data-catalog="3"><span>第三回</span><strong>灯下续脉，断剑有期</strong></button></div>`, '卷册目录'],
    settings: ['阅读设置', `<p class="dialog-subtitle">一卷在手，随心调适。</p><label class="setting-row"><span>正文字号</span><input id="font-range" type="range" min="15" max="21" value="17"><output id="font-output">17</output></label><label class="setting-row"><span>行间留白</span><input id="line-range" type="range" min="18" max="25" value="21"><output id="line-output">2.1</output></label><label class="setting-row"><span>思维链外观</span><select id="reasoning-style"><option value="theme">统一灯火主题</option><option value="preset">预设参考外观</option></select></label><p class="setting-help">统一主题保留标题与内容，折叠和排版沿用同一套组件。</p><label class="setting-row"><span>减少动效</span><input id="reduce-motion" type="checkbox"></label>`, '一念调适'],
  };
  if (panels[id]) detail(...panels[id]);
}
function updateScrollEdges() {
  const scroll = $('#story-scroll');
  $('#reader-shell').dataset.top = String(scroll.scrollTop < 4);
  const bottom = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 12;
  $('#reader-shell').dataset.bottom = String(bottom);
  $('#follow-latest').classList.toggle('visible', scroll.scrollTop > 120 && !bottom);
}
function setImage(index) {
  imageIndex = (index + imageList.length) % imageList.length;
  $('#portrait-image').src = imageList[imageIndex];
  $('#large-portrait').src = imageList[imageIndex];
  $('#portrait-image').classList.remove('flipped');
}
function stopGeneration() {
  clearInterval(generationTimer);
  generationTimer = null;
  $('#send-button').innerHTML = `<span class="send-connection after-only" title="已连接"></span>${icon('send')}<span>推演</span>`;
  $('#send-button').classList.remove('generating');
  $('#draft').disabled = false;
  updateDraft();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.classList.contains('close-dialog')) {button.closest('dialog').close();return;}
  if (button.dataset.version) {
    $('#game').dataset.version = button.dataset.version;
    $$('[data-version]', $('.comparison-switch')).forEach(item => {const selected = item === button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
    $('#reasoning').classList.remove('preset-reference');
    $('#preview-tip').textContent = button.dataset.version === 'after' ? '试试灵台观照、收起立绘，或选择一项行动' : '原版参考为同内容布局模拟，可切回升级方案对照';
  }
  if (button.dataset.device) {
    $('#workspace').classList.toggle('phone',button.dataset.device === 'phone');
    document.body.classList.toggle('phone-preview',button.dataset.device === 'phone');
    $$('[data-device]').forEach(item=>{const selected=item===button;item.classList.toggle('selected',selected);item.setAttribute('aria-pressed',String(selected));});
  }
  if (button.dataset.reading) {
    $('#game').classList.toggle('paged', button.dataset.reading === 'paged');
    $$('[data-reading]').forEach(item=>item.classList.toggle('active',item===button));
    toast(button.dataset.reading === 'paged' ? '翻页布局：立绘置于左侧' : '长卷布局：立绘置于右侧');
  }
  if (button.dataset.panel) openPanel(button.dataset.panel);
  if (button.hasAttribute('data-open-news')) {renderNews();openDialog('#news-dialog');}
  if (button.dataset.newsTab) renderNews(button.dataset.newsTab);
  if (button.dataset.action) selectAction(button.dataset.action);
  if (button.hasAttribute('data-start-chat')) openChat();
  if (button.dataset.portrait) {
    const action = button.dataset.portrait;
    if(action==='previous') setImage(imageIndex-1);
    if(action==='next') setImage(imageIndex+1);
    if(action==='random') setImage(imageIndex+1+Math.floor(Math.random()*2));
    if(action==='flip') $('#portrait-image').classList.toggle('flipped');
    if(action==='expand') {$('#large-portrait').src=imageList[imageIndex];openDialog('#portrait-dialog');}
    if(action==='talk') openChat();
  }
  if (button.hasAttribute('data-gallery-image')) {setImage(Number(button.dataset.galleryImage));$('#detail-dialog').close();openDialog('#portrait-dialog');}
  if (button.dataset.catalog) {$('#detail-dialog').close();$('#story-scroll').scrollTo({top:0,behavior:'smooth'});toast('正在预览第三回的示例布局');}
  if(button.id==='portrait-talk') openChat();
  if(button.id==='portrait-image-button') {$('#large-portrait').src=imageList[imageIndex];openDialog('#portrait-dialog');}
  if(button.id==='rail-collapse') $('#reading-grid').classList.add('rail-hidden');
  if(button.id==='portrait-reopen') $('#reading-grid').classList.remove('rail-hidden');
  if(button.id==='mobile-portrait-toggle') $('#stage-main').classList.toggle('mobile-portrait-open');
  if(button.id==='mobile-rail-close') $('#stage-main').classList.remove('mobile-portrait-open');
  if(button.id==='immersive-button') {$('#game').classList.toggle('immersive');button.classList.toggle('active');}
  if(button.id==='follow-latest') $('#story-scroll').scrollTo({top:$('#story-scroll').scrollHeight,behavior:'smooth'});
  if(button.id==='choose-talk') detail('与谁交谈？',`<p class="dialog-subtitle">选择此刻在场的人物。</p><button type="button" class="target-card" data-start-chat><img src="assets/portrait-2.png" alt="白清弦"><div><strong>白清弦</strong><small>渡劫中期 · 师徒 · 当面交谈</small></div>${icon('chevron')}</button>`,'一言相问');
  if(button.id==='edit-action') detail('改写本回起念',`<label for="action-edit" class="muted">你的行动</label><textarea class="action-editor" id="action-edit">${esc($('#user-action').textContent)}</textarea><button class="dialog-primary" type="button" id="save-action">保存起念</button>`,'笔下有因');
  if(button.id==='save-action') {const text=$('#action-edit').value.trim();if(text){$('#user-action').textContent=text;$('#detail-dialog').close();toast('本回起念已更新到预览');}}
  if(button.id==='clear-draft') {$('#draft').value='';$('#draft-selection').hidden=true;updateDraft();}
  if(button.id==='native-input-button') $('#native-input-preview').hidden = !$('#native-input-preview').hidden;
  if(button.id==='close-native') $('#native-input-preview').hidden=true;
  requestAnimationFrame(updateScrollEdges);
});
$('#theme-select').addEventListener('change', event => {document.body.dataset.theme=event.target.value;});
document.addEventListener('input', event => {
  if(event.target.id==='draft') updateDraft();
  if(event.target.id==='font-range') {$('#game').style.setProperty('--prose-size',event.target.value+'px');$('#font-output').textContent=event.target.value;}
  if(event.target.id==='line-range') {$('#game').style.setProperty('--prose-leading',event.target.value/10);$('#line-output').textContent=(event.target.value/10).toFixed(1);}
  if(event.target.id==='reasoning-style') $('#reasoning').classList.toggle('preset-reference',event.target.value==='preset');
  if(event.target.id==='reduce-motion') document.body.classList.toggle('reduce-motion',event.target.checked);
});
$('#draft').addEventListener('keydown', event => {if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();$('#command-form').requestSubmit();}});
$('#command-form').addEventListener('submit', event => {
  event.preventDefault();
  if (generationTimer) {stopGeneration();toast('已停止本次模拟推演');return;}
  const text = $('#draft').value.trim();
  if (!text) return;
  chapterNumber++;
  const article = document.createElement('article');article.className='chapter simulated-chapter';
  article.innerHTML=`<header class="chapter-header"><div class="chapter-eyebrow"><span>第 ${chapterNumber} 回</span><i></i><span>续写示例</span></div><span class="chapter-current">灯下续章</span></header><section class="action-note"><span class="action-glyph">${icon('feather')}</span><div><small>你的行动</small><p>${esc(text)}</p></div></section><div class="story-prose"><p class="simulated-copy"></p></div><div class="chapter-end"><span></span><i>◇</i><span></span></div>`;
  $('#story-scroll').append(article);
  $('#draft').value='';$('#draft').disabled=true;$('#draft-selection').hidden=true;
  $('#send-button').disabled=false;$('#send-button').classList.add('generating');$('#send-button').innerHTML='<span class="stop-square"></span><span>停止</span>';
  article.scrollIntoView({block:'start',behavior:'smooth'});
  const response='白清弦静静听完，指尖轻点竹简，替你标出行气的关键处。“道途尚长，今夜先安下心来。一日一日走稳，自有重握长锋的时候。”\n她将灯盏向你移近些，窗外的雪光与案上暖意交映，照亮了青玉简上细细的字迹。';
  let cursor=0;
  generationTimer=setInterval(()=>{cursor+=3;$('.simulated-copy',article).textContent=response.slice(0,cursor);$('#story-scroll').scrollTop=$('#story-scroll').scrollHeight;if(cursor>=response.length){stopGeneration();toast('已完成一次本地推演演示');}},32);
});
$('#chat-form').addEventListener('submit', event => {
  event.preventDefault();const text=$('#chat-input').value.trim();if(!text)return;
  const message=document.createElement('div');message.className='chat-message sent';message.innerHTML='<small>你</small><p>'+esc(text)+'</p>';$('#chat-messages').append(message);$('#chat-input').value='';$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;
  setTimeout(()=>{const reply=document.createElement('div');reply.className='chat-message received';reply.innerHTML='<small>白清弦</small><p>“此事为师记下了。你既入我门下，有疑惑便直说，无须独自放在心里。”</p>';$('#chat-messages').append(reply);$('#chat-messages').scrollTop=$('#chat-messages').scrollHeight;},650);
});
$$('dialog').forEach(dialog => dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
$('#story-scroll').addEventListener('scroll',updateScrollEdges,{passive:true});
window.addEventListener('resize',updateScrollEdges);
new ResizeObserver(updateScrollEdges).observe($('#device'));
renderNews();
updateDraft();
updateScrollEdges();
