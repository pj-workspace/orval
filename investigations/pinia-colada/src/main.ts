import { createApp, defineComponent, h, ref } from 'vue';
import { createPinia } from 'pinia';
import { PiniaColada } from '@pinia/colada';
import { useGetPet } from './generated/pets';

const App = defineComponent({
  setup() {
    const petId = ref(1);
    const query = useGetPet(() => petId.value);
    return () => h('main', { style: 'max-width:680px;margin:60px auto;font:18px system-ui;padding:24px' }, [
      h('h1', 'Orval × Pinia Colada'),
      h('p', '切换 ID，验证响应式请求和独立缓存。'),
      h('nav', [1, 2, 500].map((id) => h('button', {
        onClick: () => { petId.value = id; },
        style: 'padding:12px;margin:6px',
      }, id === 500 ? '模拟错误' : `宠物 ${id}`))),
      h('p', { 'data-testid': 'selected' }, String(petId.value)),
      h('p', { 'data-testid': 'status' }, query.status.value),
      h('p', { 'data-testid': 'loading' }, query.asyncStatus.value),
      h('pre', { 'data-testid': 'data' }, JSON.stringify(query.data.value ?? null)),
      h('p', { role: 'alert' }, query.error.value ? '请求失败' : ''),
      h('button', { onClick: () => { void query.refetch().catch(() => {}); } }, '强制刷新'),
    ]);
  },
});

createApp(App).use(createPinia()).use(PiniaColada).mount('#app');
