# Codex 模型渠道

在 Codex 原有模型菜单中切换官网 GPT、Google Vertex Gemini 和其他第三方模型。保留官方 Codex 内核管理登录、会话、工具权限和历史记录；本扩展提供本机协议适配层，无需单独部署或手动启动网关。

## 使用

1. 安装本目录生成的 `codex-model-switchboard-0.4.1.vsix`。不再新增侧栏视图、顶部工具条或状态栏按钮。
2. 点击聊天输入框原有的 **GPT 模型名称**，直接在同一菜单里选择 GPT 或 `Vertex · 模型名`。选择沿用官方菜单的权限检查及切换回调，下一轮生效，不重载窗口、不重启内核、不切换账号。
3. 添加或编辑渠道时，直接点击输入框中、模型名称右侧常驻的 **模型配置** 按钮。它直达 JSON、项目和模型表单，不需要寻找官方设置页。模型菜单底部的 **管理渠道** 仍可使用。项目默认从 JSON 读取，地区默认 `global`，模型默认保留用户提供的 `gemini-4-argon`。保存不发送付费模型请求，也不代表已验证访问权限。
4. 下次打开模型菜单会重新获取列表，新保存的渠道直接出现；运行中的内核可使用新模型，不要求重载窗口。已有适配器升级后使用固定启动路径，不因安装目录版本变化要求重载。

首次从完全未接入的官方内核启用适配器，仍需重启内核连接一次。已经启用的用户切换、添加模型不需要重启。安装界面补丁后，已加载的旧聊天网页需刷新 Webview 才会载入新脚本；这与重载整个 VS Code 窗口不同。可使用 VS Code 的 **Developer: Reload Webviews** 命令。

第三方 API 可选择 **Responses API** 或 **Chat Completions API**，填写 API 基础地址、密钥和模型名。

## 思考强度

打开聊天输入框的模型菜单，在模型列表下方直接选择 **思考强度**。GPT 使用官方返回的档位，保留原生选择回调与权限限制；不再将自定义控件放入原生锁定提示区域。Gemini 4 Argon 自动提供低、中、高，转换为 Vertex 的 `generationConfig.thinkingConfig.thinkingLevel`；Gemini 2.5 使用 Token 预算（低 1024 / 中 8192 / 高 24576）。不向 Gemini 4 发送旧的预算参数，也不提供其不支持的 xhigh。

其他渠道默认不发送思考参数。若服务商支持，在 **模型配置 → 编辑渠道 → 各模型支持的思考档位** 中按型号设置；Responses 发送 `reasoning.effort`，Chat Completions 发送 `reasoning_effort`。不支持调整的型号显示服务商默认设置。修改档位与切换模型在下一轮请求生效，无需重载。升级适配器后台代码后，已运行的旧后台需重新连接一次才能加载新映射；固定启动路径只避免配置路径变动，不会热替换进程内代码。

