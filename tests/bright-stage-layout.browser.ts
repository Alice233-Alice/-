/** Run in a browser with the stylesheet emitted by the controller's installStyle. */
export async function checkBrightStageLayout(controllerCss: string) {
  const assert = (value: unknown, message: string) => {
    if (!value) throw new Error(message);
  };
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-3000px;top:0;width:800px;height:500px;border:0';
  frame.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';
  const loaded = new Promise<void>(resolve => frame.addEventListener('load', () => resolve(), { once: true }));
  document.body.append(frame);
  await loaded;
  const doc = frame.contentDocument!;
  const checks: string[] = [];
  try {
    doc.head.innerHTML = `<style>html,body{margin:0}#chat{display:flex;flex-direction:column;width:100%;height:500px}iframe{display:block;border:0}</style>`;
    const style = doc.createElement('style');
    style.textContent = controllerCss;
    doc.head.append(style);
    doc.body.className = 'dhl-pseudo-layer-active';
    doc.body.innerHTML = `<div id="chat">
      <div class="mes dhl-pseudo-selected"><div class="mes_block"><div class="mes_text">
        <div class="TH-render" id="thought"><iframe style="width:2500px;height:300px"></iframe></div>
        <div class="TH-render dhl-pseudo-native-stage" id="native"><iframe style="height:500px"></iframe></div>
        <div class="TH-render" id="choices"><iframe style="width:1800px;height:200px"></iframe></div>
      </div></div></div>
      <div id="dhl-pseudo-stage-root"><div class="dhl-pseudo-frame-keeper dhl-pseudo-frame-active"><iframe></iframe></div></div>
    </div>`;
    const chat = doc.querySelector<HTMLElement>('#chat')!;
    const native = doc.querySelector<HTMLElement>('#native')!;
    const root = doc.querySelector<HTMLElement>('#dhl-pseudo-stage-root')!;
    const thought = doc.querySelector<HTMLElement>('#thought')!;
    const choices = doc.querySelector<HTMLElement>('#choices')!;
    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const assertFits = (element: HTMLElement) => {
      const parent = chat.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      assert(Math.abs(bounds.width - parent.width) < 1, 'stage must match chat width');
      assert(Math.abs(bounds.top - parent.top) < 1, 'foreign content must not push the stage down');
    };

    for (const sibling of [thought, choices]) {
      sibling.before(native);
      assert(sibling.getBoundingClientRect().height === 0, 'foreign native renderers must not occupy startup space');
      assertFits(native);
    }
    checks.push('startup order does not change stage layout');

    doc.body.classList.add('dhl-pseudo-stage-root-active');
    assertFits(root);
    assert(Math.abs(root.getBoundingClientRect().height - 500) < 1, 'owned stage must fill chat height');
    const injected = doc.createElement('div');
    injected.style.cssText = 'width:5000px;height:2000px;flex:none';
    root.before(injected);
    await nextFrame();
    assert(injected.getBoundingClientRect().height === 0, 'late external siblings must not occupy layout');
    assertFits(root);
    assert(Math.abs(root.getBoundingClientRect().height - 500) < 1, 'late external content must not shrink stage');
    root.after(injected);
    assertFits(root);
    checks.push('late siblings cannot move or shrink owned stage');

    frame.style.width = '360px';
    await nextFrame();
    assertFits(root);
    const ownedFrame = root.querySelector('iframe')!;
    assert(Math.abs(ownedFrame.getBoundingClientRect().width - root.getBoundingClientRect().width) < 1, 'iframe must fit narrow containers');
    checks.push('narrow viewport keeps the same layout boundary');

    doc.body.className = '';
    assert(thought.getBoundingClientRect().height > 0, 'native thought rendering must return when controller is off');
    assert(choices.getBoundingClientRect().height > 0, 'native choices must return when controller is off');
    assert(root.getBoundingClientRect().height === 0, 'owned stage must hide when controller is off');
    assert(doc.querySelectorAll('iframe').length === 4, 'source renderer DOM must remain intact');
    checks.push('disabling the controller restores native renderers');
    return checks;
  } finally {
    frame.remove();
  }
}
