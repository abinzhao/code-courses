const fs = require('node:fs');
const path = require('node:path');

const scriptDirectory = __dirname;
const courseRoot = path.resolve(scriptDirectory, '..');
const unitDirectory = path.join(courseRoot, '00-common', 'W01-web-foundations');
const requiredSections = [
  '## 1. 任务背景',
  '## 2. 学习目标',
  '## 3. 预备知识',
  '## 4. 核心理论',
  '## 5. 标签、属性、API 或配置清单',
  '## 6. 最小可运行案例',
  '## 7. NoteFlow 集成案例',
  '## 8. 常见错误与排查路径',
  '## 9. 课后题',
  '## 10. 实践练习',
  '## 11. 阶段验收',
  '## 12. 常见问题',
  '## 13. 扩展阅读',
];

function collectMarkdownFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function isExternalLink(target) {
  return /^(?:https?:|mailto:|tel:|data:)/i.test(target);
}

function checkLinks(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  let inCodeFence = false;
  let linkCount = 0;
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inCodeFence = !inCodeFence;
      return;
    }

    if (inCodeFence) {
      return;
    }

    const linkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let match;

    while ((match = linkPattern.exec(line)) !== null) {
      const rawTarget = match[1].replace(/^<|>$/g, '');

      if (rawTarget.startsWith('#') || isExternalLink(rawTarget)) {
        continue;
      }

      linkCount += 1;
      const [relativeTarget] = rawTarget.split('#');

      if (!relativeTarget) {
        continue;
      }

      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(relativeTarget);
      } catch {
        errors.push(`${path.relative(courseRoot, filePath)}:${index + 1} 链接编码无效：${rawTarget}`);
        continue;
      }

      const targetPath = path.resolve(path.dirname(filePath), decodedTarget);
      if (!fs.existsSync(targetPath)) {
        errors.push(
          `${path.relative(courseRoot, filePath)}:${index + 1} 目标不存在：${rawTarget}`,
        );
      }
    }
  });

  return { errors, linkCount };
}

function checkUnitSections(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return requiredSections
    .filter((section) => !source.includes(section))
    .map((section) => `${path.relative(courseRoot, filePath)} 缺少章节：${section}`);
}

const markdownFiles = collectMarkdownFiles(courseRoot);
const errors = [];
let linkCount = 0;

for (const filePath of markdownFiles) {
  const result = checkLinks(filePath);
  errors.push(...result.errors);
  linkCount += result.linkCount;
}

const unitFiles = [
  path.join(unitDirectory, '01-web-app-browser-server.md'),
  path.join(unitDirectory, '02-terminal-filesystem-git.md'),
];

for (const unitFile of unitFiles) {
  if (!fs.existsSync(unitFile)) {
    errors.push(`${path.relative(courseRoot, unitFile)} 单元文件不存在`);
    continue;
  }

  errors.push(...checkUnitSections(unitFile));
}

if (errors.length > 0) {
  console.error(`课程检查失败：发现 ${errors.length} 个问题`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `课程检查通过：扫描 ${markdownFiles.length} 个 Markdown 文件、${linkCount} 个相对链接、2 个 W1 单元`,
  );
}
