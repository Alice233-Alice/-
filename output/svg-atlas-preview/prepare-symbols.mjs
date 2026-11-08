import { optimize } from 'svgo';

// Keep expensive, immutable illustrations as strings until the image decoder
// needs them. Their empty SVG definitions keep all existing <use> IDs stable.
// This is packaging only: no path, precision, style or drawing order changes.
export function prepareAtlasSymbols(svg) {
  const symbols = {};
  const markup = optimize(svg, {
    plugins: [
      {
        name: 'defer-atlas-symbols',
        fn: () => ({
          element: {
            exit(node, parent) {
              if (parent.type !== 'element' || parent.name !== 'defs') return;
              if (!node.attributes.id?.startsWith('capital-') && !('data-sect-art' in node.attributes)) return;
              const children = node.children;
              symbols[node.attributes.id] = optimize('<svg/>', {
                plugins: [
                  {
                    name: 'serialize-fragment',
                    fn: () => ({
                      root: {
                        enter(root) {
                          root.children = children;
                        },
                      },
                    }),
                  },
                ],
              }).data;
              node.children = [];
            },
          },
        }),
      },
    ],
  }).data;
  return { markup, symbols };
}
