import { optimize } from 'svgo';

// 只处理绘图数值，不能把 ID / data-* 中的数字字符串当作坐标改写。
const drawingNumbers = new Set([
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stroke-width',
  'stop-opacity',
  'offset',
  'font-size',
  'letter-spacing',
]);
const roundDrawingNumbers = {
  name: 'roundAtlasDrawingNumbers',
  fn: () => ({
    element: {
      enter(node) {
        for (const [name, value] of Object.entries(node.attributes)) {
          if (!drawingNumbers.has(name) || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) continue;
          const number = Number(value);
          if (Number.isFinite(number)) {
            node.attributes[name] = String(Number(number.toFixed(3))).replace(/^(-?)0\./, '$1.');
          }
        }
      },
    },
  }),
};

// 地图运行时会按 ID 读取城池、宗门图形，并用 class / data-* 控制交互。
// 使用经过放大对照的适度有损精度，不使用会移除定义、改名或合并节点的默认集合。
export function optimizeAtlasSvg(svg) {
  return optimize(svg, {
    plugins: [
      roundDrawingNumbers,
      {
        name: 'convertPathData',
        params: {
          floatPrecision: 1,
          // 不烘焙变换、不把曲线改成直线、不删圆头短线；纹理密度保持原样。
          applyTransforms: false,
          makeArcs: false,
          straightCurves: false,
          convertToQ: false,
          convertToZ: false,
          smartArcRounding: false,
          removeUseless: false,
        },
      },
    ],
  }).data;
}
