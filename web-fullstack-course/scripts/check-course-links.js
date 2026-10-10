const fs = require('node:fs');
const path = require('node:path');

const scriptDirectory = __dirname;
const courseRoot = path.resolve(scriptDirectory, '..');

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

function checkLinks(filePath, rootDirectory = courseRoot) {
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
        errors.push(
          `${path.relative(rootDirectory, filePath)}:${index + 1} 链接编码无效：${rawTarget}`,
        );
        continue;
      }

      const targetPath = path.resolve(path.dirname(filePath), decodedTarget);
      if (!fs.existsSync(targetPath)) {
        errors.push(
          `${path.relative(rootDirectory, filePath)}:${index + 1} 目标不存在：${rawTarget}`,
        );
      }
    }
  });

  return { errors, linkCount };
}

function scanCourseLinks(rootDirectory = courseRoot) {
  const markdownFiles = collectMarkdownFiles(rootDirectory);
  const errors = [];
  let linkCount = 0;

  for (const filePath of markdownFiles) {
    const result = checkLinks(filePath, rootDirectory);
    errors.push(...result.errors);
    linkCount += result.linkCount;
  }

  return { errors, linkCount, markdownFiles };
}

module.exports = {
  checkLinks,
  collectMarkdownFiles,
  scanCourseLinks,
};

if (require.main === module) {
  const result = scanCourseLinks();

  if (result.errors.length > 0) {
    console.error(`课程链接检查失败：发现 ${result.errors.length} 个问题`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `课程链接检查通过：扫描 ${result.markdownFiles.length} 个 Markdown 文件、${result.linkCount} 个相对链接`,
    );
  }
}
