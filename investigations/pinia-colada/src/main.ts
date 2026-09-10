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
      h('p', 'Switch IDs to try reactive queries and per-pet caching.'),
      h('nav', [1, 2, 500].map((id) => h('button', {
        onClick: () => { petId.value = id; },
        style: 'padding:12px;margin:6px',
      }, id === 500 ? 'Simulate error' : `Pet ${id}`))),
      h('p', { 'data-testid': 'selected' }, String(petId.value)),
      h('p', { 'data-testid': 'status' }, query.status.value),
      h('p', { 'data-testid': 'loading' }, query.asyncStatus.value),
      h('pre', { 'data-testid': 'data' }, JSON.stringify(query.data.value ?? null)),
      h('p', { role: 'alert' }, query.error.value ? 'Request failed' : ''),
      h('button', { onClick: () => { void query.refetch().catch(() => {}); } }, 'Force refresh'),
    ]);
  },
});

createApp(App).use(createPinia()).use(PiniaColada).mount('#app');
