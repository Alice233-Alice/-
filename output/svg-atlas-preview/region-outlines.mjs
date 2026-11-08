// Visual extents follow the existing terrain, not surveyed political borders.
// Adjacent domains share exactly the same ridge, and coastal edges reuse the
// original coastline vertices so highlighting never cuts across bays or capes.
export function regionOutlines(coastline) {
  const reverse = points => [...points].reverse();
  const coastalArc = (start, end) => {
    const index = point => coastline.reduce((best, p, i) =>
      Math.hypot(p[0] - point[0], p[1] - point[1]) < Math.hypot(coastline[best][0] - point[0], coastline[best][1] - point[1]) ? i : best, 0);
    const a = index(start), b = index(end);
    return a <= b ? coastline.slice(a, b + 1) : [...coastline.slice(a), ...coastline.slice(0, b + 1)];
  };
  // Interpolate the foothills, with small, deterministic etched irregularities.
  // This uses no global random state: the underlying drawing remains identical.
  const ridge = points => {
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
      const dx = c[0] - b[0], dy = c[1] - b[1], length = Math.hypot(dx, dy), steps = Math.ceil(length / 3);
      for (let j = 0; j < steps; j++) {
        const t = j / steps, t2 = t * t, t3 = t2 * t;
        const bend = Math.sin(Math.PI * t) * (Math.sin(i * 7.1 + j * 1.8) * .65 + Math.sin(j * .8) * .45);
        result.push([0, 1].map(k => .5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3) + (k ? dx : -dy) / length * bend));
      }
    }
    return [...result, points.at(-1)];
  };
  const nw = [607, 347], ne = [966, 348], sw = [600, 612];
  const shoreNW = [348, 362], shoreNE = [1193, 304], shoreE = [958, 518], shoreSE = [950, 628], shoreSW = [398, 658];
  const northWest = ridge([shoreNW, [391, 350], [428, 356], [470, 347], [506, 359], [542, 346], [574, 352], nw]);
  const northCenter = ridge([nw, [633, 350], [649, 337], [673, 344], [691, 352], [716, 340], [738, 330], [762, 346], [788, 343], [815, 356], [845, 352], [865, 359], [889, 373], [916, 366], [940, 365], ne]);
  const northEast = ridge([ne, [1000, 337], [1038, 321], [1072, 315], [1101, 295], [1136, 303], [1160, 296], shoreNE]);
  const westCenter = ridge([nw, [619, 371], [636, 390], [629, 412], [645, 426], [653, 443], [642, 462], [624, 480], [630, 495], [644, 513], [638, 539], [640, 554], [620, 570], [617, 588], sw]);
  const eastCenter = ridge([ne, [958, 377], [961, 401], [949, 420], [940, 443], [944, 464], [952, 485], [969, 506], shoreE]);
  const southCenter = ridge([sw, [624, 607], [645, 622], [664, 614], [686, 633], [710, 627], [738, 636], [761, 627], [790, 616], [819, 611], [846, 626], [871, 624], [894, 637], [918, 644], shoreSE]);
  const southWest = ridge([shoreSW, [431, 645], [457, 630], [484, 628], [516, 626], [548, 616], [575, 619], sw]);
  const faces = [
    ['神州', 'central', [northCenter, eastCenter, coastalArc(shoreE, shoreSE), reverse(southCenter), reverse(westCenter)]],
    ['西庚', 'west', [coastalArc(shoreSW, shoreNW), northWest, westCenter, reverse(southWest)]],
    ['北冥', 'north', [coastalArc(shoreNW, shoreNE), reverse(northEast), reverse(northCenter), reverse(northWest)]],
    ['东苍', 'east', [coastalArc(shoreNE, shoreE), reverse(eastCenter), northEast]],
    ['南炎', 'south', [coastalArc(shoreSE, shoreSW), southWest, southCenter]],
  ];
  const definitions = faces.map(([, key, edges]) => {
    const points = edges.flatMap((edge, i) => i ? edge.slice(1) : edge);
    return `<path id="extent-${key}" d="${points.map((p, i) => `${i ? 'L' : 'M'}${p.map(n => +n.toFixed(2)).join(',')}`).join('')}Z"/>`;
  }).join('');
  return {
    // Use these same extents to constrain simulated traveler positions.
    areas: Object.fromEntries(faces.map(([name, , edges]) => [name, edges.flatMap((edge, i) => i ? edge.slice(1) : edge).map(p => p.map(n => +n.toFixed(2)))])),
    defs: definitions + '<radialGradient id="region-wash"><stop stop-color="#f3dfac" stop-opacity=".02"/><stop offset=".72" stop-color="#f3dfac" stop-opacity=".08"/><stop offset="1" stop-color="#f3dfac" stop-opacity=".24"/></radialGradient>',
    markup: `<g id="region-outlines" aria-hidden="true" pointer-events="none">${faces.map(([name, key]) => `<g class="region-outline" data-region-outline="${name}"><use class="region-wash" href="#extent-${key}" fill="url(#region-wash)"/><use class="region-edge-shadow" href="#extent-${key}"/><use class="region-edge" href="#extent-${key}"/></g>`).join('')}</g>`,
    style: `
      #region-outlines,#region-outlines *{pointer-events:none}
      .region-outline{display:none}
      .region-outline.is-preview,.region-outline.is-selected{display:inline}
      .region-outline.is-preview{opacity:.55}
      .region-outline.is-selected{opacity:1}
      .region-edge-shadow,.region-edge{fill:none;stroke-linejoin:round;vector-effect:non-scaling-stroke}
      .region-edge-shadow{stroke:#233e38;stroke-width:3;stroke-opacity:.48}
      .region-edge{stroke:#e6cf97;stroke-width:1;stroke-opacity:.94}
      .region-outline.is-preview:not(.is-selected) .region-edge{stroke-dasharray:3 4}
      .region:hover .name-line,.region:focus-visible .name-line,.region.selected .name-line{stroke:#f2da9e;stroke-width:1.5}
      .region:hover .region-name,.region:focus-visible .region-name,.region.selected .region-name{fill:#163a32;stroke:#f0dbab;stroke-opacity:1}
      .sea:hover .region-name,.sea:focus-visible .region-name,.sea.selected .region-name{fill:#f0dbab;stroke:#153237}
    `,
  };
}
