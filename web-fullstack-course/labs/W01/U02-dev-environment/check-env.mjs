import { execFileSync } from 'node:child_process';

const checks = [
  {
    label: 'Node.js',
    command: process.execPath,
    args: ['--version'],
    expectedMajor: 24,
  },
  {
    label: 'pnpm',
    command: 'pnpm',
    args: ['--version'],
    expectedMajor: 12,
  },
  {
    label: 'Git',
    command: 'git',
    args: ['--version'],
  },
];

function runCommand(command, args) {
  try {
    const output = execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return {
      ok: true,
      output: output.trim(),
    };
  } catch (error) {
    const output = [error.stdout, error.stderr]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      ok: false,
      output: output || error.message,
    };
  }
}

function getMajorVersion(output) {
  const match = output.match(/(?:^|\s)v?(\d+)(?:\.\d+)?(?:\.\d+)?/);
  return match ? Number(match[1]) : null;
}

const results = checks.map((check) => {
  const result = runCommand(check.command, check.args);

  if (!result.ok) {
    return {
      ...check,
      passed: false,
      detail: `命令不可用：${result.output.slice(0, 240)}`,
    };
  }

  if (check.expectedMajor === undefined) {
    return {
      ...check,
      passed: true,
      detail: result.output,
    };
  }

  const majorVersion = getMajorVersion(result.output);
  const passed = majorVersion === check.expectedMajor;
  return {
    ...check,
    passed,
    detail: `${result.output}（需要主版本 ${check.expectedMajor}）`,
  };
});

console.log('NoteFlow W1 开发环境检查');
console.log('========================');

for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.label}: ${result.detail}`);
}

const failedResults = results.filter((result) => !result.passed);
if (failedResults.length > 0) {
  console.log('');
  console.log(`检查结束：${failedResults.length} 项需要处理。`);
  console.log('请保留上面的原始输出，先判断是版本不满足，还是命令本身不可用。');
  process.exitCode = 1;
} else {
  console.log('');
  console.log('检查通过：Node.js、pnpm 和 Git 满足 W1 基线。');
}
