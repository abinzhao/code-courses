import assert from 'node:assert/strict';
import test from 'node:test';
import {
  articles,
  filterArticles,
  normalizeKeyword,
  sortByUpdatedAt,
  summarizeArticles,
} from '../src/articles.js';

test('normalizeKeyword trims and normalizes case', () => {
  assert.equal(normalizeKeyword('  JavaScript  '), 'javascript');
  assert.equal(normalizeKeyword(null), '');
});

test('filterArticles matches title and summary', () => {
  assert.deepEqual(
    filterArticles(articles, { keyword: '事件循环' }).map((item) => item.id),
    ['javascript-event-loop']
  );

  assert.deepEqual(
    filterArticles(articles, { keyword: '键盘' }).map((item) => item.id),
    ['accessible-forms']
  );
});

test('filterArticles combines status and all selected tags', () => {
  assert.deepEqual(
    filterArticles(articles, {
      status: 'published',
      tags: ['browser', 'performance'],
    }).map((item) => item.id),
    ['browser-rendering']
  );

  assert.deepEqual(
    filterArticles(articles, {
      status: 'published',
      tags: ['browser', 'async'],
    }),
    []
  );
});

test('sortByUpdatedAt does not mutate source', () => {
  const source = [
    { id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'new', updatedAt: '2026-02-01T00:00:00.000Z' },
  ];
  const result = sortByUpdatedAt(source);

  assert.deepEqual(result.map((item) => item.id), ['new', 'old']);
  assert.deepEqual(source.map((item) => item.id), ['old', 'new']);
});

test('summarizeArticles returns counts without changing articles', () => {
  const summary = summarizeArticles(articles);

  assert.equal(summary.total, 3);
  assert.equal(summary.readingMinutes, 36);
  assert.deepEqual(summary.byStatus, {
    published: 2,
    draft: 1,
  });
  assert.deepEqual(
    [...summary.tags].toSorted(),
    ['accessibility', 'async', 'browser', 'html', 'javascript', 'performance']
  );
});
