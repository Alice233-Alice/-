import { createAtlasArtwork } from '../src/灯火通明/atlas/artwork';

/** Run in a real browser: image decoding, Canvas and idle callbacks are essential. */
export async function checkAtlasArtwork() {
  const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
  };
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const mount = (canRefine = () => true, symbols: Record<string, string> = {}) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-1000px;top:0;width:100px;height:100px';
    host.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><g id="capital-test"/></defs><rect id="terrain" width="100" height="100" fill="#c09040"/><g id="labels"><text>地标</text></g></svg>`;
    document.body.append(host);
    const svg = host.firstElementChild as unknown as SVGSVGElement;
    const artwork = createAtlasArtwork(svg, 100, 100, canRefine, symbols);
    host.append(artwork.layer);
    const dispose = () => {
      artwork.dispose();
      host.remove();
    };
    return { svg, ...artwork, dispose };
  };

  let allow = false;
  const preview = mount(() => allow);
  try {
    await preview.ready;
    assert(preview.svg.dataset.artwork === 'preview', 'ready must resolve before optional refinement');
    const canvas = preview.layer.querySelector('canvas')!;
    assert(canvas.width * canvas.height <= 2_010_000, 'first paint must use the small texture budget');
    assert(canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255, 'preview must contain actual terrain');
    await delay(350);
    assert(preview.layer.querySelector('canvas') === canvas, 'hidden/interacting maps must defer refinement');
    allow = true;
    for (let n = 0; n < 100 && preview.svg.dataset.artwork === 'preview'; n++) await delay(50);
    assert(preview.svg.dataset.artwork === 'cached', 'refinement must resume when idle');
    assert(preview.layer.querySelector('canvas') !== canvas, 'refinement replaces the preview atomically');
    assert(canvas.width === 1, 'replaced canvas must release its drawing buffer');
  } finally {
    preview.dispose();
  }

  const cancelled = mount(() => false);
  await cancelled.ready;
  const released = cancelled.layer.querySelector('canvas')!;
  cancelled.dispose();
  await delay(350);
  assert(released.width === 1 && released.height === 1, 'disposing while idle must release the canvas');
  assert(cancelled.svg.dataset.artwork === 'preview', 'disposed work must never finish or update a stale realm');

  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = () => Promise.reject(new Error('simulated SVG decoder failure'));
  const fallback = mount(() => false, { 'capital-test': '<path id="original-city" d="M0 0L5 5"/>' });
  try {
    await fallback.ready;
    assert(fallback.svg.dataset.artwork === 'inline', 'decode failure must keep a usable vector fallback');
    assert(fallback.svg.querySelector('#terrain'), 'fallback must retain terrain');
    assert(fallback.svg.querySelector('#original-city'), 'fallback must restore deferred city paths');
  } finally {
    HTMLImageElement.prototype.decode = decode;
    fallback.dispose();
  }

  let refineAllowed = false;
  const failedRefinement = mount(() => refineAllowed);
  const draw = CanvasRenderingContext2D.prototype.drawImage;
  try {
    await failedRefinement.ready;
    const canvas = failedRefinement.layer.querySelector('canvas')!;
    CanvasRenderingContext2D.prototype.drawImage = () => {
      throw new Error('simulated refinement failure');
    };
    refineAllowed = true;
    await delay(500);
    assert(
      failedRefinement.layer.querySelector('canvas') === canvas,
      'failed refinement must preserve the first paint',
    );
    assert(
      canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data[3] === 255,
      'failed refinement must not blank the map',
    );
  } finally {
    CanvasRenderingContext2D.prototype.drawImage = draw;
    failedRefinement.dispose();
  }
  return 'preview readiness, deferred refinement, disposal, decoder fallback, atomic drawing failure: passed';
}
