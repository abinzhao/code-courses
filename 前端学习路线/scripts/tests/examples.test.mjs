import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const course = resolve(import.meta.dirname, '../..');
function blocks(path, lang = 'js') {
  return [...readFileSync(join(course, path), 'utf8').matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)\\n```', 'g'))].map(m => m[1]);
}
const root = mkdtempSync(join(tmpdir(), 'curriculum-examples-'));
test.after(() => rmSync(root, { recursive: true, force: true }));

test('CLI 原文入口：标准流、退出码和带空格路径', () => {
  const file = join(root, 'cli.mjs');
  writeFileSync(file, blocks('L4-全栈与服务端/07-Node.js-CLI开发/01-参数-标准流与退出码.md')[0]);
  const input = join(root, 'articles with spaces.json');
  writeFileSync(input, '[{"id":"a1","title":"Atlas"}]');
  const run = args => spawnSync(process.execPath, [file, ...args], { encoding: 'utf8' });
  const success = run(['--input', input, '--json']);
  assert.equal(success.status, 0);
  assert.deepEqual(JSON.parse(success.stdout), { count: 1 });
  assert.equal(success.stderr, '');
  assert.equal(run(['--help']).status, 0);
  for (const args of [[], ['--unknown'], ['--input']]) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
  }
  writeFileSync(input, '{broken');
  assert.equal(run(['--input', input]).status, 1);
  writeFileSync(input, '[{"id":2,"title":"Atlas"}]');
  assert.equal(run(['--input', input]).status, 1);
  assert.equal(run(['--input', join(root, 'missing.json')]).status, 1);
});

test('导出原文：排序、dry-run、拒绝覆盖和重复 ID', async () => {
  const file = join(root, 'export.mjs');
  writeFileSync(file, blocks('L4-全栈与服务端/07-Node.js-CLI开发/02-幂等导出-配置与跨平台分发.md')[0]);
  const { exportArticles } = await import(pathToFileURL(file));
  const input = join(root, 'source.json'), output = join(root, 'export.json');
  const original = '[{"id":"b","title":"B","private":"excluded"},{"id":"a","title":"A"}]';
  writeFileSync(input, original);
  assert.equal((await exportArticles({ input, output, dryRun: true })).written, false);
  assert.equal(existsSync(output), false);
  await exportArticles({ input, output });
  assert.deepEqual(JSON.parse(readFileSync(output, 'utf8')), [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
  assert.equal(readFileSync(input, 'utf8'), original);
  const before = readFileSync(output);
  await assert.rejects(exportArticles({ input, output }), { code: 'EEXIST' });
  assert.deepEqual(readFileSync(output), before);
  await assert.rejects(exportArticles({ input, output: input }), /输入输出/);
  writeFileSync(input, '[{"id":"a","title":"A"},{"id":"a","title":"duplicate"}]');
  await assert.rejects(exportArticles({ input, output: join(root, 'bad.json') }), /重复/);
  assert.equal(existsSync(join(root, 'bad.json')), false);
});

test('SDK 原文：pack 后离线独立安装、包名调用与深层入口拒绝', () => {
  const path = 'L3-工程化与质量保障/06-npm包与SDK工程/01-exports-类型声明与消费者契约.md';
  const sdk = join(root, 'sdk'), consumer = join(root, 'consumer');
  mkdirSync(join(sdk, 'src'), { recursive: true });
  mkdirSync(consumer);
  writeFileSync(join(sdk, 'package.json'), blocks(path, 'json')[0]);
  writeFileSync(join(sdk, 'src/index.js'), blocks(path)[1]);
  writeFileSync(join(sdk, 'src/index.d.ts'), blocks(path, 'ts')[0]);
  const pack = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], { cwd: sdk, encoding: 'utf8' });
  assert.equal(pack.status, 0, pack.stderr);
  const tarball = JSON.parse(pack.stdout)[0];
  assert.ok(tarball.files.some(f => f.path === 'src/index.d.ts'));
  writeFileSync(join(consumer, 'package.json'), '{"name":"independent-consumer","private":true,"type":"module"}');
  const install = spawnSync('npm', ['install', join(sdk, tarball.filename), '--ignore-scripts', '--no-audit', '--no-fund', '--offline'], { cwd: consumer, encoding: 'utf8' });
  assert.equal(install.status, 0, install.stderr);
  writeFileSync(join(consumer, 'consumer.test.mjs'), blocks(path)[0] + `\ntest('不允许深层导入',async()=>assert.rejects(import('atlas-title-lab/src/index.js'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'}));\n`);
  const result = spawnSync(process.execPath, ['--test', 'consumer.test.mjs'], { cwd: consumer, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('HTTP 原文：路由、方法、解析、schema、体积边界与失败后恢复', async (t) => {
  const code = blocks('L4-全栈与服务端/02-Node.js后端基础/04-HTTP服务-请求边界与超时.md')[0];
  const file = join(root, 'http.mjs');
  // 仅替换固定测试端口，服务行为保持教程原文。
  writeFileSync(file, code.replace("server.listen(4180, '127.0.0.1');",
    "server.listen(0, '127.0.0.1',()=>console.log(server.address().port));"));
  const child = spawn(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { child.kill('SIGTERM'); });
  const port = await new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timeout')), 5000);
    child.stdout.once('data', data => { clearTimeout(timer); resolvePort(Number(String(data).trim())); });
    child.once('error', error => { clearTimeout(timer); reject(error); });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(base + '/wrong')).status, 404);
  const method = await fetch(base + '/api/echo');
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST');
  const post = (body, type = 'application/json') => fetch(base + '/api/echo', { method: 'POST', headers: { 'content-type': type }, body });
  const success = await post('{"title":" Atlas "}');
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { title: 'Atlas' });
  assert.equal((await post('{broken')).status, 400);
  assert.equal((await post('{"title":null}')).status, 422);
  assert.equal((await post('title=Atlas', 'text/plain')).status, 415);
  // 提前结束 request 迭代可能让客户端收到 413 或连接终止，二者均在文档契约内。
  try {
    assert.equal((await post(JSON.stringify({ title: 'x'.repeat(20000) }))).status, 413);
  } catch (error) {
    assert.match(error.message, /fetch failed/);
  }
  assert.equal((await post('{"title":"after-limit"}')).status, 200);
});
