export const articles = Object.freeze([
  {
    id: 'browser-rendering',
    title: '从 URL 到像素',
    summary: '理解浏览器进程、DOM、CSSOM、布局、绘制与合成。',
    status: 'published',
    tags: ['browser', 'performance'],
    readingMinutes: 12,
    updatedAt: '2026-10-10T08:00:00.000Z',
  },
  {
    id: 'javascript-event-loop',
    title: '事件循环与异步任务',
    summary: '使用任务、微任务和渲染机会解释异步时序。',
    status: 'published',
    tags: ['javascript', 'async'],
    readingMinutes: 15,
    updatedAt: '2026-10-11T09:30:00.000Z',
  },
  {
    id: 'accessible-forms',
    title: '可访问表单',
    summary: '结合原生约束、错误反馈和键盘操作设计表单。',
    status: 'draft',
    tags: ['html', 'accessibility'],
    readingMinutes: 9,
    updatedAt: '2026-10-12T02:15:00.000Z',
  },
]);

export function normalizeKeyword(value) {
  return String(value ?? '').trim().toLocaleLowerCase('zh-CN');
}

export function filterArticles(source, options = {}) {
  const keyword = normalizeKeyword(options.keyword);
  const status = options.status ?? 'all';
  const selectedTags = new Set(options.tags ?? []);

  return source.filter((article) => {
    const matchesKeyword =
      keyword.length === 0 ||
      article.title.toLocaleLowerCase('zh-CN').includes(keyword) ||
      article.summary.toLocaleLowerCase('zh-CN').includes(keyword);
    const matchesStatus = status === 'all' || article.status === status;
    const matchesTags =
      selectedTags.size === 0 ||
      [...selectedTags].every((tag) => article.tags.includes(tag));

    return matchesKeyword && matchesStatus && matchesTags;
  });
}

export function summarizeArticles(source) {
  return source.reduce(
    (summary, article) => {
      summary.total += 1;
      summary.readingMinutes += article.readingMinutes;
      summary.byStatus[article.status] =
        (summary.byStatus[article.status] ?? 0) + 1;
      for (const tag of article.tags) summary.tags.add(tag);
      return summary;
    },
    {
      total: 0,
      readingMinutes: 0,
      byStatus: {},
      tags: new Set(),
    }
  );
}

export function sortByUpdatedAt(source) {
  return source.toSorted(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}
