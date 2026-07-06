import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
import { Schema } from '../踏月寻仙-测试版/schema';

$(() => {
  registerMvuSchema(Schema);
  console.info('[灯火阑珊·旧梦新裁] MVU 变量结构已注册');
  toastr.success('MVU 变量结构已成功注册', '灯火阑珊·旧梦新裁');
});
