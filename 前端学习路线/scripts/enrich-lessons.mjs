import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const levelNames = {
  L0: 'Web 基石',
  L1: 'JavaScript 与 TypeScript',
  L2: '前端框架与组件化',
  L3: '工程化与质量保障',
  L4: '全栈与服务端',
  L5: '架构与纵深能力',
};
const suggestedTimes = {
  L0: '90-150 分钟',
  L1: '120-180 分钟',
  L2: '150-240 分钟',
  L3: '150-240 分钟',
  L4: '180-300 分钟',
  L5: '180-300 分钟',
};

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function toPosix(path) {
  return path.split(sep).join('/');
}

function relativeLink(fromFile, target) {
  const path = toPosix(relative(dirname(fromFile), target));
  return path.startsWith('.') ? path : `./${path}`;
}

function removeManagedBlock(text, name) {
  const pattern = new RegExp(
    `\\n?<!-- ${name}:start -->[\\s\\S]*?<!-- ${name}:end -->\\n?`,
    'g'
  );
  return text.replace(pattern, '\n');
}

function getLevel(file) {
  const match = relative(root, file).match(/^(L[0-5])-/);
  if (!match) throw new Error(`无法识别课程层级: ${file}`);
  return match[1];
}

function getTitle(text) {
  const match = text.match(/^#\s+(.+)$/m);
  if (!match) throw new Error('课程缺少一级标题');
  return match[1].trim();
}

function getSource(file) {
  const path = toPosix(relative(root, file));
  const rules = [
    ['React', '[React](https://react.dev/)'],
    ['Vue', '[Vue](https://vuejs.org/)'],
    ['Next.js', '[Next.js](https://nextjs.org/docs)'],
    ['Node.js', '[Node.js](https://nodejs.org/docs/latest-v24.x/api/)'],
    ['TypeScript', '[TypeScript](https://www.typescriptlang.org/docs/)'],
    ['Vite', '[Vite](https://vite.dev/)'],
    ['Rspack', '[Rspack](https://rspack.dev/)'],
    ['Webpack', '[webpack](https://webpack.js.org/)'],
    ['ESLint', '[ESLint](https://eslint.org/docs/latest/)'],
    ['Prettier', '[Prettier](https://prettier.io/docs/)'],
    ['Git协作流', '[Git](https://git-scm.com/docs)'],
    ['Vitest', '[Vitest](https://vitest.dev/)'],
    ['Testing-Library', '[Testing Library](https://testing-library.com/docs/)'],
    ['Playwright', '[Playwright](https://playwright.dev/)'],
    ['CICD', '[GitHub Actions](https://docs.github.com/actions)'],
    ['tRPC', '[tRPC](https://trpc.io/docs)'],
    ['PostgreSQL', '[PostgreSQL 18](https://www.postgresql.org/docs/18/)'],
    ['Prisma', '[Prisma](https://www.prisma.io/docs/)'],
    ['Docker', '[Docker](https://docs.docker.com/)'],
    ['Vercel', '[Vercel](https://vercel.com/docs)'],
    ['Nginx', '[NGINX](https://nginx.org/en/docs/)'],
    ['前端安全', '[OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)'],
    ['可观测性', '[OpenTelemetry](https://opentelemetry.io/docs/)'],
    ['设计系统', '[W3C Design Tokens](https://www.designtokens.org/)'],
    ['跨端开发', '[React Native](https://reactnative.dev/docs/getting-started)'],
    ['微信小程序', '[微信开放文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)'],
    ['性能工程', '[web.dev Performance](https://web.dev/performance/)'],
    ['HTML5语义化', '[HTML Standard](https://html.spec.whatwg.org/)'],
    ['CSS3', '[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)'],
    ['响应式设计', '[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)'],
    ['浏览器原理', '[Chromium Design Documents](https://www.chromium.org/developers/design-documents/)'],
    ['Chrome-DevTools', '[Chrome DevTools](https://developer.chrome.com/docs/devtools/)'],
    ['网络基础', '[HTTP Semantics](https://httpwg.org/specs/rfc9110.html)'],
    ['JavaScript', '[ECMAScript](https://tc39.es/ecma262/)'],
  ];

  const match = rules.find(([keyword]) => path.includes(keyword));
  return match?.[1] ?? '[MDN Web Docs](https://developer.mozilla.org/)';
}

function getTask(level, path, topic) {
  if (level === 'L0') {
    if (/浏览器|渲染|重排|DevTools|网络|HTTP|DNS|缓存/.test(path)) {
      return `在 Atlas 中构造与“${topic}”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。`;
    }
    return `把“${topic}”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。`;
  }
  if (level === 'L1') {
    return `把“${topic}”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。`;
  }
  if (level === 'L2') {
    return `按 L2 里程碑把“${topic}”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。`;
  }
  if (level === 'L3') {
    return `把“${topic}”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。`;
  }
  if (level === 'L4') {
    return `按 L4 里程碑把“${topic}”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。`;
  }
  return `按 L5 里程碑在 Atlas 中建立“${topic}”的可量化基线、改进方案、前后证据和长期治理规则。`;
}

const lessonFiles = walk(root)
  .filter((file) => file.endsWith('.md'))
  .filter((file) => /[/\\]L[0-5]-[^/\\]+[/\\]/.test(file))
  .sort((left, right) =>
    toPosix(relative(root, left)).localeCompare(
      toPosix(relative(root, right)),
      'zh-CN',
      { numeric: true }
    )
  );

for (let index = 0; index < lessonFiles.length; index += 1) {
  const file = lessonFiles[index];
  let text = readFileSync(file, 'utf8');
  text = removeManagedBlock(text, 'course-meta');
  text = removeManagedBlock(text, 'atlas-task');
  text = removeManagedBlock(text, 'course-nav');
  text = text.replace(/\n下一步：\[[^\]]+]\([^)]+\)\s*$/m, '');
  text = text.replace(
    /(?:\n---[ \t]*\n(?:[ \t]*\n)*)+(?=## 本节小结)/,
    '\n---\n\n'
  );

  const title = getTitle(text);
  const topic = title.replace(/^\d+[\s—-]*/, '');
  const level = getLevel(file);
  const previous = lessonFiles[index - 1];
  const next = lessonFiles[index + 1];
  const baselineLink = relativeLink(file, join(root, '技术基线与来源.md'));
  const atlasLink = relativeLink(file, join(root, 'projects', 'atlas', 'README.md'));
  const milestoneLink = relativeLink(
    file,
    join(root, 'projects', 'atlas', 'milestones', `${level}.md`)
  );
  const readmeLink = relativeLink(file, join(root, 'README.md'));
  const prerequisite = previous
    ? `[${getTitle(readFileSync(previous, 'utf8'))}](${relativeLink(file, previous)})`
    : '无，从本课开始';

  const meta = [
    '<!-- course-meta:start -->',
    '> **课程元数据**',
    `> - 层级：${level} ${levelNames[level]}`,
    `> - 先修：${prerequisite}`,
    `> - 建议用时：${suggestedTimes[level]}`,
    `> - 技术基线：2026-10，详见[技术基线与来源](${baselineLink})`,
    `> - 一手资料：${getSource(file)}`,
    '> - 完成要求：运行示例、完成至少基础作业、提交验证记录',
    '<!-- course-meta:end -->',
  ].join('\n');

  const atlasTask = [
    '<!-- atlas-task:start -->',
    '## Atlas 项目任务',
    '',
    `- 项目起点：[Atlas 贯穿项目](${atlasLink})`,
    `- 阶段目标：[${level} 里程碑](${milestoneLink})`,
    `- 本课任务：${getTask(level, relative(root, file), topic)}`,
    '- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。',
    '- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。',
    '',
    '### 项目验收',
    '',
    '- [ ] 正常路径可以从统一入口复现',
    '- [ ] 空值、错误或权限边界至少覆盖一项',
    '- [ ] 相关自动测试通过，且没有删除既有断言',
    '- [ ] 记录一个“现象—原因—验证—结论”',
    '<!-- atlas-task:end -->',
    '',
    '---',
    '',
  ].join('\n');

  const navItems = [];
  if (previous) {
    navItems.push(`[上一篇：${getTitle(readFileSync(previous, 'utf8'))}](${relativeLink(file, previous)})`);
  }
  navItems.push(`[课程地图](${readmeLink})`);
  if (next) {
    navItems.push(`[下一篇：${getTitle(readFileSync(next, 'utf8'))}](${relativeLink(file, next)})`);
  }
  const navigation = [
    '<!-- course-nav:start -->',
    '---',
    '',
    navItems.join(' · '),
    '<!-- course-nav:end -->',
    '',
  ].join('\n');

  const titleEnd = text.indexOf('\n', text.indexOf('# '));
  text = `${text.slice(0, titleEnd + 1)}\n${meta}\n${text.slice(titleEnd + 1).replace(/^\n+/, '\n')}`;

  const summaryIndex = text.lastIndexOf('\n## 本节小结');
  if (summaryIndex === -1) {
    throw new Error(`${relative(root, file)} 缺少 ## 本节小结`);
  }
  text = `${text.slice(0, summaryIndex)}\n${atlasTask}${text.slice(summaryIndex)}`;
  text = `${text.trimEnd()}\n\n${navigation}`;

  writeFileSync(file, text, 'utf8');
}

console.log(`已更新 ${lessonFiles.length} 篇课程`);
