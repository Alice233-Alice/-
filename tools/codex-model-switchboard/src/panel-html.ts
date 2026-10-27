export function panelHtml(css:string,script:string,cspSource:string,nonce:string):string {
  const attr=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${attr(cspSource)}; script-src 'nonce-${attr(nonce)}';"><link rel="stylesheet" href="${attr(css)}"><title>Codex 模型渠道</title></head>
<body><main>
  <header><div><h1>模型设置</h1><p class="muted">日常切换请点聊天输入框中的模型名称。</p></div><button id="openChat" class="text">返回聊天</button></header>
  <div class="tabs" role="tablist" aria-label="模型管理"><button id="channelsTab" role="tab" aria-controls="channelsPage" aria-selected="true">渠道配置</button><button id="usageTab" role="tab" aria-controls="usagePage" aria-selected="false" tabindex="-1">用量与费用</button></div>
  <div id="notice" role="status" aria-live="polite" hidden></div>
  <section id="channelsPage" role="tabpanel" aria-labelledby="channelsTab">
    <section id="setup" class="setup" hidden><div><h2 id="adapterTitle">连接模型渠道</h2><p id="adapterHint" class="muted"></p></div><button id="enable">启用</button><button id="reload" hidden>重载窗口</button></section>
    <section><div class="sectionTitle"><h2>我的渠道</h2><button id="newProvider" class="secondary">＋ 添加渠道</button></div><div id="providers"></div></section>
    <section id="editor" class="card"><div class="sectionTitle"><h2 id="editorTitle">添加渠道</h2><button id="cancelEdit" class="text" hidden>取消编辑</button></div>
      <form id="providerForm">
        <label>渠道类型<select id="providerType"><option value="vertex">Google Vertex AI · Gemini</option><option value="responses">第三方 · Responses API</option><option value="chat-completions">第三方 · Chat Completions API</option></select></label>
        <label>显示名称<input id="label" required maxlength="100" value="Vertex" autocomplete="off"></label>
        <div id="vertexFields"><label>服务账号 JSON<span class="filePicker"><input id="credentialsFile" readonly placeholder="选择本地 JSON 文件" aria-label="服务账号 JSON 路径"><button id="chooseJson" type="button" class="secondary">选择文件…</button></span></label><div class="grid"><label>项目 ID<input id="project" placeholder="选择 JSON 后自动填写" autocomplete="off"></label><label>地区<input id="location" value="global" autocomplete="off"></label></div></div>
        <div id="apiFields" hidden><label>API 基础地址<input id="baseUrl" type="url" placeholder="https://example.com/v1" autocomplete="off"></label><label>API 密钥<input id="apiKey" type="password" autocomplete="new-password" placeholder="填写渠道密钥"><span id="keyHint" class="help">密钥在本机加密保存。</span></label></div>
        <label>模型名称<textarea id="models" rows="2" required placeholder="多个模型用逗号或换行分隔">gemini-4-argon</textarea><span class="help">填写你在该渠道实际可用的模型 ID。</span></label>
        <details><summary>各模型支持的思考档位</summary><p class="help">Gemini 已知型号会自动识别。其他渠道按服务商实际支持的档位设置；日常调整请在聊天模型菜单中选择。</p><div id="reasoningProfiles"></div></details>
        <div class="actions"><button id="save" type="submit">保存渠道</button><span class="help">保存后，在聊天输入框的模型菜单中选择。</span></div>
      </form>
    </section><div class="footer"><button id="diagnostics" class="text">查看诊断</button><button id="disable" class="text">恢复官方内核</button></div>
  </section>
  <section id="usagePage" role="tabpanel" aria-labelledby="usageTab" hidden>
    <div class="sectionTitle"><h2>模型用量</h2><select id="usagePeriod" aria-label="统计范围"><option value="today">今天</option><option value="month" selected>本月</option><option value="all">全部</option></select><button id="refreshUsage" class="secondary">刷新</button></div>
    <p class="muted">统计启用后经过本适配器的请求。费用为本地估算，实际扣费以服务商账单为准。</p>
    <div id="quotaCards"></div><div id="usageSummary" class="metrics"></div><div id="usageRows"></div>
    <section class="card"><h2>计费单价与预算</h2><p class="help">每 100 万 Token 的单价。按模型分别设置，已有记录按当前单价估算；不含阶梯定价、缓存存储、优惠和税费。预算仅供跟踪，不会自动停止请求。</p><form id="pricingForm"><label>模型<select id="pricingModel"></select></label><div class="grid"><label>币种<select id="currency"><option value="USD">USD · 美元</option><option value="CNY">CNY · 人民币</option></select></label><label>每月预算（选填）<input id="monthlyBudget" type="number" min="0" step="any" placeholder="未设置"></label><label>输入单价<input id="inputRate" type="number" min="0" step="any" required></label><label>输出单价<input id="outputRate" type="number" min="0" step="any" required></label><label>缓存输入单价<input id="cachedRate" type="number" min="0" step="any" placeholder="留空沿用输入单价"></label></div><button type="submit">保存计费设置</button></form></section>
    <p class="help">GPT 套餐额度只展示官方返回的数据；Vertex 不在聊天响应中提供实际账单余额和项目配额，使用渠道旁的 Google 账单、配额入口查看。</p>
  </section>
</main><script nonce="${attr(nonce)}" src="${attr(script)}"></script></body></html>`;
}
