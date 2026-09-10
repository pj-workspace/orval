# Pinia Colada feasibility prototype for Orval #3341

Status: local prototype prepared; full pipeline and browser validation pending.
Upstream baseline: `d69250dc72bc3db26f9612cb991796d1d7535cb5`.

## Intent

Prove one end-to-end path before proposing a new built-in client:
OpenAPI → existing Orval Fetch transport and writers → generated Colada query options and composable → Vue page.

This uses Orval's documented function-valued `output.client` extension. No production generator source has changed. It does not implement `client: 'pinia-colada'` yet.

`client.mjs` adds `getGetPetColadaOptions()` and `useGetPet()` around the real Fetch output. Path inputs use Vue `MaybeRefOrGetter`; both the key getter and request function evaluate them with `toValue`. The query context signal is passed through. Fetch `forceSuccessResponse` is required so HTTP errors reject the query.

The prototype deliberately supports only GET operations with required path parameters, without custom mutators. Cache keys use the operation name and parameter values; stale time is fixed to one minute for the cache demonstration. These are feasibility choices, not a proposed final public API. General query parameters, custom options, mutations, Axios, infinite queries and SSR need separate design and validation.

## Live investigation

On 2026-09-10, [#3341](https://github.com/orval-labs/orval/issues/3341) is open with no comments or assignees. Its timeline has no cross-referenced implementation. The open-PR inventory and an all-state Colada PR search found no corresponding implementation. Repository source has no Colada client.

Official interfaces: [queries](https://pinia-colada.esm.dev/guide/queries.html), [query options](https://pinia-colada.esm.dev/api/@pinia/colada/interfaces/UseQueryOptions.html), [installation](https://pinia-colada.esm.dev/guide/installation.html).

The registry currently reports Colada 1.4.4, requiring Vue ^3.5.41. This isolated sample pins Vue 3.5.42, Pinia 4.0.3 and Colada 1.4.4; existing Orval sample dependencies remain untouched. It lives outside the repository workspaces.

## Verification record

- PASS: JavaScript syntax checks for the generator and Orval configuration.
- PASS: `node --test investigations/pinia-colada/client.test.mjs` — 2 tests. They execute the emitted wrapper with test doubles, proving current getter resolution, AbortSignal forwarding and unsupported-input rejection. They do **not** exercise actual Pinia Colada or the full Orval pipeline.
- BLOCKED: local `vp install --frozen-lockfile` returned Socket scanner HTTP 403. Scanner and minimum-release-age settings were preserved.
- PENDING: actual OpenAPI generation, generated-code type checking, application build and Chromium acceptance.

No upstream comments or PR have been sent. Public Fork validation requires the user's authorization for this branch.

## Planned validation

The workflow `.github/workflows/orval-3341-feasibility.yaml` runs only on `validation/orval-3341` in `pj-workspace/orval`, with `contents: read`, no persisted checkout credentials and no publishing step.

Upstream has a pre-existing lock/declaration mismatch for js-yaml. The disposable job first resolves the baseline with the repository security policy, then verifies a frozen reinstall does not change that resolved lock. The independent sample does the same under its own identical scanner policy. Both resolved locks are saved as artifacts. The first resolution is **not** a frozen installation; source manifests/security settings are guarded against changes. No validation-only lock changes belong in a future feature PR.

The browser test exercises the generated composable using intercepted synthetic HTTP responses: initial loading, reactive ID changes, cache reuse, forced refresh, HTTP error state and recovery. Real library cancellation behavior remains a further check; the local contract test only proves signal forwarding.

To run after dependencies and root packages are built:

```sh
cd investigations/pinia-colada
bun install
bun run generate
bun run typecheck
bun run build
bun x --no-install playwright install chromium
bun run test:browser
bun run dev
```

The Vite dev server supplies a local synthetic pet API for interactive use. The production build alone does not include that API. All data is synthetic; no account or API token is required.

## Discussion draft (not posted)

I'd like to investigate a minimal Pinia Colada client for #3341. The initial scope would be GET query options and composables with reactive path parameters, stable cache keys, and AbortSignal forwarding, reusing Orval's existing Fetch transport and writers.

I have prepared a custom-client prototype and a Vue sample rather than adding a built-in client immediately. Current Colada 1.4.4 requires Vue ^3.5.41, so the sample uses an isolated dependency set. Full generation, type checking and browser validation are still pending; the local emitted-wrapper contract tests pass.

Would this be a useful first slice, with mutations and broader configuration support handled separately? Do you have a preferred package location or supported Colada version range?
