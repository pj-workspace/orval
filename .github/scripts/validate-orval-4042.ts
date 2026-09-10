import assert from 'node:assert/strict';
import {
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { generateSpec } from '../../packages/orval/src/generate-spec';
import { normalizeOptions } from '../../packages/orval/src/utils/options';

const root = path.resolve('tests/generated/single-zod-validation');
const requireV3 = createRequire(
  path.resolve('samples/swr-with-zod/package.json'),
);
const requireV4 = createRequire(path.resolve('tests/package.json'));
const tsc = requireV4.resolve('typescript/bin/tsc');
const spec = {
  openapi: '3.1.0',
  info: { title: 'Single Zod', version: '1.0' },
  paths: {
    '/pets': {
      post: {
        operationId: 'createPet',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['pet'],
                properties: { pet: { $ref: '#/components/schemas/Pet' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: 'object',
        required: ['id', 'name'],
        properties: { id: { type: 'integer' }, name: { type: 'string' } },
      },
      Tree: {
        type: 'object',
        properties: {
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/Tree' },
          },
        },
      },
    },
  },
};
let assertions = 0;
for (const { version, variant, runtimeRequire } of [
  { version: 3, variant: 'classic', runtimeRequire: requireV3 },
  { version: 4, variant: 'classic', runtimeRequire: requireV4 },
  { version: 4, variant: 'mini', runtimeRequire: requireV4 },
] as const) {
  for (const reusable of [false, true]) {
    const workspace = path.join(root, `v${version}-${variant}-${reusable}`);
    await rm(workspace, { recursive: true, force: true });
    await mkdir(path.join(workspace, 'node_modules'), { recursive: true });
    await symlink(
      path.dirname(runtimeRequire.resolve('zod/package.json')),
      path.join(workspace, 'node_modules/zod'),
      'dir',
    );
    await writeFile(
      path.join(workspace, 'package.json'),
      JSON.stringify({ type: 'module' }),
    );
    const options = await normalizeOptions(
      {
        input: { target: spec },
        output: {
          target: './client.ts',
          client: 'react-query',
          httpClient: 'fetch',
          mode: 'single',
          indexFiles: false,
          schemas: { path: './model', type: 'zod', mode: 'single' },
          override: {
            zod: { version, variant, generateReusableSchemas: reusable },
          },
        },
      },
      workspace,
    );
    await generateSpec(workspace, options);
    assert.deepEqual(await readdir(path.join(workspace, 'model')), [
      'index.zod.ts',
    ]);
    const schemaFile = path.join(workspace, 'model/index.zod.ts');
    const schemas = await import(pathToFileURL(schemaFile).href);
    const pet = { id: 1, name: 'Ada' };
    assert.equal(schemas.Pet.safeParse(pet).success, true);
    assert.equal(
      schemas.Pet.safeParse({ id: 'invalid', name: 'Ada' }).success,
      false,
    );
    assert.equal(schemas.CreatePetBody.safeParse({ pet }).success, true);
    assert.equal(
      schemas.CreatePetBody.safeParse({ pet: { id: 'invalid' } }).success,
      false,
    );
    assert.equal(
      schemas.CreatePetParams.safeParse({ limit: 10 }).success,
      true,
    );
    assert.equal(
      schemas.CreatePetParams.safeParse({ limit: 'invalid' }).success,
      false,
    );
    if (reusable) {
      assert.equal(
        schemas.Tree.safeParse({ children: [{ children: [] }] }).success,
        true,
      );
      assert.equal(
        schemas.Tree.safeParse({ children: ['invalid'] }).success,
        false,
      );
      assertions += 2;
    }
    const config = path.join(workspace, 'tsconfig.json');
    await writeFile(
      config,
      JSON.stringify({
        compilerOptions: {
          noEmit: true,
          strict: true,
          skipLibCheck: true,
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          types: [],
        },
        include: ['./client.ts', './model/**/*.ts'],
      }),
    );
    execFileSync(process.execPath, [tsc, '-p', config], { stdio: 'inherit' });
    const before = await readFile(schemaFile, 'utf8');
    await generateSpec(workspace, options);
    assert.equal(await readFile(schemaFile, 'utf8'), before);
    assertions += 8;
    console.log(
      `PASS: Zod ${version} ${variant}, reusable=${reusable}: generation, tsc, runtime validation, stable rerun`,
    );
  }
}
console.log(
  `Generated schemas: ${assertions} assertions passed across six generation configurations.`,
);
