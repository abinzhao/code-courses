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
  return /^(?:https?:|ftp:|\/\/|mailto:|tel:|data:)/i.test(target);
}

function parseFenceStart(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})/);
  if (!match) {
    return null;
  }

  return {
    marker: match[1][0],
    length: match[1].length,
  };
}

function isFenceClose(line, fence) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
  return Boolean(
    match &&
      match[1][0] === fence.marker &&
      match[1].length >= fence.length,
  );
}

function isIndentedCodeLine(line) {
  return /^(?: {4}|\t)/.test(line);
}

function stripInlineCode(line) {
  let result = '';
  let index = 0;

  while (index < line.length) {
    if (line[index] !== '`') {
      result += line[index];
      index += 1;
      continue;
    }

    let delimiterLength = 1;
    while (line[index + delimiterLength] === '`') {
      delimiterLength += 1;
    }

    const delimiter = '`'.repeat(delimiterLength);
    const closingIndex = line.indexOf(delimiter, index + delimiterLength);
    if (closingIndex === -1) {
      result += line.slice(index);
      break;
    }

    result += ' '.repeat(closingIndex + delimiterLength - index);
    index = closingIndex + delimiterLength;
  }

  return result;
}

function checkLinks(filePath, rootDirectory = courseRoot) {
  const source = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  let fence = null;
  let inIndentedCode = false;
  let linkCount = 0;
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (fence) {
      if (isFenceClose(line, fence)) {
        fence = null;
      }
      return;
    }

    if (isIndentedCodeLine(line)) {
      inIndentedCode = true;
      return;
    }

    if (inIndentedCode && line.trim() === '') {
      return;
    }
    inIndentedCode = false;

    const fenceStart = parseFenceStart(line);
    if (fenceStart) {
      fence = fenceStart;
      return;
    }

    const linkPattern = /\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
    let match;
    const searchableLine = stripInlineCode(line);

    while ((match = linkPattern.exec(searchableLine)) !== null) {
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
  isExternalLink,
  stripInlineCode,
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
