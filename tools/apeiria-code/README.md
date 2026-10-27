# Apeiria Code

独立的 VS Code 第三方模型编码助手，面向 Windows x64。官方 Codex 可同时保留，账号、设置、模型请求和历史各自管理。

## 安装与开始

1. 在 VS Code 扩展菜单选择“从 VSIX 安装”，选取 `apeiria-code-0.1.0-win32-x64.vsix`。
2. 点击活动栏的 Apeiria Code 图标，打开可信工作区。
3. 点击顶部齿轮，添加 OpenAI 兼容渠道或 Google Vertex Gemini。
4. 从输入框底部选择模型并开始聊天。首次配置模型后内核自动启动，无需官方登录。

首次安装若活动栏尚未显示图标，可运行 `Apeiria Code：打开聊天`。本扩展无需安装或启用官方 Codex。

## 模型提供商

OpenAI 兼容渠道支持 Chat Completions 与 Responses，基础地址填写服务商提供的 API 根地址，通常以 `/v1` 结尾。API Key 可留空，自定义 Authorization 会覆盖 Key 产生的 Bearer 认证。请求头支持新增、保留、替换和删除。HTTPS 和本机 HTTP 地址可用。

Vertex 支持粘贴服务账号 JSON 或从文件导入；导入后的凭证由本扩展安全存储，不依赖原文件路径。项目默认读取 JSON，地区默认 `global`，模型 ID 按项目实际可用型号填写。

每个渠道支持多个模型，以及显示名称、上下文容量、输出上限、图片输入和思考预设。兼容模型默认关闭图片，按实际能力启用。保存不调用生成接口；“测试连接”只检查模型目录或 Google OAuth，无法证明指定模型的生成权限。

API Key、Google JSON 和请求头值使用本扩展命名空间下的 VS Code SecretStorage。已保存的秘密不回填网页。编辑时留空保持原值，显式清除才删除。仅复制 `providers.json` 无法迁移凭证，换系统或 VS Code 用户后需重新配置。

## 日常编码

- 聊天支持流式文本、思考、停止生成、会话恢复、重命名与归档。
- “引用选区”可引用当前选区，无选区时引用整个打开的文件。普通文本附件上限 200 KB，图片上限 20 MB。
- 内核执行文件和命令工具；审批卡片显示操作内容，可允许、拒绝或取消。默认工作区写入、按需审批，设置中可切换只读模式。
- 文件改动可打开差异，终端输出在工具卡片中显示。
- 同一对话可切换模型，下一轮更新模型与上下文容量。更新模型目录时，仅重新加载本扩展当前会话。
- 设置中的压缩操作使用当前模型生成延续摘要，会产生该渠道的调用费用。摘要失败时保留原历史。
- 导出操作保存当前对话的可读文本和工具记录，适合手动移交，不会发起生成请求。

两个助手修改相同项目文件时仍会相互看到改动，并行任务可使用不同 Git worktree。

## MCP 与技能

设置中的 MCP 管理入口打开本扩展独立 `engine-home/config.toml`，例如：

```toml
[mcp_servers.local_tools]
command = "node"
args = ["D:/tools/server.js"]
```

保存后使用“重新连接内核”。MCP 启动与工具错误会按内核事件显示；表单式 elicitation 由界面和 VS Code 输入对话框处理。

技能管理入口打开独立 `engine-home/skills`。每个技能使用自己的文件夹及 `SKILL.md`。项目 `AGENTS.md` 与项目技能正常加载，外部用户级 Codex 技能显式禁用，个人技能分别维护。

## 隔离与数据

独立扩展 ID 为 `ayanami-local.apeiria-code`，命令和设置使用 `apeiriaCode.*`。数据保存在 VS Code 为本扩展分配的 `globalStorage` 目录；其中 `engine-home` 包含会话、数据库、技能与日志，其他子目录保存渠道元数据、工具签名及用量。

内核固定为 `0.164.0-alpha.11.1`，随 VSIX 分别打包，并根据 `engine/manifest.json` 校验全部运行文件。扩展只执行自己的内核，独立设置子进程环境、数据目录和数据库路径，宿主全局环境保持原样。官方扩展的文件与 `chatgpt.*` 设置均保持原样。

模型请求仅进入配置过的渠道；未知模型与配置错误直接失败。官方辅助后台地址指向本机拒绝端点，云插件发现、官方登录与套餐服务入口均未开放。模型服务商仍需支持编码所需的工具调用能力。

本机摘要采用独立 AES-GCM 密钥加密，`compaction.key` 与原会话应一并备份。Token 统计按实际响应保存，缺失用量会标注；它只覆盖本扩展处理的请求。

停止或卸载扩展不会删除会话与秘密存储。官方 Codex 继续使用自己的内核与账号。两版运行于同一操作系统和 VS Code，这属于应用数据与请求链路隔离。

## 开发与验证

```powershell
npm install
npm run bundle-engine -- "C:/path/to/licensed/windows-x86_64"
npm run typecheck
npm run build
npm test
node scripts/engine-smoke.mjs
npm run package
```

`bundle-engine` 仅接受固定版本，复制内核及必要资源，同时保存上游 LICENSE、NOTICE 和逐文件 SHA-256。构建后的插件无需源目录或官方扩展。

测试使用临时目录、临时秘密存储及本机模拟服务，不使用真实账号或付费模型。测试包含三种协议到真实内核的工具循环、审批、停止、压缩、跨模型切换和重启恢复。界面开发预览运行 `npm run preview`，打开 `http://127.0.0.1:19377/ui/preview.html`。

上游文档：[Codex app-server](https://learn.chatgpt.com/docs/app-server)、[配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)、[开源组件](https://learn.chatgpt.com/docs/open-source)。内核许可和 NOTICE 位于 VSIX 的 `engine` 目录，自有扩展源码采用 MIT 许可。
