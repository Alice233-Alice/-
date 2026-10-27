import test from 'node:test';
import assert from 'node:assert/strict';
import type { VNodeChild } from 'vue';
import { markdown } from '../ui/markdown.ts';
import { webviewHtml } from '../src/webview.ts';

function inspect(node: VNodeChild): { elements: string[]; links: string[]; text: string; html: boolean } {
  const result = { elements: [] as string[], links: [] as string[], text: '', html: false };
  const visit = (value: any) => {
    if (typeof value === 'string') result.text += value;
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      if (typeof value.type === 'string') result.elements.push(value.type);
      if (value.props?.href) result.links.push(value.props.href);
      if (value.props?.innerHTML) result.html = true;
      visit(value.children);
    }
  };
  visit(node);
  return result;
}

test('model HTML and executable links remain text nodes', () => {
  const payload = '<img src=x onerror=alert(1)>\n\n<script>steal()</script>\n\n[link](javascript:alert(1))';
  const result = inspect(markdown(payload));
  assert.equal(result.html, false);
  assert.ok(!result.elements.includes('img'));
  assert.ok(!result.elements.includes('script'));
  assert.deepEqual(result.links, []);
  assert.ok(result.text.includes('<script>steal()</script>'));
});

test('streaming code fences and safe markdown preserve text', () => {
  const result = inspect(
    markdown('## Result\n\n**Done** with `value`. [docs](https://example.com/help)\n\n```ts\nconst value = "<img>";'),
  );
  assert.ok(result.elements.includes('strong'));
  assert.ok(result.elements.includes('pre'));
  assert.deepEqual(result.links, ['https://example.com/help']);
  assert.ok(result.text.includes('const value = "<img>";'));
});

test('Webview applies a nonce CSP and escapes resource attributes', () => {
  const html = webviewHtml(
    'vscode-webview://resource/main.js" onerror="x',
    'vscode-webview://resource/main.css',
    'vscode-webview:',
    'nonce123',
  );
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes("script-src 'nonce-nonce123'"));
  assert.ok(html.includes('main.js&quot; onerror=&quot;x'));
  assert.ok(!html.includes('unsafe-inline'));
  assert.ok(!html.includes('unsafe-eval'));
  assert.equal((html.match(/<script/g) || []).length, 1);
  assert.ok(html.includes('<div id="app"></div>'));
});
