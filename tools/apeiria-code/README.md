# Apeiria Code 0.2

在同一个 VS Code 窗口中使用独立的 Codex 原生客户端，连接自己的第三方模型。活动栏保留官方 Codex，另有 Apeiria Code 入口，分别维护渠道、凭证、配置和会话。

0.2 使用固定版本 `26.1021.22027` 的 Codex 扩展客户端与网页资源，保留原生聊天界面、会话菜单、编辑器引用、工具卡片、审批、文件差异、设置与快捷操作。自写界面仅负责第三方模型提供商管理。原先 0.1 的自写聊天面板已经退出运行入口。

## 安装与开始

1. 在此目录运行 `powershell -ExecutionPolicy Bypass -File ./install-apeiria.ps1`，安装 `apeiria-code-0.2.0-win32-x64.vsix` 并启用该独立扩展需要的原生 API。安装脚本先备份 `argv.json`，只在 `enable-proposed-api` 列表加入 `ayanami-local.apeiria-code`，保留其他启动选项。
2. 完全退出并重新打开 VS Code，点击左侧 Apeiria Code 图标，或运行 `Apeiria Code：打开原生聊天`。
3. 点击齿轮中的“模型提供商”，添加 OpenAI 兼容或 Google Vertex Gemini 渠道。侧栏标题栏也提供管理齿轮。
4. 回到原生聊天，从输入框底部原有模型菜单选择已保存的模型。

官方 Codex 无需关闭、卸载或退出账号。新版无需 GPT 官方登录；独立安装后运行时也无需官方扩展处于启用状态。首次没有渠道时可以打开侧栏与设置，配置完成前不会发送模型生成请求。

也可手动从 VSIX 安装，并通过“首选项：配置运行时参数”在 `argv.json` 的 `enable-proposed-api` 数组中加入上述扩展 ID。原版的 VS Code Chat 会话和语言模型代理集成使用提议 API，独立 ID 需要单独启用。仅重载扩展窗口无法替代完整重启。

## 模型提供商

OpenAI 兼容渠道支持 Chat Completions 和 Responses，基础地址使用服务商提供的 API 根地址，通常以 `/v1` 结尾。API Key 可留空；自定义 Authorization 请求头优先于 API Key。支持多个渠道与多个模型、显示名称、上下文容量、输出上限、图片输入和思考档位。

Vertex Gemini 使用原生 Google 协议，支持粘贴或导入服务账号 JSON，项目默认读取 JSON 内的 `project_id`，地区默认 `global`，模型 ID 手动填写。导入后的凭证独立保存，不依赖原文件路径。

保存配置不会发送生成请求。“测试连接”只检查 OpenAI 模型目录或 Google OAuth 认证，测试结果会说明尚未验证指定模型的生成权限。渠道配置保存后，在当前任务完成时单独重连新版内核，更新原生模型目录；当前对话历史保留。同一对话切换已配置的模型后在下一轮生效。

API Key、服务账号 JSON、请求头值保存于本扩展专属 VS Code SecretStorage，已保存的秘密不回填网页。编辑时保留现有秘密，显式替换或清除才更新。仅复制 `providers.json` 无法迁移凭证。

## 原生编码能力与边界

聊天、流式文本、思考展示、停止、排队与追加指令、附件、历史恢复、文件引用、工具执行、审批与差异视图均由保留的原生客户端和固定版本 Codex CLI 承担。

模型目录继承相同内核内嵌的完整编码指令、Code Mode 和多代理 v2 机制。协议适配保留工具命名空间、子代理任务与返回结果、图片、推理内容、用量和上下文压缩。权限和 MCP 审批仍走 app-server 的原生请求。实际模型须支持相应工具调用和多模态能力；原生界面的保留无法使服务商获得其未提供的能力。

云任务、官方套餐额度、GPT 官方登录及依赖官方账号的在线服务需要继续在官方版中使用。新版关闭官方登录操作、官方上游回退、官方云插件目录与自动同步，辅助后台地址指向本机拒绝端点。原生客户端中依赖这些服务的部分入口可能仍可见，但不可用。

原生设置打开的是新版独立 `engine-home/config.toml`。MCP 放在其中的 `mcp_servers` 配置；个人技能放在独立 `engine-home/skills`。当前项目的指令、项目技能继续加载。官方用户目录的技能不会自动混入新版。

两版共用工作区文件与系统资源。并行改动同一项目时可分别使用 Git worktree；会话历史分别保存。

## 隔离与实现

扩展 ID 为 `ayanami-local.apeiria-code`，全部命令、设置、视图和会话类型使用独立命名空间。原生宿主通过局部 VS Code API 映射运行，不替换全局模块加载器，不写入其他扩展的设置，也不改变共享扩展宿主的环境变量。

新版自带 `0.164.0-alpha.11.1` 内核，运行前校验 `engine/manifest.json` 中的 SHA-256。CLI 启动器使用当前 VS Code 自带 Node 运行时，所有 Codex 子进程指定独立 `CODEX_HOME`，数据库、日志、模型目录和配置均位于新版 `globalStorage/engine-home`。本机接入层只接受其临时令牌，真实模型凭证由提供商层附加，官方账号凭证不会转发给第三方。

原生客户端资源位于 `native`，保留原许可及来源校验清单。运行副本只修改独立 IPC 名称、独立内核重连、渠道管理菜单、模型目录刷新通知、官方实验离线模式和语法标识；其余原生页面资源直接复用。宿主命令与 URI 等标识在本副本的 API 边界映射，官方安装文件保持原样。

## 开发

在 `tools/apeiria-code` 下运行：

```powershell
npm install
npm run bundle-engine -- "C:/path/to/licensed/bin/windows-x86_64"
npm run prepare-native -- "C:/path/to/installed/openai.chatgpt-26.1021.22027-win32-x64"
npm run prepare-native-models
npm run configure-native
npm run typecheck
npm run build
npm test
npm run package
```

只接受上述固定版本。客户端副本从本机已有安装准备，不会改动源安装；内核许可、NOTICE 和客户端原许可分别随包保存。`native/provenance.json` 记录复制来源与运行副本校验值。自有集成代码采用 MIT，原生客户端保留其原许可，不重新授权为 MIT。

测试使用临时目录、临时秘密存储和本机模拟服务，不使用真实模型凭证或付费生成。`test/native-baseline-live.test.ts` 检查三种协议经过实际内核的 Code Mode、工具与审批；`test/native-multiagent-live.test.ts` 检查真实子代理协作；`test/native-runtime.test.ts` 检查完整 stdio 协议、无渠道首次启动与动态模型目录。

`node scripts/native-vscode-smoke.cjs` 使用独立测试配置启动真实 VS Code，`scripts/native-render-smoke.mjs` 仅检查专用本机调试端口上的测试实例。`scripts/isolation-snapshot.mjs` 对官方安装关键文件与配置作前后指纹核验。

上游资料：[Codex app-server](https://learn.chatgpt.com/docs/app-server)、[Codex 开源组件范围](https://learn.chatgpt.com/docs/open-source)、[VS Code 提议 API](https://code.visualstudio.com/api/advanced-topics/using-proposed-api)。
