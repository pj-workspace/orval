import assert from 'node:assert/strict';
import { appendFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createTestContextSpec } from '../../packages/core/src/test-utils/context';
import {
  generateZodValidationSchemaDefinition,
  parseZodValidationSchemaDefinition,
} from '../../packages/zod/src/index';

const requireV3 = createRequire(resolve('samples/swr-with-zod/package.json'));
const requireV4 = createRequire(resolve('tests/package.json'));
const targets = [
  { version: 3, variant: 'classic', zod: requireV3('zod') },
  { version: 4, variant: 'classic', zod: requireV4('zod') },
  { version: 4, variant: 'mini', zod: requireV4('zod/mini') },
] as const;
let assertions = 0;

for (const { version, variant, zod } of targets) {
  const render = (format: string, required: boolean) => {
    const context = createTestContextSpec();
    context.output.override.zod.dateTimeOptions = { offset: true };
    const definition = generateZodValidationSchemaDefinition(
      { type: 'string', format },
      context,
      'localDateTime',
      false,
      version === 4,
      { required },
    );
    const expression = parseZodValidationSchemaDefinition(
      definition,
      context,
      false,
      false,
      version === 4,
      undefined,
      undefined,
      variant,
    ).zod;
    console.log(`Zod ${version} ${variant}: ${expression}`);
    return new Function('zod', `return ${expression};`)(zod);
  };
  for (const required of [true, false]) {
    const schema = render('date-time-local', required);
    for (const [value, expected] of [
      ['2026-09-09T14:30:00', true],
      ['2026-09-09T14:30:00Z', true],
      ['2026-09-09T14:30:00+02:00', false],
      ['not-a-date', false],
      [undefined, !required],
    ] as const) {
      assert.equal(schema.safeParse(value).success, expected);
      assertions++;
    }
  }
  const schema = render('date-time', true);
  for (const [value, expected] of [
    ['2026-09-09T14:30:00', false],
    ['2026-09-09T14:30:00Z', true],
    ['2026-09-09T14:30:00+02:00', true],
  ] as const) {
    assert.equal(schema.safeParse(value).success, expected);
    assertions++;
  }
}

const result = `Generated schemas: ${assertions} runtime assertions passed across Zod 3, Zod 4 and mini.\n`;
console.log(result);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, result);
}
