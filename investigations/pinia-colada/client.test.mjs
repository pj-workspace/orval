import assert from 'node:assert/strict';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import client from './client.mjs';

// These tests execute emitted wrappers with test doubles. They do not replace
// the real Orval pipeline, TypeScript compilation, or Pinia Colada browser tests.
const verb = {
  verb: 'get', operationName: 'getPet',
  props: [{ name: 'petId', type: 'param', required: true }],
};
const options = { override: { fetch: { forceSuccessResponse: true } } };
const clients = {
  fetch: {
    client: async () => ({ implementation: '', imports: [{ name: 'Pet' }] }),
  },
};

test('emitted key and request resolve the current getter and preserve AbortSignal', async () => {
  const result = await client(clients).client(verb, options);
  const emitted = stripTypeScriptTypes(result.implementation).replaceAll('export function', 'function');
  const requests = [];
  const context = {
    toValue: (input) => typeof input === 'function' ? input() : input?.value ?? input,
    defineQueryOptions: (input) => input,
    useQuery: (input) => input,
    getPet: (id, init) => { requests.push({ id, signal: init.signal }); return Promise.resolve({ id }); },
  };
  runInNewContext(emitted, context);
  let id = 1;
  const query = context.useGetPet(() => id);
  assert.equal(JSON.stringify(query.key()), '["getPet",1]');
  id = 2;
  assert.equal(JSON.stringify(query.key()), '["getPet",2]');
  const abort = new AbortController();
  await query.query({ signal: abort.signal });
  assert.equal(requests[0].id, 2);
  assert.equal(requests[0].signal, abort.signal);
  abort.abort();
  assert.equal(requests[0].signal.aborted, true);
  assert.deepEqual(result.imports, [{ name: 'Pet' }]);
});

test('prototype rejects unsupported operations and missing HTTP error handling', async () => {
  const adapter = client(clients);
  for (const modified of [
    { ...verb, verb: 'post' },
    { ...verb, mutator: {} },
    { ...verb, props: [{ name: 'params', type: 'queryParam', required: false }] },
  ]) {
    await assert.rejects(adapter.client(modified, options), /supports GET/);
  }
  await assert.rejects(adapter.client(verb, { override: { fetch: {} } }), /forceSuccessResponse/);
});