参考：[Google 思考模式](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking)、[OpenAI Docs 推理参数](https://developers.openai.com/api/docs/guides/reasoning)。

## Vertex 稳定性

0.4.0 对照当前 Kilo 的 [Vertex 提供商](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/provider/provider.ts) 与 [重试逻辑](https://github.com/Kilo-Org/kilocode/blob/main/packages/opencode/src/session/retry.ts)，补齐限流恢复与多轮协议处理。仍然使用 Google 原生 `streamGenerateContent`，服务账号凭证与 GPT 登录相互独立。

- 429、408 和临时 5xx：首次之后最多重试两次，指数退避并加入随机延迟，遵守 `Retry-After`、毫秒响应头及 Google `RetryInfo`。单次等待超过 30 秒时直接显示建议等待时间，不提前请求。400、403 等配置/参数错误不会重复撞接口。Google 401 只刷新 Google 令牌一次。
- 仅在未收到任何模型内容前自动重试；思考内容、文本或工具调用已经开始时，失败直接报告，不重放可能已计费或执行的操作。流缺少结束标记不会被当成成功。等待和流读取均支持取消。
- 首字节等待上限 5 分钟，开始接收后的无数据等待上限 2 分钟。SSE 心跳也计入活动。不同请求共享令牌刷新时，取消一个请求不再影响其他请求。
- Google 的原生回复片段和签名按项目/地区/模型隔离保存，并在同模型的后续请求中完整回传，包括文本签名和并行工具次序。其他模型的签名不混用。中断、不完整或旧版无法确认来源的工具历史仅在请求转换时作为历史文本保留，不删除原始对话、不伪造工具执行结果。
- 失败对话显示 Google 状态、说明和字段校验错误，并遮盖令牌。`查看诊断` 中保存最近状态、重试和字段路径；不持久记录服务商错误正文（它可能回显对话）、提示词或密钥。完整原生回复缓存仅用于同模型签名回放，与用量记录分开。

限流也可能来自 Google 的共享容量或项目配额。适配器不能保证消除全部 429；达到重试上限后会如实报告。旧报错已丢失的 Google 错误正文不能还原。升级后台后，点击模型菜单中的 **加载适配器更新** 重新连接一次；之后调档和切换模型不需要重新连接。

参考：[Google API 错误](https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/models/api-errors)、[429 处理](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/deploy/error-code-429)、[思考签名](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/thinking/thought-signatures)。

## 上下文容量与对话压缩

0.4.1 修正 Gemini 4 Argon 默认窗口误报为 128,000 的问题。按 [Google 官方说明](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-4-argon)，该型号的统一输入与输出总容量为 1,048,576 tokens。模型目录现在报告这个总量，Codex 继续采用 95% 的有效窗口（996,147），留下超过默认 32,768 输出上限的余量。用户显式设置的 `contextWindow` 仍优先；未验证的其他型号保持原默认值。真实内核集成测试检查了生效后的容量。

可见聊天轮数不等于上下文大小。项目规则、工具说明、读取文件的返回内容和图片都会占用容量，短对话也可能包含大量输入。但容量设置偏小会导致过早压缩，不能将这种情况归咎于用户聊天过长。

0.5.0 实现当前 Codex 内核的 `compaction_trigger` 流程：使用当前第三方模型生成任务摘要，禁用工具，只有完整成功后才返回一个 `compaction` 项目。空摘要、截断、取消、网络失败或未知历史项目都会中止，不用残缺摘要替换工作上下文。摘要调用的 Token 和费用纳入本地统计。

摘要使用当前 Windows 用户的 DPAPI 加密，随 Codex 会话保存。适配器在发送给 Vertex、其他渠道或 GPT 前将自己生成的摘要还原为可读历史，支持递归压缩与重启恢复；本机密文不会作为官网密文发送。恢复这种摘要需要原 Windows 账号与本适配器，不保证停用适配器后的直接可用性。原始历史文件仍由 Codex 保存，适配器不直接改写它们。

官网自己生成的加密摘要仍无法在第三方模型解密，遇到时明确停止，不静默丢弃。需要从这种对话移交时，应先用 GPT 整理可读摘要，再带入新的第三方对话。旧 `/responses/compact` 专用端点不在当前 v2 实现范围内。

启动时只更新官方模型目录缓存中 `thirdparty/` 命名空间的条目，保留官网条目、身份和缓存时间，防止重启后仍使用旧上下文容量。模型菜单显示正在运行的后台版本。安装新文件或刷新网页不等于更新后台；首次加载这次后台更新仍需点击一次 **加载适配器更新**，待显示 **后台 0.5.0 · 压缩适配已加载** 后继续。日常切换模型无需重启。

## 用量与费用

点击原生模型菜单底部的 **用量与费用**，在菜单内展开本月 Token、费用估算和官方额度。旧内核未提供快照时，转到独立用量入口；详细统计与计费设置按需打开。这里按模型统计今天、本月和全部的请求次数、失败/中断次数、输入/输出、缓存和推理 Token。只统计启用后经过此适配器的请求，不能还原此前或其他客户端的使用量。每次工具调用的模型请求独立计数，预热请求不计入。用量缺失会明确标注，不会当作零费用。

Vertex 等付费模型可分别设置每百万 Token 的输入、缓存输入、输出单价与币种，以及可选的每月跟踪预算。已有记录按当前单价重算，推理 Token 包含在输出中，不重复计费。估算不含阶梯价格、缓存存储、图片等特殊定价、税费、优惠；预算不会自动停止请求。用量不完整时不显示误导性的预算余额。使用渠道卡片中的 **Google 账单** 查看实际账单，**项目配额** 查看服务商配额。

GPT 套餐额度按官方正常请求返回的数据展示剩余百分比和重置时间，并标记更新时间；兼容渠道返回标准 `x-ratelimit-remaining-requests/tokens` 响应头时，也会展示窗口剩余量和重置间隔。这些可能是多模型共享的额度。刷新本地页面不会主动查询或修改官网账号。Vertex 的聊天响应不提供账单余额或项目配额，不显示虚构余额。真实云账单导出通常需要另外启用 Cloud Billing 导出和权限，本扩展未自动查询该数据。

统计记录保存在独立的 `usage` 目录，只含模型 ID、时间、状态和用量；`usage-prices.json` 保存单价，`usage-quotas` 保存额度快照。统计不记录提示词、回复、账号 ID、JSON 私钥或 API 密钥。网页端也不接收服务账号 JSON 内容或已保存的密钥。

## 官网登录和历史

- 适配器不会执行登录、登出、替换账号或写入官网凭证。官方账号 RPC 原样交给官方内核。
- Vertex JSON 只记录用户选择的文件路径。其他渠道的 API 密钥使用 Windows 当前用户的 DPAPI 加密保存。
- 第三方的认证、配额、网络和配置错误以该渠道的失败响应返回，不转换为 OpenAI 的 401，也不触发账号切换。
- 不改变 `CODEX_HOME`、官方凭证存储方式或会话目录；既有对话仍由官方内核读取和保存。
- Gemini 工具签名单独保存在适配器目录，以支持重启后恢复工具调用。GPT 专属推理数据不会发给 Gemini。
- 配置和签名保存在 `%USERPROFILE%\.codex-model-switchboard`，与官方账号数据分开。不要将服务账号 JSON 放进代码仓库。

## 恢复

运行 **Codex 模型渠道：恢复官方内核**，然后重载窗口。该命令恢复启用前的 `chatgpt.cliExecutable` 设置，不删除登录、历史或第三方配置。也可以在 VS Code 设置中清除本扩展设置的 `chatgpt.cliExecutable`。

## 范围

当前安装包面向本机 Windows x64、Node.js 22 和 Codex VS Code 扩展，基于当前安装的 Codex `0.162.0-alpha.17.2` 测试。协议适配器独立运行；原生菜单通过对官方扩展 `26.51007.21434` 两个网页脚本的定点修改接入。未修改 Rust 内核、宿主扩展代码、登录、凭证、工具权限或历史存储。原文件按哈希备份到 `native-backups/26.51007.21434`，补丁日志保存每个文件的前后哈希。未知官方版本不会应用补丁，官方扩展更新后需重新验证适配。

文本、内嵌图片和普通编码工具已实现适配。跨供应商的附件、专属服务端工具和专属推理数据不保证互通；第三方模型的专用对话压缩尚未适配，参见上面的限制。不支持的请求会报告错误，保留原始历史。实际 Vertex 访问权限需在用户导入 JSON 后验证。

## 开发与验证

在本目录执行：

```powershell
npm install --cache .npm-cache
npm run typecheck
npm run build
npm test
npm run package
```

测试使用临时凭证和本机模拟服务，不使用用户的官网账号或 Google 凭证。集成测试启动真实官方 Codex 内核，验证带权限检查的 Gemini 工具调用、认证失败/配置失败/超时后的 GPT 切换，以及账号和历史保留。

协议参考：[Codex App Server](https://developers.openai.com/codex/app-server/)、[Vertex Gemini](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference)、[Gemini 思考签名](https://cloud.google.com/vertex-ai/generative-ai/docs/thought-signatures)。
