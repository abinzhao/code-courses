import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return [];
      return walk(path);
    }
    return [path];
  });
}

const markdownFiles = walk(root).filter((path) => extname(path) === '.md');
const lessonFiles = markdownFiles.filter((path) =>
  /[/\\]L[0-5]-[^/\\]+[/\\]/.test(path)
);

const forbiddenPatterns = [
  {
    pattern: /客户端组件内部定义一个 Server Action/,
    message: '内联 Server Action 不能定义在客户端组件中',
  },
  {
    pattern: /ES2026 于 2025 年 6 月定稿/,
    message: 'ES2026 发布时间错误',
  },
  {
    pattern: /node-version:\s*\[[^\]]*(?:18|20)/,
    message: 'CI 不得把已结束支持的 Node 18/20 作为矩阵基线',
  },
  {
    pattern: /NODE_VERSION:\s*['"](?:18|20)['"]/,
    message: 'CI 不得把已结束支持的 Node 18/20 作为默认版本',
  },
  {
    pattern: /QueryKey 用严格的引用比较/,
    message: 'TanStack Query 的查询键会做确定性哈希，不是严格引用比较',
  },
  {
    pattern: /computed.*永远不会漏掉依赖/,
    message: 'computed 只能追踪同步执行期间读取到的响应式依赖',
  },
  {
    pattern: /git reflog.*一定能找回来/,
    message: 'reflog 只记录本地引用移动，并受过期和对象清理影响',
  },
  {
    pattern: /图层总数有上限（约 100-200）/,
    message: '浏览器没有可用于课程结论的固定通用图层数量上限',
  },
  {
    pattern: /requestAnimationFrame.*唯一正确选择/,
    message: '视觉更新还可使用 CSS Animations 或 Web Animations API',
  },
  {
    pattern: /每一步迁移都不能超过 2 周/,
    message: '迁移切片周期应按发布节奏、风险和验证成本确定',
  },
  {
    pattern: /每次请求都 100% 最新.*SSR/,
    message: 'SSR 不保证上游数据、fetch 或 CDN 没有缓存',
  },
  {
    pattern: /所有现代浏览器 100% 支持/,
    message: '浏览器能力应按具体特性和项目基线判断',
  },
  {
    pattern: /sendBeacon.*保证数据一定发出/,
    message: 'sendBeacon 成功排队也不保证服务端收到',
  },
  {
    pattern: /Chrome 对图层总数有上限/,
    message: '不要宣称 Chrome 存在固定通用图层数量上限',
  },
];

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function maskCode(text) {
  const preserveLines = (value) => value.replace(/[^\n]/g, ' ');
  return text
    .replace(/```[\s\S]*?```/g, preserveLines)
    .replace(/`[^`\n]*`/g, preserveLines);
}

const anchorsByFile = new Map();
let relativeLinkCount = 0;
let anchorLinkCount = 0;

function anchors(file) {
  if (anchorsByFile.has(file)) return anchorsByFile.get(file);
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  const result = new Set();
  const counts = new Map();
  for (const match of text.matchAll(/^#{1,6}\s+(.+?)(?:\s+#+)?$/gm)) {
    const title = match[1].replace(/<[^>]*>/g, '').replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
    const slug = title.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const count = counts.get(slug) ?? 0;
    counts.set(slug, count + 1);
    result.add(count ? `${slug}-${count}` : slug);
  }
  for (const match of text.matchAll(/<(?:a|span|div|h[1-6])\b[^>]*\b(?:id|name)=["']([^"']+)["']/g)) {
    result.add(match[1]);
  }
  anchorsByFile.set(file, result);
  return result;
}

for (const file of markdownFiles) {
  const text = readFileSync(file, 'utf8');
  const prose = maskCode(text);
  const displayPath = relative(root, file);
  const fenceCount = [...text.matchAll(/^```/gm)].length;

  if (fenceCount % 2 !== 0) {
    errors.push(`${displayPath}: Markdown 代码围栏未闭合`);
  }

  for (const { pattern, message } of forbiddenPatterns) {
    const match = pattern.exec(text);
    if (match) {
      errors.push(`${displayPath}:${lineNumber(text, match.index)}: ${message}`);
    }
  }

  const linkPattern = /\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of prose.matchAll(linkPattern)) {
    const target = match[1];
    if (
      /^(?:https?:|mailto:|tel:|data:|file:|computer:)/.test(target)
    ) {
      continue;
    }

    relativeLinkCount += 1;
    const [rawPath, rawAnchor] = target.split('#');

    let decodedPath;
    let decodedAnchor;
    try {
      decodedPath = decodeURIComponent(rawPath);
      decodedAnchor = rawAnchor ? decodeURIComponent(rawAnchor) : '';
    } catch {
      errors.push(`${displayPath}:${lineNumber(text, match.index)}: 链接编码无效 ${target}`);
      continue;
    }

    const resolvedTarget = decodedPath ? resolve(dirname(file), decodedPath) : file;
    if (!existsSync(resolvedTarget)) {
      errors.push(`${displayPath}:${lineNumber(text, match.index)}: 链接目标不存在 ${target}`);
      continue;
    }
    if (decodedAnchor && extname(resolvedTarget) === '.md') {
      anchorLinkCount += 1;
      if (!anchors(resolvedTarget).has(decodedAnchor)) {
        errors.push(`${displayPath}:${lineNumber(text, match.index)}: 锚点不存在 ${target}`);
      }
    }
  }
}

