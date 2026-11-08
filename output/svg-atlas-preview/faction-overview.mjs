// 兼容“名称：【定位】说明”与“名称【定位】：说明”，括号内的别称不改变地图定位 ID。
export function parseFactionOverview(source) {
  const lore = new Map();
  for (const [, rawId, sub, desc] of source.matchAll(/^\s*-\s+([^【\r\n]+)【([^】\r\n]+)】[：:]?\s*([^\r\n]+)$/gm)) {
    const id = rawId
      .trim()
      .replace(/[：:]$/, '')
      .replace(/\s*[（(][^()（）]*[)）]$/, '')
      .trim();
    if (lore.has(id)) throw new Error(`Duplicate faction in 宗门势力概览: ${id}`);
    lore.set(id, { sub: sub.trim(), desc: desc.trim() });
  }
  if (!lore.size) throw new Error('No factions found in 宗门势力概览');
  return lore;
}
