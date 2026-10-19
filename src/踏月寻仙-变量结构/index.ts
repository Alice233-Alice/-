import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../灯火阑珊/schema';
import { installExtraAnalysisPromptGuard } from '../灯火阑珊-变量结构/extra-analysis-prompt';
import { installAuthoritativeMvuGuard } from '../灯火阑珊-变量结构/guard';

$(() => {
  let stopGuard: () => void = () => undefined;
  let stopPromptGuard: () => void = () => undefined;

  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');
    registerMvuSchema(Schema);
    stopGuard = installAuthoritativeMvuGuard();
    stopPromptGuard = installExtraAnalysisPromptGuard();
    console.warn('[灯火阑珊] 正通过旧文件名加载；已转接新版变量结构与权威守卫');
  })();

  $(window).on('pagehide', () => {
    stopGuard();
    stopPromptGuard();
  });
});
