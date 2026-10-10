const fs = require('node:fs');
const path = require('node:path');
const { scanCourseLinks } = require('./check-course-links.js');

const scriptDirectory = __dirname;
const courseRoot = path.resolve(scriptDirectory, '..');
const manifestPath = path.join(courseRoot, 'progress', 'course-manifest.json');
const expectedUnitCount = 96;
const expectedWeekCount = 48;
const expectedStageCount = 9;

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

const requiredContentMarkers = [
  ['任务卡', /##\s+任务卡/],
  ['最小可运行案例', /##\s+6\.\s+最小可运行案例/],
  ['NoteFlow 集成案例', /##\s+7\.\s+NoteFlow 集成案例/],
  ['阶段验收', /##\s+11\.\s+阶段验收/],
  ['扩展阅读', /##\s+13\.\s+扩展阅读/],
  ['我现在能做到什么', /##\s+我现在能做到什么/],
  ['单元导航', /##\s+单元导航/],
];

const stageRanges = [
  ['00-common', 1, 4],
  ['01-css', 5, 12],
  ['02-browser-javascript', 13, 16],
  ['03-typescript-tooling', 17, 20],
  ['04-react', 21, 26],
  ['05-vue', 27, 32],
  ['06-frontend-engineering', 33, 37],
  ['07-backend', 38, 43],
  ['08-fullstack-delivery', 44, 48],
];

const unfinishedPatterns = [
  /\b(?:TODO|TBD|FIXME|WIP)\b/i,
  /\bplaceholder\b/i,
  /待完成|待补充|待实现|占位符|示例占位/i,
  /\[(?:待确认|未完成|placeholder)\]/i,
];

const credentialPatterns = [
  /-----BEGIN (?:RSA|EC|OPENSSH|DSA|PRIVATE) KEY-----/,
  /\b(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/,
  /\bBearer\s+[A-Za-z0-9._~-]{20,}/,
  /(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"']{8,}["']/i,
];

const debugPatterns = [
  /\bdebugger\s*;/i,
  /\bconsole\.debug\s*\(/i,
  /\[\s*debug\s*\]/i,
  /\bconsole\.log\s*\(\s*['"`](?:debug|temporary|temp|todo|wip)\b/i,
];

function formatPath(filePath) {
  return path.relative(courseRoot, filePath) || '.';
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { error };
  }
}

function expectedStageForWeek(weekNumber) {
  const range = stageRanges.find(([, firstWeek, lastWeek]) => {
    return weekNumber >= firstWeek && weekNumber <= lastWeek;
  });
  return range?.[0];
}

function expectedWeekSegment(weekNumber) {
  return `W${String(weekNumber).padStart(2, '0')}`;
}

function addPathError(errors, unitId, field, relativePath, message) {
  errors.push(`${unitId} ${field} ${relativePath || '(缺少路径)'} ${message}`);
}

function validateRelativePath(errors, unitId, field, relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    addPathError(errors, unitId, field, relativePath, '路径字段为空');
    return null;
  }

  if (path.isAbsolute(relativePath)) {
    addPathError(errors, unitId, field, relativePath, '必须是课程根目录下的相对路径');
    return null;
  }

  const absolutePath = path.resolve(courseRoot, relativePath);
  const relativeToRoot = path.relative(courseRoot, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    addPathError(errors, unitId, field, relativePath, '路径越出课程根目录');
    return null;
  }

  return absolutePath;
}

function addQualityErrors(errors, unitId, filePath, source) {
  const relativePath = formatPath(filePath);

  for (const pattern of unfinishedPatterns) {
    const match = source.match(pattern);
    if (match) {
      errors.push(`${unitId} ${relativePath} 包含未完成占位表达：${match[0]}`);
    }
  }

  for (const pattern of credentialPatterns) {
    const match = source.match(pattern);
    if (match) {
      errors.push(`${unitId} ${relativePath} 包含疑似凭据模式：${match[0]}`);
    }
  }

  for (const pattern of debugPatterns) {
    const match = source.match(pattern);
    if (match) {
      errors.push(`${unitId} ${relativePath} 包含调试残留：${match[0]}`);
    }
  }
}

function checkLesson(errors, unit, lessonPath) {
  if (!lessonPath) {
    return;
  }

  const source = fs.readFileSync(lessonPath, 'utf8');
  const relativePath = formatPath(lessonPath);
  const headingPattern = new RegExp(`^#\\s+${unit.id}(?:\\s|:|：)`, 'm');

  if (!headingPattern.test(source)) {
    errors.push(`${unit.id} ${relativePath} 标题未包含单元 ID`);
  }
  if (!source.includes(unit.title)) {
    errors.push(`${unit.id} ${relativePath} 标题未包含 manifest 标题：${unit.title}`);
  }

  for (const section of requiredSections) {
    if (!source.includes(section)) {
      errors.push(`${unit.id} ${relativePath} 缺少固定章节：${section}`);
    }
  }

  for (const [label, pattern] of requiredContentMarkers) {
    if (!pattern.test(source)) {
      errors.push(`${unit.id} ${relativePath} 缺少内容契约：${label}`);
    }
  }

  addQualityErrors(errors, unit.id, lessonPath, source);
}

function checkLab(errors, unit, labPath) {
  if (!labPath) {
    return;
  }

  if (!fs.statSync(labPath).isDirectory()) {
    errors.push(`${unit.id} ${formatPath(labPath)} 实验路径不是目录`);
    return;
  }

  const readmePath = path.join(labPath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    errors.push(`${unit.id} ${formatPath(readmePath)} 实验 README 不存在`);
    return;
  }

  const source = fs.readFileSync(readmePath, 'utf8');
  const requirements = [
    ['环境说明', /环境|版本/],
    [
      '运行命令',
      /```(?:bash|sh|shell)|\b(?:node|pnpm|npm|npx|docker|curl|git)\s+/,
    ],
    ['预期结果', /预期结果|预期输出|应该看到|成功时/],
    ['失败诊断', /失败|错误|排查|诊断|常见问题/],
  ];

  for (const [label, pattern] of requirements) {
    if (!pattern.test(source)) {
      errors.push(`${unit.id} ${formatPath(readmePath)} 实验 README 缺少：${label}`);
    }
  }

  addQualityErrors(errors, unit.id, readmePath, source);
}

function checkManifest(manifest) {
  const errors = [];

  if (!Array.isArray(manifest)) {
    return ['progress/course-manifest.json 顶层必须是数组'];
  }

  if (manifest.length !== expectedUnitCount) {
    errors.push(
      `manifest 单元数量错误：期望 ${expectedUnitCount}，实际 ${manifest.length}`,
    );
  }

  const recordsById = new Map();
  const pathOwners = new Map();
  const weekCounts = new Map();
  let existingLessons = 0;
  let existingLabs = 0;

  for (const [index, unit] of manifest.entries()) {
    const position = `manifest[${index}]`;
    if (!unit || typeof unit !== 'object' || Array.isArray(unit)) {
      errors.push(`${position} 必须是对象`);
      continue;
    }

    const unitId = typeof unit.id === 'string' ? unit.id : position;
    const requiredFields = [
      'id',
      'week',
      'stage',
      'title',
      'slug',
      'lesson',
      'lab',
      'previous',
      'next',
      'outcome',
      'requiresNode24',
    ];

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(unit, field)) {
        errors.push(`${unitId} ${position} 缺少字段：${field}`);
      }
    }

    if (recordsById.has(unit.id)) {
      errors.push(`${unitId} manifest ID 重复（首次位置 manifest[${recordsById.get(unit.id).index}]）`);
    } else if (typeof unit.id === 'string') {
      recordsById.set(unit.id, { unit, index });
    }

    const expectedId = `U${String(index + 1).padStart(2, '0')}`;
    if (unit.id !== expectedId) {
      errors.push(`${unitId} ${position} ID 不连续：期望 ${expectedId}`);
    }

    const weekMatch = typeof unit.week === 'string' && unit.week.match(/^W([1-9]|[1-4][0-9])$/);
    if (!weekMatch) {
      errors.push(`${unitId} ${position} 周次无效：${unit.week}`);
    } else {
      const weekNumber = Number(weekMatch[1]);
      weekCounts.set(unit.week, (weekCounts.get(unit.week) || 0) + 1);
      const expectedStage = expectedStageForWeek(weekNumber);
      if (unit.stage !== expectedStage) {
        errors.push(
          `${unitId} ${position} 阶段不匹配：W${weekNumber} 应为 ${expectedStage}，实际 ${unit.stage}`,
        );
      }
    }

    if (typeof unit.title !== 'string' || unit.title.trim().length === 0) {
      errors.push(`${unitId} ${position} 标题为空`);
    }
    if (typeof unit.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(unit.slug)) {
      errors.push(`${unitId} ${position} slug 无效：${unit.slug}`);
    }
    if (typeof unit.outcome !== 'string' || unit.outcome.trim().length === 0) {
      errors.push(`${unitId} ${position} outcome 为空`);
    }
    if (typeof unit.requiresNode24 !== 'boolean') {
      errors.push(`${unitId} ${position} requiresNode24 必须是布尔值`);
    }

    const lessonPath = validateRelativePath(errors, unitId, 'lesson', unit.lesson);
    const labPath = validateRelativePath(errors, unitId, 'lab', unit.lab);

    for (const [field, relativePath] of [
      ['lesson', unit.lesson],
      ['lab', unit.lab],
    ]) {
      if (typeof relativePath !== 'string' || relativePath.length === 0) {
        continue;
      }
      const key = `${field}:${relativePath}`;
      if (pathOwners.has(key)) {
        errors.push(
          `${unitId} ${field} 路径重复：${relativePath}（已由 ${pathOwners.get(key)} 使用）`,
        );
      } else {
        pathOwners.set(key, unitId);
      }
    }

    if (lessonPath) {
      if (!unit.lesson.endsWith('.md')) {
        errors.push(`${unitId} lesson ${unit.lesson} 必须指向 Markdown 文件`);
      }
      if (fs.existsSync(lessonPath)) {
        existingLessons += 1;
        if (!fs.statSync(lessonPath).isFile()) {
          errors.push(`${unitId} lesson ${unit.lesson} 不是文件`);
        } else {
          checkLesson(errors, unit, lessonPath);
        }
      } else {
        addPathError(errors, unitId, 'lesson', unit.lesson, '路径不存在');
      }
    }

    if (labPath) {
      const weekNumber = typeof unit.week === 'string' ? Number(unit.week.slice(1)) : NaN;
      if (!unit.lab.startsWith(`labs/${expectedWeekSegment(weekNumber)}/${unit.id}-`)) {
        errors.push(`${unitId} lab ${unit.lab} 未按单元 ID 和周次组织`);
      }
      if (fs.existsSync(labPath)) {
        existingLabs += 1;
        checkLab(errors, unit, labPath);
      } else {
        addPathError(errors, unitId, 'lab', unit.lab, '路径不存在');
      }
    }
  }

  for (let week = 1; week <= expectedWeekCount; week += 1) {
    const weekKey = `W${week}`;
    const count = weekCounts.get(weekKey) || 0;
    if (count !== 2) {
      errors.push(`${weekKey} 单元数量错误：期望 2，实际 ${count}`);
    }
  }

  const validUnitObjects = manifest.filter(
    (unit) => unit && typeof unit === 'object' && !Array.isArray(unit),
  );
  const stageCount = new Set(validUnitObjects.map((unit) => unit.stage)).size;
  if (stageCount !== expectedStageCount) {
    errors.push(
      `阶段数量错误：期望 ${expectedStageCount}，实际 ${stageCount}`,
    );
  }

  for (let index = 1; index <= expectedUnitCount; index += 1) {
    const unitId = `U${String(index).padStart(2, '0')}`;
    const record = recordsById.get(unitId)?.unit;
    if (!record) {
      errors.push(`${unitId} manifest 记录缺失`);
      continue;
    }

    const expectedPrevious = index === 1 ? null : `U${String(index - 1).padStart(2, '0')}`;
    const expectedNext = index === expectedUnitCount ? null : `U${String(index + 1).padStart(2, '0')}`;
    if (record.previous !== expectedPrevious) {
      errors.push(`${unitId} previous 不一致：期望 ${expectedPrevious}，实际 ${record.previous}`);
    }
    if (record.next !== expectedNext) {
      errors.push(`${unitId} next 不一致：期望 ${expectedNext}，实际 ${record.next}`);
    }
  }

  const linkResult = scanCourseLinks(courseRoot);
  for (const error of linkResult.errors) {
    errors.push(`相对链接 ${error}`);
  }

  return {
    errors,
    existingLessons,
    existingLabs,
    linkCount: linkResult.linkCount,
    markdownCount: linkResult.markdownFiles.length,
    stageCount,
    weekCount: weekCounts.size,
  };
}

function main() {
  const loadedManifest = readManifest();
  if (loadedManifest.error) {
    console.error(`课程完整性检查失败：无法读取 manifest：${loadedManifest.error.message}`);
    process.exitCode = 1;
    return;
  }

  const result = checkManifest(loadedManifest);
  if (Array.isArray(result)) {
    console.error(`课程完整性检查失败：${result.length} 个 manifest 问题`);
    for (const error of result) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `课程完整性统计：阶段 ${result.stageCount}/${expectedStageCount}，周次 ${result.weekCount}/${expectedWeekCount}，` +
      `单元 ${expectedUnitCount}/${expectedUnitCount}，正文 ${result.existingLessons}/${expectedUnitCount}，` +
      `实验 ${result.existingLabs}/${expectedUnitCount}，Markdown ${result.markdownCount}，相对链接 ${result.linkCount}`,
  );

  if (result.errors.length > 0) {
    console.error(`课程完整性检查失败：发现 ${result.errors.length} 个问题`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('课程完整性检查通过：96 个单元的结构、内容契约、实验入口、导航和链接均有效');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkManifest,
  expectedStageForWeek,
};
