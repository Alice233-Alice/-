import { h, type VNodeChild } from 'vue';

/** A deliberately small Markdown renderer. Every model string becomes a text node. */
export function inlineMarkdown(text: string): VNodeChild[] {
  const children: VNodeChild[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\))/g;
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > offset) children.push(text.slice(offset, match.index));
    const token = match[0];
    if (token.startsWith('`')) children.push(h('code', token.slice(1, -1)));
    else if (token.startsWith('**')) children.push(h('strong', token.slice(2, -2)));
    else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
      if (/^https?:\/\//i.test(link[2]))
        children.push(h('a', { href: link[2], rel: 'noreferrer noopener', target: '_blank' }, link[1]));
      else children.push(token);
    }
    offset = match.index! + token.length;
  }
  children.push(text.slice(offset));
  return children;
}

export function markdown(text: string): VNodeChild[] {
  const nodes: VNodeChild[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let code: string[] | null = null;
  let language = '';
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) nodes.push(h('p', inlineMarkdown(paragraph.join('\n'))));
    paragraph = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flush();
      if (code) {
        nodes.push(
          h('div', { class: 'code-block' }, [
            language ? h('div', { class: 'code-language' }, language) : null,
            h('pre', [h('code', code.join('\n'))]),
          ]),
        );
        code = null;
      } else {
        code = [];
        language = line.trim().slice(3).trim();
      }
    } else if (code) code.push(line);
    else if (!line.trim()) flush();
    else if (/^#{1,4} /.test(line)) {
      flush();
      const level = line.match(/^#+/)![0].length;
      nodes.push(h(`h${Math.min(level + 1, 5)}`, inlineMarkdown(line.slice(level + 1))));
    } else if (/^\s*[-*] /.test(line)) {
      flush();
      nodes.push(
        h('div', { class: 'markdown-list' }, [
          h('span', { 'aria-hidden': true }, '•'),
          h('span', inlineMarkdown(line.replace(/^\s*[-*] /, ''))),
        ]),
      );
    } else if (/^> /.test(line)) {
      flush();
      nodes.push(h('blockquote', inlineMarkdown(line.slice(2))));
    } else paragraph.push(line);
  }
  flush();
  if (code)
    nodes.push(
      h('div', { class: 'code-block' }, [
        language ? h('div', { class: 'code-language' }, language) : null,
        h('pre', [h('code', code.join('\n'))]),
      ]),
    );
  return nodes;
}
