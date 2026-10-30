import surface from './generated/surface';
import underworld from './generated/underworld';
import sky from './generated/sky';
import type { AtlasRealm } from './types';

const assets = { surface, underworld, sky };
type AtlasAsset = { markup: string; data: Record<string, unknown> };
// Decode only the open realm. The SVG stays a DOM tree outside Vue's reactive graph.
const cache = new Map<AtlasRealm, Promise<AtlasAsset>>();
export function loadAtlas(realm: AtlasRealm): Promise<AtlasAsset> {
  const cached = cache.get(realm);
  if (cached) return cached;
  const pending = (async () => {
    const binary = atob(assets[realm]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text()) as AtlasAsset;
  })();
  cache.set(realm, pending);
  pending.catch(() => cache.delete(realm));
  return pending;
}
