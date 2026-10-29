import {
  createApp,
  computed,
  h,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type VNodeChild,
} from 'vue';
import type { ChatItem, ModelMetadata, PendingRequest, ProviderDraft, ProviderView, UiState } from '../src/types.ts';
import { markdown } from './markdown.ts';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const vscode = acquireVsCodeApi();
const managementOnly = document.documentElement.dataset.apeiriaMode === 'providers';
type ModelRow = ModelMetadata & { id: string; reasoningPreset?: string };
type HeaderRow = { name: string; value: string; existing?: boolean; remove?: boolean };
type EditorDraft = {
  id: string;
  label: string;
  type: ProviderDraft['type'];
  baseUrl: string;
  project: string;
  location: string;
  apiKey: string;
  clearKey: boolean;
  serviceAccountJson: string;
  models: ModelRow[];
  headers: HeaderRow[];
};
const initialState: UiState = {
  providers: [],
  models: [],
  threads: [],
  items: [],
  attachments: [],
  pending: [],
  threadId: null,
  model: '',
  effort: '',
  busy: false,
  engineStatus: '正在启动',
  workspace: '',
  permissions: 'workspace-write',
};
const emptyDraft = (): EditorDraft => ({
  id: '',
  label: '',
  type: 'chat-completions',
  baseUrl: '',
  project: '',
  location: 'global',
  apiKey: '',
  clearKey: false,
  serviceAccountJson: '',
  models: [{ id: '', displayName: '', imageInput: false }],
  headers: [],
});
let requestCount = 0;
const callbacks = new Map<
  string,
  { resolve(value: any): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }
