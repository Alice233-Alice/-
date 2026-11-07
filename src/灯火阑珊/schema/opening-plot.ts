import { z } from 'zod';

export const OpeningPlotCacheSchema = z
  .object({
    开场标识: z.string().prefault(''),
    底稿指纹: z.string().prefault(''),
    构思: z.string().prefault(''),
  })
  .prefault({});

export type OpeningPlotCache = z.output<typeof OpeningPlotCacheSchema>;
