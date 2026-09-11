import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, rmdir, access } from 'node:fs/promises';
import path from 'node:path';

const testPath = path.resolve('packages/orval/src/pinia-colada.test.ts');
const source = await readFile(testPath, 'utf8');
const blocks = [...source.matchAll(/await rm\(path\.join\(workspace, 'client\.ts'\), \{ force: true \}\);\s*await rmdir\(workspace\);/g)];
assert.equal(blocks.length, 2);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const cleanup = new AsyncFunction('workspace', 'rm', 'rmdir', 'path', blocks[0][0]);
const parent = path.dirname(testPath);
const makeWorkspace = () => mkdtemp(path.join(parent, '.cleanup-audit-'));

let workspace = await makeWorkspace();
await writeFile(path.join(workspace, 'client.ts'), 'generated');
await cleanup(workspace, rm, rmdir, path);
await assert.rejects(access(workspace));
console.log('PASS: generated file and empty workspace removed');

workspace = await makeWorkspace();
await cleanup(workspace, rm, rmdir, path);
await assert.rejects(access(workspace));
console.log('PASS: missing generated file still allows empty workspace cleanup');

workspace = await makeWorkspace();
await writeFile(path.join(workspace, 'client.ts'), 'generated');
await writeFile(path.join(workspace, 'keep.txt'), 'preserve');
await assert.rejects(cleanup(workspace, rm, rmdir, path));
assert.equal(await readFile(path.join(workspace, 'keep.txt'), 'utf8'), 'preserve');
await rm(path.join(workspace, 'keep.txt'));
await rmdir(workspace);
console.log('PASS: unexpected content preserved and cleanup rejects');

workspace = await makeWorkspace();
await mkdir(path.join(workspace, 'client.ts'));
await writeFile(path.join(workspace, 'client.ts', 'keep.txt'), 'preserve');
await assert.rejects(cleanup(workspace, rm, rmdir, path));
assert.equal(await readFile(path.join(workspace, 'client.ts', 'keep.txt'), 'utf8'), 'preserve');
await rm(path.join(workspace, 'client.ts', 'keep.txt'));
await rmdir(path.join(workspace, 'client.ts'));
await rmdir(workspace);
console.log('PASS: directory at output path is not recursively removed');