for (const file of lessonFiles) {
  const text = readFileSync(file, 'utf8');
  const displayPath = relative(root, file);
  const requiredHeadings = ['## 学习目标', '## 内容讲解', '## 常见问题', '## 实操作业', '## 本节小结'];

  for (const heading of requiredHeadings) {
    if (!text.includes(heading)) {
      errors.push(`${displayPath}: 缺少固定章节 ${heading}`);
    }
  }

  if (strict) {
    const managed = ['course-meta', 'atlas-task', 'course-nav'];
    if (text.includes('<!-- exercise-guidance:')) managed.push('exercise-guidance');
    for (const name of managed) {
      const starts = [...text.matchAll(new RegExp(`<!-- ${name}:start -->`, 'g'))];
      const ends = [...text.matchAll(new RegExp(`<!-- ${name}:end -->`, 'g'))];
      if (starts.length !== 1 || ends.length !== 1 || starts[0]?.index >= ends[0]?.index) {
        errors.push(`${displayPath}: 托管块 ${name} 必须唯一且正确闭合`);
      }
    }
    const exercises = text.split('## 实操作业').at(-1).split('<!-- atlas-task:start -->')[0];
    if (!/参考/.test(exercises) || !/验收/.test(exercises)) {
      errors.push(`${displayPath}: 缺少作业参考与验收`);
    }
    for (const tier of ['基础', '进阶', '挑战']) {
      if (!text.includes(tier)) errors.push(`${displayPath}: 缺少 ${tier} 作业`);
    }
  }

  if (!/https?:\/\//.test(text)) {
    warnings.push(`${displayPath}: 没有外部一手资料链接`);
  }
}

const atlasPackage = join(root, 'projects', 'atlas', 'package.json');
if (strict && (!existsSync(atlasPackage) || !statSync(atlasPackage).isFile())) {
  errors.push('projects/atlas/package.json: Atlas 可运行项目不存在');
}

console.log(`Markdown: ${markdownFiles.length}`);
console.log(`课程正文: ${lessonFiles.length}`);
console.log(`相对链接: ${relativeLinkCount}；锚点链接: ${anchorLinkCount}`);
console.log(`模式: ${strict ? 'strict' : 'content'}`);
console.log(`警告: ${warnings.length}`);

if (warnings.length > 0 && process.env.SHOW_WARNINGS === '1') {
  for (const warning of warnings) console.warn(`WARN ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`校验失败：${errors.length} 个错误`);
  process.exitCode = 1;
} else {
  console.log('校验通过');
}
