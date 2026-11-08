/* eslint-disable import-x/no-nodejs-modules, @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const yaml = require('yaml');
const postcss = require('postcss');
const { parse, compileScript, compileTemplate, compileStyleAsync } = require('vue/compiler-sfc');
require('ts-node').register({ project: 'tsconfig.schema-test.json', transpileOnly: true, files: true });

async function main() {
  const root = path.resolve(__dirname, '..');
  const frontend = 'src/灯火通明-测试版';
  const { parseMessageContent } = require('../src/灯火通明-测试版/message-content');
  const { inlineNoticeSamples } = require('./bright-inline-notices.browser.ts');
  const { themes } = require('../src/灯火通明-测试版/themes');
  const protocol = yaml.parse(
    fs.readFileSync(path.join(root, 'src/灯火阑珊/灯火阑珊-世界书/[界面] 正文内提示.yaml'), 'utf8'),
  );
  assert.ok(protocol.正文内提示.格式.includes('【新线索：'));
  assert.ok(protocol.正文内提示.格式.includes('【任务进展：'));
  for (const sample of inlineNoticeSamples) assert.equal(parseMessageContent(sample.message).narrative, sample.message);

  const filename = path.join(root, frontend, 'app.vue');
  const { descriptor, errors } = parse(fs.readFileSync(filename, 'utf8'), { filename });
  assert.deepEqual(errors, []);
  const script = compileScript(descriptor, { id: 'notice-check' });
  const template = compileTemplate({
    source: descriptor.template.content,
    filename,
    id: 'notice-check',
    compilerOptions: { bindingMetadata: script.bindings, expressionPlugins: ['typescript'] },
  });
  assert.deepEqual(template.errors, []);
  const style = await compileStyleAsync({
    source: descriptor.styles[0].content,
    filename,
    id: 'data-v-notice-check',
    scoped: true,
    preprocessLang: 'scss',
  });
  assert.deepEqual(style.errors, []);
  const noticeCss = postcss
    .parse(style.code)
    .nodes.filter(node => node.type === 'rule' && node.selector.includes('dhl-story-notice'))
    .join('\n');
  assert.ok(noticeCss.includes('.story-copy') && noticeCss.includes('.story-prose'));

  const compile = file =>
    ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
  const modules = `const typography = { exports: {} };\n((exports) => { ${compile(`${frontend}/narrative-typography.ts`)} })(typography.exports);\nconst content = { exports: {} };\n((exports, require) => { ${compile(`${frontend}/message-content.ts`)} })(content.exports, () => typography.exports);`;
  const browserChecks = `const tests = { exports: {} };\n((exports, require) => { ${compile('tests/bright-inline-notices.browser.ts')} })(tests.exports, () => content.exports);`;
  const output = path.join(root, 'output', 'inline-notice-checks');
  fs.mkdirSync(output, { recursive: true });
  const previewScript = `${modules}\n${browserChecks}\nconst themes = ${JSON.stringify(themes)};
    const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    globalThis.formatAsDisplayedMessage = text => text.split(/\\n\\s*\\n/).map(part => '<p>' + escape(part).replaceAll('\\n', '<br>') + '</p>').join('');
    const report = { passed: [], error: null };
    try {
      report.passed = tests.exports.checkBrightInlineNotices();
      const makeSurface = (theme, width, kind, size = 16) => {
        const host = document.createElement('section'); host.className = 'cultivation-status'; host.setAttribute('data-v-notice-check', '');
        host.style.cssText = 'box-sizing:border-box;width:' + width + 'px;max-width:100%;padding:18px;margin-bottom:24px;font-size:' + size + 'px;line-height:1.95;background:' + theme.colors.canvas;
        for (const [key, value] of Object.entries(theme.colors)) host.style.setProperty('--' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value);
        host.style.setProperty('--story-dialogue-color', theme.colors.dialogueText); host.style.color = theme.colors.textPrimary;
        const prose = document.createElement('div'); prose.className = kind; host.append(prose); return { host, prose };
      };
      const preview = document.getElementById('samples');
      for (const theme of themes) {
        for (const kind of ['story-copy', 'story-prose']) {
          for (const width of [320, 760]) {
            const { host, prose } = makeSurface(theme, width, kind, 20);
            prose.innerHTML = content.exports.formatNarrativeHtml('【新线索：' + '长线索与远方来信'.repeat(18) + 'abc'.repeat(60) + '】', 7); document.body.append(host);
            const notice = prose.querySelector('.dhl-story-notice');
            if (!notice || notice.scrollWidth > notice.clientWidth + 1 || host.scrollWidth > host.clientWidth + 1) throw Error('布局溢出：' + theme.id + '/' + kind + '/' + width);
            if (parseFloat(getComputedStyle(notice).fontSize) !== 20) throw Error('字号未继承'); host.remove();
          }
        }
      }
      report.passed.push('四套主题、两种阅读布局、320/760 像素与大字号');
      for (const sample of tests.exports.inlineNoticeSamples) {
        const { host, prose } = makeSurface(themes.find(theme => theme.id === 'duskInk'), 760, 'story-copy');
        const heading = document.createElement('h2'); heading.textContent = sample.name; host.prepend(heading);
        prose.innerHTML = content.exports.formatNarrativeHtml(content.exports.parseMessageContent(sample.message).narrative, 7);
        if (prose.querySelectorAll('.dhl-story-notice').length !== sample.count) throw Error('样稿数量不符：' + sample.name); preview.append(host);
      }
      report.passed.push('日常、发现、阶段进展三组样稿');
    } catch (error) { report.error = String(error.stack || error); }
    window.inlineNoticeReport = report;
    document.getElementById('result').textContent = report.error || ('通过 ' + report.passed.length + ' 组检查');`;
  fs.writeFileSync(
    path.join(output, 'preview.html'),
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>正文内提示 · 测试版验证</title><style>body{margin:24px;background:#e8e3d9;color:#302e29;font-family:'Noto Serif SC','Microsoft YaHei',serif}#samples{max-width:760px;margin:auto}h1{font-size:20px;font-weight:500}h2{font-size:13px;letter-spacing:.12em;font-weight:400;opacity:.65;margin:0 0 20px}p{margin:0 0 1.2em}.dhl-story-dialogue{color:var(--story-dialogue-color)}${noticeCss}</style><h1>正文内提示 · 测试版</h1><p id="result">正在检查</p><main id="samples"></main><script>${previewScript.replaceAll('</script', '<\\/script')}</script></html>`,
    'utf8',
  );
  const nativeScript = `() => {
    const hostDocument = window.document;
    const document = hostDocument.implementation.createHTMLDocument('正文提示检查');
    const NodeFilter = window.NodeFilter;
    const messageId = Number(Array.from(hostDocument.querySelectorAll('#chat .mes[mesid]')).at(-1)?.getAttribute('mesid') || 0);
    const formatAsDisplayedMessage = (text, options) => window.TavernHelper.formatAsDisplayedMessage(text, options);
    ${modules}
    const samples = ${JSON.stringify(inlineNoticeSamples)};
    return samples.map(sample => {
      const parsed = content.exports.parseMessageContent(sample.message);
      const html = content.exports.formatNarrativeHtml(parsed.narrative, messageId);
      const host = document.createElement('div'); host.innerHTML = html;
      return { name: sample.name, expected: sample.count, actual: host.querySelectorAll('.dhl-story-notice').length, text: host.textContent };
    });
  }`;
  fs.writeFileSync(path.join(output, 'verify-tavern.js'), nativeScript, 'utf8');
  console.info('通过：测试版正文提取、提示条目 YAML、Vue 模板与实际 SCSS 编译。');
  console.info('浏览器检查页：' + path.join(output, 'preview.html'));
  console.info('酒馆只读检查脚本：' + path.join(output, 'verify-tavern.js'));
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
