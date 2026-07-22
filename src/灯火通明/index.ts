import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './app.vue';
import { bootstrapMvuGuard } from './components/MvuGuardBootstrap';
import { bootstrapUpdateVariableDisplayGuard } from './components/UpdateVariableDisplayGuard';

$(() => {
  const stopMvuGuard = bootstrapMvuGuard();
  const stopUpdateVariableDisplayGuard = bootstrapUpdateVariableDisplayGuard();

  const pinia = createPinia();
  const app = createApp(App);
  let disposed = false;

  app.use(pinia);
  app.mount('#app');

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    app.unmount();
    stopMvuGuard();
    stopUpdateVariableDisplayGuard();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  window.addEventListener('beforeunload', dispose, { once: true });

  console.info('[灯火阑珊·伪同层] 状态栏界面已加载');
});