>();
function post(action: string, payload: Record<string, unknown> = {}) {
  vscode.postMessage({ action, ...payload });
}
function request(action: string, payload: Record<string, unknown> = {}): Promise<any> {
  const requestId = `ui-${++requestCount}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      callbacks.delete(requestId);
      reject(new Error('操作等待超时，请重试。'));
    }, 60000);
    callbacks.set(requestId, { resolve, reject, timer });
    vscode.postMessage({ action, requestId, ...payload });
  });
}
const paths: Record<string, string> = {
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-.1 1.5 1.6 1.2-1.6 2.8-1.9-.7-2.6 1.5-.3 2H9l-.4-2-2.5-1.5-1.9.7-1.6-2.8L4.2 13v-2L2.6 9.8 4.2 7l1.9.7 2.5-1.5L9 4h6l.4 2.2 2.5 1.5 1.9-.7 1.6 2.8-1.6 1.2.2 1Z',
  plus: 'M12 5v14M5 12h14',
  history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2',
  close: 'm6 6 12 12M18 6 6 18',
  arrow: 'M12 19V5m-6 6 6-6 6 6',
  stop: 'M6 6h12v12H6z',
  paperclip: 'm8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
  check: 'm5 12 4 4L19 6',
  chevron: 'm6 9 6 6 6-6',
  back: 'm14 6-6 6 6 6',
  trash: 'M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7m4-7v7',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6',
  terminal: 'm5 6 6 6-6 6m8 0h6',
  more: 'M5 12h.1M12 12h.1M19 12h.1',
  export: 'M12 15V3m-4 4 4-4 4 4M5 13v7h14v-7',
  bolt: 'm13 2-8 12h6l-1 8 9-13h-7z',
  refresh: 'M20 11a8 8 0 0 0-14-5L3 9m0-6v6h6m-5 4a8 8 0 0 0 14 5l3-3m0 6v-6h-6',
  shield: 'M12 3 4 6v5c0 5 8 10 8 10s8-5 8-10V6z',
  edit: 'm15 4 5 5-11 11H4v-5zM13 6l5 5',
  globe: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM3 12h18M12 3c5 6 5 12 0 18-5-6-5-12 0-18Z',
};
function icon(name: string) {
  return h(
    'svg',
    {
      width: 18,
      height: 18,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': 1.6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': true,
    },
    [h('path', { d: paths[name] || paths.code })],
  );
}
function button(
  label: string,
  onClick: () => void,
  options: { icon?: string; class?: string; disabled?: boolean; title?: string } = {},
) {
  return h(
    'button',
    {
      type: 'button',
      class: options.class || '',
      disabled: options.disabled,
      title: options.title || label,
      'aria-label': label,
      onClick,
    },
    [options.icon ? icon(options.icon) : null, /\b(icon-button|send-button)\b/.test(options.class || '') ? null : h('span', label)],
  );
}
function textInput(
  value: string | number | undefined,
  onInput: (value: string) => void,
  options: Record<string, unknown> = {},
) {
  return h('input', {
    value: value ?? '',
    onInput: (event: Event) => onInput((event.target as HTMLInputElement).value),
    ...options,
  });
}
function field(label: string, control: VNodeChild, hint?: string) {
  return h('label', { class: 'field' }, [
    h('span', { class: 'field-label' }, label),
    control,
    hint ? h('span', { class: 'field-hint' }, hint) : null,
  ]);
}
function select(
  value: string,
  onChange: (value: string) => void,
  options: { value: string; label: string; disabled?: boolean }[],
  attributes: Record<string, unknown> = {},
) {
  return h(
    'select',
    { value, onChange: (event: Event) => onChange((event.target as HTMLSelectElement).value), ...attributes },
    options.map(option => h('option', { value: option.value, disabled: option.disabled }, option.label)),
  );
}
function checkbox(label: string, value: boolean, onChange: (value: boolean) => void) {
  return h('label', { class: 'checkbox' }, [
    h('input', {
      type: 'checkbox',
      checked: value,
      onChange: (event: Event) => onChange((event.target as HTMLInputElement).checked),
    }),
    h('span', label),
  ]);
}
function shortJson(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

createApp({
  setup() {
    const state = reactive<UiState>({ ...initialState });
    const persisted = vscode.getState() as { text?: string } | null;
    const text = ref(persisted?.text || '');
    const page = ref<'chat' | 'settings' | 'history'>(managementOnly ? 'settings' : 'chat');
    const settingsTab = ref<'providers' | 'tools' | 'about'>('providers');
    const editing = ref(false);
    const draft = reactive<EditorDraft>(emptyDraft());
    const editingProvider = ref<ProviderView | null>(null);
    const notice = ref<{ text: string; error: boolean } | null>(null);
    const operation = ref('');
    const formError = ref('');
    const showAdvanced = ref(false);
    const moreOpen = ref(false);
    const search = ref('');
    const renaming = ref('');
    const renameValue = ref('');
    const deletingProvider = ref('');
    const approvalAnswers = reactive<Record<string, Record<string, string>>>({});
    const scroller = ref<HTMLElement>();
    const composer = ref<HTMLTextAreaElement>();
    const follow = ref(true);
    const noticeTimer = ref<ReturnType<typeof setTimeout>>();
    const selectedModel = computed(() => state.models.find(model => model.id === state.model));
    const filteredThreads = computed(() =>
      state.threads.filter(
        thread =>
          !thread.archived &&
          `${thread.name} ${thread.preview}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
      ),
    );
    const activeThread = computed(() => state.threads.find(thread => thread.id === state.threadId));
    const notify = (message: string, error = false) => {
      notice.value = { text: message, error };
      clearTimeout(noticeTimer.value);
      if (!error)
        noticeTimer.value = setTimeout(() => {
          notice.value = null;
        }, 6000);
    };
    const perform = async (
      name: string,
      action: string,
      data: Record<string, unknown> = {},
      onSuccess?: (result: any) => void,
    ) => {
      operation.value = name;
      formError.value = '';
      try {
        const result = await request(action, data);
        onSuccess?.(result);
      } catch (error) {
        formError.value = (error as Error).message;
        notify((error as Error).message, true);
      } finally {
        operation.value = '';
      }
    };
    const resize = () => {
      if (composer.value) {
        composer.value.style.height = 'auto';
        composer.value.style.height = `${Math.min(composer.value.scrollHeight, 220)}px`;
      }
    };
    const send = () => {
      if (state.busy || !state.model || (!text.value.trim() && !state.attachments.length)) return;
      post('send', { text: text.value.trim() });
      text.value = '';
      nextTick(resize);
      follow.value = true;
    };
    const openSettings = () => {
      page.value = 'settings';
      editing.value = false;
      moreOpen.value = false;
    };
    const editProvider = (provider?: ProviderView) => {
      Object.assign(draft, emptyDraft());
      editingProvider.value = provider || null;
      formError.value = '';
      showAdvanced.value = false;
      if (provider)
        Object.assign(draft, {
          id: provider.id,
          label: provider.label,
          type: provider.type,
          baseUrl: provider.baseUrl || '',
          project: provider.project || '',
          location: provider.location || 'global',
          models: provider.models.map(id => ({
            id,
            ...(provider.modelMetadata?.[id] || {}),
            reasoningPreset: provider.reasoning?.[id] || 'auto',
          })),
          headers: provider.headerNames.map(name => ({ name, value: '', existing: true })),
        });
      editing.value = true;
      nextTick(() => document.getElementById('provider-label')?.focus());
    };
    const providerDraft = (): ProviderDraft => {
      const ids = draft.models.map(row => row.id.trim()).filter(Boolean);
      const modelMetadata: Record<string, ModelMetadata> = {};
      for (const row of draft.models)
        if (row.id.trim())
          modelMetadata[row.id.trim()] = {
            displayName: row.displayName?.trim() || undefined,
            contextWindow: row.contextWindow || undefined,
            maxOutputTokens: row.maxOutputTokens || undefined,
            imageInput: !!row.imageInput,
          };
      return {
        id: draft.id.trim() || undefined,
        label: draft.label.trim(),
        type: draft.type,
        baseUrl: draft.type === 'vertex' ? undefined : draft.baseUrl.trim(),
        project: draft.project.trim() || undefined,
        location: draft.location.trim() || 'global',
        apiKey: draft.apiKey || undefined,
        clearKey: draft.clearKey,
        serviceAccountJson: draft.serviceAccountJson.trim() || undefined,
        models: ids,
        modelMetadata,
        headers: draft.headers
          .map(row => ({ name: row.name.trim(), value: row.value || undefined, remove: row.remove }))
          .filter(row => row.name),
        reasoning: Object.fromEntries(
          draft.models.filter(row => row.id.trim()).map(row => [row.id.trim(), row.reasoningPreset || 'auto']),
        ),
      };
    };
    const validate = () => {
      const value = providerDraft();
      if (!value.label) return '请填写渠道名称。';
      if (value.id && !/^[a-z0-9][a-z0-9_-]*$/.test(value.id))
        return '渠道 ID 仅支持小写字母、数字、下划线及连字符，以字母或数字开头。';
      if (!value.models.length) return '请至少添加一个模型 ID。';
      if (value.models.length !== new Set(value.models).size) return '同一渠道内的模型 ID 不能重复。';
      if (
        draft.models.some(
          row =>
            row.id.trim() &&
            ((row.contextWindow !== undefined && row.contextWindow <= 0) ||
              (row.maxOutputTokens !== undefined && row.maxOutputTokens <= 0)),
        )
      )
        return '上下文容量和输出上限应填写正整数，或留空。';
      if (value.type !== 'vertex') {
        try {
          const url = new URL(value.baseUrl || '');
          if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error();
        } catch {
          return '请填写有效的 HTTP 或 HTTPS 基础 URL。';
        }
      }
      if (value.type === 'vertex' && !editingProvider.value?.hasCredentials && !value.serviceAccountJson)
        return '请粘贴或导入服务账号 JSON。';
      if (value.serviceAccountJson) {
        try {
          const account = JSON.parse(value.serviceAccountJson);
          if (!account.client_email || !account.private_key) return '服务账号 JSON 缺少 client_email 或 private_key。';
        } catch {
          return '服务账号 JSON 格式无效。';
        }
      }
      const names = value.headers?.filter(row => !row.remove).map(row => row.name.toLowerCase()) || [];
      if (new Set(names).size !== names.length) return '自定义请求头名称不能重复。';
      if (value.headers?.some(row => !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(row.name) || /[\r\n]/.test(row.value || '')))
        return '请求头名称或值包含无效字符。';
      return '';
    };
    const saveProvider = () => {
      formError.value = validate();
      if (formError.value) return;
      void perform('保存', 'saveProvider', { draft: providerDraft() }, () => {
        draft.apiKey = '';
        draft.serviceAccountJson = '';
        draft.headers.forEach(row => {
          row.value = '';
        });
        editing.value = false;
        notify('渠道已保存，可在聊天下方选择模型。');
      });
    };
    const testProvider = () => {
      formError.value = validate();
      if (formError.value) return;
      void perform('测试连接', 'testProvider', { draft: providerDraft() }, result =>
        notify(
          typeof result === 'string'
            ? result
            : result?.message ||
                (draft.type === 'vertex'
                  ? 'Google 身份验证通过；模型生成权限尚未验证。'
                  : '模型目录连接成功；模型生成权限尚未验证。'),
        ),
      );
    };
    const importJson = () => {
      void perform('导入', 'importJson', {}, result => {
        if (result?.json) {
          draft.serviceAccountJson = result.json;
          if (!draft.project && result.project) draft.project = result.project;
        }
      });
    };
    const onMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'navigate' && ['settings', 'chat', 'history'].includes(message.page)) {
        page.value = message.page;
        if (message.page === 'settings') {
          editing.value = false;
          settingsTab.value = 'providers';
        }
      } else if (message.type === 'state' && message.state) {
        Object.assign(state, message.state);
        const pendingIds = new Set(state.pending.map(pending => String(pending.id)));
        for (const id of Object.keys(approvalAnswers)) if (!pendingIds.has(id)) delete approvalAnswers[id];
        for (const id of pendingIds) if (!approvalAnswers[id]) approvalAnswers[id] = {};
        if (follow.value) void nextTick(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight }));
      } else if (message.type === 'notice') notify(String(message.message), !!message.error);
      else if (message.type === 'result') {
        const callback = callbacks.get(message.requestId);
        if (!callback) return;
        clearTimeout(callback.timer);
        callbacks.delete(message.requestId);
        if (message.ok) callback.resolve(message.data);
        else callback.reject(new Error(message.message || '操作失败。'));
      }
    };
    watch(text, value => {
      vscode.setState({ text: value });
      void nextTick(resize);
    });
    onMounted(() => {
      window.addEventListener('message', onMessage);
      post('ready');
      resize();
    });
    onBeforeUnmount(() => {
      window.removeEventListener('message', onMessage);
      clearTimeout(noticeTimer.value);
      for (const callback of callbacks.values()) {
        clearTimeout(callback.timer);
        callback.reject(new Error('界面已关闭。'));
      }
      callbacks.clear();
    });

    const renderHeader = () =>
      h('header', { class: 'app-header' }, [
        h('div', { class: 'brand' }, [
          h('span', { class: 'brand-mark', 'aria-hidden': true }, 'A'),
          h('div', [h('strong', 'APEIRIA'), h('span', 'CODE')]),
        ]),
        h('div', { class: 'header-actions' }, [
          button(
            '对话历史',
            () => {
              page.value = page.value === 'history' ? 'chat' : 'history';
              editing.value = false;
            },
            { icon: 'history', class: `icon-button ${page.value === 'history' ? 'active' : ''}` },
          ),
          button('模型与设置', openSettings, {
            icon: 'gear',
            class: `icon-button ${page.value === 'settings' ? 'active' : ''}`,
          }),
          button(
            '新建对话',
            () => {
              post('newThread');
              page.value = 'chat';
            },
            { icon: 'plus', class: 'icon-button', disabled: state.busy },
          ),
        ]),
      ]);
    const renderNotice = () =>
      notice.value
        ? h(
            'div',
            { class: ['notice', notice.value.error ? 'error' : ''], role: notice.value.error ? 'alert' : 'status' },
            [
              h('span', notice.value.text),
              button(
                '关闭提示',
                () => {
                  notice.value = null;
                },
                { icon: 'close', class: 'icon-button small' },
              ),
            ],
          )
        : null;
    const renderApproval = (pending: PendingRequest) => {
      const params = pending.params;
      const isQuestions = pending.method.includes('requestUserInput');
      const isElicitation = pending.method.toLowerCase().includes('elicitation');
      const kind = pending.method.includes('fileChange')
        ? '文件修改审批'
        : pending.method.includes('command')
          ? '命令执行审批'
          : isQuestions
            ? '需要补充信息'
            : isElicitation
              ? 'MCP 请求信息'
              : '工具操作审批';
      const answerId = String(pending.id);
      const questions = Array.isArray(params.questions) ? params.questions : [];
      return h('section', { class: 'approval-card', key: answerId, 'aria-label': kind }, [
        h('div', { class: 'approval-title' }, [icon('shield'), h('strong', kind)]),
        h(
          'p',
          String(
            params.reason ||
              params.message ||
              (isQuestions
                ? '请填写答案以继续。'
                : isElicitation
                  ? '接收后将在系统输入框中填写工具请求的信息。'
                  : '请确认此操作是否可以继续。'),
          ),
        ),
        params.command
          ? h(
              'pre',
              { class: 'terminal-output' },
              typeof params.command === 'string' ? params.command : shortJson(params.command),
            )
          : null,
        isQuestions
          ? questions.map((question: Record<string, any>) => {
              const id = String(question.id || question.header || question.question);
              const current = approvalAnswers[answerId][id] || '';
              return h('div', { class: 'approval-question', key: id }, [
                h('label', { class: 'field-label' }, String(question.question || question.header || id)),
                Array.isArray(question.options)
                  ? h(
                      'div',
                      { class: 'question-options' },
                      question.options.map((option: Record<string, any>) =>
                        h(
                          'button',
                          {
                            type: 'button',
                            class: current === option.label ? 'selected' : '',
                            onClick: () => {
                              approvalAnswers[answerId][id] = option.label;
                            },
                          },
                          [
                            h('strong', String(option.label)),
                            option.description ? h('span', String(option.description)) : null,
                          ],
                        ),
                      ),
                    )
                  : null,
                textInput(
                  current,
                  value => {
                    approvalAnswers[answerId][id] = value;
                  },
                  {
                    placeholder: '填写回答',
                    'aria-label': String(question.question || question.header || id),
                    type: question.isSecret ? 'password' : 'text',
                    autocomplete: question.isSecret ? 'new-password' : 'off',
                  },
                ),
              ]);
            })
          : null,
        params.changes ? h('pre', shortJson(params.changes)) : null,
        h(
          'div',
          { class: 'button-row' },
          isQuestions
            ? [
                button(
                  '提交回答',
                  () =>
                    post('approval', {
                      id: pending.id,
                      decision: 'answers',
                      answers: Object.fromEntries(
                        questions.map((question: Record<string, any>) => {
                          const id = String(question.id || question.header || question.question);
                          return [id, { answers: [approvalAnswers[answerId][id] || ''] }];
                        }),
                      ),
                    }),
                  {
                    class: 'primary',
                    disabled: questions.some(
                      (question: Record<string, any>) =>
                        !(
                          approvalAnswers[answerId][String(question.id || question.header || question.question)] || ''
                        ).trim(),
                    ),
                  },
                ),
              ]
            : [
                button(
                  isElicitation ? '接收并填写' : '允许本次',
                  () => post('approval', { id: pending.id, decision: 'accept' }),
                  { class: 'primary' },
                ),
                !isElicitation
                  ? button('本会话允许', () => post('approval', { id: pending.id, decision: 'acceptForSession' }))
                  : null,
                button('拒绝', () => post('approval', { id: pending.id, decision: 'decline' }), {
                  class: 'danger-text',
                }),
                isElicitation ? button('取消', () => post('approval', { id: pending.id, decision: 'cancel' })) : null,
              ],
        ),
      ]);
    };
    const renderItem = (item: ChatItem) => {
      const type = item.type.toLowerCase();
      if (type.includes('reasoning'))
        return h('details', { class: 'reasoning item', key: item.id, open: item.status === 'inProgress' }, [
          h('summary', [
            h('span', { class: item.status === 'inProgress' ? 'pulse' : '' }, '✦'),
            ' 思考',
            item.status === 'inProgress' ? h('span', { class: 'muted' }, '进行中') : null,
          ]),
          h('div', { class: 'markdown reasoning-body' }, markdown(item.text || '')),
        ]);
      if (type.includes('command') || type.includes('terminal'))
        return h(
          'details',
          { class: 'tool-card item', key: item.id, open: item.status === 'inProgress' || item.status === 'failed' },
          [
            h('summary', [
              icon('terminal'),
              h('span', { class: 'tool-title' }, item.command || '命令执行'),
              h('span', { class: `status ${item.status || ''}` }, statusLabel(item.status)),
            ]),
            item.cwd ? h('div', { class: 'tool-cwd' }, item.cwd) : null,
            h('pre', { class: 'terminal-output' }, item.text || '等待输出…'),
          ],
        );
      if (type.includes('filechange') || type.includes('patch'))
        return h('section', { class: 'tool-card item', key: item.id }, [
          h('div', { class: 'tool-heading' }, [
            icon('file'),
            h('strong', '文件修改'),
            h('span', { class: 'status' }, statusLabel(item.status)),
          ]),
          ...(item.changes || []).map((change, index) =>
            h('div', { class: 'change-row', key: index }, [
              button(
                String(change.path || change.file || `文件 ${index + 1}`),
                () => post('openFile', { path: change.path || change.file }),
                { class: 'file-link', icon: 'file' },
              ),
              button('查看差异', () => post('openDiff', { itemId: item.id, index }), { class: 'small secondary' }),
            ]),
          ),
          item.text ? h('div', { class: 'markdown' }, markdown(item.text)) : null,
        ]);
      if (item.role === 'user' || type === 'usermessage')
        return h('article', { class: 'message user-message item', key: item.id }, [
          h('div', { class: 'message-label' }, '你'),
          h('div', { class: 'markdown' }, markdown(item.text || '')),
        ]);
      if (item.role === 'assistant' || type === 'agentmessage' || type === 'assistant')
        return h('article', { class: 'message assistant-message item', key: item.id }, [
          h('div', { class: 'message-label' }, [h('span', { class: 'tiny-mark' }, 'A'), 'Apeiria']),
          h('div', { class: 'markdown' }, markdown(item.text || (state.busy ? '…' : ''))),
        ]);
      return h('details', { class: 'tool-card item', key: item.id }, [
        h('summary', [
          icon('bolt'),
          h('span', { class: 'tool-title' }, toolLabel(item.type)),
          h('span', { class: 'status' }, statusLabel(item.status)),
        ]),
        h(
          'div',
          { class: 'markdown tool-body' },
          markdown(item.text || (item.raw ? shortJson(item.raw) : '操作已记录。')),
        ),
      ]);
    };
    const renderEmpty = () =>
      h('div', { class: 'empty-chat' }, [
        h('div', { class: 'empty-logo', 'aria-hidden': true }, 'A'),
        h('h1', '从一个想法开始'),
        h('p', '把问题交给模型，一起读代码、理思路、完成修改。'),
        !state.models.length
          ? h('div', { class: 'onboarding-card' }, [
              h('span', { class: 'eyebrow' }, '开始前的一小步'),
              h('h2', '连接你的模型'),
              h('p', '添加 OpenAI 兼容渠道，或使用 Google Vertex Gemini。'),
              button(
                '添加模型提供商',
                () => {
                  openSettings();
                  editProvider();
                },
                { class: 'primary', icon: 'plus' },
              ),
              h('span', { class: 'privacy-note' }, '独立保存配置与凭证，使用自己的模型。'),
            ])
          : h(
              'div',
              { class: 'suggestions' },
              ['梳理这个项目的结构与入口', '检查当前代码可能存在的问题', '根据需求完成一个小功能'].map(suggestion =>
                button(
                  suggestion,
                  () => {
                    text.value = suggestion;
                    void nextTick(() => composer.value?.focus());
                  },
                  { class: 'suggestion', icon: 'code' },
                ),
              ),
            ),
      ]);
    const renderComposer = () =>
      h('footer', { class: 'composer-area' }, [
        state.attachments.length
          ? h(
              'div',
              { class: 'attachments', 'aria-label': '已附加的上下文' },
              state.attachments.map(attachment =>
                h(
                  'div',
                  {
                    class: 'attachment',
                    key: attachment.id,
                    title: attachment.path || attachment.text || attachment.name,
                  },
                  [
                    icon(attachment.kind === 'selection' ? 'code' : 'file'),
                    h('span', attachment.name),
                    button(`移除 ${attachment.name}`, () => post('removeAttachment', { id: attachment.id }), {
                      class: 'icon-button small',
                      icon: 'close',
                      disabled: state.busy,
                    }),
                  ],
                ),
              ),
            )
          : null,
        h('div', { class: ['composer', state.busy ? 'busy' : ''] }, [
          h('textarea', {
            ref: composer,
            value: text.value,
            rows: 2,
            placeholder: state.models.length ? '描述任务，或附加文件与选区…' : '先添加模型提供商，再开始对话',
            'aria-label': '消息',
            disabled: !state.models.length,
            onInput: (event: Event) => {
              text.value = (event.target as HTMLTextAreaElement).value;
            },
            onKeydown: (event: KeyboardEvent) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
                event.preventDefault();
                send();
              }
            },
          }),
          h('div', { class: 'composer-toolbar' }, [
            h('div', { class: 'context-actions' }, [
              button('附加文件或图片', () => post('attachFiles'), {
                icon: 'paperclip',
                class: 'icon-button',
                disabled: state.busy,
              }),
              button('引用编辑器选区', () => post('attachSelection'), {
                icon: 'code',
                class: 'icon-button',
                disabled: state.busy,
              }),
            ]),
            h('div', { class: 'model-controls' }, [
              select(
                state.model,
                value => {
                  const model = state.models.find(row => row.id === value);
                  post('selectModel', {
                    model: value,
                    effort: model?.efforts.includes(state.effort) ? state.effort : model?.efforts[0] || '',
                  });
                },
                state.models.length
                  ? state.models.map(model => ({ value: model.id, label: model.label }))
                  : [{ value: '', label: '选择模型' }],
                { 'aria-label': '选择模型', class: 'model-select', disabled: !state.models.length || state.busy },
              ),
              selectedModel.value?.efforts.length
                ? select(
                    state.effort,
                    value => post('selectModel', { model: state.model, effort: value }),
                    selectedModel.value.efforts.map(effort => ({ value: effort, label: effortLabel(effort) })),
                    { 'aria-label': '思考档位', class: 'effort-select', disabled: state.busy },
                  )
                : null,
            ]),
            state.busy
              ? button('停止生成', () => post('stop'), { icon: 'stop', class: 'send-button stopping' })
              : button('发送消息', send, {
                  icon: 'arrow',
                  class: 'send-button',
                  disabled: !state.model || (!text.value.trim() && !state.attachments.length),
                }),
          ]),
        ]),
        h('div', { class: 'composer-meta' }, [
          h('span', { class: 'engine-indicator', title: state.engineStatus }, [
            h('span', { class: ['status-dot', /error|失败|错误/i.test(state.engineStatus) ? 'failed' : ''] }),
            state.busy ? '正在处理' : state.engineStatus,
          ]),
          h('div', { class: 'footer-tools' }, [
            select(
              state.permissions,
              value => post('setPermissions', { permissions: value }),
              [
                { value: 'workspace-write', label: '工作区写入' },
                { value: 'read-only', label: '只读' },
              ],
              { 'aria-label': '权限模式', class: 'permission-select', disabled: state.busy },
            ),
            button(
              '更多操作',
              () => {
                moreOpen.value = !moreOpen.value;
              },
              { icon: 'more', class: 'icon-button small' },
            ),
          ]),
        ]),
        moreOpen.value
          ? h('div', { class: 'more-menu', role: 'menu' }, [
              button(
                '压缩当前上下文',
                () => {
                  post('compact');
                  moreOpen.value = false;
                },
                { icon: 'bolt', disabled: !state.threadId || state.busy },
              ),
              button(
                '导出可读摘要',
                () => {
                  post('exportSummary');
                  moreOpen.value = false;
                },
                { icon: 'export', disabled: !state.threadId },
              ),
              button(
                '刷新用量信息',
                () => {
                  post('refreshUsage');
                  moreOpen.value = false;
                },
                { icon: 'refresh' },
              ),
              button(
                '重新连接内核',
                () => {
                  post('retryEngine');
                  moreOpen.value = false;
                },
                { icon: 'refresh', disabled: state.busy },
              ),
            ])
          : null,
      ]);
    const renderChat = () =>
      h('main', { class: 'chat-page' }, [
        activeThread.value
          ? h('div', { class: 'thread-heading' }, [
              h('span', { title: activeThread.value.name }, activeThread.value.name),
              h(
                'span',
                { class: 'workspace-name', title: state.workspace },
                state.workspace.split(/[\\/]/).filter(Boolean).pop() || '',
              ),
            ])
          : null,
        h(
          'div',
          {
            class: 'chat-scroll',
            ref: scroller,
            tabindex: 0,
            'aria-label': '对话内容',
            onScroll: () => {
              const element = scroller.value;
              if (element) follow.value = element.scrollHeight - element.scrollTop - element.clientHeight < 70;
            },
          },
          [
            state.items.length ? h('div', { class: 'messages' }, state.items.map(renderItem)) : renderEmpty(),
            ...state.pending.map(renderApproval),
            state.busy
              ? h('div', { class: 'working-indicator', role: 'status' }, [
                  h('span', { class: 'pulse' }, '✦'),
                  '正在处理任务…',
                ])
              : null,
          ],
        ),
        !follow.value && state.busy
          ? button(
              '回到最新消息',
              () => {
                follow.value = true;
                scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' });
              },
              { class: 'follow-button', icon: 'chevron' },
            )
          : null,
        renderComposer(),
      ]);
    const renderHistory = () =>
      h('main', { class: 'settings-page history-page' }, [
        h('div', { class: 'page-title' }, [
          h('h1', '对话历史'),
          button(
            '返回聊天',
            () => {
              page.value = 'chat';
            },
            { class: 'icon-button', icon: 'close' },
          ),
        ]),
        textInput(
          search.value,
          value => {
            search.value = value;
          },
          { placeholder: '搜索对话', 'aria-label': '搜索对话', class: 'history-search', type: 'search' },
        ),
        h(
          'div',
          { class: 'thread-list' },
          filteredThreads.value.length
            ? filteredThreads.value.map(thread =>
                h(
                  'article',
                  { class: ['thread-card', thread.id === state.threadId ? 'selected' : ''], key: thread.id },
                  [
                    renaming.value === thread.id
                      ? h(
                          'form',
                          {
                            class: 'rename-form',
                            onSubmit: (event: Event) => {
                              event.preventDefault();
                              if (renameValue.value.trim())
                                post('renameThread', { id: thread.id, name: renameValue.value.trim() });
                              renaming.value = '';
                            },
                          },
                          [
                            textInput(
                              renameValue.value,
                              value => {
                                renameValue.value = value;
                              },
                              { 'aria-label': '对话名称', autofocus: true },
                            ),
                            h(
                              'button',
                              { class: 'icon-button', type: 'submit', 'aria-label': '保存名称' },
                              icon('check'),
                            ),
                            button(
                              '取消重命名',
                              () => {
                                renaming.value = '';
                              },
                              { icon: 'close', class: 'icon-button' },
                            ),
                          ],
                        )
                      : h(
                          'button',
                          {
                            class: 'thread-open',
                            disabled: state.busy,
                            onClick: () => {
                              post('selectThread', { id: thread.id });
                              page.value = 'chat';
                              follow.value = true;
                            },
                          },
                          [
                            h('strong', thread.name || '新对话'),
                            h('p', thread.preview || '开始一段对话'),
                            thread.updatedAt
                              ? h(
                                  'time',
                                  new Date(
                                    thread.updatedAt < 1e12 ? thread.updatedAt * 1000 : thread.updatedAt,
                                  ).toLocaleString(),
                                )
                              : null,
                          ],
                        ),
                    h('div', { class: 'thread-actions' }, [
                      button(
                        '重命名',
                        () => {
                          renaming.value = thread.id;
                          renameValue.value = thread.name;
                        },
                        { icon: 'edit', class: 'icon-button small', disabled: state.busy },
                      ),
                      button('归档对话', () => post('archiveThread', { id: thread.id }), {
                        icon: 'trash',
                        class: 'icon-button small',
                        disabled: state.busy,
                      }),
                    ]),
                  ],
                ),
              )
            : h('div', { class: 'empty-state' }, [
                icon('history'),
                h('p', search.value ? '没有找到符合条件的对话。' : '对话会保存在这里。'),
                button(
                  '新建对话',
                  () => {
                    post('newThread');
                    page.value = 'chat';
                  },
                  { class: 'primary', icon: 'plus', disabled: state.busy },
                ),
              ]),
        ),
      ]);
    const renderModels = () =>
      h('section', { class: 'form-section' }, [
        h('div', { class: 'section-heading' }, [
          h('h2', '模型'),
          button(
            '添加模型',
            () => draft.models.push({ id: '', displayName: '', imageInput: draft.type === 'vertex' }),
            { class: 'secondary small', icon: 'plus' },
          ),
        ]),
        h('p', { class: 'section-hint' }, '填写渠道实际提供的模型 ID。留空的容量限制由内核管理。'),
        ...draft.models.map((row, index) =>
          h('div', { class: 'model-editor', key: index }, [
            h('div', { class: 'model-row-heading' }, [
              h('strong', `模型 ${index + 1}`),
              button(
                `移除模型 ${index + 1}`,
                () => {
                  draft.models.splice(index, 1);
                },
                { class: 'icon-button small danger-text', icon: 'trash', disabled: draft.models.length === 1 },
              ),
            ]),
            h('div', { class: 'form-grid' }, [
              field(
                '模型 ID',
                textInput(
                  row.id,
                  value => {
                    row.id = value;
                  },
                  { placeholder: '提供商的模型 ID', required: true, spellcheck: false },
                ),
              ),
              field(
                '显示名称',
                textInput(
                  row.displayName,
                  value => {
                    row.displayName = value;
                  },
                  { placeholder: '可选，显示于模型菜单' },
                ),
              ),
              field(
                '上下文容量',
                textInput(
                  row.contextWindow,
                  value => {
                    row.contextWindow = value ? Number(value) : undefined;
                  },
                  { type: 'number', min: 1, step: 1, placeholder: '自动' },
                ),
              ),
              field(
                '输出上限',
                textInput(
                  row.maxOutputTokens,
                  value => {
                    row.maxOutputTokens = value ? Number(value) : undefined;
                  },
                  { type: 'number', min: 1, step: 1, placeholder: '自动' },
                ),
              ),
            ]),
            field(
              '思考预设',
              select(
                row.reasoningPreset || 'auto',
                value => {
                  row.reasoningPreset = value;
                },
                [
                  { value: 'auto', label: '自动识别' },
                  { value: 'default', label: '提供商默认' },
                  { value: 'low-medium-high', label: '低 / 中 / 高' },
                  { value: 'low-medium-high-xhigh', label: '低 / 中 / 高 / 极高' },
                  { value: 'minimal-low-medium-high', label: '极简 / 低 / 中 / 高' },
                  { value: 'gemini-budget', label: 'Gemini 思考预算' },
                ],
                { 'aria-label': `模型 ${index + 1} 思考预设` },
              ),
            ),
            checkbox('支持图片输入', !!row.imageInput, value => {
              row.imageInput = value;
            }),
          ]),
        ),
      ]);
    const renderProviderEditor = () =>
      h(
        'form',
        {
          class: 'provider-editor',
          onSubmit: (event: Event) => {
            event.preventDefault();
            saveProvider();
          },
        },
        [
          h('div', { class: 'editor-heading' }, [
            button(
              '返回渠道列表',
              () => {
                editing.value = false;
                draft.apiKey = '';
                draft.serviceAccountJson = '';
              },
              { class: 'icon-button', icon: 'back' },
            ),
            h('h2', editingProvider.value ? '编辑模型提供商' : '添加模型提供商'),
          ]),
          h('p', { class: 'section-hint' }, '为这份独立的编码助手配置模型连接。凭证由系统安全存储保管。'),
          field(
            '渠道名称',
            textInput(
              draft.label,
              value => {
                draft.label = value;
              },
              { id: 'provider-label', placeholder: '例如：我的 Gemini / 私有模型服务', required: true },
            ),
          ),
          field(
            '渠道 ID',
            textInput(
              draft.id,
              value => {
                draft.id = value;
              },
              {
                placeholder: '留空自动生成',
                disabled: !!editingProvider.value,
                spellcheck: false,
                pattern: '[a-z0-9][a-z0-9_-]*',
              },
            ),
            '小写字母、数字、连字符或下划线；保存后固定。',
          ),
          field(
            '提供商类型',
            select(
              draft.type === 'vertex' ? 'vertex' : 'openai',
              value => {
                draft.type = value === 'vertex' ? 'vertex' : 'chat-completions';
                draft.models.forEach(row => {
                  row.imageInput = value === 'vertex';
                });
              },
              [
                { value: 'openai', label: 'OpenAI 兼容' },
                { value: 'vertex', label: 'Google Vertex Gemini' },
              ],
              { 'aria-label': '提供商类型' },
            ),
          ),
          draft.type !== 'vertex'
            ? h('div', { class: 'protocol-fields' }, [
                field(
                  '接口协议',
                  select(
                    draft.type,
                    value => {
                      draft.type = value as ProviderDraft['type'];
                    },
                    [
                      { value: 'chat-completions', label: 'Chat Completions' },
                      { value: 'responses', label: 'Responses' },
                    ],
                    { 'aria-label': '接口协议' },
                  ),
                ),
                field(
                  '基础 URL',
                  textInput(
                    draft.baseUrl,
                    value => {
                      draft.baseUrl = value;
                    },
                    { type: 'url', placeholder: 'https://api.example.com/v1', required: true, spellcheck: false },
                  ),
                ),
                field(
                  'API Key',
                  textInput(
                    draft.apiKey,
                    value => {
                      draft.apiKey = value;
                      draft.clearKey = false;
                    },
                    {
                      type: 'password',
                      placeholder: editingProvider.value?.hasKey
                        ? '已安全保存；留空保留'
                        : '可选，使用自定义认证头时可留空',
                      autocomplete: 'new-password',
                      spellcheck: false,
                    },
                  ),
                  editingProvider.value?.hasKey
                    ? '已保存的密钥不会回填。填写新值可替换。'
                    : '凭证仅在提交时发送给扩展。',
                ),
                editingProvider.value?.hasKey
                  ? checkbox('删除已保存的 API Key', draft.clearKey, value => {
                      draft.clearKey = value;
                      if (value) draft.apiKey = '';
                    })
                  : null,
              ])
            : h('div', { class: 'vertex-fields' }, [
                h('div', { class: 'section-heading compact' }, [
                  h('span', { class: 'field-label' }, '服务账号 JSON'),
                  button('导入文件', importJson, {
                    class: 'secondary small',
                    icon: 'file',
                    disabled: !!operation.value,
                  }),
                ]),
                h('textarea', {
                  value: draft.serviceAccountJson,
                  onInput: (event: Event) => {
                    draft.serviceAccountJson = (event.target as HTMLTextAreaElement).value;
                  },
                  class: 'credentials-input',
                  'aria-label': '服务账号 JSON',
                  placeholder: editingProvider.value?.hasCredentials
                    ? '服务账号已安全保存；留空保留，粘贴新 JSON 可替换'
                    : '粘贴完整的 Google Cloud 服务账号 JSON',
                  spellcheck: false,
                  autocomplete: 'off',
                  rows: 5,
                }),
                h('p', { class: 'field-hint' }, '保存后不再显示服务账号内容。项目 ID 可直接从 JSON 读取。'),
                field(
                  'Google Cloud 项目 ID',
                  textInput(
                    draft.project,
                    value => {
                      draft.project = value;
                    },
                    { placeholder: '可选，默认读取 JSON 中的 project_id', spellcheck: false },
                  ),
                ),
                field(
                  'Vertex AI 地区',
                  textInput(
                    draft.location,
                    value => {
                      draft.location = value;
                    },
                    { placeholder: 'global', spellcheck: false },
                  ),
                  '例如 global 或 us-central1，需与模型可用地区一致。',
                ),
              ]),
          renderModels(),
          h(
            'details',
            {
              class: 'advanced-settings',
              open: showAdvanced.value,
              onToggle: (event: Event) => {
                showAdvanced.value = (event.target as HTMLDetailsElement).open;
              },
            },
            [
              h('summary', '高级配置'),
              h('section', { class: 'form-section' }, [
                h('div', { class: 'section-heading' }, [
                  h('h3', '自定义请求头'),
                  button('添加请求头', () => draft.headers.push({ name: '', value: '' }), {
                    class: 'secondary small',
                    icon: 'plus',
                  }),
                ]),
                h(
                  'p',
                  { class: 'field-hint' },
                  '已保存请求头的值保持为空即可保留。Authorization 可覆盖 API Key 认证头。',
                ),
                ...draft.headers.map((header, index) =>
                  h('div', { class: ['header-editor', header.remove ? 'removed' : ''], key: index }, [
                    textInput(
                      header.name,
                      value => {
                        header.name = value;
                      },
                      {
                        placeholder: 'Header-Name',
                        'aria-label': `请求头 ${index + 1} 名称`,
                        disabled: !!header.existing,
                        spellcheck: false,
                      },
                    ),
                    textInput(
                      header.value,
                      value => {
                        header.value = value;
                      },
                      {
                        type: 'password',
                        placeholder: header.existing ? '已保存，留空保留' : '请求头值',
                        'aria-label': `请求头 ${index + 1} 值`,
                        disabled: header.remove,
                        autocomplete: 'new-password',
                      },
                    ),
                    button(
                      header.remove ? '恢复请求头' : '移除请求头',
                      () => {
                        if (header.existing) header.remove = !header.remove;
                        else draft.headers.splice(index, 1);
                      },
                      { class: 'icon-button small', icon: header.remove ? 'refresh' : 'trash' },
                    ),
                  ]),
                ),
              ]),
            ],
          ),
          formError.value ? h('div', { class: 'form-error', role: 'alert' }, formError.value) : null,
          h('div', { class: 'editor-footer' }, [
            button(operation.value === '测试连接' ? '连接测试中…' : '测试连接', testProvider, {
              icon: 'globe',
              disabled: !!operation.value,
            }),
            h('div', { class: 'button-row' }, [
              button(
                '取消',
                () => {
                  editing.value = false;
                  draft.apiKey = '';
                  draft.serviceAccountJson = '';
                },
                { disabled: !!operation.value },
              ),
              h(
                'button',
                { type: 'submit', class: 'primary', disabled: !!operation.value },
                operation.value === '保存' ? '正在保存…' : '保存渠道',
              ),
            ]),
          ]),
          h(
            'p',
            { class: 'field-hint test-hint' },
            '保存不会发送生成请求。连接测试检查模型目录或 Google 身份验证，模型生成权限需在聊天中验证。',
          ),
        ],
      );
    const renderProviderCard = (provider: ProviderView) =>
      h('article', { class: ['provider-card', provider.enabled ? '' : 'disabled'], key: provider.id }, [
        h('div', { class: 'provider-card-top' }, [
          h('div', { class: 'provider-symbol' }, icon(provider.type === 'vertex' ? 'globe' : 'bolt')),
          h('div', { class: 'provider-card-title' }, [
            h('strong', provider.label),
            h(
              'span',
              provider.type === 'vertex'
                ? 'Google Vertex Gemini'
                : provider.type === 'responses'
                  ? 'OpenAI · Responses'
                  : 'OpenAI · Chat Completions',
            ),
          ]),
          h('label', { class: 'switch', title: provider.enabled ? '停用渠道' : '启用渠道' }, [
            h('input', {
              type: 'checkbox',
              checked: provider.enabled,
              disabled: state.busy,
              'aria-label': `${provider.enabled ? '停用' : '启用'} ${provider.label}`,
              onChange: () => post('toggleProvider', { id: provider.id }),
            }),
            h('span', { class: 'switch-track' }),
          ]),
        ]),
        h(
          'div',
          { class: 'provider-model-chips' },
          provider.models.map(id =>
            h('span', { class: 'model-chip', key: id }, provider.modelMetadata?.[id]?.displayName || id),
          ),
        ),
        h('div', { class: 'provider-card-footer' }, [
          h('span', { class: 'muted' }, `${provider.models.length} 个模型 · ${provider.enabled ? '已启用' : '已停用'}`),
          h('div', { class: 'button-row' }, [
            button('编辑', () => editProvider(provider), {
              class: 'small secondary',
              icon: 'edit',
              disabled: state.busy,
            }),
            button(
              '删除渠道',
              () => {
                deletingProvider.value = provider.id;
              },
              { class: 'icon-button small danger-text', icon: 'trash', disabled: state.busy },
            ),
          ]),
        ]),
      ]);
    const renderProviders = () =>
      editing.value
        ? renderProviderEditor()
        : h('section', { class: 'provider-list' }, [
            h('div', { class: 'section-heading' }, [
              h('div', [
                h('h2', '模型提供商'),
                h('p', { class: 'section-hint' }, '连接自己的模型，随时在聊天中切换。'),
              ]),
              button('添加', () => editProvider(), { class: 'primary small', icon: 'plus', disabled: state.busy }),
            ]),
            deletingProvider.value
              ? h('div', { class: 'delete-confirmation', role: 'alert' }, [
                  h('p', '删除此渠道及其凭证？历史对话会保留。'),
                  h('div', { class: 'button-row' }, [
                    button(
                      '确认删除',
                      () => {
                        post('removeProvider', { id: deletingProvider.value });
                        deletingProvider.value = '';
                      },
                      { class: 'danger-text secondary', disabled: state.busy },
                    ),
                    button('取消', () => {
                      deletingProvider.value = '';
                    }),
                  ]),
                ])
              : null,
            state.providers.length
              ? state.providers.map(renderProviderCard)
              : h('div', { class: 'empty-state provider-empty' }, [
                  h('div', { class: 'empty-provider-icon' }, icon('globe')),
                  h('h3', '添加第一个模型渠道'),
                  h('p', '支持 OpenAI 兼容接口与 Google Vertex Gemini。可以添加多个渠道，各自保存模型与凭证。'),
                  button('添加模型提供商', () => editProvider(), { class: 'primary', icon: 'plus' }),
                ]),
            h('div', { class: 'info-card' }, [
              icon('shield'),
              h('p', '渠道凭证安全保存于此扩展的独立存储。官方 Codex 的账号、配置与模型保持独立。'),
            ]),
          ]);
    const renderTools = () =>
      h('section', { class: 'tools-settings' }, [
        h('h2', '工具与权限'),
        h('p', { class: 'section-hint' }, '编码工具由独立内核执行，涉及授权的操作会在对话中请求审批。'),
        field(
          '默认权限',
          select(
            state.permissions,
            value => post('setPermissions', { permissions: value }),
            [
              { value: 'workspace-write', label: '工作区写入，按需审批' },
              { value: 'read-only', label: '只读' },
            ],
            { disabled: state.busy },
          ),
        ),
        h('div', { class: 'settings-action-card' }, [
          h('div', [h('h3', 'MCP 服务器'), h('p', '打开本扩展的独立配置，管理外部工具连接。')]),
          button('打开配置', () => post('openMcp'), { class: 'secondary', icon: 'code' }),
        ]),
        h('div', { class: 'settings-action-card' }, [
          h('div', [h('h3', '个人技能'), h('p', '打开独立技能目录。当前项目的指令与技能也会被读取。')]),
          button('管理技能', () => post('openSkills'), { class: 'secondary', icon: 'file' }),
        ]),
        h('div', { class: 'settings-action-card' }, [
          h('div', [
            h('h3', '运行状态'),
            h('p', state.engineStatus),
            h('small', { class: 'muted wrap-anywhere' }, state.workspace || '尚未打开工作区'),
          ]),
          button('重新连接', () => post('retryEngine'), { class: 'secondary', icon: 'refresh', disabled: state.busy }),
        ]),
        h('div', { class: 'settings-action-card usage-card' }, [
          h('div', [
            h('h3', '当前用量'),
            state.usage ? h('pre', shortJson(state.usage)) : h('p', '生成后显示提供商返回的用量信息。'),
          ]),
          button('刷新', () => post('refreshUsage'), { class: 'secondary small', icon: 'refresh' }),
        ]),
      ]);
    const renderAbout = () =>
      h('section', { class: 'about-page' }, [
        h('div', { class: 'empty-logo' }, 'A'),
        h('h2', 'Apeiria Code'),
        h('p', '独立的第三方模型编码助手'),
        h(
          'p',
          { class: 'section-hint' },
          '连接你选择的模型，沿用代码代理的工具、审批与会话能力。配置、历史与凭证均保存在本扩展专属目录。',
        ),
        h('div', { class: 'info-card' }, [
          icon('code'),
          h('p', '两个助手可读取同一项目。并行修改时，使用独立 Git worktree 可减少文件冲突。'),
        ]),
      ]);
    const renderSettings = () =>
      h('main', { class: 'settings-page' }, [
        h('div', { class: 'page-title' }, [
          h('h1', '设置'),
          button(
            '返回聊天',
            () => {
              if (managementOnly) post('openNative');
              else page.value = 'chat';
              draft.apiKey = '';
              draft.serviceAccountJson = '';
            },
            { class: 'icon-button', icon: 'close' },
          ),
        ]),
        managementOnly ? null : h(
          'nav',
          { class: 'settings-tabs', 'aria-label': '设置分类' },
          [
            { value: 'providers', label: '模型渠道' },
            { value: 'tools', label: '工具与权限' },
            { value: 'about', label: '关于' },
          ].map(tab =>
            h(
              'button',
              {
                type: 'button',
                class: settingsTab.value === tab.value ? 'selected' : '',
                onClick: () => {
                  settingsTab.value = tab.value as typeof settingsTab.value;
                  editing.value = false;
                  draft.apiKey = '';
                  draft.serviceAccountJson = '';
                },
              },
              tab.label,
            ),
          ),
        ),
        h(
          'div',
          { class: 'settings-content' },
          settingsTab.value === 'providers'
            ? renderProviders()
            : settingsTab.value === 'tools'
              ? renderTools()
              : renderAbout(),
        ),
      ]);
    return () =>
      h('div', { class: 'app-shell' }, [
        managementOnly ? null : renderHeader(),
        renderNotice(),
        managementOnly ? renderSettings() : page.value === 'chat' ? renderChat() : page.value === 'history' ? renderHistory() : renderSettings(),
      ]);
  },
}).mount('#app');

function statusLabel(status?: string): string {
  return (
    (
      {
        inProgress: '执行中',
        completed: '已完成',
        failed: '失败',
        declined: '已拒绝',
        interrupted: '已停止',
      } as Record<string, string>
    )[status || ''] ||
    status ||
    ''
  );
}
function effortLabel(effort: string): string {
  return (
    (
      { none: '关闭思考', minimal: '极简', low: '低', medium: '中', high: '高', xhigh: '极高', max: '最大' } as Record<
        string,
        string
      >
    )[effort] || effort
  );
}
function toolLabel(type: string): string {
  return (
    (
      {
        mcpToolCall: 'MCP 工具调用',
        webSearch: '搜索',
        contextCompaction: '上下文压缩',
        plan: '任务计划',
        error: '错误',
        enteredReviewMode: '代码审查',
      } as Record<string, string>
    )[type] || type
  );
}
