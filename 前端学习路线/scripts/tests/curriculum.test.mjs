import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const scripts = resolve(import.meta.dirname, '..');
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'curriculum-tools-'));
  try {
    mkdirSync(join(root, 'scripts'));
    for (const name of ['validate.mjs', 'enrich-lessons.mjs', 'lesson-exercise-guidance.mjs']) {
      copyFileSync(join(scripts, name), join(root, 'scripts', name));
    }
    mkdirSync(join(root, 'projects/atlas'), { recursive: true });
    writeFileSync(join(root, 'projects/atlas/package.json'), '{}');
    run(root, (script, ...args) => spawnSync(process.execPath, [join(root, 'scripts', script), ...args], { encoding: 'utf8' }));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('刷新保留定制先修和任务，补齐主题参考且重复运行稳定', () => fixture((root, run) => {
  mkdirSync(join(root, 'L0-Web基石/01-实验'), { recursive: true });
  const file = join(root, 'L0-Web基石/01-实验/01-开发环境-终端与项目目录.md');
  writeFileSync(file, `# 测试课程
<!-- course-meta:start -->
> 先修：特定语言课程
<!-- course-meta:end -->
## 学习目标
测试
## 内容讲解
测试
## 常见问题
测试
## 实操作业
测试
<!-- atlas-task:start -->
## Atlas 项目任务
只读本地数据
<!-- atlas-task:end -->
## 本节小结
测试
`);
  const firstRun = run('enrich-lessons.mjs');
  assert.equal(firstRun.status, 0, firstRun.stderr);
  const first = readFileSync(file, 'utf8');
  assert.ok(first.includes('先修：特定语言课程'));
  assert.ok(first.includes('只读本地数据'));
  assert.ok(first.includes('<!-- exercise-guidance:start -->'));
  assert.ok(first.includes('EADDRINUSE'));
  const index = readFileSync(join(root, '课程索引.md'), 'utf8');
  assert.equal(run('enrich-lessons.mjs').status, 0);
  assert.equal(readFileSync(file, 'utf8'), first);
  assert.equal(readFileSync(join(root, '课程索引.md'), 'utf8'), index);
}));

test('不存在的本页与跨页锚点失败', () => fixture((root, run) => {
  writeFileSync(join(root, 'README.md'), '# 入口\n[坏](./other.md#不存在)\n[本页](#不存在)\n');
  writeFileSync(join(root, 'other.md'), '# 其他\n');
  const result = run('validate.mjs');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /锚点不存在/);
}));

test('重复标题、中文、内联代码、显式 id；代码中的假链接不校验', () => fixture((root, run) => {
  writeFileSync(join(root, 'README.md'), '# 入口\n[一](./other.md#测试-npm)\n[二](./other.md#测试-npm-1)\n[三](./other.md#custom)\n```md\n[假](./missing.md)\n```\n');
  writeFileSync(join(root, 'other.md'), '# 其他\n## 测试 `npm`\n## 测试 `npm`\n<a id="custom"></a>\n');
  const result = run('validate.mjs');
  assert.equal(result.status, 0, result.stderr);
}));

test('严格模式拒绝未闭合块和缺少参考验收', () => fixture((root, run) => {
  mkdirSync(join(root, 'L0-Web基石/01-基础'), { recursive: true });
  writeFileSync(join(root, 'L0-Web基石/01-基础/01-课.md'), `# 课
<!-- course-meta:start -->
<!-- course-meta:end -->
## 学习目标
目标
## 内容讲解
内容
## 常见问题
问题
## 实操作业
作业
<!-- atlas-task:start -->
<!-- atlas-task:end -->
## 本节小结
小结
<!-- course-nav:start -->
`);
  const result = run('validate.mjs', '--strict');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /托管块/);
  assert.match(result.stderr, /作业参考与验收/);
}));
