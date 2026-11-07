import { collectOpeningPlotDrafts } from './opening-plot';

declare const require: {
  context(directory: string, recursive: boolean, pattern: RegExp): { (filename: string): string; keys(): string[] };
};

const files = require.context('../灯火阑珊/开场剧情?raw', false, /\.md$/i);
export const openingPlotDrafts = collectOpeningPlotDrafts(
  Object.fromEntries(files.keys().map(filename => [filename, files(filename) as string])),
);
