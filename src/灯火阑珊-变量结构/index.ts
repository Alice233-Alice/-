import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../灯火阑珊/schema';
import { installAuthoritativeMvuGuard } from './guard';

$(() => {
  let stopGuard: () => void = () => undefined;

  errorCatched(async () => {
    await waitGlobalInitialized('Mvu');
    registerMvuSchema(Schema);
    stopGuard = installAuthoritativeMvuGuard();
    console.info('[灯火阑珊] MVU 变量结构与权威守卫已注册');
    toastr.success('MVU 变量结构已成功注册', '灯火阑珊');
  })();

  $(window).on('pagehide', () => {
    stopGuard();
  });
});
