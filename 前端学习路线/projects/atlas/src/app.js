const FAVORITES_KEY = 'atlas:favorites:v1';

const searchForm = document.querySelector('#search-form');
const articleList = document.querySelector('#article-list');
const articleTemplate = document.querySelector('#article-template');
const requestStatus = document.querySelector('#request-status');
const resultCount = document.querySelector('#result-count');
const summary = document.querySelector('#summary');

if (!(searchForm instanceof HTMLFormElement)) {
  throw new Error('缺少搜索表单');
}
if (!(articleList instanceof HTMLUListElement)) {
  throw new Error('缺少文章列表');
}
if (!(articleTemplate instanceof HTMLTemplateElement)) {
  throw new Error('缺少文章模板');
}
if (!(requestStatus instanceof HTMLParagraphElement)) {
  throw new Error('缺少请求状态区域');
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeZone: 'Asia/Shanghai',
});

let activeRequest;
let favorites = loadFavorites();

function loadFavorites() {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (!raw) return new Set();

  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new TypeError('收藏数据结构无效');
    }
    return new Set(value);
  } catch (error) {
    console.warn('收藏数据已重置', error);
    localStorage.removeItem(FAVORITES_KEY);
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function setRequestStatus(message, state = 'idle') {
  requestStatus.textContent = message;
  requestStatus.dataset.state = state;
}

function createTag(label) {
  const item = document.createElement('li');
  item.textContent = label;
  return item;
}

function renderArticles(articles) {
  const fragment = document.createDocumentFragment();

  for (const article of articles) {
    const item = articleTemplate.content.cloneNode(true);
    const card = item.querySelector('.article-card');
    const link = item.querySelector('.article-link');
    const status = item.querySelector('.article-status');
    const articleSummary = item.querySelector('.article-summary');
    const favoriteButton = item.querySelector('.favorite-button');
    const tagList = item.querySelector('.tag-list');
    const meta = item.querySelector('.article-meta');

    if (
      !(card instanceof HTMLLIElement) ||
      !(link instanceof HTMLAnchorElement) ||
      !(status instanceof HTMLParagraphElement) ||
      !(articleSummary instanceof HTMLParagraphElement) ||
      !(favoriteButton instanceof HTMLButtonElement) ||
      !(tagList instanceof HTMLUListElement) ||
      !(meta instanceof HTMLParagraphElement)
    ) {
      throw new Error('文章模板结构不完整');
    }

    card.dataset.articleId = article.id;
    card.id = `article-${article.id}`;
    link.href = `#${card.id}`;
    link.textContent = article.title;
    status.textContent = article.status === 'published' ? '已发布' : '草稿';
    articleSummary.textContent = article.summary;
    favoriteButton.dataset.articleId = article.id;
    favoriteButton.setAttribute('aria-pressed', String(favorites.has(article.id)));
    favoriteButton.textContent = favorites.has(article.id) ? '已收藏' : '收藏';
    tagList.append(...article.tags.map(createTag));
    meta.textContent =
      `${article.readingMinutes} 分钟 · 更新于 ` +
      dateFormatter.format(new Date(article.updatedAt));

    fragment.append(item);
  }

  articleList.replaceChildren(fragment);
  resultCount.textContent = `${articles.length} 篇`;

  if (articles.length === 0) {
    setRequestStatus('没有符合条件的文章');
  } else {
    setRequestStatus('');
  }
}

async function requestArticles({ keyword = '', status = 'all' } = {}) {
  activeRequest?.abort('superseded');
  const controller = new AbortController();
  activeRequest = controller;

  const url = new URL('/api/articles', window.location.origin);
  if (keyword) url.searchParams.set('keyword', keyword);
  if (status !== 'all') url.searchParams.set('status', status);

  setRequestStatus('正在加载...');

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`请求失败: HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new TypeError(`响应类型错误: ${contentType || 'unknown'}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload.data)) {
      throw new TypeError('响应缺少 data 数组');
    }

    renderArticles(payload.data);
    summary.textContent = `当前 ${payload.meta.count} 篇文章，收藏 ${favorites.size} 篇`;
  } catch (error) {
    if (controller.signal.aborted) return;
    setRequestStatus(
      error instanceof Error ? error.message : '加载失败',
      'error'
    );
  }
}

function getFilters() {
  const formData = new FormData(searchForm);
  return {
    keyword: String(formData.get('keyword') ?? '').trim(),
    status: String(formData.get('status') ?? 'all'),
  };
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  void requestArticles(getFilters());
});

articleList.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button[data-action="favorite"]');
  if (!(button instanceof HTMLButtonElement) || !articleList.contains(button)) {
    return;
  }

  const articleId = button.dataset.articleId;
  if (!articleId) return;

  if (favorites.has(articleId)) favorites.delete(articleId);
  else favorites.add(articleId);

  saveFavorites();
  button.setAttribute('aria-pressed', String(favorites.has(articleId)));
  button.textContent = favorites.has(articleId) ? '已收藏' : '收藏';
  summary.textContent = `收藏 ${favorites.size} 篇`;
});

window.addEventListener('storage', (event) => {
  if (event.key !== FAVORITES_KEY) return;
  favorites = loadFavorites();
  void requestArticles(getFilters());
});

void requestArticles();
