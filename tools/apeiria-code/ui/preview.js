/* Local UI fixture only. This file is never loaded by the VS Code extension. */
(() => {
  const blank = new URLSearchParams(location.search).has('empty');
  const state = {
    providers: blank
      ? []
      : [
          {
            id: 'private',
            label: '私有模型服务',
            type: 'chat-completions',
            baseUrl: 'https://example.invalid/v1',
            models: ['coding-pro'],
            modelMetadata: { 'coding-pro': { displayName: 'Coding Pro', contextWindow: 200000, imageInput: false } },
            reasoning: { 'coding-pro': 'low-medium-high' },
            enabled: true,
            hasKey: true,
            hasCredentials: false,
            headerNames: ['x-project'],
          },
          {
            id: 'vertex',
            label: 'Google Vertex',
            type: 'vertex',
            project: 'my-cloud-project',
            location: 'global',
            models: ['gemini-example'],
            modelMetadata: { 'gemini-example': { displayName: 'Gemini', imageInput: true } },
            enabled: true,
            hasKey: false,
            hasCredentials: true,
            headerNames: [],
          },
        ],
    models: blank
      ? []
      : [
          {
            id: 'thirdparty/private/coding-pro',
            label: '私有模型服务 · Coding Pro',
            providerId: 'private',
            efforts: ['low', 'medium', 'high'],
            imageInput: false,
          },
          {
            id: 'thirdparty/vertex/gemini-example',
            label: 'Google Vertex · Gemini',
            providerId: 'vertex',
            efforts: ['low', 'medium', 'high'],
            imageInput: true,
          },
        ],
    threads: blank
      ? []
      : [
          {
            id: 'thread-example',
            name: '修整流式消息滚动',
            preview: '阅读 use-stream-follow 的行为，并完善边界处理。',
            updatedAt: Date.now(),
          },
          {
            id: 'thread-older',
            name: '梳理项目结构',
            preview: '前端入口、组件与状态逻辑。',
            updatedAt: Date.now() - 86400000,
          },
        ],
    items: blank
      ? []
      : [
          {
            id: 'user-1',
            role: 'user',
            type: 'userMessage',
            text: '请检查流式消息的滚动逻辑，让阅读上方内容时保持当前位置。',
          },
          {
            id: 'reasoning-1',
            type: 'reasoning',
            status: 'completed',
            text: '先读取组件和调用位置，确认跟随状态怎样更新，再处理滚动与视口变化。',
          },
          {
            id: 'tool-1',
            type: 'commandExecution',
            command: 'rg "stream-follow" src',
            cwd: 'D:\\Projects\\Apeiria',
            status: 'completed',
            text: 'src/components/MessageView.vue:14:import { useStreamFollow } from "../composables/use-stream-follow";\nsrc/composables/use-stream-follow.ts:1:export function useStreamFollow() {',
          },
          {
            id: 'agent-1',
            type: 'agentMessage',
            role: 'assistant',
            text: '已检查滚动状态。用户滚动离开底部后，新增文本会保留当前阅读位置；回到底部后恢复跟随。\n\n### 调整内容\n\n- 给自动跟随设置明确的距离阈值。\n- 图片加载和面板变化后重新计算位置。\n- 增加“回到最新消息”入口。\n\n```typescript\nconst nearBottom = scrollHeight - scrollTop - clientHeight < 70;\n```\n\n可在 `use-stream-follow.ts` 中查看修改。',
          },
          {
            id: 'files-1',
            type: 'fileChange',
            status: 'completed',
            changes: [{ path: 'src/composables/use-stream-follow.ts', kind: 'update' }],
          },
        ],
    attachments: [],
    pending: [],
    threadId: blank ? null : 'thread-example',
    model: blank ? '' : 'thirdparty/private/coding-pro',
    effort: 'medium',
    busy: false,
    engineStatus: '已连接',
    workspace: 'D:\\Projects\\Apeiria',
    permissions: 'workspace-write',
    usage: { inputTokens: 3920, outputTokens: 687 },
  };
  const notify = (message, error = false) =>
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'notice', message, error } }));
  const update = () =>
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'state', state: structuredClone(state) } }));
  const reply = (message, data, ok = true) =>
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'result', requestId: message.requestId, ok, data } }),
    );
  window.acquireVsCodeApi = () => ({
    getState: () => null,
    setState() {},
    postMessage(message) {
      setTimeout(() => {
        switch (message.action) {
          case 'ready':
            update();
            break;
          case 'selectModel':
            state.model = message.model;
            state.effort = message.effort;
            update();
            break;
          case 'newThread':
            state.items = [];
            state.pending = [];
            state.threadId = null;
            update();
            break;
          case 'selectThread':
            state.threadId = message.id;
            update();
            break;
          case 'send':
            state.items.push({ id: `user-${Date.now()}`, type: 'userMessage', role: 'user', text: message.text });
            state.busy = true;
            state.attachments = [];
            update();
            setTimeout(() => {
              state.items.push({
                id: `agent-${Date.now()}`,
                type: 'agentMessage',
                role: 'assistant',
                text: '这是本地预览的模拟回复。正式扩展会由您配置的模型处理消息。',
              });
              state.busy = false;
              update();
            }, 800);
            break;
          case 'stop':
            state.busy = false;
            update();
            break;
          case 'setPermissions':
            state.permissions = message.permissions;
            update();
            break;
          case 'attachSelection':
            state.attachments.push({ id: `${Date.now()}`, name: 'use-stream-follow.ts:1-14', kind: 'selection' });
            update();
            break;
          case 'attachFiles':
            state.attachments.push({ id: `${Date.now()}`, name: 'example.ts', kind: 'file' });
            update();
            break;
          case 'removeAttachment':
            state.attachments = state.attachments.filter(item => item.id !== message.id);
            update();
            break;
          case 'toggleProvider': {
            const provider = state.providers.find(item => item.id === message.id);
            if (provider) provider.enabled = !provider.enabled;
            update();
            break;
          }
          case 'removeProvider':
            state.providers = state.providers.filter(item => item.id !== message.id);
            update();
            break;
          case 'saveProvider': {
            const draft = message.draft;
            const id = draft.id || 'preview-provider';
            const provider = {
              ...draft,
              id,
              enabled: true,
              hasKey: !!draft.apiKey,
              hasCredentials: !!draft.serviceAccountJson,
              headerNames: (draft.headers || []).filter(item => !item.remove).map(item => item.name),
            };
            delete provider.apiKey;
            delete provider.serviceAccountJson;
            delete provider.headers;
            const index = state.providers.findIndex(item => item.id === id);
            if (index < 0) state.providers.push(provider);
            else state.providers[index] = provider;
            state.models = state.providers
              .filter(item => item.enabled)
              .flatMap(item =>
                item.models.map(model => ({
                  id: `thirdparty/${item.id}/${model}`,
                  label: `${item.label} · ${item.modelMetadata?.[model]?.displayName || model}`,
                  providerId: item.id,
                  efforts: ['low', 'medium', 'high'],
                  imageInput: !!item.modelMetadata?.[model]?.imageInput,
                })),
              );
            if (!state.model) state.model = state.models[0]?.id || '';
            update();
            reply(message, { id });
            break;
          }
          case 'testProvider':
            reply(message, '模拟连接测试通过；尚未验证模型生成权限。');
            break;
          case 'importJson':
            reply(message, {
              json: '{\n  "project_id": "example-project",\n  "client_email": "preview@example.invalid",\n  "private_key": "PREVIEW ONLY"\n}',
              project: 'example-project',
            });
            break;
          case 'renameThread': {
            const thread = state.threads.find(item => item.id === message.id);
            if (thread) thread.name = message.name;
            update();
            break;
          }
          case 'archiveThread':
            state.threads = state.threads.filter(item => item.id !== message.id);
            update();
            break;
          case 'approval':
            state.pending = state.pending.filter(item => item.id !== message.id);
            update();
            break;
          default:
            notify(`预览操作：${message.action}`);
            if (message.requestId) reply(message, {});
        }
      }, 10);
    },
  });
  window.apeiriaPreview = {
    state,
    update,
    approval() {
      state.pending.push({
        id: 'approval-fixture',
        method: 'item/commandExecution/requestApproval',
        params: { command: 'npm run test', reason: '需要运行测试，确认变更符合预期。' },
      });
      update();
    },
    question() {
      state.pending.push({
        id: 'question-fixture',
        method: 'item/tool/requestUserInput',
        params: {
          questions: [
            {
              id: 'display',
              header: '显示方式',
              question: '请选择消息展示方式',
              options: [
                { label: '紧凑', description: '让侧栏一次显示更多内容。' },
                { label: '舒展', description: '增加留白，方便阅读。' },
              ],
            },
          ],
        },
      });
      update();
    },
  };
})();
