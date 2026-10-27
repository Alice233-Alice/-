/** Deliberately contains no inline JavaScript or model-provided markup. */
export function webviewHtml(scriptUri: string, cssUri: string, cspSource: string, nonce: string): string {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${escape(cspSource)} data:; style-src ${escape(cspSource)}; script-src 'nonce-${escape(nonce)}'; font-src ${escape(cspSource)}; connect-src 'none'; base-uri 'none'; form-action 'none';">
  <link rel="stylesheet" href="${escape(cssUri)}">
  <title>Apeiria Code</title>
</head>
<body>
  <div id="app"></div>
  <script nonce="${escape(nonce)}" src="${escape(scriptUri)}"></script>
</body>
</html>`;
}
